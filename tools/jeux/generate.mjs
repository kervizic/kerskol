#!/usr/bin/env node
// generate.mjs - generateur HORS LIGNE des grilles « Relie les fruits »
// (puzzle type Numberlink, famille Nikoli, libre de droits).
//
// Pour chaque palier (taille / nombre de paires) on produit >= 40 grilles :
//   1. on tire un chemin hamiltonien aleatoire couvrant TOUTE la grille
//      (heuristique de Warnsdorff pour aller vite) ;
//   2. on le decoupe en K segments (>= 2 cases) : chaque segment devient une
//      paire, ses deux extremites = les deux fruits. La grille est donc
//      ENTIEREMENT REMPLIE par construction ;
//   3. on verifie par un SOLVEUR que la solution est UNIQUE (on compte les
//      solutions, on s'arrete a 2). On ne garde QUE les grilles a solution
//      unique prouvee (dans la limite de noeuds du solveur).
//
// Sortie : frontend/src/domain/jeux/grilles/relie-p<N>.json (une par palier).
// Deterministe (graine fixe) : regenerable a l'identique.
//
// Usage :  node tools/jeux/generate.mjs [--count 45] [--palier N]
// (Node seul, aucune dependance npm — conforme « pas d'install locale ».)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../../frontend/src/domain/jeux/grilles");

// Paliers : doit rester aligne avec frontend/src/domain/jeux/difficulte.ts
const PALIERS = [
  { palier: 1, w: 4, h: 4, nPaires: 3 },
  { palier: 2, w: 5, h: 5, nPaires: 4 },
  { palier: 3, w: 6, h: 6, nPaires: 5 },
  { palier: 4, w: 7, h: 7, nPaires: 6 },
  { palier: 5, w: 7, h: 7, nPaires: 7 },
];

// Fruits disponibles (cles d'emoji Fluent, voir frontend/src/domain/images.ts).
const FRUITS = ["pomme", "banane", "fraise", "cerise", "raisin", "citron", "orange-fruit", "pasteque"];

const NODE_CAP = 1_500_000; // plafond de noeuds du solveur (securite / vitesse)

