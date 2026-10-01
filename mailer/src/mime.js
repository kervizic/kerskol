// Construction d'un message MIME multipart/alternative (texte + HTML) encode
// en base64url, tel qu'attendu par gmail.users.messages.send ({ raw }).

// Neutralise CR/LF et tout caractere de controle dans une valeur d'en-tete
// (defense anti-injection d'en-tetes SMTP/MIME). Les retours a la ligne et les
// controles sont remplaces par une espace, puis les espaces multiples reduites.
function sanitizeHeader(value) {
  return String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function encodeHeaderWord(rawValue) {
  const value = sanitizeHeader(rawValue);
  // RFC 2047 pour les en-tetes non-ASCII (sujet, nom d'expediteur).
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf-8').toString('base64')}?=`;
}

export function buildRawMessage({ fromName, fromEmail, to, subject, text, html }) {
  const boundary = 'kerskol_boundary_37ac91b2f8';
  const fromHeader = fromName
    ? `${encodeHeaderWord(fromName)} <${sanitizeHeader(fromEmail)}>`
    : sanitizeHeader(fromEmail);

  const lines = [
    `From: ${fromHeader}`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${encodeHeaderWord(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text, 'utf-8').toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf-8').toString('base64'),
    '',
    `--${boundary}--`,
    '',
  ];

  const raw = lines.join('\r\n');
  return Buffer.from(raw, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
