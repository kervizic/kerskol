// Generateur d'exercices de CONJUGAISON (francais, CE2).
//
// NOUVEAU FORMAT « phrase a completer » (valide par Manu), pour que ce soit
// comprehensible par un enfant de 8 ans :
//   - un TITRE-CONSIGNE (« Conjugue le verbe ÊTRE … », verbe a l'infinitif EN
//     MAJUSCULES) ;
//   - une indication du temps selon le NIVEAU ;
//   - la phrase avec une CASE visible a la place des « … » (le sujet en couleur) ;
//   - des propositions en gros boutons empiles (N1..N3) ou une saisie libre (N4) ;
//   - apres la reponse, la phrase COMPLETE avec la bonne forme dans la case.
//
// Progression (decision pedagogique OBLIGATOIRE) :
//   N1 : propositions ; « … au <temps> » + repere en mots d'enfant sous le titre
//        (present = aujourd'hui / en ce moment ; futur = demain ; imparfait =
//        avant / autrefois ; passe compose = hier / c'est deja fait).
//   N2 : propositions ; « … au <temps> » seul, sans repere.
//   N3 : propositions ; AUCUN temps indique ; la phrase contient TOUJOURS un mot
//        repere (« Hier, … », « Demain, … », « En ce moment, … », « Autrefois, … »)
//        et les propositions MELANGENT des formes de temps DIFFERENTS du meme
//        verbe et de la meme personne (ex. est / sera / était / a été) pour que le
//        repere serve vraiment.
//   N4 : comme N3 mais reponse LIBRE saisie dans la case (pas de propositions).
//
// Le serveur reste seul juge (op 'conj') ; le diagnostic client
// (domain/diagnostic/conjugaison) sert au feedback et au type de faute. La
// verification SERVEUR est INCHANGEE.

import type { Rng } from "../calcul/rng";
import { pick, shuffle } from "../calcul/rng";
import type { Base, GeneratedExercise, ExCalcul } from "../calcul/generator";
import {
  CONJ, TEMPS, TEMPS_CODE, forme, commenceParVoyelle, infinitifAffiche,
  VERBES_ETRE_AVOIR, VERBES_1ER, VERBES_1ER_HAUT, VERBES_IRREGULIERS,
  type Temps, type Personne,
} from "./conjugaison";
import {
  AUXILIAIRE, PC_CODE, VERBES_PC, formePC, participeAccorde,
  type Genre,
} from "./passe-compose";
import { normaliser } from "../diagnostic/lettres";
import { itemsDe } from "./grammaire";
import { itemsLexiqueDe } from "./lexique";

// Temps « etendu » : les 3 temps simples + le passe compose.
type Temps4 = Temps | "pc";

// Temps porte par la competence (temps simples).
function tempsDe(competence: string): Temps {
  if (competence.endsWith("FUTUR")) return "futur";
  if (competence.endsWith("IMPARFAIT")) return "imparfait";
  return "present";
}

// Nom du temps (titre-consigne) et repere en mots d'enfant / mot repere de phrase.
const TEMPS_NOM: Record<Temps4, string> = {
  present: "présent",
  futur: "futur",
  imparfait: "imparfait",
  pc: "passé composé",
};
// Repere en mots d'enfant, affiche sous le titre au N1.
const REPERE_ENFANT: Record<Temps4, string> = {
  present: "présent : aujourd'hui, en ce moment",
  futur: "futur : demain",
  imparfait: "imparfait : avant, autrefois",
  pc: "passé composé : hier, c'est déjà fait",
};
// Mot repere place EN DEBUT de phrase au N3/N4 (la phrase le contient toujours).
const REPERE_PHRASE: Record<Temps4, string> = {
  present: "En ce moment",
  futur: "Demain",
  imparfait: "Autrefois",
  pc: "Hier",
};

