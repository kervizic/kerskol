// Plan de demarrage par CLASSE (TS pur).
//
// A la premiere seance il n'existe aucune reponse : le placement serveur ne
// peut donc pas encore situer l'enfant. On part alors du programme de sa classe
// (documente dans docs/referentiel-calcul.md) :
//   * REVISION (competences de la classe precedente) : demarrent a un niveau
//     eleve (2 ou 3). Elles servent de verification rapide -> au plus 1-2
//     exercices faciles en debut de seance.
//   * COEUR (competences cle de la classe courante) : proposees des la 1re
//     seance. Leurs prerequis de revision sont PRESUMES atteints (niveau 2) tant
//     qu'ils n'ont pas ete infirmes ; si l'enfant echoue, le placement la fait
//     redescendre et le graphe de prerequis la ramene au prerequis.
//
// Le niveau de depart du PLACEMENT SERVEUR est porte par la table
// supabase/migrations/0012_placement_depart.sql (memes valeurs pour la revision).

import type { Classe } from "../../lib/types";

export interface ClassPlan {
  // competence -> niveau de depart (revision de la classe precedente)
  revision: Record<string, number>;
  // competence -> niveau de depart (coeur de la classe courante)
  coeur: Record<string, number>;
}

// CE2 : seul programme de calcul disponible pour l'instant.
const CE2: ClassPlan = {
  revision: {
    "MA.CM.ADDITION": 3,
    "MA.CM.DOUBLES": 3,
    "MA.CM.MOITIES": 2,
    "MA.CM.COMPL_SUP": 2,
  },
  coeur: {
    "MA.CM.SOMMES_DIFF": 2,
    "MA.CM.COMPL_100_1000": 1,
    "MA.CM.X10_X100": 1,
    "MA.TABLES.2": 1,
    "MA.TABLES.5": 1,
  },
};

// CM1 : demarrage par classe. Revision = coeur du CE2 (presume acquis),
// coeur = grands nombres + fractions CM1 (droite graduee, comparer, egalites,
// quantite) + donnees / probabilites CM1 (lire un tableau ou un graphique « a la
// maison », vocabulaire du hasard) + problemes a deux etapes et programmation
// d'un deplacement (pensee informatique). Les autres sous-matieres CM1 restent a
// livrer (cf. docs/explications.md).
const CM1: ClassPlan = {
  revision: {
    "MA.NUM.COMPARER": 3,
    "MA.TABLES.5": 3,
    "MA.FRAC.SIMPLES": 2,
  },
  coeur: {
    "MA.NUM.GRANDS": 1,
    "MA.FRAC.DROITE": 1,
    "MA.FRAC.COMPARER": 1,
    "MA.FRAC.EGALITES": 1,
    "MA.FRAC.QUANTITE": 1,
    "MA.DONNEES.LIRE_CM1": 1,
    "MA.DONNEES.HASARD": 1,
    "MA.PB.DEUX_ETAPES": 1,
    "MA.REPERE.PROGRAMMER": 1,
    "MA.DEC.ECRIRE": 1,
    "MA.DEC.COMPARER": 1,
    "MA.DEC.ENCADRER": 1,
    "MA.DONNEES.PROP_RECETTE": 1,
    "MA.DONNEES.PROP_COURSES": 1,
    "MA.MES.PERIMETRE": 1,
    "MA.MES.AIRE": 1,
    "MA.MES.DUREES": 1,
    "MA.DONNEES.ANGLES": 1,
    "MA.DEC.ADDITION": 1,
    "MA.DEC.SOUSTRACTION": 1,
    "MA.POSE.MULT2": 1,
  },
};

const PLANS: Partial<Record<Classe, ClassPlan>> = { CE2, CM1 };

// Repli sur CE2 tant que les autres programmes ne sont pas definis.
export function classPlan(classe: Classe): ClassPlan {
  return PLANS[classe] ?? CE2;
}

// Competences PRESUMEES debloquees pour la classe (revision + coeur) : elles
// restent disponibles a la composition tant que la progression reelle ne les a
// pas (in)validees.
export function classUnlocks(classe: Classe, code: string): boolean {
  const plan = classPlan(classe);
  return code in plan.revision || code in plan.coeur;
}
