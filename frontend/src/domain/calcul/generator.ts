// Generateur d'exercices de CALCUL (TS pur, sans effet de bord).
//
// Entree : une ligne ex_calcul (operation, forme, params, support, strategie de
// correction) + un niveau + une graine reproductible.
// Sortie : un enonce, la reponse attendue, la forme de saisie, un support
// visuel eventuel (niveau 1), et une CORRECTION EXPLIQUEE selon la strategie
// pedagogique (doubles, double du double, 5x+2x, 10x-1x, passage par 10,
// +9 = +10-1, complements, decomposition).
//
// Chaque exercice porte aussi un ENONCE NORMALISE `verif: {op, a, b}` : une
// operation a deux operandes dont le resultat (et le reste pour la division)
// EST la reponse attendue. C'est ce que le client envoie au serveur, qui
// RECALCULE la reponse et decide seul « juste/faux » (lot 2 de securite). Un
// test (generator.test.ts) verifie que computeVerif(ex.verif) reproduit
// toujours ex.answer / ex.reste.
//
// Voir docs/referentiel-calcul.md et supabase/migrations/0006_seed_referentiel_calcul.sql.

import { makeRng, intBetween, pick, shuffle, type Rng } from "./rng";
import { buildProbleme } from "./problemes";
import { buildMesure } from "./measures";
import { buildFraction } from "./fractions";
import { enLettresFr } from "../diagnostic/lettres";
import { buildFrancaisConjugaison, buildFrancaisDictee } from "../francais/generator";
import type { Temps, Personne } from "../francais/conjugaison";

export type Forme =
  | "resultat"
  | "terme_manquant"
  | "decomposition"
  | "ordre_grandeur"
  | "reste"
  | "comparaison" // numeration : <, =, >
  | "lecture" // numeration : lire/ecrire un nombre
  | "encadrement" // numeration : encadrer, suivant/precedent, +-10/100/1000
  | "pose" // calcul pose en colonnes
  | "probleme" // probleme en francais (mascotte, monnaie, deux etapes)
  | "mesure" // mesures (heure, durees, longueurs, masses, contenances)
  | "fraction" // fractions simples
  | "conjugaison" // francais : conjuguer un verbe (present / futur / imparfait)
  | "dictee"; // francais : dictee detective (trouver / corriger des erreurs)

export type Support = "rectangle" | "droite" | "aucun" | null;

// Mode de SAISIE de la reponse cote interface. "clavier" = pave/clavier
// numerique (defaut historique). Les autres sont de nouveaux rendus :
//   compare  -> trois boutons <, =, > ;
//   chiffres -> cases de chiffres par rang (decomposition m/c/d/u) ;
//   pose     -> operation en colonnes, resultat chiffre a chiffre ;
//   qcm      -> choix parmi des options (la VALEUR de l'option choisie est
//               envoyee au serveur, jamais un index) ;
//   droite   -> droite graduee, l'enfant lit la valeur pointee.
//   monnaie  -> composition d'une somme en touchant billets et pieces.
//   heure    -> deux champs (heures + minutes) regles par BOUTONS tactiles
//               (+1/+3 h, +1/+5/+15 min, remise a zero) a TOUS les niveaux ; la
//               saisie a boutons compte comme reponse libre (cf. pedagogie.md) et
//               reste NORMALISEE en minutes (depuis minuit pour une heure, duree sinon).
//   lettres  -> champ texte LIBRE : l'enfant ecrit un nombre en toutes lettres
//               (clavier de l'appareil) ; la saisie TEXTE est verifiee par le
//               serveur (op 'lettres', trad + rectifiee 1990) et diagnostiquee.
//   fraction -> l'enfant colorie/selectionne des parts d'une figure ; la saisie
//               est le NOMBRE de parts coloriees.
//   fraction_num -> saisie LIBRE d'une fraction : l'enfant tape le numerateur et
//               le denominateur (deux cases separees par une barre) ; la saisie
//               envoyee est le CODE num*100+den (identique au QCM « nommer »).
//   qcm_texte -> choix parmi des propositions TEXTE (conjugaison aux niveaux
//               faciles) : la VALEUR choisie est la forme, envoyee comme TEXTE
//               (reponse_texte) et jugee par le serveur (op 'conj').
export type Saisie =
  | "clavier" | "compare" | "chiffres" | "pose" | "qcm" | "droite" | "monnaie"
  | "heure" | "fraction" | "fraction_num" | "lettres" | "qcm_texte"
  // dictee -> enquete d'orthographe : l'enfant touche les mots fautifs puis les
  // corrige (selon le niveau) ; le texte et la verification viennent du serveur.
  | "dictee";

// Enonce normalise envoye au serveur pour revalidation. L'operation porte sur
// deux operandes et son resultat est la reponse attendue :
//   add -> a + b ; sub -> a - b ; mul -> a * b ; div -> quotient (reste = a % b)
//   cmp -> 0 si a<b, 1 si a=b, 2 si a>b (comparaison) ;
//   val -> a (la reponse EST une valeur ; b vaut 0). Sert aux QCM / lectures /
//          decompositions ou la saisie se ramene a « reproduire ce nombre ».
//
// PROBLEMES A DEUX ETAPES : un enonce peut chainer une SECONDE operation
// (`op2`, `c`). Le serveur calcule r1 = op(a,b), puis la reponse = op2(r1, c).
// `op2` est reserve a la competence MA.PB.DEUX_ETAPES (verifie cote serveur).
//
// Cas « rendu / il reste » (rendu sur plusieurs articles) : `op2 = "rsub"` est
// une soustraction INVERSEE, reponse = c - r1 (et non r1 - c). Exemple : « Lea
// achete 3 cahiers a 4 €. Elle paie avec un billet de 20 €. Combien lui rend-on ? »
// -> r1 = 3 × 4 = 12, reponse = 20 - 12 = 8. Le serveur refuse un rendu negatif
// (c >= r1) ; les montants d'argent sont des euros entiers.
// `lettres` : l'enonce porte un NOMBRE (a) et la reponse est du TEXTE (ecriture
// en toutes lettres) ; la verification est faite a part (serveur : verif_lettres,
// client : domain/diagnostic). computeVerif renvoie a (le nombre) pour l'invariant.
// `conj` : conjugaison. a = code du temps (1 present, 2 futur, 3 imparfait),
// b = personne (1..6), `cle` = verbe (infinitif) ; la reponse est du TEXTE
// (reponse_texte). computeVerif renvoie a (invariant), la verification reelle
// est serveur (verif_conjugaison) / client (domain/diagnostic/conjugaison).
export type VerifOp = "add" | "sub" | "mul" | "div" | "cmp" | "val" | "lettres" | "conj" | "dictee";
export type VerifOp2 = "add" | "sub" | "mul" | "div" | "rsub";
export interface Verif {
  op: VerifOp;
  a: number;
  b: number;
  op2?: VerifOp2; // seconde etape (problemes a deux etapes)
  c?: number; // operande de la seconde etape
  cle?: string; // conjugaison : le verbe (infinitif), envoye au serveur (p_op2)
}

