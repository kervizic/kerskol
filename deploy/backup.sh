#!/usr/bin/env bash
# backup.sh - sauvegarde quotidienne de la base kerskol (pg_dump compresse).
# Rotation : 14 jours. Destination : /opt/kerskol/backups.
#
# Cron (exemple, tous les jours a 03:30) :
#   30 3 * * * /opt/kerskol/deploy/backup.sh >> /var/log/kerskol-backup.log 2>&1
set -euo pipefail

KERSKOL_DIR="${KERSKOL_DIR:-/opt/kerskol}"
ENV_FILE="${KERSKOL_DIR}/.env"
BACKUP_DIR="${KERSKOL_DIR}/backups"
PROJECT="kerskol"
DB_SERVICE="kerskol-db"
RETENTION_DAYS=14

[ -f "$ENV_FILE" ] || { echo "Erreur : ${ENV_FILE} introuvable." >&2; exit 1; }

# Charge POSTGRES_PASSWORD (uniquement) sans exposer le reste.
POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
[ -n "$POSTGRES_PASSWORD" ] || { echo "Erreur : POSTGRES_PASSWORD absent du .env." >&2; exit 1; }

mkdir -p "$BACKUP_DIR"

TS="$(date -u +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/kerskol-${TS}.sql.gz"

cd "$KERSKOL_DIR/deploy"

# pg_dump execute DANS le conteneur, sortie compressee cote hote.
docker compose -p "$PROJECT" --env-file "$ENV_FILE" exec -T \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  "$DB_SERVICE" \
  pg_dump -U postgres -d postgres --no-owner --clean --if-exists \
  | gzip -9 > "$OUT"

# Verifie que le dump n'est pas vide.
if [ ! -s "$OUT" ]; then
  echo "Erreur : sauvegarde vide, suppression de ${OUT}." >&2
  rm -f "$OUT"
  exit 1
fi

chmod 600 "$OUT"
echo "OK : sauvegarde ${OUT} ($(du -h "$OUT" | cut -f1))."

# Rotation : suppression des sauvegardes de plus de RETENTION_DAYS jours.
find "$BACKUP_DIR" -name 'kerskol-*.sql.gz' -type f -mtime +"$RETENTION_DAYS" -delete
echo "Rotation : sauvegardes de plus de ${RETENTION_DAYS} jours supprimees."
