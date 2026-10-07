// Banque d'exercices de GRAMMAIRE (francais, CE2, programme cycle 2 revise 2024).
//
// Cinq competences, 4 niveaux chacune :
//   FR.GRAM.NATURE          nature des mots (nom, verbe, adjectif, determinant,
//                           pronom personnel sujet) ;
//   FR.GRAM.SUJET_VERBE     trouver le verbe conjugue puis son sujet ;
//   FR.GRAM.TYPES_PHRASES   types (declarative / interrogative / exclamative /
//                           imperative) ET formes (affirmative / negative) ;
//   FR.GRAM.PONCTUATION     point, point d'interrogation, point d'exclamation,
//                           majuscule ;
//   FR.GRAM.GROUPE_NOMINAL  determinant + nom + adjectif, genre et nombre DU
//                           groupe (IDENTIFICATION ; l'accord orthographique est
//                           deja travaille par la dictee detective, on ne
//                           doublonne pas).
//
// Trois formats de reponse, progression pedagogique (decision OBLIGATOIRE) :
//   N1 : QCM a gros boutons (le plus facile) ;
//   N2 : CLIC sur un mot dans une phrase courte (mots touchables) ;
//   N3 : CLIC sur un mot dans une phrase plus longue (plus de distracteurs),
//        ou QCM pour les notions sans mot a montrer (types, ponctuation) ;
//   N4 : reponse LIBRE tapee QUAND C'EST PERTINENT (nature, sujet/verbe, groupe
//        nominal) ; pour les types de phrases et la ponctuation, la reponse
//        libre n'a pas de sens -> QCM (le plus difficile des QCM).
//
// Le SERVEUR reste SEUL JUGE : cette banque est le MIROIR EXACT de la table de
// reference public.grammaire_item (migration 0041). verif_grammaire compare la
// saisie normalisee a `attendu`. Un test croise garantit front == SQL
// (frontend/.../francais/grammaire.test.ts + supabase/tests/grammaire_test.sql).
//
// Contraintes de redaction (enfant de 8 ans, ORAL) : phrases courtes, aucun
// symbole dans les messages lus, jamais deux formes homophones opposees, un
// exemple concret a chaque correction.

import { normaliser } from "../diagnostic/lettres";
import { normaliserMot } from "./dictee";

export type GramFormat = "qcm" | "clic" | "texte";

// Donnees de RENDU d'un item (ce que le generateur pose dans l'exercice et que
// le composant <Grammaire> affiche) : tout GramItem sauf competence / niveau
// (portes par l'exercice lui-meme).
export type GramRender = Pick<
  GramItem,
  "cle" | "format" | "consigne" | "phrase" | "options" | "attendu" | "explication"
>;

export interface GramItem {
  cle: string; // identifiant stable (PK cote serveur)
  competence: string; // FR.GRAM.*
  niveau: number; // 1..4
  format: GramFormat;
  consigne: string; // instruction (redigee pour l'oral)
  phrase: string; // phrase affichee ; en mode clic, les mots sont touchables
  options?: string[]; // mode qcm : propositions (sinon absent)
  attendu: string; // reponse attendue (normalisee a la comparaison)
  explication: string; // correction courte et valorisante, avec un exemple
}

// Comparaison miroir du serveur : qcm -> normaliser (accents gardes, minuscules,
// apostrophes et espaces normalises) ; clic/texte -> normaliserMot (en plus,
// ponctuation de bord retiree, car on clique un mot d'une phrase ponctuee).
export function comparerGrammaire(format: GramFormat, saisie: string, attendu: string): boolean {
  if (format === "qcm") return normaliser(saisie) === normaliser(attendu);
  return normaliserMot(saisie) === normaliserMot(attendu);
}

