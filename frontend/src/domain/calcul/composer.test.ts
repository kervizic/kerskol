import { describe, it, expect } from "vitest";
import { composeSession, type ProgressionDetail } from "./composer";
import { SEED_SOURCES } from "./seedSources";
import type { Competence, Prerequis } from "../../lib/types";

const CODES = Array.from(new Set(SEED_SOURCES.map((s) => s.competence)));
const ORDRE: Record<string, number> = {
  "MA.CM.ADDITION": 10,
  "MA.CM.DOUBLES": 20,
  "MA.CM.MOITIES": 30,
  "MA.CM.COMPL_SUP": 40,
  "MA.CM.COMPL_100_1000": 50,
  "MA.CM.SOMMES_DIFF": 60,
  "MA.CM.X10_X100": 70,
  "MA.TABLES.2": 100,
  "MA.TABLES.5": 110,
  "MA.TABLES.3": 120,
  "MA.TABLES.4": 130,
  "MA.TABLES.6": 140,
  "MA.TABLES.9": 150,
  "MA.TABLES.8": 160,
  "MA.TABLES.7": 170,
  "MA.CM.DIV_RESTE": 200,
};
const COMPETENCES: Competence[] = CODES.map((code) => ({
  code,
  matiere: "MA",
  domaine: "calcul_mental",
  libelle: code,
  ordre: ORDRE[code] ?? 999,
  nb_niveaux: 4,
  actif: true,
}));
const PREREQUIS: Prerequis[] = [
  ["MA.CM.DOUBLES", "MA.CM.ADDITION"],
  ["MA.CM.MOITIES", "MA.CM.DOUBLES"],
  ["MA.CM.COMPL_SUP", "MA.CM.ADDITION"],
  ["MA.CM.COMPL_100_1000", "MA.CM.COMPL_SUP"],
  ["MA.CM.SOMMES_DIFF", "MA.CM.ADDITION"],
  ["MA.CM.SOMMES_DIFF", "MA.CM.COMPL_SUP"],
  ["MA.TABLES.2", "MA.CM.DOUBLES"],
  ["MA.TABLES.5", "MA.CM.X10_X100"],
  ["MA.TABLES.5", "MA.CM.MOITIES"],
  ["MA.TABLES.3", "MA.TABLES.2"],
  ["MA.TABLES.4", "MA.TABLES.2"],
  ["MA.TABLES.6", "MA.TABLES.3"],
  ["MA.TABLES.9", "MA.CM.X10_X100"],
  ["MA.TABLES.9", "MA.CM.SOMMES_DIFF"],
  ["MA.TABLES.8", "MA.TABLES.4"],
  ["MA.TABLES.7", "MA.TABLES.2"],
  ["MA.TABLES.7", "MA.TABLES.5"],
  ["MA.CM.DIV_RESTE", "MA.TABLES.2"],
  ["MA.CM.DIV_RESTE", "MA.TABLES.5"],
].map(([competence, prerequis]) => ({ competence, prerequis, niveau_min: 2 }));

function prog(
  competence: string,
  over: Partial<ProgressionDetail> = {}
): ProgressionDetail {
  return {
    competence,
    niveau: 2,
    niveau_max_atteint: 2,
    placement_termine: true,
    ema_courte: 0.75,
    derniere_reponse: "2026-09-01T00:00:00Z",
    prochaine_revision: null,
    ...over,
  };
}

const NOW = Date.parse("2026-09-28T10:00:00Z");

// Detecte les blocs (runs consecutifs d'une meme competence).
function blockSizes(codes: string[]): number[] {
  const sizes: number[] = [];
  let run = 1;
  for (let i = 1; i <= codes.length; i++) {
    if (i < codes.length && codes[i] === codes[i - 1]) run++;
    else {
      sizes.push(run);
      run = 1;
    }
  }
  return sizes;
}

