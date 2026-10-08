#!/usr/bin/env bash
# verify-api.sh - verifie que PostgREST expose bien le referentiel avec les
# bons droits, apres migrations/seed.
#
#   * Recharge le cache de schema de PostgREST (NOTIFY pgrst).
#   * Avec l'ANON_KEY : l'acces a /rest/v1/competences doit etre REFUSE
#     (anon n'a aucun droit) => code HTTP != 200.
#   * Avec un JWT authenticated signe LOCALEMENT (JWT_SECRET, jamais affiche) :
#     acces autorise => 200 et autant de competences que le referentiel en
#     contient (compte lu en base, pas une valeur figee : le referentiel grandit
#     a chaque lot pedagogique).
#
# Aucun secret n'est affiche. A lancer sur le VPS.
set -euo pipefail

KERSKOL_DIR="${KERSKOL_DIR:-/opt/kerskol}"
ENV_FILE="${KERSKOL_DIR}/.env"
DEPLOY_DIR="${KERSKOL_DIR}/deploy"
PROJECT="kerskol"
DB_SERVICE="kerskol-db"
REST_BASE="${REST_BASE:-http://127.0.0.1:3001}"

[ -f "$ENV_FILE" ] || { echo "Erreur : ${ENV_FILE} introuvable." >&2; exit 1; }

get_env() { grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d= -f2-; }
POSTGRES_PASSWORD="$(get_env POSTGRES_PASSWORD)"
JWT_SECRET="$(get_env JWT_SECRET)"
ANON_KEY="$(get_env ANON_KEY)"
[ -n "$JWT_SECRET" ] || { echo "Erreur : JWT_SECRET absent." >&2; exit 1; }
[ -n "$ANON_KEY" ]   || { echo "Erreur : ANON_KEY absent." >&2; exit 1; }

# --- Rechargement du cache de schema PostgREST -----------------------------
echo "==> NOTIFY pgrst, 'reload schema'"
docker compose -p "$PROJECT" --env-file "$ENV_FILE" exec -T \
  -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_SERVICE" \
  psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c "NOTIFY pgrst, 'reload schema';" >/dev/null
sleep 2

# --- Fabrication d'un JWT authenticated (HS256) signe avec JWT_SECRET -------
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
NOW="$(date +%s)"; EXP="$((NOW + 300))"
HEADER='{"alg":"HS256","typ":"JWT"}'
PAYLOAD="{\"role\":\"authenticated\",\"aud\":\"authenticated\",\"iat\":${NOW},\"exp\":${EXP},\"sub\":\"00000000-0000-0000-0000-000000000000\"}"
H="$(printf '%s' "$HEADER"  | b64url)"
P="$(printf '%s' "$PAYLOAD" | b64url)"
SIG="$(printf '%s' "${H}.${P}" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64url)"
JWT="${H}.${P}.${SIG}"

curl_code() { # $1 = token
  curl -s -o /tmp/verify_body -w '%{http_code}' \
    -H "apikey: $1" -H "Authorization: Bearer $1" \
    "${REST_BASE}/competences?select=code"
}

status=0

# --- 1. anon : doit etre refuse -------------------------------------------
CODE_ANON="$(curl_code "$ANON_KEY")"
if [ "$CODE_ANON" != "200" ]; then
  echo "PASS anon refuse (HTTP ${CODE_ANON})"
else
  echo "FAIL anon devrait etre refuse (HTTP 200)"; status=1
fi

# --- 2. authenticated : 200 + autant de competences que le referentiel --------
# Nombre attendu = compte reel en base (le referentiel grandit a chaque lot).
EXPECTED="$(docker compose -p "$PROJECT" --env-file "$ENV_FILE" exec -T \
  -e PGPASSWORD="$POSTGRES_PASSWORD" "$DB_SERVICE" \
  psql -tAq -U postgres -d postgres -c "SELECT count(*) FROM public.competences" | tr -d '[:space:]')"
CODE_AUTH="$(curl_code "$JWT")"
NB="$(grep -o '"code"' /tmp/verify_body | wc -l | tr -d ' ')"
if [ "$CODE_AUTH" = "200" ] && [ "$NB" = "$EXPECTED" ]; then
  echo "PASS authenticated : HTTP 200, ${NB} competences"
else
  echo "FAIL authenticated : HTTP ${CODE_AUTH}, ${NB} competences (attendu 200/${EXPECTED})"; status=1
fi

rm -f /tmp/verify_body
[ "$status" -eq 0 ] && echo "verify-api : OK" || echo "verify-api : ECHEC" >&2
exit "$status"
