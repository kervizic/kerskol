import { describe, it, expect } from "vitest";
import { shouldApplyUpdate } from "./updateGate";

describe("shouldApplyUpdate (occupe -> attendre)", () => {
  it("applique une nouvelle version quand l'ecran n'est pas occupe", () => {
    expect(shouldApplyUpdate(false, "v1", "v2")).toBe(true);
  });
  it("ATTEND si l'ecran est occupe (creation/reglages/seance)", () => {
    expect(shouldApplyUpdate(true, "v1", "v2")).toBe(false);
  });
  it("ne fait rien si la version est identique", () => {
    expect(shouldApplyUpdate(false, "v1", "v1")).toBe(false);
  });
  it("ne fait rien si la version distante est illisible", () => {
    expect(shouldApplyUpdate(false, "v1", null)).toBe(false);
    expect(shouldApplyUpdate(false, "v1", undefined)).toBe(false);
  });
});
