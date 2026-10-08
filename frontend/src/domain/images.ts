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
  // Vivant — chaines alimentaires (QM « Le vivant »).
  lapin:      fluent("Rabbit face", "lapin.svg", "Un lapin avec de grandes oreilles."),
  lion:       fluent("Lion", "lion.svg", "Un lion avec sa crinière."),
  poule:      fluent("Chicken", "poule.svg", "Une poule."),
  // Matiere (QM « La matiere »).
  glacon:     fluent("Ice", "glacon.svg", "Un glaçon bien froid."),
  ballon:     fluent("Balloon", "ballon.svg", "Un ballon de baudruche gonflé."),
  // Objets (QM « Les objets »).
  parapluie:  fluent("Umbrella", "parapluie.svg", "Un parapluie ouvert."),
  ciseaux:    fluent("Scissors", "ciseaux.svg", "Une paire de ciseaux."),
  // Espace et temps (QM « L'espace », « Le temps »).
  soleil:     fluent("Sun", "soleil.svg", "Le soleil qui brille."),
  gateau:     fluent("Birthday cake", "gateau.svg", "Un gâteau avec des bougies."),
  // Geometrie — objets du quotidien pour reconnaitre les solides (MA.GEO.SOLIDES).
  de:         fluent("Game die", "de.svg", "Un dé à jouer."),
  boite:      fluent("Package", "boite.svg", "Une boîte en carton."),
  ballonFoot: fluent("Soccer ball", "ballon-foot.svg", "Un ballon de football."),
  // Problemes et monnaie — objets des enonces (MA.PB.*).
  pomme:      fluent("Red apple", "pomme.svg", "Une pomme rouge."),
  livre:      fluent("Closed book", "livre.svg", "Un livre fermé."),
  crayon:     fluent("Crayon", "crayon.svg", "Un crayon de couleur."),
  coquillage: fluent("Spiral shell", "coquillage.svg", "Un coquillage en spirale."),
  cadeau:     fluent("Wrapped gift", "cadeau.svg", "Un cadeau emballé."),
  jouet:      fluent("Teddy bear", "jouet.svg", "Un ours en peluche, un jouet."),
  cahier:     fluent("Notebook", "cahier.svg", "Un cahier."),
  cassetete:  fluent("Puzzle piece", "cassetete.svg", "Une pièce de casse-tête."),
  // Tableaux et graphiques — pictogrammes (MA.DONNEES.PICTOGRAMME).
  fleur:      fluent("Cherry blossom", "fleur.svg", "Une fleur."),
  glace:      fluent("Soft ice cream", "glace.svg", "Une glace en cornet."),
  etoile:     fluent("Star", "etoile.svg", "Une étoile."),
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
  "qm-viv-cyc-n1-b": "grenouille", // « ou grandit le tetard » : illustre la grenouille (sujet), pas la reponse (l'eau)
  "qm-viv-cyc-n2-a": "poule", // ordre « vie de la poule » : illustre la poule, l'ordre reste a trouver
  "qm-viv-cyc-n2-b": "grenouille",
  "qm-viv-cyc-n3-a": "papillon",
  "qm-viv-cha-n1-a": "lapin", // « le lapin mange... » : illustre le lapin (sujet), pas « des plantes »
  "qm-viv-cha-n1-b": "lion", // « le lion mange... » : illustre le lion, pas « de la viande »
  "qm-viv-pla-n1-a": "plante",
  "qm-viv-hyg-n4-a": "carotte",
  // QM — La matiere (0053).
  "qm-mat-eta-n1-b": "glacon", // « un glacon, qu'est-ce que c'est ? » : illustre le glacon, pas « un solide »
  "qm-mat-air-n1-a": "ballon", // « ballon de baudruche gonfle » : illustre le ballon, pas « de l'air »
  // QM — Les objets (0054).
  "qm-obj-fon-n1-a": "parapluie", // « a quoi sert un parapluie ? » : illustre l'objet, pas sa fonction
  "qm-obj-fon-n1-b": "ciseaux", // « a quoi sert une paire de ciseaux ? » : illustre l'objet, pas « a couper »
  // QM — L'espace (0055).
  "qm-esp-car-n1-a": "soleil", // « ou se leve le soleil ? » : illustre le soleil, pas « a l'est »
  "qm-esp-car-n4-b": "soleil", // « le soleil se leve a l'... » : illustre le soleil, pas « est »
  // QM — Le temps (0056).
  "qm-tps-fri-n3-a": "gateau", // ordre « faire un gateau » : illustre le gateau, l'ordre reste a trouver
  // Geometrie — MA.GEO.SOLIDES, items N2 (objet du quotidien nomme dans la consigne).
  "geo-sol-n2-de": "de", // « un de a jouer... » : illustre le de, pas « un cube »
  "geo-sol-n2-boite": "boite", // « une boite a chaussures... » : illustre la boite, pas « un pave »
  "geo-sol-n2-ballon": "ballonFoot", // « un ballon de foot... » : illustre le ballon, pas « une boule »
};

