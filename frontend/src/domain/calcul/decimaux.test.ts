// Tests des NOMBRES DECIMAUX (CM1) : encodage en centiemes (decimalToCentiemes),
// formatage (fmtDecimal), et generateur (buildDecimal via generateExercise) sur
// les sources reelles (SEED_SOURCES, bloc DEC). Invariants GOLDEN : saisie
// "decimal", op 'val', reponse = valeur cible encodee en centiemes, bornee a
// 100000, et determinisme (meme graine -> meme exercice).

import { describe, it, expect } from "vitest";
import { fmtDecimal, decimalToCentiemes } from "./decimaux";
import { generateExercise, computeVerif } from "./generator";
import { SEED_SOURCES } from "./seedSources";

const DEC_SOURCES = SEED_SOURCES.filter((s) => s.competence.startsWith("MA.DEC."));

describe("decimaux : formatage et encodage", () => {
  it("fmtDecimal : ecriture a virgule minimale", () => {
    expect(fmtDecimal(325)).toBe("3,25");
    expect(fmtDecimal(350)).toBe("3,5");
    expect(fmtDecimal(307)).toBe("3,07");
    expect(fmtDecimal(300)).toBe("3");
    expect(fmtDecimal(7)).toBe("0,07");
    expect(fmtDecimal(30)).toBe("0,3");
    expect(fmtDecimal(1299)).toBe("12,99");
  });

  it("decimalToCentiemes : saisie a virgule -> centiemes", () => {
    expect(decimalToCentiemes("3,25")).toBe(325);
    expect(decimalToCentiemes("3,5")).toBe(350);
    expect(decimalToCentiemes("0,07")).toBe(7);
    expect(decimalToCentiemes("7")).toBe(700);
    expect(decimalToCentiemes("0,3")).toBe(30);
    expect(decimalToCentiemes("12,99")).toBe(1299);
    expect(decimalToCentiemes("")).toBe(-1);
    expect(decimalToCentiemes(",")).toBe(-1);
    // au plus 2 decimales prises en compte
    expect(decimalToCentiemes("3,257")).toBe(325);
  });

  it("round-trip fmtDecimal <-> decimalToCentiemes", () => {
    for (const c of [1, 7, 30, 100, 305, 325, 350, 999, 1299, 9999]) {
      expect(decimalToCentiemes(fmtDecimal(c))).toBe(c);
    }
  });
});

describe("decimaux : generateur (buildDecimal sur les sources reelles)", () => {
  it("20 sources DEC (5 competences x 4 niveaux : ecrire/comparer/encadrer + add/sub)", () => {
    expect(DEC_SOURCES.length).toBe(20);
  });

  it("exercice coherent : saisie decimal, op val/add/sub, serveur reproduit la reponse", () => {
    for (const src of DEC_SOURCES) {
      for (const seed of [1, 2, 3, 42, 777, 12345]) {
        const ex = generateExercise(src, seed);
        expect(ex.saisie, `${src.competence} N${src.niveau}`).toBe("decimal");
        expect(["val", "add", "sub"]).toContain(ex.verif.op);
        // Le serveur (computeVerif = miroir de verif_calcul) reproduit la reponse.
        expect(computeVerif(ex.verif).answer, `${src.competence} N${src.niveau}`).toBe(ex.answer);
        expect(ex.answer).toBeGreaterThanOrEqual(0);
        expect(ex.answer).toBeLessThanOrEqual(100000);
        expect(ex.prompt.trim().length).toBeGreaterThan(0);
        expect(ex.correction.trim().length).toBeGreaterThan(0);
        // la reponse est un nombre decimal valide (round-trip stable)
        expect(decimalToCentiemes(fmtDecimal(ex.answer))).toBe(ex.answer);
      }
    }
  });

  it("deterministe : meme graine -> meme reponse", () => {
    for (const src of DEC_SOURCES) {
      const a = generateExercise(src, 2024);
      const b = generateExercise(src, 2024);
      expect(a.answer).toBe(b.answer);
      expect(a.prompt).toBe(b.prompt);
    }
  });

  it("comparer : la reponse est bien l'un des deux nombres proposes", () => {
    const cmp = DEC_SOURCES.filter((s) => s.competence === "MA.DEC.COMPARER");
    for (const src of cmp) {
      for (const seed of [5, 50, 500]) {
        const ex = generateExercise(src, seed);
        // le prompt contient le nombre reponse (formate a la virgule)
        expect(ex.prompt).toContain(fmtDecimal(ex.answer));
      }
    }
  });

  it("encadrer : N1/N2 entre entiers (multiple de 100), N3/N4 au dixieme (multiple de 10)", () => {
    const enc = DEC_SOURCES.filter((s) => s.competence === "MA.DEC.ENCADRER");
    for (const src of enc) {
      for (const seed of [6, 60, 600]) {
        const ex = generateExercise(src, seed);
        if (src.niveau <= 2) {
          expect(ex.answer % 100, `${src.competence} N${src.niveau}`).toBe(0);
        } else {
          // encadrement au dixieme : la reponse est un dixieme (multiple de 10)
          expect(ex.answer % 10, `${src.competence} N${src.niveau}`).toBe(0);
        }
      }
    }
  });
});
