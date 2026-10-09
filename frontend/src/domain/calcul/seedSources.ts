// Copie cliente des parametres du referentiel de calcul (miroir de
// supabase/migrations/0006_seed_referentiel_calcul.sql). Sert :
//   * de jeu de donnees en mode demo (aucun backend) ;
//   * de repli si la lecture ex_calcul echoue ;
//   * de fixture pour les tests du generateur.
// La BASE reste la source de verite en production (getExercicesCalcul).

import type { ExCalcul, Forme, Support } from "./generator";

type Row = [
  competence: string,
  niveau: number,
  operation: string,
  forme: Forme,
  methode: string,
  support: Support,
  strategie: string,
  params: Record<string, unknown>
];

const CM: Row[] = [
  ["MA.CM.ADDITION", 1, "add", "resultat", "cpa_barres", "droite", "compter_a_partir_du_plus_grand", { a: { min: 1, max: 8 }, b: { min: 1, max: 8 }, contrainte: "somme_inf_10" }],
  ["MA.CM.ADDITION", 2, "add", "decomposition", "exemples_estompes", "aucun", "doubles_et_presque_doubles", { type: "doubles_presque_doubles", a: { min: 1, max: 10 } }],
  ["MA.CM.ADDITION", 3, "add", "decomposition", "variation", "droite", "passage_par_la_dizaine", { type: "passage_par_10", a: { min: 6, max: 9 }, b: { min: 3, max: 9 } }],
  ["MA.CM.ADDITION", 4, "add", "terme_manquant", "probleme_dabord", "aucun", "completer_a_la_somme", { type: "terme_manquant", somme: { min: 11, max: 18 }, terme_connu: { min: 2, max: 9 } }],

  ["MA.CM.DOUBLES", 1, "double", "resultat", "cpa_barres", "rectangle", "double_par_paquets", { n: { min: 1, max: 10 } }],
  ["MA.CM.DOUBLES", 2, "double", "resultat", "exemples_estompes", "aucun", "double_decompose", { n: { min: 11, max: 20 } }],
  ["MA.CM.DOUBLES", 3, "double", "resultat", "variation", "aucun", "double_nombres_ronds", { nombres: [25, 30, 40, 50, 60, 100] }],
  ["MA.CM.DOUBLES", 4, "double", "resultat", "probleme_dabord", "aucun", "double_melange", { melange: true, n: { min: 1, max: 20 }, nombres: [25, 30, 40, 50, 60, 100] }],

  ["MA.CM.MOITIES", 1, "moitie", "resultat", "cpa_barres", "rectangle", "partage_en_deux", { pairs: { min: 2, max: 20 } }],
  ["MA.CM.MOITIES", 2, "moitie", "resultat", "exemples_estompes", "aucun", "moitie_decomposee", { pairs: { min: 22, max: 40 } }],
  ["MA.CM.MOITIES", 3, "moitie", "resultat", "variation", "aucun", "moitie_nombres_ronds", { nombres: [50, 60, 100] }],
  ["MA.CM.MOITIES", 4, "moitie", "resultat", "probleme_dabord", "aucun", "moitie_melange", { melange: true, pairs: { min: 2, max: 40 }, nombres: [50, 60, 100] }],

  ["MA.CM.COMPL_SUP", 1, "complement", "terme_manquant", "cpa_barres", "droite", "complement_a_10", { cible: 10, a: { min: 1, max: 9 } }],
  ["MA.CM.COMPL_SUP", 2, "complement", "resultat", "exemples_estompes", "droite", "vers_dizaine_superieure", { vers: "dizaine_sup", n: { min: 41, max: 98 } }],
  ["MA.CM.COMPL_SUP", 3, "complement", "resultat", "variation", "aucun", "vers_centaine_superieure", { vers: "centaine_sup", n: { min: 410, max: 990 } }],
  ["MA.CM.COMPL_SUP", 4, "complement", "resultat", "probleme_dabord", "aucun", "vers_millier_superieur", { vers: "millier_sup", n: { min: 4100, max: 9900 } }],

  ["MA.CM.COMPL_100_1000", 1, "complement", "terme_manquant", "cpa_barres", "droite", "dizaines_a_100", { cible: 100, nombres: [10, 20, 30, 40, 50, 60, 70, 80, 90] }],
  ["MA.CM.COMPL_100_1000", 2, "complement", "terme_manquant", "exemples_estompes", "aucun", "tout_nombre_a_100", { cible: 100, n: { min: 1, max: 99 } }],
  ["MA.CM.COMPL_100_1000", 3, "complement", "terme_manquant", "variation", "aucun", "centaines_a_1000", { cible: 1000, nombres: [100, 200, 300, 400, 500, 600, 700, 800, 900] }],
  ["MA.CM.COMPL_100_1000", 4, "complement", "terme_manquant", "probleme_dabord", "aucun", "dizaines_a_1000", { cible: 1000, n: { min: 10, max: 990, multiple_de: 10 } }],

  ["MA.CM.SOMMES_DIFF", 1, "add", "resultat", "cpa_barres", "aucun", "dizaines_sans_retenue", { type: "dizaines_sans_retenue", a: { min: 20, max: 89 }, b: { multiple_de: 10, min: 10, max: 40 }, ops: ["add", "sub"] }],
  ["MA.CM.SOMMES_DIFF", 2, "add", "decomposition", "variation", "aucun", "ajout_proche_dizaine", { type: "ajout_proche_dizaine", a: { min: 10, max: 89 }, ajouts: [9, 19, -9] }],
  ["MA.CM.SOMMES_DIFF", 3, "add", "resultat", "exemples_estompes", "aucun", "addition_avec_retenue", { type: "deux_chiffres_avec_retenue", a: { min: 13, max: 89 }, b: { min: 13, max: 89 } }],
  ["MA.CM.SOMMES_DIFF", 4, "add", "ordre_grandeur", "probleme_dabord", "aucun", "estimer_puis_calculer", { a: { min: 100, max: 999 }, b: { min: 11, max: 99 }, ops: ["add", "sub"] }],

  ["MA.CM.X10_X100", 1, "mul", "resultat", "cpa_barres", "droite", "decaler_les_chiffres", { a: { min: 2, max: 9 }, facteur: 10 }],
  ["MA.CM.X10_X100", 2, "mul", "resultat", "exemples_estompes", "aucun", "decaler_les_chiffres", { a: { min: 10, max: 99 }, facteur: 10 }],
  ["MA.CM.X10_X100", 3, "mul", "resultat", "variation", "aucun", "deux_zeros", { a: { min: 2, max: 99 }, facteur: 100 }],
  ["MA.CM.X10_X100", 4, "mul", "resultat", "probleme_dabord", "aucun", "x10_puis_double_ou_moitie", { a: { min: 2, max: 50 }, facteurs: [20, 50] }],

  ["MA.CM.DIV_RESTE", 1, "div", "resultat", "cpa_barres", "rectangle", "division_exacte_par_les_tables", { type: "exacte", tables: [2, 3, 4, 5], quotient: { min: 1, max: 10 } }],
  ["MA.CM.DIV_RESTE", 2, "div", "reste", "exemples_estompes", "aucun", "plus_grand_multiple_inferieur", { type: "avec_reste", diviseur: { min: 2, max: 9 }, dividende: { min: 10, max: 89 } }],
  ["MA.CM.DIV_RESTE", 3, "div", "reste", "variation", "aucun", "division_par_nombres_ronds", { type: "avec_reste", diviseurs: [10, 25, 50, 100], dividende: { min: 30, max: 990 } }],
  ["MA.CM.DIV_RESTE", 4, "div", "reste", "probleme_dabord", "aucun", "division_en_contexte", { type: "melange", tables: [2, 3, 4, 5, 6, 7, 8, 9], diviseurs: [10, 25, 50, 100], contexte: true }],

  // CM1 (lot B) : diviser par 10 et 100 (exact, resultat entier). Symetrique de
  // X10_X100 (multiplier). Division exacte -> op 'div', reste 0, fields 1.
  // N1 ÷10 petit ; N2 ÷10 grand ; N3 ÷100 ; N4 ÷10 et ÷100 melanges, grands.
  ["MA.CM.DIV10_100", 1, "div", "resultat", "cpa_barres", "aucun", "division_par_10_100", { type: "exacte", tables: [10], quotient: { min: 2, max: 9 } }],
  ["MA.CM.DIV10_100", 2, "div", "resultat", "exemples_estompes", "aucun", "division_par_10_100", { type: "exacte", tables: [10], quotient: { min: 10, max: 99 } }],
  ["MA.CM.DIV10_100", 3, "div", "resultat", "variation", "aucun", "division_par_10_100", { type: "exacte", tables: [100], quotient: { min: 2, max: 20 } }],
  ["MA.CM.DIV10_100", 4, "div", "resultat", "probleme_dabord", "aucun", "division_par_10_100", { type: "exacte", tables: [10, 100], quotient: { min: 20, max: 99 } }],
];

