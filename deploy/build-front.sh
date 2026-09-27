#!/usr/bin/env bash
# build-front.sh - construit la page d'attente dans frontend/dist avec des
# assets EMPREINTES (content-hash) et injecte la version d'application.
#
# Appele par deploy.sh (branche "pas de package.json") mais aussi lancable seul
# pour un deploiement front-only :
#     bash deploy/build-front.sh <FRONTEND_DIR> <VERSION>
#
# Sortie dans <FRONTEND_DIR>/dist :
#   index.html                         (no-store ; refs empreintees ; <meta app-version>)
#   version.json                       (no-store)
#   theme/tokens.<hash>.css            (immutable, empreinte)
#   theme/app-version.<hash>.js        (immutable, empreinte)
#   theme/fonts/Andika-*.<hash>.woff2  (immutable, empreinte)
#   theme/fonts/OFL.txt, theme/README.md (documentation)
#
# Regle de cache : tout asset servi en cache long est empreinte par son contenu
# (le nom change quand le contenu change) ; index.html et version.json ne sont
# jamais mis en cache. Compatible avec un futur build Vite (memes conventions
# d'empreinte + version.json + <meta app-version>).
set -euo pipefail

FRONTEND_DIR="${1:?usage: build-front.sh <FRONTEND_DIR> <VERSION>}"
VERSION="${2:?version manquante}"

SRC_THEME="${FRONTEND_DIR}/theme"
PLACEHOLDER="${FRONTEND_DIR}/placeholder/index.html"
DIST="${FRONTEND_DIR}/dist"
DIST_THEME="${DIST}/theme"

hash10() { sha256sum "$1" | cut -c1-10; }

# Reconstruit dist proprement (evite de laisser trainer d'anciens assets empreintes).
rm -rf "$DIST"
mkdir -p "$DIST_THEME/fonts"

# --- Polices : copie sous nom empreinte, on retient le mapping base->nouveau nom.
declare -A FONTMAP
for f in "$SRC_THEME"/fonts/*.woff2; do
  base="$(basename "$f" .woff2)"          # ex. Andika-Regular
  h="$(hash10 "$f")"
  newname="${base}.${h}.woff2"
  cp "$f" "$DIST_THEME/fonts/${newname}"
  FONTMAP["${base}.woff2"]="${newname}"
done
cp "$SRC_THEME/fonts/OFL.txt" "$DIST_THEME/fonts/OFL.txt"
[ -f "$SRC_THEME/README.md" ] && cp "$SRC_THEME/README.md" "$DIST_THEME/README.md"

# --- tokens.css : reecrit les url() de polices vers les noms empreintes, puis empreinte le fichier.
cp "$SRC_THEME/tokens.css" "$DIST_THEME/tokens.css"
for orig in "${!FONTMAP[@]}"; do
  sed -i "s#fonts/${orig}#fonts/${FONTMAP[$orig]}#g" "$DIST_THEME/tokens.css"
done
TOK_HASH="$(hash10 "$DIST_THEME/tokens.css")"
mv "$DIST_THEME/tokens.css" "$DIST_THEME/tokens.${TOK_HASH}.css"
TOKENS_REF="/theme/tokens.${TOK_HASH}.css"

# --- app-version.js : empreinte.
cp "$SRC_THEME/app-version.js" "$DIST_THEME/app-version.js"
AV_HASH="$(hash10 "$DIST_THEME/app-version.js")"
mv "$DIST_THEME/app-version.js" "$DIST_THEME/app-version.${AV_HASH}.js"
AV_REF="/theme/app-version.${AV_HASH}.js"

# --- index.html : reecrit les references + injecte la version.
cp "$PLACEHOLDER" "$DIST/index.html"
sed -i "s#/theme/tokens.css#${TOKENS_REF}#g" "$DIST/index.html"
sed -i "s#/theme/app-version.js#${AV_REF}#g" "$DIST/index.html"
REG_REF="/theme/fonts/${FONTMAP[Andika-Regular.woff2]}"
sed -i "s#/theme/fonts/Andika-Regular.woff2#${REG_REF}#g" "$DIST/index.html"
sed -i "s#__APP_VERSION__#${VERSION}#g" "$DIST/index.html"

# --- Pages statiques additionnelles (pages legales) --------------------------
# Sources dans frontend/public/*.html : copiees telles quelles (survivent aussi
# a un futur build Vite qui copie public/ verbatim), avec les memes reecritures
# de references de theme que index.html (tokens empreinte + police preload).
PUBLIC_DIR="${FRONTEND_DIR}/public"
if [ -d "$PUBLIC_DIR" ]; then
  for pg in "$PUBLIC_DIR"/*.html; do
    [ -e "$pg" ] || continue
    name="$(basename "$pg")"
    cp "$pg" "$DIST/$name"
    sed -i "s#/theme/tokens.css#${TOKENS_REF}#g" "$DIST/$name"
    sed -i "s#/theme/fonts/Andika-Regular.woff2#${REG_REF}#g" "$DIST/$name"
    sed -i "s#__APP_VERSION__#${VERSION}#g" "$DIST/$name"
    echo "      page: /${name%.html} (${name})"
  done
fi

# --- version.json (no-store).
COMMIT="${VERSION%%-*}"
printf '{"version":"%s","commit":"%s","builtAt":"%s"}\n' \
  "$VERSION" "$COMMIT" "${VERSION#*-}" > "$DIST/version.json"

echo "    front construit : version=${VERSION}"
echo "      ${TOKENS_REF}"
echo "      ${AV_REF}"
echo "      ${REG_REF}"
