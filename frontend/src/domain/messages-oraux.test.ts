// Garde-fou : tous les messages enfant et tous les indices sont rediges POUR
// L'ORAL. Ils ne contiennent AUCUN symbole qui ne se dit pas a voix haute :
// pas de fleche, pas de barre oblique, pas de guillemet decoratif.

import { describe, it, expect } from "vitest";
import { MESSAGES_CONJUGAISON, diagnostiquerConjugaison } from "./diagnostic/conjugaison";
import { MESSAGES_PASSE_COMPOSE, diagnostiquerPasseCompose } from "./diagnostic/passe-compose";
import { MESSAGES_DICTEE } from "./diagnostic/dictee";
import { MESSAGES_CATALOGUE } from "./diagnostic/diagnostic";
import { INDICES, indicePour } from "./indices";

// Caracteres interdits dans un texte lu a voix haute.
const INTERDITS = ["→", "←", "⇒", "/", "«", "»", "…"];

function verifieOral(source: string, textes: string[]) {
  for (const t of textes) {
    for (const c of INTERDITS) {
      expect(t.includes(c), `${source} contient le symbole interdit « ${c} » : ${t}`).toBe(false);
    }
    // Pas d'abreviation du type « ex. » (on dit « par exemple »).
    expect(/\bex\.\s/i.test(t), `${source} contient une abreviation « ex. » : ${t}`).toBe(false);
  }
}

describe("messages enfant rediges pour l'oral", () => {
  it("conjugaison : aucun symbole non parlable", () => {
    verifieOral("MESSAGES_CONJUGAISON", Object.values(MESSAGES_CONJUGAISON));
  });
  it("passe compose : aucun symbole non parlable", () => {
    verifieOral("MESSAGES_PASSE_COMPOSE", Object.values(MESSAGES_PASSE_COMPOSE));
  });
  it("dictee : aucun symbole non parlable", () => {
    verifieOral("MESSAGES_DICTEE", Object.values(MESSAGES_DICTEE));
  });
  it("nombres en lettres : aucun symbole non parlable", () => {
    verifieOral("MESSAGES_CATALOGUE", Object.values(MESSAGES_CATALOGUE));
  });
  it("indices : aucun symbole non parlable", () => {
    verifieOral("INDICES", Object.values(INDICES));
  });
});

// Un message de correction ne doit JAMAIS opposer deux formes qui sonnent pareil
// a l'oral parce qu'elles ne different que par un accent (ex. « êtes avec accent,
// pas êtes sans accent » : l'enfant entend deux fois le meme son). On NE compare
// QUE des formes d'au moins deux lettres : les homophones grammaticaux d'une
// seule lettre (a / à) sont enseignes par le SENS, pas par l'opposition de
// graphies, et restent donc autorises.
function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function paireAccentSeule(texte: string): [string, string] | null {
  const mots = (texte.match(/\p{L}+/gu) ?? [])
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 2);
  for (let i = 0; i < mots.length; i++) {
    for (let j = i + 1; j < mots.length; j++) {
      const a = mots[i];
      const b = mots[j];
      if (a !== b && sansAccents(a) === sansAccents(b)) return [a, b];
    }
  }
  return null;
}

describe("messages de correction : pas d'opposition d'accents ambigue a l'oral", () => {
  const SOURCES: Record<string, Record<string, string>> = {
    MESSAGES_CONJUGAISON,
    MESSAGES_PASSE_COMPOSE,
    MESSAGES_DICTEE,
    MESSAGES_CATALOGUE,
  };
  for (const [nom, cat] of Object.entries(SOURCES)) {
    it(`${nom} : aucun message n'oppose deux formes differant seulement par un accent`, () => {
      for (const [cle, texte] of Object.entries(cat)) {
        const p = paireAccentSeule(texte);
        expect(
          p,
          `${nom}.${cle} oppose « ${p?.[0]} » et « ${p?.[1]} » (meme son a l'oral) : ${texte}`
        ).toBeNull();
      }
    });
  }

  it("le detecteur reconnait bien une opposition ambigue (garde-fou du test)", () => {
    expect(paireAccentSeule("On écrit êtes, pas etes.")).not.toBeNull();
    expect(paireAccentSeule("il a mangé, pas il a mange.")).not.toBeNull();
    // Deux mots qui different par de VRAIES lettres (et / est) ne sont pas vises.
    expect(paireAccentSeule("le mot est avec un s, et le mot et.")).toBeNull();
    // Un homophone d'une seule lettre (a / à) reste autorise.
    expect(paireAccentSeule("le mot a, et le mot à.")).toBeNull();
  });

  it("messages ACCENT generes : decrivent l'accent, sans opposer deux graphies", () => {
    const m1 = diagnostiquerConjugaison("etre", "present", 5, "etes").fautes[0].message;
    expect(m1).toContain("accent chapeau sur le e");
    expect(paireAccentSeule(m1)).toBeNull();
    const m2 = diagnostiquerPasseCompose("manger", 3, "a mange", { genre: null }).fautes[0].message;
    expect(m2).toContain("accent sur le e");
    expect(paireAccentSeule(m2)).toBeNull();
  });
});

describe("indices (bouton Indice)", () => {
  it("existent pour toutes les competences du moteur", () => {
    // Un indice par type d'exercice / competence.
    const COMPETENCES = [
      "FR.CONJ.PRESENT", "FR.CONJ.FUTUR", "FR.CONJ.IMPARFAIT", "FR.CONJ.PASSE_COMPOSE",
      "FR.ORTHO.DETECTIVE",
      "MA.CM.ADDITION", "MA.CM.COMPL_SUP", "MA.CM.DIV_RESTE", "MA.CM.DOUBLES",
      "MA.CM.MOITIES", "MA.CM.SOMMES_DIFF", "MA.FRAC.SIMPLES",
      "MA.MES.DUREES", "MA.MES.HEURE", "MA.MES.LONGUEURS", "MA.MES.MASSES_CONTENANCES",
      "MA.NUM.COMPARER", "MA.NUM.DECOMPOSER", "MA.NUM.LIRE_ECRIRE", "MA.NUM.SUITE",
      "MA.PB.ADD_SUB", "MA.PB.DEUX_ETAPES", "MA.PB.MESURES", "MA.PB.MONNAIE", "MA.PB.MULT_DIV",
      "MA.POSE.ADDITION", "MA.POSE.SOUSTRACTION", "MA.POSE.MULTIPLICATION",
    ];
    for (const c of COMPETENCES) {
      expect(INDICES[c], `indice manquant pour ${c}`).toBeTruthy();
    }
  });

  it("sont proposes aux niveaux 1 et 2 SEULEMENT (plus rien au niveau 3 et 4)", () => {
    expect(indicePour("FR.CONJ.PRESENT", 1)).toBeTruthy();
    expect(indicePour("FR.CONJ.PRESENT", 2)).toBeTruthy();
    expect(indicePour("FR.CONJ.PRESENT", 3)).toBeNull();
    expect(indicePour("FR.CONJ.PRESENT", 4)).toBeNull();
  });

  it("renvoie null pour une competence inconnue", () => {
    expect(indicePour("MA.INCONNU", 1)).toBeNull();
  });
});
