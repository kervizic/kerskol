// « Parcours d'Histoire » (HIST, CM1 - NOUVEAU PROGRAMME 2026). Methode validee
// par Manu (inspiree de Lumni « Chronos », Quelle Histoire, le jeu Timeline) :
// chaque CHAPITRE est un parcours en 4 etapes jouees dans l'ordre
//   1) RECIT : un court recit (8-12 phrases) raconte par un temoin fictif de
//      l'epoque, + un DOCUMENT (schema SVG maison) avec sa legende
//      « nature, auteur, date » ;
//   2) QUESTIONS : liees au recit et au document (comprehension, lecture de
//      document, vrai/faux justifie, vocabulaire du programme). Elles reutilisent
//      l'infrastructure « Questionner le monde » (type QmItem, formats
//      qcm/tri/ordre/texte, op serveur 'qm', table public.qm_item + verif_qm) et
//      les COMPETENCES HIST.* EXISTANTES : elles alimentent donc l'EMA existant
//      (revisions espacees), sans nouvelle competence ;
//   3) FRISE : chaque chapitre fait gagner 2-3 cartes-evenements (date + titre +
//      petite image) que l'enfant place dans l'ordre ; le SERVEUR verifie l'ordre
//      (RPC frise_placer) et stocke la frise PAR PROFIL (migration additive) ;
//   4) JE RETIENS : un resume de 3-4 phrases a trous (mots du vocabulaire
//      officiel), chaque trou etant un item 'texte' verifie par le serveur.
//
// VERITE HISTORIQUE (decision de Manu : « n'adoucis pas l'Histoire ») : contenu
// factuel au niveau d'un bon manuel de CM1 (guerres de religion, traite et
// esclavage, Code noir, 1789), sans euphemisme ni detail macabre. L'exemption de
// bienveillance stricte est deja en place pour la banque HIST.* cote serveur.
//
// SERVEUR SEUL JUGE : chaque question et chaque trou portent une `cle` stable ;
// le serveur lit public.qm_item WHERE cle = ... et compare. Un test croise
// (parcours.test.ts + supabase/tests/parcours_histoire_test.sql) garantit que la
// banque front correspond au seed SQL.

import type { QmItem, QmScene } from "../qm/types";
import { comparerQm, ordre, tri } from "../qm/types";

// Petites images des cartes de frise : schemas SVG maison (aucune image
// protegee). Le `type` est rendu par <FriseIcone> (friseIcones.tsx).
export type FriseIconeType =
  | "village"
  | "cathedrale"
  | "chateau"
  | "couronne"
  | "soleil"
  | "caravelle"
  | "planisphere"
  | "chaines"
  | "bastille"
  | "declaration";

// Periodes historiques (bandes de la frise). CM1 : on nomme surtout Moyen Age et
// Temps modernes ; on ajoute « contemporaine » (a partir de 1789) pour rester
// exact sans alourdir.
export type Periode = "moyen_age" | "temps_modernes" | "contemporaine";

// Carte-evenement, cote FRONT : ce que l'enfant voit quand il doit PLACER la
// carte (titre + petite image). La DATE reste la verite du SERVEUR (frise_carte_ref) :
// elle n'est revelee qu'une fois la carte correctement placee (frise_etat).
export interface FriseCarte {
  cle: string; // = frise_carte_ref.cle (PK serveur)
  titre: string; // titre court affiche sur la carte
  icone: FriseIconeType;
  // Donnees miroir du serveur (pour l'affichage apres placement et le mode demo).
  // Le jugement de l'ordre reste fait par le serveur (cle_tri).
  dateLabel: string; // ex. « 14 juillet 1789 »
  cleTri: number; // cle de tri chronologique (AAAAMMJJ) — miroir de frise_carte_ref.cle_tri
  periode: Periode;
}

// Document d'accompagnement du recit : un schema SVG maison + sa legende.
export interface ParcoursDocument {
  scene: QmScene;
  nature: string; // ex. « schema », « carte »
  auteur: string; // ex. « Kerskol »
  date: string; // ex. « aujourd'hui » (schema maison)
  legende: string; // une phrase courte qui explique ce que montre le document
}

// Un trou du « Je retiens » : un item 'texte' verifie par le serveur (op 'qm').
export interface JeRetiensBlanc {
  cle: string; // = qm_item.cle
  competence: string; // HIST.* (EMA existant)
  niveau: number; // 1..4
  attendu: string; // le mot du vocabulaire officiel
}

// Le « Je retiens » : un resume a trous. `resume` contient des marqueurs {1},
// {2}... remplaces par des champs de saisie (dans l'ordre de `blancs`).
export interface JeRetiens {
  resume: string; // ex. « Le domaine du seigneur s'appelle la {1}. »
  blancs: JeRetiensBlanc[];
}

