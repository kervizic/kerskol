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
  // Memoire par mot (EMA, 0..1) parallele a `mots` : plus un mot a ete rate
  // recemment, plus son EMA est haut, plus il revient en priorite. Optionnel
  // (absent si le serveur ne l'expose pas).
  ema?: number[];
}

// Choisit l'index (1-base) d'un mot a travailler en PRIORISANT les mots faibles
// (EMA haut). Deterministe via `rng` : avec forte probabilite on prend un des
// mots les plus faibles, sinon un mot au hasard (pour ne pas toujours ressasser
// les memes). Repli uniforme si aucune memoire.
export function choisirMotPrioritaire(mots: string[], ema: number[] | undefined, rng: Rng): number {
  const n = mots.length;
  if (n === 0) return 1;
  const scores = ema && ema.length === n ? ema : null;
  const maxEma = scores ? Math.max(...scores) : 0;
  // 70% du temps on cible les mots faibles s'il en existe (EMA > 0).
  if (scores && maxEma > 0 && rng() < 0.7) {
    const faibles = scores
      .map((e, i) => ({ i, e }))
      .filter((x) => x.e >= maxEma - 0.1) // les plus faibles (a +/- 0.1 du pire)
      .map((x) => x.i);
    const pick = faibles[Math.floor(rng() * faibles.length)] ?? 0;
    return pick + 1;
  }
  return 1 + Math.floor(rng() * n);
}

const VOYELLES = new Set("aeiouyàâäéèêëîïôöùûü".split(""));
const SILENCE_FIN = new Set(["s", "t", "x", "d", "p", "e", "z", "g"]);

function estConsonne(ch: string): boolean {
  return /[a-zàâäéèêëîïôöùûüç]/.test(ch) && !VOYELLES.has(ch);
}
function estVoyelle(ch: string): boolean {
  return VOYELLES.has(ch);
}

