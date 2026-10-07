// Banque d'exercices de VOCABULAIRE et MOTS A SAVOIR (francais, CE2, programme
// cycle 2 revise 2024). GENERE depuis une source unique (voir rapport) ; miroir
// EXACT de la table de reference public.lexique_item (migration 0042) et teste
// en croise (frontend/.../francais/lexique.test.ts + supabase/tests/lexique_test.sql).
//
// On REUTILISE l'architecture de la grammaire (phase 1) : meme type d'item
// (GramItem), meme comparaison (comparerGrammaire : qcm -> normaliser, accents
// gardes ; clic/texte -> normaliserMot, ponctuation de bord retiree), meme
// composant <Grammaire> (QCM / clic sur un mot / saisie libre), meme principe
// « le SERVEUR reste SEUL JUGE » via une cle d'item (op dediee 'lex').
//
// Deux sous-matieres, domaines dedies :
//   VOCABULAIRE (domaine `vocabulaire`) :
//     FR.VOC.ALPHABET         ordre alphabetique et usage du dictionnaire ;
//     FR.VOC.FAMILLES         familles de mots (intrus, meme famille) ;
//     FR.VOC.SYN_CONTRAIRES   synonymes et contraires (y compris par prefixe) ;
//     FR.VOC.PREFIXE_SUFFIXE  prefixes et suffixes simples (re-, de-, in-, -eur, -ette) ;
//     FR.VOC.CATEGORIES       categories / mot generique.
//   MOTS A SAVOIR (domaine `mots-invariables`) :
//     FR.MOTS.INVARIABLES     mots invariables CE2 ; N1 choisir la bonne
//                             orthographe, jusqu'au N4 ecrire le mot dans une
//                             phrase a trou. Les messages DECRIVENT la lettre
//                             (ex. « un p a la fin qu'on n'entend pas »).
//
// Progression des formats (identique a la grammaire) : N1 QCM, N2 clic/QCM,
// N3 clic/QCM, N4 reponse LIBRE (texte). Messages enfant de 8 ans, pour l'ORAL :
// phrases courtes, aucun symbole, jamais deux formes homophones opposees,
// toujours un exemple concret.

import type { GramItem } from "./grammaire";
import { comparerGrammaire } from "./grammaire";

// Un item de lexique a la MEME forme qu'un item de grammaire (cle, competence,
// niveau, format, consigne, phrase, options?, attendu, explication).
export type LexItem = GramItem;

// Comparaison miroir du serveur (reutilise celle de la grammaire).
export const comparerLexique = comparerGrammaire;

