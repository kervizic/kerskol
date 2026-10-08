// « Questionner le monde » (CE2). Composant AUTONOME, rendu dans Session.tsx
// quand ex.saisie === "qm". Il gere cinq formats d'interaction :
//   - qcm    : propositions en gros boutons ;
//   - texte  : saisie LIBRE (N4), l'enfant ecrit le mot ;
//   - ordre  : RANGER des etapes (cycle de vie, chaine alimentaire) en les
//              touchant dans l'ordre ; on peut defaire la derniere ;
//   - tri    : CLASSER chaque objet dans une categorie (solide/liquide/gaz...) ;
//   - clic   : TOUCHER une zone d'une scene SVG maison (corps, planisphere,
//              circuit, calendrier).
// Toutes les cibles tactiles sont larges (>= 44 px). Le SERVEUR (verif_qm, op
// 'qm') reste SEUL JUGE : onSoumettre renvoie le verdict serveur ; `attendu` ne
// sert qu'au feedback (surlignage) et au mode demo. Feedback TOUJOURS valorisant.

import { useMemo, useState } from "react";
import { Check, Undo2 } from "lucide-react";
import type { QmRender, QmScene, QmSceneEl } from "../domain/qm/types";
import { comparerQm } from "../domain/qm/types";
import { illustrationPourCle } from "../domain/images";

interface Props {
  item: QmRender;
  onSoumettre: (cle: string, reponseTexte: string) => Promise<{ correct: boolean } | null>;
  onContinuer: (correct: boolean) => void;
}

const OK = "#16a34a"; // vert de correction

// Melange DETERMINISTE (graine = cle de l'item) pour que l'ordre d'affichage
// des etapes soit stable entre deux rendus, mais different de l'ordre correct.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function shuffleStable<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --------------------------------------------------------------------------
// Scene SVG maison (format clic) : dessine les primitives puis des zones
// cliquables. var(--kk-*) pour le theme clair/sombre.
// --------------------------------------------------------------------------
function SceneEl({ el }: { el: QmSceneEl }) {
  const common = {
    fill: el.fill ?? "none",
    stroke: el.stroke ?? "var(--kk-border)",
    strokeWidth: el.sw ?? 1.5,
    opacity: el.opacity,
    strokeDasharray: el.dashed ? "4 3" : undefined,
  };
  switch (el.t) {
    case "rect":
      return <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={3} {...common} />;
    case "circle":
      return <circle cx={el.cx} cy={el.cy} r={el.r} {...common} />;
    case "ellipse":
      return <ellipse cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} {...common} />;
    case "line":
      return <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} {...common} />;
    case "polyline":
      return <polyline points={el.points} {...common} />;
    case "polygon":
      return <polygon points={el.points} {...common} />;
    case "path":
      return <path d={el.d} {...common} />;
    case "text":
      return (
        <text x={el.x} y={el.y} fontSize={el.fontSize ?? 9} textAnchor={el.anchor ?? "middle"}
          fill={el.fill ?? "var(--kk-text)"}>{el.text}</text>
      );
  }
}

