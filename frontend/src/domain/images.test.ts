// Garde-fou des ILLUSTRATIONS libres de droit (lot 2) :
//   * chaque image associee existe dans le catalogue IMAGES ;
//   * chaque cle d'item illustree existe vraiment dans une banque (QM ou EMC) ;
//   * chaque fichier image est bien HEBERGE dans le depot, non vide et <= 50 Ko ;
//   * chaque image porte un texte alternatif en francais non vide ;
//   * les credits sont complets (source, auteur, licence, URL).

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { IMAGES, ILLUSTRATIONS, illustrationPourCle, illustrationPourEnonce, imagesCreditees } from "./images";
import { BANQUE_QM } from "./qm";
import { BANQUE_EMC } from "./emc";
import { BANQUE_GEOMETRIE } from "./geometrie/geometrie";

const CLES = new Set([...BANQUE_QM, ...BANQUE_EMC, ...BANQUE_GEOMETRIE].map((i) => i.cle));
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

  it("le lot QM (matiere, objets, espace, temps, vivant) ajoute ses illustrations", () => {
    const attendues: Record<string, string> = {
      "qm-viv-cha-n1-a": "/img/emoji/lapin.svg",
      "qm-viv-cha-n1-b": "/img/emoji/lion.svg",
      "qm-viv-cyc-n2-a": "/img/emoji/poule.svg",
      "qm-viv-cyc-n1-b": "/img/emoji/grenouille.svg",
      "qm-mat-eta-n1-b": "/img/emoji/glacon.svg",
      "qm-mat-air-n1-a": "/img/emoji/ballon.svg",
      "qm-obj-fon-n1-a": "/img/emoji/parapluie.svg",
      "qm-obj-fon-n1-b": "/img/emoji/ciseaux.svg",
      "qm-esp-car-n1-a": "/img/emoji/soleil.svg",
      "qm-esp-car-n4-b": "/img/emoji/soleil.svg",
      "qm-tps-fri-n3-a": "/img/emoji/gateau.svg",
    };
    for (const [cle, src] of Object.entries(attendues)) {
      expect(illustrationPourCle(cle)?.src, `illustration manquante pour ${cle}`).toBe(src);
    }
  });

  it("le lot Geometrie associe un objet du quotidien aux solides (N2)", () => {
    expect(illustrationPourCle("geo-sol-n2-de")?.src).toBe("/img/emoji/de.svg");
    expect(illustrationPourCle("geo-sol-n2-boite")?.src).toBe("/img/emoji/boite.svg");
    expect(illustrationPourCle("geo-sol-n2-ballon")?.src).toBe("/img/emoji/ballon-foot.svg");
  });

  it("illustrationPourEnonce reconnait l'objet du probleme, sans nombre ni reponse", () => {
    expect(illustrationPourEnonce("Maya cueille 12 pommes puis 7 pommes.")?.src).toBe("/img/emoji/pomme.svg");
    expect(illustrationPourEnonce("Tom achète 3 livres à 4 € chacun.")?.src).toBe("/img/emoji/livre.svg");
    expect(illustrationPourEnonce("Lila range 24 crayons dans 4 trousses.")?.src).toBe("/img/emoji/crayon.svg");
    expect(illustrationPourEnonce("Noé a un casse-tête de 500 pièces.")?.src).toBe("/img/emoji/cassetete.svg");
    // Equation pure (sans objet) : aucune image.
    expect(illustrationPourEnonce("2 + 5 = [q]")).toBeNull();
    // Pas de faux positif sur un mot plus long (« planter »).
    expect(illustrationPourEnonce("Il va planter demain à 8 h.")).toBeNull();
  });

  it("toutes les images du registre restent du Fluent Emoji MIT (style homogene)", () => {
    for (const info of Object.values(IMAGES)) {
      expect(info.licence, `${info.src} doit rester MIT`).toBe("MIT");
      expect(info.source.includes("Fluent"), `${info.src} doit etre du Fluent Emoji`).toBe(true);
    }
  });
});
