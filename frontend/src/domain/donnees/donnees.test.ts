// Tests de la banque « Tableaux et graphiques » (maths, CE2) et du generateur.
//
// Le nombre d'items (40) et les cles sont un GOLDEN : le test croise SQL
// (supabase/tests/donnees_test.sql) verifie que public.donnees_item porte
// EXACTEMENT les memes cles et le meme `attendu`. Si ce nombre change, il faut
// mettre a jour la migration ET le test SQL (sinon front != serveur).

import { describe, it, expect } from "vitest";
import {
  BANQUE_DONNEES,
  COMPETENCES_DONNEES,
  itemsDonDe,
  itemDonParCle,
  estJusteDonnees,
  comparerDonnees,
} from "./donnees";
import { generateExercise } from "../calcul/generator";
import type { ExCalcul } from "../calcul/generator";

const NB_ITEMS_GOLDEN = 40;

function source(competence: string, niveau: number): ExCalcul {
  return {
    exerciceId: "00000000-0000-0000-0000-000000000000",
    competence,
    niveau,
    methode: "donnees",
    operation: "don",
    forme: "donnees",
    params: {},
    support: null,
    correctionStrategie: null,
  };
}

describe("banque de donnees : structure et couverture", () => {
  it("compte GOLDEN stable (miroir du test SQL)", () => {
    expect(BANQUE_DONNEES.length).toBe(NB_ITEMS_GOLDEN);
  });

  it("cles uniques", () => {
    const cles = BANQUE_DONNEES.map((i) => i.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("chaque competence a au moins un item a chaque niveau 1..4", () => {
    for (const c of COMPETENCES_DONNEES) {
      for (let n = 1; n <= 4; n++) {
        expect(itemsDonDe(c, n).length, `${c} N${n}`).toBeGreaterThan(0);
      }
    }
  });

  it("competence et niveau valides, consigne / attendu / explication non vides, figure presente", () => {
    for (const i of BANQUE_DONNEES) {
      expect(COMPETENCES_DONNEES).toContain(i.competence as (typeof COMPETENCES_DONNEES)[number]);
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
    for (const i of BANQUE_DONNEES) {
      if (i.niveau === 1) expect(i.format, i.cle).toBe("qcm");
      if (i.niveau === 4) expect(["texte", "grille"], i.cle).toContain(i.format);
    }
  });

  it("consignes redigees pour l'oral (aucun symbole ni fleche)", () => {
    const interdits = /[→←%<>=×÷*\/]/;
    for (const i of BANQUE_DONNEES) {
      expect(interdits.test(i.consigne), `${i.cle} consigne`).toBe(false);
      expect(interdits.test(i.explication), `${i.cle} explication`).toBe(false);
    }
  });

  it("une barre a regler (grille/bar) existe pour « regler une barre »", () => {
    const reglages = BANQUE_DONNEES.filter(
      (i) => i.format === "grille" && i.interact === "bar" && i.figure.kind === "bars",
    );
    expect(reglages.length).toBeGreaterThan(0);
  });

  it("cle de barre a regler presente dans les categories (coherence figure)", () => {
    for (const i of BANQUE_DONNEES) {
      const fig = i.figure;
      if (fig.kind === "bars" && fig.blank != null) {
        const cat = fig.cats.find((c) => c.label === fig.blank);
        expect(cat, `${i.cle} blank doit exister`).toBeTruthy();
        // La vraie valeur de la barre a regler est la reponse attendue.
        expect(String(cat!.value)).toBe(i.attendu);
      }
    }
  });
});

describe("comparaison miroir du serveur", () => {
  it("qcm : casse ignoree, accents gardes", () => {
    expect(comparerDonnees("qcm", "Des Poires", "des poires")).toBe(true);
    expect(comparerDonnees("qcm", "des pommes", "des poires")).toBe(false);
  });
  it("texte : nombre exact", () => {
    expect(comparerDonnees("texte", "10", "10")).toBe(true);
    expect(comparerDonnees("texte", "9", "10")).toBe(false);
  });
  it("clic : libelle tolerant a la casse, accents exiges", () => {
    expect(comparerDonnees("clic", "zoé", "Zoé")).toBe(true);
    expect(comparerDonnees("clic", "zoe", "Zoé")).toBe(false);
  });
  it("grille (reglage) : espaces ignores", () => {
    expect(comparerDonnees("grille", " 5 ", "5")).toBe(true);
    expect(comparerDonnees("grille", "6", "5")).toBe(false);
  });
  it("estJusteDonnees : miroir local pour quelques items", () => {
    expect(estJusteDonnees("don-tab-n1-a", "3")).toBe(true);
    expect(estJusteDonnees("don-bar-n3-a", "5")).toBe(true);
    expect(estJusteDonnees("don-cmp-n1-b", "des poires")).toBe(true);
    expect(estJusteDonnees("cle-bidon", "x")).toBe(false);
  });
});

describe("generateur de donnees", () => {
  it("produit un exercice don coherent (saisie, op, cle de l'item)", () => {
    for (const c of COMPETENCES_DONNEES) {
      for (let n = 1; n <= 4; n++) {
        const ex = generateExercise(source(c, n), 54321 + n);
        expect(ex.saisie, `${c} N${n}`).toBe("donnees");
        expect(ex.verif.op).toBe("don");
        expect(ex.don, `${c} N${n} doit porter un item`).toBeTruthy();
        const item = itemDonParCle(ex.don!.cle);
        expect(item, `item ${ex.don!.cle} doit exister`).toBeTruthy();
        expect(item!.competence).toBe(c);
        expect(item!.niveau).toBe(n);
        expect(ex.verif.cle).toBe(ex.don!.cle);
      }
    }
  });

  it("reproductible pour une meme graine", () => {
    const a = generateExercise(source("MA.DONNEES.TABLEAU", 2), 777);
    const b = generateExercise(source("MA.DONNEES.TABLEAU", 2), 777);
    expect(a.don!.cle).toBe(b.don!.cle);
  });
});
