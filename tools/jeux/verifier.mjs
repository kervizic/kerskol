#!/usr/bin/env node
// verifier.mjs - VERIFICATEUR « sans raccourci » des grilles « Relie les fruits ».
//
// Regle demandee par Manu : il ne doit exister AUCUNE facon de relier toutes
// les paires (chemins simples, disjoints) qui laisse une case vide. Autrement
// dit, la solution reste UNIQUE meme SANS la regle « remplir toutes les cases »,
// et cette unique solution couvre 100 % de la grille.
//
// Methode : on compte les solutions du puzzle en mode RELACHE (on relie chaque
// paire par un chemin simple de cases vides, mais on N'EXIGE PAS de remplir la
// grille). Une grille « sans raccourci » a exactement 1 solution relachee : la
// solution couvrante stockee est alors forcement la seule, donc aucune variante
// ne laisse de case vide.
//
// Resultat compterSolutionsRelache : 0 (impossible), 1 (OK, sans raccourci),
// >=2 (raccourci possible -> rejet), -1 (plafond de noeuds atteint, non prouve).
//
// Usage : node tools/jeux/verifier.mjs            (audit des grilles livrees)
//         node tools/jeux/verifier.mjs --probe N  (stats sur grilles au hasard)

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GRILLES_DIR = resolve(__dirname, "../../frontend/src/domain/jeux/grilles");

const NODE_CAP = 8_000_000;

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

// Compte les solutions RELACHEES (sans exiger de remplir la grille), plafonne a
// `limit`. Chaque paire est reliee par un chemin simple de cases vides ; les
// cases restantes peuvent demeurer vides. Prunes SURS conserves (A et B : toute
// paire restante doit pouvoir etre reliee via des cases vides). On RETIRE le
// prune « composante de vide doit etre atteignable » et la verif de couverture
// finale : ici, laisser du vide est permis (c'est justement ce qu'on traque).
export function compterSolutionsRelache(w, h, endpoints, limit = 2) {
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
    return true;
  }

  function croit(i, head) {
    if (++nodes > NODE_CAP) { cap = true; return; }
    if (solutions >= limit || cap) return;
    const target = endpoints[i][1];
    if (head === target) {
      if (i + 1 >= nPairs) {
        solutions += 1; // toutes reliees : c'est UNE solution (vide permis)
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

export function boutsDeGrille(g) {
  return g.paires.map((p) => {
    const a = p.chemin[0];
    const b = p.chemin[p.chemin.length - 1];
    return [a[0] * g.w + a[1], b[0] * g.w + b[1]];
  });
}

// Une grille est « sans raccourci » ssi exactement 1 solution relachee.
export function sansRaccourci(g) {
  return compterSolutionsRelache(g.w, g.h, boutsDeGrille(g), 2) === 1;
}

function main() {
  const args = process.argv.slice(2);
  const paliers = [1, 2, 3, 4, 5];
  let totalOk = 0, total = 0;
  const parPalier = {};
  for (const p of paliers) {
    let grilles;
    try {
      grilles = JSON.parse(readFileSync(resolve(GRILLES_DIR, `relie-p${p}.json`), "utf8"));
    } catch {
      continue;
    }
    let ok = 0;
    const details = [];
    for (const g of grilles) {
      const r = compterSolutionsRelache(g.w, g.h, boutsDeGrille(g), 2);
      if (r === 1) ok++;
      else details.push(`${g.id}=${r}`);
    }
    parPalier[p] = { total: grilles.length, ok, rejets: details };
    totalOk += ok;
    total += grilles.length;
    console.log(`palier ${p} : ${ok}/${grilles.length} sans raccourci` + (details.length ? `  (rejets: ${details.slice(0, 8).join(", ")}${details.length > 8 ? " …" : ""})` : ""));
  }
  console.log(`\nTOTAL : ${totalOk}/${total} grilles passent le verificateur « sans raccourci ».`);

  // Verif ciblee : p2-038 doit echouer.
  try {
    const p2 = JSON.parse(readFileSync(resolve(GRILLES_DIR, "relie-p2.json"), "utf8"));
    const g = p2.find((x) => x.id === "p2-038");
    if (g) {
      const r = compterSolutionsRelache(g.w, g.h, boutsDeGrille(g), 3);
      console.log(`\np2-038 : ${r} solution(s) relachee(s) -> ${r === 1 ? "PASSE (inattendu !)" : "REJETEE (attendu)"}`);
    }
  } catch { /* fichier change : ignore */ }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
