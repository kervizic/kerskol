import { AvatarView } from "../domain/avatars";
import { universDef } from "../domain/univers";
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
  return (
    <div className="kk-page">
      <div className="kk-container">
        <h1 style={{ textAlign: "center", marginBottom: 24 }}>Qui joue ?</h1>
        <div className="kk-tiles">
          {profils.map((p) => {
            const av = p.avatar as Avatar;
            const u = universDef(p.univers);
            const isLast = p.id === lastProfilId;
            return (
              <button
                key={p.id}
                className={`kk-tile${isLast ? " kk-tile--last" : ""}`}
                onClick={() => onPickChild(p)}
              >
                <span className="kk-tile__badge">
                  <span className="kk-tile__avatar" style={{ display: "inline-flex" }}>
                    <AvatarView forme={av?.forme} couleur={av?.couleur || "#E06A00"} size={96} />
                  </span>
                  <span className="kk-tile__vignette">
                    <u.Vignette size={36} />
                  </span>
                </span>
                <span className="kk-tile__name">{p.surnom}</span>
                {isLast && <span className="kk-tile__hint">Reprendre</span>}
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