// Applique une operation a deux operandes (etape unique).
function applyOp(op: VerifOp, a: number, b: number): { answer: number; reste: number | null } {
  switch (op) {
    case "add":
      return { answer: a + b, reste: null };
    case "sub":
      return { answer: a - b, reste: null };
    case "mul":
      return { answer: a * b, reste: null };
    case "div":
      return { answer: Math.floor(a / b), reste: a % b };
    case "cmp":
      return { answer: a < b ? 0 : a === b ? 1 : 2, reste: null };
    case "val":
      return { answer: a, reste: null };
    case "lettres":
      // La reponse est du texte ; a porte le nombre a ecrire (invariant answer=a).
      return { answer: a, reste: null };
    case "conj":
      // La reponse est du texte (conjugaison) ; a porte le code du temps.
      return { answer: a, reste: null };
    case "dictee":
      // Dictee : la reponse est la LISTE des positions corrigees (envoyee a
      // part, p_dictee) ; a porte l'id du texte (invariant answer=a). La
      // verification reelle est serveur (verif_dictee).
      return { answer: a, reste: null };
  }
}

// Recalcule localement la reponse (et le reste) a partir de l'enonce normalise.
// DOIT rester synchrone avec public.verif_calcul() cote serveur.
export function computeVerif(v: Verif): { answer: number; reste: number | null } {
  const step1 = applyOp(v.op, v.a, v.b);
  if (v.op2 == null) return step1;
  // Deux etapes : la reponse est la seconde operation appliquee au resultat
  // intermediaire r1. Un probleme a deux etapes n'a qu'un entier en reponse.
  // `rsub` (rendu / « il reste ») est la soustraction INVERSEE : c - r1.
  const r1 = step1.answer;
  const c = v.c ?? 0;
  let answer: number;
  switch (v.op2) {
    case "add":
      answer = r1 + c;
      break;
    case "sub":
      answer = r1 - c;
      break;
    case "mul":
      answer = r1 * c;
      break;
    case "div":
      answer = c === 0 ? 0 : Math.floor(r1 / c);
      break;
    case "rsub":
      answer = c - r1;
      break;
  }
  return { answer, reste: null };
}

// Contexte de personnalisation d'un enonce (jamais utilise dans le calcul : il
// ne touche QUE le texte). `hero` = surnom de l'enfant ou mascotte.
export interface ProblemContext {
  hero?: string;
  univers?: string;
}

// --- Modele en barres (« a la singapourienne »), aide optionnelle + correction.
// Chaque cellule porte sa valeur reelle et une largeur en unites. `unknown`
// marque la cellule inconnue : rendue « ? » en AIDE, revelee en CORRECTION.
export interface BarCell {
  units: number; // largeur relative
  value: number; // valeur reelle
  label: string; // texte si connu (nombre deja dans l'enonce, ou « ? »)
  unknown: boolean;
}
export interface BarModel {
  variant: "tout_parties" | "comparaison";
  whole?: BarCell; // tout_parties : barre du tout (en haut)
  parts: BarCell[]; // tout_parties : parties ; comparaison : [grand, petit]
  diff?: BarCell; // comparaison : l'ecart
}

// Composition d'une somme : l'enfant touche billets et pieces (valeurs en
// CENTIMES) jusqu'a atteindre la cible. Seul le total final (centimes) est
// envoye au serveur (verif val). Les centimes n'apparaissent qu'aux niveaux hauts.
export interface MoneyData {
  target: number; // somme a composer, en centimes
  cents: boolean; // true si des pieces en centimes sont proposees
  units: number[]; // valeurs disponibles (centimes), du plus grand au plus petit
}

// Description d'un exercice cote base (ex_calcul + exercices).
export interface ExCalcul {
  exerciceId: string;
  competence: string;
  niveau: number;
  methode: string | null;
  operation: string;
  forme: Forme;
  params: Record<string, unknown>;
  support: Support;
  correctionStrategie: string | null;
}

// Support visuel. INVARIANT : aucune etiquette ne revele la reponse. Sur la
// droite graduee, on montre le point de DEPART et le(s) BOND(S) (arcs etiquetes
// « +n »), jamais le point d'arrivee lorsqu'il vaut la reponse. Sur le
// rectangle, la grille lignes x colonnes sans le total. Regle testee : toute
// etiquette du support est un nombre deja present dans l'enonce (voir
// generator.test.ts).
export type SupportData =
  | { kind: "rectangle"; rows: number; cols: number }
  | {
      kind: "droite";
      from: number;
      to: number;
      points: { v: number; label: string }[]; // reperes etiquetes (valeurs connues)
      jumps: { from: number; to: number; label: string | null }[]; // bonds (arc)
    };

// Donnees de rendu des nouveaux modes de saisie.
export interface PoseData {
  op: "+" | "-" | "×";
  terms: number[]; // operandes a poser en colonnes (alignes a droite)
  width: number; // nombre de colonnes (= longueur du plus grand nombre affiche)
  answerDigits: number; // nombre de chiffres du resultat attendu
}
export interface ChiffresData {
  // Cases de chiffres par rang, du plus fort au plus faible (ex. m,c,d,u).
  ranks: { key: "m" | "c" | "d" | "u"; label: string }[];
}
export interface QcmOption {
  label: string; // texte affiche a l'enfant
  value: number; // valeur normalisee envoyee au serveur si choisie
}
export interface DroiteData {
  from: number;
  to: number;
  step: number; // pas de graduation
  at: number; // position pointee (= la reponse)
}

// --- MESURES : visuels et saisies originaux -------------------------------
// Horloge a aiguilles (SVG). `show` affiche les aiguilles d'une heure donnee
// (lecture : les aiguilles SONT la question, pas une aide). `input` active la
// saisie par deux steppers (heures + minutes). `minuteStep` pilote le pas des
// minutes (60 = heures pleines, 30 = demies, 15 = quarts, 5, 1). `hoursMax` = 12
// (cadran classique) ou 24.
export interface HorlogeData {
  showHours: number; // position de la grande aiguille des heures (0..hoursMax)
  showMinutes: number; // position de l'aiguille des minutes (0..59)
  minuteStep: number; // pas de saisie des minutes
  hoursMax: number; // 12 par defaut
  digital?: boolean; // afficher aussi l'heure en chiffres sous le cadran
}
// Regle graduee (SVG) : un segment de `length` unites, graduation `max` unites,
// pas `step`. L'enfant lit la longueur (saisie clavier).
export interface RegleData {
  length: number; // longueur du segment (en unites de graduation)
  max: number; // longueur totale de la regle
  step: number; // pas des graduations chiffrees
  unit: string; // "cm" (affiche)
}
// Balance / verre gradue (SVG) : une aiguille (ou un niveau) pointe `value` sur
// une graduation 0..max, pas `step`. L'enfant lit la mesure (saisie clavier).
export interface BalanceData {
  value: number; // valeur pointee
  max: number; // graduation maximale
  step: number; // pas des graduations chiffrees
  unit: string; // "g", "kg", "L"...
  kind: "balance" | "verre"; // cadran a aiguille ou verre doseur
}
// Figure de fraction (SVG) : `den` parts egales, `shaded` coloriees, forme
// disque / rectangle / bande. `interactive` = l'enfant colorie lui-meme (saisie
// fraction : la reponse est le nombre de parts a colorier).
export interface FractionData {
  num: number; // parts coloriees (lecture) ou cible (coloriage)
  den: number; // nombre total de parts
  shape: "disque" | "rectangle" | "bande";
  interactive?: boolean;
}

