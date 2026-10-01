-- 0014_rattachement_code.sql
-- Rattachement enfant SECURISE par un CODE a 3 chiffres (remplace le rattachement
-- silencieux de 0013).
--
-- Changements :
--   * Le lien porte desormais un CODE a 3 chiffres (stocke hache + sel, jamais
--     en clair), affiche UNE SEULE FOIS au parent par demander_lien_enfant().
--   * Lien ET code valables 7 JOURS (au lieu de 30).
--   * Au login, plus AUCUN rattachement automatique : statut_lien_enfant() dit
--     seulement s'il existe un lien en attente, SANS reveler foyer ni profil.
--   * valider_lien_enfant(code) : bon code -> rattachement + village ; 5 essais
--     max puis le lien est annule. refuser_lien_enfant() : bouton "ce n'est pas
--     moi" -> suppression du lien.
--   * email_confirmed_at obligatoire pour valider.
--   * demander_lien_enfant : messages generiques (pas d'enumeration de comptes).
--
-- Idempotent (rejouable sans erreur).

-- =========================================================================
-- 1. Colonnes de code sur le lien + expiration ramenee a 7 jours
-- =========================================================================
ALTER TABLE public.liens_enfant_en_attente
    ADD COLUMN IF NOT EXISTS code_hash text,
    ADD COLUMN IF NOT EXISTS code_sel  text,
    ADD COLUMN IF NOT EXISTS essais    integer NOT NULL DEFAULT 0;

ALTER TABLE public.liens_enfant_en_attente
    ALTER COLUMN expire_le SET DEFAULT (now() + interval '7 days');

COMMENT ON COLUMN public.liens_enfant_en_attente.code_hash IS
    'SHA-256 du code a 3 chiffres (code || '':'' || code_sel). Jamais le code en clair.';

-- =========================================================================
-- 2. demander_lien_enfant : genere + renvoie le code (une fois), messages
--    generiques pour ne pas enumerer les comptes.
-- =========================================================================
DROP FUNCTION IF EXISTS public.demander_lien_enfant(uuid, text);
CREATE FUNCTION public.demander_lien_enfant(p_profil uuid, p_email text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer uuid;
    v_email text := lower(trim(p_email));
    v_uid   uuid := auth.uid();
    v_cible uuid;
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

    -- Conflit sur le compte cible (parent, ou deja relie) : message GENERIQUE
    -- unique pour ne pas reveler l'existence/le statut d'un compte.
    SELECT id INTO v_cible FROM auth.users WHERE lower(email) = v_email LIMIT 1;
    IF v_cible IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.membres_foyer WHERE user_id = v_cible)
        OR EXISTS (SELECT 1 FROM public.profils WHERE user_id = v_cible) THEN
            RAISE EXCEPTION 'lien_impossible';
        END IF;
    END IF;

    -- Doublons de lien en attente (cote parent : ses propres profils).
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
-- 3. statut_lien_enfant : au login, dit s'il y a un lien en attente SANS
--    reveler foyer ni profil. { "etat": relie|en_attente|email_non_confirme|aucun,
--    "profil_id"?: uuid }.
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

    -- Deja relie -> on renvoie le profil (login suivant de l'enfant).
    SELECT id INTO v_profil FROM public.profils WHERE user_id = v_uid LIMIT 1;
    IF v_profil IS NOT NULL THEN
        RETURN jsonb_build_object('etat', 'relie', 'profil_id', v_profil);
    END IF;

    -- Un parent membre d'un foyer n'est jamais un enfant en attente.
    IF EXISTS (SELECT 1 FROM public.membres_foyer WHERE user_id = v_uid) THEN
        RETURN jsonb_build_object('etat', 'aucun');
    END IF;

    SELECT lower(email), (email_confirmed_at IS NOT NULL)
      INTO v_email, v_confirmed
      FROM auth.users WHERE id = v_uid;
    IF v_email IS NULL THEN
        RETURN jsonb_build_object('etat', 'aucun');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.liens_enfant_en_attente
                    WHERE email = v_email AND expire_le > now()) THEN
        RETURN jsonb_build_object('etat', 'aucun');
    END IF;

    IF NOT v_confirmed THEN
        RETURN jsonb_build_object('etat', 'email_non_confirme');
    END IF;

    RETURN jsonb_build_object('etat', 'en_attente');
END;
$$;

-- =========================================================================
-- 4. valider_lien_enfant(code) : relie si le code est bon ; sinon compte
--    l'essai (persiste) et annule au 5e echec. Renvoie un jsonb sans exception
--    pour le flux normal (afin que le compteur d'essais soit COMMITe).
--    { "ok": bool, "etat"?: ..., "profil_id"?: uuid, "essais_restants"?: int }
-- =========================================================================
CREATE OR REPLACE FUNCTION public.valider_lien_enfant(p_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid       uuid := auth.uid();
    v_email     text;
    v_confirmed boolean;
    v_lien      uuid;
    v_profil    uuid;
    v_essais    integer;
    v_hash      text;
    v_sel       text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    -- Deja relie (idempotent).
    SELECT id INTO v_profil FROM public.profils WHERE user_id = v_uid LIMIT 1;
    IF v_profil IS NOT NULL THEN
        RETURN jsonb_build_object('ok', true, 'profil_id', v_profil);
    END IF;

    IF EXISTS (SELECT 1 FROM public.membres_foyer WHERE user_id = v_uid) THEN
        RETURN jsonb_build_object('ok', false, 'etat', 'aucun');
    END IF;

    SELECT lower(email), (email_confirmed_at IS NOT NULL)
      INTO v_email, v_confirmed
      FROM auth.users WHERE id = v_uid;
    IF v_email IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'etat', 'aucun');
    END IF;
    IF NOT v_confirmed THEN
        RETURN jsonb_build_object('ok', false, 'etat', 'email_non_confirme');
    END IF;

    SELECT id, profil_id, essais, code_hash, code_sel
      INTO v_lien, v_profil, v_essais, v_hash, v_sel
      FROM public.liens_enfant_en_attente
     WHERE email = v_email AND expire_le > now()
     FOR UPDATE;
    IF v_lien IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'etat', 'aucun');
    END IF;

    -- Course : profil relie entre-temps a un autre compte.
    IF EXISTS (SELECT 1 FROM public.profils WHERE id = v_profil AND user_id IS NOT NULL) THEN
        DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;
        RETURN jsonb_build_object('ok', false, 'etat', 'aucun');
    END IF;

    v_essais := v_essais + 1;

    IF v_hash IS NOT NULL
       AND encode(sha256((coalesce(p_code, '') || ':' || v_sel)::bytea), 'hex') = v_hash THEN
        UPDATE public.profils SET user_id = v_uid WHERE id = v_profil;
        DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;  -- email plus stocke
        INSERT INTO public.journal_reglages (foyer_id, profil_id, auteur, cle, ancienne, nouvelle)
        SELECT foyer_id, id, v_uid, 'compte_enfant', to_jsonb('en_attente'::text), to_jsonb('relie'::text)
          FROM public.profils WHERE id = v_profil;
        RETURN jsonb_build_object('ok', true, 'profil_id', v_profil);
    END IF;

    -- Mauvais code : on persiste l'essai ; annulation au 5e echec.
    IF v_essais >= 5 THEN
        DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;
        RETURN jsonb_build_object('ok', false, 'etat', 'annule');
    END IF;

    UPDATE public.liens_enfant_en_attente SET essais = v_essais WHERE id = v_lien;
    RETURN jsonb_build_object('ok', false, 'etat', 'code_invalide',
                              'essais_restants', 5 - v_essais);
END;
$$;

-- =========================================================================
-- 5. refuser_lien_enfant : "Ce n'est pas moi" -> supprime le lien en attente
--    correspondant a l'email du compte connecte.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.refuser_lien_enfant()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid   uuid := auth.uid();
    v_email text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
    IF v_email IS NULL THEN
        RETURN;
    END IF;
    DELETE FROM public.liens_enfant_en_attente WHERE email = v_email;
END;
$$;

-- =========================================================================
-- 6. Retrait du rattachement automatique (0013).
-- =========================================================================
DROP FUNCTION IF EXISTS public.rattacher_si_attendu();

-- =========================================================================
-- 7. Droits d'execution (anon exclu).
-- =========================================================================
REVOKE ALL ON FUNCTION public.demander_lien_enfant(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.statut_lien_enfant()             FROM PUBLIC;
REVOKE ALL ON FUNCTION public.valider_lien_enfant(text)        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refuser_lien_enfant()            FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demander_lien_enfant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.statut_lien_enfant()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.valider_lien_enfant(text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.refuser_lien_enfant()            TO authenticated;

-- =========================================================================
-- 8. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0014_rattachement_code')
ON CONFLICT (version) DO NOTHING;
