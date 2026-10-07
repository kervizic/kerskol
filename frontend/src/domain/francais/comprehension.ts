// Banque d'exercices « COMPRENDRE UN TEXTE » (francais, CE2, programme cycle 2
// revise 2024). Nouvelle sous-matiere, domaine dedie `lecture` :
//
//   FR.LECTURE.INFO       retrouver une information ecrite (qui, ou, quoi) ;
//   FR.LECTURE.INFERENCE  comprendre ce qui n'est pas dit (pourquoi, ressenti) ;
//   FR.LECTURE.ORDRE      remettre 2 a 3 evenements dans l'ordre ;
//   FR.LECTURE.VRAIFAUX   dire si une phrase est vraie ou fausse d'apres le texte ;
//   FR.LECTURE.SENS_MOT   trouver le sens d'un mot grace a la phrase.
//
// DECISION MANU : lecture SILENCIEUSE uniquement. Le texte est AFFICHE ; il n'y a
// aucun bouton « ecouter le texte », aucun karaoke, aucune lecture a voix haute.
// Seules les consignes / indices courts pourront avoir une voix plus tard.
//
// ARCHITECTURE (meme patron que les tableaux et graphiques, phase 4) : chaque
// item porte une cle stable, un format (qcm / clic / texte / ordre), un TEXTE
// tres court (un element de tableau = une phrase), une consigne redigee POUR
// L'ORAL (phrases courtes, aucun symbole), une reponse attendue, et une
// explication valorisante AVEC un exemple. Le SERVEUR reste SEUL JUGE : la table
// de reference public.comprehension_item (migration 0045) porte
// (cle, competence, niveau, format, attendu) et verif_comprehension compare la
// saisie normalisee ; l'op dediee est 'lire'. Un test croise garantit
// front == SQL (comprehension.test.ts + comprehension_test.sql).
//
// Progression des formats : N1 QCM ; N2/N3 QCM, clic (toucher le mot qui prouve)
// ou ordre (ranger des evenements) ; N4 reponse LIBRE (taper un mot, cliquer le
// mot qui prouve, ou ranger). Les textes sont ORIGINAUX, du quotidien d'un
// enfant de 8 ans (histoires, petits documentaires sur les animaux et la nature,
// recettes, regles de jeu). AUCUNE donnee de calendrier (ni date, ni jour de la
// semaine, ni mois). Tout est DETERMINISTE -> tests golden.
//
// « Retrouver dans le texte le mot qui prouve la reponse » (N3-N4) reutilise le
// principe des mots cliquables : en format `clic`, chaque mot du texte devient
// une cible tactile et l'enfant touche le mot attendu.

import { normaliser } from "../diagnostic/lettres";
import { normaliserMot } from "./dictee";
import { pick, type Rng } from "../calcul/rng";
import type { Base, GeneratedExercise, ExCalcul } from "../calcul/generator";

// --------------------------------------------------------------------------
// Modele d'un item.
// --------------------------------------------------------------------------
export type CompFormat = "qcm" | "clic" | "texte" | "ordre";

// Separateur des evenements d'un exercice « ordre » (la reponse est la suite des
// evenements remis dans le bon ordre, jointe par ce caractere).
export const SEP_ORDRE = "|";

export interface CompItem {
  cle: string; // identifiant stable (PK serveur)
  competence: string; // FR.LECTURE.*
  niveau: number; // 1..4
  format: CompFormat;
  texte: string[]; // le texte a lire (une phrase par element)
  consigne: string; // question (redigee pour l'oral)
  options?: string[]; // mode qcm : propositions
  evenements?: string[]; // mode ordre : evenements AFFICHES (dans le desordre)
  attendu: string; // reponse attendue (comparee normalisee)
  explication: string; // correction courte et valorisante, avec un exemple
}

// Donnees de RENDU (ce que l'exercice porte et que <Comprehension> affiche).
export type CompRender = Pick<
  CompItem,
  "cle" | "format" | "texte" | "consigne" | "options" | "evenements" | "attendu" | "explication"
>;

