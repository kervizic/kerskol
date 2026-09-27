import { describe, it, expect } from "vitest";
import {
  buildingStateFromNiveauMax,
  isUnlocked,
  computePort,
} from "./buildings";
import type { Competence, Prerequis, Progression } from "../lib/types";

function comp(code: string, ordre: number): Competence {
  return {
    code,
    matiere: "MA",
    domaine: "calcul_mental",
    libelle: code,
    ordre,
    nb_niveaux: 4,
    actif: true,
  };
}
function prog(code: string, niveau: number, niveauMax: number): Progression {
  return {
    profil_id: "p",
    competence: code,
    niveau,
    niveau_max_atteint: niveauMax,
    placement_termine: true,
  };
}

describe("buildingStateFromNiveauMax", () => {
  it("aucune progression -> vide", () => {
    expect(buildingStateFromNiveauMax(null)).toBe("vide");
    expect(buildingStateFromNiveauMax(undefined)).toBe("vide");
    expect(buildingStateFromNiveauMax(0)).toBe("vide");
  });
  it("mappe 1..4 sur chantier/cabane/maison/monument", () => {
    expect(buildingStateFromNiveauMax(1)).toBe("chantier");
    expect(buildingStateFromNiveauMax(2)).toBe("cabane");
    expect(buildingStateFromNiveauMax(3)).toBe("maison");
    expect(buildingStateFromNiveauMax(4)).toBe("monument");
  });
  it("plafonne au-dela de 4 sur monument", () => {
    expect(buildingStateFromNiveauMax(5)).toBe("monument");
  });
});

describe("isUnlocked (prerequis niveau_min = 2)", () => {
  const prereqs: Prerequis[] = [
    { competence: "MA.CM.DOUBLES", prerequis: "MA.CM.ADDITION", niveau_min: 2 },
  ];

  it("competence sans prerequis : debloquee d'office", () => {
    expect(isUnlocked("MA.CM.ADDITION", prereqs, {})).toBe(true);
  });
  it("verrouillee si le prerequis n'a pas de progression", () => {
    expect(isUnlocked("MA.CM.DOUBLES", prereqs, {})).toBe(false);
  });
  it("verrouillee si le prerequis est au niveau_max 1 (< 2)", () => {
    const m = { "MA.CM.ADDITION": prog("MA.CM.ADDITION", 1, 1) };
    expect(isUnlocked("MA.CM.DOUBLES", prereqs, m)).toBe(false);
  });
  it("debloquee des que le prerequis atteint niveau_max 2", () => {
    const m = { "MA.CM.ADDITION": prog("MA.CM.ADDITION", 2, 2) };
    expect(isUnlocked("MA.CM.DOUBLES", prereqs, m)).toBe(true);
  });
  it("exige TOUS les prerequis (multi-prerequis)", () => {
    const multi: Prerequis[] = [
      { competence: "MA.TABLES.7", prerequis: "MA.TABLES.2", niveau_min: 2 },
      { competence: "MA.TABLES.7", prerequis: "MA.TABLES.5", niveau_min: 2 },
    ];
    const partial = { "MA.TABLES.2": prog("MA.TABLES.2", 3, 3) };
    expect(isUnlocked("MA.TABLES.7", multi, partial)).toBe(false);
    const full = {
      "MA.TABLES.2": prog("MA.TABLES.2", 3, 3),
      "MA.TABLES.5": prog("MA.TABLES.5", 2, 2),
    };
    expect(isUnlocked("MA.TABLES.7", multi, full)).toBe(true);
  });
});

describe("computePort", () => {
  const competences = [
    comp("MA.CM.ADDITION", 10),
    comp("MA.CM.DOUBLES", 20),
    comp("MA.CM.MOITIES", 30),
  ];
  const prereqs: Prerequis[] = [
    { competence: "MA.CM.DOUBLES", prerequis: "MA.CM.ADDITION", niveau_min: 2 },
    { competence: "MA.CM.MOITIES", prerequis: "MA.CM.DOUBLES", niveau_min: 2 },
  ];

  it("n'affiche que les competences debloquees, triees par ordre", () => {
    // ADDITION niveau_max 2 -> DOUBLES debloquee ; MOITIES reste verrouillee.
    const progs = [prog("MA.CM.ADDITION", 2, 2)];
    const port = computePort(competences, prereqs, progs);
    expect(port.map((p) => p.code)).toEqual([
      "MA.CM.ADDITION",
      "MA.CM.DOUBLES",
    ]);
  });

  it("competence debloquee sans progression = emplacement vide", () => {
    const progs = [prog("MA.CM.ADDITION", 2, 2)];
    const port = computePort(competences, prereqs, progs);
    const doubles = port.find((p) => p.code === "MA.CM.DOUBLES");
    expect(doubles?.state).toBe("vide");
  });

  it("reflete l'etat du batiment selon niveau_max_atteint", () => {
    const progs = [
      prog("MA.CM.ADDITION", 3, 3),
      prog("MA.CM.DOUBLES", 2, 4),
    ];
    const port = computePort(competences, prereqs, progs);
    expect(port.find((p) => p.code === "MA.CM.ADDITION")?.state).toBe("maison");
    expect(port.find((p) => p.code === "MA.CM.DOUBLES")?.state).toBe("monument");
    // DOUBLES au niveau_max 4 (>=2) -> MOITIES desormais debloquee (vide).
    expect(port.find((p) => p.code === "MA.CM.MOITIES")?.state).toBe("vide");
  });
});