// --------------------------- RNG deterministe ------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --------------------------- Geometrie -------------------------------------
function makeGrid(w, h) {
  const n = w * h;
  const adj = Array.from({ length: n }, () => []);
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

// --------------------------- Chemin hamiltonien ----------------------------
// Algorithme « backbite » (Mansfield) : part d'un serpent couvrant toute la
// grille, puis applique des mouvements qui transforment UN chemin hamiltonien
// en un AUTRE sans jamais echouer (melange rapide et uniforme). Chaque
// mouvement : depuis un bout, on choisit un voisin ; s'il n'est pas la case
// adjacente du chemin, on inverse la portion au-dela -> nouveau bout.
function serpent(w, h) {
  const path = [];
  for (let r = 0; r < h; r++) {
    if (r % 2 === 0) for (let c = 0; c < w; c++) path.push(r * w + c);
    else for (let c = w - 1; c >= 0; c--) path.push(r * w + c);
  }
  return path;
}
function randomHamiltonian(w, h, rng) {
  const { n, adj } = makeGrid(w, h);
  const path = serpent(w, h);
  const posDe = new Int32Array(n); // case -> index dans path
  for (let i = 0; i < n; i++) posDe[path[i]] = i;
  const moves = 6 * n;
  for (let m = 0; m < moves; m++) {
    const finTete = m % 2 === 0; // alterne les deux bouts
    const bout = finTete ? path[n - 1] : path[0];
    const voisins = adj[bout];
    const v = voisins[Math.floor(rng() * voisins.length)];
    const k = posDe[v];
    if (finTete) {
      if (k >= n - 2) continue; // voisin deja adjacent au bout : sans effet
      // inverse path[k+1 .. n-1]
      let i = k + 1, j = n - 1;
      while (i < j) {
        const a = path[i], b = path[j];
        path[i] = b; path[j] = a;
        posDe[b] = i; posDe[a] = j;
        i++; j--;
      }
    } else {
      if (k <= 1) continue;
      // inverse path[0 .. k-1]
      let i = 0, j = k - 1;
      while (i < j) {
        const a = path[i], b = path[j];
        path[i] = b; path[j] = a;
        posDe[b] = i; posDe[a] = j;
        i++; j--;
      }
    }
  }
  return path;
}

// Decoupe un chemin en K segments contigus, chacun de longueur >= 2.
function decouper(path, k, rng) {
  const n = path.length;
  if (2 * k > n) return null;
  // Composition aleatoire : chaque segment >= 2, on repartit le surplus.
  const lens = new Array(k).fill(2);
  let reste = n - 2 * k;
  while (reste > 0) {
    lens[Math.floor(rng() * k)] += 1;
    reste -= 1;
  }
  const segs = [];
  let pos = 0;
  for (let i = 0; i < k; i++) {
    segs.push(path.slice(pos, pos + lens[i]));
    pos += lens[i];
  }
  return segs;
}

// --------------------------- Solveur (compte les solutions) ----------------
// Compte les facons de remplir TOUTE la grille en reliant chaque paire, en
// s'arretant a `limit`. Prunes SURS (ne retirent jamais une solution valide) :
//   A. la tete de la paire courante doit atteindre son 2e bout via des cases vides ;
//   B. chaque paire non encore posee : ses 2 bouts relies via des cases vides ;
//   C. chaque composante de cases vides doit toucher la tete ou un bout d'une
//      paire non terminee (sinon ces cases ne pourront jamais etre remplies).
function compterSolutions(w, h, endpoints, limit) {
  const { n, adj } = makeGrid(w, h);
  const owner = new Int16Array(n).fill(-1);
  const nPairs = endpoints.length;
  for (let i = 0; i < nPairs; i++) {
    owner[endpoints[i][0]] = i;
    owner[endpoints[i][1]] = i;
  }
  let solutions = 0;
  let nodes = 0;

  // a et b relies par un chemin de cases VIDES (a,b traites comme terminaux) ?
  function relieViaVide(a, b) {
    if (adj[a].includes(b)) return true;
    const seen = new Uint8Array(n);
    const stack = [];
    for (const x of adj[a]) if (owner[x] === -1) { seen[x] = 1; stack.push(x); }
    while (stack.length) {
      const c = stack.pop();
      if (adj[c].includes(b)) return true;
      for (const x of adj[c]) if (owner[x] === -1 && !seen[x]) { seen[x] = 1; stack.push(x); }
    }
    return false;
  }

  function prunes(head, curPair, target) {
    if (!relieViaVide(head, target)) return false;
    for (let j = curPair + 1; j < nPairs; j++) {
      if (!relieViaVide(endpoints[j][0], endpoints[j][1])) return false;
    }
    // Composantes de vide : chacune doit toucher la tete ou un bout non termine.
    const seen = new Uint8Array(n);
    for (let s = 0; s < n; s++) {
      if (owner[s] !== -1 || seen[s]) continue;
      const comp = [];
      const stack = [s];
      seen[s] = 1;
      while (stack.length) {
        const c = stack.pop();
        comp.push(c);
        for (const x of adj[c]) if (owner[x] === -1 && !seen[x]) { seen[x] = 1; stack.push(x); }
      }
      let touche = false;
      for (const c of comp) {
        for (const x of adj[c]) {
          if (x === head) { touche = true; break; }
          if (x === target) { touche = true; break; }
          const o = owner[x];
          if (o > curPair) { touche = true; break; } // bout d'une paire future
        }
        if (touche) break;
      }
      if (!touche) return false;
    }
    return true;
  }

  function croitPaire(i, head) {
    if (++nodes > NODE_CAP) return; // abandon : grille jugee non prouvee
    if (solutions >= limit) return;
    const target = endpoints[i][1];
    if (head === target) {
      // paire i terminee -> paire suivante
      if (i + 1 >= nPairs) {
        // toutes posees : la grille est-elle entierement remplie ?
        for (let c = 0; c < n; c++) if (owner[c] === -1) return;
        solutions += 1;
        return;
      }
      const nh = endpoints[i + 1][0];
      croitPaire(i + 1, nh);
      return;
    }
    for (const nb of adj[head]) {
      if (nb === target) {
        // on relie le 2e bout
        croitPaire(i, nb);
        if (solutions >= limit) return;
        continue;
      }
      if (owner[nb] !== -1) continue; // occupe
      owner[nb] = i;
      if (prunes(nb, i, target)) croitPaire(i, nb);
      owner[nb] = -1;
      if (solutions >= limit) return;
    }
  }

  // Verif initiale de faisabilite, puis on fait croitre la 1re paire.
  croitPaire(0, endpoints[0][0]);
  return nodes > NODE_CAP ? -1 : solutions; // -1 = non prouve (plafond atteint)
}

// --------------------------- Signature (dedup) -----------------------------
function signature(segs) {
  // Canonique : chaque segment par sa paire de bouts triee, puis l'ensemble trie.
  return segs
    .map((s) => {
      const a = s[0];
      const b = s[s.length - 1];
      return a < b ? `${a}-${b}` : `${b}-${a}`;
    })
    .sort()
    .join("|");
}

// --------------------------- Generation d'un palier ------------------------
function genererPalier(def, count, seed) {
  const rng = mulberry32(seed);
  const { w, h, nPaires, palier } = def;
  const grilles = [];
  const vus = new Set();
  let attempts = 0;
  const MAX_ATTEMPTS = count * 8000 + 50000;

  while (grilles.length < count && attempts < MAX_ATTEMPTS) {
    attempts += 1;
    const ham = randomHamiltonian(w, h, rng);
    if (!ham) continue;
    const segs = decouper(ham, nPaires, rng);
    if (!segs) continue;
    const sig = signature(segs);
    if (vus.has(sig)) continue;
    const endpoints = segs.map((s) => [s[0], s[s.length - 1]]);
    const n = compterSolutions(w, h, endpoints, 2);
    if (n !== 1) continue; // 0, >=2, ou -1 (non prouve) : rejete
    vus.add(sig);
    const fruits = shuffle(FRUITS, rng).slice(0, nPaires);
    const idx = String(grilles.length + 1).padStart(3, "0");
    grilles.push({
      id: `p${palier}-${idx}`,
      palier,
      w,
      h,
      paires: segs.map((s, i) => ({
        fruit: fruits[i],
        chemin: s.map((cell) => [Math.floor(cell / w), cell % w]),
      })),
    });
  }
  return { grilles, attempts };
}

// --------------------------- Programme principal ---------------------------
function main() {
  const args = process.argv.slice(2);
  let count = 45;
  let onlyPalier = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--count") count = parseInt(args[++i], 10);
    else if (args[i] === "--palier") onlyPalier = parseInt(args[++i], 10);
  }
  const probe = args.includes("--probe");
  if (probe) {
    const def = PALIERS.find((p) => p.palier === (onlyPalier ?? 5));
    const rng = mulberry32(0xabc + def.palier);
    const N = count;
    let uniq = 0, zero = 0, multi = 0, unproven = 0, bad = 0, nodesTot = 0;
    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      const ham = randomHamiltonian(def.w, def.h, rng);
      if (!ham) { bad++; continue; }
      const segs = decouper(ham, def.nPaires, rng);
      if (!segs) { bad++; continue; }
      const endpoints = segs.map((s) => [s[0], s[s.length - 1]]);
      const r = compterSolutions(def.w, def.h, endpoints, 2);
      if (r === 1) uniq++; else if (r === 0) zero++; else if (r === -1) unproven++; else multi++;
    }
    const dt = (Date.now() - t0) / 1000;
    console.log(`probe palier ${def.palier} : ${N} candidats en ${dt.toFixed(1)}s`);
    console.log(`  uniques=${uniq} zero=${zero} multi=${multi} nonprouve=${unproven} invalides=${bad}`);
    console.log(`  taux unicite=${((uniq / N) * 100).toFixed(1)}%  ~${(N / dt).toFixed(0)} candidats/s`);
    void nodesTot;
    return;
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const cibles = onlyPalier ? PALIERS.filter((p) => p.palier === onlyPalier) : PALIERS;

  for (const def of cibles) {
    const t0 = Date.now();
    const seed = 0x5e3d00 + def.palier; // graine fixe par palier
    const { grilles, attempts } = genererPalier(def, count, seed);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    const file = resolve(OUT_DIR, `relie-p${def.palier}.json`);
    writeFileSync(file, JSON.stringify(grilles) + "\n");
    console.log(
      `palier ${def.palier} (${def.w}x${def.h}/${def.nPaires}) : ` +
        `${grilles.length} grilles en ${attempts} essais (${dt}s) -> ${file}`
    );
  }
}

main();