export interface ParcoursChapitre {
  cle: string; // identifiant stable du chapitre (route, reprise)
  theme: string; // libelle du theme (groupe d'affichage)
  titre: string; // titre du chapitre
  competence: string; // HIST.* principale (frise + je retiens par defaut)
  personnage: string; // le temoin qui raconte (ex. « Jehan, fils de paysan »)
  recit: string[]; // 8-12 phrases courtes (une par element)
  document: ParcoursDocument;
  questions: QmItem[]; // reutilise QmItem (competence HIST.*, formats varies)
  frise: FriseCarte[]; // 2-3 cartes-evenements gagnees
  jeRetiens: JeRetiens;
}

// --------------------------------------------------------------------------
// Petits helpers de construction de scenes SVG (documents). On garde des
// primitives simples ; var(--kk-*) assure le theme clair/sombre.
// --------------------------------------------------------------------------
function texte(x: number, y: number, s: string, fontSize = 9): QmScene["els"][number] {
  return { t: "text", x, y, text: s, fontSize };
}

// ==========================================================================
// THEME 1 — LA VIE AU MOYEN AGE (XIe-XIIIe) : HIST.MOYENAGE
// ==========================================================================
const CH_MOYENAGE: ParcoursChapitre = {
  cle: "moyen_age",
  theme: "Le Moyen Âge (XIe-XIIIe siècle)",
  titre: "Un jour dans la seigneurie",
  competence: "HIST.MOYENAGE",
  personnage: "Jehan, fils de paysan, vers l'an 1200",
  recit: [
    "Je m'appelle Jehan. Je suis le fils d'un paysan.",
    "Nous vivons dans une seigneurie, le grand domaine d'un seigneur.",
    "Du matin au soir, mes parents travaillent la terre.",
    "Une partie de ce que nous récoltons, nous devons le donner au seigneur.",
    "Nous lui devons aussi des journées de travail gratuites : c'est la corvée.",
    "À l'église, nous payons un impôt sur la récolte : la dîme.",
    "Au milieu du village, le château du seigneur nous protège.",
    "Le dimanche, toute la paroisse se retrouve dans l'église.",
    "Les moines de l'abbaye, eux, prient et recopient de gros livres.",
    "Ma vie est rude, mais je connais chaque chemin de notre village.",
  ],
  document: {
    scene: {
      kind: "scene",
      viewBox: "0 0 200 120",
      els: [
        // sol
        { t: "line", x1: 0, y1: 100, x2: 200, y2: 100, stroke: "var(--kk-border)", sw: 1 },
        // chateau (sur une petite butte, a gauche)
        { t: "path", d: "M20 100 L20 70 L30 70 L30 60 L40 60 L40 70 L50 70 L50 100 Z", stroke: "var(--kk-text)", sw: 1.5 },
        { t: "rect", x: 32, y: 82, w: 6, h: 18 },
        texte(35, 112, "château"),
        // eglise (au centre, avec clocher et croix)
        { t: "rect", x: 92, y: 74, w: 22, h: 26 },
        { t: "polygon", points: "92,74 103,58 114,74", stroke: "var(--kk-text)", sw: 1.5 },
        { t: "line", x1: 103, y1: 58, x2: 103, y2: 50, stroke: "var(--kk-text)", sw: 1.5 },
        { t: "line", x1: 99, y1: 53, x2: 107, y2: 53, stroke: "var(--kk-text)", sw: 1.5 },
        texte(103, 112, "église"),
        // maisons du village (a droite)
        { t: "rect", x: 150, y: 86, w: 16, h: 14 },
        { t: "polygon", points: "150,86 158,78 166,86", stroke: "var(--kk-text)", sw: 1.5 },
        { t: "rect", x: 172, y: 88, w: 14, h: 12 },
        { t: "polygon", points: "172,88 179,81 186,88", stroke: "var(--kk-text)", sw: 1.5 },
        texte(168, 112, "village"),
        // champs (traits devant)
        { t: "line", x1: 60, y1: 100, x2: 88, y2: 100, stroke: "var(--kk-border)", sw: 1, dashed: true },
        texte(74, 96, "champs", 7),
      ],
      zones: [],
    },
    nature: "schéma",
    auteur: "Kerskol (schéma fait maison)",
    date: "aujourd'hui",
    legende: "Une seigneurie au Moyen Âge : le château, l'église et le village des paysans.",
  },
  questions: [
    {
      cle: "pa-moy-q1",
      competence: "HIST.MOYENAGE",
      niveau: 1,
      format: "qcm",
      consigne: "Dans le récit, comment s'appelle le grand domaine du seigneur où vit Jehan ?",
      options: ["la seigneurie", "la récréation", "la mairie"],
      attendu: "la seigneurie",
      explication: "La seigneurie est le domaine du seigneur. Les paysans y vivent et y travaillent.",
    },
    {
      cle: "pa-moy-q2",
      competence: "HIST.MOYENAGE",
      niveau: 2,
      format: "qcm",
      consigne: "Quel impôt les paysans paient-ils à l'Église sur leur récolte ?",
      options: ["la dîme", "la monnaie", "le péage"],
      attendu: "la dîme",
      explication: "La dîme est l'impôt payé à l'Église, environ un dixième de la récolte.",
    },
    {
      cle: "pa-moy-q3",
      competence: "HIST.MOYENAGE",
      niveau: 3,
      format: "tri",
      consigne: "Regarde le document. Classe chaque bâtiment : est-il au seigneur ou à l'Église ?",
      ...tri(
        ["le seigneur", "l'Église"],
        [
          ["le château", "le seigneur"],
          ["le donjon", "le seigneur"],
          ["l'église du village", "l'Église"],
          ["l'abbaye", "l'Église"],
        ],
      ),
      explication: "Le château et le donjon protègent le seigneur. L'église et l'abbaye appartiennent à l'Église.",
    },
    {
      cle: "pa-moy-q4",
      competence: "HIST.MOYENAGE",
      niveau: 4,
      format: "texte",
      consigne: "Écris le mot : le travail gratuit que les paysans doivent au seigneur, c'est la …",
      attendu: "corvée",
      explication: "La corvée, c'est le travail gratuit dû au seigneur (réparer un chemin, faucher ses champs…).",
    },
  ],
  frise: [
    { cle: "fri-1000-villages", titre: "Des villages partout", icone: "village", dateLabel: "vers l'an 1000", cleTri: 10000101, periode: "moyen_age" },
    { cle: "fri-1163-notredame", titre: "On commence Notre-Dame de Paris", icone: "cathedrale", dateLabel: "1163", cleTri: 11630101, periode: "moyen_age" },
  ],
  jeRetiens: {
    resume:
      "Au Moyen Âge, le domaine d'un seigneur s'appelle la {1}. Les paysans lui doivent un travail gratuit, la {2}. Ils paient aussi un impôt à l'Église sur leur récolte, la {3}.",
    blancs: [
      { cle: "pa-moy-jr1", competence: "HIST.MOYENAGE", niveau: 2, attendu: "seigneurie" },
      { cle: "pa-moy-jr2", competence: "HIST.MOYENAGE", niveau: 3, attendu: "corvée" },
      { cle: "pa-moy-jr3", competence: "HIST.MOYENAGE", niveau: 2, attendu: "dîme" },
    ],
  },
};

