import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Frise, { siecleRomain } from "./Frise";
import type { FriseCarte } from "../domain/histoire/parcours";

const colomb: FriseCarte = {
  cle: "fri-1492-colomb", titre: "Colomb en Amérique", icone: "planisphere",
  dateLabel: "1492", cleTri: 14921012, periode: "temps_modernes",
};
const magellan: FriseCarte = {
  cle: "fri-1519-magellan", titre: "Magellan", icone: "caravelle",
  dateLabel: "1519", cleTri: 15190920, periode: "temps_modernes",
};
const versailles: FriseCarte = {
  cle: "fri-1682-versailles", titre: "Versailles", icone: "soleil",
  dateLabel: "1682", cleTri: 16820506, periode: "temps_modernes",
};

describe("siecleRomain", () => {
  it("convertit une cle de tri en siecle romain", () => {
    expect(siecleRomain(14921012)).toBe("XVe siècle");
    expect(siecleRomain(17890714)).toBe("XVIIIe siècle");
    expect(siecleRomain(11630101)).toBe("XIIe siècle");
  });
});

describe("Frise — consultation", () => {
  it("affiche les cartes placees avec leur date et leur siecle", () => {
    render(<Frise cartes={[colomb, magellan]} titre="Ma frise du temps" />);
    expect(screen.getByText("Ma frise du temps")).toBeInTheDocument();
    expect(screen.getByText("Colomb en Amérique")).toBeInTheDocument();
    expect(screen.getByText("1492")).toBeInTheDocument();
    expect(screen.getAllByText("XVIe siècle").length).toBeGreaterThan(0);
  });

  it("frise vide : message d'invitation", () => {
    render(<Frise cartes={[]} />);
    expect(screen.getByText(/Ta frise est encore vide/)).toBeInTheDocument();
  });
});

describe("Frise — placement (serveur seul juge)", () => {
  it("place la carte a la fin et envoie l'ordre au serveur", async () => {
    const onPlacer = vi.fn().mockResolvedValue({ correct: true });
    const onContinuer = vi.fn();
    render(
      <Frise cartes={[colomb, magellan]} aPlacer={versailles} onPlacer={onPlacer} onContinuer={onContinuer} />,
    );
    // Valider est desactive tant qu'aucune position n'est choisie.
    expect(screen.getByRole("button", { name: /Valider/ })).toBeDisabled();
    // Choisir la fente « apres Magellan ».
    fireEvent.click(screen.getByRole("button", { name: /insérer après Magellan/ }));
    fireEvent.click(screen.getByRole("button", { name: /Valider/ }));
    await waitFor(() =>
      expect(onPlacer).toHaveBeenCalledWith([
        "fri-1492-colomb", "fri-1519-magellan", "fri-1682-versailles",
      ]),
    );
    await screen.findByText(/Bravo/);
    fireEvent.click(screen.getByRole("button", { name: /Continuer/ }));
    expect(onContinuer).toHaveBeenCalled();
  });

  it("mauvais placement : message d'encouragement et re-essai", async () => {
    const onPlacer = vi.fn().mockResolvedValue({ correct: false });
    render(<Frise cartes={[magellan]} aPlacer={colomb} onPlacer={onPlacer} onContinuer={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /insérer après Magellan/ }));
    fireEvent.click(screen.getByRole("button", { name: /Valider/ }));
    await screen.findByText(/pas encore le bon endroit/);
    expect(screen.getByRole("button", { name: /Réessayer/ })).toBeInTheDocument();
  });
});
