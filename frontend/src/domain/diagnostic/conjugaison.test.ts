import { describe, it, expect } from "vitest";
import {
  diagnostiquerConjugaison,
  estJusteConjugaison,
  phraseAttendue,
} from "./conjugaison";
import type { TypeFaute } from "./diagnostic";
import {
  CONJ, TEMPS, PERSONNES, forme, avecPronom, conjGolden, TEMPS_CODE,
  type Temps, type Personne,
} from "../francais/conjugaison";

// --- Integrite de la table (source de verite partagee avec le SQL) ----------
describe("table de conjugaison", () => {
  it("20 verbes, 3 temps, 6 personnes = 360 formes non vides", () => {
    const g = conjGolden();
    expect(Object.keys(CONJ)).toHaveLength(20);
    expect(g).toHaveLength(20 * 3 * 6);
    for (const r of g) {
      expect(r.forme.length).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(r.temps);
      expect(r.personne).toBeGreaterThanOrEqual(1);
      expect(r.personne).toBeLessThanOrEqual(6);
    }
    // Chaque (verbe,temps,personne) est unique.
    const cles = new Set(g.map((r) => `${r.verbe}|${r.temps}|${r.personne}`));
    expect(cles.size).toBe(g.length);
  });

  it("formes de reference attendues (toutes familles, tous temps)", () => {
    expect(forme("chanter", "present", 1)).toBe("chante");
    expect(forme("chanter", "present", 6)).toBe("chantent");
    expect(forme("chanter", "futur", 1)).toBe("chanterai");
    expect(forme("chanter", "imparfait", 3)).toBe("chantait");
    expect(forme("etre", "present", 5)).toBe("êtes");
    expect(forme("etre", "imparfait", 1)).toBe("étais");
    expect(forme("avoir", "present", 1)).toBe("ai");
    expect(forme("manger", "present", 4)).toBe("mangeons");
    expect(forme("placer", "present", 4)).toBe("plaçons");
    expect(forme("aller", "futur", 1)).toBe("irai");
    expect(forme("faire", "present", 5)).toBe("faites");
    expect(forme("prendre", "present", 6)).toBe("prennent");
    expect(forme("vouloir", "present", 1)).toBe("veux");
    expect(forme("voir", "imparfait", 4)).toBe("voyions");
    // 2e groupe : finir (-iss- au pluriel du present et a l'imparfait).
    expect(forme("finir", "present", 3)).toBe("finit");
    expect(forme("finir", "present", 4)).toBe("finissons");
    expect(forme("finir", "futur", 1)).toBe("finirai");
    expect(forme("finir", "imparfait", 6)).toBe("finissaient");
  });

  it("elision j' selon la forme", () => {
    expect(avecPronom(1, forme("avoir", "present", 1))).toBe("j'ai");
    expect(avecPronom(1, forme("aimer", "present", 1))).toBe("j'aime");
    expect(avecPronom(1, forme("etre", "imparfait", 1))).toBe("j'étais");
    expect(avecPronom(1, forme("chanter", "present", 1))).toBe("je chante");
    expect(avecPronom(1, forme("vouloir", "present", 1))).toBe("je veux");
    expect(phraseAttendue("prendre", "present", 3)).toBe("il prend");
  });
});

// --- estJuste : accents EXIGES ----------------------------------------------
describe("estJusteConjugaison", () => {
  it("accepte la forme exacte, tolere casse et espaces", () => {
    expect(estJusteConjugaison("chanter", "present", 3, "chante")).toBe(true);
    expect(estJusteConjugaison("chanter", "present", 3, "  CHANTE ")).toBe(true);
    expect(estJusteConjugaison("etre", "present", 5, "êtes")).toBe(true);
  });
  it("refuse une forme sans le bon accent, une autre personne, un autre temps", () => {
    expect(estJusteConjugaison("etre", "present", 5, "etes")).toBe(false);
    expect(estJusteConjugaison("chanter", "present", 3, "chantes")).toBe(false);
    expect(estJusteConjugaison("chanter", "present", 1, "chanterai")).toBe(false);
  });
});