export const BANQUE_VOCABULAIRE: LexItem[] = [
  // FR.VOC.ALPHABET
  { cle: "voc-alpha-n1-1", competence: "FR.VOC.ALPHABET", niveau: 1, format: "qcm", consigne: "Quel mot vient en premier dans le dictionnaire ?", phrase: "", options: ["arbre", "chat", "pomme"], attendu: "arbre", explication: "Dans le dictionnaire, on range les mots par la première lettre. a vient avant c et avant p, donc arbre est le premier." },
  { cle: "voc-alpha-n1-2", competence: "FR.VOC.ALPHABET", niveau: 1, format: "qcm", consigne: "Quel mot vient en premier dans le dictionnaire ?", phrase: "", options: ["ballon", "souris", "table"], attendu: "ballon", explication: "b vient avant s et avant t, donc ballon est le premier." },
  { cle: "voc-alpha-n1-3", competence: "FR.VOC.ALPHABET", niveau: 1, format: "qcm", consigne: "Quel mot vient en premier dans le dictionnaire ?", phrase: "", options: ["lune", "moto", "nuage"], attendu: "lune", explication: "l vient avant m et avant n, donc lune est le premier." },
  { cle: "voc-alpha-n1-4", competence: "FR.VOC.ALPHABET", niveau: 1, format: "qcm", consigne: "Quel mot vient en premier dans le dictionnaire ?", phrase: "", options: ["dauphin", "girafe", "renard"], attendu: "dauphin", explication: "d vient avant g et avant r, donc dauphin est le premier." },
  { cle: "voc-alpha-n1-5", competence: "FR.VOC.ALPHABET", niveau: 1, format: "qcm", consigne: "Quel mot vient en premier dans le dictionnaire ?", phrase: "", options: ["cerise", "fraise", "orange"], attendu: "cerise", explication: "c vient avant f et avant o, donc cerise est le premier." },
  { cle: "voc-alpha-n2-1", competence: "FR.VOC.ALPHABET", niveau: 2, format: "clic", consigne: "Clique sur le mot qui vient en premier dans le dictionnaire.", phrase: "chat arbre pomme", attendu: "arbre", explication: "a vient avant c et p. Le premier est arbre." },
  { cle: "voc-alpha-n2-2", competence: "FR.VOC.ALPHABET", niveau: 2, format: "clic", consigne: "Clique sur le mot qui vient en premier dans le dictionnaire.", phrase: "table ballon souris", attendu: "ballon", explication: "b vient avant s et t. Le premier est ballon." },
  { cle: "voc-alpha-n2-3", competence: "FR.VOC.ALPHABET", niveau: 2, format: "clic", consigne: "Clique sur le mot qui vient en premier dans le dictionnaire.", phrase: "nuage lune moto", attendu: "lune", explication: "l vient avant m et n. Le premier est lune." },
  { cle: "voc-alpha-n2-4", competence: "FR.VOC.ALPHABET", niveau: 2, format: "clic", consigne: "Clique sur le mot qui vient en premier dans le dictionnaire.", phrase: "renard girafe dauphin", attendu: "dauphin", explication: "d vient avant g et r. Le premier est dauphin." },
  { cle: "voc-alpha-n2-5", competence: "FR.VOC.ALPHABET", niveau: 2, format: "clic", consigne: "Clique sur le mot qui vient en premier dans le dictionnaire.", phrase: "orange fraise cerise", attendu: "cerise", explication: "c vient avant f et o. Le premier est cerise." },
  { cle: "voc-alpha-n3-1", competence: "FR.VOC.ALPHABET", niveau: 3, format: "qcm", consigne: "Entre quels mots du dictionnaire se range le mot lune ?", phrase: "lune", options: ["entre livre et mardi", "entre arbre et chat", "entre table et vélo"], attendu: "entre livre et mardi", explication: "lune commence par l. livre est un mot en l, mardi est un mot en m. l vient entre livre et mardi." },
  { cle: "voc-alpha-n3-2", competence: "FR.VOC.ALPHABET", niveau: 3, format: "qcm", consigne: "Entre quels mots du dictionnaire se range le mot chat ?", phrase: "chat", options: ["entre banane et dent", "entre pomme et table", "entre arbre et avion"], attendu: "entre banane et dent", explication: "chat commence par c. banane est un mot en b, dent est un mot en d. c vient entre b et d." },
  { cle: "voc-alpha-n3-3", competence: "FR.VOC.ALPHABET", niveau: 3, format: "qcm", consigne: "Entre quels mots du dictionnaire se range le mot fraise ?", phrase: "fraise", options: ["entre école et gare", "entre arbre et chat", "entre table et vélo"], attendu: "entre école et gare", explication: "fraise commence par f. école est un mot en e, gare est un mot en g. f vient entre e et g." },
  { cle: "voc-alpha-n3-4", competence: "FR.VOC.ALPHABET", niveau: 3, format: "qcm", consigne: "Entre quels mots du dictionnaire se range le mot souris ?", phrase: "souris", options: ["entre reine et table", "entre arbre et pomme", "entre livre et mardi"], attendu: "entre reine et table", explication: "souris commence par s. reine est un mot en r, table est un mot en t. s vient entre r et t." },
  { cle: "voc-alpha-n3-5", competence: "FR.VOC.ALPHABET", niveau: 3, format: "qcm", consigne: "Entre quels mots du dictionnaire se range le mot nuage ?", phrase: "nuage", options: ["entre moto et orange", "entre arbre et chat", "entre table et vélo"], attendu: "entre moto et orange", explication: "nuage commence par n. moto est un mot en m, orange est un mot en o. n vient entre m et o." },
  { cle: "voc-alpha-n4-1", competence: "FR.VOC.ALPHABET", niveau: 4, format: "texte", consigne: "Écris le mot qui vient en premier dans le dictionnaire.", phrase: "souris chat lion", attendu: "chat", explication: "c vient avant l et s, donc le premier est chat." },
  { cle: "voc-alpha-n4-2", competence: "FR.VOC.ALPHABET", niveau: 4, format: "texte", consigne: "Écris le mot qui vient en premier dans le dictionnaire.", phrase: "moto auto vélo", attendu: "auto", explication: "a vient avant m et v, donc le premier est auto." },
  { cle: "voc-alpha-n4-3", competence: "FR.VOC.ALPHABET", niveau: 4, format: "texte", consigne: "Écris le mot qui vient en premier dans le dictionnaire.", phrase: "fraise banane pomme", attendu: "banane", explication: "b vient avant f et p, donc le premier est banane." },
  { cle: "voc-alpha-n4-4", competence: "FR.VOC.ALPHABET", niveau: 4, format: "texte", consigne: "Écris le mot qui vient en premier dans le dictionnaire.", phrase: "tigre ours lapin", attendu: "lapin", explication: "l vient avant o et t, donc le premier est lapin." },
  { cle: "voc-alpha-n4-5", competence: "FR.VOC.ALPHABET", niveau: 4, format: "texte", consigne: "Écris le mot qui vient en premier dans le dictionnaire.", phrase: "radis citron avion", attendu: "avion", explication: "a vient avant c et r, donc le premier est avion." },
  // FR.VOC.FAMILLES
  { cle: "voc-fam-n1-1", competence: "FR.VOC.FAMILLES", niveau: 1, format: "qcm", consigne: "Quel mot est de la même famille que dent ?", phrase: "", options: ["dentiste", "maison", "bleu"], attendu: "dentiste", explication: "La famille de dent parle des dents. dentiste est de la même famille, c'est la personne qui soigne les dents." },
  { cle: "voc-fam-n1-2", competence: "FR.VOC.FAMILLES", niveau: 1, format: "qcm", consigne: "Quel mot est de la même famille que terre ?", phrase: "", options: ["terrain", "voiture", "chanter"], attendu: "terrain", explication: "La famille de terre parle de la terre. terrain est de la même famille." },
  { cle: "voc-fam-n1-3", competence: "FR.VOC.FAMILLES", niveau: 1, format: "qcm", consigne: "Quel mot est de la même famille que fleur ?", phrase: "", options: ["fleuriste", "tableau", "rapide"], attendu: "fleuriste", explication: "La famille de fleur parle des fleurs. fleuriste est de la même famille, c'est la personne qui vend des fleurs." },
  { cle: "voc-fam-n1-4", competence: "FR.VOC.FAMILLES", niveau: 1, format: "qcm", consigne: "Quel mot est de la même famille que lait ?", phrase: "", options: ["laitier", "montagne", "sauter"], attendu: "laitier", explication: "La famille de lait parle du lait. laitier est de la même famille." },
  { cle: "voc-fam-n1-5", competence: "FR.VOC.FAMILLES", niveau: 1, format: "qcm", consigne: "Quel mot est de la même famille que jardin ?", phrase: "", options: ["jardinier", "cuisine", "rouge"], attendu: "jardinier", explication: "La famille de jardin parle du jardin. jardinier est de la même famille, c'est la personne qui s'occupe du jardin." },
  { cle: "voc-fam-n2-1", competence: "FR.VOC.FAMILLES", niveau: 2, format: "clic", consigne: "Clique sur le mot de la même famille que chant.", phrase: "chanteur table rapide", attendu: "chanteur", explication: "La famille de chant parle de chanter. chanteur est de la même famille." },
  { cle: "voc-fam-n2-2", competence: "FR.VOC.FAMILLES", niveau: 2, format: "clic", consigne: "Clique sur le mot de la même famille que glace.", phrase: "voiture glacier soleil", attendu: "glacier", explication: "La famille de glace parle de la glace. glacier est de la même famille." },
  { cle: "voc-fam-n2-3", competence: "FR.VOC.FAMILLES", niveau: 2, format: "clic", consigne: "Clique sur le mot de la même famille que mer.", phrase: "montagne marin cahier", attendu: "marin", explication: "La famille de mer parle de la mer. marin est de la même famille, c'est celui qui travaille sur la mer." },
  { cle: "voc-fam-n2-4", competence: "FR.VOC.FAMILLES", niveau: 2, format: "clic", consigne: "Clique sur le mot de la même famille que fort.", phrase: "fortement nuage pomme", attendu: "fortement", explication: "La famille de fort parle de la force. fortement est de la même famille." },
  { cle: "voc-fam-n2-5", competence: "FR.VOC.FAMILLES", niveau: 2, format: "clic", consigne: "Clique sur le mot de la même famille que lent.", phrase: "lentement arbre maison", attendu: "lentement", explication: "La famille de lent parle d'aller doucement. lentement est de la même famille." },
  { cle: "voc-fam-n3-1", competence: "FR.VOC.FAMILLES", niveau: 3, format: "clic", consigne: "Clique sur le mot qui n'est pas de la même famille que les autres.", phrase: "fleur fleuriste fleurir voiture", attendu: "voiture", explication: "fleur, fleuriste et fleurir parlent tous des fleurs. voiture n'a rien à voir, c'est l'intrus." },
  { cle: "voc-fam-n3-2", competence: "FR.VOC.FAMILLES", niveau: 3, format: "clic", consigne: "Clique sur le mot qui n'est pas de la même famille que les autres.", phrase: "dent dentiste dentaire soleil", attendu: "soleil", explication: "dent, dentiste et dentaire parlent des dents. soleil est l'intrus." },
  { cle: "voc-fam-n3-3", competence: "FR.VOC.FAMILLES", niveau: 3, format: "clic", consigne: "Clique sur le mot qui n'est pas de la même famille que les autres.", phrase: "terre terrain atterrir banane", attendu: "banane", explication: "terre, terrain et atterrir parlent de la terre. banane est l'intrus." },
  { cle: "voc-fam-n3-4", competence: "FR.VOC.FAMILLES", niveau: 3, format: "clic", consigne: "Clique sur le mot qui n'est pas de la même famille que les autres.", phrase: "lait laitier laitage montagne", attendu: "montagne", explication: "lait, laitier et laitage parlent du lait. montagne est l'intrus." },
  { cle: "voc-fam-n3-5", competence: "FR.VOC.FAMILLES", niveau: 3, format: "clic", consigne: "Clique sur le mot qui n'est pas de la même famille que les autres.", phrase: "jardin jardinier jardinage tigre", attendu: "tigre", explication: "jardin, jardinier et jardinage parlent du jardin. tigre est l'intrus." },
  { cle: "voc-fam-n4-1", competence: "FR.VOC.FAMILLES", niveau: 4, format: "texte", consigne: "La personne qui soigne les dents est le... Écris le mot de la famille de dent.", phrase: "La personne qui soigne les dents est le ___.", attendu: "dentiste", explication: "La famille de dent donne dentiste." },
  { cle: "voc-fam-n4-2", competence: "FR.VOC.FAMILLES", niveau: 4, format: "texte", consigne: "La personne qui vend des fleurs est le... Écris le mot de la famille de fleur.", phrase: "La personne qui vend des fleurs est le ___.", attendu: "fleuriste", explication: "La famille de fleur donne fleuriste." },
  { cle: "voc-fam-n4-3", competence: "FR.VOC.FAMILLES", niveau: 4, format: "texte", consigne: "La personne qui s'occupe du jardin est le... Écris le mot de la famille de jardin.", phrase: "La personne qui s'occupe du jardin est le ___.", attendu: "jardinier", explication: "La famille de jardin donne jardinier." },
  { cle: "voc-fam-n4-4", competence: "FR.VOC.FAMILLES", niveau: 4, format: "texte", consigne: "La personne qui fait la cuisine est le... Écris le mot de la famille de cuisine.", phrase: "La personne qui fait la cuisine est le ___.", attendu: "cuisinier", explication: "La famille de cuisine donne cuisinier." },
  { cle: "voc-fam-n4-5", competence: "FR.VOC.FAMILLES", niveau: 4, format: "texte", consigne: "La personne qui travaille sur la mer est le... Écris le mot de la famille de mer.", phrase: "La personne qui travaille sur la mer est le ___.", attendu: "marin", explication: "La famille de mer donne marin." },
  // FR.VOC.SYN_CONTRAIRES
  { cle: "voc-syn-n1-1", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 1, format: "qcm", consigne: "Quel mot veut dire presque la même chose que content ?", phrase: "", options: ["heureux", "triste", "grand"], attendu: "heureux", explication: "content et heureux veulent dire la même chose. Quand on est content, on est heureux." },
  { cle: "voc-syn-n1-2", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 1, format: "qcm", consigne: "Quel mot veut dire presque la même chose que joli ?", phrase: "", options: ["beau", "laid", "petit"], attendu: "beau", explication: "joli et beau veulent dire la même chose." },
  { cle: "voc-syn-n1-3", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 1, format: "qcm", consigne: "Quel mot veut dire presque la même chose que voiture ?", phrase: "", options: ["auto", "vélo", "route"], attendu: "auto", explication: "voiture et auto veulent dire la même chose." },
  { cle: "voc-syn-n1-4", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 1, format: "qcm", consigne: "Quel mot veut dire presque la même chose que gentil ?", phrase: "", options: ["aimable", "méchant", "grand"], attendu: "aimable", explication: "gentil et aimable veulent dire la même chose." },
  { cle: "voc-syn-n1-5", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 1, format: "qcm", consigne: "Quel mot veut dire presque la même chose que drôle ?", phrase: "", options: ["amusant", "sérieux", "lent"], attendu: "amusant", explication: "drôle et amusant veulent dire la même chose. Ce qui est drôle nous fait rire." },
  { cle: "voc-syn-n2-1", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 2, format: "qcm", consigne: "Quel mot veut dire le contraire de grand ?", phrase: "", options: ["petit", "gros", "haut"], attendu: "petit", explication: "Le contraire de grand est petit." },
  { cle: "voc-syn-n2-2", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 2, format: "qcm", consigne: "Quel mot veut dire le contraire de chaud ?", phrase: "", options: ["froid", "tiède", "doux"], attendu: "froid", explication: "Le contraire de chaud est froid." },
  { cle: "voc-syn-n2-3", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 2, format: "qcm", consigne: "Quel mot veut dire le contraire de jour ?", phrase: "", options: ["nuit", "matin", "soir"], attendu: "nuit", explication: "Le contraire de jour est nuit." },
  { cle: "voc-syn-n2-4", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 2, format: "qcm", consigne: "Quel mot veut dire le contraire de content ?", phrase: "", options: ["triste", "heureux", "joyeux"], attendu: "triste", explication: "Le contraire de content est triste." },
  { cle: "voc-syn-n2-5", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 2, format: "qcm", consigne: "Quel mot veut dire le contraire de monter ?", phrase: "", options: ["descendre", "sauter", "courir"], attendu: "descendre", explication: "Le contraire de monter est descendre." },
  { cle: "voc-syn-n3-1", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 3, format: "qcm", consigne: "Quel mot veut dire le contraire de heureux ?", phrase: "", options: ["malheureux", "joyeux", "content"], attendu: "malheureux", explication: "On ajoute mal devant heureux pour dire le contraire: malheureux." },
  { cle: "voc-syn-n3-2", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 3, format: "qcm", consigne: "Quel mot veut dire le contraire de faire ?", phrase: "", options: ["défaire", "refaire", "fabriquer"], attendu: "défaire", explication: "On ajoute dé devant faire pour dire le contraire: défaire." },
  { cle: "voc-syn-n3-3", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 3, format: "qcm", consigne: "Quel mot veut dire le contraire de plier ?", phrase: "", options: ["déplier", "plisser", "ranger"], attendu: "déplier", explication: "On ajoute dé devant plier pour dire le contraire: déplier." },
  { cle: "voc-syn-n3-4", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 3, format: "qcm", consigne: "Quel mot veut dire le contraire de possible ?", phrase: "", options: ["impossible", "facile", "permis"], attendu: "impossible", explication: "On ajoute im devant possible pour dire le contraire: impossible." },
  { cle: "voc-syn-n3-5", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 3, format: "qcm", consigne: "Quel mot veut dire le contraire de ranger ?", phrase: "", options: ["déranger", "classer", "poser"], attendu: "déranger", explication: "On ajoute dé devant ranger pour dire le contraire: déranger." },
  { cle: "voc-syn-n4-1", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 4, format: "texte", consigne: "Écris le contraire de grand.", phrase: "Le contraire de grand est ___.", attendu: "petit", explication: "Le contraire de grand est petit." },
  { cle: "voc-syn-n4-2", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 4, format: "texte", consigne: "Écris le contraire de chaud.", phrase: "Le contraire de chaud est ___.", attendu: "froid", explication: "Le contraire de chaud est froid." },
  { cle: "voc-syn-n4-3", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 4, format: "texte", consigne: "Écris le contraire de jour.", phrase: "Le contraire de jour est ___.", attendu: "nuit", explication: "Le contraire de jour est nuit." },
  { cle: "voc-syn-n4-4", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 4, format: "texte", consigne: "Écris le contraire de rapide.", phrase: "Le contraire de rapide est ___.", attendu: "lent", explication: "Le contraire de rapide est lent." },
  { cle: "voc-syn-n4-5", competence: "FR.VOC.SYN_CONTRAIRES", niveau: 4, format: "texte", consigne: "Écris le contraire de ouvrir.", phrase: "Le contraire de ouvrir est ___.", attendu: "fermer", explication: "Le contraire de ouvrir est fermer." },
  // FR.VOC.PREFIXE_SUFFIXE
  { cle: "voc-ps-n1-1", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 1, format: "qcm", consigne: "Quel mot veut dire faire encore, recommencer ?", phrase: "", options: ["refaire", "défaire", "faire"], attendu: "refaire", explication: "Le petit mot re devant faire veut dire encore. refaire, c'est faire une deuxième fois." },
  { cle: "voc-ps-n1-2", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 1, format: "qcm", consigne: "Quel mot veut dire lire encore ?", phrase: "", options: ["relire", "élire", "lire"], attendu: "relire", explication: "Le petit mot re devant lire veut dire encore. relire, c'est lire une deuxième fois." },
  { cle: "voc-ps-n1-3", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 1, format: "qcm", consigne: "Quel mot veut dire une petite maison ?", phrase: "", options: ["maisonnette", "maison", "grande"], attendu: "maisonnette", explication: "Le petit bout ette à la fin veut dire petit. une maisonnette est une petite maison." },
  { cle: "voc-ps-n1-4", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 1, format: "qcm", consigne: "Quel mot veut dire une petite tarte ?", phrase: "", options: ["tartelette", "tarte", "gâteau"], attendu: "tartelette", explication: "Le petit bout ette à la fin veut dire petit. une tartelette est une petite tarte." },
  { cle: "voc-ps-n1-5", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 1, format: "qcm", consigne: "Quel mot désigne la personne qui chante ?", phrase: "", options: ["chanteur", "chanson", "chanter"], attendu: "chanteur", explication: "Le petit bout eur à la fin montre la personne qui fait l'action. un chanteur, c'est celui qui chante." },
  { cle: "voc-ps-n2-1", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 2, format: "qcm", consigne: "Quel mot désigne la personne qui joue ?", phrase: "", options: ["joueur", "jouet", "jouer"], attendu: "joueur", explication: "Le petit bout eur montre la personne qui fait l'action. un joueur, c'est celui qui joue." },
  { cle: "voc-ps-n2-2", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 2, format: "qcm", consigne: "Quel mot désigne la personne qui danse ?", phrase: "", options: ["danseur", "danse", "danser"], attendu: "danseur", explication: "Le petit bout eur montre la personne qui fait l'action. un danseur, c'est celui qui danse." },
  { cle: "voc-ps-n2-3", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 2, format: "qcm", consigne: "Quel mot veut dire une petite cloche ?", phrase: "", options: ["clochette", "cloche", "sonnette"], attendu: "clochette", explication: "Le petit bout ette veut dire petit. une clochette est une petite cloche." },
  { cle: "voc-ps-n2-4", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 2, format: "qcm", consigne: "Quel mot commence par le préfixe dé et dit le contraire de faire ?", phrase: "", options: ["défaire", "refaire", "faire"], attendu: "défaire", explication: "Le préfixe dé est au début de défaire. Il dit le contraire de faire." },
  { cle: "voc-ps-n2-5", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 2, format: "qcm", consigne: "Quel mot veut dire colorier encore ?", phrase: "", options: ["recolorier", "colorier", "décolorier"], attendu: "recolorier", explication: "Le préfixe re veut dire encore. recolorier, c'est colorier une deuxième fois." },
  { cle: "voc-ps-n3-1", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 3, format: "clic", consigne: "Clique sur le mot qui commence par le préfixe re.", phrase: "refaire chanteur petite", attendu: "refaire", explication: "Le préfixe re est au début de refaire. Il veut dire encore." },
  { cle: "voc-ps-n3-2", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 3, format: "clic", consigne: "Clique sur le mot qui commence par le préfixe dé.", phrase: "maison défaire joueur", attendu: "défaire", explication: "Le préfixe dé est au début de défaire. Il dit le contraire." },
  { cle: "voc-ps-n3-3", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 3, format: "clic", consigne: "Clique sur le mot qui se termine par eur, la personne qui fait l'action.", phrase: "chanson chanteur refaire", attendu: "chanteur", explication: "Le petit bout eur est à la fin de chanteur. C'est celui qui chante." },
  { cle: "voc-ps-n3-4", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 3, format: "clic", consigne: "Clique sur le mot qui se termine par ette et veut dire petit.", phrase: "maison maisonnette jardin", attendu: "maisonnette", explication: "Le petit bout ette est à la fin de maisonnette. une maisonnette est une petite maison." },
  { cle: "voc-ps-n3-5", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 3, format: "clic", consigne: "Clique sur le mot qui dit le contraire de possible.", phrase: "possible impossible facile", attendu: "impossible", explication: "Le préfixe im est au début de impossible. Il dit le contraire de possible." },
  { cle: "voc-ps-n4-1", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 4, format: "texte", consigne: "Ajoute le préfixe re devant le mot lire pour dire lire encore. Écris le mot.", phrase: "lire une deuxième fois, c'est ___", attendu: "relire", explication: "On met re devant lire: relire." },
  { cle: "voc-ps-n4-2", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 4, format: "texte", consigne: "Ajoute le préfixe dé devant le mot faire pour dire le contraire. Écris le mot.", phrase: "le contraire de faire, c'est ___", attendu: "défaire", explication: "On met dé devant faire: défaire." },
  { cle: "voc-ps-n4-3", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 4, format: "texte", consigne: "Écris la personne qui chante, avec le petit bout eur à la fin.", phrase: "celui qui chante est un ___", attendu: "chanteur", explication: "On ajoute eur à chant: chanteur." },
  { cle: "voc-ps-n4-4", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 4, format: "texte", consigne: "Écris une petite maison, avec le petit bout ette à la fin.", phrase: "une petite maison est une ___", attendu: "maisonnette", explication: "On ajoute ette à maison: maisonnette." },
  { cle: "voc-ps-n4-5", competence: "FR.VOC.PREFIXE_SUFFIXE", niveau: 4, format: "texte", consigne: "Ajoute le préfixe re devant le mot faire pour dire faire encore. Écris le mot.", phrase: "faire une deuxième fois, c'est ___", attendu: "refaire", explication: "On met re devant faire: refaire." },
  // FR.VOC.CATEGORIES
  { cle: "voc-cat-n1-1", competence: "FR.VOC.CATEGORIES", niveau: 1, format: "qcm", consigne: "Le chien, le chat et le lapin sont des...", phrase: "le chien, le chat et le lapin", options: ["animaux", "fruits", "couleurs"], attendu: "animaux", explication: "Le chien, le chat et le lapin sont tous des animaux. Animaux est le mot général." },
  { cle: "voc-cat-n1-2", competence: "FR.VOC.CATEGORIES", niveau: 1, format: "qcm", consigne: "La pomme, la banane et la cerise sont des...", phrase: "la pomme, la banane et la cerise", options: ["fruits", "légumes", "jouets"], attendu: "fruits", explication: "La pomme, la banane et la cerise sont des fruits." },
  { cle: "voc-cat-n1-3", competence: "FR.VOC.CATEGORIES", niveau: 1, format: "qcm", consigne: "Le rouge, le bleu et le vert sont des...", phrase: "le rouge, le bleu et le vert", options: ["couleurs", "animaux", "nombres"], attendu: "couleurs", explication: "Le rouge, le bleu et le vert sont des couleurs." },
  { cle: "voc-cat-n1-4", competence: "FR.VOC.CATEGORIES", niveau: 1, format: "qcm", consigne: "La carotte, le poireau et la tomate sont des...", phrase: "la carotte, le poireau et la tomate", options: ["légumes", "fruits", "fleurs"], attendu: "légumes", explication: "La carotte, le poireau et la tomate sont des légumes." },
  { cle: "voc-cat-n1-5", competence: "FR.VOC.CATEGORIES", niveau: 1, format: "qcm", consigne: "Le train, le vélo et la voiture sont des...", phrase: "le train, le vélo et la voiture", options: ["véhicules", "animaux", "vêtements"], attendu: "véhicules", explication: "Le train, le vélo et la voiture servent à se déplacer: ce sont des véhicules." },
  { cle: "voc-cat-n2-1", competence: "FR.VOC.CATEGORIES", niveau: 2, format: "qcm", consigne: "Quel mot est un fruit ?", phrase: "", options: ["poire", "carotte", "chaise"], attendu: "poire", explication: "La poire est un fruit. La carotte est un légume." },
  { cle: "voc-cat-n2-2", competence: "FR.VOC.CATEGORIES", niveau: 2, format: "qcm", consigne: "Quel mot est un animal ?", phrase: "", options: ["renard", "table", "rouge"], attendu: "renard", explication: "Le renard est un animal." },
  { cle: "voc-cat-n2-3", competence: "FR.VOC.CATEGORIES", niveau: 2, format: "qcm", consigne: "Quel mot est un légume ?", phrase: "", options: ["poireau", "pomme", "vélo"], attendu: "poireau", explication: "Le poireau est un légume." },
  { cle: "voc-cat-n2-4", competence: "FR.VOC.CATEGORIES", niveau: 2, format: "qcm", consigne: "Quel mot est un vêtement ?", phrase: "", options: ["manteau", "banane", "chien"], attendu: "manteau", explication: "Le manteau est un vêtement, on le met pour avoir chaud." },
  { cle: "voc-cat-n2-5", competence: "FR.VOC.CATEGORIES", niveau: 2, format: "qcm", consigne: "Quel mot est un meuble ?", phrase: "", options: ["armoire", "pomme", "nuage"], attendu: "armoire", explication: "L'armoire est un meuble, on range les habits dedans." },
  { cle: "voc-cat-n3-1", competence: "FR.VOC.CATEGORIES", niveau: 3, format: "clic", consigne: "Clique sur le mot qui n'est pas un fruit.", phrase: "pomme banane carotte poire", attendu: "carotte", explication: "La pomme, la banane et la poire sont des fruits. La carotte est un légume, c'est l'intrus." },
  { cle: "voc-cat-n3-2", competence: "FR.VOC.CATEGORIES", niveau: 3, format: "clic", consigne: "Clique sur le mot qui n'est pas un animal.", phrase: "chien chat table lapin", attendu: "table", explication: "Le chien, le chat et le lapin sont des animaux. La table est l'intrus." },
  { cle: "voc-cat-n3-3", competence: "FR.VOC.CATEGORIES", niveau: 3, format: "clic", consigne: "Clique sur le mot qui n'est pas une couleur.", phrase: "rouge bleu banane vert", attendu: "banane", explication: "Rouge, bleu et vert sont des couleurs. Banane est l'intrus." },
  { cle: "voc-cat-n3-4", competence: "FR.VOC.CATEGORIES", niveau: 3, format: "clic", consigne: "Clique sur le mot qui n'est pas un légume.", phrase: "carotte tomate poire poireau", attendu: "poire", explication: "La carotte, la tomate et le poireau sont des légumes. La poire est un fruit, c'est l'intrus." },
  { cle: "voc-cat-n3-5", competence: "FR.VOC.CATEGORIES", niveau: 3, format: "clic", consigne: "Clique sur le mot qui n'est pas un vêtement.", phrase: "manteau pantalon armoire pull", attendu: "armoire", explication: "Le manteau, le pantalon et le pull sont des vêtements. L'armoire est un meuble, c'est l'intrus." },
  { cle: "voc-cat-n4-1", competence: "FR.VOC.CATEGORIES", niveau: 4, format: "texte", consigne: "La rose, la tulipe et le lilas sont des... Écris le mot général.", phrase: "La rose, la tulipe et le lilas sont des ___.", attendu: "fleurs", explication: "La rose, la tulipe et le lilas sont des fleurs." },
  { cle: "voc-cat-n4-2", competence: "FR.VOC.CATEGORIES", niveau: 4, format: "texte", consigne: "Le lion, le tigre et l'ours sont des... Écris le mot général.", phrase: "Le lion, le tigre et l'ours sont des ___.", attendu: "animaux", explication: "Le lion, le tigre et l'ours sont des animaux." },
  { cle: "voc-cat-n4-3", competence: "FR.VOC.CATEGORIES", niveau: 4, format: "texte", consigne: "La pomme, la poire et la fraise sont des... Écris le mot général.", phrase: "La pomme, la poire et la fraise sont des ___.", attendu: "fruits", explication: "La pomme, la poire et la fraise sont des fruits." },
  { cle: "voc-cat-n4-4", competence: "FR.VOC.CATEGORIES", niveau: 4, format: "texte", consigne: "Le rouge, le jaune et le bleu sont des... Écris le mot général.", phrase: "Le rouge, le jaune et le bleu sont des ___.", attendu: "couleurs", explication: "Le rouge, le jaune et le bleu sont des couleurs." },
  { cle: "voc-cat-n4-5", competence: "FR.VOC.CATEGORIES", niveau: 4, format: "texte", consigne: "Le bus, le train et l'avion sont des... Écris le mot général.", phrase: "Le bus, le train et l'avion sont des ___.", attendu: "véhicules", explication: "Le bus, le train et l'avion sont des véhicules." },
];