// --- Numeration jusqu'a 10 000 (domaine numeration) ---
const NUM: Row[] = [
  // CE1 dédiée (migration 0121) : 4 niveaux TOUS calibrés CE1 (<= 1 000).
  ["MA.NUM.CE1_MILLE", 1, "lire", "lecture", "cpa_barres", "aucun", "lire_nombre_jusqu_100", { type: "lire", min: 0, max: 100 }],
  ["MA.NUM.CE1_MILLE", 2, "comparer", "comparaison", "exemples_estompes", "aucun", "comparer_jusqu_1000", { type: "comparer", min: 0, max: 999 }],
  ["MA.NUM.CE1_MILLE", 3, "decomposer", "decomposition", "variation", "aucun", "decomposer_cdu", { type: "decomposer", ranks: ["c", "d", "u"], min: 100, max: 999 }],
  ["MA.NUM.CE1_MILLE", 4, "comparer", "comparaison", "probleme_dabord", "aucun", "ranger_le_plus_grand", { type: "ranger", n: 3, min: 100, max: 999 }],

  ["MA.NUM.LIRE_ECRIRE", 1, "lire", "lecture", "cpa_barres", "aucun", "lire_nombre", { type: "lire", max: 100 }],
  ["MA.NUM.LIRE_ECRIRE", 2, "lire", "lecture", "exemples_estompes", "aucun", "ecrire_nombre", { type: "ecrire", max: 1000 }],
  ["MA.NUM.LIRE_ECRIRE", 3, "lire", "lecture", "variation", "aucun", "ecrire_nombre", { type: "ecrire", max: 9999 }],
  ["MA.NUM.LIRE_ECRIRE", 4, "lire", "lecture", "probleme_dabord", "aucun", "ecrire_en_lettres", { type: "ecrire_lettres", min: 100, max: 10000 }],

  ["MA.NUM.DECOMPOSER", 1, "decomposer", "decomposition", "cpa_barres", "aucun", "decomposition_rangs", { type: "decomposer", ranks: ["c", "d", "u"], max: 999 }],
  ["MA.NUM.DECOMPOSER", 2, "decomposer", "decomposition", "exemples_estompes", "aucun", "decomposition_rangs", { type: "decomposer", ranks: ["m", "c", "d", "u"], min: 1000, max: 9999 }],
  ["MA.NUM.DECOMPOSER", 3, "decomposer", "decomposition", "variation", "aucun", "valeur_position", { type: "valeur_chiffre", max: 9999 }],
  ["MA.NUM.DECOMPOSER", 4, "decomposer", "decomposition", "probleme_dabord", "aucun", "compter_rangs", { type: "compter_rangs", max: 9999 }],

  ["MA.NUM.COMPARER", 1, "comparer", "comparaison", "cpa_barres", "aucun", "comparer_signes", { type: "comparer", min: 0, max: 100 }],
  ["MA.NUM.COMPARER", 2, "comparer", "comparaison", "exemples_estompes", "aucun", "comparer_signes", { type: "comparer", min: 0, max: 9999 }],
  ["MA.NUM.COMPARER", 3, "comparer", "comparaison", "variation", "aucun", "encadrement", { type: "encadrer", pas: 100, max: 9999 }],
  ["MA.NUM.COMPARER", 4, "comparer", "comparaison", "probleme_dabord", "aucun", "ranger", { type: "ranger", min: 1000, max: 9999, n: 3 }],

  ["MA.NUM.SUITE", 1, "encadrer", "encadrement", "cpa_barres", "aucun", "voisins", { type: "voisins", max: 1000 }],
  ["MA.NUM.SUITE", 2, "encadrer", "encadrement", "exemples_estompes", "aucun", "bonds", { type: "bond", pas: [10, 100], max: 9999 }],
  ["MA.NUM.SUITE", 3, "encadrer", "encadrement", "plateau_lineaire", "aucun", "droite_graduee", { type: "droite", step: 100, intervalles: 10, max: 1000 }],
  ["MA.NUM.SUITE", 4, "encadrer", "encadrement", "plateau_lineaire", "aucun", "droite_graduee", { type: "droite", step: 1000, intervalles: 10, max: 10000 }],

  // CM1 (lot 2) : grands nombres (comparer / ranger). Chiffres seuls (aucune
  // ecriture en lettres), jusqu'au million. Portee CM1..CM2 (classe_min=CM1).
  ["MA.NUM.GRANDS", 1, "comparer", "comparaison", "cpa_barres", "aucun", "comparer_signes", { type: "comparer", min: 1000, max: 99999 }],
  ["MA.NUM.GRANDS", 2, "comparer", "comparaison", "exemples_estompes", "aucun", "ranger", { type: "ranger", min: 10000, max: 99999, n: 3 }],
  ["MA.NUM.GRANDS", 3, "comparer", "comparaison", "variation", "aucun", "comparer_signes", { type: "comparer", min: 10000, max: 999999 }],
  ["MA.NUM.GRANDS", 4, "comparer", "comparaison", "probleme_dabord", "aucun", "ranger", { type: "ranger", min: 100000, max: 1000000, n: 3 }],
];

