import { describe, it, expect } from "vitest";
import {
  palierDepartBriques,
  meilleurScore,
  partiesJouees,
  dernieresParties,
  type PartieBriques,
} from "./progression";

function partie(p: Partial<PartieBriques>): PartieBriques {
  return {
    palier: 1,
    score: 0,
    lignes: 0,
    dureeMs: 0,
    reussi: true,
    abandon: false,
    ...p,
  };
}

describe("palierDepartBriques", () => {
  it("part du plus lent (0) quand il n'y a aucune partie", () => {
    expect(palierDepartBriques([])).toBe(0);
  });

  it("part du plus lent (0) si seules des parties abandonnees existent", () => {
    expect(palierDepartBriques([partie({ reussi: false, abandon: true, palier: 6 })])).toBe(0);
  });

  it("reprend un cran sous le dernier palier atteint", () => {
    expect(palierDepartBriques([partie({ palier: 4 })])).toBe(3);
  });

  it("borne a 1 minimum (jamais 0 ni negatif) quand il y a un historique", () => {
    expect(palierDepartBriques([partie({ palier: 1 })])).toBe(1);
    expect(palierDepartBriques([partie({ palier: 2 })])).toBe(1);
  });

  it("utilise la DERNIERE partie terminee, pas le maximum historique", () => {
    const parties = [partie({ palier: 8 }), partie({ palier: 3 })];
    expect(palierDepartBriques(parties)).toBe(2);
  });

  it("ignore les abandons intercales pour choisir la derniere partie terminee", () => {
    const parties = [
      partie({ palier: 5 }),
      partie({ reussi: false, abandon: true, palier: 9 }),
    ];
    expect(palierDepartBriques(parties)).toBe(4);
  });
});

describe("meilleurScore / partiesJouees / dernieresParties", () => {
  it("meilleurScore renvoie le score maximal", () => {
    expect(meilleurScore([partie({ score: 120 }), partie({ score: 340 }), partie({ score: 80 })])).toBe(340);
    expect(meilleurScore([])).toBe(0);
  });

  it("partiesJouees compte les parties menees a terme", () => {
    const parties = [partie({}), partie({ reussi: false, abandon: true }), partie({})];
    expect(partiesJouees(parties)).toBe(2);
  });

  it("dernieresParties renvoie les plus recentes d'abord", () => {
    const parties = [partie({ score: 1 }), partie({ score: 2 }), partie({ score: 3 })];
    const d = dernieresParties(parties, 2);
    expect(d.map((p) => p.score)).toEqual([3, 2]);
  });
});
