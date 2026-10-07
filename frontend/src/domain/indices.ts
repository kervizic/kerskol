// Indices (bouton « Indice », icone Lucide Lightbulb) affiches aux NIVEAUX 1 et 2
// SEULEMENT, sur la page d'exercice. Un indice aide l'enfant SANS donner la
// reponse : il rappelle la methode ou le piege, en une ou deux phrases COURTES
// redigees POUR L'ORAL (pas de « / », pas de fleche, pas de symbole, pas
// d'abreviation, pas de guillemet decoratif). L'utilisation d'un indice n'est
// JAMAIS enregistree : l'escalier des niveaux suffit (au niveau 3 il n'y a plus
// d'indice ; si l'enfant echoue il redescend au niveau 2).
//
// Un indice par competence (les codes sont ceux du referentiel). Les memes
// textes sont verses au catalogue voix (tools/tts/data/phrases.json, cle
// « indice:<competence> ») pour une future synthese audio.

export const INDICES: Record<string, string> = {
  // --- Francais -------------------------------------------------------------
  "FR.CONJ.PRESENT":
    "Le présent, c'est maintenant. Regarde bien le petit mot devant le verbe. Avec nous, le verbe finit souvent par ons. Avec vous, il finit souvent par ez.",
  "FR.CONJ.FUTUR":
    "Le futur, c'est demain. Souvent, on entend le son r juste avant la fin, comme dans je chanterai.",
  "FR.CONJ.IMPARFAIT":
    "L'imparfait, c'est avant, autrefois. Souvent le verbe se termine par ais, ait ou aient.",
  "FR.CONJ.PASSE_COMPOSE":
    "Le passé composé, c'est deux mots. D'abord avoir ou être, puis le verbe. Avec être, pense à accorder avec le sujet.",
  "FR.ORTHO.DETECTIVE":
    "Lis la phrase tout doucement dans ta tête. Cherche les petits mots qui se ressemblent et qui se cachent.",

  // --- Grammaire (indices aux niveaux 1 et 2 seulement) ---------------------
  "FR.GRAM.NATURE":
    "Le nom dit une personne, un animal ou une chose, comme chat. Le verbe dit une action, comme jouer. L'adjectif décrit, comme grand. Le petit mot devant le nom est un déterminant.",
  "FR.GRAM.SUJET_VERBE":
    "Le verbe dit l'action. Pour trouver le sujet, demande-toi qui fait l'action, comme dans la fille court.",
  "FR.GRAM.TYPES_PHRASES":
    "Écoute la phrase. Si elle attend une réponse, elle pose une question. Si elle montre une émotion forte, c'est une exclamation. Si elle commande, elle donne un ordre.",
  "FR.GRAM.PONCTUATION":
    "On met un point quand la phrase raconte quelque chose. On met un point d'interrogation quand la phrase pose une question. Un nom de personne ou de ville prend une majuscule.",
  "FR.GRAM.GROUPE_NOMINAL":
    "Regarde le petit mot du début. Le mot les montre qu'il y a plusieurs choses, c'est le pluriel. Le nom dit la chose, l'adjectif la décrit.",

  // --- Vocabulaire (indices aux niveaux 1 et 2 seulement) -------------------
  "FR.VOC.ALPHABET":
    "Dans le dictionnaire, les mots sont rangés par la première lettre. Si deux mots commencent par la même lettre, on regarde la lettre d'après.",
  "FR.VOC.FAMILLES":
    "Les mots d'une même famille se ressemblent au début et parlent de la même chose. Cherche le petit morceau qu'ils ont en commun, comme dent dans dentiste.",
  "FR.VOC.SYN_CONTRAIRES":
    "Un synonyme veut dire presque la même chose. Un contraire veut dire le contraire. Parfois on ajoute un petit mot devant pour dire le contraire, comme mal ou dé.",
  "FR.VOC.PREFIXE_SUFFIXE":
    "Un préfixe se met au début du mot, comme re qui veut dire encore. Un petit bout à la fin, comme eur, montre la personne qui fait l'action.",
  "FR.VOC.CATEGORIES":
    "Cherche le mot général qui regroupe tous les autres. Le chien et le chat sont des animaux.",

  // --- Mots a savoir (indices aux niveaux 1 et 2 seulement) -----------------
  "FR.MOTS.INVARIABLES":
    "Ces petits mots ne changent jamais. Écoute bien les lettres de la fin qu'on n'entend pas, comme le s de toujours ou le p de beaucoup.",

  // --- Comprendre un texte (indices aux niveaux 1 et 2 seulement) -----------
  "FR.LECTURE.INFO":
    "Relis le texte tout doucement. La réponse est écrite dans le texte. Cherche le mot ou le petit groupe de mots qui répond à la question.",
  "FR.LECTURE.INFERENCE":
    "Le texte ne dit pas tout. Regarde ce que fait le personnage ou ce qui se passe, et devine. Par exemple, s'il saute de joie, c'est qu'il est content.",
  "FR.LECTURE.ORDRE":
    "Cherche ce qui se passe en premier, puis ensuite, puis à la fin. Les petits mots comme d'abord, puis et enfin t'aident à trouver l'ordre.",
  "FR.LECTURE.VRAIFAUX":
    "Relis la phrase, puis cherche dans le texte si c'est pareil. Si le texte dit la même chose, c'est vrai. Si le texte dit le contraire, c'est faux.",
  "FR.LECTURE.SENS_MOT":
    "Relis toute la phrase où se trouve le mot. Les autres mots autour t'aident à deviner ce qu'il veut dire.",

  // --- Les mots de la maitresse (indices aux niveaux 1 et 2 seulement) ------
  "FR.MAITRESSE.MOTS":
    "Regarde bien chaque lettre. Écoute les lettres de la fin qu'on n'entend pas, et pense aux accents.",
  "FR.MAITRESSE.DICTEE":
    "Lis la phrase tout doucement dans ta tête. Cherche le mot qui manque ou le mot piégé qui se cache.",

  // --- Calcul mental --------------------------------------------------------
  "MA.CM.ADDITION":
    "Tu peux passer par un nombre rond, comme dix ou vingt, pour aller plus vite.",
  "MA.CM.COMPL_SUP":
    "Demande-toi combien il manque pour arriver jusqu'au nombre.",
  "MA.CM.DIV_RESTE":
    "Cherche combien de fois le petit nombre entre dans le grand. Ce qui dépasse, c'est le reste.",
  "MA.CM.DOUBLES":
    "Le double, c'est deux fois le même nombre. Tu l'ajoutes avec lui-même.",
  "MA.CM.MOITIES":
    "La moitié, c'est partager le nombre en deux parts égales.",
  "MA.CM.SOMMES_DIFF":
    "Tu peux passer par un nombre rond pour calculer plus facilement.",

  // --- Geometrie (indices aux niveaux 1 et 2 seulement) ---------------------
  "MA.GEO.FIGURES":
    "Compte les côtés et regarde les coins. Le carré a quatre côtés pareils. Le rectangle a des côtés longs et des côtés courts. Le triangle a trois côtés. Le cercle est tout rond, sans coin.",
  "MA.GEO.VOCABULAIRE":
    "Un côté, c'est un bord droit. Un sommet, c'est un coin où deux côtés se rejoignent. Un angle droit est bien carré, comme le coin d'une feuille.",
  "MA.GEO.SOLIDES":
    "Pense à un objet qui a la même forme. Le cube est comme un dé, le pavé comme une boîte, la boule comme un ballon, le cylindre comme une boîte de conserve.",
  "MA.GEO.SYMETRIE":
    "Imagine que tu plies la figure sur le trait du milieu. Si les deux moitiés se posent l'une sur l'autre, il y a un axe de symétrie.",

  // --- Se reperer (indices aux niveaux 1 et 2 seulement) --------------------
  "MA.REPERE.QUADRILLAGE":
    "Pour trouver une case, lis d'abord la lettre de la colonne, puis le numéro de la ligne. La lettre d'abord, le chiffre ensuite.",
  "MA.REPERE.DEPLACEMENTS":
    "Avance une case à la fois. Vers la droite, tu changes de colonne. Vers le haut, tu changes de ligne et tu montes.",
  "MA.REPERE.PLAN":
    "Place-toi à côté de l'objet. Ce qui est de ton côté de la main qui écrit est à droite, l'autre côté est à gauche.",

  // --- Tableaux et graphiques (indices aux niveaux 1 et 2 seulement) --------
  "MA.DONNEES.TABLEAU":
    "Pour lire une case, suis d'abord la ligne, puis descends dans la bonne colonne. L'endroit où la ligne et la colonne se croisent donne le nombre.",
  "MA.DONNEES.COMPLETER":
    "Regarde le total. Additionne les nombres que tu connais, puis cherche ce qu'il manque pour arriver jusqu'au total.",
  "MA.DONNEES.BARRES":
    "Suis la barre jusqu'en haut, puis regarde le trait en face. Le nombre à côté de ce trait donne la hauteur de la barre.",
  "MA.DONNEES.PICTOGRAMME":
    "Compte les images d'une ligne. Si chaque image vaut deux objets, ajoute deux pour chaque image, comme deux et deux et deux.",
  "MA.DONNEES.COMPARER":
    "Lis d'abord les deux nombres. Pour savoir combien il y en a de plus, enlève le plus petit nombre du plus grand.",

  // --- Fractions ------------------------------------------------------------
  "MA.FRAC.SIMPLES":
    "Le chiffre du bas dit en combien de parts on coupe. Le chiffre du haut dit combien de parts on prend.",

  // --- Mesures --------------------------------------------------------------
  "MA.MES.DUREES":
    "Pense à tout mettre dans la même unité. Une heure, c'est soixante minutes.",
  "MA.MES.HEURE":
    "Regarde d'abord la petite aiguille pour les heures, puis la grande aiguille pour les minutes.",
  "MA.MES.LONGUEURS":
    "Pense à tout mettre dans la même unité. Un mètre, c'est cent centimètres.",
  "MA.MES.MASSES_CONTENANCES":
    "Pense à tout mettre dans la même unité. Un kilo, c'est mille grammes. Un litre, c'est mille millilitres.",

  // --- Numeration -----------------------------------------------------------
  "MA.NUM.COMPARER":
    "Regarde d'abord lequel a le plus de chiffres. S'ils en ont autant, compare les chiffres un par un en partant de la gauche.",
  "MA.NUM.DECOMPOSER":
    "Coupe le nombre en tranches : les milliers, les centaines, les dizaines et les unités.",
  "MA.NUM.LIRE_ECRIRE":
    "Coupe le nombre en tranches : d'abord les milliers, puis les centaines, puis le reste.",
  "MA.NUM.SUITE":
    "Regarde de combien on avance à chaque fois entre deux nombres.",

  // --- Problemes ------------------------------------------------------------
  "MA.PB.ADD_SUB":
    "Demande-toi si on met ensemble ou si on enlève.",
  "MA.PB.DEUX_ETAPES":
    "Fais une étape à la fois. Trouve d'abord le premier résultat, puis sers-t'en pour la suite.",
  "MA.PB.MESURES":
    "Pense à tout mettre dans la même unité avant de calculer.",
  "MA.PB.MONNAIE":
    "Compte d'abord les grosses pièces, puis ajoute les petites.",
  "MA.PB.MULT_DIV":
    "Demande-toi si on partage en parts égales ou si on groupe par paquets.",

  // --- Calcul pose ----------------------------------------------------------
  "MA.POSE.ADDITION":
    "Commence par les unités, à droite. Quand tu dépasses neuf, tu poses une retenue.",
  "MA.POSE.SOUSTRACTION":
    "Commence par les unités, à droite. Si le chiffre du haut est trop petit, tu empruntes une dizaine à côté.",
  "MA.POSE.MULTIPLICATION":
    "Commence par les unités, à droite, et n'oublie pas les retenues.",
};

// Indice d'une competence, UNIQUEMENT aux niveaux 1 et 2 (sinon null : plus
// d'indice au niveau 3 et au-dela, l'escalier des niveaux prend le relais).
export function indicePour(competence: string, niveau: number): string | null {
  if (niveau > 2) return null;
  return INDICES[competence] ?? null;
}
