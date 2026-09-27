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
