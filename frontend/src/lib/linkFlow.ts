// Logique PURE de l'ecran de rattachement par code (LinkCode) : traduit le
// resultat d'une tentative de validation (ValidationLien, migration 0020) en
// une etape d'interface. Isole ici pour etre teste sans DOM ni backend.

import type { ValidationLien } from "./api";

export type Confirmation =
  | { kind: "autre_profil" }
  | { kind: "suppression_foyer"; nbProfils: number };

export type LinkStep =
  // Compte relie -> on recharge l'app (village).
  | { kind: "validated" }
  // Confirmation requise avant une action destructrice (cas b ou c).
  | { kind: "confirm"; confirmation: Confirmation }
  // Cas c : reconnexion Google recente exigee avant de confirmer.
  | { kind: "reauth"; message: string }
  // Fin de parcours (refus foyer partage, 5 essais, lien expire) : plus de saisie.
  | { kind: "terminal"; message: string }
  // Erreur recuperable : message + faut-il vider le champ code ?
  | { kind: "error"; message: string; clearCode: boolean };

export function essaisMessage(reste: number | undefined): string {
  return reste != null
    ? `Code incorrect. Il te reste ${reste} essai${reste > 1 ? "s" : ""}.`
    : "Code incorrect.";
}

export function nextLinkStep(r: ValidationLien): LinkStep {
  if (r.ok) return { kind: "validated" };

  switch (r.etat) {
    case "confirmation_autre_profil":
      return { kind: "confirm", confirmation: { kind: "autre_profil" } };
    case "confirmation_suppression_foyer":
      return {
        kind: "confirm",
        confirmation: { kind: "suppression_foyer", nbProfils: r.nb_profils ?? 0 },
      };
    case "reauth_requise":
      return {
        kind: "reauth",
        message: "Pour ta sécurité, reconnecte-toi avec Google pour confirmer.",
      };
    case "refus_foyer_partage":
      return {
        kind: "terminal",
        message:
          "Ce compte gère un espace partagé avec d'autres parents, il ne peut pas devenir un compte enfant.",
      };
    case "annule":
      return { kind: "terminal", message: "Trop d'essais. Demande à un parent de recommencer." };
    case "aucun":
      return { kind: "terminal", message: "Ce lien n'est plus valable." };
    case "email_non_confirme":
      return {
        kind: "error",
        message: "Confirme d'abord ton adresse e-mail, puis réessaie.",
        clearCode: false,
      };
    case "code_invalide":
      return { kind: "error", message: essaisMessage(r.essais_restants), clearCode: true };
    default:
      return { kind: "error", message: essaisMessage(r.essais_restants), clearCode: true };
  }
}

// Texte de l'ecran de confirmation (cas b / c), sans aucune info de foyer tiers.
export function confirmationTexte(c: Confirmation): string {
  if (c.kind === "autre_profil") {
    return "Ce compte est déjà relié à un autre profil. Le relier à celui-ci ?";
  }
  return `Ce compte gère déjà son propre espace Kerskol (${c.nbProfils} profil${
    c.nbProfils > 1 ? "s" : ""
  }). Le rattacher en tant qu'enfant supprimera cet espace et ses profils.`;
}
