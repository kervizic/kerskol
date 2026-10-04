// Defi chrono : jeu de rapidite OPTIONNEL sur des competences DEJA MAITRISEES
// (niveau >= 3). Module pur (aucun effet de bord, aucune dependance a lib).
//
// Regles produit (voir docs/motivation.md) : jamais impose, jamais dans la
// seance normale ; uniquement des competences maitrisees ; aucun apprentissage,
// que de la vitesse ; comparaison au seul record personnel. Le serveur reste
// seul juge (verif + score + record) : ce module ne fait que CHOISIR quoi
// proposer et generer des enonces simples a saisie rapide.

import { makeRng, pick, type Rng } from "./rng";
import { generateExercise, type ExCalcul, type GeneratedExercise, type ProblemContext } from "./generator";
import type { Progression } from "../../lib/types";

// Niveau de maitrise requis pour qu'une competence soit eligible au defi.
export const DEFI_NIVEAU_MIN = 3;
// Niveau des enonces GENERES pendant le defi : volontairement FLUENT (2), pour
// un jeu de rapidite (pas d'apprentissage). L'eligibilite exige deja niveau >= 3.
export const DEFI_NIVEAU_GEN = 2;
// Duree d'un defi (secondes) et recompense indicative (le serveur fait foi).
export const DEFI_DUREE_S = 60;

export interface DefiTheme {
  id: string;
  label: string;
  competences: string[]; // competences candidates du theme
}

// Competences de calcul mental a saisie rapide (on exclut DIV_RESTE : 2 champs).
const CM_FLUENT = [
  "MA.CM.ADDITION",
  "MA.CM.DOUBLES",
  "MA.CM.MOITIES",
  "MA.CM.SOMMES_DIFF",
  "MA.CM.X10_X100",
  "MA.CM.COMPL_SUP",
  "MA.CM.COMPL_100_1000",
];
// Numeration simple a saisie rapide (ecrire / comparer / suite).
const NUM_SIMPLE = ["MA.NUM.LIRE_ECRIRE", "MA.NUM.COMPARER", "MA.NUM.SUITE"];
const TABLES_ALL = [
  "MA.TABLES.2", "MA.TABLES.3", "MA.TABLES.4", "MA.TABLES.5",
  "MA.TABLES.6", "MA.TABLES.7", "MA.TABLES.8", "MA.TABLES.9",
];

// Themes proposables, du plus simple au plus large.
export const DEFI_THEMES: DefiTheme[] = [
  { id: "tables_2_5", label: "Tables de 2 à 5", competences: ["MA.TABLES.2", "MA.TABLES.3", "MA.TABLES.4", "MA.TABLES.5"] },
  { id: "tables_all", label: "Toutes mes tables", competences: TABLES_ALL },
  { id: "calcul_mental", label: "Calcul mental", competences: CM_FLUENT },
  { id: "numeration", label: "Numération", competences: NUM_SIMPLE },
];

// Une competence est maitrisee si son niveau COURANT est >= DEFI_NIVEAU_MIN
// (le serveur applique la meme regle lors de l'enregistrement d'une reponse).
function maitrisees(progression: Progression[]): Set<string> {
  const s = new Set<string>();
  for (const p of progression) {
    if (p.niveau >= DEFI_NIVEAU_MIN) s.add(p.competence);
  }
  return s;
}

// Theme eligible = au moins une de ses competences est maitrisee. On renvoie la
// LISTE des competences eligibles du theme (celles effectivement maitrisees).
export interface EligibleTheme {
  theme: DefiTheme;
  competences: string[];
}
export function eligibleThemes(progression: Progression[]): EligibleTheme[] {
  const ok = maitrisees(progression);
  const out: EligibleTheme[] = [];
  for (const theme of DEFI_THEMES) {
    const comps = theme.competences.filter((c) => ok.has(c));
    if (comps.length > 0) out.push({ theme, competences: comps });
  }
  return out;
}

// Choisit une source d'exercice pour une competence : niveau FLUENT (2) de
// preference, sinon le plus proche disponible (robustesse si le seed evolue).
function sourceFor(sources: ExCalcul[], competence: string): ExCalcul | null {
  const forComp = sources.filter((s) => s.competence === competence);
  if (forComp.length === 0) return null;
  const fluent = forComp.find((s) => s.niveau === DEFI_NIVEAU_GEN);
  if (fluent) return fluent;
  // Repli : la plus proche de DEFI_NIVEAU_GEN.
  return forComp.reduce((best, s) =>
    Math.abs(s.niveau - DEFI_NIVEAU_GEN) < Math.abs(best.niveau - DEFI_NIVEAU_GEN) ? s : best
  );
}

// Genere un exercice de defi : tire une competence eligible au hasard puis un
// enonce fluent. Deterministe pour un seed donne (test). `competences` doit etre
// la liste eligible (maitrisee) du theme choisi.
export function buildDefiExercise(
  sources: ExCalcul[],
  competences: string[],
  seed: number,
  ctx?: ProblemContext
): GeneratedExercise | null {
  if (competences.length === 0) return null;
  const rng: Rng = makeRng(seed);
  // Quelques tentatives au cas ou une competence n'aurait pas de source.
  for (let i = 0; i < 8; i++) {
    const competence = pick(rng, competences);
    const src = sourceFor(sources, competence);
    if (src) return generateExercise(src, (seed ^ (i + 1) * 0x9e3779b9) >>> 0, { ctx });
  }
  return null;
}