// ==========================================================================
// THEME 2 — LA MONARCHIE EN FRANCE (XVIe-XVIIe) : HIST.MONARCHIE
// ==========================================================================
const CH_MONARCHIE: ParcoursChapitre = {
  cle: "monarchie",
  theme: "La monarchie en France (XVIe-XVIIe siècle)",
  titre: "Un apprenti peintre à Amboise",
  competence: "HIST.MONARCHIE",
  personnage: "Un jeune apprenti peintre, à Amboise, en 1517",
  recit: [
    "Je suis apprenti peintre, au bord de la Loire, en 1517.",
    "Notre roi, François Ier, aime les arts et les beaux châteaux.",
    "Il a invité en France un grand savant italien : Léonard de Vinci.",
    "Léonard habite tout près, à Amboise. Je l'ai vu dessiner des machines !",
    "C'est l'époque de la Renaissance : on construit, on peint, on invente.",
    "Plus tard, la France connaîtra des guerres de religion très dures.",
    "Encore plus tard, un roi gouvernera seul, tout-puissant : Louis XIV.",
    "On l'appellera le Roi-Soleil, et il vivra au château de Versailles.",
    "Mais aujourd'hui, je prépare mes couleurs et je regarde le fleuve.",
  ],
  document: {
    scene: {
      kind: "scene",
      viewBox: "0 0 200 120",
      els: [
        { t: "line", x1: 0, y1: 104, x2: 200, y2: 104, stroke: "var(--kk-border)", sw: 1 },
        // chateau Renaissance : corps + tours rondes a toit conique
        { t: "rect", x: 70, y: 60, w: 60, h: 44 },
        { t: "rect", x: 56, y: 70, w: 16, h: 34 },
        { t: "polygon", points: "54,70 64,52 74,70", stroke: "var(--kk-text)", sw: 1.5 },
        { t: "rect", x: 128, y: 70, w: 16, h: 34 },
        { t: "polygon", points: "126,70 136,52 146,70", stroke: "var(--kk-text)", sw: 1.5 },
        // tour centrale
        { t: "polygon", points: "70,60 100,42 130,60", stroke: "var(--kk-text)", sw: 1.5 },
        // fenetres
        { t: "rect", x: 84, y: 72, w: 8, h: 14 },
        { t: "rect", x: 108, y: 72, w: 8, h: 14 },
        { t: "rect", x: 96, y: 86, w: 8, h: 18 },
        texte(100, 118, "un château de la Loire"),
      ],
      zones: [],
    },
    nature: "schéma",
    auteur: "Kerskol (schéma fait maison)",
    date: "aujourd'hui",
    legende: "À la Renaissance, les rois font construire de beaux châteaux au bord de la Loire.",
  },
  questions: [
    {
      cle: "pa-nar-q1",
      competence: "HIST.MONARCHIE",
      niveau: 1,
      format: "qcm",
      consigne: "Dans le récit, quel roi invite Léonard de Vinci en France ?",
      options: ["François Ier", "Jules César", "Napoléon"],
      attendu: "François Ier",
      explication: "François Ier, roi de la Renaissance, aimait les arts. Il invita Léonard de Vinci à Amboise.",
    },
    {
      cle: "pa-nar-q2",
      competence: "HIST.MONARCHIE",
      niveau: 2,
      format: "qcm",
      consigne: "En 1572, catholiques et protestants s'affrontent. Comment appelle-t-on le massacre de protestants à Paris ?",
      options: ["le massacre de la Saint-Barthélemy", "la fête de la musique", "le carnaval"],
      attendu: "le massacre de la Saint-Barthélemy",
      explication: "Pendant les guerres de religion, le massacre de la Saint-Barthélemy (1572) fit de nombreux morts protestants.",
    },
    {
      cle: "pa-nar-q3",
      competence: "HIST.MONARCHIE",
      niveau: 3,
      format: "qcm",
      consigne: "Louis XIV décide tout, seul. Comment appelle-t-on cette façon de gouverner ?",
      options: ["la monarchie absolue", "la république", "la démocratie"],
      attendu: "la monarchie absolue",
      explication: "Dans la monarchie absolue, le roi gouverne seul : il ne partage son pouvoir avec personne.",
    },
    {
      cle: "pa-nar-q4",
      competence: "HIST.MONARCHIE",
      niveau: 4,
      format: "texte",
      consigne: "Écris le mot : en 1598, Henri IV signe l'édit de … pour ramener la paix entre les religions.",
      attendu: "Nantes",
      explication: "L'édit de Nantes (1598) autorisait les protestants à pratiquer leur religion : il ramena la paix.",
    },
  ],
  frise: [
    { cle: "fri-1515-marignan", titre: "François Ier gagne à Marignan", icone: "couronne", dateLabel: "1515", cleTri: 15150913, periode: "temps_modernes" },
    { cle: "fri-1598-nantes", titre: "L'édit de Nantes (Henri IV)", icone: "chateau", dateLabel: "1598", cleTri: 15980413, periode: "temps_modernes" },
    { cle: "fri-1682-versailles", titre: "Louis XIV s'installe à Versailles", icone: "soleil", dateLabel: "1682", cleTri: 16820506, periode: "temps_modernes" },
  ],
  jeRetiens: {
    resume:
      "Au XVIe siècle, c'est la {1} : les rois aiment les arts. Plus tard, Louis XIV gouverne seul : c'est la monarchie {2}. Il s'installe au château de {3}.",
    blancs: [
      { cle: "pa-nar-jr1", competence: "HIST.MONARCHIE", niveau: 2, attendu: "Renaissance" },
      { cle: "pa-nar-jr2", competence: "HIST.MONARCHIE", niveau: 3, attendu: "absolue" },
      { cle: "pa-nar-jr3", competence: "HIST.MONARCHIE", niveau: 2, attendu: "Versailles" },
    ],
  },
};

