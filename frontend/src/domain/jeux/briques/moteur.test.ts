import { describe, it, expect } from "vitest";
import {
  COLONNES,
  LIGNES,
  DUREE_MAX_MS,
  INTERVALLE_BASE_MS,
  INTERVALLE_MIN_MS,
  MoteurBriques,
  collision,
  creerGrille,
  fusionner,
  intervalleChute,
  palierPourLignes,
  pointsLignes,
  rotation,
  suppressionLignes,
  type Forme,
  type Grille,
} from "./moteur";

// RNG deterministe (generateur simple) pour des parties reproductibles.
function rngSeed(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const T: Forme = [
  [0, 1, 0],
  [1, 1, 1],
  [0, 0, 0],
];

describe("rotation", () => {
  it("tourne une forme de 90° horaire sans muter l'entree", () => {
    const original = T.map((l) => l.slice());
    const r = rotation(T);
    expect(r).toEqual([
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ]);
    expect(T).toEqual(original); // immutable
  });

  it("revient a l'identique apres 4 rotations", () => {
    let f = T;
    for (let i = 0; i < 4; i++) f = rotation(f);
    expect(f).toEqual(T);
  });
});

describe("collision", () => {
  it("detecte la sortie a gauche, a droite et en bas", () => {
    const g = creerGrille();
    expect(collision(g, T, -1, 0)).toBe(true); // deborde a gauche
    expect(collision(g, T, COLONNES - 1, 0)).toBe(true); // deborde a droite
    expect(collision(g, T, 0, LIGNES)).toBe(true); // deborde en bas
    expect(collision(g, T, 3, 0)).toBe(false); // ok au centre
  });

  it("tolere les cases au-dessus du haut (y < 0) a l'apparition", () => {
    const g = creerGrille();
    expect(collision(g, T, 3, -1)).toBe(false);
  });

  it("detecte le chevauchement d'une case occupee", () => {
    const g = creerGrille();
    g[5][4] = 3;
    // La barre basse du T passe en ligne 5 (r=1) : collision en (4,5).
    expect(collision(g, T, 3, 4)).toBe(true);
  });
});

describe("suppressionLignes", () => {
  it("supprime les lignes pleines et re-remplit par le haut", () => {
    const g = creerGrille();
    for (let c = 0; c < COLONNES; c++) g[LIGNES - 1][c] = 2; // derniere ligne pleine
    g[LIGNES - 2][0] = 5; // ligne partielle conservee
    const { grille, nbLignes } = suppressionLignes(g);
    expect(nbLignes).toBe(1);
    expect(grille.length).toBe(LIGNES);
    expect(grille[LIGNES - 1][0]).toBe(5); // la partielle est descendue
    expect(grille[0].every((v) => v === 0)).toBe(true); // nouvelle ligne vide en haut
  });

  it("supprime plusieurs lignes d'un coup", () => {
    const g = creerGrille();
    for (let r = LIGNES - 2; r < LIGNES; r++) for (let c = 0; c < COLONNES; c++) g[r][c] = 1;
    const { nbLignes } = suppressionLignes(g);
    expect(nbLignes).toBe(2);
  });
});

describe("acceleration", () => {
  it("augmente le palier tous les 5 lignes", () => {
    expect(palierPourLignes(0)).toBe(0);
    expect(palierPourLignes(4)).toBe(0);
    expect(palierPourLignes(5)).toBe(1);
    expect(palierPourLignes(12)).toBe(2);
    expect(palierPourLignes(3, 2)).toBe(2); // palier de depart pris en compte
    expect(palierPourLignes(5, 2)).toBe(3);
  });

  it("raccourcit l'intervalle de chute a chaque palier puis plafonne", () => {
    expect(intervalleChute(0)).toBe(INTERVALLE_BASE_MS);
    expect(intervalleChute(1)).toBeLessThan(intervalleChute(0));
    expect(intervalleChute(5)).toBeLessThan(intervalleChute(1));
    expect(intervalleChute(100)).toBe(INTERVALLE_MIN_MS); // jamais sous le plancher
  });

  it("part lentement (depart confortable pour un enfant)", () => {
    expect(intervalleChute(0)).toBeGreaterThanOrEqual(800);
  });
});

describe("points", () => {
  it("recompense davantage les multi-lignes et les paliers eleves", () => {
    expect(pointsLignes(1, 0)).toBeLessThan(pointsLignes(4, 0));
    expect(pointsLignes(1, 0)).toBeLessThan(pointsLignes(1, 2));
    expect(pointsLignes(0, 3)).toBe(0);
  });
});

describe("MoteurBriques - deplacements et rotation", () => {
  it("deplace a gauche/droite dans les limites", () => {
    const m = new MoteurBriques({ rng: rngSeed(1) });
    const x0 = m.piece.x;
    expect(m.deplacer(-1, 0)).toBe(true);
    expect(m.piece.x).toBe(x0 - 1);
    expect(m.deplacer(1, 0)).toBe(true);
    expect(m.piece.x).toBe(x0);
  });

  it("ne sort jamais la piece de la grille par rotation (wall kick a gauche)", () => {
    const m = new MoteurBriques({ rng: rngSeed(42) });
    // On colle la piece au mur gauche.
    while (m.deplacer(-1, 0)) {
      /* jusqu'au mur */
    }
    for (let i = 0; i < 6; i++) {
      m.tourner();
      // Apres chaque rotation, aucune case ne doit etre hors grille.
      expect(collision(m.grille, m.piece.forme, m.piece.x, m.piece.y)).toBe(false);
      expect(m.piece.x).toBeGreaterThanOrEqual(0);
    }
  });

  it("ne sort jamais la piece de la grille par rotation (wall kick a droite)", () => {
    const m = new MoteurBriques({ rng: rngSeed(7) });
    while (m.deplacer(1, 0)) {
      /* jusqu'au mur droit */
    }
    for (let i = 0; i < 6; i++) {
      m.tourner();
      expect(collision(m.grille, m.piece.forme, m.piece.x, m.piece.y)).toBe(false);
      // le bord droit de la forme reste dans la grille
      const maxX = Math.max(
        ...m.piece.forme.flatMap((row, _r) =>
          row.map((v, c) => (v ? m.piece.x + c : -1)).filter((x) => x >= 0),
        ),
      );
      expect(maxX).toBeLessThan(COLONNES);
    }
  });

  it("la piece active reste toujours dans la grille a chaque etape d'une partie simulee", () => {
    const m = new MoteurBriques({ rng: rngSeed(123) });
    const actions = [() => m.deplacer(-1, 0), () => m.deplacer(1, 0), () => m.tourner(), () => m.descendre()];
    for (let i = 0; i < 400 && !m.terminee; i++) {
      actions[i % actions.length]();
      m.tick(60);
      if (m.terminee) break; // partie finie : la piece active n'est plus pertinente
      // invariant : la piece ne chevauche rien et ne deborde pas
      expect(collision(m.grille, m.piece.forme, m.piece.x, m.piece.y)).toBe(false);
      for (let r = 0; r < m.piece.forme.length; r++) {
        for (let c = 0; c < m.piece.forme[r].length; c++) {
          if (!m.piece.forme[r][c]) continue;
          const x = m.piece.x + c;
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThan(COLONNES);
          expect(m.piece.y + r).toBeLessThan(LIGNES);
        }
      }
    }
  });
});

describe("MoteurBriques - fantome", () => {
  it("projette la piece tout en bas sans collision", () => {
    const m = new MoteurBriques({ rng: rngSeed(5) });
    const f = m.fantome();
    expect(f.y).toBeGreaterThanOrEqual(m.piece.y);
    expect(collision(m.grille, f.forme, f.x, f.y)).toBe(false);
    // une ligne plus bas, le fantome toucherait le fond ou un bloc
    expect(collision(m.grille, f.forme, f.x, f.y + 1)).toBe(true);
  });
});

describe("MoteurBriques - verrouillage, lignes et score", () => {
  it("supprime deux lignes remplies et credite des points via chute rapide", () => {
    // Deux dernieres lignes pleines sauf les colonnes 0 et 1 : un O pose en
    // (0,0) complete exactement les deux lignes.
    const m = new MoteurBriques({ rng: rngSeed(9) });
    const g: Grille = creerGrille();
    for (let r = LIGNES - 2; r < LIGNES; r++) for (let c = 2; c < COLONNES; c++) g[r][c] = 4;
    m.grille = g;
    m.piece = {
      forme: [
        [1, 1],
        [1, 1],
      ],
      x: 0,
      y: 0,
      couleur: 2,
    };
    const scoreAvant = m.score;
    m.chuteRapide();
    expect(m.lignesTotal).toBe(2);
    expect(m.score).toBeGreaterThan(scoreAvant);
    // Les deux lignes du bas sont bien vides apres suppression.
    expect(m.grille[LIGNES - 1].every((v) => v === 0)).toBe(true);
  });
});

describe("MoteurBriques - fin de partie", () => {
  it("se termine a 3 minutes (constante DUREE_MAX_MS)", () => {
    const m = new MoteurBriques({ rng: rngSeed(3) });
    expect(m.terminee).toBe(false);
    // Avance juste avant la limite.
    m.tick(DUREE_MAX_MS - 100);
    expect(m.terminee).toBe(false);
    m.tick(200);
    expect(m.terminee).toBe(true);
    expect(m.dureeMs).toBe(DUREE_MAX_MS); // borne, ne depasse pas
    expect(m.tempsRestantMs).toBe(0);
    expect(m.resultat().dureeMs).toBe(DUREE_MAX_MS);
  });

  it("n'avance plus apres la fin (tick ignore)", () => {
    const m = new MoteurBriques({ rng: rngSeed(3) });
    m.tick(DUREE_MAX_MS + 1000);
    const avant = m.dureeMs;
    m.tick(1000);
    expect(m.dureeMs).toBe(avant);
    expect(m.deplacer(-1, 0)).toBe(false); // plus d'action possible
  });

  it("se bloque (fin bienveillante) quand la pile atteint le haut", () => {
    const m = new MoteurBriques({ rng: rngSeed(2) });
    // Remplit presque toute la grille pour forcer un blocage rapide.
    const g: Grille = creerGrille();
    for (let r = 2; r < LIGNES; r++) for (let c = 0; c < COLONNES; c++) g[r][c] = 1;
    m.grille = g;
    let securite = 0;
    while (!m.terminee && securite < 1000) {
      m.chuteRapide();
      securite++;
    }
    expect(m.bloquee).toBe(true);
    expect(m.terminee).toBe(true);
  });

  it("le palier de depart optionnel accelere la partie des le debut", () => {
    const lent = new MoteurBriques({ rng: rngSeed(1) });
    const rapide = new MoteurBriques({ rng: rngSeed(1), palierDepart: 3 });
    expect(rapide.palier).toBeGreaterThan(lent.palier);
  });
});

describe("fusionner", () => {
  it("inscrit la couleur de la piece sans muter la grille source", () => {
    const g = creerGrille();
    const piece = { forme: T, x: 3, y: 0, couleur: 6 };
    const res = fusionner(g, piece);
    expect(res[1][4]).toBe(6); // centre de la barre du T
    expect(g[1][4]).toBe(0); // source intacte
  });
});
