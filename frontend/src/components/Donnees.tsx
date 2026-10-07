// Tableaux et graphiques (maths, CE2, phase 4). Composant AUTONOME, rendu dans
// Session.tsx quand ex.saisie === "donnees". Il dessine une REPRESENTATION
// tactile (tableau simple ou a double entree, diagramme en barres, pictogramme)
// et gere quatre formats de reponse :
//   - qcm    : propositions en gros boutons (la figure sert de contexte) ;
//   - clic   : on touche une ligne du tableau / du pictogramme, ou une barre ;
//   - texte  : saisie LIBRE (N4), l'enfant tape le nombre lu ou calcule ;
//   - grille : on REGLE une barre (on touche la hauteur voulue au-dessus d'une
//              colonne vide du diagramme).
// Toutes les cibles tactiles sont larges. Le SERVEUR (verif_donnees, op 'don')
// reste SEUL JUGE : onSoumettre renvoie le verdict serveur ; `attendu` ne sert
// qu'au feedback (surlignage) et au mode demo. Feedback TOUJOURS valorisant.

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { DonRender, DonTable, DonBars, DonPicto } from "../domain/donnees/donnees";
import { comparerDonnees } from "../domain/donnees/donnees";

interface Props {
  item: DonRender;
  onSoumettre: (cle: string, reponseTexte: string) => Promise<{ correct: boolean } | null>;
  onContinuer: (correct: boolean) => void;
}

const OK = "#16a34a"; // vert de correction

