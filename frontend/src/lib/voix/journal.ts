// Journal CLIENT des briques audio manquantes rencontrees pendant une session.
//
// But : quand le lecteur refuse de jouer un enonce parce qu'une brique (clip)
// manque, on memorise la liste exacte des cles absentes. Cela aide Manu a savoir
// quels clips restent a enregistrer avec sa voix (cf. docs/audio-manquant.md).
//
// Pur et sans effet de bord visible en production : un simple registre en memoire
// (jamais de console.log en prod ; un avertissement groupe en developpement).

const manquantes = new Set<string>();

// Enregistre des cles absentes. Renvoie true si de NOUVELLES cles ont ete vues.
export function signalerBriquesManquantes(cles: string[]): boolean {
  let nouveau = false;
  for (const c of cles) {
    if (!manquantes.has(c)) {
      manquantes.add(c);
      nouveau = true;
    }
  }
  // Developpement uniquement : trace groupee pour le debogage (jamais en prod).
  if (nouveau && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn("[voix] briques audio manquantes :", [...manquantes].sort().join(", "));
  }
  return nouveau;
}

// Liste (triee) des briques manquantes connues depuis le chargement de la page.
export function briquesManquantesConnues(): string[] {
  return [...manquantes].sort();
}

// Remise a zero (tests).
export function reinitialiserJournalBriques(): void {
  manquantes.clear();
}
