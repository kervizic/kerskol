// Golden deterministe « Sciences et technologie » (ST, CM1). Verifie :
//   * la banque (couverture competence x niveau, cles uniques, totaux) ;
//   * les comparateurs MIROIR du serveur (qcm / ordre / tri / texte) ;
//   * un spot-check (cle, format, attendu) CROISE avec supabase/tests/sciences_test.sql
//     (meme table de valeurs des deux cotes) ;
//   * le garde-fou de contenu (consigne / attendu / explication non vides, qcm a
//     au moins deux options et attendu present dans les options).

import { describe, it, expect } from "vitest";
import {
  BANQUE_SCIENCES,
  COMPETENCES_SCIENCES,
  itemsSciencesDe,
  estJusteSciences,
  itemSciencesParCle,
} from "./index";

describe("banque Sciences — totaux et couverture", () => {
  it("48 items (6 competences x 4 niveaux x 2), cles uniques", () => {
    expect(BANQUE_SCIENCES.length).toBe(48);
    expect(COMPETENCES_SCIENCES.length).toBe(6);
    const cles = new Set(BANQUE_SCIENCES.map((i) => i.cle));
    expect(cles.size).toBe(BANQUE_SCIENCES.length);
  });

  it("couverture des 6 competences x niveaux (2 items par niveau)", () => {
    for (const c of COMPETENCES_SCIENCES) {
      for (let n = 1; n <= 4; n++) expect(itemsSciencesDe(c, n).length, `${c} N${n}`).toBe(2);
    }
  });

  it("les competences ST sont bien prefixees ST.", () => {
    for (const c of COMPETENCES_SCIENCES) expect(c.startsWith("ST.")).toBe(true);
  });
});

describe("banque Sciences — qualite et formats", () => {
  it("chaque item a une consigne, un attendu non vide et une explication", () => {
    for (const i of BANQUE_SCIENCES) {
      expect(i.consigne.trim().length, i.cle).toBeGreaterThan(0);
      expect(i.attendu.trim().length, i.cle).toBeGreaterThan(0);
      expect(i.explication.trim().length, i.cle).toBeGreaterThan(0);
      if (i.format === "qcm") {
        expect((i.options ?? []).length, i.cle).toBeGreaterThanOrEqual(2);
        expect(i.options, i.cle).toContain(i.attendu);
      }
      if (i.format === "tri") {
        expect((i.options ?? []).length, i.cle).toBeGreaterThanOrEqual(2);
        expect((i.bins ?? []).length, i.cle).toBeGreaterThanOrEqual(2);
      }
      if (i.format === "ordre") expect((i.options ?? []).length, i.cle).toBeGreaterThanOrEqual(2);
    }
  });

  it("formats autorises (qcm / tri / ordre / texte)", () => {
    for (const i of BANQUE_SCIENCES) {
      expect(["qcm", "tri", "ordre", "texte"], i.cle).toContain(i.format);
    }
  });

  it("bienveillance : pas de vocabulaire de predation detaille", () => {
    const interdits = /\b(tue|tuer|dévore|devore|dévorer|massacre|sang)\b/i;
    for (const i of BANQUE_SCIENCES) {
      expect(interdits.test(i.consigne), `consigne ${i.cle}`).toBe(false);
      expect(interdits.test(i.explication), `explication ${i.cle}`).toBe(false);
    }
  });
});

describe("estJusteSciences / itemSciencesParCle", () => {
  it("juge une bonne et une mauvaise reponse (qcm)", () => {
    expect(estJusteSciences("st-ter-n1-b", "le système solaire")).toBe(true);
    expect(estJusteSciences("st-ter-n1-b", "la forêt")).toBe(false);
    expect(estJusteSciences("cle-bidon", "x")).toBe(false);
  });
  it("texte : accents EXIGES", () => {
    expect(estJusteSciences("st-ene-n4-a", "électricité")).toBe(true);
    expect(estJusteSciences("st-ene-n4-a", "electricite")).toBe(false);
  });
  it("ordre : la bonne suite acceptee, une mauvaise refusee", () => {
    const it2 = itemSciencesParCle("st-cor-n3-a")!;
    expect(estJusteSciences(it2.cle, it2.attendu)).toBe(true);
    expect(estJusteSciences(it2.cle, "l'intestin>l'estomac>la bouche")).toBe(false);
  });
});

// ===========================================================================
// SPOT-CHECK CROISE : ces triplets (cle, format, attendu) DOIVENT etre
// identiques cote SQL (supabase/tests/sciences_test.sql). Si tu modifies un
// item, mets a jour les DEUX fichiers.
// ===========================================================================
describe("spot-check croise front <-> SQL", () => {
  const SPOT: Array<[string, string, string]> = [
    ["st-mat-n2-a", "tri", "un glaçon=solide;le jus d'orange=liquide;l'air du ballon=gaz"],
    ["st-mat-n4-a", "texte", "fonte"],
    ["st-viv-n3-b", "ordre", "l'herbe>la sauterelle>la grenouille"],
    ["st-viv-n4-b", "texte", "carnivore"],
    ["st-cor-n3-a", "ordre", "la bouche>l'estomac>l'intestin"],
    ["st-ene-n2-a", "tri", "le soleil=renouvelable;le vent=renouvelable;le pétrole=s'épuise;le charbon=s'épuise"],
    ["st-obj-n2-a", "tri", "le stylo=pour écrire;les ciseaux=pour couper;la règle=pour mesurer"],
    ["st-obj-n3-a", "ordre", "la bougie>la lampe à huile>l'ampoule électrique"],
    ["st-ter-n1-b", "qcm", "le système solaire"],
    ["st-ter-n4-a", "texte", "Soleil"],
  ];
  it("chaque triplet correspond a la banque", () => {
    for (const [cle, format, attendu] of SPOT) {
      const item = itemSciencesParCle(cle);
      expect(item, cle).toBeDefined();
      expect(item!.format, cle).toBe(format);
      expect(item!.attendu, cle).toBe(attendu);
    }
  });
});
