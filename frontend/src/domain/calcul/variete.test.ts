// Golden tests de l'alternance des exercices (prompt Manu, 15/10).
//
// Règle dure vérifiée :
//   * ZÉRO répétition consécutive de TYPE (compétence) ;
//   * ZÉRO répétition consécutive de MATIÈRE quand c'est ÉVITABLE
//     (une autre matière active reste à placer).
//
// Trois niveaux :
//   1. unitaire : la fonction `alterner` isolée ;
//   2. 1000 séances simulées (profils aléatoires mais déterministes) via
//      `composeSession` ;
//   3. profil réel d'Iris (7 matières actives) + déroulé moteur avec insertions
//      (rattrapage / bascule de confiance) : la règle tient APRÈS insertion.
import { describe, it, expect } from "vitest";
import { composeSession, type ProgressionDetail, type PlannedItem } from "./composer";
import { createEngine, currentSlot, answerCurrent, isFinished } from "./engine";
import { alterner, exerciceMatiere, exerciceType } from "./variete";
import type { Classe, Competence, Prerequis } from "../../lib/types";
import type { ExCalcul } from "./generator";

// --- Outils de mesure -------------------------------------------------------

// Minimum théorique de paires adjacentes identiques pour une clé donnée :
// 0 si la clé la plus fréquente ne dépasse pas la moitié des items, sinon le
// surplus forcé (2*max - n - 1). C'est l'optimum que le glouton doit atteindre.
function minAdjacent(counts: number[], n: number): number {
  const max = counts.length ? Math.max(...counts) : 0;
  return Math.max(0, 2 * max - n - 1);
}
function compte<T>(items: T[], keyOf: (it: T) => string): number[] {
  const m = new Map<string, number>();
  for (const it of items) m.set(keyOf(it), (m.get(keyOf(it)) ?? 0) + 1);
  return [...m.values()];
}
function adjacences<T>(items: T[], keyOf: (it: T) => string): number {
  let a = 0;
  for (let i = 1; i < items.length; i++) if (keyOf(items[i]) === keyOf(items[i - 1])) a++;
  return a;
}

// Vérifie la règle dure sur une séquence de clés {type, matiere} : le nombre de
// répétitions observées égale l'optimum (donc 0 dès que c'est évitable).
function verifieAlternance(
  seq: { type: string; matiere: string }[],
  label: string
): void {
  const n = seq.length;
  const typeOpt = minAdjacent(compte(seq, (s) => s.type), n);
  const matOpt = minAdjacent(compte(seq, (s) => s.matiere), n);
  // Type : zéro répétition dès que c'est faisable (typeOpt vaut 0 dans ce cas).
  expect(
    adjacences(seq, (s) => s.type),
    `${label} : répétition de TYPE consécutive (optimum ${typeOpt})`
  ).toBe(typeOpt);
  // Matière : exigence de la spec = ZÉRO répétition QUAND c'est évitable, c.-à-d.
  // quand la matière la plus fréquente ne dépasse pas la moitié des items
  // (matOpt === 0). Si une matière dépasse la moitié (cas rare : une seule
  // matière a presque tous les candidats), des répétitions sont INÉVITABLES ;
  // la règle « type » reste malgré tout garantie (déjà vérifiée ci-dessus).
  if (matOpt === 0) {
    expect(
      adjacences(seq, (s) => s.matiere),
      `${label} : répétition de MATIÈRE consécutive évitable`
    ).toBe(0);
  }
}

function cle(code: string) {
  return { type: exerciceType(code), matiere: exerciceMatiere(code) };
}
function planCles(plan: PlannedItem[]) {
  return plan.map((p) => cle(p.exercise.competence));
}

// RNG déterministe (mulberry32) : profils aléatoires reproductibles.
function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Fabrique de référentiel ------------------------------------------------

const NOW = Date.parse("2026-10-15T10:00:00Z");

