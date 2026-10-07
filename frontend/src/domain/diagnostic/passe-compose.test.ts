import { describe, it, expect } from "vitest";
import { diagnostiquerPasseCompose, estJustePasseCompose } from "./passe-compose";
import type { TypeFaute } from "./diagnostic";
import {
  VERBES_PC, PC_CODE, formePC, pcGolden, accordeAvecEtre, type Genre,
} from "../francais/passe-compose";
import { PERSONNES, type Personne } from "../francais/conjugaison";

// --- Integrite de la table (source de verite partagee avec le SQL 0037) -----
describe("table du passe compose", () => {
  it("20 verbes x 6 personnes x 2 genres = 240 formes non vides", () => {
    const g = pcGolden();
    expect(VERBES_PC).toHaveLength(20);
    expect(g).toHaveLength(20 * 6 * 2);
    for (const r of g) {
      expect(r.forme.length).toBeGreaterThan(0);
      expect(r.forme).toContain(" "); // auxiliaire + participe
      expect(["m", "f"]).toContain(r.genre);
    }
    const cles = new Set(g.map((r) => `${r.verbe}|${r.personne}|${r.genre}`));
    expect(cles.size).toBe(g.length);
  });

  it("PC_CODE = 4", () => {
    expect(PC_CODE).toBe(4);
  });

  it("accord avec etre (aller, venir), invariable avec avoir", () => {
    expect(formePC("aller", 1, "m")).toBe("suis allé");
    expect(formePC("aller", 1, "f")).toBe("suis allée");
    expect(formePC("aller", 3, "f")).toBe("est allée");
    expect(formePC("aller", 6, "m")).toBe("sont allés");
    expect(formePC("aller", 6, "f")).toBe("sont allées");
    expect(formePC("venir", 4, "f")).toBe("sommes venues");
    expect(formePC("venir", 6, "m")).toBe("sont venus");
    // Avoir : participe INVARIABLE (pas de COD au CE2) : m == f.
    expect(formePC("manger", 3, "m")).toBe("a mangé");
    expect(formePC("manger", 3, "f")).toBe("a mangé");
    expect(formePC("etre", 1, "m")).toBe("ai été");
    expect(formePC("avoir", 6, "m")).toBe("ont eu");
    expect(formePC("prendre", 3, "m")).toBe("a pris");
    expect(formePC("finir", 3, "m")).toBe("a fini");
    expect(formePC("faire", 5, "m")).toBe("avez fait");
  });

  it("seuls aller et venir s'accordent", () => {
    for (const v of VERBES_PC) {
      const attendu = v === "aller" || v === "venir";
      expect(accordeAvecEtre(v)).toBe(attendu);
    }
  });
});

// --- estJustePasseCompose : genre impose vs libre ---------------------------
describe("estJustePasseCompose", () => {
  it("chaque forme de reference est JUSTE (genre impose)", () => {
    for (const r of pcGolden()) {
      expect(
        estJustePasseCompose(r.verbe, r.personne as Personne, r.genre as Genre, r.forme)
      ).toBe(true);
    }
  });

  it("genre LIBRE : m ET f acceptes pour les verbes avec etre", () => {
    expect(estJustePasseCompose("aller", 1, null, "suis allé")).toBe(true);
    expect(estJustePasseCompose("aller", 1, null, "suis allée")).toBe(true);
    expect(estJustePasseCompose("venir", 5, null, "êtes venus")).toBe(true);
    expect(estJustePasseCompose("venir", 5, null, "êtes venues")).toBe(true);
  });

  it("genre IMPOSE : l'autre genre est refuse", () => {
    expect(estJustePasseCompose("aller", 3, "f", "est allé")).toBe(false);
    expect(estJustePasseCompose("aller", 3, "m", "est allée")).toBe(false);
  });

  it("accents EXIGES", () => {
    expect(estJustePasseCompose("manger", 1, null, "ai mangé")).toBe(true);
    expect(estJustePasseCompose("manger", 1, null, "ai mange")).toBe(false);
  });
});

// --- Diagnostic : chaque faute recoit le bon type ---------------------------
function typeDe(verbe: string, p: Personne, genre: Genre | null, saisie: string): TypeFaute | "JUSTE" {
  const d = diagnostiquerPasseCompose(verbe, p, saisie, { genre });
  return d.juste ? "JUSTE" : d.fautes[0].type;
}

describe("diagnostiquerPasseCompose", () => {
  it("toute forme de reference => JUSTE, aucune faute", () => {
    for (const r of pcGolden()) {
      const d = diagnostiquerPasseCompose(r.verbe, r.personne as Personne, r.forme, { genre: r.genre as Genre });
      expect(d.juste).toBe(true);
      expect(d.fautes).toHaveLength(0);
    }
  });

  it("AUXILIAIRE : mauvais petit mot", () => {
    expect(typeDe("aller", 3, "m", "a allé")).toBe("AUXILIAIRE"); // etre attendu
    expect(typeDe("manger", 3, null, "est mangé")).toBe("AUXILIAIRE"); // avoir attendu
  });

  it("ACCORD : etre, mauvais accord", () => {
    expect(typeDe("aller", 3, "f", "est allé")).toBe("ACCORD");
    expect(typeDe("venir", 6, "m", "sont venu")).toBe("ACCORD");
  });

  it("PARTICIPE : bon auxiliaire, participe faux", () => {
    expect(typeDe("prendre", 3, null, "a prendu")).toBe("PARTICIPE");
  });

  it("ACCENT : accent manquant sur le participe", () => {
    expect(typeDe("manger", 3, null, "a mange")).toBe("ACCENT");
  });

  it("MAUVAIS_TEMPS : forme a un temps simple", () => {
    expect(typeDe("manger", 3, null, "mangeait")).toBe("MAUVAIS_TEMPS"); // imparfait
    expect(typeDe("manger", 3, null, "mange")).toBe("MAUVAIS_TEMPS"); // present
  });

  it("saisie vide => INCONNU", () => {
    expect(typeDe("manger", 1, null, "")).toBe("INCONNU");
  });

  it("au plus 2 fautes affichees, bonne ecriture presente", () => {
    const d = diagnostiquerPasseCompose("aller", 3, "a allé", { genre: "m" });
    expect(d.fautes.length).toBeLessThanOrEqual(2);
    expect(d.bonneEcriture).toBe("est allé");
  });
});

// Couverture : tous les verbes a toutes les personnes se diagnostiquent JUSTE
// quand on saisit la forme attendue (genre impose = m pour tous ici).
describe("couverture complete", () => {
  it("toutes les formes masculines sont justes", () => {
    for (const v of VERBES_PC) {
      for (const p of PERSONNES) {
        expect(estJustePasseCompose(v, p, "m", formePC(v, p, "m"))).toBe(true);
      }
    }
  });
});