// ==========================================================================
// THEME 3a — EXPLORATIONS ET CONQUÊTES (XVe-XVIe) : HIST.EXPLORATIONS
// ==========================================================================
const CH_EXPLORATIONS: ParcoursChapitre = {
  cle: "explorations",
  theme: "Explorations et conquêtes (XVe-XVIe siècle)",
  titre: "Le tour du monde de Magellan",
  competence: "HIST.EXPLORATIONS",
  personnage: "Un marin de l'expédition de Magellan, parti en 1519",
  recit: [
    "Je suis marin. En 1519, je pars avec le capitaine Magellan.",
    "Nos bateaux s'appellent des caravelles : légers et rapides.",
    "Pour trouver notre route, nous suivons les étoiles et la boussole.",
    "Nous traversons l'océan Atlantique, puis longeons l'Amérique.",
    "Un jour, nous passons dans un immense océan : le Pacifique.",
    "Le voyage est très long. Parfois, nous avons faim et soif.",
    "Notre capitaine Magellan meurt au cours du voyage, loin de chez lui.",
    "Pourtant, un de nos bateaux revient enfin en Europe, en 1522.",
    "Nous sommes les premiers à avoir fait le tour de la Terre !",
    "Désormais, on sait que la Terre est bien une boule.",
  ],
  document: {
    scene: {
      kind: "scene",
      viewBox: "0 0 200 110",
      els: [
        // planisphere tres simplifie : deux masses de terre
        { t: "rect", x: 0, y: 0, w: 200, h: 110, stroke: "var(--kk-border)", sw: 1 },
        { t: "path", d: "M30 30 q10 -12 24 -6 q14 6 8 22 q-6 16 -22 12 q-16 -4 -10 -28 Z", stroke: "var(--kk-text)", sw: 1.3 },
        texte(42, 48, "Europe", 7),
        { t: "path", d: "M118 24 q16 -6 22 10 q6 16 -4 34 q-10 18 -24 8 q-12 -10 -6 -32 q4 -16 12 -20 Z", stroke: "var(--kk-text)", sw: 1.3 },
        texte(130, 56, "Amérique", 7),
        // route (fleche) Europe -> Amerique -> au-dela
        { t: "polyline", points: "52,46 84,60 116,54", stroke: "var(--kk-accent)", sw: 1.6, dashed: true },
        { t: "polyline", points: "136,70 150,86 176,90", stroke: "var(--kk-accent)", sw: 1.6, dashed: true },
        texte(100, 100, "la route des explorateurs", 7),
      ],
      zones: [],
    },
    nature: "carte",
    auteur: "Kerskol (schéma fait maison)",
    date: "aujourd'hui",
    legende: "Au XVe et XVIe siècle, les explorateurs cherchent de nouvelles routes sur les océans.",
  },
  questions: [
    {
      cle: "pa-exp-q1",
      competence: "HIST.EXPLORATIONS",
      niveau: 1,
      format: "qcm",
      consigne: "Comment s'appellent les bateaux légers des explorateurs dans le récit ?",
      options: ["les caravelles", "les sous-marins", "les pédalos"],
      attendu: "les caravelles",
      explication: "La caravelle est un bateau léger et rapide, parfait pour les longs voyages de découverte.",
    },
    {
      cle: "pa-exp-q2",
      competence: "HIST.EXPLORATIONS",
      niveau: 2,
      format: "qcm",
      consigne: "Quel instrument aide les marins à trouver leur direction ?",
      options: ["la boussole", "la télévision", "le réveil"],
      attendu: "la boussole",
      explication: "La boussole indique toujours le nord : elle aide les marins à garder leur direction.",
    },
    {
      cle: "pa-exp-q3",
      competence: "HIST.EXPLORATIONS",
      niveau: 3,
      format: "ordre",
      consigne: "Range le voyage dans l'ordre, du départ à l'arrivée.",
      ...ordre(["l'Europe", "l'océan Atlantique", "l'Amérique", "l'océan Pacifique"]),
      explication: "Les marins partent d'Europe, traversent l'Atlantique, longent l'Amérique, puis entrent dans le Pacifique.",
    },
    {
      cle: "pa-exp-q4",
      competence: "HIST.EXPLORATIONS",
      niveau: 4,
      format: "texte",
      consigne: "Écris le nom : en 1492, Christophe … atteint l'Amérique sans le savoir.",
      attendu: "Colomb",
      explication: "Christophe Colomb atteint l'Amérique en 1492 en cherchant une nouvelle route vers l'Asie.",
    },
  ],
  frise: [
    { cle: "fri-1492-colomb", titre: "Christophe Colomb atteint l'Amérique", icone: "planisphere", dateLabel: "1492", cleTri: 14921012, periode: "temps_modernes" },
    { cle: "fri-1519-magellan", titre: "Magellan part faire le tour du monde", icone: "caravelle", dateLabel: "1519", cleTri: 15190920, periode: "temps_modernes" },
  ],
  jeRetiens: {
    resume:
      "Les explorateurs voyagent sur des {1} et s'orientent avec une {2}. En 1492, Christophe Colomb atteint l'{3}.",
    blancs: [
      { cle: "pa-exp-jr1", competence: "HIST.EXPLORATIONS", niveau: 2, attendu: "caravelles" },
      { cle: "pa-exp-jr2", competence: "HIST.EXPLORATIONS", niveau: 2, attendu: "boussole" },
      { cle: "pa-exp-jr3", competence: "HIST.EXPLORATIONS", niveau: 2, attendu: "Amérique" },
    ],
  },
};

