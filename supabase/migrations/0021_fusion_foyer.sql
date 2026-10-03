-- 0021_fusion_foyer.sql
-- Cas c du rattachement (compte PARENT seul membre de son foyer) : au lieu de
-- SUPPRIMER son ancien foyer (0020), on FUSIONNE ses progres dans le profil cible.
-- Plus rien n'est perdu => la reauth Google (inutile et impossible a imposer :
-- Google ne redemande pas le mot de passe quand la session est active) est retiree
-- pour CE flux.
--
-- Nouveau comportement de valider_lien_enfant, situation c :
--   * bon code, sans confirmer -> 'confirmation_fusion' + nb_profils + la liste
--     des profils de l'ancien foyer (surnoms) : c'est SON propre foyer, donc
--     aucune fuite. Si l'ancien foyer a plusieurs profils, l'enfant choisit
--     lequel fusionner (p_source_profil) ; les autres seront supprimes avec le
--     foyer vide, apres confirmation explicite listant leurs surnoms (cote UI).
--   * bon code + confirmer -> fusion du profil source dans le profil cible :
--       - reponses + seances de la source reattribuees a la cible ;
--       - progression de la cible RECALCULEE depuis TOUTES ses reponses (meme
--         rejeu que les triggers via calc_progression, qui fait foi) ;
--         niveau_max_atteint = max(source, cible, rejeu) competence par competence ;
--       - monnaie = somme des deux ;
--       - reglages ENFANT (avatar + couleur -> avatar jsonb, univers) pris de la
--         SOURCE ; reglages PARENT (surnom, classe, limites, matieres) gardes de
--         la CIBLE ;
--       - suppression de l'ancien foyer vide (cascade : profils non choisis),
--         rattachement du compte, journal « compte relie, progression fusionnee »
--         dans le foyer CIBLE.
--   * AUCUNE reauth Google exigee pour ce flux.
--
-- Cas a, b, d : inchanges.
--
-- supprimer_foyer (suppression VOLONTAIRE par un parent) : la reauth Google est
-- conservee MAIS complete par une confirmation forte (saisie du mot « SUPPRIMER »)
-- car Google peut revenir sans rien redemander quand la session est active.
--
-- Idempotent (rejouable sans erreur).

-- =========================================================================
-- 0. Le profil_id d'une seance est fige (0011) cote API, mais la FUSION serveur
--    doit pouvoir reaffecter les seances a la cible. On laisse passer quand le
--    marqueur transactionnel kerskol.calcul est pose (meme principe que pour la
--    monnaie et les colonnes enfant).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_seances_profil_fige()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF current_setting('kerskol.calcul', true) = 'on' THEN
        RETURN NEW;  -- reaffectation serveur de confiance (fusion de foyers)
    END IF;
    IF NEW.profil_id <> OLD.profil_id THEN
        RAISE EXCEPTION 'profil_id d''une seance est fige';
    END IF;
    RETURN NEW;
END;
$$;

