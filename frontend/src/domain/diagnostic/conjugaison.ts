// Diagnostic DETERMINISTE des fautes de conjugaison.
//
// On connait la bonne reponse : la forme attendue pour (verbe, temps, personne).
// On applique des regles DANS CET ORDRE ; la PREMIERE qui matche donne le type :
//   a) JUSTE              : forme exacte (accents compris) ;
//   b) ACCENT             : identique une fois les accents retires (ex. « etes »
//                           pour « êtes ») -> faux, mais diagnostique ACCENT ;
//   c) MAUVAISE_PERSONNE  : forme correcte d'une AUTRE personne, meme temps
//                           (« tu manges » au lieu de « il mange ») ;
//   d) MAUVAIS_TEMPS      : forme du MEME verbe a un autre temps ;
//   e) TERMINAISON        : bon radical, mauvaise fin (« je chantes ») ;
//   f) ORTHO_RADICAL      : radical mal orthographie (distance d'edition <= 2) ;
//   g) INCONNU            : rien de ce qui precede.
//
// On montre AU PLUS 2 fautes (ici toujours 1 : les regles sont exclusives).
// Chaque type porte une explication courte « enfant de 8 ans » avec un exemple
// concret, la bonne ecriture, et la partie fautive a SURLIGNER. Le type est
// INDICATIF (le serveur reste seul juge) et enregistre pour reproposer un
// exercice cible. INCONNU est enregistre aussi.

import { normaliser } from "./lettres";
import { levenshtein, type Diagnostic, type Faute } from "./diagnostic";
import {
  CONJ, TEMPS, TEMPS_LIBELLE, PERSONNES, avecPronom, pronom, forme,
  type Temps, type Personne,
} from "../francais/conjugaison";

