// Golden deterministe « Histoire » (HIST, CM1 - NOUVEAU PROGRAMME 2026). Verifie :
//   * la banque (couverture competence x niveau, cles uniques, totaux) ;
//   * les comparateurs MIROIR du serveur (qcm / ordre / tri / texte) ;
//   * un spot-check (cle, format, attendu) CROISE avec supabase/tests/histoire_test.sql
//     (meme table de valeurs des deux cotes) ;
//   * le garde-fou de contenu (consigne / attendu / explication non vides, qcm a
//     au moins deux options et attendu present dans les options) ;
//   * la VERITE HISTORIQUE assumee : la banque contient bien le vocabulaire
//     factuel du programme (guerres de religion, traite / esclavage, Bastille),
//     qui serait interdit ailleurs mais est exempte pour la seule banque histoire.

import { describe, it, expect } from "vitest";
import {
  BANQUE_HISTOIRE,
  COMPETENCES_HISTOIRE,
  itemsHistoireDe,
  estJusteHistoire,
  itemHistoireParCle,
} from "./index";

describe("banque Histoire — totaux et couverture", () => {
  it("40 items (5 competences x 4 niveaux x 2), cles uniques", () => {
    expect(BANQUE_HISTOIRE.length).toBe(40);
    expect(COMPETENCES_HISTOIRE.length).toBe(5);
    const cles = new Set(BANQUE_HISTOIRE.map((i) => i.cle));
    expect(cles.size).toBe(BANQUE_HISTOIRE.length);
  });

  it("couverture des 5 competences x niveaux (2 items par niveau)", () => {
    for (const c of COMPETENCES_HISTOIRE) {
      for (let n = 1; n <= 4; n++) expect(itemsHistoireDe(c, n).length, `${c} N${n}`).toBe(2);
    }
  });

  it("les competences HIST sont bien prefixees HIST. et correspondent au nouveau programme", () => {
    for (const c of COMPETENCES_HISTOIRE) expect(c.startsWith("HIST.")).toBe(true);
    expect([...COMPETENCES_HISTOIRE]).toEqual([
      "HIST.MOYENAGE",
      "HIST.MONARCHIE",
      "HIST.EXPLORATIONS",
      "HIST.REVOLUTION",
      "HIST.FRISE",
    ]);
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

  // VERITE HISTORIQUE (decision de Manu : « n'adoucis pas l'Histoire »). La
  // banque histoire est exemptee de la bienveillance stricte (voir
  // bienveillance.test.ts). On verifie ici que le vocabulaire factuel du
  // programme est bien PRESENT, pour eviter qu'un futur « adoucissement »
  // reintroduise des euphemismes.
  it("verite historique : le vocabulaire factuel du programme est present", () => {
    const corpus = BANQUE_HISTOIRE.map((i) => `${i.consigne} ${i.explication}`).join(" ").toLowerCase();
    expect(corpus).toContain("guerres de religion");
    expect(corpus).toContain("saint-barthélemy");
    expect(corpus).toContain("traite");
    expect(corpus).toContain("esclav"); // esclave / esclavage
    expect(corpus).toContain("code noir");
    expect(corpus).toContain("bastille");
  });
});

describe("estJusteHistoire / itemHistoireParCle", () => {
  it("juge une bonne et une mauvaise reponse (qcm)", () => {
    expect(estJusteHistoire("hi-nar-n1-a", "François Ier")).toBe(true);
    expect(estJusteHistoire("hi-nar-n1-a", "Astérix")).toBe(false);
    expect(estJusteHistoire("cle-bidon", "x")).toBe(false);
  });
  it("texte : accents EXIGES", () => {
    expect(estJusteHistoire("hi-moy-n4-b", "cathédrale")).toBe(true);
    expect(estJusteHistoire("hi-moy-n4-b", "cathedrale")).toBe(false);
  });
  it("ordre : la bonne suite acceptee, une mauvaise refusee", () => {
    const it2 = itemHistoireParCle("hi-nar-n3-b")!;
    expect(estJusteHistoire(it2.cle, it2.attendu)).toBe(true);
    expect(estJusteHistoire(it2.cle, "Louis XIV>Henri IV>François Ier")).toBe(false);
  });
});

// ===========================================================================
// SPOT-CHECK CROISE : ces triplets (cle, format, attendu) DOIVENT etre
// identiques cote SQL (supabase/tests/histoire_test.sql). Si tu modifies un
// item, mets a jour les DEUX fichiers.
// ===========================================================================
describe("spot-check croise front <-> SQL", () => {
  const SPOT: Array<[string, string, string]> = [
    ["hi-moy-n2-b", "tri", "l'abbaye=l'Église;la cathédrale=l'Église;le château fort=le seigneur;le donjon=le seigneur"],
    ["hi-moy-n3-b", "tri", "des murs épais et de petites fenêtres=art roman;des arcs ronds (plein cintre)=art roman;de grandes fenêtres avec des vitraux=art gothique;des arcs en pointe (ogives)=art gothique"],
    ["hi-nar-n2-b", "tri", "les prêtres et les évêques=le clergé;les seigneurs et les grands nobles=la noblesse;les paysans, les artisans et les bourgeois=le tiers état"],
    ["hi-nar-n3-b", "ordre", "François Ier>Henri IV>Louis XIV"],
    ["hi-exp-n2-b", "ordre", "de l'Europe vers l'Afrique>de l'Afrique vers l'Amérique>de l'Amérique vers l'Europe"],
    ["hi-exp-n3-a", "qcm", "la traite des esclaves"],
    ["hi-exp-n3-b", "qcm", "le Code noir"],
    ["hi-rev-n3-b", "ordre", "la réunion des États généraux>la prise de la Bastille>la Déclaration des droits de l'Homme et du citoyen"],
    ["hi-fri-n3-a", "qcm", "XVIe siècle"],
    ["hi-fri-n4-b", "texte", "XVI"],
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
