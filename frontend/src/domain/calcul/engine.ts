// Moteur de deroulement d'une seance (TS pur, testable).
//
// Adaptation live (prompt) :
//   * 2 erreurs de suite sur une competence -> indice au suivant + niveau
//     inferieur pour les items suivants de cette competence ;
//   * 3 reussites de suite -> niveau superieur pour les items suivants ;
//   * 3 erreurs sur les 5 dernieres -> on n'insiste plus (les items restants de
//     cette competence sont retires de la seance) ;
//   * erreur + correction lue -> un exercice SIMILAIRE (non identique) est
//     reinsere 2 a 4 positions plus loin (rattrapage) ;
//   * « Tu es sure de toi ? » environ 1 fois sur 6.

import { generateExercise, type ExCalcul, type GeneratedExercise } from "./generator";
import { makeRng, hashSeed } from "./rng";
import type { Category, PlannedItem } from "./composer";

interface CompLive {
  niveau: number;
  consecCorrect: number;
  consecWrong: number;
  window: boolean[]; // 5 derniers resultats
  dropped: boolean;
  hintNext: boolean;
}

export interface Slot {
  exercise: GeneratedExercise;
  source: ExCalcul;
  category: Category;
  answered: boolean;
  correct: boolean | null;
}

export interface EngineState {
  slots: Slot[];
  pos: number;
  comps: Record<string, CompLive>;
  sourceByComp: Record<string, ExCalcul>; // 1 source par competence (bascule)
  seed: number;
  counter: number;
}

export interface AnswerEvent {
  levelChange: { competence: string; from: number; to: number } | null;
  reinserted: boolean;
  dropped: boolean;
  switched: string | null; // competence maitrisee vers laquelle on a bascule
}

export function createEngine(plan: PlannedItem[], seed: number): EngineState {
  const comps: Record<string, CompLive> = {};
  const sourceByComp: Record<string, ExCalcul> = {};
  const slots: Slot[] = plan.map((it) => {
    if (!comps[it.exercise.competence]) {
      comps[it.exercise.competence] = {
        niveau: it.exercise.niveau,
        consecCorrect: 0,
        consecWrong: 0,
        window: [],
        dropped: false,
        hintNext: false,
      };
    }
    if (!sourceByComp[it.exercise.competence]) sourceByComp[it.exercise.competence] = it.source;
    return {
      exercise: it.exercise,
      source: it.source,
      category: it.category,
      answered: false,
      correct: null,
    };
  });
  return { slots, pos: skipDropped(slots, comps, 0), comps, sourceByComp, seed, counter: plan.length };
}

// Choisit une competence MAITRISEE (moral eleve) vers laquelle basculer pour
// redonner confiance : meilleur ratio de reussite dans la fenetre, non
// abandonnee, differente de `exclude`. A egalite, niveau le plus eleve.
function pickConfidenceComp(
  comps: Record<string, CompLive>,
  exclude: string
): string | null {
  let best: string | null = null;
  let bestScore = -1;
  let bestNiveau = -1;
  for (const code of Object.keys(comps)) {
    if (code === exclude) continue;
    const c = comps[code];
    if (c.dropped) continue;
    const len = c.window.length;
    const ratio = len > 0 ? c.window.filter((w) => w).length / len : 0.5;
    if (ratio > bestScore || (ratio === bestScore && c.niveau > bestNiveau)) {
      best = code;
      bestScore = ratio;
      bestNiveau = c.niveau;
    }
  }
  return best;
}

function skipDropped(
  slots: Slot[],
  comps: Record<string, CompLive>,
  from: number
): number {
  let i = from;
  while (i < slots.length) {
    const s = slots[i];
    if (!s.answered && !comps[s.exercise.competence]?.dropped) return i;
    i++;
  }
  return slots.length; // fin
}

export function currentSlot(state: EngineState): Slot | null {
  return state.pos < state.slots.length ? state.slots[state.pos] : null;
}

export function isFinished(state: EngineState): boolean {
  return currentSlot(state) === null;
}

// Nombre de reponses attendues restantes (barre de progression).
export function progress(state: EngineState): { done: number; total: number } {
  const total = state.slots.filter(
    (s) => s.answered || !state.comps[s.exercise.competence]?.dropped
  ).length;
  const done = state.slots.filter((s) => s.answered).length;
  return { done, total };
}

export function hintForCurrent(state: EngineState): boolean {
  const s = currentSlot(state);
  return s ? Boolean(state.comps[s.exercise.competence]?.hintNext) : false;
}

// « Tu es sure de toi ? » : environ 1 fois sur 6, deterministe par position.
export function shouldAskSure(state: EngineState): boolean {
  return makeRng(hashSeed(state.seed, "sure", state.pos))() < 1 / 6;
}