// Retire les accents pour la comparaison ACCENT (les accents restent EXIGES
// pour « juste » : une forme sans le bon accent est fausse).
function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Radical « regulier » = plus long prefixe commun ; sert a distinguer une faute
// de TERMINAISON (bon debut, mauvaise fin) d'une faute de radical.
function prefixeCommun(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

// --- Messages (style enfant, toujours un exemple concret) --------------------
function msgAccent(bonne: string): string {
  return `N'oublie pas l'accent : « ${bonne} ». vous êtes → avec un accent sur le e. / vous etes → pas juste.`;
}
function msgMauvaisePersonne(p: Personne, bonne: string): string {
  return `Attention à la personne : avec ${pronom(p, bonne)}, on écrit « ${bonne} ». tu chantes → avec un s. / il chante → pas de s.`;
}
// Repere temporel concret pour l'enfant (pas de grammaire abstraite).
const REPERE_TEMPS: Record<Temps, string> = {
  present: "maintenant",
  futur: "demain",
  imparfait: "avant / hier",
};
function msgMauvaisTemps(temps: Temps, bonne: string): string {
  return `Attention au temps : ici c'est ${TEMPS_LIBELLE[temps]} (${REPERE_TEMPS[temps]}). On écrit « ${bonne} ». hier je chantais / demain je chanterai.`;
}
function msgTerminaison(p: Personne, bonne: string): string {
  return `Bon début, mauvaise fin : avec ${pronom(p, bonne)}, on écrit « ${bonne} ». tu joues → un s à la fin. / il joue → pas de s.`;
}
function msgOrthoRadical(bonne: string): string {
  return `Regarde bien les lettres : on écrit « ${bonne} ».`;
}
function msgInconnu(bonne: string): string {
  return `Presque ! Regarde bien : on écrit « ${bonne} ».`;
}

// Fragment a surligner = la fin qui change (TERMINAISON), sinon toute la forme.
function finQuiChange(saisie: string, bonne: string): string[] {
  const k = prefixeCommun(normaliser(saisie), normaliser(bonne));
  const fin = bonne.slice(k);
  return fin.length > 0 && fin.length < bonne.length ? [fin] : [bonne];
}

export function diagnostiquerConjugaison(
  verbe: string,
  temps: Temps,
  personne: Personne,
  saisie: string
): Diagnostic {
  const attendu = forme(verbe, temps, personne);
  const input = normaliser(saisie);
  const cible = normaliser(attendu);

  const faire = (f: Faute): Diagnostic => ({
    juste: false,
    bonneEcriture: attendu,
    fautes: [f],
  });

  // a) JUSTE (accents exiges).
  if (input === cible) {
    return { juste: true, bonneEcriture: attendu, fautes: [] };
  }

  if (input === "") {
    return faire({ type: "INCONNU", message: msgInconnu(attendu), surligne: [attendu] });
  }

  // b) ACCENT : identique une fois les accents retires.
  if (sansAccents(input) === sansAccents(cible)) {
    return faire({ type: "ACCENT", message: msgAccent(attendu), surligne: [attendu] });
  }

  const c = CONJ[verbe];

  // c) MAUVAISE_PERSONNE : forme correcte d'une autre personne, MEME temps.
  for (const p of PERSONNES) {
    if (p === personne) continue;
    if (normaliser(c[temps][p - 1]) === input) {
      return faire({
        type: "MAUVAISE_PERSONNE",
        message: msgMauvaisePersonne(personne, attendu),
        surligne: finQuiChange(saisie, attendu),
      });
    }
  }

  // d) MAUVAIS_TEMPS : forme du MEME verbe a un AUTRE temps (toute personne).
  for (const t of TEMPS) {
    if (t === temps) continue;
    for (const p of PERSONNES) {
      if (normaliser(c[t][p - 1]) === input) {
        return faire({
          type: "MAUVAIS_TEMPS",
          message: msgMauvaisTemps(temps, attendu),
          surligne: [attendu],
        });
      }
    }
  }

  // e) TERMINAISON : bon radical (prefixe commun significatif), fin differente.
  const k = prefixeCommun(input, cible);
  if (k >= 1 && k >= cible.length - 3 && k >= Math.ceil(cible.length / 2)) {
    return faire({
      type: "TERMINAISON",
      message: msgTerminaison(personne, attendu),
      surligne: finQuiChange(saisie, attendu),
    });
  }

  // f) ORTHO_RADICAL : radical mal ecrit, proche (distance d'edition <= 2).
  if (levenshtein(input, cible) <= 2) {
    return faire({ type: "ORTHO_RADICAL", message: msgOrthoRadical(attendu), surligne: [attendu] });
  }

  // g) INCONNU.
  return faire({ type: "INCONNU", message: msgInconnu(attendu), surligne: [attendu] });
}

// Decision juste/faux cote client (meme regle que verif_conjugaison serveur :
// accents EXIGES). Sert au feedback instantane et au repli demo.
export function estJusteConjugaison(
  verbe: string,
  temps: Temps,
  personne: Personne,
  saisie: string
): boolean {
  return normaliser(saisie) === normaliser(forme(verbe, temps, personne));
}

// Phrase de reference complete (sujet + forme), pour la correction de repli.
export function phraseAttendue(verbe: string, temps: Temps, personne: Personne): string {
  return avecPronom(personne, forme(verbe, temps, personne));
}

// Catalogue des messages (relecture + docs/explications.md). Parties variables
// entre accolades : {forme} = forme attendue, {pronom} = sujet, {temps} = temps.
export const MESSAGES_CONJUGAISON: Record<string, string> = {
  JUSTE: "Bravo ! C'est la bonne forme.",
  ACCENT: "N'oublie pas l'accent : « {forme} ». vous êtes → avec un accent sur le e. / vous etes → pas juste.",
  MAUVAISE_PERSONNE:
    "Attention à la personne : avec {pronom}, on écrit « {forme} ». tu chantes → avec un s. / il chante → pas de s.",
  MAUVAIS_TEMPS:
    "Attention au temps : ici c'est {temps} ({repère}). On écrit « {forme} ». hier je chantais / demain je chanterai.",
  TERMINAISON:
    "Bon début, mauvaise fin : avec {pronom}, on écrit « {forme} ». tu joues → un s à la fin. / il joue → pas de s.",
  ORTHO_RADICAL: "Regarde bien les lettres : on écrit « {forme} ».",
  INCONNU: "Presque ! Regarde bien : on écrit « {forme} ».",
};
