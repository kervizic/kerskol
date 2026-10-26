// Tests de RENDU (jsdom + @testing-library/react) du composant partage
// <RemiseEnOrdre>. Couvre la liste de controle front de la refonte « ordre » :
//   1  nb cases = nb cartes, numeros visibles
//   2  toucher une carte -> va dans la 1re case libre
//   3  toucher une carte placee -> retour ; Recommencer vide tout
//   5  Valider desactive tant qu'une case est vide
//   9  double-toucher (< 300 ms) ignore
//  10  erreur : bonnes placees fixees, fausses reviennent ; solution au 3e echec
//  12  reussite : relecture « d'abord... ensuite... enfin... »
// Le serveur reste SEUL JUGE : onSoumettre fournit le verdict ; `attendu` ne sert
// qu'au feedback local.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RemiseEnOrdre from "./RemiseEnOrdre";

const LABELS = ["Léo demande de l'aide", "Maman ouvre la boîte", "Léo dit merci"];
const ATTENDU = LABELS.join(">");

function monter(onSoumettre = vi.fn().mockResolvedValue({ correct: true }), onContinuer = vi.fn()) {
  render(
    <RemiseEnOrdre
      cle="emc-res-pol-n3-b"
      consigne="Léo n'arrive pas à ouvrir sa boîte. Remets son histoire dans l'ordre."
      labels={LABELS}
      explication="D'abord Léo demande de l'aide, puis Maman ouvre, puis Léo dit merci."
      onSoumettre={onSoumettre}
      onContinuer={onContinuer}
    />,
  );
  return { onSoumettre, onContinuer };
}

function carte(label: string) {
  return screen.getByRole("button", { name: label });
}
function caseVide(n: number) {
  return screen.getByLabelText(new RegExp(`^Case ${n}, vide$`));
}
function casePleine(n: number) {
  return screen.getByLabelText(new RegExp(`^Case ${n} :`));
}

describe("<RemiseEnOrdre>", () => {
  beforeEach(() => {
    // Demo deja vue : evite l'animation de la main pendant les tests.
    localStorage.setItem("kk-demo-ordre", "1");
  });

  it("1 : affiche autant de cases que de cartes, avec des numeros", () => {
    monter();
    expect(caseVide(1)).toBeInTheDocument();
    expect(caseVide(2)).toBeInTheDocument();
    expect(caseVide(3)).toBeInTheDocument();
    // Les 3 etiquettes sont dans la reserve (cartes cliquables).
    for (const l of LABELS) expect(carte(l)).toBeInTheDocument();
  });

  it("2 : toucher une carte l'envoie dans la 1re case libre", () => {
    monter();
    fireEvent.click(carte("Maman ouvre la boîte"));
    expect(casePleine(1)).toHaveTextContent("Maman ouvre la boîte");
    // La carte quitte la reserve.
    expect(screen.queryByRole("button", { name: "Maman ouvre la boîte" })).not.toBeInTheDocument();
  });

  it("3 : toucher une carte placee la renvoie ; Recommencer vide tout", () => {
    monter();
    fireEvent.click(carte("Léo demande de l'aide"));
    fireEvent.click(carte("Maman ouvre la boîte"));
    // Retour de la case 1.
    fireEvent.click(casePleine(1));
    expect(carte("Léo demande de l'aide")).toBeInTheDocument();
    // Recommencer vide tout.
    fireEvent.click(screen.getByRole("button", { name: /Recommencer/ }));
    expect(caseVide(1)).toBeInTheDocument();
    expect(caseVide(2)).toBeInTheDocument();
    expect(caseVide(3)).toBeInTheDocument();
  });

  it("5 : Valider reste desactive tant qu'une case est vide", () => {
    monter();
    const valider = screen.getByRole("button", { name: /Valider/ });
    expect(valider).toBeDisabled();
    fireEvent.click(carte(LABELS[0]));
    fireEvent.click(carte(LABELS[1]));
    expect(valider).toBeDisabled();
    fireEvent.click(carte(LABELS[2]));
    expect(valider).toBeEnabled();
  });

  it("9 : double-toucher la MEME carte -> un seul placement", () => {
    monter();
    const btn = carte(LABELS[0]);
    fireEvent.click(btn);
    fireEvent.click(btn); // 2e toucher < 300 ms sur la meme carte : ignore
    expect(casePleine(1)).toHaveTextContent(LABELS[0]);
    expect(caseVide(2)).toBeInTheDocument(); // aucun second placement
  });

  it("12 : reussite -> relecture d'abord/ensuite/enfin + Continuer(true)", async () => {
    const { onSoumettre, onContinuer } = monter(vi.fn().mockResolvedValue({ correct: true }));
    for (const l of LABELS) fireEvent.click(carte(l));
    fireEvent.click(screen.getByRole("button", { name: /Valider/ }));
    await waitFor(() => expect(onSoumettre).toHaveBeenCalledWith(ATTENDU));
    const relecture = await screen.findByText(/D'abord.*ensuite.*enfin/i);
    expect(relecture).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continuer/ }));
    expect(onContinuer).toHaveBeenCalledWith(true);
  });

  it("10 : erreur -> carte bien placee fixee, fausses reviennent", async () => {
    monter(vi.fn().mockResolvedValue({ correct: false }));
    // Ordre volontairement faux : [2,1,0] -> seule la case 2 est correcte.
    fireEvent.click(carte(LABELS[2]));
    fireEvent.click(carte(LABELS[1]));
    fireEvent.click(carte(LABELS[0]));
    fireEvent.click(screen.getByRole("button", { name: /Valider/ }));
    await waitFor(() => {
      // Les deux fausses reviennent dans la reserve.
      expect(screen.getByRole("button", { name: LABELS[2] })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: LABELS[0] })).toBeInTheDocument();
    });
    // La bonne (case 2) reste placee.
    expect(casePleine(2)).toHaveTextContent(LABELS[1]);
  });

  it("10bis : la solution est montree au 3e echec", async () => {
    monter(vi.fn().mockResolvedValue({ correct: false }));
    for (let essai = 0; essai < 3; essai++) {
      // Remplit les cases libres puis valide.
      for (const l of LABELS) {
        const btn = screen.queryByRole("button", { name: l });
        if (btn) fireEvent.click(btn);
      }
      fireEvent.click(screen.getByRole("button", { name: /Valider/ }));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByRole("button", { name: /Valider|Continuer/ })).toBeInTheDocument());
    }
    expect(await screen.findByText(/Voici l'ordre/)).toBeInTheDocument();
    // La solution affiche l'ordre correct dans les cases.
    expect(casePleine(1)).toHaveTextContent(LABELS[0]);
    expect(casePleine(3)).toHaveTextContent(LABELS[2]);
  });
});
