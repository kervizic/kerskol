#!/usr/bin/env bash
# deploy.sh - deploiement / mise a jour de kerskol sur le VPS.
#
# Etapes :
#   1. git pull
#   2. docker compose -p kerskol up -d (build mailer si besoin)
#   3. applique les migrations SQL en attente (table schema_migrations)
#   4. active le role kerskol_mailer (LOGIN + mot de passe depuis .env)
#   5. (optionnel) build du front Vite
#   6. nginx -t puis reload (JAMAIS restart) ; arret si nginx -t echoue
set -euo pipefail

KERSKOL_DIR="${KERSKOL_DIR:-/opt/kerskol}"
ENV_FILE="${KERSKOL_DIR}/.env"
DEPLOY_DIR="${KERSKOL_DIR}/deploy"
MIGRATIONS_DIR="${KERSKOL_DIR}/supabase/migrations"
FRONTEND_DIR="${KERSKOL_DIR}/frontend"
PROJECT="kerskol"
DB_SERVICE="kerskol-db"

[ -f "$ENV_FILE" ] || { echo "Erreur : ${ENV_FILE} introuvable. Lancez gen-secrets.sh." >&2; exit 1; }

POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
KERSKOL_MAILER_PASSWORD="$(grep -E '^KERSKOL_MAILER_PASSWORD=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
[ -n "$POSTGRES_PASSWORD" ] || { echo "Erreur : POSTGRES_PASSWORD absent." >&2; exit 1; }
[ -n "$KERSKOL_MAILER_PASSWORD" ] || { echo "Erreur : KERSKOL_MAILER_PASSWORD absent." >&2; exit 1; }

echo "==> 1/6 git pull"
cd "$KERSKOL_DIR"
git pull --ff-only

echo "==> 2/6 docker compose up -d (db, auth, rest ; mailer via profil 'mail')"
cd "$DEPLOY_DIR"
# Sans --profile mail, le service kerskol-mailer (profils: ["mail"]) reste eteint.
docker compose -p "$PROJECT" --env-file "$ENV_FILE" up -d --build

echo "    attente de la base (health)..."
for i in $(seq 1 30); do
  if docker compose -p "$PROJECT" --env-file "$ENV_FILE" exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_SERVICE" \
       pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    break
  fi
  sleep 2
  [ "$i" -eq 30 ] && { echo "Erreur : base non disponible." >&2; exit 1; }
done

# Helper psql (dans le conteneur, superuser postgres).
psql_db() {
  docker compose -p "$PROJECT" --env-file "$ENV_FILE" exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_SERVICE" \
    psql -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

echo "    attente de la table auth.users (creee par GoTrue)..."
# La migration 0001 a une FK vers auth.users : on attend que GoTrue ait fini
# ses propres migrations avant d'appliquer les notres (evite une course au
# premier deploiement).
for i in $(seq 1 30); do
  if [ "$(psql_db -tAc "SELECT to_regclass('auth.users') IS NOT NULL")" = "t" ]; then
    break
  fi
  sleep 2
  [ "$i" -eq 30 ] && { echo "Erreur : auth.users absente (GoTrue non pret)." >&2; exit 1; }
done

echo "==> 3/6 migrations en attente"
# Liste des versions deja appliquees (vide si la table n'existe pas encore).
APPLIED="$(psql_db -tAc \
  "SELECT version FROM public.schema_migrations" 2>/dev/null || true)"

for file in $(ls -1 "$MIGRATIONS_DIR"/*.sql | sort); do
  version="$(basename "$file" .sql)"
  if printf '%s\n' "$APPLIED" | grep -qx "$version"; then
    echo "    - ${version} : deja appliquee"
    continue
  fi
  echo "    - ${version} : application"
  psql_db < "$file"
done

echo "==> 4/6 activation du role kerskol_mailer"
psql_db -v pw="$KERSKOL_MAILER_PASSWORD" <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kerskol_mailer') THEN
    RAISE EXCEPTION 'role kerskol_mailer absent : migration 0001 non appliquee ?';
  END IF;
END
$$;
ALTER ROLE kerskol_mailer WITH LOGIN PASSWORD :'pw';
SQL
# Le mailer ne demarre que si les identifiants Gmail sont presents (profil "mail").
# Tant que GMAIL_CLIENT_ID est vide, on laisse le service eteint.
GMAIL_CLIENT_ID="$(grep -E '^GMAIL_CLIENT_ID=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
if [ -n "${GMAIL_CLIENT_ID:-}" ]; then
  echo "    identifiants Gmail presents : demarrage/redemarrage du mailer"
  docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile mail up -d --build kerskol-mailer
else
  echo "    identifiants Gmail absents : mailer non demarre (profil 'mail' inactif)"
fi

echo "==> 5/6 front : build via Docker (jamais de npm sur l'hote) ou page d'attente"
DIST_DIR="${FRONTEND_DIR}/dist"
# Version d'application = hash court du commit + horodatage UTC. Sert au
# rechargement fiable cote client (voir frontend/theme/app-version.js).
GIT_SHORT="$(git -C "$KERSKOL_DIR" rev-parse --short HEAD)"
BUILD_UTC="$(date -u +%Y%m%dT%H%M%SZ)"
APP_VERSION="${GIT_SHORT}-${BUILD_UTC}"
echo "    version applicative : ${APP_VERSION}"
if [ -f "${FRONTEND_DIR}/package.json" ]; then
  echo "    build via docker run node:22-alpine (aucun npm sur l'hote)"
  docker run --rm \
    -v "${FRONTEND_DIR}:/app" \
    -w /app \
    -e APP_VERSION="${APP_VERSION}" \
    node:22-alpine \
    sh -c "npm ci && npm run build"
  # Le build Vite doit produire des noms empreintes (hash de contenu) et
  # inclure <meta name="app-version"> + le script app-version.js. On garantit
  # au minimum la presence de version.json (no-store) pour le client.
  COMMIT="${APP_VERSION%%-*}"
  printf '{"version":"%s","commit":"%s","builtAt":"%s"}\n' \
    "$APP_VERSION" "$COMMIT" "${APP_VERSION#*-}" > "${DIST_DIR}/version.json"
  echo "    build front OK (servi depuis ${DIST_DIR})"
else
  echo "    pas de frontend/package.json : construction de la page d'attente (assets empreintes)"
  bash "${DEPLOY_DIR}/build-front.sh" "${FRONTEND_DIR}" "${APP_VERSION}"
fi

echo "==> 6/6 nginx : test puis reload"
if sudo nginx -t; then
  sudo systemctl reload nginx
  echo "    nginx recharge."
else
  echo "Erreur : 'nginx -t' a echoue. Nginx N'A PAS ete recharge." >&2
  exit 1
fi

echo "Deploiement termine."