// --- Calculs poses (domaine calcul_pose) ---
const POSE: Row[] = [
  // CE1 dédié (migration 0122) : posé borné <= 1 000.
  ["MA.POSE.CE1_ADDITION", 1, "add", "pose", "cpa_barres", "aucun", "addition_posee", { terms: 2, min: 11, max: 99, sans_retenue: true }],
  ["MA.POSE.CE1_ADDITION", 2, "add", "pose", "exemples_estompes", "aucun", "addition_posee", { terms: 2, min: 11, max: 89 }],
  ["MA.POSE.CE1_ADDITION", 3, "add", "pose", "variation", "aucun", "addition_posee", { terms: 2, min: 100, max: 499, sans_retenue: true }],
  ["MA.POSE.CE1_ADDITION", 4, "add", "pose", "probleme_dabord", "aucun", "addition_posee", { terms: 2, min: 100, max: 450 }],
  ["MA.POSE.CE1_SOUSTRACTION", 1, "sub", "pose", "cpa_barres", "aucun", "soustraction_posee", { min: 11, max: 99, bmin: 10, bmax: 99, sans_retenue: true }],
  ["MA.POSE.CE1_SOUSTRACTION", 2, "sub", "pose", "exemples_estompes", "aucun", "soustraction_posee", { min: 20, max: 99, bmin: 10, bmax: 98 }],
  ["MA.POSE.CE1_SOUSTRACTION", 3, "sub", "pose", "variation", "aucun", "soustraction_posee", { min: 100, max: 999, bmin: 10, bmax: 500, sans_retenue: true }],
  ["MA.POSE.CE1_SOUSTRACTION", 4, "sub", "pose", "probleme_dabord", "aucun", "soustraction_posee", { min: 100, max: 999, bmin: 10, bmax: 900 }],

  ["MA.POSE.ADDITION", 1, "add", "pose", "cpa_barres", "aucun", "addition_posee", { terms: 2, min: 10, max: 99, sans_retenue: true }],
  ["MA.POSE.ADDITION", 2, "add", "pose", "exemples_estompes", "aucun", "addition_posee", { terms: 2, min: 10, max: 999 }],
  ["MA.POSE.ADDITION", 3, "add", "pose", "variation", "aucun", "addition_posee", { terms: 2, min: 100, max: 9999 }],
  ["MA.POSE.ADDITION", 4, "add", "pose", "probleme_dabord", "aucun", "addition_posee", { terms: 3, min: 10, max: 999 }],

  ["MA.POSE.SOUSTRACTION", 1, "sub", "pose", "cpa_barres", "aucun", "soustraction_posee", { min: 10, max: 99, bmin: 10, bmax: 99, sans_retenue: true }],
  ["MA.POSE.SOUSTRACTION", 2, "sub", "pose", "exemples_estompes", "aucun", "soustraction_posee", { min: 20, max: 999, bmin: 10, bmax: 999 }],
  ["MA.POSE.SOUSTRACTION", 3, "sub", "pose", "variation", "aucun", "soustraction_posee", { min: 100, max: 9999, bmin: 100, bmax: 9999 }],
  ["MA.POSE.SOUSTRACTION", 4, "sub", "pose", "probleme_dabord", "aucun", "soustraction_posee", { min: 1000, max: 9999, bmin: 100, bmax: 9999 }],

  ["MA.POSE.MULTIPLICATION", 1, "mul", "pose", "cpa_barres", "aucun", "multiplication_posee", { min: 11, max: 99, bmin: 2, bmax: 4 }],
  ["MA.POSE.MULTIPLICATION", 2, "mul", "pose", "exemples_estompes", "aucun", "multiplication_posee", { min: 11, max: 99, bmin: 2, bmax: 9 }],
  ["MA.POSE.MULTIPLICATION", 3, "mul", "pose", "variation", "aucun", "multiplication_posee", { min: 100, max: 999, bmin: 2, bmax: 9 }],
  ["MA.POSE.MULTIPLICATION", 4, "mul", "pose", "probleme_dabord", "aucun", "multiplication_posee", { min: 100, max: 999, bmin: 2, bmax: 9 }],

  // Lot 3 : multiplication posee a 2 chiffres (CM1). Reutilise le moteur pose.
  ["MA.POSE.MULT2", 1, "mul", "pose", "cpa_barres", "aucun", "multiplication_posee", { min: 11, max: 25, bmin: 11, bmax: 20 }],
  ["MA.POSE.MULT2", 2, "mul", "pose", "exemples_estompes", "aucun", "multiplication_posee", { min: 11, max: 49, bmin: 11, bmax: 29 }],
  ["MA.POSE.MULT2", 3, "mul", "pose", "variation", "aucun", "multiplication_posee", { min: 12, max: 99, bmin: 11, bmax: 49 }],
  ["MA.POSE.MULT2", 4, "mul", "pose", "probleme_dabord", "aucun", "multiplication_posee", { min: 12, max: 99, bmin: 12, bmax: 99 }],

  // Lot 6 : division posee en POTENCE (CM1). Diviseur a 1 chiffre, dividende
  // croissant. Le moteur buildPose route vers buildPotence (endsWith DIVISION) ;
  // saisie "potence" (quotient + reste), serveur op 'div' seul juge.
  ["MA.POSE.DIVISION", 1, "div", "pose", "cpa_barres", "aucun", "division_posee", { min: 20, max: 50, bmin: 2, bmax: 5 }],
  ["MA.POSE.DIVISION", 2, "div", "pose", "exemples_estompes", "aucun", "division_posee", { min: 30, max: 99, bmin: 2, bmax: 9 }],
  ["MA.POSE.DIVISION", 3, "div", "pose", "variation", "aucun", "division_posee", { min: 100, max: 500, bmin: 2, bmax: 9 }],
  ["MA.POSE.DIVISION", 4, "div", "pose", "probleme_dabord", "aucun", "division_posee", { min: 100, max: 999, bmin: 2, bmax: 9 }],
];

