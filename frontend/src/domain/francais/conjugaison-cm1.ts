// Conjugaison CM1 : PASSE SIMPLE (3e personnes) et IMPERATIF present.
//
// Extension procedurale du moteur CE2 (conjugaison.ts). Deux temps nouveaux,
// stockes dans la MEME table de reference public.conjugaison (migration 0088)
// avec un code temps dedie :
//   * PASSE SIMPLE  (code 5) : seulement les 3e personnes (il = 3, ils = 6),
//     comme on le rencontre dans les histoires au CM1 ;
//   * IMPERATIF     (code 6) : seulement tu (2), nous (4), vous (5) ; PAS de
//     sujet affiche (c'est un ordre), et le « tu » des verbes en -er ne prend
//     PAS de s (« chante ! », pas « chantes ! »).
//
// SOURCE DE VERITE cliente, miroir EXACT des lignes temps 5/6 de
// public.conjugaison. Le golden cm1Golden() + supabase/tests/conjugaison_cm1_test.sql
// verrouillent l'egalite des deux cotes. Accents et cedille SIGNIFICATIFS.

import type { Personne } from "./conjugaison";

// Codes temps envoyes au serveur (p_a). 1..3 = temps simples (0031),
// 4 = passe compose (0037), 5 = passe simple, 6 = imperatif (0088).
export const PS_CODE = 5;
export const IMP_CODE = 6;

// Temps etendu porte par un exercice de conjugaison (pour le diagnostic et le
// generateur ; n'entre PAS dans la structure Formes du moteur CE2).
export type TempsCm1 = "passe_simple" | "imperatif";

// Personnes effectivement couvertes par chaque temps.
export const PS_PERSONNES: Personne[] = [3, 6];
export const IMP_PERSONNES: Personne[] = [2, 4, 5];

// --- PASSE SIMPLE : formes {personne 3, personne 6} -------------------------
// Verbes en -er reguliers : radical + « a » (il) / « èrent » (ils).
const PS_REG = [
  "chanter", "jouer", "aimer", "regarder", "donner", "trouver", "parler",
];
function psRegulier(infinitif: string): { 3: string; 6: string } {
  const rad = infinitif.slice(0, -2);
  return { 3: `${rad}a`, 6: `${rad}èrent` };
}
const PASSE_SIMPLE: Record<string, { 3: string; 6: string }> = {
  // cas orthographiques -ger / -cer (devant « a » : mangea / plaça).
  manger: { 3: "mangea", 6: "mangèrent" },
  placer: { 3: "plaça", 6: "placèrent" },
  // irreguliers frequents du programme.
  etre: { 3: "fut", 6: "furent" },
  avoir: { 3: "eut", 6: "eurent" },
  aller: { 3: "alla", 6: "allèrent" },
  faire: { 3: "fit", 6: "firent" },
  dire: { 3: "dit", 6: "dirent" },
  venir: { 3: "vint", 6: "vinrent" },
  prendre: { 3: "prit", 6: "prirent" },
  voir: { 3: "vit", 6: "virent" },
};
for (const inf of PS_REG) PASSE_SIMPLE[inf] = psRegulier(inf);

// --- IMPERATIF present : formes {personne 2 (tu), 4 (nous), 5 (vous)} -------
// Verbes en -er : « tu » SANS s (radical + e), nous (radical + ons), vous
// (radical + ez).
const IMP_REG = [
  "chanter", "jouer", "aimer", "regarder", "donner", "trouver", "parler",
];
function impRegulier(infinitif: string): { 2: string; 4: string; 5: string } {
  const rad = infinitif.slice(0, -2);
  return { 2: `${rad}e`, 4: `${rad}ons`, 5: `${rad}ez` };
}
const IMPERATIF: Record<string, { 2: string; 4: string; 5: string }> = {
  manger: { 2: "mange", 4: "mangeons", 5: "mangez" },
  placer: { 2: "place", 4: "plaçons", 5: "placez" },
  etre: { 2: "sois", 4: "soyons", 5: "soyez" },
  avoir: { 2: "aie", 4: "ayons", 5: "ayez" },
  aller: { 2: "va", 4: "allons", 5: "allez" },
  faire: { 2: "fais", 4: "faisons", 5: "faites" },
  dire: { 2: "dis", 4: "disons", 5: "dites" },
  venir: { 2: "viens", 4: "venons", 5: "venez" },
  prendre: { 2: "prends", 4: "prenons", 5: "prenez" },
  voir: { 2: "vois", 4: "voyons", 5: "voyez" },
  finir: { 2: "finis", 4: "finissons", 5: "finissez" },
};
for (const inf of IMP_REG) IMPERATIF[inf] = impRegulier(inf);

