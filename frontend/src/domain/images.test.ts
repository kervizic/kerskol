// Garde-fou des ILLUSTRATIONS libres de droit (lot 2) :
//   * chaque image associee existe dans le catalogue IMAGES ;
//   * chaque cle d'item illustree existe vraiment dans une banque (QM ou EMC) ;
//   * chaque fichier image est bien HEBERGE dans le depot, non vide et <= 50 Ko ;
//   * chaque image porte un texte alternatif en francais non vide ;
//   * les credits sont complets (source, auteur, licence, URL).

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { IMAGES, ILLUSTRATIONS, illustrationPourCle, imagesCreditees } from "./images";
import { BANQUE_QM } from "./qm";
import { BANQUE_EMC } from "./emc";

const CLES = new Set([...BANQUE_QM, ...BANQUE_EMC].map((i) => i.cle));
const MAX = 50 * 1024; // 50 Ko

describe("illustrations libres de droit", () => {
  it("chaque illustration pointe vers une image connue", () => {
    for (const [cle, key] of Object.entries(ILLUSTRATIONS)) {
      expect(IMAGES[key], `image inconnue « ${key} » (cle ${cle})`).toBeDefined();
    }
  });

  it("chaque cle illustree existe dans une banque (QM ou EMC)", () => {
    for (const cle of Object.keys(ILLUSTRATIONS)) {
      expect(CLES.has(cle), `cle inconnue dans les banques : ${cle}`).toBe(true);
    }
  });

  it("chaque image est hebergee dans le depot, non vide et <= 50 Ko", () => {
    for (const [key, info] of Object.entries(IMAGES)) {
      expect(info.src.startsWith("/img/"), `${key} doit etre local (/img/...)`).toBe(true);
      expect(info.src.includes("http"), `${key} ne doit pas etre un lien externe`).toBe(false);
      const path = resolve(process.cwd(), "public", info.src.replace(/^\//, ""));
      expect(existsSync(path), `fichier manquant : ${path}`).toBe(true);
      const size = statSync(path).size;
      expect(size, `${key} vide`).toBeGreaterThan(0);
      expect(size, `${key} trop lourd (${size} octets)`).toBeLessThanOrEqual(MAX);
      // Contenu : vrai SVG, sans script.
      const svg = readFileSync(path, "utf8");
      expect(svg.includes("<svg"), `${key} n'est pas un SVG`).toBe(true);
      expect(/<script|onload=|javascript:/i.test(svg), `${key} contient du script`).toBe(false);
    }
  });

  it("chaque image a un alt en francais non vide et des credits complets", () => {
    for (const [key, info] of Object.entries(IMAGES)) {
      expect(info.alt.trim().length, `${key} sans alt`).toBeGreaterThan(5);
      expect(info.source.trim().length, `${key} sans source`).toBeGreaterThan(0);
      expect(info.auteur.trim().length, `${key} sans auteur`).toBeGreaterThan(0);
      expect(info.licence.trim().length, `${key} sans licence`).toBeGreaterThan(0);
      expect(info.url.startsWith("https://"), `${key} sans URL source`).toBe(true);
    }
  });

  it("illustrationPourCle renvoie l'image attendue, ou null", () => {
    const joie = illustrationPourCle("emc-emo-rec-n1-a");
    expect(joie?.src).toBe("/img/emoji/joie.svg");
    expect(illustrationPourCle("cle-sans-image")).toBeNull();
  });

  it("imagesCreditees est dedupliquee et non vide", () => {
    const creds = imagesCreditees();
    expect(creds.length).toBeGreaterThan(0);
    const srcs = creds.map((c) => c.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });
});
