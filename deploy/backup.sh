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

# --- Sauvegarde des fichiers audio (voix TTS) -------------------------------
# Les mp3 vivent dans /opt/kerskol/audio, HORS git (deposes sur le VPS, jamais
# committes). Ils ne sont donc PAS couverts par le dump SQL ci-dessus. Incident
# du 29/10 : ce dossier a ete efface (git clean sur un dossier untracked), voix
# muette, et AUCUNE sauvegarde n'existait pour le restaurer. On corrige :
#   1. un miroir rsync TOUJOURS a jour (restauration instantanee), SANS --delete
#      -> un effacement de la source ne detruit JAMAIS la sauvegarde ;
#   2. un instantane tar.gz date (recuperation a une date donnee), avec rotation.
AUDIO_SRC="${KERSKOL_AUDIO_DIR:-/opt/kerskol/audio}"
AUDIO_MIRROR="${BACKUP_DIR}/audio"
NB_MP3="$(find "$AUDIO_SRC" -type f -name '*.mp3' 2>/dev/null | wc -l | tr -d ' ')"
if [ "${NB_MP3:-0}" -gt 0 ]; then
  mkdir -p "$AUDIO_MIRROR"
  # Pas de --delete : la sauvegarde ne perd jamais un fichier meme si la source
  # est videe entre deux passages.
  rsync -a "$AUDIO_SRC/" "$AUDIO_MIRROR/"
  AUDIO_TAR="${BACKUP_DIR}/audio-${TS}.tar.gz"
  tar -czf "$AUDIO_TAR" -C "$AUDIO_SRC" .
  chmod 600 "$AUDIO_TAR"
  echo "OK : audio sauvegarde (${NB_MP3} mp3) -> miroir ${AUDIO_MIRROR} + ${AUDIO_TAR} ($(du -h "$AUDIO_TAR" | cut -f1))."
  find "$BACKUP_DIR" -name 'audio-*.tar.gz' -type f -mtime +"$RETENTION_DAYS" -delete
else
  # Source vide/absente : surtout NE PAS ecraser une sauvegarde saine existante.
  echo "ATTENTION : ${AUDIO_SRC} vide ou absent (${NB_MP3:-0} mp3). Sauvegarde audio ignoree (miroir precedent conserve intact)." >&2
fi
