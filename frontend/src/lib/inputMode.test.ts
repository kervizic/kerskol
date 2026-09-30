import { describe, it, expect } from "vitest";
import {
  initialInputMode,
  onPhysicalKey,
  onAnswerZoneTouch,
  toggleInputMode,
  type InputMode,
} from "./inputMode";

describe("initialInputMode : detection du pointeur, override par le choix memorise", () => {
  it("appareil tactile sans choix memorise -> pave", () => {
    expect(initialInputMode(true, null)).toBe("pad");
  });
  it("ordinateur/souris sans choix memorise -> clavier", () => {
    expect(initialInputMode(false, null)).toBe("keyboard");
  });
  it("choix memorise prime sur le type de pointeur (tactile force clavier)", () => {
    expect(initialInputMode(true, "keyboard")).toBe("keyboard");
  });
  it("choix memorise prime sur le type de pointeur (souris force pave)", () => {
    expect(initialInputMode(false, "pad")).toBe("pad");
  });
});

describe("onPhysicalKey : une frappe physique bascule vers le clavier", () => {
  it("pave -> clavier", () => {
    expect(onPhysicalKey("pad")).toBe("keyboard");
  });
  it("clavier -> clavier (idempotent)", () => {
    expect(onPhysicalKey("keyboard")).toBe("keyboard");
  });
});

describe("onAnswerZoneTouch : un toucher sur la case rebascule vers le pave", () => {
  it("clavier -> pave", () => {
    expect(onAnswerZoneTouch("keyboard")).toBe("pad");
  });
  it("pave -> pave (idempotent)", () => {
    expect(onAnswerZoneTouch("pad")).toBe("pad");
  });
});

describe("toggleInputMode : bascule explicite via le bouton dedie", () => {
  it("pave -> clavier", () => {
    expect(toggleInputMode("pad")).toBe("keyboard");
  });
  it("clavier -> pave", () => {
    expect(toggleInputMode("keyboard")).toBe("pad");
  });
});

describe("reversibilite : la sequence frappe puis toucher revient a l'etat de depart", () => {
  it("pave -> (frappe physique) clavier -> (toucher) pave", () => {
    let mode: InputMode = initialInputMode(true, null);
    expect(mode).toBe("pad");
    mode = onPhysicalKey(mode);
    expect(mode).toBe("keyboard");
    mode = onAnswerZoneTouch(mode);
    expect(mode).toBe("pad");
  });
});
