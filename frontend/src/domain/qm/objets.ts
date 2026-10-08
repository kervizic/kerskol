// Banque « LES OBJETS » (Questionner le monde, CE2, cycle 2). Sous-matiere,
// domaine dedie `objets` :
//   QM.OBJETS.CIRCUIT    circuit electrique simple (pile, ampoule, fils,
//                        interrupteur ; ouvert/ferme ; dangers de l'electricite) ;
//   QM.OBJETS.FONCTIONS  objets et leurs fonctions ;
//   QM.OBJETS.LEVIERS    leviers et balances simples ;
//   QM.OBJETS.NUMERIQUE  usage responsable des objets numeriques.
//
// Le circuit utilise une SCENE SVG maison (circuitScene) : « dire si l'ampoule
// s'allume » (qcm oui/non, l'etat du circuit decide l'attendu = simulation
// simple cote serveur) et « toucher un composant » (clic sur une zone).
//
// Progression : N1 QCM ; N2/N3 QCM, TRI ou CLIC ; N4 reponse LIBRE (texte).

import { type QmItem, tri } from "./types";
import { circuitScene } from "./scenes";

export const BANQUE_OBJETS: QmItem[] = [
  // =======================================================================
  // QM.OBJETS.CIRCUIT — circuit electrique simple
  // =======================================================================
  { cle: "qm-obj-cir-n1-a", competence: "QM.OBJETS.CIRCUIT", niveau: 1, format: "qcm",
    consigne: "Regarde le circuit. L'interrupteur est fermé. L'ampoule s'allume-t-elle ?",
    options: ["oui", "non"], attendu: "oui", figure: circuitScene({ closed: true }),
    explication: "Le circuit est fermé : le courant passe dans toute la boucle, l'ampoule s'allume." },
  { cle: "qm-obj-cir-n1-b", competence: "QM.OBJETS.CIRCUIT", niveau: 1, format: "qcm",
    consigne: "Regarde le circuit. L'interrupteur est ouvert. L'ampoule s'allume-t-elle ?",
    options: ["oui", "non"], attendu: "non", figure: circuitScene({ closed: false }),
    explication: "L'interrupteur est ouvert : la boucle est coupée, le courant ne passe pas, l'ampoule reste éteinte." },
  { cle: "qm-obj-cir-n2-a", competence: "QM.OBJETS.CIRCUIT", niveau: 2, format: "clic",
    consigne: "Clique sur l'objet qui ouvre et ferme le circuit.",
    attendu: "l'interrupteur", figure: circuitScene({ closed: true, withZones: true }),
    explication: "L'interrupteur ouvre et ferme le circuit : il allume ou éteint l'ampoule." },
  { cle: "qm-obj-cir-n2-b", competence: "QM.OBJETS.CIRCUIT", niveau: 2, format: "qcm",
    consigne: "Regarde le circuit. Un fil est coupé. L'ampoule s'allume-t-elle ?",
    options: ["oui", "non"], attendu: "non", figure: circuitScene({ closed: true, broken: true }),
    explication: "Un fil coupé interrompt la boucle : le courant ne passe plus, l'ampoule reste éteinte." },
  { cle: "qm-obj-cir-n3-a", competence: "QM.OBJETS.CIRCUIT", niveau: 3, format: "clic",
    consigne: "Clique sur l'objet qui donne le courant électrique.",
    attendu: "la pile", figure: circuitScene({ closed: true, withZones: true }),
    explication: "La pile est la source d'électricité : elle pousse le courant dans les fils." },
  { cle: "qm-obj-cir-n3-b", competence: "QM.OBJETS.CIRCUIT", niveau: 3, format: "qcm",
    consigne: "De quoi une ampoule a-t-elle besoin pour s'allumer dans un circuit ?",
    options: ["d'une pile", "d'eau", "de sable"], attendu: "d'une pile",
    explication: "La pile fournit le courant électrique qui fait briller l'ampoule." },
  { cle: "qm-obj-cir-n4-a", competence: "QM.OBJETS.CIRCUIT", niveau: 4, format: "texte",
    consigne: "Pour que l'ampoule s'allume, le circuit doit être fermé et former une... Écris le mot.",
    attendu: "boucle",
    explication: "Un circuit fermé forme une boucle complète : le courant peut tourner et l'ampoule s'allume." },
  { cle: "qm-obj-cir-n4-b", competence: "QM.OBJETS.CIRCUIT", niveau: 4, format: "texte",
    consigne: "C'est dangereux : on ne met jamais les doigts dans une... électrique de la maison. Écris le mot.",
    attendu: "prise",
    explication: "On ne met jamais les doigts ni un objet dans une prise : l'électricité de la maison est dangereuse." },

  // =======================================================================
  // QM.OBJETS.FONCTIONS — objets et leurs fonctions
  // =======================================================================
  { cle: "qm-obj-fon-n1-a", competence: "QM.OBJETS.FONCTIONS", niveau: 1, format: "qcm",
    consigne: "À quoi sert un parapluie ?",
    options: ["à se protéger de la pluie", "à manger", "à écrire"], attendu: "à se protéger de la pluie",
    explication: "Le parapluie sert à se protéger de la pluie." },
  { cle: "qm-obj-fon-n1-b", competence: "QM.OBJETS.FONCTIONS", niveau: 1, format: "qcm",
    consigne: "À quoi sert une paire de ciseaux ?",
    options: ["à couper", "à boire", "à dormir"], attendu: "à couper",
    explication: "Les ciseaux servent à couper le papier ou le tissu." },
  { cle: "qm-obj-fon-n2-a", competence: "QM.OBJETS.FONCTIONS", niveau: 2, format: "tri",
    consigne: "Range chaque objet avec ce à quoi il sert.",
    ...tri(["pour écrire", "pour couper", "pour manger"], [["le stylo", "pour écrire"], ["le couteau", "pour couper"], ["la fourchette", "pour manger"]]),
    explication: "Le stylo sert à écrire, le couteau à couper, la fourchette à manger." },
  { cle: "qm-obj-fon-n2-b", competence: "QM.OBJETS.FONCTIONS", niveau: 2, format: "qcm",
    consigne: "Quel objet sert à savoir l'heure ?",
    options: ["une montre", "une casserole", "un balai"], attendu: "une montre",
    explication: "La montre sert à lire l'heure." },
  { cle: "qm-obj-fon-n3-a", competence: "QM.OBJETS.FONCTIONS", niveau: 3, format: "qcm",
    consigne: "Quel objet sert à se déplacer ?",
    options: ["un vélo", "une lampe", "une assiette"], attendu: "un vélo",
    explication: "Le vélo sert à se déplacer." },
  { cle: "qm-obj-fon-n3-b", competence: "QM.OBJETS.FONCTIONS", niveau: 3, format: "tri",
    consigne: "Range chaque objet avec sa fonction.",
    ...tri(["pour se laver", "pour s'éclairer", "pour se déplacer"], [["le savon", "pour se laver"], ["la lampe", "pour s'éclairer"], ["la voiture", "pour se déplacer"]]),
    explication: "Le savon sert à se laver, la lampe à s'éclairer, la voiture à se déplacer." },
  { cle: "qm-obj-fon-n4-a", competence: "QM.OBJETS.FONCTIONS", niveau: 4, format: "texte",
    consigne: "L'objet qui sert à ouvrir une porte fermée s'appelle une... Écris le mot.",
    attendu: "clé",
    explication: "La clé sert à ouvrir ou fermer une serrure." },
  { cle: "qm-obj-fon-n4-b", competence: "QM.OBJETS.FONCTIONS", niveau: 4, format: "texte",
    consigne: "L'objet qui sert à balayer la poussière par terre s'appelle un... Écris le mot.",
    attendu: "balai",
    explication: "Le balai sert à ramasser la poussière par terre." },

  // =======================================================================
  // QM.OBJETS.LEVIERS — leviers et balances simples
  // =======================================================================
  { cle: "qm-obj-lev-n1-a", competence: "QM.OBJETS.LEVIERS", niveau: 1, format: "qcm",
    consigne: "Sur une balance, que fait le plateau le plus lourd ?",
    options: ["il descend", "il monte", "il reste au milieu"], attendu: "il descend",
    explication: "Le plateau le plus lourd descend, le plus léger monte." },
  { cle: "qm-obj-lev-n1-b", competence: "QM.OBJETS.LEVIERS", niveau: 1, format: "qcm",
    consigne: "Sur une bascule, qui descend ?",
    options: ["le plus lourd", "le plus léger", "personne"], attendu: "le plus lourd",
    explication: "Sur une bascule, le côté le plus lourd descend." },
  { cle: "qm-obj-lev-n2-a", competence: "QM.OBJETS.LEVIERS", niveau: 2, format: "qcm",
    consigne: "Une balance est équilibrée quand les deux côtés ont...",
    options: ["le même poids", "des poids différents", "rien dessus"], attendu: "le même poids",
    explication: "La balance est équilibrée quand les deux plateaux ont le même poids." },
  { cle: "qm-obj-lev-n2-b", competence: "QM.OBJETS.LEVIERS", niveau: 2, format: "qcm",
    consigne: "À quoi sert un levier ?",
    options: ["à soulever plus facilement", "à manger", "à écrire"], attendu: "à soulever plus facilement",
    explication: "Un levier, comme une barre glissée sous un gros caillou, aide à soulever plus facilement." },
  { cle: "qm-obj-lev-n3-a", competence: "QM.OBJETS.LEVIERS", niveau: 3, format: "qcm",
    consigne: "Sur une balance, 5 kg à gauche et 3 kg à droite. Que fait le côté gauche ?",
    options: ["il descend", "il monte", "il reste droit"], attendu: "il descend",
    explication: "5 kg est plus lourd que 3 kg : le côté gauche descend." },
  { cle: "qm-obj-lev-n3-b", competence: "QM.OBJETS.LEVIERS", niveau: 3, format: "qcm",
    consigne: "Pour équilibrer une balance qui a 5 kg à gauche, il faut à droite...",
    options: ["5 kg", "2 kg", "10 kg"], attendu: "5 kg",
    explication: "Pour équilibrer, il faut le même poids des deux côtés : 5 kg." },
  { cle: "qm-obj-lev-n4-a", competence: "QM.OBJETS.LEVIERS", niveau: 4, format: "texte",
    consigne: "Quand les deux plateaux d'une balance sont au même niveau, on dit qu'elle est en... Écris le mot.",
    attendu: "équilibre",
    explication: "Quand les deux côtés ont le même poids, la balance est en équilibre." },
  { cle: "qm-obj-lev-n4-b", competence: "QM.OBJETS.LEVIERS", niveau: 4, format: "texte",
    consigne: "La barre qui aide à soulever une lourde charge s'appelle un... Écris le mot.",
    attendu: "levier",
    explication: "Le levier est une barre qui aide à soulever une charge lourde avec moins d'effort." },

  // =======================================================================
  // QM.OBJETS.NUMERIQUE — usage responsable des objets numeriques
  // =======================================================================
  { cle: "qm-obj-num-n1-a", competence: "QM.OBJETS.NUMERIQUE", niveau: 1, format: "qcm",
    consigne: "Que faut-il faire avant d'utiliser longtemps une tablette ?",
    options: ["demander à un adulte", "ne rien dire", "la cacher"], attendu: "demander à un adulte",
    explication: "On demande toujours à un adulte avant d'utiliser longtemps un écran." },
  { cle: "qm-obj-num-n1-b", competence: "QM.OBJETS.NUMERIQUE", niveau: 1, format: "qcm",
    consigne: "Rester très longtemps devant un écran, c'est...",
    options: ["mauvais pour les yeux", "bon pour dormir", "sans effet"], attendu: "mauvais pour les yeux",
    explication: "Trop d'écran fatigue les yeux et le sommeil : il faut faire des pauses." },
  { cle: "qm-obj-num-n2-a", competence: "QM.OBJETS.NUMERIQUE", niveau: 2, format: "tri",
    consigne: "Classe chaque habitude : bon ou mauvais usage des écrans.",
    ...tri(["bon usage", "mauvais usage"], [["faire une pause souvent", "bon usage"], ["jouer toute la journée", "mauvais usage"], ["demander à un adulte", "bon usage"], ["utiliser un écran la nuit", "mauvais usage"]]),
    explication: "Faire des pauses et demander à un adulte, c'est un bon usage. Jouer toute la journée ou la nuit, non." },
  { cle: "qm-obj-num-n2-b", competence: "QM.OBJETS.NUMERIQUE", niveau: 2, format: "qcm",
    consigne: "Si une personne inconnue t'écrit sur un écran, que fais-tu ?",
    options: ["j'en parle à un adulte", "je réponds tout de suite", "je donne mon adresse"], attendu: "j'en parle à un adulte",
    explication: "Face à un inconnu sur un écran, on en parle toujours à un adulte." },
  { cle: "qm-obj-num-n3-a", competence: "QM.OBJETS.NUMERIQUE", niveau: 3, format: "qcm",
    consigne: "Pourquoi faut-il faire des pauses devant un écran ?",
    options: ["pour reposer les yeux", "pour mieux voir la nuit", "pour grandir plus vite"], attendu: "pour reposer les yeux",
    explication: "Les pauses reposent les yeux et le corps." },
  { cle: "qm-obj-num-n3-b", competence: "QM.OBJETS.NUMERIQUE", niveau: 3, format: "qcm",
    consigne: "Peut-on tout croire de ce qu'on voit sur Internet ?",
    options: ["non, il faut vérifier", "oui, toujours", "oui, si c'est en couleur"], attendu: "non, il faut vérifier",
    explication: "Sur Internet, tout n'est pas vrai : on vérifie avec un adulte ou dans un livre." },
  { cle: "qm-obj-num-n4-a", competence: "QM.OBJETS.NUMERIQUE", niveau: 4, format: "texte",
    consigne: "Avant d'utiliser longtemps un écran, je demande à un... Écris le mot.",
    attendu: "adulte",
    explication: "On demande à un adulte avant d'utiliser longtemps un écran." },
  { cle: "qm-obj-num-n4-b", competence: "QM.OBJETS.NUMERIQUE", niveau: 4, format: "texte",
    consigne: "L'écran fatigue surtout une partie du visage : les... Écris le mot.",
    attendu: "yeux",
    explication: "L'écran fatigue surtout les yeux : il faut faire des pauses pour les reposer." },
];

export const COMPETENCES_OBJETS = [
  "QM.OBJETS.CIRCUIT",
  "QM.OBJETS.FONCTIONS",
  "QM.OBJETS.LEVIERS",
  "QM.OBJETS.NUMERIQUE",
] as const;
