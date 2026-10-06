import { describe, it, expect } from "vitest";
import { planLectureSansAudio, planPausesEntreMots } from "./lecture";

describe("planLectureSansAudio : surlignage a vitesse imposee (exercice lecture)", () => {
  it("120 mots/min = 500 ms par token ; mots simples", () => {
    const plan = planLectureSansAudio(["le", "chat", "dort"], 120);
    expect(plan.map((p) => p.startMs)).toEqual([0, 500, 1000]);
    expect(plan.map((p) => p.durMs)).toEqual([500, 500, 500]);
  });
  it("mot compose (2 tokens) dure 2x", () => {
    const plan = planLectureSansAudio(["vingt-sept", "chat"], 120);
    expect(plan[0].durMs).toBe(1000); // 2 tokens
    expect(plan[1]).toEqual({ mot: 1, startMs: 1000, durMs: 500 });
  });
  it("liste vide", () => {
    expect(planLectureSansAudio([], 100)).toEqual([]);
  });
});

describe("planPausesEntreMots : vitesse par silences, voix naturelle", () => {
  // 3 mots de 200 ms = 600 ms de parole. Cible 60 mots/min = 1 mot/s => 3000 ms.
  const mots = [
    { s: 0, e: 200 },
    { s: 200, e: 400 },
    { s: 400, e: 600 },
  ];
  it("répartit le temps manquant en pauses inter-mots (mots non déformés)", () => {
    const plan = planPausesEntreMots(mots, 60);
    // manquant = 3000 - 600 = 2400 ms, / 3 mots = 800 ms de pause par mot
    expect(plan.map((p) => p.pauseApresMs)).toEqual([800, 800, 800]);
    expect(plan.map((p) => p.playDurMs)).toEqual([200, 200, 200]); // durées naturelles
  });
  it("vitesse rapide (>= naturel) : pas de pause négative", () => {
    const plan = planPausesEntreMots(mots, 600);
    expect(plan.every((p) => p.pauseApresMs >= 0)).toBe(true);
  });
  it("vide", () => {
    expect(planPausesEntreMots([], 90)).toEqual([]);
  });
});
