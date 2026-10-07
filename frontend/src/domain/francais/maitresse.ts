// « Les mots de la maitresse » (francais, CE2, phase 6). Sous-matiere dont le
// CONTENU est saisi par le PARENT (listes de mots + textes de dictee). Ce module
// regroupe les helpers PURS (testables) : fabrication deterministe de formes
// erronees pour le QCM d'orthographe, choix d'un mot a trou, epellation orale,
// messages de correction. Le SERVEUR reste SEUL JUGE (ops mmots / mtrou /
// mdictee, migration 0046) ; ces helpers ne servent qu'au rendu et au feedback.
//
// Aucune voix de synthese : les exercices marchent SANS audio (la voix Naf est
// pre-generee). Aucune generation audio ici.

import type { Rng } from "../calcul/rng";
import { shuffle } from "../calcul/rng";
import { normaliserMot, motAffichable } from "./dictee";

// --------------------------------------------------------------------------
// Donnees chargees cote enfant (RPC maitresse_charger). `dictees` : par niveau
// ("1".."4"), les MOTS AFFICHES (deja fautifs) + le nombre d'erreurs ; jamais
// les positions ni corrections (secret serveur).
// --------------------------------------------------------------------------
export interface MaitresseDicteeNiveau {
  mots: string[];
  nb: number;
}
export interface MaitresseListe {
  id: string;
  titre: string;
  mots: string[];
  texte: string | null;
  dictees: Record<string, MaitresseDicteeNiveau> | null;
}

const VOYELLES = new Set("aeiouyàâäéèêëîïôöùûü".split(""));
const SILENCE_FIN = new Set(["s", "t", "x", "d", "p", "e", "z"]);

function estConsonne(ch: string): boolean {
  return /[a-zàâäéèêëîïôöùûüç]/.test(ch) && !VOYELLES.has(ch);
}

// Retire les accents (erreur « accent oublie »).
export function sansAccents(mot: string): string {
  return mot
    .replace(/[àâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o").replace(/[ùûü]/g, "u").replace(/ç/g, "c");
}

// Formes ERRONEES plausibles d'un mot (lettre doublee, lettre manquante, accent
// oublie, lettre muette retiree, consonne double simplifiee). Deterministe :
// l'ordre des regles est fixe ; `rng` ne sert qu'a melanger les propositions
// finales. Renvoie jusqu'a `n` formes DISTINCTES, differentes du mot correct.
export function formesErronees(mot: string, rng: Rng, n = 2): string[] {
  const w = mot.toLowerCase();
  const cands: string[] = [];
  const push = (v: string) => {
    if (v && normaliserMot(v) !== normaliserMot(w) && !cands.some((x) => normaliserMot(x) === normaliserMot(v))) {
      cands.push(v);
    }
  };

  // 1) Accent oublie.
  if (w !== sansAccents(w)) push(sansAccents(w));
  // 2) Consonne doublee (premiere consonne interne simple).
  for (let i = 1; i < w.length - 1; i++) {
    if (estConsonne(w[i]) && w[i] !== w[i - 1] && w[i] !== w[i + 1]) {
      push(w.slice(0, i + 1) + w[i] + w.slice(i + 1));
      break;
    }
  }
  // 3) Double consonne simplifiee (poisson -> poison).
  for (let i = 1; i < w.length; i++) {
    if (w[i] === w[i - 1] && estConsonne(w[i])) {
      push(w.slice(0, i) + w.slice(i + 1));
      break;
    }
  }
  // 4) Lettre muette finale retiree (toujours -> toujour, beaucoup -> beaucou).
  if (w.length > 3 && SILENCE_FIN.has(w[w.length - 1])) push(w.slice(0, -1));
  // 5) Voyelle interne manquante (lettre oubliee).
  for (let i = 1; i < w.length - 1; i++) {
    if (VOYELLES.has(w[i])) {
      push(w.slice(0, i) + w.slice(i + 1));
      break;
    }
  }
  // 6) Repli : ajouter un e muet a la fin.
  push(w + "e");

  return shuffle(rng, cands).slice(0, n);
}

// Tokenise un texte EXACTEMENT comme le serveur (btrim + split sur les blancs).
export function tokeniserTexte(texte: string): string[] {
  const t = (texte ?? "").trim();
  return t === "" ? [] : t.split(/\s+/);
}

// Choisit un MOT A TROU dans le texte : en priorite un mot de la liste a
// apprendre (sinon un mot « de contenu » d'au moins 4 lettres). Renvoie la
// position 1-base (index serveur), les tokens avec un trou (null), et le mot
// correct AFFICHABLE. null si aucun mot ne convient.
export function motATrou(
  texte: string,
  mots: string[],
  rng: Rng,
): { index: number; tokens: (string | null)[]; correct: string } | null {
  const toks = tokeniserTexte(texte);
  if (toks.length === 0) return null;
  const aApprendre = new Set(mots.map(normaliserMot));
  const pool: number[] = [];
  toks.forEach((t, i) => {
    if (aApprendre.has(normaliserMot(t))) pool.push(i + 1);
  });
  if (pool.length === 0) {
    toks.forEach((t, i) => {
      if (normaliserMot(t).length >= 4) pool.push(i + 1);
    });
  }
  if (pool.length === 0) return null;
  const index = pool[Math.floor(rng() * pool.length)] ?? pool[0];
  const tokens = toks.map((t, i) => (i + 1 === index ? null : t));
  return { index, tokens, correct: motAffichable(toks[index - 1]) };
}

// Epelle un mot pour l'ORAL (les accents sont DECRITS, jamais opposes a une autre
// graphie). Ex. « maison » -> « m, a, i, s, o, n » ; « élève » -> « e accent
// aigu, l, e accent grave, v, e ».
const NOM_LETTRE: Record<string, string> = {
  "é": "e accent aigu", "è": "e accent grave", "ê": "e accent chapeau", "ë": "e tréma",
  "à": "a accent grave", "â": "a accent chapeau", "ä": "a tréma",
  "ô": "o accent chapeau", "ö": "o tréma", "î": "i accent chapeau", "ï": "i tréma",
  "ù": "u accent grave", "û": "u accent chapeau", "ü": "u tréma", "ç": "c cédille",
  "-": "trait d'union", "'": "apostrophe",
};
export function epeler(mot: string): string {
  return [...mot.toLowerCase()].map((ch) => NOM_LETTRE[ch] ?? ch).join(", ");
}

// Message de correction (feedback), TOUJOURS valorisant et redige pour l'oral.
// On epelle le mot correct (le diagnostic lettre-a-lettre fin n'existe pas pour
// un mot quelconque : on donne une aide claire et concrete).
export function messageMotCorrect(correct: string): string {
  return `C'est presque ça. Le mot s'écrit : ${correct}. On l'épelle : ${epeler(correct)}.`;
}

// Listes exploitables selon le type d'exercice.
export function listesAvecMots(bank: MaitresseListe[]): MaitresseListe[] {
  return bank.filter((l) => l.mots.length >= 3);
}
export function listesAvecTexte(bank: MaitresseListe[]): MaitresseListe[] {
  return bank.filter((l) => l.texte != null && l.texte.trim() !== "");
}
// La dictee detective est-elle possible pour cette liste a ce niveau ?
export function dicteeDispo(liste: MaitresseListe, niveau: number): boolean {
  const d = liste.dictees?.[String(niveau)];
  return Boolean(d && d.nb >= 1);
}
