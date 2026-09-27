// Decision PURE : que faire d'un evenement supabase onAuthStateChange ?
//
// Regle : un evenement pour le MEME utilisateur (TOKEN_REFRESHED, SIGNED_IN
// reemis au retour de focus, INITIAL_SESSION, USER_UPDATED) ne doit JAMAIS
// reinitialiser la navigation ni l'etat de saisie. On ne (re)bootstrap que si
// l'utilisateur CHANGE (nouvelle connexion) ; on repasse en public sur
// SIGNED_OUT (ou session nulle).

export type AuthAction = "ignore" | "signed_out" | "user_changed";

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
