#!/usr/bin/env bash
# run.sh - captures Playwright des composants d'UI (lots CM1), EN DOCKER.
#
# Deux etapes, aucune installation sur l'hote :
#   1. build des stories (node:22-alpine) -> frontend/stories-dist/
#   2. capture (image officielle mcr.microsoft.com/playwright, Chromium fourni)
#      -> docs/captures/<story>-<390|820>.png (hors git)
#
# Usage (sur le VPS) :   bash tools/captures/run.sh
# Puis : rapatrier les PNG en local (scp) et LES REGARDER avant tout deploiement
# d'UI.
set -euo pipefail

ROOT="${KERSKOL_DIR:-/opt/kerskol}"
FRONT="${ROOT}/frontend"
PW_VERSION="1.47.2"

echo "==> 1/2 build des stories (node:22-alpine)"
docker run --rm -v "${FRONT}:/app" -w /app node:22-alpine sh -c '
  if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
  npx vite build --config vite.stories.config.ts'

echo "==> 2/2 capture Playwright (mcr.microsoft.com/playwright:v${PW_VERSION}-jammy)"
mkdir -p "${ROOT}/docs/captures"
docker run --rm \
  -v "${FRONT}:/app" \
  -v "${ROOT}/docs/captures:/captures" \
  -w /app \
  "mcr.microsoft.com/playwright:v${PW_VERSION}-jammy" \
  node stories/capture.mjs /captures

echo "==> captures dans ${ROOT}/docs/captures (hors git)"
ls -1 "${ROOT}/docs/captures"
