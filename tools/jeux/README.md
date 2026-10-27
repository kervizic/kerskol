# Générateur de grilles — Maison des jeux

Génère HORS LIGNE les grilles du jeu « Relie les fruits » (puzzle type
Numberlink, famille Nikoli, libre de droits). Les grilles sont stockées en JSON
dans `frontend/src/domain/jeux/grilles/relie-p<N>.json` (une par palier) et
embarquées dans le build.

## Garanties

- Grille **entièrement remplie** (l'union des chemins couvre toutes les cases).
- Solution **unique**, prouvée par un solveur qui compte les solutions et
  s'arrête à 2 (on ne garde que les grilles à solution unique dans la limite de
  nœuds du solveur). Le même solveur est porté en TS (`frontend/src/domain/jeux/
  solveur.ts`) et re-vérifie l'unicité dans les tests (`grilles.test.ts`).
- ≥ 40 grilles par palier (le dépôt en contient 45).
- Déterministe (graine fixe par palier) : regénérable à l'identique.

## Paliers

| Palier | Grille | Paires |
| --- | --- | --- |
| 1 | 4×4 | 3 |
| 2 | 5×5 | 4 |
| 3 | 6×6 | 5 |
| 4 | 7×7 | 6 |
| 5 | 7×7 | 7 (chemins tortueux) |

Doit rester aligné avec `frontend/src/domain/jeux/difficulte.ts` (constante
`PALIERS`).

## Méthode

1. Un chemin **hamiltonien** aléatoire couvrant toute la grille est produit par
   l'algorithme *backbite* (part d'un serpent, applique des mouvements qui
   transforment un chemin hamiltonien en un autre — ne échoue jamais, rapide).
2. Il est découpé en K segments (≥ 2 cases) : chaque segment devient une paire,
   ses extrémités sont les deux fruits.
3. Le solveur vérifie l'unicité. On recommence tant que la solution n'est pas
   unique.

Le palier 4 (6 paires sur 7×7) est le plus coûteux (unicité rare) : ~2 min.

## Usage

```bash
# Tous les paliers (45 grilles chacun)
node tools/jeux/generate.mjs --count 45

# Un seul palier
node tools/jeux/generate.mjs --count 45 --palier 4

# Mesurer le taux d'unicité (diagnostic)
node tools/jeux/generate.mjs --probe --palier 5 --count 2000
```

Node seul, aucune dépendance npm.
