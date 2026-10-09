// « Parcours de Sciences » (ST, CM1 - programme 2026). Même méthode « parcours »
// que la Géographie (SANS frise) :
//   1) RECIT : un enfant observe/expérimente ;
//   2) QUESTIONS : liées au récit et à un SCHEMA (SVG maison) ; une question
//      'clic' pour compléter le schéma ;
//   3) JE RETIENS : résumé à trous.
// Réutilise l'infrastructure QM (compétences ST.* existantes -> EMA unifié) et le
// composant <Parcours>. Serveur seul juge. Schémas = SVG faits maison.

import type { QmItem, QmScene } from "../qm/types";
import { comparerQm, tri } from "../qm/types";
import type { ParcoursChapitre } from "../histoire/parcours";
export type { ParcoursChapitre };

// --------------------------------------------------------------------------
// Schéma des états de la matière (fait maison) : 3 cases solide / liquide / gaz.
// --------------------------------------------------------------------------
const ETATS_ELS: QmScene["els"] = [
  // case solide (glaçon)
  { t: "rect", x: 10, y: 30, w: 44, h: 36 },
  { t: "rect", x: 24, y: 42, w: 16, h: 14, stroke: "var(--kk-text)", sw: 1.2 },
  { t: "text", x: 32, y: 80, text: "solide", fontSize: 8 },
  // case liquide (verre d'eau)
  { t: "rect", x: 78, y: 30, w: 44, h: 36 },
  { t: "path", d: "M90 40 l20 0 l-3 20 l-14 0 Z", stroke: "var(--kk-text)", sw: 1.2 },
  { t: "line", x1: 91, y1: 50, x2: 107, y2: 50, stroke: "var(--kk-accent)", sw: 1 },
  { t: "text", x: 100, y: 80, text: "liquide", fontSize: 8 },
  // case gaz (vapeur)
  { t: "rect", x: 146, y: 30, w: 44, h: 36 },
  { t: "path", d: "M160 58 q-4 -8 4 -12 q-6 -8 4 -12", stroke: "var(--kk-text)", sw: 1.2 },
  { t: "path", d: "M172 58 q-4 -8 4 -12 q-6 -8 4 -12", stroke: "var(--kk-text)", sw: 1.2 },
  { t: "text", x: 168, y: 80, text: "gaz", fontSize: 8 },
  // fleches (changements d'etat)
  { t: "line", x1: 54, y1: 48, x2: 78, y2: 48, stroke: "var(--kk-accent)", sw: 1.2, dashed: true },
  { t: "line", x1: 122, y1: 48, x2: 146, y2: 48, stroke: "var(--kk-accent)", sw: 1.2, dashed: true },
  { t: "text", x: 100, y: 16, text: "les trois états de l'eau", fontSize: 8 },
];
const ETATS_DOC: QmScene = { kind: "scene", viewBox: "0 0 200 90", els: ETATS_ELS, zones: [] };
const ETATS_CLIC: QmScene = {
  kind: "scene",
  viewBox: "0 0 200 90",
  els: ETATS_ELS,
  zones: [
    { label: "le solide", shape: "rect", x: 10, y: 30, w: 44, h: 36 },
    { label: "le liquide", shape: "rect", x: 78, y: 30, w: 44, h: 36 },
    { label: "le gaz", shape: "rect", x: 146, y: 30, w: 44, h: 36 },
  ],
};

// Schéma de classification (fait maison) : un petit arbre.
const CLASSER_DOC: QmScene = {
  kind: "scene",
  viewBox: "0 0 200 100",
  els: [
    { t: "rect", x: 76, y: 6, w: 48, h: 18 },
    { t: "text", x: 100, y: 18, text: "les animaux", fontSize: 8 },
    { t: "line", x1: 100, y1: 24, x2: 40, y2: 44, stroke: "var(--kk-border)", sw: 1 },
    { t: "line", x1: 100, y1: 24, x2: 100, y2: 44, stroke: "var(--kk-border)", sw: 1 },
    { t: "line", x1: 100, y1: 24, x2: 160, y2: 44, stroke: "var(--kk-border)", sw: 1 },
    { t: "rect", x: 14, y: 44, w: 52, h: 18 },
    { t: "text", x: 40, y: 56, text: "des poils", fontSize: 7 },
    { t: "rect", x: 74, y: 44, w: 52, h: 18 },
    { t: "text", x: 100, y: 56, text: "des plumes", fontSize: 7 },
    { t: "rect", x: 134, y: 44, w: 52, h: 18 },
    { t: "text", x: 160, y: 56, text: "des écailles", fontSize: 7 },
    { t: "text", x: 100, y: 84, text: "On classe les animaux par ce qui couvre leur corps.", fontSize: 7 },
  ],
  zones: [],
};

