// Journalisation volontairement pauvre en donnees : JAMAIS d'email en clair,
// jamais de contenu de message. On ne logue que des identifiants techniques.

function line(level, message, meta) {
  const payload = { level, msg: message, ...(meta || {}) };
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(payload));
}

export const logger = {
  info: (message, meta) => line('info', message, meta),
  warn: (message, meta) => line('warn', message, meta),
  error: (message, meta) => line('error', message, meta),
};

// Neutralise tout ce qui ressemble a une adresse email dans un texte d'erreur,
// pour ne jamais fuiter un destinataire dans derniere_erreur / les logs.
export function redactEmails(text) {
  if (!text) return text;
  return String(text).replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[email-masque]',
  );
}
