// « Les mots de la maitresse » (francais, CE2, phase 6). Composant AUTONOME,
// rendu dans Session.tsx quand ex.saisie === "maitresse". Le contenu (listes de
// mots, textes de dictee) est saisi par le PARENT ; il arrive via la banque du
// foyer (getMaitresse). Les exercices marchent SANS audio (la voix Naf est
// pre-generee) :
//   - QCM orthographe (N1-N2) : choisir le mot BIEN ecrit parmi des formes
//     erronees generees de facon deterministe ;
//   - memoriser puis ecrire (N3-N4) : le mot s'affiche quelques secondes, se
//     cache, l'enfant l'ecrit ;
//   - mot a trou : un mot du texte est cache, l'enfant le choisit (N1-N2) ou
//     l'ecrit (N3-N4) ;
//   - dictee detective sur le texte : on REUTILISE <DicteeDetective> (moteur
//     verif existant cote serveur, erreurs injectees de facon deterministe).
// Le SERVEUR (ops mmots / mtrou / mdictee) reste SEUL JUGE. Feedback valorisant.

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, EyeOff, Lightbulb } from "lucide-react";
import DicteeDetective from "./DicteeDetective";
import type { DicteeReponse, DicteeResultat, DicteeTexte } from "../domain/francais/dictee";
import {
  type MaitresseListe,
  formesErronees, motATrou, messageMotCorrect,
  listesAvecMots, listesAvecTexte, dicteeDispo,
} from "../domain/francais/maitresse";
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
  const index = 1 + Math.floor(rng() * liste.mots.length);
  const correct = liste.mots[index - 1];
  if (niveau <= 2) {
    return {
      kind: "motsQCM", listeId: liste.id, index, correct,
      options: shuffle(rng, [correct, ...formesErronees(correct, rng, 2)]),
    };
  }
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
  const [visible, setVisible] = useState(true); // memo : le mot est-il encore montre ?
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ correct: boolean } | null>(null);
  const [erreurReseau, setErreurReseau] = useState(false);
  const [montrerIndice, setMontrerIndice] = useState(false);

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

  const estMots = plan.kind === "motsQCM" || plan.kind === "motsMemo";
  const correct = plan.correct;

  const envoyer = async (reponseTexte: string) => {
    if (busy || res || reponseTexte.trim() === "") return;
    setBusy(true);
    try {
      const op = estMots ? "mmots" : "mtrou";
      const r = await onSoumettre({ op, listeId: plan.listeId, niveau, index: plan.index, reponseTexte });
      if (r) setRes({ correct: r.correct });
      else setErreurReseau(true);
    } catch {
      setErreurReseau(true);
    } finally {
      setBusy(false);
    }
  };

  const consigne =
    plan.kind === "motsQCM" ? "Quel mot est bien écrit ?"
    : plan.kind === "motsMemo" ? (visible ? "Regarde bien ce mot, tu vas l'écrire." : "Écris le mot que tu as vu.")
    : plan.kind === "trouQCM" ? "Quel mot manque dans la phrase ?"
    : "Écris le mot qui manque dans la phrase.";

  return (
    <div className="kk-stack kk-maitresse">
      {/* Phrase a trou : on montre le texte au-dessus de la consigne. */}
      {(plan.kind === "trouQCM" || plan.kind === "trouLibre") && <PhraseTrou tokens={plan.tokens} />}

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

      {/* Saisie libre (memorisation ou mot a trou libre). */}
      {(plan.kind === "trouLibre" || (plan.kind === "motsMemo" && !visible)) && (
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
            disabled={busy || ((plan.kind === "motsQCM" || plan.kind === "trouQCM") ? choix === null : saisie.trim() === "")}
            onClick={() => void envoyer((plan.kind === "motsQCM" || plan.kind === "trouQCM") ? (choix ?? "") : saisie)}
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

      {/* Feedback serveur : toujours valorisant. */}
      {res && (
        <div className={`kk-banner ${res.correct ? "kk-banner--ok" : ""}`}>
          <span className="kk-banner__title">
            {res.correct ? <Check size={22} aria-hidden="true" /> : null}{" "}
            {res.correct ? "Bravo ! C'est le bon mot." : messageMotCorrect(correct)}
          </span>
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(res.correct)}>Continuer</button>
        </div>
      )}
    </div>
  );
}
