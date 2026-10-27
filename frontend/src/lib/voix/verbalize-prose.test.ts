// Regression du bug voix du 27/10 : un enonce EMC (« ... Que fais-tu ? ») faisait
// lire « moins » tout seul. Cause : le « - » du trait d'union de « fais-tu » etait
// pris pour une soustraction par enonceEnCles. Correctif : un glyphe n'est un
// operateur que s'il touche un chiffre (a gauche ou a droite).
import { describe, it, expect } from "vitest";
import { enonceEnCles } from "./verbalize";

describe("enonceEnCles : prose vs calcul (bug « moins » EMC)", () => {
  it("un trait d'union DANS un mot n'est jamais lu comme un operateur", () => {
    for (const p of [
      "Que fais-tu ?",
      "Un nouvel élève ne parle pas encore bien français. Que fais-tu ?",
      "Dis-moi ce que tu ressens.",
      "C'est-à-dire ?",
      "Range les mots : grand-mère, après-midi, arc-en-ciel.",
    ]) {
      const cles = enonceEnCles(p);
      expect(cles.includes("op:moins"), `${p} -> ${cles.join(" ")}`).toBe(false);
    }
  });

  it("une phrase en prose sans chiffre ne produit aucune cle (bouton grise)", () => {
    expect(enonceEnCles("Que fais-tu ?")).toEqual([]);
    expect(enonceEnCles("Un nouvel élève ne parle pas encore bien français. Que fais-tu ?")).toEqual([]);
  });

  it("les vrais enonces de calcul restent lus en entier", () => {
    expect(enonceEnCles("52 − 17")).toEqual(["num:52", "op:moins", "num:17"]);
    expect(enonceEnCles("52 - 17")).toEqual(["num:52", "op:moins", "num:17"]);
    // terme manquant : « + » colle a un chiffre a gauche, « = » a droite d'un chiffre.
    expect(enonceEnCles("3 + … = 7")).toEqual(["num:3", "op:plus", "op:egale", "num:7"]);
    // amorce verbale + soustraction.
    expect(enonceEnCles("Combien font 100 − 45 ?")).toEqual([
      "amorce:combien-font", "num:100", "op:moins", "num:45",
    ]);
  });

  it("un operateur en bord de phrase prose (sans chiffre voisin) est ignore", () => {
    // « = » decoratif / tiret isole : pas de chiffre adjacent -> ignore.
    expect(enonceEnCles("Vrai ou faux - explique.")).toEqual([]);
  });
});
