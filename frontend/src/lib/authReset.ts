// Decision PURE : que faire d'un evenement supabase onAuthStateChange ?
//
// Regle : un evenement pour le MEME utilisateur (TOKEN_REFRESHED, SIGNED_IN
// reemis au retour de focus, INITIAL_SESSION, USER_UPDATED) ne doit JAMAIS
// reinitialiser la navigation ni l'etat de saisie. On ne (re)bootstrap que si
// l'utilisateur CHANGE (nouvelle connexion) ; on repasse en public sur
// SIGNED_OUT (ou session nulle).

export type AuthAction = "ignore" | "signed_out" | "user_changed";

// Cles a CONSERVER a la deconnexion (preferences par appareil, pas de donnee
// personnelle) : theme et mode de saisie. Tout le reste des cles kerskol_* est
// purge (brouillons, derniere seance, dernier profil, file de reponses...).
const STORAGE_KEEP = new Set(["kerskol_theme", "kerskol_input_mode"]);

function purgeStore(store: Storage | undefined): void {
  if (!store) return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key && key.startsWith("kerskol_") && !STORAGE_KEEP.has(key)) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => store.removeItem(k));
  } catch {
    /* localStorage/sessionStorage indisponible (mode prive, quota) : ignore */
  }
}

// Purge les cles kerskol_* de localStorage ET sessionStorage a la deconnexion,
// sauf le theme et la preference de saisie. La session Supabase (cles sb-*) est
// geree par supabase.auth.signOut() lui-meme.
export function purgeKerskolStorage(): void {
  if (typeof window === "undefined") return;
  purgeStore(window.localStorage);
  purgeStore(window.sessionStorage);
}

export function authAction(
  prevUserId: string | null,
  event: string,
  newUserId: string | null
): AuthAction {
  if (event === "SIGNED_OUT" || newUserId === null) return "signed_out";
  // Premiere identification (prev null) OU bascule vers un autre compte.
  if (prevUserId === null || newUserId !== prevUserId) return "user_changed";
  // Meme utilisateur : rafraichissement de jeton, focus, session initiale...
  return "ignore";
}
