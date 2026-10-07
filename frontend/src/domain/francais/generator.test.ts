// Tests du NOUVEAU FORMAT « phrase a completer » de la conjugaison :
// titre-consigne, repere (N1), mot repere en debut de phrase (N3/N4),
// propositions N1-N3 vs saisie libre N4, melange des temps au N3, et
// invariants de verification SERVEUR (inchangee).

import { describe, it, expect } from "vitest";
import { generateExercise } from "../calcul/generator";
import type { ExCalcul } from "../calcul/generator";
import {
  CONJ, TEMPS_CODE, forme, infinitifAffiche, type Temps, type Personne,
} from "./conjugaison";
import { formePC, PC_CODE } from "./passe-compose";
import { diagnostiquerConjugaison, diagnostiquerPasseCompose } from "../diagnostic";

const SIMPLE = ["FR.CONJ.PRESENT", "FR.CONJ.FUTUR", "FR.CONJ.IMPARFAIT"] as const;
const TEMPS_DE: Record<string, Temps> = {
  "FR.CONJ.PRESENT": "present",
  "FR.CONJ.FUTUR": "futur",
  "FR.CONJ.IMPARFAIT": "imparfait",
};

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

// Plusieurs graines pour couvrir l'aleatoire (verbe / personne).
const SEEDS = Array.from({ length: 40 }, (_, i) => (i + 1) * 2654435761);