export interface GeneratedExercise {
  key: string; // clef React stable
  exerciceId: string;
  competence: string;
  niveau: number;
  methode: string | null;
  forme: Forme;
  support: Support;
  supportData?: SupportData;
  prompt: string; // enonce ; le champ manquant est note « … »
  answer: number; // reponse principale
  reste: number | null; // reste (forme reste), sinon null
  fields: 1 | 2; // 1 champ, ou 2 champs (quotient + reste)
  saisie: Saisie; // mode de saisie cote interface (defaut "clavier")
  options?: QcmOption[]; // mode qcm (valeurs numeriques)
  optionsTexte?: string[]; // mode qcm_texte (propositions TEXTE : conjugaison)
  conj?: { verbe: string; temps: Temps; personne: Personne }; // diagnostic conjugaison
  dictee?: { niveau: number }; // dictee detective : le texte est choisi a l'affichage (serveur)
  poseData?: PoseData; // mode pose
  chiffresData?: ChiffresData; // mode chiffres (decomposition)
  droiteData?: DroiteData; // mode droite
  moneyData?: MoneyData; // mode monnaie (composer une somme)
  horlogeData?: HorlogeData; // horloge a aiguilles (mesures : heure / duree)
  regleData?: RegleData; // regle graduee (mesures : longueur)
  balanceData?: BalanceData; // balance / verre gradue (mesures : masse / contenance)
  fractionData?: FractionData; // figure de fraction (nommer / colorier)
  compareLabels?: { left: string; right: string }; // libelles affiches en mode compare (ex. « 3 cm » / « 25 mm »)
  barres?: BarModel; // schema en barres (aide optionnelle + correction)
  verif: Verif; // enonce normalise pour revalidation serveur
  correction: string; // correction expliquee
  rattrapage: boolean;
  seed: number;
}

// --------------------------- Helpers de params ----------------------------
interface Range {
  min: number;
  max: number;
  multiple_de?: number;
}
function asRange(v: unknown, fallback: Range): Range {
  if (v && typeof v === "object") {
    const o = v as Record<string, number>;
    return {
      min: o.min ?? fallback.min,
      max: o.max ?? fallback.max,
      multiple_de: o.multiple_de,
    };
  }
  return fallback;
}
function rangeInt(rng: Rng, r: Range): number {
  if (r.multiple_de && r.multiple_de > 1) {
    const lo = Math.ceil(r.min / r.multiple_de);
    const hi = Math.floor(r.max / r.multiple_de);
    return intBetween(rng, lo, hi) * r.multiple_de;
  }
  return intBetween(rng, r.min, r.max);
}
function numList(v: unknown): number[] | null {
  return Array.isArray(v) ? (v as number[]) : null;
}
function round10(n: number): number {
  return Math.round(n / 10) * 10;
}

// ------------------------- Corrections expliquees -------------------------
// Strategie de correction des tables (champ correction_strategie du seed).
function correctionTable(table: number, f: number): string {
  const p = table * f;
  switch (table) {
    case 2:
      return `Le double de ${f}, c'est ${f} + ${f} = ${p}.`;
    case 3:
      return `3 fois ${f} = 2 fois ${f} plus une fois ${f} : ${2 * f} + ${f} = ${p}.`;
    case 4:
      return `4 fois ${f}, c'est le double du double : ${f} → ${2 * f} → ${p}.`;
    case 5:
      return `5 fois ${f}, c'est la moitie de 10 fois ${f} : ${10 * f} ÷ 2 = ${p}.`;
    case 6:
      return `6 fois ${f} = 2 fois (3 fois ${f}) : 3 × ${f} = ${3 * f}, puis ${3 * f} + ${3 * f} = ${p}.`;
    case 7:
      return `7 fois ${f} = 5 fois ${f} plus 2 fois ${f} : ${5 * f} + ${2 * f} = ${p}.`;
    case 8:
      return `8 fois ${f} = 2 fois (4 fois ${f}) : 4 × ${f} = ${4 * f}, puis ${4 * f} + ${4 * f} = ${p}.`;
    case 9:
      return `9 fois ${f} = 10 fois ${f} moins une fois ${f} : ${10 * f} − ${f} = ${p}.`;
    default:
      return `${table} × ${f} = ${p}.`;
  }
}

// ------------------------------- Generateur -------------------------------
// Place la (les) case(s) de reponse DANS l'operation : « 2 + 5 = [q] »,
// « 7 × [q] = 56 », « 38 ÷ 5 = [q] reste [r] ». Les enonces qui sont deja des
// questions (« Combien de fois … ? ») gardent une case separee (pas de jeton).
function withAnswerBox(prompt: string): string {
  if (prompt.includes("[q]") || prompt.includes("[r]")) return prompt;
  if (prompt.includes("…")) {
    return prompt.replace("… reste …", "[q] reste [r]").replace("…", "[q]");
  }
  if (prompt.trimEnd().endsWith("?")) return prompt; // question -> case separee
  return `${prompt} = [q]`;
}

export interface GenerateOpts {
  rattrapage?: boolean;
  ctx?: ProblemContext;
}

export function generateExercise(
  src: ExCalcul,
  seed: number,
  opts: GenerateOpts = {}
): GeneratedExercise {
  const ex = buildExercise(src, seed, opts);
  // La case « = [q] » ne concerne que la saisie clavier classique ; les autres
  // modes (compare, pose, chiffres, qcm, droite, monnaie) portent leur propre
  // rendu. Les problemes en francais sont des questions : on ne les suffixe pas.
  if (ex.saisie !== "clavier") return ex;
  if (ex.forme === "probleme") return ex;
  return { ...ex, prompt: withAnswerBox(ex.prompt) };
}

