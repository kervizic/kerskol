import { describe, it, expect } from "vitest";
import {
  calculerProgression,
  cibleMs,
  choisirGrille,
  grillesDejaReussies,
  derniersTemps,
  PALIER_MAX,
  type Partie,
} from "./difficulte";

function reussite(palier: number, temps: number, id: string, indice = false): Partie {
  return { palier, temps_ms: temps, avec_indice: indice, abandon: false, reussi: true, grille_id: id };
}
function abandon(palier: number, id: string): Partie {
  return { palier, temps_ms: 0, avec_indice: false, abandon: true, reussi: false, grille_id: id };
}

describe("difficulte — cible", () => {
  it("cible par defaut sous 3 echantillons", () => {
    expect(cibleMs(1, [])).toBe(30_000);
    expect(cibleMs(3, [10_000, 20_000])).toBe(75_000); // < 3 echantillons -> cible par defaut du palier 3
  });
  it("cible ajustee a la mediane des temps reussis (>= 3)", () => {
    expect(cibleMs(1, [10_000, 12_000, 14_000])).toBe(12_000);
  });
});

describe("difficulte — montee", () => {
  it("3 grilles rapides sans indice d'affilee -> palier +1", () => {
    const p = calculerProgression([
      reussite(1, 20_000, "a"),
      reussite(1, 22_000, "b"),
      reussite(1, 21_000, "c"),
    ]);
    expect(p.palier).toBe(2);
  });

  it("une reussite AVEC indice ne compte pas pour monter", () => {
    const p = calculerProgression([
      reussite(1, 20_000, "a"),
      reussite(1, 22_000, "b", true), // avec indice -> casse la serie
      reussite(1, 21_000, "c"),
    ]);
    expect(p.palier).toBe(1);
  });

  it("une reussite lente (sous la cible mais pas rapide) : cible respectee", () => {
    // 3 reussites JUSTE sous la cible comptent (<=). 30000 exactement = OK.
    const p = calculerProgression([
      reussite(1, 30_000, "a"),
      reussite(1, 30_000, "b"),
      reussite(1, 30_000, "c"),
    ]);
    expect(p.palier).toBe(2);
  });
});

describe("difficulte — descente douce", () => {
  it("2 abandons d'affilee -> palier -1", () => {
    const p = calculerProgression([
      reussite(1, 20_000, "a"),
      reussite(1, 22_000, "b"),
      reussite(1, 21_000, "c"), // -> palier 2
      abandon(2, "d"),
      abandon(2, "e"), // -> palier 1
    ]);
    expect(p.palier).toBe(1);
  });

  it("2 grilles > 3x la cible d'affilee -> palier -1", () => {
    const p = calculerProgression([
      reussite(1, 20_000, "a"),
      reussite(1, 22_000, "b"),
      reussite(1, 21_000, "c"), // -> palier 2 (cible defaut 45000)
      reussite(2, 200_000, "d"), // > 3 x 45000
      reussite(2, 210_000, "e"), // > 3 x 45000 -> palier 1
    ]);
    expect(p.palier).toBe(1);
  });

  it("ne descend pas sous le palier 1", () => {
    const p = calculerProgression([abandon(1, "a"), abandon(1, "b")]);
    expect(p.palier).toBe(1);
  });

  it("ne monte pas au-dessus du palier max", () => {
    const parties: Partie[] = [];
    // beaucoup de reussites rapides d'affilee
    for (let i = 0; i < 40; i++) parties.push(reussite(1, 1000, "g" + i));
    const p = calculerProgression(parties);
    expect(p.palier).toBe(PALIER_MAX);
  });
});

describe("difficulte — cibles par palier dans le resultat", () => {
  it("ajuste la cible du palier aux temps de l'enfant", () => {
    const p = calculerProgression([
      reussite(1, 10_000, "a"),
      reussite(1, 12_000, "b"),
      reussite(1, 14_000, "c"),
    ]);
    expect(p.cibles[1]).toBe(12_000);
  });
});

describe("difficulte — choix de grille (ne pas resservir)", () => {
  const grilles = [{ id: "x" }, { id: "y" }, { id: "z" }];
  it("ignore une grille deja reussie tant qu'il en reste", () => {
    const parties = [reussite(1, 20_000, "x")];
    expect(grillesDejaReussies(parties, 1).has("x")).toBe(true);
    const g = choisirGrille(grilles, parties, 1, 0); // alea=0 -> 1er du pool restant
    expect(g?.id).toBe("y");
  });
  it("si toutes reussies, repioche quand meme", () => {
    const parties = [reussite(1, 1, "x"), reussite(1, 1, "y"), reussite(1, 1, "z")];
    const g = choisirGrille(grilles, parties, 1, 0.99);
    expect(g).not.toBeNull();
  });
  it("derniersTemps du plus recent au plus ancien", () => {
    const parties = [reussite(1, 10_000, "a"), reussite(1, 20_000, "b"), reussite(1, 30_000, "c")];
    expect(derniersTemps(parties, 1, 2)).toEqual([30_000, 20_000]);
  });
});