// --------------------------------------------------------------------------
// Tableau simple / a double entree. En mode clic, les lignes sont des boutons
// (on touche une ligne entiere). La case « ? » est mise en evidence (a completer).
// --------------------------------------------------------------------------
function TableView({
  fig, clickable, selected, onPick, correctLabel,
}: {
  fig: DonTable;
  clickable: boolean;
  selected: string | null;
  onPick: (label: string) => void;
  correctLabel: string | null; // ligne a surligner (correction)
}) {
  const double = fig.colHeaders.length > 1;
  return (
    <div className="kk-support kk-don__table-wrap">
      <table className="kk-don__table">
        <thead>
          <tr>
            <th scope="col" aria-hidden={!double}>{double ? "" : ""}</th>
            {fig.colHeaders.map((h, c) => (
              <th key={c} scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fig.rowHeaders.map((rh, r) => {
            const isSel = selected === rh;
            const isCorrect = correctLabel != null && comparerDonnees("clic", rh, correctLabel);
            const cls =
              "kk-don__row" +
              (isCorrect ? " kk-don__row--ok" : isSel ? " kk-don__row--sel" : "");
            return (
              <tr
                key={r}
                className={cls}
                onClick={clickable ? () => onPick(rh) : undefined}
                style={clickable ? { cursor: "pointer" } : undefined}
              >
                <th scope="row">
                  {clickable ? (
                    <button
                      type="button"
                      className="kk-don__rowbtn"
                      aria-pressed={isSel}
                      onClick={(ev) => { ev.stopPropagation(); onPick(rh); }}
                    >
                      {rh}
                    </button>
                  ) : (
                    rh
                  )}
                </th>
                {fig.cells[r].map((v, c) => (
                  <td key={c} className={v === "?" ? "kk-don__blank" : undefined}>
                    {v === "?" ? "?" : v}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --------------------------------------------------------------------------
// Diagramme en barres. Mode "clic" : on touche une barre (sa valeur logique est
// le libelle). Mode "bar" : une colonne vide (`blank`) porte des zones
// cliquables (hauteurs 1..max) ; on touche la hauteur voulue.
// --------------------------------------------------------------------------
const PAD_L = 24;
const PAD_B = 26;
const PAD_T = 10;
const PLOT_H = 120;
const BAR_W = 30;
const GAP = 22;

function BarsView({
  fig, mode, selectedBar, selectedLevel, onPickBar, onSetLevel, correctLabel, showTrue,
}: {
  fig: DonBars;
  mode: "none" | "clic" | "bar";
  selectedBar: string | null;
  selectedLevel: number | null;
  onPickBar: (label: string) => void;
  onSetLevel: (n: number) => void;
  correctLabel: string | null; // barre a surligner (correction clic)
  showTrue: boolean; // correction : dessiner la vraie hauteur de la barre reglee
}) {
  const { cats, max } = fig;
  const unit = PLOT_H / max;
  const baseline = PAD_T + PLOT_H;
  const W = PAD_L + 8 + cats.length * (BAR_W + GAP) + 8;
  const H = PAD_T + PLOT_H + PAD_B;
  const xOf = (i: number) => PAD_L + 8 + i * (BAR_W + GAP);
  const yOf = (v: number) => baseline - v * unit;

  // Graduations horizontales + etiquettes (0..max).
  const grid: React.ReactNode[] = [];
  for (let k = 0; k <= max; k++) {
    const y = yOf(k);
    grid.push(
      <line key={`g${k}`} x1={PAD_L} y1={y} x2={W - 6} y2={y} stroke="var(--kk-border)" strokeWidth={0.8} />
    );
    grid.push(
      <text key={`gl${k}`} x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize={8} fill="var(--kk-text)">{k}</text>
    );
  }

  const barsEls: React.ReactNode[] = [];
  const zonesEls: React.ReactNode[] = [];
  cats.forEach((cat, i) => {
    const x = xOf(i);
    const isBlank = fig.blank != null && cat.label === fig.blank;
    const isSel = selectedBar === cat.label;
    const isCorrect = correctLabel != null && comparerDonnees("clic", cat.label, correctLabel);
    const clickableBar = mode === "clic";

    // Hauteur dessinee : barre vide a regler -> hauteur choisie (ou vraie en
    // correction) ; sinon la valeur de la categorie.
    let drawV = cat.value;
    if (isBlank && mode === "bar") drawV = showTrue ? cat.value : selectedLevel ?? 0;

    if (drawV > 0) {
      barsEls.push(
        <rect
          key={`b${i}`}
          x={x} y={yOf(drawV)} width={BAR_W} height={drawV * unit}
          fill={isCorrect || (isBlank && showTrue) ? OK : "var(--kk-accent)"}
          fillOpacity={isSel && !isCorrect ? 1 : 0.85}
          stroke={isSel ? "var(--kk-accent)" : "var(--kk-border)"} strokeWidth={isSel ? 2 : 1}
          style={clickableBar ? { cursor: "pointer" } : undefined}
          onClick={clickableBar ? () => onPickBar(cat.label) : undefined}
          aria-label={`barre ${cat.label}`}
        />
      );
    }
    // Contour cliquable de la barre entiere (meme quand sa valeur est petite).
    if (clickableBar) {
      barsEls.push(
        <rect
          key={`z${i}`} x={x} y={PAD_T} width={BAR_W} height={PLOT_H}
          fill="transparent" style={{ cursor: "pointer" }}
          onClick={() => onPickBar(cat.label)} aria-label={`choisir ${cat.label}`}
        />
      );
    }
    // Zones cliquables de reglage (hauteurs 1..max) sur la colonne vide.
    if (isBlank && mode === "bar") {
      for (let k = 1; k <= max; k++) {
        zonesEls.push(
          <rect
            key={`sv${k}`} x={x} y={yOf(k)} width={BAR_W} height={unit}
            fill="transparent" stroke="var(--kk-border)" strokeWidth={0.4}
            style={{ cursor: "pointer" }}
            onClick={() => onSetLevel(k)} aria-label={`hauteur ${k}`}
          />
        );
      }
    }

    // Etiquette de la categorie sous l'axe.
    barsEls.push(
      <text key={`l${i}`} x={x + BAR_W / 2} y={baseline + 11} textAnchor="middle" fontSize={8} fill="var(--kk-text)">{cat.label}</text>
    );
  });

  return (
    <div className="kk-support kk-don__chart">
      <svg width="100%" style={{ maxWidth: 360 }} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="diagramme en barres">
        {grid}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={baseline} stroke="var(--kk-text)" strokeWidth={1.2} />
        <line x1={PAD_L} y1={baseline} x2={W - 6} y2={baseline} stroke="var(--kk-text)" strokeWidth={1.2} />
        {barsEls}
        {zonesEls}
      </svg>
    </div>
  );
}

// --------------------------------------------------------------------------
// Pictogramme : chaque ligne montre `count` images ; une image vaut `each`
// objets. Mode clic : chaque ligne est un bouton.
// --------------------------------------------------------------------------
function PictoView({
  fig, clickable, selected, onPick, correctLabel,
}: {
  fig: DonPicto;
  clickable: boolean;
  selected: string | null;
  onPick: (label: string) => void;
  correctLabel: string | null;
}) {
  return (
    <div className="kk-support kk-don__picto">
      <div className="kk-don__picto-inner">
        <p className="kk-don__picto-legend">Une image vaut {fig.each} {fig.each > 1 ? "objets" : "objet"}.</p>
        {fig.cats.map((cat, i) => {
          const isSel = selected === cat.label;
          const isCorrect = correctLabel != null && comparerDonnees("clic", cat.label, correctLabel);
          const cls =
            "kk-don__picto-row" +
            (isCorrect ? " kk-don__picto-row--ok" : isSel ? " kk-don__picto-row--sel" : "");
          const row = (
            <>
              <span className="kk-don__picto-label">{cat.label}</span>
              <span className="kk-don__picto-imgs" aria-label={`${cat.count} images`}>
                {Array.from({ length: cat.count }).map((_, k) => (
                  <svg key={k} width={22} height={22} viewBox="0 0 22 22" aria-hidden="true">
                    <circle cx={11} cy={11} r={8} fill="var(--kk-accent)" stroke="var(--kk-text)" strokeWidth={1} />
                  </svg>
                ))}
              </span>
            </>
          );
          return clickable ? (
            <button key={i} type="button" className={cls} aria-pressed={isSel} onClick={() => onPick(cat.label)}>
              {row}
            </button>
          ) : (
            <div key={i} className={cls}>{row}</div>
          );
        })}
      </div>
    </div>
  );
}

export default function Donnees({ item, onSoumettre, onContinuer }: Props) {
  const [choix, setChoix] = useState<string | null>(null); // qcm / clic
  const [niveauBarre, setNiveauBarre] = useState<number | null>(null); // grille: hauteur reglee
  const [saisie, setSaisie] = useState(""); // texte
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ correct: boolean } | null>(null);
  const [erreurReseau, setErreurReseau] = useState(false);

  const fig = item.figure;
  const isBar = item.format === "grille" && item.interact === "bar" && fig.kind === "bars";
  const clicTable = item.format === "clic" && fig.kind === "table";
  const clicBars = item.format === "clic" && fig.kind === "bars";
  const clicPicto = item.format === "clic" && fig.kind === "picto";

  // Reponse courante envoyee au serveur, selon le format.
  const reponse = useMemo(() => {
    if (item.format === "qcm") return choix ?? "";
    if (item.format === "texte") return saisie;
    if (isBar) return niveauBarre != null ? String(niveauBarre) : "";
    return choix ?? ""; // clic
  }, [item.format, isBar, choix, saisie, niveauBarre]);

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
    <div className="kk-stack kk-geo kk-don">
      <p className="kk-lead" style={{ textAlign: "center", margin: "0 auto" }}>{item.consigne}</p>

      {/* Representation */}
      {fig.kind === "table" && (
        <TableView
          fig={fig}
          clickable={clicTable && !res}
          selected={choix}
          onPick={(l) => !res && setChoix(l)}
          correctLabel={res && clicTable ? item.attendu : null}
        />
      )}
      {fig.kind === "bars" && (
        <BarsView
          fig={fig}
          mode={res ? "none" : clicBars ? "clic" : isBar ? "bar" : "none"}
          selectedBar={choix}
          selectedLevel={niveauBarre}
          onPickBar={(l) => !res && setChoix(l)}
          onSetLevel={(n) => !res && setNiveauBarre(n)}
          correctLabel={res && clicBars ? item.attendu : null}
          showTrue={Boolean(res) && isBar}
        />
      )}
      {fig.kind === "picto" && (
        <PictoView
          fig={fig}
          clickable={clicPicto && !res}
          selected={choix}
          onPick={(l) => !res && setChoix(l)}
          correctLabel={res && clicPicto ? item.attendu : null}
        />
      )}

      {/* QCM : gros boutons empiles. */}
      {item.format === "qcm" && item.options && (
        <div className="kk-qcm">
          {item.options.map((o, i) => {
            const choisi = choix === o;
            const bon = res && comparerDonnees("qcm", o, item.attendu);
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

      {/* TEXTE : saisie libre (N4). */}
      {item.format === "texte" && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <input
            className="kk-lettres__input"
            style={{ maxWidth: 240 }}
            value={saisie}
            disabled={Boolean(res)}
            onChange={(ev) => setSaisie(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === "Enter") void soumettre(); }}
            aria-label={item.consigne}
            inputMode="numeric"
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
