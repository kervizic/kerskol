// Sous-matiere « COPIER ET ÉCRIRE » (francais, CE2, cycle 2 revise), domaine
// dedie `ecriture`, competences FR.ECR.*. Deux activites :
//
//   FR.ECR.COPIE  : recopier (N1 un mot -> N4 un passage de 3 phrases affiche
//                   puis masque = copie differee). Verification DETERMINISTE
//                   mot a mot (majuscule, accents, ponctuation EXIGES), avec un
//                   diagnostic bienveillant cote client (mot oublie, accent...).
//   FR.ECR.GUIDEE : ecriture guidee. N1 remettre des mots dans l'ordre pour
//                   faire une phrase (etiquettes) ; N2 completer une phrase avec
//                   le bon mot (coherence) ; N3 transformer une phrase (pluriel,
//                   passe compose) vers une cible exacte ; N4 ecrire une phrase
//                   LIBRE a partir d'une image (emoji) ou d'un debut d'histoire,
//                   verifiee par une CHECK-LIST (jamais par le sens) : majuscule,
//                   point final, au moins un verbe d'une liste, au moins N mots,
//                   mots-cles imposes. La phrase de l'enfant est ENREGISTREE et
//                   relue par le parent (table ecriture_production).
//
// Le SERVEUR reste SEUL JUGE : table miroir public.ecriture_item + fonction
// public.verif_ecriture, op dediee 'ecr' dans enregistrer_reponse. Ce fichier est
// le miroir EXACT du serveur (test croise ecriture.test.ts + ecriture_test.sql).
// BIENVEILLANCE : tout contenu enfant optimiste (garde-fou bienveillance.test.ts).

import { normaliser } from "../diagnostic/lettres";
import { normaliserMot } from "./dictee";
import { pick, type Rng } from "../calcul/rng";
import type { Base, GeneratedExercise, ExCalcul } from "../calcul/generator";

export type EcrFormat = "copie" | "ordre" | "qcm" | "transform" | "libre";

// Check-list verifiable automatiquement d'une phrase libre (N4). `verbes` vide
// -> on utilise la liste par defaut VERBES_LIBRE.
export interface EcrCheck {
  minMots: number;
  motsCles: string[];
  verbes?: string[];
}

export interface EcrItem {
  cle: string; // identifiant stable (PK serveur)
  competence: string; // FR.ECR.*
  niveau: number; // 1..4
  format: EcrFormat;
  consigne: string; // consigne redigee pour l'oral
  attendu: string; // cible (copie/ordre/transform/qcm) ; "" pour libre
  modele?: string; // copie : le modele a recopier (= attendu) ; affiche
  differe?: boolean; // copie differee (N4) : on regarde, on cache, on ecrit
  etiquettes?: string[]; // ordre : mots a remettre dans l'ordre (affiches melanges)
  phrase?: string; // qcm/transform : phrase support affichee (trou note « … »)
  options?: string[]; // qcm : propositions de mots
  check?: EcrCheck; // libre : check-list verifiable
  amorce?: string; // libre : debut d'histoire a continuer (sinon image)
  image?: string; // libre : emoji Fluent (nom) servant de declencheur
  exemple?: string; // libre : exemple de bonne phrase (feedback ; JAMAIS juge)
  explication: string; // correction courte et valorisante, avec un exemple
}

// Liste de verbes acceptes pour le N4 libre (formes courantes au CE2). Miroir
// EXACT du tableau du serveur (verif_ecriture). Comparaison sur `normaliserMot`.
export const VERBES_LIBRE: string[] = [
  "joue", "jouent", "court", "courent", "dort", "dorment", "mange", "mangent",
  "lit", "lisent", "aime", "aiment", "regarde", "regardent", "saute", "sautent",
  "vole", "volent", "chante", "chantent", "brille", "brillent", "va", "vont",
  "est", "sont", "a", "ont", "rentre", "rentrent", "donne", "donnent", "rit",
  "rient", "danse", "dansent", "plante", "plantent", "cherche", "cherchent",
  "trouve", "trouvent", "pousse", "poussent", "arrose", "arrosent", "dessine",
  "dessinent", "ouvre", "ouvrent", "ferme", "ferment", "porte", "portent",
  "attrape", "attrapent", "caresse", "caressent", "promene", "promenent",
];

