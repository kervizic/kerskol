// Lot D - « Dictée avec papa ou maman » masquee tant que son drapeau est a
// false : elle ne doit apparaitre NULLE PART (menu enfant, et par construction
// le gabarit parent + la route, gardes par le meme drapeau FEATURE_DICTEE_PARENT).
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Village } from "./Village";
import { FEATURE_DICTEE_PARENT } from "../domain/featureFlags";
import { DEMO_PROFILS } from "../lib/demo";
import type { Referentiel } from "../lib/api";

vi.mock("../lib/api", () => ({
  getProgression: vi.fn().mockResolvedValue([]),
  reglerMatieres: vi.fn().mockResolvedValue(undefined),
  updateProfil: vi.fn().mockResolvedValue(undefined),
}));

const REFERENTIEL = { competences: [], prerequis: [] } as unknown as Referentiel;

function noop() {}

describe("Lot D - dictée avec papa ou maman masquée", () => {
  it("le drapeau est desactive", () => {
    expect(FEATURE_DICTEE_PARENT).toBe(false);
  });

  it("le menu enfant (Village) n'affiche pas l'entree dictée avec un parent", () => {
    render(
      <Village
        profil={DEMO_PROFILS[0]}
        referentiel={REFERENTIEL}
        onExit={noop}
        onStart={noop}
        onDefi={noop}
        onBiblio={noop}
        onDictee={noop}
        onHistoire={noop}
        onGeoParcours={noop}
        onSciencesParcours={noop}
        onProfilChange={noop}
      />
    );
    // L'entree masquee est absente...
    expect(screen.queryByText(/Dict[ée]e avec un parent/i)).toBeNull();
    // ...mais le reste du menu est bien rendu (temoin de non-regression).
    expect(screen.getByRole("button", { name: /Défi chrono/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bibliothèque/i })).toBeInTheDocument();
  });
});
