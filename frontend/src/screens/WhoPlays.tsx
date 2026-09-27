import { AvatarView } from "../domain/avatars";
import { universDef } from "../domain/univers";
import { buildAccent } from "../theme/childColors";
import { usePrefersDark } from "../components/ChildTheme";
import type { Avatar, Profil } from "../lib/types";

// "Qui joue ?" : une grande tuile par enfant + une tuile "Parents".
export function WhoPlays({
  profils,
  lastProfilId,
  onPickChild,
  onParents,
}: {
  profils: Profil[];
  lastProfilId: string | null;
  onPickChild: (p: Profil) => void;
  onParents: () => void;
}) {
  const dark = usePrefersDark();
  return (
    <div className="kk-page">
      <div className="kk-container">
        <h1 style={{ textAlign: "center", marginBottom: 24 }}>Qui joue ?</h1>
        <div className="kk-tiles">
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

          <button className="kk-tile kk-tile--parents" onClick={onParents}>
            <span aria-hidden="true" style={{ fontSize: "3.2rem" }}>👪</span>
            <span className="kk-tile__name">Parents</span>
          </button>
        </div>
      </div>
    </div>
  );
}
