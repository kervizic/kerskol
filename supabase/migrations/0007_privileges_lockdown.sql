-- 0007_privileges_lockdown.sql
-- L'image Supabase applique des DEFAULT PRIVILEGES qui accordent AUTOMATIQUEMENT
-- tous les droits (SELECT/INSERT/UPDATE/DELETE) a anon ET authenticated sur
-- chaque nouvelle table du schema public. Cela contredit nos exigences :
--   * anon : AUCUN droit.
--   * append-only (reponses, journal_reglages) : pas d'UPDATE/DELETE.
--   * referentiel : lecture seule.
--   * progression : lecture seule (ecrite par trigger).
-- On revoque donc explicitement, puis on re-accorde le strict minimum.
-- Idempotent (REVOKE/GRANT rejouables).

-- anon : plus rien sur public (aucune table, aucune sequence).
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Referentiel : lecture seule pour authenticated.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON public.matieres, public.competences, public.competence_prerequis,
       public.methodes, public.exercices, public.ex_calcul
    FROM authenticated;

-- Apprentissage.
REVOKE UPDATE, DELETE, TRUNCATE ON public.seances     FROM authenticated;  -- insert+select
REVOKE UPDATE, DELETE, TRUNCATE ON public.reponses    FROM authenticated;  -- append-only
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.progression FROM authenticated; -- lecture seule

-- Foyer : creation/gestion via RPC (SECURITY DEFINER) uniquement.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
    ON public.foyers, public.membres_foyer, public.invitations FROM authenticated;
-- profils : select/insert/update/delete conserves (gestion cote parent).

-- Transparence.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.journal_reglages FROM authenticated; -- append-only, insert via trigger
REVOKE DELETE, TRUNCATE ON public.bravos FROM authenticated; -- select/insert/update conserves

-- Preferences parent : pas de suppression via API.
REVOKE DELETE, TRUNCATE ON public.parent_preferences FROM authenticated;

-- Outbox : totalement fermee a l'API (seul kerskol_mailer garde sa policy).
REVOKE ALL ON public.mail_outbox FROM authenticated;

-- Enregistrement de la migration.
INSERT INTO public.schema_migrations (version)
VALUES ('0007_privileges_lockdown')
ON CONFLICT (version) DO NOTHING;
