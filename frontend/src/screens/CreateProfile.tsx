import { useEffect, useState } from "react";
import { AVATAR_COLORS, AVATAR_SHAPES, AvatarView } from "../domain/avatars";
import { UNIVERS_LIST } from "../domain/univers";
import { Feedback } from "../components/ui";
import { createProfil } from "../lib/api";
import { clearDraft, loadDraft, saveDraft } from "../lib/session";
import type { Matiere, Profil, UniversId } from "../lib/types";

type Step = "parent" | "handover" | "child";

// Seule la matiere « Calcul » (MA) est active pour l'instant.
const MATIERE_ACTIVE = "MA";

interface Draft {
  step: Step;
  surnom: string;
  jourOn: boolean;
  jour: string;
  semaineOn: boolean;
  semaine: string;
  forme: string;
  couleur: string;
  univers: UniversId;
}

function posInt(v: string): number | null {
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
  const d = loadDraft<Draft>();
  const [step, setStep] = useState<Step>(d?.step ?? "parent");
  const [surnom, setSurnom] = useState(d?.surnom ?? "");
  // Par defaut : AUCUNE limite (null). L'interrupteur revele le champ minutes.
  const [jourOn, setJourOn] = useState(d?.jourOn ?? false);
  const [jour, setJour] = useState(d?.jour ?? "20");
  const [semaineOn, setSemaineOn] = useState(d?.semaineOn ?? false);
  const [semaine, setSemaine] = useState(d?.semaine ?? "90");
  const [forme, setForme] = useState(d?.forme ?? AVATAR_SHAPES[0].id);
  const [couleur, setCouleur] = useState(d?.couleur ?? AVATAR_COLORS[0]);
  const [univers, setUnivers] = useState<UniversId>(d?.univers ?? "village_breton");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const surnomOk = surnom.trim().length >= 1 && surnom.trim().length <= 30;

  // Sauvegarde du brouillon a chaque changement (restaure apres rechargement).
  useEffect(() => {
    saveDraft<Draft>({ step, surnom, jourOn, jour, semaineOn, semaine, forme, couleur, univers });
  }, [step, surnom, jourOn, jour, semaineOn, semaine, forme, couleur, univers]);

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
        limite_jour_min: jourOn ? posInt(jour) : null,
        limite_semaine_min: semaineOn ? posInt(semaine) : null,
      });
      clearDraft(); // succes : le brouillon n'a plus lieu d'etre
      onDone(p);
    } catch (e) {
      console.error("createProfil a echoue", e);
      setError("La création a échoué. Réessaie dans un instant.");
      setSaving(false);
    }
  }

  function cancel() {
    clearDraft();
    onCancel?.();
  }

  if (step === "parent") {
    return (
      <div className="kk-page">
        <div className="kk-container">
          <h1>Nouveau profil</h1>
          <p className="kk-lead">Côté parent : les réglages de suivi.</p>
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

            <div className="kk-field">
              <span>Temps d’écran</span>
              <p className="kk-muted" style={{ fontSize: "0.85rem", marginBottom: 8 }}>
                Par défaut, aucune limite. Tu peux en fixer une (modifiable à tout
                moment dans l’espace parent).
              </p>
              <label className="kk-switch-row">
                <input type="checkbox" checked={jourOn} onChange={(e) => setJourOn(e.target.checked)} />
                <span>Limiter le temps par jour</span>
              </label>
              {jourOn && (
                <input
                  className="kk-input"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={jour}
                  onChange={(e) => setJour(e.target.value)}
                  aria-label="Minutes par jour"
                  placeholder="minutes par jour"
                  style={{ marginTop: 8 }}
                />
              )}
              <label className="kk-switch-row" style={{ marginTop: 12 }}>
                <input type="checkbox" checked={semaineOn} onChange={(e) => setSemaineOn(e.target.checked)} />
                <span>Limiter le temps par semaine</span>
              </label>
              {semaineOn && (
                <input
                  className="kk-input"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={semaine}
                  onChange={(e) => setSemaine(e.target.value)}
                  aria-label="Minutes par semaine"
                  placeholder="minutes par semaine"
                  style={{ marginTop: 8 }}
                />
              )}
            </div>

            <div className="kk-row">
              <button
                className="kk-btn kk-btn--accent"
                disabled={!surnomOk}
                onClick={() => setStep("handover")}
              >
                Continuer
              </button>
              {onCancel && (
                <button className="kk-btn kk-btn--ghost" onClick={cancel}>
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
              À toi de jouer ! Choisis ton personnage et ton univers.
            </p>
            <button
              className="kk-btn kk-btn--accent kk-btn--big kk-btn--block"
              onClick={() => setStep("child")}
            >
              C’est moi !
            </button>
            <button className="kk-btn kk-btn--ghost" onClick={() => setStep("parent")}>
              Revenir aux réglages
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
            {saving ? "..." : "C’est parti !"}
          </button>
        </div>
      </div>
    </div>
  );
}
