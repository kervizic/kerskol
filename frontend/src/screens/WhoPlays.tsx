import { Settings } from "lucide-react";
import { AvatarView } from "../domain/avatars";
import { avatarColor } from "../domain/avatarConfig";
import { universDef } from "../domain/univers";
import { buildAccent } from "../theme/childColors";
import { useEffectiveDark } from "../components/ChildTheme";
import { getDernierProfil } from "../lib/session";
import { ThemeToggle } from "../components/ThemeToggle";
import type { Profil } from "../lib/types";

// Selection de profil : une tuile par enfant. Tuiles centrees, pas de titre.
// Couleur de chaque enfant appliquee a sa tuile. L'acces aux reglages est un
// petit bouton rond en haut a droite (a cote du theme), pas une tuile.
export function WhoPlays({
  profils,
  onPickChild,
  onReglages,
}: {
  profils: Profil[];
  onPickChild: (p: Profil) => void;
  onReglages: () => void;
}) {
  const dark = useEffectiveDark();
  const lastProfilId = getDernierProfil();
  return (
    <div className="kk-page kk-center">
      <div className="kk-toolbar">
        <ThemeToggle />
        <button className="kk-icon-btn" onClick={onReglages} aria-label="Réglages" title="Réglages">
          <Settings size={26} aria-hidden="true" />
        </button>
      </div>
      <div className="kk-who">
        {profils.map((p) => {
          const u = universDef(p.univers);
          const isLast = p.id === lastProfilId;
          const color = avatarColor(p.avatar);
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
                  <AvatarView avatar={p.avatar} size={96} />
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
      </div>
    </div>
  );
}
