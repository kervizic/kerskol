// Banque « GEOGRAPHIE » (CM1, cycle 3 - NOUVEAU PROGRAMME 2026). Nouvelle
// MATIERE (GEO), rendue par <QuestionnerLeMonde> et jugee par le SERVEUR
// (op 'qm', table public.qm_item, verif_qm) comme les autres matieres QM.
//
// Programme officiel d'histoire-geographie du cycle 3 (annexe 4), applicable au
// CM1 a la rentree 2026. CM1 geographie = « la diversite des modes de vie dans
// le monde ». QUATRE sous-matieres (un `domaine` chacune) :
//   GEO.NOURRIR     se_nourrir    se nourrir dans le monde (cereales, agriculture,
//                                 elevage, peche, alimentation variee) ;
//   GEO.INEGALITES  inegalites    les inegalites dans le monde (eau potable,
//                                 sante, education ; planisphere) ;
//   GEO.DEPLACER    se_deplacer   se deplacer (modes, infrastructures, distances
//                                 en kilometres et temps de trajet) ;
//   GEO.COMMUNIQUER communiquer   communiquer avec Internet (usages, cables
//                                 sous-marins et satellites, inegalites d'acces).
//
// BIENVEILLANCE STRICTE : la geographie reste sous la regle de bienveillance
// (contrairement a l'histoire, seule exemptee). Les inegalites sont dites avec
// mesure et espoir (« l'eau potable manque parfois », « des enfants ne peuvent
// pas toujours aller a l'ecole », « des associations aident »), sans mot ni
// scene dramatiques. Progression N1 -> N4 (reponse libre).
//
// Les anciennes sous-matieres (0100 : se_reperer, habiter, travail_loisirs,
// consommer, france_reperes, paysages) relevaient d'une autre entree du
// programme : elles sont desactivees cote serveur (migration 0104, actif=false)
// sans perte de donnees.

import { type QmItem, tri } from "../qm/types";

