// « Les mots de la maitresse » (francais, CE2, phase 6). Composant AUTONOME,
// rendu dans Session.tsx quand ex.saisie === "maitresse". Le contenu (listes de
// mots, textes de dictee) est saisi par le PARENT ; il arrive via la banque du
// foyer (getMaitresse). Les exercices marchent SANS audio (la voix Naf est
// pre-generee). Progression PLUS EXIGEANTE (lot « mots de la maitresse ») :
//   MOTS   N1 : reconnaitre le mot bien ecrit parmi des pieges plausibles
//               (homophone, son, accent, lettre double/muette) ;
//          N2 : completer les lettres DIFFICILES, ou remettre les syllabes dans
//               l'ordre ;
//          N3 : ecrire le mot dans une phrase a trou (contexte visible) ;
//          N4 : memoriser puis ecrire le mot (sans contexte, le plus dur).
//   DICTEE mot a trou (QCM N1-2 / libre N3-4) ou dictee detective sur le texte.
// Le SERVEUR (ops mmots / mtrou / mdictee) reste SEUL JUGE. Quand c'est faux, on
// explique la faute de facon bienveillante (diagnostiquerMot).

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, EyeOff, Lightbulb, RotateCcw } from "lucide-react";
import DicteeDetective from "./DicteeDetective";
import type { DicteeReponse, DicteeResultat, DicteeTexte } from "../domain/francais/dictee";
import {
  type MaitresseListe,
  formesErronees, motATrou, messageMotCorrect,
  listesAvecMots, listesAvecTexte, dicteeDispo,
  lettresDifficiles, segmenterSyllabes, phraseGabarit, choisirMotPrioritaire,
} from "../domain/francais/maitresse";
import { diagnostiquerMot } from "../domain/diagnostic/maitresse";
import { makeRng, hashSeed, pick, chance, shuffle } from "../domain/calcul/rng";

export interface MaitresseSubmit {
  op: "mmots" | "mtrou" | "mdictee";
  listeId: string;
  niveau: number;
  index?: number;
  reponseTexte?: string;
  dictee?: DicteeReponse[];
}

interface Props {
  bank: MaitresseListe[];
  competence: string; // FR.MAITRESSE.MOTS | FR.MAITRESSE.DICTEE
  niveau: number;
  exKey: string; // graine reproductible (ex.key)
  indice: string | null; // affiche aux niveaux 1 et 2
  onSoumettre: (p: MaitresseSubmit) => Promise<{ correct: boolean; dictee?: DicteeResultat | null } | null>;
  onContinuer: (correct: boolean) => void;
}

type Plan =
  | { kind: "indispo" }
  | { kind: "motsQCM"; listeId: string; index: number; correct: string; options: string[] }
  | { kind: "motsCompleter"; listeId: string; index: number; correct: string; trous: number[] }
  | { kind: "motsOrdre"; listeId: string; index: number; correct: string; morceaux: string[] }
  | { kind: "motsPhrase"; listeId: string; index: number; correct: string; tokens: (string | null)[] }
  | { kind: "motsMemo"; listeId: string; index: number; correct: string }
  | { kind: "trouQCM"; listeId: string; index: number; tokens: (string | null)[]; correct: string; options: string[] }
  | { kind: "trouLibre"; listeId: string; index: number; tokens: (string | null)[]; correct: string }
  | { kind: "detective"; listeId: string; synthBank: DicteeTexte[] };

