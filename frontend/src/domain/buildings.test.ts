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

// -------------------------------------------------------------------------
// LOT CE1 (incrément 12) - Garde-fou SOUS-NIVEAU générique (toutes matières).
// Un prérequis de classe inférieure (remédiation, p. ex. une compétence
// [CE1,CE1] prérequis d'une compétence CE2) ne doit JAMAIS verrouiller la
// compétence liée pour un enfant plus avancé : le port d'Iris (CE2) reste
// inchangé quand on ajoute un lien CE1 -> CE2. Voir sousNiveauCodes / isUnlocked
// / computePort(classe).
// -------------------------------------------------------------------------
import { sousNiveauCodes } from "./buildings";
import type { Classe } from "../lib/types";

function compC(
  code: string,
  classe_min: Classe,
  classe_max: Classe,
  matiere = "MA",
  domaine = "numeration",
): Competence {
  return { code, matiere, domaine, libelle: code, ordre: 1, nb_niveaux: 4, actif: true, classe_min, classe_max };
}

describe("garde-fou sous-niveau : un prérequis de classe inférieure ne verrouille pas", () => {
  // CE2 lié (MA.NUM.COMPARER) dépend d'une compétence CE1 dédiée [CE1,CE1].
  const competences: Competence[] = [
    compC("MA.NUM.COMPARER", "CE1", "CE2"),
    compC("MA.NUM.CE1_MILLE", "CE1", "CE1"),
  ];
  const prereqs: Prerequis[] = [
    { competence: "MA.NUM.COMPARER", prerequis: "MA.NUM.CE1_MILLE", niveau_min: 2 },
  ];
  // Iris (CE2) a une progression sur SA compétence CE2, aucune sur la CE1 dédiée.
  const progsIris = [prog("MA.NUM.COMPARER", 3, 3)];

  it("sousNiveauCodes repère la compétence CE1 dédiée pour un CE2, pas pour un CE1", () => {
    expect(sousNiveauCodes(competences, "CE2").has("MA.NUM.CE1_MILLE")).toBe(true);
    expect(sousNiveauCodes(competences, "CE1").has("MA.NUM.CE1_MILLE")).toBe(false);
    expect(sousNiveauCodes(competences, undefined).size).toBe(0);
  });

  it("port d'Iris (CE2) : la compétence CE2 liée reste débloquée malgré le prérequis CE1", () => {
    const port = computePort(competences, prereqs, progsIris, "CE2");
    expect(port.find((p) => p.code === "MA.NUM.COMPARER")?.state).toBe("maison");
  });

  it("sans le garde-fou (classe absente) le prérequis CE1 verrouillerait la compétence CE2", () => {
    // Démontre que la régression est réelle : sans classe, le port masque la
    // compétence CE2 d'Iris (ancien comportement de computePort à 3 arguments).
    const port = computePort(competences, prereqs, progsIris);
    expect(port.find((p) => p.code === "MA.NUM.COMPARER")).toBeUndefined();
  });

  it("isUnlocked : un prérequis genuinement de même classe verrouille toujours", () => {
    const comp2: Competence[] = [
      compC("MA.A", "CE2", "CE2"),
      compC("MA.B", "CE2", "CE2"),
    ];
    const pr: Prerequis[] = [{ competence: "MA.A", prerequis: "MA.B", niveau_min: 2 }];
    const ignore = sousNiveauCodes(comp2, "CE2"); // vide : B n'est pas sous-niveau
    expect(isUnlocked("MA.A", pr, {}, ignore)).toBe(false);
  });
});