// Complement (« suite ») de chaque verbe : une VRAIE phrase courte et naturelle,
// vocabulaire CE2, cohérente avec le mot repere. Chaque complement est INVARIABLE
// (ni genre, ni nombre, ni temps) pour rester juste a toutes les personnes et a
// tous les temps : lieu (« à l'école »), tournure figée (« faim »), COD placé
// APRES le verbe (pas d'accord avec avoir), infinitif ou adverbe. Ainsi
// « Il est à la maison. », « Vous chanterez une chanson. », « Hier, la fille est
// allée à l'école. » sont toutes correctes sans recalcul d'accord.
const COMPLEMENT: Record<string, string> = {
  etre: "à la maison",
  avoir: "faim",
  chanter: "une chanson",
  jouer: "au ballon",
  aimer: "les animaux",
  regarder: "les étoiles",
  donner: "un cadeau",
  trouver: "un trésor",
  parler: "doucement",
  manger: "une pomme",
  placer: "les pions",
  finir: "le jeu",
  aller: "à l'école",
  dire: "la vérité",
  faire: "un gâteau",
  pouvoir: "courir vite",
  prendre: "le train",
  venir: "avec nous",
  voir: "la mer",
  vouloir: "un bonbon",
};
function complementDe(verbe: string): string {
  const c = COMPLEMENT[verbe];
  if (!c) throw new Error(`complement manquant pour le verbe: ${verbe}`);
  return c;
}

// --- Helpers de phrase ------------------------------------------------------
function capFirst(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

// Infinitif en MAJUSCULES pour le titre (« être » -> « ÊTRE »).
function infMaj(verbe: string): string {
  return infinitifAffiche(verbe).toUpperCase();
}

// Titre-consigne selon le niveau : le temps n'est nomme qu'aux N1/N2.
function consigneDe(verbe: string, temps: Temps4, niveau: number): string {
  const base = `Conjugue le verbe ${infMaj(verbe)}`;
  return niveau <= 2 ? `${base} au ${TEMPS_NOM[temps]}` : base;
}

// Assemble la phrase (prefixe repere + sujet + case + apres) et la phrase
// complete (avec la bonne forme), en gerant l'elision « j' » et la majuscule.
// `sujetBrut` est en minuscule (pronom / nom commun) ou avec sa majuscule propre
// (prenom) ; la majuscule de debut de phrase est posee ici.
function construirePhrase(args: {
  verbe: string;
  temps: Temps4;
  personne: Personne;
  niveau: number;
  sujetBrut: string;
  bonneForme: string;
}): NonNullable<GeneratedExercise["conjPhrase"]> {
  const { verbe, temps, personne, niveau, sujetBrut, bonneForme } = args;
  // Elision « j' » : seulement personne 1, quand la forme commence par une voyelle.
  const colle = personne === 1 && commenceParVoyelle(bonneForme);
  const sujetRaw = colle ? "j'" : sujetBrut;
  const sep = colle ? "" : " ";
  // Mot repere en debut de phrase a partir du N3 (la phrase le contient toujours).
  const prefixe = niveau >= 3 ? `${REPERE_PHRASE[temps]}, ` : "";
  // Complement : une VRAIE suite, pour ne jamais produire « Il est. ».
  const suite = complementDe(verbe);
  const apres = ".";
  // Majuscule : sur le prefixe s'il existe (deja capitalise), sinon sur le sujet.
  const sujet = prefixe ? sujetRaw : capFirst(sujetRaw);
  const corps = `${sujetRaw}${sep}${bonneForme} ${suite}`;
  const complete = prefixe
    ? `${prefixe}${corps}${apres}`
    : `${capFirst(corps)}${apres}`;
  return {
    consigne: consigneDe(verbe, temps, niveau),
    repere: niveau === 1 ? REPERE_ENFANT[temps] : null,
    prefixe,
    sujet,
    colle,
    suite,
    apres,
    bonneForme,
    complete,
    voixCle: `conj:${verbe}:${temps}:${personne}`,
  };
}

// Verbes disponibles selon le niveau (temps simples).
function verbesDe(niveau: number): string[] {
  if (niveau <= 2) return [...VERBES_ETRE_AVOIR, ...VERBES_1ER];
  if (niveau === 3) return [...VERBES_ETRE_AVOIR, ...VERBES_1ER_HAUT];
  return [...VERBES_ETRE_AVOIR, ...VERBES_1ER_HAUT, ...VERBES_IRREGULIERS];
}
function personnesDe(niveau: number): Personne[] {
  return niveau === 1 ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];
}