// --------------------------------------------------------------------------
// Normalisations MIROIR du serveur (verif_ecriture) :
//   copie / transform -> espaces normalises, casse + accents + ponctuation EXIGES
//   ordre             -> espaces retires, casse + accents + ponctuation EXIGES
//   qcm               -> normaliser (minuscule, accents gardes, espaces)
//   libre             -> check-list (majuscule, point, >= N mots, verbe, mots-cles)
// --------------------------------------------------------------------------
export function normCopie(s: string): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}
export function normOrdre(s: string): string {
  return (s ?? "").replace(/\s+/g, "");
}

export function comparerEcriture(format: EcrFormat, saisie: string, attendu: string): boolean {
  if (format === "copie" || format === "transform") return normCopie(saisie) === normCopie(attendu);
  if (format === "ordre") return normOrdre(saisie) === normOrdre(attendu);
  if (format === "qcm") return normaliser(saisie) === normaliser(attendu);
  return false; // libre : voir verifieCheck
}

// Check-list d'une phrase libre. DETERMINISTE, jamais de jugement du sens.
export function verifieCheck(saisie: string, check: EcrCheck): boolean {
  const s = (saisie ?? "").trim();
  if (s === "") return false;
  const premier = s.charAt(0);
  const majuscule = premier !== premier.toLowerCase() && premier === premier.toUpperCase();
  if (!majuscule) return false;
  if (!/[.!?]$/.test(s)) return false;
  const mots = s.split(/\s+/).filter(Boolean);
  if (mots.length < check.minMots) return false;
  const motsNorm = mots.map(normaliserMot);
  const setMots = new Set(motsNorm);
  const verbes = (check.verbes && check.verbes.length ? check.verbes : VERBES_LIBRE).map(normaliserMot);
  if (!verbes.some((v) => setMots.has(v))) return false;
  for (const kw of check.motsCles) {
    if (!setMots.has(normaliserMot(kw))) return false;
  }
  return true;
}

// Juge local (mode demo + feedback immediat) : miroir EXACT du serveur.
export function estJusteEcriture(cle: string, saisie: string): boolean {
  const item = itemEcrParCle(cle);
  if (!item) return false;
  if (item.format === "libre") return item.check ? verifieCheck(saisie, item.check) : false;
  return comparerEcriture(item.format, saisie, item.attendu);
}

// Diagnostic BIENVEILLANT de la copie (affichage seul ; le serveur juge juste
// ou faux). On repere la premiere difference et on l'explique simplement.
export function diagnostiquerCopie(saisie: string, attendu: string): string {
  const a = normCopie(attendu);
  const s = normCopie(saisie);
  if (s === a) return "Bravo, c'est exactement pareil !";
  const motsA = a.split(" ");
  const motsS = s.split(" ");
  if (motsS.length < motsA.length) {
    return `Il manque un mot. Pense à bien recopier « ${motsA[motsS.length] ?? motsA[motsA.length - 1]} ».`;
  }
  for (let i = 0; i < motsA.length; i++) {
    const ma = motsA[i];
    const ms = motsS[i] ?? "";
    if (ms === ma) continue;
    if (ms.toLowerCase() === ma.toLowerCase() && ms !== ma) {
      if (ms.charAt(0) !== ma.charAt(0)) return `Regarde la majuscule du mot « ${ma} ».`;
      return `Regarde bien les accents du mot « ${ma} ».`;
    }
    const sansAccentA = ma.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const sansAccentS = ms.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (sansAccentA.toLowerCase() === sansAccentS.toLowerCase()) {
      return `Il manque un accent dans le mot « ${ma} ».`;
    }
    if (ms.length < ma.length) return `Il manque une lettre dans le mot « ${ma} ».`;
    return `Regarde encore le mot « ${ma} ».`;
  }
  if (!/[.!?]$/.test(s) && /[.!?]$/.test(a)) return "N'oublie pas le point à la fin.";
  return `Compare bien avec le modèle : « ${a} ».`;
}