// ==========================================================================
// CHAPITRE 1 — LES ÉTATS DE LA MATIÈRE (ST.MATIERE.ETATS)
// ==========================================================================
const CH_ETATS: ParcoursChapitre = {
  cle: "sc_etats",
  theme: "Matière et mélanges",
  titre: "L'eau dans tous ses états",
  competence: "ST.MATIERE.ETATS",
  personnage: "Tom, qui fait une expérience dans sa cuisine",
  recit: [
    "Je m'appelle Tom. Aujourd'hui, j'observe l'eau à la maison.",
    "Dans mon verre, l'eau coule : elle est à l'état liquide.",
    "Je mets de l'eau au congélateur, dans un bac à glaçons.",
    "Quelques heures plus tard, l'eau est devenue de la glace, bien dure.",
    "La glace, c'est de l'eau à l'état solide.",
    "Ensuite, maman fait chauffer de l'eau dans une casserole.",
    "Quand l'eau bout, de la vapeur s'échappe : c'est de l'eau à l'état gazeux.",
    "Avec le froid et la chaleur, l'eau change d'état.",
    "C'est toujours de l'eau, mais elle n'a pas toujours la même forme.",
    "J'adore faire des expériences et observer ce qui se passe.",
  ],
  document: {
    scene: ETATS_DOC,
    nature: "schéma",
    auteur: "Kerskol (schéma fait maison)",
    date: "aujourd'hui",
    legende: "L'eau peut être solide (la glace), liquide (l'eau qui coule) ou gazeuse (la vapeur).",
  },
  questions: [
    {
      cle: "ps-eta-q1",
      competence: "ST.MATIERE.ETATS",
      niveau: 1,
      format: "qcm",
      consigne: "Dans le récit, à quel état est l'eau quand elle est devenue de la glace bien dure ?",
      options: ["à l'état solide", "à l'état liquide", "à l'état gazeux"],
      attendu: "à l'état solide",
      explication: "La glace, c'est de l'eau à l'état solide : elle garde sa forme et elle est dure.",
    },
    {
      cle: "ps-eta-q2",
      competence: "ST.MATIERE.ETATS",
      niveau: 2,
      format: "clic",
      consigne: "Touche sur le schéma la case de l'état gazeux (la vapeur).",
      attendu: "le gaz",
      explication: "La vapeur d'eau est de l'eau à l'état gazeux : on ne peut pas l'attraper, elle se répand dans l'air.",
      figure: ETATS_CLIC,
    },
    {
      cle: "ps-eta-q3",
      competence: "ST.MATIERE.ETATS",
      niveau: 3,
      format: "qcm",
      consigne: "Un mélange transparent où l'on ne voit plus les morceaux, comme l'eau sucrée, est un mélange... ?",
      options: ["homogène", "hétérogène", "solide"],
      attendu: "homogène",
      explication: "Dans un mélange homogène (eau sucrée), on ne distingue plus les éléments mélangés.",
    },
    {
      cle: "ps-eta-q4",
      competence: "ST.MATIERE.ETATS",
      niveau: 4,
      format: "texte",
      consigne: "Écris le mot : quand l'eau liquide gèle et devient de la glace, ce changement s'appelle la...",
      attendu: "solidification",
      explication: "La solidification, c'est le passage de l'état liquide à l'état solide (l'eau qui devient glace).",
    },
  ],
  frise: [],
  jeRetiens: {
    resume:
      "L'eau peut être à l'état {1} (la glace), à l'état {2} (l'eau qui coule) ou à l'état {3} (la vapeur).",
    blancs: [
      { cle: "ps-eta-jr1", competence: "ST.MATIERE.ETATS", niveau: 2, attendu: "solide" },
      { cle: "ps-eta-jr2", competence: "ST.MATIERE.ETATS", niveau: 2, attendu: "liquide" },
      { cle: "ps-eta-jr3", competence: "ST.MATIERE.ETATS", niveau: 2, attendu: "gazeux" },
    ],
  },
};