// --------------------------------------------------------------------------
// BANQUE. Chaque item est autonome. `phrase` est tokenisee par les espaces
// pour le mode clic (chaque mot devient un bouton). En mode qcm, `phrase` sert
// de contexte (peut etre une phrase a classer) ; `options` porte les boutons.
// --------------------------------------------------------------------------
export const BANQUE_GRAMMAIRE: GramItem[] = [
  // =========================================================================
  // FR.GRAM.NATURE — nom, verbe, adjectif, determinant, pronom
  // =========================================================================
  // N1 : QCM « quel mot est un … ? »
  { cle: "nature-n1-nom", competence: "FR.GRAM.NATURE", niveau: 1, format: "qcm",
    consigne: "Quel mot est un nom ?", phrase: "",
    options: ["chat", "vite", "manger"], attendu: "chat",
    explication: "Un nom désigne une personne, un animal ou une chose. Le mot chat est un nom, c'est un animal." },
  { cle: "nature-n1-verbe", competence: "FR.GRAM.NATURE", niveau: 1, format: "qcm",
    consigne: "Quel mot est un verbe ?", phrase: "",
    options: ["joue", "rouge", "table"], attendu: "joue",
    explication: "Un verbe dit une action. Le mot joue est un verbe, c'est ce qu'on fait." },
  { cle: "nature-n1-adjectif", competence: "FR.GRAM.NATURE", niveau: 1, format: "qcm",
    consigne: "Quel mot est un adjectif ?", phrase: "",
    options: ["grand", "chien", "dormir"], attendu: "grand",
    explication: "Un adjectif décrit, il dit comment est la chose. Le mot grand dit la taille." },
  { cle: "nature-n1-determinant", competence: "FR.GRAM.NATURE", niveau: 1, format: "qcm",
    consigne: "Quel mot est un déterminant ?", phrase: "",
    options: ["le", "chat", "noir"], attendu: "le",
    explication: "Le déterminant est un petit mot placé devant le nom. Le mot le est un déterminant, comme dans le chat." },
  { cle: "nature-n1-pronom", competence: "FR.GRAM.NATURE", niveau: 1, format: "qcm",
    consigne: "Quel mot est un pronom ?", phrase: "",
    options: ["elle", "fille", "saute"], attendu: "elle",
    explication: "Un pronom remplace un nom. Le mot elle remplace une personne, comme la fille." },
  // N2 : clic sur un mot dans une phrase courte
  { cle: "nature-n2-nom", competence: "FR.GRAM.NATURE", niveau: 2, format: "clic",
    consigne: "Clique sur le nom.", phrase: "Le chien joue.",
    attendu: "chien",
    explication: "Le nom désigne l'animal. Ici, le nom est chien." },
  { cle: "nature-n2-verbe", competence: "FR.GRAM.NATURE", niveau: 2, format: "clic",
    consigne: "Clique sur le verbe.", phrase: "La fille chante.",
    attendu: "chante",
    explication: "Le verbe dit l'action. Ici, l'action est chante." },
  { cle: "nature-n2-adjectif", competence: "FR.GRAM.NATURE", niveau: 2, format: "clic",
    consigne: "Clique sur l'adjectif.", phrase: "Le petit chat dort.",
    attendu: "petit",
    explication: "L'adjectif décrit le chat. Ici, l'adjectif est petit." },
  { cle: "nature-n2-determinant", competence: "FR.GRAM.NATURE", niveau: 2, format: "clic",
    consigne: "Clique sur le déterminant.", phrase: "Le garçon court.",
    attendu: "le",
    explication: "Le déterminant est devant le nom. Ici, c'est le mot le, devant garçon." },
  { cle: "nature-n2-pronom", competence: "FR.GRAM.NATURE", niveau: 2, format: "clic",
    consigne: "Clique sur le pronom.", phrase: "Elle mange une pomme.",
    attendu: "elle",
    explication: "Le pronom remplace une personne. Ici, c'est le mot elle." },
  // N3 : clic dans une phrase plus longue (plus de mots autour)
  { cle: "nature-n3-verbe", competence: "FR.GRAM.NATURE", niveau: 3, format: "clic",
    consigne: "Clique sur le verbe.", phrase: "Le petit chien joue dans le jardin.",
    attendu: "joue",
    explication: "Le verbe dit l'action. Ici, l'action est joue." },
  { cle: "nature-n3-nom", competence: "FR.GRAM.NATURE", niveau: 3, format: "clic",
    consigne: "Clique sur le nom.", phrase: "Elle regarde la télévision.",
    attendu: "télévision",
    explication: "Le nom désigne une chose. Ici, le nom est télévision." },
  { cle: "nature-n3-adjectif", competence: "FR.GRAM.NATURE", niveau: 3, format: "clic",
    consigne: "Clique sur l'adjectif.", phrase: "Le vélo rouge roule très vite.",
    attendu: "rouge",
    explication: "L'adjectif décrit le vélo. Ici, l'adjectif est rouge." },
  { cle: "nature-n3-determinant", competence: "FR.GRAM.NATURE", niveau: 3, format: "clic",
    consigne: "Clique sur le déterminant.", phrase: "Mon grand frère lit une histoire.",
    attendu: "mon",
    explication: "Le déterminant est devant le nom. Ici, c'est le mot mon, devant frère." },
  // N4 : reponse libre (taper le mot)
  { cle: "nature-n4-verbe", competence: "FR.GRAM.NATURE", niveau: 4, format: "texte",
    consigne: "Écris le verbe de la phrase.", phrase: "Les oiseaux volent haut.",
    attendu: "volent",
    explication: "Le verbe dit l'action. Ici, l'action est volent." },
  { cle: "nature-n4-nom", competence: "FR.GRAM.NATURE", niveau: 4, format: "texte",
    consigne: "Écris le nom de la phrase.", phrase: "Le bateau avance.",
    attendu: "bateau",
    explication: "Le nom désigne une chose. Ici, le nom est bateau." },
  { cle: "nature-n4-adjectif", competence: "FR.GRAM.NATURE", niveau: 4, format: "texte",
    consigne: "Écris l'adjectif de la phrase.", phrase: "La grande girafe mange.",
    attendu: "grande",
    explication: "L'adjectif décrit la girafe. Ici, l'adjectif est grande." },

  // =========================================================================
  // FR.GRAM.SUJET_VERBE — le verbe conjugue puis son sujet
  // =========================================================================
  // N1 : QCM
  { cle: "sv-n1-verbe", competence: "FR.GRAM.SUJET_VERBE", niveau: 1, format: "qcm",
    consigne: "Quel est le verbe ?", phrase: "Le chien aboie.",
    options: ["chien", "aboie", "le"], attendu: "aboie",
    explication: "Le verbe dit l'action. Ici, l'action est aboie." },
  { cle: "sv-n1-sujet", competence: "FR.GRAM.SUJET_VERBE", niveau: 1, format: "qcm",
    consigne: "Qui fait l'action ?", phrase: "La fille court.",
    options: ["La fille", "court", "vite"], attendu: "La fille",
    explication: "On cherche qui fait l'action. C'est la fille qui court, donc le sujet est la fille." },
  // N2 : clic (verbe, puis sujet a un seul mot)
  { cle: "sv-n2-verbe", competence: "FR.GRAM.SUJET_VERBE", niveau: 2, format: "clic",
    consigne: "Clique sur le verbe.", phrase: "Le chat dort sur le lit.",
    attendu: "dort",
    explication: "Le verbe dit l'action. Ici, l'action est dort." },
  { cle: "sv-n2-sujet-pronom", competence: "FR.GRAM.SUJET_VERBE", niveau: 2, format: "clic",
    consigne: "Clique sur le sujet.", phrase: "Elle danse.",
    attendu: "elle",
    explication: "On cherche qui fait l'action. C'est elle qui danse, donc le sujet est elle." },
  { cle: "sv-n2-sujet-nom", competence: "FR.GRAM.SUJET_VERBE", niveau: 2, format: "clic",
    consigne: "Clique sur le sujet.", phrase: "Paul mange une pomme.",
    attendu: "paul",
    explication: "On cherche qui fait l'action. C'est Paul qui mange, donc le sujet est Paul." },
  // N3 : clic (phrase plus longue, avec un mot au debut)
  { cle: "sv-n3-verbe", competence: "FR.GRAM.SUJET_VERBE", niveau: 3, format: "clic",
    consigne: "Clique sur le verbe.", phrase: "Demain, les enfants partiront en voyage.",
    attendu: "partiront",
    explication: "Le verbe dit l'action. Ici, l'action est partiront." },
  { cle: "sv-n3-sujet", competence: "FR.GRAM.SUJET_VERBE", niveau: 3, format: "clic",
    consigne: "Clique sur le sujet.", phrase: "Dans le jardin, Lucie plante des fleurs.",
    attendu: "lucie",
    explication: "On cherche qui fait l'action. C'est Lucie qui plante, donc le sujet est Lucie." },
  // N4 : reponse libre
  { cle: "sv-n4-sujet", competence: "FR.GRAM.SUJET_VERBE", niveau: 4, format: "texte",
    consigne: "Écris le sujet de la phrase.", phrase: "Nous chantons une chanson.",
    attendu: "nous",
    explication: "On cherche qui fait l'action. C'est nous qui chantons, donc le sujet est nous." },
  { cle: "sv-n4-verbe", competence: "FR.GRAM.SUJET_VERBE", niveau: 4, format: "texte",
    consigne: "Écris le verbe de la phrase.", phrase: "Les élèves écoutent la maîtresse.",
    attendu: "écoutent",
    explication: "Le verbe dit l'action. Ici, l'action est écoutent." },

  // =========================================================================
  // FR.GRAM.TYPES_PHRASES — types et formes de phrases (QCM a tous les niveaux)
  // =========================================================================
  // N1 : mots simples (on nomme la notion en langage d'enfant)
  { cle: "types-n1-question", competence: "FR.GRAM.TYPES_PHRASES", niveau: 1, format: "qcm",
    consigne: "Que fait cette phrase ?", phrase: "Tu viens avec moi ?",
    options: ["Elle pose une question", "Elle raconte quelque chose", "Elle donne un ordre"],
    attendu: "Elle pose une question",
    explication: "Cette phrase pose une question. On le voit, elle attend une réponse." },
  { cle: "types-n1-ordre", competence: "FR.GRAM.TYPES_PHRASES", niveau: 1, format: "qcm",
    consigne: "Que fait cette phrase ?", phrase: "Range ta chambre.",
    options: ["Elle donne un ordre", "Elle pose une question", "Elle raconte quelque chose"],
    attendu: "Elle donne un ordre",
    explication: "Cette phrase donne un ordre. Elle dit ce qu'il faut faire : ranger la chambre." },
  { cle: "types-n1-raconte", competence: "FR.GRAM.TYPES_PHRASES", niveau: 1, format: "qcm",
    consigne: "Que fait cette phrase ?", phrase: "Le soleil brille.",
    options: ["Elle raconte quelque chose", "Elle pose une question", "Elle donne un ordre"],
    attendu: "Elle raconte quelque chose",
    explication: "Cette phrase raconte quelque chose. Elle dit une information : le soleil brille." },
  // N2 : emotion forte + forme negative en langage simple
  { cle: "types-n2-emotion", competence: "FR.GRAM.TYPES_PHRASES", niveau: 2, format: "qcm",
    consigne: "Que fait cette phrase ?", phrase: "Comme c'est beau !",
    options: ["Elle montre une émotion forte", "Elle pose une question", "Elle donne un ordre"],
    attendu: "Elle montre une émotion forte",
    explication: "Cette phrase montre une émotion forte. On sent la joie, comme un cri de surprise." },
  { cle: "types-n2-negative", competence: "FR.GRAM.TYPES_PHRASES", niveau: 2, format: "qcm",
    consigne: "Cette phrase dit oui ou dit non ?", phrase: "Je ne mange pas de bonbons.",
    options: ["Elle dit non, c'est une phrase négative", "Elle dit oui, c'est une phrase affirmative"],
    attendu: "Elle dit non, c'est une phrase négative",
    explication: "Cette phrase dit non. Les petits mots ne et pas entourent le verbe, c'est une phrase négative." },
  { cle: "types-n2-affirmative", competence: "FR.GRAM.TYPES_PHRASES", niveau: 2, format: "qcm",
    consigne: "Cette phrase dit oui ou dit non ?", phrase: "Je mange une pomme.",
    options: ["Elle dit oui, c'est une phrase affirmative", "Elle dit non, c'est une phrase négative"],
    attendu: "Elle dit oui, c'est une phrase affirmative",
    explication: "Cette phrase dit oui. Il n'y a pas les mots ne et pas, c'est une phrase affirmative." },
  // N3 : on introduit les vrais noms des types
  { cle: "types-n3-interro", competence: "FR.GRAM.TYPES_PHRASES", niveau: 3, format: "qcm",
    consigne: "Quel est le type de cette phrase ?", phrase: "Où habites-tu ?",
    options: ["Interrogative", "Déclarative", "Impérative"],
    attendu: "Interrogative",
    explication: "Cette phrase pose une question : c'est une phrase interrogative, comme dans où habites-tu." },
  { cle: "types-n3-imperative", competence: "FR.GRAM.TYPES_PHRASES", niveau: 3, format: "qcm",
    consigne: "Quel est le type de cette phrase ?", phrase: "Ferme la porte.",
    options: ["Impérative", "Déclarative", "Interrogative"],
    attendu: "Impérative",
    explication: "Cette phrase donne un ordre : c'est une phrase impérative, comme dans ferme la porte." },
  { cle: "types-n3-declarative", competence: "FR.GRAM.TYPES_PHRASES", niveau: 3, format: "qcm",
    consigne: "Quel est le type de cette phrase ?", phrase: "Les enfants jouent dehors.",
    options: ["Déclarative", "Interrogative", "Exclamative"],
    attendu: "Déclarative",
    explication: "Cette phrase raconte quelque chose : c'est une phrase déclarative." },
  // N4 : le plus difficile des QCM (quatre types melanges)
  { cle: "types-n4-exclamative", competence: "FR.GRAM.TYPES_PHRASES", niveau: 4, format: "qcm",
    consigne: "Quel est le type de cette phrase ?", phrase: "Comme tu as grandi !",
    options: ["Exclamative", "Déclarative", "Interrogative", "Impérative"],
    attendu: "Exclamative",
    explication: "Cette phrase montre une émotion forte : c'est une phrase exclamative." },
  { cle: "types-n4-interro", competence: "FR.GRAM.TYPES_PHRASES", niveau: 4, format: "qcm",
    consigne: "Quel est le type de cette phrase ?", phrase: "Est-ce que tu as fini ?",
    options: ["Interrogative", "Déclarative", "Exclamative", "Impérative"],
    attendu: "Interrogative",
    explication: "Cette phrase pose une question : c'est une phrase interrogative." },
  { cle: "types-n4-negative", competence: "FR.GRAM.TYPES_PHRASES", niveau: 4, format: "qcm",
    consigne: "Cette phrase est à quelle forme ?", phrase: "Elle ne dort pas.",
    options: ["Négative", "Affirmative"],
    attendu: "Négative",
    explication: "Les mots ne et pas entourent le verbe : la phrase est à la forme négative." },

  // =========================================================================
  // FR.GRAM.PONCTUATION — point, point d'interrogation, point d'exclamation,
  // majuscule
  // =========================================================================
  // N1 : choisir la bonne fin (phrases non ambigues)
  { cle: "ponct-n1-point", competence: "FR.GRAM.PONCTUATION", niveau: 1, format: "qcm",
    consigne: "Quelle est la bonne fin pour cette phrase ?", phrase: "Je mange une pomme",
    options: [".", "?", "!"], attendu: ".",
    explication: "Cette phrase raconte quelque chose. On met un point à la fin." },
  { cle: "ponct-n1-interro", competence: "FR.GRAM.PONCTUATION", niveau: 1, format: "qcm",
    consigne: "Quelle est la bonne fin pour cette phrase ?", phrase: "Est-ce que tu viens",
    options: ["?", ".", "!"], attendu: "?",
    explication: "Cette phrase pose une question. On met un point d'interrogation à la fin." },
  // N2 : exclamation + un autre point d'interrogation
  { cle: "ponct-n2-exclam", competence: "FR.GRAM.PONCTUATION", niveau: 2, format: "qcm",
    consigne: "Quelle est la bonne fin pour cette phrase ?", phrase: "Quel beau cadeau",
    options: ["!", ".", "?"], attendu: "!",
    explication: "Cette phrase montre une émotion forte. On met un point d'exclamation à la fin." },
  { cle: "ponct-n2-interro", competence: "FR.GRAM.PONCTUATION", niveau: 2, format: "qcm",
    consigne: "Quelle est la bonne fin pour cette phrase ?", phrase: "As-tu vu le chat",
    options: ["?", ".", "!"], attendu: "?",
    explication: "Cette phrase pose une question. On met un point d'interrogation à la fin." },
  // N3 : majuscule manquante (clic sur le mot qui doit en avoir une)
  { cle: "ponct-n3-majuscule", competence: "FR.GRAM.PONCTUATION", niveau: 3, format: "clic",
    consigne: "Clique sur le mot qui doit commencer par une majuscule.",
    phrase: "Nous partons à paris demain.",
    attendu: "paris",
    explication: "Paris est le nom d'une ville. Un nom de ville prend toujours une majuscule." },
  { cle: "ponct-n3-majuscule2", competence: "FR.GRAM.PONCTUATION", niveau: 3, format: "clic",
    consigne: "Clique sur le mot qui doit commencer par une majuscule.",
    phrase: "Mon amie julie joue au parc.",
    attendu: "julie",
    explication: "Julie est un prénom. Un prénom prend toujours une majuscule." },
  // N4 : point d'exclamation parmi les quatre, phrases plus subtiles
  { cle: "ponct-n4-point", competence: "FR.GRAM.PONCTUATION", niveau: 4, format: "qcm",
    consigne: "Quelle est la bonne fin pour cette phrase ?", phrase: "Le train arrive à l'heure",
    options: [".", "?", "!"], attendu: ".",
    explication: "Cette phrase raconte quelque chose. On met un point à la fin." },
  { cle: "ponct-n4-exclam", competence: "FR.GRAM.PONCTUATION", niveau: 4, format: "qcm",
    consigne: "Quelle est la bonne fin pour cette phrase ?", phrase: "Attention, tu vas tomber",
    options: ["!", ".", "?"], attendu: "!",
    explication: "Cette phrase lance un avertissement fort. On met un point d'exclamation à la fin." },

  // =========================================================================
  // FR.GRAM.GROUPE_NOMINAL — determinant + nom + adjectif, genre et nombre
  // (IDENTIFICATION ; l'accord orthographique est travaille par la dictee)
  // =========================================================================
  // N1 : QCM genre / nombre
  { cle: "gn-n1-pluriel", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 1, format: "qcm",
    consigne: "Ce groupe est au singulier ou au pluriel ?", phrase: "les chiens",
    options: ["Au pluriel", "Au singulier"], attendu: "Au pluriel",
    explication: "Il y a plusieurs chiens. Le groupe les chiens est au pluriel." },
  { cle: "gn-n1-singulier", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 1, format: "qcm",
    consigne: "Ce groupe est au singulier ou au pluriel ?", phrase: "un chat",
    options: ["Au singulier", "Au pluriel"], attendu: "Au singulier",
    explication: "Il y a un seul chat. Le groupe un chat est au singulier." },
  // N2 : clic sur une nature dans un groupe court
  { cle: "gn-n2-determinant", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 2, format: "clic",
    consigne: "Clique sur le déterminant.", phrase: "les petites fleurs",
    attendu: "les",
    explication: "Le déterminant est devant le nom. Ici, c'est le mot les." },
  { cle: "gn-n2-nom", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 2, format: "clic",
    consigne: "Clique sur le nom.", phrase: "un grand arbre",
    attendu: "arbre",
    explication: "Le nom désigne la chose. Ici, le nom est arbre." },
  { cle: "gn-n2-adjectif", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 2, format: "clic",
    consigne: "Clique sur l'adjectif.", phrase: "une jolie maison",
    attendu: "jolie",
    explication: "L'adjectif décrit la maison. Ici, l'adjectif est jolie." },
  // N3 : genre + clic dans un groupe plus riche
  { cle: "gn-n3-feminin", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 3, format: "qcm",
    consigne: "Ce groupe est masculin ou féminin ?", phrase: "la petite fille",
    options: ["Féminin", "Masculin"], attendu: "Féminin",
    explication: "On dit la fille. Le groupe la petite fille est féminin." },
  { cle: "gn-n3-adjectif", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 3, format: "clic",
    consigne: "Clique sur l'adjectif.", phrase: "un très beau château",
    attendu: "beau",
    explication: "L'adjectif décrit le château. Ici, l'adjectif est beau." },
  // N4 : reponse libre
  { cle: "gn-n4-nom", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 4, format: "texte",
    consigne: "Écris le nom de ce groupe.", phrase: "une belle histoire",
    attendu: "histoire",
    explication: "Le nom désigne la chose. Dans une belle histoire, le nom est histoire." },
  { cle: "gn-n4-adjectif", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 4, format: "texte",
    consigne: "Écris l'adjectif de ce groupe.", phrase: "un long voyage",
    attendu: "long",
    explication: "L'adjectif décrit le voyage. Ici, l'adjectif est long." },
];

// Toutes les competences de grammaire (ordre d'affichage = ordre du referentiel).
export const COMPETENCES_GRAMMAIRE = [
  "FR.GRAM.NATURE",
  "FR.GRAM.SUJET_VERBE",
  "FR.GRAM.TYPES_PHRASES",
  "FR.GRAM.PONCTUATION",
  "FR.GRAM.GROUPE_NOMINAL",
] as const;

// Items jouables pour une competence et un niveau donnes.
export function itemsDe(competence: string, niveau: number): GramItem[] {
  return BANQUE_GRAMMAIRE.filter((i) => i.competence === competence && i.niveau === niveau);
}

// Juge local (mode demo + feedback immediat) : miroir exact du serveur.
// Le SERVEUR reste la source de verite ; ceci ne sert qu'au rendu hors-ligne.
export function estJusteGrammaire(cle: string, saisie: string): boolean {
  const item = BANQUE_GRAMMAIRE.find((i) => i.cle === cle);
  if (!item) return false;
  return comparerGrammaire(item.format, saisie, item.attendu);
}

// Recupere un item par sa cle (utilise par le composant d'exercice).
export function itemParCle(cle: string): GramItem | undefined {
  return BANQUE_GRAMMAIRE.find((i) => i.cle === cle);
}
