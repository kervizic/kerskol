import { useState } from "react";
import { Feedback } from "../components/ui";
import { refuserLienEnfant, validerLienEnfant } from "../lib/api";

// Ecran NEUTRE affiche au login d'un compte dont l'email correspond a un lien
// en attente. On ne revele NI le foyer NI le profil : seulement une invitation
// a saisir le code a 3 chiffres donne par le parent.
//
//   * bon code      -> onValidated() (le compte est relie, on recharge).
//   * mauvais code  -> message generique + essais restants (5 max).
//   * annule        -> le lien a ete supprime (trop d'essais) : retour accueil.
//   * "Ce n'est pas moi" -> refuserLienEnfant() puis onRefused().
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

  async function valider() {
    if (busy || code.length !== 3) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await validerLienEnfant(code);
      if (r.ok) {
        onValidated();
        return;
      }
      if (r.etat === "annule") {
        setTermine(true);
        setMessage("Trop d'essais. Demande à un parent de recommencer.");
      } else if (r.etat === "email_non_confirme") {
        setMessage("Confirme d'abord ton adresse e-mail, puis réessaie.");
      } else if (r.etat === "aucun") {
        setTermine(true);
        setMessage("Ce lien n'est plus valable.");
      } else {
        const reste = r.essais_restants;
        setMessage(
          reste != null
            ? `Code incorrect. Il te reste ${reste} essai${reste > 1 ? "s" : ""}.`
            : "Code incorrect."
        );
      }
      setCode("");
    } catch {
      setMessage("Une erreur est survenue. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
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
