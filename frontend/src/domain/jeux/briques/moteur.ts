// « Les briques » - moteur de jeu PUR (aucune dependance React / DOM).
// ------------------------------------------------------------------------
// Logique entierement separee du rendu pour etre testable sous vitest (node).
// Un jeu de blocs qui tombent, adapte a un enfant de 8 ans :
//   - 7 pieces generiques (les 7 assemblages de 4 carres), couleurs douces ;
//   - vitesse de depart LENTE, acceleration progressive tous les 5 lignes ;
//   - partie = jusqu'au blocage OU 3 minutes (constante), jamais « game over ».
//
// Rien ici ne touche au DOM : le composant React lit l'etat et dessine.

// ------------------------------- Constantes -------------------------------

export const NOM_JEU = "Les briques"; // marque neutre, facile a changer ici

export const COLONNES = 10;
export const LIGNES = 20;

// Duree maximale d'une partie (3 minutes). Modifiable d'un seul endroit.
export const DUREE_MAX_MS = 3 * 60 * 1000;

// Acceleration : un palier de vitesse en plus tous les 5 lignes supprimees.
export const LIGNES_PAR_PALIER = 5;

// Courbe de vitesse (intervalle entre deux descentes automatiques, en ms).
export const INTERVALLE_BASE_MS = 900; // depart LENT (enfant)
export const INTERVALLE_MIN_MS = 150; // plancher (jamais injouable)
export const PAS_ACCELERATION_MS = 70; // gain par palier

// Points par nombre de lignes supprimees d'un coup (x (palier + 1)).
const POINTS_PAR_LIGNES = [0, 40, 100, 300, 1200];

// --------------------------------- Types ----------------------------------

/** Grille de jeu : 0 = vide, sinon index de couleur (1..7). */
export type Grille = number[][];

/** Matrice carree d'une piece : 1 = carre plein, 0 = vide. */
export type Forme = number[][];

export interface Piece {
  forme: Forme;
  x: number; // colonne du coin haut-gauche de la matrice
  y: number; // ligne (peut etre negatif juste a l'apparition)
  couleur: number; // 1..7
}

export interface ResultatPartie {
  score: number;
  lignes: number;
  dureeMs: number;
  palierAtteint: number;
}

// Generateur de nombres : injectable pour des tests deterministes.
export type Rng = () => number;

// ------------------------- Definition des 7 pieces -------------------------
// Formes classiques (4 carres). L'index de couleur (1..7) correspond a l'ordre
// de COULEURS_PIECES dans le rendu. Formes orientees « a plat » au depart.

const FORMES: readonly Forme[] = [
  // I
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // O
  [
    [1, 1],
    [1, 1],
  ],
  // T
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  // S
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  // Z
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  // J
  [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  // L
  [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
];

export const NB_PIECES = FORMES.length;

// --------------------------- Fonctions pures -------------------------------

/** Cree une grille vide de dimensions donnees. */
export function creerGrille(colonnes = COLONNES, lignes = LIGNES): Grille {
  return Array.from({ length: lignes }, () => new Array<number>(colonnes).fill(0));
}

/** Copie profonde d'une grille (pour ne jamais muter l'entree). */
function copierGrille(g: Grille): Grille {
  return g.map((ligne) => ligne.slice());
}

/** Rotation horaire (90°) d'une matrice carree. Ne mute pas l'entree. */
export function rotation(forme: Forme): Forme {
  const n = forme.length;
  const res: Forme = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      res[c][n - 1 - r] = forme[r][c];
    }
  }
  return res;
}

/**
 * Collision : vrai si poser `forme` au point (px, py) sort de la grille
 * (gauche/droite/bas) ou chevauche une case deja occupee. Au-dessus du haut
 * (y < 0) est tolere pour l'apparition.
 */
export function collision(grille: Grille, forme: Forme, px: number, py: number): boolean {
  const colonnes = grille[0].length;
  const lignes = grille.length;
  for (let r = 0; r < forme.length; r++) {
    for (let c = 0; c < forme[r].length; c++) {
      if (forme[r][c] === 0) continue;
      const x = px + c;
      const y = py + r;
      if (x < 0 || x >= colonnes || y >= lignes) return true;
      if (y >= 0 && grille[y][x] !== 0) return true;
    }
  }
  return false;
}

