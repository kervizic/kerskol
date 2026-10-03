-- 0020_rattachement_universel.sql
-- Le rattachement enfant par code doit fonctionner dans TOUTES les situations,
-- et le compte cible (qui peut etre l'adulte de quelqu'un d'autre) doit pouvoir
-- REFUSER. Evolution de 0014 :
--
--   1. demander_lien_enfant : TOUJOURS acceptee (sauf adresse invalide, profil
--      d'un autre foyer, ou abus = doublon de lien). Renvoie un code que le
--      compte existe ou non, qu'il soit deja parent ou relie ailleurs. Plus
--      d'exception 'lien_impossible' -> aucune enumeration possible.
--   2. statut_lien_enfant : le lien en attente valide PRIME sur tout (meme un
--      compte parent le voit a CHAQUE chargement), sans rien reveler du foyer.
--   3. valider_lien_enfant(code, confirmer) : apres le BON code seulement,
--      branche selon la situation du compte connecte (= le compte cible) :
--        a. sans foyer ni profil relie      -> rattache.
--        b. deja relie a un AUTRE profil     -> confirmation ; si oui, delie
--           l'ancien (journal de l'ancien foyer) puis relie le nouveau.
--        c. PARENT seul membre de son foyer  -> confirmation + reauth Google
--           recente (amr < 5 min) ; si confirme, suppression complete du foyer
--           (cascade : profils, progression, reponses, seances, journal, liens)
--           puis rattachement.
--        d. parent d'un foyer PARTAGE        -> refus clair ; le lien est supprime.
--   4. refus ("ce n'est pas moi") ou 5 mauvais codes -> lien supprime + entree
--      au JOURNAL DU FOYER DEMANDEUR (« rattachement refuse » / « annule »),
--      sans reveler d'info sur le compte (auteur NULL, aucun email).
--
-- Idempotent (rejouable sans erreur).

-- =========================================================================
-- 0. Helper prive : trace une issue de rattachement dans le foyer DEMANDEUR.
--    auteur = NULL (on ne revele pas le compte cible), aucun email.
-- =========================================================================
CREATE OR REPLACE FUNCTION public._journal_rattachement(p_profil uuid, p_issue text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.journal_reglages (foyer_id, profil_id, auteur, cle, ancienne, nouvelle)
    SELECT foyer_id, id, NULL, 'compte_enfant', to_jsonb('en_attente'::text), to_jsonb(p_issue)
      FROM public.profils WHERE id = p_profil;
END;
$$;

-- =========================================================================
-- 1. demander_lien_enfant : genere + renvoie le code. TOUJOURS acceptee hors
--    adresse invalide / profil d'un autre foyer / doublon de lien (abus).
--    Aucune verification du statut du compte cible -> pas d'enumeration.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.demander_lien_enfant(p_profil uuid, p_email text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer uuid;
    v_email text := lower(trim(p_email));
    v_uid   uuid := auth.uid();
    v_code  text;
    v_sel   text := gen_random_uuid()::text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RAISE EXCEPTION 'email_invalide';
    END IF;

    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.est_parent_du_foyer(v_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;

    -- Le profil est-il deja relie a un compte ?
    IF EXISTS (SELECT 1 FROM public.profils WHERE id = p_profil AND user_id IS NOT NULL) THEN
        RAISE EXCEPTION 'profil_deja_relie';
    END IF;

    -- IMPORTANT : plus aucune verification sur le compte cible (existe ? parent ?
    -- relie ailleurs ?). La reponse est identique dans tous les cas -> aucune
    -- enumeration. La situation du compte est traitee a la VALIDATION du code,
    -- par le titulaire lui-meme.

    -- Abus : un seul lien par profil, un seul par email (contraintes d'unicite).
    IF EXISTS (SELECT 1 FROM public.liens_enfant_en_attente WHERE profil_id = p_profil) THEN
        RAISE EXCEPTION 'lien_deja_en_attente';
    END IF;
    IF EXISTS (SELECT 1 FROM public.liens_enfant_en_attente WHERE email = v_email) THEN
        RAISE EXCEPTION 'email_deja_en_attente';
    END IF;

    -- Code a 3 chiffres (000..999). Force brute bornee par la limite d'essais.
    v_code := lpad((floor(random() * 1000))::int::text, 3, '0');

    INSERT INTO public.liens_enfant_en_attente (profil_id, email, cree_par, code_hash, code_sel)
    VALUES (p_profil, v_email, v_uid,
            encode(sha256((v_code || ':' || v_sel)::bytea), 'hex'), v_sel);

    RETURN v_code;  -- affiche UNE SEULE FOIS au parent
END;
$$;

-- =========================================================================
-- 2. statut_lien_enfant : le lien en attente valide PRIME (affiche a CHAQUE
--    chargement, meme pour un compte parent), sans divulguer foyer ni profil.
--    { etat: relie|en_attente|email_non_confirme|aucun, profil_id?: uuid }.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.statut_lien_enfant()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid       uuid := auth.uid();
    v_profil    uuid;
    v_email     text;
    v_confirmed boolean;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    SELECT lower(email), (email_confirmed_at IS NOT NULL)
      INTO v_email, v_confirmed
      FROM auth.users WHERE id = v_uid;

    -- Un lien en attente valide prime sur tout (relie ailleurs, parent...).
    IF v_email IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.liens_enfant_en_attente
                    WHERE email = v_email AND expire_le > now()) THEN
        IF NOT v_confirmed THEN
            RETURN jsonb_build_object('etat', 'email_non_confirme');
        END IF;
        RETURN jsonb_build_object('etat', 'en_attente');
    END IF;

    -- Pas de lien en attente : compte deja relie -> son village.
    SELECT id INTO v_profil FROM public.profils WHERE user_id = v_uid LIMIT 1;
    IF v_profil IS NOT NULL THEN
        RETURN jsonb_build_object('etat', 'relie', 'profil_id', v_profil);
    END IF;

    -- Sinon (parent ou compte libre) : rien a signaler cote enfant.
    RETURN jsonb_build_object('etat', 'aucun');
END;
$$;

-- =========================================================================
-- 3. valider_lien_enfant(code, confirmer) : apres le BON code uniquement,
--    branche selon la situation du compte connecte. Renvoie un jsonb (pas
--    d'exception sur le flux normal, pour COMMITer le compteur d'essais).
--    etats possibles :
--      ok=true  + profil_id                       (rattache : a/b/c aboutis)
--      confirmation_autre_profil                   (b : confirmation requise)
--      confirmation_suppression_foyer + nb_profils (c : confirmation requise)
--      reauth_requise                              (c : reauth Google < 5 min)
--      refus_foyer_partage                         (d : foyer partage, lien supprime)
--      code_invalide + essais_restants / annule    (mauvais code)
--      email_non_confirme / aucun
-- =========================================================================
DROP FUNCTION IF EXISTS public.valider_lien_enfant(text);
DROP FUNCTION IF EXISTS public.valider_lien_enfant(text, boolean);
CREATE FUNCTION public.valider_lien_enfant(p_code text, p_confirmer boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid        uuid := auth.uid();
    v_email      text;
    v_confirmed  boolean;
    v_lien       uuid;
    v_cible      uuid;       -- profil vise par le lien (foyer demandeur)
    v_essais     integer;
    v_hash       text;
    v_sel        text;
    v_old_profil uuid;       -- profil deja relie au compte connecte (cas b)
    v_old_foyer  uuid;
    v_nb         integer;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    SELECT lower(email), (email_confirmed_at IS NOT NULL)
      INTO v_email, v_confirmed
      FROM auth.users WHERE id = v_uid;
    IF v_email IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'etat', 'aucun');
    END IF;

    SELECT id, profil_id, essais, code_hash, code_sel
      INTO v_lien, v_cible, v_essais, v_hash, v_sel
      FROM public.liens_enfant_en_attente
     WHERE email = v_email AND expire_le > now()
     FOR UPDATE;
    IF v_lien IS NULL THEN
        -- Pas (ou plus) de lien : idempotent si deja relie, sinon rien.
        SELECT id INTO v_old_profil FROM public.profils WHERE user_id = v_uid LIMIT 1;
        IF v_old_profil IS NOT NULL THEN
            RETURN jsonb_build_object('ok', true, 'profil_id', v_old_profil);
        END IF;
        RETURN jsonb_build_object('ok', false, 'etat', 'aucun');
    END IF;

    IF NOT v_confirmed THEN
        RETURN jsonb_build_object('ok', false, 'etat', 'email_non_confirme');
    END IF;

    -- Le profil vise a-t-il ete relie entre-temps ?
    IF EXISTS (SELECT 1 FROM public.profils
                WHERE id = v_cible AND user_id = v_uid) THEN
        DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;
        RETURN jsonb_build_object('ok', true, 'profil_id', v_cible);  -- deja fait
    END IF;
    IF EXISTS (SELECT 1 FROM public.profils
                WHERE id = v_cible AND user_id IS NOT NULL) THEN
        DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;
        RETURN jsonb_build_object('ok', false, 'etat', 'aucun');
    END IF;

    -- ------------------------- Verification du code -------------------------
    v_essais := v_essais + 1;
    IF v_hash IS NULL
       OR encode(sha256((coalesce(p_code, '') || ':' || v_sel)::bytea), 'hex') <> v_hash THEN
        IF v_essais >= 5 THEN
            PERFORM public._journal_rattachement(v_cible, 'rattachement annule');
            DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;
            RETURN jsonb_build_object('ok', false, 'etat', 'annule');
        END IF;
        UPDATE public.liens_enfant_en_attente SET essais = v_essais WHERE id = v_lien;
        RETURN jsonb_build_object('ok', false, 'etat', 'code_invalide',
                                  'essais_restants', 5 - v_essais);
    END IF;

    -- ====================== CODE CORRECT : par situation ====================

    -- (b) Compte deja relie a un AUTRE profil enfant.
    SELECT id, foyer_id INTO v_old_profil, v_old_foyer
      FROM public.profils WHERE user_id = v_uid LIMIT 1;
    IF v_old_profil IS NOT NULL THEN
        IF NOT p_confirmer THEN
            RETURN jsonb_build_object('ok', false, 'etat', 'confirmation_autre_profil');
        END IF;
        PERFORM set_config('kerskol.calcul', 'on', true);  -- ecriture serveur de confiance
        UPDATE public.profils SET user_id = NULL WHERE id = v_old_profil;
        INSERT INTO public.journal_reglages (foyer_id, profil_id, auteur, cle, ancienne, nouvelle)
        VALUES (v_old_foyer, v_old_profil, v_uid, 'compte_enfant',
                to_jsonb('relie'::text), to_jsonb('delie'::text));
        UPDATE public.profils SET user_id = v_uid WHERE id = v_cible;
        DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;
        INSERT INTO public.journal_reglages (foyer_id, profil_id, auteur, cle, ancienne, nouvelle)
        SELECT foyer_id, id, v_uid, 'compte_enfant', to_jsonb('en_attente'::text), to_jsonb('relie'::text)
          FROM public.profils WHERE id = v_cible;
        RETURN jsonb_build_object('ok', true, 'profil_id', v_cible);
    END IF;

    -- (c/d) Compte parent membre d'un foyer.
    IF EXISTS (SELECT 1 FROM public.membres_foyer WHERE user_id = v_uid) THEN
        -- Foyer partage (un autre membre parent existe) -> refus (d).
        IF EXISTS (
            SELECT 1 FROM public.membres_foyer m
             WHERE m.user_id <> v_uid
               AND m.foyer_id IN (SELECT foyer_id FROM public.membres_foyer WHERE user_id = v_uid)
        ) THEN
            PERFORM public._journal_rattachement(v_cible, 'rattachement refuse');
            DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;
            RETURN jsonb_build_object('ok', false, 'etat', 'refus_foyer_partage');
        END IF;

        -- Seul membre (c) : confirmation explicite requise.
        IF NOT p_confirmer THEN
            SELECT count(*) INTO v_nb FROM public.profils
             WHERE foyer_id IN (SELECT foyer_id FROM public.membres_foyer WHERE user_id = v_uid);
            RETURN jsonb_build_object('ok', false, 'etat', 'confirmation_suppression_foyer',
                                      'nb_profils', v_nb);
        END IF;
        -- Authentification Google recente exigee (meme mecanisme que supprimer_foyer).
        IF NOT public._reauth_recente() THEN
            RETURN jsonb_build_object('ok', false, 'etat', 'reauth_requise');
        END IF;

        -- Suppression complete du/des foyer(s) dont il est SEUL membre (cascade).
        DELETE FROM public.foyers
         WHERE id IN (SELECT foyer_id FROM public.membres_foyer WHERE user_id = v_uid);

        PERFORM set_config('kerskol.calcul', 'on', true);
        UPDATE public.profils SET user_id = v_uid WHERE id = v_cible;
        DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;
        INSERT INTO public.journal_reglages (foyer_id, profil_id, auteur, cle, ancienne, nouvelle)
        SELECT foyer_id, id, v_uid, 'compte_enfant', to_jsonb('en_attente'::text), to_jsonb('relie'::text)
          FROM public.profils WHERE id = v_cible;
        RETURN jsonb_build_object('ok', true, 'profil_id', v_cible);
    END IF;

    -- (a) Compte sans foyer ni profil relie : rattachement direct.
    UPDATE public.profils SET user_id = v_uid WHERE id = v_cible;
    DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;
    INSERT INTO public.journal_reglages (foyer_id, profil_id, auteur, cle, ancienne, nouvelle)
    SELECT foyer_id, id, v_uid, 'compte_enfant', to_jsonb('en_attente'::text), to_jsonb('relie'::text)
      FROM public.profils WHERE id = v_cible;
    RETURN jsonb_build_object('ok', true, 'profil_id', v_cible);
END;
$$;

-- =========================================================================
-- 4. refuser_lien_enfant : "Ce n'est pas moi" -> journalise « rattachement
--    refuse » dans le foyer demandeur (auteur NULL, aucun email) puis supprime.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.refuser_lien_enfant()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid    uuid := auth.uid();
    v_email  text;
    v_cible  uuid;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
    IF v_email IS NULL THEN
        RETURN;
    END IF;

    SELECT profil_id INTO v_cible FROM public.liens_enfant_en_attente WHERE email = v_email;
    IF v_cible IS NULL THEN
        RETURN;
    END IF;
    PERFORM public._journal_rattachement(v_cible, 'rattachement refuse');
    DELETE FROM public.liens_enfant_en_attente WHERE email = v_email;
END;
$$;

-- =========================================================================
-- 5. Droits d'execution (anon exclu). La nouvelle signature de
--    valider_lien_enfant impose un nouveau GRANT.
-- =========================================================================
REVOKE ALL ON FUNCTION public._journal_rattachement(uuid, text)   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.valider_lien_enfant(text, boolean)  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demander_lien_enfant(uuid, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.statut_lien_enfant()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.valider_lien_enfant(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refuser_lien_enfant()             TO authenticated;
-- _journal_rattachement n'est appelee QUE par des fonctions SECURITY DEFINER
-- (proprietaire postgres) : aucun GRANT a authenticated.

-- =========================================================================
-- 6. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0020_rattachement_universel')
ON CONFLICT (version) DO NOTHING;
