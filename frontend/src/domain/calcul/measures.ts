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

  const horlogeData = { showHours: h, showMinutes: m, minuteStep: step, hoursMax: 12 };
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

export function buildMesure(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  if (src.competence === "MA.MES.HEURE") return buildHeure(src, rng, base);
  if (src.competence === "MA.MES.DUREES") return buildDuree(src, rng, base);
  // Repli defensif (ne devrait pas arriver : dispatch par prefixe en amont).
  return {
    ...base,
    prompt: "1 h = [q] min",
    answer: 60,
    verif: { op: "mul", a: 1, b: 60 },
    correction: "1 h = 60 min.",
  };
}
