#!/usr/bin/env bash
# test-db.sh - execute les tests SQL (RLS + progression) dans le conteneur db.
#
# Tout est joue dans une transaction ROLLBACK : aucune donnee de test ne reste.
# Sortie != 0 si un test echoue (RAISE EXCEPTION dans le script SQL).
#
#   deploy/test-db.sh
set -euo pipefail

KERSKOL_DIR="${KERSKOL_DIR:-/opt/kerskol}"
ENV_FILE="${KERSKOL_DIR}/.env"
DEPLOY_DIR="${KERSKOL_DIR}/deploy"
TESTS_DIR="${KERSKOL_DIR}/supabase/tests"
PROJECT="kerskol"
DB_SERVICE="kerskol-db"

[ -f "$ENV_FILE" ] || { echo "Erreur : ${ENV_FILE} introuvable." >&2; exit 1; }
POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
[ -n "$POSTGRES_PASSWORD" ] || { echo "Erreur : POSTGRES_PASSWORD absent." >&2; exit 1; }

cd "$DEPLOY_DIR"

run_test() {
  local file="$1"
  echo "==> Test : $(basename "$file")"
  docker compose -p "$PROJECT" --env-file "$ENV_FILE" exec -T \
    -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_SERVICE" \
    psql -v ON_ERROR_STOP=1 -U postgres -d postgres < "$file"
}

status=0
for f in "$TESTS_DIR"/*.sql; do
  if ! run_test "$f"; then
    echo "ECHEC : $(basename "$f")" >&2
    status=1
  fi
done

[ "$status" -eq 0 ] && echo "Tous les tests SQL sont PASS." || echo "Des tests SQL ont ECHOUE." >&2
exit "$status"
