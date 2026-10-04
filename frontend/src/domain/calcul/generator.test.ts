import { describe, it, expect } from "vitest";
import {
  generateExercise,
  computeVerif,
  enLettres,
  type ExCalcul,
  type GeneratedExercise,
} from "./generator";
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

// INVARIANT DE SECURITE (lot 2) : l'enonce normalise `verif` doit reproduire
// exactement la reponse attendue (et le reste). Le serveur recalcule la reponse
// a partir de `verif` via public.verif_calcul() ; si cet invariant casse, un
// enfant repondant juste serait refuse. On couvre toutes les competences x
// niveaux, en mode normal ET rattrapage, sur de nombreuses graines.
describe("verif : enonce normalise reproduit la reponse serveur", () => {
  for (const src of SEED_SOURCES) {
    it(`${src.competence} N${src.niveau} : computeVerif == answer/reste`, () => {
      for (let seed = 1; seed <= 40; seed++) {
        for (const rattrapage of [false, true]) {
          const g = generateExercise(src, seed * 7919 + src.niveau, { rattrapage });
          const c = computeVerif(g.verif);
          expect(c.answer).toBe(g.answer);
          if (g.fields === 2) {
            expect(c.reste).toBe(g.reste);
          }
          // Operandes normalises exploitables par le serveur (entiers >= 0).
          expect(Number.isInteger(g.verif.a)).toBe(true);
          expect(Number.isInteger(g.verif.b)).toBe(true);
          expect(g.verif.a).toBeGreaterThanOrEqual(0);
          expect(g.verif.b).toBeGreaterThanOrEqual(0);
          if (g.verif.op === "sub") expect(g.verif.a).toBeGreaterThanOrEqual(g.verif.b);
          if (g.verif.op === "div") expect(g.verif.b).toBeGreaterThan(0);
        }
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

describe("enLettres : orthographe francaise", () => {
  it("valeurs de reference", () => {
    const cas: [number, string][] = [
      [0, "zero"],
      [7, "sept"],
      [16, "seize"],
      [21, "vingt-et-un"],
      [71, "soixante-et-onze"],
      [80, "quatre-vingts"],
      [81, "quatre-vingt-un"],
      [91, "quatre-vingt-onze"],
      [100, "cent"],
      [200, "deux cents"],
      [201, "deux cent un"],
      [1000, "mille"],
      [3482, "trois mille quatre cent quatre-vingt-deux"],
      [10000, "dix mille"],
    ];
    for (const [n, mot] of cas) expect(enLettres(n)).toBe(mot);
  });
});

describe("numeration & calcul pose : saisie et verif normalise", () => {
  it("comparer : saisie compare, verif cmp, reponse 0/1/2", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.NUM.COMPARER" && s.niveau === 2)!;
    for (let s = 1; s <= 30; s++) {
      const g = generateExercise(src, s * 31 + 2);
      expect(g.saisie).toBe("compare");
      expect(g.verif.op).toBe("cmp");
      expect([0, 1, 2]).toContain(g.answer);
      expect(computeVerif(g.verif).answer).toBe(g.answer);
    }
  });
  it("addition posee : concatenation des chiffres du resultat = somme des termes", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.POSE.ADDITION" && s.niveau === 4)!;
    for (let s = 1; s <= 30; s++) {
      const g = generateExercise(src, s * 97 + 4);
      expect(g.saisie).toBe("pose");
      expect(g.poseData!.answerDigits).toBe(String(g.answer).length);
      expect(g.poseData!.terms.reduce((a, b) => a + b, 0)).toBe(g.answer);
    }
  });
  it("multiplication posee : un facteur a 1 chiffre", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.POSE.MULTIPLICATION" && s.niveau === 3)!;
    for (let s = 1; s <= 30; s++) {
      const g = generateExercise(src, s * 53 + 3);
      const [a, b] = g.poseData!.terms;
      expect((a >= 2 && a <= 9) || (b >= 2 && b <= 9)).toBe(true);
      expect(a * b).toBe(g.answer);
    }
  });
  it("lecture QCM : une option porte la valeur attendue, options distinctes", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.NUM.LIRE_ECRIRE" && s.niveau === 1)!;
    for (let s = 1; s <= 30; s++) {
      const g = generateExercise(src, s * 17 + 1);
      expect(g.saisie).toBe("qcm");
      expect(g.options!.some((o) => o.value === g.answer)).toBe(true);
      expect(new Set(g.options!.map((o) => o.value)).size).toBe(g.options!.length);
    }
  });
  it("decomposition : saisie chiffres, concatenation des rangs = nombre", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.NUM.DECOMPOSER" && s.niveau === 2)!;
    for (let s = 1; s <= 30; s++) {
      const g = generateExercise(src, s * 41 + 2);
      expect(g.saisie).toBe("chiffres");
      expect(g.chiffresData!.ranks.length).toBe(4);
      expect(g.verif.op).toBe("val");
      expect(g.answer).toBe(g.verif.a);
    }
  });
});

describe("mesures : heure et durees (saisie + verif normalise en minutes)", () => {
  it("heure N1 : QCM, horloge presente, une option = la reponse (minutes depuis minuit)", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.MES.HEURE" && s.niveau === 1)!;
    for (let s = 1; s <= 40; s++) {
      const g = generateExercise(src, s * 23 + 1);
      expect(g.saisie).toBe("qcm");
      expect(g.horlogeData).toBeTruthy();
      expect(g.verif.op).toBe("val");
      expect(g.answer).toBe(g.horlogeData!.showHours * 60 + g.horlogeData!.showMinutes);
      expect(g.options!.some((o) => o.value === g.answer)).toBe(true);
      expect(new Set(g.options!.map((o) => o.value)).size).toBe(g.options!.length);
    }
  });
  it("heure N2/N3 : saisie 'heure', minutes multiples du pas, computeVerif == answer", () => {
    for (const niveau of [2, 3]) {
      const src = SEED_SOURCES.find((s) => s.competence === "MA.MES.HEURE" && s.niveau === niveau)!;
      for (let s = 1; s <= 40; s++) {
        const g = generateExercise(src, s * 29 + niveau);
        expect(g.saisie).toBe("heure");
        expect(g.horlogeData!.showMinutes % g.horlogeData!.minuteStep).toBe(0);
        expect(computeVerif(g.verif).answer).toBe(g.answer);
      }
    }
  });
  it("durees : op dans l'ensemble autorise, duree/arrivee coherentes sur 200 tirages", () => {
    const allowed = new Set(["val", "add", "sub", "mul", "div"]);
    for (const niveau of [1, 2, 3, 4]) {
      const src = SEED_SOURCES.find((s) => s.competence === "MA.MES.DUREES" && s.niveau === niveau)!;
      for (let s = 1; s <= 50; s++) {
        const g = generateExercise(src, s * 37 + niveau);
        expect(allowed.has(g.verif.op)).toBe(true);
        expect(computeVerif(g.verif).answer).toBe(g.answer);
        expect(g.answer).toBeGreaterThanOrEqual(0);
        // Une heure d'arrivee (saisie heure) reste dans la journee (< 24 h).
        if (g.saisie === "heure") expect(g.answer).toBeLessThan(24 * 60);
      }
    }
  });
});

