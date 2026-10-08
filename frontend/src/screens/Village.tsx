import { useEffect, useState } from "react";
import { BookOpen, Settings, Timer } from "lucide-react";
import { AvatarView } from "../domain/avatars";
import {
  AVATAR_COLORS,
  avatarColor,
  isDicebearAvatar,
  randomOptions,
  STYLE_KEYS,
  type AvatarOptions,
  type StyleKey,
} from "../domain/avatarConfig";
import { AvatarEditor } from "../components/AvatarEditor";
import { MatieresEditor } from "../components/MatieresEditor";
import { UNIVERS_LIST, universDef } from "../domain/univers";
import { BUILDING_LABEL, computePort, type BuildingState } from "../domain/buildings";
import { TOUS_DOMAINES } from "../domain/matieres";
import { Spinner } from "../components/ui";
import { ThemeToggle } from "../components/ThemeToggle";
import { getProgression, reglerMatieres, updateProfil } from "../lib/api";
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
  onDefi,
  onBiblio,
  onProfilChange,
}: {
  profil: Profil;
  referentiel: Referentiel;
  onExit: () => void;
  onStart: () => void;
  onDefi: () => void;
  onBiblio: () => void;
  onProfilChange: (p: Profil) => void;
}) {
  const [progression, setProgression] = useState<Progression[] | null>(null);
  const [panel, setPanel] = useState(false);
  const u = universDef(profil.univers);
  const couleur = avatarColor(profil.avatar);
  // Etat de l'editeur : reprend l'avatar DiceBear existant, sinon un avatar
  // neuf (l'ancien avatar reste affiche tant que l'enfant n'en choisit pas un).
  const [style, setStyle] = useState<StyleKey>(
    isDicebearAvatar(profil.avatar) ? profil.avatar.style : STYLE_KEYS[0]
  );
  const [options, setOptions] = useState<AvatarOptions>(
    isDicebearAvatar(profil.avatar) ? profil.avatar.options : randomOptions(STYLE_KEYS[0])
  );

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

  // Persiste un avatar (optimiste). L'avatar N'EST PAS journalise (gout de
  // l'enfant) : updateProfil ecrit directement la colonne, aucun trigger.
  async function persistAvatar(avatar: Avatar) {
    const previous = profil;
    onProfilChange({ ...profil, avatar }); // garde tous les acquis
    try {
      await updateProfil(profil.id, { avatar });
    } catch {
      onProfilChange(previous);
    }
  }

  function changeAvatar(nextStyle: StyleKey, nextOptions: AvatarOptions) {
    setStyle(nextStyle);
    setOptions(nextOptions);
    void persistAvatar({ style: nextStyle, options: nextOptions, couleur });
  }

  // Change UNIQUEMENT la couleur : conserve l'avatar existant (ancien ou neuf)
  // pour ne pas ecraser un avatar maison sur un simple choix de couleur.
  function changeCouleur(next: string) {
    if (next === couleur) return;
    void persistAvatar({ ...(profil.avatar as object), couleur: next } as Avatar);
  }

  // Mes matieres (optimiste). Persiste via la RPC regler_matieres (le serveur
  // refuse si plus aucune sous-matiere, et verifie l'autorisation parent).
  async function changeMatieres(matieres: string[], domaines: string[]) {
    const previous = profil;
    onProfilChange({ ...profil, matieres_actives: matieres, domaines_actifs: domaines });
    try {
      await reglerMatieres(profil.id, matieres, domaines);
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
          <AvatarView avatar={profil.avatar} size={44} />
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

          <h2 style={{ margin: "8px 0 0" }}>Mon avatar</h2>
          <AvatarEditor style={style} options={options} onChange={changeAvatar} />

          <h2 style={{ margin: "8px 0 0" }}>Ma couleur</h2>
          <div className="kk-chips" role="group" aria-label="Couleur">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => changeCouleur(c)}
                aria-label={`Couleur ${c}`}
                aria-pressed={couleur === c}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: c,
                  border: couleur === c ? "3px solid var(--kk-text)" : "3px solid transparent",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>

          {/* Mes matieres : visible seulement si le parent laisse l'enfant choisir. */}
          {profil.enfant_regle_matieres !== false && (
            <>
              <h2 style={{ margin: "8px 0 0" }}>Mes matières</h2>
              <p className="kk-muted" style={{ margin: 0 }}>
                Choisis ce que tu veux travailler.
              </p>
              <MatieresEditor
                matieresActives={profil.matieres_actives ?? ["MA"]}
                domainesActifs={profil.domaines_actifs ?? TOUS_DOMAINES}
                onChange={changeMatieres}
              />
            </>
          )}
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

      <div className="kk-village__cta kk-stack">
        <button className="kk-btn kk-btn--accent kk-btn--big kk-btn--block" onClick={onStart}>
          C’est parti !
        </button>
        <button
          className="kk-btn kk-btn--block kk-defi-cta"
          onClick={onDefi}
          title="Un jeu de rapidité, sur ce que tu maîtrises déjà"
        >
          <Timer size={20} aria-hidden="true" /> Défi chrono
        </button>
        <button
          className="kk-btn kk-btn--block"
          onClick={onBiblio}
          title="Des histoires, des fables et des poésies à lire"
        >
          <BookOpen size={20} aria-hidden="true" /> Bibliothèque
        </button>
      </div>
    </div>
  );
}