// ==========================================================================
// THEME 3b — LA TRAITE ET L'ESCLAVAGE (XVe-XVIIIe) : HIST.EXPLORATIONS
// Chapitre factuel et DIGNE (« n'adoucis pas l'Histoire », sans detail macabre).
// ==========================================================================
const CH_TRAITE: ParcoursChapitre = {
  cle: "traite",
  theme: "Explorations et conquêtes (XVe-XVIe siècle)",
  titre: "La traite et l'esclavage",
  competence: "HIST.EXPLORATIONS",
  personnage: "Kofi, un jeune homme enlevé en Afrique au XVIIe siècle",
  recit: [
    "Je m'appelle Kofi. Je vivais dans un village, en Afrique.",
    "Un jour, des hommes m'ont capturé pour me vendre.",
    "On m'a fait traverser l'océan sur un bateau, enchaîné.",
    "Ce commerce d'êtres humains s'appelle la traite des esclaves.",
    "De l'autre côté de l'océan, on m'a vendu comme esclave.",
    "Un esclave n'est pas libre : il doit travailler sans être payé.",
    "Je travaille dans les champs de canne à sucre, du matin au soir.",
    "En 1685, un texte du roi, le Code noir, décide du sort des esclaves.",
    "Ce n'est pas juste : personne ne devrait appartenir à quelqu'un d'autre.",
    "Bien plus tard, des gens se battront pour abolir l'esclavage.",
  ],
  document: {
    scene: {
      kind: "scene",
      viewBox: "0 0 200 120",
      els: [
        // triangle de la traite : 3 continents + fleches
        { t: "circle", cx: 46, cy: 36, r: 10, stroke: "var(--kk-text)", sw: 1.3 },
        texte(46, 20, "Europe", 7),
        { t: "circle", cx: 150, cy: 44, r: 10, stroke: "var(--kk-text)", sw: 1.3 },
        texte(150, 28, "Afrique", 7),
        { t: "circle", cx: 70, cy: 96, r: 10, stroke: "var(--kk-text)", sw: 1.3 },
        texte(70, 114, "Amérique", 7),
        // fleches du commerce triangulaire
        { t: "polyline", points: "56,40 130,44", stroke: "var(--kk-accent)", sw: 1.5, dashed: true },
        { t: "polyline", points: "146,52 82,88", stroke: "var(--kk-accent)", sw: 1.5, dashed: true },
        { t: "polyline", points: "66,86 48,46", stroke: "var(--kk-accent)", sw: 1.5, dashed: true },
        texte(100, 70, "la traite", 8),
      ],
      zones: [],
    },
    nature: "carte",
    auteur: "Kerskol (schéma fait maison)",
    date: "aujourd'hui",
    legende: "La traite : des millions d'Africains furent déportés et vendus comme esclaves en Amérique.",
  },
  questions: [
    {
      cle: "pa-tra-q1",
      competence: "HIST.EXPLORATIONS",
      niveau: 2,
      format: "qcm",
      consigne: "Comment appelle-t-on le commerce d'êtres humains déportés d'Afrique ?",
      options: ["la traite des esclaves", "le marché aux fleurs", "la foire du village"],
      attendu: "la traite des esclaves",
      explication: "La traite des esclaves est le commerce qui déporta des millions d'Africains pour les vendre.",
    },
    {
      cle: "pa-tra-q2",
      competence: "HIST.EXPLORATIONS",
      niveau: 3,
      format: "qcm",
      consigne: "Quel texte du roi, en 1685, règle le sort des esclaves dans les colonies ?",
      options: ["le Code noir", "le livre de recettes", "le règlement de l'école"],
      attendu: "le Code noir",
      explication: "Le Code noir (1685) était un texte royal qui organisait l'esclavage dans les colonies françaises.",
    },
    {
      cle: "pa-tra-q3",
      competence: "HIST.EXPLORATIONS",
      niveau: 3,
      format: "qcm",
      consigne: "Pourquoi l'esclavage est-il injuste ? Choisis la bonne explication.",
      options: [
        "parce qu'il prive des personnes de leur liberté",
        "parce que les bateaux allaient trop vite",
        "parce qu'il faisait trop chaud",
      ],
      attendu: "parce qu'il prive des personnes de leur liberté",
      explication: "L'esclavage est injuste : il prive des êtres humains de leur liberté et les traite comme des objets.",
    },
    {
      cle: "pa-tra-q4",
      competence: "HIST.EXPLORATIONS",
      niveau: 4,
      format: "texte",
      consigne: "Écris le continent d'où partaient les personnes capturées : l'…",
      attendu: "Afrique",
      explication: "Les personnes réduites en esclavage étaient capturées en Afrique, puis déportées vers l'Amérique.",
    },
  ],
  frise: [
    { cle: "fri-1685-codenoir", titre: "Le Code noir", icone: "chaines", dateLabel: "1685", cleTri: 16850301, periode: "temps_modernes" },
    { cle: "fri-1794-abolition", titre: "La France abolit l'esclavage (Révolution)", icone: "declaration", dateLabel: "4 février 1794", cleTri: 17940204, periode: "contemporaine" },
  ],
  jeRetiens: {
    resume:
      "Le commerce d'êtres humains déportés d'Afrique s'appelle la {1}. Un {2} n'est pas libre et doit travailler sans être payé. En 1685, le roi écrit le {3}.",
    blancs: [
      { cle: "pa-tra-jr1", competence: "HIST.EXPLORATIONS", niveau: 2, attendu: "traite" },
      { cle: "pa-tra-jr2", competence: "HIST.EXPLORATIONS", niveau: 2, attendu: "esclave" },
      { cle: "pa-tra-jr3", competence: "HIST.EXPLORATIONS", niveau: 3, attendu: "Code noir" },
    ],
  },
};

