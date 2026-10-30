// Rapport de COUVERTURE voix (mesure demandee par Manu, bug voix du 27/10).
// Enumere des exercices reels CE2 (referentiel dumpe de la base) sur plusieurs
// graines, et mesure, texte par texte, la lisibilite avec le MANIFEST PROD.
// Ecrit la liste des clips prose a generer (__fixtures__/voix-a-generer.json).
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mesurerCouverture, pct, type RefRow } from "./couverture";
import type { VoixManifest } from "./manifest";

const url = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const rows: RefRow[] = JSON.parse(readFileSync(url("./__fixtures__/referentiel-ce2.json"), "utf8"));
const manifest: VoixManifest = JSON.parse(readFileSync(url("../../../public/voix/manifest.json"), "utf8"));

// Assez de graines pour depasser ~2000 exercices et stabiliser la variete des
// enonces (verbes, personnes, items de banque).
const SEEDS = Array.from({ length: 16 }, (_, i) => i + 1);

describe("Couverture voix CE2 (mesure)", () => {
  const res = mesurerCouverture(rows, manifest, SEEDS);

  it("enumere un large echantillon d'exercices reels", () => {
    expect(rows.length).toBeGreaterThan(300);
    expect(res.nbExercices).toBeGreaterThan(2000);
  });

  it("imprime le rapport et ecrit la liste a generer", () => {
    const L: string[] = [];
    L.push(`\n=== COUVERTURE VOIX CE2 — manifest ${manifest.voice} (${Object.keys(manifest.clips).length} clips) ===`);
    L.push(`exercices generes : ${res.nbExercices} ; textes distincts : ${res.global.total}`);
    L.push(`\n-- par MATIERE (lisible / total = %) --`);
    for (const [m, b] of Object.entries(res.parMatiere).sort())
      L.push(`  ${m.padEnd(4)} ${String(b.lisibles).padStart(4)}/${String(b.total).padStart(4)} = ${pct(b)}%  (prose:${b.manquants_prose} chiffres:${b.manquants_chiffres} brique:${b.manquants_brique})`);
    L.push(`\n-- par TYPE de texte --`);
    for (const [k, b] of Object.entries(res.parKind).sort())
      L.push(`  ${k.padEnd(11)} ${String(b.lisibles).padStart(4)}/${String(b.total).padStart(4)} = ${pct(b)}%`);
    L.push(`\n-- GLOBAL -- ${res.global.lisibles}/${res.global.total} = ${pct(res.global)}%`);
    L.push(`clips prose a generer (digit-free, dedup) : ${res.aGenerer.length}`);
    L.push(`prose AVEC chiffres (lot ulterieur) : ${res.proseAvecChiffres.length}`);
    L.push(`briques manquantes : ${res.briquesManquantes.length} ${JSON.stringify(res.briquesManquantes.slice(0, 20))}`);
    L.push(`fragments de phrase a generer (corrections en briques) : ${res.fragmentsAGenerer.length}`);
    // eslint-disable-next-line no-console
    console.log(L.join("\n"));

    // Artefacts pour le pipeline de generation + l'inspection manuelle. Ecrits
    // uniquement sur demande (VOIX_WRITE=1) pour ne pas muter l'arbre en CI.
    if (process.env.VOIX_WRITE) {
      writeFileSync(url("./__fixtures__/voix-a-generer.json"),
        JSON.stringify(res.aGenerer.map((g) => ({ texte: g.texte, cat: g.cat, matiere: g.matiere, kind: g.kind, chiffres: g.chiffres })), null, 2), "utf8");
      writeFileSync(url("./__fixtures__/voix-rapport.json"),
        JSON.stringify({ parMatiere: res.parMatiere, parKind: res.parKind, global: res.global,
          proseAvecChiffres: res.proseAvecChiffres, briquesManquantes: res.briquesManquantes }, null, 2), "utf8");
      // Fragments de phrase a generer (frag:<slug>) pour lire les corrections de
      // maths par assemblage de briques (voix C1_s33, graine 1234). Consomme par
      // tools/tts/catalogue.py.
      writeFileSync(url("./__fixtures__/voix-fragments.json"),
        JSON.stringify(res.fragmentsAGenerer, null, 2), "utf8");
    }
    expect(res.aGenerer.length).toBeGreaterThanOrEqual(0);
  });

  it("garde-fou : la couverture maths ne regresse pas (objectif >= 90% avec fragments)", () => {
    // Plancher de NON-REGRESSION mesure contre le manifest prod. Les corrections
    // de maths se lisent par assemblage de briques (fragments frag:* + nombres) :
    // au fur et a mesure que les fragments sont generes et deployes, ce plancher
    // doit MONTER vers l'objectif de 90%. Ne jamais l'abaisser.
    // Objectif de 90% atteint (lot du 30/10, manifest a 6068 clips) : plancher
    // releve de 60 a 90.
    const ma = res.parMatiere["MA"];
    expect(ma, "matiere MA absente du referentiel").toBeTruthy();
    expect(pct(ma)).toBeGreaterThanOrEqual(90);
    expect(pct(res.global)).toBeGreaterThanOrEqual(80);
  });

  it("aucune brique manquante n'est due a un operateur isole de prose", () => {
    // Les briques manquantes ne doivent concerner que des nombres hors catalogue
    // (num:>10000), jamais un op: seul issu d'un trait d'union de mot.
    for (const k of res.briquesManquantes)
      expect(k.startsWith("num:"), `brique manquante inattendue: ${k}`).toBe(true);
  });
});
