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

  // --- Nommer la fraction coloriee (figure) ---
  // QCM au niveau 1 (amorce en douceur) ; SAISIE LIBRE du numerateur et du
  // denominateur des le niveau 2 (regle pedagogique « reponse libre » + regle
  // transverse du referentiel : QCM au seul niveau 1, saisie ensuite). Le
  // contrat serveur est identique : la saisie envoyee est le CODE num*100+den
  // (verif val), que ce soit par QCM ou par saisie libre.
  if (type === "nommer") {
    const den = pick(rng, dens);
    const num = intBetween(rng, 1, den - 1);
    const shape = pick(rng, SHAPES);
    const code = fracCode(num, den);
    const correction = `La figure est partagee en ${den} parts egales, ${num} ${num > 1 ? "sont" : "est"} coloriee${num > 1 ? "s" : ""} : c'est ${num}/${den}.`;
    if (base.niveau <= 1) {
      return {
        ...base,
        saisie: "qcm",
        options: nommerOptions(rng, num, den),
        fractionData: { num, den, shape },
        prompt: "Quelle fraction de la figure est coloriee ?",
        answer: code,
        verif: { op: "val", a: code, b: 0 },
        correction,
      };
    }
    return {
      ...base,
      saisie: "fraction_num",
      fractionData: { num, den, shape },
      prompt: "Ecris la fraction de la figure qui est coloriee.",
      answer: code,
      verif: { op: "val", a: code, b: 0 },
      correction,
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

  // ========================================================================
  // CM1 (lot « Fractions ») : droite graduee, comparer deux fractions,
  // fractions egales (equivalences, fractions decimales), fraction d'une
  // quantite (non unitaire). Memes ops serveur (val / cmp / div), memes bornes
  // famille MA.FRAC.% (<= 2000).
  // ========================================================================

  // --- Fraction sur une bande graduee de 0 a 1 (lire / ecrire) -------------
  // La bande 0->1 partagee en `den` parts est une portion de droite graduee ;
  // la part coloriee marque l'abscisse num/den. Meme contrat que « nommer »
  // (code num*100+den, verif val), QCM au seul niveau 1.
  if (type === "droite") {
    const den = pick(rng, dens);
    const num = intBetween(rng, 1, den - 1);
    const code = fracCode(num, den);
    const correction = `La bande va de 0 a 1, partagee en ${den} parts egales. La marque est a ${num} part${num > 1 ? "s" : ""} de 0 : c'est ${num}/${den}.`;
    if (base.niveau <= 1) {
      return {
        ...base,
        saisie: "qcm",
        options: nommerOptions(rng, num, den),
        fractionData: { num, den, shape: "bande" },
        prompt: "Sur la bande graduee de 0 a 1, quelle fraction est marquee ?",
        answer: code,
        verif: { op: "val", a: code, b: 0 },
        correction,
      };
    }
    return {
      ...base,
      saisie: "fraction_num",
      fractionData: { num, den, shape: "bande" },
      prompt: "Ecris la fraction marquee sur la bande graduee de 0 a 1.",
      answer: code,
      verif: { op: "val", a: code, b: 0 },
      correction,
    };
  }

  // --- Comparer deux fractions (cmp) ---------------------------------------
  // Le serveur recompose a = n1*d2, b = n2*d1 (produits <= 2000) et compare :
  // n1/d1 vs n2/d2 revient a comparer n1*d2 vs n2*d1.
  if (type === "comparer_frac") {
    const sub = pick(rng, (p.subtypes as string[] | undefined) || ["meme_den"]);
    let n1: number, d1: number, n2: number, d2: number;
    if (sub === "meme_den") {
      const d = pick(rng, dens.filter((x) => x >= 3).length ? dens.filter((x) => x >= 3) : dens);
      d1 = d; d2 = d;
      n1 = intBetween(rng, 1, d - 1);
      do { n2 = intBetween(rng, 1, d - 1); } while (n2 === n1);
    } else if (sub === "meme_num") {
      const n = pick(rng, [1, 2, 3]);
      n1 = n; n2 = n;
      d1 = pick(rng, dens);
      do { d2 = pick(rng, dens); } while (d2 === d1);
    } else if (sub === "a_demi") {
      // comparer une fraction a 1/2
      const d = pick(rng, dens.filter((x) => x % 2 === 0 && x >= 4).length ? dens.filter((x) => x % 2 === 0 && x >= 4) : [4, 6, 8]);
      d1 = d; n1 = intBetween(rng, 1, d - 1);
      n2 = 1; d2 = 2;
    } else {
      // quelconque (petits denominateurs)
      d1 = pick(rng, dens); n1 = intBetween(rng, 1, d1);
      d2 = pick(rng, dens); n2 = intBetween(rng, 1, d2);
    }
    const a = n1 * d2;
    const b = n2 * d1;
    const answer = a < b ? 0 : a === b ? 1 : 2;
    const signe = answer === 0 ? "<" : answer === 1 ? "=" : ">";
    return {
      ...base,
      saisie: "compare",
      compareLabels: { left: `${n1}/${d1}`, right: `${n2}/${d2}` },
      prompt: `Compare les deux fractions : ${n1}/${d1} et ${n2}/${d2}.`,
      answer,
      verif: { op: "cmp", a, b },
      correction: `On met au meme denominateur : ${n1}/${d1} = ${a}/${d1 * d2} et ${n2}/${d2} = ${b}/${d1 * d2}. Comme ${a} ${signe} ${b}, alors ${n1}/${d1} ${signe} ${n2}/${d2}.`,
    };
  }

  // --- Fractions egales : completer une equivalence (val) ------------------
  // n1/den1 = ?/den2 avec den2 = den1 * f ; la reponse est num2 = n1 * f.
  // Au niveau haut, familles decimales (den2 = 10 ou 100) -> fractions decimales.
  if (type === "egalites") {
    const bases = (p.bases as number[] | undefined) || [2, 3, 4, 5];
    const facteurs = (p.facteurs as number[] | undefined) || [2, 3];
    const den1 = pick(rng, bases);
    const f = pick(rng, facteurs);
    const num1 = intBetween(rng, 1, den1 - 1);
    const den2 = den1 * f;
    const num2 = num1 * f;
    const correction = `Pour aller de ${den1} a ${den2}, on multiplie par ${f}. On multiplie donc aussi le haut : ${num1} × ${f} = ${num2}. Donc ${num1}/${den1} = ${num2}/${den2}.`;
    if (base.niveau <= 1) {
      const opts = new Set<number>([num2]);
      for (const d of [num1, num2 + 1, Math.max(1, num2 - 1), num1 * (f + 1)]) {
        if (opts.size >= 3) break;
        if (d >= 1 && d < den2) opts.add(d);
      }
      let g = 1;
      while (opts.size < 3) { if (g !== num2 && g < den2) opts.add(g); g++; }
      return {
        ...base,
        saisie: "qcm",
        options: shuffle(rng, [...opts]).map((v) => ({ label: `${v}/${den2}`, value: v })),
        prompt: `Quelle fraction est egale a ${num1}/${den1} ?`,
        answer: num2,
        verif: { op: "val", a: num2, b: 0 },
        correction,
      };
    }
    return {
      ...base,
      prompt: `Complete l'egalite : ${num1}/${den1} = [q]/${den2}`,
      answer: num2,
      verif: { op: "val", a: num2, b: 0 },
      correction,
    };
  }

  // --- Fraction d'une quantite (unitaire : div ; non unitaire : val) -------
  if (type === "quantite_cm1") {
    const den = pick(rng, dens);
    const k = intBetween(rng, 2, 12);
    const quantite = den * k;
    const nonUnit = base.niveau >= 3;
    const num = nonUnit ? intBetween(rng, 2, den - 1 >= 2 ? den - 1 : 2) : 1;
    if (num <= 1) {
      return {
        ...base,
        prompt: `Combien font ${ARTICLE_DE[den] ?? `1/${den} de`} ${quantite} ? [q]`,
        answer: k,
        verif: { op: "div", a: quantite, b: den },
        correction: `${ARTICLE_DE[den] ?? `1/${den} de`} ${quantite}, c'est ${quantite} ÷ ${den} = ${k}.`,
      };
    }
    const answer = num * k;
    return {
      ...base,
      prompt: `Combien font ${num}/${den} de ${quantite} ? [q]`,
      answer,
      verif: { op: "val", a: answer, b: 0 },
      correction: `D'abord 1/${den} de ${quantite} : ${quantite} ÷ ${den} = ${k}. Puis ${num} × ${k} = ${answer}. Donc ${num}/${den} de ${quantite} = ${answer}.`,
    };
  }

  // --- Fraction d'une quantite simple (div) : type "quantite" (CE2) --------
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
