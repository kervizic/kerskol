// toks() - decoupage en mots IDENTIQUE a tools/tts/toks.py (jeu commun :
// tools/tts/toks_fixture.json). Chiffres -> lettres (meme verbalisation que
// l'audio), apostrophes/traits d'union -> separateurs, on ne garde que lettres
// (accents + ligatures) et chiffres residuels.

import { nombreEnLettres } from "./nombres";

const ALLOWED = /[^0-9a-zà-öø-ÿœæ\s]/g;

export function toks(t: string): string[] {
  if (!t) return [];
  let s = t.normalize("NFC").toLowerCase();
  s = s.replace(/\d+/g, (m) => ` ${nombreEnLettres(parseInt(m, 10))} `);
  s = s.replace(/['’\-]/g, " ");
  return s.replace(ALLOWED, " ").split(/\s+/).filter(Boolean);
}

// Correspondance mot AFFICHE (span) -> plage de tokens, pour surligner le bon
// mot a l'ecran (ex. « l'école » = 1 span / 2 tokens ; « vingt-sept » = 1 / 2).
export interface MotSpan {
  mot: string;
  tokenStart: number;
  tokenCount: number;
}

export function mapperMots(mots: string[]): MotSpan[] {
  let idx = 0;
  const out: MotSpan[] = [];
  for (const mot of mots) {
    const c = toks(mot).length;
    out.push({ mot, tokenStart: idx, tokenCount: c });
    idx += c;
  }
  return out;
}

// Decoupe une liste de mots affiches en PHRASES (indices de mots), en fermant
// une phrase sur un mot terminant par . ! ou ? (meme segmentation que le
// decoupage Python des dictees). Sert au surlignage phrase par phrase.
export function phrasesDepuisMots(mots: string[]): number[][] {
  const out: number[][] = [];
  let cur: number[] = [];
  for (let i = 0; i < mots.length; i++) {
    cur.push(i);
    if (/[.!?]["»”)]*$/.test(mots[i])) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

// Index du span (mot affiche) contenant le token courant, ou -1.
export function spanPourToken(spans: MotSpan[], tokenIndex: number): number {
  for (let i = 0; i < spans.length; i++) {
    const s = spans[i];
    if (s.tokenCount > 0 && tokenIndex >= s.tokenStart && tokenIndex < s.tokenStart + s.tokenCount) {
      return i;
    }
  }
  return -1;
}
