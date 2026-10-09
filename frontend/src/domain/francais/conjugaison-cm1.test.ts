// Tests de la conjugaison CM1 : PASSE SIMPLE (3e personnes) et IMPERATIF
// present. Couvre le moteur (formes exactes + golden), la generation aux 4
// niveaux (personnes restreintes, QCM N1-N3 / libre N4, une seule bonne
// proposition, payload serveur), et le diagnostic (focus TERMINAISON).

import { describe, it, expect } from "vitest";
import { generateExercise } from "../calcul/generator";
import type { ExCalcul } from "../calcul/generator";
import {
  formeCm1, cm1Golden, PS_CODE, IMP_CODE, VERBES_PS, VERBES_IMP,
} from "./conjugaison-cm1";
import { diagnostiquerConjugaison, estJusteConjugaison } from "../diagnostic";
import type { Personne } from "./conjugaison";

function src(competence: string, niveau: number): ExCalcul {
  return {
    exerciceId: "ex",
    competence,
    niveau,
    methode: null,
    operation: "conj",
    forme: "conjugaison",
    params: {},
    support: "aucun",
    correctionStrategie: null,
  };
}
const SEEDS = Array.from({ length: 40 }, (_, i) => (i + 1) * 2654435761);

describe("conjugaison CM1 — moteur passe simple / imperatif", () => {
  it("formes de reference exactes (spot check, accents significatifs)", () => {
    // Passe simple.
    expect(formeCm1("chanter", "passe_simple", 3)).toBe("chanta");
    expect(formeCm1("chanter", "passe_simple", 6)).toBe("chantèrent");
    expect(formeCm1("manger", "passe_simple", 3)).toBe("mangea");
    expect(formeCm1("placer", "passe_simple", 3)).toBe("plaça");
    expect(formeCm1("etre", "passe_simple", 3)).toBe("fut");
    expect(formeCm1("etre", "passe_simple", 6)).toBe("furent");
    expect(formeCm1("avoir", "passe_simple", 3)).toBe("eut");
    expect(formeCm1("faire", "passe_simple", 3)).toBe("fit");
    expect(formeCm1("venir", "passe_simple", 6)).toBe("vinrent");
    expect(formeCm1("prendre", "passe_simple", 3)).toBe("prit");
    expect(formeCm1("voir", "passe_simple", 6)).toBe("virent");
    // Imperatif.
    expect(formeCm1("chanter", "imperatif", 2)).toBe("chante"); // PAS de s
    expect(formeCm1("chanter", "imperatif", 4)).toBe("chantons");
    expect(formeCm1("chanter", "imperatif", 5)).toBe("chantez");
    expect(formeCm1("manger", "imperatif", 4)).toBe("mangeons");
    expect(formeCm1("placer", "imperatif", 4)).toBe("plaçons");
    expect(formeCm1("etre", "imperatif", 2)).toBe("sois");
    expect(formeCm1("avoir", "imperatif", 2)).toBe("aie");
    expect(formeCm1("aller", "imperatif", 2)).toBe("va");
    expect(formeCm1("faire", "imperatif", 5)).toBe("faites");
    expect(formeCm1("dire", "imperatif", 5)).toBe("dites");
    expect(formeCm1("finir", "imperatif", 4)).toBe("finissons");
  });

  it("golden : 88 lignes (34 passe simple + 54 imperatif), formes non vides", () => {
    const g = cm1Golden();
    expect(g.length).toBe(88);
    expect(g.filter((r) => r.temps === PS_CODE).length).toBe(34);
    expect(g.filter((r) => r.temps === IMP_CODE).length).toBe(54);
    for (const r of g) {
      expect(r.forme.trim().length).toBeGreaterThan(0);
    }
    // Aucun doublon (verbe, temps, personne).
    const cles = new Set(g.map((r) => `${r.verbe}:${r.temps}:${r.personne}`));
    expect(cles.size).toBe(88);
  });

  it("couverture des verbes attendus", () => {
    for (const v of ["chanter", "etre", "avoir", "aller", "faire", "dire", "venir", "prendre", "voir", "manger", "placer"]) {
      expect(VERBES_PS).toContain(v);
    }
    expect(VERBES_IMP).toContain("finir");
  });
});

