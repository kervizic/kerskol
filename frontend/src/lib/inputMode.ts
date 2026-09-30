// Bascule pave numerique / clavier physique pendant la seance.
// - Appareil tactile sans clavier (pointeur grossier) : pave affiche, la case
//   de reponse est un bouton (jamais un input focalisable -> pas de clavier
//   natif qui s'ouvre).
// - Ordinateur/tablette avec clavier : pave masque, saisie au clavier physique.
// Bascule automatique et reversible en session (une frappe masque le pave, un
// toucher sur la case le reaffiche) ; le choix force via le bouton dedie est
// memorise par appareil (localStorage, try/catch), comme theme/mode.ts.

export type InputMode = "pad" | "keyboard";
const KEY = "kerskol_input_mode";

// --- Entrees-sorties (non testees unitairement, cf. theme/mode.ts) --------
export function prefersCoarsePointer(): boolean {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

export function getStoredInputMode(): InputMode | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "pad" || v === "keyboard" ? v : null;
  } catch {
    return null;
  }
}

export function setStoredInputMode(m: InputMode): void {
  try {
    window.localStorage.setItem(KEY, m);
  } catch {
    /* ignore */
  }
}

// --- Logique pure (testee) -------------------------------------------------

// Mode a l'ouverture de la seance : le choix memorise prime, sinon on se fie
// au type de pointeur de l'appareil.
export function initialInputMode(coarse: boolean, stored: InputMode | null): InputMode {
  return stored ?? (coarse ? "pad" : "keyboard");
}

// Une touche physique (chiffre, Retour arriere, Entree, Tab) pressee pendant
// la seance bascule vers la saisie clavier.
export function onPhysicalKey(current: InputMode): InputMode {
  return current === "pad" ? "keyboard" : current;
}

// Un toucher sur la zone de reponse rebascule vers le pave.
export function onAnswerZoneTouch(current: InputMode): InputMode {
  return current === "keyboard" ? "pad" : current;
}

// Bouton discret : force explicitement l'autre mode.
export function toggleInputMode(current: InputMode): InputMode {
  return current === "pad" ? "keyboard" : "pad";
}
