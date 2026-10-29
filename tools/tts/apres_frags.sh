#!/bin/bash
# apres_frags.sh - suite automatique apres la generation des 383 fragments
# de correction (frag:*) sur manu-win (gen_frags.cmd, sortie_frags).
#
# A lancer en nohup depuis le Mac (processus systeme, pas une tache Claude) :
#   nohup bash tools/tts/apres_frags.sh > ~/Library/Logs/kerskol_apres_frags.log 2>&1 &
#
# Etapes :
#   1. attendre (boucle, sleep 120) que gen_frags soit termine : soit 383
#      fichiers mp3 presents dans sortie_frags\c1s33-v1, soit plus aucun
#      process python.exe sur manu-win (fin normale ou crash) ;
#   2. deployer les fragments : WIN_OUT=...sortie_frags SKIP_ASR=1 deploy_lot.py ;
#   3. relancer gen_full (clips prose restants), detache, comme avant ;
# tout est journalise dans ~/Library/Logs/kerskol_apres_frags.log (stdout/stderr
# du script, rediriges par l'appelant).
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO" || exit 1

WIN="manu-win"
WIN_OPTS=(-o BatchMode=yes -o ConnectTimeout=12)
FRAGS_TOTAL=383
FRAGS_DIR_WIN='C:\kerskol-tts\sortie_frags\c1s33-v1'

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

count_frags() {
  ssh "${WIN_OPTS[@]}" "$WIN" \
    "powershell -NoProfile -Command \"(Get-ChildItem '$FRAGS_DIR_WIN\\*.mp3' -ErrorAction SilentlyContinue).Count\"" \
    2>/dev/null | tr -d '[:space:]'
}

python_running() {
  ssh "${WIN_OPTS[@]}" "$WIN" \
    "powershell -NoProfile -Command \"(Get-Process python* -ErrorAction SilentlyContinue).Count\"" \
    2>/dev/null | tr -d '[:space:]'
}

log "=== apres_frags demarre (attente fin gen_frags, cible=${FRAGS_TOTAL}) ==="

while true; do
  n="$(count_frags)"
  running="$(python_running)"
  log "fragments=${n:-?}/${FRAGS_TOTAL} python_actif=${running:-?}"

  if [[ "$n" =~ ^[0-9]+$ ]] && [ "$n" -ge "$FRAGS_TOTAL" ]; then
    log "383 fragments atteints : gen_frags termine."
    break
  fi
  if [[ "$running" =~ ^[0-9]+$ ]] && [ "$running" -eq 0 ]; then
    log "plus aucun process python sur manu-win : gen_frags termine (ou arrete)."
    break
  fi
  sleep 120
done

log "=== deploiement des fragments (deploy_lot.py, WIN_OUT=sortie_frags, SKIP_ASR=1) ==="
WIN_OUT='C:\kerskol-tts\sortie_frags' SKIP_ASR=1 python3 tools/tts/deploy_lot.py
rc=$?
log "deploy_lot.py termine, code retour=${rc}"

log "=== relance de gen_full (clips prose restants) ==="
nohup caffeinate -i ssh -o BatchMode=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=10 \
  "$WIN" "cmd /c C:\\kerskol-tts\\gen_full.cmd" > ~/Library/Logs/kerskol_gen_full.log 2>&1 &
log "gen_full relance (pid caffeinate=$!)."

log "=== apres_frags termine ==="
