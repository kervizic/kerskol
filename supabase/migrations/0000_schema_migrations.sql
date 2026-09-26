-- 0000_schema_migrations.sql
-- Suivi des migrations appliquees. Idempotent : peut etre rejoue sans effet.
-- La table est volontairement minimale ; deploy.sh l'utilise pour ne rejouer
-- que les migrations non encore enregistrees.

CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version    text        PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.schema_migrations IS
    'Versions de migrations SQL deja appliquees (gere par deploy.sh).';

-- On enregistre cette migration elle-meme.
INSERT INTO public.schema_migrations (version)
VALUES ('0000_schema_migrations')
ON CONFLICT (version) DO NOTHING;
