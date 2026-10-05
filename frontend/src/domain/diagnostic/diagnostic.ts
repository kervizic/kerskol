// Diagnostic DETERMINISTE des fautes d'ecriture d'un nombre en lettres.
//
// On connait la bonne reponse (le nombre n). On applique des regles DANS CET
// ORDRE ; la PREMIERE qui matche donne le type de faute :
//   a) juste (l'une des deux orthographes trad / 1990) ;
//   b) TRAIT_UNION  : memes mots, seuls les traits d'union / espaces different ;
//   c) S_VINGT_CENT / S_MILLE : identique apres suppression des « s » d'accord ;
//   d) ET_UN        : « vingt-un / trente-un… » au lieu de « vingt et un » ;
//   e) ORTHO_MOT    : un mot mal orthographie (distance d'edition <= 2) ;
//   f) MAUVAIS_NOMBRE : des mots-nombres valides, mais un autre nombre ;
//   g) INCONNU      : rien de ce qui precede.
//
// Plusieurs fautes : on en montre AU PLUS 2. Chaque type porte une explication
// courte (style « enfant de 8 ans »), la bonne ecriture, et la partie fautive a
// SURLIGNER. Le type est seulement INDICATIF (le serveur reste seul juge du
// juste/faux) ; il est enregistre pour reproposer plus tard un exercice cible.
//
// Module concu pour etre REUTILISABLE (francais a venir) : il ne depend que de
// ./lettres et de fonctions pures.

import { enLettresFr, normaliser, estJuste } from "./lettres";

export type TypeFaute =
  // Ecriture des nombres en lettres
  | "TRAIT_UNION"
  | "S_VINGT_CENT"
  | "S_MILLE"
  | "ET_UN"
  | "ORTHO_MOT"
  | "MAUVAIS_NOMBRE"
  // Conjugaison (francais)
  | "ACCENT"
  | "MAUVAISE_PERSONNE"
  | "MAUVAIS_TEMPS"
  | "TERMINAISON"
  | "ORTHO_RADICAL"
  // Repli commun
  | "INCONNU";

export interface Faute {
  type: TypeFaute;
  message: string; // explication courte, style enfant, avec exemple concret
  surligne: string[]; // fragments de la bonne ecriture a mettre en evidence
}

export interface Diagnostic {
  juste: boolean;
  bonneEcriture: string; // orthographe traditionnelle (reference affichee)
  fautes: Faute[]; // vide si juste ; au plus 2 sinon
}

// --- Vocabulaire des nombres (atomes apres decoupe espaces + traits d'union) --
const VALEURS: Record<string, number> = {
  "zéro": 0, zero: 0, un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6,
  sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13,
  quatorze: 14, quinze: 15, seize: 16, vingt: 20, vingts: 20, trente: 30,
  quarante: 40, cinquante: 50, soixante: 60, cent: 100, cents: 100,
  mille: 1000, milles: 1000,
};
const MOTS_NOMBRES = new Set([...Object.keys(VALEURS), "et"]);

function atomes(s: string): string[] {
  return normaliser(s).split(/[\s-]+/).filter(Boolean);
}

// Base d'un mot (supprime le « s » d'accord de vingt/cent/mille).
function base(mot: string): string {
  if (mot === "vingts") return "vingt";
  if (mot === "cents") return "cent";
  if (mot === "milles") return "mille";
  return mot;
}

// Sequence des mots-nombres sans « et » ni « s » (identite des mots employes).
function motsCanon(atoms: string[]): string {
  return atoms.filter((w) => w !== "et").map(base).join(" ");
}

// Distance d'edition de Levenshtein (plafonnee implicitement par la taille).
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

