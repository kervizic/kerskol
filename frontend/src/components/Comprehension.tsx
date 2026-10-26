// Comprendre un texte (francais, CE2, phase 5). Composant AUTONOME, rendu dans
// Session.tsx quand ex.saisie === "comprehension". Il affiche un TEXTE en LECTURE
// SILENCIEUSE (decision Manu : aucun bouton « ecouter le texte », aucun karaoke,
// aucune lecture a voix haute du texte) puis une question, et gere quatre
// formats de reponse :
//   - qcm   : propositions en gros boutons ;
//   - texte : saisie LIBRE (N4), l'enfant tape un mot (accents exiges) ;
//   - clic  : chaque mot du texte devient une cible tactile ; l'enfant touche le
//             mot qui prouve la reponse ;
//   - ordre : l'enfant touche 2 a 3 evenements dans le bon ordre.
// Un INDICE (niveaux 1 et 2 seulement) aide sans donner la reponse ; son usage
// n'est jamais enregistre. Le SERVEUR (verif_comprehension, op 'lire') reste SEUL
// JUGE : onSoumettre renvoie le verdict serveur ; `attendu` ne sert qu'au
// feedback (surlignage) et au mode demo. Feedback TOUJOURS valorisant.

import { useMemo, useState } from "react";
import { Check, Lightbulb } from "lucide-react";
import type { CompRender } from "../domain/francais/comprehension";
import { comparerComprehension, SEP_ORDRE } from "../domain/francais/comprehension";
import RemiseEnOrdre from "./RemiseEnOrdre";

interface Props {
  item: CompRender;
  indice: string | null; // affiche aux niveaux 1 et 2 (null sinon)
  onSoumettre: (cle: string, reponseTexte: string) => Promise<{ correct: boolean } | null>;
  onContinuer: (correct: boolean) => void;
}

