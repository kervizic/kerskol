import { describe, it, expect } from "vitest";
import { enLettresFr, formesAcceptees, estJuste } from "./lettres";
import { diagnostiquer, type TypeFaute } from "./diagnostic";

// GOLDEN partage (orthographe TRADITIONNELLE). Les MEMES chaines exactes sont
// verifiees cote SQL (supabase/tests/lettres_test.sql) : c'est le test CROISE
// qui garantit que le generateur front et public.nombre_en_lettres produisent
// les memes ecritures. Couvre toutes les branches d'accord et de liaison.
export const GOLDEN: [number, string][] = [
  [0, "zéro"], [1, "un"], [5, "cinq"], [10, "dix"], [11, "onze"], [16, "seize"],
  [17, "dix-sept"], [19, "dix-neuf"], [20, "vingt"], [21, "vingt et un"],
  [22, "vingt-deux"], [30, "trente"], [31, "trente et un"], [40, "quarante"],
  [41, "quarante et un"], [50, "cinquante"], [51, "cinquante et un"],
  [60, "soixante"], [61, "soixante et un"], [69, "soixante-neuf"],
  [70, "soixante-dix"], [71, "soixante et onze"], [72, "soixante-douze"],
  [76, "soixante-seize"], [77, "soixante-dix-sept"], [79, "soixante-dix-neuf"],
  [80, "quatre-vingts"], [81, "quatre-vingt-un"], [82, "quatre-vingt-deux"],
  [90, "quatre-vingt-dix"], [91, "quatre-vingt-onze"], [99, "quatre-vingt-dix-neuf"],
  [100, "cent"], [101, "cent un"], [120, "cent vingt"], [123, "cent vingt-trois"],
  [171, "cent soixante et onze"], [180, "cent quatre-vingts"], [199, "cent quatre-vingt-dix-neuf"],
  [200, "deux cents"], [201, "deux cent un"], [280, "deux cent quatre-vingts"],
  [300, "trois cents"], [301, "trois cent un"], [999, "neuf cent quatre-vingt-dix-neuf"],
  [1000, "mille"], [1001, "mille un"], [1100, "mille cent"], [1180, "mille cent quatre-vingts"],
  [1200, "mille deux cents"], [1221, "mille deux cent vingt et un"],
  [1980, "mille neuf cent quatre-vingts"], [2000, "deux mille"], [2001, "deux mille un"],
  [2080, "deux mille quatre-vingts"], [2200, "deux mille deux cents"],
  [2300, "deux mille trois cents"], [2321, "deux mille trois cent vingt et un"],
  [3000, "trois mille"], [5555, "cinq mille cinq cent cinquante-cinq"],
  [8888, "huit mille huit cent quatre-vingt-huit"], [9999, "neuf mille neuf cent quatre-vingt-dix-neuf"],
  [10000, "dix mille"],
  // Spread pseudo-aleatoire fixe sur 0..10000 (couverture large).
  [37, "trente-sept"], [148, "cent quarante-huit"], [256, "deux cent cinquante-six"],
  [512, "cinq cent douze"], [742, "sept cent quarante-deux"], [1024, "mille vingt-quatre"],
  [1515, "mille cinq cent quinze"], [2718, "deux mille sept cent dix-huit"],
  [3141, "trois mille cent quarante et un"], [4096, "quatre mille quatre-vingt-seize"],
  [6400, "six mille quatre cents"], [7000, "sept mille"], [7071, "sept mille soixante et onze"],
  [8191, "huit mille cent quatre-vingt-onze"], [9090, "neuf mille quatre-vingt-dix"],
];

describe("enLettresFr : orthographe traditionnelle (golden)", () => {
  it("produit la bonne ecriture pour chaque cas du golden", () => {
    for (const [n, mot] of GOLDEN) expect(enLettresFr(n, "trad")).toBe(mot);
  });
  it("forme 1990 = forme traditionnelle, espaces -> traits d'union", () => {
    for (const [n] of GOLDEN) {
      expect(enLettresFr(n, "rect1990")).toBe(enLettresFr(n, "trad").replace(/ /g, "-"));
    }
    expect(enLettresFr(21, "rect1990")).toBe("vingt-et-un");
    expect(enLettresFr(2321, "rect1990")).toBe("deux-mille-trois-cent-vingt-et-un");
  });
});

describe("invariants pleine plage 0..10000", () => {
  it("1990 = trad(espaces->traits), et les deux formes sont acceptees", () => {
    for (let n = 0; n <= 10000; n++) {
      const trad = enLettresFr(n, "trad");
      const rect = enLettresFr(n, "rect1990");
      expect(rect).toBe(trad.replace(/ /g, "-"));
      expect(estJuste(n, trad)).toBe(true);
      expect(estJuste(n, rect)).toBe(true);
    }
  });
  it("accepte espaces insecables, majuscules et espaces en trop", () => {
    expect(estJuste(2321, "  Deux mille  trois cent VINGT et un ")).toBe(true);
    expect(estJuste(80, "Quatre-Vingts")).toBe(true);
  });
  it("formesAcceptees : une seule forme quand pas d'espace", () => {
    expect(formesAcceptees(100)).toEqual(["cent"]);
    expect(formesAcceptees(80)).toEqual(["quatre-vingts"]);
    expect(formesAcceptees(21)).toHaveLength(2);
  });
});

