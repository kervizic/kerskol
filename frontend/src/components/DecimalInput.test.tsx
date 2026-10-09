// Test de RENDU (jsdom + @testing-library/react) du composant <DecimalInput>
// (saisie d'un nombre decimal, lot 2). Verifie la saisie au pave + virgule et
// l'encodage en centiemes remonte via onCode ("3,25" -> 325).

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DecimalInput from "./DecimalInput";

describe("<DecimalInput> : saisie d'un nombre decimal", () => {
  it("compose 3,25 et remonte le code 325 (centiemes)", () => {
    const onCode = vi.fn();
    render(<DecimalInput onCode={onCode} />);

    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "virgule" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "5" }));

    // Le dernier appel correspond a "3,25".
    expect(onCode).toHaveBeenLastCalledWith(325);
    expect(screen.getByLabelText("nombre : 3,25")).toBeInTheDocument();
  });

  it("saisie vide -> code -1", () => {
    const onCode = vi.fn();
    render(<DecimalInput onCode={onCode} />);
    expect(onCode).toHaveBeenLastCalledWith(-1);
  });
});