function buildExercise(
  src: ExCalcul,
  seed: number,
  opts: GenerateOpts = {}
): GeneratedExercise {
  const rng = makeRng(seed);
  const p = src.params || {};
  const base = {
    key: `${src.competence}:${src.niveau}:${seed}`,
    exerciceId: src.exerciceId,
    competence: src.competence,
    niveau: src.niveau,
    methode: src.methode,
    forme: src.forme,
    support: src.niveau === 1 ? src.support : "aucun",
    rattrapage: Boolean(opts.rattrapage),
    reste: null as number | null,
    fields: 1 as 1 | 2,
    saisie: "clavier" as Saisie,
    seed,
  };

  // --- Francais : conjugaison -------------------------------------------
  if (src.competence.startsWith("FR.CONJ.")) {
    return buildFrancaisConjugaison(src, rng, base);
  }
  // --- Francais : dictee detective --------------------------------------
  if (src.competence.startsWith("FR.ORTHO.")) {
    return buildFrancaisDictee(src, base);
  }
  // --- Numeration : lire/ecrire, decomposer, comparer, suite ------------
  if (src.competence.startsWith("MA.NUM.")) {
    return buildNumeration(src, rng, base);
  }
  // --- Calcul pose en colonnes ------------------------------------------
  if (src.competence.startsWith("MA.POSE.")) {
    return buildPose(src, rng, base);
  }
  // --- Problemes (mascotte, monnaie, deux etapes) -----------------------
  if (src.competence.startsWith("MA.PB.")) {
    return buildProbleme(src, rng, base, opts.ctx);
  }
  // --- Mesures (heure, durees, longueurs, masses, contenances) ----------
  if (src.competence.startsWith("MA.MES.")) {
    return buildMesure(src, rng, base);
  }
  // --- Fractions simples -------------------------------------------------
  if (src.competence.startsWith("MA.FRAC.")) {
    return buildFraction(src, rng, base);
  }
  // --- Tables de multiplication -----------------------------------------
  if (src.competence.startsWith("MA.TABLES.")) {
    const table = Number(p.table ?? src.competence.split(".").pop());
    const f = rangeInt(rng, asRange(p.facteur, { min: 1, max: 10 }));

    // N4 : melange + derives (70x8, 7x80).
    if (src.niveau === 4 && numList(p.derives) && rng() < 0.5) {
      const derive = pick(rng, ["ligne_dizaine", "colonne_dizaine"]);
      if (derive === "ligne_dizaine") {
        const a = table * 10;
        const answer = a * f;
        return {
          ...base,
          prompt: `${a} × ${f}`,
          answer,
          verif: { op: "mul", a, b: f },
          correction: `${a} × ${f} = ${table} × ${f} × 10 = ${table * f} × 10 = ${answer}.`,
        };
      }
      const b = f * 10;
      const answer = table * b;
      return {
        ...base,
        prompt: `${table} × ${b}`,
        answer,
        verif: { op: "mul", a: table, b },
        correction: `${table} × ${b} = ${table} × ${f} × 10 = ${table * f} × 10 = ${answer}.`,
      };
    }

    const product = table * f;
    // N3 : terme manquant / commutativite / combien de fois.
    if (src.forme === "terme_manquant") {
      const variante = pick(
        rng,
        (numList(p.variantes) as unknown as string[]) || [
          "terme_manquant",
          "commutativite",
          "combien_de_fois",
        ]
      );
      if (variante === "combien_de_fois") {
        return {
          ...base,
          prompt: `Combien de fois ${table} dans ${product} ?`,
          answer: f,
          verif: { op: "div", a: product, b: table },
          correction: `${table} × ${f} = ${product}, donc il y a ${f} fois ${table} dans ${product}. ${correctionTable(table, f)}`,
        };
      }
      if (variante === "commutativite") {
        return {
          ...base,
          prompt: `${f} × … = ${product}`,
          answer: table,
          verif: { op: "div", a: product, b: f },
          correction: `${f} × ${table} = ${table} × ${f} = ${product} (l'ordre ne change pas le resultat).`,
        };
      }
      return {
        ...base,
        prompt: `${table} × … = ${product}`,
        answer: f,
        verif: { op: "div", a: product, b: table },
        correction: correctionTable(table, f),
      };
    }

    // N1 / N2 : resultat.
    return {
      ...base,
      prompt: `${table} × ${f}`,
      answer: product,
      verif: { op: "mul", a: table, b: f },
      correction: correctionTable(table, f),
      supportData:
        base.support === "rectangle"
          ? { kind: "rectangle", rows: table, cols: f }
          : undefined,
    };
  }

  // --- Doubles -----------------------------------------------------------
  if (src.operation === "double") {
    const list = numList(p.nombres);
    let n: number;
    if (p.melange && list) {
      n = rng() < 0.5 ? rangeInt(rng, asRange(p.n, { min: 1, max: 20 })) : pick(rng, list);
    } else if (list) {
      n = pick(rng, list);
    } else {
      n = rangeInt(rng, asRange(p.n, { min: 1, max: 10 }));
    }
    const answer = 2 * n;
    return {
      ...base,
      prompt: `Le double de ${n}`,
      answer,
      verif: { op: "add", a: n, b: n },
      correction: `Le double de ${n}, c'est ${n} + ${n} = ${answer}.`,
      supportData:
        base.support === "rectangle" ? { kind: "rectangle", rows: 2, cols: n } : undefined,
    };
  }

  // --- Moities -----------------------------------------------------------
  if (src.operation === "moitie") {
    const list = numList(p.nombres);
    let n: number;
    if (p.melange && list) {
      n = rng() < 0.5 ? evenIn(rng, asRange(p.pairs, { min: 2, max: 40 })) : pick(rng, list);
    } else if (list) {
      n = pick(rng, list);
    } else {
      n = evenIn(rng, asRange(p.pairs, { min: 2, max: 20 }));
    }
    const answer = n / 2;
    return {
      ...base,
      prompt: `La moitie de ${n}`,
      answer,
      verif: { op: "div", a: n, b: 2 },
      correction: `La moitie de ${n}, c'est ${n} partage en deux : ${answer} + ${answer} = ${n}.`,
      supportData:
        base.support === "rectangle" ? { kind: "rectangle", rows: 2, cols: answer } : undefined,
    };
  }

  // --- Complements -------------------------------------------------------
  if (src.operation === "complement") {
    // Complement a une cible fixe (10, 100, 1000).
    if (typeof p.cible === "number") {
      const cible = p.cible as number;
      const list = numList(p.nombres);
      const n = list ? pick(rng, list) : rangeInt(rng, asRange(p.n, { min: 1, max: cible - 1 }));
      const answer = cible - n;
      return {
        ...base,
        prompt: `${n} + … = ${cible}`,
        answer,
        verif: { op: "sub", a: cible, b: n },
        correction: complementCorrection(n, cible, answer),
        // Terme manquant : on montre le depart (n) et la cible, le bond reste
        // A TROUVER (arc non etiquete) -> la reponse n'est jamais affichee.
        supportData:
          base.support === "droite"
            ? {
                kind: "droite",
                from: 0,
                to: cible,
                points: [
                  { v: n, label: String(n) },
                  { v: cible, label: String(cible) },
                ],
                jumps: [{ from: n, to: cible, label: null }],
              }
            : undefined,
      };
    }
    // Complement au rang superieur (dizaine/centaine/millier).
    const vers = String(p.vers || "dizaine_sup");
    const step = vers === "millier_sup" ? 1000 : vers === "centaine_sup" ? 100 : 10;
    const n = rangeInt(rng, asRange(p.n, { min: 41, max: 98 }));
    const target = Math.floor(n / step) * step + step;
    const answer = target - n;
    const rang = step === 1000 ? "millier" : step === 100 ? "centaine" : "dizaine";
    return {
      ...base,
      prompt: `${n} → combien pour aller a la ${rang} au-dessus ?`,
      answer,
      verif: { op: "sub", a: target, b: n },
      correction: `On vise ${target} (la ${rang} juste au-dessus de ${n}). ${target} − ${n} = ${answer}.`,
      supportData:
        base.support === "droite"
          ? {
              kind: "droite",
              from: n,
              to: target,
              points: [
                { v: n, label: String(n) },
                { v: target, label: String(target) },
              ],
              jumps: [{ from: n, to: target, label: null }],
            }
          : undefined,
    };
  }

  // --- Division ----------------------------------------------------------
  if (src.operation === "div") {
    // Division exacte par les tables.
    if (p.type === "exacte") {
      const tables = (numList(p.tables) as number[]) || [2, 3, 4, 5];
      const divisor = pick(rng, tables);
      const quotient = rangeInt(rng, asRange(p.quotient, { min: 1, max: 10 }));
      const dividend = divisor * quotient;
      return {
        ...base,
        prompt: `${dividend} ÷ ${divisor}`,
        answer: quotient,
        verif: { op: "div", a: dividend, b: divisor },
        correction: `${divisor} × ${quotient} = ${dividend}, donc ${dividend} ÷ ${divisor} = ${quotient}.`,
        supportData:
          base.support === "rectangle"
            ? { kind: "rectangle", rows: divisor, cols: quotient }
            : undefined,
      };
    }
    // Division avec reste (diviseur 1 chiffre, ou nombres ronds).
    const divisors = numList(p.diviseurs) as number[] | null;
    let divisor: number;
    if (divisors) divisor = pick(rng, divisors);
    else divisor = rangeInt(rng, asRange(p.diviseur, { min: 2, max: 9 }));
    // Tirage du dividende, en preferant un reste non nul.
    let dividend = rangeInt(rng, asRange(p.dividende, { min: 10, max: 89 }));
    for (let i = 0; i < 4 && dividend % divisor === 0; i++) {
      dividend = rangeInt(rng, asRange(p.dividende, { min: 10, max: 89 }));
    }
    const quotient = Math.floor(dividend / divisor);
    const reste = dividend % divisor;
    const produit = divisor * quotient;
    return {
      ...base,
      prompt: `${dividend} ÷ ${divisor} = … reste …`,
      answer: quotient,
      reste,
      fields: 2,
      verif: { op: "div", a: dividend, b: divisor },
      correction: `Le plus grand multiple de ${divisor} sous ${dividend} est ${produit} (${divisor} × ${quotient}). Il reste ${dividend} − ${produit} = ${reste}.`,
    };
  }

  // --- Multiplications par 10 / 100 (et 20, 50) --------------------------
  if (src.operation === "mul") {
    const facteurs = numList(p.facteurs) as number[] | null;
    const facteur = facteurs ? pick(rng, facteurs) : Number(p.facteur ?? 10);
    const a = rangeInt(rng, asRange(p.a, { min: 2, max: 9 }));
    const answer = a * facteur;
    let correction: string;
    if (facteur === 10) correction = `${a} × 10 : on ajoute un zero → ${answer}.`;
    else if (facteur === 100) correction = `${a} × 100 : on ajoute deux zeros → ${answer}.`;
    else if (facteur === 20) correction = `${a} × 20 = ${a} × 10 × 2 = ${a * 10} × 2 = ${answer}.`;
    else if (facteur === 50) correction = `${a} × 50 = ${a} × 100 ÷ 2 = ${a * 100} ÷ 2 = ${answer}.`;
    else correction = `${a} × ${facteur} = ${answer}.`;
    return {
      ...base,
      prompt: `${a} × ${facteur}`,
      answer,
      verif: { op: "mul", a, b: facteur },
      correction,
      // Bonds repetes de `facteur` (compter par paquets) ; l'arrivee (le
      // resultat) n'est pas etiquetee.
      supportData:
        base.support === "droite"
          ? {
              kind: "droite",
              from: 0,
              to: answer,
              points: [],
              jumps: Array.from({ length: a }, (_, i) => ({
                from: i * facteur,
                to: (i + 1) * facteur,
                label: `+${facteur}`,
              })),
            }
          : undefined,
    };
  }

  // --- Additions / soustractions (famille add) ---------------------------
  if (src.operation === "add") {
    // ADDITION N4 : terme manquant.
    if (src.forme === "terme_manquant") {
      const somme = rangeInt(rng, asRange(p.somme, { min: 11, max: 18 }));
      const connu = Math.min(
        rangeInt(rng, asRange(p.terme_connu, { min: 2, max: 9 })),
        somme - 1
      );
      const answer = somme - connu;
      const gauche = rng() < 0.5;
      return {
        ...base,
        prompt: gauche ? `${connu} + … = ${somme}` : `… + ${connu} = ${somme}`,
        answer,
        verif: { op: "sub", a: somme, b: connu },
        correction: `On cherche ce qu'il faut ajouter a ${connu} pour faire ${somme} : ${somme} − ${connu} = ${answer}.`,
      };
    }

    // SOMMES_DIFF N4 : ordre de grandeur (arrondi a la dizaine).
    if (src.forme === "ordre_grandeur") {
      const a = rangeInt(rng, asRange(p.a, { min: 100, max: 999 }));
      let b = rangeInt(rng, asRange(p.b, { min: 11, max: 99 }));
      const ops = (numList(p.ops) as unknown as string[]) || ["add", "sub"];
      let op = pick(rng, ops);
      const ra = round10(a);
      const rb = round10(b);
      if (op === "sub" && rb > ra) op = "add";
      const answer = op === "add" ? ra + rb : ra - rb;
      const signe = op === "add" ? "+" : "−";
      return {
        ...base,
        prompt: `Ordre de grandeur : ${a} ${signe} ${b} (arrondis a la dizaine)`,
        answer,
        verif: { op: op === "add" ? "add" : "sub", a: ra, b: rb },
        correction: `${a} ≈ ${ra} et ${b} ≈ ${rb}. ${ra} ${signe} ${rb} = ${answer}.`,
      };
    }

    // Familles SOMMES_DIFF et ADDITION niveaux 1-3.
    const type = String(p.type || "");

    if (type === "dizaines_sans_retenue") {
      const ops = (numList(p.ops) as unknown as string[]) || ["add", "sub"];
      let a = rangeInt(rng, asRange(p.a, { min: 20, max: 89 }));
      const b = rangeInt(rng, asRange(p.b, { min: 10, max: 40, multiple_de: 10 }));
      let op = pick(rng, ops);
      if (op === "sub" && a < b) a = a + b; // garantit un resultat positif
      const answer = op === "add" ? a + b : a - b;
      const signe = op === "add" ? "+" : "−";
      return {
        ...base,
        prompt: `${a} ${signe} ${b}`,
        answer,
        verif: { op: op === "add" ? "add" : "sub", a, b },
        correction: `${b} est un nombre de dizaines : on ${op === "add" ? "ajoute" : "enleve"} ${b / 10} dizaines a ${a} → ${answer}.`,
      };
    }

    if (type === "ajout_proche_dizaine") {
      const a = rangeInt(rng, asRange(p.a, { min: 10, max: 89 }));
      const ajout = pick(rng, (numList(p.ajouts) as number[]) || [9, 19, -9]);
      const answer = a + ajout;
      const abs = Math.abs(ajout);
      let correction: string;
      if (ajout === 9) correction = `${a} + 9 = ${a} + 10 − 1 = ${a + 10} − 1 = ${answer}.`;
      else if (ajout === 19) correction = `${a} + 19 = ${a} + 20 − 1 = ${a + 20} − 1 = ${answer}.`;
      else correction = `${a} − 9 = ${a} − 10 + 1 = ${a - 10} + 1 = ${answer}.`;
      const signe = ajout < 0 ? "−" : "+";
      return {
        ...base,
        prompt: `${a} ${signe} ${abs}`,
        answer,
        verif: { op: ajout < 0 ? "sub" : "add", a, b: abs },
        correction,
      };
    }

    if (type === "deux_chiffres_avec_retenue") {
      let a = rangeInt(rng, asRange(p.a, { min: 13, max: 89 }));
      let b = rangeInt(rng, asRange(p.b, { min: 13, max: 89 }));
      // On garantit une retenue aux unites.
      for (let i = 0; i < 5 && (a % 10) + (b % 10) < 10; i++) {
        b = rangeInt(rng, asRange(p.b, { min: 13, max: 89 }));
      }
      const answer = a + b;
      const ua = a % 10;
      const ub = b % 10;
      return {
        ...base,
        prompt: `${a} + ${b}`,
        answer,
        verif: { op: "add", a, b },
        correction: `Unites : ${ua} + ${ub} = ${ua + ub} (je pose ${(ua + ub) % 10}, je retiens 1). Puis les dizaines. Total : ${answer}.`,
      };
    }

    if (type === "doubles_presque_doubles") {
      const a = rangeInt(rng, asRange(p.a, { min: 1, max: 10 }));
      const presque = rng() < 0.5;
      const b = presque ? a + 1 : a;
      const answer = a + b;
      const correction = presque
        ? `${a} + ${b}, c'est presque un double : ${a} + ${a} = ${2 * a}, puis + 1 = ${answer}.`
        : `${a} + ${a}, c'est un double : ${answer}.`;
      return { ...base, prompt: `${a} + ${b}`, answer, verif: { op: "add", a, b }, correction };
    }

    if (type === "passage_par_10") {
      let a = rangeInt(rng, asRange(p.a, { min: 6, max: 9 }));
      let b = rangeInt(rng, asRange(p.b, { min: 3, max: 9 }));
      for (let i = 0; i < 5 && a + b <= 10; i++) {
        b = rangeInt(rng, asRange(p.b, { min: 3, max: 9 }));
      }
      const answer = a + b;
      const pour10 = 10 - a;
      const reste = b - pour10;
      return {
        ...base,
        prompt: `${a} + ${b}`,
        answer,
        verif: { op: "add", a, b },
        correction: `On passe par 10 : ${a} + ${pour10} = 10, il reste ${reste} a ajouter → 10 + ${reste} = ${answer}.`,
      };
    }

    // Repli : addition simple sous contrainte somme < 10.
    let a = rangeInt(rng, asRange(p.a, { min: 1, max: 8 }));
    let b = rangeInt(rng, asRange(p.b, { min: 1, max: 8 }));
    if (p.contrainte === "somme_inf_10") {
      for (let i = 0; i < 6 && a + b >= 10; i++) {
        a = rangeInt(rng, asRange(p.a, { min: 1, max: 8 }));
        b = rangeInt(rng, asRange(p.b, { min: 1, max: 8 }));
      }
      if (a + b >= 10) {
        a = Math.min(a, 4);
        b = Math.min(b, 5);
      }
    }
    const answer = a + b;
    return {
      ...base,
      prompt: `${a} + ${b}`,
      answer,
      verif: { op: "add", a, b },
      correction: `Je pars du plus grand (${Math.max(a, b)}) et j'ajoute ${Math.min(a, b)} → ${answer}.`,
      // Depart au plus grand, un bond « +petit » ; l'arrivee (le resultat)
      // n'est pas etiquetee.
      supportData:
        base.support === "droite"
          ? {
              kind: "droite",
              from: 0,
              to: 10,
              points: [{ v: Math.max(a, b), label: String(Math.max(a, b)) }],
              jumps: [{ from: Math.max(a, b), to: answer, label: `+${Math.min(a, b)}` }],
            }
          : undefined,
    };
  }

  // Repli ultime (ne devrait pas arriver avec le seed courant).
  return {
    ...base,
    prompt: "1 + 1",
    answer: 2,
    verif: { op: "add", a: 1, b: 1 },
    correction: "1 + 1 = 2.",
  };
}