// --- Problemes (domaine problemes) : mascotte, monnaie, deux etapes ---
const PB: Row[] = [
  ["MA.PB.ADD_SUB", 1, "probleme", "probleme", "cpa_barres", "aucun", "schema_barres", { types: ["reunion", "ajout", "retrait"], mag: 20 }],
  ["MA.PB.ADD_SUB", 2, "probleme", "probleme", "exemples_estompes", "aucun", "schema_barres", { types: ["de_plus", "de_moins", "reunion", "retrait"], mag: 100 }],
  ["MA.PB.ADD_SUB", 3, "probleme", "probleme", "variation", "aucun", "schema_barres", { types: ["reunion", "ajout", "retrait", "de_plus", "de_moins"], mag: 1000 }],
  ["MA.PB.ADD_SUB", 4, "probleme", "probleme", "probleme_dabord", "aucun", "schema_barres", { types: ["etat_recu", "etat_don", "de_plus", "de_moins"], mag: 1000 }],

  // CE1 dédié (migration 0123) : problèmes mult/div, tables 2 à 5 uniquement.
  ["MA.PB.CE1_MULT_DIV", 1, "probleme", "probleme", "cpa_barres", "aucun", "schema_barres", { types: ["groupement", "partage"], tables: [2, 5], qmax: 6 }],
  ["MA.PB.CE1_MULT_DIV", 2, "probleme", "probleme", "exemples_estompes", "aucun", "schema_barres", { types: ["groupement", "partage", "quotition"], tables: [2, 3, 4, 5], qmax: 8 }],
  ["MA.PB.CE1_MULT_DIV", 3, "probleme", "probleme", "variation", "aucun", "schema_barres", { types: ["partage", "quotition", "groupement"], tables: [2, 3, 4, 5], qmax: 10 }],
  ["MA.PB.CE1_MULT_DIV", 4, "probleme", "probleme", "probleme_dabord", "aucun", "schema_barres", { types: ["partage", "quotition", "fois_plus", "groupement"], tables: [2, 3, 4, 5], qmax: 10 }],

  ["MA.PB.MULT_DIV", 1, "probleme", "probleme", "cpa_barres", "aucun", "schema_barres", { types: ["groupement", "partage"], tables: [2, 3, 4, 5], qmax: 10 }],
  ["MA.PB.MULT_DIV", 2, "probleme", "probleme", "exemples_estompes", "aucun", "schema_barres", { types: ["groupement", "partage", "quotition"], tables: [2, 3, 4, 5], qmax: 10 }],
  ["MA.PB.MULT_DIV", 3, "probleme", "probleme", "variation", "aucun", "schema_barres", { types: ["partage", "quotition", "groupement", "fois_plus"], tables: [2, 3, 4, 5, 6, 7, 8, 9], qmax: 10 }],
  ["MA.PB.MULT_DIV", 4, "probleme", "probleme", "probleme_dabord", "aucun", "schema_barres", { types: ["partage", "quotition", "fois_plus", "groupement"], tables: [2, 3, 4, 5, 6, 7, 8, 9], qmax: 10 }],

  ["MA.PB.MONNAIE", 1, "probleme", "probleme", "cpa_barres", "aucun", "schema_barres", { types: ["composer"], mag: 50 }],
  ["MA.PB.MONNAIE", 2, "probleme", "probleme", "exemples_estompes", "aucun", "schema_barres", { types: ["comparer", "rendre"], mag: 100 }],
  ["MA.PB.MONNAIE", 3, "probleme", "probleme", "variation", "aucun", "schema_barres", { types: ["composer"], cents: true, mag: 30 }],
  ["MA.PB.MONNAIE", 4, "probleme", "probleme", "probleme_dabord", "aucun", "schema_barres", { types: ["rendre", "comparer"], mag: 100 }],

  ["MA.PB.DEUX_ETAPES", 1, "probleme", "probleme", "cpa_barres", "aucun", "schema_barres", { types: ["mul_add", "add_sub"], tables: [2, 3, 4, 5], qmax: 5, mag: 10 }],
  ["MA.PB.DEUX_ETAPES", 2, "probleme", "probleme", "exemples_estompes", "aucun", "schema_barres", { types: ["mul_sub", "mul_add"], tables: [2, 3, 4, 5], qmax: 5, mag: 20 }],
  ["MA.PB.DEUX_ETAPES", 3, "probleme", "probleme", "variation", "aucun", "schema_barres", { types: ["add_div", "add_sub", "mul_rsub", "add_rsub"], tables: [2, 3, 4, 5], qmax: 10, mag: 100 }],
  ["MA.PB.DEUX_ETAPES", 4, "probleme", "probleme", "probleme_dabord", "aucun", "schema_barres", { types: ["mul_add", "mul_sub", "add_div", "mul_rsub", "add_rsub"], tables: [2, 3, 4, 5, 6, 7, 8, 9], qmax: 10, mag: 100 }],
];

