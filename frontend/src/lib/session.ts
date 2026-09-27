// Memorise le dernier profil choisi (retour rapide). Protege par try/catch :
// un localStorage indisponible (mode prive, quota) ne doit jamais casser l'app.
// On NE saute JAMAIS l'ecran "Qui joue ?" : cette valeur ne sert qu'a mettre en
// avant une tuile.

const KEY = "kerskol_dernier_profil";

export function getDernierProfil(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setDernierProfil(id: string): void {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
}

export function clearDernierProfil(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// --- Brouillon de creation de profil (sessionStorage, protege par try/catch) --
// Permet de restaurer la saisie apres un rechargement pendant la creation.
const DRAFT_KEY = "kerskol_brouillon_profil";

export function loadDraft<T>(): T | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(value: unknown): void {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
