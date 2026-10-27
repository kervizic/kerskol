// « Les briques » : rendu du composant dans un DOM (jsdom). Le canvas n'est pas
// dessine (jsdom n'implemente pas getContext), mais l'IHM (titre, infos,
// commandes tactiles, apercu de la piece suivante, bouton quitter) doit etre la
// et le bouton ✕ doit appeler onQuitter.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JeuBriques } from "./JeuBriques";
import { NOM_JEU } from "../domain/jeux/briques/moteur";

describe("JeuBriques (rendu)", () => {
  it("affiche le nom « Les briques », les infos et les commandes tactiles", () => {
    render(<JeuBriques onFini={() => {}} onQuitter={() => {}} />);

    expect(NOM_JEU).toBe("Les briques");
    expect(screen.getByText("Les briques")).toBeInTheDocument();
    expect(screen.getByText("Lignes")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("Temps")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Gauche/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tourner/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descendre/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Droite/i })).toBeInTheDocument();
    // Apercu de la prochaine piece present.
    expect(screen.getByLabelText(/Prochaine piece/i)).toBeInTheDocument();
  });

  it("jamais la marque « Tetris »", () => {
    const { container } = render(<JeuBriques onFini={() => {}} onQuitter={() => {}} />);
    expect(container.textContent?.toLowerCase()).not.toContain("tetris");
  });

  it("le bouton ✕ appelle onQuitter", () => {
    const onQuitter = vi.fn();
    render(<JeuBriques onFini={() => {}} onQuitter={onQuitter} />);
    fireEvent.click(screen.getByRole("button", { name: /Quitter le jeu/i }));
    expect(onQuitter).toHaveBeenCalledTimes(1);
  });
});