// =========================================================================
// Nombres en toutes lettres (0..10000), orthographe francaise usuelle.
// =========================================================================
const MOTS_U = [
  "zero", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept",
  "dix-huit", "dix-neuf",
];
const MOTS_D = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

function sousCent(n: number): string {
  if (n < 20) return MOTS_U[n];
  if (n < 70) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return MOTS_D[d];
    if (u === 1) return `${MOTS_D[d]}-et-un`;
    return `${MOTS_D[d]}-${MOTS_U[u]}`;
  }
  if (n < 80) {
    if (n === 71) return "soixante-et-onze";
    return `soixante-${MOTS_U[n - 60]}`;
  }
  const u = n - 80;
  if (u === 0) return "quatre-vingts";
  return `quatre-vingt-${MOTS_U[u]}`;
}

function sousMille(n: number): string {
  if (n < 100) return sousCent(n);
  const c = Math.floor(n / 100);
  const r = n % 100;
  const cent = c === 1 ? "cent" : `${MOTS_U[c]} cent${r === 0 ? "s" : ""}`;
  return r === 0 ? cent : `${cent} ${sousCent(r)}`;
}

export function enLettres(n: number): string {
  if (n === 10000) return "dix mille";
  if (n < 1000) return sousMille(n);
  const m = Math.floor(n / 1000);
  const r = n % 1000;
  const mille = m === 1 ? "mille" : `${sousMille(m)} mille`;
  return r === 0 ? mille : `${mille} ${sousMille(r)}`;
}

