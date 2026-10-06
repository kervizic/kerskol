import { describe, it, expect } from "vitest";
import { planLectureSansAudio } from "./lecture";

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
