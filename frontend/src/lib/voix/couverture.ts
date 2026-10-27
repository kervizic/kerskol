// Mesure de COUVERTURE voix : enumere des exercices reels CE2 (toutes matieres
// actives) sur plusieurs graines, extrait chaque texte lu par la voix et decide
// s'il est LISIBLE avec un manifest donne (prod). Sert (1) a mesurer le manque,
// (2) a produire la liste des clips a generer, (3) au garde-fou de non-regression
// (couverture >= seuil). Pur et deterministe (graines fixes).

import { generateExercise, type ExCalcul, type Forme, type Support } from "../../domain/calcul/generator";
import { enonceEnCles } from "./verbalize";
import { sequenceJouable, type VoixManifest } from "./manifest";
import { nettoyer } from "./nettoyage";
import { textesLus, MESSAGES_STATIQUES, type ChampKind } from "./textesExercice";

// Ligne du referentiel CE2 dumpee depuis la base (fixture __fixtures__).
export interface RefRow {
  id: string;
  competence: string;
  niveau: number;
  methode: string | null;
  type: string;
  matiere: string;
  domaine: string;
  classe_min: string;
  classe_max: string;
  operation: string | null;
  forme: string | null;
  params: Record<string, unknown> | null;
  support_visuel: string | null;
  correction_strategie: string | null;
}

// Types d'exercices ENUMERABLES hors-ligne (le texte est deterministe via la
// graine). Exclus : dictee / dictee_maitresse / mots_maitresse (textes tires de
// la base / des listes du foyer, lecture deja geree a part ou non enumerable).
const TYPES_SKIP = new Set(["dictee", "dictee_maitresse", "mots_maitresse"]);

// Reproduit le mapping type -> (operation, forme) des loaders de lib/api.ts
// (getFrancais / getGeometrie / getDonnees / getQM / getEMC).
function rowToSource(r: RefRow): ExCalcul | null {
  if (TYPES_SKIP.has(r.type)) return null;
  if (r.type === "calcul") {
    if (!r.operation || !r.forme) return null;
    return {
      exerciceId: r.id,
      competence: r.competence,
      niveau: r.niveau,
      methode: r.methode ?? null,
      operation: r.operation,
      forme: r.forme as Forme,
      params: r.params ?? {},
      support: (r.support_visuel as Support) ?? null,
      correctionStrategie: r.correction_strategie ?? null,
    };
  }
  const lex = r.type === "vocabulaire" || r.type === "mots_invariables";
  const operation =
    r.type === "ecriture" ? "ecr"
    : r.type === "comprehension" ? "lire"
    : r.type === "grammaire" ? "gram"
    : lex ? "lex"
    : r.type === "geometrie" ? "geo"
    : r.type === "donnees" ? "don"
    : (r.type === "qm" || r.type === "emc") ? "qm"
    : "conj";
  const forme = (
    r.type === "ecriture" ? "ecriture"
    : r.type === "comprehension" ? "comprehension"
    : (r.type === "grammaire" || lex) ? "grammaire"
    : r.type === "geometrie" ? "geometrie"
    : r.type === "donnees" ? "donnees"
    : (r.type === "qm" || r.type === "emc") ? "qm"
    : "conjugaison"
  ) as Forme;
  return {
    exerciceId: r.id,
    competence: r.competence,
    niveau: r.niveau,
    methode: r.methode ?? null,
    operation,
    forme,
    params: {},
    support: null,
    correctionStrategie: null,
  };
}

const aDesChiffres = (t: string) => /\d/.test(t);

// Un texte est LISIBLE avec le manifest si : (briques) son enonce de calcul est
// jouable en entier, OU (prose) un clip au MEME texte nettoye existe.
export function lisibiliteTexte(
  texte: string,
  kind: ChampKind,
  manifest: VoixManifest,
  textIndex: Set<string>,
): { lisible: boolean; voie: "brique" | "prose" | "aucune"; cleTexte: string } {
  const cle = nettoyer(texte);
  // enonce et choix peuvent etre du calcul -> briques d'abord.
  if (kind === "enonce" || kind === "choix") {
    const cles = enonceEnCles(texte);
    if (sequenceJouable(manifest, cles)) return { lisible: true, voie: "brique", cleTexte: cle };
  }
  if (textIndex.has(cle)) return { lisible: true, voie: "prose", cleTexte: cle };
  return { lisible: false, voie: "aucune", cleTexte: cle };
}

export interface BucketStat {
  total: number;
  lisibles: number;
  manquants_prose: number; // prose sans chiffre : generable maintenant
  manquants_chiffres: number; // prose avec chiffre : lot ulterieur
  manquants_brique: number; // calcul dont une brique manque
}