// ==========================================================================
// BANQUE (miroir de public.ecriture_item). 2 competences x 4 niveaux.
// ==========================================================================
export const BANQUE_ECRITURE: EcrItem[] = [
  // --- FR.ECR.COPIE : recopier (N1 un mot -> N4 passage differe) ---
  { cle: "ecr-copie-n1-a", competence: "FR.ECR.COPIE", niveau: 1, format: "copie",
    consigne: "Recopie ce mot, bien comme le modèle.", attendu: "chat", modele: "chat",
    explication: "Super ! Recopier un mot, c'est regarder chaque lettre. Le mot était chat." },
  { cle: "ecr-copie-n1-b", competence: "FR.ECR.COPIE", niveau: 1, format: "copie",
    consigne: "Recopie ce mot, bien comme le modèle.", attendu: "jardin", modele: "jardin",
    explication: "Bravo ! Le mot était jardin. Tu as regardé chaque lettre dans l'ordre." },
  { cle: "ecr-copie-n1-c", competence: "FR.ECR.COPIE", niveau: 1, format: "copie",
    consigne: "Recopie ce mot. Attention au petit accent.", attendu: "école", modele: "école",
    explication: "Très bien ! Le mot école prend un accent sur le premier e : é." },
  { cle: "ecr-copie-n2-a", competence: "FR.ECR.COPIE", niveau: 2, format: "copie",
    consigne: "Recopie ce groupe de mots.", attendu: "le petit chat", modele: "le petit chat",
    explication: "Bravo ! Tu as recopié les trois mots : le petit chat." },
  { cle: "ecr-copie-n2-b", competence: "FR.ECR.COPIE", niveau: 2, format: "copie",
    consigne: "Recopie ce groupe de mots.", attendu: "une belle fleur", modele: "une belle fleur",
    explication: "Super ! Une belle fleur, chaque mot bien écrit." },
  { cle: "ecr-copie-n2-c", competence: "FR.ECR.COPIE", niveau: 2, format: "copie",
    consigne: "Recopie ce groupe de mots. Pense à l'accent.", attendu: "mon école", modele: "mon école",
    explication: "Bien joué ! Mon école, avec l'accent sur le é." },
  { cle: "ecr-copie-n3-a", competence: "FR.ECR.COPIE", niveau: 3, format: "copie",
    consigne: "Recopie cette phrase. N'oublie pas la majuscule et le point.", attendu: "Le chat dort dans le jardin.", modele: "Le chat dort dans le jardin.",
    explication: "Bravo ! Une phrase commence par une majuscule et finit par un point." },
  { cle: "ecr-copie-n3-b", competence: "FR.ECR.COPIE", niveau: 3, format: "copie",
    consigne: "Recopie cette phrase. N'oublie pas la majuscule et le point.", attendu: "Nina lit un beau livre.", modele: "Nina lit un beau livre.",
    explication: "Super ! Majuscule au début, point à la fin : Nina lit un beau livre." },
  { cle: "ecr-copie-n3-c", competence: "FR.ECR.COPIE", niveau: 3, format: "copie",
    consigne: "Recopie cette phrase. N'oublie pas la majuscule et le point.", attendu: "Les oiseaux chantent le matin.", modele: "Les oiseaux chantent le matin.",
    explication: "Bravo ! Les oiseaux chantent le matin. Tu as bien recopié." },
  { cle: "ecr-copie-n4-a", competence: "FR.ECR.COPIE", niveau: 4, format: "copie", differe: true,
    consigne: "Regarde bien le passage, puis cache-le et recopie-le de mémoire.", attendu: "Le petit chat joue. Il court dans le jardin. Puis il dort au soleil.", modele: "Le petit chat joue. Il court dans le jardin. Puis il dort au soleil.",
    explication: "Bravo ! Trois phrases, chacune avec une majuscule et un point. Regarder puis écrire, c'est un vrai entraînement de champion." },
  { cle: "ecr-copie-n4-b", competence: "FR.ECR.COPIE", niveau: 4, format: "copie", differe: true,
    consigne: "Regarde bien le passage, puis cache-le et recopie-le de mémoire.", attendu: "Léa ouvre son livre. Elle lit une belle histoire. Le soir, elle rêve.", modele: "Léa ouvre son livre. Elle lit une belle histoire. Le soir, elle rêve.",
    explication: "Super ! Tu as gardé les trois phrases dans ta tête. Léa lit une belle histoire." },

  // --- FR.ECR.GUIDEE : ecriture guidee (N1 ordre -> N4 libre) ---
  { cle: "ecr-guide-n1-a", competence: "FR.ECR.GUIDEE", niveau: 1, format: "ordre",
    consigne: "Remets les étiquettes dans l'ordre pour faire une phrase.",
    etiquettes: ["dort.", "Le", "chat"], attendu: "Le chat dort.",
    explication: "Bravo ! La phrase est : Le chat dort. Elle commence par une majuscule et finit par un point." },
  { cle: "ecr-guide-n1-b", competence: "FR.ECR.GUIDEE", niveau: 1, format: "ordre",
    consigne: "Remets les étiquettes dans l'ordre pour faire une phrase.",
    etiquettes: ["fleurs.", "aime", "Nina", "les"], attendu: "Nina aime les fleurs.",
    explication: "Super ! Nina aime les fleurs. Le nom Nina commence la phrase." },
  { cle: "ecr-guide-n1-c", competence: "FR.ECR.GUIDEE", niveau: 1, format: "ordre",
    consigne: "Remets les étiquettes dans l'ordre pour faire une phrase.",
    etiquettes: ["brille.", "soleil", "Le"], attendu: "Le soleil brille.",
    explication: "Bien joué ! Le soleil brille. Trois étiquettes bien rangées." },
  { cle: "ecr-guide-n2-a", competence: "FR.ECR.GUIDEE", niveau: 2, format: "qcm",
    consigne: "Choisis le mot qui va bien dans la phrase.", phrase: "Le chat boit du …",
    options: ["lait", "vélo", "nuage"], attendu: "lait",
    explication: "Bravo ! Le chat boit du lait. C'est le mot qui a du sens dans la phrase." },
  { cle: "ecr-guide-n2-b", competence: "FR.ECR.GUIDEE", niveau: 2, format: "qcm",
    consigne: "Choisis le mot qui va bien dans la phrase.", phrase: "Nina plante une … dans le jardin.",
    options: ["fleur", "voiture", "chaise"], attendu: "fleur",
    explication: "Super ! Nina plante une fleur dans le jardin. C'est logique." },
  { cle: "ecr-guide-n2-c", competence: "FR.ECR.GUIDEE", niveau: 2, format: "qcm",
    consigne: "Choisis le mot qui va bien dans la phrase.", phrase: "L'oiseau … dans le ciel.",
    options: ["vole", "mange", "dort"], attendu: "vole",
    explication: "Bravo ! L'oiseau vole dans le ciel. Le mot vole va très bien ici." },
  { cle: "ecr-guide-n3-a", competence: "FR.ECR.GUIDEE", niveau: 3, format: "transform",
    consigne: "Récris ce groupe de mots au pluriel (plusieurs).", phrase: "le chat noir",
    attendu: "les chats noirs",
    explication: "Bravo ! Au pluriel : les chats noirs. On ajoute un s à chaque mot." },
  { cle: "ecr-guide-n3-b", competence: "FR.ECR.GUIDEE", niveau: 3, format: "transform",
    consigne: "Récris ce groupe de mots au pluriel (plusieurs).", phrase: "une petite fleur",
    attendu: "des petites fleurs",
    explication: "Super ! Une petite fleur devient des petites fleurs au pluriel." },
  { cle: "ecr-guide-n3-c", competence: "FR.ECR.GUIDEE", niveau: 3, format: "transform",
    consigne: "Récris cette phrase au passé composé (c'est déjà fait).", phrase: "Je mange une pomme.",
    attendu: "J'ai mangé une pomme.",
    explication: "Bravo ! Au passé composé : J'ai mangé une pomme. On utilise ai et le verbe en é." },
  { cle: "ecr-guide-n3-d", competence: "FR.ECR.GUIDEE", niveau: 3, format: "transform",
    consigne: "Récris cette phrase au passé composé (c'est déjà fait).", phrase: "Tu chantes une chanson.",
    attendu: "Tu as chanté une chanson.",
    explication: "Super ! Au passé composé : Tu as chanté une chanson. On utilise as et chanté." },
  { cle: "ecr-guide-n4-a", competence: "FR.ECR.GUIDEE", niveau: 4, format: "libre",
    consigne: "Écris une belle phrase avec les mots chat et jardin.",
    attendu: "", image: "chat", check: { minMots: 4, motsCles: ["chat", "jardin"] },
    exemple: "Le chat joue dans le jardin.",
    explication: "Bravo ! Une phrase avec une majuscule, un point, et les mots chat et jardin. Par exemple : Le chat joue dans le jardin." },
  { cle: "ecr-guide-n4-b", competence: "FR.ECR.GUIDEE", niveau: 4, format: "libre",
    consigne: "Continue l'histoire en une belle phrase.", amorce: "Ce matin, le petit chien…",
    attendu: "", check: { minMots: 5, motsCles: [] },
    exemple: "Ce matin, le petit chien court vers son ami.",
    explication: "Super ! Ta phrase commence par une majuscule et finit par un point. Par exemple : Ce matin, le petit chien court vers son ami." },
  { cle: "ecr-guide-n4-c", competence: "FR.ECR.GUIDEE", niveau: 4, format: "libre",
    consigne: "Écris une belle phrase avec les mots fleur et soleil.",
    attendu: "", image: "soleil", check: { minMots: 4, motsCles: ["fleur", "soleil"] },
    exemple: "La fleur aime le soleil.",
    explication: "Bravo ! Une phrase avec une majuscule, un point, et les mots fleur et soleil. Par exemple : La fleur aime le soleil." },

  // =======================================================================
  // CM1 (lot 5). FR.ECR.COPIE_CM1 : copier des phrases plus longues avec des
  // connecteurs (puis, ensuite, car, mais, enfin). FR.ECR.GUIDEE_CM1 :
  // transformer au passé simple (N1-N3) puis phrase libre avec check-list CM1.
  // =======================================================================
  // --- FR.ECR.COPIE_CM1 : phrases plus longues avec connecteurs ---
  { cle: "ecr-copiecm1-n1", competence: "FR.ECR.COPIE_CM1", niveau: 1, format: "copie",
    consigne: "Recopie cette phrase sans erreur. Regarde bien le petit mot puis.",
    attendu: "Le matin, je me lève, puis je déjeune.",
    modele: "Le matin, je me lève, puis je déjeune.",
    explication: "Bravo ! Le mot puis relie les deux actions, l'une après l'autre." },
  { cle: "ecr-copiecm1-n2", competence: "FR.ECR.COPIE_CM1", niveau: 2, format: "copie",
    consigne: "Recopie cette phrase sans erreur. Fais attention au mot ensuite.",
    attendu: "Je fais mes devoirs, ensuite je joue dans le jardin.",
    modele: "Je fais mes devoirs, ensuite je joue dans le jardin.",
    explication: "Super ! Le mot ensuite dit ce qu'on fait après. On garde bien la virgule." },
  { cle: "ecr-copiecm1-n3", competence: "FR.ECR.COPIE_CM1", niveau: 3, format: "copie",
    consigne: "Recopie cette phrase plus longue sans erreur. Il y a deux connecteurs.",
    attendu: "Je range ma chambre, car maman arrive, mais je garde mon livre préféré.",
    modele: "Je range ma chambre, car maman arrive, mais je garde mon livre préféré.",
    explication: "Bravo ! Le mot car explique pourquoi, et le mot mais montre le contraire." },
  { cle: "ecr-copiecm1-n4", competence: "FR.ECR.COPIE_CM1", niveau: 4, format: "copie", differe: true,
    consigne: "Regarde bien le texte, puis cache-le et recopie-le de mémoire.",
    attendu: "D'abord, nous préparons le goûter. Ensuite, nous jouons ensemble. Enfin, nous rangeons tout.",
    modele: "D'abord, nous préparons le goûter. Ensuite, nous jouons ensemble. Enfin, nous rangeons tout.",
    explication: "Super ! Les mots d'abord, ensuite et enfin rangent les actions dans l'ordre." },

  // --- FR.ECR.GUIDEE_CM1 : transformation au passé simple + phrase libre ---
  { cle: "ecr-guidecm1-n1", competence: "FR.ECR.GUIDEE_CM1", niveau: 1, format: "transform",
    consigne: "Récris cette phrase au passé simple, comme dans une histoire.", phrase: "Il mange une pomme.",
    attendu: "Il mangea une pomme.",
    explication: "Bravo ! Au passé simple : Il mangea une pomme. Dans les histoires, on dit il mangea." },
  { cle: "ecr-guidecm1-n2", competence: "FR.ECR.GUIDEE_CM1", niveau: 2, format: "transform",
    consigne: "Récris cette phrase au passé simple, comme dans une histoire.", phrase: "Elle regarde les étoiles.",
    attendu: "Elle regarda les étoiles.",
    explication: "Super ! Au passé simple : Elle regarda les étoiles. Le verbe en -er fait a à la fin." },
  { cle: "ecr-guidecm1-n3", competence: "FR.ECR.GUIDEE_CM1", niveau: 3, format: "transform",
    consigne: "Récris cette phrase au passé simple. Attention, il y a plusieurs personnes.", phrase: "Les enfants chantent une chanson.",
    attendu: "Les enfants chantèrent une chanson.",
    explication: "Bravo ! Au passé simple, avec ils : Les enfants chantèrent une chanson." },
  { cle: "ecr-guidecm1-n4", competence: "FR.ECR.GUIDEE_CM1", niveau: 4, format: "libre",
    consigne: "Écris une phrase pour raconter un moment à la maison. Utilise le mot puis. Pense à la majuscule et au point.",
    attendu: "", amorce: "À la maison,", check: { minMots: 8, motsCles: ["puis"] },
    exemple: "Le matin, je mange mon pain, puis je vais à l'école.",
    explication: "Bravo ! Ta phrase commence par une majuscule, finit par un point, et le mot puis relie deux actions. Par exemple : Le matin, je mange mon pain, puis je vais à l'école." },
];