// Illustration d'un item (ou null). Utilise par <QuestionnerLeMonde>.
export function illustrationPourCle(cle: string): ImageInfo | null {
  const key = ILLUSTRATIONS[cle];
  return key ? (IMAGES[key] ?? null) : null;
}

// --- Problemes et monnaie : illustration par OBJET de l'enonce --------------
// Les problemes sont GENERES (l'objet est tire au hasard), donc l'association
// ne se fait pas par cle d'item mais par le NOM de l'objet present dans le
// texte. C'est purement decoratif : l'image montre l'objet, jamais un nombre
// ni la reponse (le serveur reste seul juge, les nombres sont inchanges).
const ENONCE_OBJETS: Array<{ mots: string[]; image: string }> = [
  { mots: ["pomme", "pommes"], image: "pomme" },
  { mots: ["gâteau", "gâteaux", "gateau", "gateaux"], image: "gateau" },
  { mots: ["livre", "livres"], image: "livre" },
  { mots: ["crayon", "crayons"], image: "crayon" },
  { mots: ["coquillage", "coquillages"], image: "coquillage" },
  { mots: ["cadeau", "cadeaux"], image: "cadeau" },
  { mots: ["jouet", "jouets"], image: "jouet" },
  { mots: ["cahier", "cahiers"], image: "cahier" },
  { mots: ["ballon", "ballons"], image: "ballonFoot" },
  { mots: ["casse-tête", "casse-têtes"], image: "cassetete" },
  { mots: ["plante", "plantes"], image: "plante" },
];

// Vrai si `mot` apparait dans `texte` (deja en minuscules) comme MOT entier.
// Bornes manuelles : on evite \b (mal defini avec les accents en JS).
function contientMot(texte: string, mot: string): boolean {
  let from = 0;
  for (;;) {
    const i = texte.indexOf(mot, from);
    if (i < 0) return false;
    const avant = i === 0 ? " " : texte[i - 1];
    const apres = i + mot.length >= texte.length ? " " : texte[i + mot.length];
    const estLettre = (c: string) => /[a-zàâäéèêëïîôöùûüçœ]/i.test(c);
    if (!estLettre(avant) && !estLettre(apres)) return true;
    from = i + 1;
  }
}

// Illustration d'un enonce de probleme (ou null). Utilise par la vue calcul.
export function illustrationPourEnonce(enonce: string): ImageInfo | null {
  const t = enonce.toLowerCase();
  for (const { mots, image } of ENONCE_OBJETS) {
    for (const m of mots) {
      if (contientMot(t, m)) return IMAGES[image] ?? null;
    }
  }
  return null;
}

// --- Tableaux et graphiques : pictogrammes coherents -----------------------
// Chaque pictogramme (DonPicto.symbol) est illustre par un emoji coherent. Quand
// aucun emoji homogene n'existe (bille, autocollant), la vue garde son dessin
// generique. L'image REMPLACE le symbole decoratif : elle ne change ni les
// comptes, ni la valeur d'une image, ni la reponse (serveur seul juge).
const SYMBOLE_IMAGES: Record<string, string> = {
  pomme: "pomme",
  ballon: "ballon",
  fleur: "fleur",
  glace: "glace",
  "étoile": "etoile",
  animal: "chat",
};

export function imagePourSymbole(symbol: string): ImageInfo | null {
  const key = SYMBOLE_IMAGES[symbol];
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