function comp(code: string, matiere: string, domaine: string): Competence {
  return {
    code, matiere, domaine, libelle: code, ordre: 300, nb_niveaux: 4, actif: true,
    classe_min: "CE2" as Classe, classe_max: "CE2" as Classe,
  };
}
// Source « comparer » : generateExercise produit un exercice valide quel que
// soit le code de compétence (le code n'est qu'une étiquette).
function src(competence: string, niveau: number): ExCalcul {
  return {
    exerciceId: `${competence}:${niveau}`, competence, niveau, methode: null,
    operation: "comparer", forme: "comparaison",
    params: { type: "comparer", min: 0, max: 999 }, support: "aucun",
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

// Catalogue de test : les 7 matières actives d'Iris. On choisit des familles de
// compétences que le générateur rend SANS donnée métier spécifique (source
// « comparer ») : MA.CAL (générique), FR.CONJ / FR.ORTHO, et QM/EMC/ST/HIST/GEO
// (qui réutilisent la même infra « situation »). L'alternance ne dépend QUE des
// codes de compétence : ce choix n'enlève rien à la portée du test.
const DOMAINES: Record<string, string[]> = {
  MA: ["CAL"],
  FR: ["CONJ", "ORTHO"],
  QM: ["VIVANT", "ESPACE", "TEMPS"],
  EMC: ["RESPECT"],
  ST: ["MATIERE"],
  HIST: ["GAULOIS"],
  GEO: ["HABITER"],
};
function codesPour(matiere: string): string[] {
  return DOMAINES[matiere].flatMap((d) => [1, 2, 3].map((k) => `${matiere}.${d}.C${k}`));
}

// --- 1. Unitaire : alterner -------------------------------------------------

describe("alterner (unitaire)", () => {
  it("zéro adjacence de type quand c'est faisable (max <= moitié)", () => {
    const items = [
      "FR.CONJ.A", "FR.CONJ.A", "EMC.RESPECT.B", "EMC.RESPECT.B",
      "QM.VIVANT.C", "QM.VIVANT.C", "FR.GRAM.D", "FR.GRAM.D",
    ];
    const out = alterner(items, (c) => ({ ...cle(c), niveau: 1 }));
    verifieAlternance(out.map(cle), "alterner faisable");
  });

  it("respecte le prédécesseur fourni (ne répète pas le type précédent)", () => {
    const items = ["FR.CONJ.A", "EMC.RESPECT.B", "QM.VIVANT.C"];
    const out = alterner(items, (c) => ({ ...cle(c), niveau: 1 }), cle("FR.CONJ.A"));
    expect(exerciceType(out[0])).not.toBe("FR.CONJ.A");
  });

  it("répétition seulement quand inévitable (une seule compétence)", () => {
    const items = ["FR.CONJ.A", "FR.CONJ.A"];
    const out = alterner(items, (c) => ({ ...cle(c), niveau: 1 }));
    // Inévitable : 1 paire adjacente, et c'est l'optimum.
    verifieAlternance(out.map(cle), "alterner inévitable");
    expect(adjacences(out.map(cle), (s) => s.type)).toBe(1);
  });
});

// --- 2. 1000 séances simulées ----------------------------------------------

describe("1000 séances simulées : règle dure respectée", () => {
  it("0 répétition de type, 0 de matière quand évitable (optimum atteint)", () => {
    const matieres = Object.keys(DOMAINES);
    let vides = 0;
    for (let seed = 0; seed < 1000; seed++) {
      const rng = rngFrom(seed + 1);
      // Sous-ensemble aléatoire de 2 à 6 matières actives.
      const actives = matieres.filter(() => rng() < 0.6);
      while (actives.length < 2) actives.push(matieres[Math.floor(rng() * matieres.length)]);
      const uniques = [...new Set(actives)];

      const competences: Competence[] = [];
      const sources: ExCalcul[] = [];
      const progress: ProgressionDetail[] = [];
      for (const m of uniques) {
        for (const code of codesPour(m)) {
          const dom = DOMAINES[m][0]; // (le domaine réel est dans le code)
          competences.push(comp(code, m, dom));
          sources.push(src(code, 1), src(code, 2), src(code, 3));
          const r = rng();
          // ~1/4 jamais faite (découverte), ~1/4 lacune, ~1/4 due, ~1/4 acquise.
          if (r < 0.25) continue; // pas de progression -> nouveauté
          else if (r < 0.5) progress.push(prog(code, { ema_courte: 0.3, niveau: 1 }));
          else if (r < 0.75)
            progress.push(prog(code, { prochaine_revision: "2026-10-10T00:00:00Z" }));
          else progress.push(prog(code, { ema_courte: 0.95, niveau: 3 }));
        }
      }

      const plan = composeSession({
        competences, prerequis: [] as Prerequis[], progress, sources,
        seed: seed * 97 + 3, now: NOW, classe: "CE2", matieres: uniques,
      });
      if (plan.length === 0) { vides++; continue; }
      verifieAlternance(planCles(plan), `séance simulée seed ${seed}`);
    }
    // Les profils ont toujours des candidats -> aucune séance vide attendue.
    expect(vides, `${vides} séances vides`).toBe(0);
  });
});

// --- 3. Profil réel d'Iris (CE2, 7 matières actives) ------------------------

// Compétences effectivement travaillées par Iris (diagnostic DB du 15/10) +
// découvertes français/QLM/EMC/sciences/histoire/géo.
// Structure fidèle au profil d'Iris (6 compétences de maths déjà travaillées,
// 5 de français, puis QLM / EMC / sciences / histoire / géo en découverte), avec
// des familles que le générateur rend sans donnée métier (cf. catalogue ci-dessus).
const IRIS_MATS = ["MA", "FR", "QM", "EMC", "ST", "HIST", "GEO"];
const IRIS_COMPS: Competence[] = [
  // Maths déjà travaillés (lacunes + acquis).
  ...["MA.CAL.C1", "MA.CAL.C2", "MA.CAL.C3", "MA.CAL.C4", "MA.CAL.C5", "MA.CAL.C6"].map((c) =>
    comp(c, "MA", "calcul_mental")
  ),
  // Français : conjugaison (plusieurs temps) + orthographe.
  ...["FR.CONJ.C1", "FR.CONJ.C2", "FR.CONJ.C3", "FR.ORTHO.C1", "FR.ORTHO.C2"].map((c) =>
    comp(c, "FR", c.startsWith("FR.ORTHO") ? "orthographe" : "conjugaison")
  ),
  comp("QM.VIVANT.C1", "QM", "vivant"),
  comp("QM.ESPACE.C1", "QM", "espace"),
  comp("EMC.RESPECT.C1", "EMC", "respect"),
  comp("ST.MATIERE.C1", "ST", "matiere"),
  comp("HIST.GAULOIS.C1", "HIST", "gaulois_romains"),
  comp("GEO.HABITER.C1", "GEO", "habiter"),
];
const IRIS_SOURCES: ExCalcul[] = IRIS_COMPS.flatMap((c) => [src(c.code, 1), src(c.code, 2), src(c.code, 3)]);
const IRIS_PROGRESS: ProgressionDetail[] = [
  prog("MA.CAL.C1", { ema_courte: 0.4, niveau: 1 }),
  prog("MA.CAL.C2", { ema_courte: 0.9, niveau: 2 }),
  prog("MA.CAL.C3", { prochaine_revision: "2026-10-10T00:00:00Z" }),
  prog("MA.CAL.C4", { ema_courte: 0.4, niveau: 1 }),
  prog("FR.CONJ.C1", { ema_courte: 0.5, niveau: 1 }),
  prog("FR.CONJ.C2", { ema_courte: 0.5, niveau: 1 }),
  // le reste sans progression -> découvertes N1.
];

function composeIris(seed: number): PlannedItem[] {
  return composeSession({
    competences: IRIS_COMPS, prerequis: [] as Prerequis[], progress: IRIS_PROGRESS,
    sources: IRIS_SOURCES, seed, now: NOW, classe: "CE2", matieres: IRIS_MATS,
  });
}

describe("profil réel d'Iris : alternance garantie", () => {
  it("compose : 0 répétition de type, 0 de matière quand évitable (200 graines)", () => {
    for (let seed = 0; seed < 200; seed++) {
      const plan = composeIris(seed);
      expect(plan.length, `seed ${seed} : séance vide`).toBeGreaterThan(0);
      verifieAlternance(planCles(plan), `Iris compose seed ${seed}`);
    }
  });

  it("moteur : la règle tient APRÈS insertions (rattrapage / bascule confiance)", () => {
    for (let seed = 0; seed < 200; seed++) {
      let st = createEngine(composeIris(seed), seed * 7 + 1);
      const dropped = new Set<string>();
      let step = 0;
      while (!isFinished(st) && step < 100) {
        const repondu = currentSlot(st);
        if (!repondu) break;
        const faux = step % 3 === 0; // 1 faux sur 3 (rattrapage si corrigé)
        const res = answerCurrent(st, !faux, { correctionRead: faux });
        st = res.state;
        if (res.event.dropped) dropped.add(repondu.exercise.competence);

        // L'exercice MONTRÉ ensuite ne doit jamais répéter le type (ni la
        // matière) de celui qu'on vient de répondre, SAUF si aucun autre slot
        // jouable restant n'offre d'alternative (répétition inévitable).
        const suivant = currentSlot(st);
        if (suivant) {
          const jouablesAutres = st.slots.filter(
            (sl, i) => i !== st.pos && !sl.answered && !dropped.has(sl.exercise.competence)
          );
          if (exerciceType(suivant.exercise.competence) === exerciceType(repondu.exercise.competence)) {
            const altType = jouablesAutres.some(
              (sl) => exerciceType(sl.exercise.competence) !== exerciceType(repondu.exercise.competence)
            );
            expect(altType, `seed ${seed} step ${step} : répétition de TYPE évitable`).toBe(false);
          }
          if (exerciceMatiere(suivant.exercise.competence) === exerciceMatiere(repondu.exercise.competence)) {
            const altMat = jouablesAutres.some(
              (sl) => exerciceMatiere(sl.exercise.competence) !== exerciceMatiere(repondu.exercise.competence)
            );
            expect(altMat, `seed ${seed} step ${step} : répétition de MATIÈRE évitable`).toBe(false);
          }
        }
        step++;
      }
    }
  });
});
