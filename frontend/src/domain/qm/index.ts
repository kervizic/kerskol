// « Questionner le monde » : agregateur de banques + generateur. Le composant
// <QuestionnerLeMonde> rend l'item ; le serveur (verif_qm, op 'qm') est SEUL
// JUGE via la cle. Chaque sous-matiere ajoute sa banque ici (lots successifs).

import { pick, type Rng } from "../calcul/rng";
import type { Base, GeneratedExercise, ExCalcul } from "../calcul/generator";
import { type QmItem, comparerQm } from "./types";
import { BANQUE_VIVANT, COMPETENCES_VIVANT } from "./vivant";
import { BANQUE_MATIERE, COMPETENCES_MATIERE } from "./matiere";
import { BANQUE_OBJETS, COMPETENCES_OBJETS } from "./objets";
import { BANQUE_ESPACE, COMPETENCES_ESPACE } from "./espace";
import { BANQUE_TEMPS, COMPETENCES_TEMPS } from "./temps";

export * from "./types";

// Banque complete (toutes sous-matieres QM actives dans le build courant).
export const BANQUE_QM: QmItem[] = [
  ...BANQUE_VIVANT,
  ...BANQUE_MATIERE,
  ...BANQUE_OBJETS,
  ...BANQUE_ESPACE,
  ...BANQUE_TEMPS,
];

// Competences QM, dans l'ordre d'affichage du referentiel.
export const COMPETENCES_QM = [
  ...COMPETENCES_VIVANT,
  ...COMPETENCES_MATIERE,
  ...COMPETENCES_OBJETS,
  ...COMPETENCES_ESPACE,
  ...COMPETENCES_TEMPS,
] as const;

// Items jouables pour une competence et un niveau donnes.
export function itemsQmDe(competence: string, niveau: number): QmItem[] {
  return BANQUE_QM.filter((i) => i.competence === competence && i.niveau === niveau);
}

// Juge local (mode demo + feedback immediat) : miroir exact du serveur.
export function estJusteQm(cle: string, saisie: string): boolean {
  const item = BANQUE_QM.find((i) => i.cle === cle);
  if (!item) return false;
  return comparerQm(item.format, saisie, item.attendu);
}

// Recupere un item par sa cle (utilise par le composant d'exercice).
export function itemQmParCle(cle: string): QmItem | undefined {
  return BANQUE_QM.find((i) => i.cle === cle);
}

// ==========================================================================
// GENERATEUR : choisit un ITEM de la banque pour la competence et le niveau, de
// facon reproductible (graine). Le composant <QuestionnerLeMonde> le rend ; le
// serveur (verif_qm, op 'qm') est seul juge via la cle. Repli robuste si aucun
// item (ne devrait pas arriver : le referentiel ne cree l'exercice que si des
// items existent).
// ==========================================================================
export function buildQm(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const items = itemsQmDe(src.competence, src.niveau);
  const item = items.length > 0 ? pick(rng, items) : null;
  if (!item) {
    return {
      ...base,
      forme: "qm",
      support: "aucun",
      saisie: "qm",
      prompt: "Questionner le monde",
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