// --- 45 cas : (verbe, temps, personne, saisie) -> type de faute attendu ------
type Cas = [verbe: string, temps: Temps, personne: Personne, saisie: string, attendu: TypeFaute | "JUSTE"];
const CAS: Cas[] = [
  // JUSTE
  ["chanter", "present", 1, "chante", "JUSTE"],
  ["etre", "present", 5, "êtes", "JUSTE"],
  ["avoir", "present", 1, "ai", "JUSTE"],
  ["aller", "present", 1, "vais", "JUSTE"],
  ["faire", "present", 5, "faites", "JUSTE"],
  ["prendre", "present", 6, "prennent", "JUSTE"],
  ["manger", "present", 4, "mangeons", "JUSTE"],
  ["placer", "imparfait", 1, "plaçais", "JUSTE"],
  // ACCENT (accent manquant)
  ["etre", "present", 5, "etes", "ACCENT"],
  ["etre", "imparfait", 1, "etais", "ACCENT"],
  ["etre", "imparfait", 4, "etions", "ACCENT"],
  ["etre", "imparfait", 3, "etait", "ACCENT"],
  // MAUVAISE_PERSONNE (autre personne, meme temps)
  ["chanter", "present", 3, "chantes", "MAUVAISE_PERSONNE"],
  ["chanter", "present", 3, "chantons", "MAUVAISE_PERSONNE"],
  ["manger", "present", 4, "mange", "MAUVAISE_PERSONNE"],
  ["etre", "present", 1, "es", "MAUVAISE_PERSONNE"],
  ["avoir", "present", 3, "as", "MAUVAISE_PERSONNE"],
  ["aller", "present", 1, "va", "MAUVAISE_PERSONNE"],
  ["vouloir", "present", 1, "veut", "MAUVAISE_PERSONNE"],
  ["voir", "present", 4, "voient", "MAUVAISE_PERSONNE"],
  // MAUVAIS_TEMPS (meme verbe, autre temps)
  ["chanter", "present", 1, "chanterai", "MAUVAIS_TEMPS"],
  ["chanter", "present", 1, "chantais", "MAUVAIS_TEMPS"],
  ["etre", "present", 3, "sera", "MAUVAIS_TEMPS"],
  ["avoir", "present", 1, "avais", "MAUVAIS_TEMPS"],
  ["aller", "present", 3, "ira", "MAUVAIS_TEMPS"],
  ["faire", "imparfait", 1, "ferai", "MAUVAIS_TEMPS"],
  ["prendre", "present", 1, "prendrai", "MAUVAIS_TEMPS"],
  // TERMINAISON (bon radical, mauvaise fin, forme inexistante)
  ["chanter", "present", 3, "chanter", "TERMINAISON"],
  ["jouer", "present", 3, "jous", "TERMINAISON"],
  ["donner", "present", 1, "donn", "TERMINAISON"],
  ["regarder", "present", 6, "regardant", "TERMINAISON"],
  ["parler", "present", 4, "parlont", "TERMINAISON"],
  ["trouver", "present", 2, "trouvs", "TERMINAISON"],
  // ORTHO_RADICAL (distance <= 2, radical mal ecrit)
  ["chanter", "present", 3, "chnte", "ORTHO_RADICAL"],
  ["faire", "present", 3, "fiat", "ORTHO_RADICAL"],
  ["prendre", "present", 6, "prenent", "ORTHO_RADICAL"],
  ["dire", "present", 3, "dt", "ORTHO_RADICAL"],
  ["voir", "present", 3, "viot", "ORTHO_RADICAL"],
  // INCONNU
  ["chanter", "present", 3, "bonjour", "INCONNU"],
  ["chanter", "present", 3, "", "INCONNU"],
  ["avoir", "present", 1, "mange", "INCONNU"],
  ["faire", "present", 1, "patatras", "INCONNU"],
  ["vouloir", "imparfait", 2, "xyz", "INCONNU"],
];

describe("diagnostiquerConjugaison : saisie -> type de faute", () => {
  for (const [v, t, p, saisie, attendu] of CAS) {
    it(`${v} ${t} P${p} / « ${saisie || "(vide)"} » -> ${attendu}`, () => {
      const d = diagnostiquerConjugaison(v, t, p, saisie);
      if (attendu === "JUSTE") {
        expect(d.juste).toBe(true);
        expect(d.fautes).toHaveLength(0);
      } else {
        expect(d.juste).toBe(false);
        expect(d.fautes).toHaveLength(1);
        expect(d.fautes[0].type).toBe(attendu);
        expect(d.bonneEcriture).toBe(forme(v, t, p));
        expect(d.fautes[0].message.length).toBeGreaterThan(5);
      }
    });
  }

  it("message MAUVAISE_PERSONNE cite le bon pronom et un exemple", () => {
    const d = diagnostiquerConjugaison("chanter", "present", 3, "chantes");
    expect(d.fautes[0].message).toContain("il");
    expect(d.fautes[0].message.toLowerCase()).toContain("chante");
  });

  it("message MAUVAIS_TEMPS : repere temporel concret, oral (sans symbole ni fleche)", () => {
    const present = diagnostiquerConjugaison("chanter", "present", 1, "chanterai");
    expect(present.fautes[0].type).toBe("MAUVAIS_TEMPS");
    expect(present.fautes[0].message).toBe(
      "Attention au temps. Ici c'est le présent, maintenant. On écrit : chante. On dit hier je chantais, et demain je chanterai.",
    );
    expect(present.fautes[0].message).not.toContain("bon moment");
    // Rediges pour l'oral : plus de fleche, plus de barre, plus de guillemet.
    expect(present.fautes[0].message).not.toContain("→");
    expect(present.fautes[0].message).not.toContain("«");

    const futur = diagnostiquerConjugaison("chanter", "futur", 1, "chante");
    expect(futur.fautes[0].message).toContain("le futur, demain");

    const imparfait = diagnostiquerConjugaison("chanter", "imparfait", 1, "chante");
    expect(imparfait.fautes[0].message).toContain("l'imparfait, avant, hier");
  });
});

// --- Coherence interne : chaque forme du golden se diagnostique JUSTE --------
describe("coherence : chaque forme de reference est JUSTE", () => {
  it("balaye toute la table", () => {
    for (const verbe of Object.keys(CONJ)) {
      for (const t of TEMPS) {
        for (const p of PERSONNES) {
          const bonne = forme(verbe, t, p);
          expect(diagnostiquerConjugaison(verbe, t, p, bonne).juste).toBe(true);
          expect(TEMPS_CODE[t]).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});
