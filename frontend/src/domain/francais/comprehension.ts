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

// Un mot difficile (vieux mot ou mot rare d'un texte d'auteur) et son sens, montre
// au survol / au toucher (petit glossaire). AFFICHAGE seulement : jamais juge.
export interface CompGlose {
  mot: string;
  sens: string;
}

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
  glossaire?: CompGlose[]; // vieux mots expliques (survol/toucher) ; affichage seul
  source?: string; // texte d'origine (domaine public) : « Auteur, Titre »
}

// Donnees de RENDU (ce que l'exercice porte et que <Comprehension> affiche).
// `preuve` = la phrase EXACTE du texte qui justifie la reponse ; elle est citee
// en cas d'erreur (« Relis cette phrase : ... ») a la place du message generique
// (correctif phase 5). Elle n'est PAS jugee par le serveur (affichage seulement).
export type CompRender = Pick<
  CompItem,
  "cle" | "format" | "texte" | "consigne" | "options" | "evenements" | "attendu" | "explication" | "glossaire" | "source"
> & { preuve: string };

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
// BANQUE (55 items : 5 competences x 4 niveaux ; textes originaux ; lot 0049 :
// inferences et textes longs 8-12 lignes au N4 ; lot 0060 : 13 items batis sur
// des textes de la bibliotheque domaine public, avec glossaire des vieux mots).
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
    texte: ["Le hérisson est un petit animal au dos couvert de piquants.",
            "Le jour, il dort caché sous un tas de feuilles.",
            "La nuit, il sort pour chercher sa nourriture.",
            "Il mange surtout des vers, des limaces et des insectes.",
            "Quand il a peur, il se roule en boule.",
            "Ses piquants le protègent alors des renards et des chiens.",
            "Quand il fait froid, il mange beaucoup pour devenir bien gras.",
            "Ensuite, il dort très longtemps dans un nid bien chaud.",
            "On appelle ce long sommeil l'hibernation.",
            "Au réveil, le hérisson est tout maigre et très affamé."],
    consigne: "Comment s'appelle le long sommeil du hérisson ?",
    attendu: "hibernation",
    explication: "Le texte dit : on appelle ce long sommeil l'hibernation. C'est le mot à retrouver, comme on cherche une information dans un documentaire." },
  { cle: "lec-info-n4-b", competence: "FR.LECTURE.INFO", niveau: 4, format: "texte",
    texte: ["Tout au bout de l'île se dresse un grand phare rouge et blanc.",
            "Chaque soir, le gardien allume la grande lampe tout en haut.",
            "Sa lumière tourne lentement au-dessus de la mer.",
            "Elle prévient les bateaux qu'il y a des rochers dangereux.",
            "Le gardien habite tout en bas, dans une petite pièce ronde.",
            "Il partage sa maison avec un chat roux appelé Biscuit.",
            "Le chat adore dormir près de la fenêtre qui donne sur l'eau.",
            "Quand la tempête gronde, Biscuit se cache sous le lit.",
            "Le matin, le gardien éteint la lampe et nettoie les vitres.",
            "Puis il note dans un cahier tous les bateaux qu'il a vus passer."],
    consigne: "Comment s'appelle le chat du gardien du phare ?",
    attendu: "Biscuit",
    explication: "Le texte dit que le gardien partage sa maison avec un chat appelé Biscuit. Il fallait bien chercher dans tout le texte." },

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
  { cle: "lec-inf-n3-c", competence: "FR.LECTURE.INFERENCE", niveau: 3, format: "qcm",
    texte: ["Léo et son papi préparent une tarte aux pommes.",
            "Papi épluche les fruits pendant que Léo étale la pâte.",
            "Quand elle est bien dorée, ils la sortent du four.",
            "Il la pose sur la table pour qu'elle refroidisse."],
    consigne: "Dans la phrase « ils la sortent du four », de quoi parle le petit mot la ?",
    options: ["la tarte", "la pâte", "la pomme"], attendu: "la tarte",
    explication: "Le petit mot la remplace la tarte : c'est la tarte qu'ils sortent du four, comme quand on dit je la mange pour je mange la tarte." },
  { cle: "lec-inf-n4-a", competence: "FR.LECTURE.INFERENCE", niveau: 4, format: "clic",
    texte: ["Camille rentre de l'école par le petit chemin.",
            "Au coin de la rue, un chien marche tout seul.",
            "Il n'a pas de collier et ses pattes sont pleines de boue.",
            "Le chien suit Camille jusqu'à la porte de sa maison.",
            "La petite fille lui donne un peu d'eau dans un bol.",
            "L'animal boit très vite, puis il s'assoit près d'elle.",
            "Camille voudrait le garder, mais ses parents disent non.",
            "Ils accrochent une affiche sur un arbre du quartier.",
            "Le soir, une dame vient frapper à la porte.",
            "C'est la propriétaire, qui le cherchait partout."],
    consigne: "Dans la phrase « Camille voudrait le garder », clique dans le texte sur le nom de l'animal que remplace le petit mot le.",
    attendu: "chien",
    explication: "Le petit mot le remplace le chien : Camille voudrait garder le chien, comme on garde un animal trouvé." },
  { cle: "lec-inf-n4-b", competence: "FR.LECTURE.INFERENCE", niveau: 4, format: "texte",
    texte: ["Noé est resté très longtemps dehors dans la neige.",
            "Ses doigts sont tout rouges et il n'arrive plus à les bouger.",
            "Il serre les bras contre son corps et ses dents claquent.",
            "Vite, il rentre dans la maison et court vers le radiateur.",
            "Il enfile un gros pull et attrape une couverture.",
            "Sa maman lui prépare un chocolat bien chaud.",
            "Il tient la tasse brûlante entre ses deux mains.",
            "Petit à petit, Noé se sent mieux.",
            "Bientôt, ses joues redeviennent toutes roses."],
    consigne: "Écris en un seul mot ce que ressentait Noé quand il est rentré.",
    attendu: "froid",
    explication: "Noé était dans la neige, ses dents claquaient et il court vers le radiateur : il avait froid. Le mot froid n'est pas écrit, on le devine." },
  { cle: "lec-inf-n4-c", competence: "FR.LECTURE.INFERENCE", niveau: 4, format: "texte",
    texte: ["C'est le jour du spectacle de l'école.",
            "Jade doit réciter un poème devant tous les parents.",
            "Dans les coulisses, elle n'arrête pas de bouger sur place.",
            "Son cœur bat vite et elle regarde sans cesse vers la salle.",
            "Elle répète son texte tout bas, encore et encore.",
            "Quand le rideau s'ouvre, elle fait un grand sourire.",
            "Dès les premiers mots, sa voix devient toute joyeuse.",
            "À la fin, tout le monde applaudit très fort."],
    consigne: "Écris en un seul mot ce que ressent Jade avant de monter sur scène.",
    attendu: "impatiente",
    explication: "Le cœur qui bat vite, Jade qui bouge sans arrêt et regarde la salle montrent qu'elle est impatiente, même si le mot impatiente n'est pas écrit." },

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
  { cle: "lec-vf-n3-b", competence: "FR.LECTURE.VRAIFAUX", niveau: 3, format: "qcm",
    texte: ["La chouette dort le jour et chasse pendant la nuit.",
            "Avec ses grands yeux, elle voit très bien dans le noir.",
            "Les petites souris, elles, ne la voient pas arriver."],
    consigne: "La chouette a du mal à chasser dans le noir. Est-ce vrai ou faux ?",
    options: ["vrai", "faux"], attendu: "faux",
    explication: "Le texte dit qu'elle voit très bien dans le noir : elle n'a donc aucun mal à chasser la nuit, c'est faux." },
  { cle: "lec-vf-n4-a", competence: "FR.LECTURE.VRAIFAUX", niveau: 4, format: "texte",
    texte: ["Le caméléon est un drôle de lézard qui vit dans les arbres.",
            "Sa peau peut changer de couleur selon l'endroit où il se trouve.",
            "Posé sur une feuille, il devient tout vert.",
            "Sur une branche, il prend la couleur du bois.",
            "Ainsi, ses ennemis ont beaucoup de mal à le repérer.",
            "Ses deux yeux bougent chacun de leur côté.",
            "Il peut donc regarder devant et derrière en même temps.",
            "Sa longue langue collante jaillit pour attraper les insectes."],
    consigne: "Le caméléon est très facile à repérer pour ses ennemis. Réponds vrai ou faux.",
    attendu: "faux",
    explication: "Le caméléon change de couleur pour se fondre dans le décor : ses ennemis ont du mal à le voir, donc c'est faux." },
  { cle: "lec-vf-n4-b", competence: "FR.LECTURE.VRAIFAUX", niveau: 4, format: "texte",
    texte: ["Les fourmis sont de petites ouvrières infatigables.",
            "Chacune transporte des miettes bien plus lourdes qu'elle.",
            "Elles suivent toutes la même piste, l'une derrière l'autre.",
            "Quand l'une trouve de la nourriture, elle prévient les autres.",
            "Toutes ensemble, elles creusent une grande fourmilière.",
            "Sous la terre, il y a des couloirs et des petites salles.",
            "Les œufs sont gardés bien au chaud tout au fond."],
    consigne: "Chaque fourmi travaille toute seule, sans s'occuper des autres. Réponds vrai ou faux.",
    attendu: "faux",
    explication: "Les fourmis se préviennent et creusent ensemble : elles travaillent en équipe, donc c'est faux." },

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

  // =======================================================================
  // TEXTES DE LA BIBLIOTHEQUE (domaine public verifie, lot 0060). Questions
  // ORIGINALES ecrites pour le CE2 ; le `texte` reprend les mots exacts de
  // l'auteur (coupe aux limites de phrase). Un petit glossaire explique les
  // vieux mots. `source` cite l'auteur et l'oeuvre (page /credits, Bibliotheque).
  // =======================================================================
  // --- Jules Renard, « Le Papillon » (Histoires naturelles) ---
  { cle: "lec-bib-papillon-sens-n1", competence: "FR.LECTURE.SENS_MOT", niveau: 1, format: "qcm",
    texte: ["Ce billet doux plié en deux cherche une adresse de fleur."],
    consigne: "Dans ce texte, que veut dire un billet doux ?",
    options: ["une petite lettre d'amour", "un ticket de train", "un oiseau"],
    attendu: "une petite lettre d'amour",
    explication: "Un billet doux est une petite lettre d'amour. Le papillon, plié en deux, ressemble à une lettre qui vole vers une fleur.",
    glossaire: [
      { mot: "un billet doux", sens: "une petite lettre d'amour." },
      { mot: "une adresse", sens: "l'endroit où l'on envoie une lettre ; ici, la fleur." },
    ],
    source: "Jules Renard, « Le Papillon »" },

  // --- Jules Renard, « Le Martin-pêcheur » (Histoires naturelles) ---
  { cle: "lec-bib-martin-info-n2", competence: "FR.LECTURE.INFO", niveau: 2, format: "qcm",
    texte: ["Comme je tenais ma perche de ligne tendue, un martin-pêcheur est venu s'y poser.",
            "Nous n'avons pas d'oiseau plus éclatant."],
    consigne: "Sur quoi le martin-pêcheur est-il venu se poser ?",
    options: ["sur la perche de la ligne", "sur une fleur", "sur une branche morte"],
    attendu: "sur la perche de la ligne",
    explication: "Le texte dit que l'oiseau vient se poser sur la perche de la ligne que le pêcheur tenait.",
    glossaire: [
      { mot: "une perche", sens: "la grande canne du pêcheur, un long bâton." },
      { mot: "éclatant", sens: "aux couleurs très vives, qui brillent." },
    ],
    source: "Jules Renard, « Le Martin-pêcheur »" },
  { cle: "lec-bib-martin-sens-n2", competence: "FR.LECTURE.SENS_MOT", niveau: 2, format: "qcm",
    texte: ["Nous n'avons pas d'oiseau plus éclatant."],
    consigne: "Dans ce texte, que veut dire éclatant ?",
    options: ["aux couleurs très vives", "très grand", "très bruyant"],
    attendu: "aux couleurs très vives",
    explication: "Un oiseau éclatant a des couleurs très vives, qui brillent. Le martin-pêcheur est tout bleu et magnifique.",
    source: "Jules Renard, « Le Martin-pêcheur »" },
  { cle: "lec-bib-martin-inf-n3", competence: "FR.LECTURE.INFERENCE", niveau: 3, format: "qcm",
    texte: ["Il semblait une grosse fleur bleue au bout d'une longue tige.",
            "La perche pliait sous le poids.",
            "Je ne respirais plus, tout fier d'être pris pour un arbre par un martin-pêcheur."],
    consigne: "Pourquoi le pêcheur ne respire-t-il plus ?",
    options: ["pour ne pas faire fuir l'oiseau", "parce qu'il est très fatigué", "parce qu'il a froid"],
    attendu: "pour ne pas faire fuir l'oiseau",
    explication: "Le pêcheur reste immobile et retient son souffle pour ne pas faire fuir le bel oiseau posé tout près de lui.",
    source: "Jules Renard, « Le Martin-pêcheur »" },
  { cle: "lec-bib-martin-inf-n4", competence: "FR.LECTURE.INFERENCE", niveau: 4, format: "texte",
    texte: ["Il semblait une grosse fleur bleue au bout d'une longue tige.",
            "La perche pliait sous le poids.",
            "Je ne respirais plus, tout fier d'être pris pour un arbre par un martin-pêcheur."],
    consigne: "Le martin-pêcheur s'est posé sur le pêcheur. Écris en un seul mot ce que l'oiseau a cru que le pêcheur était.",
    attendu: "arbre",
    explication: "Le pêcheur reste si immobile que l'oiseau le prend pour un arbre et se pose sur sa perche. On devine le mot arbre.",
    source: "Jules Renard, « Le Martin-pêcheur »" },
  { cle: "lec-bib-martin-info-n4", competence: "FR.LECTURE.INFO", niveau: 4, format: "clic",
    texte: ["Comme je tenais ma perche de ligne tendue, un martin-pêcheur est venu s'y poser.",
            "Nous n'avons pas d'oiseau plus éclatant."],
    consigne: "Clique dans le texte sur le nom de l'oiseau qui vient se poser sur la perche.",
    attendu: "martin-pêcheur",
    explication: "Le martin-pêcheur est l'oiseau bleu qui s'est posé sur la perche du pêcheur.",
    source: "Jules Renard, « Le Martin-pêcheur »" },

  // --- Jean de La Fontaine, « Le Corbeau et le Renard » ---
  { cle: "lec-bib-corbeau-ord-n3", competence: "FR.LECTURE.ORDRE", niveau: 3, format: "ordre",
    texte: ["Maître corbeau, sur un arbre perché,", "Tenait en son bec un fromage.",
            "Hé ! bonjour, monsieur du corbeau.", "Il ouvre un large bec, laisse tomber sa proie.",
            "Le renard s'en saisit, et dit : Mon bon monsieur,"],
    consigne: "Range les moments de l'histoire dans l'ordre.",
    ...ordre(
      ["le renard dit bonjour et flatte le corbeau", "le corbeau ouvre son bec pour chanter", "le renard attrape le fromage tombé"],
      ["le renard attrape le fromage tombé", "le renard dit bonjour et flatte le corbeau", "le corbeau ouvre son bec pour chanter"]),
    explication: "Le renard flatte le corbeau, le corbeau ouvre le bec pour chanter, et le fromage tombe : le renard l'attrape.",
    glossaire: [
      { mot: "perché", sens: "posé en haut, tout en hauteur." },
      { mot: "sa proie", sens: "ce qu'il tient pour manger ; ici, le fromage." },
    ],
    source: "Jean de La Fontaine, « Le Corbeau et le Renard »" },
  { cle: "lec-bib-corbeau-sens-n3", competence: "FR.LECTURE.SENS_MOT", niveau: 3, format: "clic",
    texte: ["Le renard dit de belles choses au corbeau pour avoir son fromage.",
            "Apprenez que tout flatteur", "Vit aux dépens de celui qui l'écoute."],
    consigne: "Clique dans le texte sur le mot qui désigne celui qui dit de belles choses pour tromper.",
    attendu: "flatteur",
    explication: "Un flatteur dit de belles choses pour tromper. Le renard flatte le corbeau pour lui prendre son fromage.",
    glossaire: [
      { mot: "un flatteur", sens: "une personne qui dit de belles choses pour tromper les autres." },
      { mot: "vivre aux dépens de", sens: "profiter de quelqu'un." },
    ],
    source: "Jean de La Fontaine, « Le Corbeau et le Renard »" },

  // --- Jean de La Fontaine, « Le Lièvre et la Tortue » ---
  { cle: "lec-bib-lievre-info-n1", competence: "FR.LECTURE.INFO", niveau: 1, format: "qcm",
    texte: ["Rien ne sert de courir ; il faut partir à point.",
            "Il partit comme un trait ; mais les élans qu'il fit Furent vains : la tortue arriva la première."],
    consigne: "Qui arrive le premier au bout de la course ?",
    options: ["la tortue", "le lièvre", "le juge"],
    attendu: "la tortue",
    explication: "Le texte dit que la tortue arriva la première. Elle a gagné en avançant sans jamais s'arrêter.",
    source: "Jean de La Fontaine, « Le Lièvre et la Tortue »" },
  { cle: "lec-bib-lievre-vf-n2", competence: "FR.LECTURE.VRAIFAUX", niveau: 2, format: "qcm",
    texte: ["Lui cependant méprise une telle victoire, tient la gageure à peu de gloire.",
            "Il broute, il se repose ; Il s'amuse à toute autre chose Qu'à la gageure."],
    consigne: "Le lièvre part tout de suite et court sans s'arrêter. Est-ce vrai ou faux ?",
    options: ["vrai", "faux"],
    attendu: "faux",
    explication: "Le lièvre broute, se repose et s'amuse au lieu de courir : il ne part pas tout de suite, donc c'est faux.",
    glossaire: [
      { mot: "la gageure", sens: "le pari ; ici, la course entre le lièvre et la tortue." },
      { mot: "il broute", sens: "il mange l'herbe." },
    ],
    source: "Jean de La Fontaine, « Le Lièvre et la Tortue »" },

  // --- Colette, « Le jeune chat » ---
  { cle: "lec-bib-chat-info-n2", competence: "FR.LECTURE.INFO", niveau: 2, format: "qcm",
    texte: ["Il est déjà ravissant, et nous essayons de le nommer Kamaralzaman.",
            "La cuisinière et la femme de chambre traduisent Kamaralzaman par Moumou."],
    consigne: "Comment la cuisinière appelle-t-elle le petit chat ?",
    options: ["Moumou", "Kamaralzaman", "Minou"],
    attendu: "Moumou",
    explication: "Le texte dit que la cuisinière traduit Kamaralzaman par Moumou : elle l'appelle Moumou.",
    glossaire: [
      { mot: "ravissant", sens: "très joli, très mignon." },
    ],
    source: "Colette, « Le jeune chat »" },
  { cle: "lec-bib-chat-sens-n2", competence: "FR.LECTURE.SENS_MOT", niveau: 2, format: "qcm",
    texte: ["Il est un jeune chat, gracieux à toute heure."],
    consigne: "Dans ce texte, que veut dire gracieux ?",
    options: ["joli et mignon dans ses gestes", "très méchant", "très gros"],
    attendu: "joli et mignon dans ses gestes",
    explication: "Gracieux veut dire joli et mignon dans ses gestes. Le petit chat est charmant à regarder.",
    source: "Colette, « Le jeune chat »" },

  // --- Jules Renard, « L'Écureuil » (Histoires naturelles) ---
  { cle: "lec-bib-ecureuil-sens-n3", competence: "FR.LECTURE.SENS_MOT", niveau: 3, format: "qcm",
    texte: ["Leste allumeur de l'automne, il passe et repasse sous les feuilles la petite torche de sa queue."],
    consigne: "Dans ce texte, que veut dire leste ?",
    options: ["vif et rapide", "lourd et lent", "tout triste"],
    attendu: "vif et rapide",
    explication: "Leste veut dire vif et rapide. L'écureuil bouge sans arrêt sous les feuilles, avec sa belle queue rousse.",
    glossaire: [
      { mot: "leste", sens: "vif et rapide dans ses mouvements." },
      { mot: "une torche", sens: "une flamme que l'on tient à la main ; ici, la queue rousse de l'écureuil." },
    ],
    source: "Jules Renard, « L'Écureuil »" },
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

