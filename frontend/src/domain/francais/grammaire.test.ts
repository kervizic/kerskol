// Tests de la banque de GRAMMAIRE (francais, CE2) et du generateur associe.
//
// Le nombre d'items (55) et les cles sont un GOLDEN : le test croise SQL
// (supabase/tests/grammaire_test.sql) verifie que public.grammaire_item porte
// EXACTEMENT les memes cles et le meme `attendu`. Si ce nombre change, il faut
// mettre a jour la migration ET le test SQL (sinon front != serveur).

import { describe, it, expect } from "vitest";
import {
  BANQUE_GRAMMAIRE,
  COMPETENCES_GRAMMAIRE,
  itemsDe,
  itemParCle,
  estJusteGrammaire,
  comparerGrammaire,
} from "./grammaire";
import { normaliserMot } from "./dictee";
import { generateExercise } from "../calcul/generator";
import type { ExCalcul } from "../calcul/generator";

const NB_ITEMS_GOLDEN = 198;

function source(competence: string, niveau: number): ExCalcul {
  return {
    exerciceId: "00000000-0000-0000-0000-000000000000",
    competence,
    niveau,
    methode: "nature_mots",
    operation: "gram",
    forme: "grammaire",
    params: {},
    support: null,
    correctionStrategie: null,
  };
}

describe("banque de grammaire : structure et couverture", () => {
  it("compte GOLDEN stable (miroir du test SQL)", () => {
    expect(BANQUE_GRAMMAIRE.length).toBe(NB_ITEMS_GOLDEN);
  });

  it("cles uniques", () => {
    const cles = BANQUE_GRAMMAIRE.map((i) => i.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("chaque competence a au moins un item a chaque niveau 1..4", () => {
    for (const c of COMPETENCES_GRAMMAIRE) {
      for (let n = 1; n <= 4; n++) {
        expect(itemsDe(c, n).length, `${c} N${n}`).toBeGreaterThan(0);
      }
    }
  });

  it("competence et niveau valides, consigne et explication non vides", () => {
    for (const i of BANQUE_GRAMMAIRE) {
      expect(COMPETENCES_GRAMMAIRE).toContain(i.competence as (typeof COMPETENCES_GRAMMAIRE)[number]);
      expect(i.niveau).toBeGreaterThanOrEqual(1);
      expect(i.niveau).toBeLessThanOrEqual(4);
      expect(i.consigne.trim().length).toBeGreaterThan(0);
      expect(i.explication.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("coherence des formats", () => {
  it("qcm : au moins 2 options, et `attendu` figure parmi elles", () => {
    for (const i of BANQUE_GRAMMAIRE.filter((x) => x.format === "qcm")) {
      expect(i.options, i.cle).toBeDefined();
      expect(i.options!.length, i.cle).toBeGreaterThanOrEqual(2);
      const trouve = i.options!.some((o) => comparerGrammaire("qcm", o, i.attendu));
      expect(trouve, `${i.cle} : attendu absent des options`).toBe(true);
    }
  });

  it("clic : `attendu` est bien l'un des mots cliquables de la phrase", () => {
    for (const i of BANQUE_GRAMMAIRE.filter((x) => x.format === "clic")) {
      const tokens = i.phrase.split(/\s+/).filter(Boolean);
      const cible = normaliserMot(i.attendu);
      const trouve = tokens.some((t) => normaliserMot(t) === cible);
      expect(trouve, `${i.cle} : « ${i.attendu} » introuvable dans « ${i.phrase} »`).toBe(true);
    }
  });

  it("texte : une phrase est affichee et `attendu` apparait dedans", () => {
    for (const i of BANQUE_GRAMMAIRE.filter((x) => x.format === "texte")) {
      expect(i.phrase.trim().length, i.cle).toBeGreaterThan(0);
      const tokens = i.phrase.split(/\s+/).filter(Boolean);
      const cible = normaliserMot(i.attendu);
      expect(tokens.some((t) => normaliserMot(t) === cible), i.cle).toBe(true);
    }
  });
});

describe("estJusteGrammaire : le juge local (miroir du serveur)", () => {
  it("accepte la bonne reponse pour chaque item", () => {
    for (const i of BANQUE_GRAMMAIRE) {
      expect(estJusteGrammaire(i.cle, i.attendu), i.cle).toBe(true);
    }
  });

  it("tolere la casse et les espaces (clic sur « Le » = « le »)", () => {
    expect(estJusteGrammaire("nature-n2-determinant", "  Le ")).toBe(true);
    expect(estJusteGrammaire("nature-n2-verbe", "CHANTE")).toBe(true);
  });

  it("refuse une mauvaise reponse", () => {
    expect(estJusteGrammaire("nature-n2-verbe", "fille")).toBe(false);
    expect(estJusteGrammaire("ponct-n1-interro", ".")).toBe(false);
  });

  it("exige les accents (television n'est pas television)", () => {
    expect(estJusteGrammaire("nature-n3-nom", "television")).toBe(false);
    expect(estJusteGrammaire("nature-n3-nom", "télévision")).toBe(true);
  });

  it("cle inconnue -> faux", () => {
    expect(estJusteGrammaire("cle-bidon", "chat")).toBe(false);
    expect(itemParCle("cle-bidon")).toBeUndefined();
  });
});

describe("generateExercise : FR.GRAM.* produit un exercice grammaire valide", () => {
  it("saisie 'grammaire', gram defini, verif op 'gram' coherent, item du bon niveau", () => {
    for (const c of COMPETENCES_GRAMMAIRE) {
      for (let n = 1; n <= 4; n++) {
        for (let seed = 1; seed <= 20; seed++) {
          const g = generateExercise(source(c, n), seed * 101 + n);
          expect(g.saisie).toBe("grammaire");
          expect(g.gram, `${c} N${n}`).toBeDefined();
          expect(g.verif.op).toBe("gram");
          expect(g.verif.cle).toBe(g.gram!.cle);
          const item = itemParCle(g.gram!.cle)!;
          expect(item.competence).toBe(c);
          expect(item.niveau).toBe(n);
        }
      }
    }
  });

  it("meme graine -> meme item (reproductible)", () => {
    const a = generateExercise(source("FR.GRAM.NATURE", 2), 777);
    const b = generateExercise(source("FR.GRAM.NATURE", 2), 777);
    expect(a.gram!.cle).toBe(b.gram!.cle);
  });
});
