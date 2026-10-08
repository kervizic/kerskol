// Golden deterministe « Questionner le monde ». Verifie :
//   * la banque (couverture competence x niveau, cles uniques) ;
//   * les comparateurs MIROIR du serveur (qcm / ordre / tri / texte / clic) ;
//   * un spot-check (cle, format, attendu) CROISE avec supabase/tests/qm_test.sql
//     (meme table de valeurs des deux cotes) ;
//   * les helpers ordre() / tri() (construction de l'attendu).

import { describe, it, expect } from "vitest";
import {
  BANQUE_QM,
  COMPETENCES_QM,
  itemsQmDe,
  estJusteQm,
  itemQmParCle,
  comparerQm,
  ordre,
  tri,
} from "./index";
import { COMPETENCES_MATIERE } from "./matiere";
import { COMPETENCES_OBJETS } from "./objets";
import { COMPETENCES_ESPACE } from "./espace";
import { COMPETENCES_TEMPS } from "./temps";

describe("banque QM — Le vivant", () => {
  it("48 items (6 competences x 4 niveaux x 2), cles uniques", () => {
    const vivant = BANQUE_QM.filter((i) => i.competence.startsWith("QM.VIVANT."));
    expect(vivant.length).toBe(48);
    const cles = new Set(vivant.map((i) => i.cle));
    expect(cles.size).toBe(vivant.length);
  });

  it("chaque competence a au moins un item a chaque niveau 1..4", () => {
    for (const c of COMPETENCES_QM) {
      for (let n = 1; n <= 4; n++) {
        expect(itemsQmDe(c, n).length, `${c} N${n}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("les competences QM sont bien prefixees QM.", () => {
    for (const c of COMPETENCES_QM) expect(c.startsWith("QM.")).toBe(true);
  });

  it("chaque item a une consigne, un attendu non vide et une explication", () => {
    for (const i of BANQUE_QM) {
      expect(i.consigne.trim().length).toBeGreaterThan(0);
      expect(i.attendu.trim().length).toBeGreaterThan(0);
      expect(i.explication.trim().length).toBeGreaterThan(0);
      if (i.format === "qcm") expect((i.options ?? []).length).toBeGreaterThanOrEqual(2);
      if (i.format === "tri") {
        expect((i.options ?? []).length).toBeGreaterThanOrEqual(2);
        expect((i.bins ?? []).length).toBeGreaterThanOrEqual(2);
      }
      if (i.format === "ordre") expect((i.options ?? []).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("qcm : l'attendu est une des options", () => {
    for (const i of BANQUE_QM.filter((x) => x.format === "qcm")) {
      expect(i.options).toContain(i.attendu);
    }
  });
});

describe("banque QM — La matière", () => {
  it("32 items (4 competences x 4 niveaux x 2)", () => {
    const mat = BANQUE_QM.filter((i) => i.competence.startsWith("QM.MATIERE."));
    expect(mat.length).toBe(32);
  });
  it("couverture des 4 competences matiere x niveaux", () => {
    for (const c of COMPETENCES_MATIERE) {
      for (let n = 1; n <= 4; n++) expect(itemsQmDe(c, n).length, `${c} N${n}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("banque QM — Les objets", () => {
  it("32 items (4 competences x 4 niveaux x 2)", () => {
    const obj = BANQUE_QM.filter((i) => i.competence.startsWith("QM.OBJETS."));
    expect(obj.length).toBe(32);
  });
  it("couverture des 4 competences objets x niveaux", () => {
    for (const c of COMPETENCES_OBJETS) {
      for (let n = 1; n <= 4; n++) expect(itemsQmDe(c, n).length, `${c} N${n}`).toBeGreaterThanOrEqual(1);
    }
  });
  it("le circuit porte une scene SVG (clic) + simulation simple (s'allume)", () => {
    const clic = itemQmParCle("qm-obj-cir-n2-a")!;
    expect(clic.format).toBe("clic");
    expect(clic.figure?.kind).toBe("scene");
    expect(estJusteQm("qm-obj-cir-n2-a", "l'interrupteur")).toBe(true);
    expect(estJusteQm("qm-obj-cir-n2-a", "la pile")).toBe(false);
    // Circuit ferme -> s'allume (oui) ; ouvert -> non.
    expect(estJusteQm("qm-obj-cir-n1-a", "oui")).toBe(true);
    expect(estJusteQm("qm-obj-cir-n1-b", "non")).toBe(true);
  });
});

describe("banque QM — L'espace", () => {
  it("40 items (5 competences x 4 niveaux x 2)", () => {
    const esp = BANQUE_QM.filter((i) => i.competence.startsWith("QM.ESPACE."));
    expect(esp.length).toBe(40);
  });
  it("couverture des 5 competences espace x niveaux", () => {
    for (const c of COMPETENCES_ESPACE) {
      for (let n = 1; n <= 4; n++) expect(itemsQmDe(c, n).length, `${c} N${n}`).toBeGreaterThanOrEqual(1);
    }
  });
  it("planisphere et rose des vents portent une scene SVG (clic)", () => {
    const afrique = itemQmParCle("qm-esp-pla-n2-a")!;
    expect(afrique.format).toBe("clic");
    expect(afrique.figure?.kind).toBe("scene");
    expect(estJusteQm("qm-esp-pla-n2-a", "l'Afrique")).toBe(true);
    expect(estJusteQm("qm-esp-pla-n2-a", "l'Asie")).toBe(false);
    expect(estJusteQm("qm-esp-car-n2-a", "le nord")).toBe(true);
  });
});

describe("banque QM — Le temps", () => {
  it("40 items (5 competences x 4 niveaux x 2)", () => {
    const tps = BANQUE_QM.filter((i) => i.competence.startsWith("QM.TEMPS."));
    expect(tps.length).toBe(40);
  });
  it("couverture des 5 competences temps x niveaux", () => {
    for (const c of COMPETENCES_TEMPS) {
      for (let n = 1; n <= 4; n++) expect(itemsQmDe(c, n).length, `${c} N${n}`).toBeGreaterThanOrEqual(1);
    }
  });
  it("le calendrier porte une scene SVG (clic sur un jour) et la frise un ordre", () => {
    const cal = itemQmParCle("qm-tps-cal-n2-a")!;
    expect(cal.format).toBe("clic");
    expect(cal.figure?.kind).toBe("scene");
    expect(estJusteQm("qm-tps-cal-n2-a", "mercredi")).toBe(true);
    expect(estJusteQm("qm-tps-cal-n2-a", "lundi")).toBe(false);
    expect(estJusteQm("qm-tps-fri-n4-a", "le printemps>l'été>l'automne>l'hiver")).toBe(true);
  });
});

describe("banque QM — totaux", () => {
  it("192 items au total (24 competences x 8)", () => {
    expect(BANQUE_QM.length).toBe(192);
    expect(COMPETENCES_QM.length).toBe(24);
  });
});

describe("comparerQm — miroir du serveur", () => {
  it("qcm : casse ignoree, accents gardes", () => {
    expect(comparerQm("qcm", "un chat", "un chat")).toBe(true);
    expect(comparerQm("qcm", "Un Chat", "un chat")).toBe(true);
    expect(comparerQm("qcm", "un caillou", "un chat")).toBe(false);
  });
  it("texte : accents EXIGES", () => {
    expect(comparerQm("texte", "légumes", "légumes")).toBe(true);
    expect(comparerQm("texte", "Légumes", "légumes")).toBe(true);
    expect(comparerQm("texte", "legumes", "légumes")).toBe(false);
  });
  it("ordre : comparaison structurelle (espaces ignores, ordre strict)", () => {
    expect(comparerQm("ordre", "l'œuf>le têtard>la grenouille", "l'œuf>le têtard>la grenouille")).toBe(true);
    expect(comparerQm("ordre", "l'œuf > le têtard > la grenouille", "l'œuf>le têtard>la grenouille")).toBe(true);
    expect(comparerQm("ordre", "le têtard>l'œuf>la grenouille", "l'œuf>le têtard>la grenouille")).toBe(false);
  });
  it("tri : comparaison structurelle", () => {
    const att = "un arbre=vivant;une voiture=non vivant";
    expect(comparerQm("tri", att, att)).toBe(true);
    expect(comparerQm("tri", "un arbre=non vivant;une voiture=non vivant", att)).toBe(false);
  });
});

describe("estJusteQm / itemQmParCle", () => {
  it("juge une bonne et une mauvaise reponse", () => {
    expect(estJusteQm("qm-viv-car-n1-a", "un chat")).toBe(true);
    expect(estJusteQm("qm-viv-car-n1-a", "un caillou")).toBe(false);
    expect(estJusteQm("cle-bidon", "x")).toBe(false);
  });
  it("ordre : la bonne suite est acceptee", () => {
    const it2 = itemQmParCle("qm-viv-cyc-n2-b")!;
    expect(estJusteQm(it2.cle, it2.attendu)).toBe(true);
    expect(estJusteQm(it2.cle, "la grenouille>le têtard>l'œuf")).toBe(false);
  });
});

describe("helpers ordre() / tri()", () => {
  it("ordre : attendu = etapes jointes par >", () => {
    const r = ordre(["a", "b", "c"]);
    expect(r.attendu).toBe("a>b>c");
    expect(r.options).toEqual(["a", "b", "c"]);
  });
  it("tri : attendu = item=categorie jointes par ;", () => {
    const r = tri(["X", "Y"], [["a", "X"], ["b", "Y"]]);
    expect(r.attendu).toBe("a=X;b=Y");
    expect(r.options).toEqual(["a", "b"]);
    expect(r.bins).toEqual(["X", "Y"]);
  });
});

// ===========================================================================
// SPOT-CHECK CROISE : ces triplets (cle, format, attendu) DOIVENT etre
// identiques cote SQL (supabase/tests/qm_test.sql). Si tu modifies un item,
// mets a jour les DEUX fichiers.
// ===========================================================================
describe("spot-check croise front <-> SQL", () => {
  const SPOT: Array<[string, string, string]> = [
    ["qm-viv-car-n1-a", "qcm", "un chat"],
    ["qm-viv-car-n2-b", "tri", "un arbre=vivant;une voiture=non vivant;un poisson=vivant;un caillou=non vivant"],
    ["qm-viv-cyc-n2-b", "ordre", "l'œuf>le têtard>la grenouille"],
    ["qm-viv-cyc-n3-a", "ordre", "l'œuf>la chenille>la chrysalide>le papillon"],
    ["qm-viv-cha-n2-a", "tri", "la vache=herbivore;le loup=carnivore;le lapin=herbivore;le renard=carnivore"],
    ["qm-viv-cha-n3-a", "ordre", "l'herbe>le lapin>le renard"],
    ["qm-viv-pla-n4-b", "texte", "racines"],
    ["qm-viv-cor-n4-b", "texte", "squelette"],
    ["qm-viv-hyg-n4-a", "texte", "légumes"],
    ["qm-mat-eta-n3-a", "tri", "le bois=solide;l'eau=liquide;l'air=gaz"],
    ["qm-mat-eau-n4-b", "ordre", "la glace>l'eau liquide>la vapeur"],
    ["qm-mat-mel-n2-a", "tri", "le sucre=se dissout;le sel=se dissout;le sable=ne se dissout pas;l'huile=ne se dissout pas"],
    ["qm-mat-air-n4-b", "texte", "vent"],
    ["qm-obj-cir-n1-a", "qcm", "oui"],
    ["qm-obj-cir-n2-a", "clic", "l'interrupteur"],
    ["qm-obj-fon-n2-a", "tri", "le stylo=pour écrire;le couteau=pour couper;la fourchette=pour manger"],
    ["qm-obj-lev-n4-b", "texte", "levier"],
    ["qm-esp-pla-n2-a", "clic", "l'Afrique"],
    ["qm-esp-car-n2-a", "clic", "le nord"],
    ["qm-esp-pay-n2-a", "tri", "beaucoup d'immeubles=la ville;des champs=la campagne;beaucoup de voitures=la ville;des vaches dans un pré=la campagne"],
    ["qm-esp-fra-n4-a", "texte", "Paris"],
    ["qm-tps-cal-n2-a", "clic", "mercredi"],
    ["qm-tps-fri-n4-a", "ordre", "le printemps>l'été>l'automne>l'hiver"],
    ["qm-tps-gen-n2-a", "ordre", "le grand-père>le père>l'enfant"],
    ["qm-tps-aut-n2-a", "tri", "la plume et l'encre=autrefois;l'ordinateur=aujourd'hui;la bougie=autrefois;la lampe électrique=aujourd'hui"],
    ["qm-tps-jou-n4-b", "texte", "tourne"],
  ];
  it("chaque triplet correspond a la banque", () => {
    for (const [cle, format, attendu] of SPOT) {
      const item = itemQmParCle(cle);
      expect(item, cle).toBeDefined();
      expect(item!.format, cle).toBe(format);
      expect(item!.attendu, cle).toBe(attendu);
    }
  });
});