// Retire les accents (erreur « accent oublie »).
export function sansAccents(mot: string): string {
  return mot
    .replace(/[àâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o").replace(/[ùûü]/g, "u").replace(/ç/g, "c");
}

// Erreurs de SON plausibles (graphies concurrentes d'un meme phoneme) : premiere
// occurrence substituee, ordre fixe donc deterministe. Couvre [o] o/au/eau,
// [s] s/ss/c/ç, [ʒ] g/ge/j. Chaque regle produit UNE forme concurrente.
function formesSon(w: string): string[] {
  const out: string[] = [];
  // [o] : eau -> o, au -> eau, o final -> au/eau, au -> o.
  if (w.includes("eau")) out.push(w.replace("eau", "o"));
  if (/au/.test(w)) { out.push(w.replace("au", "o")); out.push(w.replace("au", "eau")); }
  if (/o(?![ui])/.test(w)) out.push(w.replace(/o(?![ui])/, "au")); // o seul (pas ou/oi)
  // [s] : ss entre voyelles -> s ; s entre voyelles -> ss ; c(e/i) -> ss ; ç -> ss.
  if (/([aeiouyàâéèêëîïôöùûü])ss([aeiouyàâéèêëîïôöùûü])/.test(w))
    out.push(w.replace(/([aeiouyàâéèêëîïôöùûü])ss([aeiouyàâéèêëîïôöùûü])/, "$1s$2"));
  if (/([aeiouyàâéèêëîïôöùûü])s([aeiouyàâéèêëîïôöùûü])/.test(w))
    out.push(w.replace(/([aeiouyàâéèêëîïôöùûü])s([aeiouyàâéèêëîïôöùûü])/, "$1ss$2"));
  if (/ç/.test(w)) out.push(w.replace("ç", "ss"));
  if (/c[eiy]/.test(w)) out.push(w.replace(/c([eiy])/, "ss$1"));
  // [ʒ] : ge -> j ; j -> g (si suivi de e/i) ; g(e/i) -> j.
  if (/ge/.test(w)) out.push(w.replace("ge", "j"));
  if (/j[eiy]/.test(w)) out.push(w.replace(/j([eiy])/, "g$1"));
  return out;
}

// Formes ERRONEES plausibles d'un mot. Familles DETERMINISTES (ordre fixe ; `rng`
// ne sert qu'a melanger la selection finale) : homophone, erreur de son (o/au/eau,
// s/ss/c/ç, g/ge/j), accent oublie, consonne doublee ou simplifiee, lettre muette
// finale, voyelle manquante. Renvoie jusqu'a `n` formes DISTINCTES != du mot.
export function formesErronees(mot: string, rng: Rng, n = 2): string[] {
  const w = mot.toLowerCase();
  const cands: string[] = [];
  const push = (v: string) => {
    if (v && normaliserMot(v) !== normaliserMot(w) && !cands.some((x) => normaliserMot(x) === normaliserMot(v))) {
      cands.push(v);
    }
  };

  // 1) Homophone entier (le piege le plus courant en dictee).
  const homo = HOMOPHONES[normaliserMot(w)];
  if (homo) homo.forEach(push);
  // 2) Double consonne simplifiee (poisson -> poison) : garde avant les sons.
  for (let i = 1; i < w.length; i++) {
    if (w[i] === w[i - 1] && estConsonne(w[i])) { push(w.slice(0, i) + w.slice(i + 1)); break; }
  }
  // 3) Erreurs de son (graphies concurrentes).
  formesSon(w).forEach(push);
  // 4) Accent oublie.
  if (w !== sansAccents(w)) push(sansAccents(w));
  // 5) Consonne doublee (premiere consonne interne simple).
  for (let i = 1; i < w.length - 1; i++) {
    if (estConsonne(w[i]) && w[i] !== w[i - 1] && w[i] !== w[i + 1]) {
      push(w.slice(0, i + 1) + w[i] + w.slice(i + 1)); break;
    }
  }
  // 6) Lettre muette finale retiree (toujours -> toujour, beaucoup -> beaucou).
  if (w.length > 3 && SILENCE_FIN.has(w[w.length - 1])) push(w.slice(0, -1));
  // 7) Voyelle interne manquante (lettre oubliee).
  for (let i = 1; i < w.length - 1; i++) {
    if (VOYELLES.has(w[i])) { push(w.slice(0, i) + w.slice(i + 1)); break; }
  }
  // 8) Repli : ajouter un e muet a la fin.
  push(w + "e");

  return shuffle(rng, cands).slice(0, n);
}

// Homophones grammaticaux CE2 (le mot visible -> ses concurrents plausibles).
const HOMOPHONES: Record<string, string[]> = {
  a: ["à"], "à": ["a"], et: ["est"], est: ["et"], son: ["sont"], sont: ["son"],
  on: ["ont"], ont: ["on"], ou: ["où"], "où": ["ou"], la: ["là"], "là": ["la"],
  ces: ["ses", "c'est"], ses: ["ces", "c'est"], ce: ["se"], se: ["ce"],
  mes: ["mais", "met"], mais: ["mes", "met"], peu: ["peux"], peux: ["peu"],
};

// --------------------------------------------------------------------------
// N2 — « completer les lettres DIFFICILES » et « remettre dans l'ordre ».
// --------------------------------------------------------------------------

// Index (0-base) des lettres DIFFICILES d'un mot : lettres accentuees, ç, les
// deux lettres d'une consonne doublee, lettre muette finale, lettres des graphies
// de son ambigues (c devant e/i, g devant e/i, s entre voyelles, o/au/eau). Les
// lettres FACILES ne sont jamais trouees. Deterministe. Toujours au moins une.
export function lettresDifficiles(mot: string): number[] {
  const w = mot.toLowerCase();
  const diff = new Set<number>();
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    if (/[àâäéèêëîïôöùûüç]/.test(c)) diff.add(i);
    if (i > 0 && c === w[i - 1] && estConsonne(c)) { diff.add(i); diff.add(i - 1); }
    // c/g devant e/i ; s entre voyelles.
    if ((c === "c" || c === "g") && i + 1 < w.length && /[eiy]/.test(w[i + 1])) diff.add(i);
    if (c === "s" && i > 0 && i + 1 < w.length && estVoyelle(w[i - 1]) && estVoyelle(w[i + 1])) diff.add(i);
    // o/au/eau.
    if (c === "o" && !(w[i + 1] === "u" || w[i + 1] === "i")) diff.add(i);
    if (c === "a" && w[i + 1] === "u") { diff.add(i); diff.add(i + 1); if (w[i + 2] === "x") diff.add(i + 2); }
  }
  // Lettre muette finale.
  const last = w.length - 1;
  if (w.length > 3 && SILENCE_FIN.has(w[last])) diff.add(last);
  // Garde-fou : jamais tout le mot, au moins une difficulte.
  const arr = [...diff].filter((i) => i >= 0 && i < w.length).sort((a, b) => a - b);
  if (arr.length === 0) {
    // Repli : la voyelle interne la plus a droite (lettre « a trou » par defaut).
    for (let i = w.length - 2; i >= 1; i--) if (VOYELLES.has(w[i])) return [i];
    return [Math.max(1, w.length - 1)];
  }
  // Ne jamais trouer plus de la moitie (toujours des lettres faciles visibles).
  const max = Math.max(1, Math.floor(w.length / 2));
  return arr.slice(0, max);
}

// Decoupe un mot en SYLLABES approximatives (deterministe, pedagogique, pas
// linguistiquement parfait) : coupe apres une voyelle suivie d'une consonne +
// voyelle. Renvoie au moins 2 morceaux quand c'est possible, sinon les lettres.
export function segmenterSyllabes(mot: string): string[] {
  const w = mot.toLowerCase();
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < w.length; i++) {
    cur += w[i];
    const next = w[i + 1];
    const next2 = w[i + 2];
    // Coupe : voyelle courante, consonne ensuite, voyelle apres (schema V-CV).
    if (estVoyelle(w[i]) && next && estConsonne(next) && next2 && estVoyelle(next2)) {
      out.push(cur); cur = "";
    }
  }
  if (cur) out.push(cur);
  if (out.length >= 2) return out;
  return w.split(""); // repli : lettres.
}

