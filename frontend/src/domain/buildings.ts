// Logique PURE du quartier "port" des maths (testable isolement).
//
// Regles (voir docs/motivation.md et prompt) :
//   * Etat d'un batiment selon niveau_max_atteint :
//       aucune progression -> "vide"
//       1 -> "chantier", 2 -> "cabane", 3 -> "maison", 4 -> "monument".
//   * Une competence n'apparait dans le port que si elle est DEBLOQUEE :
//     tous ses prerequis atteignent leur niveau_min (2 par defaut) au regard de
//     niveau_max_atteint. Une competence sans prerequis est debloquee d'office.
//   * Une competence debloquee mais sans progression = emplacement vide.

import type { Competence, Prerequis, Progression } from "../lib/types";

export type BuildingState = "vide" | "chantier" | "cabane" | "maison" | "monument";

export function buildingStateFromNiveauMax(
  niveauMax: number | null | undefined
): BuildingState {
  if (niveauMax == null || niveauMax <= 0) return "vide";
  if (niveauMax === 1) return "chantier";
  if (niveauMax === 2) return "cabane";
  if (niveauMax === 3) return "maison";
  return "monument"; // >= 4 : competence acquise
}

export function progressionMap(
  progressions: Progression[]
): Record<string, Progression> {
  const m: Record<string, Progression> = {};
  for (const p of progressions) m[p.competence] = p;
  return m;
}

// Une competence est debloquee si chacun de ses prerequis a un
// niveau_max_atteint >= niveau_min. Sans prerequis -> debloquee.
export function isUnlocked(
  code: string,
  prerequis: Prerequis[],
  progByCode: Record<string, Progression>
): boolean {
  const reqs = prerequis.filter((r) => r.competence === code);
  return reqs.every(
    (r) => (progByCode[r.prerequis]?.niveau_max_atteint ?? 0) >= r.niveau_min
  );
}

export interface PortPlot {
  code: string;
  libelle: string;
  ordre: number;
  state: BuildingState;
  niveau: number;
  niveauMax: number;
}

// Construit la liste ordonnee des emplacements du port : uniquement les
// competences DEBLOQUEES, chacune avec son etat de batiment.
export function computePort(
  competences: Competence[],
  prerequis: Prerequis[],
  progressions: Progression[]
): PortPlot[] {
  const progByCode = progressionMap(progressions);
  return competences
    .filter((c) => c.actif !== false)
    .filter((c) => isUnlocked(c.code, prerequis, progByCode))
    .map((c) => {
      const prog = progByCode[c.code];
      return {
        code: c.code,
        libelle: c.libelle,
        ordre: c.ordre,
        state: buildingStateFromNiveauMax(prog?.niveau_max_atteint),
        niveau: prog?.niveau ?? 0,
        niveauMax: prog?.niveau_max_atteint ?? 0,
      };
    })
    .sort((a, b) => a.ordre - b.ordre);
}

export const BUILDING_LABEL: Record<BuildingState, string> = {
  vide: "Terrain à bâtir",
  chantier: "Chantier",
  cabane: "Cabane",
  maison: "Maison",
  monument: "Monument",
};
