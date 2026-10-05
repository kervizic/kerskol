// Composition d'une seance (TS pur).
//
// Regles (docs/pedagogie.md + prompt) :
//   * ~12 exercices tires des competences DEBLOQUEES (prerequis atteint au
//     niveau_min via niveau_max_atteint).
//   * repartition indicative : ~40 % revisions dues, ~40 % lacunes,
//     ~20 % nouveaute / placement.
//   * exercices entrelaces par BLOCS de 2-3 d'une meme competence.
//   * debut facile, fin sur une reussite probable.
//   * 1re seance (aucune reponse encore) = competences SANS prerequis.

import { isUnlocked } from "../buildings";
import type { Classe, Competence, Prerequis, ProgressionDetail } from "../../lib/types";
import { generateExercise, type ExCalcul, type GeneratedExercise, type ProblemContext } from "./generator";
import { classPlan, classUnlocks } from "./classes";
import { hashSeed, makeRng, pick, type Rng } from "./rng";

export type { ProgressionDetail };

export type Category = "revision" | "lacune" | "nouveaute" | "placement";

export interface PlannedItem {
  exercise: GeneratedExercise;
  source: ExCalcul;
  category: Category;
}

export interface ComposeInput {
  competences: Competence[];
  prerequis: Prerequis[];
  progress: ProgressionDetail[];
  sources: ExCalcul[];
  seed: number;
  now: number; // ms epoch
  count?: number;
  classe?: Classe; // pilote la 1re seance et les competences presumees debloquees
  ctx?: ProblemContext; // personnalisation des enonces (mascotte/univers)
  matieres?: string[]; // matieres actives du profil (ex. ['MA','FR']) ; si absent, toutes
}

function progMap(progress: ProgressionDetail[]): Record<string, ProgressionDetail> {
  const m: Record<string, ProgressionDetail> = {};
  for (const p of progress) m[p.competence] = p;
  return m;
}

