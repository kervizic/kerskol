import { describe, it, expect } from "vitest";
import { generateExercise, computeVerif, type ExCalcul } from "./generator";
import { templateCount } from "./problemes";
import { SEED_SOURCES } from "./seedSources";

const PB_SOURCES = SEED_SOURCES.filter((s) => s.competence.startsWith("MA.PB."));
const PB_CODES = Array.from(new Set(PB_SOURCES.map((s) => s.competence)));

describe("problemes : banque de gabarits", () => {
  it("au moins 15 gabarits par competence", () => {
    for (const code of PB_CODES) {
      expect(templateCount(code)).toBeGreaterThanOrEqual(15);
    }
  });
});

// INVARIANT DE SECURITE : l'enonce normalise verif (op,a,b [,op2,c]) reproduit
// EXACTEMENT la reponse attendue, sur des milliers de tirages par gabarit, en
// mode normal ET rattrapage, avec et sans contexte (mascotte).
describe("problemes : verif reproduit la reponse (milliers de tirages)", () => {
  for (const src of PB_SOURCES) {
    it(`${src.competence} N${src.niveau} : computeVerif == answer`, () => {
      for (let seed = 1; seed <= 300; seed++) {
        for (const rattrapage of [false, true]) {
          const ctx = seed % 3 === 0 ? { hero: "Iris", univers: "village_breton" } : undefined;
          const g = generateExercise(src, seed * 7919 + src.niveau, { rattrapage, ctx });
          const c = computeVerif(g.verif);
          expect(c.answer).toBe(g.answer);
          // Operandes exploitables par le serveur (entiers, dans des bornes larges).
          expect(Number.isInteger(g.verif.a)).toBe(true);
          expect(Number.isInteger(g.verif.b)).toBe(true);
          expect(g.verif.a).toBeGreaterThanOrEqual(0);
          expect(g.verif.a).toBeLessThanOrEqual(100000);
          expect(g.verif.b).toBeGreaterThanOrEqual(0);
          if (g.verif.op === "sub") expect(g.verif.a).toBeGreaterThanOrEqual(g.verif.b);
          if (g.verif.op === "div") {
            expect(g.verif.b).toBeGreaterThan(0);
            expect(g.verif.a % g.verif.b).toBe(0);
          }
          // Prompt non vide, correction avec un chiffre.
          expect(g.prompt.length).toBeGreaterThan(0);
          expect(/\d/.test(g.correction)).toBe(true);
        }
      }
    });
  }
});

describe("problemes : deux etapes (op2) reserve a DEUX_ETAPES", () => {
  it("DEUX_ETAPES porte toujours op2 + c coherents", () => {
    const srcs = PB_SOURCES.filter((s) => s.competence === "MA.PB.DEUX_ETAPES");
    for (const src of srcs) {
      for (let seed = 1; seed <= 200; seed++) {
        const g = generateExercise(src, seed * 131 + src.niveau);
        expect(g.verif.op2).toBeDefined();
        expect(Number.isInteger(g.verif.c!)).toBe(true);
        expect(g.verif.c!).toBeGreaterThanOrEqual(0);
        // La seconde etape reste positive / exacte.
        const r1 = computeVerif({ op: g.verif.op, a: g.verif.a, b: g.verif.b }).answer;
        if (g.verif.op2 === "sub") expect(r1).toBeGreaterThanOrEqual(g.verif.c!);
        if (g.verif.op2 === "div") expect(r1 % g.verif.c!).toBe(0);
      }
    }
  });
  it("les competences a une etape ne portent jamais op2", () => {
    const srcs = PB_SOURCES.filter((s) => s.competence !== "MA.PB.DEUX_ETAPES");
    for (const src of srcs) {
      for (let seed = 1; seed <= 100; seed++) {
        const g = generateExercise(src, seed * 53 + src.niveau);
        expect(g.verif.op2).toBeUndefined();
      }
    }
  });
});

describe("problemes : monnaie en centimes entiers", () => {
  it("composer : saisie monnaie, verif val, cible composable avec les unites", () => {
    const srcs = PB_SOURCES.filter((s) => s.competence === "MA.PB.MONNAIE");
    for (const src of srcs) {
      for (let seed = 1; seed <= 120; seed++) {
        const g = generateExercise(src, seed * 17 + src.niveau);
        if (g.saisie !== "monnaie") continue;
        expect(g.verif.op).toBe("val");
        expect(g.verif.b).toBe(0);
        expect(g.answer).toBe(g.moneyData!.target);
        expect(Number.isInteger(g.answer)).toBe(true);
        // Cible atteignable avec les unites proposees (multiple du plus petit).
        const smallest = Math.min(...g.moneyData!.units);
        expect(g.answer % smallest).toBe(0);
        expect(g.answer).toBeGreaterThan(0);
      }
    }
  });
  it("comparer : saisie compare, reponse 0/1/2", () => {
    const src = PB_SOURCES.find((s) => s.competence === "MA.PB.MONNAIE" && s.niveau === 2)!;
    let sawCompare = false;
    for (let seed = 1; seed <= 200; seed++) {
      const g = generateExercise(src, seed * 29 + 2);
      if (g.saisie !== "compare") continue;
      sawCompare = true;
      expect(g.verif.op).toBe("cmp");
      expect([0, 1, 2]).toContain(g.answer);
    }
    expect(sawCompare).toBe(true);
  });
});

describe("problemes : schema en barres (aide ne revele jamais la reponse)", () => {
  it("chaque barre a une inconnue rendue « ? », connues jamais marquees inconnues", () => {
    for (const src of PB_SOURCES) {
      for (let seed = 1; seed <= 60; seed++) {
        const g = generateExercise(src, seed * 97 + src.niveau);
        if (!g.barres) continue;
        const cells = [
          ...(g.barres.whole ? [g.barres.whole] : []),
          ...g.barres.parts,
          ...(g.barres.diff ? [g.barres.diff] : []),
        ];
        const unknowns = cells.filter((c) => c.unknown);
        expect(unknowns.length).toBeGreaterThanOrEqual(1);
        // Les cellules inconnues portent « ? » (rendu en AIDE), jamais un nombre.
        for (const c of unknowns) expect(c.label).toBe("?");
        // Les cellules connues portent un nombre (jamais « ? »).
        for (const c of cells.filter((x) => !x.unknown)) expect(c.label).not.toBe("?");
      }
    }
  });
});

describe("problemes : personnalisation (mascotte)", () => {
  it("le surnom de l'enfant peut apparaitre dans l'enonce", () => {
    const src: ExCalcul = PB_SOURCES.find((s) => s.competence === "MA.PB.ADD_SUB" && s.niveau === 1)!;
    let seen = false;
    for (let seed = 1; seed <= 80 && !seen; seed++) {
      const g = generateExercise(src, seed * 13, { ctx: { hero: "Zadig" } });
      if (g.prompt.includes("Zadig")) seen = true;
    }
    expect(seen).toBe(true);
  });
});
