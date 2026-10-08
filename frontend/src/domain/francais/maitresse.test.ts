// Tests des helpers PURS de « les mots de la maitresse » (phase 6) et du
// marqueur du generateur. Le serveur reste seul juge (ops mmots/mtrou/mdictee,
// tests SQL maitresse_test.sql) ; ici on couvre la fabrication deterministe des
// formes erronees, le mot a trou, l'epellation et le branchement du generateur.

import { describe, it, expect } from "vitest";
import {
  formesErronees, motATrou, tokeniserTexte, epeler, messageMotCorrect,
  sansAccents, listesAvecMots, listesAvecTexte, dicteeDispo,
  lettresDifficiles, segmenterSyllabes, phraseGabarit,
  type MaitresseListe,
} from "./maitresse";
import { normaliserMot } from "./dictee";
import { makeRng } from "../calcul/rng";
import { generateExercise } from "../calcul/generator";
import type { ExCalcul } from "../calcul/generator";

const MOTS_TYPE = ["maison", "toujours", "jardin", "beaucoup", "poisson", "élève"];

function source(competence: string, niveau: number): ExCalcul {
  return {
    exerciceId: "00000000-0000-0000-0000-000000000000",
    competence, niveau, methode: "mots_maitresse",
    operation: "mmots", forme: "maitresse", params: {}, support: null, correctionStrategie: null,
  };
}

describe("formesErronees : distracteurs d'orthographe deterministes", () => {
  it("produit des formes distinctes du mot correct et entre elles", () => {
    for (const mot of MOTS_TYPE) {
      const out = formesErronees(mot, makeRng(42), 2);
      expect(out.length, `${mot}`).toBeGreaterThanOrEqual(1);
      for (const f of out) {
        expect(normaliserMot(f), `${mot} -> ${f} identique`).not.toBe(normaliserMot(mot));
      }
      expect(new Set(out.map(normaliserMot)).size, `${mot} doublons`).toBe(out.length);
    }
  });

  it("deterministe pour une meme graine", () => {
    const a = formesErronees("poisson", makeRng(7), 2);
    const b = formesErronees("poisson", makeRng(7), 2);
    expect(a).toEqual(b);
  });

  it("couvre les erreurs classiques (accent, lettre muette, double consonne)", () => {
    expect(sansAccents("élève")).toBe("eleve");
    // poisson : la simplification du double s (poison) fait partie des candidats.
    const p = formesErronees("poisson", makeRng(1), 5);
    expect(p).toContain("poison");
  });

  it("genere des pieges d'homophone et de son (N1 plus exigeant)", () => {
    // Homophone grammatical.
    expect(formesErronees("est", makeRng(1), 3)).toContain("et");
    expect(formesErronees("ont", makeRng(1), 3)).toContain("on");
    // Son [o] : o/au/eau.
    const bato = formesErronees("bateau", makeRng(1), 6);
    expect(bato.some((f) => f === "bato")).toBe(true);
    // Son [s] : s entre voyelles -> ss.
    expect(formesErronees("maison", makeRng(1), 6)).toContain("maisson");
  });
});

describe("lettresDifficiles : troue seulement les lettres dures", () => {
  it("cible accents, doubles, lettre muette, sons ambigus", () => {
    expect(lettresDifficiles("élève")).toContain(0); // é
    const pois = lettresDifficiles("poisson");
    expect(pois).toContain(3); // premier s du double
    expect(pois).toContain(4); // second s du double
    // jamais plus de la moitie du mot trouee
    expect(pois.length).toBeLessThanOrEqual(Math.floor("poisson".length / 2));
  });
  it("renvoie toujours au moins une position", () => {
    expect(lettresDifficiles("ami").length).toBeGreaterThanOrEqual(1);
  });
  it("est deterministe", () => {
    expect(lettresDifficiles("jardin")).toEqual(lettresDifficiles("jardin"));
  });
});

describe("segmenterSyllabes : remise dans l'ordre", () => {
  it("coupe un mot en au moins deux morceaux", () => {
    const s = segmenterSyllabes("maison");
    expect(s.join("")).toBe("maison");
    expect(s.length).toBeGreaterThanOrEqual(2);
  });
  it("replie sur les lettres si pas de coupe possible", () => {
    const s = segmenterSyllabes("ski");
    expect(s.join("")).toBe("ski");
  });
});

