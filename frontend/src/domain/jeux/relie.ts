// Logique PURE du jeu « Relie les fruits » (puzzle type Numberlink, libre de
// droits — famille Nikoli). Aucune dependance React : tout est testable isole.
//
// But du jeu : relier chaque paire de fruits identiques par un tuyau, en
// REMPLISSANT TOUTES LES CASES (variante « fill all cells »). Les grilles sont
// generees hors ligne (tools/jeux/generate.mjs) avec solution UNIQUE verifiee.
//
// Gestes (geres par le composant via pointer events, appliques ici) :
//   - partir d'un fruit pour tracer ;
//   - revenir sur son propre tuyau = le raccourcir ;
//   - tracer sur un autre tuyau le coupe ;
//   - toucher un fruit (sans glisser) = effacer son tuyau (le trace repart du
//     fruit seul, longueur 1 = aucun tuyau).
//
// Les cases sont reperees par un index entier `cell = r * w + c`.

export type Cell = number;

export interface PaireRelie {
  fruit: string; // cle d'emoji (voir domain/images.ts), ex. "pomme"
  // Chemin SOLUTION, du 1er bout au 2e bout : liste de [ligne, colonne].
  // Les deux bouts sont chemin[0] et chemin[dernier]. L'union des chemins de
  // toutes les paires couvre toutes les cases (grille entierement remplie).
  chemin: [number, number][];
}

export interface GrilleRelie {
  id: string;
  palier: number; // 1..5
  w: number;
  h: number;
  paires: PaireRelie[];
}

export interface EtatJeu {
  grille: GrilleRelie;
  // Trace courant de l'enfant par index de paire. Commence toujours a un bout.
  // Longueur 1 (le bout seul) = aucun tuyau.
  traces: Cell[][];
  // Paire en cours de trace (pointer down), sinon null.
  actif: number | null;
  // Pile d'annulation : un instantane des `traces` par geste.
  histo: Cell[][][];
}

// ------------------------------- Helpers geometrie -------------------------
export function cellIndex(r: number, c: number, w: number): Cell {
  return r * w + c;
}
export function cellRC(cell: Cell, w: number): [number, number] {
  return [Math.floor(cell / w), cell % w];
}
export function adjacents(cell: Cell, w: number, h: number): Cell[] {
  const [r, c] = cellRC(cell, w);
  const out: Cell[] = [];
  if (r > 0) out.push(cellIndex(r - 1, c, w));
  if (r < h - 1) out.push(cellIndex(r + 1, c, w));
  if (c > 0) out.push(cellIndex(r, c - 1, w));
  if (c < w - 1) out.push(cellIndex(r, c + 1, w));
  return out;
}
export function sontVoisines(a: Cell, b: Cell, w: number, h: number): boolean {
  return adjacents(a, w, h).includes(b);
}

// ------------------------------- Bouts (fruits) ----------------------------
// Les deux cases-bouts de chaque paire.
export function bouts(grille: GrilleRelie): Array<[Cell, Cell]> {
  return grille.paires.map((p) => {
    const a = p.chemin[0];
    const b = p.chemin[p.chemin.length - 1];
    return [cellIndex(a[0], a[1], grille.w), cellIndex(b[0], b[1], grille.w)] as [
      Cell,
      Cell,
    ];
  });
}

// Index de la paire dont `cell` est un BOUT (fruit), sinon -1.
export function paireDuBout(grille: GrilleRelie, cell: Cell): number {
  const bs = bouts(grille);
  for (let i = 0; i < bs.length; i++) {
    if (bs[i][0] === cell || bs[i][1] === cell) return i;
  }
  return -1;
}

// Index de la paire qui OCCUPE `cell` via son trace (y compris un bout avec
// tuyau), sinon -1. Un bout « nu » (trace de longueur 1) occupe sa case.
export function occupant(traces: Cell[][], cell: Cell): number {
  for (let i = 0; i < traces.length; i++) {
    if (traces[i].includes(cell)) return i;
  }
  return -1;
}

