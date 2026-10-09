// Golden deterministe « Parcours de Sciences » (ST, CM1). Structure, totaux des
// items 'qm' (= seed SQL 0111), juge local, spot-check croise SQL.

import { describe, it, expect } from "vitest";
import {
  PARCOURS_SCIENCES,
  itemsParcoursSciencesTousQm,
  estJusteParcoursSciencesQm,
  chapitreSciencesParCle,
} from "./parcours";

describe("Parcours sciences — structure", () => {
  it("2 chapitres (états de la matière, classer le vivant), sans frise", () => {
    expect(PARCOURS_SCIENCES.length).toBe(2);
    for (const c of PARCOURS_SCIENCES) {
      expect(c.frise.length, c.cle).toBe(0);
      expect(c.recit.length, c.cle).toBeGreaterThanOrEqual(8);
      expect(c.questions.length, c.cle).toBe(4);
      expect(c.jeRetiens.blancs.length, c.cle).toBe(3);
      expect(c.competence.startsWith("ST."), c.cle).toBe(true);
    }
    expect(chapitreSciencesParCle("sc_etats")?.titre).toContain("états");
  });

  it("une question 'clic' (schéma à compléter) dans le chapitre états", () => {
    const clic = chapitreSciencesParCle("sc_etats")!.questions.find((q) => q.format === "clic");
    expect(clic).toBeDefined();
    expect(clic!.figure?.kind).toBe("scene");
  });
});

describe("Parcours sciences — items 'qm'", () => {
  const items = itemsParcoursSciencesTousQm();
  it("14 items (8 questions + 6 trous), cles uniques prefixe ps-", () => {
    expect(items.length).toBe(14);
    expect(new Set(items.map((i) => i.cle)).size).toBe(14);
    for (const i of items) {
      expect(i.cle.startsWith("ps-"), i.cle).toBe(true);
      expect(["qcm", "clic", "tri", "texte", "ordre"], i.cle).toContain(i.format);
      expect(i.competence.startsWith("ST."), i.cle).toBe(true);
    }
  });
});

describe("Parcours sciences — juge local", () => {
  it("estJusteParcoursSciencesQm : bonne et mauvaise reponse", () => {
    expect(estJusteParcoursSciencesQm("ps-eta-q1", "à l'état solide")).toBe(true);
    expect(estJusteParcoursSciencesQm("ps-eta-q1", "à l'état gazeux")).toBe(false);
    expect(estJusteParcoursSciencesQm("ps-cla-q4", "vertébré")).toBe(true);
    expect(estJusteParcoursSciencesQm("ps-cla-q4", "vertebre")).toBe(false); // accents exiges
  });
});

describe("spot-check croise front <-> SQL (sciences)", () => {
  const SPOT: Array<[string, string, string]> = [
    ["ps-eta-q1", "qcm", "à l'état solide"],
    ["ps-eta-q2", "clic", "le gaz"],
    ["ps-eta-q4", "texte", "solidification"],
    ["ps-cla-q2", "tri", "le chat=des poils;l'oiseau=des plumes;le poisson=des écailles"],
    ["ps-cla-q3", "qcm", "ovipare"],
    ["ps-cla-q4", "texte", "vertébré"],
  ];
  it("chaque triplet correspond a la banque", () => {
    const items = itemsParcoursSciencesTousQm();
    for (const [cle, format, attendu] of SPOT) {
      const item = items.find((i) => i.cle === cle);
      expect(item, cle).toBeDefined();
      expect(item!.format, cle).toBe(format);
      expect(item!.attendu, cle).toBe(attendu);
    }
  });
});
