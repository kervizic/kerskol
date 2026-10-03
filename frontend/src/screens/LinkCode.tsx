import { useEffect, useState } from "react";
import { Feedback } from "../components/ui";
import { refuserLienEnfant, validerLienEnfant } from "../lib/api";
import { confirmationTexte, nextLinkStep, type Confirmation } from "../lib/linkFlow";

// Ecran NEUTRE affiche a CHAQUE chargement d'un compte dont l'e-mail confirme
// correspond a un lien en attente. On ne revele NI le foyer NI le profil :
// seulement une invitation a saisir le code a 3 chiffres donne par le parent.
//
// Apres le BON code, selon la situation du compte connecte (migrations 0020/0021) :
//   * compte libre               -> relie, onValidated().
//   * deja relie a un AUTRE profil-> ecran de confirmation ("le relier ici ?").
//   * parent SEUL de son foyer    -> ecran de confirmation de FUSION : ses progres
//     sont regroupes dans ce profil (aucune perte, aucune reauth). S'il a plusieurs
//     profils, il choisit lequel regrouper ; les autres sont supprimes.
//   * parent d'un foyer PARTAGE   -> refus clair (le lien est supprime).
// Mauvais code : message generique + essais restants (5 max). "Ce n'est pas
// moi" -> refuserLienEnfant() puis onRefused().
//
// Etat du flux conserve en sessionStorage : apres un rechargement (F5) ou un
// retour de navigation, on ne redemande JAMAIS inutilement le code.

const CODE_KEY = "kk.linkflow.code";
const CONFIRM_KEY = "kk.linkflow.confirm";

function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeSession(key: string, value: unknown): void {
  try {
    if (value == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
function clearFlow(): void {
  writeSession(CODE_KEY, null);
  writeSession(CONFIRM_KEY, null);
}

export function LinkCode({
  onValidated,
  onRefused,
}: {
  onValidated: () => void;
  onRefused: () => void;
}) {
  const [code, setCode] = useState(() => readSession<string>(CODE_KEY) ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [termine, setTermine] = useState(false);
  const [confirm, setConfirm] = useState<Confirmation | null>(
    () => readSession<Confirmation>(CONFIRM_KEY)
  );
  // Profil source choisi (fusion de plusieurs profils).
  const [source, setSource] = useState<string | null>(null);

  // Persiste le code et l'etape de confirmation (reprise apres rechargement).
  useEffect(() => writeSession(CODE_KEY, code || null), [code]);
  useEffect(() => writeSession(CONFIRM_KEY, confirm), [confirm]);

  // Applique le resultat d'une tentative (saisie initiale ou confirmation).
  function appliquer(r: Awaited<ReturnType<typeof validerLienEnfant>>) {
    const step = nextLinkStep(r);
    switch (step.kind) {
      case "validated":
        clearFlow();
        onValidated();
        break;
      case "confirm":
        setConfirm(step.confirmation);
        setMessage(null);
        break;
      case "terminal":
        clearFlow();
        setConfirm(null);
        setTermine(true);
        setMessage(step.message);
        break;
      case "error":
        setMessage(step.message);
        if (step.clearCode) setCode("");
        break;
    }
  }

  async function valider() {
    if (busy || code.length !== 3) return;
    setBusy(true);
    setMessage(null);
    try {
      appliquer(await validerLienEnfant(code));
    } catch (e) {
      console.error("valider_lien_enfant a echoue", e);
      setMessage("Une erreur est survenue. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmer() {
    if (busy || code.length !== 3) return;
    // Fusion de plusieurs profils : un choix de source est obligatoire.
    if (confirm?.kind === "fusion" && confirm.profils.length > 1 && !source) {
      setMessage("Choisis l'espace à regrouper.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      appliquer(await validerLienEnfant(code, true, source ?? undefined));
    } catch (e) {
      console.error("valider_lien_enfant (confirmation) a echoue", e);
      setMessage("Une erreur est survenue. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  function annulerConfirmation() {
    setConfirm(null);
    setSource(null);
    setCode("");
    setMessage(null);
    clearFlow();
  }

  async function refuser() {
    if (busy) return;
    setBusy(true);
    try {
      await refuserLienEnfant();
    } catch {
      /* on deconnecte quand meme */
    } finally {
      clearFlow();
      onRefused();
    }
  }

  // ---------------------------------------------------------------- Ecrans
  if (confirm) {
    const texte = confirmationTexte(confirm);
    const choix = confirm.kind === "fusion" && confirm.profils.length > 1;
    return (
      <div className="kk-page kk-center">
        <main className="kk-container" style={{ maxWidth: 440, textAlign: "center" }}>
          <div className="kk-card kk-stack">
            <h1>Confirmation</h1>
            <p className="kk-lead" style={{ margin: "0 auto" }}>{texte}</p>

            {confirm.kind === "fusion" && confirm.profils.length > 1 ? (
              <div className="kk-stack" style={{ textAlign: "left" }}>
                {confirm.profils.map((p) => (
                  <label key={p.id} className="kk-row" style={{ gap: 8, alignItems: "center" }}>
                    <input
                      type="radio"
                      name="source-fusion"
                      value={p.id}
                      checked={source === p.id}
                      onChange={() => setSource(p.id)}
                      disabled={busy}
                    />
                    <span>{p.surnom}</span>
                  </label>
                ))}
              </div>
            ) : null}

            {message ? <Feedback kind="error">{message}</Feedback> : null}

            <button
              className="kk-btn kk-btn--accent kk-btn--block"
              onClick={() => void confirmer()}
              disabled={busy || (choix && !source)}
            >
              {confirm.kind === "fusion" ? "Confirmer et regrouper" : "Oui, relier"}
            </button>
            <button className="kk-btn kk-btn--block" onClick={annulerConfirmation} disabled={busy}>
              Annuler
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="kk-page kk-center">
      <main className="kk-container" style={{ maxWidth: 440, textAlign: "center" }}>
        <div className="kk-card kk-stack">
          <h1>Relier ce compte</h1>
          <p className="kk-lead" style={{ margin: "0 auto" }}>
            Un parent souhaite relier ce compte à un profil Kerskol. Entre le code
            qu'il t'a donné.
          </p>

          {message ? <Feedback kind="error">{message}</Feedback> : null}

          {!termine ? (
            <>
              <input
                className="kk-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={3}
                aria-label="Code à 3 chiffres"
                value={code}
                disabled={busy}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                style={{
                  fontSize: "2rem",
                  letterSpacing: "0.5rem",
                  textAlign: "center",
                  maxWidth: 180,
                  margin: "0 auto",
                }}
              />
              <button
                className="kk-btn kk-btn--accent kk-btn--block"
                onClick={() => void valider()}
                disabled={busy || code.length !== 3}
              >
                Valider
              </button>
            </>
          ) : null}

          <button className="kk-btn kk-btn--block" onClick={() => void refuser()} disabled={busy}>
            Ce n'est pas moi
          </button>
        </div>
      </main>
    </div>
  );
}
