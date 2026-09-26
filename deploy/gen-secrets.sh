#!/usr/bin/env bash
# gen-secrets.sh - A LANCER SUR LE VPS uniquement.
#
# Genere /opt/kerskol/.env avec les secrets techniques :
#   - POSTGRES_PASSWORD
#   - JWT_SECRET (>= 40 caracteres)
#   - KERSKOL_MAILER_PASSWORD (mot de passe du role kerskol_mailer)
#   - ANON_KEY et SERVICE_ROLE_KEY : JWT HS256 signes avec JWT_SECRET
#
# Laisse VIDES (a completer a la main) : OAuth Google, identifiants Gmail.
#
# - Refuse d'ecraser un .env existant.
# - chmod 600.
# - N'affiche JAMAIS la moindre valeur secrete.
set -euo pipefail

ENV_DIR="${KERSKOL_DIR:-/opt/kerskol}"
ENV_FILE="${ENV_DIR}/.env"

if [ ! -d "$ENV_DIR" ]; then
  echo "Erreur : le dossier ${ENV_DIR} n'existe pas. Clonez le depot d'abord." >&2
  exit 1
fi

if [ -e "$ENV_FILE" ]; then
  echo "Erreur : ${ENV_FILE} existe deja. Refus d'ecraser (supprimez-le manuellement si voulu)." >&2
  exit 1
fi

command -v openssl >/dev/null 2>&1 || { echo "Erreur : openssl requis." >&2; exit 1; }

# --- Helpers ---------------------------------------------------------------
# base64url sans padding, sur stdin.
b64url() {
  openssl base64 -A | tr '+/' '-_' | tr -d '='
}

# JWT HS256 : $1 = payload JSON compact, $2 = secret.
make_jwt() {
  local payload="$1" secret="$2" header signed_input signature
  header='{"alg":"HS256","typ":"JWT"}'
  local header_b64 payload_b64
  header_b64="$(printf '%s' "$header" | b64url)"
  payload_b64="$(printf '%s' "$payload" | b64url)"
  signed_input="${header_b64}.${payload_b64}"
  signature="$(printf '%s' "$signed_input" \
    | openssl dgst -sha256 -hmac "$secret" -binary \
    | b64url)"
  printf '%s.%s' "$signed_input" "$signature"
}

# --- Generation des secrets (hex : sans caractere problematique en URL) ----
POSTGRES_PASSWORD="$(openssl rand -hex 32)"          # 64 caracteres
JWT_SECRET="$(openssl rand -hex 32)"                 # 64 caracteres (>= 40)
KERSKOL_MAILER_PASSWORD="$(openssl rand -hex 24)"    # 48 caracteres

IAT="$(date +%s)"
EXP="$(( IAT + 60 * 60 * 24 * 365 * 10 ))"           # +10 ans

ANON_KEY="$(make_jwt "{\"role\":\"anon\",\"iss\":\"supabase\",\"iat\":${IAT},\"exp\":${EXP}}" "$JWT_SECRET")"
SERVICE_ROLE_KEY="$(make_jwt "{\"role\":\"service_role\",\"iss\":\"supabase\",\"iat\":${IAT},\"exp\":${EXP}}" "$JWT_SECRET")"

# --- Ecriture du .env (umask strict des la creation) -----------------------
umask 177
cat > "$ENV_FILE" <<EOF
# /opt/kerskol/.env - genere par gen-secrets.sh le $(date -u +%Y-%m-%dT%H:%M:%SZ)
# NE JAMAIS committer ce fichier. NE JAMAIS le partager.

# --- PostgreSQL ---
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# --- JWT / cles Supabase (ANON_KEY et SERVICE_ROLE_KEY signes avec JWT_SECRET) ---
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# --- Role technique du mailer ---
KERSKOL_MAILER_PASSWORD=${KERSKOL_MAILER_PASSWORD}

# --- URLs publiques ---
SITE_URL=https://kerskol.fr
API_EXTERNAL_URL=https://kerskol.fr

# --- Authentification Google (parent) : A COMPLETER a la main ---
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=
GOTRUE_EXTERNAL_GOOGLE_SECRET=

# --- Envoi de mails via Gmail (OAuth2) : A COMPLETER a la main ---
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
MAIL_FROM=
MAIL_FROM_NAME=Kerskol

# --- Reglages optionnels du mailer ---
MAILER_POLL_INTERVAL_MS=60000
MAILER_MAX_ATTEMPTS=5
EOF

chmod 600 "$ENV_FILE"

echo "OK : ${ENV_FILE} genere (chmod 600)."
echo "Secrets techniques generes : POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, KERSKOL_MAILER_PASSWORD."
echo "A COMPLETER a la main : GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID/SECRET, GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN, MAIL_FROM."
echo "(Aucune valeur secrete n'est affichee par ce script.)"
