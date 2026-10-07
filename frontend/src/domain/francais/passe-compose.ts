// Passé composé de l'indicatif (programme CE2 2024, cycle 2).
//
// Temps COMPOSE : auxiliaire (avoir / être) au présent + participe passé.
// Au CE2 : accord du participe avec ETRE seulement (elle est allée, ils sont
// venus) ; PAS de COD (le participe des verbes avec AVOIR reste invariable).
//
// Les formes sont stockees SANS le pronom (ex. « ai chanté », « est allée »).
// L'elision « j' » depend de l'auxiliaire (« j'ai chanté », « je suis allé »).
// Les accents et la cedille sont significatifs.
//
// SOURCE DE VERITE cliente, miroir EXACT de la table SQL public.conjugaison_pc
// (migration 0037). Le golden `pcGolden()` + supabase/tests/passe_compose_test.sql
// verrouillent l'egalite des deux cotes (240 lignes : 20 verbes x 6 personnes
// x 2 genres).

import { CONJ, PERSONNES, commenceParVoyelle, type Personne } from "./conjugaison";

// Code entier du temps envoye au serveur (p_a). 1..3 = temps simples (0031),
// 4 = passe compose (ce module).
export const PC_CODE = 4;

export type Genre = "m" | "f";
export const GENRES: Genre[] = ["m", "f"];

export type Auxiliaire = "avoir" | "etre";

// Auxiliaire de chaque verbe du programme CE2 (aller / venir avec ETRE).
export const AUXILIAIRE: Record<string, Auxiliaire> = {
  etre: "avoir",
  avoir: "avoir",
  aller: "etre",
  venir: "etre",
  faire: "avoir",
  dire: "avoir",
  pouvoir: "avoir",
  voir: "avoir",
  vouloir: "avoir",
  prendre: "avoir",
  finir: "avoir",
  chanter: "avoir",
  jouer: "avoir",
  aimer: "avoir",
  regarder: "avoir",
  donner: "avoir",
  trouver: "avoir",
  parler: "avoir",
  manger: "avoir",
  placer: "avoir",
};

// Participe passe (masculin singulier). Les verbes avec ETRE (aller, venir) se
// terminent par une voyelle : l'accord ajoute « e » (f) et/ou « s » (pluriel).
export const PARTICIPE: Record<string, string> = {
  etre: "été",
  avoir: "eu",
  aller: "allé",
  venir: "venu",
  faire: "fait",
  dire: "dit",
  pouvoir: "pu",
  voir: "vu",
  vouloir: "voulu",
  prendre: "pris",
  finir: "fini",
  chanter: "chanté",
  jouer: "joué",
  aimer: "aimé",
  regarder: "regardé",
  donner: "donné",
  trouver: "trouvé",
  parler: "parlé",
  manger: "mangé",
  placer: "placé",
};

export const VERBES_PC = Object.keys(AUXILIAIRE);

// Verbes dont le participe s'accorde (auxiliaire ETRE).
export function accordeAvecEtre(verbe: string): boolean {
  return AUXILIAIRE[verbe] === "etre";
}

// Singulier (je, tu, il) ou pluriel (nous, vous, ils).
function pluriel(personne: Personne): boolean {
  return personne >= 4;
}

// Participe accorde. Avec AVOIR : invariable (pas de COD au CE2). Avec ETRE :
// + « e » au feminin, + « s » au pluriel (participe termine par une voyelle).
export function participeAccorde(verbe: string, personne: Personne, genre: Genre): string {
  const base = PARTICIPE[verbe];
  if (AUXILIAIRE[verbe] === "avoir") return base;
  let r = base;
  if (genre === "f") r += "e";
  if (pluriel(personne)) r += "s";
  return r;
}

// Forme auxiliaire (present) pour la personne : reutilise la table 0031.
export function auxiliaireForme(verbe: string, personne: Personne): string {
  return CONJ[AUXILIAIRE[verbe]].present[personne - 1];
}

// Forme de reference « auxiliaire + participe » (sans pronom).
export function formePC(verbe: string, personne: Personne, genre: Genre): string {
  if (!AUXILIAIRE[verbe]) throw new Error(`verbe inconnu (passe compose): ${verbe}`);
  return `${auxiliaireForme(verbe, personne)} ${participeAccorde(verbe, personne, genre)}`;
}

// Pronom gendre pour l'affichage du passe compose (3e personnes distinguent le
// genre : il/elle, ils/elles). Les autres personnes ne portent pas le genre.
export function pronomPC(personne: Personne, genre: Genre, forme: string): string {
  switch (personne) {
    case 1:
      return commenceParVoyelle(forme) ? "j'" : "je";
    case 2:
      return "tu";
    case 3:
      return genre === "f" ? "elle" : "il";
    case 4:
      return "nous";
    case 5:
      return "vous";
    case 6:
      return genre === "f" ? "elles" : "ils";
  }
}

// Sujet + forme avec l'espace d'elision correct (« j'ai chanté », « elle est allée »).
export function avecSujetPC(personne: Personne, genre: Genre, forme: string): string {
  const p = pronomPC(personne, genre, forme);
  return p.endsWith("'") ? `${p}${forme}` : `${p} ${forme}`;
}

// --- Golden partage (test croise front <-> SQL) -----------------------------
export interface GoldenRowPC {
  verbe: string;
  personne: number;
  genre: Genre;
  auxiliaire: Auxiliaire;
  forme: string;
}
export function pcGolden(): GoldenRowPC[] {
  const rows: GoldenRowPC[] = [];
  for (const verbe of VERBES_PC.slice().sort()) {
    for (const p of PERSONNES) {
      for (const g of GENRES) {
        rows.push({
          verbe,
          personne: p,
          genre: g,
          auxiliaire: AUXILIAIRE[verbe],
          forme: formePC(verbe, p, g),
        });
      }
    }
  }
  return rows;
}
