// Diagnostic DETERMINISTE des fautes au PASSE COMPOSE.
//
// On connait la bonne reponse : « auxiliaire + participe » pour (verbe, personne,
// genre). On applique des regles DANS CET ORDRE ; la PREMIERE qui matche donne
// le type (au plus 2 fautes, ici toujours 1 car exclusives) :
//   a) JUSTE          : forme exacte (accents compris) ;
//   b) ACCENT         : identique une fois les accents retires (« mange » pour
//                       « mangé », « ete » pour « été ») ;
//   c) MAUVAIS_TEMPS  : l'enfant a conjugue a un TEMPS SIMPLE (present / futur /
//                       imparfait) au lieu du passe compose (« il mangeait ») ;
//   d) AUXILIAIRE     : bon participe mais MAUVAIS auxiliaire (« il a allé » au
//                       lieu de « il est allé » ; « il est mangé ») ;
//   e) ACCORD         : auxiliaire ETRE correct, participe au mauvais accord
//                       (« elle est allé » au lieu de « allée », « ils sont
//                       venu » au lieu de « venus ») ;
//   f) PARTICIPE      : bon auxiliaire mais participe faux (« il a prendu » au
//                       lieu de « pris ») ;
//   g) INCONNU        : repli.
//
// GENRE CONTRAINT (p3/p6 avec un sujet gendre) : la bonne reponse est unique.
// GENRE LIBRE (je/tu/nous/vous, ou verbe avec AVOIR) : les deux ecritures m/f
// sont acceptees (« je suis allé » comme « je suis allée »).
//
// Le type est INDICATIF (le serveur verif_passe_compose reste seul juge) et
// enregistre pour reproposer un exercice cible. Messages « enfant de 8 ans ».

import { normaliser } from "./lettres";
import type { Diagnostic, Faute } from "./diagnostic";
import { CONJ, TEMPS, PERSONNES, type Personne } from "../francais/conjugaison";
import {
  AUXILIAIRE, PARTICIPE, accordeAvecEtre, participeAccorde, auxiliaireForme,
  formePC, type Genre,
} from "../francais/passe-compose";

function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Decoupe « auxiliaire participe » : 1er mot = auxiliaire, le reste = participe.
function decouper(saisie: string): { aux: string; part: string } {
  const toks = normaliser(saisie).split(" ").filter(Boolean);
  return { aux: toks[0] ?? "", part: toks.slice(1).join(" ") };
}

// --- Messages (style enfant, rediges POUR L'ORAL : phrases parlees courtes, un
//     exemple juste ET un exemple pas juste, aucun symbole ni fleche) ----------
function msgAccent(bonne: string): string {
  return `N'oublie pas l'accent. On écrit : ${bonne}. On écrit il a mangé avec un accent, pas il a mange sans accent.`;
}
function msgAuxiliaire(verbe: string, bonne: string): string {
  return accordeAvecEtre(verbe)
    ? `Ce verbe se dit avec être. On écrit : ${bonne}. On dit : il est allé. On ne dit pas : il a allé.`
    : `Ce verbe se dit avec avoir. On écrit : ${bonne}. On dit : il a mangé. On ne dit pas : il est mangé.`;
}
// Accord avec etre : un e pour une fille (singulier), un s pour plusieurs
// (pluriel). Formulations validees par Manu.
function msgAccord(personne: Personne, bonne: string): string {
  return personne >= 4
    ? `Avec sont, on ajoute un s à la fin pour plusieurs : ils sont allés. On écrit : ${bonne}.`
    : `Avec est, on ajoute un e à la fin pour une fille : elle est allée. On écrit : ${bonne}.`;
}
function msgParticipe(bonne: string): string {
  return `Ce n'est pas le bon participe. On écrit : ${bonne}. On dit : il a pris. On ne dit pas : il a prendu.`;
}
function msgMauvaisTemps(bonne: string): string {
  return `Ici c'est le passé composé, c'est déjà fait. On écrit : ${bonne}. On dit : hier il a mangé. On ne dit pas : il mangeait.`;
}
function msgInconnu(bonne: string): string {
  return `Presque ! Regarde bien. On écrit : ${bonne}.`;
}

// Genres acceptes pour cette question. null => genre libre (m ET f acceptes) ;
// sinon le genre impose par le sujet (3e personne gendre).
function genresAcceptes(genre: Genre | null): Genre[] {
  return genre == null ? ["m", "f"] : [genre];
}

export interface OptionsPC {
  // Genre impose par le sujet (3e personne avec « elle »/« il ») ; null = libre.
  genre: Genre | null;
}

