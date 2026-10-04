// Ecriture des nombres en toutes lettres (0..10000), DETERMINISTE, en deux
// orthographes :
//   * TRADITIONNELLE (pre-1990) : « et » entoure d'espaces (vingt et un),
//     « cent » et « mille » separes par des espaces (deux cent trois) ;
//   * RECTIFIEE 1990 : TOUS les mots d'un nombre relies par des traits d'union
//     (vingt-et-un, deux-cent-trois, trois-mille).
//
// INVARIANT CLE, verifie par test : la forme 1990 est exactement la forme
// traditionnelle dont TOUS les espaces ont ete remplaces par des traits d'union.
// Les regles d'accord (vingt/cent prennent un « s » ; « mille » invariable) sont
// identiques dans les deux orthographes.
//
// Cette fonction est le MIROIR EXACT de la fonction SQL public.nombre_en_lettres
// (migration 0030). Un golden partage (supabase/tests/fixtures + test croise)
// garantit qu'elles produisent les memes ecritures sur 0..10000.

export type Variante = "trad" | "rect1990";

// 0..16 directs, 17..19 composes avec trait d'union (pre-1990 deja).
const UNITES = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];
const DIZAINES = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

// 0..99 en orthographe traditionnelle (traits d'union internes, « et » espace).
function sousCent(n: number): string {
  if (n < 20) return UNITES[n];
  if (n < 70) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return DIZAINES[d];
    if (u === 1) return `${DIZAINES[d]} et un`;
    return `${DIZAINES[d]}-${UNITES[u]}`;
  }
  if (n < 80) {
    if (n === 71) return "soixante et onze";
    return `soixante-${UNITES[n - 60]}`;
  }
  // 80..99
  if (n === 80) return "quatre-vingts";
  return `quatre-vingt-${UNITES[n - 80]}`;
}

// 0..999 en orthographe traditionnelle. « cent » prend un « s » s'il est
// multiplie (>= 2) ET termine le groupe (rien derriere).
function sousMille(n: number): string {
  if (n < 100) return sousCent(n);
  const c = Math.floor(n / 100);
  const r = n % 100;
  const cent = c === 1 ? "cent" : `${UNITES[c]} cent${r === 0 ? "s" : ""}`;
  return r === 0 ? cent : `${cent} ${sousCent(r)}`;
}

// 0..10000 en orthographe TRADITIONNELLE (separateurs = espaces).
function enLettresTrad(n: number): string {
  if (n < 1000) return sousMille(n);
  const m = Math.floor(n / 1000);
  const r = n % 1000;
  // m va de 1 a 10 ; « mille » est invariable, jamais precede de « un ».
  const mille = m === 1 ? "mille" : `${sousMille(m)} mille`;
  return r === 0 ? mille : `${mille} ${sousMille(r)}`;
}

// Ecriture d'un nombre dans l'orthographe demandee.
// rect1990 = traditionnelle dont tous les espaces deviennent des traits d'union.
export function enLettresFr(n: number, variante: Variante = "trad"): string {
  const trad = enLettresTrad(n);
  return variante === "trad" ? trad : trad.replace(/ /g, "-");
}

// Normalise une saisie pour la COMPARAISON (decision juste/faux) : minuscules,
// espaces insecables -> espaces, apostrophes typographiques -> droites, espaces
// multiples et de bord supprimes. Les traits d'union et les accents sont
// CONSERVES (ils sont significatifs). Miroir de public.normaliser_lettres.
export function normaliser(s: string): string {
  return s
    .toLowerCase()
    .replace(/[   ]/g, " ") // NBSP, NNBSP, figure space -> espace
    .replace(/[’ʼ‘`]/g, "'") // apostrophes typographiques -> '
    .replace(/\s+/g, " ")
    .trim();
}

// Les deux (ou une) ecritures ACCEPTEES d'un nombre (trad + 1990, dedupliquees
// quand elles coincident, ex. « cent » qui n'a aucun espace).
export function formesAcceptees(n: number): string[] {
  const trad = normaliser(enLettresFr(n, "trad"));
  const rect = normaliser(enLettresFr(n, "rect1990"));
  return trad === rect ? [trad] : [trad, rect];
}

// Decision juste/faux : la saisie normalisee doit egaler l'une des deux
// orthographes acceptees. C'est la MEME regle que verif_lettres cote serveur.
export function estJuste(n: number, saisie: string): boolean {
  return formesAcceptees(n).includes(normaliser(saisie));
}
