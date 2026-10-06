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

  // jetons : nombres entiers et glyphes d'operateur
  const jetons = prompt.match(/\d+|[+\-−×÷*/=]/g) || [];
  for (const j of jetons) {
    if (/^\d+$/.test(j)) {
      const n = parseInt(j, 10);
      if (n <= MAX_NOMBRE) cles.push(...nombreEnCles(n));
      // un nombre > 10000 n'a pas de clip : on l'omet (pas de voix sur ce jeton)
    } else {
      const op = OP_GLYPHS[j];
      if (op) cles.push(op);
    }
  }
  return cles;
}
