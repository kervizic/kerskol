// Progression adaptative de « Les briques » (logique PURE, testable).
//
// Contrairement a « Relie les fruits » (paliers 1..5 fixes), le palier de
// briques est un NIVEAU DE VITESSE qui grandit librement pendant une partie
// (+1 tous les 5 lignes, voir moteur.ts). On ne « monte » donc pas de palier
// entre deux parties : on choisit juste une VITESSE DE DEPART adaptee a ce que
// l'enfant a deja atteint, PRUDEMMENT (un cran en dessous du dernier palier
// atteint), pour que chaque partie recommence a un rythme confortable.

/** Une partie de briques journalisee (lue depuis jeu_parties). */
export interface PartieBriques {
  palier: number; // palier (vitesse) ATTEINT en fin de partie
  score: number;
  lignes: number;
  dureeMs: number; // duree de la partie (temps_ms)
  reussi: boolean; // partie menee a son terme (blocage ou 3 min)
  abandon: boolean; // l'enfant a quitte avant la fin
}

/**
 * Palier de vitesse de depart pour une nouvelle partie.
 *   - aucune partie terminee : on part du plus lent (0), le plus doux ;
 *   - sinon : dernier palier atteint - 1, borne a 1 minimum (prudence : on ne
 *     relance jamais plus vite que le dernier palier reellement atteint).
 */
export function palierDepartBriques(parties: PartieBriques[]): number {
  const terminees = parties.filter((p) => p.reussi && !p.abandon);
  if (terminees.length === 0) return 0;
  const dernier = terminees[terminees.length - 1].palier;
  return Math.max(1, dernier - 1);
}

/** Meilleur score jamais atteint (pour l'espace parent). */
export function meilleurScore(parties: PartieBriques[]): number {
  return parties.reduce((max, p) => (p.score > max ? p.score : max), 0);
}

/** Nombre de parties menees a leur terme. */
export function partiesJouees(parties: PartieBriques[]): number {
  return parties.filter((p) => p.reussi && !p.abandon).length;
}

/** Dernieres parties terminees, de la plus recente a la plus ancienne. */
export function dernieresParties(parties: PartieBriques[], n = 5): PartieBriques[] {
  return parties
    .filter((p) => p.reussi && !p.abandon)
    .slice(-n)
    .reverse();
}
