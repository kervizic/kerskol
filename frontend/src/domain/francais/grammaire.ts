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
    consigne: "Quelle est la bonne fin pour cette phrase ?", phrase: "Vite, le spectacle va commencer",
    options: ["!", ".", "?"], attendu: "!",
    explication: "Cette phrase est pressante et forte. On met un point d'exclamation à la fin." },

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
    consigne: "Ce groupe est au singulier ou au pluriel ?", phrase: "le tapis",
    options: ["Au singulier", "Au pluriel"], attendu: "Au singulier",
    explication: "Il y a un seul tapis. Le mot tapis finit par s, mais le petit mot le montre qu'il est au singulier." },
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

  // =========================================================================
  // LOT CE2 (migration 0049) — enrichissement : sujet inversé, verbe à un temps
  // composé, négations ne…jamais / ne…plus / ne…rien, complément du nom,
  // pronoms/déterminants variés, majuscule (pays) et virgule de liste.
  // =========================================================================
  // FR.GRAM.NATURE (ajouts)
  { cle: "nature-n3-pronom", competence: "FR.GRAM.NATURE", niveau: 3, format: "clic",
    consigne: "Clique sur le pronom.", phrase: "Bientôt, elles arriveront à la maison.",
    attendu: "elles",
    explication: "Le pronom remplace un nom. Ici, elles remplace des personnes, comme les filles." },
  { cle: "nature-n3-determinant2", competence: "FR.GRAM.NATURE", niveau: 3, format: "clic",
    consigne: "Clique sur le déterminant.", phrase: "Ces oiseaux chantent dans l'arbre.",
    attendu: "ces",
    explication: "Le déterminant est devant le nom. Ici, c'est ces, devant oiseaux." },
  { cle: "nature-n4-determinant", competence: "FR.GRAM.NATURE", niveau: 4, format: "texte",
    consigne: "Écris le déterminant de la phrase.", phrase: "Ton vélo est tout neuf.",
    attendu: "ton",
    explication: "Le déterminant est le petit mot placé devant le nom. Ici, c'est ton, devant vélo." },
  { cle: "nature-n4-pronom", competence: "FR.GRAM.NATURE", niveau: 4, format: "texte",
    consigne: "Écris le pronom de la phrase.", phrase: "Ils jouent dehors.",
    attendu: "ils",
    explication: "Le pronom remplace un nom. Ici, ils remplace des personnes, comme les garçons." },

  // FR.GRAM.SUJET_VERBE (ajouts) — sujet inversé, sujet groupe, temps composé
  { cle: "sv-n2-sujet-pronom2", competence: "FR.GRAM.SUJET_VERBE", niveau: 2, format: "clic",
    consigne: "Clique sur le sujet.", phrase: "Vous chantez bien.",
    attendu: "vous",
    explication: "On cherche qui chante. C'est vous qui chantez, donc le sujet est vous." },
  { cle: "sv-n3-sujet-inverse", competence: "FR.GRAM.SUJET_VERBE", niveau: 3, format: "clic",
    consigne: "Clique sur le sujet.", phrase: "Dans le ciel vole un oiseau.",
    attendu: "oiseau",
    explication: "On cherche qui vole. C'est l'oiseau qui vole, donc le sujet est oiseau, même s'il est placé après le verbe." },
  { cle: "sv-n3-sujet-groupe", competence: "FR.GRAM.SUJET_VERBE", niveau: 3, format: "qcm",
    consigne: "Quel est le sujet de la phrase ?", phrase: "Les grands arbres bougent.",
    options: ["Les grands arbres", "bougent", "grands"], attendu: "Les grands arbres",
    explication: "On cherche qui bouge. Ce sont les grands arbres, donc le sujet est tout le groupe les grands arbres." },
  { cle: "sv-n3-verbe-compose", competence: "FR.GRAM.SUJET_VERBE", niveau: 3, format: "qcm",
    consigne: "Quel est le verbe de la phrase ?", phrase: "Hier, Léa a mangé une pomme.",
    options: ["a mangé", "Léa", "pomme"], attendu: "a mangé",
    explication: "Le verbe dit l'action. Ici, l'action est a mangé. C'est un verbe au passé, il se dit en deux mots." },
  { cle: "sv-n4-sujet-inverse", competence: "FR.GRAM.SUJET_VERBE", niveau: 4, format: "texte",
    consigne: "Écris le sujet de la phrase.", phrase: "Au loin brille une étoile.",
    attendu: "étoile",
    explication: "On cherche qui brille. C'est l'étoile qui brille, donc le sujet est étoile, placé après le verbe." },
  { cle: "sv-n4-verbe-compose", competence: "FR.GRAM.SUJET_VERBE", niveau: 4, format: "qcm",
    consigne: "Quel est le verbe de la phrase ?", phrase: "Les enfants sont partis à l'école.",
    options: ["sont partis", "enfants", "école"], attendu: "sont partis",
    explication: "Le verbe dit l'action. Ici, l'action est sont partis. C'est un verbe au passé, écrit en deux mots." },

  // FR.GRAM.TYPES_PHRASES (ajouts) — négations ne…jamais / ne…plus / ne…rien
  { cle: "types-n2-negative-jamais", competence: "FR.GRAM.TYPES_PHRASES", niveau: 2, format: "qcm",
    consigne: "Cette phrase dit oui ou dit non ?", phrase: "Il ne ment jamais.",
    options: ["Elle dit non, c'est une phrase négative", "Elle dit oui, c'est une phrase affirmative"],
    attendu: "Elle dit non, c'est une phrase négative",
    explication: "Cette phrase dit non. Les petits mots ne et jamais entourent le verbe, c'est une phrase négative." },
  { cle: "types-n3-negative-plus", competence: "FR.GRAM.TYPES_PHRASES", niveau: 3, format: "qcm",
    consigne: "Cette phrase est à quelle forme ?", phrase: "Je ne veux plus de soupe.",
    options: ["Négative", "Affirmative"], attendu: "Négative",
    explication: "Les mots ne et plus entourent le verbe. La phrase dit non, elle est à la forme négative." },
  { cle: "types-n4-negative-rien", competence: "FR.GRAM.TYPES_PHRASES", niveau: 4, format: "qcm",
    consigne: "Cette phrase est à quelle forme ?", phrase: "Elle ne voit rien.",
    options: ["Négative", "Affirmative"], attendu: "Négative",
    explication: "Les mots ne et rien entourent le verbe. La phrase dit non, elle est à la forme négative." },
  { cle: "types-n4-imperative", competence: "FR.GRAM.TYPES_PHRASES", niveau: 4, format: "qcm",
    consigne: "Quel est le type de cette phrase ?", phrase: "Viens ici tout de suite.",
    options: ["Impérative", "Déclarative", "Interrogative", "Exclamative"], attendu: "Impérative",
    explication: "Cette phrase donne un ordre : c'est une phrase impérative, comme dans viens ici." },

  // FR.GRAM.PONCTUATION (ajouts) — majuscule (pays), virgule de liste
  { cle: "ponct-n2-point2", competence: "FR.GRAM.PONCTUATION", niveau: 2, format: "qcm",
    consigne: "Quelle est la bonne fin pour cette phrase ?", phrase: "Le chat dort sur le canapé",
    options: [".", "?", "!"], attendu: ".",
    explication: "Cette phrase raconte quelque chose. On met un point à la fin." },
  { cle: "ponct-n3-majuscule-pays", competence: "FR.GRAM.PONCTUATION", niveau: 3, format: "clic",
    consigne: "Clique sur le mot qui doit commencer par une majuscule.",
    phrase: "Mon oncle habite en espagne.", attendu: "espagne",
    explication: "Espagne est le nom d'un pays. Un nom de pays prend toujours une majuscule." },
  { cle: "ponct-n3-virgule", competence: "FR.GRAM.PONCTUATION", niveau: 3, format: "qcm",
    consigne: "Que faut-il mettre entre les mots de la liste ?",
    phrase: "J'achète des pommes des poires et des fraises.",
    options: ["La virgule", "Le point", "Le point d'interrogation"], attendu: "La virgule",
    explication: "Dans une liste, on sépare les mots par des virgules. Ici, il faut une virgule entre pommes et poires." },
  { cle: "ponct-n4-interro", competence: "FR.GRAM.PONCTUATION", niveau: 4, format: "qcm",
    consigne: "Quelle est la bonne fin pour cette phrase ?", phrase: "Sais-tu où elle est",
    options: ["?", ".", "!"], attendu: "?",
    explication: "Cette phrase pose une question. On met un point d'interrogation à la fin." },

  // FR.GRAM.GROUPE_NOMINAL (ajouts) — complément du nom, genre masculin
  { cle: "gn-n1-masculin", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 1, format: "qcm",
    consigne: "Ce groupe est masculin ou féminin ?", phrase: "un petit garçon",
    options: ["Masculin", "Féminin"], attendu: "Masculin",
    explication: "On dit le garçon. Le groupe un petit garçon est masculin." },
  { cle: "gn-n2-cdn-noyau", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 2, format: "clic",
    consigne: "Clique sur le nom le plus important du groupe.", phrase: "le vélo de Léo",
    attendu: "vélo",
    explication: "Le groupe parle d'un vélo. Les mots de Léo disent à qui il est. Le nom le plus important est vélo." },
  { cle: "gn-n3-cdn-complement", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 3, format: "clic",
    consigne: "Clique sur le mot qui dit à qui est le livre.", phrase: "le livre de Paul",
    attendu: "paul",
    explication: "Le groupe parle d'un livre. Les mots de Paul disent à qui il est. Paul complète le nom livre." },
  { cle: "gn-n3-cdn", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 3, format: "qcm",
    consigne: "Quel groupe a un complément du nom ?", phrase: "",
    options: ["le jus d'orange", "le gros chien", "une belle fleur"], attendu: "le jus d'orange",
    explication: "Un complément du nom précise le nom, après lui. Dans le jus d'orange, les mots d'orange complètent le nom jus." },
  { cle: "gn-n4-cdn-noyau", competence: "FR.GRAM.GROUPE_NOMINAL", niveau: 4, format: "texte",
    consigne: "Écris le nom le plus important du groupe.", phrase: "la boîte de chocolats",
    attendu: "boîte",
    explication: "Le groupe parle d'une boîte. Les mots de chocolats disent ce qu'il y a dedans. Le nom le plus important est boîte." },

  // =========================================================================
  // FR.GRAM.COMPLEMENTS (CM1) — compléments du verbe (objet direct COD,
  // objet indirect COI) et compléments circonstanciels (temps, lieu).
  // Attendus CM1 (eduscol, doc 13984 : identifier les constituants d'une phrase
  // simple : sujet, verbe, compléments d'objet et compléments circonstanciels).
  // N1 QCM ; N2 clic (un mot) ; N3 QCM (distinguer COD/COI) ou clic ; N4 texte.
  // =========================================================================
  // N1 : QCM — reconnaitre le complement
  { cle: "comp-n1-cod", competence: "FR.GRAM.COMPLEMENTS", niveau: 1, format: "qcm",
    consigne: "Dans la phrase, qu'est-ce que Paul lave ? C'est le complément d'objet.", phrase: "Paul lave la voiture.",
    options: ["la voiture", "Paul", "lave"], attendu: "la voiture",
    explication: "On demande : Paul lave quoi ? Il lave la voiture. La voiture est le complément d'objet." },
  { cle: "comp-n1-cc-temps", competence: "FR.GRAM.COMPLEMENTS", niveau: 1, format: "qcm",
    consigne: "Dans la phrase, quel mot dit QUAND ? C'est un complément de temps.", phrase: "Nous partons demain.",
    options: ["demain", "partons", "nous"], attendu: "demain",
    explication: "On demande : nous partons quand ? Demain. Le mot demain dit le temps." },
  { cle: "comp-n1-cc-lieu", competence: "FR.GRAM.COMPLEMENTS", niveau: 1, format: "qcm",
    consigne: "Dans la phrase, quel groupe dit OÙ ? C'est un complément de lieu.", phrase: "Le chat dort sur le lit.",
    options: ["sur le lit", "dort", "le chat"], attendu: "sur le lit",
    explication: "On demande : le chat dort où ? Sur le lit. Ce groupe dit le lieu." },
  // N2 : clic sur un mot (le noyau du complement)
  { cle: "comp-n2-cod", competence: "FR.GRAM.COMPLEMENTS", niveau: 2, format: "clic",
    consigne: "Clique sur le mot qui dit ce que Léa dessine.", phrase: "Léa dessine un bateau.",
    attendu: "bateau",
    explication: "Léa dessine quoi ? Un bateau. Le mot important du complément d'objet est bateau." },
  { cle: "comp-n2-cc-lieu", competence: "FR.GRAM.COMPLEMENTS", niveau: 2, format: "clic",
    consigne: "Clique sur le mot qui dit OÙ jouent les enfants.", phrase: "Les enfants jouent dehors.",
    attendu: "dehors",
    explication: "Les enfants jouent où ? Dehors. Le mot dehors dit le lieu." },
  { cle: "comp-n2-cc-temps", competence: "FR.GRAM.COMPLEMENTS", niveau: 2, format: "clic",
    consigne: "Clique sur le mot qui dit QUAND Tom se lève.", phrase: "Tom se lève tôt.",
    attendu: "tôt",
    explication: "Tom se lève quand ? Tôt. Le mot tôt dit le temps." },
  // N3 : distinguer complement d'objet direct et indirect (QCM) + clic long
  { cle: "comp-n3-coi", competence: "FR.GRAM.COMPLEMENTS", niveau: 3, format: "qcm",
    consigne: "Dans la phrase, le complément « à ma grand-mère » est de quelle sorte ?", phrase: "Je téléphone à ma grand-mère.",
    options: ["un complément d'objet indirect", "un complément d'objet direct"], attendu: "un complément d'objet indirect",
    explication: "Je téléphone à qui ? À ma grand-mère. Il y a le petit mot à : c'est un complément d'objet indirect." },
  { cle: "comp-n3-cod", competence: "FR.GRAM.COMPLEMENTS", niveau: 3, format: "qcm",
    consigne: "Dans la phrase, le complément « la balle » est de quelle sorte ?", phrase: "Le chien attrape la balle.",
    options: ["un complément d'objet direct", "un complément d'objet indirect"], attendu: "un complément d'objet direct",
    explication: "Le chien attrape quoi ? La balle, juste après le verbe, sans petit mot : c'est un complément d'objet direct." },
  { cle: "comp-n3-cc-clic", competence: "FR.GRAM.COMPLEMENTS", niveau: 3, format: "clic",
    consigne: "Clique sur le mot qui dit QUAND, dans cette phrase.", phrase: "Le matin, le facteur passe devant la maison.",
    attendu: "matin",
    explication: "Le facteur passe quand ? Le matin. Le mot matin dit le temps." },
  // N4 : reponse libre (ecrire le nom noyau du complement d'objet, ou le mot du lieu)
  { cle: "comp-n4-cod", competence: "FR.GRAM.COMPLEMENTS", niveau: 4, format: "texte",
    consigne: "Écris le nom le plus important du complément d'objet.", phrase: "Le jardinier plante des fleurs.",
    attendu: "fleurs",
    explication: "Le jardinier plante quoi ? Des fleurs. Le nom le plus important est fleurs." },
  { cle: "comp-n4-cod2", competence: "FR.GRAM.COMPLEMENTS", niveau: 4, format: "texte",
    consigne: "Écris le nom le plus important du complément d'objet.", phrase: "Maman prépare le gâteau.",
    attendu: "gâteau",
    explication: "Maman prépare quoi ? Le gâteau. Le nom le plus important est gâteau." },
  { cle: "comp-n4-cc", competence: "FR.GRAM.COMPLEMENTS", niveau: 4, format: "texte",
    consigne: "Écris le mot qui dit OÙ volent les oiseaux.", phrase: "Les oiseaux volent dans le ciel.",
    attendu: "ciel",
    explication: "Les oiseaux volent où ? Dans le ciel. Le mot qui dit le lieu est ciel." },

  // =========================================================================
  // FR.GRAM.HOMOPHONES (CM1) — homophones grammaticaux (orthographe
  // grammaticale) : ou/où, on/ont, ce/se, ces/ses, leur/leurs, tout/tous,
  // c'est/s'est. Attendu CM1 (eduscol doc 13984). QCM « choisis le bon mot »
  // (on ne peut pas taper la reponse : les deux mots se prononcent pareil).
  // Difficulte croissante par la subtilite de la paire et du contexte.
  // =========================================================================
  // N1 : paires les plus simples (ou/où, on/ont)
  { cle: "homo-n1-ou", competence: "FR.GRAM.HOMOPHONES", niveau: 1, format: "qcm",
    consigne: "Choisis le bon mot pour compléter la phrase.", phrase: "Tu veux une pomme … une poire ?",
    options: ["ou", "où"], attendu: "ou",
    explication: "ou sans accent sert à choisir entre deux choses. Ici, on choisit entre une pomme et une poire : ou." },
  { cle: "homo-n1-on", competence: "FR.GRAM.HOMOPHONES", niveau: 1, format: "qcm",
    consigne: "Choisis le bon mot pour compléter la phrase.", phrase: "Ce soir, … regarde un film.",
    options: ["On", "Ont"], attendu: "On",
    explication: "On peut être remplacé par il. On regarde, comme il regarde : on sans t." },
  { cle: "homo-n1-ou2", competence: "FR.GRAM.HOMOPHONES", niveau: 1, format: "qcm",
    consigne: "Choisis le bon mot pour compléter la phrase.", phrase: "Dis-moi … tu vas.",
    options: ["où", "ou"], attendu: "où",
    explication: "où avec un accent dit le lieu. Où tu vas, c'est à quel endroit : où." },
  // N2 : ce/se, ont
  { cle: "homo-n2-ce", competence: "FR.GRAM.HOMOPHONES", niveau: 2, format: "qcm",
    consigne: "Choisis le bon mot pour compléter la phrase.", phrase: "… gâteau est délicieux.",
    options: ["Ce", "Se"], attendu: "Ce",
    explication: "ce se met devant un nom. Ce gâteau, comme ce chien : ce est un petit mot devant le nom." },
  { cle: "homo-n2-se", competence: "FR.GRAM.HOMOPHONES", niveau: 2, format: "qcm",
    consigne: "Choisis le bon mot pour compléter la phrase.", phrase: "Le chat … cache sous le lit.",
    options: ["se", "ce"], attendu: "se",
    explication: "se se met devant un verbe. Il se cache : se accompagne l'action." },
  { cle: "homo-n2-ont", competence: "FR.GRAM.HOMOPHONES", niveau: 2, format: "qcm",
    consigne: "Choisis le bon mot pour compléter la phrase.", phrase: "Les oiseaux … un joli nid.",
    options: ["ont", "on"], attendu: "ont",
    explication: "ont est le verbe avoir. Les oiseaux ont, comme ils ont : ont avec un t." },
  // N3 : ces/ses, tout/tous, leur/leurs (devant un nom)
  { cle: "homo-n3-ces", competence: "FR.GRAM.HOMOPHONES", niveau: 3, format: "qcm",
    consigne: "Choisis le bon mot pour compléter la phrase.", phrase: "Regarde … belles fleurs dans le jardin !",
    options: ["ces", "ses"], attendu: "ces",
    explication: "ces montre des choses qu'on désigne. On peut dire ces fleurs-là : ces." },
  { cle: "homo-n3-tous", competence: "FR.GRAM.HOMOPHONES", niveau: 3, format: "qcm",
    consigne: "Choisis le bon mot pour compléter la phrase.", phrase: "… les enfants chantent ensemble.",
    options: ["Tous", "Tout"], attendu: "Tous",
    explication: "tous est au pluriel, devant un nom pluriel. Tous les enfants : on peut en compter plusieurs." },
  { cle: "homo-n3-leurs", competence: "FR.GRAM.HOMOPHONES", niveau: 3, format: "qcm",
    consigne: "Choisis le bon mot pour compléter la phrase.", phrase: "Les élèves rangent … cahiers.",
    options: ["leurs", "leur"], attendu: "leurs",
    explication: "leurs est devant un nom pluriel : plusieurs cahiers. Chacun a le sien, cela fait plusieurs : leurs." },
  // N4 : c'est/s'est, leur (devant un verbe) — les plus subtils
  { cle: "homo-n4-cest", competence: "FR.GRAM.HOMOPHONES", niveau: 4, format: "qcm",
    consigne: "Choisis le bon mot pour compléter la phrase.", phrase: "… une très belle journée.",
    options: ["C'est", "S'est"], attendu: "C'est",
    explication: "c'est veut dire cela est. C'est une belle journée, comme cela est une belle journée." },
  { cle: "homo-n4-sest", competence: "FR.GRAM.HOMOPHONES", niveau: 4, format: "qcm",
    consigne: "Choisis le bon mot pour compléter la phrase.", phrase: "Léa … lavé les mains avant de manger.",
    options: ["s'est", "c'est"], attendu: "s'est",
    explication: "s'est accompagne un verbe à l'action passée. Léa s'est lavée : s'est va avec le verbe." },
  { cle: "homo-n4-leur", competence: "FR.GRAM.HOMOPHONES", niveau: 4, format: "qcm",
    consigne: "Choisis le bon mot pour compléter la phrase.", phrase: "Le maître … explique la leçon.",
    options: ["leur", "leurs"], attendu: "leur",
    explication: "leur devant un verbe ne change jamais. Il leur explique, comme il lui explique : leur sans s." },

  // =========================================================================
  // FR.GRAM.CLASSES (CM1) — classes de mots élargies : adverbe, conjonction de
  // coordination, pronom (au-delà du pronom personnel sujet). Attendu CM1
  // (eduscol doc 13984 : identifier les classes de mots). N1 QCM, N2 clic,
  // N3 QCM (donner la classe), N4 réponse libre.
  // =========================================================================
  // N1 : QCM — reconnaitre la classe
  { cle: "cls-n1-adverbe", competence: "FR.GRAM.CLASSES", niveau: 1, format: "qcm",
    consigne: "Quel mot est un adverbe ? Un adverbe dit comment, quand ou où.", phrase: "",
    options: ["vite", "chien", "rouge"], attendu: "vite",
    explication: "vite dit comment on fait : c'est un adverbe. chien est un nom, rouge est un adjectif." },
  { cle: "cls-n1-conj", competence: "FR.GRAM.CLASSES", niveau: 1, format: "qcm",
    consigne: "Quel petit mot relie deux idées ? C'est une conjonction (mais, et, ou, donc...).", phrase: "",
    options: ["mais", "table", "grand"], attendu: "mais",
    explication: "mais relie deux idées. C'est une conjonction de coordination, comme et, ou, donc." },
  { cle: "cls-n1-adverbe2", competence: "FR.GRAM.CLASSES", niveau: 1, format: "qcm",
    consigne: "Quel mot est un adverbe ?", phrase: "",
    options: ["doucement", "voiture", "petit"], attendu: "doucement",
    explication: "doucement dit comment on fait, de façon douce : c'est un adverbe." },
  // N2 : clic sur un mot dans une phrase
  { cle: "cls-n2-adverbe", competence: "FR.GRAM.CLASSES", niveau: 2, format: "clic",
    consigne: "Clique sur l'adverbe. Il dit comment le chat dort.", phrase: "Le chat dort tranquillement.",
    attendu: "tranquillement",
    explication: "tranquillement dit comment le chat dort : c'est un adverbe." },
  { cle: "cls-n2-conj", competence: "FR.GRAM.CLASSES", niveau: 2, format: "clic",
    consigne: "Clique sur le petit mot qui relie les deux idées.", phrase: "Je voudrais jouer mais il pleut.",
    attendu: "mais",
    explication: "mais relie deux idées : jouer et il pleut. C'est une conjonction de coordination." },
  { cle: "cls-n2-adverbe3", competence: "FR.GRAM.CLASSES", niveau: 2, format: "clic",
    consigne: "Clique sur l'adverbe. Il dit quand on part.", phrase: "Nous partirons bientôt.",
    attendu: "bientôt",
    explication: "bientôt dit quand on part : c'est un adverbe de temps." },
  // N3 : QCM — donner la classe d'un mot
  { cle: "cls-n3-adverbe", competence: "FR.GRAM.CLASSES", niveau: 3, format: "qcm",
    consigne: "Quelle est la classe du mot « bien » dans la phrase ?", phrase: "Elle chante bien.",
    options: ["un adverbe", "un adjectif", "un nom"], attendu: "un adverbe",
    explication: "bien dit comment elle chante : c'est un adverbe. Un adjectif, lui, décrirait un nom." },
  { cle: "cls-n3-conj", competence: "FR.GRAM.CLASSES", niveau: 3, format: "qcm",
    consigne: "Quelle est la classe du mot « et » dans la phrase ?", phrase: "Tom et Léa jouent ensemble.",
    options: ["une conjonction", "un adverbe", "un pronom"], attendu: "une conjonction",
    explication: "et relie Tom et Léa : c'est une conjonction de coordination." },
  { cle: "cls-n3-pronom", competence: "FR.GRAM.CLASSES", niveau: 3, format: "qcm",
    consigne: "Quelle est la classe du mot « la » dans la phrase ?", phrase: "Je la regarde.",
    options: ["un pronom", "un déterminant", "un adverbe"], attendu: "un pronom",
    explication: "la remplace une personne ou une chose (je regarde qui ? la). Ici, la est un pronom, pas le petit mot devant un nom." },
  // N4 : reponse libre (ecrire le mot)
  { cle: "cls-n4-adverbe", competence: "FR.GRAM.CLASSES", niveau: 4, format: "texte",
    consigne: "Écris l'adverbe de la phrase. Il dit comment les enfants rient.", phrase: "Les enfants rient joyeusement.",
    attendu: "joyeusement",
    explication: "joyeusement dit comment les enfants rient : c'est un adverbe." },
  { cle: "cls-n4-conj", competence: "FR.GRAM.CLASSES", niveau: 4, format: "texte",
    consigne: "Écris la conjonction qui relie les deux idées.", phrase: "Il fait froid donc je mets un manteau.",
    attendu: "donc",
    explication: "donc relie les deux idées : il fait froid, et je mets un manteau. C'est une conjonction." },
  { cle: "cls-n4-adverbe2", competence: "FR.GRAM.CLASSES", niveau: 4, format: "texte",
    consigne: "Écris l'adverbe de la phrase. Il dit où le chien attend.", phrase: "Le chien attend dehors.",
    attendu: "dehors",
    explication: "dehors dit où le chien attend : c'est un adverbe de lieu." },

  // =========================================================================
  // FR.GRAM.PHRASE (CM1) — phrase simple / phrase complexe. Attendu CM1
  // (eduscol doc 13984). Une phrase SIMPLE a un seul verbe conjugué ; une phrase
  // COMPLEXE en a plusieurs. N1 QCM, N2 clic (le verbe), N3 QCM, N4 réponse libre
  // (écrire un verbe de la phrase).
  // =========================================================================
  // N1 : QCM — compter les verbes / reconnaitre simple ou complexe
  { cle: "phr-n1-1", competence: "FR.GRAM.PHRASE", niveau: 1, format: "qcm",
    consigne: "Combien y a-t-il de verbes conjugués dans la phrase ?", phrase: "Le chat dort.",
    options: ["un", "deux", "zéro"], attendu: "un",
    explication: "Il y a un seul verbe conjugué : dort. Avec un seul verbe, c'est une phrase simple." },
  { cle: "phr-n1-2", competence: "FR.GRAM.PHRASE", niveau: 1, format: "qcm",
    consigne: "Cette phrase est simple (un seul verbe) ou complexe (plusieurs verbes) ?", phrase: "Léa chante.",
    options: ["simple", "complexe"], attendu: "simple",
    explication: "Il y a un seul verbe conjugué : chante. C'est une phrase simple." },
  { cle: "phr-n1-3", competence: "FR.GRAM.PHRASE", niveau: 1, format: "qcm",
    consigne: "Cette phrase est simple ou complexe ?", phrase: "Je lis et mon frère dessine.",
    options: ["complexe", "simple"], attendu: "complexe",
    explication: "Il y a deux verbes conjugués : lis et dessine. C'est une phrase complexe." },
  // N2 : clic sur un verbe
  { cle: "phr-n2-1", competence: "FR.GRAM.PHRASE", niveau: 2, format: "clic",
    consigne: "Clique sur le deuxième verbe conjugué de la phrase.", phrase: "Tom mange une pomme et Léa boit de l'eau.",
    attendu: "boit",
    explication: "Il y a deux verbes : mange et boit. Le deuxième est boit : c'est une phrase complexe." },
  { cle: "phr-n2-2", competence: "FR.GRAM.PHRASE", niveau: 2, format: "clic",
    consigne: "Clique sur le verbe conjugué de cette phrase simple.", phrase: "Les oiseaux chantent dans le jardin.",
    attendu: "chantent",
    explication: "Il y a un seul verbe : chantent. C'est une phrase simple." },
  { cle: "phr-n2-3", competence: "FR.GRAM.PHRASE", niveau: 2, format: "clic",
    consigne: "Clique sur le petit mot qui relie les deux parties de la phrase.", phrase: "Je range ma chambre puis je joue.",
    attendu: "puis",
    explication: "puis relie les deux parties : je range et je joue. La phrase a deux verbes, elle est complexe." },
  // N3 : QCM — phrases plus longues (un distracteur de longueur)
  { cle: "phr-n3-1", competence: "FR.GRAM.PHRASE", niveau: 3, format: "qcm",
    consigne: "Cette phrase est simple ou complexe ?", phrase: "Quand il pleut, je reste à la maison.",
    options: ["complexe", "simple"], attendu: "complexe",
    explication: "Il y a deux verbes conjugués : pleut et reste. C'est une phrase complexe." },
  { cle: "phr-n3-2", competence: "FR.GRAM.PHRASE", niveau: 3, format: "qcm",
    consigne: "Cette phrase est simple ou complexe ?", phrase: "Le grand chien noir aboie très fort.",
    options: ["simple", "complexe"], attendu: "simple",
    explication: "Même si la phrase est longue, il y a un seul verbe : aboie. C'est une phrase simple." },
  { cle: "phr-n3-3", competence: "FR.GRAM.PHRASE", niveau: 3, format: "qcm",
    consigne: "Combien y a-t-il de verbes conjugués dans la phrase ?", phrase: "Il mange, il boit et il rit.",
    options: ["trois", "deux", "un"], attendu: "trois",
    explication: "Il y a trois verbes conjugués : mange, boit et rit. La phrase est complexe." },
  // N4 : reponse libre (ecrire un verbe de la phrase)
  { cle: "phr-n4-1", competence: "FR.GRAM.PHRASE", niveau: 4, format: "texte",
    consigne: "Écris le deuxième verbe conjugué de la phrase.", phrase: "Le soleil brille et les oiseaux chantent.",
    attendu: "chantent",
    explication: "Il y a deux verbes : brille et chantent. Le deuxième est chantent. La phrase est complexe." },
  { cle: "phr-n4-2", competence: "FR.GRAM.PHRASE", niveau: 4, format: "texte",
    consigne: "Écris le verbe conjugué de cette phrase simple.", phrase: "Le chat dort sur le canapé.",
    attendu: "dort",
    explication: "Il y a un seul verbe : dort. C'est une phrase simple." },
  { cle: "phr-n4-3", competence: "FR.GRAM.PHRASE", niveau: 4, format: "texte",
    consigne: "Écris le deuxième verbe conjugué de la phrase.", phrase: "Je ferme la porte quand je sors.",
    attendu: "sors",
    explication: "Il y a deux verbes : ferme et sors. Le deuxième est sors. La phrase est complexe." },
];

// Toutes les competences de grammaire (ordre d'affichage = ordre du referentiel).
export const COMPETENCES_GRAMMAIRE = [
  "FR.GRAM.NATURE",
  "FR.GRAM.SUJET_VERBE",
  "FR.GRAM.TYPES_PHRASES",
  "FR.GRAM.PONCTUATION",
  "FR.GRAM.GROUPE_NOMINAL",
  "FR.GRAM.COMPLEMENTS",
  "FR.GRAM.HOMOPHONES",
  "FR.GRAM.CLASSES",
  "FR.GRAM.PHRASE",
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
