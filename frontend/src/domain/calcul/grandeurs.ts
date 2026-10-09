// Generateur des GRANDEURS CM1 : PERIMETRE et AIRE d'un carre / rectangle
// (programme cycle 3). Saisie au clavier numerique ; le SERVEUR reste seul juge
// (verif_calcul) :
//   * AIRE = cote x cote ou Longueur x largeur -> op 'mul' (le serveur recalcule) ;
//   * PERIMETRE = 4 x cote ou 2 x (L + l) -> op 'val' (la valeur cible est encodee
//     dans `a` ; meme procede que les fractions / decimaux, car un perimetre n'est
//     pas un produit en une seule operation).
// Enonces sans schema (dimensions donnees par le texte) : pas de nouvelle UI.
// Unites simples (cm, cm carres). Generation DETERMINISTE -> tests golden.

import { intBetween, pick, type Rng } from "./rng";
import type { Base, ExCalcul, GeneratedExercise } from "./generator";

export function buildGrandeurs(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const p = src.params || {};
  const types = (Array.isArray(p.types) && p.types.length > 0 ? p.types : ["rectangle"]) as string[];
  const type = pick(rng, types);
  const min = Number(p.min ?? 2);
  const max = Number(p.max ?? 9);

  // --- PERIMETRE (op 'val' : valeur cible encodee) -----------------------
  if (src.competence === "MA.MES.PERIMETRE") {
    if (type === "carre") {
      const c = intBetween(rng, min, max);
      const per = 4 * c;
      return {
        ...base, saisie: "clavier", reste: null, fields: 1,
        prompt: `Un carré a un côté de ${c} cm. Quel est son périmètre en cm ?`,
        answer: per, verif: { op: "val", a: per, b: 0 },
        correction: `Le périmètre d'un carré, c'est 4 fois le côté : 4 fois ${c} font ${per} cm.`,
      };
    }
    // rectangle
    let L = intBetween(rng, min, max);
    let l = intBetween(rng, min, max);
    if (l > L) { const t = L; L = l; l = t; }
    const per = 2 * (L + l);
    return {
      ...base, saisie: "clavier", reste: null, fields: 1,
      prompt: `Un rectangle mesure ${L} cm de long et ${l} cm de large. Quel est son périmètre en cm ?`,
      answer: per, verif: { op: "val", a: per, b: 0 },
      correction: `On ajoute les quatre côtés : ${L} et ${l} et ${L} et ${l} font ${per} cm. (On peut aussi faire 2 fois ${L + l}.)`,
    };
  }

  // --- AIRE (op 'mul' : le serveur recalcule le produit) -----------------
  if (type === "carre") {
    const c = intBetween(rng, min, max);
    return {
      ...base, saisie: "clavier", reste: null, fields: 1,
      prompt: `Un carré a un côté de ${c} cm. Quelle est son aire en centimètres carrés ?`,
      answer: c * c, verif: { op: "mul", a: c, b: c },
      correction: `L'aire d'un carré, c'est côté fois côté : ${c} fois ${c} font ${c * c} centimètres carrés.`,
    };
  }
  let L = intBetween(rng, min, max);
  let l = intBetween(rng, min, max);
  if (l > L) { const t = L; L = l; l = t; }
  return {
    ...base, saisie: "clavier", reste: null, fields: 1,
    prompt: `Un rectangle mesure ${L} cm de long et ${l} cm de large. Quelle est son aire en centimètres carrés ?`,
    answer: L * l, verif: { op: "mul", a: L, b: l },
    correction: `L'aire d'un rectangle, c'est longueur fois largeur : ${L} fois ${l} font ${L * l} centimètres carrés.`,
  };
}
