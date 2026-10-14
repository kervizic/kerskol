// Contractions et élisions du français, pour que le texte GÉNÉRÉ par gabarit
// ou concaténation (consignes, énoncés, titres, corrections) n'affiche jamais
// « au imparfait », « de images », « le étoile », « de le jeu »...
//
// Ces helpers ne touchent QUE le texte AFFICHÉ à l'enfant. Le serveur reste
// seul juge des réponses : aucune vérification ne passe par ce module.
//
// Règle générale : devant une voyelle ou un « h » muet, les petits mots
// s'élident (le/la -> l', de -> d', que -> qu', je -> j', ne -> n', se -> s',
// ce -> c') et les contractions « à/de + le/les » suivent (au/du/des/aux, avec
// « à l' » / « de l' » devant voyelle). Devant une consonne ou un « h » aspiré,
// rien ne change.

// Mots courants à « h » ASPIRÉ (PAS d'élision : « le hibou », « le héros »,
// « de la honte »). Liste blanche, au singulier et sans accent de casse ; tout
// autre mot en « h » est considéré à h muet (« l'heure », « d'histoires »).
// Vocabulaire du primaire ; on complète au besoin.
const H_ASPIRE = new Set([
  "hache", "hagard", "haie", "haillon", "haine", "hall", "halle", "halte",
  "hamac", "hamburger", "hameau", "hamster", "hanche", "handicap", "hangar",
  "hanneton", "hantise", "harde", "hareng", "hargne", "haricot", "harpe",
  "hasard", "hate", "hâte", "hausse", "haut", "hautbois", "hauteur", "havre",
  "hennissement", "hergé", "hernie", "heron", "héron", "heros", "héros",
  "hetre", "hêtre", "hibou", "hierarchie", "hiérarchie", "hocher", "hockey",
  "hollande", "homard", "hongrie", "honte", "hoquet", "horde", "hors", "hotte",
  "houblon", "houle", "housse", "hublot", "huche", "huit", "huitieme",
  "huitième", "hululement", "hurlement", "hussard", "hutte",
]);

// Voyelles (minuscules, accentuées incluses). Le « y » initial est traité comme
// une consonne par prudence (« le yaourt », « le yoga »).
const VOYELLES = new Set([
  "a", "à", "â", "ä", "e", "é", "è", "ê", "ë",
  "i", "î", "ï", "o", "ô", "ö", "u", "ù", "û", "ü",
]);

// Le mot commence-t-il par une voyelle ou un « h » muet (donc appelle une
// élision) ? Ignore une ponctuation/guillemet ouvrant éventuel. Renvoie faux
// pour un mot vide, un nombre (« 8 ») ou un « h » aspiré connu.
export function commenceParVoyelle(mot: string): boolean {
  const m = mot.replace(/^[\s«»"'’(\[]+/, "").toLowerCase();
  if (m.length === 0) return false;
  const c = m[0];
  if (c === "h") {
    // Premier mot nu (sans ponctuation finale) comparé à la liste aspirée.
    const premier = m.split(/[\s'’,.;:!?)\]]/)[0];
    return !H_ASPIRE.has(premier);
  }
  return VOYELLES.has(c);
}

// Petits mots qui s'élident devant une voyelle / h muet.
const ELISIONS: Record<string, string> = {
  le: "l'", la: "l'", de: "d'", que: "qu'",
  je: "j'", ne: "n'", se: "s'", ce: "c'", me: "m'", te: "t'",
};

// Associe un petit mot (le/la/de/que/je/ne/se/ce/me/te) à un mot variable en
// posant l'élision correcte : « de » + « images » -> « d'images », « de » +
// « billes » -> « de billes », « que » + « il » -> « qu'il ».
export function elide(petitMot: string, mot: string): string {
  const forme = ELISIONS[petitMot];
  if (forme && commenceParVoyelle(mot)) return `${forme}${mot}`;
  return `${petitMot} ${mot}`;
}

// « à » + nom masculin défini : « à le » -> « au », « à les » -> « aux »,
// « à l' » devant voyelle. Sert aux titres de conjugaison (« au présent »,
// « à l'imparfait ») : le nom de temps est masculin singulier.
// `nombre` : "singulier" (défaut) ou "pluriel".
export function aLe(nom: string, nombre: "singulier" | "pluriel" = "singulier"): string {
  if (nombre === "pluriel") return `aux ${nom}`;
  if (commenceParVoyelle(nom)) return `à l'${nom}`;
  return `au ${nom}`;
}

// « de » + nom masculin défini : « de le » -> « du », « de les » -> « des »,
// « de l' » devant voyelle.
export function deLe(nom: string, nombre: "singulier" | "pluriel" = "singulier"): string {
  if (nombre === "pluriel") return `des ${nom}`;
  if (commenceParVoyelle(nom)) return `de l'${nom}`;
  return `du ${nom}`;
}

// Corrige la typographie d'un texte GÉNÉRÉ, sans toucher aux mots : supprime les
// espaces multiples et l'espace AVANT un point ou une virgule. On NE touche PAS
// à l'espace devant « ! ? ; : » : en français cet espace (fine) est correct, et
// l'impératif généré finit volontairement par « ! ». Ne fabrique aucune élision
// (risqué) : ne traite que l'espacement, toujours sûr.
export function normaliserEspaces(texte: string): string {
  return texte
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,])/g, "$1")
    .trim();
}
