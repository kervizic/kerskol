// Reglages « lecture rythmee » MEMORISES PAR PROFIL (confort de lecture).
//
// Choix (documente) : stockage en localStorage par profil, PAS en base. Ce sont
// des reglages de CONFORT locaux (mode, duree de pause, espacement, ralenti) qui
// doivent marcher hors ligne (PWA) et ne portent aucune donnee personnelle. La
// consigne « migration additive si besoin » est donc conditionnelle -> inutile
// ici. Le mode par defaut derive de la CLASSE du profil (CE2 pour Iris) et reste
// modifiable par l'enfant comme par le parent.

import type { ModeLecture } from "./grouping";
import { MODES, modeParDefaut } from "./grouping";
import { pauseParDefaut } from "./sequencer";

export type Espacement = "normal" | "large" | "tres-large";
export const ESPACEMENTS: Espacement[] = ["normal", "large", "tres-large"];

export interface ReglagesLecture {
  mode: ModeLecture;
  pauseMs: number;
  espacement: Espacement;
  ralenti: boolean; // uniquement utile en mode « cm » (0.9, hauteur preservee)
}

export const PAUSE_MIN = 0;
export const PAUSE_MAX = 1500;

export function reglagesParDefaut(classe: string): ReglagesLecture {
  const mode = modeParDefaut(classe);
  return { mode, pauseMs: pauseParDefaut(mode), espacement: "normal", ralenti: false };
}

/** Borne/valide une valeur de reglages venue du stockage (tolerant). */
export function normaliserReglages(
  brut: Partial<ReglagesLecture> | null | undefined,
  classe: string
): ReglagesLecture {
  const base = reglagesParDefaut(classe);
  if (!brut || typeof brut !== "object") return base;
  const mode = MODES.includes(brut.mode as ModeLecture) ? (brut.mode as ModeLecture) : base.mode;
  const pauseMs =
    typeof brut.pauseMs === "number" && isFinite(brut.pauseMs)
      ? Math.min(PAUSE_MAX, Math.max(PAUSE_MIN, Math.round(brut.pauseMs)))
      : pauseParDefaut(mode);
  const espacement = ESPACEMENTS.includes(brut.espacement as Espacement)
    ? (brut.espacement as Espacement)
    : base.espacement;
  const ralenti = typeof brut.ralenti === "boolean" ? brut.ralenti : base.ralenti;
  return { mode, pauseMs, espacement, ralenti };
}

/** Vitesse de lecture effective (naturelle sauf ralenti en mode continu). */
export function vitesseDe(reglages: ReglagesLecture): number {
  return reglages.mode === "cm" && reglages.ralenti ? 0.9 : 1;
}

const PREFIXE = "kerskol:lecture:";

function cle(profilId: string): string {
  return `${PREFIXE}${profilId}`;
}

/** Charge les reglages d'un profil (defaut selon classe si absents/invalides). */
export function chargerReglages(profilId: string, classe: string): ReglagesLecture {
  try {
    const brut = localStorage.getItem(cle(profilId));
    if (!brut) return reglagesParDefaut(classe);
    return normaliserReglages(JSON.parse(brut), classe);
  } catch {
    return reglagesParDefaut(classe);
  }
}

/** Enregistre les reglages d'un profil. */
export function enregistrerReglages(profilId: string, reglages: ReglagesLecture): void {
  try {
    localStorage.setItem(cle(profilId), JSON.stringify(reglages));
  } catch {
    /* quota / mode prive : on ignore, l'app marche sans memorisation */
  }
}
