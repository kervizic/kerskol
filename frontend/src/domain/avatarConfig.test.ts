import { describe, it, expect } from "vitest";
import {
  avatarColor,
  controlsForStyle,
  defaultDicebearAvatar,
  DICEBEAR_STYLES,
  isDicebearAvatar,
  isLegacyAvatar,
  previewOptions,
  randomOptions,
  renderDicebearSvg,
  selectedVariant,
  setVariant,
  STYLE_KEYS,
  type AvatarOptions,
} from "./avatarConfig";

// RNG deterministe pour des tests reproductibles.
function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe("styles DiceBear", () => {
  it("expose exactement 3 styles dans l'ordre impose", () => {
    expect(STYLE_KEYS).toEqual(["adventurer", "funEmoji", "pixelArt"]);
    expect(DICEBEAR_STYLES.map((s) => s.label)).toEqual(["Aventurier", "Émoji rigolo", "Pixel"]);
  });

  it("rend un SVG non vide pour chacun des 3 styles", () => {
    for (const key of STYLE_KEYS) {
      const svg = renderDicebearSvg(key, randomOptions(key, seededRand(7)), 96);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain("</svg>");
      expect(svg.length).toBeGreaterThan(100);
    }
  });

  it("derive des controles (au moins coiffure/yeux) depuis le schema", () => {
    const keys = controlsForStyle("adventurer").map((c) => c.key);
    expect(keys).toContain("hair");
    expect(keys).toContain("eyes");
    expect(keys).toContain("skinColor");
  });
});

describe("serialisation avatar", () => {
  it("un avatar DiceBear survit a un aller-retour JSON et reste rendable", () => {
    const avatar = defaultDicebearAvatar("#3182CE", "pixelArt", seededRand(42));
    const round = JSON.parse(JSON.stringify(avatar));
    expect(round).toEqual(avatar);
    expect(isDicebearAvatar(round)).toBe(true);
    expect(avatarColor(round)).toBe("#3182CE");
    expect(renderDicebearSvg(round.style, round.options).startsWith("<svg")).toBe(true);
  });

  it("selectedVariant relit ce que setVariant a ecrit", () => {
    let opts: AvatarOptions = {};
    opts = setVariant(opts, "hair", "long01", false);
    expect(selectedVariant(opts, "hair")).toBe("long01");
    // Option optionnelle desactivee -> aucun.
    opts = setVariant(opts, "glasses", null, true);
    expect(selectedVariant(opts, "glasses")).toBe(null);
    expect(opts.glassesProbability).toBe(0);
  });

  it("previewOptions ne mute pas l'objet d'origine", () => {
    const base: AvatarOptions = { hair: ["long01"] };
    const control = controlsForStyle("adventurer").find((c) => c.key === "hair")!;
    const next = previewOptions(base, control, "short01");
    expect(base.hair).toEqual(["long01"]);
    expect(next.hair).toEqual(["short01"]);
  });
});

describe("retrocompatibilite avatar maison", () => {
  const legacy = { forme: "goeland", couleur: "#2F855A" };

  it("un ancien avatar est reconnu legacy, pas DiceBear", () => {
    expect(isLegacyAvatar(legacy)).toBe(true);
    expect(isDicebearAvatar(legacy)).toBe(false);
  });

  it("sa couleur reste lisible et l'objet n'est pas modifie", () => {
    const snapshot = JSON.stringify(legacy);
    expect(avatarColor(legacy)).toBe("#2F855A");
    expect(JSON.stringify(legacy)).toBe(snapshot); // non mute
  });

  it("un avatar vide retombe sur une couleur par defaut", () => {
    expect(isDicebearAvatar({})).toBe(false);
    expect(isLegacyAvatar({})).toBe(false);
    expect(avatarColor({})).toBe("#E06A00");
  });
});
