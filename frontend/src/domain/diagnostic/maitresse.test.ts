// Tests du diagnostic DETERMINISTE d'un mot (mots de la maitresse). Le serveur
// reste seul juge du juste/faux ; ici on verifie la classification de la faute
// (accent, lettre muette, doublement, homophone, son) et la bienveillance.

import { describe, it, expect } from "vitest";
import { diagnostiquerMot, messageBilanDictee } from "./maitresse";

describe("diagnostiquerMot : classification de la faute", () => {
  const cas: Array<[string, string, string]> = [
    ["est", "et", "homophone"],
    ["sont", "son", "homophone"],
    ["élève", "eleve", "accent"],
    ["poisson", "poison", "doublement"],
    ["toujours", "toujour", "lettre_muette"],
    ["bateau", "bato", "son"],
    ["gâteau", "gato", "son"],
    ["maison", "maisson", "doublement"], // s/ss est d'abord un doublement
    ["jardin", "jradin", "lettre"],
  ];
  for (const [correct, saisie, type] of cas) {
    it(`${correct} / ${saisie} -> ${type}`, () => {
      expect(diagnostiquerMot(correct, saisie).type).toBe(type);
    });
  }

  it("le message cite toujours la bonne graphie et reste bienveillant", () => {
    const d = diagnostiquerMot("poisson", "poison");
    expect(d.message).toContain("poisson");
    expect(d.message).not.toMatch(/faux|erreur de ta part|nul/i);
  });

  it("est deterministe", () => {
    expect(diagnostiquerMot("maison", "mezon")).toEqual(diagnostiquerMot("maison", "mezon"));
  });
});

describe("messageBilanDictee : toujours valorisant", () => {
  it("felicite un sans-faute", () => {
    expect(messageBilanDictee(10, 10)).toContain("Bravo");
  });
  it("encourage meme a zero", () => {
    expect(messageBilanDictee(0, 10)).toMatch(/essay|arriver/i);
  });
  it("compte les reussites", () => {
    expect(messageBilanDictee(7, 10)).toContain("7");
  });
});
