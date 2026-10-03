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

  it("parent seul -> confirmation de suppression de foyer avec nb de profils", () => {
    expect(
      nextLinkStep({ ok: false, etat: "confirmation_suppression_foyer", nb_profils: 2 })
    ).toEqual({
      kind: "confirm",
      confirmation: { kind: "suppression_foyer", nbProfils: 2 },
    });
  });

  it("confirmation c sans reauth recente -> etape de reconnexion", () => {
    const s = nextLinkStep({ ok: false, etat: "reauth_requise" });
    expect(s.kind).toBe("reauth");
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

  it("suppression foyer : pluriel selon nb de profils", () => {
    expect(confirmationTexte({ kind: "suppression_foyer", nbProfils: 1 })).toMatch(/1 profil\b/);
    expect(confirmationTexte({ kind: "suppression_foyer", nbProfils: 3 })).toMatch(/3 profils/);
  });
});
