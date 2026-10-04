// Generateur d'exercices de MESURES (TS pur, sans effet de bord).
//
// Couvre les competences CE2 du domaine `mesures` :
//   * MA.MES.HEURE   : lire l'heure sur une horloge a aiguilles, l'ecrire en
//                      chiffres, correspondance matin / apres-midi (24 h -> 12 h).
//   * MA.MES.DUREES  : conversions h <-> min, de quelle heure a quelle heure,
//                      heure d'arrivee (depart + duree), jours / semaines.
//
// REGLE DE NORMALISATION (cf. docs/referentiel-calcul.md) : toute reponse est un
// ENTIER dans l'unite la plus petite. Une HEURE de la journee est normalisee en
// MINUTES DEPUIS MINUIT (h * 60 + m) ; une DUREE est normalisee en MINUTES. Le
// client envoie verif:{op,a,b} et le SERVEUR (public.verif_calcul) recalcule :
//   lecture / ecriture d'une heure  -> val (expected = minutes depuis minuit) ;
//   conversion h->min, jours->... ->  mul / val ;
//   de ... a ...                    -> sub (end_min - start_min) ;
//   depart + duree -> arrivee       -> add (depart_min + duree_min) ;
//   24 h -> 12 h (et retour)        -> sub / add.
//
// L'invariant computeVerif(verif) == answer est teste (generator.test.ts) sur
// des milliers de tirages, en mode normal et rattrapage.

import { intBetween, pick, shuffle, type Rng } from "./rng";
import type { Base, ExCalcul, GeneratedExercise, QcmOption } from "./generator";

