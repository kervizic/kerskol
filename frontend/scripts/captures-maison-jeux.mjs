// Captures de la « Maison des jeux » integree (2 jeux) + « Les briques » en
// cours. Largeurs mobiles cibles : 390 px et 820 px. Le serveur dev doit tourner
// en mode demo (VITE_DEMO=1) sur le port indique.
//   node scripts/captures-maison-jeux.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:5199";
const OUT = process.argv[3] || "captures-maison";
const ROUTE = `${BASE}/enfant/demo-lou/maison-jeux`;

mkdirSync(OUT, { recursive: true });

const LARGEURS = [
  { nom: "390", w: 390, h: 820 },
  { nom: "820", w: 820, h: 1180 },
];

const browser = await chromium.launch();
try {
  for (const { nom, w, h } of LARGEURS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();

    // On passe par l'accueil demo (charge les profils) puis on ouvre la route
    // enfant : un deep-link direct redirige tant que les profils ne sont pas la.
    await page.goto(`${BASE}/?demo=1`, { waitUntil: "networkidle" });
    await page.getByText("Lou", { exact: true }).click();
    await page.waitForURL(/\/enfant\/demo-lou\/village/);

    // Accueil « Maison des jeux » : les deux jeux visibles.
    await page.goto(ROUTE, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "La Maison des jeux" }).waitFor();
    await page.getByRole("heading", { name: "Relie les fruits" }).waitFor();
    await page.getByRole("heading", { name: "Les briques" }).waitFor();
    await page.screenshot({ path: `${OUT}/maison-accueil-${nom}.png` });
    console.log(`ok accueil ${nom}`);

    // Les briques en cours : clic sur le 2e bouton « Jouer — ».
    const boutons = page.getByRole("button", { name: /Jouer —/ });
    await boutons.nth(1).click();
    await page.locator("canvas").waitFor();
    await page.getByRole("button", { name: /Tourner/ }).waitFor();
    // Laisse quelques frames se dessiner (piece visible).
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/briques-en-cours-${nom}.png` });
    console.log(`ok briques ${nom}`);

    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log("captures terminees dans", OUT);
