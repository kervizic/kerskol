-- 0015_inscriptions_fermees.sql
-- Inscriptions FERMEES jusqu'au lancement public.
--
--   * creer_foyer() ne cree un NOUVEAU foyer que si le compte figure dans une
--     liste d'autorisation (inscriptions_autorisees) ; sinon 'inscriptions_fermees'.
--     Les membres d'un foyer existant ne sont pas affectes (retour anticipe).
--     Un parent invite rejoint un foyer via accepter_invitation() : il devient
--     membre AVANT que creer_foyer ne s'applique (donc pas bloque).
--   * La liste est geree UNIQUEMENT par migration / service (REVOKE total cote API).
--   * L'email du proprietaire du foyer existant (Manu) est ajoute automatiquement,
--     lu en base, jamais affiche.
--   * purge_comptes_orphelins() : supprime les comptes auth.users sans foyer, sans
--     profil relie, sans lien enfant en attente, non autorises, crees il y a plus
--     de 24 h. Appelee par un cron (voir deploy/maintenance.sh).
--
-- Idempotent.

-- =========================================================================
-- 1. Table d'autorisation (email normalise). Fermee a l'API.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.inscriptions_autorisees (
    email   text        PRIMARY KEY,
    cree_le timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT inscriptions_email_minuscules_chk CHECK (email = lower(email))
);
COMMENT ON TABLE public.inscriptions_autorisees IS
    'Liste blanche des emails autorises a creer un foyer (inscriptions fermees). '
    'Geree par migration / service uniquement, jamais par l''API.';

ALTER TABLE public.inscriptions_autorisees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscriptions_autorisees FORCE ROW LEVEL SECURITY;
-- Aucune policy : table totalement fermee a anon / authenticated.
REVOKE ALL ON public.inscriptions_autorisees FROM anon, authenticated;

-- =========================================================================
-- 2. Amorce : autoriser les parents des foyers DEJA existants (dont Manu).
--    Email lu en base, jamais renvoye ni journalise.
-- =========================================================================
INSERT INTO public.inscriptions_autorisees (email)
SELECT DISTINCT lower(u.email)
  FROM public.membres_foyer m
  JOIN auth.users u ON u.id = m.user_id
 WHERE u.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- =========================================================================
-- 3. creer_foyer : controle de la liste d'autorisation avant toute creation.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.creer_foyer()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid   uuid := auth.uid();
    v_foyer uuid;
    v_email text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('kerskol_creer_foyer:' || v_uid::text)::bigint);

    -- Membre d'un foyer existant : inchange (jamais bloque).
    SELECT foyer_id INTO v_foyer
      FROM public.membres_foyer WHERE user_id = v_uid
     LIMIT 1;
    IF v_foyer IS NOT NULL THEN
        RETURN v_foyer;
    END IF;

    -- Inscriptions fermees : seuls les comptes autorises creent un foyer.
    SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
    IF v_email IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.inscriptions_autorisees WHERE email = v_email) THEN
        RAISE EXCEPTION 'inscriptions_fermees';
    END IF;

    INSERT INTO public.foyers DEFAULT VALUES RETURNING id INTO v_foyer;
    INSERT INTO public.membres_foyer (foyer_id, user_id, role)
    VALUES (v_foyer, v_uid, 'parent');
    RETURN v_foyer;
END;
$$;

REVOKE ALL ON FUNCTION public.creer_foyer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.creer_foyer() TO authenticated;

-- =========================================================================
-- 4. Purge des comptes orphelins (> 24 h, sans foyer/profil/lien/autorisation).
--    SECURITY DEFINER (proprietaire postgres) : supprime dans auth.users.
--    Reserve au service (REVOKE PUBLIC) : appelee par deploy/maintenance.sh.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.purge_comptes_orphelins()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_n integer;
BEGIN
    WITH supprimes AS (
        DELETE FROM auth.users u
         WHERE u.created_at < now() - interval '24 hours'
           AND NOT EXISTS (SELECT 1 FROM public.membres_foyer m WHERE m.user_id = u.id)
           AND NOT EXISTS (SELECT 1 FROM public.profils p       WHERE p.user_id = u.id)
           AND NOT EXISTS (SELECT 1 FROM public.liens_enfant_en_attente l
                            WHERE l.email = lower(u.email))
           AND NOT EXISTS (SELECT 1 FROM public.inscriptions_autorisees a
                            WHERE a.email = lower(u.email))
        RETURNING 1
    )
    SELECT count(*) INTO v_n FROM supprimes;
    RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_comptes_orphelins() FROM PUBLIC;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0015_inscriptions_fermees')
ON CONFLICT (version) DO NOTHING;