// Sujets nominaux (N4) pour les 3e personnes (minuscule : la majuscule de debut
// de phrase est posee par construirePhrase ; les prenoms gardent leur majuscule).
const SUJETS_P3 = ["la fille", "le garçon", "le chat", "la maîtresse"];
const SUJETS_P6 = ["les enfants", "les oiseaux", "mes amis"];

// Pronom sujet affiche (temps simples). La personne 1 est « je » (l'elision « j' »
// est posee par construirePhrase selon la forme).
function pronomSujet(personne: Personne): string {
  return (["je", "tu", "il", "nous", "vous", "ils"] as const)[personne - 1];
}

// Les 4 formes (present / futur / imparfait / passe compose) d'un verbe pour une
// personne donnee ; le passe compose prend le genre fourni.
function formesQuatreTemps(
  verbe: string, personne: Personne, genrePC: Genre
): Record<Temps4, string> {
  const c = CONJ[verbe];
  return {
    present: c.present[personne - 1],
    futur: c.futur[personne - 1],
    imparfait: c.imparfait[personne - 1],
    pc: formePC(verbe, personne, genrePC),
  };
}

const TEMPS4_ORDRE: Temps4[] = ["present", "futur", "imparfait", "pc"];

// Propositions N3 : MELANGE des 4 temps (meme verbe, meme personne). La bonne
// forme (temps de l'exercice) est incluse ; distracteurs = les autres temps.
function propositionsMelange(
  verbe: string, personne: Personne, temps: Temps4, genrePC: Genre, rng: Rng
): string[] {
  const toutes = formesQuatreTemps(verbe, personne, genrePC);
  const attendu = toutes[temps];
  const vus = new Set([normaliser(attendu)]);
  const distracteurs: string[] = [];
  for (const t of TEMPS4_ORDRE) {
    if (t === temps) continue;
    const f = toutes[t];
    const k = normaliser(f);
    if (k && !vus.has(k)) { vus.add(k); distracteurs.push(f); }
  }
  return shuffle(rng, [attendu, ...distracteurs]);
}

// Propositions TEXTE pour un QCM N1/N2 : la bonne forme + distracteurs distincts.
function propositions(
  verbe: string, temps: Temps, personne: Personne, niveau: number, rng: Rng
): string[] {
  const attendu = forme(verbe, temps, personne);
  const vus = new Set([normaliser(attendu)]);
  const distracteurs: string[] = [];
  const ajoute = (f: string) => {
    const k = normaliser(f);
    if (!vus.has(k)) { vus.add(k); distracteurs.push(f); }
  };
  // Autres personnes du meme temps (mauvaise personne).
  for (const p of shuffle(rng, [1, 2, 3, 4, 5, 6] as Personne[])) {
    if (p !== personne) ajoute(CONJ[verbe][temps][p - 1]);
  }
  // N2 : glisse aussi une forme d'un AUTRE temps (mauvais temps).
  if (niveau >= 2) {
    const autres = TEMPS.filter((t) => t !== temps);
    const t = pick(rng, autres);
    ajoute(CONJ[verbe][t][personne - 1]);
  }
  const choisis = distracteurs.slice(0, niveau >= 2 ? 3 : 2);
  return shuffle(rng, [attendu, ...choisis]);
}

