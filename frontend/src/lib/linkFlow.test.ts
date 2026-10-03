import { describe, it, expect } from "vitest";
import { confirmationTexte, nextLinkStep } from "./linkFlow";

describe("nextLinkStep (rattachement par code, migration 0020)", () => {
  it("bon code, compte libre -> valide (recharge l'app)", () => {
    expect(nextLinkStep({ ok: true, profil_id: "p1" })).toEqual({ kind: "validated" });
  });

  it("deja relie ailleurs -> ecran de confirmation (autre profil)", () => {
    expect(nextLinkStep({ ok: false, etat: "confirmation_autre_profil" })).toEqual({
      kind: "confirm",
      confirmation: { kind: "autre_profil" },
    });
  });

  it("parent seul (cas c) -> confirmation de FUSION (jamais de reauth) avec les profils", () => {
    const profils = [{ id: "a", surnom: "Alpha" }, { id: "b", surnom: "Beta" }];
    const s = nextLinkStep({
      ok: false,
      etat: "confirmation_fusion",
      nb_profils: 2,
      profils_source: profils,
    });
    expect(s).toEqual({
      kind: "confirm",
      confirmation: { kind: "fusion", nbProfils: 2, profils },
    });
    // Bug corrige : le cas c ne passe PLUS par une reconnexion Google (donc pas
    // de retour qui redemanderait le code). Il va directement a la confirmation.
    expect(s.kind).not.toBe("reauth");
  });

  it("fusion a un seul profil -> confirmation sans choix (liste par defaut vide)", () => {
    const s = nextLinkStep({ ok: false, etat: "confirmation_fusion", nb_profils: 1 });
    expect(s).toEqual({
      kind: "confirm",
      confirmation: { kind: "fusion", nbProfils: 1, profils: [] },
    });
  });

  it("foyer partage -> terminal avec message clair", () => {
    const s = nextLinkStep({ ok: false, etat: "refus_foyer_partage" });
    expect(s.kind).toBe("terminal");
    if (s.kind === "terminal") expect(s.message).toMatch(/espace partagé/);
  });

  it("5 mauvais codes -> terminal (annule)", () => {
    const s = nextLinkStep({ ok: false, etat: "annule" });
    expect(s.kind).toBe("terminal");
  });

  it("lien expire/consomme -> terminal (aucun)", () => {
    const s = nextLinkStep({ ok: false, etat: "aucun" });
    expect(s.kind).toBe("terminal");
  });

  it("email non confirme -> erreur recuperable sans vider le code", () => {
    const s = nextLinkStep({ ok: false, etat: "email_non_confirme" });
    expect(s).toMatchObject({ kind: "error", clearCode: false });
  });

  it("mauvais code -> erreur, vide le champ, affiche les essais restants", () => {
    const s = nextLinkStep({ ok: false, etat: "code_invalide", essais_restants: 3 });
    expect(s).toMatchObject({ kind: "error", clearCode: true });
    if (s.kind === "error") expect(s.message).toMatch(/3 essais/);
  });

  it("mauvais code, 1 essai restant -> singulier", () => {
    const s = nextLinkStep({ ok: false, etat: "code_invalide", essais_restants: 1 });
    if (s.kind === "error") expect(s.message).toMatch(/1 essai\b/);
  });
});

describe("confirmationTexte (aucune info de foyer tiers)", () => {
  it("autre profil : message neutre", () => {
    expect(confirmationTexte({ kind: "autre_profil" })).toMatch(/déjà relié à un autre profil/);
  });

  it("fusion : un profil -> message de regroupement, sans parler de suppression", () => {
    const t = confirmationTexte({ kind: "fusion", nbProfils: 1, profils: [] });
    expect(t).toMatch(/regroupés dans ce profil/);
    expect(t).not.toMatch(/supprim/i);
  });

  it("fusion : plusieurs profils -> invite a choisir l'espace a regrouper", () => {
    const t = confirmationTexte({
      kind: "fusion",
      nbProfils: 2,
      profils: [{ id: "a", surnom: "Alpha" }, { id: "b", surnom: "Beta" }],
    });
    expect(t).toMatch(/Choisis l'espace à regrouper/);
  });
});