// --- Problemes de MESURES (domaine problemes) : grandeurs a 1-2 etapes ---
// QCM aux niveaux faciles (1-2), saisie libre ensuite. La conversion est
// embarquee dans l'operande (contrat 1 operation) ; diagnostic par pieges.
const PBM: Row[] = [
  ["MA.PB.MESURES", 1, "probleme", "probleme", "cpa_barres", "aucun", "mesures_conversion",
    { grandeurs: ["longueur", "masse"], structures: ["conversion"], saisie: "qcm" }],
  ["MA.PB.MESURES", 2, "probleme", "probleme", "exemples_estompes", "aucun", "mesures_conversion_ajout",
    { grandeurs: ["longueur", "masse", "duree", "monnaie"], structures: ["conversion", "ajout"], saisie: "qcm" }],
  ["MA.PB.MESURES", 3, "probleme", "probleme", "variation", "aucun", "mesures_ajout_retrait",
    { grandeurs: ["longueur", "masse", "duree", "monnaie"], structures: ["conversion", "ajout", "retrait"] }],
  ["MA.PB.MESURES", 4, "probleme", "probleme", "probleme_dabord", "aucun", "mesures_mixte",
    { grandeurs: ["longueur", "masse", "duree", "monnaie"], structures: ["ajout", "retrait", "produit", "conversion"] }],
];

