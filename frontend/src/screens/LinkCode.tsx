import { useState } from "react";
import { Feedback } from "../components/ui";
import { reauthGoogle, refuserLienEnfant, validerLienEnfant } from "../lib/api";
import { confirmationTexte, nextLinkStep, type Confirmation } from "../lib/linkFlow";

// Ecran NEUTRE affiche a CHAQUE chargement d'un compte dont l'e-mail confirme
// correspond a un lien en attente. On ne revele NI le foyer NI le profil :
// seulement une invitation a saisir le code a 3 chiffres donne par le parent.
//
// Apres le BON code, selon la situation du compte connecte (migration 0020) :
//   * compte libre               -> relie, onValidated().
//   * deja relie a un AUTRE profil-> ecran de confirmation ("le relier ici ?").
//   * parent SEUL de son foyer    -> ecran de confirmation (suppression de son
//     espace) + reconnexion Google recente exigee.
//   * parent d'un foyer PARTAGE   -> refus clair (le lien est supprime).
// Mauvais code : message generique + essais restants (5 max). "Ce n'est pas
// moi" -> refuserLienEnfant() puis onRefused().

export function LinkCode({
  onValidated,
  onRefused,
}: {
  onValidated: () => void;
  onRefused: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [termine, setTermine] = useState(false);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [reauthNeeded, setReauthNeeded] = useState(false);

  // Applique le resultat d'une tentative (saisie initiale ou confirmation).
  function appliquer(r: Awaited<ReturnType<typeof validerLienEnfant>>) {
    const step = nextLinkStep(r);
    switch (step.kind) {
      case "validated":
        onValidated();
        break;
      case "confirm":
        setConfirm(step.confirmation);
        setMessage(null);
        break;
      case "reauth":
        setReauthNeeded(true);
        setMessage(step.message);
        break;
      case "terminal":
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
    setBusy(true);
    setMessage(null);
    try {
      appliquer(await validerLienEnfant(code, true));
    } catch (e) {
      console.error("valider_lien_enfant (confirmation) a echoue", e);
      setMessage("Une erreur est survenue. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  }

  async function reauthenticate() {
    await reauthGoogle(); // redirige vers Google ; au retour, nouvel ecran de code
  }

  function annulerConfirmation() {
    setConfirm(null);
    setReauthNeeded(false);
    setCode("");
    setMessage(null);
  }

  async function refuser() {
    if (busy) return;
    setBusy(true);
    try {
      await refuserLienEnfant();
    } catch {
      /* on deconnecte quand meme */
    } finally {
      onRefused();
    }
  }

  // ---------------------------------------------------------------- Ecrans
  if (confirm) {
    const texte = confirmationTexte(confirm);
    return (
      <div className="kk-page kk-center">
        <main className="kk-container" style={{ maxWidth: 440, textAlign: "center" }}>
          <div className="kk-card kk-stack">
            <h1>Confirmation</h1>
            <p className="kk-lead" style={{ margin: "0 auto" }}>{texte}</p>
            {message ? <Feedback kind="error">{message}</Feedback> : null}
            {reauthNeeded ? (
              <button
                className="kk-btn kk-btn--accent kk-btn--block"
                onClick={() => void reauthenticate()}
                disabled={busy}
              >
                Se reconnecter avec Google
              </button>
            ) : (
              <button
                className="kk-btn kk-btn--accent kk-btn--block"
                onClick={() => void confirmer()}
                disabled={busy}
              >
                {confirm.kind === "suppression_foyer" ? "Confirmer et rattacher" : "Oui, relier"}
              </button>
            )}
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
