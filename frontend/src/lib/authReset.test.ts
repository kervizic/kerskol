import { describe, it, expect } from "vitest";
import { authAction } from "./authReset";

const U1 = "user-1";
const U2 = "user-2";

describe("authAction", () => {
  it("ignore un TOKEN_REFRESHED pour le meme utilisateur", () => {
    expect(authAction(U1, "TOKEN_REFRESHED", U1)).toBe("ignore");
  });
  it("ignore un SIGNED_IN reemis au retour de focus (meme utilisateur)", () => {
    expect(authAction(U1, "SIGNED_IN", U1)).toBe("ignore");
  });
  it("ignore INITIAL_SESSION et USER_UPDATED pour le meme utilisateur", () => {
    expect(authAction(U1, "INITIAL_SESSION", U1)).toBe("ignore");
    expect(authAction(U1, "USER_UPDATED", U1)).toBe("ignore");
  });
  it("repasse en public sur SIGNED_OUT", () => {
    expect(authAction(U1, "SIGNED_OUT", null)).toBe("signed_out");
    expect(authAction(U1, "SIGNED_OUT", U1)).toBe("signed_out");
  });
  it("traite une session nulle comme une deconnexion", () => {
    expect(authAction(U1, "TOKEN_REFRESHED", null)).toBe("signed_out");
  });
  it("(re)bootstrap a la premiere identification", () => {
    expect(authAction(null, "SIGNED_IN", U1)).toBe("user_changed");
    expect(authAction(null, "INITIAL_SESSION", U1)).toBe("user_changed");
  });
  it("(re)bootstrap si l'utilisateur change", () => {
    expect(authAction(U1, "SIGNED_IN", U2)).toBe("user_changed");
  });
});