// Dictee detective : le generateur n'emet qu'un MARQUEUR (competence + niveau).
// Le TEXTE est choisi a l'affichage par le composant <DicteeDetective> dans la
// banque chargee du serveur (dictee_charger_tous) : le generateur reste pur et
// n'a pas besoin de la banque, et le client ne tient aucune erreur plantee.
// =========================================================================
// LES MOTS DE LA MAITRESSE (phase 6). Marqueur : le composant <MaitresseExo>
// choisit la liste et le type d'exercice (QCM orthographe, memoriser/ecrire,
// mot a trou, dictee detective) dans la banque du foyer chargee par la seance.
// L'op de verification serveur (mmots / mtrou / mdictee) est posee par le
// composant a la soumission (selon l'exercice choisi).
// =========================================================================
export function buildMaitresse(src: ExCalcul, base: Base): GeneratedExercise {
  const kind = src.competence.endsWith("DICTEE") ? "dictee" : "mots";
  return {
    ...base,
    forme: "maitresse",
    support: "aucun",
    saisie: "maitresse",
    prompt: kind === "dictee" ? "La dictée de la maîtresse" : "Les mots à apprendre",
    answer: 0,
    reste: null,
    fields: 1,
    maitresse: { niveau: src.niveau, kind },
    // Op par defaut (invariant) ; l'op reelle est choisie par le composant selon
    // l'exercice (mmots / mtrou / mdictee).
    verif: { op: kind === "dictee" ? "mdictee" : "mmots", a: 0, b: 0 },
    correction: "",
  };
}

export function buildFrancaisDictee(src: ExCalcul, base: Base): GeneratedExercise {
  return {
    ...base,
    forme: "dictee",
    support: "aucun",
    saisie: "dictee",
    prompt: "Enquête d'orthographe : trouve les mots piégés !",
    answer: 0,
    reste: null,
    fields: 1,
    dictee: { niveau: src.niveau },
    verif: { op: "dictee", a: 0, b: 0 },
    correction: "",
  };
}

// =========================================================================
// GRAMMAIRE : le generateur choisit un ITEM de la banque (grammaire.ts) pour la
// competence et le niveau, de facon reproductible (graine). Le composant
// <Grammaire> rend l'item (QCM / clic / texte) ; le serveur (verif_grammaire)
// est seul juge via la cle de l'item. Repli robuste si aucun item (ne devrait
// pas arriver, le referentiel ne cree l'exercice que si des items existent).
// Construit un exercice a partir d'un item (grammaire OU lexique) : meme rendu
// (QCM / clic / texte via le composant <Grammaire>, champ `gram`), seul l'op de
// verification serveur change ('gram' pour la grammaire, 'lex' pour le lexique).
// Factorise pour ne pas dupliquer la logique entre grammaire et lexique.
function buildFromItem(
  items: GramLike[], op: "gram" | "lex", repli: string, rng: Rng, base: Base
): GeneratedExercise {
  const item = items.length > 0 ? pick(rng, items) : null;
  if (!item) {
    return {
      ...base,
      forme: "grammaire",
      support: "aucun",
      saisie: "grammaire",
      prompt: repli,
      answer: 0,
      reste: null,
      fields: 1,
      verif: { op, a: 0, b: 0, cle: "" },
      correction: "",
    };
  }
  return {
    ...base,
    forme: "grammaire",
    support: "aucun",
    saisie: "grammaire",
    prompt: item.consigne,
    answer: 0,
    reste: null,
    fields: 1,
    gram: {
      cle: item.cle,
      format: item.format,
      consigne: item.consigne,
      phrase: item.phrase,
      options: item.options,
      attendu: item.attendu,
      explication: item.explication,
    },
    verif: { op, a: 0, b: 0, cle: item.cle },
    correction: item.explication,
  };
}

// Forme minimale partagee par un item de grammaire et de lexique.
type GramLike = {
  cle: string; format: "qcm" | "clic" | "texte"; consigne: string; phrase: string;
  options?: string[]; attendu: string; explication: string;
};

export function buildFrancaisGrammaire(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  return buildFromItem(itemsDe(src.competence, src.niveau), "gram", "Grammaire", rng, base);
}

