// Table de conjugaison de REFERENCE (programme CE2 2024, cycle 2).
// Temps : present, futur, imparfait de l'indicatif.
// Verbes : etre, avoir, verbes reguliers du 1er groupe, cas orthographiques
//   -ger (manger) / -cer (placer), et les irreguliers frequents du programme
//   (aller, dire, faire, pouvoir, prendre, venir, voir, vouloir).
//
// C'est la SOURCE DE VERITE cote client. La table SQL public.conjugaison
// (migration 0031) est SEEDEE avec exactement les memes formes : un golden
// partage (CONJ_GOLDEN ci-dessous + supabase/tests/conjugaison_test.sql)
// garantit par test croise que les deux cotes donnent les memes ecritures.
//
// Les formes sont stockees SANS le pronom (ex. present chanter personne 3 =
// « chante »). L'elision « j' » est une affaire d'AFFICHAGE du pronom : la
// reponse comparee reste la forme verbale seule. Les accents sont significatifs.

export type Temps = "present" | "futur" | "imparfait";
export const TEMPS: Temps[] = ["present", "futur", "imparfait"];

// Code entier du temps (envoye au serveur dans p_a).
export const TEMPS_CODE: Record<Temps, number> = {
  present: 1,
  futur: 2,
  imparfait: 3,
};
export const TEMPS_PAR_CODE: Record<number, Temps> = {
  1: "present",
  2: "futur",
  3: "imparfait",
};
export const TEMPS_LIBELLE: Record<Temps, string> = {
  present: "le présent",
  futur: "le futur",
  imparfait: "l'imparfait",
};

// Personnes 1..6 ; index 0..5 dans les tableaux de formes.
export const PERSONNES = [1, 2, 3, 4, 5, 6] as const;
export type Personne = (typeof PERSONNES)[number];

// Formes [p1, p2, p3, p4, p5, p6].
type Formes = [string, string, string, string, string, string];
interface Conjugaison {
  present: Formes;
  futur: Formes;
  imparfait: Formes;
}

// --- Fabrique des verbes REGULIERS du 1er groupe (radical constant) ----------
function regulier1er(infinitif: string): Conjugaison {
  const rad = infinitif.slice(0, -2); // retire « er »
  return {
    present: [
      `${rad}e`, `${rad}es`, `${rad}e`, `${rad}ons`, `${rad}ez`, `${rad}ent`,
    ],
    futur: [
      `${infinitif}ai`, `${infinitif}as`, `${infinitif}a`,
      `${infinitif}ons`, `${infinitif}ez`, `${infinitif}ont`,
    ],
    imparfait: [
      `${rad}ais`, `${rad}ais`, `${rad}ait`, `${rad}ions`, `${rad}iez`, `${rad}aient`,
    ],
  };
}

// Verbes reguliers du 1er groupe retenus (radical sans accent, sans changement).
const REGULIERS = ["chanter", "jouer", "aimer", "regarder", "donner", "trouver", "parler"];

export const CONJ: Record<string, Conjugaison> = {
  // --- etre / avoir --------------------------------------------------------
  etre: {
    present: ["suis", "es", "est", "sommes", "êtes", "sont"],
    futur: ["serai", "seras", "sera", "serons", "serez", "seront"],
    imparfait: ["étais", "étais", "était", "étions", "étiez", "étaient"],
  },
  avoir: {
    present: ["ai", "as", "a", "avons", "avez", "ont"],
    futur: ["aurai", "auras", "aura", "aurons", "aurez", "auront"],
    imparfait: ["avais", "avais", "avait", "avions", "aviez", "avaient"],
  },
  // --- 2e groupe (radical + -iss- au pluriel du present et a l'imparfait) ---
  finir: {
    present: ["finis", "finis", "finit", "finissons", "finissez", "finissent"],
    futur: ["finirai", "finiras", "finira", "finirons", "finirez", "finiront"],
    imparfait: ["finissais", "finissais", "finissait", "finissions", "finissiez", "finissaient"],
  },
  // --- cas orthographiques -ger / -cer (niveau haut) -----------------------
  manger: {
    present: ["mange", "manges", "mange", "mangeons", "mangez", "mangent"],
    futur: ["mangerai", "mangeras", "mangera", "mangerons", "mangerez", "mangeront"],
    imparfait: ["mangeais", "mangeais", "mangeait", "mangions", "mangiez", "mangeaient"],
  },
  placer: {
    present: ["place", "places", "place", "plaçons", "placez", "placent"],
    futur: ["placerai", "placeras", "placera", "placerons", "placerez", "placeront"],
    imparfait: ["plaçais", "plaçais", "plaçait", "placions", "placiez", "plaçaient"],
  },
  // --- irreguliers frequents ----------------------------------------------
  aller: {
    present: ["vais", "vas", "va", "allons", "allez", "vont"],
    futur: ["irai", "iras", "ira", "irons", "irez", "iront"],
    imparfait: ["allais", "allais", "allait", "allions", "alliez", "allaient"],
  },
  dire: {
    present: ["dis", "dis", "dit", "disons", "dites", "disent"],
    futur: ["dirai", "diras", "dira", "dirons", "direz", "diront"],
    imparfait: ["disais", "disais", "disait", "disions", "disiez", "disaient"],
  },
  faire: {
    present: ["fais", "fais", "fait", "faisons", "faites", "font"],
    futur: ["ferai", "feras", "fera", "ferons", "ferez", "feront"],
    imparfait: ["faisais", "faisais", "faisait", "faisions", "faisiez", "faisaient"],
  },
  pouvoir: {
    present: ["peux", "peux", "peut", "pouvons", "pouvez", "peuvent"],
    futur: ["pourrai", "pourras", "pourra", "pourrons", "pourrez", "pourront"],
    imparfait: ["pouvais", "pouvais", "pouvait", "pouvions", "pouviez", "pouvaient"],
  },
  prendre: {
    present: ["prends", "prends", "prend", "prenons", "prenez", "prennent"],
    futur: ["prendrai", "prendras", "prendra", "prendrons", "prendrez", "prendront"],
    imparfait: ["prenais", "prenais", "prenait", "prenions", "preniez", "prenaient"],
  },
  venir: {
    present: ["viens", "viens", "vient", "venons", "venez", "viennent"],
    futur: ["viendrai", "viendras", "viendra", "viendrons", "viendrez", "viendront"],
    imparfait: ["venais", "venais", "venait", "venions", "veniez", "venaient"],
  },
  voir: {
    present: ["vois", "vois", "voit", "voyons", "voyez", "voient"],
    futur: ["verrai", "verras", "verra", "verrons", "verrez", "verront"],
    imparfait: ["voyais", "voyais", "voyait", "voyions", "voyiez", "voyaient"],
  },
  vouloir: {
    present: ["veux", "veux", "veut", "voulons", "voulez", "veulent"],
    futur: ["voudrai", "voudras", "voudra", "voudrons", "voudrez", "voudront"],
    imparfait: ["voulais", "voulais", "voulait", "voulions", "vouliez", "voulaient"],
  },
};
for (const inf of REGULIERS) CONJ[inf] = regulier1er(inf);

