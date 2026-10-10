// Lot B - Rééquilibrage de la composition des séances.
//
// Profil type « Iris » : maths déjà travaillés (lacunes + acquis), français et
// QLM jamais faits (niveau 0). On vérifie que :
//   * les maths ne dépassent pas ~40 % des exercices (quand d'autres matières
//     actives ont des candidats) ;
//   * chaque matière active ayant un candidat est présente ;
//   * les compétences jamais travaillées (niveau 0) sont découvertes vite, au N1 ;
//   * lacunes favorisées SANS être exclusives (découvertes + consolidation aussi) ;
//   * variété : pas plus de 2 exercices du même type (compétence) d'affilée, ni
//     plus de 2 de ce type dans la séance.
import { describe, it, expect } from "vitest";
import { composeSession, type ProgressionDetail } from "./composer";
import type { Classe, Competence, Prerequis } from "../../lib/types";
import type { ExCalcul } from "./generator";

const NOW = Date.parse("2026-10-10T10:00:00Z");

function comp(code: string, matiere: string, domaine: string): Competence {
  return {
    code, matiere, domaine, libelle: code, ordre: 300, nb_niveaux: 4, actif: true,
    classe_min: "CE2" as Classe, classe_max: "CE2" as Classe,
  };
}
function src(competence: string, niveau: number): ExCalcul {
  return {
    exerciceId: `${competence}:${niveau}`, competence, niveau, methode: null,
    operation: "comparer", forme: "comparaison",
    params: { type: "comparer", min: 0, max: 99 }, support: "aucun",
    correctionStrategie: null,
  };
}
function prog(competence: string, over: Partial<ProgressionDetail> = {}): ProgressionDetail {
  return {
    competence, niveau: 2, niveau_max_atteint: 2, placement_termine: true,
    ema_courte: 0.9, derniere_reponse: "2026-10-01T00:00:00Z", prochaine_revision: null,
    ...over,
  };
}

// 8 compétences de maths (déjà travaillées), 3 de français + 2 de QLM (jamais
// faites : aucune progression -> découverte au niveau 1).
const MA = Array.from({ length: 8 }, (_, i) => `MA.CAL.C${i + 1}`);
const FR = ["FR.CONJ.PRESENT", "FR.CONJ.FUTUR", "FR.ORTHO.DETECTIVE"];
const QM = ["QM.TEMPS.REPERES", "QM.ESPACE.PLAN"];

const COMPETENCES: Competence[] = [
  ...MA.map((c) => comp(c, "MA", "calcul_mental")),
  ...FR.map((c) => comp(c, "FR", c.startsWith("FR.ORTHO") ? "orthographe" : "conjugaison")),
  ...QM.map((c) => comp(c, "QM", c.includes("TEMPS") ? "temps" : "espace")),
];
const SOURCES: ExCalcul[] = [
  ...MA.flatMap((c) => [src(c, 1), src(c, 2), src(c, 3)]),
  ...FR.flatMap((c) => [src(c, 1), src(c, 2)]),
  ...QM.flatMap((c) => [src(c, 1), src(c, 2)]),
];
const PREREQUIS: Prerequis[] = [];

// Maths : moitié en lacune (EMA basse), moitié acquis. FR/QM : pas de progression.
const PROGRESS: ProgressionDetail[] = MA.map((c, i) =>
  i % 2 === 0 ? prog(c, { ema_courte: 0.4, niveau: 1 }) : prog(c, { ema_courte: 0.9, niveau: 2 })
);

function compose(seed: number) {
  return composeSession({
    competences: COMPETENCES, prerequis: PREREQUIS, progress: PROGRESS, sources: SOURCES,
    seed, now: NOW, classe: "CE2", matieres: ["MA", "FR", "QM"],
  });
}

function matiere(code: string) {
  return code.split(".")[0];
}

