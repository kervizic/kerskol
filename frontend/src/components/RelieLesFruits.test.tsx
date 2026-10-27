import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RelieLesFruits, type ResultatGrille } from "./RelieLesFruits";
import type { GrilleRelie } from "../domain/jeux/relie";

// Grille 3x3, 2 paires (pomme, banane), entierement remplie.
const G: GrilleRelie = {
  id: "render-3x3",
  palier: 1,
  w: 3,
  h: 3,
  paires: [
    { fruit: "pomme", chemin: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
    { fruit: "banane", chemin: [[0, 1], [0, 2], [1, 2], [1, 1]] },
  ],
};

describe("RelieLesFruits (rendu)", () => {
  it("affiche la consigne, la grille et les boutons", () => {
    render(<RelieLesFruits grille={G} profil={null} onTermine={() => {}} />);
    expect(screen.getByText(/Relie les fruits pareils/i)).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell")).toHaveLength(9);
    // Les deux fruits (bouts) sont affiches (2 bouts chacun -> 4 images).
    expect(screen.getAllByAltText(/pomme/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByAltText(/banane/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /Annuler/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Recommencer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /indice/i })).toBeInTheDocument();
  });

  it("deux indices relient toutes les paires -> victoire (avec indice)", () => {
    const onTermine = vi.fn<(r: ResultatGrille) => void>();
    render(<RelieLesFruits grille={G} profil={null} onTermine={onTermine} />);
    const indice = screen.getByRole("button", { name: /indice/i });
    fireEvent.click(indice); // revele la paire 0
    expect(onTermine).not.toHaveBeenCalled();
    fireEvent.click(indice); // revele la paire 1 -> grille remplie
    expect(onTermine).toHaveBeenCalledTimes(1);
    expect(onTermine.mock.calls[0][0].reussi).toBe(true);
    expect(onTermine.mock.calls[0][0].avecIndice).toBe(true);
  });
});