// Classement des verbes par difficulte (utilise par le generateur).
export const VERBES_ETRE_AVOIR = ["etre", "avoir"];
export const VERBES_1ER = [...REGULIERS];
export const VERBES_2E = ["finir"]; // 2e groupe (temps simples)
export const VERBES_1ER_HAUT = [...REGULIERS, "manger", "placer"];
export const VERBES_IRREGULIERS = [
  "aller", "dire", "faire", "pouvoir", "prendre", "venir", "voir", "vouloir",
];
export const TOUS_VERBES = Object.keys(CONJ);

// Infinitif affiche a l'enfant (etre/avoir sans accent dans la cle).
export const INFINITIF_AFFICHE: Record<string, string> = { etre: "être" };
export function infinitifAffiche(verbe: string): string {
  return INFINITIF_AFFICHE[verbe] ?? verbe;
}

// --- Pronoms et elision « j' » ----------------------------------------------
const VOYELLES = new Set(["a", "e", "i", "o", "u", "é", "è", "ê", "â", "î", "ô", "û", "h"]);
export function commenceParVoyelle(forme: string): boolean {
  return forme.length > 0 && VOYELLES.has(forme[0].toLowerCase());
}

// Pronom affiche pour une personne donnee (personne 1 = je/j' selon la forme).
export function pronom(personne: Personne, forme: string): string {
  switch (personne) {
    case 1:
      return commenceParVoyelle(forme) ? "j'" : "je";
    case 2:
      return "tu";
    case 3:
      return "il";
    case 4:
      return "nous";
    case 5:
      return "vous";
    case 6:
      return "ils";
  }
}

// Sujet + forme, avec l'espace d'elision correct (« j'ai », « je chante »).
export function avecPronom(personne: Personne, forme: string): string {
  const p = pronom(personne, forme);
  return p.endsWith("'") ? `${p}${forme}` : `${p} ${forme}`;
}

// Forme de reference pour (verbe, temps, personne). Lance si inconnu.
export function forme(verbe: string, temps: Temps, personne: Personne): string {
  const c = CONJ[verbe];
  if (!c) throw new Error(`verbe inconnu: ${verbe}`);
  return c[temps][personne - 1];
}

// --- Golden partage (test croise front <-> SQL) -----------------------------
// Liste exhaustive {verbe, temps(code), personne, forme}, triee de facon stable.
// Le test vitest verifie que CONJ la reproduit ; conjugaison_test.sql verifie que
// la table SQL public.conjugaison contient exactement ces memes lignes.
export interface GoldenRow {
  verbe: string;
  temps: number;
  personne: number;
  forme: string;
}
export function conjGolden(): GoldenRow[] {
  const rows: GoldenRow[] = [];
  for (const verbe of Object.keys(CONJ).sort()) {
    for (const t of TEMPS) {
      for (const p of PERSONNES) {
        rows.push({ verbe, temps: TEMPS_CODE[t], personne: p, forme: forme(verbe, t, p) });
      }
    }
  }
  return rows;
}
