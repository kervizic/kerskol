// Generateur d'exercices de CONJUGAISON (francais, CE2).
//
// Progression (decision pedagogique OBLIGATOIRE) :
//   N1 : QCM (choisir la bonne forme parmi 3) ; etre/avoir + 1er groupe
//        regulier ; personnes je/tu/il.
//   N2 : QCM avec distracteurs plus fins (mauvaise personne ET mauvais temps) ;
//        toutes les personnes.
//   N3 : SAISIE LIBRE ; 1er groupe + etre/avoir ; toutes les personnes.
//   N4 : SAISIE LIBRE ; TOUS les verbes (irreguliers, -ger/-cer) ; sujet
//        nominal (« Les enfants … ») pour il/ils.
//
// Le serveur reste seul juge (op 'conj') ; le diagnostic client
// (domain/diagnostic/conjugaison) sert au feedback et au type de faute.

import type { Rng } from "../calcul/rng";
import { pick, shuffle } from "../calcul/rng";
import type { Base, GeneratedExercise, ExCalcul } from "../calcul/generator";
import {
  CONJ, TEMPS, TEMPS_CODE, forme, avecPronom, infinitifAffiche,
  VERBES_ETRE_AVOIR, VERBES_1ER, VERBES_1ER_HAUT, VERBES_IRREGULIERS,
  type Temps, type Personne,
} from "./conjugaison";
import {
  AUXILIAIRE, PC_CODE, VERBES_PC, formePC, avecSujetPC, participeAccorde,
  type Genre,
} from "./passe-compose";
import { normaliser } from "../diagnostic/lettres";

// Temps porte par la competence.
function tempsDe(competence: string): Temps {
  if (competence.endsWith("FUTUR")) return "futur";
  if (competence.endsWith("IMPARFAIT")) return "imparfait";
  return "present";
}

// Verbes et personnes disponibles selon le niveau.
function verbesDe(niveau: number): string[] {
  if (niveau <= 2) return [...VERBES_ETRE_AVOIR, ...VERBES_1ER];
  if (niveau === 3) return [...VERBES_ETRE_AVOIR, ...VERBES_1ER_HAUT];
  return [...VERBES_ETRE_AVOIR, ...VERBES_1ER_HAUT, ...VERBES_IRREGULIERS];
}
function personnesDe(niveau: number): Personne[] {
  return niveau === 1 ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];
}

// Sujets nominaux (N4) pour les 3e personnes.
const SUJETS_P3 = ["La fille", "Le garçon", "Le chat", "La maîtresse"];
const SUJETS_P6 = ["Les enfants", "Les oiseaux", "Mes amis"];

// Propositions TEXTE pour un QCM : la bonne forme + distracteurs distincts.
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
// PASSE COMPOSE (temps compose : auxiliaire + participe, accord avec etre).
// Progression :
//   N1 : QCM ; 1er groupe + aller ; personnes je/tu/il.
//   N2 : QCM (distracteurs : mauvais auxiliaire, mauvais temps, mauvais accord)
//        ; toutes les personnes ; + venir, etre, avoir.
//   N3 : SAISIE LIBRE ; 1er groupe + etre/avoir + aller/venir + faire/dire.
//   N4 : SAISIE LIBRE ; TOUS les verbes (participes irreguliers) ; sujet
//        nominal gendre pour il/ils (« La fille … (aller) »).
// ACCORD : seuls aller/venir (auxiliaire etre) s'accordent. Pour lever toute
// ambiguite, le genre est IMPOSE (p_c) aux 3e personnes (sujet il/elle), et
// LIBRE (m ET f acceptes) pour je/tu/nous/vous.
function verbesDePC(niveau: number): string[] {
  if (niveau === 1) return ["chanter", "jouer", "aimer", "regarder", "donner", "aller"];
  if (niveau === 2)
    return ["chanter", "jouer", "aimer", "regarder", "donner", "trouver", "parler", "aller", "venir", "etre", "avoir"];
  if (niveau === 3)
    return ["chanter", "jouer", "aimer", "regarder", "donner", "trouver", "parler", "manger", "placer", "aller", "venir", "etre", "avoir", "faire", "dire"];
  return [...VERBES_PC];
}

