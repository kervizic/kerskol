import { describe, it, expect } from "vitest";
import { composeSession, type ProgressionDetail } from "./composer";
import { exerciceSignature } from "./generator";
import { classPlan } from "./classes";
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

describe("composeSession : 1re seance CE1 (plan de classe CE1)", () => {
  const plan = composeSession({
    competences: COMPETENCES,
    prerequis: PREREQUIS,
    progress: [],
    sources: SEED_SOURCES,
    seed: 7,
    now: NOW,
    classe: "CE1",
  });
  const coeurCE1 = new Set(Object.keys(classPlan("CE1").coeur));

  it("produit une seance non vide, pilotee par le plan CE1", () => {
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.length).toBeLessThanOrEqual(12);
  });

  it("ne tire QUE des competences du coeur CE1 (aucune notion hors CE1)", () => {
    for (const p of plan) expect(coeurCE1.has(p.exercise.competence)).toBe(true);
    // Notions non-CE1 jamais proposees en 1re seance CE1.
    const codes = new Set(plan.map((p) => p.exercise.competence));
    expect(codes.has("MA.POSE.MULTIPLICATION")).toBe(false);
    expect(codes.has("MA.TABLES.7")).toBe(false);
    expect(codes.has("MA.CM.DIV_RESTE")).toBe(false);
  });

  it("demarre au niveau 1 (debut du cycle, placement en escalier ensuite)", () => {
    for (const p of plan) expect(p.exercise.niveau).toBe(1);
  });

  it("chaque competence du coeur CE1 existe dans la banque d'exercices", () => {
    const sourceCodes = new Set(SEED_SOURCES.map((s) => s.competence));
    for (const code of coeurCE1) expect(sourceCodes.has(code)).toBe(true);
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

  it("entrelace par blocs de 2 a 3 (1 si la variete est epuisee)", () => {
    const plan = composeSession({
      competences: COMPETENCES,
      prerequis: PREREQUIS,
      progress,
      sources: SEED_SOURCES,
      seed: 99,
      now: NOW,
    });
    // Blocs de 2-3 items. Exception : une competence qui ne peut produire qu'UN
    // seul enonce distinct (banque minuscule, p. ex. une source demo a variante
    // unique) est reduite a 1 item par la deduplication anti-doublon (mieux vaut
    // 1 item qu'une meme question repetee). Jamais plus de 3.
    for (const size of blockSizes(plan.map((p) => p.exercise.competence))) {
      expect(size).toBeGreaterThanOrEqual(1);
      expect(size).toBeLessThanOrEqual(3);
    }
    // Aucune question repetee dans la seance (invariant principal du correctif).
    const sigs = plan.map((p) => exerciceSignature(p.exercise));
    expect(new Set(sigs).size).toBe(sigs.length);
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

// ---------------------------------------------------------------------------
// Compositeur MULTI-MATIERES (maths + francais) : choix par BESOIN sur
// l'ensemble des competences actives, sans quota ni tirage de matiere, avec un
// garde-fou de variete (cf. docs/pedagogie.md).
// ---------------------------------------------------------------------------
const FR_CODES = ["FR.CONJ.PRESENT", "FR.CONJ.FUTUR", "FR.CONJ.IMPARFAIT", "FR.ORTHO.DETECTIVE"];
const COMPETENCES_FR: Competence[] = FR_CODES.map((code, i) => ({
  code,
  matiere: "FR",
  domaine: code.startsWith("FR.ORTHO") ? "orthographe" : "conjugaison",
  libelle: code,
  ordre: 500 + i,
  nb_niveaux: 4,
  actif: true,
}));
const SOURCES_FR: typeof SEED_SOURCES = FR_CODES.map((code): (typeof SEED_SOURCES)[number] => ({
  exerciceId: `fr-${code}`,
  competence: code,
  niveau: 2,
  methode: null,
  operation: code.startsWith("FR.ORTHO") ? "dictee" : "conj",
  forme: code.startsWith("FR.ORTHO") ? "dictee" : "conjugaison",
  params: {},
  support: null,
  correctionStrategie: null,
}));

// Progression « tout solide » pour TOUTES les competences de maths (neutralise
// les deblocages de classe : rien n'est en besoin cote maths par defaut).
function maSolide(): ProgressionDetail[] {
  return COMPETENCES.map((c) => prog(c.code, { ema_courte: 0.9, niveau: 2, niveau_max_atteint: 2 }));
}

describe("composeSession : maths + francais (besoin, pas de quota)", () => {
  it("francais seul en besoin, maths tout solide -> le besoin francais DOMINE (pas de quota maths)", () => {
    // Quand seul le francais a des besoins, les maths (toutes solides) ne
    // peuvent apparaitre qu'en REMPLISSAGE (revision de consolidation), jamais
    // imposees par un quota : le francais doit rester largement majoritaire.
    for (let seed = 0; seed < 20; seed++) {
      const progress = [
        ...maSolide(),
        ...FR_CODES.map((c) => prog(c, { ema_courte: 0.5, niveau: 2, niveau_max_atteint: 2 })),
      ];
      const plan = composeSession({
        competences: [...COMPETENCES, ...COMPETENCES_FR],
        prerequis: PREREQUIS, // aucun prerequis FR -> FR debloque
        progress,
        sources: [...SEED_SOURCES, ...SOURCES_FR],
        seed,
        now: NOW,
        classe: "CE2",
        matieres: ["MA", "FR"],
      });
      const codes = plan.map((p) => p.exercise.competence);
      const frCount = codes.filter((c) => c.startsWith("FR.")).length;
      const maCount = codes.filter((c) => c.startsWith("MA.")).length;
      expect(codes.length).toBeGreaterThan(0);
      expect(frCount, `seed ${seed} : le francais devrait dominer`).toBeGreaterThan(maCount);
      // Toute competence de maths presente est SOLIDE (remplissage), pas un besoin.
      const maSolides = new Set(COMPETENCES.map((c) => c.code));
      expect(codes.filter((c) => c.startsWith("MA.")).every((c) => maSolides.has(c))).toBe(true);
    }
  });

  it("garde-fou de variete : les deux matieres ont un besoin -> jamais 100% d'une seule", () => {
    // Maths : une seule lacune (ADDITION) ; francais : plusieurs lacunes.
    for (let seed = 0; seed < 40; seed++) {
      const progress = [
        ...maSolide().map((p) =>
          p.competence === "MA.CM.ADDITION" ? { ...p, ema_courte: 0.5 } : p
        ),
        ...FR_CODES.map((c) => prog(c, { ema_courte: 0.5, niveau: 2, niveau_max_atteint: 2 })),
      ];
      const plan = composeSession({
        competences: [...COMPETENCES, ...COMPETENCES_FR],
        prerequis: PREREQUIS,
        progress,
        sources: [...SEED_SOURCES, ...SOURCES_FR],
        seed,
        now: NOW,
        count: 4,
        classe: "CE2",
        matieres: ["MA", "FR"],
      });
      const codes = plan.map((p) => p.exercise.competence);
      const hasMA = codes.some((c) => c.startsWith("MA."));
      const hasFR = codes.some((c) => c.startsWith("FR."));
      expect(hasMA, `seed ${seed} : maths absent malgre un besoin`).toBe(true);
      expect(hasFR, `seed ${seed} : francais absent malgre un besoin`).toBe(true);
    }
  });
});

describe("composeSession : filtre par sous-matieres (domaines)", () => {
  it("ne garde que les competences dont le domaine est actif", () => {
    // Les COMPETENCES de test sont toutes du domaine 'calcul_mental'.
    const plan = composeSession({
      competences: COMPETENCES, prerequis: PREREQUIS, progress: [],
      sources: SEED_SOURCES, seed: 7, now: NOW, classe: "CE2",
      matieres: ["MA"], domaines: ["calcul_mental", "tables_multiplication"],
    });
    expect(plan.length).toBeGreaterThan(0);
    for (const p of plan) {
      const c = COMPETENCES.find((x) => x.code === p.exercise.competence)!;
      expect(["calcul_mental", "tables_multiplication"]).toContain(c.domaine);
    }
  });

  it("une sous-matiere desactivee exclut toutes ses competences", () => {
    const plan = composeSession({
      competences: COMPETENCES, prerequis: PREREQUIS, progress: [],
      sources: SEED_SOURCES, seed: 7, now: NOW, classe: "CE2",
      matieres: ["MA"], domaines: ["fractions"], // aucun exercice de ce domaine
    });
    expect(plan.length).toBe(0);
  });
});

// ==========================================================================
// LOT 1 : socle multi-classes (portee par classe, marge d'un an).
// ==========================================================================
import { classeDansMarge, classeDansPortee } from "../../lib/types";

describe("classeDansMarge : candidature competence a +/- 1 an", () => {
  it("sans portee declaree -> toujours candidate (demo / ancien referentiel)", () => {
    expect(classeDansMarge(undefined, undefined, "CE2")).toBe(true);
  });
  it("CE2 : revision CE1 et avance CM1 candidates, CM2 et CP exclus", () => {
    expect(classeDansMarge("CE1", "CE1", "CE2")).toBe(true); // revision
    expect(classeDansMarge("CE2", "CE2", "CE2")).toBe(true); // coeur
    expect(classeDansMarge("CM1", "CM1", "CE2")).toBe(true); // avance
    expect(classeDansMarge("CM2", "CM2", "CE2")).toBe(false);
    expect(classeDansMarge("CP", "CP", "CE2")).toBe(false);
  });
  it("CM1 : CE2 (revision), CM1 (coeur), CM2 (avance) candidates ; CE1 exclu", () => {
    expect(classeDansMarge("CE2", "CE2", "CM1")).toBe(true);
    expect(classeDansMarge("CM1", "CM1", "CM1")).toBe(true);
    expect(classeDansMarge("CM2", "CM2", "CM1")).toBe(true);
    expect(classeDansMarge("CE1", "CE1", "CM1")).toBe(false);
  });
});

describe("classeDansPortee : visibilite stricte d'une sous-matiere", () => {
  it("une sous-matiere CM1 est masquee pour un CE2 mais visible pour un CM1", () => {
    expect(classeDansPortee("CM1", "CM2", "CE2")).toBe(false);
    expect(classeDansPortee("CM1", "CM2", "CM1")).toBe(true);
  });
  it("sans portee -> visible partout", () => {
    expect(classeDansPortee(undefined, undefined, "CE2")).toBe(true);
    expect(classeDansPortee(undefined, undefined, "CM1")).toBe(true);
  });
});

describe("composeSession : filtre de candidature par classe", () => {
  // Une seule competence, forcee hors de portee CE2 (CM2 only) mais a portee CM1.
  const uneCM2: Competence[] = [{
    code: "MA.CM.ADDITION", matiere: "MA", domaine: "calcul_mental",
    libelle: "add", ordre: 10, nb_niveaux: 4, actif: true,
    classe_min: "CM2", classe_max: "CM2",
  }];
  it("un CE2 ne recoit pas une competence CM2 (hors marge)", () => {
    const plan = composeSession({
      competences: uneCM2, prerequis: [], progress: [],
      sources: SEED_SOURCES, seed: 1, now: NOW, classe: "CE2",
    });
    expect(plan.length).toBe(0);
  });
  it("un CM1 recoit cette meme competence CM2 (avance, dans la marge)", () => {
    // Seance NON-premiere (progression existante) pour exercer le filtre de
    // candidature par classe, independamment du plan de 1re seance.
    const plan = composeSession({
      competences: uneCM2, prerequis: [], progress: [prog("MA.CM.ADDITION")],
      sources: SEED_SOURCES, seed: 1, now: NOW, classe: "CM1",
    });
    expect(plan.length).toBeGreaterThan(0);
  });
  it("Iris en CE2 : les competences CE2 (portee par defaut) restent candidates", () => {
    const ce2: Competence[] = CODES.map((code) => ({
      code, matiere: "MA", domaine: "calcul_mental", libelle: code,
      ordre: ORDRE[code] ?? 999, nb_niveaux: 4, actif: true,
      classe_min: "CE2" as const, classe_max: "CE2" as const,
    }));
    const plan = composeSession({
      competences: ce2, prerequis: PREREQUIS, progress: [],
      sources: SEED_SOURCES, seed: 42, now: NOW, classe: "CE2",
    });
    expect(plan.length).toBeGreaterThan(0);
  });
});

describe("composeSession : 1re seance CM1 (lot 2 - grands nombres)", () => {
  const COMP_CM1: Competence[] = [
    { code: "MA.NUM.GRANDS", matiere: "MA", domaine: "numeration", libelle: "grands", ordre: 340, nb_niveaux: 4, actif: true, classe_min: "CM1", classe_max: "CM2" },
    { code: "MA.NUM.COMPARER", matiere: "MA", domaine: "numeration", libelle: "comparer", ordre: 320, nb_niveaux: 4, actif: true, classe_min: "CE2", classe_max: "CE2" },
    { code: "MA.TABLES.5", matiere: "MA", domaine: "tables_multiplication", libelle: "t5", ordre: 110, nb_niveaux: 4, actif: true, classe_min: "CE2", classe_max: "CE2" },
  ];
  it("un CM1 recoit les grands nombres (coeur) des la 1re seance", () => {
    const plan = composeSession({
      competences: COMP_CM1, prerequis: [], progress: [],
      sources: SEED_SOURCES, seed: 5, now: NOW, classe: "CM1",
    });
    const codes = new Set(plan.map((p) => p.exercise.competence));
    expect(codes.has("MA.NUM.GRANDS")).toBe(true);
  });
  it("un CE2 ne recoit PAS les grands nombres en 1re seance (pas dans le plan CE2)", () => {
    // Le CM1 (classe_min) reste dans la marge d'un CE2, mais le plan de 1re
    // seance du CE2 ne contient pas MA.NUM.GRANDS -> absent tant qu'il n'y a
    // aucune progression. (Il pourra apparaitre « en avance » plus tard.)
    const plan = composeSession({
      competences: COMP_CM1, prerequis: [], progress: [],
      sources: SEED_SOURCES, seed: 5, now: NOW, classe: "CE2",
    });
    const codes = new Set(plan.map((p) => p.exercise.competence));
    expect(codes.has("MA.NUM.GRANDS")).toBe(false);
  });
});
