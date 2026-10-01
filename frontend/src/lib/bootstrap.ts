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

export interface StatutLien {
  etat: "relie" | "en_attente" | "email_non_confirme" | "aucun";
  profil_id?: string;
}

export interface EntryDeps {
  // Etat du compte vis-a-vis d'un lien enfant, SANS rattachement automatique.
  statutLienEnfant: () => Promise<StatutLien>;
  getProfilById: (id: string) => Promise<Profil>;
  ensureFoyer: () => Promise<string>;
  listProfils: (foyerId: string) => Promise<Profil[]>;
}

export type EntryMode =
  | "child" // enfant relie -> son village
  | "child_pending" // lien en attente -> ecran de saisie du code
  | "parent" // parcours parent classique
  | "inscriptions_fermees" // creer_foyer refuse (lancement public non ouvert)
  | "email_non_confirme"; // email non confirme, validation impossible

export interface EntryResult {
  mode: EntryMode;
  foyerId: string | null;
  profils: Profil[];
  // Route imposee (enfant -> village ; lien en attente -> /relier). null sinon.
  route: string | null;
}

export function villageRoute(profilId: string): string {
  return `/enfant/${profilId}/village`;
}

export const LINK_ROUTE = "/relier";

export async function resolveEntry(deps: EntryDeps): Promise<EntryResult> {
  const statut = await deps.statutLienEnfant();

  if (statut.etat === "relie" && statut.profil_id) {
    const profil = await deps.getProfilById(statut.profil_id);
    return {
      mode: "child",
      foyerId: profil.foyer_id,
      profils: [profil],
      route: villageRoute(profil.id),
    };
  }
  if (statut.etat === "en_attente") {
    return { mode: "child_pending", foyerId: null, profils: [], route: LINK_ROUTE };
  }
  if (statut.etat === "email_non_confirme") {
    return { mode: "email_non_confirme", foyerId: null, profils: [], route: null };
  }

  // Aucun lien : parcours parent. creer_foyer peut refuser (inscriptions fermees).
  try {
    const foyerId = await deps.ensureFoyer();
    const profils = await deps.listProfils(foyerId);
    return { mode: "parent", foyerId, profils, route: null };
  } catch (e) {
    if ((e as { code?: string })?.code === "inscriptions_fermees") {
      return { mode: "inscriptions_fermees", foyerId: null, profils: [], route: null };
    }
    throw e;
  }
}