function buildPlan(bank: MaitresseListe[], competence: string, niveau: number, exKey: string): Plan {
  const rng = makeRng(hashSeed(competence, niveau, exKey));
  if (competence.endsWith("DICTEE")) {
    const listes = listesAvecTexte(bank);
    if (listes.length === 0) return { kind: "indispo" };
    const liste = pick(rng, listes);
    const trou = motATrou(liste.texte ?? "", liste.mots, rng);
    const det = dicteeDispo(liste, niveau);
    const useDet = det && (!trou || chance(rng, 0.5));
    if (useDet) {
      const d = liste.dictees![String(niveau)];
      const synthBank: DicteeTexte[] = [
        { id: 0, niveau, theme: "maitresse", mots: d.mots, nbErreurs: d.nb, notion: null },
      ];
      return { kind: "detective", listeId: liste.id, synthBank };
    }
    if (!trou) return { kind: "indispo" };
    if (niveau <= 2) {
      return {
        kind: "trouQCM", listeId: liste.id, index: trou.index, tokens: trou.tokens,
        correct: trou.correct, options: shuffle(rng, [trou.correct, ...formesErronees(trou.correct, rng, 2)]),
      };
    }
    return { kind: "trouLibre", listeId: liste.id, index: trou.index, tokens: trou.tokens, correct: trou.correct };
  }
  // FR.MAITRESSE.MOTS
  const listes = listesAvecMots(bank);
  if (listes.length === 0) return { kind: "indispo" };
  const liste = pick(rng, listes);
  // Priorise les mots faibles (EMA) : les mots rates reviennent plus souvent.
  const index = choisirMotPrioritaire(liste.mots, liste.ema, rng);
  const correct = liste.mots[index - 1];
  if (niveau <= 1) {
    // N1 : reconnaitre parmi 3 pieges plausibles (4 propositions au total).
    return {
      kind: "motsQCM", listeId: liste.id, index, correct,
      options: shuffle(rng, [correct, ...formesErronees(correct, rng, 3)]),
    };
  }
  if (niveau === 2) {
    // N2 : completer les lettres difficiles OU remettre les syllabes dans l'ordre.
    if (chance(rng, 0.5)) {
      return { kind: "motsCompleter", listeId: liste.id, index, correct, trous: lettresDifficiles(correct) };
    }
    return { kind: "motsOrdre", listeId: liste.id, index, correct, morceaux: shuffle(rng, segmenterSyllabes(correct)) };
  }
  if (niveau === 3) {
    // N3 : ecrire le mot dans une phrase a trou (contexte visible).
    const p = phraseGabarit(correct, rng);
    return { kind: "motsPhrase", listeId: liste.id, index, correct, tokens: p.tokens };
  }
  // N4 : memoriser puis ecrire (sans contexte).
  return { kind: "motsMemo", listeId: liste.id, index, correct };
}

// Rend une phrase a trou : les tokens, le trou (null) affiche par des tirets.
function PhraseTrou({ tokens }: { tokens: (string | null)[] }) {
  return (
    <p className="kk-lead" style={{ textAlign: "center", lineHeight: 2 }}>
      {tokens.map((t, i) => (
        <span key={i}>
          {t === null ? <span className="kk-maitresse__trou" aria-label="mot caché">______</span> : t}{" "}
        </span>
      ))}
    </p>
  );
}

