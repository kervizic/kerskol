import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { AvatarView } from "../domain/avatars";
import { UNIVERS_LIST, universDef } from "../domain/univers";
import { BUILDING_LABEL, computePort, type BuildingState } from "../domain/buildings";
import { Spinner } from "../components/ui";
import { ThemeToggle } from "../components/ThemeToggle";
import { getProgression, updateProfil } from "../lib/api";
import type { Avatar, Profil, Progression, UniversId } from "../lib/types";
import type { Referentiel } from "../lib/api";

function Building({ state }: { state: BuildingState }) {
  const map: Record<BuildingState, string> = {
    vide: "▫️",
    chantier: "🚧",
    cabane: "🛖",
    maison: "🏠",
    monument: "🏛️",
  };
  return <span style={{ fontSize: "2.4rem" }} aria-hidden="true">{map[state]}</span>;
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
  const [panel, setPanel] = useState(false);
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
    if (next === profil.univers) return;
    const previous = profil;
    onProfilChange({ ...profil, univers: next }); // garde tous les acquis
    try {
      await updateProfil(profil.id, { univers: next });
    } catch {
      onProfilChange(previous);
    }
  }

  const port = progression
    ? computePort(referentiel.competences, referentiel.prerequis, progression)
    : [];

  return (
    <div className="kk-village">
      <div className="kk-village__top">
        <button
          className="kk-avatar-corner"
          onClick={onExit}
          aria-label="Changer de joueur (retour à la sélection)"
          title="Retour à la sélection"
        >
          <AvatarView forme={av?.forme} couleur={av?.couleur || "#E06A00"} size={44} />
        </button>
        <span className="kk-money" title={`${profil.monnaie} ${u.monnaie}`}>
          <u.MonnaieIcon size={22} />
          {profil.monnaie}
        </span>
        <span style={{ flex: 1 }} />
        <ThemeToggle />
        <button
          className="kk-icon-btn"
          aria-label="Mes réglages"
          title="Mes réglages"
          aria-expanded={panel}
          onClick={() => setPanel((v) => !v)}
        >
          <Settings size={26} aria-hidden="true" />
        </button>
      </div>

      {panel && (
        <div className="kk-card kk-stack kk-panel">
          <h2 style={{ margin: 0 }}>Mon univers</h2>
          <div className="kk-tiles">
            {UNIVERS_LIST.map((uu) => (
              <button
                key={uu.id}
                className="kk-tile"
                aria-pressed={uu.id === profil.univers}
                style={{ borderColor: uu.id === profil.univers ? "var(--kk-accent)" : "transparent" }}
                onClick={() => void changeUnivers(uu.id)}
              >
                <uu.Vignette size={56} />
                <span className="kk-tile__name" style={{ fontSize: "0.9rem" }}>{uu.label}</span>
              </button>
            ))}
          </div>
          <p className="kk-muted" style={{ fontSize: "0.85rem" }}>Avatar et couleur : bientôt.</p>
        </div>
      )}

      <main className="kk-village__main">
        <h1>Le port des maths</h1>
        {progression === null ? (
          <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
            <Spinner />
          </div>
        ) : port.length === 0 ? (
          <p className="kk-muted">
            Ton village est encore vierge. Lance une séance pour poser la première pierre !
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
      </main>

      <div className="kk-village__cta">
        <button className="kk-btn kk-btn--accent kk-btn--big kk-btn--block" onClick={onStart}>
          C’est parti !
        </button>
      </div>
    </div>
  );
}
