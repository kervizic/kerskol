// « Parcours de Géographie » (GEO, CM1 - NOUVEAU PROGRAMME 2026 : la diversité
// des modes de vie dans le monde). Même méthode « parcours » que l'Histoire,
// MAIS sans frise (la géographie n'est pas chronologique) : le parcours est
//   1) RECIT : un enfant d'un autre pays raconte sa vie quotidienne ;
//   2) QUESTIONS : liées au récit et à une CARTE (planisphère SVG maison) ; une
//      question « clic » demande de compléter la carte (toucher le bon continent) ;
//   3) JE RETIENS : résumé à trous (vocabulaire du programme).
// Réutilise l'infrastructure QM (type QmItem, op 'qm', verif_qm, compétences
// GEO.* existantes -> EMA unifié) et le composant <Parcours> (étape frise
// masquée quand la liste de cartes est vide).
//
// La géographie reste FACTUELLE et HONNETE (inégalités, accès à l'eau, faim
// nommés sans misérabilisme, avec mesure et espoir) et sous bienveillance
// stricte (aucun vocabulaire dramatique).
//
// Cartes = SCHEMAS SVG FAITS MAISON (planisphère simplifié), aucune image
// externe. Miroir SQL : supabase/migrations/0110 + parcours_geo_test.sql.

import type { QmItem, QmScene } from "../qm/types";
import { comparerQm } from "../qm/types";
import type { ParcoursChapitre } from "../histoire/parcours";

// --------------------------------------------------------------------------
// Planisphère schématique (fait maison) : 5 continents dessinés par des blobs
// simples + labels. En option, des ZONES cliquables (format 'clic') pour
// « compléter la carte » en touchant le bon continent.
// --------------------------------------------------------------------------
const CONTINENTS: QmScene["els"] = [
  { t: "rect", x: 0, y: 0, w: 200, h: 110, stroke: "var(--kk-border)", sw: 1 },
  // Amérique (gauche)
  { t: "path", d: "M24 18 q14 -6 20 10 q4 14 -6 22 q10 4 8 20 q-4 20 -18 20 q-12 -2 -8 -22 q2 -12 -2 -22 q-4 -16 6 -28 Z", stroke: "var(--kk-text)", sw: 1.3 },
  { t: "text", x: 30, y: 52, text: "Amérique", fontSize: 7 },
  // Europe (haut-centre)
  { t: "path", d: "M92 24 q12 -4 18 4 q4 10 -6 14 q-12 4 -16 -4 q-2 -10 4 -14 Z", stroke: "var(--kk-text)", sw: 1.3 },
  { t: "text", x: 100, y: 34, text: "Europe", fontSize: 7 },
  // Afrique (centre)
  { t: "path", d: "M96 46 q16 -4 22 10 q4 16 -4 30 q-8 14 -20 8 q-10 -8 -6 -28 q2 -14 8 -20 Z", stroke: "var(--kk-text)", sw: 1.3 },
  { t: "text", x: 104, y: 70, text: "Afrique", fontSize: 7 },
  // Asie (droite)
  { t: "path", d: "M128 20 q26 -8 40 8 q10 14 -2 26 q-18 10 -40 2 q-14 -8 -8 -22 q2 -10 10 -14 Z", stroke: "var(--kk-text)", sw: 1.3 },
  { t: "text", x: 150, y: 36, text: "Asie", fontSize: 7 },
  // Océanie (bas-droite)
  { t: "ellipse", cx: 172, cy: 88, rx: 14, ry: 9, stroke: "var(--kk-text)", sw: 1.3 },
  { t: "text", x: 172, y: 104, text: "Océanie", fontSize: 7 },
];

function carteDocument(legendeMarqueur: { x: number; y: number }): QmScene {
  return {
    kind: "scene",
    viewBox: "0 0 200 110",
    els: [
      ...CONTINENTS,
      // marqueur « ici vit l'enfant »
      { t: "circle", cx: legendeMarqueur.x, cy: legendeMarqueur.y, r: 3, fill: "var(--kk-accent)", stroke: "var(--kk-accent)", sw: 1 },
    ],
    zones: [],
  };
}

// Carte interactive (format 'clic') : zones sur chaque continent.
const CARTE_CLIC: QmScene = {
  kind: "scene",
  viewBox: "0 0 200 110",
  els: CONTINENTS,
  zones: [
    { label: "l'Amérique", shape: "rect", x: 18, y: 16, w: 34, h: 70 },
    { label: "l'Europe", shape: "rect", x: 86, y: 20, w: 30, h: 22 },
    { label: "l'Afrique", shape: "rect", x: 90, y: 44, w: 34, h: 44 },
    { label: "l'Asie", shape: "rect", x: 126, y: 16, w: 48, h: 34 },
    { label: "l'Océanie", shape: "rect", x: 158, y: 78, w: 32, h: 22 },
  ],
};

