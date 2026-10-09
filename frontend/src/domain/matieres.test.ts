// Tests des helpers de reglage matieres / sous-matieres.

import { describe, it, expect } from "vitest";
import {
  MATIERES,
  TOUTES_MATIERES,
  TOUS_DOMAINES,
  matiereDe,
  competenceActivable,
  auMoinsUneSousMatiere,
  sousMatieresVisibles,
} from "./matieres";

describe("catalogue matieres / sous-matieres", () => {
  it("MA et FR sont presentes avec au moins une sous-matiere chacune", () => {
    expect(TOUTES_MATIERES).toContain("MA");
    expect(TOUTES_MATIERES).toContain("FR");
    for (const m of MATIERES) expect(m.sousMatieres.length).toBeGreaterThan(0);
  });

  it("matiereDe retrouve la matiere d'un domaine", () => {
    expect(matiereDe("conjugaison")).toBe("FR");
    expect(matiereDe("grammaire")).toBe("FR");
    expect(matiereDe("mesures")).toBe("MA");
    expect(matiereDe("heure")).toBe("MA");
    expect(matiereDe("inconnu")).toBeUndefined();
  });

  it("« Grammaire » est une sous-matiere FR", () => {
    const fr = MATIERES.find((m) => m.code === "FR")!;
    const grammaire = fr.sousMatieres.find((s) => s.domaine === "grammaire");
    expect(grammaire?.libelle).toBe("Grammaire");
    expect(TOUS_DOMAINES).toContain("grammaire");
    // Jouable seulement si FR actif ET grammaire active.
    expect(competenceActivable("FR", "grammaire", ["FR"], ["grammaire"])).toBe(true);
    expect(competenceActivable("FR", "grammaire", ["MA"], ["grammaire"])).toBe(false);
  });

  it("« Mesures » et « Lire l'heure » sont deux sous-matieres MA distinctes", () => {
    const ma = MATIERES.find((m) => m.code === "MA")!;
    const mesures = ma.sousMatieres.find((s) => s.domaine === "mesures");
    const heure = ma.sousMatieres.find((s) => s.domaine === "heure");
    expect(mesures?.libelle).toBe("Mesures");
    expect(heure?.libelle).toBe("Lire l'heure");
    expect(TOUS_DOMAINES).toContain("mesures");
    expect(TOUS_DOMAINES).toContain("heure");
  });
});

describe("visibilite CE1 : les sous-matieres MATHS sont visibles au CE1", () => {
  it("un profil CE1 voit numeration, calcul, tables, pose, problemes, mesures, heure, fractions", () => {
    const ma = MATIERES.find((m) => m.code === "MA")!;
    const vus = new Set(sousMatieresVisibles(ma, "CE1").map((s) => s.domaine));
    for (const d of [
      "numeration",
      "calcul_mental",
      "tables_multiplication",
      "calcul_pose",
      "problemes",
      "mesures",
      "heure",
      "fractions",
    ]) {
      expect(vus.has(d)).toBe(true);
    }
    // Les sous-matieres propres au CM1 restent masquees au CE1.
    expect(vus.has("decimaux")).toBe(false);
    expect(vus.has("proportionnalite")).toBe(false);
  });
});

describe("competenceActivable : matiere active ET domaine actif", () => {
  it("jouable seulement si les deux sont actifs", () => {
    expect(competenceActivable("MA", "mesures", ["MA"], ["mesures"])).toBe(true);
    expect(competenceActivable("MA", "mesures", ["FR"], ["mesures"])).toBe(false); // matiere off
    expect(competenceActivable("MA", "mesures", ["MA"], ["fractions"])).toBe(false); // domaine off
  });
});

describe("auMoinsUneSousMatiere : garde-fou >= 1 sous-matiere jouable", () => {
  it("vrai quand une matiere active a un domaine actif", () => {
    expect(auMoinsUneSousMatiere(["MA"], ["mesures"])).toBe(true);
    expect(auMoinsUneSousMatiere(["MA", "FR"], TOUS_DOMAINES)).toBe(true);
  });

  it("faux si plus aucune sous-matiere jouable", () => {
    expect(auMoinsUneSousMatiere([], TOUS_DOMAINES)).toBe(false); // aucune matiere
    expect(auMoinsUneSousMatiere(["MA"], [])).toBe(false); // aucune sous-matiere
    // FR actif mais seuls des domaines MA actifs -> rien a jouer en FR.
    expect(auMoinsUneSousMatiere(["FR"], ["mesures", "fractions"])).toBe(false);
  });

  it("retirer la derniere sous-matiere d'une matiere seule est refuse", () => {
    // MA seule, on ne garde que 'numeration' -> encore une -> ok.
    expect(auMoinsUneSousMatiere(["MA"], ["numeration"])).toBe(true);
    // puis on retire 'numeration' -> plus rien -> refuse.
    expect(auMoinsUneSousMatiere(["MA"], [])).toBe(false);
  });
});