describe("estJuste : trad ET 1990 acceptees, fautes refusees", () => {
  it("accepte les deux orthographes", () => {
    expect(estJuste(203, "deux cent trois")).toBe(true);
    expect(estJuste(203, "deux-cent-trois")).toBe(true);
  });
  it("refuse accord, trait d'union et orthographe fautifs", () => {
    expect(estJuste(200, "deux cent")).toBe(false); // s manquant
    expect(estJuste(23, "vingt trois")).toBe(false); // trait manquant
    expect(estJuste(21, "vingt-un")).toBe(false); // et manquant
    expect(estJuste(3000, "trois milles")).toBe(false); // s a mille
    expect(estJuste(60, "soixant")).toBe(false); // mot mal ecrit
  });
});

// --- 40+ cas : saisie tapee -> type de faute attendu ------------------------
type Cas = [n: number, saisie: string, attendu: TypeFaute | "JUSTE"];
const CAS: Cas[] = [
  // JUSTE (trad + 1990)
  [21, "vingt et un", "JUSTE"],
  [21, "vingt-et-un", "JUSTE"],
  [200, "deux cents", "JUSTE"],
  [203, "deux-cent-trois", "JUSTE"],
  [10000, "dix mille", "JUSTE"],
  // TRAIT_UNION (memes mots, separateurs faux)
  [23, "vingt trois", "TRAIT_UNION"],
  [52, "cinquante deux", "TRAIT_UNION"],
  [123, "cent vingt trois", "TRAIT_UNION"],
  [77, "soixante dix sept", "TRAIT_UNION"],
  [99, "quatre vingt dix neuf", "TRAIT_UNION"],
  [85, "quatre vingt-cinq", "TRAIT_UNION"],
  // S_VINGT_CENT
  [200, "deux cent", "S_VINGT_CENT"], // cent : s manquant
  [2200, "deux mille deux cent", "S_VINGT_CENT"],
  [201, "deux cents un", "S_VINGT_CENT"], // cent : s en trop
  [80, "quatre-vingt", "S_VINGT_CENT"], // vingt : s manquant
  [82, "quatre-vingts-deux", "S_VINGT_CENT"], // vingt : s en trop
  [300, "trois cent", "S_VINGT_CENT"],
  // S_MILLE
  [3000, "trois milles", "S_MILLE"],
  [2000, "deux milles", "S_MILLE"],
  [5000, "cinq milles", "S_MILLE"],
  // ET_UN
  [21, "vingt-un", "ET_UN"],
  [31, "trente-un", "ET_UN"],
  [41, "quarante un", "ET_UN"],
  [71, "soixante-onze", "ET_UN"],
  [171, "cent soixante-onze", "ET_UN"],
  [61, "soixante-un", "ET_UN"],
  // ORTHO_MOT (un mot mal ecrit, distance <= 2)
  [60, "soixant", "ORTHO_MOT"],
  [40, "quarantte", "ORTHO_MOT"],
  [92, "quatre-vingt-douse", "ORTHO_MOT"],
  [15, "quinse", "ORTHO_MOT"],
  [500, "cinq scents", "ORTHO_MOT"],
  [1000, "mil", "ORTHO_MOT"],
  [70, "soixante-dixe", "ORTHO_MOT"],
  // MAUVAIS_NOMBRE (mots-nombres valides, autre nombre)
  [200, "trois cents", "MAUVAIS_NOMBRE"],
  [21, "vingt-deux", "MAUVAIS_NOMBRE"],
  [1000, "deux mille", "MAUVAIS_NOMBRE"],
  [340, "trois cent quatorze", "MAUVAIS_NOMBRE"],
  [80, "soixante-dix", "MAUVAIS_NOMBRE"],
  [2321, "deux mille trois cent vingt-deux", "MAUVAIS_NOMBRE"],
  [100, "mille", "MAUVAIS_NOMBRE"],
  // INCONNU
  [42, "beaucoup", "INCONNU"],
  [42, "", "INCONNU"],
  [42, "quarante-deux pommes rouges", "INCONNU"],
];

describe("diagnostiquer : saisie tapee -> type de faute", () => {
  for (const [n, saisie, attendu] of CAS) {
    it(`${n} / « ${saisie || "(vide)"} » -> ${attendu}`, () => {
      const d = diagnostiquer(n, saisie);
      if (attendu === "JUSTE") {
        expect(d.juste).toBe(true);
        expect(d.fautes).toHaveLength(0);
      } else {
        expect(d.juste).toBe(false);
        expect(d.fautes.length).toBeGreaterThanOrEqual(1);
        expect(d.fautes.length).toBeLessThanOrEqual(2);
        expect(d.fautes.map((f) => f.type)).toContain(attendu);
        expect(d.bonneEcriture).toBe(enLettresFr(n, "trad"));
        // Chaque faute porte un message non vide.
        for (const f of d.fautes) expect(f.message.length).toBeGreaterThan(5);
      }
    });
  }

  it("precise le mot pour ORTHO_MOT", () => {
    const d = diagnostiquer(60, "soixant");
    expect(d.fautes[0].type).toBe("ORTHO_MOT");
    expect(d.fautes[0].message).toContain("soixante");
  });
  it("precise mille pour S_MILLE", () => {
    const d = diagnostiquer(3000, "trois milles");
    expect(d.fautes[0].type).toBe("S_MILLE");
    expect(d.fautes[0].message.toLowerCase()).toContain("mille");
  });
  it("normalisation tolere la casse pour le diagnostic de justesse", () => {
    expect(diagnostiquer(21, "VINGT ET UN").juste).toBe(true);
  });
  it("message INCONNU : encourageant, avec la bonne ecriture", () => {
    const d = diagnostiquer(42, "beaucoup");
    expect(d.fautes[0].type).toBe("INCONNU");
    expect(d.fautes[0].message).toBe(
      "Presque ! Regarde bien : on écrit « quarante-deux ».",
    );
  });
});
