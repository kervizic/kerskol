// Tests de la banque de GEOMETRIE / REPERAGE (maths, CE2) et du generateur.
//
// Le nombre d'items (66) et les cles sont un GOLDEN : le test croise SQL
// (supabase/tests/geometrie_test.sql) verifie que public.geometrie_item porte
// EXACTEMENT les memes cles et le meme `attendu`. Si ce nombre change, il faut
// mettre a jour la migration ET le test SQL (sinon front != serveur).

import { describe, it, expect } from "vitest";
import {
  BANQUE_GEOMETRIE,
  COMPETENCES_GEO_TOUTES,
  itemsGeoDe,
  itemGeoParCle,
  estJusteGeometrie,
  comparerGeometrie,
  canonCells,
} from "./geometrie";
import { generateExercise } from "../calcul/generator";
import type { ExCalcul } from "../calcul/generator";

const NB_ITEMS_GOLDEN = 66;

function source(competence: string, niveau: number): ExCalcul {
  return {
    exerciceId: "00000000-0000-0000-0000-000000000000",
    competence,
    niveau,
    methode: "van_hiele",
    operation: "geo",
    forme: "geometrie",
    params: {},
    support: null,
    correctionStrategie: null,
  };
}

describe("banque de geometrie : structure et couverture", () => {
  it("compte GOLDEN stable (miroir du test SQL)", () => {
    expect(BANQUE_GEOMETRIE.length).toBe(NB_ITEMS_GOLDEN);
  });

  it("cles uniques", () => {
    const cles = BANQUE_GEOMETRIE.map((i) => i.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("chaque competence a au moins un item a chaque niveau 1..4", () => {
    for (const c of COMPETENCES_GEO_TOUTES) {
      for (let n = 1; n <= 4; n++) {
        expect(itemsGeoDe(c, n).length, `${c} N${n}`).toBeGreaterThan(0);
      }
    }
  });

  it("competence et niveau valides, consigne / attendu / explication non vides, figure presente", () => {
    for (const i of BANQUE_GEOMETRIE) {
      expect(COMPETENCES_GEO_TOUTES).toContain(i.competence as (typeof COMPETENCES_GEO_TOUTES)[number]);
      expect(i.niveau).toBeGreaterThanOrEqual(1);
      expect(i.niveau).toBeLessThanOrEqual(4);
      expect(i.consigne.trim().length).toBeGreaterThan(0);
      expect(i.attendu.trim().length).toBeGreaterThan(0);
      expect(i.explication.trim().length).toBeGreaterThan(0);
      expect(i.figure).toBeTruthy();
      if (i.format === "qcm") {
        expect(i.options, `${i.cle} doit avoir des options`).toBeTruthy();
        expect(i.options).toContain(i.attendu);
      }
    }
  });

  it("niveau 1 = QCM, niveau 4 = reponse libre (texte ou grille)", () => {
    for (const i of BANQUE_GEOMETRIE) {
      if (i.niveau === 1) expect(i.format, i.cle).toBe("qcm");
      if (i.niveau === 4) expect(["texte", "grille"], i.cle).toContain(i.format);
    }
  });
});

describe("comparaison miroir du serveur", () => {
  it("qcm : casse ignoree, accents gardes", () => {
    expect(comparerGeometrie("qcm", "Un Carré", "un carré")).toBe(true);
    expect(comparerGeometrie("qcm", "un rectangle", "un carré")).toBe(false);
  });
  it("texte : accents EXIGES", () => {
    expect(comparerGeometrie("texte", "cône", "cône")).toBe(true);
    expect(comparerGeometrie("texte", "cone", "cône")).toBe(false);
  });
  it("clic : code de case tolerant a la casse", () => {
    expect(comparerGeometrie("clic", "b3", "B3")).toBe(true);
    expect(comparerGeometrie("clic", "c3", "B3")).toBe(false);
  });
  it("grille : espaces ignores, contenu exact", () => {
    expect(comparerGeometrie("grille", "C2; C3; D1; D4", "C2;C3;D1;D4")).toBe(true);
    expect(comparerGeometrie("grille", "c2;c3;d1", "C2;C3;D1;D4")).toBe(false);
  });
  it("canonCells trie les codes (ordre independant de l'enfant)", () => {
    expect(canonCells(["D4", "C2", "D1", "C3"])).toBe("C2;C3;D1;D4");
  });
  it("estJusteGeometrie : miroir local pour quelques items", () => {
    expect(estJusteGeometrie("geo-fig-n1-carre", "un carré")).toBe(true);
    expect(estJusteGeometrie("geo-sym-n3-a", "C2;C3;D1;D4")).toBe(true);
    expect(estJusteGeometrie("cle-bidon", "x")).toBe(false);
  });
});

describe("generateur de geometrie", () => {
  it("produit un exercice geo coherent (saisie, op, cle de l'item)", () => {
    for (const c of COMPETENCES_GEO_TOUTES) {
      for (let n = 1; n <= 4; n++) {
        const ex = generateExercise(source(c, n), 12345 + n);
        expect(ex.saisie, `${c} N${n}`).toBe("geometrie");
        expect(ex.verif.op).toBe("geo");
        expect(ex.geo, `${c} N${n} doit porter un item`).toBeTruthy();
        const item = itemGeoParCle(ex.geo!.cle);
        expect(item, `item ${ex.geo!.cle} doit exister`).toBeTruthy();
        expect(item!.competence).toBe(c);
        expect(item!.niveau).toBe(n);
        expect(ex.verif.cle).toBe(ex.geo!.cle);
      }
    }
  });

  it("reproductible pour une meme graine", () => {
    const a = generateExercise(source("MA.GEO.FIGURES", 2), 999);
    const b = generateExercise(source("MA.GEO.FIGURES", 2), 999);
    expect(a.geo!.cle).toBe(b.geo!.cle);
  });
});
