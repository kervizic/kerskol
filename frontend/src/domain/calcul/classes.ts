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
    // Compétences CE2 presumees debloquees (classUnlocks). Necessaire pour que
    // ces compétences restent debloquees malgre les nouveaux prerequis de
    // REMEDIATION CE1 -> CE2 (migrations 0121/0122) : le prerequis CE1 n'ayant
    // pas de progression chez un CE2, isUnlocked serait faux ; classUnlocks
    // garantit qu'aucune seance de CE2 (Iris) n'est verrouillee.
    "MA.NUM.COMPARER": 1,
    "MA.POSE.ADDITION": 1,
    "MA.POSE.SOUSTRACTION": 1,
    "MA.PB.MULT_DIV": 1,
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
    "MA.GEO.CERCLE": 1,
    "MA.GEO.SYMETRIE": 1,
    "MA.GEO.CONSTRUIRE": 1,
    "MA.DONNEES.DROITES": 1,
    "MA.CM.DIV10_100": 1,
  },
};

// CE1 : début du cycle 2 pour ces notions. Pas de « révision » lourde de la
// classe d'avant (CP) ; la 1re séance part directement du cœur CE1 au niveau 1
// (placement en escalier ensuite). Cœur = nombres <= 1 000, calcul mental
// (sommes/différences, doubles, moitiés), tables 2 et 5, addition/soustraction
// posées, premiers problèmes et monnaie, lire l'heure, fractions simples. Toutes
// ces compétences sont ouvertes au CE1 par la migration 0114 (classe_min='CE1').
const CE1: ClassPlan = {
  revision: {},
  coeur: {
    "MA.NUM.LIRE_ECRIRE": 1,
    "MA.NUM.DECOMPOSER": 1,
    "MA.NUM.COMPARER": 1,
    "MA.NUM.SUITE": 1,
    "MA.CM.ADDITION": 1,
    "MA.CM.SOMMES_DIFF": 1,
    "MA.CM.DOUBLES": 1,
    "MA.CM.MOITIES": 1,
    "MA.TABLES.2": 1,
    "MA.TABLES.5": 1,
    "MA.TABLES.3": 1,
    "MA.TABLES.4": 1,
    "MA.POSE.ADDITION": 1,
    "MA.POSE.SOUSTRACTION": 1,
    "MA.PB.ADD_SUB": 1,
    "MA.PB.MULT_DIV": 1,
    "MA.PB.MONNAIE": 1,
    "MA.MES.HEURE": 1,
    "MA.MES.LONGUEURS": 1,
    "MA.FRAC.SIMPLES": 1,
    // Compétences CE1 DEDIEES (classe_max = CE1), 4 niveaux TOUS calibres CE1,
    // sans debordement vers le CE2. Elles forment le coeur CE1 ; les versions
    // partagees restent disponibles en complement (avance via marge).
    "MA.NUM.CE1_MILLE": 1,       // numeration <= 1000 (0121)
    "MA.POSE.CE1_ADDITION": 1,   // addition posee <= 1000 (0122)
    "MA.POSE.CE1_SOUSTRACTION": 1, // soustraction posee <= 1000 (0122)
    "MA.PB.CE1_MULT_DIV": 1,     // problemes mult/div tables 2-5 (0123)
  },
};

const PLANS: Partial<Record<Classe, ClassPlan>> = { CE1, CE2, CM1 };

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
