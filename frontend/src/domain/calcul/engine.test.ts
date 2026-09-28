import { describe, it, expect } from "vitest";
import {
  createEngine,
  currentSlot,
  answerCurrent,
  hintForCurrent,
  progress,
  summary,
  isFinished,
  type EngineState,
} from "./engine";
import { generateExercise } from "./generator";
import { SEED_SOURCES } from "./seedSources";
import type { PlannedItem } from "./composer";

function makePlan(competence: string, niveau: number, n: number): PlannedItem[] {
  const source = { ...SEED_SOURCES.find((s) => s.competence === competence)!, niveau };
  return Array.from({ length: n }, (_, i) => ({
    source,
    category: "lacune" as const,
    exercise: generateExercise(source, 1000 + i),
  }));
}

// Repond `correct` au slot courant et renvoie le nouvel etat.
function step(state: EngineState, correct: boolean, correctionRead = false) {
  return answerCurrent(state, correct, { correctionRead });
}

describe("engine : adaptation", () => {
  it("3 reussites de suite -> niveau superieur pour les items suivants", () => {
    let st = createEngine(makePlan("MA.TABLES.2", 2, 6), 1);
    const comp = "MA.TABLES.2";
    let lastEvent = null as ReturnType<typeof answerCurrent>["event"] | null;
    for (let i = 0; i < 3; i++) {
      const r = step(st, true);
      st = r.state;
      lastEvent = r.event;
    }
    expect(st.comps[comp].niveau).toBe(3);
    expect(lastEvent?.levelChange).toEqual({ competence: comp, from: 2, to: 3 });
    const next = currentSlot(st);
    expect(next?.exercise.niveau).toBe(3);
  });

  it("2 erreurs de suite -> indice au suivant + niveau inferieur", () => {
    let st = createEngine(makePlan("MA.TABLES.2", 3, 6), 2);
    const comp = "MA.TABLES.2";
    let r = step(st, false);
    st = r.state;
    r = step(st, false);
    st = r.state;
    expect(st.comps[comp].niveau).toBe(2);
    expect(r.event.levelChange).toEqual({ competence: comp, from: 3, to: 2 });
    expect(hintForCurrent(st)).toBe(true);
    expect(currentSlot(st)?.exercise.niveau).toBe(2);
  });

  it("3 erreurs sur 5 -> on n'insiste plus (items restants retires)", () => {
    let st = createEngine(makePlan("MA.CM.ADDITION", 2, 8), 3);
    const totalStart = progress(st).total;
    // w, c, w, c, w -> pas 2 erreurs de suite, mais 3/5 -> dropped.
    for (const c of [false, true, false, true]) st = step(st, c).state;
    const r = step(st, false);
    st = r.state;
    expect(r.event.dropped).toBe(true);
    expect(st.comps["MA.CM.ADDITION"].dropped).toBe(true);
    expect(isFinished(st)).toBe(true);
    expect(progress(st).total).toBeLessThan(totalStart);
  });

  it("erreur + correction lue -> exercice similaire reinsere 2 a 4 plus loin", () => {
    let st = createEngine(makePlan("MA.CM.DOUBLES", 2, 6), 4);
    const before = st.slots.length;
    const r = step(st, false, true);
    st = r.state;
    expect(r.event.reinserted).toBe(true);
    expect(st.slots.length).toBe(before + 1);
    const rattrapage = st.slots.find((s) => s.exercise.rattrapage);
    expect(rattrapage).toBeTruthy();
    expect(rattrapage?.exercise.competence).toBe("MA.CM.DOUBLES");
  });

  it("erreur SANS correction lue -> pas de reinsertion", () => {
    let st = createEngine(makePlan("MA.CM.DOUBLES", 2, 6), 5);
    const before = st.slots.length;
    st = step(st, false, false).state;
    expect(st.slots.length).toBe(before);
  });
});

describe("engine : deroulement", () => {
  it("bilan compte justes et faux", () => {
    let st = createEngine(makePlan("MA.TABLES.5", 2, 4), 6);
    for (const c of [true, false, true, true]) st = step(st, c).state;
    const s = summary(st);
    expect(s.answered).toBe(4);
    expect(s.correct).toBe(3);
    expect(s.wrong).toBe(1);
    expect(isFinished(st)).toBe(true);
  });

  it("progression : done augmente, total stable si rien n'est retire", () => {
    let st = createEngine(makePlan("MA.TABLES.5", 2, 4), 7);
    expect(progress(st)).toEqual({ done: 0, total: 4 });
    st = step(st, true).state;
    expect(progress(st).done).toBe(1);
  });
});
