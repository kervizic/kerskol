import { describe, it, expect } from "vitest";
import { shouldAutoPlay, shouldPlayManual, lectureAutoDeProfil } from "./autoplay";

describe("shouldAutoPlay : reglage profil + activation (geste iOS) + clips", () => {
  it("tout reuni -> lit", () => {
    expect(shouldAutoPlay(true, true, true)).toBe(true);
  });
  it("reglage off -> ne lit pas", () => {
    expect(shouldAutoPlay(false, true, true)).toBe(false);
  });
  it("pas encore de geste utilisateur (iOS) -> ne lit pas", () => {
    expect(shouldAutoPlay(true, false, true)).toBe(false);
  });
  it("aucun clip disponible -> ne lit pas", () => {
    expect(shouldAutoPlay(true, true, false)).toBe(false);
  });
});

describe("shouldPlayManual : le bouton part d'un geste, pas soumis au reglage", () => {
  it("des clips -> lit", () => {
    expect(shouldPlayManual(true)).toBe(true);
  });
  it("aucun clip -> ne lit pas", () => {
    expect(shouldPlayManual(false)).toBe(false);
  });
});

describe("lectureAutoDeProfil : defaut actif si le champ est absent", () => {
  it("champ true", () => {
    expect(lectureAutoDeProfil({ lecture_auto: true })).toBe(true);
  });
  it("champ false", () => {
    expect(lectureAutoDeProfil({ lecture_auto: false })).toBe(false);
  });
  it("champ absent -> actif par defaut", () => {
    expect(lectureAutoDeProfil({})).toBe(true);
    expect(lectureAutoDeProfil(null)).toBe(true);
  });
});