export function answerCurrent(
  state: EngineState,
  correct: boolean,
  opts: { correctionRead?: boolean } = {}
): { state: EngineState; event: AnswerEvent } {
  const s = currentSlot(state);
  const event: AnswerEvent = { levelChange: null, reinserted: false, dropped: false, switched: null };
  if (!s) return { state, event };

  const slots = state.slots.slice();
  const comps: Record<string, CompLive> = {};
  for (const k of Object.keys(state.comps)) comps[k] = { ...state.comps[k], window: state.comps[k].window.slice() };

  const code = s.exercise.competence;
  const live = comps[code];

  // Enregistre la reponse au slot courant.
  slots[state.pos] = { ...s, answered: true, correct };

  // Consomme l'indice s'il etait actif.
  live.hintNext = false;

  // Met a jour les compteurs.
  live.window.push(correct);
  if (live.window.length > 5) live.window.shift();
  if (correct) {
    live.consecCorrect += 1;
    live.consecWrong = 0;
  } else {
    live.consecWrong += 1;
    live.consecCorrect = 0;
  }

  const oldNiveau = live.niveau;

  // 3 reussites de suite -> niveau superieur.
  if (live.consecCorrect >= 3 && live.niveau < 4) {
    live.niveau += 1;
    live.consecCorrect = 0;
  }
  // 2 erreurs de suite -> indice + niveau inferieur.
  if (live.consecWrong >= 2) {
    live.hintNext = true;
    if (live.niveau > 1) live.niveau -= 1;
    live.consecWrong = 0;
  }
  if (live.niveau !== oldNiveau) {
    event.levelChange = { competence: code, from: oldNiveau, to: live.niveau };
    regenerateFuture(slots, code, live.niveau, state);
  }

  // 3 erreurs sur les 5 dernieres -> on n'insiste plus sur cette competence.
  const wrongs = live.window.filter((w) => !w).length;
  if (live.window.length >= 3 && wrongs >= 3) {
    live.dropped = true;
    event.dropped = true;
  }

  let counter = state.counter;

  // Reinsertion d'un exercice similaire apres une erreur comprise.
  if (!correct && opts.correctionRead && !live.dropped) {
    const rng = makeRng(hashSeed(state.seed, "reinsert", state.pos));
    const offset = 2 + Math.floor(rng() * 3); // 2..4
    const insertAt = Math.min(state.pos + offset, slots.length);
    const eff: ExCalcul = { ...s.source, niveau: live.niveau };
    const newSeed = hashSeed(state.seed, code, live.niveau, "rattrapage", counter);
    slots.splice(insertAt, 0, {
      exercise: generateExercise(eff, newSeed, { rattrapage: true }),
      source: eff,
      category: s.category,
      answered: false,
      correct: null,
    });
    counter += 1;
    event.reinserted = true;
  }

  // Bascule confiance : quand on abandonne une notion (3/5), on enchaine sur une
  // competence MAITRISEE pour redonner confiance (au lieu de simplement retirer).
  if (event.dropped) {
    const conf = pickConfidenceComp(comps, code);
    const confSource = conf ? state.sourceByComp[conf] : null;
    if (conf && confSource) {
      const eff: ExCalcul = { ...confSource, niveau: comps[conf].niveau };
      const newSeed = hashSeed(state.seed, conf, comps[conf].niveau, "confiance", counter);
      slots.splice(state.pos + 1, 0, {
        exercise: generateExercise(eff, newSeed),
        source: eff,
        category: "revision",
        answered: false,
        correct: null,
      });
      counter += 1;
      event.switched = conf;
    }
  }

  const next = {
    slots,
    pos: 0,
    comps,
    sourceByComp: state.sourceByComp,
    seed: state.seed,
    counter,
  };
  next.pos = skipDropped(slots, comps, state.pos + 1);
  return { state: next, event };
}

// Regenere les items FUTURS non repondus d'une competence au nouveau niveau.
function regenerateFuture(
  slots: Slot[],
  competence: string,
  niveau: number,
  state: EngineState
): void {
  for (let i = state.pos + 1; i < slots.length; i++) {
    const sl = slots[i];
    if (sl.answered || sl.exercise.competence !== competence) continue;
    const eff: ExCalcul = { ...sl.source, niveau };
    const seed = hashSeed(state.seed, competence, niveau, "regen", i);
    slots[i] = {
      ...sl,
      source: eff,
      exercise: generateExercise(eff, seed, { rattrapage: sl.exercise.rattrapage }),
    };
  }
}

// Bilan pour l'ecran de fin.
export function summary(state: EngineState): {
  answered: number;
  correct: number;
  wrong: number;
} {
  const answered = state.slots.filter((s) => s.answered);
  const correct = answered.filter((s) => s.correct).length;
  return { answered: answered.length, correct, wrong: answered.length - correct };
}