// --------------------------------------------------------------------------
// Comparaison MIROIR du serveur (verif_comprehension) :
//   qcm         -> normaliser (accents gardes, minuscule, espaces normalises) ;
//   ordre       -> comparaison stricte (minuscule, espaces retires) ;
//   clic / texte -> normaliserMot (accents EXIGES, ponctuation de bord retiree).
// --------------------------------------------------------------------------
export function normCompOrdre(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, "");
}
export function comparerComprehension(format: CompFormat, saisie: string, attendu: string): boolean {
  if (format === "qcm") return normaliser(saisie) === normaliser(attendu);
  if (format === "ordre") return normCompOrdre(saisie) === normCompOrdre(attendu);
  return normaliserMot(saisie) === normaliserMot(attendu);
}

// Helper « ordre » : `correct` = les evenements dans le BON ordre (ils forment la
// reponse attendue) ; `display` = le meme ensemble, affiche dans le DESORDRE.
function ordre(correct: string[], display: string[]): Pick<CompItem, "evenements" | "attendu"> {
  return { evenements: display, attendu: correct.join(SEP_ORDRE) };
}

// ==========================================================================
// BANQUE (40 items : 5 competences x 4 niveaux x 2 ; 40 textes originaux).
// ==========================================================================
export const BANQUE_COMPREHENSION: CompItem[] = [
  // =======================================================================
  // FR.LECTURE.INFO — retrouver une information (qui, ou, quoi)
  // =======================================================================
  { cle: "lec-info-n1-a", competence: "FR.LECTURE.INFO", niveau: 1, format: "qcm",
    texte: ["Léa a un petit chat.", "Le chat s'appelle Mistigri.", "Il dort dans un panier rouge."],
    consigne: "Comment s'appelle le chat de Léa ?",
    options: ["Mistigri", "Minou", "Félix"], attendu: "Mistigri",
    explication: "Le texte dit que le chat s'appelle Mistigri." },
  { cle: "lec-info-n1-b", competence: "FR.LECTURE.INFO", niveau: 1, format: "qcm",
    texte: ["Tom joue dans le jardin.", "Il cherche son ballon bleu.", "Le ballon est sous l'arbre."],
    consigne: "Où est le ballon de Tom ?",
    options: ["sous l'arbre", "dans la maison", "sur le toit"], attendu: "sous l'arbre",
    explication: "Le texte dit que le ballon est caché sous l'arbre." },
  { cle: "lec-info-n2-a", competence: "FR.LECTURE.INFO", niveau: 2, format: "qcm",
    texte: ["Dans la forêt vit une famille de renards.", "La maman renarde chasse des souris.",
            "Ses trois petits restent cachés dans le terrier.", "Ensuite, ils jouent devant l'entrée."],
    consigne: "Combien la maman renarde a-t-elle de petits ?",
    options: ["trois", "deux", "quatre"], attendu: "trois",
    explication: "Le texte dit qu'elle a trois petits renards." },
  { cle: "lec-info-n2-b", competence: "FR.LECTURE.INFO", niveau: 2, format: "qcm",
    texte: ["Pour faire un gâteau au yaourt, tu mélanges la farine, le sucre et les œufs.",
            "Tu ajoutes un pot de yaourt.", "Puis tu verses la pâte dans un moule."],
    consigne: "Qu'est-ce que tu verses dans le moule ?",
    options: ["la pâte", "le sucre", "le yaourt"], attendu: "la pâte",
    explication: "Le texte dit qu'on verse la pâte dans le moule." },
  { cle: "lec-info-n3-a", competence: "FR.LECTURE.INFO", niveau: 3, format: "qcm",
    texte: ["L'écureuil est un petit animal très agile.", "Il grimpe vite aux arbres grâce à ses griffes.",
            "Il cache des noisettes sous les feuilles pour les manger plus tard.",
            "Sa queue touffue l'aide à garder l'équilibre."],
    consigne: "Grâce à quoi l'écureuil garde-t-il l'équilibre ?",
    options: ["sa queue", "ses griffes", "ses dents"], attendu: "sa queue",
    explication: "Le texte dit que sa queue touffue l'aide à garder l'équilibre." },
  { cle: "lec-info-n3-b", competence: "FR.LECTURE.INFO", niveau: 3, format: "clic",
    texte: ["Nina range sa chambre.", "Elle met ses livres sur l'étagère et ses jouets dans le grand coffre.",
            "Son chien la regarde faire."],
    consigne: "Clique dans le texte sur le mot qui dit où Nina range ses jouets.",
    attendu: "coffre",
    explication: "Nina met ses jouets dans le coffre. Le mot coffre dit où elle les range." },
  { cle: "lec-info-n4-a", competence: "FR.LECTURE.INFO", niveau: 4, format: "texte",
    texte: ["Hugo adore les tortues.", "Dans le jardin, sa tortue Carapouce mange de la salade.",
            "Elle avance tout doucement sur l'herbe."],
    consigne: "Écris le nom de la tortue d'Hugo.",
    attendu: "Carapouce",
    explication: "Le texte dit que la tortue d'Hugo s'appelle Carapouce." },
  { cle: "lec-info-n4-b", competence: "FR.LECTURE.INFO", niveau: 4, format: "texte",
    texte: ["Au bord de la mare, une grenouille verte attend sans bouger.", "Elle guette les moucherons.",
            "D'un coup, elle sort sa longue langue et attrape un insecte."],
    consigne: "De quelle couleur est la grenouille ?",
    attendu: "verte",
    explication: "Le texte dit que la grenouille est verte." },

  // =======================================================================
  // FR.LECTURE.INFERENCE — comprendre ce qui n'est pas dit (pourquoi, ressenti)
  // =======================================================================
  { cle: "lec-inf-n1-a", competence: "FR.LECTURE.INFERENCE", niveau: 1, format: "qcm",
    texte: ["Maël a gagné sa course.", "Il saute partout et montre sa médaille à tout le monde."],
    consigne: "Comment se sent Maël ?",
    options: ["content", "triste", "fatigué"], attendu: "content",
    explication: "Maël saute partout après avoir gagné : il est content." },
  { cle: "lec-inf-n1-b", competence: "FR.LECTURE.INFERENCE", niveau: 1, format: "qcm",
    texte: ["Zoé regarde par la fenêtre.", "Il pleut très fort et elle ne peut pas aller jouer dehors.",
            "Elle pousse un gros soupir."],
    consigne: "Pourquoi Zoé ne peut-elle pas jouer dehors ?",
    options: ["parce qu'il pleut", "parce qu'elle est malade", "parce qu'elle n'a pas de jouets"],
    attendu: "parce qu'il pleut",
    explication: "Le texte dit qu'il pleut très fort : c'est pour cela qu'elle reste dedans." },
  { cle: "lec-inf-n2-a", competence: "FR.LECTURE.INFERENCE", niveau: 2, format: "qcm",
    texte: ["Le petit chien remue la queue très vite.", "Il court vers la porte en aboyant de joie.",
            "Son maître vient de rentrer à la maison."],
    consigne: "Pourquoi le chien est-il si content ?",
    options: ["son maître est rentré", "il a faim", "il a peur du facteur"],
    attendu: "son maître est rentré",
    explication: "Le chien court vers la porte quand son maître rentre : il est content de le revoir." },
  { cle: "lec-inf-n2-b", competence: "FR.LECTURE.INFERENCE", niveau: 2, format: "qcm",
    texte: ["Lucas tient son ventre à deux mains.", "Il n'a rien mangé et il attend le repas avec impatience."],
    consigne: "Comment se sent sans doute Lucas ?",
    options: ["il a faim", "il a froid", "il a sommeil"], attendu: "il a faim",
    explication: "Lucas n'a rien mangé et attend le repas : il a faim." },
  { cle: "lec-inf-n3-a", competence: "FR.LECTURE.INFERENCE", niveau: 3, format: "qcm",
    texte: ["La maîtresse éteint la lumière de la classe et ferme la porte à clé.",
            "Les enfants sont déjà partis avec leur cartable.", "La cour de l'école est toute vide."],
    consigne: "Que vient-il de se passer ?",
    options: ["la classe est finie", "la récréation commence", "c'est l'heure du repas"],
    attendu: "la classe est finie",
    explication: "La maîtresse ferme la classe et les enfants sont partis : la classe est finie." },
  { cle: "lec-inf-n3-b", competence: "FR.LECTURE.INFERENCE", niveau: 3, format: "qcm",
    texte: ["Inès ouvre son parapluie avant de sortir.", "Elle met aussi ses bottes jaunes.",
            "Dehors, les flaques brillent sur le trottoir."],
    consigne: "Quel temps fait-il dehors ?",
    options: ["il pleut", "il neige", "il y a beaucoup de soleil"], attendu: "il pleut",
    explication: "Inès prend un parapluie et des bottes, et il y a des flaques : il pleut." },
  { cle: "lec-inf-n4-a", competence: "FR.LECTURE.INFERENCE", niveau: 4, format: "clic",
    texte: ["Le chat fait le gros dos.", "Ses poils sont tout hérissés et il crache.",
            "Devant lui, un gros chien grogne très fort."],
    consigne: "Clique dans le texte sur le mot qui décrit les poils du chat quand il a peur.",
    attendu: "hérissés",
    explication: "Quand le chat a peur, ses poils sont hérissés. C'est ce mot qui le montre." },
  { cle: "lec-inf-n4-b", competence: "FR.LECTURE.INFERENCE", niveau: 4, format: "clic",
    texte: ["Maya reçoit une lettre de sa grand-mère.", "Elle la lit et un grand sourire apparaît sur son visage.",
            "Elle serre la lettre contre son cœur."],
    consigne: "Clique dans le texte sur le mot qui montre que Maya est heureuse.",
    attendu: "sourire",
    explication: "Un sourire apparaît sur le visage de Maya : elle est heureuse." },

  // =======================================================================
  // FR.LECTURE.ORDRE — remettre 2 a 3 evenements dans l'ordre
  // =======================================================================
  { cle: "lec-ord-n1-a", competence: "FR.LECTURE.ORDRE", niveau: 1, format: "qcm",
    texte: ["Papa casse les œufs dans un bol.", "Ensuite, il bat les œufs avec une fourchette.",
            "Enfin, il fait cuire l'omelette dans la poêle."],
    consigne: "Que fait papa en premier ?",
    options: ["il casse les œufs", "il bat les œufs", "il fait cuire l'omelette"],
    attendu: "il casse les œufs",
    explication: "Le texte commence par papa casse les œufs : c'est la première chose." },
  { cle: "lec-ord-n1-b", competence: "FR.LECTURE.ORDRE", niveau: 1, format: "qcm",
    texte: ["Lina plante une graine dans la terre.", "Puis elle arrose la graine souvent.",
            "Plus tard, une petite fleur pousse."],
    consigne: "Que se passe-t-il en dernier ?",
    options: ["une fleur pousse", "Lina plante la graine", "Lina arrose la graine"],
    attendu: "une fleur pousse",
    explication: "La fleur pousse à la fin de l'histoire : c'est le dernier moment." },
  { cle: "lec-ord-n2-a", competence: "FR.LECTURE.ORDRE", niveau: 2, format: "ordre",
    texte: ["D'abord, Sacha met son manteau.", "Après, il part à l'école avec son cartable."],
    consigne: "Range les deux moments dans l'ordre de l'histoire.",
    ...ordre(
      ["Sacha met son manteau", "Sacha part à l'école"],
      ["Sacha part à l'école", "Sacha met son manteau"]),
    explication: "D'abord Sacha met son manteau, puis il part à l'école." },
  { cle: "lec-ord-n2-b", competence: "FR.LECTURE.ORDRE", niveau: 2, format: "ordre",
    texte: ["Pour préparer un jus d'orange, tu coupes l'orange en deux.", "Ensuite, tu presses chaque moitié."],
    consigne: "Range les étapes de la recette dans l'ordre.",
    ...ordre(
      ["tu coupes l'orange en deux", "tu presses chaque moitié"],
      ["tu presses chaque moitié", "tu coupes l'orange en deux"]),
    explication: "On coupe l'orange d'abord, puis on presse chaque moitié." },
  { cle: "lec-ord-n3-a", competence: "FR.LECTURE.ORDRE", niveau: 3, format: "ordre",
    texte: ["Timéo prépare son sac.", "D'abord, il met ses cahiers.", "Ensuite, il ajoute sa trousse.",
            "Enfin, il ferme le sac."],
    consigne: "Range les trois actions dans l'ordre de l'histoire.",
    ...ordre(
      ["il met ses cahiers", "il ajoute sa trousse", "il ferme le sac"],
      ["il ferme le sac", "il met ses cahiers", "il ajoute sa trousse"]),
    explication: "Il met ses cahiers, puis sa trousse, et enfin il ferme le sac." },
  { cle: "lec-ord-n3-b", competence: "FR.LECTURE.ORDRE", niveau: 3, format: "ordre",
    texte: ["La chenille mange beaucoup de feuilles.", "Puis elle se transforme en chrysalide.",
            "Enfin, un papillon sort et s'envole dans le ciel."],
    consigne: "Range les étapes de la vie du papillon dans l'ordre.",
    ...ordre(
      ["la chenille mange des feuilles", "elle se transforme en chrysalide", "un papillon s'envole"],
      ["un papillon s'envole", "la chenille mange des feuilles", "elle se transforme en chrysalide"]),
    explication: "La chenille mange, puis elle devient chrysalide, puis elle devient un papillon." },
  { cle: "lec-ord-n4-a", competence: "FR.LECTURE.ORDRE", niveau: 4, format: "ordre",
    texte: ["Pour faire pousser des lentilles, pose du coton au fond d'un pot.",
            "Mets les graines sur le coton.", "Ajoute un peu d'eau quand le coton est sec.",
            "Bientôt, de petites pousses vertes apparaissent."],
    consigne: "Range les étapes dans l'ordre pour faire pousser les lentilles.",
    ...ordre(
      ["pose du coton dans le pot", "mets les graines sur le coton", "des pousses vertes apparaissent"],
      ["des pousses vertes apparaissent", "pose du coton dans le pot", "mets les graines sur le coton"]),
    explication: "On pose le coton, puis on met les graines, et enfin les pousses sortent." },
  { cle: "lec-ord-n4-b", competence: "FR.LECTURE.ORDRE", niveau: 4, format: "ordre",
    texte: ["Petit Ours s'ennuie dans sa grotte.", "Il décide de partir explorer la forêt.",
            "En chemin, il rencontre un renard qui devient son ami.",
            "Ensemble, ils trouvent un arbre plein de miel.", "À la fin, Petit Ours rentre, le ventre bien rempli."],
    consigne: "Range les trois moments de l'histoire dans l'ordre.",
    ...ordre(
      ["Petit Ours part explorer la forêt", "il rencontre un renard", "ils trouvent un arbre plein de miel"],
      ["il rencontre un renard", "ils trouvent un arbre plein de miel", "Petit Ours part explorer la forêt"]),
    explication: "Petit Ours part, puis il rencontre le renard, et enfin ils trouvent le miel." },

  // =======================================================================
  // FR.LECTURE.VRAIFAUX — vrai ou faux d'apres le texte
  // =======================================================================
  { cle: "lec-vf-n1-a", competence: "FR.LECTURE.VRAIFAUX", niveau: 1, format: "qcm",
    texte: ["Le soleil est une étoile.", "Il donne de la lumière et de la chaleur."],
    consigne: "Le soleil donne de la chaleur. Est-ce vrai ou faux ?",
    options: ["vrai", "faux"], attendu: "vrai",
    explication: "Le texte dit que le soleil donne de la chaleur : c'est vrai." },
  { cle: "lec-vf-n1-b", competence: "FR.LECTURE.VRAIFAUX", niveau: 1, format: "qcm",
    texte: ["Le manchot vit dans les pays très froids.", "Il ne sait pas voler, mais il nage très bien."],
    consigne: "Le manchot sait voler. Est-ce vrai ou faux ?",
    options: ["vrai", "faux"], attendu: "faux",
    explication: "Le texte dit que le manchot ne sait pas voler : c'est faux." },
  { cle: "lec-vf-n2-a", competence: "FR.LECTURE.VRAIFAUX", niveau: 2, format: "qcm",
    texte: ["L'abeille butine les fleurs pour faire du miel.", "Elle vit dans une ruche avec des milliers d'autres abeilles."],
    consigne: "L'abeille vit toute seule. Est-ce vrai ou faux ?",
    options: ["vrai", "faux"], attendu: "faux",
    explication: "L'abeille vit dans une ruche avec beaucoup d'autres abeilles : c'est faux." },
  { cle: "lec-vf-n2-b", competence: "FR.LECTURE.VRAIFAUX", niveau: 2, format: "qcm",
    texte: ["Marius a planté des tomates dans son potager.", "Il les arrose souvent.",
            "Les tomates deviennent rouges et bien mûres."],
    consigne: "Les tomates de Marius deviennent rouges. Est-ce vrai ou faux ?",
    options: ["vrai", "faux"], attendu: "vrai",
    explication: "Le texte dit que les tomates deviennent rouges : c'est vrai." },
  { cle: "lec-vf-n3-a", competence: "FR.LECTURE.VRAIFAUX", niveau: 3, format: "qcm",
    texte: ["Le dauphin est un animal marin très intelligent.", "Ce n'est pas un poisson : c'est un mammifère.",
            "Il doit remonter à la surface pour respirer."],
    consigne: "Le dauphin est un poisson. Est-ce vrai ou faux ?",
    options: ["vrai", "faux"], attendu: "faux",
    explication: "Le texte dit que le dauphin n'est pas un poisson mais un mammifère : c'est faux." },
  { cle: "lec-vf-n3-b", competence: "FR.LECTURE.VRAIFAUX", niveau: 3, format: "clic",
    texte: ["La chouette dort le jour et chasse pendant la nuit.", "Avec ses grands yeux, elle voit très bien dans le noir."],
    consigne: "Clique dans le texte sur le mot qui dit quand la chouette chasse.",
    attendu: "nuit",
    explication: "La chouette chasse pendant la nuit. Le mot nuit le montre." },
  { cle: "lec-vf-n4-a", competence: "FR.LECTURE.VRAIFAUX", niveau: 4, format: "clic",
    texte: ["Le caméléon est un drôle de lézard.", "Il peut changer de couleur pour se cacher.",
            "Sa langue est très longue et collante pour attraper les insectes."],
    consigne: "Clique dans le texte sur le mot qui dit ce que le caméléon peut changer.",
    attendu: "couleur",
    explication: "Le caméléon peut changer de couleur. C'est ce que dit le texte." },
  { cle: "lec-vf-n4-b", competence: "FR.LECTURE.VRAIFAUX", niveau: 4, format: "clic",
    texte: ["Les fourmis sont de petites ouvrières.", "Elles transportent des miettes bien plus lourdes qu'elles.",
            "Toutes ensemble, elles construisent une grande fourmilière sous la terre."],
    consigne: "Clique dans le texte sur le mot qui dit où les fourmis construisent leur fourmilière.",
    attendu: "terre",
    explication: "Les fourmis construisent leur fourmilière sous la terre." },

  // =======================================================================
  // FR.LECTURE.SENS_MOT — trouver le sens d'un mot grace a la phrase
  // =======================================================================
  { cle: "lec-sens-n1-a", competence: "FR.LECTURE.SENS_MOT", niveau: 1, format: "qcm",
    texte: ["Le vieux coffre était rempli de pièces d'or.", "On dit qu'un pirate l'avait caché là."],
    consigne: "Dans ce texte, que veut dire le mot coffre ?",
    options: ["une grande boîte", "un bateau", "un animal"], attendu: "une grande boîte",
    explication: "Ici, le coffre est une grande boîte où l'on garde des objets, comme les pièces d'or." },
  { cle: "lec-sens-n1-b", competence: "FR.LECTURE.SENS_MOT", niveau: 1, format: "qcm",
    texte: ["Le petit ruisseau coule entre les cailloux.", "Son eau est claire et toute fraîche."],
    consigne: "Dans ce texte, qu'est-ce qu'un ruisseau ?",
    options: ["un petit cours d'eau", "une montagne", "un grand arbre"], attendu: "un petit cours d'eau",
    explication: "Le ruisseau coule avec de l'eau entre les cailloux : c'est un petit cours d'eau." },
  { cle: "lec-sens-n2-a", competence: "FR.LECTURE.SENS_MOT", niveau: 2, format: "qcm",
    texte: ["Après la longue marche en montagne, les randonneurs étaient épuisés.", "Ils se sont assis pour se reposer."],
    consigne: "Dans ce texte, que veut dire épuisés ?",
    options: ["très fatigués", "très contents", "très pressés"], attendu: "très fatigués",
    explication: "Ils se reposent après une longue marche : épuisés veut dire très fatigués." },
  { cle: "lec-sens-n2-b", competence: "FR.LECTURE.SENS_MOT", niveau: 2, format: "qcm",
    texte: ["Le chat guette la souris sans bouger une oreille.", "Dès qu'elle sort de son trou, il bondit."],
    consigne: "Dans ce texte, que veut dire guette ?",
    options: ["surveille avec attention", "mange tranquillement", "dort profondément"],
    attendu: "surveille avec attention",
    explication: "Le chat regarde la souris sans bouger pour l'attraper : guetter, c'est surveiller avec attention." },
  { cle: "lec-sens-n3-a", competence: "FR.LECTURE.SENS_MOT", niveau: 3, format: "qcm",
    texte: ["La route était glissante à cause du verglas.", "Les voitures roulaient tout doucement."],
    consigne: "Dans ce texte, que veut dire glissante ?",
    options: ["où l'on glisse facilement", "toute droite", "très large"], attendu: "où l'on glisse facilement",
    explication: "À cause du verglas, on glisse sur la route : glissante veut dire où l'on glisse facilement." },
  { cle: "lec-sens-n3-b", competence: "FR.LECTURE.SENS_MOT", niveau: 3, format: "clic",
    texte: ["Le grenier était tout sombre.", "Léo alluma vite sa lampe pour y voir quelque chose."],
    consigne: "Clique dans le texte sur le mot qui aide à comprendre que sombre veut dire sans lumière.",
    attendu: "lampe",
    explication: "Léo allume une lampe parce qu'il fait sombre : la lampe montre que sombre veut dire sans lumière." },
  { cle: "lec-sens-n4-a", competence: "FR.LECTURE.SENS_MOT", niveau: 4, format: "clic",
    texte: ["Le vent soufflait si fort que les volets claquaient.", "Dehors, les branches pliaient sous la tempête."],
    consigne: "Clique dans le texte sur le mot qui aide à comprendre que le vent était très fort.",
    attendu: "tempête",
    explication: "Le mot tempête montre que le vent soufflait très fort." },
  { cle: "lec-sens-n4-b", competence: "FR.LECTURE.SENS_MOT", niveau: 4, format: "clic",
    texte: ["Le repas était délicieux.", "Les enfants se régalèrent et vidèrent toute leur assiette."],
    consigne: "Clique dans le texte sur le mot qui aide à comprendre que délicieux veut dire très bon.",
    attendu: "régalèrent",
    explication: "Les enfants se régalèrent : ce mot montre que le repas était délicieux, c'est-à-dire très bon." },
];

