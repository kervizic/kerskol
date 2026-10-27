// Garde-fou anti-« moins moins » (bug prod du 27/10/2026).
//
// Symptome : sur une soustraction, la voix ne disait que « moins » sans les
// nombres. Cause historique : un ancien catalogue incomplet (voix pilote
// naf_D-v1, nombres 0..30) ; le lecteur sautait la brique nombre absente et ne
// jouait que l'operateur. La « regle d'or » (ne jamais lire une phrase
// incomplete) et la bascule vers le catalogue complet c1s33-v1 corrigent cela.
//
// Ce test verifie, sur un ECHANTILLON LARGE d'enonces generes + des cas limites,
// que contre le MANIFEST PROD reel :
//   1. aucune sequence JOUABLE ne lit un operateur sans aucun nombre ;
//   2. une sequence dont une brique manque n'est JAMAIS jouable (regle d'or :
//      pas de lecture partielle qui laisserait tomber un nombre) ;
//   3. les soustractions « normales » (dans le catalogue) sont lues en entier ;
//   4. un nombre hors catalogue (> 10000) rend la phrase non jouable (bouton
//      grise) au lieu de lire l'operateur seul.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generateExercise, type GeneratedExercise } from "../../domain/calcul/generator";
import { SEED_SOURCES } from "../../domain/calcul/seedSources";
import { enonceEnCles } from "./verbalize";
import { clesManquantes, sequenceJouable, type VoixManifest } from "./manifest";

// Manifest PROD committe (servi a /voix/manifest.json, copie dans dist au build).
const manifest: VoixManifest = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../public/voix/manifest.json", import.meta.url)), "utf8")
);

function echantillon(): GeneratedExercise[] {
  const out: GeneratedExercise[] = [];
  for (const src of SEED_SOURCES) {
    for (let seed = 1; seed <= 40; seed++) {
      out.push(generateExercise(src, seed * 7919 + src.niveau));
    }
  }
  return out;
}

const OP_GLYPHE = /[+\-−×÷]/;

describe("Garde-fou voix : jamais de lecture partielle (bug « moins moins »)", () => {
  const exos = echantillon();

  it("le manifest prod complet est charge", () => {
    expect(manifest.voice).toBe("c1s33-v1");
    expect(Object.keys(manifest.keys).length).toBeGreaterThan(1000);
    expect(manifest.keys["op:moins"]).toBeTruthy();
    expect(manifest.keys["num:52"]).toBeTruthy();
    expect(manifest.keys["num:17"]).toBeTruthy();
  });

  it("aucun enonce jouable ne lit un operateur sans aucun nombre", () => {
    for (const g of exos) {
      const cles = enonceEnCles(g.prompt);
      if (!sequenceJouable(manifest, cles)) continue; // grise = OK (regle d'or)
      if (!/\d/.test(g.prompt)) continue; // pas de chiffre a dire
      const nbNombres = cles.filter((c) => c.startsWith("num:")).length;
      expect(
        nbNombres,
        `operateur sans nombre (${g.competence} n${g.niveau}) « ${g.prompt} » -> ${cles.join(" ")}`
      ).toBeGreaterThan(0);
    }
  });

  it("une brique manquante rend TOUTE la phrase non jouable (regle d'or)", () => {
    for (const g of exos) {
      const cles = enonceEnCles(g.prompt);
      if (cles.length === 0) continue;
      if (clesManquantes(manifest, cles).length > 0) {
        expect(
          sequenceJouable(manifest, cles),
          `lecture partielle possible (${g.competence} n${g.niveau}) « ${g.prompt} » -> ${cles.join(" ")}`
        ).toBe(false);
      }
    }
  });

  it("soustractions du catalogue : lues en entier (nombres + moins)", () => {
    const cas = [
      "52 − 17",
      "52 - 17",
      "Pose et calcule : 52 − 17",
      "Combien font 100 − 45 ?",
      "80 − 7",
      "63 − 28",
      "1 234 − 17", // separateur de milliers : doit se dire « mille deux cent... »
    ];
    for (const p of cas) {
      const cles = enonceEnCles(p);
      expect(clesManquantes(manifest, cles), `${p} -> ${cles.join(" ")}`).toEqual([]);
      expect(cles).toContain("op:moins");
      expect(cles.filter((c) => c.startsWith("num:")).length, p).toBeGreaterThanOrEqual(2);
    }
  });

  it("« 1 234 » (espace de milliers) ne se scinde pas en 1 et 234", () => {
    expect(enonceEnCles("1 234 − 17")).toEqual(["num:1000", "num:234", "op:moins", "num:17"]);
  });

  it("nombre hors catalogue (> 10000) : phrase non jouable, pas « moins » seul", () => {
    for (const p of ["12 500 − 300", "15000 − 3", "99999 × 2"]) {
      const cles = enonceEnCles(p);
      expect(OP_GLYPHE.test(p)).toBe(true);
      expect(sequenceJouable(manifest, cles), `${p} -> ${cles.join(" ")}`).toBe(false);
    }
  });
});
