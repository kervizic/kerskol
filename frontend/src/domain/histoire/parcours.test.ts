// Golden deterministe « Parcours d'Histoire » (HIST, CM1). Verifie :
//   * structure des chapitres (4 themes, etapes completes) ;
//   * cles uniques, formats autorises, qcm avec attendu present ;
//   * totaux des items 'qm' (= seed SQL 0107) ;
//   * juges locaux (miroir serveur) pour les questions et pour l'ordre de frise ;
//   * spot-check (cle, format, attendu) CROISE avec
//     supabase/tests/parcours_histoire_test.sql ;
//   * verite historique : le vocabulaire factuel du programme est bien present.

import { describe, it, expect } from "vitest";
import {
  PARCOURS_HISTOIRE,
  itemsParcoursTousQm,
  friseCartesToutes,
  friseCarteParCle,
  estJusteParcoursQm,
  estJusteFriseOrdre,
  chapitreParCle,
} from "./parcours";

describe("Parcours — structure des chapitres", () => {
  it("5 chapitres couvrant les 4 themes du programme", () => {
    expect(PARCOURS_HISTOIRE.length).toBe(5);
    const comps = new Set(PARCOURS_HISTOIRE.map((c) => c.competence));
    expect(comps).toEqual(
      new Set(["HIST.MOYENAGE", "HIST.MONARCHIE", "HIST.EXPLORATIONS", "HIST.REVOLUTION"]),
    );
  });

  it("chaque chapitre a un recit (8-12 phrases), un document, 4 questions, 3 trous, 1-3 cartes", () => {
    for (const c of PARCOURS_HISTOIRE) {
      expect(c.recit.length, c.cle).toBeGreaterThanOrEqual(8);
      expect(c.recit.length, c.cle).toBeLessThanOrEqual(12);
      expect(c.document.scene.els.length, c.cle).toBeGreaterThan(0);
      expect(c.document.legende.trim().length, c.cle).toBeGreaterThan(0);
      expect(c.questions.length, c.cle).toBe(4);
      expect(c.jeRetiens.blancs.length, c.cle).toBe(3);
      expect(c.frise.length, c.cle).toBeGreaterThanOrEqual(1);
      expect(c.frise.length, c.cle).toBeLessThanOrEqual(3);
      // le « je retiens » reference bien chaque trou dans le resume.
      for (let i = 1; i <= c.jeRetiens.blancs.length; i++) {
        expect(c.jeRetiens.resume, c.cle).toContain(`{${i}}`);
      }
    }
  });

  it("chapitreParCle retrouve un chapitre", () => {
    expect(chapitreParCle("revolution")?.titre).toContain("Versailles");
    expect(chapitreParCle("bidon")).toBeUndefined();
  });
});

describe("Parcours — items 'qm' (seed SQL miroir)", () => {
  const items = itemsParcoursTousQm();

  it("35 items (20 questions + 15 trous), cles uniques, prefixe pa-", () => {
    expect(items.length).toBe(35);
    const cles = new Set(items.map((i) => i.cle));
    expect(cles.size).toBe(items.length);
    for (const i of items) expect(i.cle.startsWith("pa-"), i.cle).toBe(true);
  });

  it("formats autorises et competences HIST.*", () => {
    for (const i of items) {
      expect(["qcm", "tri", "ordre", "texte"], i.cle).toContain(i.format);
      expect(i.competence.startsWith("HIST."), i.cle).toBe(true);
      expect(i.niveau, i.cle).toBeGreaterThanOrEqual(1);
      expect(i.niveau, i.cle).toBeLessThanOrEqual(4);
      expect(i.attendu.trim().length, i.cle).toBeGreaterThan(0);
      if (i.format === "qcm") {
        expect((i.options ?? []).length, i.cle).toBeGreaterThanOrEqual(2);
        expect(i.options, i.cle).toContain(i.attendu);
      }
    }
  });
});

describe("Parcours — juges locaux (miroir serveur)", () => {
  it("estJusteParcoursQm : bonne et mauvaise reponse", () => {
    expect(estJusteParcoursQm("pa-moy-q1", "la seigneurie")).toBe(true);
    expect(estJusteParcoursQm("pa-moy-q1", "la gare")).toBe(false);
    expect(estJusteParcoursQm("pa-moy-q4", "corvée")).toBe(true);
    expect(estJusteParcoursQm("pa-moy-q4", "corvee")).toBe(false); // accents exiges
    expect(estJusteParcoursQm("cle-bidon", "x")).toBe(false);
  });

  it("estJusteFriseOrdre : ordre chronologique", () => {
    expect(estJusteFriseOrdre(["fri-1492-colomb", "fri-1519-magellan", "fri-1682-versailles"])).toBe(true);
    expect(estJusteFriseOrdre(["fri-1519-magellan", "fri-1492-colomb"])).toBe(false);
    expect(estJusteFriseOrdre(["fri-inconnue"])).toBe(false);
  });
});

describe("Parcours — frise", () => {
  it("cartes uniques et cle de tri chronologique coherente", () => {
    const cartes = friseCartesToutes();
    const cles = new Set(cartes.map((c) => c.cle));
    expect(cles.size).toBe(cartes.length);
    for (const c of cartes) {
      expect(c.cleTri, c.cle).toBeGreaterThan(9000000); // AAAAMMJJ
      expect(["moyen_age", "temps_modernes", "contemporaine"], c.cle).toContain(c.periode);
    }
    expect(friseCarteParCle("fri-1789-bastille")?.dateLabel).toContain("14 juillet");
  });
});

// SPOT-CHECK CROISE : identique a supabase/tests/parcours_histoire_test.sql.
describe("spot-check croise front <-> SQL", () => {
  const SPOT: Array<[string, string, string]> = [
    ["pa-moy-q1", "qcm", "la seigneurie"],
    ["pa-moy-q3", "tri", "le château=le seigneur;le donjon=le seigneur;l'église du village=l'Église;l'abbaye=l'Église"],
    ["pa-moy-q4", "texte", "corvée"],
    ["pa-nar-q2", "qcm", "le massacre de la Saint-Barthélemy"],
    ["pa-exp-q3", "ordre", "l'Europe>l'océan Atlantique>l'Amérique>l'océan Pacifique"],
    ["pa-tra-q2", "qcm", "le Code noir"],
    ["pa-tra-q3", "qcm", "parce qu'il prive des personnes de leur liberté"],
    ["pa-rev-q3", "ordre", "la réunion des États généraux>la prise de la Bastille>la Déclaration des droits de l'Homme"],
    ["pa-rev-q4", "texte", "14 juillet"],
  ];
  it("chaque triplet correspond a la banque", () => {
    const items = itemsParcoursTousQm();
    for (const [cle, format, attendu] of SPOT) {
      const item = items.find((i) => i.cle === cle);
      expect(item, cle).toBeDefined();
      expect(item!.format, cle).toBe(format);
      expect(item!.attendu, cle).toBe(attendu);
    }
  });
});

describe("Parcours — verite historique (n'adoucis pas l'Histoire)", () => {
  it("le vocabulaire factuel du programme est present", () => {
    const corpus = PARCOURS_HISTOIRE.flatMap((c) => [
      ...c.recit,
      ...c.questions.map((q) => `${q.consigne} ${q.explication} ${q.attendu}`),
    ]).join(" ").toLowerCase();
    expect(corpus).toContain("saint-barthélemy");
    expect(corpus).toContain("traite des esclaves");
    expect(corpus).toContain("esclave");
    expect(corpus).toContain("code noir");
    expect(corpus).toContain("bastille");
  });
});
