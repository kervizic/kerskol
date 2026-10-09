// « Histoire et technologie » (ST, cycle 3, reperes CM1). NOUVELLE MATIERE a
// cote de Maths, Francais, Questionner le monde et EMC. Six sous-matieres
// (un `domaine` chacune) : etats_matiere, classification, corps_humain,
// energie, objets_techniques, ciel_terre.
//
// REUTILISATION : ST partage l'INFRASTRUCTURE « situation » de Questionner le
// monde (meme type QmItem, memes formats qcm/tri/ordre/texte, meme composant
// <QuestionnerLeMonde>, meme op serveur 'qm' + table public.qm_item + verif_qm).
// Seuls le CATALOGUE d'exercices (type 'histoire') et le contenu changent. Le
// SERVEUR reste SEUL JUGE via la cle ; un test croise garantit front == SQL
// (histoire.test.ts + histoire_test.sql).

import { pick, type Rng } from "../calcul/rng";
import type { Base, GeneratedExercise, ExCalcul } from "../calcul/generator";
import { type QmItem, comparerQm } from "../qm/types";
import { BANQUE_HISTOIRE, COMPETENCES_HISTOIRE } from "./bank";

export { BANQUE_HISTOIRE, COMPETENCES_HISTOIRE };

// Items jouables pour une competence et un niveau donnes.
export function itemsHistoireDe(competence: string, niveau: number): QmItem[] {
  return BANQUE_HISTOIRE.filter((i) => i.competence === competence && i.niveau === niveau);
}

// Juge local (mode demo + feedback immediat) : miroir exact du serveur.
export function estJusteHistoire(cle: string, saisie: string): boolean {
  const item = BANQUE_HISTOIRE.find((i) => i.cle === cle);
  if (!item) return false;
  return comparerQm(item.format, saisie, item.attendu);
}

// Recupere un item par sa cle.
export function itemHistoireParCle(cle: string): QmItem | undefined {
  return BANQUE_HISTOIRE.find((i) => i.cle === cle);
}

// ==========================================================================
// GENERATEUR : choisit un ITEM de la banque pour la competence et le niveau, de
// facon reproductible (graine). Le composant <QuestionnerLeMonde> le rend
// (forme / saisie 'qm') ; le serveur (verif_qm, op 'qm') est seul juge via la
// cle. Repli robuste si aucun item.
// ==========================================================================
export function buildHistoire(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const items = itemsHistoireDe(src.competence, src.niveau);
  const item = items.length > 0 ? pick(rng, items) : null;
  if (!item) {
    return {
      ...base,
      forme: "qm",
      support: "aucun",
      saisie: "qm",
      prompt: "Histoire et technologie",
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
