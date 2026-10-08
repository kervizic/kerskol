// « Vivre ensemble » (EMC, enseignement moral et civique, cycle 2, attendus de
// fin de CE2). NOUVELLE MATIERE a cote de Maths, Francais et Questionner le
// monde, avec des SOUS-MATIERES reglables :
//   respect     Respecter les autres et les regles  (EMC.RESPECT.*)
//   emotions    Mes emotions                        (EMC.EMOTIONS.*)
//   republique  Droits et devoirs, la Republique    (EMC.REPUBLIQUE.*)
//   ecrans      Bien utiliser les ecrans            (EMC.ECRANS.*)
//
// REUTILISATION : EMC partage l'INFRASTRUCTURE « situation » de Questionner le
// monde (meme type QmItem, memes formats qcm/tri/ordre/texte, meme composant
// <QuestionnerLeMonde>, meme op serveur 'qm' + table public.qm_item + verif_qm).
// Seuls le CATALOGUE d'exercices (type 'emc') et le contenu changent. Le SERVEUR
// reste SEUL JUGE via la cle ; un test croise garantit front == SQL
// (emc.test.ts + emc_test.sql).
//
// FORMAT pedagogique : petites SITUATIONS concretes du quotidien d'un enfant,
// avec choix de la bonne conduite et justification (« explication »). Ton
// bienveillant, jamais moralisateur ni culpabilisant. Pour le harcelement : on
// rappelle toujours qu'on en parle a un adulte de confiance. Contenus neutres
// politiquement (seulement les institutions et valeurs officielles).

import { pick, type Rng } from "../calcul/rng";
import type { Base, GeneratedExercise, ExCalcul } from "../calcul/generator";
import { type QmItem, comparerQm } from "../qm/types";
import { BANQUE_RESPECT, COMPETENCES_RESPECT } from "./respect";
import { BANQUE_EMOTIONS, COMPETENCES_EMOTIONS } from "./emotions";
import { BANQUE_REPUBLIQUE, COMPETENCES_REPUBLIQUE } from "./republique";
import { BANQUE_ECRANS, COMPETENCES_ECRANS } from "./ecrans";

// Banque complete (toutes sous-matieres EMC actives dans le build courant).
export const BANQUE_EMC: QmItem[] = [
  ...BANQUE_RESPECT,
  ...BANQUE_EMOTIONS,
  ...BANQUE_REPUBLIQUE,
  ...BANQUE_ECRANS,
];

// Competences EMC, dans l'ordre d'affichage du referentiel.
export const COMPETENCES_EMC = [
  ...COMPETENCES_RESPECT,
  ...COMPETENCES_EMOTIONS,
  ...COMPETENCES_REPUBLIQUE,
  ...COMPETENCES_ECRANS,
] as const;

// Items jouables pour une competence et un niveau donnes.
export function itemsEmcDe(competence: string, niveau: number): QmItem[] {
  return BANQUE_EMC.filter((i) => i.competence === competence && i.niveau === niveau);
}

// Juge local (mode demo + feedback immediat) : miroir exact du serveur.
export function estJusteEmc(cle: string, saisie: string): boolean {
  const item = BANQUE_EMC.find((i) => i.cle === cle);
  if (!item) return false;
  return comparerQm(item.format, saisie, item.attendu);
}

// Recupere un item par sa cle.
export function itemEmcParCle(cle: string): QmItem | undefined {
  return BANQUE_EMC.find((i) => i.cle === cle);
}

// ==========================================================================
// GENERATEUR : choisit un ITEM de la banque pour la competence et le niveau, de
// facon reproductible (graine). Le composant <QuestionnerLeMonde> le rend
// (forme / saisie 'qm') ; le serveur (verif_qm, op 'qm') est seul juge via la
// cle. Repli robuste si aucun item.
// ==========================================================================
export function buildEmc(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const items = itemsEmcDe(src.competence, src.niveau);
  const item = items.length > 0 ? pick(rng, items) : null;
  if (!item) {
    return {
      ...base,
      forme: "qm",
      support: "aucun",
      saisie: "qm",
      prompt: "Vivre ensemble",
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
