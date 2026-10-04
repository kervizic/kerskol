// Generateur d'exercices de FRACTIONS SIMPLES (TS pur, sans effet de bord).
//
// Competence CE2 MA.FRAC.SIMPLES (demi, tiers, quart, puis n/2..n/10) :
//   * nommer la fraction coloriee d'une figure (QCM : disque / rectangle / bande) ;
//   * colorier/selectionner les parts (saisie "fraction" : la reponse = le
//     nombre de parts a colorier) ;
//   * comparer une fraction a 1 (cmp) ;
//   * fraction d'une quantite simple : la moitie de 12, le quart de 20 (div).
//
// NORMALISATION EN ENTIERS (cf. docs/referentiel-calcul.md) :
//   nommer     -> val, la saisie = CODE de la fraction = num*100 + den ;
//   colorier   -> val, la saisie = nombre de parts coloriees (num) ;
//   comparer a 1 -> cmp (a = num, b = den) ;
//   fraction d'une quantite -> div (a = quantite, b = den).
// Le serveur recalcule et decide seul (verif_calcul), bornes famille MA.FRAC.%.

import { intBetween, pick, shuffle, type Rng } from "./rng";
import type { Base, ExCalcul, GeneratedExercise, QcmOption } from "./generator";

type Shape = "disque" | "rectangle" | "bande";
const SHAPES: Shape[] = ["disque", "rectangle", "bande"];

// Code entier d'une fraction (num/den) : num*100 + den (num,den <= 99).
function fracCode(num: number, den: number): number {
  return num * 100 + den;
}
const NOM_FRAC: Record<number, string> = {
  2: "demi", 3: "tiers", 4: "quart", 5: "cinquieme", 10: "dixieme",
};
const ARTICLE_DE: Record<number, string> = {
  2: "la moitie de", 3: "le tiers de", 4: "le quart de", 5: "le cinquieme de", 10: "le dixieme de",
};

// Trois distracteurs plausibles pour « quelle fraction ? », distincts, valides
// (num >= 1, den >= 2).
function nommerOptions(rng: Rng, num: number, den: number): QcmOption[] {
  const codes = new Set<number>([fracCode(num, den)]);
  const cand: [number, number][] = [
    [den, num],            // aiguilles inversees : den/num
    [num + 1, den],
    [Math.max(1, num - 1), den],
    [num, den + 1],
    [num, Math.max(2, den - 1)],
    [Math.min(den, num + 1), den],
  ];
  for (const [n, d] of shuffle(rng, cand)) {
    if (codes.size >= 4) break;
    if (n >= 1 && d >= 2 && n <= d + 1) codes.add(fracCode(n, d));
  }
  let g = 2;
  while (codes.size < 4 && g <= 9) {
    codes.add(fracCode(1, g));
    g++;
  }
  return shuffle(rng, [...codes]).map((c) => ({
    label: `${Math.floor(c / 100)}/${c % 100}`,
    value: c,
  }));
}

export function buildFraction(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const p = src.params || {};
  const type = pick(rng, (p.types as string[] | undefined) || ["nommer"]);
  const dens = (p.dens as number[] | undefined) || [2, 3, 4];

  // --- Nommer la fraction coloriee (QCM + figure) ---
  if (type === "nommer") {
    const den = pick(rng, dens);
    const num = intBetween(rng, 1, den - 1);
    const shape = pick(rng, SHAPES);
    const code = fracCode(num, den);
    return {
      ...base,
      saisie: "qcm",
      options: nommerOptions(rng, num, den),
      fractionData: { num, den, shape },
      prompt: "Quelle fraction de la figure est coloriee ?",
      answer: code,
      verif: { op: "val", a: code, b: 0 },
      correction: `La figure est partagee en ${den} parts egales, ${num} ${num > 1 ? "sont" : "est"} coloriee${num > 1 ? "s" : ""} : c'est ${num}/${den}.`,
    };
  }

  // --- Colorier/selectionner les parts (saisie "fraction") ---
  if (type === "colorier") {
    const den = pick(rng, dens);
    const num = intBetween(rng, 1, den - 1);
    const shape = pick(rng, SHAPES);
    return {
      ...base,
      saisie: "fraction",
      fractionData: { num, den, shape, interactive: true },
      prompt: `Colorie ${num}/${den} de la figure (touche les parts).`,
      answer: num,
      verif: { op: "val", a: num, b: 0 },
      correction: `${num}/${den} : on colorie ${num} part${num > 1 ? "s" : ""} sur ${den}.`,
    };
  }

  // --- Comparer une fraction a 1 (cmp) ---
  if (type === "comparer_1") {
    const den = pick(rng, dens);
    const num = intBetween(rng, 1, den + 2); // parfois > 1
    const answer = num < den ? 0 : num === den ? 1 : 2;
    const mot = answer === 0 ? "plus petite que 1" : answer === 1 ? "egale a 1" : "plus grande que 1";
    return {
      ...base,
      saisie: "compare",
      compareLabels: { left: `${num}/${den}`, right: "1" },
      prompt: `Compare la fraction ${num}/${den} a 1.`,
      answer,
      verif: { op: "cmp", a: num, b: den },
      correction: `1 = ${den}/${den}. Comme ${num} ${answer === 0 ? "<" : answer === 1 ? "=" : ">"} ${den}, ${num}/${den} est ${mot}.`,
    };
  }

  // --- Fraction d'une quantite simple (div) ---
  const den = pick(rng, dens);
  const k = intBetween(rng, 2, 10);
  const quantite = den * k;
  return {
    ...base,
    prompt: `Combien font ${ARTICLE_DE[den] ?? `1/${den} de`} ${quantite} ? [q]`,
    answer: k,
    verif: { op: "div", a: quantite, b: den },
    correction: `${ARTICLE_DE[den] ?? `1/${den} de`} ${quantite}, c'est ${quantite} ÷ ${den} = ${k}.`,
  };
}
