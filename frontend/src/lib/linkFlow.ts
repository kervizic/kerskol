// Logique PURE de l'ecran de rattachement par code (LinkCode) : traduit le
// resultat d'une tentative de validation (ValidationLien, migration 0020) en
// une etape d'interface. Isole ici pour etre teste sans DOM ni backend.

import type { ValidationLien } from "./api";

export type Confirmation =
  | { kind: "autre_profil" }
  // Cas c (migration 0021) : fusion de l'ancien espace du compte dans ce profil.
  // profils = profils de l'ancien foyer (c'est SON foyer) ; l'enfant choisit la
  // source si plus d'un. Aucune donnee n'est perdue, aucune reauth exigee.
  | { kind: "fusion"; nbProfils: number; profils: { id: string; surnom: string }[] };

export type LinkStep =
  // Compte relie -> on recharge l'app (village).
  | { kind: "validated" }
  // Confirmation requise avant une action sensible (cas b ou c/fusion).
  | { kind: "confirm"; confirmation: Confirmation }
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
    case "confirmation_fusion":
      return {
        kind: "confirm",
        confirmation: {
          kind: "fusion",
          nbProfils: r.nb_profils ?? 0,
          profils: r.profils_source ?? [],
        },
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

// Texte de l'ecran de confirmation (cas b / c). Cas c = c'est SON propre espace,
// donc on peut nommer ses profils ; rien n'est perdu (fusion).
export function confirmationTexte(c: Confirmation): string {
  if (c.kind === "autre_profil") {
    return "Ce compte est déjà relié à un autre profil. Le relier à celui-ci ?";
  }
  if (c.nbProfils > 1) {
    return "Tes progrès de ton ancien espace seront regroupés dans ce profil. Choisis l'espace à regrouper : les autres seront supprimés.";
  }
  return "Tes progrès de ton ancien espace seront regroupés dans ce profil.";
}
