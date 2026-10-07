// Tests de la banque de GEOMETRIE / REPERAGE (maths, CE2) et du generateur.
//
// Le nombre d'items (76) et les cles sont un GOLDEN : le test croise SQL
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
  verifConstruire,
  verifProgramme,
  verifReproduire,
  simulerProgramme,
} from "./geometrie";
import type { ConstruireSpec, ProgrammeSpec, ReproduireSpec } from "./geometrie";
import { generateExercise } from "../calcul/generator";
import type { ExCalcul } from "../calcul/generator";

const NB_ITEMS_GOLDEN = 85;

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
      if (i.format === "construire" || i.format === "programme") {
        expect(i.spec, `${i.cle} doit porter un spec`).toBeTruthy();
      }
    }
  });

  it("refonte CE2 : plus d'item « nomme la figure » au-dela du rappel N1", () => {
    // Les items « ecris le nom » / « clique sur le carre » (niveau CP) sont retires.
    expect(BANQUE_GEOMETRIE.find((i) => i.cle === "geo-fig-n4-carre")).toBeUndefined();
    expect(BANQUE_GEOMETRIE.find((i) => i.cle === "geo-fig-n2-carre")).toBeUndefined();
    // Le rappel N1 subsiste (court).
    expect(itemsGeoDe("MA.GEO.FIGURES", 1).every((i) => i.format === "qcm")).toBe(true);
  });

  it("MA.GEO.CONSTRUIRE = construire ou reproduire ; MA.REPERE.PROGRAMMER = lire (clic) puis ecrire (programme)", () => {
    expect(itemsGeoDe("MA.GEO.CONSTRUIRE", 1).length).toBeGreaterThan(0);
    for (const i of BANQUE_GEOMETRIE.filter((x) => x.competence === "MA.GEO.CONSTRUIRE")) {
      expect(["construire", "reproduire"], i.cle).toContain(i.format);
    }
    for (const i of BANQUE_GEOMETRIE.filter((x) => x.competence === "MA.REPERE.PROGRAMMER")) {
      expect(i.niveau <= 2 ? "clic" : "programme", i.cle).toBe(i.format);
    }
  });
});