export default function MaitresseExo({ bank, competence, niveau, exKey, indice, onSoumettre, onContinuer }: Props) {
  const plan = useMemo(() => buildPlan(bank, competence, niveau, exKey), [bank, competence, niveau, exKey]);

  const [choix, setChoix] = useState<string | null>(null);
  const [saisie, setSaisie] = useState("");
  const [lettres, setLettres] = useState<string[]>([]); // N2 completer : une lettre par trou
  const [ordre, setOrdre] = useState<number[]>([]); // N2 ordre : indices de morceaux choisis
  const [visible, setVisible] = useState(true); // memo : le mot est-il encore montre ?
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ correct: boolean; saisie: string } | null>(null);
  const [erreurReseau, setErreurReseau] = useState(false);
  const [montrerIndice, setMontrerIndice] = useState(false);

  // Reinitialise les saisies quand l'exercice change.
  useEffect(() => {
    setChoix(null); setSaisie(""); setOrdre([]); setRes(null); setErreurReseau(false); setMontrerIndice(false);
    setLettres(plan.kind === "motsCompleter" ? plan.trous.map(() => "") : []);
  }, [plan]);

  // Memorisation : le mot se cache tout seul apres quelques secondes.
  useEffect(() => {
    if (plan.kind !== "motsMemo") return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [plan]);

  if (plan.kind === "indispo") {
    return (
      <div className="kk-stack" style={{ textAlign: "center" }}>
        <p className="kk-muted">Les mots de la maîtresse ne sont pas prêts pour l'instant.</p>
        <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(false)}>Continuer</button>
      </div>
    );
  }

  // Dictee detective : on reutilise le composant existant (moteur verif serveur).
  if (plan.kind === "detective") {
    return (
      <DicteeDetective
        key={exKey}
        niveau={niveau}
        bank={plan.synthBank}
        ctx={null}
        onSoumettre={(_id, niv, reps) =>
          onSoumettre({ op: "mdictee", listeId: plan.listeId, niveau: niv, dictee: reps }).then((r) => r?.dictee ?? null)
        }
        onContinuer={onContinuer}
      />
    );
  }

  const estMots = plan.kind !== "trouQCM" && plan.kind !== "trouLibre";
  const correct = plan.correct;

  // Reconstruit le mot complet a partir des lettres difficiles completees.
  const reconstruireCompleter = (): string => {
    if (plan.kind !== "motsCompleter") return "";
    const chars = correct.split("");
    plan.trous.forEach((pos, i) => { chars[pos] = (lettres[i] ?? "").slice(0, 1); });
    return chars.join("");
  };
  // Reconstruit le mot a partir des morceaux remis dans l'ordre.
  const reconstruireOrdre = (): string =>
    plan.kind === "motsOrdre" ? ordre.map((i) => plan.morceaux[i]).join("") : "";

  const envoyer = async (reponseTexte: string) => {
    if (busy || res || reponseTexte.trim() === "") return;
    setBusy(true);
    try {
      const op = estMots ? "mmots" : "mtrou";
      const r = await onSoumettre({ op, listeId: plan.listeId, niveau, index: plan.index, reponseTexte });
      if (r) setRes({ correct: r.correct, saisie: reponseTexte });
      else setErreurReseau(true);
    } catch {
      setErreurReseau(true);
    } finally {
      setBusy(false);
    }
  };

  const consigne =
    plan.kind === "motsQCM" ? "Quel mot est bien écrit ?"
    : plan.kind === "motsCompleter" ? "Complète les lettres qui manquent."
    : plan.kind === "motsOrdre" ? "Remets les morceaux dans le bon ordre."
    : plan.kind === "motsPhrase" ? "Écris le mot qui manque dans la phrase."
    : plan.kind === "motsMemo" ? (visible ? "Regarde bien ce mot, tu vas l'écrire." : "Écris le mot que tu as vu.")
    : plan.kind === "trouQCM" ? "Quel mot manque dans la phrase ?"
    : "Écris le mot qui manque dans la phrase.";

  // Valeur courante soumise selon le mode (pour activer le bouton Valider).
  const valeurCourante =
    plan.kind === "motsQCM" || plan.kind === "trouQCM" ? (choix ?? "")
    : plan.kind === "motsCompleter" ? (lettres.every((l) => l.trim() !== "") ? reconstruireCompleter() : "")
    : plan.kind === "motsOrdre" ? (ordre.length === plan.morceaux.length ? reconstruireOrdre() : "")
    : saisie;

  return (
    <div className="kk-stack kk-maitresse">
      {/* Phrase a trou (mot a trou DICTEE, ou phrase gabarit MOTS N3). */}
      {(plan.kind === "trouQCM" || plan.kind === "trouLibre" || plan.kind === "motsPhrase") && (
        <PhraseTrou tokens={plan.tokens} />
      )}

      {/* Memorisation : le mot a retenir (puis cache). */}
      {plan.kind === "motsMemo" && visible && (
        <div className="kk-stack" style={{ textAlign: "center" }}>
          <p className="kk-lead" style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "0.1rem" }}>{correct}</p>
          <div className="kk-row" style={{ justifyContent: "center" }}>
            <button type="button" className="kk-btn" onClick={() => setVisible(false)}>
              <EyeOff size={16} aria-hidden="true" /> Cacher et écrire
            </button>
          </div>
        </div>
      )}

      <p className="kk-lead" style={{ textAlign: "center", margin: "0 auto" }}>{consigne}</p>

      {/* Indice (niveaux 1 et 2). */}
      {indice && !res && (
        <div className="kk-stack kk-indice" style={{ textAlign: "center" }}>
          <button type="button" className="kk-btn" aria-expanded={montrerIndice} onClick={() => setMontrerIndice((v) => !v)}>
            <Lightbulb size={16} aria-hidden="true" /> Indice
          </button>
          {montrerIndice && <p className="kk-indice__texte kk-muted" aria-live="polite">{indice}</p>}
        </div>
      )}

      {/* QCM (orthographe ou mot a trou). */}
      {(plan.kind === "motsQCM" || plan.kind === "trouQCM") && (
        <div className="kk-qcm">
          {plan.options.map((o, i) => {
            const choisi = choix === o;
            const bon = res && o === correct;
            const extra = (choisi && !res) || bon ? " kk-qcm__opt--active" : "";
            return (
              <button
                key={i}
                type="button"
                className={`kk-btn kk-qcm__opt${extra}`}
                disabled={Boolean(res)}
                aria-pressed={choisi}
                onClick={() => setChoix(o)}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}

      {/* N2 : completer les lettres difficiles. */}
      {plan.kind === "motsCompleter" && (
        <div className="kk-row kk-maitresse__completer" style={{ justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
          {correct.split("").map((ch, pos) => {
            const trouIdx = plan.trous.indexOf(pos);
            if (trouIdx === -1) {
              return <span key={pos} className="kk-maitresse__lettre" style={{ fontSize: "1.6rem", fontWeight: 700 }}>{ch}</span>;
            }
            return (
              <input
                key={pos}
                className="kk-lettres__input"
                style={{ width: 44, textAlign: "center", fontSize: "1.4rem" }}
                maxLength={1}
                value={lettres[trouIdx] ?? ""}
                disabled={Boolean(res)}
                onChange={(e) => {
                  const next = lettres.slice();
                  next[trouIdx] = e.target.value.slice(-1);
                  setLettres(next);
                }}
                aria-label={`Lettre ${trouIdx + 1}`}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            );
          })}
        </div>
      )}

      {/* N2 : remettre les morceaux dans l'ordre. */}
      {plan.kind === "motsOrdre" && (
        <div className="kk-stack" style={{ alignItems: "center" }}>
          <div className="kk-row" style={{ justifyContent: "center", minHeight: 48, flexWrap: "wrap", gap: 6 }}>
            {ordre.map((i, k) => (
              <span key={k} className="kk-maitresse__syll kk-qcm__opt kk-qcm__opt--active"
                style={{ padding: "6px 12px", fontSize: "1.3rem", fontWeight: 700 }}>
                {plan.morceaux[i]}
              </span>
            ))}
          </div>
          <div className="kk-row" style={{ justifyContent: "center", flexWrap: "wrap", gap: 6 }}>
            {plan.morceaux.map((m, i) => (
              <button
                key={i}
                type="button"
                className="kk-btn"
                disabled={Boolean(res) || ordre.includes(i)}
                style={{ fontSize: "1.3rem", fontWeight: 700, opacity: ordre.includes(i) ? 0.3 : 1 }}
                onClick={() => setOrdre((o) => [...o, i])}
              >
                {m}
              </button>
            ))}
          </div>
          {ordre.length > 0 && !res && (
            <button type="button" className="kk-btn kk-btn--ghost" onClick={() => setOrdre([])}>
              <RotateCcw size={16} aria-hidden="true" /> Recommencer
            </button>
          )}
        </div>
      )}

      {/* Saisie libre (phrase N3, ou memorisation N4 cachee, ou mot a trou libre). */}
      {(plan.kind === "trouLibre" || plan.kind === "motsPhrase" || (plan.kind === "motsMemo" && !visible)) && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <input
            className="kk-lettres__input"
            style={{ maxWidth: 260 }}
            value={saisie}
            disabled={Boolean(res)}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void envoyer(saisie); }}
            aria-label={consigne}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      )}

      {/* Memorisation : rappel pour revoir le mot si besoin (avant d'ecrire). */}
      {plan.kind === "motsMemo" && !visible && !res && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <button type="button" className="kk-btn" onClick={() => setVisible(true)}>
            <Eye size={16} aria-hidden="true" /> Revoir le mot
          </button>
        </div>
      )}

      {/* Validation. */}
      {!res && !erreurReseau && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <button
            className="kk-btn kk-btn--accent kk-btn--big"
            disabled={busy || valeurCourante.trim() === ""}
            onClick={() => void envoyer(valeurCourante)}
          >
            <Check size={22} aria-hidden="true" /> Valider
          </button>
        </div>
      )}

      {erreurReseau && !res && (
        <div className="kk-banner">
          <p style={{ margin: 0 }}>On vérifiera ta réponse dès que la connexion revient. Bravo d'avoir cherché !</p>
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(false)}>Continuer</button>
        </div>
      )}

      {/* Feedback serveur : toujours valorisant. En cas d'erreur, diagnostic du type de faute. */}
      {res && (
        <div className={`kk-banner ${res.correct ? "kk-banner--ok" : ""}`}>
          <span className="kk-banner__title">
            {res.correct ? <Check size={22} aria-hidden="true" /> : null}{" "}
            {res.correct
              ? "Bravo ! C'est le bon mot."
              : res.saisie.trim() !== ""
                ? diagnostiquerMot(correct, res.saisie).message
                : messageMotCorrect(correct)}
          </span>
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(res.correct)}>Continuer</button>
        </div>
      )}
    </div>
  );
}
