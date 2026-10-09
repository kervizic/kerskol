// LOT CE1 (incrément 9) - Compétence CE1 DÉDIÉE MA.NUM.CE1_MILLE ([CE1,CE1]).
//
// Vérifie le GATE « compétence de classe inférieure » ajouté à composeSession :
//   * un CE1 reçoit bien la compétence dédiée (candidate normale, coeur CE1) ;
//   * un CE2 (Iris) SOLIDE ne la reçoit JAMAIS (écartée du pool normal : elle ne
//     peut plus polluer ses séances comme nouveauté) ;
//   * un CE2 en LACUNE sur la compétence CE2 LIÉE (MA.NUM.COMPARER) la reçoit EN
//     RÉVISION (remédiation via le prérequis CE1 -> CE2) : c'est la marge -1.

import { describe, it, expect } from "vitest";
import { composeSession, type ProgressionDetail } from "./composer";
import type { Competence, Prerequis, Classe } from "../../lib/types";
import type { ExCalcul, Forme, Support } from "./generator";

function comp(
  code: string,
  classe_min: Classe,
  classe_max: Classe,
  domaine = "numeration"
): Competence {
  return { code, matiere: "MA", domaine, libelle: code, ordre: 300, nb_niveaux: 4, actif: true, classe_min, classe_max };
}

function src(
  competence: string,
  niveau: number,
  operation: string,
  forme: Forme,
  params: Record<string, unknown>,
  support: Support = "aucun"
): ExCalcul {
  return {
    exerciceId: `${competence}:${niveau}`,
    competence,
    niveau,
    methode: null,
    operation,
    forme,
    params,
    support,
    correctionStrategie: null,
  };
}

// Banque CE1 dédiée (miroir de la migration 0121) + compétences CE2 partagées.
const SOURCES: ExCalcul[] = [
  src("MA.NUM.CE1_MILLE", 1, "lire", "lecture", { type: "lire", min: 0, max: 100 }),
  src("MA.NUM.CE1_MILLE", 2, "comparer", "comparaison", { type: "comparer", min: 0, max: 999 }),
  src("MA.NUM.CE1_MILLE", 3, "decomposer", "decomposition", { type: "decomposer", ranks: ["c", "d", "u"], min: 100, max: 999 }),
  src("MA.NUM.CE1_MILLE", 4, "comparer", "comparaison", { type: "ranger", n: 3, min: 100, max: 999 }),
  src("MA.NUM.LIRE_ECRIRE", 1, "lire", "lecture", { type: "lire", min: 0, max: 999 }),
  src("MA.NUM.COMPARER", 1, "comparer", "comparaison", { type: "comparer", min: 0, max: 9999 }),
  src("MA.NUM.COMPARER", 3, "comparer", "comparaison", { type: "comparer", min: 0, max: 9999 }),
];

const COMPETENCES: Competence[] = [
  comp("MA.NUM.CE1_MILLE", "CE1", "CE1"),
  comp("MA.NUM.LIRE_ECRIRE", "CE1", "CE2"),
  comp("MA.NUM.COMPARER", "CE1", "CE2"),
];

const PREREQUIS: Prerequis[] = [
  { competence: "MA.NUM.COMPARER", prerequis: "MA.NUM.CE1_MILLE", niveau_min: 2 },
];

const NOW = Date.parse("2026-10-09T10:00:00Z");

function prog(competence: string, over: Partial<ProgressionDetail> = {}): ProgressionDetail {
  return {
    competence,
    niveau: 3,
    niveau_max_atteint: 3,
    placement_termine: true,
    ema_courte: 0.85,
    derniere_reponse: "2026-10-01T00:00:00Z",
    prochaine_revision: null,
    ...over,
  };
}

describe("MA.NUM.CE1_MILLE : compétence CE1 dédiée, bornée au CE1", () => {
  it("un CE1 reçoit la compétence dédiée (1re séance, coeur CE1)", () => {
    const plan = composeSession({
      competences: COMPETENCES,
      prerequis: PREREQUIS,
      progress: [],
      sources: SOURCES,
      seed: 7,
      now: NOW,
      classe: "CE1",
    });
    const codes = new Set(plan.map((p) => p.exercise.competence));
    expect(codes.has("MA.NUM.CE1_MILLE")).toBe(true);
  });

  it("un CE2 SOLIDE ne reçoit JAMAIS la compétence CE1 dédiée (gate anti-pollution)", () => {
    const progress = [
      prog("MA.NUM.COMPARER"), // solide, pas de lacune, pas de révision due
      prog("MA.NUM.LIRE_ECRIRE"),
    ];
    const plan = composeSession({
      competences: COMPETENCES,
      prerequis: PREREQUIS,
      progress,
      sources: SOURCES,
      seed: 11,
      now: NOW,
      classe: "CE2",
    });
    const codes = plan.map((p) => p.exercise.competence);
    expect(codes).not.toContain("MA.NUM.CE1_MILLE");
    // La séance d'Iris reste composée de SES compétences (CE2), inchangée.
    expect(codes.length).toBeGreaterThan(0);
  });

  it("un CE2 en LACUNE sur MA.NUM.COMPARER reçoit la compétence CE1 EN RÉVISION", () => {
    const progress = [
      prog("MA.NUM.COMPARER", { ema_courte: 0.4, niveau: 1 }), // lacune
      prog("MA.NUM.LIRE_ECRIRE"),
    ];
    const plan = composeSession({
      competences: COMPETENCES,
      prerequis: PREREQUIS,
      progress,
      sources: SOURCES,
      seed: 5,
      now: NOW,
      classe: "CE2",
    });
    const dediee = plan.filter((p) => p.exercise.competence === "MA.NUM.CE1_MILLE");
    expect(dediee.length).toBeGreaterThan(0);
    expect(dediee.every((p) => p.category === "revision")).toBe(true);
  });
});
