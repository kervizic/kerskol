import { describe, it, expect } from "vitest";
import { nombreEnCles, enonceEnCles, correctionEnCles, fragmentsDeCorrection, slugFragment } from "./verbalize";

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

describe("correctionEnCles : correction de maths en briques", () => {
  it("calcul pur avec egalite", () => {
    expect(correctionEnCles("8 + 8 = 16.")).toEqual(["num:8", "op:plus", "num:8", "op:egale", "num:16"]);
  });
  it("fragments de phrase + nombres + operateurs, dans l'ordre", () => {
    expect(correctionEnCles("Je pars du plus grand, 7, et j'ajoute 2, ca fait 9.")).toEqual([
      "frag:je-pars-du-plus-grand",
      "num:7",
      "frag:et-j-ajoute",
      "num:2",
      "frag:ca-fait",
      "num:9",
    ]);
  });
  it("fragment interieur entre deux nombres", () => {
    expect(correctionEnCles("8 + 8, c'est un double : 16.")).toEqual([
      "num:8", "op:plus", "num:8", "frag:c-est-un-double", "num:16",
    ]);
  });
  it("decimale -> cle absente (non jouable, repli prose)", () => {
    expect(correctionEnCles("2,5 plus 1,3 font 3,8.")).toContain("num:_decimal");
  });
  it("comparateur < sans brique -> cle absente (non jouable)", () => {
    expect(correctionEnCles("7 < 9")).toEqual(["num:7", "op:_sans_brique", "num:9"]);
  });
  it("nombre hors catalogue -> cle absente", () => {
    expect(correctionEnCles("10001 est grand")).toEqual(["num:10001", "frag:est-grand"]);
  });
  it("GARDE-FOU : un trait d'union de mot n'est JAMAIS un operateur (fais-tu)", () => {
    // La correction ne doit pas injecter d'op:moins a cause du « - » de « fais-tu ».
    const cles = correctionEnCles("Que fais-tu ? Tu avais 12 objets.");
    expect(cles).not.toContain("op:moins");
    expect(cles).toContain("num:12");
  });
  it("fragmentsDeCorrection expose le texte a generer", () => {
    expect(fragmentsDeCorrection("Je pars du plus grand, 7, et j'ajoute 2, ca fait 9.")).toEqual([
      { cle: "frag:je-pars-du-plus-grand", texte: "Je pars du plus grand" },
      { cle: "frag:et-j-ajoute", texte: "et j'ajoute" },
      { cle: "frag:ca-fait", texte: "ca fait" },
    ]);
  });
  it("slugFragment : minuscule, sans accent, non-alphanum -> tiret", () => {
    expect(slugFragment("Résultat :")).toBe("resultat");
    expect(slugFragment("c'est")).toBe("c-est");
  });
});