describe("mesures : longueurs, masses et contenances", () => {
  const codesAllowed = new Set(["val", "mul", "div", "cmp"]);
  for (const comp of ["MA.MES.LONGUEURS", "MA.MES.MASSES_CONTENANCES"]) {
    it(`${comp} : op autorisee, computeVerif == answer, compare etiquete`, () => {
      for (const niveau of [1, 2, 3, 4]) {
        const src = SEED_SOURCES.find((s) => s.competence === comp && s.niveau === niveau)!;
        for (let s = 1; s <= 50; s++) {
          const g = generateExercise(src, s * 43 + niveau);
          expect(codesAllowed.has(g.verif.op)).toBe(true);
          expect(computeVerif(g.verif).answer).toBe(g.answer);
          expect(g.answer).toBeGreaterThanOrEqual(0);
          if (g.saisie === "compare") {
            expect([0, 1, 2]).toContain(g.answer);
            expect(g.compareLabels).toBeTruthy();
          }
          if (g.saisie === "qcm") {
            expect(g.options!.some((o) => o.value === g.answer)).toBe(true);
          }
          if (g.regleData) expect(g.answer).toBe(g.regleData.length);
          if (g.balanceData) expect(g.answer).toBe(g.balanceData.value);
        }
      }
    });
  }
});

