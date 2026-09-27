import { GoogleButton, LegalLinks } from "../components/ui";
import { signInGoogle } from "../lib/api";
import { AvatarView } from "../domain/avatars";

// Accueil public (non connecte). Presentation courte + connexion Google parent.
export function PublicHome() {
  return (
    <div className="kk-page kk-center">
      <main className="kk-container" style={{ maxWidth: 560, textAlign: "center" }}>
        <div className="kk-card kk-stack">
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            <AvatarView forme="goeland" couleur="#2F855A" size={56} />
            <AvatarView forme="etoile" couleur="#E06A00" size={56} />
            <AvatarView forme="robot" couleur="#5E35B1" size={56} />
          </div>
          <h1>Kerskol</h1>
          <p className="kk-lead" style={{ margin: "0 auto", fontWeight: 700, fontSize: "1.15rem" }}>
            La petite ecole a la maison
          </p>
          <p className="kk-lead" style={{ margin: "0 auto" }}>
            Un espace simple et chaleureux pour s'entrainer au calcul, a son
            rythme. Le parent cree le foyer et le profil de chaque enfant, puis
            tend la tablette. On recompense l'effort, jamais on ne punit.
          </p>
          <div style={{ marginTop: 8 }}>
            <GoogleButton onClick={() => void signInGoogle()} label="Se connecter avec Google" />
            <p className="kk-muted" style={{ fontSize: "0.85rem", marginTop: 10 }}>
              Reserve aux parents. La connexion cree votre foyer a la premiere visite.
            </p>
          </div>
        </div>
        <LegalLinks />
      </main>
    </div>
  );
}