export interface CouvertureResult {
  nbExercices: number;
  parMatiere: Record<string, BucketStat>;
  parKind: Record<string, BucketStat>;
  global: BucketStat;
  // Clips PROSE a generer (digit-free), dedupes par texte nettoye.
  aGenerer: { texte: string; cat: string; exemples: string[] }[];
  // Textes prose AVEC chiffres non lisibles (lot ulterieur), dedupes.
  proseAvecChiffres: string[];
  // Cles de briques manquantes (num:/op:), dedupees.
  briquesManquantes: string[];
}

function bump(b: BucketStat, champ: keyof BucketStat) { b[champ]++; }
function newBucket(): BucketStat {
  return { total: 0, lisibles: 0, manquants_prose: 0, manquants_chiffres: 0, manquants_brique: 0 };
}

// cat de clip pour le pipeline TTS, derivee du kind (sert au controle de duree).
function catPour(kind: ChampKind): string {
  switch (kind) {
    case "consigne": return "consigne";
    case "indice": return "indice";
    case "message": return "message";
    case "choix": return "choix";
    case "sous-titre": return "consigne";
    default: return "enonce"; // enonce / phrase / correction
  }
}

export function mesurerCouverture(
  rows: RefRow[],
  manifest: VoixManifest,
  seeds: number[],
): CouvertureResult {
  // Index des textes nettoyes presents dans le manifest (= clips[].text, deja
  // nettoyes cote generation). Permet la lecture prose sans hash ni respelling.
  const textIndex = new Set<string>();
  for (const c of Object.values(manifest.clips)) textIndex.add(nettoyer(c.text));

  const sources = rows.map(rowToSource).filter((s): s is ExCalcul => s !== null);

  const parMatiere: Record<string, BucketStat> = {};
  const parKind: Record<string, BucketStat> = {};
  const global = newBucket();
  const matiereDe: Record<string, string> = {};
  for (const r of rows) matiereDe[r.competence] = r.matiere;

  // Dedup : on compte chaque (kind, texte-nettoye) UNE fois par matiere.
  const vus = new Set<string>();
  const aGenerer = new Map<string, { texte: string; cat: string; exemples: Set<string> }>();
  const proseAvecChiffres = new Set<string>();
  const briquesManquantes = new Set<string>();
  let nbExercices = 0;

  const traiter = (matiere: string, kind: ChampKind, texte: string) => {
    const cle = nettoyer(texte);
    if (!cle) return;
    const dedup = `${matiere}|${kind}|${cle}`;
    if (vus.has(dedup)) return;
    vus.add(dedup);

    const mat = (parMatiere[matiere] ??= newBucket());
    const kd = (parKind[kind] ??= newBucket());
    bump(mat, "total"); bump(kd, "total"); bump(global, "total");

    const { lisible, voie } = lisibiliteTexte(texte, kind, manifest, textIndex);
    if (lisible) {
      bump(mat, "lisibles"); bump(kd, "lisibles"); bump(global, "lisibles");
      return;
    }
    // Non lisible : classer le manque.
    if ((kind === "enonce" || kind === "choix") && enonceEnCles(texte).length > 0) {
      // calcul dont une brique manque (nombre hors catalogue...)
      bump(mat, "manquants_brique"); bump(kd, "manquants_brique"); bump(global, "manquants_brique");
      for (const k of enonceEnCles(texte)) if (!manifest.keys[k]) briquesManquantes.add(k);
      void voie;
      return;
    }
    if (aDesChiffres(cle)) {
      bump(mat, "manquants_chiffres"); bump(kd, "manquants_chiffres"); bump(global, "manquants_chiffres");
      proseAvecChiffres.add(cle);
      return;
    }
    // prose digit-free : generable maintenant
    bump(mat, "manquants_prose"); bump(kd, "manquants_prose"); bump(global, "manquants_prose");
    const g = aGenerer.get(cle) ?? { texte: cle, cat: catPour(kind), exemples: new Set<string>() };
    if (g.exemples.size < 3) g.exemples.add(`${matiere}/${kind}`);
    aGenerer.set(cle, g);
  };

  for (const src of sources) {
    const matiere = matiereDe[src.competence] ?? "??";
    for (const seed of seeds) {
      let ex;
      try {
        ex = generateExercise(src, seed * 7919 + src.niveau);
      } catch {
        continue;
      }
      nbExercices++;
      for (const t of textesLus(ex)) traiter(matiere, t.kind, t.texte);
    }
  }
  // messages statiques (une fois, matiere "*")
  for (const m of MESSAGES_STATIQUES) traiter("*", "message", m);

  return {
    nbExercices,
    parMatiere,
    parKind,
    global,
    aGenerer: [...aGenerer.values()].map((g) => ({ texte: g.texte, cat: g.cat, exemples: [...g.exemples] })),
    proseAvecChiffres: [...proseAvecChiffres].sort(),
    briquesManquantes: [...briquesManquantes].sort(),
  };
}

export function pct(b: BucketStat): number {
  return b.total === 0 ? 100 : Math.round((b.lisibles / b.total) * 1000) / 10;
}
