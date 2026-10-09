// Types alignes sur le schema Supabase (voir supabase/migrations/).

export type UniversId =
  | "village_breton"
  | "ile_tropicale"
  | "base_spatiale"
  | "royaume_enchante"
  | "vallee_dinosaures"
  | "village_gourmand";

// Avatar stocke en jsonb :
//   nouveau : { style, options, couleur }  (DiceBear, genere cote client)
//   ancien  : { forme, couleur }           (SVG maison, retrocompatibilite)
// Types definis dans domain/avatarConfig (module pur, sans dependance a lib).
import type { AnyAvatar } from "../domain/avatarConfig";
export type { DicebearAvatar, LegacyAvatar, AnyAvatar } from "../domain/avatarConfig";
export type Avatar = AnyAvatar;

export type Classe = "CP" | "CE1" | "CE2" | "CM1" | "CM2";
export const CLASSES: Classe[] = ["CP", "CE1", "CE2", "CM1", "CM2"];
// Classe par défaut quand aucun profil n'est connu (ex. bibliothèque en mode
// invité) : le programme historique.
export const CLASSE_DISPONIBLE: Classe = "CE2";
// Classes dont le programme (contenu de calcul) est effectivement disponible.
// CE1 est ouvert par la migration 0114 (socle maths CE1, réutilise les moteurs
// existants). CM1 a été livré (lots 0089-0113).
export const CLASSES_DISPONIBLES: Classe[] = ["CE1", "CE2", "CM1"];
export function classeDisponible(c: Classe): boolean {
  return CLASSES_DISPONIBLES.includes(c);
}

// Rang scolaire d'une classe (CP=0 .. CM2=4). Sert aux comparaisons de portee.
export function classeRang(c: Classe): number {
  return CLASSES.indexOf(c);
}

// La portee [min, max] d'une competence/sous-matiere chevauche-t-elle la classe
// de l'enfant avec une MARGE (defaut 1 an) ? Sert au moteur : revision de la
// classe d'avant (C-1) et un peu d'avance (C+1).
export function classeDansMarge(
  min: Classe | undefined,
  max: Classe | undefined,
  classe: Classe,
  marge = 1,
): boolean {
  if (!min && !max) return true; // aucune portee declaree -> pas de restriction
  const lo = classeRang(min ?? "CP");
  const hi = classeRang(max ?? "CM2");
  const c = classeRang(classe);
  return lo <= c + marge && hi >= c - marge;
}

// Une sous-matiere/competence de portee [min, max] est-elle VISIBLE pour cette
// classe ? Visibilite STRICTE (sans marge) : min <= classe <= max.
export function classeDansPortee(
  min: Classe | undefined,
  max: Classe | undefined,
  classe: Classe,
): boolean {
  const lo = classeRang(min ?? "CP");
  const hi = classeRang(max ?? "CM2");
  const c = classeRang(classe);
  return lo <= c && c <= hi;
}

export interface Profil {
  id: string;
  foyer_id: string;
  surnom: string;
  avatar: Avatar;
  univers: UniversId;
  classe: Classe;
  matieres_actives: string[];
  // Sous-matieres actives (= domaines de competences). Optionnel : absent des
  // anciens profils / du mode demo -> toutes actives (voir domaine/matieres).
  domaines_actifs?: string[];
  // Le parent laisse-t-il l'enfant choisir ses matieres ? Defaut true (absent ->
  // true). Si false, la section « Mes matieres » de l'enfant est masquee.
  enfant_regle_matieres?: boolean;
  limite_jour_min: number | null;
  limite_semaine_min: number | null;
  monnaie: number;
  // Lecture a voix haute des consignes/dictees (reglage par profil, espace
  // parent). Optionnel : absent des anciens profils / du mode demo -> actif par
  // defaut (voir lib/voix/autoplay.lectureAutoDeProfil).
  lecture_auto?: boolean | null;
  // Compte Google relie a ce profil (enfant). null = aucun compte relie.
  user_id?: string | null;
  cree_le?: string;
}

// Lien de rattachement EN ATTENTE (parent -> compte enfant), avant login.
export interface LienEnAttente {
  id: string;
  profil_id: string;
  email: string;
  expire_le: string;
  cree_le: string;
}

export interface Competence {
  code: string;
  matiere: string;
  domaine: string;
  libelle: string;
  ordre: number;
  nb_niveaux: number;
  actif: boolean;
  // Portee de la competence par classe (lot 1 / migration 0066). Optionnel :
  // absent en mode demo / anciens referentiels -> aucune restriction de classe.
  classe_min?: Classe;
  classe_max?: Classe;
}

export interface Prerequis {
  competence: string;
  prerequis: string;
  niveau_min: number;
}

export interface Progression {
  profil_id: string;
  competence: string;
  niveau: number;
  niveau_max_atteint: number;
  placement_termine: boolean;
}

// Progression detaillee (session : composition + repartition des exercices).
export interface ProgressionDetail {
  competence: string;
  niveau: number;
  niveau_max_atteint: number;
  placement_termine: boolean;
  ema_courte: number;
  derniere_reponse: string | null;
  prochaine_revision: string | null;
}

export interface Matiere {
  code: string;
  libelle: string;
}

export interface JournalReglage {
  id: string;
  foyer_id: string;
  profil_id: string | null;
  cle: string;
  ancienne: unknown;
  nouvelle: unknown;
  cree_le: string;
}
