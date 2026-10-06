// API prevue pour le futur EXERCICE DE LECTURE (mission suivante) : surlignage
// mot par mot a une vitesse IMPOSEE (mots/min), SANS audio. Reutilise le meme
// decoupage en spans (toks/mapperMots) que le karaoke de la dictee, donc le meme
// chemin de surlignage cote composant.

import { mapperMots } from "./toks";

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
