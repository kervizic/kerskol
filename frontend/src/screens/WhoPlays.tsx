import { AvatarView } from "../domain/avatars";
import { universDef } from "../domain/univers";
import { buildAccent } from "../theme/childColors";
import { usePrefersDark } from "../components/ChildTheme";
import { getDernierProfil } from "../lib/session";
import { ThemeToggle } from "../components/ThemeToggle";
import type { Avatar, Profil } from "../lib/types";

// Roue crantee (SVG maison, couleurs du theme) pour l'acces reglages.
function GearIcon({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" fill="none">
      <path
        d="M32 8l3 6 7-1 2 7 6 3-3 6 3 6-6 3-2 7-7-1-3 6-3-6-7 1-2-7-6-3 3-6-3-6 6-3 2-7 7 1z"
        fill="var(--kk-surface)"
        stroke="var(--kk-accent)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="8" fill="none" stroke="var(--kk-accent)" strokeWidth="3" />
    </svg>
  );
}

// Selection de profil : une tuile par enfant + une tuile Reglages. Tuiles
// centrees. Pas de titre. Couleur de chaque enfant appliquee a sa tuile.
export function WhoPlays({
  profils,
  onPickChild,
  onReglages,
}: {
  profils: Profil[];
  onPickChild: (p: Profil) => void;
  onReglages: () => void;
}) {
  const dark = usePrefersDark();
  const lastProfilId = getDernierProfil();
  return (
    <div className="kk-page kk-center">
      <div className="kk-toolbar"><ThemeToggle /></div>
      <div className="kk-who">
        {profils.map((p) => {
          const av = p.avatar as Avatar;
          const u = universDef(p.univers);
          const isLast = p.id === lastProfilId;
          const color = av?.couleur || "#E06A00";
          const acc = buildAccent(color)[dark ? "dark" : "light"];
          return (
            <button
              key={p.id}
              className={`kk-tile${isLast ? " kk-tile--last" : ""}`}
              onClick={() => onPickChild(p)}
              style={{ borderColor: isLast ? acc.accent : "transparent" }}
            >
              <span className="kk-tile__badge">
                <span className="kk-tile__avatar" style={{ display: "inline-flex", borderColor: acc.accent }}>
                  <AvatarView forme={av?.forme} couleur={color} size={96} />
                </span>
                <span className="kk-tile__vignette">
                  <u.Vignette size={36} />
                </span>
              </span>
              <span className="kk-tile__name" style={{ color: acc.accentText }}>{p.surnom}</span>
              {isLast && <span className="kk-tile__hint" style={{ color: acc.accentText }}>Reprendre</span>}
            </button>
          );
        })}

        <button className="kk-tile kk-tile--parents" onClick={onReglages} aria-label="Réglages">
          <GearIcon size={96} />
          <span className="kk-tile__name">Réglages</span>
        </button>
      </div>
    </div>
  );
}
