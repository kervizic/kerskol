// Capture Playwright des stories (revue visuelle des composants d'UI).
// Prerequis : `vite build --config vite.stories.config.ts` a produit
// stories-dist/stories.js + stories-dist/stories.css.
//
// Pour chaque largeur (390 px telephone, 820 px tablette) et chaque section
// [data-story], ecrit un PNG dans OUT_DIR (defaut ../docs/captures, hors git).
// Tourne dans l'image mcr.microsoft.com/playwright sur le VPS (Chromium fourni).
//
// Usage : node stories/capture.mjs [outDir]
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, "../stories-dist");
const outDir = resolve(here, process.argv[2] || "../../docs/captures");
mkdirSync(outDir, { recursive: true });

const js = readFileSync(resolve(distDir, "stories.js"), "utf8");
let css = "";
try {
  css = readFileSync(resolve(distDir, "stories.css"), "utf8");
} catch {
  // cssCodeSplit=false peut nommer le fichier autrement selon la version.
  css = readFileSync(resolve(distDir, "style.css"), "utf8");
}

const WIDTHS = [
  { tag: "390", w: 390 }, // telephone
  { tag: "820", w: 820 }, // tablette
];

const browser = await chromium.launch();
let count = 0;
try {
  for (const { tag, w } of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 });
    await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>', { waitUntil: "load" });
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: js });
    await page.waitForSelector("[data-story]");
    const sections = await page.$$("[data-story]");
    for (const s of sections) {
      const id = await s.getAttribute("data-story");
      const file = resolve(outDir, `${id}-${tag}.png`);
      await s.screenshot({ path: file });
      count++;
      console.log(`capture: ${file}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(`OK : ${count} captures dans ${outDir}`);
