// Catalogue des MATIERES et SOUS-MATIERES activables par profil (reglages
// enfant et parent). Une sous-matiere = un `domaine` de public.competences.
//
// Modele d'activation (etend profils.matieres_actives) :
//   - matieres_actives : les MATIERES actives (codes MA, FR) ;
//   - domaines_actifs  : les SOUS-MATIERES actives (codes de domaine).
// Une competence est jouable SSI sa matiere est active ET son domaine est actif.
// Au moins une sous-matiere doit rester active (verifie aussi cote serveur).
//
// Les libelles collent au programme reel : « heure » et « durees » vivent dans
// le domaine `heure` (sous-matiere « Lire l'heure »), les grandeurs (longueurs,
// masses, contenances) dans `mesures`, et « monnaie » dans le domaine
// `problemes` (cf. public.competences).

import type { Classe } from "../lib/types";
import { classeDansPortee } from "../lib/types";

export interface SousMatiere {
  domaine: string; // = public.competences.domaine
  libelle: string;
  // Portee par classe (lot 1). Absent = visible partout (CP..CM2). Une
  // sous-matiere propre au CM1 (lot 2) porte classeMin='CM1'.
  classeMin?: Classe;
  classeMax?: Classe;
}
export interface MatiereDef {
  code: string; // = public.competences.matiere (MA, FR)
  libelle: string;
  sousMatieres: SousMatiere[];
}

export const MATIERES: MatiereDef[] = [
  {
    code: "MA",
    libelle: "Maths",
    sousMatieres: [
      { domaine: "numeration", libelle: "Les nombres" },
      { domaine: "calcul_mental", libelle: "Calcul mental" },
      { domaine: "tables_multiplication", libelle: "Tables de multiplication" },
      { domaine: "calcul_pose", libelle: "Calcul posé" },
      { domaine: "problemes", libelle: "Problèmes et monnaie" },
      { domaine: "mesures", libelle: "Mesures" },
      { domaine: "heure", libelle: "Lire l'heure" },
      { domaine: "fractions", libelle: "Fractions" },
      { domaine: "decimaux", libelle: "Les nombres décimaux", classeMin: "CM1" },
      { domaine: "proportionnalite", libelle: "Proportionnalité", classeMin: "CM1" },
      { domaine: "geometrie", libelle: "Géométrie" },
      { domaine: "repere", libelle: "Se repérer" },
      { domaine: "donnees", libelle: "Tableaux et graphiques" },
    ],
  },
  {
    code: "FR",
    libelle: "Français",
    sousMatieres: [
      { domaine: "grammaire", libelle: "Grammaire" },
      { domaine: "vocabulaire", libelle: "Vocabulaire" },
      { domaine: "mots-invariables", libelle: "Mots à savoir" },
      { domaine: "conjugaison", libelle: "Conjugaison" },
      { domaine: "orthographe", libelle: "Orthographe" },
      { domaine: "lecture", libelle: "Comprendre un texte" },
      { domaine: "ecriture", libelle: "Copier et écrire" },
    ],
  },
  {
    // Sous-matieres ajoutees au fur et a mesure des lots (chaque `domaine` doit
    // exister dans public.competences, sinon regler_matieres refuse l'enregistrement).
    code: "QM",
    libelle: "Questionner le monde",
    sousMatieres: [
      { domaine: "vivant", libelle: "Le vivant" },
      { domaine: "matiere", libelle: "La matière" },
      { domaine: "objets", libelle: "Les objets" },
      { domaine: "espace", libelle: "L'espace" },
      { domaine: "temps", libelle: "Le temps" },
    ],
  },
  {
    // « Vivre ensemble » (EMC). Situations concretes du quotidien ; reutilise
    // le rendu de Questionner le monde (QCM, tri, ordre, saisie libre).
    code: "EMC",
    libelle: "Vivre ensemble",
    sousMatieres: [
      { domaine: "respect", libelle: "Respecter les autres" },
      { domaine: "emotions", libelle: "Mes émotions" },
      { domaine: "republique", libelle: "Droits et République" },
      { domaine: "ecrans", libelle: "Les écrans et Internet" },
    ],
  },
  {
    // « Sciences et technologie » (cycle 3, CM1). Reutilise le rendu de
    // Questionner le monde (QCM, tri, ordre, saisie libre). Sous-matieres
    // propres au CM1 (classeMin CM1) : masquees dans les reglages d'un CE2.
    code: "ST",
    libelle: "Sciences et technologie",
    sousMatieres: [
      { domaine: "etats_matiere", libelle: "États et mélanges", classeMin: "CM1" },
      { domaine: "classification", libelle: "Classer le vivant", classeMin: "CM1" },
      { domaine: "corps_humain", libelle: "Le corps et la santé", classeMin: "CM1" },
      { domaine: "energie", libelle: "L'énergie", classeMin: "CM1" },
      { domaine: "objets_techniques", libelle: "Les objets techniques", classeMin: "CM1" },
      { domaine: "ciel_terre", libelle: "La Terre et le ciel", classeMin: "CM1" },
    ],
  },
];

// Tous les codes matieres / tous les domaines connus (defauts « tout actif »).
export const TOUTES_MATIERES: string[] = MATIERES.map((m) => m.code);
export const TOUS_DOMAINES: string[] = MATIERES.flatMap((m) =>
  m.sousMatieres.map((s) => s.domaine),
);

export function matiereDe(domaine: string): string | undefined {
  for (const m of MATIERES) {
    if (m.sousMatieres.some((s) => s.domaine === domaine)) return m.code;
  }
  return undefined;
}

// Une sous-matiere est-elle VISIBLE pour cette classe (lot 1) ? Visibilite
// stricte : classeMin <= classe <= classeMax (defaut CP..CM2). Les sous-matieres
// propres au CM1 sont donc masquees pour un CE2 dans les reglages ; le moteur,
// lui, peut proposer une competence un peu en avance DANS une sous-matiere deja
// visible (marge d'un an, composeSession).
export function sousMatiereVisible(s: SousMatiere, classe: Classe): boolean {
  return classeDansPortee(s.classeMin, s.classeMax, classe);
}

// Sous-matieres visibles d'une matiere pour une classe donnee.
export function sousMatieresVisibles(m: MatiereDef, classe: Classe): SousMatiere[] {
  return m.sousMatieres.filter((s) => sousMatiereVisible(s, classe));
}

// Domaines visibles pour une classe (toutes matieres confondues).
export function domainesVisibles(classe: Classe): string[] {
  return MATIERES.flatMap((m) => sousMatieresVisibles(m, classe).map((s) => s.domaine));
}

// Une competence (matiere, domaine) est-elle jouable, selon les reglages du
// profil ? Matiere active ET sous-matiere active.
export function competenceActivable(
  matiere: string,
  domaine: string,
  matieresActives: string[],
  domainesActifs: string[],
): boolean {
  return matieresActives.includes(matiere) && domainesActifs.includes(domaine);
}

// Y a-t-il au moins une sous-matiere jouable (matiere active ET domaine actif) ?
// Garde-fou : on refuse un reglage qui ne laisserait plus rien a travailler.
export function auMoinsUneSousMatiere(
  matieresActives: string[],
  domainesActifs: string[],
): boolean {
  return MATIERES.some(
    (m) =>
      matieresActives.includes(m.code) &&
      m.sousMatieres.some((s) => domainesActifs.includes(s.domaine)),
  );
}
