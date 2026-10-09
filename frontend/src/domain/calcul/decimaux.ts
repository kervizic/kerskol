// Generateur des NOMBRES DECIMAUX (maths, CM1). Nouvelle sous-matiere `decimaux`
// (portee CM1..CM2). Trois competences, toutes jugees par le SERVEUR via l'op
// 'val' (reponse attendue = valeur cible), la reponse etant ENCODEE EN CENTIEMES
// (entier) : un nombre decimal `x` vaut `round(x * 100)` centiemes (ex. 3,25 ->
// 325 ; 3,5 -> 350 ; 7 -> 700). Le composant <DecimalInput> (pave + virgule)
// convertit la saisie a virgule en ce code ; aucun flottant ne circule.
//
//   MA.DEC.ECRIRE    ecrire un decimal en chiffres (depuis une designation en
//                    unites/dixiemes/centiemes, ou depuis une fraction decimale
//                    -> lien fractions decimales) ;
//   MA.DEC.COMPARER  comparer deux decimaux (ecrire le plus grand / le plus petit) ;
//   MA.DEC.ENCADRER  encadrer un decimal entre deux entiers consecutifs (ecrire
//                    l'entier juste avant / juste apres).
//
// Generation DETERMINISTE (graine) -> tests golden (decimaux.test.ts). Les
// bornes viennent de params (maxE = plus grande partie entiere). La saisie est
// "decimal" ; le serveur (verif_calcul, op 'val', famille MA.DEC.% bornee a
// 100000 centiemes = 1000,00) reste SEUL JUGE.

import { intBetween, pick, type Rng } from "./rng";
import type { Base, ExCalcul, GeneratedExercise } from "./generator";

// Ecriture a virgule -> code EN CENTIEMES (entier). "3,25" -> 325, "3,5" -> 350,
// "0,07" -> 7, "7" -> 700. Vide / invalide -> -1. Au plus 2 decimales prises en
// compte. Utilise par <DecimalInput> (Session.tsx).
export function decimalToCentiemes(txt: string): number {
  const s = (txt || "").trim();
  if (s === "" || s === ",") return -1;
  const [ent, dec = ""] = s.split(",");
  const e = ent === "" ? 0 : Number(ent);
  if (!Number.isFinite(e)) return -1;
  const cent = dec.length === 0 ? 0 : dec.length === 1 ? Number(dec) * 10 : Number(dec.slice(0, 2));
  if (!Number.isFinite(cent)) return -1;
  return e * 100 + cent;
}

// Centiemes (entier) -> ecriture a virgule minimale ("3,25", "3,5", "0,07", "7").
export function fmtDecimal(cent: number): string {
  const e = Math.floor(cent / 100);
  const d = cent % 100;
  if (d === 0) return String(e);
  const dec = d % 10 === 0 ? String(d / 10) : d < 10 ? `0${d}` : String(d);
  return `${e},${dec}`;
}

export function buildDecimal(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const p = src.params || {};
  const types = (Array.isArray(p.types) && p.types.length > 0 ? p.types : ["ecrire_centiemes"]) as string[];
  const type = pick(rng, types);
  const maxE = Number(p.maxE ?? 9);

  const mk = (prompt: string, answer: number, correction: string): GeneratedExercise => ({
    ...base,
    saisie: "decimal",
    prompt,
    answer,
    reste: null,
    fields: 1,
    verif: { op: "val", a: answer, b: 0 },
    correction,
  });

  // --- ECRIRE : unites + centiemes ---------------------------------------
  if (type === "ecrire_centiemes") {
    const e = intBetween(rng, 1, maxE);
    const d = intBetween(rng, 1, 99);
    const cent = e * 100 + d;
    return mk(
      `Écris ce nombre en chiffres : ${e} ${e > 1 ? "unités" : "unité"} et ${d} ${d > 1 ? "centièmes" : "centième"}.`,
      cent,
      `${e} ${e > 1 ? "unités" : "unité"} et ${d} centièmes s'écrivent ${fmtDecimal(cent)}.`,
    );
  }

  // --- ECRIRE : unites + dixiemes (plus simple) --------------------------
  if (type === "ecrire_dixiemes") {
    const e = intBetween(rng, 1, maxE);
    const k = intBetween(rng, 1, 9);
    const cent = e * 100 + k * 10;
    return mk(
      `Écris ce nombre en chiffres : ${e} ${e > 1 ? "unités" : "unité"} et ${k} ${k > 1 ? "dixièmes" : "dixième"}.`,
      cent,
      `${e} ${e > 1 ? "unités" : "unité"} et ${k} dixièmes s'écrivent ${fmtDecimal(cent)}.`,
    );
  }

  // --- ECRIRE : depuis une fraction decimale (lien fractions decimales) --
  if (type === "ecrire_fraction") {
    const den = pick(rng, [10, 100]) as number;
    if (den === 10) {
      const num = intBetween(rng, 1, 9);
      const cent = num * 10;
      return mk(
        `Écris ce nombre avec une virgule : ${num} ${num > 1 ? "dixièmes" : "dixième"}.`,
        cent,
        `${num} dixièmes, c'est ${num} sur 10, soit ${fmtDecimal(cent)}.`,
      );
    }
    const num = intBetween(rng, 1, 99);
    const cent = num;
    return mk(
      `Écris ce nombre avec une virgule : ${num} ${num > 1 ? "centièmes" : "centième"}.`,
      cent,
      `${num} centièmes, c'est ${num} sur 100, soit ${fmtDecimal(cent)}.`,
    );
  }

  // --- COMPARER : ecrire le plus grand / le plus petit -------------------
  if (type === "comparer_grand" || type === "comparer_petit") {
    const e = intBetween(rng, 0, maxE);
    let d1 = intBetween(rng, 0, 99);
    let d2 = intBetween(rng, 0, 99);
    while (d2 === d1) d2 = intBetween(rng, 0, 99);
    const x = e * 100 + d1;
    const y = e * 100 + d2;
    const grand = type === "comparer_grand";
    const answer = grand ? Math.max(x, y) : Math.min(x, y);
    const mot = grand ? "le plus grand" : "le plus petit";
    return mk(
      `Écris ${mot} de ces deux nombres : ${fmtDecimal(x)} ou ${fmtDecimal(y)}.`,
      answer,
      `On compare la partie après la virgule : ${mot} est ${fmtDecimal(answer)}.`,
    );
  }

  // --- ENCADRER : entier juste avant / juste apres -----------------------
  if (type === "encadrer_avant" || type === "encadrer_apres") {
    const e = intBetween(rng, 1, Math.max(1, maxE - 1));
    const d = intBetween(rng, 1, 99);
    const cent = e * 100 + d;
    const avant = type === "encadrer_avant";
    const answer = avant ? e * 100 : (e + 1) * 100;
    const mot = avant ? "juste avant" : "juste après";
    return mk(
      `Quel est le nombre entier ${mot} ${fmtDecimal(cent)} ? Écris-le.`,
      answer,
      `${fmtDecimal(cent)} est entre ${e} et ${e + 1}. L'entier ${mot} est ${answer / 100}.`,
    );
  }

  // Repli robuste (ne devrait pas arriver) : ecrire un decimal simple.
  const e = intBetween(rng, 1, maxE);
  const d = intBetween(rng, 1, 99);
  const cent = e * 100 + d;
  return mk(
    `Écris ce nombre en chiffres : ${e} unités et ${d} centièmes.`,
    cent,
    `C'est ${fmtDecimal(cent)}.`,
  );
}
