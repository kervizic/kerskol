// LOT CE1 (incrément 12) - Garde-fou sous-niveau pour FRANÇAIS / QLM / EMC.
//
// Constat d'architecture : la SÉLECTION des compétences de toutes les matières
// (y compris FR, QLM/qm, EMC) passe par le MÊME composeSession (composer.ts).
// Le gate « compétence de classe inférieure » (estSousNiveau / sousNiveauCodes)
// est donc partagé : il n'existe aucun chemin de sélection par classe propre à
// FR/QLM/EMC qui le contournerait. Ce test VERROUILLE cette propriété pour les
// trois matières avant d'y ajouter des compétences CE1 dédiées (lots 1-2, 4-5),
// avec la même garantie que pour les maths (ce1-numeration-dediee.test.ts) :
//   * un CE1 reçoit la compétence CE1 dédiée ([CE1,CE1]) ;
//   * un CE2 (Iris) SOLIDE ne la reçoit JAMAIS (anti-pollution) ;
//   * un CE2 en LACUNE sur la compétence CE2 LIÉE la reçoit EN RÉVISION
//     (remédiation via le prérequis CE1 -> CE2) ;
//   * le prérequis CE1 ne VERROUILLE pas la compétence CE2 d'Iris (déblocage).
//
// Les « sources » utilisées ici ont une forme générable (comparaison) : le gate
// décide AVANT la matérialisation et ne dépend pas du contenu réel de la
// matière ; c'est précisément ce qui prouve que le garde-fou est générique.

import { describe, it, expect } from "vitest";
import { composeSession, type ProgressionDetail } from "./composer";
import type { Competence, Prerequis, Classe } from "../../lib/types";
import type { ExCalcul } from "./generator";

function comp(
  code: string,
  matiere: string,
  domaine: string,
  classe_min: Classe,
  classe_max: Classe,
): Competence {
  return { code, matiere, domaine, libelle: code, ordre: 300, nb_niveaux: 4, actif: true, classe_min, classe_max };
}

// Source générable (comparaison de deux nombres) : neutre vis-à-vis de la
// matière, suffisante pour que le plan matérialise la compétence.
function src(competence: string, niveau: number): ExCalcul {
  return {
    exerciceId: `${competence}:${niveau}`,
    competence,
    niveau,
    methode: null,
    operation: "comparer",
    forme: "comparaison",
    params: { type: "comparer", min: 0, max: 99 },
    support: "aucun",
    correctionStrategie: null,
  };
}

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

// Un scénario par matière : CODE_DEDIEE [CE1,CE1], CODE_LIEE [CE1,CE2],
// prérequis CODE_LIEE <- CODE_DEDIEE.
const CAS = [
  { label: "FRANÇAIS", matiere: "FR", domaine: "grammaire", dediee: "FR.GRAM.CE1_ACCORDS", liee: "FR.GRAM.PHRASE" },
  { label: "QLM", matiere: "QM", domaine: "temps", dediee: "QM.TEMPS.CE1_CALENDRIER", liee: "QM.TEMPS.REPERES" },
  { label: "EMC", matiere: "EMC", domaine: "republique", dediee: "EMC.CE1_SYMBOLES", liee: "EMC.REPUBLIQUE" },
];

for (const cas of CAS) {
  describe(`garde-fou sous-niveau partagé : ${cas.label}`, () => {
    const competences: Competence[] = [
      comp(cas.dediee, cas.matiere, cas.domaine, "CE1", "CE1"),
      comp(cas.liee, cas.matiere, cas.domaine, "CE1", "CE2"),
    ];
    const prerequis: Prerequis[] = [
      { competence: cas.liee, prerequis: cas.dediee, niveau_min: 2 },
    ];
    const sources: ExCalcul[] = [
      src(cas.dediee, 1), src(cas.dediee, 2), src(cas.dediee, 3), src(cas.dediee, 4),
      src(cas.liee, 1), src(cas.liee, 3),
    ];

    it("un CE1 reçoit la compétence CE1 dédiée (séance courante, pool débloqué)", () => {
      // La 1re séance est pilotée par le plan de classe (maths) ; FR/QLM/EMC
      // entrent par le pool débloqué des séances suivantes. On fournit donc une
      // progression (séance non initiale). La dédiée [CE1,CE1] n'est PAS
      // sous-niveau pour un CE1 -> candidate normale (nouveauté), sans prérequis.
      const progress = [prog(cas.liee)];
      const plan = composeSession({
        competences, prerequis, progress, sources, seed: 7, now: NOW, classe: "CE1",
      });
      const codes = new Set(plan.map((p) => p.exercise.competence));
      expect(codes.has(cas.dediee)).toBe(true);
    });

    it("un CE2 SOLIDE ne reçoit JAMAIS la compétence CE1 dédiée (Iris inchangée)", () => {
      const progress = [prog(cas.liee)];
      const plan = composeSession({
        competences, prerequis, progress, sources, seed: 11, now: NOW, classe: "CE2",
      });
      const codes = plan.map((p) => p.exercise.competence);
      expect(codes).not.toContain(cas.dediee);
      expect(codes.length).toBeGreaterThan(0); // la séance d'Iris reste composée
    });

    it("un CE2 en LACUNE sur la compétence liée reçoit la CE1 dédiée EN RÉVISION", () => {
      const progress = [prog(cas.liee, { ema_courte: 0.4, niveau: 1 })];
      const plan = composeSession({
        competences, prerequis, progress, sources, seed: 5, now: NOW, classe: "CE2",
      });
      const dediee = plan.filter((p) => p.exercise.competence === cas.dediee);
      expect(dediee.length).toBeGreaterThan(0);
      expect(dediee.every((p) => p.category === "revision")).toBe(true);
    });

    it("le prérequis CE1 ne verrouille pas la compétence CE2 liée d'Iris", () => {
      // Iris solide sur la compétence liée, aucune progression sur la dédiée CE1.
      const progress = [prog(cas.liee)];
      const plan = composeSession({
        competences, prerequis, progress, sources, seed: 3, now: NOW, classe: "CE2",
      });
      const codes = plan.map((p) => p.exercise.competence);
      expect(codes).toContain(cas.liee); // reste débloquée malgré le prérequis CE1
    });
  });
}
