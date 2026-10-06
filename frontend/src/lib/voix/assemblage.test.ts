import { describe, it, expect } from "vitest";
import { positionsDebut, dureeTotale } from "./assemblage";

describe("positionsDebut (B3) : debut(n) = somme des (duree+pause) precedents", () => {
  const items = [
    { durMs: 400, gapApresMs: 110 },
    { durMs: 600, gapApresMs: 110 },
    { durMs: 300, gapApresMs: 0 },
  ];
  it("premier clip a 0", () => {
    expect(positionsDebut(items)[0]).toBe(0);
  });
  it("positions cumulees exactes", () => {
    expect(positionsDebut(items)).toEqual([0, 510, 1220]);
  });
  it("invariant anti-derive : dernier debut + duree + pause == duree totale", () => {
    const pos = positionsDebut(items);
    const last = items[items.length - 1];
    expect(pos[pos.length - 1] + last.durMs + last.gapApresMs).toBe(dureeTotale(items));
  });
  it("sequence vide", () => {
    expect(positionsDebut([])).toEqual([]);
    expect(dureeTotale([])).toBe(0);
  });
});