// ==========================================================================
// CHAPITRE 1 — SE NOURRIR DANS LE MONDE (GEO.NOURRIR)
// ==========================================================================
const CH_NOURRIR: ParcoursChapitre = {
  cle: "geo_nourrir",
  theme: "Se nourrir dans le monde",
  titre: "Lan et les rizières",
  competence: "GEO.NOURRIR",
  personnage: "Lan, une fille qui vit près des rizières, au Vietnam",
  recit: [
    "Je m'appelle Lan. J'habite un village au Vietnam, en Asie.",
    "Tout autour de chez moi, il y a des rizières : des champs couverts d'eau.",
    "Mes parents y cultivent le riz, l'aliment de base de ma famille.",
    "Le matin, je vais à l'école, puis j'aide un peu aux champs.",
    "Le riz, le blé et le maïs sont des céréales : on en mange partout dans le monde.",
    "Dans mon pays, on mange surtout du riz ; en France, on mange plus de pain.",
    "Partout, les familles cherchent à bien se nourrir.",
    "Mais tout le monde ne mange pas à sa faim : certaines régions manquent de nourriture.",
    "Avec de meilleures récoltes et du partage, on peut aider chacun à manger assez.",
    "Moi, j'aime regarder le soleil se lever sur les rizières.",
  ],
  document: {
    scene: carteDocument({ x: 150, y: 36 }),
    nature: "carte",
    auteur: "Kerskol (planisphère fait maison)",
    date: "aujourd'hui",
    legende: "Le Vietnam, où vit Lan, se trouve en Asie. Le point orange montre sa région.",
  },
  questions: [
    {
      cle: "pg-nou-q1",
      competence: "GEO.NOURRIR",
      niveau: 1,
      format: "qcm",
      consigne: "Dans le récit, quel est l'aliment de base de la famille de Lan ?",
      options: ["le riz", "le chocolat", "les frites"],
      attendu: "le riz",
      explication: "Le riz est l'aliment de base dans beaucoup de pays d'Asie. Il pousse dans les rizières.",
    },
    {
      cle: "pg-nou-q2",
      competence: "GEO.NOURRIR",
      niveau: 2,
      format: "qcm",
      consigne: "Le riz, le blé et le maïs sont des aliments de base. Comment les appelle-t-on ?",
      options: ["des céréales", "des desserts", "des boissons"],
      attendu: "des céréales",
      explication: "Les céréales (riz, blé, maïs) nourrissent la plus grande partie de l'humanité.",
    },
    {
      cle: "pg-nou-q3",
      competence: "GEO.NOURRIR",
      niveau: 2,
      format: "clic",
      consigne: "Touche sur la carte le continent où vit Lan.",
      attendu: "l'Asie",
      explication: "Le Vietnam se trouve en Asie, le plus grand continent du monde.",
      figure: CARTE_CLIC,
    },
    {
      cle: "pg-nou-q4",
      competence: "GEO.NOURRIR",
      niveau: 4,
      format: "texte",
      consigne: "Écris le mot : quand une personne ne mange pas assez pour être en bonne santé, elle souffre de... (deux mots reliés par un tiret).",
      attendu: "sous-alimentation",
      explication: "La sous-alimentation, c'est ne pas manger assez. Elle touche encore des millions de personnes dans le monde.",
    },
  ],
  frise: [],
  jeRetiens: {
    resume:
      "Le riz, le blé et le maïs sont des {1}. En Asie, l'aliment de base est le {2}. Quand on ne mange pas assez, on souffre de {3}.",
    blancs: [
      { cle: "pg-nou-jr1", competence: "GEO.NOURRIR", niveau: 2, attendu: "céréales" },
      { cle: "pg-nou-jr2", competence: "GEO.NOURRIR", niveau: 2, attendu: "riz" },
      { cle: "pg-nou-jr3", competence: "GEO.NOURRIR", niveau: 4, attendu: "sous-alimentation" },
    ],
  },
};