// Chemin solution d'une paire, en index de cases.
export function cheminSolution(grille: GrilleRelie, i: number): Cell[] {
  return grille.paires[i].chemin.map(([r, c]) => cellIndex(r, c, grille.w));
}

// ------------------------------- Cycle de vie ------------------------------
export function creerEtat(grille: GrilleRelie): EtatJeu {
  return {
    grille,
    traces: grille.paires.map(() => []),
    actif: null,
    histo: [],
  };
}

function snapshot(traces: Cell[][]): Cell[][] {
  return traces.map((t) => t.slice());
}

// Le bout de la paire i OPPOSE a `depart` (l'autre fruit).
function autreBout(grille: GrilleRelie, i: number, depart: Cell): Cell {
  const [a, b] = bouts(grille)[i];
  return depart === a ? b : a;
}

// pointer down sur `cell`. On ne demarre un trace que depuis un fruit : le trace
// de cette paire repart du fruit seul (ce qui EFFACE son ancien tuyau — le
// geste « toucher un fruit »). Sans glisser ensuite, le tuyau reste efface.
export function commencer(etat: EtatJeu, cell: Cell): EtatJeu {
  const i = paireDuBout(etat.grille, cell);
  if (i < 0) return etat; // on ne part que d'un fruit
  const histo = [...etat.histo, snapshot(etat.traces)];
  const traces = snapshot(etat.traces);
  traces[i] = [cell];
  return { ...etat, traces, actif: i, histo };
}

// pointer move : la case `cell` est survolee. Applique les regles de trace.
export function deplacer(etat: EtatJeu, cell: Cell): EtatJeu {
  const i = etat.actif;
  if (i == null) return etat;
  const { grille } = etat;
  const { w, h } = grille;
  const chemin = etat.traces[i];
  const head = chemin[chemin.length - 1];
  if (cell === head) return etat;
  if (!sontVoisines(cell, head, w, h)) return etat; // on ignore les sauts

  // Recul d'une case (revenir sur son tuyau) : raccourcit.
  if (chemin.length >= 2 && cell === chemin[chemin.length - 2]) {
    const traces = snapshot(etat.traces);
    traces[i] = chemin.slice(0, -1);
    return { ...etat, traces };
  }

  // Tete deja arrivee sur l'AUTRE fruit : terminal, on ne traverse pas le fruit.
  const opp = autreBout(grille, i, chemin[0]);
  if (chemin.length > 1 && head === opp) return etat;

  // Case deja dans mon propre trace (boucle) : on tronque jusqu'a elle.
  const k = chemin.indexOf(cell);
  if (k >= 0) {
    const traces = snapshot(etat.traces);
    traces[i] = chemin.slice(0, k + 1);
    return { ...etat, traces };
  }

  // Case = un fruit ?
  const boutPaire = paireDuBout(grille, cell);
  if (boutPaire >= 0) {
    if (cell === opp) {
      // On atteint l'autre fruit : on relie (chemin complet).
      const traces = snapshot(etat.traces);
      traces[i] = [...chemin, cell];
      return { ...etat, traces };
    }
    return etat; // fruit d'une AUTRE paire : on ne traverse pas
  }

  // Case normale : si occupee par une autre paire, on coupe son tuyau a cet
  // endroit (la case et tout ce qui suit dans son trace disparaissent).
  const traces = snapshot(etat.traces);
  const occ = occupant(traces, cell);
  if (occ >= 0 && occ !== i) {
    const idx = traces[occ].indexOf(cell);
    traces[occ] = traces[occ].slice(0, idx);
  }
  traces[i] = [...chemin, cell];
  return { ...etat, traces };
}

// pointer up : fin du geste.
export function terminer(etat: EtatJeu): EtatJeu {
  if (etat.actif == null) return etat;
  return { ...etat, actif: null };
}

// Efface explicitement le tuyau d'une paire (si besoin cote UI).
export function effacerPaire(etat: EtatJeu, i: number): EtatJeu {
  const histo = [...etat.histo, snapshot(etat.traces)];
  const traces = snapshot(etat.traces);
  traces[i] = [];
  return { ...etat, traces, actif: null, histo };
}

