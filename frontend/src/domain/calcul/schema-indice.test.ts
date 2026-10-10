// Lot A - Schema en barres propose en INDICE pour les calculs additifs.
//
// Quand l'enfant n'a plus le schema en haut (support « aucun », des le niveau 2),
// une addition ou un complement porte un `barres` tout/parties : l'inconnue
// reste « ? » (la reponse n'est JAMAIS revelee) et le tout = la somme des parties.
import { describe, it, expect } from "vitest";
import { generateExercise, type BarModel, type GeneratedExercise } from "./generator";
import { SEED_SOURCES } from "./seedSources";

function cellules(b: BarModel) {
  return [...(b.whole ? [b.whole] : []), ...b.parts, ...(b.diff ? [b.diff] : [])];
}

// Sûreté commune a TOUT schema : chaque inconnue est affichee « ? » (la reponse
// n'est jamais revelee en aide).
function inconnueCachee(g: GeneratedExercise) {
  for (const c of cellules(g.barres!)) {
    if (c.unknown) expect(c.label, `inconnue cachee (${g.prompt})`).toBe("?");
    else expect(c.label).not.toBe("?");
  }
}

// Invariants PROPRES au schema additif d'indice (addition / complement) : une
// seule inconnue, et le tout = la somme des parties.
function invariantsAdditif(g: GeneratedExercise) {
  const b = g.barres!;
  inconnueCachee(g);
  const inconnues = cellules(b).filter((c) => c.unknown);
  expect(inconnues.length, `une seule inconnue (${g.prompt})`).toBe(1);
  if (b.variant === "tout_parties" && b.whole) {
    const sommeParts = b.parts.reduce((s, c) => s + c.value, 0);
    expect(b.whole.value, `tout = somme des parties (${g.prompt})`).toBe(sommeParts);
  }
}

describe("Lot A - schema en barres en indice (calculs additifs)", () => {
  const additifs = SEED_SOURCES.filter(
    (s) => s.operation === "add" || s.operation === "complement"
  );

  it("existe des sources additives dans le referentiel", () => {
    expect(additifs.length).toBeGreaterThan(0);
  });

  it("au niveau 2+ (sans schema en haut), l'addition/complement porte un schema d'indice", () => {
    let vus = 0;
    for (const src of additifs) {
      if (src.niveau < 2) continue;
      for (let seed = 1; seed <= 12; seed++) {
        const g = generateExercise(src, seed * 7919 + src.niveau);
        if (g.saisie !== "clavier") continue; // le pose en colonnes a deja sa methode visuelle
        if (g.forme === "ordre_grandeur") continue; // estimation : pas de schema
        if (g.support !== "aucun") continue;
        expect(g.barres, `schema attendu (${src.competence} n${src.niveau} : ${g.prompt})`).toBeTruthy();
        invariantsAdditif(g);
        vus++;
      }
    }
    expect(vus, "au moins quelques exercices additifs avec schema").toBeGreaterThan(0);
  });

  it("au niveau 1 avec schema en haut (support != aucun), pas de schema d'indice en double", () => {
    for (const src of additifs) {
      if (src.niveau !== 1) continue;
      for (let seed = 1; seed <= 12; seed++) {
        const g = generateExercise(src, seed * 104729 + src.niveau);
        if (g.support !== "aucun") {
          expect(g.barres, `pas de schema en double au n1 (${g.prompt})`).toBeFalsy();
        }
      }
    }
  });

  it("tout schema genere garde l'inconnue cachee (aucune reponse revelee)", () => {
    for (const src of SEED_SOURCES) {
      for (let seed = 1; seed <= 8; seed++) {
        const g = generateExercise(src, seed * 7919 + src.niveau);
        if (g.barres) inconnueCachee(g);
      }
    }
  });
});