// --------------------------------------------------------------------------
// Le TEXTE a lire. En mode clic, chaque mot est un bouton (cible tactile large).
// Apres la reponse, le mot attendu est surligne (correction) et le mot choisi a
// tort est marque. Hors mode clic, le texte est un simple bloc de lecture.
// --------------------------------------------------------------------------
function TexteView({
  texte, clickable, selectedKey, chosen, onPick, attendu, corrige,
}: {
  texte: string[];
  clickable: boolean;
  selectedKey: string | null;
  chosen: string | null;
  onPick: (key: string, mot: string) => void;
  attendu: string;
  corrige: boolean; // true : la reponse est tombee -> surligner la correction
}) {
  return (
    <div className="kk-support kk-lecture__texte" role="group" aria-label="texte à lire">
      {texte.map((ligne, li) => {
        if (!clickable && !corrige) {
          return <p key={li} className="kk-lecture__p">{ligne}</p>;
        }
        const mots = ligne.split(" ");
        return (
          <p key={li} className="kk-lecture__p">
            {mots.map((mot, wi) => {
              const key = `${li}-${wi}`;
              const estBon = corrige && comparerComprehension("clic", mot, attendu);
              const estChoisiFaux = corrige && chosen != null && key === selectedKey && !estBon;
              const estSel = !corrige && key === selectedKey;
              const cls =
                "kk-lecture__mot" +
                (estBon ? " kk-lecture__mot--ok" : estChoisiFaux ? " kk-lecture__mot--ko" : estSel ? " kk-lecture__mot--sel" : "");
              return (
                <span key={wi}>
                  <button
                    type="button"
                    className={cls}
                    disabled={corrige}
                    aria-pressed={estSel}
                    onClick={() => onPick(key, mot)}
                  >
                    {mot}
                  </button>{" "}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

export default function Comprehension({ item, indice, onSoumettre, onContinuer }: Props) {
  const [choix, setChoix] = useState<string | null>(null); // qcm
  const [saisie, setSaisie] = useState(""); // texte
  const [clicKey, setClicKey] = useState<string | null>(null); // clic : mot touche (cle li-wi)
  const [clicMot, setClicMot] = useState<string | null>(null); // clic : mot touche (texte brut)
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ correct: boolean } | null>(null);
  const [erreurReseau, setErreurReseau] = useState(false);
  const [montrerIndice, setMontrerIndice] = useState(false);

  // Reponse courante envoyee au serveur, selon le format. Le format « ordre » est
  // delegue a RemiseEnOrdre (early return ci-dessous) : il gere sa propre reponse.
  const reponse = useMemo(() => {
    if (item.format === "qcm") return choix ?? "";
    if (item.format === "texte") return saisie;
    if (item.format === "clic") return clicMot ?? "";
    return "";
  }, [item.format, choix, saisie, clicMot]);

  const complet = reponse.trim().length > 0;
  const peutValider = complet && !res && !busy;

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

  const clickableTexte = item.format === "clic";

  // Format « ordre » (remettre des evenements de l'histoire dans l'ordre) :
  // composant partage (cases numerotees + banque de cartes), avec le texte a
  // lire affiche au-dessus. Le serveur reste SEUL JUGE (reponse jointe par « | »).
  if (item.format === "ordre") {
    const support = (
      <>
        <TexteView
          texte={item.texte}
          clickable={false}
          selectedKey={null}
          chosen={null}
          onPick={() => {}}
          attendu={item.attendu}
          corrige={false}
        />
        {item.glossaire && item.glossaire.length > 0 && (
          <details className="kk-lecture__gloss">
            <summary className="kk-btn">Mots difficiles</summary>
            <ul className="kk-lecture__gloss-list">
              {item.glossaire.map((g, i) => (
                <li key={i}>
                  <strong>{g.mot}</strong> : {g.sens}
                </li>
              ))}
            </ul>
          </details>
        )}
        {item.source && (
          <p className="kk-lecture__source kk-muted" style={{ textAlign: "center", fontSize: "0.85rem", margin: 0 }}>
            {item.source} — domaine public
          </p>
        )}
      </>
    );
    return (
      <RemiseEnOrdre
        cle={item.cle}
        consigne={item.consigne}
        labels={item.attendu.split(SEP_ORDRE)}
        separateur={SEP_ORDRE}
        explication={item.explication}
        support={support}
        onSoumettre={(rep) => onSoumettre(item.cle, rep)}
        onContinuer={onContinuer}
      />
    );
  }

  return (
    <div className="kk-stack kk-lecture">
      {/* TEXTE a lire (silencieux). En mode clic, les mots sont cliquables. */}
      <TexteView
        texte={item.texte}
        clickable={clickableTexte && !res}
        selectedKey={clicKey}
        chosen={clicMot}
        onPick={(key, mot) => {
          if (res) return;
          setClicKey(key);
          setClicMot(mot);
        }}
        attendu={item.attendu}
        corrige={Boolean(res) && clickableTexte}
      />

      {/* Petit glossaire des vieux mots (survol/toucher). Affichage seulement. */}
      {item.glossaire && item.glossaire.length > 0 && (
        <details className="kk-lecture__gloss">
          <summary className="kk-btn">Mots difficiles</summary>
          <ul className="kk-lecture__gloss-list">
            {item.glossaire.map((g, i) => (
              <li key={i}>
                <strong>{g.mot}</strong> : {g.sens}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Credit : auteur et oeuvre (domaine public). */}
      {item.source && (
        <p className="kk-lecture__source kk-muted" style={{ textAlign: "center", fontSize: "0.85rem", margin: 0 }}>
          {item.source} — domaine public
        </p>
      )}

      {/* Question (consigne). */}
      <p className="kk-lead" style={{ textAlign: "center", margin: "0 auto" }}>{item.consigne}</p>

      {/* Indice (niveaux 1 et 2 uniquement) : aide SANS donner la reponse. */}
      {indice && !res && (
        <div className="kk-stack kk-indice" style={{ textAlign: "center" }}>
          <button
            type="button"
            className="kk-btn"
            aria-expanded={montrerIndice}
            onClick={() => setMontrerIndice((v) => !v)}
          >
            <Lightbulb size={16} aria-hidden="true" /> Indice
          </button>
          {montrerIndice && <p className="kk-indice__texte kk-muted" aria-live="polite">{indice}</p>}
        </div>
      )}

      {/* QCM : gros boutons empiles. */}
      {item.format === "qcm" && item.options && (
        <div className="kk-qcm">
          {item.options.map((o, i) => {
            const choisi = choix === o;
            const bon = res && comparerComprehension("qcm", o, item.attendu);
            const extra = (choisi && !res) || (res && bon) ? " kk-qcm__opt--active" : "";
            return (
              <button
                key={i}
                type="button"
                className={`kk-btn kk-qcm__opt${extra}`}
                disabled={Boolean(res)}
                onClick={() => setChoix(o)}
                aria-pressed={choisi}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}

      {/* TEXTE : saisie libre (N4). Accents EXIGES : clavier texte, pas numerique. */}
      {item.format === "texte" && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <input
            className="kk-lettres__input"
            style={{ maxWidth: 260 }}
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
            {res.correct
              ? "Bravo ! C'est la bonne réponse."
              : item.preuve
                ? `Relis cette phrase : ${item.preuve}`
                : "Ce n'est pas tout à fait ça. Regarde la réponse."}
          </span>
          <p className="kk-geo__expl" aria-live="polite" style={{ margin: "8px 0" }}>{item.explication}</p>
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(res.correct)}>
            Continuer
          </button>
        </div>
      )}
    </div>
  );
}