export const BANQUE_MOTS: LexItem[] = [
  // FR.MOTS.INVARIABLES
  { cle: "mots-n1-beaucoup", competence: "FR.MOTS.INVARIABLES", niveau: 1, format: "qcm", consigne: "Quel mot est bien écrit ?", phrase: "", options: ["beaucoup", "bocoup", "beaucou"], attendu: "beaucoup", explication: "Dans beaucoup, on écrit b, e, a, u, puis coup avec un p à la fin qu'on n'entend pas." },
  { cle: "mots-n1-toujours", competence: "FR.MOTS.INVARIABLES", niveau: 1, format: "qcm", consigne: "Quel mot est bien écrit ?", phrase: "", options: ["toujours", "toujour", "toulours"], attendu: "toujours", explication: "À la fin de toujours, il y a un s qu'on n'entend pas." },
  { cle: "mots-n1-avec", competence: "FR.MOTS.INVARIABLES", niveau: 1, format: "qcm", consigne: "Quel mot est bien écrit ?", phrase: "", options: ["avec", "avek", "avc"], attendu: "avec", explication: "avec se termine par un c. On écrit a, v, e, c." },
  { cle: "mots-n1-dans", competence: "FR.MOTS.INVARIABLES", niveau: 1, format: "qcm", consigne: "Quel mot est bien écrit ?", phrase: "", options: ["dans", "dan", "dens"], attendu: "dans", explication: "À la fin de dans, il y a un s qu'on n'entend pas. On écrit d, a, n, s." },
  { cle: "mots-n1-aussi", competence: "FR.MOTS.INVARIABLES", niveau: 1, format: "qcm", consigne: "Quel mot est bien écrit ?", phrase: "", options: ["aussi", "ausi", "osi"], attendu: "aussi", explication: "Dans aussi, il y a deux s au milieu." },
  { cle: "mots-n2-maintenant", competence: "FR.MOTS.INVARIABLES", niveau: 2, format: "qcm", consigne: "Quel mot est bien écrit ?", phrase: "", options: ["maintenant", "maintenan", "mintenant"], attendu: "maintenant", explication: "À la fin de maintenant, il y a un t qu'on n'entend pas. Au milieu, on écrit a, i, n." },
  { cle: "mots-n2-souvent", competence: "FR.MOTS.INVARIABLES", niveau: 2, format: "qcm", consigne: "Quel mot est bien écrit ?", phrase: "", options: ["souvent", "souvant", "souven"], attendu: "souvent", explication: "À la fin de souvent, il y a un t qu'on n'entend pas." },
  { cle: "mots-n2-jamais", competence: "FR.MOTS.INVARIABLES", niveau: 2, format: "qcm", consigne: "Quel mot est bien écrit ?", phrase: "", options: ["jamais", "jamai", "jamès"], attendu: "jamais", explication: "À la fin de jamais, il y a un s qu'on n'entend pas." },
  { cle: "mots-n2-encore", competence: "FR.MOTS.INVARIABLES", niveau: 2, format: "qcm", consigne: "Quel mot est bien écrit ?", phrase: "", options: ["encore", "ancore", "encor"], attendu: "encore", explication: "encore commence par e, n, et se termine par un e." },
  { cle: "mots-n2-assez", competence: "FR.MOTS.INVARIABLES", niveau: 2, format: "qcm", consigne: "Quel mot est bien écrit ?", phrase: "", options: ["assez", "asez", "assé"], attendu: "assez", explication: "Dans assez, il y a deux s. À la fin, il y a un z qu'on n'entend pas." },
  { cle: "mots-n3-pendant", competence: "FR.MOTS.INVARIABLES", niveau: 3, format: "qcm", consigne: "Choisis le mot bien écrit pour compléter la phrase.", phrase: "Il a plu ___ la nuit.", options: ["pendant", "pandant", "pendan"], attendu: "pendant", explication: "À la fin de pendant, il y a un t qu'on n'entend pas." },
  { cle: "mots-n3-depuis", competence: "FR.MOTS.INVARIABLES", niveau: 3, format: "qcm", consigne: "Choisis le mot bien écrit pour compléter la phrase.", phrase: "Je t'attends ___ ce matin.", options: ["depuis", "depui", "depuit"], attendu: "depuis", explication: "À la fin de depuis, il y a un s qu'on n'entend pas." },
  { cle: "mots-n3-trop", competence: "FR.MOTS.INVARIABLES", niveau: 3, format: "qcm", consigne: "Choisis le mot bien écrit pour compléter la phrase.", phrase: "Ce sac est ___ lourd.", options: ["trop", "tro", "trops"], attendu: "trop", explication: "À la fin de trop, il y a un p qu'on n'entend pas." },
  { cle: "mots-n3-deja", competence: "FR.MOTS.INVARIABLES", niveau: 3, format: "qcm", consigne: "Choisis le mot bien écrit pour compléter la phrase.", phrase: "As-tu ___ fini ton travail ?", options: ["déjà", "deja", "déja"], attendu: "déjà", explication: "déjà a deux accents: un sur le e et un sur le a à la fin." },
  { cle: "mots-n3-bientot", competence: "FR.MOTS.INVARIABLES", niveau: 3, format: "qcm", consigne: "Choisis le mot bien écrit pour compléter la phrase.", phrase: "Les vacances arrivent ___.", options: ["bientôt", "bientot", "biento"], attendu: "bientôt", explication: "bientôt a un accent sur le o, et un t à la fin qu'on n'entend pas." },
  { cle: "mots-n4-aujourdhui", competence: "FR.MOTS.INVARIABLES", niveau: 4, format: "texte", consigne: "Écris le petit mot qui veut dire le jour où on est.", phrase: "___, nous allons à l'école.", attendu: "aujourd'hui", explication: "aujourd'hui s'écrit en deux morceaux reliés par une apostrophe: aujourd, puis hui. Il y a un d et un h qu'on n'entend pas." },
  { cle: "mots-n4-ensuite", competence: "FR.MOTS.INVARIABLES", niveau: 4, format: "texte", consigne: "Écris le petit mot qui veut dire après, pour continuer.", phrase: "D'abord je me lève, ___ je m'habille.", attendu: "ensuite", explication: "ensuite commence par e, n, et se termine par un e." },
  { cle: "mots-n4-beaucoup", competence: "FR.MOTS.INVARIABLES", niveau: 4, format: "texte", consigne: "Écris le petit mot qui veut dire une grande quantité.", phrase: "Il y a ___ de fleurs dans le jardin.", attendu: "beaucoup", explication: "Dans beaucoup, on écrit b, e, a, u, puis coup avec un p à la fin qu'on n'entend pas." },
  { cle: "mots-n4-toujours", competence: "FR.MOTS.INVARIABLES", niveau: 4, format: "texte", consigne: "Écris le petit mot qui veut dire tout le temps.", phrase: "Le soleil se lève ___ du même côté.", attendu: "toujours", explication: "À la fin de toujours, il y a un s qu'on n'entend pas." },
  { cle: "mots-n4-souvent", competence: "FR.MOTS.INVARIABLES", niveau: 4, format: "texte", consigne: "Écris le petit mot qui veut dire de nombreuses fois.", phrase: "Je vais ___ à la piscine.", attendu: "souvent", explication: "À la fin de souvent, il y a un t qu'on n'entend pas." },
];

