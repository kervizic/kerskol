import { useEffect, useState } from "react";
import { AvatarView } from "../domain/avatars";
import { Feedback, Spinner } from "../components/ui";
import {
  deleteFoyer,
  getJournal,
  reauthGoogle,
  ReauthRequiseError,
  updateProfil,
} from "../lib/api";
import type { Avatar, JournalReglage, Matiere, Profil } from "../lib/types";

const RETRY_KEY = "kerskol_retry_suppr_foyer";
const MATIERE_ACTIVE = "MA";

function num(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function journalLabel(cle: string): string {
  switch (cle) {
    case "limite_jour_min":
      return "Limite par jour (min)";
    case "limite_semaine_min":
      return "Limite par semaine (min)";
    case "matieres_actives":
      return "Matieres actives";
    case "mails_actives":
      return "Mails de suivi";
    default:
      return cle;
  }
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function ProfilEditor({
  profil,
  matieres,
  onSaved,
}: {
  profil: Profil;
  matieres: Matiere[];
  onSaved: (p: Profil) => void;
}) {
  const [jour, setJour] = useState(profil.limite_jour_min?.toString() ?? "");
  const [semaine, setSemaine] = useState(profil.limite_semaine_min?.toString() ?? "");
  const [state, setState] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const av = profil.avatar as Avatar;

  const dirty =
    num(jour) !== profil.limite_jour_min || num(semaine) !== profil.limite_semaine_min;

  async function save() {
    setState("saving");
    try {
      const patch = { limite_jour_min: num(jour), limite_semaine_min: num(semaine) };
      await updateProfil(profil.id, patch);
      onSaved({ ...profil, ...patch });
      setState("ok");
    } catch {
      setState("err");
    }
  }

  return (
    <div className="kk-card kk-stack" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <AvatarView forme={av?.forme} couleur={av?.couleur || "#E06A00"} size={48} />
        <h2 style={{ margin: 0 }}>{profil.surnom}</h2>
      </div>

      <div className="kk-field">
        <span>Matieres</span>
        <div className="kk-chips">
          <button className="kk-chip" aria-pressed="true" disabled>Calcul</button>
          {matieres
            .filter((m) => m.code !== MATIERE_ACTIVE)
            .map((m) => (
              <button key={m.code} className="kk-chip" disabled>
                {m.libelle.replace(/^.*- /, "")}
                <small>bientot</small>
              </button>
            ))}
        </div>
      </div>

      <div className="kk-row">
        <label className="kk-field" style={{ flex: 1, minWidth: 150 }}>
          <span>Limite / jour (min)</span>
          <input className="kk-input" type="number" min={0} inputMode="numeric" value={jour} onChange={(e) => setJour(e.target.value)} placeholder="aucune" />
        </label>
        <label className="kk-field" style={{ flex: 1, minWidth: 150 }}>
          <span>Limite / semaine (min)</span>
          <input className="kk-input" type="number" min={0} inputMode="numeric" value={semaine} onChange={(e) => setSemaine(e.target.value)} placeholder="aucune" />
        </label>
      </div>

      {state === "ok" && <Feedback kind="success">Reglages enregistres. Le changement est journalise.</Feedback>}
      {state === "err" && <Feedback kind="error">Echec de l'enregistrement. Reessaie.</Feedback>}

      <button className="kk-btn kk-btn--accent" disabled={!dirty || state === "saving"} onClick={() => void save()}>
        {state === "saving" ? "..." : "Enregistrer"}
      </button>
    </div>
  );
}

export function ParentSpace({
  foyerId,
  profils,
  matieres,
  onProfilChange,
  onAddChild,
  onExit,
  onFoyerDeleted,
}: {
  foyerId: string;
  profils: Profil[];
  matieres: Matiere[];
  onProfilChange: (p: Profil) => void;
  onAddChild: () => void;
  onExit: () => void;
  onFoyerDeleted: () => void;
}) {
  const [journal, setJournal] = useState<JournalReglage[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reauthNeeded, setReauthNeeded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getJournal(foyerId)
      .then(setJournal)
      .catch(() => setJournal([]));
  }, [foyerId]);

  // Reprise apres reconnexion Google (le flux supprimer_foyer avait exige une
  // reauthentification recente) : on retente automatiquement une fois.
  useEffect(() => {
    let flag = false;
    try {
      flag = sessionStorage.getItem(RETRY_KEY) === foyerId;
    } catch {
      /* ignore */
    }
    if (flag) {
      try {
        sessionStorage.removeItem(RETRY_KEY);
      } catch {
        /* ignore */
      }
      void runDelete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foyerId]);

  async function runDelete() {
    setDeleting(true);
    setReauthNeeded(false);
    try {
      await deleteFoyer(foyerId);
      onFoyerDeleted();
    } catch (e) {
      setDeleting(false);
      if (e instanceof ReauthRequiseError) {
        setReauthNeeded(true);
      } else {
        alert("La suppression a echoue. Reessaie plus tard.");
      }
    }
  }

  async function reauthThenDelete() {
    try {
      sessionStorage.setItem(RETRY_KEY, foyerId);
    } catch {
      /* ignore */
    }
    await reauthGoogle(); // redirige vers Google ; au retour, retry automatique
  }

  const profilName = (id: string | null) =>
    id ? profils.find((p) => p.id === id)?.surnom ?? "profil" : "foyer";

  return (
    <div className="kk-page">
      <div className="kk-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <h1>Espace parent</h1>
          <button className="kk-link" onClick={onExit}>← Qui joue&nbsp;?</button>
        </div>

        {profils.map((p) => (
          <ProfilEditor key={p.id} profil={p} matieres={matieres} onSaved={onProfilChange} />
        ))}

        <button className="kk-btn kk-btn--accent kk-btn--block" onClick={onAddChild}>
          + Ajouter un enfant
        </button>

        <div className="kk-card kk-stack" style={{ marginTop: 24 }}>
          <h2>Journal des reglages</h2>
          {journal === null ? (
            <Spinner />
          ) : journal.length === 0 ? (
            <p className="kk-muted">Aucun changement de reglage pour l'instant.</p>
          ) : (
            <ul className="kk-list">
              {journal.map((j) => (
                <li key={j.id}>
                  <strong>{journalLabel(j.cle)}</strong> — {profilName(j.profil_id)}
                  <br />
                  <span className="kk-muted">
                    {fmt(j.ancienne)} → {fmt(j.nouvelle)} · {new Date(j.cree_le).toLocaleString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="kk-card kk-stack" style={{ marginTop: 24 }}>
          <h2>Zone sensible</h2>
          <p className="kk-muted">
            La suppression du foyer efface definitivement tous les profils, leur
            progression et leur monnaie. Action irreversible.
          </p>
          {reauthNeeded && (
            <Feedback kind="error">
              Pour ta securite, reconnecte-toi pour confirmer la suppression.
            </Feedback>
          )}
          {!confirming ? (
            <button className="kk-btn kk-btn--danger" onClick={() => setConfirming(true)}>
              Supprimer le foyer
            </button>
          ) : (
            <div className="kk-row">
              <button
                className="kk-btn kk-btn--danger"
                disabled={deleting}
                onClick={() => (reauthNeeded ? void reauthThenDelete() : void runDelete())}
              >
                {deleting ? "Suppression..." : reauthNeeded ? "Se reconnecter et supprimer" : "Confirmer la suppression"}
              </button>
              <button className="kk-btn kk-btn--ghost" onClick={() => { setConfirming(false); setReauthNeeded(false); }}>
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
