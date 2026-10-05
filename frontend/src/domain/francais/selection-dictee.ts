// CHOIX DU TEXTE de la dictee detective PAR NIVEAU (aucune logique de calendrier).
// Comme en maths : chaque notion a son suivi (escalier) ; l'enfant avance aussi
// vite que son niveau le permet. Fonction PURE et deterministe (rng injectable)
// pour etre testable (selection-dictee.test.ts). Voir docs/pedagogie.md.

import type { DicteeTexte } from "./dictee";

// Contexte servi par le serveur (dictee_contexte), sans aucune date :
//   ordre    = codes des notions dans l'ordre de presentation ;
//   maitrise = notion -> maitrisee (serie de reussites >= 2) ;
//   lacunes  = notion -> nb d'echecs quand la notion est en difficulte ;
//   vus      = ids des derniers textes faits (anti-repetition).
export interface ContexteDictee {
  niveau: number;
  ordre: string[];
  maitrise?: Record<string, boolean>;
  lacunes?: Record<string, number>;
  vus?: number[];
}

// Notion a travailler en priorite, dans l'ordre :
//   1. LACUNES : la notion la plus en difficulte (plus d'echecs ; a egalite, la
//      plus en amont dans l'ordre) ;
//   2. FRONTIERE : la 1re notion non maitrisee dans l'ordre (prerequis = l'ordre) ;
//   3. REVISION : tout est maitrise -> on revise ('revision').
export function notionCible(ctx: ContexteDictee): string {
  const maitrise = ctx.maitrise ?? {};
  const lacunes = ctx.lacunes ?? {};
  const idx = (n: string) => {
    const i = ctx.ordre.indexOf(n);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  const lac = Object.entries(lacunes).filter(([, n]) => n > 0);
  if (lac.length > 0) {
    lac.sort((a, b) => b[1] - a[1] || idx(a[0]) - idx(b[0]));
    return lac[0][0];
  }
  const frontiere = ctx.ordre.find((n) => !maitrise[n]);
  return frontiere ?? "revision";
}

export function choisirTexteDictee(
  bank: DicteeTexte[],
  ctx: ContexteDictee,
  rng: () => number = Math.random,
): DicteeTexte | null {
  if (!bank || bank.length === 0) return null;
  const vus = new Set(ctx.vus ?? []);

  // 1) Niveau de l'enfant, repli au niveau disponible le plus proche.
  let pool = bank.filter((t) => t.niveau === ctx.niveau);
  if (pool.length === 0) {
    const niveaux = [...new Set(bank.map((t) => t.niveau))].sort(
      (a, b) => Math.abs(a - ctx.niveau) - Math.abs(b - ctx.niveau) || a - b,
    );
    pool = bank.filter((t) => t.niveau === niveaux[0]);
  }

  // 2) Pas de repetition recente (sauf epuisement).
  const frais = pool.filter((t) => !vus.has(t.id));
  const candidats = frais.length > 0 ? frais : pool;

  // 3) Notion cible -> textes de cette notion ; repli sur tous les candidats.
  const cible = notionCible(ctx);
  const cibles = candidats.filter((t) => (t.notion ?? "") === cible);
  const finalPool = cibles.length > 0 ? cibles : candidats;

  return finalPool[Math.floor(rng() * finalPool.length)] ?? null;
}