// --------------------------------------------------------------------------
// PREUVE par item (correctif phase 5). Chaque valeur est une phrase EXACTE du
// `texte` de l'item : en cas d'erreur, on cite cette phrase (« Relis cette
// phrase : ... ») au lieu du message generique. Un test croise verifie que
// chaque cle est couverte ET que la preuve est bien une ligne du texte.
// --------------------------------------------------------------------------
export const PREUVE_PAR_CLE: Record<string, string> = {
  // FR.LECTURE.INFO
  "lec-info-n1-a": "Le chat s'appelle Mistigri.",
  "lec-info-n1-b": "Le ballon est sous l'arbre.",
  "lec-info-n2-a": "Ses trois petits restent cachés dans le terrier.",
  "lec-info-n2-b": "Puis tu verses la pâte dans un moule.",
  "lec-info-n3-a": "Sa queue touffue l'aide à garder l'équilibre.",
  "lec-info-n3-b": "Elle met ses livres sur l'étagère et ses jouets dans le grand coffre.",
  "lec-info-n4-a": "On appelle ce long sommeil l'hibernation.",
  "lec-info-n4-b": "Il partage sa maison avec un chat roux appelé Biscuit.",
  // FR.LECTURE.INFERENCE
  "lec-inf-n1-a": "Il saute partout et montre sa médaille à tout le monde.",
  "lec-inf-n1-b": "Il pleut très fort et elle ne peut pas aller jouer dehors.",
  "lec-inf-n2-a": "Son maître vient de rentrer à la maison.",
  "lec-inf-n2-b": "Il n'a rien mangé et il attend le repas avec impatience.",
  "lec-inf-n3-a": "La maîtresse éteint la lumière de la classe et ferme la porte à clé.",
  "lec-inf-n3-b": "Dehors, les flaques brillent sur le trottoir.",
  "lec-inf-n3-c": "Quand elle est bien dorée, ils la sortent du four.",
  "lec-inf-n4-a": "Camille voudrait le garder, mais ses parents disent non.",
  "lec-inf-n4-b": "Il serre les bras contre son corps et ses dents claquent.",
  "lec-inf-n4-c": "Son cœur bat vite et elle regarde sans cesse vers la salle.",
  // FR.LECTURE.ORDRE
  "lec-ord-n1-a": "Papa casse les œufs dans un bol.",
  "lec-ord-n1-b": "Plus tard, une petite fleur pousse.",
  "lec-ord-n2-a": "D'abord, Sacha met son manteau.",
  "lec-ord-n2-b": "Pour préparer un jus d'orange, tu coupes l'orange en deux.",
  "lec-ord-n3-a": "D'abord, il met ses cahiers.",
  "lec-ord-n3-b": "La chenille mange beaucoup de feuilles.",
  "lec-ord-n4-a": "Pour faire pousser des lentilles, pose du coton au fond d'un pot.",
  "lec-ord-n4-b": "Il décide de partir explorer la forêt.",
  // FR.LECTURE.VRAIFAUX
  "lec-vf-n1-a": "Il donne de la lumière et de la chaleur.",
  "lec-vf-n1-b": "Il ne sait pas voler, mais il nage très bien.",
  "lec-vf-n2-a": "Elle vit dans une ruche avec des milliers d'autres abeilles.",
  "lec-vf-n2-b": "Les tomates deviennent rouges et bien mûres.",
  "lec-vf-n3-a": "Ce n'est pas un poisson : c'est un mammifère.",
  "lec-vf-n3-b": "Avec ses grands yeux, elle voit très bien dans le noir.",
  "lec-vf-n4-a": "Ainsi, ses ennemis ont beaucoup de mal à le repérer.",
  "lec-vf-n4-b": "Quand l'une trouve de la nourriture, elle prévient les autres.",
  // FR.LECTURE.SENS_MOT
  "lec-sens-n1-a": "Le vieux coffre était rempli de pièces d'or.",
  "lec-sens-n1-b": "Le petit ruisseau coule entre les cailloux.",
  "lec-sens-n2-a": "Après la longue marche en montagne, les randonneurs étaient épuisés.",
  "lec-sens-n2-b": "Le chat guette la souris sans bouger une oreille.",
  "lec-sens-n3-a": "La route était glissante à cause du verglas.",
  "lec-sens-n3-b": "Léo alluma vite sa lampe pour y voir quelque chose.",
  "lec-sens-n4-a": "Dehors, les branches pliaient sous la tempête.",
  "lec-sens-n4-b": "Les enfants se régalèrent et vidèrent toute leur assiette.",
  // Textes de la bibliotheque (domaine public, lot 0060)
  "lec-bib-papillon-sens-n1": "Ce billet doux plié en deux cherche une adresse de fleur.",
  "lec-bib-martin-info-n2": "Comme je tenais ma perche de ligne tendue, un martin-pêcheur est venu s'y poser.",
  "lec-bib-martin-sens-n2": "Nous n'avons pas d'oiseau plus éclatant.",
  "lec-bib-martin-inf-n3": "Je ne respirais plus, tout fier d'être pris pour un arbre par un martin-pêcheur.",
  "lec-bib-martin-inf-n4": "Je ne respirais plus, tout fier d'être pris pour un arbre par un martin-pêcheur.",
  "lec-bib-martin-info-n4": "Comme je tenais ma perche de ligne tendue, un martin-pêcheur est venu s'y poser.",
  "lec-bib-corbeau-ord-n3": "Il ouvre un large bec, laisse tomber sa proie.",
  "lec-bib-corbeau-sens-n3": "Apprenez que tout flatteur",
  "lec-bib-lievre-info-n1": "Il partit comme un trait ; mais les élans qu'il fit Furent vains : la tortue arriva la première.",
  "lec-bib-lievre-vf-n2": "Il broute, il se repose ; Il s'amuse à toute autre chose Qu'à la gageure.",
  "lec-bib-chat-info-n2": "La cuisinière et la femme de chambre traduisent Kamaralzaman par Moumou.",
  "lec-bib-chat-sens-n2": "Il est un jeune chat, gracieux à toute heure.",
  "lec-bib-ecureuil-sens-n3": "Leste allumeur de l'automne, il passe et repasse sous les feuilles la petite torche de sa queue.",
};

// Preuve d'un item (repli sur sa 1re phrase si la cle est inconnue).
export function preuvePour(cle: string): string {
  if (PREUVE_PAR_CLE[cle]) return PREUVE_PAR_CLE[cle];
  const item = itemCompParCle(cle);
  return item?.texte[0] ?? "";
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
      glossaire: item.glossaire,
      source: item.source,
      preuve: preuvePour(item.cle),
    },
    verif: { op: "lire", a: 0, b: 0, cle: item.cle },
    correction: item.explication,
  };
}
