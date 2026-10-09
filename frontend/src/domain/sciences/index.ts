// « Sciences et technologie » (ST, cycle 3 - PROGRAMME 2026, attendus CM1 de
// l'arrete du 5 juin 2026 / BO n° 24 du 11 juin 2026, annexe 2). MATIERE a cote
// de Maths, Francais, Questionner le monde, EMC, Histoire et Geographie. Sept
// sous-matieres (un `domaine` chacune), couvrant les 4 themes du programme :
// etats_matiere, lumiere, classification, ecosystemes, corps_humain, ciel_terre,
// objets_techniques.
//
// REUTILISATION : ST partage l'INFRASTRUCTURE « situation » de Questionner le
// monde (meme type QmItem, memes formats qcm/tri/ordre/texte, meme composant
// <QuestionnerLeMonde>, meme op serveur 'qm' + table public.qm_item + verif_qm).
// Seuls le CATALOGUE d'exercices (type 'sciences') et le contenu changent. Le
// SERVEUR reste SEUL JUGE via la cle ; un test croise garantit front == SQL
// (sciences.test.ts + sciences_test.sql).

import { pick, type Rng } from "../calcul/rng";
import type { Base, GeneratedExercise, ExCalcul } from "../calcul/generator";
import { type QmItem, comparerQm } from "../qm/types";
import { BANQUE_SCIENCES, COMPETENCES_SCIENCES } from "./bank";

export { BANQUE_SCIENCES, COMPETENCES_SCIENCES };

// Items jouables pour une competence et un niveau donnes.
export function itemsSciencesDe(competence: string, niveau: number): QmItem[] {
  return BANQUE_SCIENCES.filter((i) => i.competence === competence && i.niveau === niveau);
}

// Juge local (mode demo + feedback immediat) : miroir exact du serveur.
export function estJusteSciences(cle: string, saisie: string): boolean {
  const item = BANQUE_SCIENCES.find((i) => i.cle === cle);
  if (!item) return false;
  return comparerQm(item.format, saisie, item.attendu);
}

// Recupere un item par sa cle.
export function itemSciencesParCle(cle: string): QmItem | undefined {
  return BANQUE_SCIENCES.find((i) => i.cle === cle);
}

// ==========================================================================
// GENERATEUR : choisit un ITEM de la banque pour la competence et le niveau, de
// facon reproductible (graine). Le composant <QuestionnerLeMonde> le rend
// (forme / saisie 'qm') ; le serveur (verif_qm, op 'qm') est seul juge via la
// cle. Repli robuste si aucun item.
// ==========================================================================
export function buildSciences(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const items = itemsSciencesDe(src.competence, src.niveau);
  const item = items.length > 0 ? pick(rng, items) : null;
  if (!item) {
    return {
      ...base,
      forme: "qm",
      support: "aucun",
      saisie: "qm",
      prompt: "Sciences et technologie",
      answer: 0,
      reste: null,
      fields: 1,
      verif: { op: "qm", a: 0, b: 0, cle: "" },
      correction: "",
    };
  }
  return {
    ...base,
    forme: "qm",
    support: "aucun",
    saisie: "qm",
    prompt: item.consigne,
    answer: 0,
    reste: null,
    fields: 1,
    qm: {
      cle: item.cle,
      format: item.format,
      consigne: item.consigne,
      options: item.options,
      bins: item.bins,
      attendu: item.attendu,
      explication: item.explication,
      figure: item.figure,
    },
    verif: { op: "qm", a: 0, b: 0, cle: item.cle },
    correction: item.explication,
  };
}
