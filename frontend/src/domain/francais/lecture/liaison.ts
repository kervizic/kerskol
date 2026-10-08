// Regles de LIAISON (francais) pour le decoupage « lecture rythmee ».
//
// Principe pedagogique : on ne doit JAMAIS couper (= inserer un silence) a un
// endroit ou l'oral enchaine deux mots. Deux cas :
//  1. liaison obligatoire : un determinant / pronom suivi d'un mot commencant
//     par une voyelle ou un « h » muet (les‿enfants, un‿ami, ils‿ont,
//     nous‿avons). On garde les deux mots dans le meme groupe.
//  2. mot composé / elision : trait d'union ou apostrophe INTERNES -> c'est deja
//     UN seul token (voir tokenize), donc indivisible par construction
//     (l'arbre, aujourd'hui, est-ce, martin-pecheur).
//
// Limite assumee : le « h aspiré » (le‿héros est FAUX) bloque la liaison. On
// maintient une liste des « h aspiré » courants ; hors liste, le « h » est
// traite comme muet (liaison). Corpus fige et petit -> suffisant. Documente.

import { normaliser } from "./tokenize";

// Determinants + pronoms (+ quelques prepositions/adverbes a liaison frequente)
// qui DECLENCHENT une liaison obligatoire devant voyelle / h muet.
const DECLENCHEURS_LIAISON = new Set<string>([
  // articles / determinants
  "un", "une", "des", "les", "aux", "ces", "cet", "mon", "ton", "son",
  "mes", "tes", "ses", "nos", "vos", "leurs", "quels", "quelles",
  "quelques", "plusieurs", "certains", "certaines", "tout", "tous", "toutes",
  // nombres a liaison
  "deux", "trois", "six", "dix", "neuf", "vingt", "cent",
  // pronoms
  "nous", "vous", "ils", "elles", "on", "en", "les", "ses",
  // prepositions / adverbes a liaison frequente
  "dans", "sans", "sous", "chez", "très", "tres", "plus", "moins", "bien", "trop",
]);

// « h aspiré » courants : la liaison est INTERDITE (le héros, le hibou...).
const H_ASPIRE = new Set<string>([
  "hangar", "hanneton", "hardi", "hareng", "haricot", "hasard", "hate", "hache",
  "haie", "haine", "halle", "halte", "hamac", "hamster", "handicap", "hangar",
  "harpe", "hauteur", "haut", "haute", "hautbois", "heron", "herisson", "hetre",
  "hibou", "hierarchie", "hockey", "homard", "honte", "hoquet", "hors", "hotte",
  "houx", "huard", "hublot", "huit", "huitaine", "huitieme", "hurlement",
  "hurler", "halo", "hamburger", "hall", "heros", "hetre", "hameau",
  "hennir", "hennissement", "hisser", "hutte", "hublot",
]);

const VOYELLES = new Set<string>([
  "a", "à", "â", "ä", "e", "é", "è", "ê", "ë", "i", "î", "ï",
  "o", "ô", "ö", "u", "ù", "û", "ü", "y", "œ", "æ",
]);

function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Le mot declenche-t-il une liaison (determinant / pronom...) ? */
export function estDeclencheur(mot: string): boolean {
  return DECLENCHEURS_LIAISON.has(normaliser(mot));
}

/** Le mot commence-t-il par une voyelle ou un « h » muet ? */
export function commenceParVoyelleOuHMuet(mot: string): boolean {
  const n = normaliser(mot);
  if (n.length === 0) return false;
  const premiere = n[0];
  if (VOYELLES.has(premiere)) return true;
  if (premiere === "h") {
    return !H_ASPIRE.has(sansAccents(n));
  }
  return false;
}

/**
 * Faut-il LIER (= interdire la coupure) entre `precedent` et `suivant` ?
 * Vrai si `precedent` est un declencheur, qu'il ne porte AUCUNE ponctuation de
 * fin (une virgule/point casse la liaison) et que `suivant` commence par une
 * voyelle / h muet.
 */
export function doitLier(
  precedent: { mot: string; apres: string },
  suivant: { mot: string }
): boolean {
  if (precedent.apres.trim().length > 0) return false;
  return estDeclencheur(precedent.mot) && commenceParVoyelleOuHMuet(suivant.mot);
}
