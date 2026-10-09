// Golden deterministe « Vivre ensemble » (EMC). Verifie :
//   * la banque (couverture competence x niveau, cles uniques) ;
//   * les comparateurs MIROIR du serveur (qcm / ordre / tri / texte) ;
//   * un spot-check (cle, format, attendu) CROISE avec supabase/tests/emc_test.sql
//     (meme table de valeurs des deux cotes) ;
//   * le garde-fou de contenu (consigne / attendu / explication non vides, qcm
//     a au moins deux options, attendu present dans les options du qcm).

import { describe, it, expect } from "vitest";
import {
  BANQUE_EMC,
  COMPETENCES_EMC,
  itemsEmcDe,
  estJusteEmc,
  itemEmcParCle,
} from "./index";
import { COMPETENCES_RESPECT } from "./respect";
import { COMPETENCES_EMOTIONS } from "./emotions";
import { COMPETENCES_REPUBLIQUE } from "./republique";
import { COMPETENCES_ECRANS } from "./ecrans";
import { COMPETENCES_EMC_CM1 } from "./cm1";

describe("banque EMC — Respecter les autres et les regles", () => {
  it("32 items (4 competences x 4 niveaux x 2)", () => {
    const respect = BANQUE_EMC.filter((i) => i.competence.startsWith("EMC.RESPECT."));
    expect(respect.length).toBe(32);
  });
  it("couverture des 4 competences respect x niveaux", () => {
    for (const c of COMPETENCES_RESPECT) {
      for (let n = 1; n <= 4; n++) expect(itemsEmcDe(c, n).length, `${c} N${n}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("banque EMC — Mes emotions", () => {
  it("24 items (3 competences x 4 niveaux x 2)", () => {
    const emo = BANQUE_EMC.filter((i) => i.competence.startsWith("EMC.EMOTIONS."));
    expect(emo.length).toBe(24);
  });
  it("couverture des 3 competences emotions x niveaux", () => {
    for (const c of COMPETENCES_EMOTIONS) {
      for (let n = 1; n <= 4; n++) expect(itemsEmcDe(c, n).length, `${c} N${n}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("banque EMC — Droits et devoirs, la Republique", () => {
  it("32 items (4 competences x 4 niveaux x 2)", () => {
    const rep = BANQUE_EMC.filter((i) => i.competence.startsWith("EMC.REPUBLIQUE."));
    expect(rep.length).toBe(32);
  });
  it("couverture des 4 competences republique x niveaux", () => {
    for (const c of COMPETENCES_REPUBLIQUE) {
      for (let n = 1; n <= 4; n++) expect(itemsEmcDe(c, n).length, `${c} N${n}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("banque EMC — Bien utiliser les ecrans", () => {
  it("32 items (4 competences x 4 niveaux x 2)", () => {
    const ecr = BANQUE_EMC.filter((i) => i.competence.startsWith("EMC.ECRANS."));
    expect(ecr.length).toBe(32);
  });
  it("couverture des 4 competences ecrans x niveaux", () => {
    for (const c of COMPETENCES_ECRANS) {
      for (let n = 1; n <= 4; n++) expect(itemsEmcDe(c, n).length, `${c} N${n}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("banque EMC — complement CM1", () => {
  it("48 items CM1 (6 competences x 4 niveaux x 2)", () => {
    const cm1 = BANQUE_EMC.filter((i) => COMPETENCES_EMC_CM1.includes(i.competence as never));
    expect(cm1.length).toBe(48);
    expect(COMPETENCES_EMC_CM1.length).toBe(6);
  });
  it("couverture des 6 competences CM1 x niveaux (2 par niveau)", () => {
    for (const c of COMPETENCES_EMC_CM1) {
      for (let n = 1; n <= 4; n++) expect(itemsEmcDe(c, n).length, `${c} N${n}`).toBe(2);
    }
  });
});

describe("banque EMC — totaux et qualite", () => {
  it("168 items au total (21 competences x 8), cles uniques", () => {
    expect(BANQUE_EMC.length).toBe(168);
    expect(COMPETENCES_EMC.length).toBe(21);
    const cles = new Set(BANQUE_EMC.map((i) => i.cle));
    expect(cles.size).toBe(BANQUE_EMC.length);
  });

  it("les competences EMC sont bien prefixees EMC.", () => {
    for (const c of COMPETENCES_EMC) expect(c.startsWith("EMC.")).toBe(true);
  });

  it("chaque item a une consigne, un attendu non vide et une explication", () => {
    for (const i of BANQUE_EMC) {
      expect(i.consigne.trim().length, i.cle).toBeGreaterThan(0);
      expect(i.attendu.trim().length, i.cle).toBeGreaterThan(0);
      expect(i.explication.trim().length, i.cle).toBeGreaterThan(0);
      if (i.format === "qcm") expect((i.options ?? []).length, i.cle).toBeGreaterThanOrEqual(2);
      if (i.format === "tri") {
        expect((i.options ?? []).length, i.cle).toBeGreaterThanOrEqual(2);
        expect((i.bins ?? []).length, i.cle).toBeGreaterThanOrEqual(2);
      }
      if (i.format === "ordre") expect((i.options ?? []).length, i.cle).toBeGreaterThanOrEqual(2);
    }
  });

  it("qcm : l'attendu est une des options", () => {
    for (const i of BANQUE_EMC.filter((x) => x.format === "qcm")) {
      expect(i.options, i.cle).toContain(i.attendu);
    }
  });

  it("formats autorises (qcm / tri / ordre / texte)", () => {
    for (const i of BANQUE_EMC) {
      expect(["qcm", "tri", "ordre", "texte"], i.cle).toContain(i.format);
    }
  });
});

describe("estJusteEmc / itemEmcParCle", () => {
  it("juge une bonne et une mauvaise reponse", () => {
    expect(estJusteEmc("emc-res-moq-n2-a", "défendre Sami et prévenir un adulte")).toBe(true);
    expect(estJusteEmc("emc-res-moq-n2-a", "rigoler avec Léo")).toBe(false);
    expect(estJusteEmc("cle-bidon", "x")).toBe(false);
  });
  it("texte : accents EXIGES", () => {
    expect(estJusteEmc("emc-emo-rec-n4-b", "colère")).toBe(true);
    expect(estJusteEmc("emc-emo-rec-n4-b", "colere")).toBe(false);
  });
  it("ordre : la bonne suite est acceptee, une mauvaise refusee", () => {
    const it2 = itemEmcParCle("emc-emo-cal-n3-a")!;
    expect(estJusteEmc(it2.cle, it2.attendu)).toBe(true);
    expect(estJusteEmc(it2.cle, "je parle calmement>je respire doucement>je m'arrête")).toBe(false);
  });
});

// ===========================================================================
// SPOT-CHECK CROISE : ces triplets (cle, format, attendu) DOIVENT etre
// identiques cote SQL (supabase/tests/emc_test.sql). Si tu modifies un item,
// mets a jour les DEUX fichiers.
// ===========================================================================
describe("spot-check croise front <-> SQL", () => {
  const SPOT: Array<[string, string, string]> = [
    ["emc-res-reg-n2-b", "tri", "ranger son matériel=on le fait;écouter la maîtresse=on le fait;se moquer d'un camarade=on ne le fait pas;jeter du papier par terre=on ne le fait pas"],
    ["emc-res-pol-n3-b", "ordre", "tu demandes de l'aide, s'il te plaît>on t'aide>tu dis merci"],
    ["emc-res-moq-n2-a", "qcm", "défendre Sami et prévenir un adulte"],
    ["emc-res-moq-n4-a", "texte", "adulte"],
    ["emc-emo-rec-n2-b", "tri", "c'est mon anniversaire=joie;on a cassé mon jouet exprès=colère;je suis seul dans le noir=peur"],
    ["emc-emo-cal-n3-a", "ordre", "je m'arrête>je respire doucement>je parle calmement"],
    ["emc-emo-rec-n4-b", "texte", "colère"],
    ["emc-rep-sym-n2-a", "qcm", "Liberté, Égalité, Fraternité"],
    ["emc-rep-sym-n4-a", "texte", "Marseillaise"],
    ["emc-rep-vot-n2-b", "ordre", "on présente les candidats>chacun vote>on compte les voix"],
    ["emc-rep-com-n4-a", "texte", "maire"],
    ["emc-ecr-don-n2-a", "tri", "mon adresse=on garde pour soi;mon mot de passe=on garde pour soi;mon dessin animé préféré=on peut dire;ma couleur préférée=on peut dire"],
    ["emc-ecr-cri-n2-a", "qcm", "c'est sûrement truqué"],
    ["emc-ecr-pol-n4-b", "texte", "poli"],
    ["emc-ecr-cri-n4-a", "texte", "croire"],
  ];
  it("chaque triplet correspond a la banque", () => {
    for (const [cle, format, attendu] of SPOT) {
      const item = itemEmcParCle(cle);
      expect(item, cle).toBeDefined();
      expect(item!.format, cle).toBe(format);
      expect(item!.attendu, cle).toBe(attendu);
    }
  });
});

// ===========================================================================
// SPOT-CHECK CROISE CM1 : identiques cote SQL (supabase/tests/emc_cm1_test.sql).
// ===========================================================================
describe("spot-check croise CM1 front <-> SQL", () => {
  const SPOT: Array<[string, string, string]> = [
    ["emc-dro-n2-a", "tri", "aller à l'école=un droit de l'enfant;être soigné quand on est malade=un droit de l'enfant;jouer et se reposer=un droit de l'enfant;faire tout ce qu'on veut sans règle=pas un droit"],
    ["emc-dro-n4-a", "texte", "enfant"],
    ["emc-sym-n2-a", "qcm", "Liberté, Égalité, Fraternité"],
    ["emc-sym-n4-a", "texte", "Fraternité"],
    ["emc-coo-n3-b", "qcm", "en parler à un adulte de confiance"],
    ["emc-ega-n2-a", "tri", "une fille peut devenir pompière=vrai;un garçon peut faire de la danse=vrai;seuls les garçons sont bons en maths=faux;seules les filles peuvent cuisiner=faux"],
    ["emc-pru-n2-a", "tri", "mon mot de passe=on garde pour soi;mon adresse=on garde pour soi;mon dessin préféré=on peut partager;mon jeu préféré=on peut partager"],
    ["emc-eng-n1-b", "qcm", "on vote"],
    ["emc-eng-n4-a", "texte", "délégué"],
    ["emc-coo-n4-b", "texte", "confiance"],
  ];
  it("chaque triplet CM1 correspond a la banque", () => {
    for (const [cle, format, attendu] of SPOT) {
      const item = itemEmcParCle(cle);
      expect(item, cle).toBeDefined();
      expect(item!.format, cle).toBe(format);
      expect(item!.attendu, cle).toBe(attendu);
    }
  });
  it("harcelement : le reflexe « adulte de confiance » est present", () => {
    // Les items sur le fait d'etre embete renvoient a un adulte de confiance.
    expect(itemEmcParCle("emc-coo-n3-b")!.attendu).toContain("adulte de confiance");
    expect(itemEmcParCle("emc-pru-n3-b")!.attendu).toContain("adulte de confiance");
  });
});
