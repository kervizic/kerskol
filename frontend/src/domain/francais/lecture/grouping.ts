// Decoupage DETERMINISTE d'un texte en GROUPES (segments) selon le mode de
// lecture. Un segment = une suite d'index de tokens lus d'un coup, suivie d'un
// silence. Les regles de liaison (liaison.ts) garantissent qu'on ne coupe
// JAMAIS a un endroit ou l'oral enchaine.
//
// Modes :
//  - cp  : mot a mot (chaque UNITE atomique = 1 segment), pause ~500 ms.
//  - ce1 : groupes de 2-3 mots, sans franchir une ponctuation.
//  - ce2 : groupes de sens (coupures a la ponctuation ; longs groupes scindes a
//          une conjonction de coordination, sinon au milieu).
//  - cm  : continu (une phrase par segment ; coupe seulement a . ! ? …).
//
// « Unite atomique » = un ou deux tokens rendus indivisibles par une liaison
// obligatoire (les‿enfants). Tous les modes partent de ces unites : aucune
// liaison n'est jamais coupee, quel que soit le mode.

import type { Token } from "./tokenize";
import { normaliser } from "./tokenize";
import { doitLier } from "./liaison";

export type ModeLecture = "cp" | "ce1" | "ce2" | "cm";
export const MODES: ModeLecture[] = ["cp", "ce1", "ce2", "cm"];

export interface Segment {
  /** index de tokens (dans le Token[] du texte) composant le groupe. */
  tokens: number[];
}

const PONCT_FORTE = /[.!?…]/; // fin de phrase
const PONCT_MOYENNE = /[;:]/; // pause nette
const VIRGULE = /[,]/;

// Conjonctions de coordination ou on peut scinder un long groupe de sens.
const COORDINATION = new Set(["et", "mais", "ou", "or", "car", "donc", "ni"]);

function finPonctForte(t: Token): boolean {
  return PONCT_FORTE.test(t.apres);
}
function finPonctMoyenne(t: Token): boolean {
  return PONCT_MOYENNE.test(t.apres);
}
function finVirgule(t: Token): boolean {
  return VIRGULE.test(t.apres);
}

/**
 * Regroupe les tokens en UNITES atomiques (liaisons obligatoires soudees).
 * Retourne une liste de listes d'index de tokens (chaque sous-liste a 1 ou 2
 * elements en pratique, parfois plus si liaisons en chaine).
 */
export function unitesAtomiques(tokens: Token[]): number[][] {
  const unites: number[][] = [];
  let i = 0;
  while (i < tokens.length) {
    const courante = [tokens[i].index];
    let j = i;
    while (j + 1 < tokens.length && doitLier(tokens[j], tokens[j + 1])) {
      courante.push(tokens[j + 1].index);
      j++;
    }
    unites.push(courante);
    i = j + 1;
  }
  return unites;
}

// Un token « ferme » un groupe s'il porte une ponctuation de ce niveau.
function uniteFerme(
  tokens: Token[],
  unite: number[],
  niveau: "forte" | "moyenne" | "virgule"
): boolean {
  const dernier = tokens[unite[unite.length - 1]];
  if (niveau === "forte") return finPonctForte(dernier);
  if (niveau === "moyenne") return finPonctForte(dernier) || finPonctMoyenne(dernier);
  return finPonctForte(dernier) || finPonctMoyenne(dernier) || finVirgule(dernier);
}

// Construit les segments en groupant les unites [debut,fin) par paquets, en
// coupant la ou `coupe(unite)` est vrai (apres cette unite) et en respectant une
// taille cible max de tokens.
function grouperParPonctuation(
  tokens: Token[],
  unites: number[][],
  niveauCoupe: "forte" | "moyenne" | "virgule",
  tailleMax: number
): Segment[] {
  const segments: Segment[] = [];
  let courant: number[] = [];
  let nb = 0;
  for (let k = 0; k < unites.length; k++) {
    courant.push(...unites[k]);
    nb += unites[k].length;
    const ferme = uniteFerme(tokens, unites[k], niveauCoupe);
    const trop = tailleMax > 0 && nb >= tailleMax;
    if (ferme || trop) {
      segments.push({ tokens: courant });
      courant = [];
      nb = 0;
    }
  }
  if (courant.length > 0) segments.push({ tokens: courant });
  return segments;
}

// CE2 : groupes de sens. Coupe a la ponctuation (forte, moyenne, virgule). Si un
// groupe depasse `max` tokens, on le scinde a une conjonction de coordination
// (de preference), sinon au milieu d'une unite.
function groupesDeSens(tokens: Token[], unites: number[][]): Segment[] {
  const bruts = grouperParPonctuation(tokens, unites, "virgule", 0);
  const max = 9;
  const sortie: Segment[] = [];
  for (const seg of bruts) {
    if (seg.tokens.length <= max) {
      sortie.push(seg);
      continue;
    }
    // chercher une coordination comme point de coupe (hors tout premier mot)
    let coupe = -1;
    for (let p = 1; p < seg.tokens.length; p++) {
      if (COORDINATION.has(normaliser(tokens[seg.tokens[p]].mot))) {
        coupe = p;
        break;
      }
    }
    if (coupe <= 0) coupe = Math.floor(seg.tokens.length / 2);
    sortie.push({ tokens: seg.tokens.slice(0, coupe) });
    sortie.push({ tokens: seg.tokens.slice(coupe) });
  }
  return sortie;
}

/**
 * Decoupe un texte (tokens) en segments selon le mode. Deterministe.
 */
export function decouper(tokens: Token[], mode: ModeLecture): Segment[] {
  const unites = unitesAtomiques(tokens);
  switch (mode) {
    case "cp":
      return unites.map((u) => ({ tokens: u }));
    case "ce1":
      return grouperParPonctuation(tokens, unites, "virgule", 3);
    case "ce2":
      return groupesDeSens(tokens, unites);
    case "cm":
      return grouperParPonctuation(tokens, unites, "forte", 0);
  }
}

/** Mode de lecture par defaut selon la classe du profil. */
export function modeParDefaut(classe: string): ModeLecture {
  switch (classe) {
    case "CP":
      return "cp";
    case "CE1":
      return "ce1";
    case "CE2":
      return "ce2";
    case "CM1":
    case "CM2":
      return "cm";
    default:
      return "ce2";
  }
}