describe("composeSession : 1re seance CE2 (sensible a la classe)", () => {
  const plan = composeSession({
    competences: COMPETENCES,
    prerequis: PREREQUIS,
    progress: [],
    sources: SEED_SOURCES,
    seed: 42,
    now: NOW,
    classe: "CE2",
  });

  it("au plus 2 exercices de revision faciles en amorce", () => {
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.length).toBeLessThanOrEqual(12);
    const revision = plan.filter((p) => p.category === "revision");
    expect(revision.length).toBeLessThanOrEqual(2);
    // Les revisions demarrent a un niveau eleve (>= 2), pas au niveau 1.
    for (const p of revision) expect(p.exercise.niveau).toBeGreaterThanOrEqual(2);
  });

  it("propose des competences coeur de CE2 des la 1re seance", () => {
    const codes = new Set(plan.map((p) => p.exercise.competence));
    const coeurCE2 = [
      "MA.TABLES.2",
      "MA.TABLES.5",
      "MA.CM.COMPL_100_1000",
      "MA.CM.SOMMES_DIFF",
    ];
    expect(coeurCE2.some((c) => codes.has(c))).toBe(true);
  });

  it("la majorite des exercices ne sont PAS de la revision (impression « a son niveau »)", () => {
    const revision = plan.filter((p) => p.category === "revision").length;
    expect(revision).toBeLessThan(plan.length - revision);
  });
});

describe("composeSession : competences debloquees uniquement", () => {
  const progress = [
    prog("MA.CM.ADDITION", { niveau: 3, niveau_max_atteint: 3 }),
    prog("MA.CM.X10_X100", { niveau: 2, niveau_max_atteint: 2 }),
    prog("MA.CM.DOUBLES", { niveau: 2, niveau_max_atteint: 2 }),
  ];

  it("n'inclut jamais une competence verrouillee", () => {
    const plan = composeSession({
      competences: COMPETENCES,
      prerequis: PREREQUIS,
      progress,
      sources: SEED_SOURCES,
      seed: 7,
      now: NOW,
    });
    const codes = new Set(plan.map((p) => p.exercise.competence));
    // MOITIES exige DOUBLES>=2 (ok), mais TABLES.7 exige TABLES.5 (absent) -> exclu.
    expect(codes.has("MA.TABLES.7")).toBe(false);
    expect(codes.has("MA.CM.DIV_RESTE")).toBe(false);
  });

  it("entrelace par blocs de 2 a 3", () => {
    const plan = composeSession({
      competences: COMPETENCES,
      prerequis: PREREQUIS,
      progress,
      sources: SEED_SOURCES,
      seed: 99,
      now: NOW,
    });
    for (const size of blockSizes(plan.map((p) => p.exercise.competence))) {
      expect(size).toBeGreaterThanOrEqual(2);
      expect(size).toBeLessThanOrEqual(3);
    }
  });

  it("~12 exercices et debut plus facile que la fin en moyenne", () => {
    const plan = composeSession({
      competences: COMPETENCES,
      prerequis: PREREQUIS,
      progress: [
        prog("MA.CM.ADDITION", { niveau: 1, niveau_max_atteint: 3, ema_courte: 0.4 }),
        prog("MA.CM.X10_X100", { niveau: 3, niveau_max_atteint: 3, prochaine_revision: "2026-09-01T00:00:00Z" }),
        prog("MA.CM.DOUBLES", { niveau: 2, niveau_max_atteint: 2 }),
        prog("MA.CM.SOMMES_DIFF", { niveau: 3, niveau_max_atteint: 3, ema_courte: 0.5 }),
      ],
      sources: SEED_SOURCES,
      seed: 5,
      now: NOW,
    });
    expect(plan.length).toBeGreaterThanOrEqual(8);
    expect(plan.length).toBeLessThanOrEqual(12);
    expect(plan[0].exercise.niveau).toBeLessThanOrEqual(plan[plan.length - 1].exercise.niveau + 1);
  });

  it("revisions dues prises en compte (prochaine_revision <= now)", () => {
    const plan = composeSession({
      competences: COMPETENCES,
      prerequis: PREREQUIS,
      progress: [
        prog("MA.CM.ADDITION", { niveau: 3, niveau_max_atteint: 3, ema_courte: 0.9, prochaine_revision: "2026-09-20T00:00:00Z" }),
        prog("MA.CM.X10_X100", { niveau: 2, niveau_max_atteint: 2, ema_courte: 0.9, prochaine_revision: "2026-09-20T00:00:00Z" }),
      ],
      sources: SEED_SOURCES,
      seed: 11,
      now: NOW,
    });
    const codes = new Set(plan.map((p) => p.exercise.competence));
    expect(codes.has("MA.CM.ADDITION") || codes.has("MA.CM.X10_X100")).toBe(true);
  });
});
