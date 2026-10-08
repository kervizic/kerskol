// Garde-fou : les fichiers de timings VERSIONNES (public/voix/lecture/<id>.json)
// doivent coller EXACTEMENT au texte affiche dans la Bibliotheque. Si un texte
// est modifie sans re-aligner (ou l'inverse), ce test echoue -> on ne sert
// jamais un audio qui ne correspond pas au texte (bienveillance + mission).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BIBLIOTHEQUE } from "../bibliotheque";
import { texteEnTokens, normaliser } from "./tokenize";
import { controlerTimings, type TimingsTexte } from "./timings";

const DIR = resolve(process.cwd(), "public/voix/lecture");

function lire<T>(nom: string): T {
  return JSON.parse(readFileSync(resolve(DIR, nom), "utf-8")) as T;
}

describe("assets lecture rythmee : timings coherents avec le texte", () => {
  const manifest = lire<{ textes: string[] }>("manifest.json");

  it("le manifeste liste des ids connus de la Bibliotheque", () => {
    for (const id of manifest.textes) {
      expect(BIBLIOTHEQUE.some((t) => t.id === id), `id inconnu: ${id}`).toBe(true);
    }
  });

  for (const id of manifest.textes) {
    it(`${id} : timings valides (couverture, durees, pas de chevauchement)`, () => {
      const texte = BIBLIOTHEQUE.find((t) => t.id === id)!;
      const timings = lire<TimingsTexte>(`${id}.json`);
      const mots = texteEnTokens(texte.corps).map((t) => t.mot);
      const problemes = controlerTimings(timings, mots, normaliser);
      expect(problemes, JSON.stringify(problemes.slice(0, 6))).toEqual([]);
      expect(timings.audio.opus).toBe(`${id}.opus`);
      expect(timings.audio.m4a).toBe(`${id}.m4a`);
    });
  }
});