// ==========================================================================
// THEME 4 — 1789, UNE ANNÉE RÉVOLUTIONNAIRE : HIST.REVOLUTION
// ==========================================================================
const CH_REVOLUTION: ParcoursChapitre = {
  cle: "revolution",
  theme: "1789, la Révolution",
  titre: "La marche des femmes sur Versailles",
  competence: "HIST.REVOLUTION",
  personnage: "Une femme de la Halle de Paris, en octobre 1789",
  recit: [
    "Je vends du poisson à la Halle de Paris. Nous sommes en 1789.",
    "Le pain coûte trop cher, et parfois il n'y en a plus du tout.",
    "Au printemps, le roi a réuni les États généraux pour parler des impôts.",
    "Le 14 juillet, le peuple en colère a pris la Bastille, une prison.",
    "En août, des députés ont voté la Déclaration des droits de l'Homme.",
    "Ce texte dit que les hommes naissent libres et égaux en droits.",
    "Mais nous avons toujours faim. Alors, en octobre, nous décidons d'agir.",
    "Avec des milliers de femmes, je marche jusqu'au château de Versailles.",
    "Nous voulons ramener le roi à Paris, pour qu'il nous écoute.",
    "C'est la Révolution : le peuple veut changer les choses.",
  ],
  document: {
    scene: {
      kind: "scene",
      viewBox: "0 0 200 120",
      els: [
        { t: "line", x1: 0, y1: 104, x2: 200, y2: 104, stroke: "var(--kk-border)", sw: 1 },
        // la Bastille : grosse tour crenelee
        { t: "rect", x: 128, y: 48, w: 44, h: 56 },
        { t: "rect", x: 128, y: 44, w: 8, h: 6 },
        { t: "rect", x: 142, y: 44, w: 8, h: 6 },
        { t: "rect", x: 156, y: 44, w: 8, h: 6 },
        { t: "rect", x: 144, y: 82, w: 12, h: 22 },
        texte(150, 118, "la Bastille", 8),
        // une cocarde / le peuple (cercles) a gauche
        { t: "circle", cx: 40, cy: 92, r: 6, stroke: "var(--kk-text)", sw: 1.3 },
        { t: "circle", cx: 56, cy: 92, r: 6, stroke: "var(--kk-text)", sw: 1.3 },
        { t: "circle", cx: 72, cy: 92, r: 6, stroke: "var(--kk-text)", sw: 1.3 },
        texte(56, 112, "le peuple", 7),
        { t: "polyline", points: "82,90 120,78", stroke: "var(--kk-accent)", sw: 1.6, dashed: true },
      ],
      zones: [],
    },
    nature: "schéma",
    auteur: "Kerskol (schéma fait maison)",
    date: "aujourd'hui",
    legende: "En 1789, le peuple de Paris prend la Bastille, une prison symbole du pouvoir du roi.",
  },
  questions: [
    {
      cle: "pa-rev-q1",
      competence: "HIST.REVOLUTION",
      niveau: 1,
      format: "qcm",
      consigne: "Quelle prison le peuple de Paris prend-il le 14 juillet 1789 ?",
      options: ["la Bastille", "la bibliothèque", "la gare"],
      attendu: "la Bastille",
      explication: "Le 14 juillet 1789, le peuple prend la Bastille, une prison symbole du pouvoir du roi.",
    },
    {
      cle: "pa-rev-q2",
      competence: "HIST.REVOLUTION",
      niveau: 2,
      format: "qcm",
      consigne: "Quel texte, voté en août 1789, dit que les hommes naissent libres et égaux ?",
      options: [
        "la Déclaration des droits de l'Homme et du citoyen",
        "la liste des courses",
        "le carnet de notes",
      ],
      attendu: "la Déclaration des droits de l'Homme et du citoyen",
      explication: "La Déclaration des droits de l'Homme et du citoyen (1789) affirme que les hommes naissent libres et égaux en droits.",
    },
    {
      cle: "pa-rev-q3",
      competence: "HIST.REVOLUTION",
      niveau: 3,
      format: "ordre",
      consigne: "Range ces événements de 1789 dans l'ordre.",
      ...ordre([
        "la réunion des États généraux",
        "la prise de la Bastille",
        "la Déclaration des droits de l'Homme",
      ]),
      explication: "En 1789 : d'abord les États généraux (printemps), puis la prise de la Bastille (14 juillet), puis la Déclaration des droits (août).",
    },
    {
      cle: "pa-rev-q4",
      competence: "HIST.REVOLUTION",
      niveau: 4,
      format: "texte",
      consigne: "Écris la date de la fête nationale française (jour et mois) : le …",
      attendu: "14 juillet",
      explication: "Le 14 juillet est la fête nationale : il rappelle la prise de la Bastille en 1789.",
    },
  ],
  frise: [
    { cle: "fri-1789-bastille", titre: "Prise de la Bastille", icone: "bastille", dateLabel: "14 juillet 1789", cleTri: 17890714, periode: "contemporaine" },
    { cle: "fri-1789-declaration", titre: "Déclaration des droits de l'Homme", icone: "declaration", dateLabel: "26 août 1789", cleTri: 17890826, periode: "contemporaine" },
  ],
  jeRetiens: {
    resume:
      "En 1789, le peuple prend la {1} le 14 juillet. Les députés votent la Déclaration des {2} de l'Homme et du citoyen. C'est la {3} française.",
    blancs: [
      { cle: "pa-rev-jr1", competence: "HIST.REVOLUTION", niveau: 2, attendu: "Bastille" },
      { cle: "pa-rev-jr2", competence: "HIST.REVOLUTION", niveau: 2, attendu: "droits" },
      { cle: "pa-rev-jr3", competence: "HIST.REVOLUTION", niveau: 2, attendu: "Révolution" },
    ],
  },
};

