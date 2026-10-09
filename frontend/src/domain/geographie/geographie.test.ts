// Golden deterministe « Geographie et technologie » (ST, CM1). Verifie :
//   * la banque (couverture competence x niveau, cles uniques, totaux) ;
//   * les comparateurs MIROIR du serveur (qcm / ordre / tri / texte) ;
//   * un spot-check (cle, format, attendu) CROISE avec supabase/tests/geographie_test.sql
//     (meme table de valeurs des deux cotes) ;
//   * le garde-fou de contenu (consigne / attendu / explication non vides, qcm a
//     au moins deux options et attendu present dans les options).

import { describe, it, expect } from "vitest";
import {
  BANQUE_GEOGRAPHIE,
  COMPETENCES_GEOGRAPHIE,
  itemsGeographieDe,
  estJusteGeographie,
  itemGeographieParCle,
} from "./index";

describe("banque Geographie — totaux et couverture", () => {
  it("48 items (6 competences x 4 niveaux x 2), cles uniques", () => {
    expect(BANQUE_GEOGRAPHIE.length).toBe(48);
    expect(COMPETENCES_GEOGRAPHIE.length).toBe(6);
    const cles = new Set(BANQUE_GEOGRAPHIE.map((i) => i.cle));
    expect(cles.size).toBe(BANQUE_GEOGRAPHIE.length);
  });

  it("couverture des 6 competences x niveaux (2 items par niveau)", () => {
    for (const c of COMPETENCES_GEOGRAPHIE) {
      for (let n = 1; n <= 4; n++) expect(itemsGeographieDe(c, n).length, `${c} N${n}`).toBe(2);
    }
  });

  it("les competences GEO sont bien prefixees GEO.", () => {
    for (const c of COMPETENCES_GEOGRAPHIE) expect(c.startsWith("GEO.")).toBe(true);
  });
});

describe("banque Geographie — qualite et formats", () => {
  it("chaque item a une consigne, un attendu non vide et une explication", () => {
    for (const i of BANQUE_GEOGRAPHIE) {
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
    for (const i of BANQUE_GEOGRAPHIE) {
      expect(["qcm", "tri", "ordre", "texte"], i.cle).toContain(i.format);
    }
  });

  it("bienveillance : pas de vocabulaire de predation detaille", () => {
    const interdits = /\b(tue|tuer|dévore|devore|dévorer|massacre|sang)\b/i;
    for (const i of BANQUE_GEOGRAPHIE) {
      expect(interdits.test(i.consigne), `consigne ${i.cle}`).toBe(false);
      expect(interdits.test(i.explication), `explication ${i.cle}`).toBe(false);
    }
  });
});

describe("estJusteGeographie / itemGeographieParCle", () => {
  it("juge une bonne et une mauvaise reponse (qcm)", () => {
    expect(estJusteGeographie("ge-fra-n1-a", "la Seine")).toBe(true);
    expect(estJusteGeographie("ge-fra-n1-a", "la Loire")).toBe(false);
    expect(estJusteGeographie("cle-bidon", "x")).toBe(false);
  });
  it("texte : accents EXIGES", () => {
    expect(estJusteGeographie("ge-pay-n4-a", "forêt")).toBe(true);
    expect(estJusteGeographie("ge-pay-n4-a", "foret")).toBe(false);
  });
  it("tri : le bon classement accepte, un mauvais refuse", () => {
    const it2 = itemGeographieParCle("ge-fra-n2-a")!;
    expect(estJusteGeographie(it2.cle, it2.attendu)).toBe(true);
    expect(
      estJusteGeographie(
        it2.cle,
        "la Loire=une montagne;la Garonne=un fleuve;les Pyrénées=une montagne;le Massif central=une montagne",
      ),
    ).toBe(false);
  });
});

// ===========================================================================
// SPOT-CHECK CROISE : ces triplets (cle, format, attendu) DOIVENT etre
// identiques cote SQL (supabase/tests/geographie_test.sql). Si tu modifies un
// item, mets a jour les DEUX fichiers.
// ===========================================================================
describe("spot-check croise front <-> SQL", () => {
  const SPOT: Array<[string, string, string]> = [
    ["ge-rep-n3-a", "tri", "la légende=sur une carte;l'échelle=sur une carte;le titre=sur une carte;une recette de gâteau=pas sur une carte"],
    ["ge-rep-n4-a", "texte", "ouest"],
    ["ge-hab-n2-a", "tri", "un grand immeuble=la ville;beaucoup de magasins=la ville;un champ de blé=la campagne;une ferme=la campagne"],
    ["ge-act-n2-a", "tri", "une usine=travail;un parc d'attractions=loisir;un musée=culture"],
    ["ge-con-n2-b", "tri", "le blé=du champ;les légumes=du champ;le lait=de l'élevage;les œufs=de l'élevage"],
    ["ge-fra-n1-a", "qcm", "la Seine"],
    ["ge-fra-n2-a", "tri", "la Loire=un fleuve;la Garonne=un fleuve;les Pyrénées=une montagne;le Massif central=une montagne"],
    ["ge-fra-n3-b", "tri", "l'océan Atlantique=au nord ou à l'ouest;la Manche=au nord ou à l'ouest;la mer Méditerranée=au sud"],
    ["ge-pay-n3-a", "tri", "faire du ski=à la montagne;se baigner dans la mer=au bord de mer;visiter une ferme=à la campagne"],
    ["ge-con-n4-b", "texte", "court"],
  ];
  it("chaque triplet correspond a la banque", () => {
    for (const [cle, format, attendu] of SPOT) {
      const item = itemGeographieParCle(cle);
      expect(item, cle).toBeDefined();
      expect(item!.format, cle).toBe(format);
      expect(item!.attendu, cle).toBe(attendu);
    }
  });
});
