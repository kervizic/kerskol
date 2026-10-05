import { describe, it, expect } from "vitest";
import { choisirTexteDictee, notionCible, type ContexteDictee } from "./selection-dictee";
import type { DicteeTexte } from "./dictee";

const ORDRE = [
  "pluriel", "son_sont", "a_a", "et_est", "m_mbp", "ces_ses",
  "on_ont", "verbe_ent", "ce_se", "accord", "pluriel_al_aux", "e_er_ez",
];

function txt(over: Partial<DicteeTexte>): DicteeTexte {
  return { id: 1, niveau: 1, theme: "animaux", mots: ["le", "chat"], nbErreurs: 1, notion: "pluriel", ...over };
}
const rng0 = () => 0; // deterministe : 1er du groupe

describe("notionCible : lacunes > frontiere > revision", () => {
  it("LACUNE prioritaire (plus d'echecs, a egalite la plus en amont)", () => {
    const ctx: ContexteDictee = {
      niveau: 1, ordre: ORDRE,
      maitrise: { pluriel: true, son_sont: true },
      lacunes: { a_a: 1, et_est: 3 },
    };
    expect(notionCible(ctx)).toBe("et_est");
  });
  it("FRONTIERE : 1re notion non maitrisee dans l'ordre", () => {
    const ctx: ContexteDictee = {
      niveau: 1, ordre: ORDRE,
      maitrise: { pluriel: true, son_sont: true }, // frontiere = a_a
    };
    expect(notionCible(ctx)).toBe("a_a");
  });
  it("REVISION quand tout est maitrise", () => {
    const maitrise: Record<string, boolean> = {};
    ORDRE.forEach((n) => (maitrise[n] = true));
    expect(notionCible({ niveau: 1, ordre: ORDRE, maitrise })).toBe("revision");
  });
  it("sans suivi : frontiere = 1re notion de l'ordre", () => {
    expect(notionCible({ niveau: 1, ordre: ORDRE })).toBe("pluriel");
  });
});

describe("choisirTexteDictee : par niveau, cible la notion, pas de repetition", () => {
  it("sert un texte de la notion CIBLE (frontiere)", () => {
    const bank = [
      txt({ id: 1, notion: "pluriel" }),
      txt({ id: 2, notion: "son_sont" }),
    ];
    const ctx: ContexteDictee = { niveau: 1, ordre: ORDRE, maitrise: { pluriel: true } };
    expect(choisirTexteDictee(bank, ctx, rng0)?.id).toBe(2); // frontiere = son_sont
  });

  it("LACUNE : sert la notion la plus en difficulte", () => {
    const bank = [
      txt({ id: 1, notion: "pluriel" }),
      txt({ id: 2, notion: "accord" }),
      txt({ id: 3, notion: "verbe_ent" }),
    ];
    const ctx: ContexteDictee = {
      niveau: 1, ordre: ORDRE, lacunes: { accord: 2, pluriel: 1 },
    };
    expect(choisirTexteDictee(bank, ctx, rng0)?.id).toBe(2);
  });

  it("PAS de repetition : evite un texte recemment vu si alternative", () => {
    const bank = [
      txt({ id: 1, notion: "pluriel" }),
      txt({ id: 2, notion: "pluriel" }),
    ];
    const ctx: ContexteDictee = { niveau: 1, ordre: ORDRE, vus: [1] };
    expect(choisirTexteDictee(bank, ctx, rng0)?.id).toBe(2);
  });

  it("repetition toleree si tout est vu (jamais de blocage)", () => {
    const bank = [txt({ id: 1 }), txt({ id: 2 })];
    const ctx: ContexteDictee = { niveau: 1, ordre: ORDRE, vus: [1, 2] };
    expect(choisirTexteDictee(bank, ctx, rng0)).not.toBeNull();
  });

  it("repli de NIVEAU : prend le niveau disponible le plus proche", () => {
    const bank = [
      txt({ id: 1, niveau: 2, notion: "pluriel" }),
      txt({ id: 2, niveau: 4, notion: "pluriel" }),
    ];
    const ctx: ContexteDictee = { niveau: 3, ordre: ORDRE };
    expect(choisirTexteDictee(bank, ctx, rng0)?.niveau).toBe(2);
  });

  it("repli de NOTION : si aucun texte de la cible au niveau, prend un autre", () => {
    const bank = [txt({ id: 1, niveau: 1, notion: "pluriel" })];
    const ctx: ContexteDictee = { niveau: 1, ordre: ORDRE, maitrise: { pluriel: true } }; // cible = son_sont, absent
    expect(choisirTexteDictee(bank, ctx, rng0)?.id).toBe(1);
  });

  it("banque vide -> null", () => {
    expect(choisirTexteDictee([], { niveau: 1, ordre: ORDRE })).toBeNull();
  });

  it("aucune logique de date : un texte est servi meme sans suivi", () => {
    const bank = [txt({ id: 7, notion: "pluriel" })];
    expect(choisirTexteDictee(bank, { niveau: 1, ordre: ORDRE }, rng0)?.id).toBe(7);
  });
});
