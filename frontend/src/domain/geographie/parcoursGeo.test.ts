// Golden deterministe « Parcours de Géographie » (GEO, CM1). Verifie structure,
// totaux des items 'qm' (= seed SQL 0110), juge local, spot-check croise SQL, et
// bienveillance stricte (aucun vocabulaire dramatique : la geo reste honnete mais
// mesuree).

import { describe, it, expect } from "vitest";
import {
  PARCOURS_GEOGRAPHIE,
  itemsParcoursGeoTousQm,
  estJusteParcoursGeoQm,
  chapitreGeoParCle,
} from "./parcours";

describe("Parcours géo — structure", () => {
  it("2 chapitres (se nourrir, inégalités), sans frise", () => {
    expect(PARCOURS_GEOGRAPHIE.length).toBe(2);
    for (const c of PARCOURS_GEOGRAPHIE) {
      expect(c.frise.length, c.cle).toBe(0);
      expect(c.recit.length, c.cle).toBeGreaterThanOrEqual(8);
      expect(c.questions.length, c.cle).toBe(4);
      expect(c.jeRetiens.blancs.length, c.cle).toBe(3);
      expect(c.competence.startsWith("GEO."), c.cle).toBe(true);
    }
    expect(chapitreGeoParCle("geo_nourrir")?.titre).toContain("rizières");
  });

  it("chaque chapitre a une question 'clic' avec une figure (carte à compléter)", () => {
    for (const c of PARCOURS_GEOGRAPHIE) {
      const clic = c.questions.find((q) => q.format === "clic");
      expect(clic, c.cle).toBeDefined();
      expect(clic!.figure?.kind, c.cle).toBe("scene");
    }
  });
});

describe("Parcours géo — items 'qm'", () => {
  const items = itemsParcoursGeoTousQm();
  it("14 items (8 questions + 6 trous), cles uniques prefixe pg-", () => {
    expect(items.length).toBe(14);
    expect(new Set(items.map((i) => i.cle)).size).toBe(14);
    for (const i of items) {
      expect(i.cle.startsWith("pg-"), i.cle).toBe(true);
      expect(["qcm", "clic", "texte", "tri", "ordre"], i.cle).toContain(i.format);
      expect(i.competence.startsWith("GEO."), i.cle).toBe(true);
    }
  });
});

describe("Parcours géo — juge local", () => {
  it("estJusteParcoursGeoQm : bonne et mauvaise reponse", () => {
    expect(estJusteParcoursGeoQm("pg-nou-q1", "le riz")).toBe(true);
    expect(estJusteParcoursGeoQm("pg-nou-q1", "le chocolat")).toBe(false);
    expect(estJusteParcoursGeoQm("pg-nou-q3", "l'Asie")).toBe(true);
    expect(estJusteParcoursGeoQm("pg-ine-q4", "planisphère")).toBe(true);
    expect(estJusteParcoursGeoQm("pg-ine-q4", "planisphere")).toBe(false); // accents exiges
  });
});

describe("Parcours géo — bienveillance stricte", () => {
  it("aucun vocabulaire dramatique dans les récits et questions", () => {
    const interdits = /\b(mort|meurt|tue|tuer|dévore|devore|massacre|sang|guerre|famine)\b/i;
    for (const c of PARCOURS_GEOGRAPHIE) {
      for (const ligne of c.recit) expect(interdits.test(ligne), `récit ${c.cle}`).toBe(false);
      for (const q of c.questions) {
        expect(interdits.test(q.consigne), `consigne ${q.cle}`).toBe(false);
        expect(interdits.test(q.explication), `explication ${q.cle}`).toBe(false);
      }
    }
  });
});

describe("spot-check croise front <-> SQL (geo)", () => {
  const SPOT: Array<[string, string, string]> = [
    ["pg-nou-q1", "qcm", "le riz"],
    ["pg-nou-q3", "clic", "l'Asie"],
    ["pg-nou-q4", "texte", "sous-alimentation"],
    ["pg-ine-q2", "qcm", "l'eau potable"],
    ["pg-ine-q3", "clic", "l'Afrique"],
    ["pg-ine-q4", "texte", "planisphère"],
  ];
  it("chaque triplet correspond a la banque", () => {
    const items = itemsParcoursGeoTousQm();
    for (const [cle, format, attendu] of SPOT) {
      const item = items.find((i) => i.cle === cle);
      expect(item, cle).toBeDefined();
      expect(item!.format, cle).toBe(format);
      expect(item!.attendu, cle).toBe(attendu);
    }
  });
});
