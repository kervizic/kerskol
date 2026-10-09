import { describe, it, expect } from "vitest";
import {
  messageErreur,
  messageFausseAlerte,
  messageBilan,
  expliquerType,
  MESSAGES_DICTEE,
} from "./dictee";
import {
  normaliserMot,
  propositionsDictee,
  motAffichable,
  type TypeDictee,
  type DicteeErreurRevelee,
  type DicteeResultat,
} from "../francais/dictee";

const TYPES: TypeDictee[] = [
  "a_a", "et_est", "son_sont", "on_ont", "ces_ses", "ce_se",
  "pluriel", "pluriel_al_aux", "accord", "verbe_ent", "m_mbp", "e_er_ez",
  "la_la", "ou_ou",
  "accord_sv", "participe_passe", "passe_simple", "imperatif",
];

function err(over: Partial<DicteeErreurRevelee>): DicteeErreurRevelee {
  return {
    position: 1, faute: "a", correction: "à", type: "a_a",
    trouvee: false, correction_ok: false, cor_saisie: null, ...over,
  };
}

// --- Explications de type (astuce + exemple pour chaque type) ---------------
describe("expliquerType : une astuce avec exemple pour chaque type", () => {
  for (const t of TYPES) {
    it(`${t} : message non vide, avec exemple`, () => {
      const m = expliquerType(t);
      expect(m.length).toBeGreaterThan(10);
      expect(m).toBe(MESSAGES_DICTEE[t]);
    });
  }
});

// --- Mot MANQUE : surligne la correction + donne l'astuce -------------------
describe("messageErreur : mot manque (chaque type)", () => {
  for (const t of TYPES) {
    it(`${t} manque -> ton rate, correction surlignee`, () => {
      const e = err({ type: t, faute: "mot", correction: "motcorrige", trouvee: false });
      const m = messageErreur(e, 3);
      expect(m.ton).toBe("rate");
      expect(m.texte).toContain("motcorrige");
      expect(m.surligne).toEqual(["motcorrige"]);
      expect(m.texte).toContain(MESSAGES_DICTEE[t]);
    });
  }
});

// --- Mot TROUVE mais MAL CORRIGE (niveau >= 2) ------------------------------
describe("messageErreur : trouve mais mal corrige", () => {
  for (const t of ["a_a", "et_est", "pluriel", "verbe_ent", "m_mbp"] as TypeDictee[]) {
    it(`${t} -> « Bien trouve ! » + correction + astuce`, () => {
      const e = err({ type: t, correction: "bonneforme", trouvee: true, correction_ok: false, cor_saisie: "faux" });
      const m = messageErreur(e, 2);
      expect(m.ton).toBe("info");
      expect(m.texte).toContain("Bien trouvé");
      expect(m.texte).toContain("bonneforme");
      expect(m.texte).toContain(MESSAGES_DICTEE[t]);
    });
  }
});

// --- Mot TROUVE et BIEN CORRIGE / trouve au niveau 1 ------------------------
describe("messageErreur : reussites", () => {
  it("niveau 2+ : trouve + corrige -> ton ok", () => {
    const m = messageErreur(err({ correction: "à", trouvee: true, correction_ok: true, cor_saisie: "à" }), 2);
    expect(m.ton).toBe("ok");
    expect(m.texte).toContain("à");
  });
  it("niveau 1 : trouve (sans correction) -> ton ok", () => {
    const m = messageErreur(err({ faute: "son", correction: "sont", trouvee: true }), 1);
    expect(m.ton).toBe("ok");
    expect(m.texte).toContain("son");
  });
});

// --- Fausse alerte ----------------------------------------------------------
describe("messageFausseAlerte", () => {
  it("mot juste touche -> encourageant, jamais punitif", () => {
    const m = messageFausseAlerte("chat");
    expect(m.ton).toBe("info");
    expect(m.texte).toContain("était juste");
    expect(m.texte).toContain("chat");
  });
});

