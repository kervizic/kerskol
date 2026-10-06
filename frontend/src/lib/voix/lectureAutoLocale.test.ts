import { describe, it, expect } from "vitest";
import { effectiveLectureAuto } from "./lectureAutoLocale";

describe("effectiveLectureAuto : la bascule enfant prime sur le reglage parent", () => {
  it("aucune surcharge -> defaut parent (actif)", () => {
    expect(effectiveLectureAuto(null, true)).toBe(true);
  });
  it("aucune surcharge -> defaut parent (coupe)", () => {
    expect(effectiveLectureAuto(null, false)).toBe(false);
  });
  it("surcharge enfant ON prime sur defaut parent OFF", () => {
    expect(effectiveLectureAuto(true, false)).toBe(true);
  });
  it("surcharge enfant OFF prime sur defaut parent ON", () => {
    expect(effectiveLectureAuto(false, true)).toBe(false);
  });
});
