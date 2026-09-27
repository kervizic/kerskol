import { describe, it, expect } from "vitest";
import {
  CHILD_COLORS,
  buildAccent,
  contrast,
  BG_LIGHT,
  BG_DARK,
} from "./childColors";

// Seuils WCAG : gros texte gras / composant UI >= 3.0 ; texte accent >= 4.5.
describe("childColors : accents accessibles pour les 8 couleurs", () => {
  it("expose 8 couleurs", () => {
    expect(CHILD_COLORS.length).toBe(8);
  });

  for (const base of CHILD_COLORS) {
    it(`${base} : bouton plein (texte blanc) >= 3:1 en clair et sombre`, () => {
      const p = buildAccent(base);
      expect(contrast(p.light.accent, p.light.onAccent)).toBeGreaterThanOrEqual(3);
      expect(contrast(p.dark.accent, p.dark.onAccent)).toBeGreaterThanOrEqual(3);
    });

    it(`${base} : texte accent >= 4.5:1 sur le fond (clair et sombre)`, () => {
      const p = buildAccent(base);
      expect(contrast(p.light.accentText, BG_LIGHT)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.dark.accentText, BG_DARK)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