export function annuler(etat: EtatJeu): EtatJeu {
  if (etat.histo.length === 0) return etat;
  const histo = etat.histo.slice();
  const traces = histo.pop()!;
  return { ...etat, traces, actif: null, histo };
}

export function recommencer(etat: EtatJeu): EtatJeu {
  const histo = [...etat.histo, snapshot(etat.traces)];
  return { ...etat, traces: etat.grille.paires.map(() => []), actif: null, histo };
}

// Indice (ampoule) : revele une paire juste, GRATUITEMENT. On choisit la 1re
// paire non encore reliee correctement et on pose son chemin solution complet.
// Les cases reprises sont retirees des autres tuyaux (coupe) pour rester
// coherent. Retourne le nouvel etat + l'index revele (ou -1 si tout est deja
// juste).
export function indice(etat: EtatJeu): { etat: EtatJeu; revele: number } {
  let cible = -1;
  for (let i = 0; i < etat.grille.paires.length; i++) {
    if (!paireComplete(etat, i)) {
      cible = i;
      break;
    }
  }
  if (cible < 0) return { etat, revele: -1 };

  const histo = [...etat.histo, snapshot(etat.traces)];
  const traces = snapshot(etat.traces);
  const sol = cheminSolution(etat.grille, cible);
  traces[cible] = sol.slice();
  const dansSol = new Set(sol);
  // Coupe les autres tuyaux la ou ils empietent sur la solution revelee.
  for (let j = 0; j < traces.length; j++) {
    if (j === cible) continue;
    for (let p = 0; p < traces[j].length; p++) {
      if (dansSol.has(traces[j][p])) {
        traces[j] = traces[j].slice(0, p);
        break;
      }
    }
  }
  return { etat: { ...etat, traces, actif: null, histo }, revele: cible };
}

// ------------------------------- Victoire ----------------------------------
// Une paire est reliee correctement si son trace est un chemin simple et
// contigu reliant ses deux bouts.
export function paireComplete(etat: EtatJeu, i: number): boolean {
  const { grille } = etat;
  const chemin = etat.traces[i];
  if (chemin.length < 2) return false;
  const [a, b] = bouts(grille)[i];
  const debut = chemin[0];
  const fin = chemin[chemin.length - 1];
  const relie = (debut === a && fin === b) || (debut === b && fin === a);
  if (!relie) return false;
  const vus = new Set<Cell>();
  for (let p = 0; p < chemin.length; p++) {
    if (vus.has(chemin[p])) return false; // pas de repetition
    vus.add(chemin[p]);
    if (p > 0 && !sontVoisines(chemin[p - 1], chemin[p], grille.w, grille.h)) {
      return false; // contiguite
    }
  }
  return true;
}

// Toutes les paires sont-elles reliees correctement (bout a bout) ? Independant
// de la couverture : sert a detecter le cas « tous les fruits sont relies mais
// il reste des cases vides » (retour doux « Presque ! »).
export function toutesPairesReliees(etat: EtatJeu): boolean {
  const { grille } = etat;
  for (let i = 0; i < grille.paires.length; i++) {
    if (!paireComplete(etat, i)) return false;
  }
  return true;
}

// Victoire = toutes les paires reliees ET toutes les cases remplies. On NE
// compare JAMAIS a la solution stockee : seules les REGLES comptent, donc toute
// solution couvrante valide est acceptee (sans chevauchement, garanti par la
// mecanique de coupe).
export function estGagne(etat: EtatJeu): boolean {
  if (!toutesPairesReliees(etat)) return false;
  const { grille } = etat;
  const couvertes = new Set<Cell>();
  for (const t of etat.traces) for (const c of t) couvertes.add(c);
  return couvertes.size === grille.w * grille.h;
}

// Nombre de cases remplies (pour un retour visuel doux « remplis les cases »).
export function casesRemplies(etat: EtatJeu): number {
  const couvertes = new Set<Cell>();
  for (const t of etat.traces) for (const c of t) couvertes.add(c);
  return couvertes.size;
}
