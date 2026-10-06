import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toks, mapperMots, spanPourToken, phrasesDepuisMots } from "./toks";

// Jeu COMMUN avec Python (tools/tts/toks_fixture.json). Vitest tourne avec cwd =
// frontend/ ; la fixture est a la racine du repo.
const fixture: Array<{ t: string; toks: string[] }> = JSON.parse(
  readFileSync(resolve(process.cwd(), "../tools/tts/toks_fixture.json"), "utf-8")
);

describe("toks() TS == toks() Python (fixture commune)", () => {
  for (const cas of fixture) {
    it(`toks(${JSON.stringify(cas.t)})`, () => {
      expect(toks(cas.t)).toEqual(cas.toks);
    });
  }
});

describe("mapperMots : correspondance mot affiche -> tokens", () => {
  it("mots simples : 1 token chacun", () => {
    const spans = mapperMots(["Le", "chat", "dort."]);
    expect(spans.map((s) => s.tokenCount)).toEqual([1, 1, 1]);
    expect(spans.map((s) => s.tokenStart)).toEqual([0, 1, 2]);
  });
  it("elision et trait d'union : 1 span / 2 tokens", () => {
    const spans = mapperMots(["L'école", "vingt-sept"]);
    expect(spans[0]).toEqual({ mot: "L'école", tokenStart: 0, tokenCount: 2 });
    expect(spans[1]).toEqual({ mot: "vingt-sept", tokenStart: 2, tokenCount: 2 });
  });
  it("spanPourToken retrouve le mot affiche du token courant", () => {
    const spans = mapperMots(["L'école", "est", "finie."]);
    // tokens : [l, école, est, finie] -> span 0 couvre 0-1, span 1 => 2, span 2 => 3
    expect(spanPourToken(spans, 0)).toBe(0);
    expect(spanPourToken(spans, 1)).toBe(0);
    expect(spanPourToken(spans, 2)).toBe(1);
    expect(spanPourToken(spans, 3)).toBe(2);
    expect(spanPourToken(spans, 9)).toBe(-1);
  });
});

describe("phrasesDepuisMots : decoupage en phrases (surlignage phrase par phrase)", () => {
  it("deux phrases", () => {
    const mots = ["Le", "chat", "dort.", "Il", "ronfle."];
    expect(phrasesDepuisMots(mots)).toEqual([[0, 1, 2], [3, 4]]);
  });
  it("trois phrases (dictee 104)", () => {
    const mots = "Dans la forêt. Elles sont jaunes. Les oiseaux partent.".split(" ");
    expect(phrasesDepuisMots(mots).length).toBe(3);
  });
  it("sans ponctuation finale : une phrase", () => {
    expect(phrasesDepuisMots(["un", "deux", "trois"])).toEqual([[0, 1, 2]]);
  });
});
