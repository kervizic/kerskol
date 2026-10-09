// Tests de la bibliotheque de textes du domaine public (lot 0060).
// Verifie que chaque texte integre porte bien son auteur, son oeuvre, sa source
// de verification (domaine public), un corps non vide et un glossaire propre.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { BIBLIOTHEQUE, BIBLIO_AUTEURS } from "./bibliotheque";

// Regle de contenu (decision Manu, 9 octobre 2026) : on ne COUPE JAMAIS un texte
// pour le rendre acceptable. Si un passage ne respecte pas les criteres de
// bienveillance, le texte ENTIER est retire (pas d'extrait tronque « pour
// retirer un mot »). Ce garde-fou verifie qu'aucun texte de la Bibliotheque ni
// aucun item de comprehension n'est un extrait « coupe pour la bienveillance ».
const MARQUEURS_COUPE = [
  /extraits?\s+coup[ée]/i, // « extrait coupé », « extraits coupés »
  /extraits?\s+arr[êe]t[ée]/i, // « extrait arrêté à la limite… »
  /textes?\s+r[ée]cup[ée]r[ée]/i, // « texte récupéré (décision Manu) »
  /fables?\s+r[ée]cup[ée]r[ée]/i, // « 3 fables récupérées »
  /on\s+coupe\s+la\s+sc[èe]ne/i,
  /garde-fou\s+bienveillance\s+passe/i,
];

describe("bibliotheque : textes du domaine public", () => {
  it("contient des textes (au moins 40) et des identifiants uniques", () => {
    expect(BIBLIOTHEQUE.length).toBeGreaterThanOrEqual(40);
    const ids = BIBLIOTHEQUE.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque texte a auteur, oeuvre, titre, source et un corps non vide", () => {
    for (const t of BIBLIOTHEQUE) {
      expect(t.auteur.trim().length, `${t.id} auteur`).toBeGreaterThan(0);
      expect(t.oeuvre.trim().length, `${t.id} oeuvre`).toBeGreaterThan(0);
      expect(t.titre.trim().length, `${t.id} titre`).toBeGreaterThan(0);
      expect(["CE1", "CE2", "CM1"], `${t.id} classe`).toContain(t.classe);
      expect(t.url.startsWith("http"), `${t.id} url`).toBe(true);
      expect(Array.isArray(t.corps) && t.corps.length, `${t.id} corps`).toBeGreaterThan(0);
      expect(t.corps.every((p) => p.trim().length > 0), `${t.id} corps vide`).toBe(true);
      // librivoxUrl : emplacement reserve (vide pour l'instant), toujours une chaine.
      expect(typeof t.librivoxUrl, `${t.id} librivoxUrl`).toBe("string");
    }
  });

  it("glossaire : chaque entree a un mot et un sens non vides", () => {
    for (const t of BIBLIOTHEQUE) {
      for (const g of t.glossaire) {
        expect(g.mot.trim().length, `${t.id} glose mot`).toBeGreaterThan(0);
        expect(g.sens.trim().length, `${t.id} glose sens`).toBeGreaterThan(0);
      }
    }
  });

  it("garde-fou : aucun texte n'est un extrait « coupé pour la bienveillance »", () => {
    const ici = fileURLToPath(new URL(".", import.meta.url));
    const sources = ["bibliotheque.ts", "comprehension.ts"].map((f) =>
      readFileSync(ici + f, "utf-8"),
    );
    for (const [i, src] of sources.entries()) {
      for (const marqueur of MARQUEURS_COUPE) {
        expect(
          marqueur.test(src),
          `marqueur de coupe interdit (${marqueur}) dans ${["bibliotheque.ts", "comprehension.ts"][i]}`,
        ).toBe(false);
      }
    }
  });

  it("la liste des auteurs couvre tous les auteurs des textes", () => {
    const auteurs = new Set(BIBLIOTHEQUE.map((t) => t.auteur));
    for (const a of auteurs) {
      expect(BIBLIO_AUTEURS, `auteur ${a} manquant`).toContain(a);
    }
    // ... et aucun auteur listé n'est vide.
    expect(BIBLIO_AUTEURS.every((a) => a.trim().length > 0)).toBe(true);
  });
});
