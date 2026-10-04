import { describe, it, expect } from "vitest";
import { wrapHour, wrapMinute, startHour, START_MINUTE } from "./horloge";

describe("horloge : tour du cadran des heures (12 h)", () => {
  it("11 + 3 -> 2", () => expect(wrapHour(11 + 3, 12)).toBe(2));
  it("12 + 1 -> 1", () => expect(wrapHour(12 + 1, 12)).toBe(1));
  it("1 - 1 -> 12", () => expect(wrapHour(1 - 1, 12)).toBe(12));
  it("12 - 1 -> 11", () => expect(wrapHour(12 - 1, 12)).toBe(11));
  it("10 + 3 -> 1", () => expect(wrapHour(10 + 3, 12)).toBe(1));
  it("reste dans 1..12", () => {
    for (let v = -20; v <= 40; v++) {
      const r = wrapHour(v, 12);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(12);
    }
  });
});

describe("horloge : tour du cadran des heures (24 h)", () => {
  it("23 + 3 -> 2", () => expect(wrapHour(23 + 3, 24)).toBe(2));
  it("0 - 1 -> 23", () => expect(wrapHour(0 - 1, 24)).toBe(23));
  it("23 + 1 -> 0", () => expect(wrapHour(23 + 1, 24)).toBe(0));
  it("reste dans 0..23", () => {
    for (let v = -30; v <= 60; v++) {
      const r = wrapHour(v, 24);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(23);
    }
  });
});

describe("horloge : tour du cadran des minutes (modulo 60)", () => {
  it("50 + 15 -> 5", () => expect(wrapMinute(50 + 15)).toBe(5));
  it("58 + 5 -> 3", () => expect(wrapMinute(58 + 5)).toBe(3));
  it("0 - 1 -> 59", () => expect(wrapMinute(0 - 1)).toBe(59));
  it("45 + 15 -> 0", () => expect(wrapMinute(45 + 15)).toBe(0));
  it("reste dans 0..59", () => {
    for (let v = -70; v <= 130; v++) {
      const r = wrapMinute(v);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(59);
    }
  });
});

describe("horloge : remise a zero / valeur de depart", () => {
  it("cadran 12 h demarre a 12 h 00", () => {
    expect(startHour(12)).toBe(12);
    expect(START_MINUTE).toBe(0);
  });
  it("format 24 h demarre a 0 h 00", () => {
    expect(startHour(24)).toBe(0);
    expect(START_MINUTE).toBe(0);
  });
});