// --------------------------------------------------------------------------
// N3/N4 — phrase a trou bienveillante (gabarit). Le mot est a ECRIRE dans une
// phrase courte, comprehensible a l'oral, generee de facon deterministe. Le
// parent peut la lire a voix haute (« dictee »). Aucun contenu invente sur le
// mot : des porteurs neutres et valorisants.
// --------------------------------------------------------------------------
const GABARITS_PHRASE: string[] = [
  "La maîtresse écrit ___ au tableau.",
  "Dans ma dictée, il y a le mot ___.",
  "Je sais écrire ___ sans me tromper.",
  "Papa ou maman me dicte le mot ___.",
  "Je lis le mot ___ puis je l'écris.",
  "Aujourd'hui, j'apprends à écrire ___.",
];

// Construit une phrase a trou pour un mot : tokens avec un null a la place du mot,
// index 1-base du trou, mot correct affichable. Deterministe via `rng`.
export function phraseGabarit(
  mot: string,
  rng: Rng,
): { index: number; tokens: (string | null)[]; correct: string } {
  const gab = GABARITS_PHRASE[Math.floor(rng() * GABARITS_PHRASE.length)] ?? GABARITS_PHRASE[0];
  const parts = gab.split(/\s+/);
  const index = parts.findIndex((t) => t.includes("___")) + 1;
  const tokens = parts.map((t) => (t.includes("___") ? null : t));
  return { index, tokens, correct: motAffichable(mot) };
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
