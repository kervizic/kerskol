// Verbalisation cote client : transforme un nombre ou un enonce de calcul en
// SEQUENCE de cles logiques de clips (ex. "num:27", "op:divise"). Pur et teste.
//
// Important : cette decomposition NE depend PAS de l'orthographe. Elle doit
// seulement refleter QUELS clips atomiques existent (nombres 0..999 + milliers
// 1000..10000 + operateurs), ce qui est garanti cote generation par
// tools/tts/nombres_fr.py (fonction decomposer). Le texte francais ("vingt-sept")
// est produit une seule fois a la generation ; le front n'en a jamais besoin.

export const MAX_NOMBRE = 10000;

// glyphes d'operateur rencontres dans les enonces -> cle logique
const OP_GLYPHS: Record<string, string> = {
  "+": "op:plus",
  "-": "op:moins",
  "−": "op:moins", // − (minus U+2212, utilise dans les enonces)
  "×": "op:fois", // ×
  "*": "op:fois",
  "x": "op:fois",
  "÷": "op:divise", // ÷
  "/": "op:divise",
  "=": "op:egale",
};

// amorces verbales reconnues en tete d'enonce (texte -> cle), ordre = priorite
const AMORCES: Array<[RegExp, string]> = [
  [/^combien\s+font\b/i, "amorce:combien-font"],
  [/^combien\s+de\s+fois\b/i, "amorce:combien-de-fois"],
  [/^le\s+double\s+de\b/i, "amorce:le-double-de"],
  [/^la\s+moiti[ée]\s+de\b/i, "amorce:la-moitie-de"],
];

// Decompose un entier 0..10000 en cles de clips (miroir de decomposer()).
export function nombreEnCles(n: number): string[] {
  if (!Number.isInteger(n) || n < 0 || n > MAX_NOMBRE) return [];
  if (n < 1000) return [`num:${n}`];
  const milliers = Math.floor(n / 1000) * 1000;
  const reste = n % 1000;
  return reste ? [`num:${milliers}`, `num:${reste}`] : [`num:${milliers}`];
}

// Transforme un enonce de calcul en sequence de cles de clips, dans l'ordre de
// lecture. Les jetons non reconnus (mots, ponctuation) sont ignores : le lecteur
// saute silencieusement toute cle absente du manifest (l'app marche sans voix).
export function enonceEnCles(prompt: string): string[] {
  if (!prompt) return [];
  const cles: string[] = [];

  // amorce verbale eventuelle en tete
  for (const [re, cle] of AMORCES) {
    if (re.test(prompt.trim())) {
      cles.push(cle);
      break;
    }
  }

  // jetons : nombres entiers (en tolerant les separateurs de milliers que fmt()
  // insere : « 1 234 », « 12 500 » avec espace U+0020, insecable U+00A0 ou fin
  // U+202F) et glyphes d'operateur.
  // On capture la POSITION de chaque jeton pour decider si un glyphe est un vrai
  // operateur arithmetique (colle a un chiffre) ou un simple trait d'union de mot.
  const re = /\d{1,3}(?:[\u0020\u00a0\u202f]\d{3})+|\d+|[+\-−×÷*/=]/g;
  const SEP = /[\u0020\u00a0\u202f]/;
  const estChiffre = (c: string | undefined) => !!c && c >= "0" && c <= "9";
  // vrai si le caractere non-espace le plus proche AVANT (dir -1) ou APRES (dir
  // +1) l'index donne est un chiffre.
  const chiffreVoisin = (s: string, from: number, dir: 1 | -1): boolean => {
    let i = from;
    while (i >= 0 && i < s.length && SEP.test(s[i])) i += dir;
    return estChiffre(s[i]);
  };
  let m: RegExpExecArray | null;
  while ((m = re.exec(prompt)) !== null) {
    const j = m[0];
    if (/\d/.test(j)) {
      const n = parseInt(j.replace(/[\u0020\u00a0\u202f]/g, ""), 10);
      const sousCles = nombreEnCles(n);
      // Un nombre hors catalogue (> MAX_NOMBRE) n'a pas de brique. On NE l'omet
      // PAS : on pousse une cle volontairement absente du manifest, pour que la
      // phrase entiere devienne non jouable (bouton grise) plutot que de lire
      // l'operateur sans son nombre (bug prod du 27/10 : la voix disait « moins »
      // sans les nombres sur un ancien catalogue incomplet).
      cles.push(...(sousCles.length ? sousCles : [`num:${n}`]));
    } else {
      const op = OP_GLYPHS[j];
      if (!op) continue;
      // Un glyphe n'est un operateur que s'il touche un chiffre (a gauche OU a
      // droite). Sinon c'est de la ponctuation / un trait d'union de mot : on
      // l'ignore, pour ne jamais lire un operateur isole dans une phrase en prose
      // (enonce EMC, conjugaison...). Bug prod du 27/10 : « Que fais-tu ? » lisait
      // « moins » a cause du trait d'union de « fais-tu ».
      if (chiffreVoisin(prompt, m.index - 1, -1) || chiffreVoisin(prompt, re.lastIndex, 1)) {
        cles.push(op);
      }
    }
  }
  return cles;
}