// Retrouve la source (ex_calcul) pour une competence a un niveau donne, avec
// repli sur le niveau disponible le plus proche.
function findSource(sources: ExCalcul[], competence: string, niveau: number): ExCalcul | null {
  const forComp = sources.filter((s) => s.competence === competence);
  if (forComp.length === 0) return null;
  let best = forComp[0];
  let bestDist = Infinity;
  for (const s of forComp) {
    const d = Math.abs(s.niveau - niveau);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

interface BlockSpec {
  competence: string;
  niveau: number;
  category: Category;
  size: number;
}

// Premiere seance : pilotee par le plan de classe (aucune progression encore).
function composeFirstSession(
  classe: Classe,
  active: Competence[],
  sources: ExCalcul[],
  count: number,
  seed: number,
  rng: Rng,
  ctx?: ProblemContext
): PlannedItem[] {
  const plan = classPlan(classe);
  const exists = (code: string) =>
    active.some((c) => c.code === code) && sources.some((s) => s.competence === code);

  const specs: BlockSpec[] = [];

  // Amorce : au plus 2 exercices de revision faciles (1 item par competence).
  const revision = Object.entries(plan.revision).filter(([code]) => exists(code));
  for (const [competence, niveau] of revision.slice(0, 2)) {
    specs.push({ competence, niveau, category: "revision", size: 1 });
  }

  // Coeur de la classe : remplit le reste par blocs de 2-3, une competence par
  // bloc tant que possible.
  const coeur = Object.entries(plan.coeur).filter(([code]) => exists(code));
  let remaining = count - specs.length;
  let ci = 0;
  while (remaining > 0 && coeur.length > 0 && ci < coeur.length) {
    const [competence, niveau] = coeur[ci];
    const size = Math.min(3, remaining);
    specs.push({ competence, niveau, category: "placement", size });
    remaining -= size;
    ci++;
  }

  return materialize(specs, sources, seed, rng, ctx);
}

export function composeSession(input: ComposeInput): PlannedItem[] {
  const { competences, prerequis, sources, seed, now } = input;
  const classe: Classe = input.classe ?? "CE2";
  const count = input.count ?? 12;
  const rng = makeRng(seed);
  const byCode = progMap(input.progress);

  // Filtre par matieres actives du profil (profils existants = ['MA'] : le
  // francais n'apparait que pour les profils qui l'ont active). Absent = toutes.
  const mats = input.matieres;
  const active = competences.filter(
    (c) => c.actif !== false && (!mats || mats.includes(c.matiere))
  );
  // Une progression sert de reference "deja debloque". Une competence est
  // retenue si ses prerequis sont atteints OU si la classe la presume debloquee
  // (coeur/revision de la classe, prerequis presumes tant qu'ils ne sont pas
  // infirmes).
  const progForUnlock: Record<string, { niveau_max_atteint: number }> = {};
  for (const p of input.progress) progForUnlock[p.competence] = { niveau_max_atteint: p.niveau_max_atteint };
  const unlocked = active.filter(
    (c) => isUnlocked(c.code, prerequis, progForUnlock as never) || classUnlocks(classe, c.code)
  );

  // --- 1re seance : aucune reponse -> plan de la CLASSE -------------------
  // Impression « a son niveau » : au plus 2 exercices de revision faciles
  // (classe precedente, niveau eleve) en amorce, puis le coeur de la classe.
  const isFirstSession = input.progress.length === 0;
  if (isFirstSession) {
    return composeFirstSession(classe, active, sources, count, seed, rng, input.ctx);
  }

  // --- Classement des competences debloquees ------------------------------
  const revision: string[] = [];
  const lacune: string[] = [];
  const nouveaute: string[] = [];
  const solides: string[] = [];

  for (const c of unlocked) {
    const p = byCode[c.code];
    if (!p || !p.placement_termine) {
      nouveaute.push(c.code);
      continue;
    }
    const due =
      p.prochaine_revision != null && Date.parse(p.prochaine_revision) <= now;
    if (due) revision.push(c.code);
    else if (p.ema_courte < 0.7 || p.niveau <= 1) lacune.push(c.code);
    else solides.push(c.code);
  }

  // Cibles d'items par categorie (40/40/20), ajustees a `count`.
  const nRev = Math.round(count * 0.4);
  const nLac = Math.round(count * 0.4);
  const nNouv = count - nRev - nLac;

  const chosen: Array<{ competence: string; category: Category }> = [];
  const seen = new Set<string>();
  const takeFrom = (
    pool: string[],
    target: number,
    category: Category,
    fallbacks: string[][]
  ) => {
    let items = 0;
    const pools = [pool, ...fallbacks];
    let pi = 0;
    while (items < target && pi < pools.length) {
      const cur = pools[pi];
      const fresh = cur.filter((c) => !seen.has(c));
      if (fresh.length === 0) {
        pi++;
        continue;
      }
      const c = pick(rng, fresh);
      seen.add(c);
      chosen.push({ competence: c, category });
      items += 2; // un bloc ~2-3 items
    }
  };
  takeFrom(revision, nRev, "revision", [lacune, solides, nouveaute]);
  takeFrom(lacune, nLac, "lacune", [revision, solides, nouveaute]);
  takeFrom(nouveaute, nNouv, "nouveaute", [lacune, revision, solides]);

  // Repli : si rien n'a ete choisi (cas limite), prendre les debloquees.
  if (chosen.length === 0) {
    for (const c of unlocked) chosen.push({ competence: c.code, category: "lacune" });
  }

  // --- Garde-fou de VARIETE (pas de quota par matiere) --------------------
  // La selection ci-dessus se fait UNIQUEMENT selon le besoin (revision /
  // lacune / nouveaute), sur l'ENSEMBLE des competences actives des deux
  // matieres, sans tirage au sort de la matiere ni quota. Seul garde-fou : si
  // plusieurs matieres sont actives et que la seance serait a 100 % d'une seule
  // alors qu'une AUTRE matiere active a un besoin, on remplace le dernier item
  // (le moins prioritaire) par ce besoin. On ne force rien d'autre : le besoin
  // reste le seul critere (cf. docs/pedagogie.md).
  const matByCode: Record<string, string> = {};
  for (const c of active) matByCode[c.code] = c.matiere;
  if (mats && mats.length >= 2 && chosen.length >= 2) {
    const matieresChoisies = new Set(chosen.map((x) => matByCode[x.competence]));
    if (matieresChoisies.size === 1) {
      const seule = [...matieresChoisies][0];
      const besoinAutre = (pool: string[], category: Category) => {
        const c = pool.find((x) => matByCode[x] && matByCode[x] !== seule && !seen.has(x));
        return c ? { competence: c, category } : null;
      };
      const rempl =
        besoinAutre(revision, "revision") ??
        besoinAutre(lacune, "lacune") ??
        besoinAutre(nouveaute, "nouveaute");
      if (rempl) {
        const retire = chosen.pop();
        if (retire) seen.delete(retire.competence);
        seen.add(rempl.competence);
        chosen.push(rempl);
      }
    }
  }

  const specsRaw = chosen.map(({ competence, category }) => {
    const p = byCode[competence];
    const niveau = clampNiveau(p ? p.niveau : 1);
    return { competence, niveau, category };
  });

  const specs = buildBlocks(specsRaw, count);
  return materialize(specs, sources, seed, rng, input.ctx);
}

function clampNiveau(n: number): number {
  return Math.max(1, Math.min(4, n || 1));
}

// Tailles de blocs (chacune dans {2,3}) sommant a min(count, 3*b) sans jamais
// produire un bloc de 1. `b` = nombre de blocs effectivement retenus.
function planSizes(numBlocks: number, count: number): number[] {
  if (numBlocks <= 0 || count < 2) return [];
  const b = Math.max(1, Math.min(numBlocks, Math.floor(count / 2)));
  const target = Math.min(count, 3 * b);
  const sizes = new Array<number>(b).fill(2);
  const extra = target - 2 * b; // 0..b
  for (let i = 0; i < extra && i < b; i++) sizes[i] = 3;
  return sizes;
}

// Ordonne les competences choisies (facile au debut, reussite probable a la
// fin), retient autant de blocs que `count` le permet, puis attribue les tailles.
function buildBlocks(
  base: Array<{ competence: string; niveau: number; category: Category }>,
  count: number
): BlockSpec[] {
  if (base.length === 0) return [];

  const ordered = base.slice();
  const catRank: Record<Category, number> = {
    revision: 0,
    lacune: 1,
    placement: 2,
    nouveaute: 3,
  };
  // Ordre : niveau croissant (debut facile). A niveau egal, revisions d'abord.
  ordered.sort((a, b) => a.niveau - b.niveau || catRank[a.category] - catRank[b.category]);

  const sizes = planSizes(ordered.length, count);
  const kept = ordered.slice(0, sizes.length);

  // Fin sur reussite : remonter un bloc "facile" (revision/lacune, niveau bas)
  // en derniere position s'il ne s'y trouve pas deja.
  const easyIdx = kept
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.category === "revision" || b.category === "lacune")
    .sort((x, y) => x.b.niveau - y.b.niveau)[0]?.i;
  if (easyIdx != null && easyIdx !== kept.length - 1) {
    const [easy] = kept.splice(easyIdx, 1);
    kept.push(easy);
  }

  return kept.map((b, i) => ({ ...b, size: sizes[i] }));
}

function materialize(
  specs: BlockSpec[],
  sources: ExCalcul[],
  seed: number,
  rng: Rng,
  ctx?: ProblemContext
): PlannedItem[] {
  const items: PlannedItem[] = [];
  let idx = 0;
  for (const spec of specs) {
    const source = findSource(sources, spec.competence, spec.niveau);
    if (!source) continue;
    const eff: ExCalcul = { ...source, niveau: spec.niveau };
    for (let k = 0; k < spec.size; k++) {
      const s = hashSeed(seed, spec.competence, spec.niveau, idx, Math.floor(rng() * 1e9));
      items.push({
        source: eff,
        category: spec.category,
        exercise: generateExercise(eff, s, { ctx }),
      });
      idx++;
    }
  }
  return items;
}