// =========================================================================
// VOCABULAIRE et MOTS A SAVOIR (phase 2) : meme principe que la grammaire, mais
// op de verification 'lex' (table public.lexique_item, competences FR.VOC.* et
// FR.MOTS.*). Le composant <Grammaire> est reutilise tel quel.
// =========================================================================
export function buildFrancaisLexique(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  return buildFromItem(itemsLexiqueDe(src.competence, src.niveau), "lex", "Vocabulaire", rng, base);
}

// =========================================================================
// PASSE COMPOSE (temps compose : auxiliaire + participe, accord avec etre).
// Meme nouveau format « phrase a completer » ; les propositions N3 melangent les
// 4 temps (ex. va / ira / allait / est allée). ACCORD : seuls aller/venir
// (auxiliaire etre) s'accordent ; le genre est IMPOSE (p_c) aux 3e personnes et
// LIBRE (m ET f acceptes) pour je/tu/nous/vous.
function verbesDePC(niveau: number): string[] {
  if (niveau === 1) return ["chanter", "jouer", "aimer", "regarder", "donner", "aller"];
  if (niveau === 2)
    return ["chanter", "jouer", "aimer", "regarder", "donner", "trouver", "parler", "aller", "venir", "etre", "avoir"];
  if (niveau === 3)
    return ["chanter", "jouer", "aimer", "regarder", "donner", "trouver", "parler", "manger", "placer", "aller", "venir", "etre", "avoir", "faire", "dire"];
  return [...VERBES_PC];
}

// Prenoms / noms communs (minuscule pour les noms communs ; prenoms capitalises).
const SUJETS_PC_P3_M = ["le garçon", "le chat", "Paul", "mon ami"];
const SUJETS_PC_P3_F = ["la fille", "la maîtresse", "Marie", "mon amie"];
const SUJETS_PC_P6_M = ["les garçons", "les amis", "les oiseaux"];
const SUJETS_PC_P6_F = ["les filles", "les amies", "les fées"];

function pronomSujetPC(personne: Personne, genre: Genre): string {
  switch (personne) {
    case 1: return "je";
    case 2: return "tu";
    case 3: return genre === "f" ? "elle" : "il";
    case 4: return "nous";
    case 5: return "vous";
    case 6: return genre === "f" ? "elles" : "ils";
  }
}

// Propositions TEXTE pour un QCM N1/N2 de passe compose : bonne forme +
// distracteurs (mauvais auxiliaire, mauvais temps, mauvais accord).
function propositionsPC(
  verbe: string, personne: Personne, genreAff: Genre, estLibre: boolean, rng: Rng
): string[] {
  const attendu = formePC(verbe, personne, genreAff);
  const vus = new Set([normaliser(attendu)]);
  const distracteurs: string[] = [];
  const ajoute = (f: string) => {
    const k = normaliser(f);
    if (k && !vus.has(k)) { vus.add(k); distracteurs.push(f); }
  };
  const autreAux = AUXILIAIRE[verbe] === "avoir" ? "etre" : "avoir";
  // Mauvais auxiliaire (meme participe).
  ajoute(`${CONJ[autreAux].present[personne - 1]} ${participeAccorde(verbe, personne, genreAff)}`);
  // Mauvais temps : une forme simple du verbe (present / imparfait) si connue.
  if (CONJ[verbe]) {
    const t = pick(rng, TEMPS);
    ajoute(CONJ[verbe][t][personne - 1]);
  }
  // Mauvais accord (seulement si le genre est impose, sinon les deux sont justes).
  if (!estLibre && AUXILIAIRE[verbe] === "etre") {
    ajoute(formePC(verbe, personne, genreAff === "f" ? "m" : "f"));
  }
  const choisis = shuffle(rng, distracteurs).slice(0, 2);
  return shuffle(rng, [attendu, ...choisis]);
}

