// Resolution de l'entree dans l'application apres authentification.
//
// Regle : AVANT tout creer_foyer, on demande a la base si le compte connecte
// correspond a un profil enfant (lien en attente consomme, ou deja relie).
//   * enfant  -> on charge SON profil et on l'envoie droit dans son village,
//                sans creer de foyer ni afficher d'ecran de selection.
//   * parent  -> parcours classique : creer_foyer() idempotent + liste des profils.
//
// Module pur (dependances injectees) pour etre teste sans backend ni React.

import type { Profil } from "./types";

export interface EntryDeps {
  rattacherSiAttendu: () => Promise<string | null>;
  getProfilById: (id: string) => Promise<Profil>;
  ensureFoyer: () => Promise<string>;
  listProfils: (foyerId: string) => Promise<Profil[]>;
}

export interface EntryResult {
  mode: "child" | "parent";
  foyerId: string;
  profils: Profil[];
  // Route imposee (enfant -> son village). null pour un parent (routeur libre).
  route: string | null;
}

export function villageRoute(profilId: string): string {
  return `/enfant/${profilId}/village`;
}

export async function resolveEntry(deps: EntryDeps): Promise<EntryResult> {
  const linkedProfilId = await deps.rattacherSiAttendu();
  if (linkedProfilId) {
    const profil = await deps.getProfilById(linkedProfilId);
    return {
      mode: "child",
      foyerId: profil.foyer_id,
      profils: [profil],
      route: villageRoute(profil.id),
    };
  }
  const foyerId = await deps.ensureFoyer();
  const profils = await deps.listProfils(foyerId);
  return { mode: "parent", foyerId, profils, route: null };
}
