// « Questionner le monde » (QM, cycle 2, attendus de fin de CE2). Nouvelle
// MATIERE a cote de Maths et Francais, avec des SOUS-MATIERES reglables :
//   vivant  Le vivant       (QM.VIVANT.*)
//   matiere La matiere      (QM.MATIERE.*)
//   objets  Les objets      (QM.OBJETS.*)
//   espace  L'espace        (QM.ESPACE.*)
//   temps   Le temps        (QM.TEMPS.*)
//
// ARCHITECTURE (miroir EXACT de la geometrie / des donnees) : chaque item porte
// une cle stable, un FORMAT d'interaction, une consigne redigee POUR L'ORAL
// (phrases courtes, un exemple concret), une reponse attendue, une explication
// valorisante, et eventuellement une SCENE SVG maison (zones cliquables). Le
// SERVEUR reste SEUL JUGE : la table public.qm_item (migrations 0052+) porte
// (cle, competence, niveau, format, attendu) et verif_qm compare la saisie
// normalisee ; l'op dediee est 'qm'. Un test croise garantit front == SQL
// (qm.test.ts + qm_test.sql).
//
// FORMATS (interactions variees, pas seulement QCM) :
//   qcm    propositions en gros boutons (la scene sert de contexte) ;
//   texte  saisie LIBRE (N4), l'enfant ecrit le mot ou le nombre ;
//   ordre  RANGER des etapes (cycle de vie, chaine alimentaire, frise) : la
//          reponse est la suite des etiquettes dans l'ordre, jointes par « > » ;
//   tri    CLASSER des objets dans des categories (solide/liquide/gaz...) : la
//          reponse est « item=categorie » pour chaque item (ordre des options),
//          jointes par « ; » ;
//   clic   TOUCHER une zone d'une scene SVG maison (corps, planisphere, circuit,
//          calendrier) : la reponse est le libelle de la zone touchee.

import { normaliser } from "../diagnostic/lettres";
import { normaliserMot } from "../francais/dictee";

export type QmFormat = "qcm" | "clic" | "texte" | "ordre" | "tri";

// --------------------------------------------------------------------------
// Scene SVG maison (format « clic ») : un decor dessine par des primitives
// simples + des ZONES cliquables (chacune porte le libelle = reponse). Aucune
// image protegee ; tout est dessine a la main avec les variables de theme.
// --------------------------------------------------------------------------
export interface QmSceneEl {
  t: "rect" | "circle" | "ellipse" | "line" | "polyline" | "polygon" | "path" | "text";
  x?: number; y?: number; w?: number; h?: number; // rect
  cx?: number; cy?: number; r?: number; rx?: number; ry?: number; // circle / ellipse
  x1?: number; y1?: number; x2?: number; y2?: number; // line
  points?: string; // polyline / polygon
  d?: string; // path
  text?: string; // text
  fill?: string;
  stroke?: string;
  sw?: number; // stroke-width
  opacity?: number;
  fontSize?: number;
  anchor?: "start" | "middle" | "end"; // text-anchor
  dashed?: boolean;
}
export interface QmZone {
  label: string; // reponse attendue quand on touche la zone
  shape: "rect" | "circle";
  x?: number; y?: number; w?: number; h?: number; // rect
  cx?: number; cy?: number; r?: number; // circle
  tag?: string; // petit libelle affiche sur la zone (sinon aucun)
}
export interface QmScene {
  kind: "scene";
  viewBox: string;
  els: QmSceneEl[];
  zones: QmZone[];
}
export type QmFigure = QmScene | { kind: "none" };

export interface QmItem {
  cle: string; // identifiant stable (PK serveur)
  competence: string; // QM.*
  niveau: number; // 1..4
  format: QmFormat;
  consigne: string; // instruction (redigee pour l'oral)
  options?: string[]; // qcm : propositions ; ordre : etapes ; tri : items a classer
  bins?: string[]; // tri : categories (ex. ["solide","liquide","gaz"])
  attendu: string; // reponse attendue (comparee normalisee)
  explication: string; // correction courte et valorisante, avec un exemple
  figure?: QmFigure; // scene SVG (format clic)
}

// Donnees de RENDU (ce que l'exercice porte et que <QuestionnerLeMonde> affiche).
export type QmRender = Pick<
  QmItem,
  "cle" | "format" | "consigne" | "options" | "bins" | "attendu" | "explication" | "figure"
>;

// --------------------------------------------------------------------------
// Comparaison MIROIR du serveur (verif_qm) :
//   qcm          -> normaliser (accents gardes, minuscule, espaces normalises) ;
//   ordre / tri  -> comparaison STRUCTURELLE (minuscule, espaces retires, on
//                   garde les accents et les separateurs « > » / « = » / « ; ») ;
//   clic / texte -> normaliserMot (accents EXIGES, ponctuation de bord retiree).
// --------------------------------------------------------------------------
export function normQmStruct(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, "");
}
export function comparerQm(format: QmFormat, saisie: string, attendu: string): boolean {
  if (format === "qcm") return normaliser(saisie) === normaliser(attendu);
  if (format === "ordre" || format === "tri") return normQmStruct(saisie) === normQmStruct(attendu);
  return normaliserMot(saisie) === normaliserMot(attendu); // clic, texte
}

// --------------------------------------------------------------------------
// Helpers de construction (gardent les banques lisibles ET l'attendu COHERENT
// avec ce que le composant envoie).
// --------------------------------------------------------------------------

// « ordre » : la reponse attendue est la suite des etapes dans l'ORDRE CORRECT,
// jointe par « > ». `correct` = les etapes dans le bon ordre (le composant les
// melange a l'affichage). options = correct (la banque garde le bon ordre lisible).
export function ordre(correct: string[]): { options: string[]; attendu: string } {
  return { options: correct.slice(), attendu: correct.join(">") };
}

// « tri » : chaque paire [item, categorie]. options = items (dans l'ordre donne),
// attendu = « item=categorie » pour chaque item, joint par « ; » (le composant
// reconstruit EXACTEMENT dans cet ordre d'items).
export function tri(
  bins: string[],
  pairs: Array<[string, string]>,
): { options: string[]; bins: string[]; attendu: string } {
  return {
    options: pairs.map((p) => p[0]),
    bins: bins.slice(),
    attendu: pairs.map((p) => `${p[0]}=${p[1]}`).join(";"),
  };
}
