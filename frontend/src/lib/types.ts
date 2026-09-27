// Types alignes sur le schema Supabase (voir supabase/migrations/).

export type UniversId =
  | "village_breton"
  | "ile_tropicale"
  | "base_spatiale"
  | "royaume_enchante"
  | "vallee_dinosaures"
  | "village_gourmand";

// Avatar stocke en jsonb : forme + couleur (SVG genere cote client).
export interface Avatar {
  forme: string; // cle d'un avatar SVG (voir domain/avatars.tsx)
  couleur: string; // hex
}

export interface Profil {
  id: string;
  foyer_id: string;
  surnom: string;
  avatar: Avatar | Record<string, never>;
  univers: UniversId;
  matieres_actives: string[];
  limite_jour_min: number | null;
  limite_semaine_min: number | null;
  monnaie: number;
  cree_le?: string;
}

export interface Competence {
  code: string;
  matiere: string;
  domaine: string;
  libelle: string;
  ordre: number;
  nb_niveaux: number;
  actif: boolean;
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