// Parse une suite d'atomes en nombre (ou null si un atome n'est pas un
// mot-nombre, ou si la structure est invalide). Gere « quatre-vingt(s) » = 4*20
// et les multiplicateurs « cent » / « mille ».
function parseNombre(atoms: string[]): number | null {
  if (atoms.length === 0) return null;
  // Fusionne « quatre vingt(s) » -> 80.
  const vals: number[] = [];
  for (let i = 0; i < atoms.length; i++) {
    const w = atoms[i];
    if (w === "et") continue; // simple liaison
    if (!(w in VALEURS)) return null;
    if (w === "quatre" && i + 1 < atoms.length && base(atoms[i + 1]) === "vingt") {
      vals.push(80);
      i++; // consomme « vingt(s) »
      continue;
    }
    vals.push(VALEURS[w]);
  }
  let result = 0;
  let current = 0;
  for (const v of vals) {
    if (v === 100) current = (current === 0 ? 1 : current) * 100;
    else if (v === 1000) {
      result += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else current += v;
  }
  return result + current;
}

// Rang (en francais) ou n et m different pour la premiere fois (du plus fort).
function rangDifferent(n: number, m: number): string {
  const rangs: [number, string][] = [
    [1000, "les milliers"],
    [100, "les centaines"],
    [10, "les dizaines"],
    [1, "les unités"],
  ];
  for (const [p, nom] of rangs) {
    if (Math.floor(n / p) % 10 !== Math.floor(m / p) % 10) return nom;
  }
  return "les unités";
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

// --- Messages (style « enfant de 8 ans », toujours un exemple concret) --------
function msgTraitUnion(): string {
  return `cinquante-deux → on relie les deux mots avec un petit trait.`;
}
function msgSVingtCent(word: "vingt" | "cent", sens: "manquant" | "en trop"): string {
  if (word === "vingt") {
    return sens === "manquant"
      ? `Ici « quatre-vingts » prend un s : rien après. quatre-vingts → avec un s. / quatre-vingt-deux → pas de s : un nombre vient après.`
      : `Ici « quatre-vingt » ne prend pas de s : un nombre vient après. quatre-vingt-deux → pas de s. / quatre-vingts → avec un s : rien après.`;
  }
  return sens === "manquant"
    ? `Ici « cents » prend un s : plusieurs centaines, rien après. deux cents → avec un s. / deux cent trois → pas de s : un nombre vient après.`
    : `Ici « cent » ne prend pas de s : un nombre vient après. deux cent trois → pas de s. / deux cents → avec un s : rien après.`;
}
function msgSMille(): string {
  return `Jamais de s à « mille ». Mille ne change jamais. trois mille → jamais de s.`;
}
function msgEtUn(): string {
  return `On dit vingt et un, trente et un… pas vingt-un. On met « et » devant un et onze.`;
}
function msgOrtho(correct: string): string {
  return `Ce mot s'écrit « ${correct} ». Regarde bien les lettres.`;
}
function msgMauvaisNombre(rang: string, bonne: string): string {
  return `Ce n'est pas le bon nombre : regarde ${rang}. On écrit « ${bonne} ».`;
}
function msgInconnu(bonne: string): string {
  return `Presque ! Regarde bien : on écrit « ${bonne} ».`;
}

// --- Detecteurs de fautes « cosmetiques » (memes mots-nombres) ----------------
// Retourne le mot (vingt/cent/mille) dont le « s » differe, ou null.
function detecteS(
  atomsI: string[],
  atomsC: string[]
): { word: "vingt" | "cent" | "mille"; sens: "manquant" | "en trop" } | null {
  const pick = (atoms: string[]) =>
    atoms.filter((w) => ["vingt", "cent", "mille"].includes(base(w)));
  const si = pick(atomsI);
  const sc = pick(atomsC);
  if (si.length !== sc.length) return null;
  for (let i = 0; i < si.length; i++) {
    const hasI = si[i].endsWith("s");
    const hasC = sc[i].endsWith("s");
    if (hasI !== hasC) {
      return { word: base(sc[i]) as "vingt" | "cent" | "mille", sens: hasC ? "manquant" : "en trop" };
    }
  }
  return null;
}

// --- Diagnostic principal -----------------------------------------------------
export function diagnostiquer(n: number, saisie: string): Diagnostic {
  const bonne = enLettresFr(n, "trad");
  const trad = normaliser(bonne);
  const input = normaliser(saisie);

  if (estJuste(n, saisie)) {
    return { juste: true, bonneEcriture: bonne, fautes: [] };
  }

  const faire = (fautes: Faute[]): Diagnostic => ({
    juste: false,
    bonneEcriture: bonne,
    fautes: fautes.slice(0, 2),
  });

  if (input === "") return faire([{ type: "INCONNU", message: msgInconnu(bonne), surligne: [bonne] }]);

  const atomsI = atomes(input);
  const atomsC = atomes(trad); // trad et rect ont les memes atomes

  // Memes mots-nombres employes : la (les) faute(s) est/sont cosmetique(s).
  if (motsCanon(atomsI) === motsCanon(atomsC)) {
    // b) TRAIT_UNION pur : atomes identiques (meme « et », memes « s »), seuls
    //    les separateurs different (sinon on serait « juste »).
    if (arraysEqual(atomsI, atomsC)) {
      return faire([{ type: "TRAIT_UNION", message: msgTraitUnion(), surligne: hyphensDe(bonne) }]);
    }
    const fautes: Faute[] = [];
    // c) S d'accord.
    const s = detecteS(atomsI, atomsC);
    if (s) {
      if (s.word === "mille") {
        fautes.push({ type: "S_MILLE", message: msgSMille(), surligne: ["mille"] });
      } else {
        fautes.push({
          type: "S_VINGT_CENT",
          message: msgSVingtCent(s.word, s.sens),
          surligne: [s.word === "vingt" ? "quatre-vingts" : "cents"],
        });
      }
    }
    // d) ET_UN : « et » manquant ou en trop.
    const etI = atomsI.filter((w) => w === "et").length;
    const etC = atomsC.filter((w) => w === "et").length;
    if (etI !== etC) {
      fautes.push({ type: "ET_UN", message: msgEtUn(), surligne: ["et"] });
    }
    if (fautes.length === 0) {
      // Memes mots mais ni s ni et ni separateurs purs : repli.
      return faire([{ type: "INCONNU", message: msgInconnu(bonne), surligne: [bonne] }]);
    }
    return faire(fautes);
  }

  // e) ORTHO_MOT : meme nombre de mots, un seul differe, ce mot n'est PAS un
  //    mot-nombre valide et se trouve a distance d'edition <= 2 de l'attendu.
  if (atomsI.length === atomsC.length) {
    const diffs: number[] = [];
    for (let i = 0; i < atomsI.length; i++) if (atomsI[i] !== atomsC[i]) diffs.push(i);
    if (diffs.length === 1) {
      const i = diffs[0];
      const attendu = atomsC[i];
      if (!MOTS_NOMBRES.has(atomsI[i]) && levenshtein(atomsI[i], attendu) <= 2) {
        return faire([{ type: "ORTHO_MOT", message: msgOrtho(attendu), surligne: [attendu] }]);
      }
    }
  }

  // f) MAUVAIS_NOMBRE : tous les mots sont des mots-nombres valides mais forment
  //    un AUTRE nombre.
  const m = parseNombre(atomsI);
  if (m !== null && m !== n) {
    return faire([
      { type: "MAUVAIS_NOMBRE", message: msgMauvaisNombre(rangDifferent(n, m), bonne), surligne: [bonne] },
    ]);
  }

  // g) INCONNU.
  return faire([{ type: "INCONNU", message: msgInconnu(bonne), surligne: [bonne] }]);
}

// Fragments a surligner pour une faute de trait d'union : les mots relies dans
// la bonne ecriture (groupes contenant un trait d'union).
function hyphensDe(bonne: string): string[] {
  return bonne.split(" ").filter((g) => g.includes("-"));
}

// Catalogue des messages (pour relecture et docs/explications.md). Les parties
// variables (nombre, mot) sont notees entre accolades.
// Catalogue des messages de l'ecriture en lettres (sous-ensemble de TypeFaute).
type FauteLettres =
  | "TRAIT_UNION" | "S_VINGT_CENT" | "S_MILLE" | "ET_UN" | "ORTHO_MOT"
  | "MAUVAIS_NOMBRE" | "INCONNU";
export const MESSAGES_CATALOGUE: Record<FauteLettres | "JUSTE", string> = {
  JUSTE: "Bravo ! C'est la bonne écriture.",
  TRAIT_UNION: "cinquante-deux → on relie les deux mots avec un petit trait.",
  S_VINGT_CENT:
    "cents : deux cents → avec un s (rien après) / deux cent trois → pas de s (un nombre vient après). vingts : quatre-vingts → avec un s / quatre-vingt-deux → pas de s.",
  S_MILLE: "Jamais de s à « mille ». Mille ne change jamais. trois mille → jamais de s.",
  ET_UN: "On dit vingt et un, trente et un… pas vingt-un. On met « et » devant un et onze.",
  ORTHO_MOT: "Ce mot s'écrit « {mot} ». Regarde bien les lettres.",
  MAUVAIS_NOMBRE: "Ce n'est pas le bon nombre : regarde {rang}. On écrit « {nombre} ».",
  INCONNU: "Presque ! Regarde bien : on écrit « {nombre} ».",
};