// =========================================================================
// Generateurs NUMERATION et CALCUL POSE
// =========================================================================
export type Base = Omit<
  GeneratedExercise,
  | "prompt" | "answer" | "verif" | "correction"
  | "supportData" | "options" | "poseData" | "chiffresData" | "droiteData"
  | "moneyData" | "horlogeData" | "regleData" | "balanceData" | "fractionData"
  | "compareLabels" | "barres"
>;

// Trois distracteurs plausibles pour la lecture d'un nombre (voisins, chiffres
// permutes), distincts entre eux, dans [0, max].
function lectureOptions(rng: Rng, n: number, max: number): QcmOption[] {
  const vals = new Set<number>([n]);
  const candidates = [n + 1, n - 1, n + 10, n - 10, n + 100, n - 100, n + 2, n - 2];
  const shuffled = shuffle(rng, candidates);
  for (const c of shuffled) {
    if (vals.size >= 4) break;
    if (c >= 0 && c <= max && !vals.has(c)) vals.add(c);
  }
  let guard = 2;
  while (vals.size < 4 && guard <= max) {
    if (!vals.has(guard)) vals.add(guard);
    guard++;
  }
  return shuffle(rng, [...vals]).map((v) => ({ label: enLettres(v), value: v }));
}

function buildNumeration(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const p = src.params || {};
  const type = String(p.type || "");
  const max = Number(p.max ?? 9999);
  const min = Number(p.min ?? 0);

  // --- Lire (chiffres -> lettres, QCM) ---
  if (type === "lire") {
    const n = intBetween(rng, Math.max(min, 0), max);
    return {
      ...base,
      saisie: "qcm",
      options: lectureOptions(rng, n, max),
      prompt: `Comment se lit le nombre ${n} ?`,
      answer: n,
      verif: { op: "val", a: n, b: 0 },
      correction: `${n} se lit « ${enLettres(n)} ».`,
    };
  }

  // --- Ecrire EN LETTRES (chiffres -> lettres, saisie TEXTE libre, N4) ---
  // L'enfant tape le nombre en toutes lettres. Le serveur (op 'lettres') accepte
  // l'orthographe traditionnelle OU rectifiee 1990 ; le diagnostic client
  // identifie le type de faute. La correction affiche l'ecriture traditionnelle.
  if (type === "ecrire_lettres") {
    const n = intBetween(rng, Math.max(min, 1), max);
    return {
      ...base,
      saisie: "lettres",
      prompt: `Écris en lettres le nombre ${n}.`,
      answer: n,
      verif: { op: "lettres", a: n, b: 0 },
      correction: `${n} s'écrit « ${enLettresFr(n, "trad")} ».`,
    };
  }

  // --- Ecrire (lettres -> chiffres, saisie) ---
  if (type === "ecrire") {
    const n = intBetween(rng, Math.max(min, 1), max);
    return {
      ...base,
      prompt: `Quel nombre s'ecrit « ${enLettres(n)} » ?`,
      answer: n,
      verif: { op: "val", a: n, b: 0 },
      correction: `« ${enLettres(n)} » s'ecrit ${n}.`,
    };
  }

  // --- Decomposer (nombre -> chiffres par rang) ---
  if (type === "decomposer") {
    const ranks = (numList(p.ranks) as unknown as ("m" | "c" | "d" | "u")[]) || ["m", "c", "d", "u"];
    const span = Math.pow(10, ranks.length);
    const n = intBetween(rng, Math.max(min, ranks.length === 4 ? 1000 : 100), Math.min(max, span - 1));
    const labels: Record<string, string> = { m: "milliers", c: "centaines", d: "dizaines", u: "unites" };
    const detail = ranks
      .map((rk, i) => {
        const place = Math.pow(10, ranks.length - 1 - i);
        return `${Math.floor(n / place) % 10} ${labels[rk]}`;
      })
      .join(", ");
    return {
      ...base,
      saisie: "chiffres",
      chiffresData: { ranks: ranks.map((rk) => ({ key: rk, label: labels[rk] })) },
      prompt: `Decompose le nombre ${n} par rang.`,
      answer: n,
      verif: { op: "val", a: n, b: 0 },
      correction: `${n} = ${detail}.`,
    };
  }

  // --- Valeur d'un chiffre dans un nombre ---
  if (type === "valeur_chiffre") {
    const n = intBetween(rng, 1000, Math.min(max, 9999));
    const places = [1000, 100, 10, 1];
    const noms: Record<number, string> = { 1000: "milliers", 100: "centaines", 10: "dizaines", 1: "unites" };
    const place = pick(rng, places);
    const chiffre = Math.floor(n / place) % 10;
    const answer = chiffre * place;
    return {
      ...base,
      prompt: `Dans ${n}, quelle est la valeur du chiffre des ${noms[place]} ?`,
      answer,
      verif: { op: "mul", a: chiffre, b: place },
      correction: `Le chiffre des ${noms[place]} est ${chiffre} : sa valeur est ${chiffre} × ${place} = ${answer}.`,
    };
  }

  // --- Nombre de dizaines / centaines entieres ---
  if (type === "compter_rangs") {
    const diviseur = pick(rng, [10, 100]);
    const n = intBetween(rng, diviseur === 100 ? 100 : 10, Math.min(max, 9999));
    const answer = Math.floor(n / diviseur);
    const nom = diviseur === 100 ? "centaines" : "dizaines";
    return {
      ...base,
      prompt: `Combien de ${nom} entieres y a-t-il dans ${n} ?`,
      answer,
      verif: { op: "div", a: n, b: diviseur },
      correction: `${n} ÷ ${diviseur} = ${answer} (il y a ${answer} ${nom} entieres).`,
    };
  }

  // --- Comparer (<, =, >) ---
  if (type === "comparer") {
    const a = intBetween(rng, min, max);
    // Parfois egaux, sinon un voisin proche ou un nombre quelconque.
    let b: number;
    const r = rng();
    if (r < 0.2) b = a;
    else if (r < 0.6) b = Math.max(0, Math.min(max, a + pick(rng, [-100, -10, -1, 1, 10, 100])));
    else b = intBetween(rng, min, max);
    const answer = a < b ? 0 : a === b ? 1 : 2;
    const signe = answer === 0 ? "<" : answer === 1 ? "=" : ">";
    return {
      ...base,
      saisie: "compare",
      prompt: "Place le bon signe entre ces deux nombres.",
      answer,
      verif: { op: "cmp", a, b },
      correction: `${a} ${signe} ${b}.`,
    };
  }

  // --- Encadrer (centaine / millier inferieur) ---
  if (type === "encadrer") {
    const pas = Number(p.pas ?? 100);
    let n = intBetween(rng, pas + 1, Math.min(max, 9999));
    if (n % pas === 0) n += intBetween(rng, 1, pas - 1); // evite un nombre deja rond
    const reste = n % pas;
    const inf = n - reste;
    const nom = pas === 1000 ? "millier" : pas === 100 ? "centaine" : "dizaine";
    return {
      ...base,
      prompt: `Quelle est la ${nom} juste en dessous de ${n} ?`,
      answer: inf,
      verif: { op: "sub", a: n, b: reste },
      correction: `${n} est entre ${inf} et ${inf + pas}. La ${nom} juste en dessous est ${inf}.`,
    };
  }

  // --- Ranger (le plus grand) : saisie LIBRE au niveau le plus difficile ---
  // On liste les nombres dans l'enonce et l'enfant ECRIT le plus grand (pas de
  // QCM : au niveau 4, le hasard du choix est evite). Contrat serveur inchange
  // (val : la saisie EST la valeur attendue).
  if (type === "ranger") {
    const k = Number(p.n ?? 3);
    const vals = new Set<number>();
    while (vals.size < k) vals.add(intBetween(rng, min, max));
    const list = shuffle(rng, [...vals]);
    const answer = Math.max(...list);
    return {
      ...base,
      prompt: `Parmi ${list.join(", ")}, quel est le plus grand ?`,
      answer,
      verif: { op: "val", a: answer, b: 0 },
      correction: `Parmi ${list.join(", ")}, le plus grand est ${answer}.`,
    };
  }

  // --- Suivant / precedent ---
  if (type === "voisins") {
    const n = intBetween(rng, Math.max(min, 1), max);
    const apres = rng() < 0.5;
    const answer = apres ? n + 1 : n - 1;
    return {
      ...base,
      prompt: `Quel nombre vient juste ${apres ? "apres" : "avant"} ${n} ?`,
      answer,
      verif: apres ? { op: "add", a: n, b: 1 } : { op: "sub", a: n, b: 1 },
      correction: `Juste ${apres ? "apres" : "avant"} ${n}, c'est ${answer}.`,
    };
  }

  // --- Bonds +/- 10, 100, 1000 ---
  if (type === "bond") {
    const pasList = (numList(p.pas) as number[]) || [10, 100];
    const pas = pick(rng, pasList);
    const plus = rng() < 0.5;
    // Garantit un resultat dans [0, 10000].
    let n = intBetween(rng, Math.max(min, 0), max);
    if (plus) n = Math.min(n, 10000 - pas);
    else n = Math.max(n, pas);
    const answer = plus ? n + pas : n - pas;
    return {
      ...base,
      prompt: `${n} ${plus ? "+" : "−"} ${pas}`,
      answer,
      verif: plus ? { op: "add", a: n, b: pas } : { op: "sub", a: n, b: pas },
      correction: `${n} ${plus ? "+" : "−"} ${pas} = ${answer}.`,
    };
  }

  // --- Droite graduee ---
  if (type === "droite") {
    const step = Number(p.step ?? 100);
    const nbInter = Number(p.intervalles ?? 10);
    const from = intBetween(rng, 0, Math.floor((max - nbInter * step) / step < 0 ? 0 : (max - nbInter * step) / step)) * step;
    const to = from + nbInter * step;
    const at = from + intBetween(rng, 1, nbInter - 1) * step;
    return {
      ...base,
      saisie: "droite",
      droiteData: { from, to, step, at },
      prompt: "Quel nombre est indique par la fleche ?",
      answer: at,
      verif: { op: "val", a: at, b: 0 },
      correction: `La fleche est a ${at} (de ${from} a ${to}, pas de ${step}).`,
    };
  }

  // Repli (ne devrait pas arriver).
  const n = intBetween(rng, 0, max);
  return {
    ...base,
    prompt: `Quel nombre s'ecrit « ${enLettres(n)} » ?`,
    answer: n,
    verif: { op: "val", a: n, b: 0 },
    correction: `« ${enLettres(n)} » s'ecrit ${n}.`,
  };
}