export const BANQUE_GEOGRAPHIE: QmItem[] = [
  // ===== GEO.NOURRIR - se nourrir dans le monde =====
  { cle: "ge-nou-n1-a", competence: "GEO.NOURRIR", niveau: 1, format: "qcm",
    consigne: "Pour se nourrir, de quoi les êtres humains ont-ils besoin chaque jour ?",
    options: ["manger et boire", "dormir seulement", "jouer seulement"], attendu: "manger et boire",
    explication: "Se nourrir, c'est manger et boire chaque jour pour avoir de l'énergie et bien grandir." },
  { cle: "ge-nou-n1-b", competence: "GEO.NOURRIR", niveau: 1, format: "qcm",
    consigne: "Le riz, le blé et le maïs sont des aliments de base. Comment appelle-t-on ces plantes ?",
    options: ["des céréales", "des jouets", "des vêtements"], attendu: "des céréales",
    explication: "Les céréales (riz, blé, maïs) nourrissent une grande partie de la planète." },
  { cle: "ge-nou-n2-a", competence: "GEO.NOURRIR", niveau: 2, format: "qcm",
    consigne: "Dans beaucoup de pays d'Asie, quel aliment trouve-t-on le plus souvent dans l'assiette ?",
    options: ["le riz", "le chocolat", "la glace"], attendu: "le riz",
    explication: "Le riz est l'aliment de base de nombreux pays d'Asie. En France, on mange souvent du pain, fait avec du blé." },
  { cle: "ge-nou-n2-b", competence: "GEO.NOURRIR", niveau: 2, format: "tri",
    consigne: "D'où vient chaque aliment : de l'agriculture, de l'élevage ou de la pêche ?",
    ...tri(["l'agriculture", "l'élevage", "la pêche"], [["le blé", "l'agriculture"], ["les légumes", "l'agriculture"], ["le lait", "l'élevage"], ["le poisson", "la pêche"]]),
    explication: "L'agriculture cultive les plantes, l'élevage s'occupe des animaux, la pêche ramène le poisson de la mer." },
  { cle: "ge-nou-n3-a", competence: "GEO.NOURRIR", niveau: 3, format: "qcm",
    consigne: "Partout dans le monde, on ne mange pas la même chose. L'alimentation dépend du climat, des cultures et des...",
    options: ["habitudes de chaque pays", "couleurs préférées", "jours de la semaine"], attendu: "habitudes de chaque pays",
    explication: "Chaque région a ses recettes et ses produits. C'est ce qui rend la cuisine du monde si variée." },
  { cle: "ge-nou-n3-b", competence: "GEO.NOURRIR", niveau: 3, format: "qcm",
    consigne: "Dans le monde, tout le monde ne peut pas se nourrir aussi facilement. Dans certaines régions, la nourriture...",
    options: ["manque parfois", "est toujours en trop", "n'existe pas"], attendu: "manque parfois",
    explication: "Dans certaines régions, la nourriture manque parfois. Des pays et des associations s'entraident pour que chacun puisse manger à sa faim." },
  { cle: "ge-nou-n4-a", competence: "GEO.NOURRIR", niveau: 4, format: "texte",
    consigne: "Le riz, le blé et le maïs sont des aliments de base : ce sont des... Écris le mot.",
    attendu: "céréales",
    explication: "Les céréales sont cultivées partout sur la planète pour nourrir les humains et les animaux." },
  { cle: "ge-nou-n4-b", competence: "GEO.NOURRIR", niveau: 4, format: "texte",
    consigne: "Quand une personne ne mange pas assez pour être en bonne santé, elle souffre de... Écris le mot (deux mots reliés par un tiret).",
    attendu: "sous-alimentation",
    explication: "La sous-alimentation, c'est ne pas manger assez pour être en bonne santé. Elle touche encore des millions de personnes dans le monde." },

  // ===== GEO.INEGALITES - les inegalites dans le monde =====
  { cle: "ge-ine-n1-a", competence: "GEO.INEGALITES", niveau: 1, format: "qcm",
    consigne: "Comment appelle-t-on la carte qui représente toute la Terre à plat ?",
    options: ["un planisphère", "un agenda", "un ticket"], attendu: "un planisphère",
    explication: "Le planisphère montre toute la Terre à plat. Il aide à comparer les pays du monde." },
  { cle: "ge-ine-n1-b", competence: "GEO.INEGALITES", niveau: 1, format: "qcm",
    consigne: "L'eau que l'on peut boire sans danger s'appelle l'eau...",
    options: ["potable", "salée", "de pluie"], attendu: "potable",
    explication: "L'eau potable est propre et bonne à boire. Avoir de l'eau potable est un besoin essentiel." },
  { cle: "ge-ine-n2-a", competence: "GEO.INEGALITES", niveau: 2, format: "qcm",
    consigne: "Dans le monde, l'accès à l'eau potable n'est pas le même partout. On dit qu'il existe des...",
    options: ["inégalités", "vacances", "récréations"], attendu: "inégalités",
    explication: "Une inégalité, c'est quand les gens n'ont pas tous les mêmes possibilités, par exemple pour avoir de l'eau potable." },
  { cle: "ge-ine-n2-b", competence: "GEO.INEGALITES", niveau: 2, format: "tri",
    consigne: "Range chaque chose : un besoin essentiel pour bien grandir, ou un loisir ?",
    ...tri(["un besoin essentiel", "un loisir"], [["l'eau potable", "un besoin essentiel"], ["aller à l'école", "un besoin essentiel"], ["voir un médecin", "un besoin essentiel"], ["un jeu vidéo", "un loisir"]]),
    explication: "L'eau potable, l'école et les soins sont des besoins essentiels. Dans le monde, tous les enfants n'y ont pas encore accès." },
  { cle: "ge-ine-n3-a", competence: "GEO.INEGALITES", niveau: 3, format: "qcm",
    consigne: "Dans certains pays, des enfants ne peuvent pas toujours aller à l'école. C'est une inégalité devant l'...",
    options: ["éducation", "ordinateur", "heure"], attendu: "éducation",
    explication: "L'éducation, c'est apprendre à l'école. Beaucoup de pays et d'associations agissent pour que tous les enfants puissent y aller." },
  { cle: "ge-ine-n3-b", competence: "GEO.INEGALITES", niveau: 3, format: "qcm",
    consigne: "Pouvoir voir un médecin et se soigner quand on est malade, c'est avoir accès à la...",
    options: ["santé", "télévision", "musique"], attendu: "santé",
    explication: "L'accès à la santé (médecins, médicaments) n'est pas le même partout dans le monde : c'est une autre inégalité." },
  { cle: "ge-ine-n4-a", competence: "GEO.INEGALITES", niveau: 4, format: "texte",
    consigne: "La carte qui représente toute la Terre à plat s'appelle un... Écris le mot.",
    attendu: "planisphère",
    explication: "Le planisphère : la carte du monde entier, bien utile pour comparer les pays." },
  { cle: "ge-ine-n4-b", competence: "GEO.INEGALITES", niveau: 4, format: "texte",
    consigne: "L'eau propre que l'on peut boire sans danger est l'eau... Écris le mot.",
    attendu: "potable",
    explication: "L'eau potable est un besoin essentiel pour tous les êtres humains." },

  // ===== GEO.DEPLACER - se deplacer =====
  { cle: "ge-dep-n1-a", competence: "GEO.DEPLACER", niveau: 1, format: "qcm",
    consigne: "Pour se déplacer très vite entre deux grandes villes, on peut prendre le...",
    options: ["train", "vélo d'appartement", "toboggan"], attendu: "train",
    explication: "Le train relie les villes rapidement, sur des voies ferrées." },
  { cle: "ge-dep-n1-b", competence: "GEO.DEPLACER", niveau: 1, format: "qcm",
    consigne: "Pour traverser un océan rapidement, on voyage en...",
    options: ["avion", "trottinette", "barque"], attendu: "avion",
    explication: "L'avion permet de parcourir de très longues distances en quelques heures." },
  { cle: "ge-dep-n2-a", competence: "GEO.DEPLACER", niveau: 2, format: "tri",
    consigne: "Range chaque moyen de transport : sur terre, sur l'eau ou dans les airs ?",
    ...tri(["sur terre", "sur l'eau", "dans les airs"], [["le train", "sur terre"], ["la voiture", "sur terre"], ["le bateau", "sur l'eau"], ["l'avion", "dans les airs"]]),
    explication: "On se déplace sur terre (train, voiture), sur l'eau (bateau) ou dans les airs (avion)." },
  { cle: "ge-dep-n2-b", competence: "GEO.DEPLACER", niveau: 2, format: "qcm",
    consigne: "La route, la voie ferrée et l'aéroport sont des aménagements qui aident à se déplacer. Comment les appelle-t-on ?",
    options: ["des infrastructures", "des desserts", "des chansons"], attendu: "des infrastructures",
    explication: "Les infrastructures (routes, voies ferrées, ports, aéroports) sont construites pour relier les lieux entre eux." },
  { cle: "ge-dep-n3-a", competence: "GEO.DEPLACER", niveau: 3, format: "qcm",
    consigne: "On mesure la longueur d'un trajet en kilomètres. En quoi mesure-t-on sa durée ?",
    options: ["en heures et minutes", "en litres", "en grammes"], attendu: "en heures et minutes",
    explication: "Un trajet se mesure en kilomètres (la distance) et en heures et minutes (le temps)." },
  { cle: "ge-dep-n3-b", competence: "GEO.DEPLACER", niveau: 3, format: "qcm",
    consigne: "Un train va plus vite qu'un vélo. Pour le même trajet, le train met donc... de temps.",
    options: ["moins", "plus", "autant"], attendu: "moins",
    explication: "Plus un moyen de transport est rapide, moins il met de temps pour parcourir la même distance en kilomètres." },
  { cle: "ge-dep-n4-a", competence: "GEO.DEPLACER", niveau: 4, format: "texte",
    consigne: "La route, la voie ferrée et l'aéroport, qui servent à se déplacer, sont des... Écris le mot.",
    attendu: "infrastructures",
    explication: "Les infrastructures de transport relient les villes, les pays et les continents." },
  { cle: "ge-dep-n4-b", competence: "GEO.DEPLACER", niveau: 4, format: "texte",
    consigne: "On mesure la distance d'un trajet en... Écris le mot (l'unité, au pluriel).",
    attendu: "kilomètres",
    explication: "Le kilomètre est l'unité de distance des trajets : 1 kilomètre vaut 1000 mètres." },

  // ===== GEO.COMMUNIQUER - communiquer dans le monde avec Internet =====
  { cle: "ge-com-n1-a", competence: "GEO.COMMUNIQUER", niveau: 1, format: "qcm",
    consigne: "Comment s'appelle le réseau mondial qui relie les ordinateurs pour échanger des informations ?",
    options: ["Internet", "le marché", "la récré"], attendu: "Internet",
    explication: "Internet relie des ordinateurs du monde entier. On peut y échanger des messages, des images et des informations." },
  { cle: "ge-com-n1-b", competence: "GEO.COMMUNIQUER", niveau: 1, format: "qcm",
    consigne: "Avec Internet, que peut-on envoyer en quelques secondes à une personne très loin ?",
    options: ["un message", "un gâteau", "un ballon"], attendu: "un message",
    explication: "Grâce à Internet, un message arrive à l'autre bout du monde en un instant." },
  { cle: "ge-com-n2-a", competence: "GEO.COMMUNIQUER", niveau: 2, format: "qcm",
    consigne: "Pour transporter Internet d'un continent à l'autre, on pose de grands... au fond des océans.",
    options: ["câbles", "ponts", "tapis"], attendu: "câbles",
    explication: "D'immenses câbles posés au fond des océans transportent Internet entre les continents." },
  { cle: "ge-com-n2-b", competence: "GEO.COMMUNIQUER", niveau: 2, format: "qcm",
    consigne: "Dans l'espace, qu'est-ce qui renvoie aussi les communications vers la Terre ?",
    options: ["des satellites", "des nuages", "des oiseaux"], attendu: "des satellites",
    explication: "Les satellites, dans l'espace, relaient les communications et aident aussi à se repérer (GPS)." },
  { cle: "ge-com-n3-a", competence: "GEO.COMMUNIQUER", niveau: 3, format: "tri",
    consigne: "Range chaque usage d'Internet : plutôt communiquer, ou plutôt s'informer ?",
    ...tri(["communiquer", "s'informer"], [["envoyer un message", "communiquer"], ["faire un appel vidéo", "communiquer"], ["lire les informations", "s'informer"], ["chercher sur une carte", "s'informer"]]),
    explication: "Avec Internet, on communique (messages, appels vidéo) et on s'informe (actualités, cartes)." },
  { cle: "ge-com-n3-b", competence: "GEO.COMMUNIQUER", niveau: 3, format: "qcm",
    consigne: "Dans le monde, tout le monde n'a pas Internet de la même façon. On dit qu'il existe des inégalités d'...",
    options: ["accès", "heure", "âge"], attendu: "accès",
    explication: "Certaines régions ont un accès facile à Internet, d'autres non : ce sont des inégalités d'accès. Des projets cherchent à relier tout le monde." },
  { cle: "ge-com-n4-a", competence: "GEO.COMMUNIQUER", niveau: 4, format: "texte",
    consigne: "On pose de grands... au fond des océans pour transporter Internet entre les continents. Écris le mot.",
    attendu: "câbles",
    explication: "Les câbles sous-marins sont les grandes « autoroutes » d'Internet entre les continents." },
  { cle: "ge-com-n4-b", competence: "GEO.COMMUNIQUER", niveau: 4, format: "texte",
    consigne: "Les immenses bâtiments remplis d'ordinateurs qui stockent les informations d'Internet s'appellent des centres de... Écris le mot.",
    attendu: "données",
    explication: "Un centre de données garde les photos, messages et vidéos d'Internet. Il consomme beaucoup d'électricité." },
];

export const COMPETENCES_GEOGRAPHIE = [
  "GEO.NOURRIR",
  "GEO.INEGALITES",
  "GEO.DEPLACER",
  "GEO.COMMUNIQUER",
] as const;
