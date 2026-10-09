// Tests de la banque « Copier et écrire » (français, CE2) et du générateur.
//
// Le nombre d'items (24) et les clés sont un GOLDEN : le test croisé SQL
// (supabase/tests/ecriture_test.sql) vérifie que public.ecriture_item porte
// EXACTEMENT les mêmes clés / format / attendu, et que verif_ecriture juge
// comme comparerEcriture / verifieCheck ici.

import { describe, it, expect } from "vitest";
import {
  BANQUE_ECRITURE,
  COMPETENCES_ECRITURE,
  itemsEcrDe,
  itemEcrParCle,
  estJusteEcriture,
  comparerEcriture,
  verifieCheck,
  diagnostiquerCopie,
} from "./ecriture";
import { generateExercise } from "../calcul/generator";
import type { ExCalcul } from "../calcul/generator";

const NB_ITEMS_GOLDEN = 32;

function source(competence: string, niveau: number): ExCalcul {
  return {
    exerciceId: "00000000-0000-0000-0000-000000000000",
    competence, niveau, methode: "ecriture", operation: "ecr", forme: "ecriture",
    params: {}, support: null, correctionStrategie: null,
  };
}

describe("banque « copier et écrire » : structure et couverture", () => {
  it("compte GOLDEN stable (miroir du test SQL)", () => {
    expect(BANQUE_ECRITURE.length).toBe(NB_ITEMS_GOLDEN);
  });
  it("clés uniques", () => {
    const cles = BANQUE_ECRITURE.map((i) => i.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });
  it("chaque compétence a au moins un item à chaque niveau 1..4", () => {
    for (const c of COMPETENCES_ECRITURE) {
      for (let n = 1; n <= 4; n++) expect(itemsEcrDe(c, n).length, `${c} N${n}`).toBeGreaterThan(0);
    }
  });
  it("champs cohérents selon le format", () => {
    for (const i of BANQUE_ECRITURE) {
      expect(i.niveau).toBeGreaterThanOrEqual(1);
      expect(i.niveau).toBeLessThanOrEqual(4);
      expect(i.consigne.trim().length).toBeGreaterThan(0);
      expect(i.explication.trim().length).toBeGreaterThan(0);
      if (i.format === "copie" || i.format === "transform") expect(i.attendu.trim().length).toBeGreaterThan(0);
      if (i.format === "copie") expect(i.modele).toBeTruthy();
      if (i.format === "ordre") {
        expect(i.etiquettes && i.etiquettes.length).toBeGreaterThan(1);
        // Les étiquettes, remises dans l'ordre, forment exactement l'attendu.
        expect(i.etiquettes!.join(" ")).not.toBe(i.attendu); // il y a bien à ranger
        expect([...(i.etiquettes ?? [])].sort().join("|")).toBe(i.attendu.split(" ").sort().join("|"));
      }
      if (i.format === "qcm") {
        expect(i.options, `${i.cle} options`).toBeTruthy();
        expect(i.options).toContain(i.attendu);
        expect(i.phrase, `${i.cle} phrase`).toBeTruthy();
      }
      if (i.format === "transform") expect(i.phrase, `${i.cle} phrase`).toBeTruthy();
      if (i.format === "libre") {
        expect(i.check, `${i.cle} check`).toBeTruthy();
        expect(i.check!.minMots).toBeGreaterThan(0);
        expect(i.attendu).toBe("");
        // Un exemple de bonne phrase est fourni ET il passe la check-list.
        expect(i.exemple, `${i.cle} exemple`).toBeTruthy();
        expect(verifieCheck(i.exemple!, i.check!), `${i.cle} exemple valide`).toBe(true);
      }
    }
  });
  it("consignes et explications sans symbole technique", () => {
    const interdits = /[→←%<>=×÷*\/]/;
    for (const i of BANQUE_ECRITURE) {
      expect(interdits.test(i.consigne), `${i.cle} consigne`).toBe(false);
      expect(interdits.test(i.explication), `${i.cle} explication`).toBe(false);
    }
  });
});

describe("comparaison miroir du serveur", () => {
  it("copie : espaces normalisés, casse / accents / ponctuation EXIGES", () => {
    expect(comparerEcriture("copie", "Le chat dort dans le jardin.", "Le chat dort dans le jardin.")).toBe(true);
    expect(comparerEcriture("copie", "le  chat   dort dans le jardin.", "le chat dort dans le jardin")).toBe(false); // point manquant
    expect(comparerEcriture("copie", "le petit chat", "le petit chat")).toBe(true);
    expect(comparerEcriture("copie", "le  petit   chat", "le petit chat")).toBe(true); // espaces
    expect(comparerEcriture("copie", "Le chat", "le chat")).toBe(false); // majuscule
    expect(comparerEcriture("copie", "ecole", "école")).toBe(false); // accent
  });
  it("transform : cible exacte", () => {
    expect(comparerEcriture("transform", "les chats noirs", "les chats noirs")).toBe(true);
    expect(comparerEcriture("transform", "les chat noirs", "les chats noirs")).toBe(false);
    expect(comparerEcriture("transform", "J'ai mangé une pomme.", "J'ai mangé une pomme.")).toBe(true);
  });
  it("ordre : espaces retirés, casse et ponctuation gardées", () => {
    expect(comparerEcriture("ordre", "Le chat dort .", "Le chat dort.")).toBe(true);
    expect(comparerEcriture("ordre", "Le chat dort", "Le chat dort.")).toBe(false); // point
    expect(comparerEcriture("ordre", "le chat dort.", "Le chat dort.")).toBe(false); // majuscule
  });
  it("qcm : casse ignorée, accents gardés", () => {
    expect(comparerEcriture("qcm", "Lait", "lait")).toBe(true);
    expect(comparerEcriture("qcm", "velo", "vélo")).toBe(false);
  });
});

describe("check-list d'une phrase libre (N4)", () => {
  const check = { minMots: 4, motsCles: ["chat", "jardin"] };
  it("accepte une phrase complète", () => {
    expect(verifieCheck("Le chat joue dans le jardin.", check)).toBe(true);
  });
  it("refuse sans majuscule", () => {
    expect(verifieCheck("le chat joue dans le jardin.", check)).toBe(false);
  });
  it("refuse sans point final", () => {
    expect(verifieCheck("Le chat joue dans le jardin", check)).toBe(false);
  });
  it("refuse s'il manque un mot-clé", () => {
    expect(verifieCheck("Le chat joue beaucoup aujourd'hui.", check)).toBe(false);
  });
  it("refuse s'il n'y a pas de verbe", () => {
    expect(verifieCheck("Le grand chat noir.", { minMots: 3, motsCles: [] })).toBe(false);
  });
  it("refuse si trop court", () => {
    expect(verifieCheck("Le chat dort.", { minMots: 5, motsCles: [] })).toBe(false);
  });
  it("accepte une phrase libre avec un verbe de la liste", () => {
    expect(verifieCheck("La fleur aime le soleil.", { minMots: 4, motsCles: ["fleur", "soleil"] })).toBe(true);
  });
});

describe("estJusteEcriture + diagnostic", () => {
  it("juge local = miroir serveur", () => {
    expect(estJusteEcriture("ecr-copie-n1-a", "chat")).toBe(true);
    expect(estJusteEcriture("ecr-copie-n1-a", "Chat")).toBe(false);
    expect(estJusteEcriture("ecr-guide-n1-a", "Le chat dort.")).toBe(true);
    expect(estJusteEcriture("ecr-guide-n2-a", "lait")).toBe(true);
    expect(estJusteEcriture("ecr-guide-n4-a", "Le chat joue dans le jardin.")).toBe(true);
    expect(estJusteEcriture("ecr-guide-n4-a", "Le chien dort.")).toBe(false);
    expect(estJusteEcriture("cle-bidon", "x")).toBe(false);
  });
  it("diagnostic de copie : message bienveillant et utile", () => {
    expect(diagnostiquerCopie("chat", "chat")).toMatch(/[Bb]ravo/);
    expect(diagnostiquerCopie("ecole", "école")).toMatch(/accent/i);
    expect(diagnostiquerCopie("le chat", "Le chat")).toMatch(/majuscule/i);
    expect(diagnostiquerCopie("le chat", "le chat dort")).toMatch(/manque un mot/i);
  });
});

describe("générateur d'écriture", () => {
  it("produit un exercice d'écriture cohérent (saisie, op, clé)", () => {
    for (const c of COMPETENCES_ECRITURE) {
      for (let n = 1; n <= 4; n++) {
        const ex = generateExercise(source(c, n), 24680 + n);
        expect(ex.saisie, `${c} N${n}`).toBe("ecriture");
        expect(ex.verif.op).toBe("ecr");
        expect(ex.ecr, `${c} N${n} item`).toBeTruthy();
        const item = itemEcrParCle(ex.ecr!.cle);
        expect(item, `item ${ex.ecr!.cle}`).toBeTruthy();
        expect(item!.competence).toBe(c);
        expect(item!.niveau).toBe(n);
        expect(ex.verif.cle).toBe(ex.ecr!.cle);
      }
    }
  });
  it("reproductible pour une même graine", () => {
    const a = generateExercise(source("FR.ECR.GUIDEE", 4), 777);
    const b = generateExercise(source("FR.ECR.GUIDEE", 4), 777);
    expect(a.ecr!.cle).toBe(b.ecr!.cle);
  });
});
