// Nettoyage du texte pour la voix — MIROIR EXACT de tools/tts/nettoyage.py
// (fonction `nettoyer`). Doit rester identique des deux cotes : le front derive
// la cle de lecture d'un texte en prose a partir de son texte AFFICHE nettoye,
// et la generation range le clip sous ce meme texte nettoye (clips[id].text).
// Toute divergence rendrait un clip existant introuvable cote front.
//
// Regles (imposees par Manu) : retirer les guillemets « » " " et l'espace
// associee ; pas d'espace apres une apostrophe d'elision ; © -> copyright ;
// ( et ) -> virgules ; reduction des espaces.

export function nettoyer(t: string): string {
  if (!t) return "";
  // 1) guillemets ouvrants (« et courbes) : retirer avec l'espace interne
  t = t.replace(/[«“„]\s*/g, "");
  t = t.replace(/\s*[»”]/g, "");
  // 2) guillemets droits : retirer le caractere
  t = t.replace(/"/g, "");
  // 3) espace parasite apres une apostrophe d'elision
  t = t.replace(/(['’])\s+/g, (_m, p1) => p1);
  // 4) copyright
  t = t.replace(/©/g, "copyright ");
  // 4bis) parentheses a lire -> incise entre virgules
  t = t.replace(/\s*\(\s*/g, ", ");
  t = t.replace(/\s*\)\s*/g, ", ");
  // 5) espaces + ponctuation
  t = t.replace(/\s+/g, " ");
  t = t.replace(/,\s*([,.;:!?])/g, "$1");
  t = t.replace(/\s+([,.])/g, "$1");
  t = t.replace(/\s*([;:!?])/g, " $1");
  t = t.replace(/^\s*,\s*/g, "");
  t = t.replace(/\s*,\s*$/g, "");
  return t.trim();
}
