import { describe, it, expect } from "vitest";
import { generateExercise, type ExCalcul, type GeneratedExercise } from "./generator";
import { SEED_SOURCES } from "./seedSources";

// Verifie que la reponse est arithmetiquement coherente avec l'enonce, en
// re-derivant le resultat depuis le texte de l'enonce quand c'est possible.
function checkConsistency(g: GeneratedExercise): void {
  const p = g.prompt;
  const A = g.answer;

  let m: RegExpMatchArray | null;

  // A op B = [q] (resultat : la case est A SA PLACE dans l'egalite)
  if ((m = p.match(/^(\d+) × (\d+) = \[q\]$/))) {
    expect(A).toBe(Number(m[1]) * Number(m[2]));
    return;
  }
  if ((m = p.match(/^(\d+) \+ (\d+) = \[q\]$/))) {
    expect(A).toBe(Number(m[1]) + Number(m[2]));
    return;
  }
  if ((m = p.match(/^(\d+) − (\d+) = \[q\]$/))) {
    expect(A).toBe(Number(m[1]) - Number(m[2]));
    return;
  }
  if ((m = p.match(/^Le double de (\d+) = \[q\]$/))) {
    expect(A).toBe(2 * Number(m[1]));
    return;
  }
  if ((m = p.match(/^La moitie de (\d+) = \[q\]$/))) {
    expect(A).toBe(Number(m[1]) / 2);
    return;
  }
  // Division exacte
  if ((m = p.match(/^(\d+) ÷ (\d+) = \[q\]$/))) {
    expect(A).toBe(Number(m[1]) / Number(m[2]));
    expect(Number.isInteger(A)).toBe(true);
    return;
  }
  // Division avec reste : N ÷ D = [q] reste [r]
  if ((m = p.match(/^(\d+) ÷ (\d+) = \[q\] reste \[r\]$/))) {
    const div = Number(m[2]);
    expect(g.fields).toBe(2);
    expect(g.reste).not.toBeNull();
    expect(A * div + (g.reste as number)).toBe(Number(m[1]));
    expect(g.reste as number).toBeGreaterThanOrEqual(0);
    expect(g.reste as number).toBeLessThan(div);
    return;
  }
  // Terme manquant : X + [q] = Y  /  [q] + X = Y
  if ((m = p.match(/^(\d+) \+ \[q\] = (\d+)$/))) {
    expect(A).toBe(Number(m[2]) - Number(m[1]));
    return;
  }
  if ((m = p.match(/^\[q\] \+ (\d+) = (\d+)$/))) {
    expect(A).toBe(Number(m[2]) - Number(m[1]));
    return;
  }
  // Table : X × [q] = Y  /  [q] × X = Y (commutativite)
  if ((m = p.match(/^(\d+) × \[q\] = (\d+)$/))) {
    expect(A).toBe(Number(m[2]) / Number(m[1]));
    return;
  }
  // Combien de fois (question -> case separee, pas de jeton)
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

function supportLabels(g: GeneratedExercise): string[] {
  const sd = g.supportData;
  if (!sd || sd.kind !== "droite") return [];
  const labels: string[] = [];
  for (const p of sd.points) labels.push(p.label);
  for (const j of sd.jumps) if (j.label) labels.push(j.label);
  return labels;
}

describe("support visuel : ne donne jamais la reponse", () => {
  it("toute etiquette figure deja dans l'enonce, jamais la reponse en bond", () => {
    for (const src of SEED_SOURCES) {
      for (let s = 1; s <= 30; s++) {
        const g = generateExercise(src, s * 131 + src.niveau);
        const promptNums = new Set(g.prompt.match(/\d+/g) ?? []);
        // Chaque etiquette du support est un nombre deja present dans l'enonce.
        for (const label of supportLabels(g)) {
          for (const n of label.match(/\d+/g) ?? []) {
            expect(promptNums.has(n)).toBe(true);
          }
        }
        // La reponse n'est JAMAIS l'etiquette d'un bond (arc).
        if (g.supportData && g.supportData.kind === "droite") {
          for (const j of g.supportData.jumps) {
            if (!j.label) continue;
            const nums = (j.label.match(/\d+/g) ?? []).map(Number);
            expect(nums.includes(g.answer)).toBe(false);
          }
        }
      }
    }
  });
});

describe("egalite : case de reponse a sa place dans l'operation", () => {
  it("resultat : « a + b = [q] »", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.CM.ADDITION" && s.niveau === 1)!;
    for (let s = 1; s <= 10; s++) {
      expect(generateExercise(src, s * 13).prompt).toMatch(/^\d+ \+ \d+ = \[q\]$/);
    }
  });
  it("terme manquant : « t × [q] = p »", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.TABLES.2" && s.niveau === 3)!;
    const prompts = Array.from({ length: 40 }, (_, i) => generateExercise(src, i + 1).prompt);
    expect(prompts.some((p) => /× \[q\] = \d+$/.test(p))).toBe(true);
  });
  it("division avec reste : « n ÷ d = [q] reste [r] »", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.CM.DIV_RESTE" && s.niveau === 2)!;
    const g = generateExercise(src, 7);
    expect(g.prompt).toMatch(/^\d+ ÷ \d+ = \[q\] reste \[r\]$/);
    expect(g.fields).toBe(2);
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