function SceneView({
  fig, disabled, selected, onPick, correctLabel,
}: {
  fig: QmScene;
  disabled: boolean;
  selected: string | null;
  onPick: (label: string) => void;
  correctLabel: string | null;
}) {
  return (
    <div className="kk-support kk-qm__scene">
      <svg width="100%" style={{ maxWidth: 360 }} viewBox={fig.viewBox} role="img" aria-label="schéma">
        {fig.els.map((el, i) => (
          <SceneEl key={i} el={el} />
        ))}
        {fig.zones.map((z, i) => {
          const isSel = selected === z.label;
          const isCorrect = correctLabel != null && comparerQm("clic", z.label, correctLabel);
          const stroke = isCorrect ? OK : isSel ? "var(--kk-accent)" : "var(--kk-border)";
          const fill = isCorrect ? OK : "var(--kk-accent)";
          const fillOpacity = isCorrect ? 0.35 : isSel ? 0.3 : 0.06;
          return (
            <g key={i} style={disabled ? undefined : { cursor: "pointer" }}
              onClick={disabled ? undefined : () => onPick(z.label)}>
              {z.shape === "circle" ? (
                <circle cx={z.cx} cy={z.cy} r={z.r} fill={fill} fillOpacity={fillOpacity}
                  stroke={stroke} strokeWidth={2} aria-label={z.label} />
              ) : (
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={3} fill={fill} fillOpacity={fillOpacity}
                  stroke={stroke} strokeWidth={2} aria-label={z.label} />
              )}
              {z.tag && (
                <text
                  x={z.shape === "circle" ? z.cx : (z.x ?? 0) + (z.w ?? 0) / 2}
                  y={(z.shape === "circle" ? (z.cy ?? 0) : (z.y ?? 0) + (z.h ?? 0) / 2) + 3}
                  fontSize={8} textAnchor="middle" fill="var(--kk-text)">{z.tag}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function QuestionnerLeMonde({ item, onSoumettre, onContinuer }: Props) {
  const [choix, setChoix] = useState<string | null>(null); // qcm / clic
  const [saisie, setSaisie] = useState(""); // texte
  const [seq, setSeq] = useState<string[]>([]); // ordre : etapes rangees
  const [classe, setClasse] = useState<Record<string, string>>({}); // tri : item -> categorie
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ correct: boolean } | null>(null);
  const [erreurReseau, setErreurReseau] = useState(false);

  const options = item.options ?? [];
  const bins = item.bins ?? [];
  const scene = item.figure && item.figure.kind === "scene" ? item.figure : null;

  // Ordre : les etiquettes melangees (stable par cle), et celles pas encore placees.
  const melange = useMemo(
    () => (item.format === "ordre" ? shuffleStable(options, hash(item.cle)) : options),
    [item.format, item.cle, options],
  );
  const restantes = melange.filter((o) => !seq.includes(o));

  // Reponse courante envoyee au serveur, selon le format.
  const reponse = useMemo(() => {
    if (item.format === "qcm" || item.format === "clic") return choix ?? "";
    if (item.format === "texte") return saisie;
    if (item.format === "ordre") return seq.join(">");
    if (item.format === "tri") return options.map((o) => `${o}=${classe[o] ?? ""}`).join(";");
    return "";
  }, [item.format, choix, saisie, seq, classe, options]);

  const complet = useMemo(() => {
    if (item.format === "ordre") return seq.length === melange.length && melange.length > 0;
    if (item.format === "tri") return options.length > 0 && options.every((o) => classe[o]);
    return reponse.trim().length > 0;
  }, [item.format, seq, melange, options, classe, reponse]);

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

  // Illustration libre de droit (lot 2), associee a la cle de l'item. Purement
  // pedagogique : n'intervient JAMAIS dans le jugement (serveur seul juge).
  const illus = illustrationPourCle(item.cle);

  return (
    <div className="kk-stack kk-geo kk-qm">
      <p className="kk-lead" style={{ textAlign: "center", margin: "0 auto" }}>{item.consigne}</p>

      {illus && (
        <img
          className="kk-qm__illus"
          src={illus.src}
          alt={illus.alt}
          width={72}
          height={72}
          loading="lazy"
          style={{ display: "block", margin: "0 auto", width: 72, height: 72 }}
        />
      )}

      {/* Scene SVG (format clic). */}
      {scene && (
        <SceneView
          fig={scene}
          disabled={Boolean(res)}
          selected={choix}
          onPick={(l) => !res && setChoix(l)}
          correctLabel={res && item.format === "clic" ? item.attendu : null}
        />
      )}

      {/* QCM : gros boutons empiles. */}
      {item.format === "qcm" && (
        <div className="kk-qcm">
          {options.map((o, i) => {
            const choisi = choix === o;
            const bon = res && comparerQm("qcm", o, item.attendu);
            const extra = (choisi && !res) || (res && bon) ? " kk-qcm__opt--active" : "";
            return (
              <button key={i} type="button" className={`kk-btn kk-qcm__opt${extra}`}
                disabled={Boolean(res)} onClick={() => setChoix(o)} aria-pressed={choisi}>
                {o}
              </button>
            );
          })}
        </div>
      )}

      {/* ORDRE : on touche les etapes dans l'ordre ; on peut defaire la derniere. */}
      {item.format === "ordre" && (
        <div className="kk-qm__ordre">
          <ol className="kk-qm__seq" aria-label="étapes rangées">
            {seq.map((o, i) => {
              const bon = res ? comparerQm("ordre", seq.slice(0, i + 1).join(">"),
                item.attendu.split(">").slice(0, i + 1).join(">")) : false;
              return (
                <li key={i} className={`kk-qm__seqitem${res ? (bon ? " kk-qm__seqitem--ok" : " kk-qm__seqitem--ko") : ""}`}>
                  <span className="kk-qm__rank">{i + 1}</span> {o}
                </li>
              );
            })}
            {seq.length === 0 && <li className="kk-qm__seqvide">Touche les étiquettes dans l'ordre.</li>}
          </ol>
          {!res && (
            <>
              <div className="kk-qcm kk-qm__pool">
                {restantes.map((o, i) => (
                  <button key={i} type="button" className="kk-btn kk-qcm__opt"
                    onClick={() => setSeq((s) => [...s, o])}>{o}</button>
                ))}
              </div>
              {seq.length > 0 && (
                <button type="button" className="kk-btn kk-qm__undo" onClick={() => setSeq((s) => s.slice(0, -1))}>
                  <Undo2 size={18} aria-hidden="true" /> Défaire
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* TRI : chaque objet recoit une categorie. */}
      {item.format === "tri" && (
        <div className="kk-qm__tri">
          {options.map((o, i) => (
            <div key={i} className="kk-qm__trirow">
              <span className="kk-qm__triitem">{o}</span>
              <span className="kk-qm__tribins">
                {bins.map((b, j) => {
                  const choisi = classe[o] === b;
                  const bon = res && comparerQm("tri", `${o}=${b}`,
                    item.attendu.split(";").find((p) => p.startsWith(`${o}=`)) ?? "");
                  const extra = (choisi && !res) || (res && bon) ? " kk-qcm__opt--active" : "";
                  return (
                    <button key={j} type="button" className={`kk-btn kk-qm__binbtn${extra}`}
                      disabled={Boolean(res)} aria-pressed={choisi}
                      onClick={() => setClasse((c) => ({ ...c, [o]: b }))}>{b}</button>
                  );
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* TEXTE : saisie libre (N4). */}
      {item.format === "texte" && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <input className="kk-lettres__input" style={{ maxWidth: 260 }} value={saisie}
            disabled={Boolean(res)} onChange={(ev) => setSaisie(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === "Enter") void soumettre(); }}
            aria-label={item.consigne} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
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
            {res.correct ? "Bravo ! C'est la bonne réponse." : "Ce n'est pas tout à fait ça. Regarde la réponse."}
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
