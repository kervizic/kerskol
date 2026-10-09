// « Parcours d'Histoire » : un chapitre joue en 4 etapes, DANS L'ORDRE
//   1) RECIT   : le recit d'un temoin + le document (schema SVG) et sa legende ;
//   2) QUESTIONS : questions liees au recit et au document (moteur QM, serveur
//      seul juge) ; un bouton « Revoir le recit » est toujours disponible ;
//   3) FRISE   : placer 2-3 cartes-evenements (verification serveur de l'ordre) ;
//   4) JE RETIENS : un resume a trous (vocabulaire officiel, serveur seul juge).
// Composant AUTONOME : toutes les verifications passent par les callbacks
// (onSoumettre pour QM, onPlacerFrise pour la frise), ce qui le rend testable et
// garde le SERVEUR seul juge. Feedback toujours valorisant.

import { useRef, useState } from "react";
import { BookOpen, ScrollText } from "lucide-react";
import type { ParcoursChapitre, FriseCarte } from "../domain/histoire/parcours";
import type { QmScene } from "../domain/qm/types";
import QuestionnerLeMonde from "./QuestionnerLeMonde";
import Frise from "./Frise";

type Verdict = { correct: boolean } | null;

interface Props {
  chapitre: ParcoursChapitre;
  // Cartes deja sur la frise du profil (triees chronologiquement).
  frisePlacees: FriseCarte[];
  // Verifie une reponse QM (question ou trou du « je retiens »), op 'qm'.
  onSoumettre: (cle: string, reponseTexte: string) => Promise<Verdict>;
  // Verifie l'ordre propose pour une carte (op frise_placer).
  onPlacerFrise: (cle: string, ordreCles: string[]) => Promise<Verdict>;
  // Fin du parcours (retour a la liste des chapitres).
  onTermine: () => void;
  onQuitter?: () => void;
}

type Etape = "recit" | "questions" | "frise" | "retiens";
const ETAPES: Etape[] = ["recit", "questions", "frise", "retiens"];
const ETAPE_LABEL: Record<Etape, string> = {
  recit: "Le récit",
  questions: "Les questions",
  frise: "Ma frise",
  retiens: "Je retiens",
};

// Rendu du DOCUMENT (schema SVG maison, sans zones cliquables).
function DocScene({ scene }: { scene: QmScene }) {
  return (
    <div className="kk-support kk-qm__scene" style={{ textAlign: "center" }}>
      <svg width="100%" style={{ maxWidth: 360 }} viewBox={scene.viewBox} role="img" aria-label="document">
        {scene.els.map((el, i) => {
          const common = {
            fill: el.fill ?? "none",
            stroke: el.stroke ?? "var(--kk-border)",
            strokeWidth: el.sw ?? 1.5,
            opacity: el.opacity,
            strokeDasharray: el.dashed ? "4 3" : undefined,
          } as const;
          switch (el.t) {
            case "rect": return <rect key={i} x={el.x} y={el.y} width={el.w} height={el.h} rx={3} {...common} />;
            case "circle": return <circle key={i} cx={el.cx} cy={el.cy} r={el.r} {...common} />;
            case "ellipse": return <ellipse key={i} cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} {...common} />;
            case "line": return <line key={i} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} {...common} />;
            case "polyline": return <polyline key={i} points={el.points} {...common} />;
            case "polygon": return <polygon key={i} points={el.points} {...common} />;
            case "path": return <path key={i} d={el.d} {...common} />;
            case "text": return (
              <text key={i} x={el.x} y={el.y} fontSize={el.fontSize ?? 9}
                textAnchor={el.anchor ?? "middle"} fill={el.fill ?? "var(--kk-text)"}>{el.text}</text>
            );
            default: return null;
          }
        })}
      </svg>
    </div>
  );
}

// Bloc RECIT reutilise (etape 1 et apercu « Revoir le recit »).
function RecitView({ chapitre }: { chapitre: ParcoursChapitre }) {
  return (
    <div className="kk-stack">
      <p className="kk-muted" style={{ margin: 0, textAlign: "center" }}>
        Raconté par : {chapitre.personnage}
      </p>
      <div className="kk-support kk-lecture__texte" role="group" aria-label="le récit">
        {chapitre.recit.map((ligne, i) => (
          <p key={i} className="kk-lecture__p">{ligne}</p>
        ))}
      </div>
      <DocScene scene={chapitre.document.scene} />
      <p className="kk-muted" style={{ textAlign: "center", fontSize: "0.85rem", margin: 0 }}>
        {chapitre.document.nature} — {chapitre.document.auteur} — {chapitre.document.date}
      </p>
      <p style={{ textAlign: "center", margin: 0 }}>{chapitre.document.legende}</p>
    </div>
  );
}