/** Fusionne une piece dans la grille (nouvelle grille, entree non mutee). */
export function fusionner(grille: Grille, piece: Piece): Grille {
  const res = copierGrille(grille);
  for (let r = 0; r < piece.forme.length; r++) {
    for (let c = 0; c < piece.forme[r].length; c++) {
      if (piece.forme[r][c] === 0) continue;
      const x = piece.x + c;
      const y = piece.y + r;
      if (y >= 0 && y < res.length && x >= 0 && x < res[0].length) {
        res[y][x] = piece.couleur;
      }
    }
  }
  return res;
}

/**
 * Supprime les lignes pleines. Retourne la nouvelle grille (re-remplie par le
 * haut avec des lignes vides) et le nombre de lignes supprimees.
 */
export function suppressionLignes(grille: Grille): { grille: Grille; nbLignes: number } {
  const colonnes = grille[0].length;
  const restantes = grille.filter((ligne) => ligne.some((v) => v === 0));
  const nbLignes = grille.length - restantes.length;
  const vides = Array.from({ length: nbLignes }, () => new Array<number>(colonnes).fill(0));
  return { grille: [...vides, ...restantes], nbLignes };
}

/** Palier de vitesse atteint pour un nombre de lignes donne. */
export function palierPourLignes(lignes: number, palierDepart = 0): number {
  return palierDepart + Math.floor(lignes / LIGNES_PAR_PALIER);
}

/** Intervalle de chute automatique (ms) pour un palier. Decroit puis plafonne. */
export function intervalleChute(palier: number): number {
  return Math.max(INTERVALLE_MIN_MS, INTERVALLE_BASE_MS - palier * PAS_ACCELERATION_MS);
}

/** Points gagnes pour n lignes supprimees d'un coup, au palier donne. */
export function pointsLignes(nbLignes: number, palier: number): number {
  const base = POINTS_PAR_LIGNES[nbLignes] ?? 0;
  return base * (palier + 1);
}

/** Position d'apparition (centree en haut) d'une forme. */
function positionDepart(forme: Forme, colonnes: number): { x: number; y: number } {
  // Largeur reelle de la forme (colonnes contenant au moins un carre).
  let min = forme.length;
  let max = -1;
  for (let r = 0; r < forme.length; r++) {
    for (let c = 0; c < forme[r].length; c++) {
      if (forme[r][c]) {
        if (c < min) min = c;
        if (c > max) max = c;
      }
    }
  }
  const largeur = max - min + 1;
  const x = Math.floor((colonnes - largeur) / 2) - min;
  return { x, y: 0 };
}

// --------------------------- Sac aleatoire (7-bag) -------------------------
// Chaque « sac » contient les 7 pieces melangees : distribution equitable, pas
// de longue serie de la meme piece (plus juste pour un enfant).

function creerSac(rng: Rng): number[] {
  const sac = Array.from({ length: NB_PIECES }, (_, i) => i);
  for (let i = sac.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [sac[i], sac[j]] = [sac[j], sac[i]];
  }
  return sac;
}

/** Decalages de « wall kick » essayes quand une rotation touche un mur/bloc. */
const WALL_KICKS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [0, -1], // laisse respirer les rotations en bas
];

// ------------------------------ Le moteur ----------------------------------

export interface OptionsMoteur {
  palierDepart?: number;
  rng?: Rng;
  colonnes?: number;
  lignes?: number;
  dureeMaxMs?: number;
}

/**
 * Etat mutable du jeu encapsule. Le composant appelle tick(dt) a chaque frame
 * et les actions (deplacer/tourner/descendre/chuteRapide) sur interaction.
 * Toute la mecanique s'appuie sur les fonctions pures ci-dessus.
 */
export class MoteurBriques {
  readonly colonnes: number;
  readonly lignes: number;
  readonly dureeMaxMs: number;
  private readonly rng: Rng;
  private readonly palierDepart: number;

  grille: Grille;
  piece: Piece;
  suivante: number; // index de forme (0..6) de la prochaine piece
  score = 0;
  lignesTotal = 0;
  dureeMs = 0;
  bloquee = false;

  private sac: number[] = [];
  private accumulateurMs = 0;

  constructor(options: OptionsMoteur = {}) {
    this.colonnes = options.colonnes ?? COLONNES;
    this.lignes = options.lignes ?? LIGNES;
    this.dureeMaxMs = options.dureeMaxMs ?? DUREE_MAX_MS;
    this.rng = options.rng ?? Math.random;
    this.palierDepart = Math.max(0, options.palierDepart ?? 0);

    this.grille = creerGrille(this.colonnes, this.lignes);
    this.suivante = this.tirerIndex();
    this.piece = this.fabriquerPiece(this.tirerIndex());
  }

