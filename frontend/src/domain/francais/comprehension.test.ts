// Tests de la banque « Comprendre un texte » (francais, CE2) et du generateur.
//
// Le nombre d'items (40) et les cles sont un GOLDEN : le test croise SQL
// (supabase/tests/comprehension_test.sql) verifie que public.comprehension_item
// porte EXACTEMENT les memes cles et le meme `attendu`. Si ce nombre change, il
// faut mettre a jour la migration ET le test SQL (sinon front != serveur).

import { describe, it, expect } from "vitest";
import {
  BANQUE_COMPREHENSION,
  COMPETENCES_LECTURE,
  SEP_ORDRE,
  itemsCompDe,
  itemCompParCle,
  estJusteComprehension,
  comparerComprehension,
  PREUVE_PAR_CLE,
  preuvePour,
} from "./comprehension";
import { normaliserMot } from "./dictee";
import { generateExercise } from "../calcul/generator";
import type { ExCalcul } from "../calcul/generator";

const NB_ITEMS_GOLDEN = 192;

function source(competence: string, niveau: number): ExCalcul {
  return {
    exerciceId: "00000000-0000-0000-0000-000000000000",
    competence,
    niveau,
    methode: "comprehension",
    operation: "lire",
    forme: "comprehension",
    params: {},
    support: null,
    correctionStrategie: null,
  };
}