-- =========================================================================
-- 1. Helper prive : fusionne le profil SOURCE dans le profil CIBLE.
--    Ne touche NI aux foyers NI au rattachement : seulement les donnees du jeu.
--    Reentrant (aucune table temporaire). Pose le marqueur serveur kerskol.calcul.
-- =========================================================================
CREATE OR REPLACE FUNCTION public._fusionner_profils(p_source uuid, p_cible uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_comp     text;
    v_calc     public.progression;
    v_nmax_map jsonb;
    v_nmax     integer;
BEGIN
    IF p_source = p_cible THEN
        RETURN;  -- rien a fusionner
    END IF;

    PERFORM set_config('kerskol.calcul', 'on', true);  -- ecritures serveur de confiance

    -- (1) monnaie cible = cible + source.
    UPDATE public.profils c
       SET monnaie = c.monnaie + coalesce(s.monnaie, 0)
      FROM public.profils s
     WHERE c.id = p_cible AND s.id = p_source;

    -- (2) reglages ENFANT depuis la source : avatar (contient la couleur) + univers.
    --     On garde surnom, classe, limites et matieres de la CIBLE (reglages parent).
    UPDATE public.profils c
       SET avatar = s.avatar, univers = s.univers
      FROM public.profils s
     WHERE c.id = p_cible AND s.id = p_source;

    -- (3) capture du niveau_max atteint par competence sur les DEUX profils,
    --     AVANT recalcul (niveau_max ne doit jamais reculer).
    SELECT jsonb_object_agg(competence, nmax) INTO v_nmax_map
      FROM (
        SELECT competence, max(niveau_max_atteint) AS nmax
          FROM public.progression
         WHERE profil_id IN (p_source, p_cible)
         GROUP BY competence
      ) t;
    v_nmax_map := coalesce(v_nmax_map, '{}'::jsonb);

    -- (4) reattribution des reponses et seances de la source vers la cible.
    --     (UPDATE : ne declenche PAS les triggers AFTER INSERT -> pas de double
    --      credit de monnaie, pas de recalcul partiel.)
    UPDATE public.seances  SET profil_id = p_cible WHERE profil_id = p_source;
    UPDATE public.reponses SET profil_id = p_cible WHERE profil_id = p_source;

    -- (5) recalcul COMPLET de la progression de la cible depuis toutes ses
    --     reponses (le meme rejeu deterministe que le trigger).
    DELETE FROM public.progression WHERE profil_id = p_cible;
    FOR v_comp IN
        SELECT DISTINCT competence FROM public.reponses WHERE profil_id = p_cible
    LOOP
        v_calc := public.calc_progression(p_cible, v_comp);
        v_nmax := coalesce((v_nmax_map ->> v_comp)::int, 1);
        INSERT INTO public.progression (
            profil_id, competence, niveau, niveau_max_atteint,
            ema_courte, ema_longue, nb_reponses_niveau, placement_termine,
            derniere_reponse, prochaine_revision, maj_le)
        VALUES (
            p_cible, v_comp, v_calc.niveau,
            greatest(v_calc.niveau_max_atteint, v_nmax),
            v_calc.ema_courte, v_calc.ema_longue, v_calc.nb_reponses_niveau,
            v_calc.placement_termine, v_calc.derniere_reponse,
            v_calc.prochaine_revision, now());
    END LOOP;
END;
$$;

-- =========================================================================
-- 2. valider_lien_enfant(code, confirmer, source_profil) : nouvelle signature.
--    Situation c = FUSION (plus de suppression ni de reauth).
-- =========================================================================
DROP FUNCTION IF EXISTS public.valider_lien_enfant(text);
DROP FUNCTION IF EXISTS public.valider_lien_enfant(text, boolean);
DROP FUNCTION IF EXISTS public.valider_lien_enfant(text, boolean, uuid);
CREATE FUNCTION public.valider_lien_enfant(
    p_code text,
    p_confirmer boolean DEFAULT false,
    p_source_profil uuid DEFAULT NULL)
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
    v_old_foyer  uuid;       -- foyer du compte connecte (cas c)
    v_nb         integer;
    v_source     uuid;       -- profil source choisi pour la fusion (cas c)
    v_profils    jsonb;
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

    -- (b) Compte deja relie a un AUTRE profil enfant : inchange.
    SELECT id, foyer_id INTO v_old_profil, v_old_foyer
      FROM public.profils WHERE user_id = v_uid LIMIT 1;
    IF v_old_profil IS NOT NULL THEN
        IF NOT p_confirmer THEN
            RETURN jsonb_build_object('ok', false, 'etat', 'confirmation_autre_profil');
        END IF;
        PERFORM set_config('kerskol.calcul', 'on', true);
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

        -- Seul membre (c) : FUSION. Son foyer (il n'en a qu'un seul en etant seul membre).
        SELECT foyer_id INTO v_old_foyer
          FROM public.membres_foyer WHERE user_id = v_uid LIMIT 1;
        SELECT count(*) INTO v_nb FROM public.profils WHERE foyer_id = v_old_foyer;
        SELECT jsonb_agg(jsonb_build_object('id', id, 'surnom', surnom) ORDER BY cree_le)
          INTO v_profils FROM public.profils WHERE foyer_id = v_old_foyer;

        -- Confirmation explicite requise (aucune reauth : plus rien n'est perdu).
        IF NOT p_confirmer THEN
            RETURN jsonb_build_object('ok', false, 'etat', 'confirmation_fusion',
                                      'nb_profils', v_nb,
                                      'profils_source', coalesce(v_profils, '[]'::jsonb));
        END IF;

        -- Choix de la source.
        IF v_nb <= 1 THEN
            SELECT id INTO v_source FROM public.profils WHERE foyer_id = v_old_foyer LIMIT 1;
        ELSE
            -- Plusieurs profils : un choix valide (appartenant a l'ancien foyer) est requis.
            IF p_source_profil IS NULL
               OR NOT EXISTS (SELECT 1 FROM public.profils
                               WHERE id = p_source_profil AND foyer_id = v_old_foyer) THEN
                RETURN jsonb_build_object('ok', false, 'etat', 'confirmation_fusion',
                                          'nb_profils', v_nb,
                                          'profils_source', coalesce(v_profils, '[]'::jsonb));
            END IF;
            v_source := p_source_profil;
        END IF;

        -- Fusion des donnees de jeu dans la cible.
        IF v_source IS NOT NULL THEN
            PERFORM public._fusionner_profils(v_source, v_cible);
        END IF;

        -- Suppression de l'ancien foyer vide (cascade : profils non choisis).
        DELETE FROM public.foyers WHERE id = v_old_foyer;

        -- Rattachement du compte + journal dans le foyer CIBLE.
        PERFORM set_config('kerskol.calcul', 'on', true);
        UPDATE public.profils SET user_id = v_uid WHERE id = v_cible;
        DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;
        INSERT INTO public.journal_reglages (foyer_id, profil_id, auteur, cle, ancienne, nouvelle)
        SELECT foyer_id, id, v_uid, 'compte_enfant',
               to_jsonb('en_attente'::text), to_jsonb('relie, progression fusionnee'::text)
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
-- 3. supprimer_foyer : reauth Google CONSERVEE + confirmation forte par saisie
--    du mot « SUPPRIMER ». Raison : Google ne redemande pas le mot de passe
--    quand la session est active (la reauth peut donc revenir sans friction) ;
--    on exige en plus une action deliberee pour une suppression irreversible.
-- =========================================================================
DROP FUNCTION IF EXISTS public.supprimer_foyer(uuid);
DROP FUNCTION IF EXISTS public.supprimer_foyer(uuid, text);
CREATE FUNCTION public.supprimer_foyer(p_foyer uuid, p_confirmation text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    IF NOT public.est_parent_du_foyer(p_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;
    IF p_confirmation IS DISTINCT FROM 'SUPPRIMER' THEN
        RAISE EXCEPTION 'confirmation_requise'
            USING HINT = 'Saisir le mot SUPPRIMER pour confirmer.';
    END IF;
    IF NOT public._reauth_recente() THEN
        RAISE EXCEPTION 'reauth_requise';
    END IF;

    DELETE FROM public.foyers WHERE id = p_foyer;
END;
$$;

-- =========================================================================
-- 4. Droits d'execution (anon exclu). Nouvelles signatures -> nouveaux GRANT.
-- =========================================================================
REVOKE ALL ON FUNCTION public._fusionner_profils(uuid, uuid)            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.valider_lien_enfant(text, boolean, uuid)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supprimer_foyer(uuid, text)               FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.valider_lien_enfant(text, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supprimer_foyer(uuid, text)              TO authenticated;
-- _fusionner_profils n'est appelee QUE par valider_lien_enfant (SECURITY DEFINER,
-- proprietaire postgres) : aucun GRANT a authenticated.

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0021_fusion_foyer')
ON CONFLICT (version) DO NOTHING;
