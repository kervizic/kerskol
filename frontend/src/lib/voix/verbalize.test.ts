import { describe, it, expect } from "vitest";
import { nombreEnCles, enonceEnCles } from "./verbalize";

describe("nombreEnCles : decomposition d'un nombre en cles de clips", () => {
  it("0..999 -> une seule cle", () => {
    expect(nombreEnCles(0)).toEqual(["num:0"]);
    expect(nombreEnCles(27)).toEqual(["num:27"]);
    expect(nombreEnCles(999)).toEqual(["num:999"]);
  });
  it("milliers ronds -> une cle millier", () => {
    expect(nombreEnCles(1000)).toEqual(["num:1000"]);
    expect(nombreEnCles(10000)).toEqual(["num:10000"]);
  });
  it("millier + reste -> deux cles", () => {
    expect(nombreEnCles(2534)).toEqual(["num:2000", "num:534"]);
    expect(nombreEnCles(1001)).toEqual(["num:1000", "num:1"]);
  });
  it("hors plage -> vide (pas de clip, pas de voix)", () => {
    expect(nombreEnCles(-1)).toEqual([]);
    expect(nombreEnCles(10001)).toEqual([]);
    expect(nombreEnCles(3.5)).toEqual([]);
  });
});

describe("enonceEnCles : assemblage d'un enonce de calcul", () => {
  // 5 exemples representatifs (voir docs/voix.md : jugement d'oreille)
  it("27 ÷ 3", () => {
    expect(enonceEnCles("27 ÷ 3")).toEqual(["num:27", "op:divise", "num:3"]);
  });
  it("8 × 7", () => {
    expect(enonceEnCles("8 × 7")).toEqual(["num:8", "op:fois", "num:7"]);
  });
  it("245 + 130", () => {
    expect(enonceEnCles("245 + 130")).toEqual(["num:245", "op:plus", "num:130"]);
  });
  it("amorce « Combien font » + soustraction avec − (U+2212)", () => {
    expect(enonceEnCles("Combien font 100 − 45 ?")).toEqual([
      "amorce:combien-font",
      "num:100",
      "op:moins",
      "num:45",
    ]);
  });
  it("grand nombre assemble millier + reste : 2534 = 1200", () => {
    expect(enonceEnCles("1200 = ?")).toEqual(["num:1000", "num:200", "op:egale"]);
  });
  it("jetons inconnus ignores (l'app marche sans voix sur ces jetons)", () => {
    expect(enonceEnCles("La suite : 5 ; 6 ; 7")).toEqual(["num:5", "num:6", "num:7"]);
  });
});