// Listes de verbes par difficulte (utilisees par le generateur).
export const VERBES_PS_ER = [...PS_REG]; // 1er groupe reguliers
export const VERBES_PS_ORTHO = ["manger", "placer"];
export const VERBES_PS_FREQUENTS = ["etre", "avoir", "aller"];
export const VERBES_PS_IRREGULIERS = ["faire", "dire", "venir", "prendre", "voir"];
export const VERBES_PS = Object.keys(PASSE_SIMPLE);

export const VERBES_IMP_ER = [...IMP_REG];
export const VERBES_IMP_ORTHO = ["manger", "placer"];
export const VERBES_IMP_FREQUENTS = ["aller", "faire", "finir"];
export const VERBES_IMP_IRREGULIERS = ["dire", "venir", "prendre", "voir", "etre", "avoir"];
export const VERBES_IMP = Object.keys(IMPERATIF);

// Forme de reference pour un temps CM1. Lance si (verbe, personne) inconnu.
export function formeCm1(verbe: string, temps: TempsCm1, personne: Personne): string {
  if (temps === "passe_simple") {
    const f = PASSE_SIMPLE[verbe];
    if (!f || (personne !== 3 && personne !== 6)) {
      throw new Error(`passe simple inconnu: ${verbe}/${personne}`);
    }
    return personne === 3 ? f[3] : f[6];
  }
  const f = IMPERATIF[verbe];
  if (!f || (personne !== 2 && personne !== 4 && personne !== 5)) {
    throw new Error(`imperatif inconnu: ${verbe}/${personne}`);
  }
  return personne === 2 ? f[2] : personne === 4 ? f[4] : f[5];
}

export function aFormeCm1(verbe: string, temps: TempsCm1, personne: Personne): boolean {
  if (temps === "passe_simple") {
    return Boolean(PASSE_SIMPLE[verbe]) && (personne === 3 || personne === 6);
  }
  return Boolean(IMPERATIF[verbe]) && (personne === 2 || personne === 4 || personne === 5);
}

export const TEMPS_CM1_CODE: Record<TempsCm1, number> = {
  passe_simple: PS_CODE,
  imperatif: IMP_CODE,
};

// Toutes les formes d'un verbe a un temps CM1 (pour les distracteurs QCM).
export function formesCm1(verbe: string, temps: TempsCm1): string[] {
  const ps = temps === "passe_simple";
  const personnes = ps ? PS_PERSONNES : IMP_PERSONNES;
  return personnes.map((p) => formeCm1(verbe, temps, p));
}

// --- Golden partage (test croise front <-> SQL) -----------------------------
// Lignes {verbe, temps(code), personne, forme} pour les temps 5 et 6, triees de
// facon stable. conjugaison_cm1_test.sql verifie que la table SQL les contient.
export interface GoldenRowCm1 {
  verbe: string;
  temps: number;
  personne: number;
  forme: string;
}
export function cm1Golden(): GoldenRowCm1[] {
  const rows: GoldenRowCm1[] = [];
  for (const verbe of Object.keys(PASSE_SIMPLE).sort()) {
    for (const p of PS_PERSONNES) {
      rows.push({ verbe, temps: PS_CODE, personne: p, forme: formeCm1(verbe, "passe_simple", p) });
    }
  }
  for (const verbe of Object.keys(IMPERATIF).sort()) {
    for (const p of IMP_PERSONNES) {
      rows.push({ verbe, temps: IMP_CODE, personne: p, forme: formeCm1(verbe, "imperatif", p) });
    }
  }
  return rows;
}