// Competences de la sous-matiere (ordre d'affichage = ordre du referentiel).
export const COMPETENCES_LECTURE = [
  "FR.LECTURE.INFO",
  "FR.LECTURE.INFERENCE",
  "FR.LECTURE.ORDRE",
  "FR.LECTURE.VRAIFAUX",
  "FR.LECTURE.SENS_MOT",
] as const;

// Items jouables pour une competence et un niveau donnes.
export function itemsCompDe(competence: string, niveau: number): CompItem[] {
  return BANQUE_COMPREHENSION.filter((i) => i.competence === competence && i.niveau === niveau);
}

// Juge local (mode demo + feedback immediat) : miroir exact du serveur.
export function estJusteComprehension(cle: string, saisie: string): boolean {
  const item = BANQUE_COMPREHENSION.find((i) => i.cle === cle);
  if (!item) return false;
  return comparerComprehension(item.format, saisie, item.attendu);
}

// Recupere un item par sa cle (utilise par le composant d'exercice).
export function itemCompParCle(cle: string): CompItem | undefined {
  return BANQUE_COMPREHENSION.find((i) => i.cle === cle);
}

// ==========================================================================
// GENERATEUR : choisit un ITEM de la banque pour la competence et le niveau, de
// facon reproductible (graine). Le composant <Comprehension> l'affiche (texte
// SILENCIEUX puis question) ; le serveur (verif_comprehension, op 'lire') est
// seul juge via la cle. Repli robuste si aucun item.
// ==========================================================================
export function buildComprehension(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const items = itemsCompDe(src.competence, src.niveau);
  const item = items.length > 0 ? pick(rng, items) : null;
  if (!item) {
    return {
      ...base,
      forme: "comprehension",
      support: "aucun",
      saisie: "comprehension",
      prompt: "Comprendre un texte",
      answer: 0,
      reste: null,
      fields: 1,
      verif: { op: "lire", a: 0, b: 0, cle: "" },
      correction: "",
    };
  }
  return {
    ...base,
    forme: "comprehension",
    support: "aucun",
    saisie: "comprehension",
    prompt: item.consigne,
    answer: 0,
    reste: null,
    fields: 1,
    comp: {
      cle: item.cle,
      format: item.format,
      texte: item.texte,
      consigne: item.consigne,
      options: item.options,
      evenements: item.evenements,
      attendu: item.attendu,
      explication: item.explication,
    },
    verif: { op: "lire", a: 0, b: 0, cle: item.cle },
    correction: item.explication,
  };
}