// "3 h" / "3 h 45" (minutes sur deux chiffres). Format clair pour un enfant.
function fmtHeure(h: number, m: number): string {
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

// Duree lisible : "45 min", "1 h", "1 h 30 min".
function fmtDuree(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

// Trois distracteurs plausibles pour une heure (en minutes depuis minuit),
// distincts, dans [0, 12h59]. On melange des voisins credibles (+/- 1 h, +/- un
// pas de minutes, inversion possible des aiguilles).
function heureOptions(rng: Rng, mins: number, step: number): QcmOption[] {
  const max = 12 * 60 + 59;
  const vals = new Set<number>([mins]);
  // Distracteurs plausibles : +/- 1 h et quelques pas de minutes.
  const cand = [
    mins + 60, mins - 60,
    mins + step, mins - step,
    mins + 2 * step, mins - 2 * step,
    mins + 3 * step, mins - 3 * step,
  ];
  for (const c of shuffle(rng, cand)) {
    if (vals.size >= 4) break;
    if (c >= 0 && c <= max && !vals.has(c)) vals.add(c);
  }
  // Complement si besoin (petites heures), reste dans [0, max].
  let g = 1;
  while (vals.size < 4 && g <= 120) {
    const c = (mins + g * 7) % (max + 1);
    if (!vals.has(c)) vals.add(c);
    g++;
  }
  return shuffle(rng, [...vals]).map((v) => {
    const hh = Math.floor(v / 60);
    return { label: fmtHeure(hh === 0 ? 12 : hh, v % 60), value: v };
  });
}

// ------------------------------- MA.MES.HEURE ------------------------------
function buildHeure(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const p = src.params || {};
  const type = pick(rng, (p.types as string[] | undefined) || ["lire"]);

  // --- Correspondance 24 h <-> 12 h (matin / apres-midi), niveau haut ---
  if (type === "ap_midi") {
    const sens = rng() < 0.5 ? "vers12" : "vers24";
    if (sens === "vers12") {
      const h24 = intBetween(rng, 13, 23); // apres-midi / soir
      const h12 = h24 - 12;
      return {
        ...base,
        prompt: `Il est ${h24} h. Sur une horloge a aiguilles, l'apres-midi, l'aiguille des heures indique [q] h.`,
        answer: h12,
        verif: { op: "sub", a: h24, b: 12 },
        correction: `Apres midi, on enleve 12 : ${h24} − 12 = ${h12}. ${h24} h, c'est ${h12} h de l'apres-midi.`,
      };
    }
    const h12 = intBetween(rng, 1, 11);
    const h24 = h12 + 12;
    return {
      ...base,
      prompt: `Il est ${h12} h de l'apres-midi. Sur une horloge de 24 h, c'est [q] h.`,
      answer: h24,
      verif: { op: "add", a: h12, b: 12 },
      correction: `L'apres-midi, on ajoute 12 : ${h12} + 12 = ${h24}. ${h12} h de l'apres-midi, c'est ${h24} h.`,
    };
  }

  // --- Lire / ecrire l'heure sur l'horloge a aiguilles ---
  const step = Number(p.minuteStep ?? 30);
  const h = intBetween(rng, 1, 12);
  const m = intBetween(rng, 0, Math.floor(59 / step)) * step;
  const mins = h * 60 + m;
  const saisieQcm = p.saisie === "qcm";
  // Niveau 4 (le plus difficile) : saisie directe des chiffres au pave, pas de
  // steppers +1/+5/+15 (regle pedagogique « reponse libre au N4 »).
  const freeInput = base.niveau >= 4;

  const horlogeData = { showHours: h, showMinutes: m, minuteStep: step, hoursMax: 12, freeInput };
  const correction = `La petite aiguille est sur ${h} et la grande indique ${m} minute${m > 1 ? "s" : ""} : il est ${fmtHeure(h, m)}.`;

  if (saisieQcm) {
    return {
      ...base,
      saisie: "qcm",
      horlogeData,
      options: heureOptions(rng, mins, step),
      prompt: "Quelle heure indique l'horloge ?",
      answer: mins,
      verif: { op: "val", a: mins, b: 0 },
      correction,
    };
  }
  return {
    ...base,
    saisie: "heure",
    horlogeData,
    prompt: "Ecris l'heure indiquee par l'horloge.",
    answer: mins,
    verif: { op: "val", a: mins, b: 0 },
    correction,
  };
}

// ------------------------------ MA.MES.DUREES ------------------------------
function buildDuree(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const p = src.params || {};
  const types = (p.types as string[] | undefined) || ["conversion_hm"];
  const type = pick(rng, types);

  // --- Conversion heures <-> minutes ---
  if (type === "conversion_hm") {
    const demi = p.demi === true && rng() < 0.5;
    const h = intBetween(rng, 1, 3);
    const m = demi ? 30 : 0;
    const total = h * 60 + m;
    if (m === 0) {
      // Conversion exacte h -> min : multiplication par 60 (verif mul).
      return {
        ...base,
        prompt: `${h} h = [q] min`,
        answer: total,
        verif: { op: "mul", a: h, b: 60 },
        correction: `1 h = 60 min, donc ${h} h = ${h} × 60 = ${total} min.`,
      };
    }
    return {
      ...base,
      prompt: `${fmtHeure(h, m)} = [q] min`,
      answer: total,
      verif: { op: "val", a: total, b: 0 },
      correction: `${h} h = ${h * 60} min, et 30 min de plus : ${h * 60} + 30 = ${total} min.`,
    };
  }

  // --- De quelle heure a quelle heure (duree en minutes) ---
  if (type === "de_a") {
    const step = Number(p.minuteStep ?? 15);
    const startH = intBetween(rng, 7, 18);
    const startM = intBetween(rng, 0, Math.floor(59 / step)) * step;
    const start = startH * 60 + startM;
    // Duree entre 1 pas et ~3 h, sans depasser minuit.
    const maxDur = Math.min(180, 23 * 60 - start);
    let dur = intBetween(rng, 1, Math.max(1, Math.floor(maxDur / step))) * step;
    if (dur < step) dur = step;
    const end = start + dur;
    const endH = Math.floor(end / 60);
    const endM = end % 60;
    return {
      ...base,
      prompt: `De ${fmtHeure(startH, startM)} a ${fmtHeure(endH, endM)}, combien de temps s'ecoule-t-il ? [q] min`,
      answer: dur,
      verif: { op: "sub", a: end, b: start },
      correction: `De ${fmtHeure(startH, startM)} a ${fmtHeure(endH, endM)}, il s'ecoule ${fmtDuree(dur)}.`,
      horlogeData: { showHours: startH > 12 ? startH - 12 : startH, showMinutes: startM, minuteStep: step, hoursMax: 12 },
    };
  }

  // --- Heure d'arrivee (depart + duree) : la reponse est une HEURE ---
  if (type === "arrivee") {
    const step = Number(p.minuteStep ?? 15);
    const startH = intBetween(rng, 7, 20);
    const startM = intBetween(rng, 0, Math.floor(59 / step)) * step;
    const start = startH * 60 + startM;
    const maxDur = Math.min(180, 23 * 60 + 59 - start);
    let dur = intBetween(rng, 1, Math.max(1, Math.floor(maxDur / step))) * step;
    if (dur < step) dur = step;
    const arr = start + dur;
    const arrH = Math.floor(arr / 60);
    const arrM = arr % 60;
    return {
      ...base,
      saisie: "heure",
      horlogeData: { showHours: startH > 12 ? startH - 12 : startH, showMinutes: startM, minuteStep: step, hoursMax: 12 },
      prompt: `Il est ${fmtHeure(startH, startM)}. Dans ${fmtDuree(dur)}, quelle heure sera-t-il ?`,
      answer: arr,
      verif: { op: "add", a: start, b: dur },
      correction: `${fmtHeure(startH, startM)} + ${fmtDuree(dur)} = ${fmtHeure(arrH, arrM)}.`,
    };
  }

  // --- Jours / semaines (niveau haut) ---
  const sem = intBetween(rng, 1, 6);
  if (rng() < 0.5) {
    const jours = sem * 7;
    return {
      ...base,
      prompt: sem === 1 ? `1 semaine = [q] jours` : `${sem} semaines = [q] jours`,
      answer: jours,
      verif: { op: "mul", a: sem, b: 7 },
      correction: `1 semaine = 7 jours, donc ${sem} semaine${sem > 1 ? "s" : ""} = ${sem} × 7 = ${jours} jours.`,
    };
  }
  const jours = sem * 7;
  return {
    ...base,
    prompt: `${jours} jours = [q] semaines`,
    answer: sem,
    verif: { op: "div", a: jours, b: 7 },
    correction: `1 semaine = 7 jours, donc ${jours} ÷ 7 = ${sem} semaine${sem > 1 ? "s" : ""}.`,
  };
}

// ---------------------------- MA.MES.LONGUEURS -----------------------------
// Codes d'unite envoyes au serveur (QCM « unite adaptee ») : la saisie EST la
// valeur du code (verif val). Le serveur revalide par simple egalite.
const LEN_CODE: Record<string, number> = { mm: 1, cm: 2, m: 3, km: 4 };
// Objets du quotidien et unite adaptee (reference CE2).
const LEN_OBJETS: { obj: string; u: string }[] = [
  { obj: "la longueur d'un crayon", u: "cm" },
  { obj: "la longueur d'une gomme", u: "cm" },
  { obj: "la largeur d'un timbre", u: "cm" },
  { obj: "l'epaisseur d'une piece de monnaie", u: "mm" },
  { obj: "la longueur d'une fourmi", u: "mm" },
  { obj: "l'epaisseur d'un cahier", u: "mm" },
  { obj: "la hauteur d'une porte", u: "m" },
  { obj: "la longueur d'une voiture", u: "m" },
  { obj: "la largeur d'une piscine", u: "m" },
  { obj: "la distance entre deux villes", u: "km" },
  { obj: "la longueur d'une route", u: "km" },
  { obj: "la distance d'un marathon", u: "km" },
];

function buildLongueur(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const p = src.params || {};
  const type = pick(rng, (p.types as string[] | undefined) || ["unite"]);

  // --- Choisir l'unite adaptee (QCM : la valeur = code de l'unite) ---
  if (type === "unite") {
    const o = pick(rng, LEN_OBJETS);
    const code = LEN_CODE[o.u];
    const options = shuffle(rng, ["mm", "cm", "m", "km"]).map((u) => ({ label: u, value: LEN_CODE[u] }));
    return {
      ...base,
      saisie: "qcm",
      options,
      prompt: `Pour mesurer ${o.obj}, quelle unite choisis-tu ?`,
      answer: code,
      verif: { op: "val", a: code, b: 0 },
      correction: `${o.obj.charAt(0).toUpperCase()}${o.obj.slice(1)} se mesure en ${o.u}. Rappel : 1 cm = 10 mm, 1 m = 100 cm, 1 km = 1000 m.`,
    };
  }

  // --- Conversions simples (1 cm = 10 mm, 1 m = 100 cm, 1 km = 1000 m) ---
  if (type === "conversion") {
    const paires = [
      { from: "cm", to: "mm", f: 10, xmax: 30 },
      { from: "m", to: "cm", f: 100, xmax: 50 },
      { from: "km", to: "m", f: 1000, xmax: 9 },
    ];
    const pr = pick(rng, paires);
    const x = intBetween(rng, 1, pr.xmax);
    if (rng() < 0.6) {
      const answer = x * pr.f;
      return {
        ...base,
        prompt: `${x} ${pr.from} = [q] ${pr.to}`,
        answer,
        verif: { op: "mul", a: x, b: pr.f },
        correction: `1 ${pr.from} = ${pr.f} ${pr.to}, donc ${x} ${pr.from} = ${x} × ${pr.f} = ${answer} ${pr.to}.`,
      };
    }
    const grand = x * pr.f;
    return {
      ...base,
      prompt: `${grand} ${pr.to} = [q] ${pr.from}`,
      answer: x,
      verif: { op: "div", a: grand, b: pr.f },
      correction: `${pr.f} ${pr.to} = 1 ${pr.from}, donc ${grand} ÷ ${pr.f} = ${x} ${pr.from}.`,
    };
  }

  // --- Comparer deux longueurs (normalisees dans la plus petite unite) ---
  if (type === "comparer") {
    const paires = [
      { ua: "cm", ub: "mm", f: 10, amax: 9, bmax: 90 },
      { ua: "m", ub: "cm", f: 100, amax: 5, bmax: 500 },
      { ua: "km", ub: "m", f: 1000, amax: 5, bmax: 5000 },
    ];
    const pr = pick(rng, paires);
    const a = intBetween(rng, 1, pr.amax);
    // Parfois egal (valeur ronde), sinon un voisin.
    let b: number;
    const r = rng();
    if (r < 0.25) b = a * pr.f;
    else b = intBetween(rng, 1, pr.bmax);
    const normA = a * pr.f;
    const answer = normA < b ? 0 : normA === b ? 1 : 2;
    const signe = answer === 0 ? "<" : answer === 1 ? "=" : ">";
    return {
      ...base,
      saisie: "compare",
      compareLabels: { left: `${a} ${pr.ua}`, right: `${b} ${pr.ub}` },
      prompt: "Place le bon signe entre ces deux longueurs.",
      answer,
      verif: { op: "cmp", a: normA, b },
      correction: `${a} ${pr.ua} = ${normA} ${pr.ub}. Donc ${a} ${pr.ua} ${signe} ${b} ${pr.ub}.`,
    };
  }

  // --- Mesurer un segment sur une regle graduee (lecture, saisie clavier) ---
  const max = Number(p.max ?? 15);
  const length = intBetween(rng, 2, max - 1);
  return {
    ...base,
    regleData: { length, max, step: 5, unit: "cm" },
    prompt: `Quelle est la longueur du trait rouge ? [q] cm`,
    answer: length,
    verif: { op: "val", a: length, b: 0 },
    correction: `Le trait va de 0 a ${length} : il mesure ${length} cm.`,
  };
}

// ----------------------- MA.MES.MASSES_CONTENANCES -------------------------
// Codes d'unite (QCM). Masses : g, kg. Contenances : mL, cL, dL, L.
const MASS_CODE: Record<string, number> = { g: 10, kg: 11, mL: 20, cL: 21, dL: 22, L: 23 };
const MASS_OBJETS: { obj: string; u: string; opts: string[] }[] = [
  { obj: "la masse d'une pomme", u: "g", opts: ["g", "kg", "L", "cL"] },
  { obj: "la masse d'un stylo", u: "g", opts: ["g", "kg", "mL", "L"] },
  { obj: "la masse d'un sac de sucre", u: "kg", opts: ["g", "kg", "L", "cL"] },
  { obj: "la masse d'un enfant", u: "kg", opts: ["g", "kg", "mL", "L"] },
  { obj: "la quantite d'eau dans un verre", u: "cL", opts: ["mL", "cL", "L", "kg"] },
  { obj: "la quantite d'eau dans une bouteille", u: "L", opts: ["mL", "cL", "L", "g"] },
  { obj: "une cuillere de sirop", u: "mL", opts: ["mL", "cL", "L", "kg"] },
  { obj: "l'eau d'une baignoire", u: "L", opts: ["cL", "dL", "L", "g"] },
];

function buildMasseContenance(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const p = src.params || {};
  const type = pick(rng, (p.types as string[] | undefined) || ["unite"]);

  // --- Choisir l'unite adaptee (QCM) ---
  if (type === "unite") {
    const o = pick(rng, MASS_OBJETS);
    const code = MASS_CODE[o.u];
    const options = shuffle(rng, o.opts).map((u) => ({ label: u, value: MASS_CODE[u] }));
    return {
      ...base,
      saisie: "qcm",
      options,
      prompt: `Pour mesurer ${o.obj}, quelle unite choisis-tu ?`,
      answer: code,
      verif: { op: "val", a: code, b: 0 },
      correction: `On exprime ${o.obj} en ${o.u}. Rappel : 1 kg = 1000 g ; 1 L = 10 dL = 100 cL.`,
    };
  }

  // --- Conversions (1 kg = 1000 g ; 1 L = 10 dL = 100 cL) ---
  if (type === "conversion") {
    const paires = [
      { from: "kg", to: "g", f: 1000, xmax: 9 },
      { from: "L", to: "cL", f: 100, xmax: 9 },
      { from: "L", to: "dL", f: 10, xmax: 9 },
    ];
    const pr = pick(rng, paires);
    const x = intBetween(rng, 1, pr.xmax);
    if (rng() < 0.6) {
      const answer = x * pr.f;
      return {
        ...base,
        prompt: `${x} ${pr.from} = [q] ${pr.to}`,
        answer,
        verif: { op: "mul", a: x, b: pr.f },
        correction: `1 ${pr.from} = ${pr.f} ${pr.to}, donc ${x} ${pr.from} = ${x} × ${pr.f} = ${answer} ${pr.to}.`,
      };
    }
    const grand = x * pr.f;
    return {
      ...base,
      prompt: `${grand} ${pr.to} = [q] ${pr.from}`,
      answer: x,
      verif: { op: "div", a: grand, b: pr.f },
      correction: `${pr.f} ${pr.to} = 1 ${pr.from}, donc ${grand} ÷ ${pr.f} = ${x} ${pr.from}.`,
    };
  }

  // --- Comparer (normalisees dans la plus petite unite) ---
  if (type === "comparer") {
    const paires = [
      { ua: "kg", ub: "g", f: 1000, amax: 5, bmax: 5000 },
      { ua: "L", ub: "cL", f: 100, amax: 5, bmax: 500 },
      { ua: "L", ub: "dL", f: 10, amax: 9, bmax: 90 },
    ];
    const pr = pick(rng, paires);
    const a = intBetween(rng, 1, pr.amax);
    let b: number;
    const r = rng();
    if (r < 0.25) b = a * pr.f;
    else b = intBetween(rng, 1, pr.bmax);
    const normA = a * pr.f;
    const answer = normA < b ? 0 : normA === b ? 1 : 2;
    const signe = answer === 0 ? "<" : answer === 1 ? "=" : ">";
    return {
      ...base,
      saisie: "compare",
      compareLabels: { left: `${a} ${pr.ua}`, right: `${b} ${pr.ub}` },
      prompt: "Place le bon signe entre ces deux mesures.",
      answer,
      verif: { op: "cmp", a: normA, b },
      correction: `${a} ${pr.ua} = ${normA} ${pr.ub}. Donc ${a} ${pr.ua} ${signe} ${b} ${pr.ub}.`,
    };
  }

  // --- Lire une balance (masse) ou un verre gradue (contenance) ---
  const kind = pick(rng, (p.lecture as string[] | undefined) || ["balance", "verre"]) as "balance" | "verre";
  if (kind === "balance") {
    const max = 1000;
    const step = 100;
    const value = intBetween(rng, 1, 9) * step; // multiple de 100 g, < 1 kg
    return {
      ...base,
      balanceData: { value, max, step, unit: "g", kind: "balance" },
      prompt: `Combien pese l'objet sur la balance ? [q] g`,
      answer: value,
      verif: { op: "val", a: value, b: 0 },
      correction: `L'aiguille pointe sur ${value} : l'objet pese ${value} g.`,
    };
  }
  const max = 100;
  const step = 10;
  const value = intBetween(rng, 1, 9) * step; // multiple de 10 cL
  return {
    ...base,
    balanceData: { value, max, step, unit: "cL", kind: "verre" },
    prompt: `Quelle quantite de liquide y a-t-il dans le verre ? [q] cL`,
    answer: value,
    verif: { op: "val", a: value, b: 0 },
    correction: `Le niveau atteint ${value} : il y a ${value} cL.`,
  };
}

export function buildMesure(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  if (src.competence === "MA.MES.HEURE") return buildHeure(src, rng, base);
  if (src.competence === "MA.MES.DUREES") return buildDuree(src, rng, base);
  if (src.competence === "MA.MES.LONGUEURS") return buildLongueur(src, rng, base);
  if (src.competence === "MA.MES.MASSES_CONTENANCES") return buildMasseContenance(src, rng, base);
  // Repli defensif (ne devrait pas arriver : dispatch par prefixe en amont).
  return {
    ...base,
    prompt: "1 h = [q] min",
    answer: 60,
    verif: { op: "mul", a: 1, b: 60 },
    correction: "1 h = 60 min.",
  };
}
