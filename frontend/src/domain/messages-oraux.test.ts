// Garde-fou : tous les messages enfant et tous les indices sont rediges POUR
// L'ORAL. Ils ne contiennent AUCUN symbole qui ne se dit pas a voix haute :
// pas de fleche, pas de barre oblique, pas de guillemet decoratif.

import { describe, it, expect } from "vitest";
import { MESSAGES_CONJUGAISON } from "./diagnostic/conjugaison";
import { MESSAGES_PASSE_COMPOSE } from "./diagnostic/passe-compose";
import { MESSAGES_DICTEE } from "./diagnostic/dictee";
import { MESSAGES_CATALOGUE } from "./diagnostic/diagnostic";
import { INDICES, indicePour } from "./indices";

// Caracteres interdits dans un texte lu a voix haute.
const INTERDITS = ["→", "←", "⇒", "/", "«", "»", "…"];

function verifieOral(source: string, textes: string[]) {
  for (const t of textes) {
    for (const c of INTERDITS) {
      expect(t.includes(c), `${source} contient le symbole interdit « ${c} » : ${t}`).toBe(false);
    }
    // Pas d'abreviation du type « ex. » (on dit « par exemple »).
    expect(/\bex\.\s/i.test(t), `${source} contient une abreviation « ex. » : ${t}`).toBe(false);
  }
}

describe("messages enfant rediges pour l'oral", () => {
  it("conjugaison : aucun symbole non parlable", () => {
    verifieOral("MESSAGES_CONJUGAISON", Object.values(MESSAGES_CONJUGAISON));
  });
  it("passe compose : aucun symbole non parlable", () => {
    verifieOral("MESSAGES_PASSE_COMPOSE", Object.values(MESSAGES_PASSE_COMPOSE));
  });
  it("dictee : aucun symbole non parlable", () => {
    verifieOral("MESSAGES_DICTEE", Object.values(MESSAGES_DICTEE));
  });
  it("nombres en lettres : aucun symbole non parlable", () => {
    verifieOral("MESSAGES_CATALOGUE", Object.values(MESSAGES_CATALOGUE));
  });
  it("indices : aucun symbole non parlable", () => {
    verifieOral("INDICES", Object.values(INDICES));
  });
});

describe("indices (bouton Indice)", () => {
  it("existent pour toutes les competences du moteur", () => {
    // Un indice par type d'exercice / competence.
    const COMPETENCES = [
      "FR.CONJ.PRESENT", "FR.CONJ.FUTUR", "FR.CONJ.IMPARFAIT", "FR.CONJ.PASSE_COMPOSE",
      "FR.ORTHO.DETECTIVE",
      "MA.CM.ADDITION", "MA.CM.COMPL_SUP", "MA.CM.DIV_RESTE", "MA.CM.DOUBLES",
      "MA.CM.MOITIES", "MA.CM.SOMMES_DIFF", "MA.FRAC.SIMPLES",
      "MA.MES.DUREES", "MA.MES.HEURE", "MA.MES.LONGUEURS", "MA.MES.MASSES_CONTENANCES",
      "MA.NUM.COMPARER", "MA.NUM.DECOMPOSER", "MA.NUM.LIRE_ECRIRE", "MA.NUM.SUITE",
      "MA.PB.ADD_SUB", "MA.PB.DEUX_ETAPES", "MA.PB.MESURES", "MA.PB.MONNAIE", "MA.PB.MULT_DIV",
      "MA.POSE.ADDITION", "MA.POSE.SOUSTRACTION", "MA.POSE.MULTIPLICATION",
    ];
    for (const c of COMPETENCES) {
      expect(INDICES[c], `indice manquant pour ${c}`).toBeTruthy();
    }
  });

  it("sont proposes aux niveaux 1 et 2 SEULEMENT (plus rien au niveau 3 et 4)", () => {
    expect(indicePour("FR.CONJ.PRESENT", 1)).toBeTruthy();
    expect(indicePour("FR.CONJ.PRESENT", 2)).toBeTruthy();
    expect(indicePour("FR.CONJ.PRESENT", 3)).toBeNull();
    expect(indicePour("FR.CONJ.PRESENT", 4)).toBeNull();
  });

  it("renvoie null pour une competence inconnue", () => {
    expect(indicePour("MA.INCONNU", 1)).toBeNull();
  });
});
