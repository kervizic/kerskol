// Tests du coeur « lecture rythmee » : tokenisation, liaisons, decoupage par
// mode (sur UNE meme phrase), reglages par profil, controle qualite des timings.

import { describe, it, expect } from "vitest";
import { texteEnTokens, normaliser } from "./tokenize";
import { doitLier, commenceParVoyelleOuHMuet, estDeclencheur } from "./liaison";
import { decouper, unitesAtomiques, modeParDefaut, type Segment } from "./grouping";
import type { Token } from "./tokenize";
import {
  reglagesParDefaut,
  normaliserReglages,
  vitesseDe,
  PAUSE_MAX,
} from "./reglages";
import { controlerTimings, type TimingsTexte } from "./timings";

// Rend un segment en texte lisible (pour les assertions).
function rendre(tokens: Token[], seg: Segment): string {
  return seg.tokens
    .map((i) => tokens[i])
    .map((t) => `${t.avant}${t.mot}${t.apres}`)
    .join(" ");
}

describe("tokenize", () => {
  it("garde apostrophes et traits d'union INTERNES comme un seul mot", () => {
    const t = texteEnTokens(["l'arbre aujourd'hui martin-pêcheur est-ce"]);
    expect(t.map((x) => x.mot)).toEqual(["l'arbre", "aujourd'hui", "martin-pêcheur", "est-ce"]);
    expect(t.map((x) => x.index)).toEqual([0, 1, 2, 3]);
  });

  it("detache la ponctuation de bord dans avant/apres", () => {
    const t = texteEnTokens(["« Bonjour », dit-il."]);
    expect(t[0].mot).toBe("Bonjour");
    expect(t[0].avant).toBe("«");
    expect(t[0].apres).toBe("»,");
    expect(t[1].mot).toBe("dit-il");
    expect(t[1].apres).toBe(".");
  });

  it("colle un morceau 100% ponctuation au mot precedent", () => {
    const t = texteEnTokens(["un mur - nu"]);
    expect(t.map((x) => x.mot)).toEqual(["un", "mur", "nu"]);
    expect(t[1].apres).toBe("-");
  });

  it("numerote les vers (\\n) et les paragraphes", () => {
    const t = texteEnTokens(["un\ndeux", "trois"]);
    expect(t.map((x) => [x.para, x.ligne])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
    ]);
  });
});

describe("liaison", () => {
  it("voyelle / h muet vs h aspiré", () => {
    expect(commenceParVoyelleOuHMuet("enfants")).toBe(true);
    expect(commenceParVoyelleOuHMuet("hommes")).toBe(true); // h muet
    expect(commenceParVoyelleOuHMuet("héros")).toBe(false); // h aspiré
    expect(commenceParVoyelleOuHMuet("hibou")).toBe(false); // h aspiré
    expect(commenceParVoyelleOuHMuet("pomme")).toBe(false);
  });

  it("declencheurs : determinants et pronoms", () => {
    expect(estDeclencheur("les")).toBe(true);
    expect(estDeclencheur("ils")).toBe(true);
    expect(estDeclencheur("Les")).toBe(true); // insensible a la casse
    expect(estDeclencheur("mangé")).toBe(false);
  });

  it("lie determinant/pronom + voyelle, pas sinon", () => {
    expect(doitLier({ mot: "Les", apres: "" }, { mot: "enfants" })).toBe(true);
    expect(doitLier({ mot: "ils", apres: "" }, { mot: "ont" })).toBe(true);
    expect(doitLier({ mot: "une", apres: "" }, { mot: "pomme" })).toBe(false);
    expect(doitLier({ mot: "les", apres: "" }, { mot: "héros" })).toBe(false); // h aspiré
    // une virgule casse la liaison
    expect(doitLier({ mot: "les", apres: "," }, { mot: "amis" })).toBe(false);
  });
});

const PHRASE = ["Les enfants ont mangé une pomme, puis ils ont dormi."];