describe("comparaison miroir du serveur (formats de chaine)", () => {
  it("qcm : casse ignoree, accents gardes", () => {
    expect(comparerGeometrie("qcm", "Un Carré", "un carré")).toBe(true);
    expect(comparerGeometrie("qcm", "un rectangle", "un carré")).toBe(false);
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
});

describe("verification par proprietes : construire", () => {
  it("rectangle 5x3 : accepte toute position / orientation", () => {
    const spec: ConstruireSpec = { t: "rect", w: 5, h: 3 };
    expect(verifConstruire(spec, [[0, 0], [5, 0], [5, 3], [0, 3]])).toBe(true); // ancre a l'origine
    expect(verifConstruire(spec, [[2, 1], [7, 1], [7, 4], [2, 4]])).toBe(true); // translate
    expect(verifConstruire(spec, [[0, 0], [3, 0], [3, 5], [0, 5]])).toBe(true); // tourne (3x5)
    expect(verifConstruire(spec, [[0, 0], [4, 0], [4, 3], [0, 3]])).toBe(false); // 4x3 : faux
    expect(verifConstruire(spec, [[0, 0], [5, 0], [5, 3]])).toBe(false); // 3 sommets : faux
  });
  it("carre 4 : cotes egaux et angles droits", () => {
    const spec: ConstruireSpec = { t: "rect", w: 4, h: 4 };
    expect(verifConstruire(spec, [[0, 0], [4, 0], [4, 4], [0, 4]])).toBe(true);
    expect(verifConstruire(spec, [[0, 0], [4, 0], [4, 3], [0, 3]])).toBe(false); // pas un carre
  });
  it("segment de 3 carreaux : droit, horizontal ou vertical", () => {
    const spec: ConstruireSpec = { t: "seg", len: 3 };
    expect(verifConstruire(spec, [[1, 1], [1, 4]])).toBe(true);
    expect(verifConstruire(spec, [[0, 2], [3, 2]])).toBe(true);
    expect(verifConstruire(spec, [[0, 0], [2, 0]])).toBe(false);
  });
  it("triangle rectangle : trois cotes, un angle droit", () => {
    const spec: ConstruireSpec = { t: "tri_right" };
    expect(verifConstruire(spec, [[0, 0], [3, 0], [0, 3]])).toBe(true);
    expect(verifConstruire(spec, [[0, 0], [3, 0], [1, 2]])).toBe(false); // pas d'angle droit
    expect(verifConstruire(spec, [[0, 0], [3, 0], [6, 0]])).toBe(false); // aplat (degenere)
  });
});

describe("verification par proprietes : programme (simulation)", () => {
  const spec: ProgrammeSpec = { cols: 5, rows: 5, start: "A1", dir: "N", target: "C3", obstacles: [] };
  it("une solution atteint la cible", () => {
    expect(verifProgramme(spec, ["avance", "avance", "droite", "avance", "avance"])).toBe(true);
  });
  it("un autre chemin valide est accepte (toute solution)", () => {
    expect(verifProgramme(spec, ["droite", "avance", "avance", "gauche", "avance", "avance"])).toBe(true);
  });
  it("rate la cible : refuse", () => {
    expect(verifProgramme(spec, ["avance", "avance"])).toBe(false);
  });
  it("sortir du quadrillage : refuse", () => {
    expect(simulerProgramme({ ...spec, start: "A1", dir: "S" }, ["avance"])).toBeNull();
  });
  it("heurter un obstacle : refuse", () => {
    const s2: ProgrammeSpec = { ...spec, target: "A5", obstacles: ["A3"] };
    expect(verifProgramme(s2, ["avance", "avance", "avance", "avance"])).toBe(false);
  });
});

describe("verification par proprietes : reproduire (translation)", () => {
  const spec: ReproduireSpec = { model: [[0, 0], [4, 0], [4, 2], [0, 2]] };
  it("meme figure translatee : accepte", () => {
    expect(verifReproduire(spec, [[0, 0], [4, 0], [4, 2], [0, 2]])).toBe(true);
    expect(verifReproduire(spec, [[2, 1], [6, 1], [6, 3], [2, 3]])).toBe(true);
  });
  it("sommet de depart et sens de parcours differents : accepte", () => {
    expect(verifReproduire(spec, [[0, 2], [0, 0], [4, 0], [4, 2]])).toBe(true); // rotation de depart
    expect(verifReproduire(spec, [[0, 0], [0, 2], [4, 2], [4, 0]])).toBe(true); // sens inverse
  });
  it("mauvaise taille / mauvais nombre de sommets : refuse", () => {
    expect(verifReproduire(spec, [[0, 0], [3, 0], [3, 2], [0, 2]])).toBe(false);
    expect(verifReproduire(spec, [[0, 0], [4, 0], [4, 2]])).toBe(false);
  });
  it("figure non rectangulaire (L) reproduite fidelement", () => {
    const l: ReproduireSpec = { model: [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]] };
    expect(verifReproduire(l, [[1, 1], [4, 1], [4, 2], [2, 2], [2, 3], [1, 3]])).toBe(true);
    expect(verifReproduire(l, [[0, 0], [3, 0], [3, 2], [0, 2]])).toBe(false);
  });
});

describe("items de programmation : l'arrivee a lire est coherente", () => {
  it("chaque item 'lire un programme' pointe l'arrivee simulee", () => {
    for (const i of BANQUE_GEOMETRIE.filter((x) => x.competence === "MA.REPERE.PROGRAMMER" && x.format === "clic")) {
      expect(i.figure.kind).toBe("grid");
      if (i.figure.kind !== "grid") continue;
      const g = i.figure.grid;
      const arr = simulerProgramme(
        { cols: g.cols, rows: g.rows, start: g.start!, dir: g.dir!, target: "A1", obstacles: g.obstacles ?? [] },
        g.program!,
      );
      expect(arr, i.cle).toBe(i.attendu);
    }
  });
  it("chaque item 'assembler un programme' a une solution d'exemple valide", () => {
    for (const i of BANQUE_GEOMETRIE.filter((x) => x.format === "programme")) {
      expect(estJusteGeometrie(i.cle, i.attendu), i.cle).toBe(true);
    }
  });
  it("chaque item 'construire' a un exemple de solution valide", () => {
    for (const i of BANQUE_GEOMETRIE.filter((x) => x.format === "construire")) {
      expect(estJusteGeometrie(i.cle, i.attendu), i.cle).toBe(true);
    }
  });
  it("chaque item 'reproduire' a un exemple de solution valide (translation)", () => {
    for (const i of BANQUE_GEOMETRIE.filter((x) => x.format === "reproduire")) {
      expect(estJusteGeometrie(i.cle, i.attendu), i.cle).toBe(true);
    }
  });
  it("equerre : la bonne selection de sommets est acceptee, une mauvaise refusee", () => {
    expect(estJusteGeometrie("geo-voc-n3-equerre", "A;B")).toBe(true);
    expect(estJusteGeometrie("geo-voc-n3-equerre", canonCells(["B", "A"]))).toBe(true);
    expect(estJusteGeometrie("geo-voc-n3-equerre", "A;B;C")).toBe(false);
  });
});

describe("juge local estJusteGeometrie", () => {
  it("miroir local pour quelques items", () => {
    expect(estJusteGeometrie("geo-fig-n1-carre", "un carré")).toBe(true);
    expect(estJusteGeometrie("geo-sym-n3-a", "C2;C3;D1;D4")).toBe(true);
    expect(estJusteGeometrie("geo-con-n3-rect53", JSON.stringify([[0, 0], [5, 0], [5, 3], [0, 3]]))).toBe(true);
    expect(estJusteGeometrie("geo-con-n3-rect53", JSON.stringify([[0, 0], [4, 0], [4, 3], [0, 3]]))).toBe(false);
    expect(estJusteGeometrie("geo-con-n3-rect53", "pas du json")).toBe(false);
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
    const a = generateExercise(source("MA.GEO.CONSTRUIRE", 3), 999);
    const b = generateExercise(source("MA.GEO.CONSTRUIRE", 3), 999);
    expect(a.geo!.cle).toBe(b.geo!.cle);
  });
});
