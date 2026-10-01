import { describe, it, expect, vi } from "vitest";
import { resolveEntry, villageRoute, LINK_ROUTE, type EntryDeps } from "./bootstrap";
import type { Profil } from "./types";

const profilEnfant: Profil = {
  id: "p-iris",
  foyer_id: "f-1",
  surnom: "Iris",
  avatar: { forme: "goeland", couleur: "#2F855A" },
  univers: "village_breton",
  classe: "CE2",
  matieres_actives: ["MA"],
  limite_jour_min: null,
  limite_semaine_min: null,
  monnaie: 0,
  user_id: "u-iris",
};

function deps(over: Partial<EntryDeps>): EntryDeps {
  return {
    statutLienEnfant: vi.fn().mockResolvedValue({ etat: "aucun" }),
    getProfilById: vi.fn().mockResolvedValue(profilEnfant),
    ensureFoyer: vi.fn().mockResolvedValue("f-parent"),
    listProfils: vi.fn().mockResolvedValue([]),
    ...over,
  };
}

describe("resolveEntry", () => {
  it("enfant relie : va droit dans son village, SANS creer de foyer", async () => {
    const ensureFoyer = vi.fn().mockResolvedValue("ne-doit-pas-etre-appele");
    const d = deps({
      statutLienEnfant: vi.fn().mockResolvedValue({ etat: "relie", profil_id: "p-iris" }),
      ensureFoyer,
    });
    const r = await resolveEntry(d);

    expect(r.mode).toBe("child");
    expect(r.foyerId).toBe("f-1");
    expect(r.profils).toEqual([profilEnfant]);
    expect(r.route).toBe(villageRoute("p-iris"));
    expect(ensureFoyer).not.toHaveBeenCalled();
  });

  it("lien en attente : ecran de saisie du code, aucun foyer cree", async () => {
    const ensureFoyer = vi.fn();
    const getProfilById = vi.fn();
    const d = deps({
      statutLienEnfant: vi.fn().mockResolvedValue({ etat: "en_attente" }),
      ensureFoyer,
      getProfilById,
    });
    const r = await resolveEntry(d);

    expect(r.mode).toBe("child_pending");
    expect(r.route).toBe(LINK_ROUTE);
    expect(r.foyerId).toBeNull();
    expect(ensureFoyer).not.toHaveBeenCalled();
    expect(getProfilById).not.toHaveBeenCalled();
  });

  it("email non confirme : ecran dedie, pas de rattachement", async () => {
    const d = deps({
      statutLienEnfant: vi.fn().mockResolvedValue({ etat: "email_non_confirme" }),
    });
    const r = await resolveEntry(d);
    expect(r.mode).toBe("email_non_confirme");
    expect(r.route).toBeNull();
  });

  it("parent : creer_foyer idempotent puis liste des profils, pas de route imposee", async () => {
    const p2 = { ...profilEnfant, id: "p-lou", user_id: null };
    const d = deps({
      statutLienEnfant: vi.fn().mockResolvedValue({ etat: "aucun" }),
      ensureFoyer: vi.fn().mockResolvedValue("f-parent"),
      listProfils: vi.fn().mockResolvedValue([p2]),
    });
    const r = await resolveEntry(d);

    expect(r.mode).toBe("parent");
    expect(r.foyerId).toBe("f-parent");
    expect(r.profils).toEqual([p2]);
    expect(r.route).toBeNull();
    expect(d.getProfilById).not.toHaveBeenCalled();
  });

  it("inscriptions fermees : creer_foyer refuse -> ecran dedie", async () => {
    const err = Object.assign(new Error("inscriptions_fermees"), { code: "inscriptions_fermees" });
    const d = deps({
      statutLienEnfant: vi.fn().mockResolvedValue({ etat: "aucun" }),
      ensureFoyer: vi.fn().mockRejectedValue(err),
    });
    const r = await resolveEntry(d);
    expect(r.mode).toBe("inscriptions_fermees");
    expect(r.foyerId).toBeNull();
  });
});
