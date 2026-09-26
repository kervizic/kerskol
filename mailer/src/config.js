// Configuration du mailer, lue depuis l'environnement (aucune valeur en dur).
// Echoue au demarrage si une variable obligatoire manque.

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    // eslint-disable-next-line no-console
    console.error(`[mailer] variable d'environnement obligatoire manquante : ${name}`);
    process.exit(1);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  gmail: {
    clientId: required('GMAIL_CLIENT_ID'),
    clientSecret: required('GMAIL_CLIENT_SECRET'),
    refreshToken: required('GMAIL_REFRESH_TOKEN'),
  },
  mailFrom: required('MAIL_FROM'),
  mailFromName: optional('MAIL_FROM_NAME', 'Kerskol'),
  pollIntervalMs: Number.parseInt(optional('POLL_INTERVAL_MS', '60000'), 10),
  maxAttempts: Number.parseInt(optional('MAX_ATTEMPTS', '5'), 10),
  batchSize: Number.parseInt(optional('BATCH_SIZE', '10'), 10),
  // Ping periodique pour maintenir le refresh_token vivant (Gmail expire un
  // refresh_token apres ~6 mois d'inactivite). ~24 jours par defaut.
  keepAliveMs: Number.parseInt(optional('KEEPALIVE_MS', String(24 * 24 * 60 * 60 * 1000)), 10),
};
