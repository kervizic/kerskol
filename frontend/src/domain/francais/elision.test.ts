// Tests du helper d'elision / contraction (texte GENERE uniquement).
import { describe, it, expect } from "vitest";
import {
  commenceParVoyelle, elide, aLe, deLe, normaliserEspaces,
} from "./elision";

describe("commenceParVoyelle", () => {
  it("vrai devant une voyelle (accentuee ou non)", () => {
    for (const m of ["images", "école", "âne", "imparfait", "huître", "oiseau", "Arthur", "Inès"]) {
      expect(commenceParVoyelle(m), m).toBe(true);
    }
  });
  it("vrai devant un h muet", () => {
    for (const m of ["heure", "histoire", "homme", "hôpital"]) {
      expect(commenceParVoyelle(m), m).toBe(true);
    }
  });
  it("faux devant une consonne ou un h aspire", () => {
    for (const m of ["billes", "chat", "présent", "hibou", "héros", "haricot", "huit", "yaourt"]) {
      expect(commenceParVoyelle(m), m).toBe(false);
    }
  });
  it("faux pour vide ou nombre", () => {
    expect(commenceParVoyelle("")).toBe(false);
    expect(commenceParVoyelle("8")).toBe(false);
  });
  it("ignore un guillemet ouvrant", () => {
    expect(commenceParVoyelle("« images »")).toBe(true);
    expect(commenceParVoyelle("« billes »")).toBe(false);
  });
});

describe("elide", () => {
  it("elide devant voyelle / h muet", () => {
    expect(elide("de", "images")).toBe("d'images");
    expect(elide("de", "histoires")).toBe("d'histoires");
    expect(elide("le", "ours")).toBe("l'ours");
    expect(elide("la", "école")).toBe("l'école");
    expect(elide("que", "il")).toBe("qu'il");
    expect(elide("je", "aime")).toBe("j'aime");
  });
  it("n'elide pas devant consonne / h aspire", () => {
    expect(elide("de", "billes")).toBe("de billes");
    expect(elide("le", "hibou")).toBe("le hibou");
    expect(elide("de", "héros")).toBe("de héros");
  });
});

describe("aLe (contraction a + le)", () => {
  it("au devant consonne, a l' devant voyelle", () => {
    expect(aLe("présent")).toBe("au présent");
    expect(aLe("futur")).toBe("au futur");
    expect(aLe("passé composé")).toBe("au passé composé");
    expect(aLe("passé simple")).toBe("au passé simple");
    expect(aLe("imparfait")).toBe("à l'imparfait");
    expect(aLe("impératif")).toBe("à l'impératif");
    expect(aLe("infinitif")).toBe("à l'infinitif");
  });
  it("aux au pluriel", () => {
    expect(aLe("nombres", "pluriel")).toBe("aux nombres");
  });
});

describe("deLe (contraction de + le)", () => {
  it("du devant consonne, de l' devant voyelle, des au pluriel", () => {
    expect(deLe("jeu")).toBe("du jeu");
    expect(deLe("ours")).toBe("de l'ours");
    expect(deLe("unités", "pluriel")).toBe("des unités");
  });
});

describe("normaliserEspaces", () => {
  it("supprime les espaces doubles et l'espace avant point/virgule", () => {
    expect(normaliserEspaces("un  chat")).toBe("un chat");
    expect(normaliserEspaces("fini .")).toBe("fini.");
    expect(normaliserEspaces("a , b")).toBe("a, b");
  });
  it("garde l'espace avant ! ? ; : (typographie francaise)", () => {
    expect(normaliserEspaces("Chante !")).toBe("Chante !");
    expect(normaliserEspaces("Vraiment ?")).toBe("Vraiment ?");
  });
});
