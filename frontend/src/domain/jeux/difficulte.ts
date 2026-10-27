// Difficulte adaptative du jeu « Relie les fruits » (logique PURE, testable).
//
// Paliers (taille de grille / nombre de paires) :
//   1 = 4x4 / 3 paires
//   2 = 5x5 / 4 paires
//   3 = 6x6 / 5 paires
//   4 = 7x7 / 6 paires
//   5 = 7x7 / 7 paires (chemins tortueux)
//
// Montee : 3 grilles reussies d'affilee SOUS le temps cible, SANS indice.
// Descente (douce) : 2 « difficultes » d'affilee (abandon, ou grille reussie en
//   plus de 3x la cible) -> palier precedent, presente comme « une grille plus
//   petite ».
// Cibles par defaut (~ taille) puis ajustees aux temps de l'enfant (mediane des
//   dernieres grilles reussies du palier). AUCUN chrono n'est jamais affiche :
//   le temps est mesure discretement.

export interface PalierDef {
  palier: number;
  w: number;
  h: number;
  nPaires: number;
  cibleDefautMs: number;
}

export const PALIERS: PalierDef[] = [
  { palier: 1, w: 4, h: 4, nPaires: 3, cibleDefautMs: 30_000 },
  { palier: 2, w: 5, h: 5, nPaires: 4, cibleDefautMs: 45_000 },
  { palier: 3, w: 6, h: 6, nPaires: 5, cibleDefautMs: 60_000 },
  { palier: 4, w: 7, h: 7, nPaires: 6, cibleDefautMs: 90_000 },
  { palier: 5, w: 7, h: 7, nPaires: 7, cibleDefautMs: 90_000 },
];

export const PALIER_MIN = 1;
export const PALIER_MAX = PALIERS.length;

// Prix d'une partie (une grille) en bonbons. Constante reglable (cote serveur :
// config anti_abus 'jeu_prix_partie' ; ici pour l'affichage client).
export const PRIX_PARTIE = 10;

export const MONTEE_SUITE = 3; // reussites d'affilee pour monter
export const DESCENTE_SUITE = 2; // difficultes d'affilee pour descendre
export const FACTEUR_LENT = 3; // « > 3x la cible » = trop lent
const FENETRE_MEDIANE = 5; // nb de dernieres grilles pour ajuster la cible

export function palierDef(palier: number): PalierDef {
  const p = PALIERS.find((x) => x.palier === palier);
  return p ?? PALIERS[0];
}

// Une partie terminee (reussie ou abandonnee). `temps_ms` est le temps mesure
// discretement ; pour un abandon il peut etre 0/approx (non utilise).
export interface Partie {
  palier: number;
  temps_ms: number;
  avec_indice: boolean;
  abandon: boolean;
  reussi: boolean;
  grille_id: string;
}

function mediane(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

// Cible (ms) d'un palier : mediane des `tempsReussis` recents si >= 3 echantillons,
// sinon la cible par defaut (liee a la taille).
export function cibleMs(palier: number, tempsReussis: number[]): number {
  const def = palierDef(palier).cibleDefautMs;
  if (tempsReussis.length < 3) return def;
  const recents = tempsReussis.slice(-FENETRE_MEDIANE);
  const med = mediane(recents);
  return med > 0 ? med : def;
}

export interface Progression {
  palier: number; // palier courant (1..5)
  cibleMs: number; // cible actuelle du palier courant (ms)
  reussitesSuite: number; // reussites rapides sans indice d'affilee (au palier courant)
  difficultesSuite: number; // difficultes d'affilee (au palier courant)
  cibles: Record<number, number>; // cible courante par palier (pour l'espace parent)
}

// Rejoue tout l'historique et renvoie le palier courant + les cibles. Le palier
// commence a 1. Le temps cible est reevalue « au fil de l'eau » a partir des
// grilles reussies deja vues au meme palier.
export function calculerProgression(parties: Partie[]): Progression {
  let cur = PALIER_MIN;
  let up = 0;
  let down = 0;
  const reussisParPalier: Record<number, number[]> = {};

  for (const p of parties) {
    const palier = cur; // l'enfant joue toujours au palier courant
    const cible = cibleMs(palier, reussisParPalier[palier] ?? []);

    const bon = p.reussi && !p.abandon && !p.avec_indice && p.temps_ms <= cible;
    const difficulte = p.abandon || (p.reussi && !p.abandon && p.temps_ms > FACTEUR_LENT * cible);

    if (p.reussi && !p.abandon) {
      (reussisParPalier[palier] ??= []).push(p.temps_ms);
    }

    if (bon) {
      up += 1;
      down = 0;
      if (up >= MONTEE_SUITE && cur < PALIER_MAX) {
        cur += 1;
        up = 0;
        down = 0;
      }
    } else if (difficulte) {
      down += 1;
      up = 0;
      if (down >= DESCENTE_SUITE && cur > PALIER_MIN) {
        cur -= 1;
        up = 0;
        down = 0;
      }
    } else {
      up = 0;
      down = 0;
    }
  }

  const cibles: Record<number, number> = {};
  for (const def of PALIERS) {
    cibles[def.palier] = cibleMs(def.palier, reussisParPalier[def.palier] ?? []);
  }

  return {
    palier: cur,
    cibleMs: cibles[cur],
    reussitesSuite: up,
    difficultesSuite: down,
    cibles,
  };
}

// Grilles d'un palier deja REUSSIES (pour ne pas les resservir).
export function grillesDejaReussies(parties: Partie[], palier: number): Set<string> {
  const s = new Set<string>();
  for (const p of parties) {
    if (p.reussi && !p.abandon && p.palier === palier) s.add(p.grille_id);
  }
  return s;
}

// Choisit une grille du palier : en priorite une NON encore reussie ; s'il n'en
// reste plus, on repioche parmi toutes (sans bloquer le jeu). `alea` dans [0,1[.
export function choisirGrille<T extends { id: string }>(
  grilles: T[],
  parties: Partie[],
  palier: number,
  alea: number
): T | null {
  if (grilles.length === 0) return null;
  const faites = grillesDejaReussies(parties, palier);
  const neuves = grilles.filter((g) => !faites.has(g.id));
  const pool = neuves.length > 0 ? neuves : grilles;
  const i = Math.min(pool.length - 1, Math.floor(alea * pool.length));
  return pool[i];
}

// Derniers temps reussis d'un palier (pour l'espace parent, du plus recent).
export function derniersTemps(parties: Partie[], palier: number, n = 5): number[] {
  const t = parties
    .filter((p) => p.reussi && !p.abandon && p.palier === palier)
    .map((p) => p.temps_ms);
  return t.slice(-n).reverse();
}
