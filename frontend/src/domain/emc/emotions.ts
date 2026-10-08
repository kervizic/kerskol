// Banque « MES EMOTIONS » (Vivre ensemble / EMC, CE2, cycle 2). Sous-matiere,
// domaine dedie `emotions` :
//   EMC.EMOTIONS.RECONNAITRE  reconnaitre et nommer les emotions (joie, colere,
//                             peur, tristesse, surprise...) ;
//   EMC.EMOTIONS.CALME        reagir calmement quand une emotion est forte ;
//   EMC.EMOTIONS.EMPATHIE     se mettre a la place de l'autre.
//
// FORMAT : petites SITUATIONS concretes. Ton bienveillant : toutes les emotions
// ont le droit d'exister, on apprend juste a les reconnaitre et a bien reagir.
// Le SERVEUR (verif_qm, op 'qm') reste seul juge via la cle.

import { type QmItem, ordre, tri } from "../qm/types";

export const BANQUE_EMOTIONS: QmItem[] = [
  // =======================================================================
  // EMC.EMOTIONS.RECONNAITRE — reconnaitre et nommer les emotions
  // =======================================================================
  { cle: "emc-emo-rec-n1-a", competence: "EMC.EMOTIONS.RECONNAITRE", niveau: 1, format: "qcm",
    consigne: "Tu reçois un cadeau que tu adores. Quelle émotion ressens-tu ?",
    options: ["la joie", "la peur"], attendu: "la joie",
    explication: "Un cadeau qu'on adore donne de la joie : on a envie de sourire." },
  { cle: "emc-emo-rec-n1-b", competence: "EMC.EMOTIONS.RECONNAITRE", niveau: 1, format: "qcm",
    consigne: "Il fait tout noir et tu entends un bruit bizarre. Quelle émotion ?",
    options: ["la peur", "la joie"], attendu: "la peur",
    explication: "Le noir et les bruits bizarres peuvent faire peur. C'est normal, ça arrive à tout le monde." },
  { cle: "emc-emo-rec-n2-a", competence: "EMC.EMOTIONS.RECONNAITRE", niveau: 2, format: "qcm",
    consigne: "Ton meilleur ami déménage très loin. Quelle émotion ressens-tu ?",
    options: ["la tristesse", "la joie", "la surprise"], attendu: "la tristesse",
    explication: "Quand quelqu'un qu'on aime part, on ressent de la tristesse. On a le droit d'être triste." },
  { cle: "emc-emo-rec-n2-b", competence: "EMC.EMOTIONS.RECONNAITRE", niveau: 2, format: "tri",
    consigne: "Classe chaque situation avec la bonne émotion.",
    ...tri(["joie", "colère", "peur"], [
      ["c'est mon anniversaire", "joie"],
      ["on a cassé mon jouet exprès", "colère"],
      ["je suis seul dans le noir", "peur"],
    ]),
    explication: "L'anniversaire donne de la joie, un jouet cassé exprès peut mettre en colère, le noir peut faire peur." },
  { cle: "emc-emo-rec-n3-a", competence: "EMC.EMOTIONS.RECONNAITRE", niveau: 3, format: "qcm",
    consigne: "Ton cœur bat vite, tu as chaud et tu as très envie de crier. Quelle émotion est la plus forte ?",
    options: ["la colère", "la joie", "l'ennui"], attendu: "la colère",
    explication: "Le cœur qui bat vite et l'envie de crier, c'est souvent la colère. La reconnaître aide à se calmer." },
  { cle: "emc-emo-rec-n3-b", competence: "EMC.EMOTIONS.RECONNAITRE", niveau: 3, format: "qcm",
    consigne: "On te fait une fête alors que tu ne t'y attendais pas du tout. Quelle émotion ?",
    options: ["la surprise", "la peur", "la tristesse"], attendu: "la surprise",
    explication: "Quand il se passe quelque chose d'inattendu, on ressent de la surprise." },
  { cle: "emc-emo-rec-n4-a", competence: "EMC.EMOTIONS.RECONNAITRE", niveau: 4, format: "texte",
    consigne: "Quand tu es très content, tu ressens de la... Écris le mot (joie).",
    attendu: "joie",
    explication: "Quand on est très content, on ressent de la joie." },
  { cle: "emc-emo-rec-n4-b", competence: "EMC.EMOTIONS.RECONNAITRE", niveau: 4, format: "texte",
    consigne: "Quand quelque chose t'énerve très fort, tu ressens de la... Écris le mot (colère).",
    attendu: "colère",
    explication: "Quand quelque chose nous énerve très fort, on ressent de la colère. C'est une émotion normale." },

  // =======================================================================
  // EMC.EMOTIONS.CALME — reagir calmement quand une emotion est forte
  // =======================================================================
  { cle: "emc-emo-cal-n1-a", competence: "EMC.EMOTIONS.CALME", niveau: 1, format: "qcm",
    consigne: "Tu es très en colère. Qu'est-ce qui aide à se calmer ?",
    options: ["respirer doucement", "taper quelqu'un"], attendu: "respirer doucement",
    explication: "Respirer doucement aide le corps à se calmer. Taper ne règle rien et fait mal." },
  { cle: "emc-emo-cal-n1-b", competence: "EMC.EMOTIONS.CALME", niveau: 1, format: "qcm",
    consigne: "Tu es très énervé. Que peux-tu faire de bien ?",
    options: ["compter jusqu'à 10", "casser un objet"], attendu: "compter jusqu'à 10",
    explication: "Compter jusqu'à 10 laisse le temps à la colère de descendre." },
  { cle: "emc-emo-cal-n2-a", competence: "EMC.EMOTIONS.CALME", niveau: 2, format: "qcm",
    consigne: "Un camarade a pris ton ballon sans demander. Tu es en colère. Que fais-tu ?",
    options: ["je lui dis calmement que ça m'embête", "je le pousse", "je crie très fort"],
    attendu: "je lui dis calmement que ça m'embête",
    explication: "On peut dire calmement ce qui nous dérange. Les mots règlent mieux les choses que les coups." },
  { cle: "emc-emo-cal-n2-b", competence: "EMC.EMOTIONS.CALME", niveau: 2, format: "tri",
    consigne: "Classe chaque réaction : elle calme, ou elle ne calme pas ?",
    ...tri(["ça calme", "ça ne calme pas"], [
      ["respirer lentement", "ça calme"],
      ["demander un câlin", "ça calme"],
      ["tout casser", "ça ne calme pas"],
      ["insulter l'autre", "ça ne calme pas"],
    ]),
    explication: "Respirer et demander un câlin aident à se calmer. Casser ou insulter rend les choses pires." },
  { cle: "emc-emo-cal-n3-a", competence: "EMC.EMOTIONS.CALME", niveau: 3, format: "ordre",
    consigne: "Tu es très en colère. Range dans l'ordre ce qui aide à se calmer.",
    ...ordre(["je m'arrête", "je respire doucement", "je parle calmement"]),
    explication: "D'abord on s'arrête, puis on respire, puis on parle calmement. La colère redescend." },
  { cle: "emc-emo-cal-n3-b", competence: "EMC.EMOTIONS.CALME", niveau: 3, format: "qcm",
    consigne: "Tu es triste après une dispute. Qu'est-ce qui peut t'aider ?",
    options: ["en parler à quelqu'un en qui tu as confiance", "garder tout pour toi", "rester fâché pour toujours"],
    attendu: "en parler à quelqu'un en qui tu as confiance",
    explication: "Parler de sa tristesse à quelqu'un de confiance fait du bien et aide à se sentir mieux." },
  { cle: "emc-emo-cal-n4-a", competence: "EMC.EMOTIONS.CALME", niveau: 4, format: "texte",
    consigne: "Pour calmer une grosse colère, on peut d'abord... doucement. Écris le mot (respirer).",
    attendu: "respirer",
    explication: "Respirer doucement et lentement aide le corps et la tête à se calmer." },
  { cle: "emc-emo-cal-n4-b", competence: "EMC.EMOTIONS.CALME", niveau: 4, format: "texte",
    consigne: "Au lieu de taper, pour régler un problème, on utilise des... Écris le mot (mots).",
    attendu: "mots",
    explication: "On utilise des mots pour dire ce qu'on ressent : c'est plus fort que les coups." },

  // =======================================================================
  // EMC.EMOTIONS.EMPATHIE — se mettre a la place de l'autre
  // =======================================================================
  { cle: "emc-emo-emp-n1-a", competence: "EMC.EMOTIONS.EMPATHIE", niveau: 1, format: "qcm",
    consigne: "Un camarade pleure parce qu'il est tombé. Comment est-il ?",
    options: ["il a mal et il est triste", "il est très content"], attendu: "il a mal et il est triste",
    explication: "Quand on tombe et qu'on pleure, on a mal et on est triste. On peut le consoler." },
  { cle: "emc-emo-emp-n1-b", competence: "EMC.EMOTIONS.EMPATHIE", niveau: 1, format: "qcm",
    consigne: "Ton ami a gagné un prix et il saute partout. Comment se sent-il ?",
    options: ["très heureux", "très triste"], attendu: "très heureux",
    explication: "Gagner un prix rend très heureux. Tu peux te réjouir avec lui." },
  { cle: "emc-emo-emp-n2-a", competence: "EMC.EMOTIONS.EMPATHIE", niveau: 2, format: "qcm",
    consigne: "Une camarade a oublié son goûter et elle a faim. Que peux-tu faire ?",
    options: ["partager mon goûter avec elle", "manger devant elle sans rien dire", "me moquer d'elle"],
    attendu: "partager mon goûter avec elle",
    explication: "Se mettre à sa place, c'est comprendre sa faim. Partager est un geste généreux." },
  { cle: "emc-emo-emp-n2-b", competence: "EMC.EMOTIONS.EMPATHIE", niveau: 2, format: "qcm",
    consigne: "Tu as dit quelque chose qui a blessé ton ami. Que fais-tu ?",
    options: ["je m'excuse auprès de lui", "je fais comme si de rien n'était", "je recommence"],
    attendu: "je m'excuse auprès de lui",
    explication: "Quand on blesse quelqu'un, on s'excuse. Cela montre qu'on comprend sa peine." },
  { cle: "emc-emo-emp-n3-a", competence: "EMC.EMOTIONS.EMPATHIE", niveau: 3, format: "qcm",
    consigne: "Un nouvel élève arrive et il a l'air stressé et seul. Que peux-tu faire ?",
    options: ["aller lui parler et lui montrer l'école", "le laisser de côté", "rire de sa tête stressée"],
    attendu: "aller lui parler et lui montrer l'école",
    explication: "Se mettre à sa place, c'est deviner qu'il a besoin d'aide. L'accueillir le rassure." },
  { cle: "emc-emo-emp-n3-b", competence: "EMC.EMOTIONS.EMPATHIE", niveau: 3, format: "qcm",
    consigne: "Se mettre à la place de l'autre, ça veut dire...",
    options: ["imaginer ce qu'il ressent", "faire exactement comme lui", "lui prendre ses affaires"],
    attendu: "imaginer ce qu'il ressent",
    explication: "Se mettre à la place de l'autre, c'est imaginer ses émotions pour mieux le comprendre." },
  { cle: "emc-emo-emp-n4-a", competence: "EMC.EMOTIONS.EMPATHIE", niveau: 4, format: "texte",
    consigne: "Quand un camarade est triste, on peut le... Écris le mot (consoler).",
    attendu: "consoler",
    explication: "Consoler un camarade triste, c'est lui montrer qu'il n'est pas seul." },
  { cle: "emc-emo-emp-n4-b", competence: "EMC.EMOTIONS.EMPATHIE", niveau: 4, format: "texte",
    consigne: "Comprendre ce que ressent l'autre, c'est se mettre à sa... Écris le mot (place).",
    attendu: "place",
    explication: "Se mettre à la place de l'autre aide à être gentil et à comprendre ses émotions." },
];

export const COMPETENCES_EMOTIONS = [
  "EMC.EMOTIONS.RECONNAITRE",
  "EMC.EMOTIONS.CALME",
  "EMC.EMOTIONS.EMPATHIE",
] as const;