// Etape « Je retiens » : resume a trous, chaque trou verifie par le serveur.
function JeRetiensView({
  chapitre, onSoumettre, onTermine,
}: {
  chapitre: ParcoursChapitre;
  onSoumettre: (cle: string, reponseTexte: string) => Promise<Verdict>;
  onTermine: () => void;
}) {
  const blancs = chapitre.jeRetiens.blancs;
  const [saisies, setSaisies] = useState<string[]>(() => blancs.map(() => ""));
  const [verdicts, setVerdicts] = useState<Array<boolean | null>>(() => blancs.map(() => null));
  const [busy, setBusy] = useState(false);
  const [fait, setFait] = useState(false);

  // Decoupe le resume en fragments de texte et de trous {1}, {2}...
  const parts = chapitre.jeRetiens.resume.split(/(\{\d+\})/g);

  const valider = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await Promise.all(
        blancs.map((b, i) => onSoumettre(b.cle, saisies[i] ?? "")),
      );
      setVerdicts(res.map((r) => (r ? r.correct : null)));
      setFait(true);
    } finally {
      setBusy(false);
    }
  };

  const complet = saisies.every((s) => s.trim().length > 0);

  return (
    <div className="kk-stack">
      <p className="kk-lead" style={{ textAlign: "center", margin: 0 }}>
        <ScrollText size={18} aria-hidden="true" /> Complète le résumé avec les bons mots.
      </p>
      <div className="kk-support" style={{ lineHeight: 2 }}>
        {parts.map((p, i) => {
          const m = p.match(/\{(\d+)\}/);
          if (!m) return <span key={i}>{p}</span>;
          const bi = Number(m[1]) - 1;
          const v = verdicts[bi];
          const couleur = v === true ? "#16a34a" : v === false ? "#c0392b" : "var(--kk-border)";
          return (
            <input
              key={i}
              className="kk-lettres__input"
              value={saisies[bi] ?? ""}
              disabled={fait}
              onChange={(ev) => setSaisies((s) => s.map((x, k) => (k === bi ? ev.target.value : x)))}
              aria-label={`mot ${bi + 1}`}
              autoCapitalize="none" autoCorrect="off" spellCheck={false}
              style={{ width: 150, margin: "0 4px", borderColor: couleur }}
            />
          );
        })}
      </div>

      {!fait ? (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <button className="kk-btn kk-btn--accent kk-btn--big" disabled={!complet || busy} onClick={valider}>
            Valider
          </button>
        </div>
      ) : (
        <div className={`kk-banner ${verdicts.every((v) => v) ? "kk-banner--ok" : ""}`}>
          <span className="kk-banner__title">
            {verdicts.every((v) => v)
              ? "Bravo ! Tu as bien retenu les mots du chapitre."
              : "Bien joué d'avoir cherché. Regarde les mots en vert : c'est ce qu'il fallait écrire."}
          </span>
          <ul style={{ margin: "8px 0" }}>
            {blancs.map((b, i) => (
              <li key={b.cle}>
                {verdicts[i] ? "✅" : "➡️"} <strong>{b.attendu}</strong>
              </li>
            ))}
          </ul>
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={onTermine}>
            Terminer le chapitre
          </button>
        </div>
      )}
    </div>
  );
}

