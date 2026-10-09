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

import { classeRang } from "../lib/types";
import type { Classe, Competence, Prerequis, Progression } from "../lib/types";

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

// Codes des competences SOUS-NIVEAU pour un enfant d'une classe donnee : une
// competence dont la portee PLAFONNE sous sa classe (classe_max < classe). Ces
// competences (p. ex. une competence [CE1,CE1] pour un CE2) ne servent que de
// REMEDIATION (revision) ; elles ne doivent jamais VERROUILLER une competence
// de la classe de l'enfant quand elles en sont prerequis (voir isUnlocked +
// composeSession). Sans classe fournie -> aucun sous-niveau (comportement
// historique).
export function sousNiveauCodes(
  competences: Competence[],
  classe?: Classe
): Set<string> {
  const s = new Set<string>();
  if (classe == null) return s;
  const rang = classeRang(classe);
  for (const c of competences) {
    if (c.classe_max != null && classeRang(c.classe_max) < rang) s.add(c.code);
  }
  return s;
}

// Une competence est debloquee si chacun de ses prerequis a un
// niveau_max_atteint >= niveau_min. Sans prerequis -> debloquee.
//
// `ignore` : prerequis a NE PAS compter comme condition de deblocage (par code
// de competence prerequise). Sert au garde-fou sous-niveau : un prerequis de
// classe inferieure (remediation) ne verrouille jamais la competence liee pour
// un enfant plus avance (sinon l'ajout d'un prerequis CE1 -> CE2 masquerait la
// competence CE2 d'Iris, qui n'a pas de progression sur la competence CE1).
export function isUnlocked(
  code: string,
  prerequis: Prerequis[],
  progByCode: Record<string, Progression>,
  ignore?: Set<string>
): boolean {
  const reqs = prerequis.filter(
    (r) => r.competence === code && !(ignore?.has(r.prerequis))
  );
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
  progressions: Progression[],
  classe?: Classe
): PortPlot[] {
  const progByCode = progressionMap(progressions);
  // Garde-fou sous-niveau : un prerequis de classe inferieure (remediation) ne
  // verrouille pas la competence liee pour cet enfant (port d'Iris inchange
  // quand on ajoute un prerequis CE1 -> CE2).
  const ignore = sousNiveauCodes(competences, classe);
  return competences
    .filter((c) => c.actif !== false)
    .filter((c) => isUnlocked(c.code, prerequis, progByCode, ignore))
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