  /** Palier de vitesse courant. */
  get palier(): number {
    return palierPourLignes(this.lignesTotal, this.palierDepart);
  }

  /** Vrai quand la partie est finie (blocage OU temps ecoule). */
  get terminee(): boolean {
    return this.bloquee || this.dureeMs >= this.dureeMaxMs;
  }

  /** Temps restant en ms (>= 0). */
  get tempsRestantMs(): number {
    return Math.max(0, this.dureeMaxMs - this.dureeMs);
  }

  /** Resultat a transmettre a l'appelant en fin de partie. */
  resultat(): ResultatPartie {
    return {
      score: this.score,
      lignes: this.lignesTotal,
      dureeMs: Math.min(this.dureeMs, this.dureeMaxMs),
      palierAtteint: this.palier,
    };
  }

  private tirerIndex(): number {
    if (this.sac.length === 0) this.sac = creerSac(this.rng);
    return this.sac.pop() as number;
  }

  private fabriquerPiece(index: number): Piece {
    const forme = FORMES[index].map((l) => l.slice());
    const { x, y } = positionDepart(forme, this.colonnes);
    return { forme, x, y, couleur: index + 1 };
  }

  /** Deplacement lateral/vertical. Retourne vrai si le mouvement a eu lieu. */
  deplacer(dx: number, dy: number): boolean {
    if (this.terminee) return false;
    if (!collision(this.grille, this.piece.forme, this.piece.x + dx, this.piece.y + dy)) {
      this.piece.x += dx;
      this.piece.y += dy;
      return true;
    }
    return false;
  }

  /** Rotation horaire avec « wall kicks ». Retourne vrai si elle a abouti. */
  tourner(): boolean {
    if (this.terminee) return false;
    const tournee = rotation(this.piece.forme);
    for (const [dx, dy] of WALL_KICKS) {
      if (!collision(this.grille, tournee, this.piece.x + dx, this.piece.y + dy)) {
        this.piece.forme = tournee;
        this.piece.x += dx;
        this.piece.y += dy;
        return true;
      }
    }
    return false;
  }

  /** Descente douce d'une ligne (action joueur). Verrouille si impossible. */
  descendre(): boolean {
    if (this.terminee) return false;
    if (this.deplacer(0, 1)) {
      this.accumulateurMs = 0;
      return true;
    }
    this.verrouiller();
    return false;
  }

  /** Chute rapide jusqu'en bas puis verrouillage. */
  chuteRapide(): void {
    if (this.terminee) return;
    while (this.deplacer(0, 1)) {
      /* descend jusqu'au contact */
    }
    this.verrouiller();
  }

  /** Position (y) ou la piece se poserait si on la laissait tomber : fantome. */
  fantome(): Piece {
    let y = this.piece.y;
    while (!collision(this.grille, this.piece.forme, this.piece.x, y + 1)) y++;
    return { ...this.piece, y };
  }

  /** Forme de la prochaine piece (pour l'apercu). */
  formeSuivante(): Forme {
    return FORMES[this.suivante];
  }

  couleurSuivante(): number {
    return this.suivante + 1;
  }

  /**
   * Avance le temps de dtMs. Gere la descente automatique selon le palier et
   * l'arret a 3 minutes. A appeler a chaque frame.
   */
  tick(dtMs: number): void {
    if (this.terminee) return;
    this.dureeMs += dtMs;
    if (this.dureeMs >= this.dureeMaxMs) {
      this.dureeMs = this.dureeMaxMs;
      return; // fin par le temps : la piece en cours reste en place
    }
    this.accumulateurMs += dtMs;
    const intervalle = intervalleChute(this.palier);
    while (this.accumulateurMs >= intervalle && !this.terminee) {
      this.accumulateurMs -= intervalle;
      if (!this.deplacer(0, 1)) this.verrouiller();
    }
  }

  /** Fixe la piece, supprime les lignes, fait apparaitre la suivante. */
  private verrouiller(): void {
    this.grille = fusionner(this.grille, this.piece);
    const { grille, nbLignes } = suppressionLignes(this.grille);
    this.grille = grille;
    if (nbLignes > 0) {
      this.score += pointsLignes(nbLignes, this.palier);
      this.lignesTotal += nbLignes;
    }
    this.accumulateurMs = 0;
    const prochaine = this.fabriquerPiece(this.suivante);
    this.suivante = this.tirerIndex();
    if (collision(this.grille, prochaine.forme, prochaine.x, prochaine.y)) {
      this.bloquee = true; // plateau plein : fin bienveillante, pas « game over »
    } else {
      this.piece = prochaine;
    }
  }
}