export default function Parcours({
  chapitre, frisePlacees, onSoumettre, onPlacerFrise, onTermine, onQuitter,
}: Props) {
  const [etape, setEtape] = useState<Etape>("recit");
  const [qIndex, setQIndex] = useState(0); // question courante
  const [fIndex, setFIndex] = useState(0); // carte de frise courante
  const [placees, setPlacees] = useState<FriseCarte[]>(() =>
    [...frisePlacees].sort((a, b) => a.cleTri - b.cleTri),
  );
  const [revoirRecit, setRevoirRecit] = useState(false);
  const verdictFrise = useRef(false);

  const etapeIdx = ETAPES.indexOf(etape);

  // --- Etape QUESTIONS : avance question par question ---------------------
  const question = chapitre.questions[qIndex];
  const avancerQuestion = () => {
    if (qIndex + 1 < chapitre.questions.length) setQIndex((i) => i + 1);
    else setEtape("frise");
  };

  // --- Etape FRISE : place une carte a la fois ----------------------------
  const carteAPlacer = chapitre.frise[fIndex] ?? null;
  const placerCarte = async (cle: string, ordreCles: string[]): Promise<Verdict> => {
    const r = await onPlacerFrise(cle, ordreCles);
    verdictFrise.current = Boolean(r?.correct);
    return r;
  };
  const avancerFrise = () => {
    const carte = chapitre.frise[fIndex];
    if (carte && verdictFrise.current && !placees.some((c) => c.cle === carte.cle)) {
      setPlacees((p) => [...p, carte].sort((a, b) => a.cleTri - b.cleTri));
    }
    verdictFrise.current = false;
    if (fIndex + 1 < chapitre.frise.length) setFIndex((i) => i + 1);
    else setEtape("retiens");
  };

  return (
    <div className="kk-stack kk-parcours" style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
      {/* En-tete : titre + progression des etapes. */}
      <div className="kk-row" style={{ alignItems: "center", gap: 8 }}>
        {onQuitter && (
          <button className="kk-btn" onClick={onQuitter} aria-label="Quitter le parcours">←</button>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.15rem" }}>{chapitre.titre}</h1>
          <p className="kk-muted" style={{ margin: 0, fontSize: "0.85rem" }}>{chapitre.theme}</p>
        </div>
      </div>
      <ol className="kk-parcours__etapes" aria-label="étapes du parcours"
        style={{ display: "flex", gap: 6, listStyle: "none", padding: 0, margin: 0, flexWrap: "wrap" }}>
        {ETAPES.map((e, i) => (
          <li key={e}
            aria-current={e === etape ? "step" : undefined}
            style={{
              fontSize: "0.72rem", padding: "2px 8px", borderRadius: 999,
              border: `1px solid ${i <= etapeIdx ? "var(--kk-accent)" : "var(--kk-border)"}`,
              color: i <= etapeIdx ? "var(--kk-accent)" : "var(--kk-muted, #888)",
              fontWeight: e === etape ? 700 : 400,
            }}>
            {i + 1}. {ETAPE_LABEL[e]}
          </li>
        ))}
      </ol>

      {/* ETAPE 1 : RECIT */}
      {etape === "recit" && (
        <>
          <RecitView chapitre={chapitre} />
          <div className="kk-row" style={{ justifyContent: "center" }}>
            <button className="kk-btn kk-btn--accent kk-btn--big" onClick={() => setEtape("questions")}>
              Commencer les questions
            </button>
          </div>
        </>
      )}

      {/* ETAPE 2 : QUESTIONS (avec « Revoir le recit ») */}
      {etape === "questions" && question && (
        <>
          <div className="kk-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span className="kk-muted" style={{ fontSize: "0.85rem" }}>
              Question {qIndex + 1} / {chapitre.questions.length}
            </span>
            <button className="kk-btn" aria-expanded={revoirRecit} onClick={() => setRevoirRecit((v) => !v)}>
              <BookOpen size={16} aria-hidden="true" /> Revoir le récit
            </button>
          </div>
          {revoirRecit && (
            <div className="kk-card" style={{ padding: 10 }}>
              <RecitView chapitre={chapitre} />
            </div>
          )}
          <QuestionnerLeMonde
            key={question.cle}
            item={question}
            onSoumettre={onSoumettre}
            onContinuer={avancerQuestion}
          />
        </>
      )}

      {/* ETAPE 3 : FRISE (placement carte par carte) */}
      {etape === "frise" && carteAPlacer && (
        <Frise
          key={carteAPlacer.cle}
          titre="Place ta nouvelle carte"
          cartes={placees}
          aPlacer={carteAPlacer}
          onPlacer={(ordre) => placerCarte(carteAPlacer.cle, ordre)}
          onContinuer={avancerFrise}
        />
      )}

      {/* ETAPE 4 : JE RETIENS */}
      {etape === "retiens" && (
        <JeRetiensView chapitre={chapitre} onSoumettre={onSoumettre} onTermine={onTermine} />
      )}
    </div>
  );
}
