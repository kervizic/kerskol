// Solveur de « Relie les fruits » (Numberlink, variante grille entierement
// remplie). Compte les solutions (en s'arretant a `limit`) pour un ensemble de
// bouts. Sert a VERIFIER l'unicite des grilles livrees (test) et reste dispo
// pour toute validation future. Port TS du solveur de tools/jeux/generate.mjs.

import type { GrilleRelie } from "./relie";

type Adj = number[][];

function makeGrid(w: number, h: number): { n: number; adj: Adj } {
  const n = w * h;
  const adj: Adj = Array.from({ length: n }, () => []);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const i = r * w + c;
      if (r > 0) adj[i].push((r - 1) * w + c);
      if (r < h - 1) adj[i].push((r + 1) * w + c);
      if (c > 0) adj[i].push(r * w + (c - 1));
      if (c < w - 1) adj[i].push(r * w + (c + 1));
    }
  }
  return { n, adj };
}

const NODE_CAP = 5_000_000;

// Retourne le nombre de solutions (plafonne a `limit`), ou -1 si le plafond de
// noeuds est atteint (non prouve).
export function compterSolutions(
  w: number,
  h: number,
  endpoints: Array<[number, number]>,
  limit = 2
): number {
  const { n, adj } = makeGrid(w, h);
  const owner = new Int16Array(n).fill(-1);
  const nPairs = endpoints.length;
  for (let i = 0; i < nPairs; i++) {
    owner[endpoints[i][0]] = i;
    owner[endpoints[i][1]] = i;
  }
  let solutions = 0;
  let nodes = 0;
  let cap = false;

  function relieViaVide(a: number, b: number): boolean {
    if (adj[a].includes(b)) return true;
    const seen = new Uint8Array(n);
    const stack: number[] = [];
    for (const x of adj[a]) if (owner[x] === -1) { seen[x] = 1; stack.push(x); }
    while (stack.length) {
      const c = stack.pop()!;
      if (adj[c].includes(b)) return true;
      for (const x of adj[c]) if (owner[x] === -1 && !seen[x]) { seen[x] = 1; stack.push(x); }
    }
    return false;
  }

  function prunes(head: number, curPair: number, target: number): boolean {
    if (!relieViaVide(head, target)) return false;
    for (let j = curPair + 1; j < nPairs; j++) {
      if (!relieViaVide(endpoints[j][0], endpoints[j][1])) return false;
    }
    const seen = new Uint8Array(n);
    for (let s = 0; s < n; s++) {
      if (owner[s] !== -1 || seen[s]) continue;
      const comp: number[] = [];
      const stack = [s];
      seen[s] = 1;
      while (stack.length) {
        const c = stack.pop()!;
        comp.push(c);
        for (const x of adj[c]) if (owner[x] === -1 && !seen[x]) { seen[x] = 1; stack.push(x); }
      }
      let touche = false;
      for (const c of comp) {
        for (const x of adj[c]) {
          if (x === head || x === target || owner[x] > curPair) { touche = true; break; }
        }
        if (touche) break;
      }
      if (!touche) return false;
    }
    return true;
  }

  function croit(i: number, head: number): void {
    if (++nodes > NODE_CAP) { cap = true; return; }
    if (solutions >= limit || cap) return;
    const target = endpoints[i][1];
    if (head === target) {
      if (i + 1 >= nPairs) {
        for (let c = 0; c < n; c++) if (owner[c] === -1) return;
        solutions += 1;
        return;
      }
      croit(i + 1, endpoints[i + 1][0]);
      return;
    }
    for (const nb of adj[head]) {
      if (nb === target) {
        croit(i, nb);
        if (solutions >= limit || cap) return;
        continue;
      }
      if (owner[nb] !== -1) continue;
      owner[nb] = i;
      if (prunes(nb, i, target)) croit(i, nb);
      owner[nb] = -1;
      if (solutions >= limit || cap) return;
    }
  }

  croit(0, endpoints[0][0]);
  return cap ? -1 : solutions;
}

// Compte les solutions en mode RELACHE : chaque paire reliee par un chemin
// simple de cases vides, SANS exiger de remplir la grille (les cases restantes
// peuvent demeurer vides). Plafonne a `limit`, -1 si le plafond de noeuds est
// atteint (non prouve).
//
// Usage : une grille est « sans raccourci » ssi ce compte vaut EXACTEMENT 1.
// Alors la solution couvrante stockee est la SEULE possible, donc il n'existe
// AUCUNE facon de relier toutes les paires en laissant une case vide (c'etait le
// defaut de p2-038 : l'enfant pouvait tout relier en laissant 2 cases vides).
// Prunes A/B seulement (surs en relache) ; pas de prune « vide atteignable » ni
// de verif de couverture : laisser du vide est justement permis ici.
export function compterSolutionsRelache(
  w: number,
  h: number,
  endpoints: Array<[number, number]>,
  limit = 2
): number {
  const { n, adj } = makeGrid(w, h);
  const owner = new Int16Array(n).fill(-1);
  const nPairs = endpoints.length;
  for (let i = 0; i < nPairs; i++) {
    owner[endpoints[i][0]] = i;
    owner[endpoints[i][1]] = i;
  }
  let solutions = 0;
  let nodes = 0;
  let cap = false;

  function relieViaVide(a: number, b: number): boolean {
    if (adj[a].includes(b)) return true;
    const seen = new Uint8Array(n);
    const stack: number[] = [];
    for (const x of adj[a]) if (owner[x] === -1) { seen[x] = 1; stack.push(x); }
    while (stack.length) {
      const c = stack.pop()!;
      if (adj[c].includes(b)) return true;
      for (const x of adj[c]) if (owner[x] === -1 && !seen[x]) { seen[x] = 1; stack.push(x); }
    }
    return false;
  }

  function prunes(head: number, curPair: number, target: number): boolean {
    if (!relieViaVide(head, target)) return false;
    for (let j = curPair + 1; j < nPairs; j++) {
      if (!relieViaVide(endpoints[j][0], endpoints[j][1])) return false;
    }
    return true;
  }

  function croit(i: number, head: number): void {
    if (++nodes > NODE_CAP) { cap = true; return; }
    if (solutions >= limit || cap) return;
    const target = endpoints[i][1];
    if (head === target) {
      if (i + 1 >= nPairs) { solutions += 1; return; }
      croit(i + 1, endpoints[i + 1][0]);
      return;
    }
    for (const nb of adj[head]) {
      if (nb === target) {
        croit(i, nb);
        if (solutions >= limit || cap) return;
        continue;
      }
      if (owner[nb] !== -1) continue;
      owner[nb] = i;
      if (prunes(nb, i, target)) croit(i, nb);
      owner[nb] = -1;
      if (solutions >= limit || cap) return;
    }
  }

  croit(0, endpoints[0][0]);
  return cap ? -1 : solutions;
}

// Une grille est-elle « sans raccourci » ? (solution unique meme sans la regle
// de remplissage -> aucune variante ne laisse de case vide).
export function sansRaccourci(g: GrilleRelie): boolean {
  return compterSolutionsRelache(g.w, g.h, boutsDeGrille(g), 2) === 1;
}

// Les bouts d'une grille, en index de cases.
export function boutsDeGrille(g: GrilleRelie): Array<[number, number]> {
  return g.paires.map((p) => {
    const a = p.chemin[0];
    const b = p.chemin[p.chemin.length - 1];
    return [a[0] * g.w + a[1], b[0] * g.w + b[1]] as [number, number];
  });
}