describe("Lot B - composition équilibrée (profil type Iris)", () => {
  it("les maths ne dépassent pas ~40 % des exercices", () => {
    for (let seed = 0; seed < 25; seed++) {
      const plan = compose(seed);
      const codes = plan.map((p) => p.exercise.competence);
      const maCount = codes.filter((c) => matiere(c) === "MA").length;
      expect(maCount, `seed ${seed} : trop de maths (${maCount}/${codes.length})`)
        .toBeLessThanOrEqual(Math.ceil(codes.length * 0.4));
    }
  });

  it("chaque matière active (maths, français, QLM) est présente", () => {
    for (let seed = 0; seed < 25; seed++) {
      const mats = new Set(compose(seed).map((p) => matiere(p.exercise.competence)));
      expect(mats.has("MA"), `seed ${seed} : maths absent`).toBe(true);
      expect(mats.has("FR"), `seed ${seed} : français absent`).toBe(true);
      expect(mats.has("QM"), `seed ${seed} : QLM absent`).toBe(true);
    }
  });

  it("les compétences jamais travaillées sont découvertes au niveau 1 (nouveauté)", () => {
    for (let seed = 0; seed < 25; seed++) {
      for (const p of compose(seed)) {
        const m = matiere(p.exercise.competence);
        if (m === "FR" || m === "QM") {
          expect(p.exercise.niveau, `${p.exercise.competence} doit démarrer au N1`).toBe(1);
          expect(p.category, `${p.exercise.competence} doit être une nouveauté`).toBe("nouveaute");
        }
      }
    }
  });

  it("lacunes favorisées mais PAS exclusives (découvertes aussi présentes)", () => {
    // Les lacunes ne doivent jamais occuper TOUTE la séance : les découvertes
    // (français / QLM jamais faits) coexistent à chaque séance. (La consolidation
    // de maths acquis est ici plafonnée par la règle « maths <= 40 % » : les
    // créneaux libérés vont aux découvertes, ce qui est l'objectif.)
    for (let seed = 0; seed < 25; seed++) {
      const cats = compose(seed).map((p) => p.category);
      expect(cats.includes("lacune"), `seed ${seed} : aucune lacune`).toBe(true);
      expect(cats.includes("nouveaute"), `seed ${seed} : aucune découverte`).toBe(true);
      const lacunes = cats.filter((c) => c === "lacune").length;
      expect(lacunes, `seed ${seed} : lacunes exclusives`).toBeLessThan(cats.length);
    }
  });

  it("variété : jamais plus de 2 du même type d'affilée, ni plus de 2 par séance", () => {
    for (let seed = 0; seed < 25; seed++) {
      const codes = compose(seed).map((p) => p.exercise.competence);
      // Total par compétence <= 2.
      const total: Record<string, number> = {};
      for (const c of codes) total[c] = (total[c] ?? 0) + 1;
      for (const [c, n] of Object.entries(total)) {
        expect(n, `seed ${seed} : ${c} apparaît ${n} fois (max 2)`).toBeLessThanOrEqual(2);
      }
      // Jamais 3 identiques d'affilée.
      for (let i = 2; i < codes.length; i++) {
        expect(
          codes[i] === codes[i - 1] && codes[i - 1] === codes[i - 2],
          `seed ${seed} : 3 fois ${codes[i]} d'affilée`
        ).toBe(false);
      }
    }
  });
});

// Simulation au plus pres du profil REEL d'Iris (lecture seule en base le
// 10/10/2026) : 7 matieres actives, 18 competences de maths deja travaillees
// (niveau moyen ~2,9), le reste jamais fait. On verifie que, sur plusieurs
// seances, les maths restent minoritaires et que TOUTES les matieres finissent
// par etre servies (rotation equitable), malgre 7 matieres pour 6 blocs.
describe("Lot B - simulation profil réel Iris (7 matières)", () => {
  const MATS = ["MA", "FR", "QM", "EMC", "ST", "HIST", "GEO"];
  const compsIris: Competence[] = [];
  const srcIris: ExCalcul[] = [];
  const progIris: ProgressionDetail[] = [];
  for (const m of MATS) {
    const n = m === "MA" ? 18 : 4; // maths : 18 competences ; autres : 4 dispo
    for (let i = 0; i < n; i++) {
      const code = `${m}.D${i + 1}`;
      compsIris.push(comp(code, m, "domaine"));
      srcIris.push(src(code, 1), src(code, 2), src(code, 3));
      // Seules les maths ont une progression (lacunes + acquis). Le reste = N0.
      if (m === "MA") {
        progIris.push(
          i % 2 === 0 ? prog(code, { ema_courte: 0.4, niveau: 2 }) : prog(code, { ema_courte: 0.9, niveau: 3 })
        );
      }
    }
  }
  const composeIris = (seed: number) =>
    composeSession({
      competences: compsIris, prerequis: [], progress: progIris, sources: srcIris,
      seed, now: NOW, classe: "CE2", matieres: MATS,
    });

  it("les maths restent <= 40 % a chaque seance", () => {
    for (let seed = 0; seed < 30; seed++) {
      const codes = composeIris(seed).map((p) => p.exercise.competence);
      const ma = codes.filter((c) => matiere(c) === "MA").length;
      expect(ma, `seed ${seed} : ${ma}/${codes.length} maths`).toBeLessThanOrEqual(Math.ceil(codes.length * 0.4));
    }
  });

  it("toutes les matières actives finissent servies sur l'ensemble des séances", () => {
    const vues = new Set<string>();
    for (let seed = 0; seed < 30; seed++) for (const p of composeIris(seed)) vues.add(matiere(p.exercise.competence));
    for (const m of MATS) expect(vues.has(m), `matière ${m} jamais servie`).toBe(true);
  });

  it("chaque séance mélange au moins 4 matières différentes (fini le tout-maths)", () => {
    for (let seed = 0; seed < 30; seed++) {
      const mats = new Set(composeIris(seed).map((p) => matiere(p.exercise.competence)));
      expect(mats.size, `seed ${seed} : seulement ${mats.size} matière(s)`).toBeGreaterThanOrEqual(4);
    }
  });
});
