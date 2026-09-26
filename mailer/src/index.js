// Point d'entree du mailer Kerskol.
// Boucle : lit les mails "pending" de mail_outbox (FOR UPDATE SKIP LOCKED),
// resout l'email du destinataire dans auth.users AU MOMENT DE L'ENVOI,
// n'envoie rien si l'opt-in parent n'est pas actif, envoie via Gmail,
// marque sent/failed avec backoff exponentiel (5 essais max).

import { config } from './config.js';
import { pool, closePool } from './db.js';
import { sendMail, keepAlive } from './gmail.js';
import { render } from './templates/index.js';
import { logger, redactEmails } from './logger.js';

let stopping = false;

// Delai avant prochain essai : backoff exponentiel base 60s (1,2,4,8,16 min).
function backoffSeconds(attempts) {
  return 60 * 2 ** (attempts - 1);
}

async function markSent(client, id) {
  await client.query(
    `UPDATE public.mail_outbox
        SET statut = 'sent', envoye_le = now(), derniere_erreur = NULL
      WHERE id = $1`,
    [id],
  );
}

async function markFailurePermanent(client, id, reason) {
  await client.query(
    `UPDATE public.mail_outbox
        SET statut = 'failed', derniere_erreur = $2
      WHERE id = $1`,
    [id, reason],
  );
}

async function markRetryOrFail(client, id, attempts, reason) {
  if (attempts >= config.maxAttempts) {
    await client.query(
      `UPDATE public.mail_outbox
          SET statut = 'failed', essais = $2, derniere_erreur = $3
        WHERE id = $1`,
      [id, attempts, reason],
    );
    return;
  }
  await client.query(
    `UPDATE public.mail_outbox
        SET essais = $2,
            prochain_essai = now() + make_interval(secs => $4),
            derniere_erreur = $3
      WHERE id = $1`,
    [id, attempts, reason, backoffSeconds(attempts)],
  );
}

async function processOne(client, row) {
  // Resolution de l'email + verification de l'opt-in au dernier moment.
  const { rows } = await client.query(
    `SELECT u.email AS email,
            COALESCE(pp.mails_actives, false) AS actives
       FROM auth.users u
       LEFT JOIN public.parent_preferences pp ON pp.user_id = u.id
      WHERE u.id = $1`,
    [row.user_id],
  );

  const dest = rows[0];
  if (!dest || !dest.email || !dest.actives) {
    // Rien si les mails ne sont pas actives (ou destinataire introuvable).
    await markFailurePermanent(client, row.id, 'destinataire sans opt-in actif');
    logger.info('mail ignore (opt-in inactif)', { id: row.id, user_id: row.user_id });
    return;
  }

  let content;
  try {
    content = render(row.gabarit, row.parametres);
  } catch (err) {
    await markFailurePermanent(client, row.id, redactEmails(err?.message) || 'gabarit invalide');
    logger.error('gabarit invalide', { id: row.id, gabarit: row.gabarit });
    return;
  }

  const attempts = row.essais + 1;
  try {
    await sendMail({
      to: dest.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    await markSent(client, row.id);
    logger.info('mail envoye', { id: row.id, user_id: row.user_id, gabarit: row.gabarit });
  } catch (err) {
    const reason = redactEmails(err?.message) || 'erreur envoi inconnue';
    await markRetryOrFail(client, row.id, attempts, reason);
    logger.warn('echec envoi', { id: row.id, essais: attempts, reason });
  }
}

async function processBatch() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, user_id, gabarit, parametres, essais
         FROM public.mail_outbox
        WHERE statut = 'pending' AND prochain_essai <= now()
        ORDER BY prochain_essai
        FOR UPDATE SKIP LOCKED
        LIMIT $1`,
      [config.batchSize],
    );

    for (const row of rows) {
      if (stopping) break;
      // eslint-disable-next-line no-await-in-loop
      await processOne(client, row);
    }

    await client.query('COMMIT');
    return rows.length;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('batch en erreur', { err: redactEmails(err?.message) });
    return 0;
  } finally {
    client.release();
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mainLoop() {
  logger.info('mailer demarre', {
    pollIntervalMs: config.pollIntervalMs,
    maxAttempts: config.maxAttempts,
  });

  let lastKeepAlive = 0;
  // Premier ping keep-alive au demarrage pour valider les identifiants.
  await keepAlive();
  lastKeepAlive = Date.now();

  while (!stopping) {
    try {
      const processed = await processBatch();
      if (processed > 0) {
        logger.info('batch traite', { count: processed });
      }
    } catch (err) {
      logger.error('boucle en erreur', { err: redactEmails(err?.message) });
    }

    if (Date.now() - lastKeepAlive >= config.keepAliveMs) {
      await keepAlive();
      lastKeepAlive = Date.now();
    }

    if (stopping) break;
    await sleep(config.pollIntervalMs);
  }
}

async function shutdown(signal) {
  logger.info('arret demande', { signal });
  stopping = true;
  await closePool().catch(() => {});
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

mainLoop().catch((err) => {
  logger.error('arret sur erreur fatale', { err: redactEmails(err?.message) });
  process.exit(1);
});
