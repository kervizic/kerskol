import { describe, it, expect } from "vitest";
import { buildDefiExercise, eligibleThemes, DEFI_THEMES } from "./defi";
import { computeVerif } from "./generator";
import { SEED_SOURCES } from "./seedSources";
import type { Progression } from "../../lib/types";

function prog(competence: string, niveau: number): Progression {
  return { profil_id: "p", competence, niveau, niveau_max_atteint: niveau, placement_termine: true };
}

describe("defi : eligibilite des themes", () => {
  it("aucun theme si rien n'est maitrise (niveau < 3)", () => {
    const p = [prog("MA.TABLES.2", 2), prog("MA.CM.ADDITION", 1)];
    expect(eligibleThemes(p)).toHaveLength(0);
  });

  it("un theme devient eligible des qu'une de ses competences atteint le niveau 3", () => {
    const p = [prog("MA.TABLES.2", 3), prog("MA.TABLES.3", 2)];
    const el = eligibleThemes(p);
    const tables25 = el.find((e) => e.theme.id === "tables_2_5");
    expect(tables25).toBeTruthy();
    // Seules les competences maitrisees (niveau >= 3) sont retenues.
    expect(tables25!.competences).toEqual(["MA.TABLES.2"]);
  });

  it("le calcul mental s'ouvre avec une competence CM maitrisee", () => {
    const p = [prog("MA.CM.DOUBLES", 4)];
    const el = eligibleThemes(p);
    expect(el.some((e) => e.theme.id === "calcul_mental")).toBe(true);
  });
});

describe("defi : generation d'enonces fluides a saisie rapide", () => {
  // Toutes competences portees par les themes, supposees maitrisees.
  const allComps = Array.from(new Set(DEFI_THEMES.flatMap((t) => t.competences)));
  it("verif reproduit la reponse, 1 seul champ, saisie rapide", () => {
    for (const comp of allComps) {
      for (let seed = 1; seed <= 60; seed++) {
        const g = buildDefiExercise(SEED_SOURCES, [comp], seed * 7919 + 3, { hero: "Iris" });
        expect(g).not.toBeNull();
        const c = computeVerif(g!.verif);
        expect(c.answer).toBe(g!.answer);
        expect(g!.fields).toBe(1); // pas de reste (division) en defi
        expect(["clavier", "compare", "qcm"]).toContain(g!.saisie);
      }
    }
  });
});