// --- Mesures (domaine mesures) : heure, durees ---
const MES: Row[] = [
  ["MA.MES.HEURE", 1, "heure", "mesure", "cpa_barres", "aucun", "lire_horloge", { types: ["lire"], minuteStep: 30, saisie: "qcm" }],
  ["MA.MES.HEURE", 2, "heure", "mesure", "exemples_estompes", "aucun", "lire_horloge", { types: ["lire"], minuteStep: 15 }],
  ["MA.MES.HEURE", 3, "heure", "mesure", "variation", "aucun", "lire_horloge", { types: ["lire"], minuteStep: 5 }],
  ["MA.MES.HEURE", 4, "heure", "mesure", "probleme_dabord", "aucun", "matin_apres_midi", { types: ["lire", "ap_midi"], minuteStep: 1 }],

  ["MA.MES.DUREES", 1, "duree", "mesure", "cpa_barres", "aucun", "conversion_h_min", { types: ["conversion_hm"] }],
  ["MA.MES.DUREES", 2, "duree", "mesure", "exemples_estompes", "aucun", "de_heure_a_heure", { types: ["conversion_hm", "de_a"], demi: true, minuteStep: 15 }],
  ["MA.MES.DUREES", 3, "duree", "mesure", "variation", "aucun", "heure_arrivee", { types: ["de_a", "arrivee"], minuteStep: 15 }],
  ["MA.MES.DUREES", 4, "duree", "mesure", "probleme_dabord", "aucun", "jours_semaines", { types: ["arrivee", "jours_semaines", "de_a"], minuteStep: 5 }],

  ["MA.MES.LONGUEURS", 1, "longueur", "mesure", "cpa_barres", "aucun", "unite_adaptee", { types: ["unite"] }],
  ["MA.MES.LONGUEURS", 2, "longueur", "mesure", "exemples_estompes", "aucun", "conversions_longueur", { types: ["conversion"] }],
  ["MA.MES.LONGUEURS", 3, "longueur", "mesure", "variation", "aucun", "comparer_longueurs", { types: ["comparer", "conversion"] }],
  ["MA.MES.LONGUEURS", 4, "longueur", "mesure", "probleme_dabord", "aucun", "mesurer_regle", { types: ["regle", "comparer"], max: 20 }],

  ["MA.MES.MASSES_CONTENANCES", 1, "masse", "mesure", "cpa_barres", "aucun", "unite_adaptee", { types: ["unite"] }],
  ["MA.MES.MASSES_CONTENANCES", 2, "masse", "mesure", "exemples_estompes", "aucun", "conversions_masse", { types: ["conversion"] }],
  ["MA.MES.MASSES_CONTENANCES", 3, "masse", "mesure", "variation", "aucun", "comparer_mesures", { types: ["comparer", "conversion"] }],
  ["MA.MES.MASSES_CONTENANCES", 4, "masse", "mesure", "probleme_dabord", "aucun", "lire_balance_verre", { types: ["lecture"], lecture: ["balance", "verre"] }],
];

// --- Grandeurs CM1 : perimetre et aire (carre / rectangle). Saisie clavier ;
//     AIRE -> op 'mul' (serveur recalcule) ; PERIMETRE -> op 'val'. ---
const GRANDEURS: Row[] = [
  ["MA.MES.PERIMETRE", 1, "mul", "mesure", "cpa_barres", "aucun", "perimetre", { types: ["carre"], min: 2, max: 9 }],
  ["MA.MES.PERIMETRE", 2, "mul", "mesure", "exemples_estompes", "aucun", "perimetre", { types: ["carre", "rectangle"], min: 2, max: 12 }],
  ["MA.MES.PERIMETRE", 3, "mul", "mesure", "variation", "aucun", "perimetre", { types: ["rectangle"], min: 3, max: 20 }],
  ["MA.MES.PERIMETRE", 4, "mul", "mesure", "probleme_dabord", "aucun", "perimetre", { types: ["rectangle", "carre"], min: 5, max: 40 }],

  ["MA.MES.AIRE", 1, "mul", "mesure", "cpa_barres", "aucun", "aire", { types: ["carre"], min: 2, max: 6 }],
  ["MA.MES.AIRE", 2, "mul", "mesure", "exemples_estompes", "aucun", "aire", { types: ["carre", "rectangle"], min: 2, max: 9 }],
  ["MA.MES.AIRE", 3, "mul", "mesure", "variation", "aucun", "aire", { types: ["rectangle"], min: 2, max: 12 }],
  ["MA.MES.AIRE", 4, "mul", "mesure", "probleme_dabord", "aucun", "aire", { types: ["rectangle", "carre"], min: 3, max: 15 }],
];

