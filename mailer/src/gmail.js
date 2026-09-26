// Client Gmail via OAuth2 (refresh_token), scope gmail.send uniquement.
// Meme methode que DICT : googleapis + google.auth.OAuth2, envoi par
// users.messages.send avec un message MIME base64url. Aucun SMTP.

import { google } from 'googleapis';
import { config } from './config.js';
import { buildRawMessage } from './mime.js';
import { logger } from './logger.js';

let gmailClient = null;
let oauth2Client = null;

function getClient() {
  if (gmailClient) return gmailClient;
  oauth2Client = new google.auth.OAuth2(config.gmail.clientId, config.gmail.clientSecret);
  oauth2Client.setCredentials({ refresh_token: config.gmail.refreshToken });
  gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });
  return gmailClient;
}

export async function sendMail({ to, subject, text, html }) {
  const gmail = getClient();
  const raw = buildRawMessage({
    fromName: config.mailFromName,
    fromEmail: config.mailFrom,
    to,
    subject,
    text,
    html,
  });
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}

// Maintient le refresh_token vivant en forcant l'obtention d'un access_token.
// A appeler periodiquement (les envois peuvent etre espaces de plusieurs mois).
export async function keepAlive() {
  try {
    getClient();
    await oauth2Client.getAccessToken();
    logger.info('gmail keep-alive ok');
  } catch (err) {
    logger.error('gmail keep-alive echec', { err: err?.message });
  }
}
