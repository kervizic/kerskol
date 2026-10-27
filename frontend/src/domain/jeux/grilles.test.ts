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
  // Verification INDEPENDANTE de la generation : pour CHAQUE grille, le solveur
  // doit trouver exactement UNE solution couvrante. Ainsi la victoire basee sur
  // les regles (toute solution couvrante acceptee) correspond a la solution que
  // l'enfant doit trouver, et l'indice (chemin stocke) est compatible avec elle.
  // Le solveur est rapide (toutes les grilles en < 1 s), on les verifie TOUTES.
  for (const def of PALIERS) {
    const toutes = grillesDuPalier(def.palier);
    it(`palier ${def.palier} : les ${toutes.length} grilles ont une solution couvrante UNIQUE`, () => {
      const fautives: string[] = [];
      for (const g of toutes) {
        const n = compterSolutions(g.w, g.h, boutsDeGrille(g), 2);
        if (n !== 1) fautives.push(`${g.id}=${n}`);
      }
      expect(fautives).toEqual([]);
    }, 120_000);
  }
});