// --- Fractions simples (domaine fractions) ---
const FRAC: Row[] = [
  ["MA.FRAC.SIMPLES", 1, "fraction", "fraction", "cpa_barres", "aucun", "nommer_fraction", { types: ["nommer"], dens: [2, 3, 4] }],
  ["MA.FRAC.SIMPLES", 2, "fraction", "fraction", "exemples_estompes", "aucun", "colorier_parts", { types: ["colorier", "nommer"], dens: [2, 3, 4, 5] }],
  ["MA.FRAC.SIMPLES", 3, "fraction", "fraction", "variation", "aucun", "comparer_a_1", { types: ["comparer_1", "nommer"], dens: [2, 3, 4, 5, 10] }],
  ["MA.FRAC.SIMPLES", 4, "fraction", "fraction", "probleme_dabord", "aucun", "fraction_quantite", { types: ["quantite"], dens: [2, 3, 4, 5, 10] }],

  // CM1 : fractions sur une bande graduee de 0 a 1 (lire / ecrire).
  ["MA.FRAC.DROITE", 1, "fraction", "fraction", "cpa_barres", "aucun", "nommer_fraction", { types: ["droite"], dens: [2, 3, 4] }],
  ["MA.FRAC.DROITE", 2, "fraction", "fraction", "exemples_estompes", "aucun", "nommer_fraction", { types: ["droite"], dens: [2, 3, 4, 5, 6] }],
  ["MA.FRAC.DROITE", 3, "fraction", "fraction", "variation", "aucun", "nommer_fraction", { types: ["droite"], dens: [2, 3, 4, 5, 6, 8, 10] }],
  ["MA.FRAC.DROITE", 4, "fraction", "fraction", "probleme_dabord", "aucun", "nommer_fraction", { types: ["droite"], dens: [3, 4, 5, 6, 8, 10] }],

  // CM1 : comparer deux fractions.
  ["MA.FRAC.COMPARER", 1, "fraction", "fraction", "cpa_barres", "aucun", "comparer_a_1", { types: ["comparer_frac"], subtypes: ["meme_den"], dens: [3, 4, 5, 6] }],
  ["MA.FRAC.COMPARER", 2, "fraction", "fraction", "exemples_estompes", "aucun", "comparer_a_1", { types: ["comparer_frac"], subtypes: ["meme_den", "meme_num"], dens: [2, 3, 4, 5, 6] }],
  ["MA.FRAC.COMPARER", 3, "fraction", "fraction", "variation", "aucun", "comparer_a_1", { types: ["comparer_frac"], subtypes: ["a_demi", "meme_num"], dens: [4, 6, 8, 10] }],
  ["MA.FRAC.COMPARER", 4, "fraction", "fraction", "probleme_dabord", "aucun", "comparer_a_1", { types: ["comparer_frac"], subtypes: ["quelconque", "meme_num", "a_demi"], dens: [2, 3, 4, 5, 6, 8] }],

  // CM1 : fractions egales (equivalences ; familles decimales au niveau 4).
  ["MA.FRAC.EGALITES", 1, "fraction", "fraction", "cpa_barres", "aucun", "nommer_fraction", { types: ["egalites"], bases: [2, 3, 4], facteurs: [2] }],
  ["MA.FRAC.EGALITES", 2, "fraction", "fraction", "exemples_estompes", "aucun", "nommer_fraction", { types: ["egalites"], bases: [2, 3, 4, 5], facteurs: [2, 3] }],
  ["MA.FRAC.EGALITES", 3, "fraction", "fraction", "variation", "aucun", "nommer_fraction", { types: ["egalites"], bases: [2, 3, 4, 5], facteurs: [2, 3, 4] }],
  ["MA.FRAC.EGALITES", 4, "fraction", "fraction", "probleme_dabord", "aucun", "nommer_fraction", { types: ["egalites"], bases: [2, 5, 10], facteurs: [2, 5, 10] }],

  // CM1 : fraction d'une quantite (unitaire puis non unitaire).
  ["MA.FRAC.QUANTITE", 1, "fraction", "fraction", "cpa_barres", "aucun", "fraction_quantite", { types: ["quantite_cm1"], dens: [2, 3, 4] }],
  ["MA.FRAC.QUANTITE", 2, "fraction", "fraction", "exemples_estompes", "aucun", "fraction_quantite", { types: ["quantite_cm1"], dens: [2, 3, 4, 5, 10] }],
  ["MA.FRAC.QUANTITE", 3, "fraction", "fraction", "variation", "aucun", "fraction_quantite", { types: ["quantite_cm1"], dens: [3, 4, 5] }],
  ["MA.FRAC.QUANTITE", 4, "fraction", "fraction", "probleme_dabord", "aucun", "fraction_quantite", { types: ["quantite_cm1"], dens: [3, 4, 5, 6, 8] }],
];

