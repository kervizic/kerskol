// Golden : une MEME question (meme enonce ou meme item de banque) ne doit JAMAIS
// apparaitre deux fois dans une seance. Couvre la cause reelle du bug signale par
// Manu le 10/10 (Iris a eu « 2 fois la meme question ») : une competence a petite
// banque (EMC : 2 items par niveau) dont un bloc de 2-3 items retirait deux fois
// le meme item, faute de deduplication.

import { describe, it, expect } from "vitest";
import { composeSession, type ProgressionDetail } from "./composer";
import { exerciceSignature, type ExCalcul } from "./generator";
import { SEED_SOURCES } from "./seedSources";
import type { Competence, Prerequis } from "../../lib/types";

// --- Outils ---------------------------------------------------------------
function signatures(items: { exercise: Parameters<typeof exerciceSignature>[0] }[]): string[] {
  return items.map((it) => exerciceSignature(it.exercise));
}
function doublons(sigs: string[]): string[] {
  const vus = new Set<string>();
  const dup: string[] = [];
  for (const s of sigs) {
    if (vus.has(s)) dup.push(s);
    else vus.add(s);
  }
  return dup;
}

// --- Cas reel d'Iris : EMC.RESPECT.MOQUERIE, banque de 2 items par niveau -----
// Avant le correctif, un bloc de 3 items sur cette competence retirait le meme
// item plusieurs fois (~2 chances sur 3 d'avoir un doublon). On force la seance a
// ne contenir que cette competence pour maximiser la pression.
describe("dedup : cas reel Iris (EMC petite banque)", () => {
  const COMP: Competence[] = [
    {
      code: "EMC.RESPECT.MOQUERIE",
      matiere: "EMC",
      domaine: "respect",
      libelle: "Refuser la moquerie",
      ordre: 1,
      nb_niveaux: 4,
      actif: true,
      classe_min: "CE2",
      classe_max: "CE2",
    } as Competence,
  ];
  const SRC: ExCalcul[] = [1, 2, 3, 4].map((niveau) => ({
    exerciceId: `emc-moq-${niveau}`,
    competence: "EMC.RESPECT.MOQUERIE",
    niveau,
    methode: "vivre_ensemble",
    operation: "emc",
    forme: "qm",
    params: {},
    support: "aucun",
    correctionStrategie: null,
  }));
  const prog = (over: Partial<ProgressionDetail>): ProgressionDetail => ({
    competence: "EMC.RESPECT.MOQUERIE",
    niveau: 1,
    niveau_max_atteint: 1,
    placement_termine: true,
    ema_courte: 0.4, // lacune -> la competence est travaillee
    derniere_reponse: "2026-10-01T00:00:00Z",
    prochaine_revision: null,
    ...over,
  });

  it("aucun doublon malgre un bloc plus grand que la banque (toutes graines)", () => {
    const NOW = Date.parse("2026-10-10T08:00:00Z");
    for (let seed = 0; seed < 300; seed++) {
      const plan = composeSession({
        competences: COMP,
        prerequis: [],
        progress: [prog({})],
        sources: SRC,
        seed,
        now: NOW,
        count: 12,
        classe: "CE2",
        matieres: ["EMC"],
        domaines: ["respect"],
      });
      const sigs = signatures(plan);
      expect(doublons(sigs), `graine ${seed}: doublon detecte`).toEqual([]);
      // La banque niveau 1 ne compte que 2 items : la seance ne peut pas en
      // contenir davantage sans repetition.
      expect(plan.length).toBeLessThanOrEqual(2);
      expect(plan.length).toBeGreaterThan(0);
    }
  });
});

// --- Balayage generique maths : aucune repetition sur de nombreuses graines ---
describe("dedup : seances maths variees (balayage de graines)", () => {
  const CODES = Array.from(new Set(SEED_SOURCES.map((s) => s.competence)));
  const COMPETENCES: Competence[] = CODES.map((code) => ({
    code,
    matiere: "MA",
    domaine: "calcul_mental",
    libelle: code,
    ordre: 1,
    nb_niveaux: 4,
    actif: true,
  }));
  const PREREQUIS: Prerequis[] = [];
  const progress: ProgressionDetail[] = CODES.map((competence) => ({
    competence,
    niveau: 2,
    niveau_max_atteint: 2,
    placement_termine: true,
    ema_courte: 0.5, // lacunes : beaucoup d'items tires
    derniere_reponse: "2026-09-01T00:00:00Z",
    prochaine_revision: null,
  }));
  const NOW = Date.parse("2026-10-10T08:00:00Z");

  it("aucune seance ne contient deux fois le meme enonce (500 graines)", () => {
    for (let seed = 0; seed < 500; seed++) {
      const plan = composeSession({
        competences: COMPETENCES,
        prerequis: PREREQUIS,
        progress,
        sources: SEED_SOURCES,
        seed,
        now: NOW,
        count: 12,
        classe: "CE2",
      });
      const dup = doublons(signatures(plan));
      expect(dup, `graine ${seed}: ${dup.length} doublon(s)`).toEqual([]);
    }
  });
});
