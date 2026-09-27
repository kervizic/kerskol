// Logique PURE de decision d'application d'une mise a jour de version.
// On applique UNIQUEMENT si une nouvelle version existe ET que l'ecran n'est
// pas « occupe » (creation de profil, reglages en cours d'edition, seance).
// Sinon on attend un moment sur (transition d'ecran non occupe).
export function shouldApplyUpdate(
  busy: boolean,
  current: string,
  latest: string | null | undefined
): boolean {
  if (!latest) return false; // reponse illisible -> ne rien faire
  if (latest === current) return false; // deja a jour
  return !busy; // nouvelle version : appliquer si non occupe, sinon attendre
}