// --- Calcul pose en colonnes ---
function digitsOf(n: number): number[] {
  return String(n).split("").map(Number);
}

function buildPose(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const p = src.params || {};
  const comp = src.competence;
  const nbTerms = Number(p.terms ?? 2);
  const termMin = Number(p.min ?? 10);
  const termMax = Number(p.max ?? 99);
  const noCarry = p.sans_retenue === true;

  // ---- Addition posee ----
  if (comp.endsWith("ADDITION")) {
    let terms: number[];
    if (noCarry) {
      // Construction colonne par colonne pour garantir l'absence de retenue.
      const nDig = String(termMax).length;
      const cols: number[][] = Array.from({ length: nbTerms }, () => []);
      for (let col = 0; col < nDig; col++) {
        const leading = col === nDig - 1;
        // somme de la colonne <= 9
        let budget = 9;
        for (let t = 0; t < nbTerms; t++) {
          const lo = leading ? 1 : 0;
          const d = intBetween(rng, lo, Math.max(lo, Math.floor(budget / (nbTerms - t))));
          cols[t].unshift(d);
          budget -= d;
        }
      }
      terms = cols.map((ds) => Number(ds.join("")));
    } else {
      terms = Array.from({ length: nbTerms }, () => intBetween(rng, termMin, termMax));
    }
    const answer = terms.reduce((s, t) => s + t, 0);
    const verif: Verif =
      terms.length === 2
        ? { op: "add", a: terms[0], b: terms[1] }
        : { op: "add", a: terms.slice(0, -1).reduce((s, t) => s + t, 0), b: terms[terms.length - 1] };
    const width = Math.max(...terms.map((t) => String(t).length), String(answer).length);
    return {
      ...base,
      saisie: "pose",
      poseData: { op: "+", terms, width, answerDigits: String(answer).length },
      prompt: `Pose et calcule : ${terms.join(" + ")}`,
      answer,
      verif,
      correction: correctionAdditionPosee(terms, answer),
    };
  }

  // ---- Soustraction posee ----
  if (comp.endsWith("SOUSTRACTION")) {
    let a = intBetween(rng, termMin, termMax);
    let b = intBetween(rng, Number(p.bmin ?? 10), Number(p.bmax ?? termMax));
    if (a < b) [a, b] = [b, a];
    if (noCarry) {
      // Chaque chiffre de a >= chiffre de b (aucun emprunt).
      const da = digitsOf(a);
      const db = digitsOf(b);
      while (db.length < da.length) db.unshift(0);
      for (let i = 0; i < da.length; i++) if (db[i] > da[i]) db[i] = intBetween(rng, 0, da[i]);
      b = Number(db.join(""));
    }
    const answer = a - b;
    const width = Math.max(String(a).length, String(b).length);
    return {
      ...base,
      saisie: "pose",
      poseData: { op: "-", terms: [a, b], width, answerDigits: String(answer).length },
      prompt: `Pose et calcule : ${a} − ${b}`,
      answer,
      verif: { op: "sub", a, b },
      correction: correctionSoustractionPosee(a, b, answer),
    };
  }

  // ---- Multiplication posee (x 1 chiffre) ----
  const a = intBetween(rng, termMin, termMax);
  const b = intBetween(rng, Number(p.bmin ?? 2), Number(p.bmax ?? 9));
  const answer = a * b;
  const width = Math.max(String(a).length, String(b).length);
  return {
    ...base,
    saisie: "pose",
    poseData: { op: "×", terms: [a, b], width, answerDigits: String(answer).length },
    prompt: `Pose et calcule : ${a} × ${b}`,
    answer,
    verif: { op: "mul", a, b },
    correction: correctionMultiplicationPosee(a, b, answer),
  };
}

