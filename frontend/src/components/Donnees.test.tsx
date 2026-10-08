// Test de RENDU (outillage : jsdom + @testing-library/react) du composant
// <Donnees>, sur un item « hasard » du lot 7 (format qcm, figure « none »).
// Verifie : consigne affichee, options QCM cliquables (cibles >= 44 px via
// .kk-btn), validation -> appel serveur (onSoumettre), puis continuation
// (onContinuer) avec le verdict serveur. Le composant reste « serveur seul
// juge » : onSoumettre est le verdict, `attendu` ne sert qu'au feedback.

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Donnees from "./Donnees";
import type { DonRender } from "../domain/donnees/donnees";

const itemHasard: DonRender = {
  cle: "has-n1-a",
  format: "qcm",
  consigne: "Tu lances un dé à six faces. Obtenir 4, est-ce possible, impossible ou certain ?",
  options: ["possible", "impossible", "certain"],
  attendu: "possible",
  explication: "Le dé a les faces 1, 2, 3, 4, 5, 6. On peut tomber sur 4 : c'est possible.",
  figure: { kind: "none" },
};

describe("<Donnees> : rendu d'un item hasard (qcm, figure none)", () => {
  it("affiche la consigne et les trois options", () => {
    render(<Donnees item={itemHasard} onSoumettre={vi.fn()} onContinuer={vi.fn()} />);
    expect(screen.getByText(/est-ce possible, impossible ou certain/)).toBeInTheDocument();
    for (const o of itemHasard.options!) {
      expect(screen.getByRole("button", { name: o })).toBeInTheDocument();
    }
  });

  it("choisir une option puis valider appelle le serveur, puis continuer renvoie le verdict", async () => {
    const onSoumettre = vi.fn().mockResolvedValue({ correct: true });
    const onContinuer = vi.fn();
    render(<Donnees item={itemHasard} onSoumettre={onSoumettre} onContinuer={onContinuer} />);

    fireEvent.click(screen.getByRole("button", { name: "possible" }));
    fireEvent.click(screen.getByRole("button", { name: /Valider/ }));

    await waitFor(() => expect(onSoumettre).toHaveBeenCalledWith("has-n1-a", "possible"));

    // Feedback serveur (explication) puis bouton Continuer.
    await screen.findByText(/On peut tomber sur 4/);
    fireEvent.click(screen.getByRole("button", { name: /Continuer/ }));
    expect(onContinuer).toHaveBeenCalledWith(true);
  });
});
