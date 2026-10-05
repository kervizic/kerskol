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
