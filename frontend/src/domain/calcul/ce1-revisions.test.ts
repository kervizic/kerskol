// LOT CE1 (incrément 6) - Vérifie le comportement « révisions CE1 pour un élève
// de CE2 » (Iris) et la vue parent (classe CE1 réglable).
//
// Principe de conception : les compétences CE1 sont ouvertes avec classe_min
// ='CE1' MAIS classe_max >= CE2. Pour un enfant de CE2, leur portée [CE1,CE2]
// chevauche sa marge [CE1, CM1] -> elles restent candidates EXACTEMENT comme
// avant (ce sont ses compétences de CE2, ou des rappels CE1). Aucune compétence
// « CE1 seulement » (classe_max < CE2) n'est créée : rien ne vient polluer les
// séances d'un CE2.

import { describe, it, expect } from "vitest";
import { composeSession, type ProgressionDetail } from "./composer";
import { SEED_SOURCES } from "./seedSources";
import { classeDansMarge, classeDisponible, CLASSES_DISPONIBLES } from "../../lib/types";
import type { Competence } from "../../lib/types";

function comp(code: string, classe_min: "CP" | "CE1" | "CE2" | "CM1" | "CM2", classe_max: "CP" | "CE1" | "CE2" | "CM1" | "CM2"): Competence {
  return { code, matiere: "MA", domaine: "numeration", libelle: code, ordre: 1, nb_niveaux: 4, actif: true, classe_min, classe_max };
}

// Compétences CE1 réelles (ouvertes [CE1,CE2]) présentes dans la banque de seed.
const CE1_COMPS: Competence[] = [
  comp("MA.NUM.LIRE_ECRIRE", "CE1", "CE2"),
  comp("MA.CM.SOMMES_DIFF", "CE1", "CE2"),
  comp("MA.TABLES.5", "CE1", "CE2"),
];

const NOW = Date.parse("2026-09-28T10:00:00Z");

function prog(competence: string, over: Partial<ProgressionDetail> = {}): ProgressionDetail {
  return {
    competence,
    niveau: 3,
    niveau_max_atteint: 3,
    placement_termine: true,
    ema_courte: 0.85,
    derniere_reponse: "2026-09-20T00:00:00Z",
    prochaine_revision: null,
    ...over,
  };
}

describe("portée CE1 : invariant de candidature (marge d'un an)", () => {
  it("une compétence [CE1,CE2] est candidate pour un CE2 ET pour un CE1", () => {
    expect(classeDansMarge("CE1", "CE2", "CE2")).toBe(true); // Iris la voit (comme avant)
    expect(classeDansMarge("CE1", "CE2", "CE1")).toBe(true); // un CE1 la voit
  });
  it("une compétence CM2 reste hors de portée d'un CE2 (pas d'avance de 2 ans)", () => {
    expect(classeDansMarge("CM2", "CM2", "CE2")).toBe(false);
  });
  it("une hypothétique compétence CE1-seulement serait candidate pour un CE2 — raison pour laquelle on garde classe_max>=CE2", () => {
    // Si on avait créé une compétence [CE1,CE1], elle serait candidate pour un
    // CE2 (marge -1) et pourrait polluer ses séances. On l'évite par conception.
    expect(classeDansMarge("CE1", "CE1", "CE2")).toBe(true);
  });
});

describe("révisions CE1 pour un élève de CE2 (Iris)", () => {
  it("une compétence CE1 dont la révision est due apparaît EN RÉVISION", () => {
    const progress: ProgressionDetail[] = [
      prog("MA.NUM.LIRE_ECRIRE", { prochaine_revision: "2026-09-01T00:00:00Z" }), // due
      prog("MA.CM.SOMMES_DIFF"), // solide, pas due
      prog("MA.TABLES.5"), // solide, pas due
    ];
    const plan = composeSession({
      competences: CE1_COMPS,
      prerequis: [],
      progress,
      sources: SEED_SOURCES,
      seed: 3,
      now: NOW,
      classe: "CE2",
    });
    const lire = plan.filter((p) => p.exercise.competence === "MA.NUM.LIRE_ECRIRE");
    expect(lire.length).toBeGreaterThan(0);
    expect(lire.every((p) => p.category === "revision")).toBe(true);
  });

  it("ouvrir une compétence au CE1 ne change RIEN pour un CE2 : [CE1,CE2] a la même candidature que [CE2,CE2]", () => {
    // Avant l'ouverture : [CE2,CE2]. Après : [CE1,CE2]. Pour un CE2, les deux
    // donnent la même réponse de candidature -> aucune compétence en plus ni en
    // moins dans ses séances (Iris inchangée).
    const avant = classeDansMarge("CE2", "CE2", "CE2");
    const apres = classeDansMarge("CE1", "CE2", "CE2");
    expect(apres).toBe(avant);
    expect(apres).toBe(true);
  });
});

describe("vue parent : classe CE1 réglable (programme disponible)", () => {
  it("CE1, CE2, CM1 sont des programmes disponibles (pas de « bientôt disponible »)", () => {
    expect(classeDisponible("CE1")).toBe(true);
    expect(classeDisponible("CE2")).toBe(true);
    expect(classeDisponible("CM1")).toBe(true);
    expect(CLASSES_DISPONIBLES).toContain("CE1");
  });
  it("les classes non encore couvertes (CP, CM2) ne sont pas disponibles", () => {
    expect(classeDisponible("CP")).toBe(false);
    expect(classeDisponible("CM2")).toBe(false);
  });
});