export const COMPETENCES_ECRITURE = ["FR.ECR.COPIE", "FR.ECR.GUIDEE", "FR.ECR.COPIE_CM1", "FR.ECR.GUIDEE_CM1"] as const;

export function itemsEcrDe(competence: string, niveau: number): EcrItem[] {
  return BANQUE_ECRITURE.filter((i) => i.competence === competence && i.niveau === niveau);
}
export function itemEcrParCle(cle: string): EcrItem | undefined {
  return BANQUE_ECRITURE.find((i) => i.cle === cle);
}

// ==========================================================================
// GENERATEUR : choisit un ITEM pour la competence et le niveau (graine). Le
// composant <Ecriture> l'affiche ; le serveur (verif_ecriture, op 'ecr') juge
// via la cle. Repli robuste si aucun item.
// ==========================================================================
export function buildEcriture(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const items = itemsEcrDe(src.competence, src.niveau);
  const item = items.length > 0 ? pick(rng, items) : null;
  if (!item) {
    return {
      ...base, forme: "ecriture", support: "aucun", saisie: "ecriture",
      prompt: "Copier et écrire", answer: 0, reste: null, fields: 1,
      verif: { op: "ecr", a: 0, b: 0, cle: "" }, correction: "",
    };
  }
  return {
    ...base, forme: "ecriture", support: "aucun", saisie: "ecriture",
    prompt: item.consigne, answer: 0, reste: null, fields: 1,
    ecr: {
      cle: item.cle, format: item.format, consigne: item.consigne, attendu: item.attendu,
      modele: item.modele, differe: item.differe, etiquettes: item.etiquettes,
      phrase: item.phrase, options: item.options, check: item.check, amorce: item.amorce,
      image: item.image, exemple: item.exemple, explication: item.explication,
    },
    verif: { op: "ecr", a: 0, b: 0, cle: item.cle },
    correction: item.explication,
  };
}
