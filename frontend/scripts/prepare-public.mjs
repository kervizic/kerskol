// prepare-public.mjs — prepare public/ avant le build Vite.
//
// Copie frontend/theme/ (tokens.css + police Andika + app-version.js + OFL) vers
// frontend/public/theme/ pour que les pages legales STATIQUES (public/*.html),
// non transformees par Vite, trouvent /theme/tokens.css et /theme/fonts/* a
// l'execution. L'application React, elle, importe tokens.css via Vite (empreinte
// de contenu, cache long propre). public/theme/ est genere (voir .gitignore).
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const themeSrc = resolve(here, "..", "theme");
const themeDst = resolve(here, "..", "public", "theme");

if (!existsSync(themeSrc)) {
  console.error(`theme source introuvable: ${themeSrc}`);
  process.exit(1);
}

rmSync(themeDst, { recursive: true, force: true });
cpSync(themeSrc, themeDst, { recursive: true });
console.log(`theme copie vers public/theme (${themeDst})`);