describe("conjugaison CM1 — generation", () => {
  it("personnes restreintes : passe simple {3,6}, imperatif {2,4,5}", () => {
    for (const seed of SEEDS) {
      for (const n of [1, 2, 3, 4]) {
        const ps = generateExercise(src("FR.CONJ.PASSE_SIMPLE", n), seed);
        expect([3, 6]).toContain(ps.conj!.personne);
        expect(ps.conj!.temps).toBe("passe_simple");
        const imp = generateExercise(src("FR.CONJ.IMPERATIF", n), seed);
        expect([2, 4, 5]).toContain(imp.conj!.personne);
        expect(imp.conj!.temps).toBe("imperatif");
      }
      // N1 : passe simple seulement il (3), imperatif seulement tu (2).
      expect(generateExercise(src("FR.CONJ.PASSE_SIMPLE", 1), seed).conj!.personne).toBe(3);
      expect(generateExercise(src("FR.CONJ.IMPERATIF", 1), seed).conj!.personne).toBe(2);
    }
  });

  it("QCM aux N1-N3 (une seule bonne proposition), saisie LIBRE au N4", () => {
    for (const comp of ["FR.CONJ.PASSE_SIMPLE", "FR.CONJ.IMPERATIF"]) {
      for (const seed of SEEDS) {
        for (const n of [1, 2, 3]) {
          const ex = generateExercise(src(comp, n), seed);
          expect(ex.saisie).toBe("qcm_texte");
          expect(ex.optionsTexte!.length).toBeGreaterThanOrEqual(2);
          const justes = ex.optionsTexte!.filter((o) =>
            estJusteConjugaison(ex.conj!.verbe, ex.conj!.temps, ex.conj!.personne as Personne, o)
          );
          expect(justes.length).toBe(1);
        }
        const n4 = generateExercise(src(comp, 4), seed);
        expect(n4.saisie).toBe("lettres");
        expect(n4.optionsTexte).toBeUndefined();
      }
    }
  });

  it("payload serveur : op 'conj', code temps 5/6, verbe + personne", () => {
    const ps = generateExercise(src("FR.CONJ.PASSE_SIMPLE", 2), SEEDS[0]);
    expect(ps.verif.op).toBe("conj");
    expect(ps.verif.a).toBe(PS_CODE);
    expect(ps.verif.cle).toBe(ps.conj!.verbe);
    expect(ps.verif.b).toBe(ps.conj!.personne);
    const imp = generateExercise(src("FR.CONJ.IMPERATIF", 2), SEEDS[0]);
    expect(imp.verif.op).toBe("conj");
    expect(imp.verif.a).toBe(IMP_CODE);
    expect(imp.verif.cle).toBe(imp.conj!.verbe);
  });

  it("imperatif : phrase sans repere temporel, finit par « ! » ; consigne « à l'impératif »", () => {
    for (const seed of SEEDS.slice(0, 15)) {
      const ex = generateExercise(src("FR.CONJ.IMPERATIF", 2), seed);
      expect(ex.conjPhrase!.prefixe).toBe("");
      expect(ex.conjPhrase!.apres).toBe(" !");
      expect(ex.conjPhrase!.complete.trim().endsWith("!")).toBe(true);
      expect(ex.conjPhrase!.consigne).toContain("à l'impératif");
      // Indice de personne « (tu) / (nous) / (vous) ».
      expect(["(tu)", "(nous)", "(vous)"]).toContain(ex.conjPhrase!.sujet);
      // N3+ : pas de reference libre au N3 ? non ; au N2 c'est QCM. Pas de prefixe.
      const n3 = generateExercise(src("FR.CONJ.IMPERATIF", 3), seed);
      expect(n3.conjPhrase!.prefixe).toBe("");
    }
  });

  it("passe simple : repere « Il y a longtemps, » a partir du N3", () => {
    for (const seed of SEEDS.slice(0, 15)) {
      const n3 = generateExercise(src("FR.CONJ.PASSE_SIMPLE", 3), seed);
      expect(n3.conjPhrase!.prefixe).toBe("Il y a longtemps, ");
      const n1 = generateExercise(src("FR.CONJ.PASSE_SIMPLE", 1), seed);
      expect(n1.conjPhrase!.prefixe).toBe("");
      expect(n1.conjPhrase!.repere).toContain("passé simple");
    }
  });
});

describe("conjugaison CM1 — diagnostic (focus terminaison)", () => {
  it("juste exact (accents exiges)", () => {
    expect(diagnostiquerConjugaison("chanter", "passe_simple", 3, "chanta").juste).toBe(true);
    expect(diagnostiquerConjugaison("chanter", "passe_simple", 6, "chantèrent").juste).toBe(true);
    expect(diagnostiquerConjugaison("chanter", "imperatif", 2, "chante").juste).toBe(true);
    // Accent manquant -> faux, diagnostique ACCENT.
    const d = diagnostiquerConjugaison("chanter", "passe_simple", 6, "chanterent");
    expect(d.juste).toBe(false);
    expect(d.fautes[0].type).toBe("ACCENT");
  });

  it("imperatif -er : le s en trop (« chantes ») -> TERMINAISON", () => {
    const d = diagnostiquerConjugaison("chanter", "imperatif", 2, "chantes");
    expect(d.juste).toBe(false);
    expect(d.fautes[0].type).toBe("TERMINAISON");
    expect(d.fautes[0].message).toContain("pas de s");
  });

  it("passe simple vs imparfait (« chantait ») -> MAUVAIS_TEMPS", () => {
    const d = diagnostiquerConjugaison("chanter", "passe_simple", 3, "chantait");
    expect(d.juste).toBe(false);
    expect(d.fautes[0].type).toBe("MAUVAIS_TEMPS");
  });

  it("mauvaise personne (il/ils) au passe simple -> MAUVAISE_PERSONNE", () => {
    // « chantèrent » (ils) attendu pour « il ».
    const d = diagnostiquerConjugaison("chanter", "passe_simple", 3, "chantèrent");
    expect(d.juste).toBe(false);
    expect(d.fautes[0].type).toBe("MAUVAISE_PERSONNE");
  });
});
