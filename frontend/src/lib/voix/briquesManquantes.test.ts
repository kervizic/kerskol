// Bug du 10/10 : la voix lisait une phrase INCOMPLETE pour une addition car le
// clip du 1er nombre n'etait pas encore genere (catalogue pilote num:0..30). Le
// lecteur sautait silencieusement la brique absente. Regle corrigee : on ne joue
// QUE si toutes les briques existent ; sinon on ne joue rien et on journalise les
// clips manquants (bouton grise cote interface).

import { describe, it, expect, beforeEach } from "vitest";
import { clesManquantes, sequenceJouable, type VoixManifest } from "./manifest";
import { enonceEnCles } from "./verbalize";
import {
  signalerBriquesManquantes,
  briquesManquantesConnues,
  reinitialiserJournalBriques,
} from "./journal";

// Manifest PILOTE identique a la prod : nombres 0..30 + operateurs, pas d'amorce.
function manifestPilote(): VoixManifest {
  const keys: Record<string, string> = {};
  for (let n = 0; n <= 30; n++) keys[`num:${n}`] = `id-num-${n}`;
  keys["op:plus"] = "id-plus";
  keys["op:moins"] = "id-moins";
  const clips: VoixManifest["clips"] = {};
  for (const id of Object.values(keys)) clips[id] = { text: "x", ms: 400, cat: "nombre" };
  return { voice: "naf_D-v1", format: "mp3", sample_rate: 24000, bitrate: "64k", clips, keys };
}

describe("clesManquantes / sequenceJouable", () => {
  const m = manifestPilote();

  it("addition hors catalogue (47 + 38) : briques manquantes, non jouable", () => {
    const cles = enonceEnCles("47 + 38");
    expect(cles).toEqual(["num:47", "op:plus", "num:38"]);
    expect(clesManquantes(m, cles)).toEqual(["num:47", "num:38"]);
    expect(sequenceJouable(m, cles)).toBe(false);
  });

  it("enonce « Combien font 47 + 38 ? » : amorce + nombres manquants", () => {
    const cles = enonceEnCles("Combien font 47 + 38 ?");
    expect(clesManquantes(m, cles)).toEqual(["amorce:combien-font", "num:47", "num:38"]);
    expect(sequenceJouable(m, cles)).toBe(false);
  });

  it("addition dans le catalogue (12 + 8) : rien ne manque, jouable", () => {
    const cles = enonceEnCles("12 + 8");
    expect(clesManquantes(m, cles)).toEqual([]);
    expect(sequenceJouable(m, cles)).toBe(true);
  });

  it("manifest absent : tout est considere manquant (non jouable)", () => {
    const cles = enonceEnCles("12 + 8");
    expect(clesManquantes(null, cles)).toEqual(cles);
    expect(sequenceJouable(null, cles)).toBe(false);
  });

  it("enonce sans brique voixable (texte pur) : non jouable (bouton grise)", () => {
    expect(sequenceJouable(m, enonceEnCles("Range les mots dans l'ordre"))).toBe(false);
  });
});

describe("journal des briques manquantes", () => {
  beforeEach(() => reinitialiserJournalBriques());

  it("memorise les cles absentes, sans doublon, triees", () => {
    expect(signalerBriquesManquantes(["num:47", "num:38"])).toBe(true);
    expect(signalerBriquesManquantes(["num:47"])).toBe(false); // deja connue
    expect(signalerBriquesManquantes(["num:85"])).toBe(true);
    expect(briquesManquantesConnues()).toEqual(["num:38", "num:47", "num:85"]);
  });
});