// ==========================================================================
// CHAPITRE 2 — CLASSER LE VIVANT (ST.VIVANT.CLASSER)
// ==========================================================================
const CH_CLASSER: ParcoursChapitre = {
  cle: "sc_classer",
  theme: "Classer le vivant",
  titre: "Léa au parc animalier",
  competence: "ST.VIVANT.CLASSER",
  personnage: "Léa, qui visite un parc animalier",
  recit: [
    "Je m'appelle Léa. Aujourd'hui, je visite un parc animalier.",
    "Je vois des animaux très différents : des chats sauvages, des oiseaux, des poissons.",
    "La maîtresse nous apprend à les classer, c'est-à-dire à les ranger par familles.",
    "On regarde ce qui couvre leur corps : des poils, des plumes ou des écailles.",
    "Le chat a des poils, l'oiseau a des plumes, le poisson a des écailles.",
    "Certains animaux pondent des œufs : on dit qu'ils sont ovipares.",
    "D'autres, comme le chat, mettent au monde des petits déjà formés.",
    "Tous ces animaux ont une colonne vertébrale : ce sont des vertébrés.",
    "Les animaux qui se ressemblent et peuvent avoir des petits ensemble forment une espèce.",
    "J'ai adoré cette journée, j'ai appris plein de choses !",
  ],
  document: {
    scene: CLASSER_DOC,
    nature: "schéma",
    auteur: "Kerskol (schéma fait maison)",
    date: "aujourd'hui",
    legende: "On peut classer les animaux selon ce qui couvre leur corps : poils, plumes ou écailles.",
  },
  questions: [
    {
      cle: "ps-cla-q1",
      competence: "ST.VIVANT.CLASSER",
      niveau: 1,
      format: "qcm",
      consigne: "Dans le récit, qu'est-ce qui couvre le corps de l'oiseau ?",
      options: ["des plumes", "des poils", "des écailles"],
      attendu: "des plumes",
      explication: "Les oiseaux sont couverts de plumes. Les mammifères ont des poils, les poissons des écailles.",
    },
    {
      cle: "ps-cla-q2",
      competence: "ST.VIVANT.CLASSER",
      niveau: 2,
      format: "tri",
      consigne: "Classe chaque animal selon ce qui couvre son corps.",
      ...tri(
        ["des poils", "des plumes", "des écailles"],
        [
          ["le chat", "des poils"],
          ["l'oiseau", "des plumes"],
          ["le poisson", "des écailles"],
        ],
      ),
      explication: "Le chat a des poils, l'oiseau des plumes, le poisson des écailles.",
    },
    {
      cle: "ps-cla-q3",
      competence: "ST.VIVANT.CLASSER",
      niveau: 3,
      format: "qcm",
      consigne: "Comment appelle-t-on un animal qui pond des œufs ?",
      options: ["ovipare", "vivipare", "herbivore"],
      attendu: "ovipare",
      explication: "Un animal ovipare pond des œufs (la poule, l'oiseau). Un animal vivipare met au monde des petits déjà formés.",
    },
    {
      cle: "ps-cla-q4",
      competence: "ST.VIVANT.CLASSER",
      niveau: 4,
      format: "texte",
      consigne: "Écris le mot : un animal qui a un squelette avec une colonne vertébrale est un...",
      attendu: "vertébré",
      explication: "Un vertébré a une colonne vertébrale (le chat, l'oiseau, le poisson). Sans colonne, c'est un invertébré.",
    },
  ],
  frise: [],
  jeRetiens: {
    resume:
      "On classe les animaux selon ce qui couvre leur corps : {1}, plumes ou écailles. Un animal qui pond des œufs est {2}. Un animal qui a une colonne vertébrale est un {3}.",
    blancs: [
      { cle: "ps-cla-jr1", competence: "ST.VIVANT.CLASSER", niveau: 2, attendu: "poils" },
      { cle: "ps-cla-jr2", competence: "ST.VIVANT.CLASSER", niveau: 3, attendu: "ovipare" },
      { cle: "ps-cla-jr3", competence: "ST.VIVANT.CLASSER", niveau: 4, attendu: "vertébré" },
    ],
  },
};

export const PARCOURS_SCIENCES: ParcoursChapitre[] = [CH_ETATS, CH_CLASSER];

export function chapitreSciencesParCle(cle: string): ParcoursChapitre | undefined {
  return PARCOURS_SCIENCES.find((c) => c.cle === cle);
}

export function itemsParcoursSciencesTousQm(): QmItem[] {
  const out: QmItem[] = [];
  for (const c of PARCOURS_SCIENCES) {
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

export function estJusteParcoursSciencesQm(cle: string, saisie: string): boolean {
  const item = itemsParcoursSciencesTousQm().find((i) => i.cle === cle);
  if (!item) return false;
  return comparerQm(item.format, saisie, item.attendu);
}
