#!/bin/sh
# Script d'init Postgres (execute UNE SEULE FOIS, au premier demarrage du
# volume, par l'entrypoint de l'image supabase/postgres).
#
# Role : aligner les mots de passe des roles techniques Supabase sur la valeur
# de POSTGRES_PASSWORD (fournie par /opt/kerskol/.env). Aucun secret n'est ecrit
# ici : les valeurs viennent de l'environnement au runtime.
#
# Ce script est monte sous le nom zzz-kerskol-roles.sh : il s'execute APRES les
# scripts d'init de l'image supabase (qui creent le role postgres, le role
# supabase_admin et appliquent les migrations auth/realtime). On se contente donc
# d'ajustements idempotents par-dessus une base deja correctement initialisee.
#
# Le role applicatif kerskol_mailer n'est PAS traite ici : il est cree par la
# migration 0001, puis active (LOGIN + mot de passe) par deploy.sh.
set -eu

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD manquant}"

psql -v ON_ERROR_STOP=1 \
     --username "${POSTGRES_USER:-postgres}" \
     --dbname "${POSTGRES_DB:-postgres}" \
     -v pw="$POSTGRES_PASSWORD" <<'SQL'
-- Roles standard Supabase (crees par l'image si absents ; on securise malgre tout).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE;
  END IF;
END
$$;

-- authenticator peut endosser les roles applicatifs (modele PostgREST).
GRANT anon, authenticated, service_role TO authenticator;

-- Mots de passe + LOGIN alignes sur POSTGRES_PASSWORD.
ALTER ROLE authenticator       WITH LOGIN PASSWORD :'pw';
ALTER ROLE supabase_auth_admin WITH LOGIN PASSWORD :'pw';

-- GoTrue gere son propre schema auth (cree si absent avant ses migrations).
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;

-- GoTrue cree ses tables (et sa table schema_migrations) dans le schema auth :
-- on force le search_path du role pour eviter qu'il ne vise "public" (ou il n'a
-- pas le droit CREATE).
ALTER ROLE supabase_auth_admin SET search_path = auth;
SQL

echo "[initdb] roles Supabase alignes."
