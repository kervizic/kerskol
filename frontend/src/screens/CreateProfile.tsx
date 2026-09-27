import { useState } from "react";
import { AVATAR_COLORS, AVATAR_SHAPES, AvatarView } from "../domain/avatars";
import { UNIVERS_LIST } from "../domain/univers";
import { Feedback } from "../components/ui";
import { createProfil } from "../lib/api";
import type { Matiere, Profil, UniversId } from "../lib/types";

type Step = "parent" | "handover" | "child";

// Seule la matiere "Calcul" (MA) est active pour l'instant.
const MATIERE_ACTIVE = "MA";

function toMinutes(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function CreateProfile({
  foyerId,
  matieres,
  onDone,
  onCancel,
}: {
  foyerId: string;
  matieres: Matiere[];
  onDone: (p: Profil) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState<Step>("parent");
  const [surnom, setSurnom] = useState("");
  const [jour, setJour] = useState("20");
  const [semaine, setSemaine] = useState("");
  const [forme, setForme] = useState(AVATAR_SHAPES[0].id);
  const [couleur, setCouleur] = useState(AVATAR_COLORS[0]);
  const [univers, setUnivers] = useState<UniversId>("village_breton");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const surnomOk = surnom.trim().length >= 1 && surnom.trim().length <= 30;

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const p = await createProfil({
        foyer_id: foyerId,
        surnom: surnom.trim(),
        avatar: { forme, couleur },
        univers,
        matieres_actives: [MATIERE_ACTIVE],
        limite_jour_min: toMinutes(jour),
        limite_semaine_min: toMinutes(semaine),
      });
      onDone(p);
    } catch (e) {
      // Erreur reelle (code/message PostgREST) pour diagnostic ; sans donnee
      // personnelle (l'objet ne contient ni e-mail ni jeton).
      console.error("createProfil a echoue", e);
      setError("La création a échoué. Réessaie dans un instant.");
      setSaving(false);
    }
  }

  if (step === "parent") {
    return (
      <div className="kk-page">
        <div className="kk-container">
          <h1>Nouveau profil</h1>
          <p className="kk-lead">Côté parent : les réglages de suivi.</p>
          <div className="kk-card kk-stack" style={{ marginTop: 20 }}>
            <label className="kk-field">
              <span>Surnom de l’enfant</span>
              <input
                className="kk-input"
                value={surnom}
                maxLength={30}
                onChange={(e) => setSurnom(e.target.value)}
                placeholder="Ex. Lou"
                autoFocus
              />
              <small className="kk-muted">{surnom.trim().length}/30</small>
            </label>

            <div className="kk-field">
              <span>Matières</span>
              <div className="kk-chips">
                <button className="kk-chip" aria-pressed="true" disabled>
                  Calcul
                </button>
                {matieres
                  .filter((m) => m.code !== MATIERE_ACTIVE)
                  .map((m) => (
                    <button key={m.code} className="kk-chip" disabled>
                      {m.libelle.replace(/^.*- /, "")}
                      <small>bientôt</small>
                    </button>
                  ))}
              </div>
            </div>

            <div className="kk-row">
              <label className="kk-field" style={{ flex: 1, minWidth: 160 }}>
                <span>Limite par jour (min)</span>
                <input
                  className="kk-input"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={jour}
                  onChange={(e) => setJour(e.target.value)}
                  placeholder="ex. 20"
                />
              </label>
              <label className="kk-field" style={{ flex: 1, minWidth: 160 }}>
                <span>Limite par semaine (min)</span>
                <input
                  className="kk-input"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={semaine}
                  onChange={(e) => setSemaine(e.target.value)}
                  placeholder="optionnel"
                />
              </label>
            </div>
            <p className="kk-muted" style={{ fontSize: "0.85rem" }}>
              Laisse vide pour ne pas fixer de limite. Modifiable à tout moment
              dans l’espace parent.
            </p>

            <div className="kk-row">
              <button
                className="kk-btn kk-btn--accent"
                disabled={!surnomOk}
                onClick={() => setStep("handover")}
              >
                Continuer
              </button>
              {onCancel && (
                <button className="kk-btn kk-btn--ghost" onClick={onCancel}>
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "handover") {
    return (
      <div className="kk-page kk-center">
        <div className="kk-container" style={{ textAlign: "center", maxWidth: 520 }}>
          <div className="kk-card kk-stack">
            <div style={{ fontSize: "3rem" }} aria-hidden="true">🤝</div>
            <h1>Tends la tablette à ton enfant</h1>
            <p className="kk-lead" style={{ margin: "0 auto" }}>
              À toi de jouer ! Choisis ton personnage et ton univers.
            </p>
            <button
              className="kk-btn kk-btn--accent kk-btn--big kk-btn--block"
              onClick={() => setStep("child")}
            >
              C’est moi !
            </button>
          </div>
        </div>
      </div>
    );
  }

  // step === "child"
  return (
    <div className="kk-page">
      <div className="kk-container">
        <h1>Choisis ton personnage</h1>
        <div className="kk-card kk-stack">
          <div className="kk-field">
            <span>Ton avatar</span>
            <div className="kk-chips" role="group" aria-label="Avatar">
              {AVATAR_SHAPES.map((s) => (
                <button
                  key={s.id}
                  className="kk-tile"
                  aria-pressed={forme === s.id}
                  style={{
                    padding: 10,
                    borderColor: forme === s.id ? "var(--kk-accent)" : "transparent",
                  }}
                  onClick={() => setForme(s.id)}
                >
                  <AvatarView forme={s.id} couleur={couleur} size={64} />
                </button>
              ))}
            </div>
          </div>

          <div className="kk-field">
            <span>Ta couleur</span>
            <div className="kk-chips" role="group" aria-label="Couleur">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCouleur(c)}
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
          </div>

          <div className="kk-field">
            <span>Ton univers</span>
            <div className="kk-tiles">
              {UNIVERS_LIST.map((u) => (
                <button
                  key={u.id}
                  className="kk-tile"
                  aria-pressed={univers === u.id}
                  style={{ borderColor: univers === u.id ? "var(--kk-accent)" : "transparent" }}
                  onClick={() => setUnivers(u.id)}
                >
                  <u.Vignette size={72} />
                  <span className="kk-tile__name" style={{ fontSize: "1rem" }}>{u.label}</span>
                  <span className="kk-muted" style={{ fontSize: "0.8rem", display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <u.MonnaieIcon size={16} /> {u.monnaie}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && <Feedback kind="error">{error}</Feedback>}

          <button
            className="kk-btn kk-btn--accent kk-btn--big kk-btn--block"
            disabled={saving}
            onClick={() => void finish()}
          >
            {saving ? "..." : "C’est parti !"}
          </button>
        </div>
      </div>
    </div>
  );
}
