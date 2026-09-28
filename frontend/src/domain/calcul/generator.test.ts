import { describe, it, expect } from "vitest";
import { generateExercise, type ExCalcul, type GeneratedExercise } from "./generator";
import { SEED_SOURCES } from "./seedSources";

// Verifie que la reponse est arithmetiquement coherente avec l'enonce, en
// re-derivant le resultat depuis le texte de l'enonce quand c'est possible.
function checkConsistency(g: GeneratedExercise): void {
  const p = g.prompt;
  const A = g.answer;

  let m: RegExpMatchArray | null;

  // A op B (resultat)
  if ((m = p.match(/^(\d+) × (\d+)$/))) {
    expect(A).toBe(Number(m[1]) * Number(m[2]));
    return;
  }
  if ((m = p.match(/^(\d+) \+ (\d+)$/))) {
    expect(A).toBe(Number(m[1]) + Number(m[2]));
    return;
  }
  if ((m = p.match(/^(\d+) − (\d+)$/))) {
    expect(A).toBe(Number(m[1]) - Number(m[2]));
    return;
  }
  if ((m = p.match(/^Le double de (\d+)$/))) {
    expect(A).toBe(2 * Number(m[1]));
    return;
  }
  if ((m = p.match(/^La moitie de (\d+)$/))) {
    expect(A).toBe(Number(m[1]) / 2);
    return;
  }
  // Division exacte
  if ((m = p.match(/^(\d+) ÷ (\d+)$/))) {
    expect(A).toBe(Number(m[1]) / Number(m[2]));
    expect(Number.isInteger(A)).toBe(true);
    return;
  }
  // Division avec reste
  if ((m = p.match(/^(\d+) ÷ (\d+) = … reste …$/))) {
    const div = Number(m[2]);
    expect(g.fields).toBe(2);
    expect(g.reste).not.toBeNull();
    expect(A * div + (g.reste as number)).toBe(Number(m[1]));
    expect(g.reste as number).toBeGreaterThanOrEqual(0);
    expect(g.reste as number).toBeLessThan(div);
    return;
  }
  // Terme manquant : X + … = Y  /  … + X = Y
  if ((m = p.match(/^(\d+) \+ … = (\d+)$/))) {
    expect(A).toBe(Number(m[2]) - Number(m[1]));
    return;
  }
  if ((m = p.match(/^… \+ (\d+) = (\d+)$/))) {
    expect(A).toBe(Number(m[2]) - Number(m[1]));
    return;
  }
  // Table : X × … = Y  /  … × X = Y (commutativite)
  if ((m = p.match(/^(\d+) × … = (\d+)$/))) {
    expect(A).toBe(Number(m[2]) / Number(m[1]));
    return;
  }
  // Combien de fois
  if ((m = p.match(/^Combien de fois (\d+) dans (\d+) \?$/))) {
    expect(A).toBe(Number(m[2]) / Number(m[1]));
    return;
  }
  // Autres formes (ordre de grandeur, complement "vers", contexte) : on
  // verifie au moins un resultat entier positif.
  expect(Number.isFinite(A)).toBe(true);
  expect(A).toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(A)).toBe(true);
}

describe("generateExercise : chaque competence x niveau", () => {
  for (const src of SEED_SOURCES) {
    it(`${src.competence} N${src.niveau} : exercice juste + correction (20 graines)`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const g = generateExercise(src, seed * 7919 + src.niveau);
        expect(g.prompt.length).toBeGreaterThan(0);
        expect(g.correction.trim().length).toBeGreaterThan(0);
        // La correction cite un chiffre (elle explique un calcul).
        expect(/\d/.test(g.correction)).toBe(true);
        checkConsistency(g);
      }
    });
  }
});

describe("generateExercise : reproductibilite", () => {
  it("meme graine -> meme exercice", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.TABLES.7" && s.niveau === 2)!;
    const a = generateExercise(src, 12345);
    const b = generateExercise(src, 12345);
    expect(a).toEqual(b);
  });
  it("graines differentes -> variete", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.CM.ADDITION" && s.niveau === 1)!;
    const prompts = new Set<string>();
    for (let s = 0; s < 30; s++) prompts.add(generateExercise(src, s + 1).prompt);
    expect(prompts.size).toBeGreaterThan(3);
  });
});

describe("generateExercise : support visuel au niveau 1 seulement", () => {
  it("niveau 1 avec support rectangle -> supportData present", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.TABLES.2" && s.niveau === 1)!;
    const g = generateExercise(src, 42);
    expect(g.support).toBe("rectangle");
    expect(g.supportData?.kind).toBe("rectangle");
  });
  it("niveau > 1 -> pas de support", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.TABLES.2" && s.niveau === 2)!;
    const g = generateExercise(src, 42);
    expect(g.support).toBe("aucun");
    expect(g.supportData).toBeUndefined();
  });
});

describe("correction : strategies des tables", () => {
  it("table 7 -> 5 fois + 2 fois", () => {
    const src: ExCalcul = {
      ...SEED_SOURCES.find((s) => s.competence === "MA.TABLES.7" && s.niveau === 2)!,
    };
    const found = Array.from({ length: 40 }, (_, i) => generateExercise(src, i + 1)).some(
      (g) => /5 fois/.test(g.correction) && /2 fois/.test(g.correction)
    );
    expect(found).toBe(true);
  });
  it("table 9 -> 10 fois moins une fois", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.TABLES.9" && s.niveau === 2)!;
    const g = generateExercise(src, 3);
    expect(/10 fois/.test(g.correction)).toBe(true);
  });
});