describe("phraseGabarit : phrase a trou bienveillante (N3/N4)", () => {
  it("place un seul trou et garde le mot correct", () => {
    const g = phraseGabarit("maison", makeRng(2));
    expect(g.tokens.filter((t) => t === null).length).toBe(1);
    expect(g.tokens[g.index - 1]).toBeNull();
    expect(g.correct).toBe("maison");
  });
  it("est deterministe", () => {
    expect(phraseGabarit("jardin", makeRng(9))).toEqual(phraseGabarit("jardin", makeRng(9)));
  });
});

describe("motATrou : cache un mot du texte", () => {
  it("cible en priorite un mot de la liste a apprendre", () => {
    const r = motATrou("Le chat mange une pomme rouge.", ["pomme"], makeRng(3));
    expect(r).not.toBeNull();
    expect(r!.correct).toBe("pomme");
    // le token cible est bien un null dans la phrase
    expect(r!.tokens.filter((t) => t === null).length).toBe(1);
    // l'index 1-base pointe le bon token (meme tokenisation que le serveur)
    expect(normaliserMot(tokeniserTexte("Le chat mange une pomme rouge.")[r!.index - 1])).toBe("pomme");
  });

  it("repli sur un mot de contenu si aucun mot de la liste n'est present", () => {
    const r = motATrou("Le chat dort tranquillement.", ["xyz"], makeRng(5));
    expect(r).not.toBeNull();
    expect(normaliserMot(r!.correct).length).toBeGreaterThanOrEqual(4);
  });

  it("null si le texte est vide", () => {
    expect(motATrou("", ["a"], makeRng(1))).toBeNull();
  });
});

describe("epeler : epellation orale (accents decrits)", () => {
  it("epelle lettre par lettre", () => {
    expect(epeler("maison")).toBe("m, a, i, s, o, n");
  });
  it("decrit les accents au lieu de les opposer", () => {
    expect(epeler("élève")).toBe("e accent aigu, l, e accent grave, v, e");
  });
  it("messageMotCorrect cite et epelle le mot", () => {
    expect(messageMotCorrect("maison")).toContain("maison");
    expect(messageMotCorrect("maison")).toContain("m, a, i, s, o, n");
  });
});

describe("selection des listes", () => {
  const bank: MaitresseListe[] = [
    { id: "1", titre: "A", mots: ["maison", "toujours", "jardin"], texte: null, dictees: null },
    { id: "2", titre: "B", mots: [], texte: "Le chat est beau.", dictees: { "1": { mots: ["Le", "chat", "et", "beau."], nb: 1 }, "2": { mots: [], nb: 0 } } },
  ];
  it("listesAvecMots / listesAvecTexte filtrent correctement", () => {
    expect(listesAvecMots(bank).map((l) => l.id)).toEqual(["1"]);
    expect(listesAvecTexte(bank).map((l) => l.id)).toEqual(["2"]);
  });
  it("dicteeDispo reflete le nombre d'erreurs par niveau", () => {
    expect(dicteeDispo(bank[1], 1)).toBe(true);
    expect(dicteeDispo(bank[1], 2)).toBe(false);
    expect(dicteeDispo(bank[0], 1)).toBe(false);
  });
});

describe("generateur : marqueur maitresse", () => {
  it("FR.MAITRESSE.MOTS -> saisie maitresse, kind mots, op mmots", () => {
    const ex = generateExercise(source("FR.MAITRESSE.MOTS", 1), 123);
    expect(ex.saisie).toBe("maitresse");
    expect(ex.maitresse?.kind).toBe("mots");
    expect(ex.verif.op).toBe("mmots");
  });
  it("FR.MAITRESSE.DICTEE -> kind dictee, op mdictee", () => {
    const ex = generateExercise(source("FR.MAITRESSE.DICTEE", 3), 456);
    expect(ex.saisie).toBe("maitresse");
    expect(ex.maitresse?.kind).toBe("dictee");
    expect(ex.verif.op).toBe("mdictee");
  });
});
