// API prevue pour le futur EXERCICE DE LECTURE (mission suivante) : surlignage
// mot par mot a une vitesse IMPOSEE (mots/min), SANS audio. Reutilise le meme
// decoupage en spans (toks/mapperMots) que le karaoke de la dictee, donc le meme
// chemin de surlignage cote composant.

import { mapperMots } from "./toks";

// Mot aligné (temps issus du calage au mot, ms relatifs au clip).
export interface MotTemps {
  s: number;
  e: number;
}

export interface PasPause {
  mot: number; // index du mot
  playStartMs: number; // début de lecture du mot dans l'audio source
  playDurMs: number; // durée du mot (vitesse NATURELLE, non déformée)
  pauseApresMs: number; // silence ajouté après le mot pour tenir la vitesse cible
}

// Lecture « Lis avec moi » : la vitesse (mots/min) s'obtient en ALLONGEANT LES
// SILENCES ENTRE LES MOTS (mots joués à vitesse naturelle, voix non déformée),
// pas en ralentissant la lecture (playbackRate déforme la voix < 0,8×). On
// répartit le temps manquant pour atteindre la cible en pauses inter-mots.
export function planPausesEntreMots(mots: MotTemps[], motsParMinute: number): PasPause[] {
  if (mots.length === 0) return [];
  const cibleTotal = (mots.length / Math.max(1, motsParMinute)) * 60000;
  const naturelParole = mots.reduce((s, m) => s + Math.max(0, m.e - m.s), 0);
  const aRepartir = Math.max(0, cibleTotal - naturelParole);
  const pauseParMot = aRepartir / mots.length; // pause après chaque mot (dont le dernier)
  return mots.map((m, i) => ({
    mot: i,
    playStartMs: m.s,
    playDurMs: Math.max(0, m.e - m.s),
    pauseApresMs: Math.round(pauseParMot),
  }));
}

export interface PasLecture {
  mot: number; // index du mot affiche
  startMs: number; // instant de surlignage
  durMs: number; // duree de surlignage
}

// Plan de surlignage a vitesse constante. La duree d'un mot est proportionnelle
// a son nombre de tokens (« vingt-sept » dure 2x « chat »), pour un rythme plus
// naturel qu'un mot = une duree fixe.
export function planLectureSansAudio(mots: string[], motsParMinute: number): PasLecture[] {
  const spans = mapperMots(mots);
  const parToken = 60000 / Math.max(1, motsParMinute);
  const out: PasLecture[] = [];
  let t = 0;
  spans.forEach((s, i) => {
    const dur = Math.max(1, s.tokenCount) * parToken;
    out.push({ mot: i, startMs: Math.round(t), durMs: Math.round(dur) });
    t += dur;
  });
  return out;
}
