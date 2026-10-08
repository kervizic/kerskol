// Tokenisation d'un texte de la Bibliotheque en MOTS (contrat PARTAGE avec
// l'aligneur hors ligne tools/lecture/). La meme liste de mots, dans le meme
// ordre, doit sortir cote TS (ici) et cote Python (aligner) : c'est ce qui
// garantit que les timings (par index de mot) collent au texte affiche, et que
// l'on pourra remplacer l'audio LibriVox par la voix de Manu SANS retoucher le
// code (meme format, meme tokenisation).
//
// Regles (deterministes, documentees) :
//  - on separe sur les espaces ; un « \n » dans un paragraphe marque un vers.
//  - la ponctuation de bord est DETACHEE dans `avant` / `apres` mais reste
//    rattachee au mot (pas de token « ponctuation seule » dans le flux de mots).
//  - un morceau composé UNIQUEMENT de ponctuation (« — », « - » isolé, « ... »)
//    est collé au mot precedent (sinon au suivant) ; il ne cree pas de mot.
//  - les apostrophes et traits d'union INTERNES restent dans le mot
//    (l'arbre, aujourd'hui, martin-pecheur, est-ce) -> un seul token, jamais
//    coupable (voir grouping/liaison).

export interface Token {
  /** position dans le flux de mots (0-based), continue sur tout le texte. */
  index: number;
  /** le mot « nu » tel qu'affiche (apostrophes/traits d'union internes gardes). */
  mot: string;
  /** ponctuation/symbole de tete (« « », « ( », « — »). */
  avant: string;
  /** ponctuation de fin (« , », « . », « ! », « » », « ; »). */
  apres: string;
  /** index du paragraphe d'origine. */
  para: number;
  /** index du vers dans le paragraphe (0 si prose). */
  ligne: number;
}

const LETTRE = /\p{L}|\p{N}/u;

function aUneLettre(s: string): boolean {
  return LETTRE.test(s);
}

// Detache la ponctuation de bord. Retourne [avant, coeur, apres].
// `coeur` garde les apostrophes/traits d'union internes.
function decouperBords(chunk: string): [string, string, string] {
  let debut = 0;
  let fin = chunk.length;
  while (debut < fin && !LETTRE.test(chunk[debut])) debut++;
  while (fin > debut && !LETTRE.test(chunk[fin - 1])) fin--;
  return [chunk.slice(0, debut), chunk.slice(debut, fin), chunk.slice(fin)];
}

/**
 * Transforme le corps d'un texte (paragraphes ; « \n » = vers) en flux de mots.
 * Deterministe : meme entree -> meme sortie.
 */
export function texteEnTokens(corps: string[]): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  corps.forEach((para, pi) => {
    const lignes = para.split("\n");
    lignes.forEach((ligne, li) => {
      const chunks = ligne.split(/\s+/).filter((c) => c.length > 0);
      let avantEnAttente = "";
      for (const chunk of chunks) {
        const [avant, coeur, apres] = decouperBords(chunk);
        if (!aUneLettre(coeur)) {
          // morceau 100 % ponctuation : coller au mot precedent, sinon garder
          // pour le prochain mot.
          const dernier = tokens[tokens.length - 1];
          if (dernier && dernier.para === pi && dernier.ligne === li) {
            dernier.apres += chunk;
          } else {
            avantEnAttente += chunk;
          }
          continue;
        }
        tokens.push({
          index: index++,
          mot: coeur,
          avant: avantEnAttente + avant,
          apres,
          para: pi,
          ligne: li,
        });
        avantEnAttente = "";
      }
    });
  });

  return tokens;
}

/** Forme « nue » d'un mot pour comparaison (minuscules, sans apostrophe de bord). */
export function normaliser(mot: string): string {
  return mot
    .toLowerCase()
    .normalize("NFC")
    .replace(/^['’]+|['’]+$/g, "");
}