// --- Nombres decimaux CM1 (domaine decimaux). Encodage en CENTIEMES (entier) ;
//     saisie <DecimalInput> (virgule) ; serveur seul juge (op 'val'). ---
const DEC: Row[] = [
  // Ecrire un decimal (dixiemes, centiemes, fraction decimale -> lien fractions).
  ["MA.DEC.ECRIRE", 1, "decimal", "decimal", "cpa_barres", "aucun", "ecrire_decimal", { types: ["ecrire_dixiemes"], maxE: 9 }],
  ["MA.DEC.ECRIRE", 2, "decimal", "decimal", "exemples_estompes", "aucun", "ecrire_decimal", { types: ["ecrire_centiemes", "ecrire_dixiemes"], maxE: 9 }],
  ["MA.DEC.ECRIRE", 3, "decimal", "decimal", "variation", "aucun", "ecrire_decimal", { types: ["ecrire_centiemes", "ecrire_fraction"], maxE: 20 }],
  ["MA.DEC.ECRIRE", 4, "decimal", "decimal", "probleme_dabord", "aucun", "ecrire_decimal", { types: ["ecrire_fraction", "ecrire_centiemes"], maxE: 99 }],

  // Comparer deux decimaux (ecrire le plus grand / le plus petit).
  ["MA.DEC.COMPARER", 1, "decimal", "decimal", "cpa_barres", "aucun", "comparer_decimal", { types: ["comparer_grand"], struct: "ent", maxE: 9 }],
  ["MA.DEC.COMPARER", 2, "decimal", "decimal", "exemples_estompes", "aucun", "comparer_decimal", { types: ["comparer_grand", "comparer_petit"], struct: "dix", maxE: 9 }],
  ["MA.DEC.COMPARER", 3, "decimal", "decimal", "variation", "aucun", "comparer_decimal", { types: ["comparer_grand", "comparer_petit"], struct: "long", maxE: 20 }],
  ["MA.DEC.COMPARER", 4, "decimal", "decimal", "probleme_dabord", "aucun", "comparer_decimal", { types: ["comparer_grand", "comparer_petit"], struct: "cent", maxE: 99 }],

  // Encadrer entre deux entiers consecutifs (entier juste avant / juste apres).
  ["MA.DEC.ENCADRER", 1, "decimal", "decimal", "cpa_barres", "aucun", "encadrer_decimal", { types: ["encadrer_avant"], pas: "entier", decimales: 1, maxE: 9 }],
  ["MA.DEC.ENCADRER", 2, "decimal", "decimal", "exemples_estompes", "aucun", "encadrer_decimal", { types: ["encadrer_avant", "encadrer_apres"], pas: "entier", decimales: 2, maxE: 20 }],
  ["MA.DEC.ENCADRER", 3, "decimal", "decimal", "variation", "aucun", "encadrer_decimal", { types: ["encadrer_avant", "encadrer_apres"], pas: "dixieme", maxE: 20 }],
  ["MA.DEC.ENCADRER", 4, "decimal", "decimal", "probleme_dabord", "aucun", "encadrer_decimal", { types: ["encadrer_avant", "encadrer_apres"], pas: "dixieme", maxE: 99 }],

  // Lot 3 : addition / soustraction de decimaux (saisie <DecimalInput>, op add/sub).
  ["MA.DEC.ADDITION", 1, "add", "decimal", "cpa_barres", "aucun", "addition_decimale", { maxE: 5 }],
  ["MA.DEC.ADDITION", 2, "add", "decimal", "exemples_estompes", "aucun", "addition_decimale", { maxE: 9 }],
  ["MA.DEC.ADDITION", 3, "add", "decimal", "variation", "aucun", "addition_decimale", { maxE: 20 }],
  ["MA.DEC.ADDITION", 4, "add", "decimal", "probleme_dabord", "aucun", "addition_decimale", { maxE: 50 }],

  ["MA.DEC.SOUSTRACTION", 1, "sub", "decimal", "cpa_barres", "aucun", "soustraction_decimale", { maxE: 5 }],
  ["MA.DEC.SOUSTRACTION", 2, "sub", "decimal", "exemples_estompes", "aucun", "soustraction_decimale", { maxE: 9 }],
  ["MA.DEC.SOUSTRACTION", 3, "sub", "decimal", "variation", "aucun", "soustraction_decimale", { maxE: 20 }],
  ["MA.DEC.SOUSTRACTION", 4, "sub", "decimal", "probleme_dabord", "aucun", "soustraction_decimale", { maxE: 50 }],

  // Lot 7 : decimal sur droite graduee (reutilise <DroiteView>, labels decimaux).
  ["MA.DEC.DROITE", 1, "decimal", "decimal", "cpa_barres", "aucun", "droite_decimale", { types: ["droite"], maxE: 2 }],
  ["MA.DEC.DROITE", 2, "decimal", "decimal", "exemples_estompes", "aucun", "droite_decimale", { types: ["droite"], maxE: 5 }],
  ["MA.DEC.DROITE", 3, "decimal", "decimal", "variation", "aucun", "droite_decimale", { types: ["droite"], maxE: 10 }],
  ["MA.DEC.DROITE", 4, "decimal", "decimal", "probleme_dabord", "aucun", "droite_decimale", { types: ["droite"], maxE: 20 }],

  // Lot 7 : ranger des decimaux (trouver le plus petit / le plus grand de trois).
  ["MA.DEC.RANGER", 1, "decimal", "decimal", "cpa_barres", "aucun", "ranger_decimaux", { types: ["ranger_petit"], maxE: 2 }],
  ["MA.DEC.RANGER", 2, "decimal", "decimal", "exemples_estompes", "aucun", "ranger_decimaux", { types: ["ranger_petit", "ranger_grand"], maxE: 5 }],
  ["MA.DEC.RANGER", 3, "decimal", "decimal", "variation", "aucun", "ranger_decimaux", { types: ["ranger_petit", "ranger_grand"], maxE: 10 }],
  ["MA.DEC.RANGER", 4, "decimal", "decimal", "probleme_dabord", "aucun", "ranger_decimaux", { types: ["ranger_petit", "ranger_grand"], maxE: 20 }],
];

const TABLE_STRATS: Record<number, string> = {
  2: "double",
  3: "double_plus_une_fois",
  4: "double_du_double",
  5: "moitie_de_x10",
  6: "double_de_x3",
  7: "cinq_fois_plus_deux_fois",
  8: "double_de_x4",
  9: "dix_fois_moins_une_fois",
};

function tableRows(): Row[] {
  const rows: Row[] = [];
  for (const n of [2, 5, 3, 4, 6, 9, 8, 7]) {
    const strat = TABLE_STRATS[n];
    const code = `MA.TABLES.${n}`;
    rows.push([code, 1, "mul", "resultat", "cpa_barres", "rectangle", strat, { table: n, facteur: { min: 1, max: 10 }, ordre: "croissant" }]);
    rows.push([code, 2, "mul", "resultat", "exemples_estompes", "aucun", strat, { table: n, facteur: { min: 1, max: 10 }, ordre: "aleatoire", saisie: true }]);
    rows.push([code, 3, "mul", "terme_manquant", "variation", "aucun", strat, { table: n, facteur: { min: 1, max: 10 }, variantes: ["terme_manquant", "commutativite", "combien_de_fois"] }]);
    rows.push([code, 4, "mul", "resultat", "probleme_dabord", "aucun", strat, { table: n, tables_debloquees: true, derives: ["70x8", "7x80"] }]);
  }
  return rows;
}

function exerciceId(competence: string, niveau: number): string {
  // Miroir de md5(competence:niveau:calcul) cote SQL, mais un id lisible suffit
  // cote client (jamais renvoye a la base : la base fournit ses propres ids).
  return `${competence}:${niveau}`;
}

function toSource(r: Row): ExCalcul {
  const [competence, niveau, operation, forme, methode, support, strategie, params] = r;
  return {
    exerciceId: exerciceId(competence, niveau),
    competence,
    niveau,
    methode,
    operation,
    forme,
    params,
    support,
    correctionStrategie: strategie,
  };
}

export const SEED_SOURCES: ExCalcul[] = [...CM, ...tableRows(), ...NUM, ...POSE, ...PB, ...PBM, ...MES, ...GRANDEURS, ...FRAC, ...DEC].map(toSource);