describe("banque de comprehension : structure et couverture", () => {
  it("compte GOLDEN stable (miroir du test SQL)", () => {
    expect(BANQUE_COMPREHENSION.length).toBe(NB_ITEMS_GOLDEN);
  });

  it("cles uniques", () => {
    const cles = BANQUE_COMPREHENSION.map((i) => i.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("chaque competence a au moins un item a chaque niveau 1..4", () => {
    for (const c of COMPETENCES_LECTURE) {
      for (let n = 1; n <= 4; n++) {
        expect(itemsCompDe(c, n).length, `${c} N${n}`).toBeGreaterThan(0);
      }
    }
  });

  it("competence et niveau valides ; texte, consigne, attendu, explication non vides", () => {
    for (const i of BANQUE_COMPREHENSION) {
      expect(COMPETENCES_LECTURE).toContain(i.competence as (typeof COMPETENCES_LECTURE)[number]);
      expect(i.niveau).toBeGreaterThanOrEqual(1);
      expect(i.niveau).toBeLessThanOrEqual(4);
      expect(Array.isArray(i.texte) && i.texte.length).toBeGreaterThan(0);
      expect(i.texte.every((l) => l.trim().length > 0), `${i.cle} texte`).toBe(true);
      expect(i.consigne.trim().length).toBeGreaterThan(0);
      expect(i.attendu.trim().length).toBeGreaterThan(0);
      expect(i.explication.trim().length).toBeGreaterThan(0);
      if (i.format === "qcm") {
        expect(i.options, `${i.cle} doit avoir des options`).toBeTruthy();
        expect(i.options).toContain(i.attendu);
      }
    }
  });

  it("niveau 1 = QCM, niveau 4 = reponse libre (texte, clic ou ordre)", () => {
    for (const i of BANQUE_COMPREHENSION) {
      if (i.niveau === 1) expect(i.format, i.cle).toBe("qcm");
      if (i.niveau === 4) expect(["texte", "clic", "ordre"], i.cle).toContain(i.format);
    }
  });

  it("consignes et explications redigees pour l'oral (aucun symbole ni fleche)", () => {
    const interdits = /[→←%<>=×÷*\/]/;
    for (const i of BANQUE_COMPREHENSION) {
      expect(interdits.test(i.consigne), `${i.cle} consigne`).toBe(false);
      expect(interdits.test(i.explication), `${i.cle} explication`).toBe(false);
    }
  });

  it("aucune donnee de calendrier (ni jour de la semaine, ni mois, ni date chiffree)", () => {
    const calendrier =
      /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b|\b\d{1,2}[\/-]\d{1,2}\b/i;
    for (const i of BANQUE_COMPREHENSION) {
      const tout = [...i.texte, i.consigne, i.explication, ...(i.options ?? []), ...(i.evenements ?? [])].join(" ");
      expect(calendrier.test(tout), `${i.cle} contient du calendrier`).toBe(false);
    }
  });

  it("preuve (correctif phase 5) : chaque item a une preuve = phrase EXACTE du texte", () => {
    for (const i of BANQUE_COMPREHENSION) {
      const preuve = PREUVE_PAR_CLE[i.cle];
      expect(preuve, `${i.cle} doit avoir une preuve`).toBeTruthy();
      expect(i.texte, `${i.cle} : preuve absente du texte`).toContain(preuve);
    }
  });

  it("preuvePour : repli sur la 1re phrase si la cle est inconnue", () => {
    expect(preuvePour("lec-info-n1-a")).toBe("Le chat s'appelle Mistigri.");
    expect(preuvePour("cle-inexistante")).toBe("");
  });

  it("au moins 30 textes differents (banque riche)", () => {
    const textes = new Set(BANQUE_COMPREHENSION.map((i) => i.texte.join(" ")));
    expect(textes.size).toBeGreaterThanOrEqual(30);
  });

  it("clic : le mot attendu apparait vraiment dans le texte", () => {
    const clics = BANQUE_COMPREHENSION.filter((i) => i.format === "clic");
    expect(clics.length).toBeGreaterThan(0);
    for (const i of clics) {
      const mots = i.texte.join(" ").split(/\s+/).map(normaliserMot);
      expect(mots, `${i.cle} : « ${i.attendu} » absent du texte`).toContain(normaliserMot(i.attendu));
    }
  });

  it("ordre : la reponse attendue est une remise en ordre des evenements affiches", () => {
    const ordres = BANQUE_COMPREHENSION.filter((i) => i.format === "ordre");
    expect(ordres.length).toBeGreaterThan(0);
    for (const i of ordres) {
      expect(i.evenements, `${i.cle} doit porter des evenements`).toBeTruthy();
      const ev = i.evenements!;
      expect(ev.length, `${i.cle}`).toBeGreaterThanOrEqual(2);
      expect(ev.length, `${i.cle}`).toBeLessThanOrEqual(3);
      const bonOrdre = i.attendu.split(SEP_ORDRE);
      // Memes evenements, un ordre d'affichage different (il y a quelque chose a faire).
      expect([...bonOrdre].sort(), `${i.cle} memes evenements`).toEqual([...ev].sort());
      expect(bonOrdre, `${i.cle} affichage deja range`).not.toEqual(ev);
    }
  });
});

describe("comparaison miroir du serveur", () => {
  it("qcm : casse ignoree, accents gardes", () => {
    expect(comparerComprehension("qcm", "Vrai", "vrai")).toBe(true);
    expect(comparerComprehension("qcm", "faux", "vrai")).toBe(false);
  });
  it("texte : mot exact, accents exiges", () => {
    expect(comparerComprehension("texte", "Verte", "verte")).toBe(true);
    expect(comparerComprehension("texte", "vert", "verte")).toBe(false);
  });
  it("clic : mot tolerant a la casse et a la ponctuation, accents exiges", () => {
    expect(comparerComprehension("clic", "Coffre.", "coffre")).toBe(true);
    expect(comparerComprehension("clic", "tempete", "tempête")).toBe(false);
  });
  it("ordre : espaces ignores, suite exacte", () => {
    expect(comparerComprehension("ordre", "a | b", "a|b")).toBe(true);
    expect(comparerComprehension("ordre", "b|a", "a|b")).toBe(false);
  });
  it("estJusteComprehension : miroir local pour quelques items", () => {
    expect(estJusteComprehension("lec-info-n1-a", "Mistigri")).toBe(true);
    expect(estJusteComprehension("lec-info-n4-b", "Biscuit")).toBe(true);
    expect(estJusteComprehension("lec-vf-n1-b", "faux")).toBe(true);
    expect(estJusteComprehension("lec-sens-n4-a", "tempête")).toBe(true);
    expect(estJusteComprehension("cle-bidon", "x")).toBe(false);
  });
});

describe("generateur de comprehension", () => {
  it("produit un exercice de lecture coherent (saisie, op, cle de l'item)", () => {
    for (const c of COMPETENCES_LECTURE) {
      for (let n = 1; n <= 4; n++) {
        const ex = generateExercise(source(c, n), 13579 + n);
        expect(ex.saisie, `${c} N${n}`).toBe("comprehension");
        expect(ex.verif.op).toBe("lire");
        expect(ex.comp, `${c} N${n} doit porter un item`).toBeTruthy();
        const item = itemCompParCle(ex.comp!.cle);
        expect(item, `item ${ex.comp!.cle} doit exister`).toBeTruthy();
        expect(item!.competence).toBe(c);
        expect(item!.niveau).toBe(n);
        expect(ex.verif.cle).toBe(ex.comp!.cle);
        expect(item!.texte, `${c} N${n} preuve`).toContain(ex.comp!.preuve);
      }
    }
  });

  it("reproductible pour une meme graine", () => {
    const a = generateExercise(source("FR.LECTURE.INFO", 2), 999);
    const b = generateExercise(source("FR.LECTURE.INFO", 2), 999);
    expect(a.comp!.cle).toBe(b.comp!.cle);
  });
});
