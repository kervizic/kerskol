import { describe, it, expect, vi } from "vitest";
import { resolveEntry, villageRoute, type EntryDeps } from "./bootstrap";
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
    rattacherSiAttendu: vi.fn().mockResolvedValue(null),
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
      rattacherSiAttendu: vi.fn().mockResolvedValue("p-iris"),
      ensureFoyer,
    });
    const r = await resolveEntry(d);

    expect(r.mode).toBe("child");
    expect(r.foyerId).toBe("f-1");
    expect(r.profils).toEqual([profilEnfant]);
    expect(r.route).toBe(villageRoute("p-iris"));
    expect(r.route).toBe("/enfant/p-iris/village");
    // Aucun foyer cree pour l'enfant.
    expect(ensureFoyer).not.toHaveBeenCalled();
  });

  it("parent : creer_foyer idempotent puis liste des profils, pas de route imposee", async () => {
    const p2 = { ...profilEnfant, id: "p-lou", user_id: null };
    const d = deps({
      rattacherSiAttendu: vi.fn().mockResolvedValue(null),
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
});