const SUJETS_PC_P3_M = ["Le garçon", "Le chat", "Paul", "Mon ami"];
const SUJETS_PC_P3_F = ["La fille", "La maîtresse", "Marie", "Mon amie"];
const SUJETS_PC_P6_M = ["Les garçons", "Les amis", "Les oiseaux"];
const SUJETS_PC_P6_F = ["Les filles", "Les amies", "Les fées"];

function pronomSujetPC(personne: Personne, genre: Genre): string {
  switch (personne) {
    case 1: return "Je";
    case 2: return "Tu";
    case 3: return genre === "f" ? "Elle" : "Il";
    case 4: return "Nous";
    case 5: return "Vous";
    case 6: return genre === "f" ? "Elles" : "Ils";
  }
}

// Propositions TEXTE pour un QCM de passe compose : bonne forme + distracteurs
// (mauvais auxiliaire, mauvais temps, mauvais accord).
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
  const inf = infinitifAffiche(verbe);

  // Genre : impose (3e personnes des verbes avec etre), sinon libre.
  let genre: Genre | null;
  if (AUXILIAIRE[verbe] === "avoir") genre = null;
  else if (personne === 3 || personne === 6) genre = pick(rng, ["m", "f"] as Genre[]);
  else genre = null;
  const genreAff: Genre = genre ?? "m";

  // Sujet affiche : nominal gendre au N4 pour il/ils, sinon pronom.
  let sujet: string;
  if (niveau === 4 && personne === 3) sujet = pick(rng, genreAff === "f" ? SUJETS_PC_P3_F : SUJETS_PC_P3_M);
  else if (niveau === 4 && personne === 6) sujet = pick(rng, genreAff === "f" ? SUJETS_PC_P6_F : SUJETS_PC_P6_M);
  else sujet = pronomSujetPC(personne, genreAff);

  const attendu = formePC(verbe, personne, genreAff);
  const qcm = niveau <= 2;
  // p_c : 0 = masculin impose, 1 = feminin impose, undefined = genre libre.
  const cGenre = genre === "m" ? 0 : genre === "f" ? 1 : undefined;

  return {
    ...base,
    forme: "conjugaison",
    support: "aucun",
    saisie: qcm ? "qcm_texte" : "lettres",
    prompt: `${sujet} … (${inf})`,
    answer: 0,
    reste: null,
    fields: 1,
    optionsTexte: qcm ? propositionsPC(verbe, personne, genreAff, genre == null, rng) : undefined,
    conjPC: { verbe, personne, genre },
    verif: { op: "conj", a: PC_CODE, b: personne, cle: verbe, c: cGenre },
    correction: `On écrit « ${avecSujetPC(personne, genreAff, attendu)} ».`,
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
  const inf = infinitifAffiche(verbe);

  // Sujet affiche : pronom, ou sujet nominal au niveau 4 pour il/ils.
  let sujet = "";
  if (niveau === 4 && personne === 3) sujet = pick(rng, SUJETS_P3);
  else if (niveau === 4 && personne === 6) sujet = pick(rng, SUJETS_P6);
  else sujet = avecPronom(personne, "").trim(); // pronom seul (sans forme)

  const prompt = `${sujet} … (${inf})`;
  const qcm = niveau <= 2;

  return {
    ...base,
    forme: "conjugaison",
    support: "aucun",
    saisie: qcm ? "qcm_texte" : "lettres",
    prompt,
    answer: 0,
    reste: null,
    fields: 1,
    optionsTexte: qcm ? propositions(verbe, temps, personne, niveau, rng) : undefined,
    conj: { verbe, temps, personne },
    verif: { op: "conj", a: TEMPS_CODE[temps], b: personne, cle: verbe },
    correction: `On écrit « ${avecPronom(personne, attendu)} ».`,
  };
}