describe("fractions simples : saisies et verif normalise", () => {
  const allowed = new Set(["val", "cmp", "div"]);
  it("chaque niveau : op autorisee, computeVerif == answer, saisies coherentes", () => {
    for (const niveau of [1, 2, 3, 4]) {
      const src = SEED_SOURCES.find((s) => s.competence === "MA.FRAC.SIMPLES" && s.niveau === niveau)!;
      for (let s = 1; s <= 60; s++) {
        const g = generateExercise(src, s * 47 + niveau);
        expect(allowed.has(g.verif.op)).toBe(true);
        expect(computeVerif(g.verif).answer).toBe(g.answer);
        expect(g.answer).toBeGreaterThanOrEqual(0);
        if (g.saisie === "qcm") {
          expect(niveau).toBe(1); // QCM « nommer » seulement au niveau 1 (amorce)
          expect(g.fractionData).toBeTruthy();
          expect(g.options!.some((o) => o.value === g.answer)).toBe(true);
          expect(g.answer).toBe(g.verif.a); // code = num*100+den
        }
        if (g.saisie === "fraction_num") {
          // Saisie libre num/den (niveau >= 2) : meme contrat que le QCM (code).
          expect(niveau).toBeGreaterThanOrEqual(2);
          expect(g.fractionData).toBeTruthy();
          expect(g.options).toBeUndefined();
          expect(g.verif.op).toBe("val");
          expect(g.answer).toBe(g.verif.a); // code = num*100+den
        }
        if (g.saisie === "fraction") {
          expect(g.fractionData?.interactive).toBe(true);
          expect(g.answer).toBeLessThanOrEqual(g.fractionData!.den);
        }
        if (g.saisie === "compare") {
          expect([0, 1, 2]).toContain(g.answer);
          expect(g.compareLabels).toBeTruthy();
        }
      }
    }
  });
});

describe("regle pedagogique : reponse libre au niveau le plus difficile (N4)", () => {
  it("ranger (NUM.COMPARER N4) : saisie libre au clavier, plus de QCM, verif val", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.NUM.COMPARER" && s.niveau === 4)!;
    for (let s = 1; s <= 40; s++) {
      const g = generateExercise(src, s * 19 + 4);
      expect(g.saisie).toBe("clavier");
      expect(g.options).toBeUndefined();
      expect(g.verif.op).toBe("val");
      expect(computeVerif(g.verif).answer).toBe(g.answer);
    }
  });
  it("heure (MES.HEURE N4, lecture) : saisie directe des chiffres (freeInput)", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.MES.HEURE" && s.niveau === 4)!;
    let sawLire = false;
    for (let s = 1; s <= 60; s++) {
      const g = generateExercise(src, s * 23 + 4);
      if (g.saisie === "heure") {
        sawLire = true;
        expect(g.horlogeData!.freeInput).toBe(true);
      }
    }
    expect(sawLire).toBe(true);
  });
  it("heure (MES.HEURE N1-N3) : steppers conserves (pas de freeInput)", () => {
    for (const niveau of [2, 3]) {
      const src = SEED_SOURCES.find((s) => s.competence === "MA.MES.HEURE" && s.niveau === niveau)!;
      for (let s = 1; s <= 30; s++) {
        const g = generateExercise(src, s * 29 + niveau);
        if (g.saisie === "heure") expect(g.horlogeData!.freeInput).toBeFalsy();
      }
    }
  });
  it("exception : lire un nombre (NUM.LIRE_ECRIRE N4) reste un QCM (lettres)", () => {
    const src = SEED_SOURCES.find((s) => s.competence === "MA.NUM.LIRE_ECRIRE" && s.niveau === 4)!;
    for (let s = 1; s <= 30; s++) {
      const g = generateExercise(src, s * 13 + 4);
      expect(g.saisie).toBe("qcm");
      expect(g.options!.some((o) => o.value === g.answer)).toBe(true);
    }
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
