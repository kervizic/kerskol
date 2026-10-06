// Surcharge LOCALE (par profil, par appareil) du reglage de lecture auto.
//
// Le reglage parent (profil.lecture_auto) reste la valeur PAR DEFAUT. L'enfant
// peut la basculer depuis l'ecran d'exercice ; son choix est memorise localement
// pour CE profil (localStorage, try/catch, comme lib/inputMode.ts) et prime sur
// le defaut. Pas de nouvelle migration : reglage volatil cote appareil.

const PREFIX = "kerskol_lecture_auto:";

// --- Entrees-sorties (non testees, cf. inputMode.ts) ----------------------
export function getStoredLectureAuto(profilId: string): boolean | null {
  try {
    const v = window.localStorage.getItem(PREFIX + profilId);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}

export function setStoredLectureAuto(profilId: string, on: boolean): void {
  try {
    window.localStorage.setItem(PREFIX + profilId, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

// --- Logique pure (testee) -------------------------------------------------
// Valeur effective : la surcharge locale prime ; sinon le defaut (reglage parent).
export function effectiveLectureAuto(surcharge: boolean | null, parDefaut: boolean): boolean {
  return surcharge ?? parDefaut;
}
