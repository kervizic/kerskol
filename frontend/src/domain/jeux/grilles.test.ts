import { describe, it, expect } from "vitest";
import { PALIERS } from "./difficulte";
import { grillesDuPalier, nbGrillesParPalier, FRUITS } from "./registre";
import { compterSolutions, boutsDeGrille } from "./solveur";
import type { GrilleRelie } from "./relie";

function integrite(g: GrilleRelie, palierDef: { w: number; h: number; nPaires: number }) {
  expect(g.w).toBe(palierDef.w);
  expect(g.h).toBe(palierDef.h);
  expect(g.paires.length).toBe(palierDef.nPaires);
  const vues = new Set<number>();
  const fruits = new Set<string>();
  for (const p of g.paires) {
    expect(FRUITS[p.fruit]).toBeTruthy(); // fruit connu
    fruits.add(p.fruit);
    expect(p.chemin.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < p.chemin.length; i++) {
      const [r, c] = p.chemin[i];
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(g.h);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(g.w);
      const k = r * g.w + c;
      expect(vues.has(k)).toBe(false); // aucun chevauchement
      vues.add(k);
      if (i > 0) {
        const [pr, pc] = p.chemin[i - 1];
        expect(Math.abs(pr - r) + Math.abs(pc - c)).toBe(1); // contigu
      }
    }
    const a = p.chemin[0];
    const b = p.chemin[p.chemin.length - 1];
    expect(a[0] === b[0] && a[1] === b[1]).toBe(false); // bouts distincts
  }
  expect(fruits.size).toBe(g.paires.length); // un fruit different par paire
  expect(vues.size).toBe(g.w * g.h); // grille entierement remplie
}

describe("grilles livrees — nombre", () => {
  it("au moins 40 grilles par palier", () => {
    const n = nbGrillesParPalier();
    for (const def of PALIERS) {
      expect(n[def.palier]).toBeGreaterThanOrEqual(40);
    }
  });
  it("identifiants uniques par palier", () => {
    for (const def of PALIERS) {
      const ids = grillesDuPalier(def.palier).map((g) => g.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("grilles livrees — integrite (toutes)", () => {
  for (const def of PALIERS) {
    it(`palier ${def.palier} : toutes les grilles sont valides et remplies`, () => {
      for (const g of grillesDuPalier(def.palier)) integrite(g, def);
    });
  }
});

describe("grilles livrees — solution unique (verifiee par solveur)", () => {
  for (const def of PALIERS) {
    // Paliers 1-3 : toutes ; paliers 4-5 (7x7, verification plus couteuse) : un
    // echantillon suffisant pour garder le test rapide (la generation a deja
    // prouve l'unicite de TOUTES les grilles livrees).
    const toutes = grillesDuPalier(def.palier);
    const lot = def.palier <= 3 ? toutes : toutes.slice(0, 6);
    it(`palier ${def.palier} : ${lot.length} grilles a solution unique`, () => {
      for (const g of lot) {
        const n = compterSolutions(g.w, g.h, boutsDeGrille(g), 2);
        expect(n).toBe(1);
      }
    });
  }
});
