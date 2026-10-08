// Registre des ILLUSTRATIONS libres de droit (lot 2). Toutes les images sont
// HEBERGEES dans le depot (frontend/public/img/...), optimisees (SVG legers,
// bien < 50 Ko), sans aucun lien externe. Chaque image porte un texte ALTERNATIF
// en francais simple (accessibilite + lecture a voix future).
//
// SOURCE de ce lot : Microsoft Fluent Emoji, style « Flat », licence MIT (un
// seul style, homogene). Le fichier de licence est dans
// frontend/public/img/emoji/LICENSE-fluentui-emoji.txt. Les credits detailles
// (source, auteur, licence, URL) sont dans docs/credits-images.md et sur la
// page /credits de l'application.
//
// Les illustrations sont PUREMENT decoratives/pedagogiques : elles aident a
// comprendre la consigne, mais le SERVEUR reste SEUL JUGE (aucune reponse ne
// depend de l'image). L'association image <-> exercice se fait par la CLE de
// l'item (aucune modification du modele de donnees ni du serveur).

export interface ImageInfo {
  src: string; // chemin public (hebergé dans le depot), ex. /img/emoji/joie.svg
  alt: string; // texte alternatif en francais simple
  source: string; // nom de la collection
  auteur: string; // auteur / editeur
  licence: string; // licence (ex. MIT)
  url: string; // URL de la source d'origine (pour les credits)
}

// Collection Fluent Emoji (MIT) : metadonnees communes.
const FLUENT = {
  source: "Microsoft Fluent Emoji (style Flat)",
  auteur: "Microsoft",
  licence: "MIT",
} as const;
function fluent(nom: string, fichier: string, alt: string): ImageInfo {
  return {
    src: `/img/emoji/${fichier}`,
    alt,
    source: FLUENT.source,
    auteur: FLUENT.auteur,
    licence: FLUENT.licence,
    url: `https://github.com/microsoft/fluentui-emoji/tree/main/assets/${encodeURIComponent(nom)}/Flat`,
  };
}

// Catalogue des images, par cle logique.
export const IMAGES: Record<string, ImageInfo> = {
  // Emotions (EMC « Mes emotions »).
  joie:      fluent("Smiling face with smiling eyes", "joie.svg", "Un visage souriant, tout content. C'est la joie."),
  colere:    fluent("Angry face", "colere.svg", "Un visage rouge, fâché. C'est la colère."),
  peur:      fluent("Fearful face", "peur.svg", "Un visage qui a peur. C'est la peur."),
  tristesse: fluent("Crying face", "tristesse.svg", "Un visage qui pleure, tout triste. C'est la tristesse."),
  surprise:  fluent("Astonished face", "surprise.svg", "Un visage étonné, la bouche ouverte. C'est la surprise."),
  // Vivant (QM « Le vivant »).
  chat:       fluent("Cat face", "chat.svg", "Un visage de chat."),
  papillon:   fluent("Butterfly", "papillon.svg", "Un papillon aux ailes colorées."),
  grenouille: fluent("Frog", "grenouille.svg", "Une grenouille verte."),
  plante:     fluent("Seedling", "plante.svg", "Une petite plante verte qui pousse."),
  carotte:    fluent("Carrot", "carotte.svg", "Une carotte orange, un légume."),
};

// Association CLE d'item -> image. Seules ces cles affichent une illustration.
export const ILLUSTRATIONS: Record<string, string> = {
  // EMC — Mes emotions (reconnaitre + empathie).
  "emc-emo-rec-n1-a": "joie",
  "emc-emo-rec-n1-b": "peur",
  "emc-emo-rec-n2-a": "tristesse",
  "emc-emo-rec-n3-a": "colere",
  "emc-emo-rec-n3-b": "surprise",
  "emc-emo-rec-n4-a": "joie",
  "emc-emo-rec-n4-b": "colere",
  "emc-emo-emp-n1-a": "tristesse",
  "emc-emo-emp-n1-b": "joie",
  // QM — Le vivant (retrofit 0052).
  "qm-viv-car-n1-a": "chat",
  "qm-viv-cyc-n2-b": "grenouille",
  "qm-viv-cyc-n3-a": "papillon",
  "qm-viv-pla-n1-a": "plante",
  "qm-viv-hyg-n4-a": "carotte",
};

// Illustration d'un item (ou null). Utilise par <QuestionnerLeMonde>.
export function illustrationPourCle(cle: string): ImageInfo | null {
  const key = ILLUSTRATIONS[cle];
  return key ? (IMAGES[key] ?? null) : null;
}

// Liste des images effectivement utilisees, pour la page /credits (dedupliquee).
export function imagesCreditees(): ImageInfo[] {
  const vues = new Set<string>();
  const out: ImageInfo[] = [];
  for (const key of Object.values(ILLUSTRATIONS)) {
    if (vues.has(key)) continue;
    vues.add(key);
    const info = IMAGES[key];
    if (info) out.push(info);
  }
  return out;
}