// --- Bilan valorisant -------------------------------------------------------
describe("messageBilan : toujours valorisant", () => {
  const base: DicteeResultat = {
    juste: false, niveau: 1, nb_erreurs: 3, trouvees: 2, corrigees: 0,
    fausses_alertes: [], type_dominant: "a_a", erreurs: [],
  };
  it("juste (plusieurs) : felicitations completes", () => {
    expect(messageBilan({ ...base, juste: true })).toContain("3 sur 3");
  });
  it("juste (une seule) : message court", () => {
    expect(messageBilan({ ...base, juste: true, nb_erreurs: 1 })).toContain("tout repéré");
  });
  it("N1 incomplet : compte les trouvees, encourage", () => {
    const m = messageBilan(base);
    expect(m).toContain("2 sur 3");
    expect(m).not.toContain("raté");
  });
  it("N2 incomplet : compte les corrigees", () => {
    const m = messageBilan({ ...base, niveau: 2, corrigees: 1 });
    expect(m).toContain("1 sur 3");
  });
});

// --- Normalisation d'un mot (miroir du SQL) ---------------------------------
describe("normaliserMot", () => {
  it("minuscules + ponctuation de bord retiree", () => {
    expect(normaliserMot("Chat.")).toBe("chat");
    expect(normaliserMot("« Bonjour »")).toBe("bonjour");
    expect(normaliserMot("doré.")).toBe("doré");
  });
  it("accents CONSERVES (accents exiges)", () => {
    expect(normaliserMot("étoiles")).toBe("étoiles");
    expect(normaliserMot("etoiles")).not.toBe(normaliserMot("étoiles"));
  });
  it("apostrophe typographique normalisee, trait d'union garde", () => {
    expect(normaliserMot("l’école")).toBe("l'école");
    expect(normaliserMot("Grand-mère")).toBe("grand-mère");
  });
  it("motAffichable retire la ponctuation de bord mais garde le mot", () => {
    expect(motAffichable("doré.")).toBe("doré");
    expect(motAffichable("«chat»")).toBe("chat");
  });
});

// --- Propositions QCM (niveau 2), derivees du MOT VISIBLE, sans fuite -------
describe("propositionsDictee : QCM leakless", () => {
  it("homophones : la paire est proposee (dans les deux sens)", () => {
    expect(propositionsDictee("a")).toEqual(expect.arrayContaining(["a", "à"]));
    expect(propositionsDictee("à")).toEqual(expect.arrayContaining(["a", "à"]));
    expect(propositionsDictee("et")).toEqual(expect.arrayContaining(["et", "est"]));
    expect(propositionsDictee("son")).toEqual(expect.arrayContaining(["son", "sont"]));
    expect(propositionsDictee("ont")).toEqual(expect.arrayContaining(["on", "ont"]));
    expect(propositionsDictee("ces")).toEqual(expect.arrayContaining(["ces", "ses"]));
    expect(propositionsDictee("se")).toEqual(expect.arrayContaining(["ce", "se"]));
    expect(propositionsDictee("la")).toEqual(expect.arrayContaining(["la", "là"]));
    expect(propositionsDictee("là")).toEqual(expect.arrayContaining(["la", "là"]));
    expect(propositionsDictee("ou")).toEqual(expect.arrayContaining(["ou", "où"]));
    expect(propositionsDictee("où")).toEqual(expect.arrayContaining(["ou", "où"]));
  });
  it("le mot touche figure TOUJOURS dans les options (pas de fuite)", () => {
    expect(propositionsDictee("chat")).toContain("chat");
    expect(propositionsDictee("chats")).toContain("chats");
  });
  it("pluriel : singulier -> +s, et -eau -> +x", () => {
    expect(propositionsDictee("chat")).toContain("chats");
    expect(propositionsDictee("bateau")).toContain("bateaux");
  });
  it("pluriel : forme en s -> propose le singulier", () => {
    expect(propositionsDictee("chats")).toContain("chat");
  });
  it("pluriel -al/-aux : cheval <-> chevaux", () => {
    expect(propositionsDictee("cheval")).toContain("chevaux");
    expect(propositionsDictee("chevaux")).toContain("cheval");
    expect(propositionsDictee("animal")).toContain("animaux");
  });
  it("verbe : -e <-> -ent", () => {
    expect(propositionsDictee("joue")).toContain("jouent");
    expect(propositionsDictee("jouent")).toContain("joue");
  });
  it("au moins deux propositions quand une famille s'applique", () => {
    for (const w of ["a", "et", "chat", "chats", "joue", "jouent", "bateau"]) {
      expect(propositionsDictee(w).length).toBeGreaterThanOrEqual(2);
    }
  });
});
