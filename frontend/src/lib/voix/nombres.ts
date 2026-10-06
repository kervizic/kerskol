// Verbalisation des nombres 0..10000 en francais. Port EXACT de
// tools/tts/nombres_fr.py (nombre_en_lettres) : sert au decoupage toks() cote
// front (les chiffres doivent devenir les memes mots que ceux synthetises) et au
// futur exercice de lecture. Graphie classique (pas les rectifications 1990).

const UNITES = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];
const DIZAINES: Record<number, string> = {
  2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante", 8: "quatre-vingt",
};

function deuxChiffres(n: number): string {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7 || d === 9) {
    const base = d === 7 ? "soixante" : "quatre-vingt";
    const reste = 10 + u;
    if (d === 7 && u === 1) return "soixante et onze";
    return `${base}-${UNITES[reste]}`;
  }
  const mot = DIZAINES[d];
  if (u === 0) return d === 8 ? "quatre-vingts" : mot;
  if (u === 1 && d >= 2 && d <= 6) return `${mot} et un`;
  return `${mot}-${UNITES[u]}`;
}

function troisChiffres(n: number): string {
  const c = Math.floor(n / 100);
  const r = n % 100;
  if (c === 0) return deuxChiffres(r);
  const cent = c === 1 ? "cent" : `${UNITES[c]} cent`;
  if (r === 0) return cent + (c > 1 ? "s" : "");
  return `${cent} ${deuxChiffres(r)}`;
}

export function nombreEnLettres(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 10000) return String(n);
  if (n < 1000) return troisChiffres(n);
  const m = Math.floor(n / 1000);
  const r = n % 1000;
  const mille = m === 1 ? "mille" : `${troisChiffres(m)} mille`;
  return r === 0 ? mille : `${mille} ${troisChiffres(r)}`;
}
