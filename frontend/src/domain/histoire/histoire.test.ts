// Golden deterministe « Histoire et technologie » (ST, CM1). Verifie :
//   * la banque (couverture competence x niveau, cles uniques, totaux) ;
//   * les comparateurs MIROIR du serveur (qcm / ordre / tri / texte) ;
//   * un spot-check (cle, format, attendu) CROISE avec supabase/tests/histoire_test.sql
//     (meme table de valeurs des deux cotes) ;
//   * le garde-fou de contenu (consigne / attendu / explication non vides, qcm a
//     au moins deux options et attendu present dans les options).

import { describe, it, expect } from "vitest";
import {
  BANQUE_HISTOIRE,
  COMPETENCES_HISTOIRE,
  itemsHistoireDe,
  estJusteHistoire,
  itemHistoireParCle,
} from "./index";

describe("banque Histoire — totaux et couverture", () => {
  it("48 items (6 competences x 4 niveaux x 2), cles uniques", () => {
    expect(BANQUE_HISTOIRE.length).toBe(48);
    expect(COMPETENCES_HISTOIRE.length).toBe(6);
    const cles = new Set(BANQUE_HISTOIRE.map((i) => i.cle));
    expect(cles.size).toBe(BANQUE_HISTOIRE.length);
  });

  it("couverture des 6 competences x niveaux (2 items par niveau)", () => {
    for (const c of COMPETENCES_HISTOIRE) {
      for (let n = 1; n <= 4; n++) expect(itemsHistoireDe(c, n).length, `${c} N${n}`).toBe(2);
    }
  });

  it("les competences ST sont bien prefixees ST.", () => {
    for (const c of COMPETENCES_HISTOIRE) expect(c.startsWith("ST.")).toBe(true);
  });
});

describe("banque Histoire — qualite et formats", () => {
  it("chaque item a une consigne, un attendu non vide et une explication", () => {
    for (const i of BANQUE_HISTOIRE) {
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
    for (const i of BANQUE_HISTOIRE) {
      expect(["qcm", "tri", "ordre", "texte"], i.cle).toContain(i.format);
    }
  });

  it("bienveillance : pas de vocabulaire de guerre/violence", () => {
    const interdits = /\b(tue|tuer|dévore|devore|massacre|sang|guerre|bataille|supplice|esclave|esclavage)\b/i;
    for (const i of BANQUE_HISTOIRE) {
      expect(interdits.test(i.consigne), `consigne ${i.cle}`).toBe(false);
      expect(interdits.test(i.explication), `explication ${i.cle}`).toBe(false);
    }
  });
});

describe("estJusteHistoire / itemHistoireParCle", () => {
  it("juge une bonne et une mauvaise reponse (qcm)", () => {
    expect(estJusteHistoire("hi-roi-n1-a", "Clovis")).toBe(true);
    expect(estJusteHistoire("hi-roi-n1-a", "Astérix")).toBe(false);
    expect(estJusteHistoire("cle-bidon", "x")).toBe(false);
  });
  it("texte : accents EXIGES", () => {
    expect(estJusteHistoire("hi-tra-n4-a", "Préhistoire")).toBe(true);
    expect(estJusteHistoire("hi-tra-n4-a", "Prehistoire")).toBe(false);
  });
  it("ordre : la bonne suite acceptee, une mauvaise refusee", () => {
    const it2 = itemHistoireParCle("hi-roi-n3-b")!;
    expect(estJusteHistoire(it2.cle, it2.attendu)).toBe(true);
    expect(estJusteHistoire(it2.cle, "Saint Louis>Charlemagne>Clovis")).toBe(false);
  });
});

// ===========================================================================
// SPOT-CHECK CROISE : ces triplets (cle, format, attendu) DOIVENT etre
// identiques cote SQL (supabase/tests/histoire_test.sql). Si tu modifies un
// item, mets a jour les DEUX fichiers.
// ===========================================================================
describe("spot-check croise front <-> SQL", () => {
  const SPOT: Array<[string, string, string]> = [
    ["hi-tra-n2-b", "tri", "un silex taillé=Préhistoire;une peinture de bison=Préhistoire;une tablette tactile=aujourd'hui;une voiture=aujourd'hui"],
    ["hi-tra-n3-b", "ordre", "la Préhistoire>l'Antiquité>le Moyen Âge"],
    ["hi-gal-n2-b", "tri", "les arènes de Nîmes=les Romains;le Pont du Gard=les Romains;un avion=aujourd'hui;un ordinateur=aujourd'hui"],
    ["hi-moy-n3-a", "tri", "le forgeron=fabrique des outils en fer;le meunier=moud le grain;le boulanger=fait le pain"],
    ["hi-mon-n2-b", "tri", "une cathédrale gothique=Moyen Âge;une abbaye=Moyen Âge;le château de Versailles=époque des rois;le château de Chambord=époque des rois"],
    ["hi-roi-n2-a", "tri", "Clovis=baptisé à Reims;Charlemagne=a aidé les écoles;Saint Louis=rendait la justice"],
    ["hi-roi-n3-b", "ordre", "Clovis>Charlemagne>Saint Louis"],
    ["hi-fri-n2-b", "ordre", "la Préhistoire>l'Antiquité>le Moyen Âge>les Temps modernes"],
    ["hi-fri-n3-a", "qcm", "Ve"],
    ["hi-fri-n4-a", "texte", "C"],
  ];
  it("chaque triplet correspond a la banque", () => {
    for (const [cle, format, attendu] of SPOT) {
      const item = itemHistoireParCle(cle);
      expect(item, cle).toBeDefined();
      expect(item!.format, cle).toBe(format);
      expect(item!.attendu, cle).toBe(attendu);
    }
  });
});