// ==========================================================================
// Catalogue ordonne des chapitres (ordre pedagogique = ordre chronologique).
// ==========================================================================
export const PARCOURS_HISTOIRE: ParcoursChapitre[] = [
  CH_MOYENAGE,
  CH_MONARCHIE,
  CH_EXPLORATIONS,
  CH_TRAITE,
  CH_REVOLUTION,
];

// Un chapitre par sa cle.
export function chapitreParCle(cle: string): ParcoursChapitre | undefined {
  return PARCOURS_HISTOIRE.find((c) => c.cle === cle);
}

// TOUS les items 'qm' du parcours (questions + trous du « je retiens ») : sert au
// seed SQL miroir et au test croise front <-> SQL.
export function itemsParcoursTousQm(): QmItem[] {
  const out: QmItem[] = [];
  for (const c of PARCOURS_HISTOIRE) {
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

// Toutes les cartes de frise du parcours (miroir de frise_carte_ref).
export function friseCartesToutes(): FriseCarte[] {
  return PARCOURS_HISTOIRE.flatMap((c) => c.frise);
}

// Une carte de frise par sa cle.
export function friseCarteParCle(cle: string): FriseCarte | undefined {
  return friseCartesToutes().find((c) => c.cle === cle);
}

// Juge LOCAL (mode demo + feedback immediat) : miroir du serveur (verif_qm) pour
// une question ou un trou du « je retiens ». Le serveur reste seul juge en prod.
export function estJusteParcoursQm(cle: string, saisie: string): boolean {
  const item = itemsParcoursTousQm().find((i) => i.cle === cle);
  if (!item) return false;
  return comparerQm(item.format, saisie, item.attendu);
}

// Juge LOCAL de l'ordre de la frise (mode demo) : miroir du serveur (frise_placer).
// `ordreCles` est correct si c'est l'ordre croissant des cles de tri.
export function estJusteFriseOrdre(ordreCles: string[]): boolean {
  const tris = ordreCles.map((cle) => friseCarteParCle(cle)?.cleTri);
  if (tris.some((t) => t === undefined)) return false;
  for (let i = 1; i < tris.length; i++) {
    if ((tris[i] as number) < (tris[i - 1] as number)) return false;
  }
  return true;
}