describe("decoupage par mode (meme phrase)", () => {
  const tokens = texteEnTokens(PHRASE);

  it("unites atomiques : les liaisons sont soudees", () => {
    const u = unitesAtomiques(tokens);
    const rendu = u.map((unite) => unite.map((i) => tokens[i].mot).join(" "));
    expect(rendu).toEqual([
      "Les enfants",
      "ont",
      "mangé",
      "une",
      "pomme",
      "puis",
      "ils ont",
      "dormi",
    ]);
  });

  it("CP : mot a mot (liaisons gardees)", () => {
    const segs = decouper(tokens, "cp").map((s) => rendre(tokens, s));
    expect(segs).toEqual([
      "Les enfants",
      "ont",
      "mangé",
      "une",
      "pomme,",
      "puis",
      "ils ont",
      "dormi.",
    ]);
  });

  it("CE1 : groupes de 2-3 mots", () => {
    const segs = decouper(tokens, "ce1").map((s) => rendre(tokens, s));
    expect(segs).toEqual([
      "Les enfants ont",
      "mangé une pomme,",
      "puis ils ont",
      "dormi.",
    ]);
  });

  it("CE2 : groupes de sens (coupe a la ponctuation)", () => {
    const segs = decouper(tokens, "ce2").map((s) => rendre(tokens, s));
    expect(segs).toEqual([
      "Les enfants ont mangé une pomme,",
      "puis ils ont dormi.",
    ]);
  });

  it("CM : continu (une phrase)", () => {
    const segs = decouper(tokens, "cm").map((s) => rendre(tokens, s));
    expect(segs).toEqual(["Les enfants ont mangé une pomme, puis ils ont dormi."]);
  });

  it("aucun mode ne coupe JAMAIS une liaison (Les‿enfants, ils‿ont)", () => {
    for (const mode of ["cp", "ce1", "ce2", "cm"] as const) {
      for (const s of decouper(tokens, mode)) {
        const mots = s.tokens.map((i) => tokens[i].mot);
        // si « Les » est present, « enfants » doit etre dans le MEME segment juste apres
        const iLes = mots.indexOf("Les");
        if (iLes >= 0) expect(mots[iLes + 1]).toBe("enfants");
        const iIls = mots.indexOf("ils");
        if (iIls >= 0) expect(mots[iIls + 1]).toBe("ont");
      }
    }
  });
});

describe("reglages par profil", () => {
  it("mode par defaut selon la classe", () => {
    expect(modeParDefaut("CP")).toBe("cp");
    expect(modeParDefaut("CE1")).toBe("ce1");
    expect(modeParDefaut("CE2")).toBe("ce2");
    expect(modeParDefaut("CM1")).toBe("cm");
    expect(reglagesParDefaut("CE2").mode).toBe("ce2");
  });

  it("normalise des reglages invalides en bornant", () => {
    const r = normaliserReglages(
      { mode: "zzz" as never, pauseMs: 99999, espacement: "x" as never, ralenti: true },
      "CE2"
    );
    expect(r.mode).toBe("ce2");
    expect(r.pauseMs).toBe(PAUSE_MAX);
    expect(r.espacement).toBe("normal");
    expect(r.ralenti).toBe(true);
  });

  it("vitesse : ralenti seulement en mode continu", () => {
    expect(vitesseDe({ mode: "cm", pauseMs: 100, espacement: "normal", ralenti: true })).toBe(0.9);
    expect(vitesseDe({ mode: "ce2", pauseMs: 300, espacement: "normal", ralenti: true })).toBe(1);
  });
});

describe("controle qualite des timings", () => {
  const mots = ["Le", "chat", "dort"];
  const base = (): TimingsTexte => ({
    id: "t",
    outil: "aeneas",
    audio: { opus: "t.opus", m4a: "t.m4a" },
    mots: [
      { mot: "Le", debut_ms: 0, fin_ms: 200, index: 0 },
      { mot: "chat", debut_ms: 220, fin_ms: 520, index: 1 },
      { mot: "dort", debut_ms: 540, fin_ms: 900, index: 2 },
    ],
  });

  it("accepte un alignement correct", () => {
    expect(controlerTimings(base(), mots, normaliser)).toEqual([]);
  });

  it("detecte une couverture incomplete", () => {
    const t = base();
    t.mots = t.mots.slice(0, 2);
    const p = controlerTimings(t, mots, normaliser);
    expect(p.some((x) => x.code === "couverture")).toBe(true);
  });

  it("detecte un chevauchement", () => {
    const t = base();
    t.mots[1].debut_ms = 100; // < fin precedent 200
    const p = controlerTimings(t, mots, normaliser);
    expect(p.some((x) => x.code === "chevauchement")).toBe(true);
  });

  it("detecte une duree implausible", () => {
    const t = base();
    t.mots[2].fin_ms = 540 + 9000;
    const p = controlerTimings(t, mots, normaliser);
    expect(p.some((x) => x.code === "duree_implausible")).toBe(true);
  });
});