// ==========================================================================
// CHAPITRE 2 — LES INÉGALITÉS DANS LE MONDE (GEO.INEGALITES)
// ==========================================================================
const CH_INEGALITES: ParcoursChapitre = {
  cle: "geo_inegalites",
  theme: "Les inégalités dans le monde",
  titre: "Awa et le puits du village",
  competence: "GEO.INEGALITES",
  personnage: "Awa, une fille qui vit dans un village du Sahel, en Afrique",
  recit: [
    "Je m'appelle Awa. J'habite un village du Sahel, en Afrique.",
    "Chez moi, il ne pleut pas souvent : l'eau est précieuse.",
    "Chaque matin, je vais chercher de l'eau au puits avec ma mère.",
    "Il faut marcher un bon moment avant d'y arriver.",
    "L'eau propre, qu'on peut boire sans danger, s'appelle l'eau potable.",
    "Dans le monde, tout le monde n'a pas l'eau potable au robinet.",
    "Pour tous, boire, manger et aller à l'école sont des besoins essentiels.",
    "Dans mon village, on a construit un nouveau puits : c'est une grande joie.",
    "Maintenant, je peux aller à l'école l'après-midi.",
    "Plus tard, j'aimerais devenir maîtresse.",
  ],
  document: {
    scene: carteDocument({ x: 104, y: 62 }),
    nature: "carte",
    auteur: "Kerskol (planisphère fait maison)",
    date: "aujourd'hui",
    legende: "Le Sahel, où vit Awa, se trouve en Afrique. Le point orange montre sa région.",
  },
  questions: [
    {
      cle: "pg-ine-q1",
      competence: "GEO.INEGALITES",
      niveau: 1,
      format: "qcm",
      consigne: "Dans le récit, que va chercher Awa chaque matin au puits ?",
      options: ["de l'eau", "du sable", "des jouets"],
      attendu: "de l'eau",
      explication: "Là où il pleut peu, l'eau est précieuse : il faut parfois marcher longtemps pour en trouver.",
    },
    {
      cle: "pg-ine-q2",
      competence: "GEO.INEGALITES",
      niveau: 2,
      format: "qcm",
      consigne: "Comment appelle-t-on l'eau propre que l'on peut boire sans danger ?",
      options: ["l'eau potable", "l'eau de pluie", "l'eau salée"],
      attendu: "l'eau potable",
      explication: "L'eau potable est l'eau qu'on peut boire sans risque. Tout le monde n'y a pas accès facilement.",
    },
    {
      cle: "pg-ine-q3",
      competence: "GEO.INEGALITES",
      niveau: 2,
      format: "clic",
      consigne: "Touche sur la carte le continent où vit Awa.",
      attendu: "l'Afrique",
      explication: "Le Sahel est une grande région d'Afrique, au sud du désert du Sahara.",
      figure: CARTE_CLIC,
    },
    {
      cle: "pg-ine-q4",
      competence: "GEO.INEGALITES",
      niveau: 4,
      format: "texte",
      consigne: "Écris le mot : la carte qui représente toute la Terre à plat s'appelle un...",
      attendu: "planisphère",
      explication: "Un planisphère montre toute la Terre à plat. On y voit les continents et les océans.",
    },
  ],
  frise: [],
  jeRetiens: {
    resume:
      "L'eau propre qu'on peut boire s'appelle l'eau {1}. Boire, manger et aller à l'école sont des besoins {2}. La carte qui montre toute la Terre à plat est un {3}.",
    blancs: [
      { cle: "pg-ine-jr1", competence: "GEO.INEGALITES", niveau: 2, attendu: "potable" },
      { cle: "pg-ine-jr2", competence: "GEO.INEGALITES", niveau: 3, attendu: "essentiels" },
      { cle: "pg-ine-jr3", competence: "GEO.INEGALITES", niveau: 2, attendu: "planisphère" },
    ],
  },
};

export const PARCOURS_GEOGRAPHIE: ParcoursChapitre[] = [CH_NOURRIR, CH_INEGALITES];

export function chapitreGeoParCle(cle: string): ParcoursChapitre | undefined {
  return PARCOURS_GEOGRAPHIE.find((c) => c.cle === cle);
}

// Tous les items 'qm' du parcours géo (questions + trous) : seed SQL miroir + test.
export function itemsParcoursGeoTousQm(): QmItem[] {
  const out: QmItem[] = [];
  for (const c of PARCOURS_GEOGRAPHIE) {
    for (const q of c.questions) out.push(q);
    for (const b of c.jeRetiens.blancs) {
      out.push({
        cle: b.cle,
        competence: b.competence,
        niveau: b.niveau,
        format: "texte",
        consigne: `« Je retiens » — ${c.titre}`,
        attendu: b.attendu,
        explication: "Mot du vocabulaire du chapitre.",
      });
    }
  }
  return out;
}

// Juge local (mode demo) : miroir du serveur (verif_qm).
export function estJusteParcoursGeoQm(cle: string, saisie: string): boolean {
  const item = itemsParcoursGeoTousQm().find((i) => i.cle === cle);
  if (!item) return false;
  return comparerQm(item.format, saisie, item.attendu);
}
