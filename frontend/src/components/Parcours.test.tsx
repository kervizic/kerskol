import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Parcours from "./Parcours";
import { chapitreParCle } from "../domain/histoire/parcours";

const chapitre = chapitreParCle("moyen_age")!;

function renderParcours() {
  const onSoumettre = vi.fn().mockResolvedValue({ correct: true });
  const onPlacerFrise = vi.fn().mockResolvedValue({ correct: true });
  const onTermine = vi.fn();
  render(
    <Parcours
      chapitre={chapitre}
      frisePlacees={[]}
      onSoumettre={onSoumettre}
      onPlacerFrise={onPlacerFrise}
      onTermine={onTermine}
    />,
  );
  return { onSoumettre, onPlacerFrise, onTermine };
}

describe("Parcours — étapes", () => {
  it("démarre sur le récit (témoin + document + bouton)", () => {
    renderParcours();
    expect(screen.getByText(/Raconté par/)).toBeInTheDocument();
    expect(screen.getByText(chapitre.document.legende)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Commencer les questions/ })).toBeInTheDocument();
  });

  it("passe aux questions, propose « Revoir le récit » et soumet au serveur", async () => {
    const { onSoumettre } = renderParcours();
    fireEvent.click(screen.getByRole("button", { name: /Commencer les questions/ }));

    expect(screen.getByText(/Question 1 \/ 4/)).toBeInTheDocument();
    const revoir = screen.getByRole("button", { name: /Revoir le récit/ });
    expect(revoir).toBeInTheDocument();

    // La première question (qcm) propose la bonne réponse.
    fireEvent.click(screen.getByRole("button", { name: "la seigneurie" }));
    fireEvent.click(screen.getByRole("button", { name: /Valider/ }));
    await waitFor(() => expect(onSoumettre).toHaveBeenCalledWith("pa-moy-q1", "la seigneurie"));
  });

  it("« Revoir le récit » réaffiche le récit pendant les questions", () => {
    renderParcours();
    fireEvent.click(screen.getByRole("button", { name: /Commencer les questions/ }));
    // Avant de cliquer : le récit n'est pas affiché pendant les questions.
    expect(screen.queryByText(/Raconté par/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Revoir le récit/ }));
    // Après : le récit (témoin) est réaffiché dans le panneau.
    expect(screen.getByText(/Raconté par/)).toBeInTheDocument();
  });
});
