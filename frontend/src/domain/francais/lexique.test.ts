// Tests de la banque de VOCABULAIRE + MOTS A SAVOIR (francais, CE2) et du
// generateur associe.
//
// Le nombre d'items (120) et les cles sont un GOLDEN : le test croise SQL
// (supabase/tests/lexique_test.sql) verifie que public.lexique_item porte
// EXACTEMENT les memes cles et le meme `attendu`. Si ce nombre change, il faut
// mettre a jour la migration ET le test SQL (sinon front != serveur).

import { describe, it, expect } from "vitest";
import {
  BANQUE_LEXIQUE,
  BANQUE_VOCABULAIRE,
  BANQUE_MOTS,
  COMPETENCES_VOCABULAIRE,
  COMPETENCES_MOTS,
  itemsLexiqueDe,
  itemLexiqueParCle,
  estJusteLexique,
  comparerLexique,
} from "./lexique";
import { normaliserMot } from "./dictee";
import { generateExercise } from "../calcul/generator";
import type { ExCalcul } from "../calcul/generator";

const NB_ITEMS_GOLDEN = 152;
const COMPS = [...COMPETENCES_VOCABULAIRE, ...COMPETENCES_MOTS];

function source(competence: string, niveau: number): ExCalcul {
  return {
    exerciceId: "00000000-0000-0000-0000-000000000000",
    competence,
    niveau,
    methode: "vocabulaire",
    operation: "lex",
    forme: "grammaire",
    params: {},
    support: null,
    correctionStrategie: null,
  };
}

describe("banque de lexique : structure et couverture", () => {
  it("compte GOLDEN stable (miroir du test SQL)", () => {
    expect(BANQUE_LEXIQUE.length).toBe(NB_ITEMS_GOLDEN);
    expect(BANQUE_VOCABULAIRE.length + BANQUE_MOTS.length).toBe(NB_ITEMS_GOLDEN);
  });

  it("cles uniques", () => {
    const cles = BANQUE_LEXIQUE.map((i) => i.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("chaque competence a au moins un item a chaque niveau 1..4", () => {
    for (const c of COMPS) {
      for (let n = 1; n <= 4; n++) {
        expect(itemsLexiqueDe(c, n).length, `${c} N${n}`).toBeGreaterThan(0);
      }
    }
  });

  it("competence connue, niveau valide, consigne et explication non vides", () => {
    for (const i of BANQUE_LEXIQUE) {
      expect(COMPS).toContain(i.competence as (typeof COMPS)[number]);
      expect(i.niveau).toBeGreaterThanOrEqual(1);
      expect(i.niveau).toBeLessThanOrEqual(4);
      expect(i.consigne.trim().length).toBeGreaterThan(0);
      expect(i.explication.trim().length).toBeGreaterThan(0);
    }
  });

  it("N4 est toujours une reponse libre (texte) ; N1 est toujours un QCM", () => {
    for (const i of BANQUE_LEXIQUE) {
      if (i.niveau === 4) expect(i.format, i.cle).toBe("texte");
      if (i.niveau === 1) expect(i.format, i.cle).toBe("qcm");
    }
  });
});

describe("coherence des formats", () => {
  it("qcm : au moins 2 options, et `attendu` figure parmi elles", () => {
    for (const i of BANQUE_LEXIQUE.filter((x) => x.format === "qcm")) {
      expect(i.options, i.cle).toBeDefined();
      expect(i.options!.length, i.cle).toBeGreaterThanOrEqual(2);
      const trouve = i.options!.some((o) => comparerLexique("qcm", o, i.attendu));
      expect(trouve, `${i.cle} : attendu absent des options`).toBe(true);
    }
  });

  it("qcm : les options ne se confondent pas apres normalisation", () => {
    for (const i of BANQUE_LEXIQUE.filter((x) => x.format === "qcm")) {
      const norm = i.options!.map((o) => o.toLowerCase().trim());
      expect(new Set(norm).size, `${i.cle} : options en double`).toBe(norm.length);
    }
  });

  it("clic : `attendu` est bien l'un des mots cliquables de la phrase", () => {
    for (const i of BANQUE_LEXIQUE.filter((x) => x.format === "clic")) {
      const tokens = i.phrase.split(/\s+/).filter(Boolean);
      const cible = normaliserMot(i.attendu);
      const trouve = tokens.some((t) => normaliserMot(t) === cible);
      expect(trouve, `${i.cle} : « ${i.attendu} » introuvable dans « ${i.phrase} »`).toBe(true);
    }
  });

  it("texte : une phrase est affichee et `attendu` n'est pas vide", () => {
    for (const i of BANQUE_LEXIQUE.filter((x) => x.format === "texte")) {
      expect(i.phrase.trim().length, i.cle).toBeGreaterThan(0);
      expect(i.attendu.trim().length, i.cle).toBeGreaterThan(0);
    }
  });
});

describe("estJusteLexique : le juge local (miroir du serveur)", () => {
  it("accepte la bonne reponse pour chaque item", () => {
    for (const i of BANQUE_LEXIQUE) {
      expect(estJusteLexique(i.cle, i.attendu), i.cle).toBe(true);
    }
  });

  it("tolere la casse et les espaces", () => {
    expect(estJusteLexique("voc-alpha-n2-1", "  Chat ")).toBe(true);
    expect(estJusteLexique("mots-n1-beaucoup", "BEAUCOUP")).toBe(true);
  });

  it("refuse une mauvaise reponse", () => {
    expect(estJusteLexique("mots-n1-beaucoup", "bocoup")).toBe(false);
    expect(estJusteLexique("voc-cat-n3-1", "pomme")).toBe(false);
  });

  it("exige les accents (deja n'est pas déjà)", () => {
    expect(estJusteLexique("mots-n3-deja", "deja")).toBe(false);
    expect(estJusteLexique("mots-n3-deja", "déjà")).toBe(true);
  });

  it("cle inconnue -> faux", () => {
    expect(estJusteLexique("cle-bidon", "arbre")).toBe(false);
    expect(itemLexiqueParCle("cle-bidon")).toBeUndefined();
  });
});

describe("generateExercise : FR.VOC.* et FR.MOTS.* produisent un exercice lexique", () => {
  it("saisie 'grammaire', gram defini, verif op 'lex' coherent, item du bon niveau", () => {
    for (const c of COMPS) {
      for (let n = 1; n <= 4; n++) {
        for (let seed = 1; seed <= 20; seed++) {
          const g = generateExercise(source(c, n), seed * 101 + n);
          expect(g.saisie).toBe("grammaire");
          expect(g.gram, `${c} N${n}`).toBeDefined();
          expect(g.verif.op).toBe("lex");
          expect(g.verif.cle).toBe(g.gram!.cle);
          const item = itemLexiqueParCle(g.gram!.cle)!;
          expect(item.competence).toBe(c);
          expect(item.niveau).toBe(n);
        }
      }
    }
  });

  it("meme graine -> meme item (reproductible)", () => {
    const a = generateExercise(source("FR.VOC.ALPHABET", 2), 777);
    const b = generateExercise(source("FR.VOC.ALPHABET", 2), 777);
    expect(a.gram!.cle).toBe(b.gram!.cle);
  });
});