// --- Lecture des CORRECTIONS par ASSEMBLAGE de briques --------------------
// Une correction de maths ("Je pars du plus grand, 7, et j'ajoute 2, ca fait
// 9.") se lit en assemblant des briques : fragments de phrase REUTILISABLES
// (frag:*), nombres (num:*) et operateurs (op:*). On evite ainsi d'attendre un
// clip entier par calcul : seuls les quelques fragments fixes sont a generer,
// les nombres 0..10000 existant deja.
//
// Regle d'or identique au reste de la voix : la sequence n'est JOUABLE que si
// TOUTES ses briques existent (cf. sequenceJouable) -> sinon repli sur le clip
// prose entier, sinon rien. JAMAIS de lecture partielle. Pour la garantir, tout
// element non restituable par des briques (decimale « 2,5 », nombre > 10000,
// comparateur « < » « > » « ≈ » sans brique) pousse une cle VOLONTAIREMENT
// absente du manifest, ce qui rend la phrase entiere non jouable en briques.

const FRAG_BORDS = /^[\s.,;:!?()«»"“”„'’\-–—…]+|[\s.,;:!?()«»"“”„'’\-–—…]+$/g;

// Nettoie un fragment de phrase : retire la ponctuation/espaces de BORD (la
// ponctuation interne, apostrophes et traits d'union de mots sont conserves).
export function nettoyerFragment(raw: string): string {
  return raw.replace(FRAG_BORDS, "").replace(/\s+/g, " ").trim();
}

// Cle logique stable d'un fragment : minuscule, sans accent, non-alphanum -> "-".
// Identique des deux cotes (mesure de couverture + lecteur runtime) : c'est le
// SEUL contrat avec la generation, qui range le clip sous cette meme cle.
export function slugFragment(f: string): string {
  return f
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// glyphes arithmetiques rencontres dans les corrections (sur-ensemble des
// operateurs d'enonce : ajoute les comparateurs, qui n'ont pas de brique).
const CORR_GLYPHS = /[+\-−×÷*/=<>]|≈/;

interface ScanCorrection {
  cles: string[];
  frags: { cle: string; texte: string }[];
}

function scanCorrection(texte: string): ScanCorrection {
  const cles: string[] = [];
  const frags: { cle: string; texte: string }[] = [];
  if (!texte) return { cles, frags };
  // nombres (milliers « 1 234 » / decimales « 2,5 » / entiers) puis glyphes.
  const re = /\d{1,3}(?:[   ]\d{3})+|\d+[.,]\d+|\d+|[+\-−×÷*/=<>]|≈/g;
  const SEP = /[   ]/;
  const estChiffre = (c: string | undefined) => !!c && c >= "0" && c <= "9";
  const chiffreVoisin = (s: string, from: number, dir: 1 | -1): boolean => {
    let i = from;
    while (i >= 0 && i < s.length && SEP.test(s[i])) i += dir;
    return estChiffre(s[i]);
  };
  const pousserFrag = (raw: string) => {
    const f = nettoyerFragment(raw);
    if (!f) return; // ponctuation pure : aucun son, aucune brique necessaire
    const slug = slugFragment(f);
    if (!slug) {
      cles.push("frag:_symbole"); // symbole sans mot (« € », « % ») : pas de brique -> non jouable
      return;
    }
    const cle = `frag:${slug}`;
    cles.push(cle);
    frags.push({ cle, texte: f });
  };
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texte)) !== null) {
    const j = m[0];
    if (/^\d/.test(j)) {
      pousserFrag(texte.slice(last, m.index));
      last = re.lastIndex;
      if (/[.,]/.test(j)) {
        cles.push("num:_decimal"); // decimale : aucune brique -> phrase non jouable
      } else {
        const n = parseInt(j.replace(/[   ]/g, ""), 10);
        const sous = nombreEnCles(n);
        cles.push(...(sous.length ? sous : [`num:${n}`])); // > MAX_NOMBRE -> cle absente
      }
    } else if (CORR_GLYPHS.test(j)) {
      // Un glyphe n'est arithmetique que s'il touche un chiffre ; sinon c'est un
      // trait d'union de mot ou de la ponctuation : on le LAISSE dans le fragment
      // (bug prod du 27/10 : « fais-tu » lu « moins »).
      if (!(chiffreVoisin(texte, m.index - 1, -1) || chiffreVoisin(texte, re.lastIndex, 1))) {
        continue;
      }
      pousserFrag(texte.slice(last, m.index));
      last = re.lastIndex;
      cles.push(OP_GLYPHS[j] ?? "op:_sans_brique"); // < > ≈ : pas de brique -> non jouable
    }
  }
  pousserFrag(texte.slice(last));
  return { cles, frags };
}

// Sequence de briques pour lire une CORRECTION (ou une phrase de lecon avec des
// nombres). Jouable seulement si toutes les briques existent (cf. ci-dessus).
export function correctionEnCles(texte: string): string[] {
  return scanCorrection(texte).cles;
}

// Fragments de phrase (frag:*) d'une correction, avec leur texte a generer, dans
// l'ordre de lecture. Sert a lister les briques de phrase a produire.
export function fragmentsDeCorrection(texte: string): { cle: string; texte: string }[] {
  return scanCorrection(texte).frags;
}
