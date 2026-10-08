// Format des TIMINGS mot a mot (un fichier JSON versionne par texte) + controle
// qualite. Ce format est le CONTRAT stable : la voix de Manu produira exactement
// le meme JSON (meme tokenisation, voir tokenize.ts) et remplacera l'audio sans
// toucher au code.
//
// Fichier : public/voix/lecture/<id>.json
//   {
//     "id": "c2-011",
//     "outil": "aeneas 1.7.3",
//     "genere_le": "2026-10-08",
//     "audio": { "opus": "c2-011.opus", "m4a": "c2-011.m4a", "duree_ms": 24000 },
//     "mots": [ { "mot": "Maitre", "debut_ms": 120, "fin_ms": 540, "index": 0 }, ... ]
//   }

export interface MotTiming {
  mot: string;
  debut_ms: number;
  fin_ms: number;
  index: number;
}

export interface AudioRef {
  opus: string;
  m4a: string;
  duree_ms?: number;
}

export interface TimingsTexte {
  id: string;
  outil: string;
  genere_le?: string;
  audio: AudioRef;
  mots: MotTiming[];
}

export interface Probleme {
  code: string;
  detail: string;
}

/**
 * Controle qualite d'un alignement vis-a-vis du texte (liste de mots attendus,
 * dans l'ordre). Retourne la liste des problemes (vide = OK).
 *  - couverture : autant de timings que de mots, mots identiques (normalises) ;
 *  - durees plausibles : debut < fin, duree 40..4000 ms ;
 *  - pas de chevauchement : debut[i] >= fin[i-1] (petite tolerance) ;
 *  - monotone : index strictement croissant 0..n-1.
 */
export function controlerTimings(
  t: TimingsTexte,
  motsAttendus: string[],
  normaliser: (s: string) => string
): Probleme[] {
  const problemes: Probleme[] = [];
  const m = t.mots;

  if (m.length !== motsAttendus.length) {
    problemes.push({
      code: "couverture",
      detail: `${m.length} timings pour ${motsAttendus.length} mots`,
    });
  }

  const n = Math.min(m.length, motsAttendus.length);
  for (let i = 0; i < n; i++) {
    if (m[i].index !== i) {
      problemes.push({ code: "index", detail: `mot ${i}: index=${m[i].index}` });
    }
    if (normaliser(m[i].mot) !== normaliser(motsAttendus[i])) {
      problemes.push({
        code: "mot",
        detail: `mot ${i}: « ${m[i].mot} » != « ${motsAttendus[i]} »`,
      });
    }
    const duree = m[i].fin_ms - m[i].debut_ms;
    if (!(m[i].debut_ms >= 0 && m[i].fin_ms > m[i].debut_ms)) {
      problemes.push({ code: "duree", detail: `mot ${i}: ${m[i].debut_ms}->${m[i].fin_ms}` });
    } else if (duree < 40 || duree > 4000) {
      problemes.push({ code: "duree_implausible", detail: `mot ${i}: ${duree} ms` });
    }
    if (i > 0 && m[i].debut_ms + 20 < m[i - 1].fin_ms) {
      problemes.push({
        code: "chevauchement",
        detail: `mot ${i}: debut ${m[i].debut_ms} < fin precedent ${m[i - 1].fin_ms}`,
      });
    }
  }

  return problemes;
}

/** L'alignement est-il exploitable (aucun probleme) ? */
export function timingsValides(
  t: TimingsTexte,
  motsAttendus: string[],
  normaliser: (s: string) => string
): boolean {
  return controlerTimings(t, motsAttendus, normaliser).length === 0;
}
