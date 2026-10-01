#!/usr/bin/env bash
# maintenance.sh - taches de purge periodiques de kerskol.
#   * purge_comptes_orphelins() : comptes auth sans foyer/profil/lien, > 24 h.
#   * purge_mail_outbox()       : lignes d'outbox envoyees depuis > 7 jours.
#
# Tout est execute DANS le conteneur db en superuser postgres (les fonctions
# sont SECURITY DEFINER et fermees a l'API). Aucune donnee reelle (foyers,
# profils relies) n'est touchee : seuls les comptes orphelins recents partent.
#
# Cron hote recommande (quotidien, apres la sauvegarde) :
#   50 3 * * * /opt/kerskol/deploy/maintenance.sh >> /opt/kerskol/maintenance.log 2>&1
set -euo pipefail

KERSKOL_DIR="${KERSKOL_DIR:-/opt/kerskol}"
ENV_FILE="${KERSKOL_DIR}/.env"
DEPLOY_DIR="${KERSKOL_DIR}/deploy"
PROJECT="kerskol"
DB_SERVICE="kerskol-db"

[ -f "$ENV_FILE" ] || { echo "Erreur : ${ENV_FILE} introuvable." >&2; exit 1; }
POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
[ -n "$POSTGRES_PASSWORD" ] || { echo "Erreur : POSTGRES_PASSWORD absent." >&2; exit 1; }

cd "$DEPLOY_DIR"

psql_db() {
  docker compose -p "$PROJECT" --env-file "$ENV_FILE" exec -T \
    -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_SERVICE" \
    psql -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
ORPH="$(psql_db -tAc "SELECT public.purge_comptes_orphelins()")"
MAILS="$(psql_db -tAc "SELECT public.purge_mail_outbox()")"
echo "${TS} purge : comptes_orphelins=${ORPH} mail_outbox=${MAILS}"
