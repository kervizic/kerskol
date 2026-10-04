// Mode demo LOCAL uniquement, pour realiser des captures des ecrans connectes
// sans backend. TOUJOURS desactive en production : import.meta.env.DEV vaut
// false dans un build Vite de prod, donc isDemo() y renvoie toujours false.
//
// Activation en local : `VITE_DEMO=1 npm run dev` (ou ?demo=1 dans l'URL en dev).

import type {
  Competence,
  JournalReglage,
  Matiere,
  Prerequis,
  Profil,
  Progression,
} from "./types";

export function isDemo(): boolean {
  if (!import.meta.env.DEV) return false;
  if (import.meta.env.VITE_DEMO === "1") return true;
  try {
    return new URLSearchParams(window.location.search).get("demo") === "1";
  } catch {
    return false;
  }
}

const FOYER_ID = "demo-foyer";

export const DEMO_MATIERES: Matiere[] = [
  { code: "MA", libelle: "Maths - calcul" },
  { code: "GE", libelle: "Géométrie" },
  { code: "PB", libelle: "Problèmes" },
  { code: "FR", libelle: "Français" },
  { code: "EN", libelle: "Anglais" },
];

export const DEMO_COMPETENCES: Competence[] = [
  ["MA.CM.ADDITION", "Tables d’addition", 10],
  ["MA.CM.DOUBLES", "Doubles", 20],
  ["MA.CM.MOITIES", "Moitiés", 30],
  ["MA.CM.COMPL_SUP", "Complément à la dizaine supérieure", 40],
  ["MA.CM.SOMMES_DIFF", "Sommes et différences", 60],
  ["MA.CM.X10_X100", "Multiplier par 10, 100", 70],
  ["MA.TABLES.2", "Table de 2", 100],
  ["MA.TABLES.5", "Table de 5", 110],
  ["MA.TABLES.3", "Table de 3", 120],
  ["MA.PB.ADD_SUB", "Problemes : additions et soustractions", 500],
  ["MA.PB.MULT_DIV", "Problemes : multiplications et partages", 510],
  ["MA.PB.MONNAIE", "Problemes : billets et pieces", 520],
  ["MA.PB.DEUX_ETAPES", "Problemes a deux etapes", 530],
].map(([code, libelle, ordre]) => ({
  code: code as string,
  matiere: "MA",
  domaine: (code as string).startsWith("MA.PB.") ? "problemes" : "calcul_mental",
  libelle: libelle as string,
  ordre: ordre as number,
  nb_niveaux: 4,
  actif: true,
}));

export const DEMO_PREREQUIS: Prerequis[] = [
  { competence: "MA.CM.DOUBLES", prerequis: "MA.CM.ADDITION", niveau_min: 2 },
  { competence: "MA.CM.MOITIES", prerequis: "MA.CM.DOUBLES", niveau_min: 2 },
  { competence: "MA.CM.COMPL_SUP", prerequis: "MA.CM.ADDITION", niveau_min: 2 },
  { competence: "MA.CM.SOMMES_DIFF", prerequis: "MA.CM.ADDITION", niveau_min: 2 },
  { competence: "MA.TABLES.2", prerequis: "MA.CM.DOUBLES", niveau_min: 2 },
  { competence: "MA.TABLES.5", prerequis: "MA.CM.X10_X100", niveau_min: 2 },
  { competence: "MA.TABLES.3", prerequis: "MA.TABLES.2", niveau_min: 2 },
  { competence: "MA.PB.ADD_SUB", prerequis: "MA.CM.SOMMES_DIFF", niveau_min: 2 },
  { competence: "MA.PB.MULT_DIV", prerequis: "MA.TABLES.2", niveau_min: 2 },
  { competence: "MA.PB.MULT_DIV", prerequis: "MA.TABLES.5", niveau_min: 2 },
  { competence: "MA.PB.MONNAIE", prerequis: "MA.CM.SOMMES_DIFF", niveau_min: 2 },
  { competence: "MA.PB.DEUX_ETAPES", prerequis: "MA.PB.ADD_SUB", niveau_min: 2 },
  { competence: "MA.PB.DEUX_ETAPES", prerequis: "MA.PB.MULT_DIV", niveau_min: 2 },
];

export const DEMO_PROFILS: Profil[] = [
  {
    id: "demo-lou",
    foyer_id: FOYER_ID,
    surnom: "Lou",
    avatar: { forme: "goeland", couleur: "#2F855A" },
    univers: "village_breton",
    classe: "CE2",
    matieres_actives: ["MA"],
    limite_jour_min: 20,
    limite_semaine_min: 90,
    monnaie: 128,
  },
  {
    id: "demo-nael",
    foyer_id: FOYER_ID,
    surnom: "Nael",
    avatar: { forme: "robot", couleur: "#5E35B1" },
    univers: "base_spatiale",
    classe: "CM1",
    matieres_actives: ["MA"],
    limite_jour_min: 15,
    limite_semaine_min: null,
    monnaie: 42,
  },
];

const DEMO_PROGRESSION: Record<string, Progression[]> = {
  "demo-lou": [
    prog("demo-lou", "MA.CM.ADDITION", 3, 3),
    prog("demo-lou", "MA.CM.DOUBLES", 2, 4),
    prog("demo-lou", "MA.CM.COMPL_SUP", 2, 2),
    prog("demo-lou", "MA.CM.SOMMES_DIFF", 1, 1),
    prog("demo-lou", "MA.TABLES.2", 2, 2),
  ],
  "demo-nael": [prog("demo-nael", "MA.CM.ADDITION", 1, 1)],
};

function prog(
  profil_id: string,
  competence: string,
  niveau: number,
  niveau_max_atteint: number
): Progression {
  return {
    profil_id,
    competence,
    niveau,
    niveau_max_atteint,
    placement_termine: true,
  };
}

export const DEMO_JOURNAL: JournalReglage[] = [
  {
    id: "j1",
    foyer_id: FOYER_ID,
    profil_id: "demo-lou",
    cle: "limite_jour_min",
    ancienne: 15,
    nouvelle: 20,
    cree_le: "2026-09-20T09:12:00Z",
  },
  {
    id: "j2",
    foyer_id: FOYER_ID,
    profil_id: "demo-nael",
    cle: "matieres_actives",
    ancienne: ["MA", "FR"],
    nouvelle: ["MA"],
    cree_le: "2026-09-22T18:40:00Z",
  },
];

export const DEMO_FOYER_ID = FOYER_ID;

export function demoProgression(profilId: string): Progression[] {
  return DEMO_PROGRESSION[profilId] ?? [];
}
