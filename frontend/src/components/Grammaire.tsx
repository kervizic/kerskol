// Grammaire (francais, CE2). Composant AUTONOME, rendu dans Session.tsx quand
// ex.saisie === "grammaire". Il gere les trois formats d'un item de grammaire :
//   - qcm   : propositions en gros boutons (nature N1, types de phrases,
//             ponctuation, genre/nombre d'un groupe) ;
//   - clic  : la phrase est affichee avec chaque MOT touchable (taille tactile) ;
//             l'enfant clique le mot demande (« Clique sur le verbe. ») ;
//   - texte : saisie LIBRE (N4), l'enfant tape le mot.
//
// Le SERVEUR (verif_grammaire, op 'gram') reste SEUL JUGE : onSoumettre renvoie
// le verdict serveur. `item.attendu` ne sert qu'au feedback (surlignage du bon
// mot) et au mode demo. Feedback TOUJOURS valorisant, jamais punitif.

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { GramRender } from "../domain/francais/grammaire";
import { comparerGrammaire } from "../domain/francais/grammaire";

interface Props {
  item: GramRender;
  onSoumettre: (cle: string, reponseTexte: string) => Promise<{ correct: boolean } | null>;
  onContinuer: (correct: boolean) => void;
}

// Tokenise une phrase pour le mode clic (un bouton par mot, separes par les
// espaces). On garde le mot tel quel (ponctuation comprise) pour l'affichage ;
// la comparaison serveur normalise (retire la ponctuation de bord).
function mots(phrase: string): string[] {
  return phrase.split(/\s+/).filter((m) => m.length > 0);
}

export default function Grammaire({ item, onSoumettre, onContinuer }: Props) {
  const [choixQcm, setChoixQcm] = useState<string | null>(null);
  const [motClique, setMotClique] = useState<number | null>(null);
  const [saisie, setSaisie] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ correct: boolean } | null>(null);
  const [erreurReseau, setErreurReseau] = useState(false);

  const tokens = useMemo(() => mots(item.phrase), [item.phrase]);

  // Reponse courante (texte envoye au serveur) selon le format.
  const reponse =
    item.format === "qcm"
      ? choixQcm ?? ""
      : item.format === "clic"
        ? motClique != null
          ? tokens[motClique]
          : ""
        : saisie;

  const peutValider = reponse.trim().length > 0 && !res && !busy;

  const soumettre = async () => {
    if (!peutValider) return;
    setBusy(true);
    try {
      const r = await onSoumettre(item.cle, reponse);
      if (r) setRes(r);
      else setErreurReseau(true);
    } catch {
      setErreurReseau(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="kk-stack kk-grammaire">
      <p className="kk-lead" style={{ textAlign: "center", margin: "0 auto" }}>
        {item.consigne}
      </p>

      {/* QCM : gros boutons empiles. */}
      {item.format === "qcm" && item.options && (
        <>
          {item.phrase && (
            <p className="kk-grammaire__phrase" style={{ fontSize: "1.3rem", textAlign: "center", margin: "6px 0" }}>
              {item.phrase}
            </p>
          )}
          <div className="kk-qcm">
            {item.options.map((o, i) => {
              const choisi = choixQcm === o;
              const bon = res && comparerGrammaire("qcm", o, item.attendu);
              let extra = choisi ? " kk-qcm__opt--active" : "";
              if (res && bon) extra = " kk-qcm__opt--active";
              return (
                <button
                  key={i}
                  type="button"
                  className={`kk-btn kk-qcm__opt${extra}`}
                  disabled={Boolean(res)}
                  onClick={() => setChoixQcm(o)}
                  aria-pressed={choisi}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* CLIC : la phrase, chaque mot touchable. */}
      {item.format === "clic" && (
        <p
          className="kk-grammaire__phrase"
          style={{ fontSize: "1.4rem", lineHeight: 2.1, textAlign: "center" }}
        >
          {tokens.map((mot, i) => {
            const on = motClique === i;
            const bon = res && comparerGrammaire("clic", mot, item.attendu);
            let bg = "transparent";
            let color = "inherit";
            if (res) {
              if (bon) { bg = "#16a34a"; color = "#fff"; }
              else if (on) { bg = "#E06A00"; color = "#fff"; }
            } else if (on) {
              bg = "var(--kk-accent)";
              color = "var(--kk-on-accent)";
            }
            return (
              <button
                key={i}
                type="button"
                className="kk-grammaire__mot"
                disabled={Boolean(res)}
                onClick={() => setMotClique(i)}
                style={{
                  display: "inline-block", margin: "2px 4px", padding: "6px 12px",
                  minHeight: 44, borderRadius: 10,
                  border: "2px solid var(--kk-border, #ccc)",
                  background: bg, color,
                  font: "inherit", cursor: res ? "default" : "pointer",
                  transition: "background 80ms",
                }}
              >
                {mot}
              </button>
            );
          })}
        </p>
      )}

      {/* TEXTE : saisie libre (N4). */}
      {item.format === "texte" && (
        <>
          {item.phrase && (
            <p className="kk-grammaire__phrase" style={{ fontSize: "1.4rem", textAlign: "center", margin: "6px 0" }}>
              {item.phrase}
            </p>
          )}
          <div className="kk-row" style={{ justifyContent: "center" }}>
            <input
              className="kk-lettres__input"
              style={{ maxWidth: 240 }}
              value={saisie}
              disabled={Boolean(res)}
              onChange={(ev) => setSaisie(ev.target.value)}
              onKeyDown={(ev) => { if (ev.key === "Enter") void soumettre(); }}
              aria-label={item.consigne}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </>
      )}

      {/* Validation. */}
      {!res && !erreurReseau && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <button className="kk-btn kk-btn--accent kk-btn--big" disabled={!peutValider} onClick={soumettre}>
            <Check size={22} aria-hidden="true" /> Valider
          </button>
        </div>
      )}

      {erreurReseau && !res && (
        <div className="kk-banner">
          <p style={{ margin: 0 }}>On vérifiera ta réponse dès que la connexion revient. Bravo d'avoir cherché !</p>
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(false)}>
            Continuer
          </button>
        </div>
      )}

      {/* Feedback serveur : toujours valorisant. */}
      {res && (
        <div className={`kk-banner ${res.correct ? "kk-banner--ok" : ""}`}>
          <span className="kk-banner__title">
            {res.correct ? <Check size={22} aria-hidden="true" /> : null}{" "}
            {res.correct ? "Bravo ! C'est la bonne réponse." : "Ce n'est pas tout à fait ça. Regarde la réponse."}
          </span>
          <p className="kk-grammaire__expl" aria-live="polite" style={{ margin: "8px 0" }}>
            {item.explication}
          </p>
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(res.correct)}>
            Continuer
          </button>
        </div>
      )}
    </div>
  );
}
