// Division posee en potence (MA.POSE.DIVISION, lot 6) : le generateur produit
// quotient (answer) + reste, la saisie "potence", et le payload serveur op 'div'
// (a = dividende, b = diviseur). Le SERVEUR reste seul juge.

import { describe, it, expect } from "vitest";
import { generateExercise } from "./generator";
import type { ExCalcul } from "./generator";

function src(niveau: number, params: Record<string, unknown>): ExCalcul {
  return {
    exerciceId: "ex", competence: "MA.POSE.DIVISION", niveau, methode: null,
    operation: "div", forme: "pose", params, support: "aucun", correctionStrategie: null,
  };
}
const SEEDS = Array.from({ length: 50 }, (_, i) => (i + 1) * 2654435761);

describe("division potence", () => {
  it("quotient + reste coherents, saisie potence, payload op div", () => {
    for (const seed of SEEDS) {
      const ex = generateExercise(src(2, { min: 30, max: 99, bmin: 2, bmax: 9 }), seed);
      expect(ex.saisie).toBe("potence");
      expect(ex.fields).toBe(2);
      expect(ex.potenceData).toBeTruthy();
      const { dividende, diviseur } = ex.potenceData!;
      expect(diviseur).toBeGreaterThanOrEqual(2);
      // answer = quotient entier, reste = dividende % diviseur, reste < diviseur.
      expect(ex.answer).toBe(Math.floor(dividende / diviseur));
      expect(ex.reste).toBe(dividende % diviseur);
      expect(ex.reste!).toBeLessThan(diviseur);
      // Payload serveur : op 'div', a = dividende, b = diviseur.
      expect(ex.verif.op).toBe("div");
      expect(ex.verif.a).toBe(dividende);
      expect(ex.verif.b).toBe(diviseur);
      // Verification croisee : quotient * diviseur + reste = dividende.
      expect(ex.answer * diviseur + ex.reste!).toBe(dividende);
    }
  });

  it("niveaux etages : dividende croissant", () => {
    const n1 = generateExercise(src(1, { min: 20, max: 50, bmin: 2, bmax: 5 }), SEEDS[0]);
    const n4 = generateExercise(src(4, { min: 100, max: 999, bmin: 2, bmax: 9 }), SEEDS[0]);
    expect(n1.potenceData!.dividende).toBeLessThanOrEqual(50);
    expect(n4.potenceData!.dividende).toBeGreaterThanOrEqual(100);
  });
});
