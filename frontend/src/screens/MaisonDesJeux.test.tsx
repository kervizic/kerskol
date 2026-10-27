// Maison des jeux : les DEUX jeux sont visibles, et « Les briques » debite bien
// PRIX_PARTIE bonbons a l'entree (jeu_jouer), comme « Relie les fruits ».
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MaisonDesJeux } from "./MaisonDesJeux";
import { DEMO_PROFILS } from "../lib/demo";

const api = vi.hoisted(() => ({
  getMonnaie: vi.fn(),
  getPartiesJeu: vi.fn(),
  getPartiesBriques: vi.fn(),
  jouerPartieJeu: vi.fn(),
  terminerPartieJeu: vi.fn(),
  estSoldeInsuffisant: vi.fn(() => false),
}));

vi.mock("../lib/api", () => api);

const PROFIL = DEMO_PROFILS[0];

beforeEach(() => {
  vi.clearAllMocks();
  api.getPartiesJeu.mockResolvedValue([]);
  api.getPartiesBriques.mockResolvedValue([]);
  api.terminerPartieJeu.mockResolvedValue(undefined);
  api.estSoldeInsuffisant.mockReturnValue(false);
});

describe("MaisonDesJeux — deux jeux + débit", () => {
  it("affiche les deux jeux (Relie les fruits ET Les briques)", async () => {
    api.getMonnaie.mockResolvedValue(50);
    api.jouerPartieJeu.mockResolvedValue({ monnaie: 40 });
    render(<MaisonDesJeux profil={PROFIL} onExit={() => {}} />);

    expect(await screen.findByText("Relie les fruits")).toBeInTheDocument();
    expect(screen.getByText("Les briques")).toBeInTheDocument();
  });

  it("jouer aux Briques débite 10 bonbons (jeu_jouer) et ouvre le jeu", async () => {
    api.getMonnaie.mockResolvedValue(50);
    api.jouerPartieJeu.mockResolvedValue({ monnaie: 40 });
    render(<MaisonDesJeux profil={PROFIL} onExit={() => {}} />);

    await screen.findByText("Les briques");
    // La carte « Les briques » est la 2e ; son bouton Jouer est le 2e.
    const boutons = screen.getAllByRole("button", { name: /Jouer —/i });
    expect(boutons).toHaveLength(2);
    fireEvent.click(boutons[1]);

    await waitFor(() =>
      expect(api.jouerPartieJeu).toHaveBeenCalledWith(PROFIL.id, "les-briques")
    );
    // L'ecran de jeu est monte : commandes tactiles propres aux briques.
    expect(await screen.findByRole("button", { name: /Tourner/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gauche/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Droite/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descendre/i })).toBeInTheDocument();
  });

  it("solde insuffisant : aucun débit, message d'encouragement", async () => {
    api.getMonnaie.mockResolvedValue(5); // < PRIX_PARTIE (10)
    render(<MaisonDesJeux profil={PROFIL} onExit={() => {}} />);

    await screen.findByText("Les briques");
    const boutons = screen.getAllByRole("button", { name: /Jouer —/i });
    fireEvent.click(boutons[1]);

    expect(await screen.findByText(/Il te faut 10 bonbons/i)).toBeInTheDocument();
    expect(api.jouerPartieJeu).not.toHaveBeenCalled();
  });
});
