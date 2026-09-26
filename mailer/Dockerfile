# Mailer Kerskol : worker outbox -> Gmail. Image slim, utilisateur non-root.
FROM node:22.20.0-alpine3.21

ENV NODE_ENV=production

WORKDIR /app

# Deps d'abord (cache de couche). Aucune dep de build native n'est requise.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# Code applicatif
COPY src ./src

# Utilisateur non-root fourni par l'image node (uid 1000).
USER node

# Aucun port expose : ce service ne fait que consommer l'outbox.
CMD ["node", "src/index.js"]