export function diagnostiquerPasseCompose(
  verbe: string,
  personne: Personne,
  saisie: string,
  opts: OptionsPC
): Diagnostic {
  const genres = genresAcceptes(opts.genre);
  // Reference affichee : le genre impose, sinon le masculin par defaut.
  const genreAff: Genre = opts.genre ?? "m";
  const attendu = formePC(verbe, personne, genreAff);
  const input = normaliser(saisie);
  const cibles = genres.map((g) => normaliser(formePC(verbe, personne, g)));

  const faire = (f: Faute): Diagnostic => ({ juste: false, bonneEcriture: attendu, fautes: [f] });

  // a) JUSTE (une des ecritures acceptees, accents compris).
  if (cibles.includes(input)) {
    return { juste: true, bonneEcriture: attendu, fautes: [] };
  }
  if (input === "") {
    return faire({ type: "INCONNU", message: msgInconnu(attendu), surligne: [attendu] });
  }

  // b) ACCENT : identique a une cible une fois les accents retires.
  if (cibles.some((c) => sansAccents(c) === sansAccents(input))) {
    return faire({ type: "ACCENT", message: msgAccent(attendu), surligne: [attendu] });
  }

  // c) MAUVAIS_TEMPS : forme d'un temps SIMPLE du meme verbe (si connu en 0031).
  const simple = CONJ[verbe];
  if (simple) {
    for (const t of TEMPS) {
      for (const p of PERSONNES) {
        if (normaliser(simple[t][p - 1]) === input) {
          return faire({ type: "MAUVAIS_TEMPS", message: msgMauvaisTemps(attendu), surligne: [attendu] });
        }
      }
    }
  }

  const { aux, part } = decouper(saisie);
  const auxBon = normaliser(auxiliaireForme(verbe, personne));
  const autreAux = AUXILIAIRE[verbe] === "avoir" ? "etre" : "avoir";
  const autreAuxForme = normaliser(CONJ[autreAux].present[personne - 1]);
  // Participes acceptes (selon les genres) + le participe non accorde de base.
  const partsOk = new Set<string>([
    ...genres.map((g) => normaliser(participeAccorde(verbe, personne, g))),
  ]);
  const partBase = normaliser(PARTICIPE[verbe]);

  // d) AUXILIAIRE : participe correct (ou base), mais auxiliaire = l'AUTRE.
  if (aux === autreAuxForme && (partsOk.has(part) || part === partBase)) {
    return faire({ type: "AUXILIAIRE", message: msgAuxiliaire(verbe, attendu), surligne: [attendu] });
  }

  // e) ACCORD : auxiliaire ETRE correct, participe = une variante d'accord
  //    (bon radical « venu/venue/venus/venues ») mais pas celle attendue.
  if (accordeAvecEtre(verbe) && aux === auxBon && part !== "" && !partsOk.has(part)) {
    const base = partBase; // ex. « venu »
    const estVarianteAccord = part === base || part === base + "e" || part === base + "s" || part === base + "es";
    if (estVarianteAccord) {
      return faire({ type: "ACCORD", message: msgAccord(personne, attendu), surligne: [attendu] });
    }
  }

  // f) PARTICIPE : bon auxiliaire, participe faux (radical).
  if (aux === auxBon) {
    return faire({ type: "PARTICIPE", message: msgParticipe(attendu), surligne: [attendu] });
  }

  // g) INCONNU.
  return faire({ type: "INCONNU", message: msgInconnu(attendu), surligne: [attendu] });
}

// Decision juste/faux cote client (meme regle que verif_passe_compose serveur).
export function estJustePasseCompose(
  verbe: string,
  personne: Personne,
  genre: Genre | null,
  saisie: string
): boolean {
  const input = normaliser(saisie);
  return genresAcceptes(genre).some((g) => normaliser(formePC(verbe, personne, g)) === input);
}

// Catalogue des messages (relecture + docs/explications.md). {forme} = la bonne
// ecriture attendue (auxiliaire + participe accorde).
export const MESSAGES_PASSE_COMPOSE: Record<string, string> = {
  JUSTE: "Bravo ! C'est le bon passé composé.",
  ACCENT: "N'oublie pas l'accent. On écrit : {forme}. On écrit il a mangé avec un accent, pas il a mange sans accent.",
  AUXILIAIRE_ETRE:
    "Ce verbe se dit avec être. On écrit : {forme}. On dit : il est allé. On ne dit pas : il a allé.",
  AUXILIAIRE_AVOIR:
    "Ce verbe se dit avec avoir. On écrit : {forme}. On dit : il a mangé. On ne dit pas : il est mangé.",
  ACCORD:
    "Avec est, on ajoute un e à la fin pour une fille : elle est allée. On écrit : {forme}.",
  ACCORD_PLURIEL:
    "Avec sont, on ajoute un s à la fin pour plusieurs : ils sont allés. On écrit : {forme}.",
  PARTICIPE:
    "Ce n'est pas le bon participe. On écrit : {forme}. On dit : il a pris. On ne dit pas : il a prendu.",
  MAUVAIS_TEMPS:
    "Ici c'est le passé composé, c'est déjà fait. On écrit : {forme}. On dit : hier il a mangé. On ne dit pas : il mangeait.",
  INCONNU: "Presque ! Regarde bien. On écrit : {forme}.",
};