// Corrections colonne par colonne (retenues mises en evidence).
function correctionAdditionPosee(terms: number[], answer: number): string {
  const noms = ["unites", "dizaines", "centaines", "milliers", "dix-milliers"];
  const maxLen = Math.max(...terms.map((t) => String(t).length));
  const parts: string[] = [];
  let carry = 0;
  for (let col = 0; col < maxLen; col++) {
    const place = Math.pow(10, col);
    const chiffres = terms.map((t) => Math.floor(t / place) % 10);
    const somme = chiffres.reduce((s, d) => s + d, 0) + carry;
    const pose = somme % 10;
    const ret = Math.floor(somme / 10);
    const detailCarry = carry > 0 ? ` (+ ${carry} retenue)` : "";
    parts.push(
      `${noms[col]} : ${chiffres.join(" + ")}${detailCarry} = ${somme}, je pose ${pose}${ret > 0 ? `, je retiens ${ret}` : ""}`
    );
    carry = ret;
  }
  if (carry > 0) parts.push(`il reste ${carry} a poser a gauche`);
  return `${parts.join(" ; ")}. Total : ${answer}.`;
}

function correctionSoustractionPosee(a: number, b: number, answer: number): string {
  return `Je soustrais colonne par colonne en partant des unites, avec emprunt si le chiffre du haut est plus petit. ${a} − ${b} = ${answer}.`;
}

function correctionMultiplicationPosee(a: number, b: number, answer: number): string {
  const noms = ["unites", "dizaines", "centaines"];
  const parts: string[] = [];
  let carry = 0;
  const da = digitsOf(a).reverse();
  for (let i = 0; i < da.length; i++) {
    const prod = da[i] * b + carry;
    const pose = prod % 10;
    const ret = Math.floor(prod / 10);
    parts.push(
      `${b} × ${da[i]} (${noms[i]})${carry > 0 ? ` + ${carry}` : ""} = ${prod}, je pose ${pose}${ret > 0 ? `, je retiens ${ret}` : ""}`
    );
    carry = ret;
  }
  if (carry > 0) parts.push(`je pose la retenue ${carry}`);
  return `${parts.join(" ; ")}. Resultat : ${answer}.`;
}

function evenIn(rng: Rng, r: Range): number {
  const n = intBetween(rng, r.min, r.max);
  return n % 2 === 0 ? n : Math.min(n + 1, r.max % 2 === 0 ? r.max : r.max - 1);
}

function complementCorrection(n: number, cible: number, answer: number): string {
  if (cible === 10) return `${n} pour aller a 10 : ${n} + ${answer} = 10.`;
  if (cible === 100) {
    if (n % 10 === 0) return `${n} et ${answer} font 100 (ce sont des dizaines entieres).`;
    return `${n} + ${answer} = 100 : on complete d'abord a la dizaine, puis a 100.`;
  }
  return `${n} + ${answer} = ${cible} : on complete a ${cible}.`;
}
