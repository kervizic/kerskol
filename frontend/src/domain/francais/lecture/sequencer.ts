// SEQUENCEUR de la lecture rythmee. Separe en deux :
//  1. une fonction PURE `bornesSegment` + un plan d'evenements (testable sans
//     horloge) ;
//  2. une classe `Sequenceur` pilotee par une HORLOGE injectable et un LECTEUR
//     abstrait (adaptateur Web Audio reel en prod ; faux en test).
//
// Principe : la voix joue a vitesse NATURELLE, segment par segment ; entre deux
// segments on insere un SILENCE (pauseMs). Option « ralenti leger » (0.9) avec
// hauteur preservee geree par l'adaptateur audio (lecteur). Le surlignage suit
// le mot/groupe lu via des rappels programmes sur l'horloge.

import type { Segment } from "./grouping";
import type { MotTiming } from "./timings";

// ---- Horloge injectable (vraie = setTimeout ; fausse = test deterministe) ----

export interface Horloge {
  maintenant(): number;
  programmer(ms: number, cb: () => void): number;
  annuler(id: number): void;
}

/** Horloge reelle basee sur setTimeout / Date.now. */
export function horlogeReelle(): Horloge {
  return {
    maintenant: () => Date.now(),
    programmer: (ms, cb) => window.setTimeout(cb, Math.max(0, ms)),
    annuler: (id) => window.clearTimeout(id),
  };
}

// ---- Lecteur audio abstrait ----

export interface Lecteur {
  /** joue l'audio de debutMs a finMs a la vitesse donnee (1 = naturel). */
  jouer(debutMs: number, finMs: number, vitesse: number): void;
  pause(): void;
  stop(): void;
}

// ---- Partie PURE ----

export interface BornesSegment {
  debutMs: number;
  finMs: number;
  mots: MotTiming[]; // timings des mots du segment, dans l'ordre
}

/**
 * Calcule les bornes audio d'un segment a partir des timings de ses tokens.
 * Les tokens sans timing sont ignores (ne devrait pas arriver si QC passe).
 * Retourne null si aucun mot du segment n'a de timing.
 */
export function bornesSegment(
  segment: Segment,
  timingsParIndex: Map<number, MotTiming>
): BornesSegment | null {
  const mots: MotTiming[] = [];
  for (const idx of segment.tokens) {
    const t = timingsParIndex.get(idx);
    if (t) mots.push(t);
  }
  if (mots.length === 0) return null;
  const debutMs = Math.min(...mots.map((m) => m.debut_ms));
  const finMs = Math.max(...mots.map((m) => m.fin_ms));
  return { debutMs, finMs, mots };
}

export interface EvenementPlan {
  type: "segment" | "mot" | "fin";
  tMs: number; // temps sur l'horloge de lecture (depuis le demarrage)
  segmentIndex: number;
  motIndex?: number; // index de token (highlight)
}

/**
 * Plan complet des evenements (deterministe, sans horloge) : utile pour tester
 * et pour un affichage anticipe. Chaque segment est joue en
 * (finMs-debutMs)/vitesse, suivi de pauseMs.
 */
export function planifier(
  segments: Segment[],
  timingsParIndex: Map<number, MotTiming>,
  pauseMs: number,
  vitesse: number
): EvenementPlan[] {
  const evts: EvenementPlan[] = [];
  let t = 0;
  segments.forEach((seg, si) => {
    const b = bornesSegment(seg, timingsParIndex);
    if (!b) return;
    evts.push({ type: "segment", tMs: t, segmentIndex: si });
    for (const m of b.mots) {
      const decalage = (m.debut_ms - b.debutMs) / vitesse;
      evts.push({ type: "mot", tMs: t + decalage, segmentIndex: si, motIndex: m.index });
    }
    const duree = (b.finMs - b.debutMs) / vitesse;
    t += duree + pauseMs;
  });
  evts.push({ type: "fin", tMs: t, segmentIndex: segments.length });
  return evts;
}

// ---- Driver (pilote l'horloge + le lecteur) ----

export interface OptionsSequenceur {
  pauseMs: number;
  vitesse: number;
  horloge: Horloge;
  lecteur: Lecteur;
  onSegment?: (index: number) => void;
  onMot?: (tokenIndex: number) => void;
  onFin?: () => void;
}

export type EtatLecture = "arret" | "lecture" | "pause";

export class Sequenceur {
  private segmentsBornes: (BornesSegment | null)[];
  private i = 0;
  private timers: number[] = [];
  private _etat: EtatLecture = "arret";

  constructor(
    segments: Segment[],
    timingsParIndex: Map<number, MotTiming>,
    private opts: OptionsSequenceur
  ) {
    this.segmentsBornes = segments.map((s) => bornesSegment(s, timingsParIndex));
  }

  get etat(): EtatLecture {
    return this._etat;
  }

  get segmentCourant(): number {
    return this.i;
  }

  private annulerTimers(): void {
    for (const id of this.timers) this.opts.horloge.annuler(id);
    this.timers = [];
  }

  private jouerSegment(): void {
    // saute les segments sans timing
    while (this.i < this.segmentsBornes.length && this.segmentsBornes[this.i] === null) {
      this.i++;
    }
    if (this.i >= this.segmentsBornes.length) {
      this._etat = "arret";
      this.opts.onFin?.();
      return;
    }
    const b = this.segmentsBornes[this.i]!;
    this._etat = "lecture";
    this.opts.onSegment?.(this.i);
    this.opts.lecteur.jouer(b.debutMs, b.finMs, this.opts.vitesse);
    for (const m of b.mots) {
      const decalage = (m.debut_ms - b.debutMs) / this.opts.vitesse;
      this.timers.push(
        this.opts.horloge.programmer(decalage, () => this.opts.onMot?.(m.index))
      );
    }
    const duree = (b.finMs - b.debutMs) / this.opts.vitesse;
    this.timers.push(
      this.opts.horloge.programmer(duree + this.opts.pauseMs, () => this.suivant())
    );
  }

  private suivant(): void {
    this.annulerTimers();
    this.i++;
    this.jouerSegment();
  }

  demarrer(): void {
    this.annulerTimers();
    this.i = 0;
    this.jouerSegment();
  }

  pause(): void {
    if (this._etat !== "lecture") return;
    this.annulerTimers();
    this.opts.lecteur.pause();
    this._etat = "pause";
  }

  /** Reprend en REJOUANT le segment courant depuis son debut (bienveillant). */
  reprendre(): void {
    if (this._etat !== "pause") return;
    this.jouerSegment();
  }

  recommencer(): void {
    this.demarrer();
  }

  stop(): void {
    this.annulerTimers();
    this.opts.lecteur.stop();
    this._etat = "arret";
    this.i = 0;
  }

  /** Change la pause / vitesse a chaud (pris en compte au prochain segment). */
  reglages(pauseMs: number, vitesse: number): void {
    this.opts.pauseMs = pauseMs;
    this.opts.vitesse = vitesse;
  }
}

/** Pause par defaut (ms) selon le mode. */
export function pauseParDefaut(mode: string): number {
  switch (mode) {
    case "cp":
      return 500;
    case "ce1":
      return 400;
    case "ce2":
      return 300;
    case "cm":
      return 150;
    default:
      return 300;
  }
}
