-- 0009_fix_profils_select_insert.sql
-- Correctif racine du bug "new row violates row-level security policy for table
-- profils" a la CREATION d'un profil depuis le front.
--
-- Cause : le front insere via PostgREST avec Prefer: return=representation
-- (equivaut a INSERT ... RETURNING). Avec un RETURNING, PostgreSQL applique la
-- policy SELECT a la ligne renvoyee. Or l'ancienne policy SELECT etait
--     USING (peut_acceder_profil(id))
-- et peut_acceder_profil RE-INTERROGE public.profils par id. Pendant l'INSERT,
-- cette relecture ne "voit" pas encore la nouvelle ligne => EXISTS faux =>
-- la policy SELECT echoue => l'insertion est rejetee, alors meme que la policy
-- INSERT (WITH CHECK est_parent_du_foyer(foyer_id)) est satisfaite.
--
-- Correctif : evaluer la policy SELECT DIRECTEMENT sur les colonnes de la ligne
-- (foyer_id, user_id) au lieu de relire la table par id. Semantique identique
-- (parent du foyer OU l'enfant lui-meme), mais evaluable sur la ligne inseree.
--
-- On durcit aussi creer_foyer contre une course (deux appels concurrents au
-- retour de l'OAuth avaient cree deux foyers pour le meme parent) via un verrou
-- consultatif serialisant par utilisateur.
--
-- Idempotent.

-- =========================================================================
-- 1. Policy SELECT de profils : expression sur colonnes (pas de relecture)
-- =========================================================================
DROP POLICY IF EXISTS profils_select ON public.profils;
CREATE POLICY profils_select ON public.profils
    FOR SELECT TO authenticated
    USING (public.est_parent_du_foyer(foyer_id) OR user_id = auth.uid());

-- =========================================================================
-- 2. creer_foyer : verrou consultatif par utilisateur (anti-doublon de foyer)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.creer_foyer()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid   uuid := auth.uid();
    v_foyer uuid;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    -- Serialise les appels concurrents du MEME utilisateur (relache en fin de
    -- transaction). Deux bootstraps simultanes ne creent donc qu'un seul foyer.
    PERFORM pg_advisory_xact_lock(hashtext('kerskol_creer_foyer:' || v_uid::text)::bigint);

    SELECT foyer_id INTO v_foyer
      FROM public.membres_foyer WHERE user_id = v_uid
     LIMIT 1;
    IF v_foyer IS NOT NULL THEN
        RETURN v_foyer;
    END IF;

    INSERT INTO public.foyers DEFAULT VALUES RETURNING id INTO v_foyer;
    INSERT INTO public.membres_foyer (foyer_id, user_id, role)
    VALUES (v_foyer, v_uid, 'parent');
    RETURN v_foyer;
END;
$$;

-- =========================================================================
-- 3. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0009_fix_profils_select_insert')
ON CONFLICT (version) DO NOTHING;
