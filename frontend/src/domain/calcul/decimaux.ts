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

  // --- DROITE GRADUEE (lot 7) : lire un decimal place par une fleche sur une
  //     droite entre deux entiers consecutifs, graduee en DIXIEMES (reutilise la
  //     bande des fractions : <DroiteView> avec labels decimaux). Reponse en
  //     centiemes, op 'val'. --------------------------------------------------
  if (type === "droite") {
    const e = intBetween(rng, 0, Math.max(0, maxE - 1));
    const k = intBetween(rng, 1, 9); // dixieme pointe (1..9, jamais sur un entier)
    const from = e * 100;
    const to = (e + 1) * 100;
    const at = from + k * 10;
    return {
      ...base,
      saisie: "decimal",
      reste: null,
      fields: 1,
      droiteData: { from, to, step: 10, at, decimales: true },
      prompt: "Quel nombre décimal est indiqué par la flèche ? Écris-le.",
      answer: at,
      verif: { op: "val", a: at, b: 0 },
      correction: `La flèche est sur ${fmtDecimal(at)} (entre ${e} et ${e + 1}, c'est ${k} ${k > 1 ? "dixièmes" : "dixième"}).`,
    };
  }

  // --- RANGER (lot 7) : trouver le plus petit / le plus grand parmi TROIS
  //     decimaux (pieges du zero et des longueurs : 0,7 / 0,07 / 0,65). Reponse
  //     en centiemes, op 'val'. -----------------------------------------------
  if (type === "ranger_petit" || type === "ranger_grand") {
    const petit = type === "ranger_petit";
    const e = intBetween(rng, 0, maxE);
    // Trois formes decimales distinctes du meme entier : un centieme seul
    // (e,0c), un dixieme seul (e,d0), un mixte (e,dc) -> pieges classiques.
    const vals = new Set<number>();
    vals.add(e * 100 + intBetween(rng, 1, 9)); // e,0c
    while (vals.size < 2) vals.add(e * 100 + intBetween(rng, 1, 9) * 10); // e,d
    while (vals.size < 3) vals.add(e * 100 + intBetween(rng, 1, 9) * 10 + intBetween(rng, 1, 9)); // e,dc
    const arr = [...vals];
    // Melange stable par la graine.
    for (let i = arr.length - 1; i > 0; i--) {
      const j = intBetween(rng, 0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const answer = petit ? Math.min(...arr) : Math.max(...arr);
    const mot = petit ? "le plus petit" : "le plus grand";
    return mk(
      `Écris ${mot} de ces trois nombres : ${arr.map(fmtDecimal).join(" ; ")}.`,
      answer,
      `On compare l'entier, puis les dixièmes, puis les centièmes. ${mot[0].toUpperCase()}${mot.slice(1)} est ${fmtDecimal(answer)}.`,
    );
  }

  // --- ADDITION / SOUSTRACTION de decimaux (lot 3) : saisie <DecimalInput>,
  //     op 'add'/'sub' sur les CENTIEMES (le serveur recalcule). ------------
  if (src.competence === "MA.DEC.ADDITION" || src.competence === "MA.DEC.SOUSTRACTION") {
    const randCent = () => intBetween(rng, 1, maxE) * 100 + intBetween(rng, 1, 99);
    if (src.competence === "MA.DEC.ADDITION") {
      const x = randCent();
      const y = randCent();
      return {
        ...base, saisie: "decimal", reste: null, fields: 1,
        prompt: `Calcule : ${fmtDecimal(x)} + ${fmtDecimal(y)}`,
        answer: x + y, verif: { op: "add", a: x, b: y },
        correction: `On aligne les virgules et on additionne : ${fmtDecimal(x)} plus ${fmtDecimal(y)} font ${fmtDecimal(x + y)}.`,
      };
    }
    // soustraction : x >= y
    let x = randCent();
    let y = randCent();
    if (y > x) { const t = x; x = y; y = t; }
    return {
      ...base, saisie: "decimal", reste: null, fields: 1,
      prompt: `Calcule : ${fmtDecimal(x)} − ${fmtDecimal(y)}`,
      answer: x - y, verif: { op: "sub", a: x, b: y },
      correction: `On aligne les virgules et on soustrait : ${fmtDecimal(x)} moins ${fmtDecimal(y)} font ${fmtDecimal(x - y)}.`,
    };
  }

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
  // ETAGEMENT (recalibrage lot A) : avant, x et y partageaient TOUJOURS la meme
  // partie entiere et la comparaison portait sur deux nombres 0..99 a chaque
  // niveau (maxE cosmetique) -> N2 = N3 = N4. La difficulte porte desormais sur
  // la STRUCTURE decimale, via le parametre `struct` :
  //   "ent"  : parties entieres DIFFERENTES (on tranche sur l'entier) -> facile ;
  //   "dix"  : meme entier, dixiemes (un seul chiffre apres la virgule) ;
  //   "long" : meme entier, longueurs differentes (piege « 2,5 vs 2,45 ») ;
  //   "cent" : meme entier, centiemes avec piege du zero (« 0,07 vs 0,7 »).
  if (type === "comparer_grand" || type === "comparer_petit") {
    const struct = String(p.struct ?? "dix");
    let x: number;
    let y: number;
    if (struct === "ent") {
      const e1 = intBetween(rng, 0, maxE);
      const e2 = e1 + intBetween(rng, 1, 3);
      x = e1 * 100 + intBetween(rng, 0, 9) * 10;
      y = e2 * 100 + intBetween(rng, 0, 9) * 10;
    } else if (struct === "long") {
      const e = intBetween(rng, 0, maxE);
      const k = intBetween(rng, 1, 9); // un dixieme : e,k
      let c = intBetween(rng, 1, 99); // un centieme : e,cc
      while (c === k * 10 || c % 10 === 0) c = intBetween(rng, 1, 99);
      x = e * 100 + k * 10;
      y = e * 100 + c;
    } else if (struct === "cent") {
      const e = intBetween(rng, 0, maxE);
      x = e * 100 + intBetween(rng, 1, 9); // e,0c (centiemes seuls : 0,01 a 0,09)
      y = e * 100 + intBetween(rng, 1, 9) * 10; // e,d (dixiemes seuls : 0,10 a 0,90)
    } else {
      const e = intBetween(rng, 0, maxE); // "dix"
      let k1 = intBetween(rng, 1, 9);
      let k2 = intBetween(rng, 1, 9);
      while (k2 === k1) k2 = intBetween(rng, 1, 9);
      x = e * 100 + k1 * 10;
      y = e * 100 + k2 * 10;
    }
    if (intBetween(rng, 0, 1) === 1) {
      const t = x;
      x = y;
      y = t;
    }
    const grand = type === "comparer_grand";
    const answer = grand ? Math.max(x, y) : Math.min(x, y);
    const mot = grand ? "le plus grand" : "le plus petit";
    return mk(
      `Écris ${mot} de ces deux nombres : ${fmtDecimal(x)} ou ${fmtDecimal(y)}.`,
      answer,
      `On compare d'abord la partie entière, puis les dixièmes, puis les centièmes. ${mot[0].toUpperCase()}${mot.slice(1)} est ${fmtDecimal(answer)}.`,
    );
  }

  // --- ENCADRER : entre deux entiers (N1/N2) ou au dixieme (N3/N4) --------
  // ETAGEMENT (recalibrage lot A) : « entre deux entiers » etait une tache
  // constante (maxE cosmetique) -> N2 = N3 = N4. On fait d'abord varier la
  // longueur decimale, puis on passe a l'encadrement AU DIXIEME (plus exigeant,
  // la reponse n'est plus un entier) :
  //   pas "entier" + decimales 1 : entre deux entiers, un chiffre apres la virgule ;
  //   pas "entier" + decimales 2 : entre deux entiers, centiemes ;
  //   pas "dixieme"              : entre deux dixiemes (ex. 3,47 entre 3,4 et 3,5).
  if (type === "encadrer_avant" || type === "encadrer_apres") {
    const avant = type === "encadrer_avant";
    const mot = avant ? "juste avant" : "juste après";
    const pas = String(p.pas ?? "entier");
    if (pas === "dixieme") {
      const e = intBetween(rng, 1, Math.max(1, maxE - 1));
      const dix = intBetween(rng, 0, 9);
      const cent = intBetween(rng, 1, 9); // un centieme non nul : pas deja un dixieme
      const val = e * 100 + dix * 10 + cent;
      const low = e * 100 + dix * 10;
      const high = low + 10;
      const answer = avant ? low : high;
      return mk(
        `Écris le nombre à un seul chiffre après la virgule ${mot} ${fmtDecimal(val)}.`,
        answer,
        `${fmtDecimal(val)} est entre ${fmtDecimal(low)} et ${fmtDecimal(high)}. Le nombre ${mot} est ${fmtDecimal(answer)}.`,
      );
    }
    const e = intBetween(rng, 1, Math.max(1, maxE - 1));
    const decimales = Number(p.decimales ?? 2);
    const d = decimales === 1 ? intBetween(rng, 1, 9) * 10 : intBetween(rng, 1, 99);
    const cent = e * 100 + d;
    const answer = avant ? e * 100 : (e + 1) * 100;
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