// Banque complete (lookup par cle, juge local).
export const BANQUE_LEXIQUE: LexItem[] = [...BANQUE_VOCABULAIRE, ...BANQUE_MOTS];

export const COMPETENCES_VOCABULAIRE = [
  "FR.VOC.ALPHABET",
  "FR.VOC.FAMILLES",
  "FR.VOC.SYN_CONTRAIRES",
  "FR.VOC.PREFIXE_SUFFIXE",
  "FR.VOC.CATEGORIES",
] as const;

export const COMPETENCES_MOTS = [
  "FR.MOTS.INVARIABLES",
] as const;

// Items jouables pour une competence et un niveau donnes.
export function itemsLexiqueDe(competence: string, niveau: number): LexItem[] {
  return BANQUE_LEXIQUE.filter((i) => i.competence === competence && i.niveau === niveau);
}

// Juge local (mode demo + feedback immediat) : miroir exact du serveur.
export function estJusteLexique(cle: string, saisie: string): boolean {
  const item = BANQUE_LEXIQUE.find((i) => i.cle === cle);
  if (!item) return false;
  return comparerLexique(item.format, saisie, item.attendu);
}

// Recupere un item par sa cle (utilise par le composant d'exercice).
export function itemLexiqueParCle(cle: string): LexItem | undefined {
  return BANQUE_LEXIQUE.find((i) => i.cle === cle);
}
