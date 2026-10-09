// Golden deterministe « Geographie » (GEO, CM1 - NOUVEAU PROGRAMME 2026 : la
// diversite des modes de vie dans le monde). Verifie :
//   * la banque (couverture competence x niveau, cles uniques, totaux) ;
//   * les comparateurs MIROIR du serveur (qcm / tri / texte) ;
//   * un spot-check (cle, format, attendu) CROISE avec supabase/tests/geographie_test.sql
//     (meme table de valeurs des deux cotes) ;
//   * le garde-fou de contenu (consigne / attendu / explication non vides, qcm a
//     au moins deux options et attendu present dans les options) ;
//   * la bienveillance STRICTE (la geographie n'est PAS exemptee, contrairement
//     a l'histoire) : aucun vocabulaire dramatique.

import { describe, it, expect } from "vitest";
import {
  BANQUE_GEOGRAPHIE,
  COMPETENCES_GEOGRAPHIE,
  itemsGeographieDe,
  estJusteGeographie,
  itemGeographieParCle,
} from "./index";

describe("banque Geographie — totaux et couverture", () => {
  it("32 items (4 competences x 4 niveaux x 2), cles uniques", () => {
    expect(BANQUE_GEOGRAPHIE.length).toBe(32);
    expect(COMPETENCES_GEOGRAPHIE.length).toBe(4);
    const cles = new Set(BANQUE_GEOGRAPHIE.map((i) => i.cle));
    expect(cles.size).toBe(BANQUE_GEOGRAPHIE.length);
  });

  it("couverture des 4 competences x niveaux (2 items par niveau)", () => {
    for (const c of COMPETENCES_GEOGRAPHIE) {
      for (let n = 1; n <= 4; n++) expect(itemsGeographieDe(c, n).length, `${c} N${n}`).toBe(2);
    }
  });

  it("les competences GEO sont bien prefixees GEO. et correspondent au nouveau programme", () => {
    for (const c of COMPETENCES_GEOGRAPHIE) expect(c.startsWith("GEO.")).toBe(true);
    expect([...COMPETENCES_GEOGRAPHIE]).toEqual([
      "GEO.NOURRIR",
      "GEO.INEGALITES",
      "GEO.DEPLACER",
      "GEO.COMMUNIQUER",
    ]);
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

  // La geographie reste sous la regle de bienveillance STRICTE (seule la banque
  // histoire est exemptee). Les inegalites sont dites avec mesure et espoir.
  it("bienveillance stricte : pas de vocabulaire dramatique", () => {
    const interdits = /\b(mort|meurt|tue|tuer|dévore|devore|massacre|sang|guerre|famine)\b/i;
    for (const i of BANQUE_GEOGRAPHIE) {
      expect(interdits.test(i.consigne), `consigne ${i.cle}`).toBe(false);
      expect(interdits.test(i.explication), `explication ${i.cle}`).toBe(false);
    }
  });
});

describe("estJusteGeographie / itemGeographieParCle", () => {
  it("juge une bonne et une mauvaise reponse (qcm)", () => {
    expect(estJusteGeographie("ge-com-n1-a", "Internet")).toBe(true);
    expect(estJusteGeographie("ge-com-n1-a", "le marché")).toBe(false);
    expect(estJusteGeographie("cle-bidon", "x")).toBe(false);
  });
  it("texte : accents EXIGES", () => {
    expect(estJusteGeographie("ge-nou-n4-a", "céréales")).toBe(true);
    expect(estJusteGeographie("ge-nou-n4-a", "cereales")).toBe(false);
  });
  it("tri : le bon classement accepte, un mauvais refuse", () => {
    const it2 = itemGeographieParCle("ge-dep-n2-a")!;
    expect(estJusteGeographie(it2.cle, it2.attendu)).toBe(true);
    expect(
      estJusteGeographie(
        it2.cle,
        "le train=dans les airs;la voiture=sur terre;le bateau=sur l'eau;l'avion=sur terre",
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
    ["ge-nou-n2-b", "tri", "le blé=l'agriculture;les légumes=l'agriculture;le lait=l'élevage;le poisson=la pêche"],
    ["ge-nou-n4-a", "texte", "céréales"],
    ["ge-ine-n2-b", "tri", "l'eau potable=un besoin essentiel;aller à l'école=un besoin essentiel;voir un médecin=un besoin essentiel;un jeu vidéo=un loisir"],
    ["ge-ine-n4-a", "texte", "planisphère"],
    ["ge-dep-n2-a", "tri", "le train=sur terre;la voiture=sur terre;le bateau=sur l'eau;l'avion=dans les airs"],
    ["ge-dep-n4-b", "texte", "kilomètres"],
    ["ge-com-n2-a", "qcm", "câbles"],
    ["ge-com-n3-a", "tri", "envoyer un message=communiquer;faire un appel vidéo=communiquer;lire les informations=s'informer;chercher sur une carte=s'informer"],
    ["ge-com-n3-b", "qcm", "accès"],
    ["ge-com-n4-b", "texte", "Internet"],
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
