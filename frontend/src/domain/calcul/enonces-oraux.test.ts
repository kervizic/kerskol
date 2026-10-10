// Lot C - Garde-fou sur TOUS les enonces de calcul generes.
//
// Un enonce est lu (clips audio) ET surtout affiche a l'enfant ou dit par un
// parent. Il ne doit donc contenir AUCUN symbole qui ne se dit pas (fleche,
// double fleche), AUCUNE abreviation (« ex. », « etc. ») et AUCUN mot de jargon
// scolaire non explique (numerateur, denominateur, quotient...).
//
// Symboles AUTORISES dans un enonce (ils ont un sens parle ou une convention
// claire, voir docs/enonces-clarifies.md « Table des symboles ») :
//   + plus   − moins   × fois   ÷ divise   = egale
//   /  dans une fraction (num/den, dit « sur »)
//   …  marque le terme a trouver (« trente-sept plus ... egale cinquante-deux »)
//   « » citent un mot ou un nombre ecrit en lettres
import { describe, it, expect } from "vitest";
import { generateExercise, type GeneratedExercise } from "./generator";
import { SEED_SOURCES } from "./seedSources";

// Caracteres jamais tolerables dans un enonce (ils n'ont pas de lecture claire).
const SYMBOLES_INTERDITS = ["→", "←", "⇒", "⇐", "↔", "➔"];

// Mots de jargon a bannir des ENONCES (la consigne doit etre comprise telle
// quelle par un enfant de 8 ans). Ils restent permis dans une correction
// explicative, pas dans la question posee.
const JARGON_INTERDIT = [
  "numérateur", "numerateur", "dénominateur", "denominateur",
  "quotient", "dividende", "diviseur", "opérande", "operande",
  "abscisse", "encadrement",
];

function echantillon(): GeneratedExercise[] {
  const out: GeneratedExercise[] = [];
  for (const src of SEED_SOURCES) {
    for (let seed = 1; seed <= 25; seed++) {
      out.push(generateExercise(src, seed * 7919 + src.niveau));
    }
  }
  return out;
}

describe("Lot C - enonces de calcul lisibles a voix haute", () => {
  const exos = echantillon();

  it("aucun enonce ne contient de fleche ou de symbole non parlable", () => {
    for (const g of exos) {
      for (const sym of SYMBOLES_INTERDITS) {
        expect(
          g.prompt.includes(sym),
          `enonce avec symbole interdit « ${sym} » (${g.competence} n${g.niveau}) : ${g.prompt}`
        ).toBe(false);
      }
    }
  });

  it("aucune correction ne contient de fleche", () => {
    for (const g of exos) {
      const c = g.correction ?? "";
      for (const sym of SYMBOLES_INTERDITS) {
        expect(
          c.includes(sym),
          `correction avec symbole interdit « ${sym} » (${g.competence} n${g.niveau}) : ${c}`
        ).toBe(false);
      }
    }
  });

  it("aucun enonce ne contient d'abreviation (ex., etc.)", () => {
    for (const g of exos) {
      expect(/\bex\.\s/i.test(g.prompt), `abreviation « ex. » : ${g.prompt}`).toBe(false);
      expect(/\betc\.?\b/i.test(g.prompt), `abreviation « etc » : ${g.prompt}`).toBe(false);
    }
  });

  it("aucun enonce ne contient de jargon scolaire non explique", () => {
    for (const g of exos) {
      const p = g.prompt.toLowerCase();
      for (const mot of JARGON_INTERDIT) {
        expect(p.includes(mot), `jargon « ${mot} » dans l'enonce : ${g.prompt}`).toBe(false);
      }
    }
  });

  it("le detecteur reconnait bien une fleche (garde-fou du test)", () => {
    expect(SYMBOLES_INTERDITS.some((s) => "689 → 700".includes(s))).toBe(true);
  });
});
