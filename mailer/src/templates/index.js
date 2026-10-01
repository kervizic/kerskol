// Gabarits d'emails (francais), version texte + HTML.
// RGPD : rien sur l'enfant au-dela du surnom et de la progression.
// Aucune balise <img> externe, aucun traceur, aucun lien de suivi.

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#2f6f4f;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold;">Kerskol</td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:18px;color:#2f6f4f;">${escapeHtml(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;background:#f4f6f8;font-size:12px;color:#7b8794;">
          Vous recevez cet email parce que vous avez active les notifications dans Kerskol.
          Vous pouvez les desactiver a tout moment depuis votre espace parent.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// --- resume_hebdomadaire -------------------------------------------------
// parametres attendus : { surnom, exercices_termines, reussite_pct, matieres:[...] }
function resumeHebdomadaire(p) {
  const surnom = p.surnom || 'votre enfant';
  const exercices = Number.isFinite(p.exercices_termines) ? p.exercices_termines : 0;
  const reussite = Number.isFinite(p.reussite_pct) ? p.reussite_pct : null;
  const matieres = Array.isArray(p.matieres) ? p.matieres : [];

  const reussiteLigne = reussite === null ? '' : ` avec ${reussite}% de reussite`;
  const subject = `Kerskol - resume de la semaine de ${surnom}`;

  const text =
    `Bonjour,\n\n` +
    `Voici le resume de la semaine de ${surnom} sur Kerskol.\n\n` +
    `- Exercices termines : ${exercices}${reussiteLigne}\n` +
    (matieres.length ? `- Matieres travaillees : ${matieres.join(', ')}\n` : '') +
    `\nBravo pour les progres accomplis !\n\n` +
    `A bientot,\nL'equipe Kerskol`;

  const matieresHtml = matieres.length
    ? `<p style="margin:0 0 8px;">Matieres travaillees : <strong>${escapeHtml(matieres.join(', '))}</strong></p>`
    : '';

  const html = layout(
    `Resume de la semaine de ${escapeHtml(surnom)}`,
    `<p style="margin:0 0 12px;">Bonjour,</p>
     <p style="margin:0 0 12px;">Voici le resume de la semaine de <strong>${escapeHtml(surnom)}</strong> sur Kerskol.</p>
     <p style="margin:0 0 8px;">Exercices termines : <strong>${exercices}</strong>${reussite === null ? '' : ` (<strong>${reussite}%</strong> de reussite)`}</p>
     ${matieresHtml}
     <p style="margin:16px 0 0;">Bravo pour les progres accomplis&nbsp;!</p>`,
  );

  return { subject, text, html };
}

// --- message_service -----------------------------------------------------
// parametres attendus : { titre, corps }
function messageService(p) {
  const titre = p.titre || 'Information Kerskol';
  const corps = p.corps || '';
  const subject = `Kerskol - ${titre}`;

  const text =
    `Bonjour,\n\n` +
    `${corps}\n\n` +
    `A bientot,\nL'equipe Kerskol`;

  const html = layout(
    escapeHtml(titre),
    `<p style="margin:0 0 12px;">Bonjour,</p>
     <p style="margin:0 0 12px;white-space:pre-line;">${escapeHtml(corps)}</p>
     <p style="margin:16px 0 0;">A bientot,<br>L'equipe Kerskol</p>`,
  );

  return { subject, text, html };
}

// --- invitation_parent ---------------------------------------------------
// parametres attendus : { token } (email_invite sert au routage, pas au rendu)
// Mail transactionnel envoye a l'adresse invitee (pas d'opt-in requis).
function invitationParent(p) {
  const base = 'https://kerskol.fr';
  const token = String(p.token || '');
  const lien = `${base}/invitation?token=${encodeURIComponent(token)}`;
  const subject = 'Kerskol - invitation a rejoindre un foyer';

  const text =
    `Bonjour,\n\n` +
    `Un parent vous invite a rejoindre son foyer sur Kerskol pour suivre ` +
    `ensemble la progression des enfants.\n\n` +
    `Pour accepter, ouvrez ce lien (valable 7 jours) :\n${lien}\n\n` +
    `Si vous n'etes pas concerne, ignorez simplement cet email.\n\n` +
    `A bientot,\nL'equipe Kerskol`;

  const html = layout(
    'Invitation a rejoindre un foyer',
    `<p style="margin:0 0 12px;">Bonjour,</p>
     <p style="margin:0 0 12px;">Un parent vous invite a rejoindre son foyer sur
       <strong>Kerskol</strong> pour suivre ensemble la progression des enfants.</p>
     <p style="margin:0 0 16px;">
       <a href="${escapeHtml(lien)}" style="display:inline-block;background:#2f6f4f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;">Accepter l'invitation</a>
     </p>
     <p style="margin:0 0 8px;font-size:13px;color:#52606d;">Lien valable 7 jours. Si vous n'etes pas concerne, ignorez cet email.</p>`,
  );

  return { subject, text, html };
}

const templates = {
  resume_hebdomadaire: resumeHebdomadaire,
  message_service: messageService,
  invitation_parent: invitationParent,
};

export function render(gabarit, parametres) {
  const fn = templates[gabarit];
  if (!fn) throw new Error(`gabarit inconnu : ${gabarit}`);
  return fn(parametres || {});
}
