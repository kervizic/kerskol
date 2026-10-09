// Golden deterministe « Sciences et technologie » (ST, CM1 - PROGRAMME 2026,
// arrete du 5 juin 2026 / BO n° 24 du 11 juin 2026, annexe 2). Verifie :
//   * la banque (couverture competence x niveau, cles uniques, totaux) ;
//   * les comparateurs MIROIR du serveur (qcm / ordre / tri / texte) ;
//   * un spot-check (cle, format, attendu) CROISE avec supabase/tests/sciences_test.sql
//     (meme table de valeurs des deux cotes) ;
//   * le garde-fou de contenu (consigne / attendu / explication non vides, qcm a
//     au moins deux options et attendu present dans les options) ;
//   * la bienveillance STRICTE (les sciences ne sont PAS exemptees).

import { describe, it, expect } from "vitest";
import {
  BANQUE_SCIENCES,
  COMPETENCES_SCIENCES,
  itemsSciencesDe,
  estJusteSciences,
  itemSciencesParCle,
} from "./index";

describe("banque Sciences — totaux et couverture", () => {
  it("56 items (7 competences x 4 niveaux x 2), cles uniques", () => {
    expect(BANQUE_SCIENCES.length).toBe(56);
    expect(COMPETENCES_SCIENCES.length).toBe(7);
    const cles = new Set(BANQUE_SCIENCES.map((i) => i.cle));
    expect(cles.size).toBe(BANQUE_SCIENCES.length);
  });

  it("couverture des 7 competences x niveaux (2 items par niveau)", () => {
    for (const c of COMPETENCES_SCIENCES) {
      for (let n = 1; n <= 4; n++) expect(itemsSciencesDe(c, n).length, `${c} N${n}`).toBe(2);
    }
  });

  it("les competences ST sont bien prefixees ST. et couvrent les 4 themes", () => {
    for (const c of COMPETENCES_SCIENCES) expect(c.startsWith("ST.")).toBe(true);
    expect([...COMPETENCES_SCIENCES]).toEqual([
      "ST.MATIERE.ETATS",
      "ST.PHYSIQUE.LUMIERE",
      "ST.VIVANT.CLASSER",
      "ST.VIVANT.ECOSYSTEMES",
      "ST.CORPS.SANTE",
      "ST.TERRE.CIEL",
      "ST.OBJETS.TECHNIQUE",
    ]);
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

  // Les sciences restent sous la bienveillance STRICTE (seule l'histoire est
  // exemptee). La predation est dite avec douceur (« se nourrir de »).
  it("bienveillance stricte : pas de vocabulaire dramatique", () => {
    const interdits = /\b(mort|meurt|tue|tuer|dévore|devore|dévorer|massacre|sang|guerre)\b/i;
    for (const i of BANQUE_SCIENCES) {
      expect(interdits.test(i.consigne), `consigne ${i.cle}`).toBe(false);
      expect(interdits.test(i.explication), `explication ${i.cle}`).toBe(false);
    }
  });
});

describe("estJusteSciences / itemSciencesParCle", () => {
  it("juge une bonne et une mauvaise reponse (qcm)", () => {
    expect(estJusteSciences("st-ter-n1-a", "un thermomètre")).toBe(true);
    expect(estJusteSciences("st-ter-n1-a", "une balance")).toBe(false);
    expect(estJusteSciences("cle-bidon", "x")).toBe(false);
  });
  it("texte : accents EXIGES", () => {
    expect(estJusteSciences("st-eco-n4-a", "écosystème")).toBe(true);
    expect(estJusteSciences("st-eco-n4-a", "ecosysteme")).toBe(false);
  });
  it("ordre : la bonne suite acceptee, une mauvaise refusee", () => {
    const it2 = itemSciencesParCle("st-eco-n2-b")!;
    expect(estJusteSciences(it2.cle, it2.attendu)).toBe(true);
    expect(estJusteSciences(it2.cle, "le renard>le lapin>l'herbe")).toBe(false);
  });
});

// ===========================================================================
// SPOT-CHECK CROISE : ces triplets (cle, format, attendu) DOIVENT etre
// identiques cote SQL (supabase/tests/sciences_test.sql). Si tu modifies un
// item, mets a jour les DEUX fichiers.
// ===========================================================================
describe("spot-check croise front <-> SQL", () => {
  const SPOT: Array<[string, string, string]> = [
    ["st-mat-n2-b", "tri", "le sel=se dissout;le sucre=se dissout;le sable=ne se dissout pas;les cailloux=ne se dissout pas"],
    ["st-mat-n4-b", "texte", "tare"],
    ["st-lum-n2-a", "tri", "une vitre propre=transparent;du papier calque=translucide;un mur en pierre=opaque;un livre fermé=opaque"],
    ["st-lum-n4-a", "texte", "translucide"],
    ["st-viv-n3-b", "ordre", "la fécondation>le développement dans l'œuf>l'éclosion"],
    ["st-eco-n2-b", "ordre", "l'herbe>le lapin>le renard"],
    ["st-eco-n3-b", "tri", "l'abeille butine la fleur et la pollinise=coopération;le poisson-clown et l'anémone se protègent=coopération;le renard chasse le lapin pour se nourrir=prédation;la coccinelle se nourrit de pucerons=prédation"],
    ["st-cor-n4-b", "texte", "puberté"],
    ["st-ter-n2-a", "tri", "le thermomètre=la température;le pluviomètre=la pluie;l'anémomètre=le vent"],
    ["st-obj-n2-b", "tri", "le vélo=se déplacer;le bus=se déplacer;la gourde=s'hydrater;la carafe=s'hydrater"],
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