describe("conjugaison — nouveau format phrase a completer", () => {
  it("porte toujours un conjPhrase avec consigne « Conjugue le verbe … »", () => {
    for (const comp of [...SIMPLE, "FR.CONJ.PASSE_COMPOSE"]) {
      for (let n = 1; n <= 4; n++) {
        for (const seed of SEEDS) {
          const ex = generateExercise(src(comp, n), seed);
          expect(ex.conjPhrase, `${comp} N${n}`).toBeTruthy();
          const p = ex.conjPhrase!;
          expect(p.consigne.startsWith("Conjugue le verbe ")).toBe(true);
          // Infinitif EN MAJUSCULES present dans le titre.
          const verbe = ex.conj?.verbe ?? ex.conjPC!.verbe;
          expect(p.consigne).toContain(infinitifAffiche(verbe).toUpperCase());
          // La phrase complete se termine par un point et contient la bonne forme.
          expect(p.complete.endsWith(".")).toBe(true);
          expect(p.complete).toContain(p.bonneForme);
        }
      }
    }
  });

  it("est une VRAIE phrase, jamais réduite à « sujet + verbe » (il y a toujours une suite)", () => {
    for (const comp of [...SIMPLE, "FR.CONJ.PASSE_COMPOSE"]) {
      for (let n = 1; n <= 4; n++) {
        for (const seed of SEEDS) {
          const p = generateExercise(src(comp, n), seed).conjPhrase!;
          // Une suite non vide apres la forme (ex. « à la maison », « une chanson »).
          expect(p.suite.trim().length, `${comp} N${n}`).toBeGreaterThan(0);
          // La phrase ne s'arrete donc PAS juste apres la forme : « Il est. » refuse.
          const sansPoint = p.complete.slice(0, -1);
          expect(sansPoint.endsWith(p.bonneForme), `${comp} N${n}: ${p.complete}`).toBe(false);
          // La forme est suivie de la suite dans la phrase complete.
          expect(p.complete).toContain(`${p.bonneForme} ${p.suite}`);
        }
      }
    }
  });

  it("indique le temps au N1/N2, pas au N3/N4", () => {
    for (const comp of [...SIMPLE, "FR.CONJ.PASSE_COMPOSE"]) {
      for (const seed of SEEDS.slice(0, 10)) {
        expect(generateExercise(src(comp, 1), seed).conjPhrase!.consigne).toContain(" au ");
        expect(generateExercise(src(comp, 2), seed).conjPhrase!.consigne).toContain(" au ");
        expect(generateExercise(src(comp, 3), seed).conjPhrase!.consigne).not.toContain(" au ");
        expect(generateExercise(src(comp, 4), seed).conjPhrase!.consigne).not.toContain(" au ");
      }
    }
  });

  it("affiche un repere en mots d'enfant UNIQUEMENT au N1", () => {
    for (const comp of [...SIMPLE, "FR.CONJ.PASSE_COMPOSE"]) {
      expect(generateExercise(src(comp, 1), SEEDS[0]).conjPhrase!.repere).toBeTruthy();
      for (const n of [2, 3, 4]) {
        expect(generateExercise(src(comp, n), SEEDS[0]).conjPhrase!.repere).toBeNull();
      }
    }
  });

  it("la phrase contient TOUJOURS un mot repère au N3/N4, jamais au N1/N2", () => {
    const REPERES = ["En ce moment, ", "Demain, ", "Autrefois, ", "Hier, "];
    for (const comp of [...SIMPLE, "FR.CONJ.PASSE_COMPOSE"]) {
      for (const seed of SEEDS) {
        for (const n of [3, 4]) {
          const p = generateExercise(src(comp, n), seed).conjPhrase!;
          expect(REPERES).toContain(p.prefixe);
          expect(p.complete.startsWith(p.prefixe)).toBe(true);
        }
        for (const n of [1, 2]) {
          expect(generateExercise(src(comp, n), seed).conjPhrase!.prefixe).toBe("");
        }
      }
    }
  });

  it("propositions aux N1-N3, saisie LIBRE au N4", () => {
    for (const comp of [...SIMPLE, "FR.CONJ.PASSE_COMPOSE"]) {
      for (const seed of SEEDS.slice(0, 10)) {
        for (const n of [1, 2, 3]) {
          const ex = generateExercise(src(comp, n), seed);
          expect(ex.saisie).toBe("qcm_texte");
          expect(ex.optionsTexte && ex.optionsTexte.length).toBeGreaterThanOrEqual(2);
        }
        const n4 = generateExercise(src(comp, 4), seed);
        expect(n4.saisie).toBe("lettres");
        expect(n4.optionsTexte).toBeUndefined();
      }
    }
  });

  it("N3 : les propositions MELANGENT les temps (même verbe / même personne) et une seule est juste", () => {
    for (const comp of SIMPLE) {
      const temps = TEMPS_DE[comp];
      for (const seed of SEEDS) {
        const ex = generateExercise(src(comp, 3), seed);
        const { verbe, personne } = ex.conj!;
        const quatre = new Set([
          CONJ[verbe].present[personne - 1],
          CONJ[verbe].futur[personne - 1],
          CONJ[verbe].imparfait[personne - 1],
          formePC(verbe, personne as Personne, "m"),
        ]);
        // Toutes les options appartiennent aux 4 temps du couple (verbe, personne).
        for (const opt of ex.optionsTexte!) expect(quatre.has(opt)).toBe(true);
        // La bonne forme (temps de l'exercice) est proposee.
        expect(ex.optionsTexte).toContain(forme(verbe, temps, personne as Personne));
        // Exactement UNE option est jugee juste par le diagnostic client.
        const justes = ex.optionsTexte!.filter(
          (o) => diagnostiquerConjugaison(verbe, temps, personne as Personne, o).juste
        );
        expect(justes.length).toBe(1);
      }
    }
  });

  it("N3 passé composé : options mixtes, une seule juste", () => {
    for (const seed of SEEDS) {
      const ex = generateExercise(src("FR.CONJ.PASSE_COMPOSE", 3), seed);
      const { verbe, personne, genre } = ex.conjPC!;
      const justes = ex.optionsTexte!.filter(
        (o) => diagnostiquerPasseCompose(verbe, personne, o, { genre }).juste
      );
      expect(justes.length).toBe(1);
    }
  });

  it("verification SERVEUR inchangee (op 'conj', codes de temps)", () => {
    for (const comp of SIMPLE) {
      const ex = generateExercise(src(comp, 2), SEEDS[0]);
      expect(ex.verif.op).toBe("conj");
      expect(ex.verif.a).toBe(TEMPS_CODE[TEMPS_DE[comp]]);
      expect(ex.verif.cle).toBe(ex.conj!.verbe);
      expect(ex.verif.b).toBe(ex.conj!.personne);
    }
    const pc = generateExercise(src("FR.CONJ.PASSE_COMPOSE", 2), SEEDS[0]);
    expect(pc.verif.op).toBe("conj");
    expect(pc.verif.a).toBe(PC_CODE);
    expect(pc.verif.cle).toBe(pc.conjPC!.verbe);
  });
});