export function buildFrancaisPasseCompose(
  src: ExCalcul, rng: Rng, base: Base
): GeneratedExercise {
  const niveau = src.niveau;
  const verbe = pick(rng, verbesDePC(niveau));
  const personne = pick(rng, niveau === 1 ? ([1, 2, 3] as Personne[]) : ([1, 2, 3, 4, 5, 6] as Personne[]));

  // Genre : impose (3e personnes des verbes avec etre), sinon libre.
  let genre: Genre | null;
  if (AUXILIAIRE[verbe] === "avoir") genre = null;
  else if (personne === 3 || personne === 6) genre = pick(rng, ["m", "f"] as Genre[]);
  else genre = null;
  const genreAff: Genre = genre ?? "m";

  // Sujet affiche : nominal genre au N4 pour il/ils, sinon pronom.
  let sujetBrut: string;
  if (niveau === 4 && personne === 3) sujetBrut = pick(rng, genreAff === "f" ? SUJETS_PC_P3_F : SUJETS_PC_P3_M);
  else if (niveau === 4 && personne === 6) sujetBrut = pick(rng, genreAff === "f" ? SUJETS_PC_P6_F : SUJETS_PC_P6_M);
  else sujetBrut = pronomSujetPC(personne, genreAff);

  const attendu = formePC(verbe, personne, genreAff);
  const qcm = niveau <= 3;
  // p_c : 0 = masculin impose, 1 = feminin impose, undefined = genre libre.
  const cGenre = genre === "m" ? 0 : genre === "f" ? 1 : undefined;

  const optionsTexte = qcm
    ? niveau === 3
      ? propositionsMelange(verbe, personne, "pc", genreAff, rng)
      : propositionsPC(verbe, personne, genreAff, genre == null, rng)
    : undefined;

  const conjPhrase = construirePhrase({
    verbe, temps: "pc", personne, niveau, sujetBrut, bonneForme: attendu,
  });

  return {
    ...base,
    forme: "conjugaison",
    support: "aucun",
    saisie: qcm ? "qcm_texte" : "lettres",
    prompt: conjPhrase.consigne,
    answer: 0,
    reste: null,
    fields: 1,
    optionsTexte,
    conjPC: { verbe, personne, genre },
    conjPhrase,
    verif: { op: "conj", a: PC_CODE, b: personne, cle: verbe, c: cGenre },
    correction: `On écrit « ${conjPhrase.complete} ».`,
  };
}

export function buildFrancaisConjugaison(
  src: ExCalcul, rng: Rng, base: Base
): GeneratedExercise {
  const niveau = src.niveau;
  const temps = tempsDe(src.competence);
  const verbe = pick(rng, verbesDe(niveau));
  const personne = pick(rng, personnesDe(niveau));
  const attendu = forme(verbe, temps, personne);

  // Sujet affiche : pronom, ou sujet nominal au niveau 4 pour il/ils.
  let sujetBrut: string;
  if (niveau === 4 && personne === 3) sujetBrut = pick(rng, SUJETS_P3);
  else if (niveau === 4 && personne === 6) sujetBrut = pick(rng, SUJETS_P6);
  else sujetBrut = pronomSujet(personne);

  const qcm = niveau <= 3;
  const optionsTexte = qcm
    ? niveau === 3
      ? propositionsMelange(verbe, personne, temps, "m", rng)
      : propositions(verbe, temps, personne, niveau, rng)
    : undefined;

  const conjPhrase = construirePhrase({
    verbe, temps, personne, niveau, sujetBrut, bonneForme: attendu,
  });

  return {
    ...base,
    forme: "conjugaison",
    support: "aucun",
    saisie: qcm ? "qcm_texte" : "lettres",
    prompt: conjPhrase.consigne,
    answer: 0,
    reste: null,
    fields: 1,
    optionsTexte,
    conj: { verbe, temps, personne },
    conjPhrase,
    verif: { op: "conj", a: TEMPS_CODE[temps], b: personne, cle: verbe },
    correction: `On écrit « ${conjPhrase.complete} ».`,
  };
}
