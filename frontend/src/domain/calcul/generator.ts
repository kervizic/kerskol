// Generateur d'exercices de CALCUL (TS pur, sans effet de bord).
//
// Entree : une ligne ex_calcul (operation, forme, params, support, strategie de
// correction) + un niveau + une graine reproductible.
// Sortie : un enonce, la reponse attendue, la forme de saisie, un support
// visuel eventuel (niveau 1), et une CORRECTION EXPLIQUEE selon la strategie
// pedagogique (doubles, double du double, 5x+2x, 10x-1x, passage par 10,
// +9 = +10-1, complements, decomposition).
//
// Voir docs/referentiel-calcul.md et supabase/migrations/0006_seed_referentiel_calcul.sql.

import { makeRng, intBetween, pick, type Rng } from "./rng";

export type Forme =
  | "resultat"
  | "terme_manquant"
  | "decomposition"
  | "ordre_grandeur"
  | "reste";

export type Support = "rectangle" | "droite" | "aucun" | null;

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

export function generateExercise(
  src: ExCalcul,
  seed: number,
  opts: { rattrapage?: boolean } = {}
): GeneratedExercise {
  const ex = buildExercise(src, seed, opts);
  return { ...ex, prompt: withAnswerBox(ex.prompt) };
}

function buildExercise(
  src: ExCalcul,
  seed: number,
  opts: { rattrapage?: boolean } = {}
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
    seed,
  };
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
          correction: `${a} × ${f} = ${table} × ${f} × 10 = ${table * f} × 10 = ${answer}.`,
        };
      }
      const b = f * 10;
      const answer = table * b;
      return {
        ...base,
        prompt: `${table} × ${b}`,
        answer,
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
          correction: `${table} × ${f} = ${product}, donc il y a ${f} fois ${table} dans ${product}. ${correctionTable(table, f)}`,
        };
      }
      if (variante === "commutativite") {
        return {
          ...base,
          prompt: `${f} × … = ${product}`,
          answer: table,
          correction: `${f} × ${table} = ${table} × ${f} = ${product} (l'ordre ne change pas le resultat).`,
        };
      }
      return {
        ...base,
        prompt: `${table} × … = ${product}`,
        answer: f,
        correction: correctionTable(table, f),
      };
    }

    // N1 / N2 : resultat.
    return {
      ...base,
      prompt: `${table} × ${f}`,
      answer: product,
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
      return { ...base, prompt: `${a} + ${b}`, answer, correction };
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
    correction: "1 + 1 = 2.",
  };
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
