import { useEffect, useState } from "react";
import { AvatarView } from "../domain/avatars";
import { UNIVERS_LIST, universDef } from "../domain/univers";
import { BUILDING_LABEL, computePort, type BuildingState } from "../domain/buildings";
import { Spinner } from "../components/ui";
import { getProgression, updateProfil } from "../lib/api";
import type { Avatar, Profil, Progression, UniversId } from "../lib/types";
import type { Referentiel } from "../lib/api";

// Petit pictogramme de batiment selon l'etat (chantier -> monument).
function Building({ state }: { state: BuildingState }) {
  const map: Record<BuildingState, string> = {
    vide: "▫️",
    chantier: "🚧",
    cabane: "🛖",
    maison: "🏠",
    monument: "🏛️",
  };
  return <span style={{ fontSize: "2rem" }} aria-hidden="true">{map[state]}</span>;
}

export function Village({
  profil,
  referentiel,
  onExit,
  onStart,
  onProfilChange,
}: {
  profil: Profil;
  referentiel: Referentiel;
  onExit: () => void;
  onStart: () => void;
  onProfilChange: (p: Profil) => void;
}) {
  const [progression, setProgression] = useState<Progression[] | null>(null);
  const [pickUnivers, setPickUnivers] = useState(false);
  const u = universDef(profil.univers);
  const av = profil.avatar as Avatar;

  useEffect(() => {
    let alive = true;
    setProgression(null);
    getProgression(profil.id)
      .then((p) => alive && setProgression(p))
      .catch(() => alive && setProgression([]));
    return () => {
      alive = false;
    };
  }, [profil.id]);

  async function changeUnivers(next: UniversId) {
    setPickUnivers(false);
    if (next === profil.univers) return;
    const previous = profil;
    onProfilChange({ ...profil, univers: next }); // optimiste : garde tout, redessine
    try {
      await updateProfil(profil.id, { univers: next });
    } catch {
      onProfilChange(previous); // rollback silencieux
    }
  }

  const port = progression
    ? computePort(referentiel.competences, referentiel.prerequis, progression)
    : [];

  return (
    <div className="kk-village">
      <div className="kk-village__scene" style={{ background: u.fond }} aria-hidden="true" />
      <div className="kk-village__inner">
        <div className="kk-village__top">
          <button
            className="kk-avatar-corner"
            onClick={onExit}
            aria-label="Changer de joueur (retour à Qui joue)"
            title="Retour à Qui joue ?"
          >
            <AvatarView forme={av?.forme} couleur={av?.couleur || "#E06A00"} size={48} />
          </button>
          <span className="kk-money" title={`${profil.monnaie} ${u.monnaie}`}>
            <u.MonnaieIcon size={24} />
            {profil.monnaie}
          </span>
        </div>

        <div className="kk-port">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <h2>Le port des maths</h2>
            <button className="kk-link" onClick={() => setPickUnivers((v) => !v)}>
              Changer d’univers
            </button>
          </div>

          {pickUnivers && (
            <div className="kk-tiles" style={{ margin: "12px 0" }}>
              {UNIVERS_LIST.map((uu) => (
                <button
                  key={uu.id}
                  className="kk-tile"
                  aria-pressed={uu.id === profil.univers}
                  style={{ borderColor: uu.id === profil.univers ? "var(--kk-accent)" : "transparent" }}
                  onClick={() => void changeUnivers(uu.id)}
                >
                  <uu.Vignette size={64} />
                  <span className="kk-tile__name" style={{ fontSize: "0.95rem" }}>{uu.label}</span>
                </button>
              ))}
            </div>
          )}

          {progression === null ? (
            <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
              <Spinner />
            </div>
          ) : port.length === 0 ? (
            <p className="kk-muted" style={{ margin: "12px 0" }}>
              Ton village est encore vierge. Lance une séance pour poser la
              première pierre !
            </p>
          ) : (
            <div className="kk-plots">
              {port.map((plot) => (
                <div
                  key={plot.code}
                  className={`kk-plot${plot.state === "vide" ? " kk-plot--vide" : ""}`}
                  title={`${plot.libelle} — ${BUILDING_LABEL[plot.state]}`}
                >
                  <Building state={plot.state} />
                  <div className="kk-plot__name">{plot.libelle}</div>
                  <div className="kk-plot__state">{BUILDING_LABEL[plot.state]}</div>
                </div>
              ))}
            </div>
          )}

          <button className="kk-btn kk-btn--accent kk-btn--big kk-btn--block" onClick={onStart}>
            C’est parti !
          </button>
        </div>
      </div>
    </div>
  );
}
