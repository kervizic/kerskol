import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Delete, Grid3x3, Info, Keyboard, RotateCcw } from "lucide-react";
import { Spinner } from "../components/ui";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  getStoredInputMode,
  initialInputMode,
  onAnswerZoneTouch,
  onPhysicalKey,
  prefersCoarsePointer,
  setStoredInputMode,
  toggleInputMode,
  type InputMode,
} from "../lib/inputMode";
import { AvatarView } from "../domain/avatars";
import { universDef } from "../domain/univers";
import type { Profil } from "../lib/types";
import type { Referentiel } from "../lib/api";
import {
  createSeance,
  finishSeance,
  getExercicesCalcul,
  getMonnaie,
  getProgressionDetail,
  getTempsAujourdhuiS,
  insertReponse,
  plafondCode,
  type ReponseInsert,
} from "../lib/api";
import { enqueueReponse, flushReponses } from "../lib/reponseQueue";
import { composeSession } from "../domain/calcul/composer";
import type {
  SupportData,
  DroiteData,
  PoseData,
  ChiffresData,
  QcmOption,
  MoneyData,
  HorlogeData,
  RegleData,
  BalanceData,
  FractionData,
  BarModel,
} from "../domain/calcul/generator";
import {
  answerCurrent,
  createEngine,
  currentSlot,
  hintForCurrent,
  isFinished,
  progress,
  shouldAskSure,
  summary,
  type EngineState,
} from "../domain/calcul/engine";
import { wrapHour, wrapMinute, startHour, START_MINUTE } from "../domain/calcul/horloge";
import { moneyAsset } from "../domain/calcul/moneyAssets";
import { diagnostiquer, type Diagnostic, type Faute } from "../domain/diagnostic";

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// --- Persistance de la seance (reprise apres rechargement) ----------------
interface Snapshot {
  seanceId: string;
  startedAt: number;
  engine: EngineState;
  placement: Record<string, boolean>;
}
function snapKey(profilId: string): string {
  return `kerskol_seance_${profilId}`;
}
function loadSnapshot(profilId: string): Snapshot | null {
  try {
    const raw = window.sessionStorage.getItem(snapKey(profilId));
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}
function saveSnapshot(profilId: string, s: Snapshot): void {
  try {
    window.sessionStorage.setItem(snapKey(profilId), JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
function clearSnapshot(profilId: string): void {
  try {
    window.sessionStorage.removeItem(snapKey(profilId));
  } catch {
    /* ignore */
  }
}

// --- Support visuel (niveau 1) --------------------------------------------
function SupportView({ data }: { data: SupportData }) {
  if (data.kind === "rectangle") {
    const rows = Math.min(data.rows, 10);
    const cols = Math.min(data.cols, 10);
    const r = 9;
    const gap = 26;
    const w = cols * gap + 12;
    const h = rows * gap + 12;
    const dots = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        dots.push(<circle key={`${x}-${y}`} cx={12 + x * gap} cy={12 + y * gap} r={r} fill="var(--kk-accent)" />);
    return (
      <div className="kk-support">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${rows} rangees de ${cols}`}>
          {dots}
        </svg>
      </div>
    );
  }
  // Droite graduee : depart + bond(s) etiquetes. Le point d'arrivee (la reponse)
  // n'est JAMAIS etiquete.
  const from = data.from;
  const to = data.to;
  const span = Math.max(1, to - from);
  const W = 520;
  const H = 92;
  const pad = 24;
  const axisY = 62;
  const x = (v: number) => pad + ((v - from) / span) * (W - 2 * pad);

  // Graduations regulieres lisibles : vise ~10-16 intervalles avec un pas rond.
  const rawStep = span / 12;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1, rawStep))));
  const niceStep = [1, 2, 5, 10].map((m) => m * pow).find((s) => span / s <= 16) ?? pow * 10;
  const ticks: number[] = [];
  for (let v = from; v <= to + 1e-6; v += niceStep) ticks.push(Math.round(v));

  return (
    <div className="kk-support">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="droite graduee">
        <line x1={pad} y1={axisY} x2={W - pad} y2={axisY} stroke="var(--kk-border)" strokeWidth={3} />
        {ticks.map((v, i) => (
          <line key={`t${i}`} x1={x(v)} y1={axisY - 6} x2={x(v)} y2={axisY + 6} stroke="var(--kk-border)" strokeWidth={2} />
        ))}
        {data.jumps.map((j, i) => {
          const x1 = x(j.from);
          const x2 = x(j.to);
          const mx = (x1 + x2) / 2;
          return (
            <g key={`j${i}`}>
              <path
                d={`M ${x1} ${axisY - 6} Q ${mx} ${axisY - 34} ${x2} ${axisY - 6}`}
                fill="none"
                stroke="var(--kk-accent)"
                strokeWidth={3}
                markerEnd="url(#kk-arrow)"
              />
              {j.label && (
                <text x={mx} y={axisY - 36} textAnchor="middle" fontSize="17" fontWeight={700} fill="var(--kk-accent)">
                  {j.label}
                </text>
              )}
            </g>
          );
        })}
        {data.points.map((p, i) => (
          <g key={`p${i}`}>
            <circle cx={x(p.v)} cy={axisY} r={7} fill="var(--kk-accent)" />
            <text x={x(p.v)} y={axisY + 24} textAnchor="middle" fontSize="17" fontWeight={700} fill="var(--kk-text)">
              {p.label}
            </text>
          </g>
        ))}
        <defs>
          <marker id="kk-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--kk-accent)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

// --- Droite graduee : la fleche pointe la valeur a lire (jamais etiquetee) ---
function DroiteView({ data }: { data: DroiteData }) {
  const { from, to, step, at } = data;
  const W = 520;
  const H = 96;
  const pad = 28;
  const axisY = 62;
  const span = Math.max(1, to - from);
  const x = (v: number) => pad + ((v - from) / span) * (W - 2 * pad);
  const ticks: number[] = [];
  for (let v = from; v <= to + 1e-6; v += step) ticks.push(Math.round(v));
  return (
    <div className="kk-support">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="droite graduee">
        <line x1={pad} y1={axisY} x2={W - pad} y2={axisY} stroke="var(--kk-border)" strokeWidth={3} />
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={x(v)} y1={axisY - 6} x2={x(v)} y2={axisY + 6} stroke="var(--kk-border)" strokeWidth={2} />
            {(v === from || v === to) && (
              <text x={x(v)} y={axisY + 24} textAnchor="middle" fontSize="16" fontWeight={700} fill="var(--kk-text)">
                {v}
              </text>
            )}
          </g>
        ))}
        <path
          d={`M ${x(at)} ${axisY - 30} L ${x(at)} ${axisY - 6}`}
          stroke="var(--kk-accent)"
          strokeWidth={3}
          markerEnd="url(#kk-arrow-d)"
        />
        <defs>
          <marker id="kk-arrow-d" markerWidth="10" markerHeight="10" refX="4" refY="6" orient="auto">
            <path d="M0,0 L8,0 L4,7 Z" fill="var(--kk-accent)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

// --- Comparaison : deux nombres encadrant le signe choisi (<, =, >) ---
function CompareChoice({
  left,
  right,
  chosen,
  onPick,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  chosen: number | null;
  onPick: (v: number) => void;
}) {
  const signs = [
    { v: 0, s: "<" },
    { v: 1, s: "=" },
    { v: 2, s: ">" },
  ];
  return (
    <div className="kk-compare">
      <span className="kk-compare__num">{left}</span>
      <div className="kk-compare__signs">
        {signs.map((o) => (
          <button
            key={o.v}
            type="button"
            className={`kk-btn kk-compare__sign${chosen === o.v ? " kk-compare__sign--active" : ""}`}
            onClick={() => onPick(o.v)}
            aria-label={o.s}
          >
            {o.s}
          </button>
        ))}
      </div>
      <span className="kk-compare__num">{right}</span>
    </div>
  );
}

// --- QCM : la VALEUR de l'option choisie sera envoyee au serveur (pas d'index) ---
function QcmChoice({
  options,
  chosen,
  onPick,
}: {
  options: QcmOption[];
  chosen: number | null;
  onPick: (v: number) => void;
}) {
  return (
    <div className="kk-qcm">
      {options.map((o, i) => (
        <button
          key={i}
          type="button"
          className={`kk-btn kk-qcm__opt${chosen === o.value ? " kk-qcm__opt--active" : ""}`}
          onClick={() => onPick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// --- Decomposition : une case de chiffre par rang (m, c, d, u) ---
function ChiffresView({
  data,
  digits,
  activeCell,
  onFocusCell,
}: {
  data: ChiffresData;
  digits: string[];
  activeCell: number;
  onFocusCell: (i: number) => void;
}) {
  return (
    <div className="kk-cells">
      {data.ranks.map((r, i) => (
        <div key={r.key} className="kk-cells__item">
          <button
            type="button"
            className={`kk-answer__box${i === activeCell ? " kk-answer__box--active" : ""}`}
            onClick={() => onFocusCell(i)}
            aria-label={r.label}
          >
            {digits[i] || "?"}
          </button>
          <span className="kk-answer__label">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

// --- Calcul pose : operation en colonnes alignees, resultat chiffre a chiffre
// (de droite a gauche), avec cases de retenue optionnelles (aide, non notees). ---
function PoseView({
  data,
  digits,
  activeCell,
  onFocusCell,
}: {
  data: PoseData;
  digits: string[];
  activeCell: number;
  onFocusCell: (i: number) => void;
}) {
  const { op, terms, width, answerDigits } = data;
  const cols = Array.from({ length: width }, (_, c) => c); // 0 = gauche
  const resultStart = width - answerDigits;
  // Retenues : pur brouillon local, jamais envoye au serveur. Un clic incremente
  // (vide -> 1 -> 2 ... -> 9 -> vide).
  const [carries, setCarries] = useState<string[]>(() => Array(width).fill(""));
  const cycle = (i: number) =>
    setCarries((cs) => {
      const n = cs.slice();
      const cur = n[i] === "" ? 1 : Number(n[i]) + 1;
      n[i] = cur > 9 ? "" : String(cur);
      return n;
    });
  const digitAt = (t: number, c: number): string => {
    const s = String(t);
    return c >= width - s.length ? s[c - (width - s.length)] : "";
  };
  return (
    <div className="kk-pose" role="group" aria-label="operation posee">
      <div className="kk-pose__carries">
        {cols.map((c) => (
          <button key={c} type="button" className="kk-pose__carry" onClick={() => cycle(c)} aria-label="retenue (aide)">
            {carries[c]}
          </button>
        ))}
      </div>
      {terms.map((t, ti) => (
        <div className="kk-pose__row" key={ti}>
          <span className="kk-pose__op">{ti === terms.length - 1 ? op : ""}</span>
          {cols.map((c) => (
            <span key={c} className="kk-pose__d">
              {digitAt(t, c)}
            </span>
          ))}
        </div>
      ))}
      <div className="kk-pose__bar" />
      <div className="kk-pose__row">
        <span className="kk-pose__op"> </span>
        {cols.map((c) => {
          const ri = c - resultStart;
          if (ri < 0) return <span key={c} className="kk-pose__d" />;
          return (
            <button
              key={c}
              type="button"
              className={`kk-answer__box kk-pose__cell${ri === activeCell ? " kk-answer__box--active" : ""}`}
              onClick={() => onFocusCell(ri)}
              aria-label={`chiffre ${answerDigits - ri}`}
            >
              {digits[ri] || "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Rend l'operation avec la (les) case(s) de reponse A LEUR PLACE dans l'egalite
// (« 2 + 5 = [ ] », « 7 × [ ] = 56 », « 38 ÷ 5 = [ ] reste [ ] »). Les enonces
// sans jeton (questions) restent en texte simple, la case est affichee a part.
function EquationView({
  prompt,
  f1,
  f2,
  active,
  inputMode,
  onPick,
}: {
  prompt: string;
  f1: string;
  f2: string;
  active: 1 | 2;
  inputMode: InputMode;
  onPick: (n: 1 | 2) => void;
}) {
  if (!prompt.includes("[q]") && !prompt.includes("[r]")) {
    return (
      <div className="kk-enonce" aria-live="polite">
        {prompt}
      </div>
    );
  }
  const parts = prompt.split(/(\[q\]|\[r\])/).filter((p) => p !== "");
  return (
    <div className="kk-enonce kk-eq" aria-live="polite">
      {parts.map((p, i) => {
        if (p === "[q]" || p === "[r]") {
          const slot: 1 | 2 = p === "[r]" ? 2 : 1;
          const val = slot === 2 ? f2 : f1;
          const isActive = active === slot;
          return (
            <button
              key={i}
              type="button"
              className={`kk-answer__box kk-eq__box${isActive ? " kk-answer__box--active" : ""}${
                isActive && inputMode === "keyboard" ? " kk-answer__box--caret" : ""
              }`}
              aria-label={slot === 2 ? "reste" : "reponse"}
              onClick={() => onPick(slot)}
            >
              {val || "?"}
            </button>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}

// --- Somme d'argent (centimes -> « 12 € » ou « 12 € 50 ») ---
function euroFmt(cents: number): string {
  const e = Math.floor(cents / 100);
  const c = cents % 100;
  const es = String(e).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return c === 0 ? `${es} €` : `${es} € ${String(c).padStart(2, "0")}`;
}

// --- Schema en barres (modele tout/parties ou comparaison). Aide optionnelle
// (reveal=false : l'inconnue reste « ? ») et correction (reveal=true). ---
function BarModelView({ model, reveal }: { model: BarModel; reveal: boolean }) {
  const W = 480;
  const barH = 34;
  const gap = 10;
  const pad = 6;
  const label = (c: { label: string; value: number; unknown: boolean }) =>
    c.unknown && !reveal ? "?" : c.unknown ? String(c.value) : c.label;

  if (model.variant === "comparaison") {
    const grand = model.parts[0];
    const petit = model.parts[1];
    const diff = model.diff!;
    const unit = (W - pad) / Math.max(1, grand.units);
    const gw = Math.max(40, grand.units * unit);
    const pw = Math.max(30, petit.units * unit);
    const dw = Math.max(24, diff.units * unit);
    const seg = (x: number, w: number, c: typeof grand, fill: string) => (
      <g>
        <rect x={x} y={0} width={w} height={barH} rx={6} fill={fill} stroke="var(--kk-border)" />
        <text x={x + w / 2} y={barH / 2 + 5} textAnchor="middle" fontSize="15" fontWeight={700} fill="var(--kk-on-accent)">
          {label(c)}
        </text>
      </g>
    );
    const H = barH * 2 + gap + 22;
    return (
      <div className="kk-support kk-barres">
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="schema en barres (comparaison)">
          <g transform={`translate(${pad},0)`}>{seg(0, gw, grand, "var(--kk-accent)")}</g>
          <g transform={`translate(${pad},${barH + gap})`}>
            {seg(0, pw, petit, "var(--kk-accent)")}
            <g transform={`translate(${pw},0)`}>
              <rect x={0} y={0} width={dw} height={barH} rx={6} fill="transparent" stroke="var(--kk-accent)" strokeDasharray="4 3" />
              <text x={dw / 2} y={barH / 2 + 5} textAnchor="middle" fontSize="15" fontWeight={700} fill="var(--kk-accent)">
                {label(diff)}
              </text>
            </g>
          </g>
        </svg>
      </div>
    );
  }

  // tout_parties : barre du tout (haut) + parties (bas), memes largeurs.
  const whole = model.whole!;
  const partsTotal = model.parts.reduce((s, p) => s + p.units, 0) || 1;
  const unit = (W - pad) / Math.max(whole.units, partsTotal);
  const ww = Math.max(60, whole.units * unit);
  const H = barH * 2 + gap + 8;
  let x = 0;
  return (
    <div className="kk-support kk-barres">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="schema en barres (tout et parties)">
        <g transform={`translate(${pad},0)`}>
          <rect x={0} y={0} width={ww} height={barH} rx={6} fill="var(--kk-accent)" stroke="var(--kk-border)" />
          <text x={ww / 2} y={barH / 2 + 5} textAnchor="middle" fontSize="15" fontWeight={700} fill="var(--kk-on-accent)">
            {label(whole)}
          </text>
        </g>
        <g transform={`translate(${pad},${barH + gap})`}>
          {model.parts.map((pt, i) => {
            const w = Math.max(28, pt.units * unit);
            const el = (
              <g key={i} transform={`translate(${x},0)`}>
                <rect x={0} y={0} width={w} height={barH} rx={6} fill="var(--kk-accent-soft, var(--kk-border))" stroke="var(--kk-accent)" />
                <text x={w / 2} y={barH / 2 + 5} textAnchor="middle" fontSize="15" fontWeight={700} fill="var(--kk-text)">
                  {label(pt)}
                </text>
              </g>
            );
            x += w + 2;
            return el;
          })}
        </g>
      </svg>
    </div>
  );
}

// --- Monnaie : composer une somme en touchant billets et pieces. Seul le total
// (centimes) est envoye au serveur. Clavier accessible (boutons natifs). ---
function MoneyCompose({
  data,
  onTotal,
}: {
  data: MoneyData;
  onTotal: (cents: number) => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const total = picked.reduce((s, u) => s + u, 0);
  const apply = (next: number[]) => {
    setPicked(next);
    onTotal(next.reduce((s, u) => s + u, 0));
  };
  return (
    <div className="kk-money-compose">
      <div className="kk-money-total" aria-live="polite">
        Total : <strong>{euroFmt(total)}</strong>
      </div>
      <div className="kk-money-units">
        {data.units.map((u, i) => {
          const asset = moneyAsset(u);
          const isBill = asset ? asset.bill : u >= 500;
          return (
            <button
              key={i}
              type="button"
              className={`kk-money-unit${isBill ? " kk-money-unit--bill" : " kk-money-unit--coin"}`}
              onClick={() => apply([...picked, u])}
              aria-label={`Ajouter ${euroFmt(u)}`}
            >
              {asset ? (
                <img
                  className="kk-money-unit__img"
                  src={asset.src}
                  alt={asset.alt}
                  width={asset.width}
                  style={{ width: asset.width }}
                  draggable={false}
                />
              ) : null}
              <span className="kk-money-unit__label" aria-hidden="true">{euroFmt(u)}</span>
            </button>
          );
        })}
      </div>
      <div className="kk-row" style={{ justifyContent: "center" }}>
        <button type="button" className="kk-btn" disabled={picked.length === 0} onClick={() => apply(picked.slice(0, -1))}>
          Retirer
        </button>
        <button type="button" className="kk-btn" disabled={picked.length === 0} onClick={() => apply([])}>
          Tout effacer
        </button>
      </div>
    </div>
  );
}

// --- Horloge a aiguilles (SVG original). Pour la LECTURE, les aiguilles sont la
// question (pas une aide). Accessible (aria-label), lisible en mode sombre. ---
function HorlogeView({ data }: { data: HorlogeData }) {
  const { showHours, showMinutes } = data;
  const C = 110;
  const R = 94;
  const hourAngle = ((showHours % 12) + showMinutes / 60) * 30; // deg depuis 12 h
  const minAngle = showMinutes * 6;
  const hand = (angleDeg: number, len: number) => {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return { x: C + len * Math.cos(a), y: C + len * Math.sin(a) };
  };
  const hh = hand(hourAngle, 50);
  const mm = hand(minAngle, 76);
  const nums = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const label = `horloge indiquant ${showHours} heure${showHours > 1 ? "s" : ""}${
    showMinutes > 0 ? ` ${showMinutes}` : ""
  }`;
  return (
    <div className="kk-support kk-horloge">
      <svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label={label}>
        <circle cx={C} cy={C} r={R} fill="var(--kk-surface, #fff)" stroke="var(--kk-border)" strokeWidth={4} />
        {Array.from({ length: 60 }, (_, i) => {
          const a = ((i * 6 - 90) * Math.PI) / 180;
          const big = i % 5 === 0;
          const r1 = big ? R - 12 : R - 6;
          return (
            <line
              key={i}
              x1={C + r1 * Math.cos(a)}
              y1={C + r1 * Math.sin(a)}
              x2={C + R * Math.cos(a)}
              y2={C + R * Math.sin(a)}
              stroke="var(--kk-border)"
              strokeWidth={big ? 2.5 : 1}
            />
          );
        })}
        {nums.map((n, i) => {
          const a = ((i * 30 - 90) * Math.PI) / 180;
          const r = R - 26;
          return (
            <text
              key={n}
              x={C + r * Math.cos(a)}
              y={C + r * Math.sin(a) + 6}
              textAnchor="middle"
              fontSize="18"
              fontWeight={700}
              fill="var(--kk-text)"
            >
              {n}
            </text>
          );
        })}
        {/* Aiguille des heures (courte, epaisse) puis des minutes (longue). */}
        <line x1={C} y1={C} x2={hh.x} y2={hh.y} stroke="var(--kk-text)" strokeWidth={6} strokeLinecap="round" />
        <line x1={C} y1={C} x2={mm.x} y2={mm.y} stroke="var(--kk-accent)" strokeWidth={4} strokeLinecap="round" />
        <circle cx={C} cy={C} r={6} fill="var(--kk-accent)" />
      </svg>
      {data.digital && (
        <div className="kk-horloge__digital" aria-hidden="true">
          {showHours} h {String(showMinutes).padStart(2, "0")}
        </div>
      )}
    </div>
  );
}

// --- Pave numerique autonome (saisies libres heure / fraction au niveau 4).
// Reutilise le style .kk-pad et ecoute aussi le clavier physique (chiffres +
// effacement) ; Entree reste gere globalement (validation). ---
function useDigitKeyboard(onDigit: (d: string) => void, onDelete: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key >= "0" && e.key <= "9") onDigit(e.key);
      else if (e.key === "Backspace") onDelete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDigit, onDelete]);
}

function MiniKeypad({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) {
  return (
    <div className="kk-pad kk-pad--mini">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button type="button" key={d} onClick={() => onDigit(d)} aria-label={d}>{d}</button>
      ))}
      <span aria-hidden="true" />
      <button type="button" onClick={() => onDigit("0")} aria-label="0">0</button>
      <button type="button" onClick={onDelete} aria-label="Effacer"><Delete size={26} aria-hidden="true" /></button>
    </div>
  );
}

// Saisie LIBRE d'une fraction (niveau >= 2 de MA.FRAC.SIMPLES, type « nommer ») :
// deux cases (numerateur au-dessus, denominateur en dessous) separees par une
// barre. La valeur envoyee est le CODE num*100+den (identique au QCM). Tant que
// les deux cases ne sont pas valides (num >= 1, den >= 2) on signale -1.
function FractionInput({ onCode }: { onCode: (code: number) => void }) {
  const [numStr, setNumStr] = useState("");
  const [denStr, setDenStr] = useState("");
  const [active, setActive] = useState<"num" | "den">("num");

  useEffect(() => {
    const n = Number(numStr);
    const d = Number(denStr);
    if (numStr === "" || denStr === "" || n < 1 || d < 2) onCode(-1);
    else onCode(n * 100 + d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numStr, denStr]);

  const setter = active === "num" ? setNumStr : setDenStr;
  const onDigit = useCallback((digit: string) => {
    setter((cur) => {
      const next = (cur === "0" ? "" : cur) + digit;
      return next.length > 2 || Number(next) > 99 ? cur : next;
    });
  }, [setter]);
  const onDelete = useCallback(() => setter((c) => c.slice(0, -1)), [setter]);

  useDigitKeyboard(onDigit, onDelete);

  return (
    <div className="kk-fracinput" role="group" aria-label="ecrire la fraction">
      <div className="kk-fracinput__stack">
        <button
          type="button"
          className={`kk-answer__box${active === "num" ? " kk-answer__box--active" : ""}`}
          aria-label={`numerateur : ${numStr || "a completer"}`}
          onClick={() => setActive("num")}
        >
          {numStr || "?"}
        </button>
        <div className="kk-fracinput__bar" aria-hidden="true" />
        <button
          type="button"
          className={`kk-answer__box${active === "den" ? " kk-answer__box--active" : ""}`}
          aria-label={`denominateur : ${denStr || "a completer"}`}
          onClick={() => setActive("den")}
        >
          {denStr || "?"}
        </button>
      </div>
      <MiniKeypad onDigit={onDigit} onDelete={onDelete} />
    </div>
  );
}

// --- Saisie LIBRE d'un nombre en toutes lettres (MA.NUM.LIRE_ECRIRE N4).
// Gros champ texte : le clavier de l'appareil s'ouvre sur tablette, le clavier
// physique fonctionne sur ordinateur. Correcteur automatique DESACTIVE
// (autocomplete / autocorrect / autocapitalize / spellcheck off) pour ne pas
// souffler l'orthographe. La saisie TEXTE remonte telle quelle ; le serveur et
// le diagnostic la verifient. ---
function LettresInput({ onText }: { onText: (t: string) => void }) {
  const [t, setT] = useState("");
  useEffect(() => {
    onText(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);
  return (
    <div className="kk-lettres" role="group" aria-label="écrire le nombre en toutes lettres">
      <input
        type="text"
        inputMode="text"
        className="kk-lettres__input"
        value={t}
        onChange={(e) => setT(e.target.value)}
        placeholder="écris le nombre en lettres…"
        aria-label="nombre en toutes lettres"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
      />
    </div>
  );
}

// Correction d'une ecriture en lettres : la bonne ecriture (partie fautive
// SURLIGNEE) puis l'explication courte de chaque faute (au plus 2).
function LettresCorrection({ diag }: { diag: Diagnostic }) {
  const fragments = diag.fautes.flatMap((f) => f.surligne);
  return (
    <div className="kk-lettres-corr kk-stack">
      <p className="kk-lettres-corr__bonne" style={{ margin: 0 }}>
        On écrit « {surlignerFragments(diag.bonneEcriture, fragments)} ».
      </p>
      {diag.fautes.map((f: Faute, i) => (
        <p key={i} className="kk-lettres-corr__msg" style={{ margin: 0 }}>{f.message}</p>
      ))}
    </div>
  );
}

// Met en evidence les fragments donnes dans un texte (insensible aux
// separateurs : un fragment « quatre-vingts » surligne aussi « quatre vingts »).
function surlignerFragments(texte: string, fragments: string[]): React.ReactNode {
  if (fragments.length === 0) return texte;
  // Echappe et autorise espace/trait d'union interchangeables dans les fragments.
  const parts = fragments
    .filter(Boolean)
    .map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s-]+/g, "[\\s-]+"));
  if (parts.length === 0) return texte;
  // split avec groupe capturant : les fragments correspondants sont aux index
  // IMPAIRS du tableau resultant.
  const chunks = texte.split(new RegExp(`(${parts.join("|")})`, "i"));
  return chunks.map((c, i) =>
    i % 2 === 1 ? <mark key={i} className="kk-mark">{c}</mark> : <span key={i}>{c}</span>
  );
}

// --- Saisie d'une heure : deux blocs (HEURES / MINUTES) avec boutons tactiles
// et tour du cadran (logique pure testee dans ./horloge). L'horloge a aiguilles
// se met a jour en direct. La saisie est NORMALISEE en minutes (h x 60 + m) et
// envoyee au serveur (verif val/add) : contrat de valeur inchange. Les boutons
// (steppers) comptent comme reponse libre A TOUS LES NIVEAUX. ---
function HorlogeInput({ data, onValue }: { data: HorlogeData; onValue: (mins: number) => void }) {
  return <HorlogeStepperInput data={data} onValue={onValue} />;
}

function HorlogeStepperInput({
  data,
  onValue,
}: {
  data: HorlogeData;
  onValue: (mins: number) => void;
}) {
  const hoursMax = data.hoursMax || 12;
  const [h, setH] = useState(() => startHour(hoursMax));
  const [m, setM] = useState(START_MINUTE);
  const apply = (nh: number, nm: number) => {
    setH(nh);
    setM(nm);
    onValue(nh * 60 + nm);
  };
  useEffect(() => {
    onValue(h * 60 + m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const addH = (d: number) => apply(wrapHour(h + d, hoursMax), m);
  const addM = (d: number) => apply(h, wrapMinute(m + d));
  const resetH = () => apply(startHour(hoursMax), m);
  const resetM = () => apply(h, START_MINUTE);

  // Clavier (pratique, non affiche) : fleche haut = +1 sur le bloc focalise,
  // fleche bas = -1 ; Tab change de bloc ; Entree est gere globalement.
  const hourKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") { e.preventDefault(); addH(1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); addH(-1); }
  };
  const minuteKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") { e.preventDefault(); addM(1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); addM(-1); }
  };

  const liveData: HorlogeData = { showHours: h, showMinutes: m, minuteStep: data.minuteStep, hoursMax, digital: false };

  return (
    <div className="kk-heure" role="group" aria-label="choisir l'heure">
      <HorlogeView data={liveData} />
      <div className="kk-heure__read" aria-live="polite">
        {h}<span className="kk-heure__unit"> h </span>{String(m).padStart(2, "0")}
      </div>
      <div className="kk-heure__blocks">
        <div
          className="kk-heure__block"
          role="group"
          aria-label={`heures : ${h}`}
          tabIndex={0}
          onKeyDown={hourKey}
        >
          <div className="kk-heure__title">Heures</div>
          <div className="kk-heure__big">{h}</div>
          <div className="kk-heure__btns">
            <button type="button" className="kk-btn kk-btn--accent kk-heure__btn" aria-label="Ajouter 1 heure" onClick={() => addH(1)}>+1</button>
            <button type="button" className="kk-btn kk-btn--accent kk-heure__btn" aria-label="Ajouter 3 heures" onClick={() => addH(3)}>+3</button>
            <button type="button" className="kk-btn kk-heure__btn kk-heure__btn--reset" aria-label="Remettre les heures a zero" onClick={resetH}>
              <RotateCcw size={22} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          className="kk-heure__block"
          role="group"
          aria-label={`minutes : ${m}`}
          tabIndex={0}
          onKeyDown={minuteKey}
        >
          <div className="kk-heure__title">Minutes</div>
          <div className="kk-heure__big">{String(m).padStart(2, "0")}</div>
          <div className="kk-heure__btns">
            <button type="button" className="kk-btn kk-btn--accent kk-heure__btn" aria-label="Ajouter 1 minute" onClick={() => addM(1)}>+1</button>
            <button type="button" className="kk-btn kk-btn--accent kk-heure__btn" aria-label="Ajouter 5 minutes" onClick={() => addM(5)}>+5</button>
            <button type="button" className="kk-btn kk-btn--accent kk-heure__btn" aria-label="Ajouter 15 minutes" onClick={() => addM(15)}>+15</button>
            <button type="button" className="kk-btn kk-heure__btn kk-heure__btn--reset" aria-label="Remettre les minutes a zero" onClick={resetM}>
              <RotateCcw size={22} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Regle graduee (SVG) : lire la longueur d'un segment rouge. ---
function RegleView({ data }: { data: RegleData }) {
  const { length, max, step, unit } = data;
  const W = 520;
  const pad = 22;
  const H = 96;
  const top = 34;
  const x = (v: number) => pad + (v / max) * (W - 2 * pad);
  const ticks: number[] = [];
  for (let v = 0; v <= max; v++) ticks.push(v);
  return (
    <div className="kk-support kk-regle">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`regle graduee en ${unit}, trait de 0 a ${length}`}>
        {/* Segment a mesurer (rouge), pose sur le zero de la regle. */}
        <line x1={x(0)} y1={top - 10} x2={x(length)} y2={top - 10} stroke="#e23" strokeWidth={5} strokeLinecap="round" />
        {/* Corps de la regle. */}
        <rect x={pad} y={top} width={W - 2 * pad} height={40} fill="var(--kk-surface, #fff)" stroke="var(--kk-border)" strokeWidth={2} />
        {ticks.map((v) => {
          const big = v % step === 0;
          return (
            <g key={v}>
              <line x1={x(v)} y1={top} x2={x(v)} y2={top + (big ? 18 : 9)} stroke="var(--kk-text)" strokeWidth={big ? 2 : 1} />
              {big && (
                <text x={x(v)} y={top + 34} textAnchor="middle" fontSize="13" fontWeight={700} fill="var(--kk-text)">
                  {v}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// --- Balance (echelle horizontale a aiguille) ou verre gradue (remplissage). ---
function BalanceView({ data }: { data: BalanceData }) {
  const { value, max, step, unit, kind } = data;
  if (kind === "verre") {
    const W = 180;
    const H = 200;
    const gx = 60;
    const gw = 60;
    const gTop = 16;
    const gBot = 180;
    const level = gBot - (value / max) * (gBot - gTop);
    const ticks: number[] = [];
    for (let v = 0; v <= max; v += step) ticks.push(v);
    return (
      <div className="kk-support kk-balance">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`verre gradue, niveau a ${value} ${unit}`}>
          <rect x={level < gBot ? gx : gx} y={level} width={gw} height={gBot - level} fill="color-mix(in srgb, var(--kk-accent) 45%, transparent)" />
          <rect x={gx} y={gTop} width={gw} height={gBot - gTop} fill="none" stroke="var(--kk-border)" strokeWidth={3} />
          {ticks.map((v) => {
            const ty = gBot - (v / max) * (gBot - gTop);
            return (
              <g key={v}>
                <line x1={gx} y1={ty} x2={gx + 12} y2={ty} stroke="var(--kk-text)" strokeWidth={2} />
                <text x={gx - 6} y={ty + 4} textAnchor="end" fontSize="12" fontWeight={700} fill="var(--kk-text)">{v}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }
  // Balance : echelle horizontale graduee avec une aiguille (triangle) sur value.
  const W = 520;
  const pad = 26;
  const H = 86;
  const axisY = 54;
  const x = (v: number) => pad + (v / max) * (W - 2 * pad);
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  return (
    <div className="kk-support kk-balance">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`balance indiquant ${value} ${unit}`}>
        <line x1={pad} y1={axisY} x2={W - pad} y2={axisY} stroke="var(--kk-border)" strokeWidth={3} />
        {ticks.map((v) => (
          <g key={v}>
            <line x1={x(v)} y1={axisY - 6} x2={x(v)} y2={axisY + 6} stroke="var(--kk-text)" strokeWidth={2} />
            <text x={x(v)} y={axisY + 22} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--kk-text)">{v}</text>
          </g>
        ))}
        <path d={`M ${x(value)} ${axisY - 26} L ${x(value) - 8} ${axisY - 8} L ${x(value) + 8} ${axisY - 8} Z`} fill="var(--kk-accent)" />
      </svg>
    </div>
  );
}

// --- Figure de fraction (SVG) : `den` parts egales ; `filled[i]` colorie la
// part i. onToggle rend les parts cliquables (coloriage interactif). ---
function FractionShape({
  shape,
  den,
  filled,
  onToggle,
}: {
  shape: FractionData["shape"];
  den: number;
  filled: boolean[];
  onToggle?: (i: number) => void;
}) {
  const fillOf = (on: boolean) => (on ? "var(--kk-accent)" : "var(--kk-surface, #fff)");
  const stroke = "var(--kk-border)";
  const clickable = !!onToggle;
  const style = clickable ? { cursor: "pointer" as const } : undefined;

  if (shape === "disque") {
    const C = 90;
    const R = 82;
    const parts = [];
    for (let i = 0; i < den; i++) {
      const a0 = (i / den) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / den) * 2 * Math.PI - Math.PI / 2;
      const x0 = C + R * Math.cos(a0), y0 = C + R * Math.sin(a0);
      const x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const d = den === 1 ? `M ${C - R} ${C} a ${R} ${R} 0 1 0 ${2 * R} 0 a ${R} ${R} 0 1 0 ${-2 * R} 0`
        : `M ${C} ${C} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
      parts.push(
        <path key={i} d={d} fill={fillOf(filled[i])} stroke={stroke} strokeWidth={2}
          style={style} onClick={onToggle ? () => onToggle(i) : undefined} />
      );
    }
    return (
      <div className="kk-support kk-fraction">
        <svg width="184" height="184" viewBox="0 0 180 180" role="img" aria-label={`figure en ${den} parts, ${filled.filter(Boolean).length} coloriee(s)`}>
          {parts}
        </svg>
      </div>
    );
  }

  // rectangle (colonnes) / bande (barre large) : den cellules cote a cote.
  const W = shape === "bande" ? 360 : 240;
  const H = shape === "bande" ? 70 : 120;
  const cw = W / den;
  const cells = Array.from({ length: den }, (_, i) => (
    <rect key={i} x={i * cw} y={0} width={cw} height={H} fill={fillOf(filled[i])} stroke={stroke}
      strokeWidth={2} style={style} onClick={onToggle ? () => onToggle(i) : undefined} />
  ));
  return (
    <div className="kk-support kk-fraction">
      <svg width="100%" height={H + 4} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
        role="img" aria-label={`figure en ${den} parts, ${filled.filter(Boolean).length} coloriee(s)`}>
        {cells}
      </svg>
    </div>
  );
}

function FractionFigure({ data }: { data: FractionData }) {
  const filled = Array.from({ length: data.den }, (_, i) => i < data.num);
  return <FractionShape shape={data.shape} den={data.den} filled={filled} />;
}

// Coloriage interactif (saisie "fraction") : l'enfant touche les parts ; la
// reponse est le NOMBRE de parts coloriees.
function FractionColor({ data, onCount }: { data: FractionData; onCount: (n: number) => void }) {
  const [filled, setFilled] = useState<boolean[]>(() => Array(data.den).fill(false));
  const toggle = (i: number) => {
    setFilled((prev) => {
      const next = prev.slice();
      next[i] = !next[i];
      onCount(next.filter(Boolean).length);
      return next;
    });
  };
  return <FractionShape shape={data.shape} den={data.den} filled={filled} onToggle={toggle} />;
}

type Phase = "answering" | "sure" | "correct" | "wrong";

export function Session({
  profil,
  referentiel,
  onExit,
  onProfilChange,
}: {
  profil: Profil;
  referentiel: Referentiel;
  onExit: () => void;
  onProfilChange: (p: Profil) => void;
}) {
  const u = universDef(profil.univers);

  const [engine, setEngine] = useState<EngineState | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [empty, setEmpty] = useState(false);
  const [f1, setF1] = useState("");
  const [f2, setF2] = useState("");
  const [active, setActive] = useState<1 | 2>(1);
  // Nouveaux modes de saisie : choix (compare/qcm) et cases de chiffres (pose/chiffres).
  const [choice, setChoice] = useState<number | null>(null);
  // Ecriture en toutes lettres (op 'lettres') : saisie texte + diagnostic de la
  // derniere reponse fausse (affiche pendant la correction).
  const [texte, setTexte] = useState("");
  const [diag, setDiag] = useState<Diagnostic | null>(null);
  const [digits, setDigits] = useState<string[]>([]);
  const [cell, setCell] = useState(0);
  const [showSchema, setShowSchema] = useState(false);
  const [monnaie, setMonnaie] = useState(profil.monnaie);
  const [lastGain, setLastGain] = useState(0);
  const [done, setDone] = useState(false);
  const [limite, setLimite] = useState<string | null>(null);
  const [tempsJourS, setTempsJourS] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>(() =>
    initialInputMode(prefersCoarsePointer(), getStoredInputMode())
  );

  const seanceId = useRef<string>("");
  const startedAt = useRef<number>(0);
  const questionStart = useRef<number>(0);
  const placement = useRef<Record<string, boolean>>({});
  const monnaieStart = useRef<number>(profil.monnaie);
  // Saisie brute du dernier exercice valide (envoyee au serveur pour revalidation).
  const submitted = useRef<{
    reponse: number;
    reste: number | null;
    texte?: string | null;
    typeFaute?: string | null;
  }>({ reponse: 0, reste: null });

  // --- Initialisation : reprise ou nouvelle seance ------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      // Rejoue d'abord les reponses en attente (reseau retabli).
      await flushReponses(insertReponse).catch(() => {});
      const snap = loadSnapshot(profil.id);
      if (snap && !isFinished(snap.engine)) {
        seanceId.current = snap.seanceId;
        startedAt.current = snap.startedAt;
        placement.current = snap.placement;
        questionStart.current = Date.now();
        if (alive) setEngine(snap.engine);
        getMonnaie(profil.id).then((m) => alive && setMonnaie(m)).catch(() => {});
        return;
      }
      try {
        const [progress_, sources] = await Promise.all([
          getProgressionDetail(profil.id),
          getExercicesCalcul(),
        ]);
        const ctx = { hero: profil.surnom, univers: profil.univers };
        const plan = composeSession({
          competences: referentiel.competences,
          prerequis: referentiel.prerequis,
          progress: progress_,
          sources,
          seed: (Date.now() ^ 0x9e3779b9) >>> 0,
          now: Date.now(),
          classe: profil.classe,
          ctx,
        });
        placement.current = {};
        for (const p of progress_) placement.current[p.competence] = p.placement_termine;
        if (plan.length === 0) {
          if (alive) setEmpty(true);
          return;
        }
        const eng = createEngine(plan, (Date.now() ^ 0x85ebca6b) >>> 0, ctx);
        seanceId.current = uuid();
        startedAt.current = Date.now();
        questionStart.current = Date.now();
        monnaieStart.current = profil.monnaie;
        await createSeance(seanceId.current, profil.id).catch(() => {});
        saveSnapshot(profil.id, {
          seanceId: seanceId.current,
          startedAt: startedAt.current,
          engine: eng,
          placement: placement.current,
        });
        if (alive) setEngine(eng);
      } catch {
        if (alive) setEmpty(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  const slot = engine ? currentSlot(engine) : null;
  const ex = slot?.exercise ?? null;
  const prog = engine ? progress(engine) : { done: 0, total: 1 };

  useEffect(() => {
    // Nouvelle question : reinitialise la saisie et le chrono.
    setF1("");
    setF2("");
    setActive(1);
    setChoice(null);
    setTexte("");
    setDiag(null);
    setShowSchema(false);
    if (ex?.saisie === "pose" && ex.poseData) {
      setDigits(Array(ex.poseData.answerDigits).fill(""));
      setCell(ex.poseData.answerDigits - 1); // saisie de DROITE a GAUCHE
    } else if (ex?.saisie === "chiffres" && ex.chiffresData) {
      setDigits(Array(ex.chiffresData.ranks.length).fill(""));
      setCell(0);
    } else {
      setDigits([]);
      setCell(0);
    }
    questionStart.current = Date.now();
  }, [ex?.key]);

  const persist = useCallback(
    (eng: EngineState) => {
      saveSnapshot(profil.id, {
        seanceId: seanceId.current,
        startedAt: startedAt.current,
        engine: eng,
        placement: placement.current,
      });
    },
    [profil.id]
  );

  const relire = useCallback(async () => {
    try {
      const [m, prg] = await Promise.all([
        getMonnaie(profil.id),
        getProgressionDetail(profil.id),
      ]);
      setMonnaie(m);
      onProfilChange({ ...profil, monnaie: m });
      for (const p of prg) placement.current[p.competence] = p.placement_termine;
    } catch {
      /* hors ligne : la file rejouera plus tard */
    }
  }, [profil, onProfilChange]);

  // Envoie la reponse au serveur, qui decide seul « juste/faux » (lot 2). En cas
  // de reseau coupe, la reponse est mise en file et rejouee plus tard. En cas de
  // plafond anti-abus, on affiche un message doux sans rien retirer.
  // `correctLocal` = verdict calcule localement, uniquement pour le feedback
  // instantane et le credit optimiste hors-ligne ; le serveur fait foi.
  const envoyer = useCallback(
    async (correctLocal: boolean, correctionRead: boolean) => {
      if (!ex || !slot) return;
      const tooFast = Date.now() - questionStart.current;
      const row: ReponseInsert = {
        id: uuid(),
        profil_id: profil.id,
        seance_id: seanceId.current,
        competence: ex.competence,
        exercice_id: slot.source.exerciceId,
        niveau: ex.niveau,
        methode: ex.methode,
        op: ex.verif.op,
        a: ex.verif.a,
        b: ex.verif.b,
        op2: ex.verif.op2 ?? null,
        c: ex.verif.c ?? null,
        reponse: submitted.current.reponse,
        reste: submitted.current.reste,
        reponse_texte: submitted.current.texte ?? null,
        type_faute: submitted.current.typeFaute ?? null,
        fields: ex.fields,
        temps_ms: tooFast,
        correction_lue: correctionRead,
        rattrapage: ex.rattrapage,
        placement: !placement.current[ex.competence],
        repondu_le: new Date().toISOString(),
      };
      try {
        const res = await insertReponse(row);
        if (res.monnaie != null) {
          setMonnaie(res.monnaie);
          onProfilChange({ ...profil, monnaie: res.monnaie });
        }
        void relire(); // synchronise la progression (placement) en arriere-plan
      } catch (e) {
        const code = plafondCode(e);
        if (code) {
          // Refus propre : pause anti-abus. Jamais de perte.
          setLimite("Pause ! Reviens un peu plus tard.");
          return;
        }
        // Reseau coupe : on met en file + credit optimiste (reconcilie au flush).
        enqueueReponse(row);
        const gain = tooFast < 1500 ? 0 : correctLocal && ex.rattrapage ? 3 : correctLocal ? 2 : correctionRead ? 1 : 0;
        setMonnaie((m) => {
          const nm = m + gain;
          onProfilChange({ ...profil, monnaie: nm });
          return nm;
        });
      }
    },
    [ex, slot, profil, relire, onProfilChange]
  );

  const value = ex && ex.fields === 2 ? { q: f1, r: f2 } : { q: f1, r: "" };

  const isCorrect = useCallback((): boolean => {
    if (!ex) return false;
    if (ex.saisie === "lettres") return diagnostiquer(ex.answer, texte).juste;
    if (ex.fields === 2) {
      return Number(value.q) === ex.answer && Number(value.r) === (ex.reste ?? -1);
    }
    return value.q !== "" && Number(value.q) === ex.answer;
  }, [ex, value.q, value.r, texte]);

  const canValidate = ex
    ? ex.saisie === "lettres"
      ? texte.trim() !== ""
      : ex.fields === 2
        ? f1 !== "" && f2 !== ""
        : f1 !== ""
    : false;

  const doValidate = useCallback(() => {
    if (!engine || !ex || !canValidate) return;
    // Ecriture en toutes lettres : le diagnostic local sert au feedback et
    // enregistre le type de faute (indicatif) ; le serveur reste seul juge.
    if (ex.saisie === "lettres") {
      const d = diagnostiquer(ex.answer, texte);
      setDiag(d);
      submitted.current = {
        reponse: ex.answer,
        reste: null,
        texte,
        typeFaute: d.juste ? null : (d.fautes[0]?.type ?? "INCONNU"),
      };
      if (d.juste) {
        const temps = Date.now() - questionStart.current;
        setLastGain(temps < 1500 ? 0 : ex.rattrapage ? 3 : 2);
        void envoyer(true, false);
        setPhase("correct");
      } else {
        setPhase("wrong");
      }
      return;
    }
    // Capture la saisie brute (envoyee au serveur pour revalidation), valable
    // aussi pour le chemin "faux" (envoye apres lecture de la correction).
    submitted.current = {
      reponse: Number(value.q),
      reste: ex.fields === 2 ? Number(value.r) : null,
    };
    const correct = isCorrect();
    if (correct) {
      const temps = Date.now() - questionStart.current;
      setLastGain(temps < 1500 ? 0 : ex.rattrapage ? 3 : 2); // meme bareme que le trigger
      void envoyer(true, false);
      setPhase("correct");
    } else {
      setPhase("wrong");
    }
  }, [engine, ex, canValidate, isCorrect, envoyer, value.q, value.r, texte]);

  // « Tu es sure de toi ? » ~1 sur 6, avant de valider.
  const onValiderClick = useCallback(() => {
    if (!engine || !canValidate) return;
    if (phase === "answering" && shouldAskSure(engine)) {
      setPhase("sure");
      return;
    }
    doValidate();
  }, [engine, canValidate, phase, doValidate]);

  const advance = useCallback(
    (correct: boolean, correctionRead: boolean) => {
      if (!engine) return;
      const { state } = answerCurrent(engine, correct, { correctionRead });
      persist(state);
      if (isFinished(state)) {
        void finir(state);
      } else {
        setEngine(state);
        setPhase("answering");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, persist]
  );

  const finir = useCallback(
    async (state: EngineState) => {
      const dureeS = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      const gained = Math.max(0, monnaie - monnaieStart.current);
      await finishSeance(seanceId.current, { duree_s: dureeS, monnaie_gagnee: gained }).catch(() => {});
      await flushReponses(insertReponse).catch(() => {});
      const deja = await getTempsAujourdhuiS(profil.id).catch(() => 0);
      setTempsJourS(deja + dureeS);
      setEngine(state);
      clearSnapshot(profil.id);
      setDone(true);
    },
    [monnaie, profil.id]
  );

  // --- Saisie (pave + clavier) -------------------------------------------
  // Synchronise f1 (source unique pour la validation) depuis les cases.
  const syncCells = useCallback((next: string[]) => {
    setDigits(next);
    setF1(next.length > 0 && next.every((x) => x !== "") ? next.join("") : "");
  }, []);

  const typeDigit = useCallback(
    (d: string) => {
      if (phase !== "answering") return;
      if (ex && (ex.saisie === "compare" || ex.saisie === "qcm" || ex.saisie === "monnaie" || ex.saisie === "heure" || ex.saisie === "fraction" || ex.saisie === "fraction_num" || ex.saisie === "lettres")) return;
      if (ex && (ex.saisie === "pose" || ex.saisie === "chiffres")) {
        const dir = ex.saisie === "pose" ? -1 : 1;
        const next = digits.slice();
        next[cell] = d;
        syncCells(next);
        setCell(Math.min(Math.max(cell + dir, 0), next.length - 1));
        return;
      }
      const setter = ex?.fields === 2 && active === 2 ? setF2 : setF1;
      setter((v) => (v.length >= 6 ? v : v + d));
    },
    [phase, ex, active, digits, cell, syncCells]
  );
  const backspace = useCallback(() => {
    if (phase !== "answering") return;
    if (ex && (ex.saisie === "compare" || ex.saisie === "qcm" || ex.saisie === "monnaie" || ex.saisie === "heure" || ex.saisie === "fraction" || ex.saisie === "fraction_num" || ex.saisie === "lettres")) return;
    if (ex && (ex.saisie === "pose" || ex.saisie === "chiffres")) {
      const dir = ex.saisie === "pose" ? -1 : 1;
      const next = digits.slice();
      let c = cell;
      if (next[c] === "") c = Math.min(Math.max(c - dir, 0), next.length - 1);
      next[c] = "";
      syncCells(next);
      setCell(c);
      return;
    }
    const setter = ex?.fields === 2 && active === 2 ? setF2 : setF1;
    setter((v) => v.slice(0, -1));
  }, [phase, ex, active, digits, cell, syncCells]);

  // Choix d'une option (compare / qcm) : la valeur devient la saisie (f1).
  const pickChoice = useCallback((v: number) => {
    if (phase !== "answering") return;
    setChoice(v);
    setF1(String(v));
  }, [phase]);

  // Monnaie : le total compose (centimes) devient la saisie. 0 => pas de saisie.
  const onMoneyTotal = useCallback((cents: number) => {
    setF1(cents > 0 ? String(cents) : "");
  }, []);

  // Heure : la saisie normalisee (minutes = h x 60 + m) devient f1. La saisie
  // libre (niveau 4) signale -1 tant qu'elle est incomplete => pas de validation.
  const onHeureValue = useCallback((mins: number) => {
    setF1(mins >= 0 ? String(mins) : "");
  }, []);

  // Fraction (coloriage) : le nombre de parts coloriees devient f1 (0 => rien).
  const onFractionValue = useCallback((n: number) => {
    setF1(n > 0 ? String(n) : "");
  }, []);

  // Fraction (saisie libre num/den) : le code num*100+den devient f1 ; -1 => rien.
  const onFractionCode = useCallback((code: number) => {
    setF1(code > 0 ? String(code) : "");
  }, []);

  // Ecriture en toutes lettres : la saisie texte est conservee telle quelle.
  const onLettresText = useCallback((t: string) => {
    setTexte(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isDigit = e.key >= "0" && e.key <= "9";
      const isNav = e.key === "Backspace" || e.key === "Enter" || e.key === "Tab";
      // Frappe clavier physique : bascule vers la saisie clavier (masque le pave).
      if ((isDigit || isNav) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setInputMode((m) => onPhysicalKey(m));
      }
      if (isDigit) typeDigit(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Enter") {
        if (phase === "answering") onValiderClick();
        else if (phase === "correct") advance(true, false);
      } else if (e.key === "Tab" && ex?.fields === 2) {
        e.preventDefault();
        setActive((a) => (a === 1 ? 2 : 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typeDigit, backspace, phase, onValiderClick, advance, ex]);

  // Toucher la zone de reponse reaffiche le pave (bascule automatique et
  // reversible). Utilise aussi bien pour le clic souris que le toucher.
  const touchAnswerZone = useCallback(() => {
    setInputMode((m) => onAnswerZoneTouch(m));
  }, []);

  // Bouton discret : force explicitement l'autre mode, memorise par appareil.
  const handleToggleInputMode = useCallback(() => {
    setInputMode((m) => {
      const next = toggleInputMode(m);
      setStoredInputMode(next);
      return next;
    });
  }, []);

  // ------------------------------- Rendu ---------------------------------
  if (empty) {
    return (
      <div className="kk-page kk-center">
        <div className="kk-container" style={{ textAlign: "center", maxWidth: 480 }}>
          <div className="kk-card kk-stack">
            <h1>Rien a reviser pour l'instant</h1>
            <p className="kk-lead" style={{ margin: "0 auto" }}>
              Reviens un peu plus tard, tes prochains exercices se preparent.
            </p>
            <button className="kk-btn kk-btn--accent kk-btn--block" onClick={onExit}>
              Retour au village
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (done && engine) {
    return (
      <EndScreen
        profil={profil}
        monnaieGained={Math.max(0, monnaie - monnaieStart.current)}
        stats={summary(engine)}
        tempsJourS={tempsJourS}
        onExit={onExit}
      />
    );
  }

  if (limite) {
    return (
      <div className="kk-page kk-center">
        <div className="kk-container" style={{ textAlign: "center", maxWidth: 480 }}>
          <div className="kk-card kk-stack">
            <h1>Pause !</h1>
            <p className="kk-lead" style={{ margin: "0 auto" }}>
              {limite} Tu as deja bien travaille aujourd'hui.
            </p>
            <button className="kk-btn kk-btn--accent kk-btn--block" onClick={onExit}>
              Retour au village
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!engine || !ex) {
    return (
      <div className="kk-page kk-center">
        <Spinner />
      </div>
    );
  }

  const hint = hintForCurrent(engine);

  return (
    <div className="kk-seance">
      <div className="kk-seance__top">
        <button className="kk-avatar-corner" onClick={onExit} aria-label="Quitter la seance" title="Retour au village">
          <AvatarView avatar={profil.avatar} size={40} />
        </button>
        <div className="kk-progress" role="progressbar" aria-valuenow={prog.done} aria-valuemax={prog.total}>
          <div className="kk-progress__fill" style={{ width: `${(prog.done / Math.max(1, prog.total)) * 100}%` }} />
        </div>
        <span className="kk-money">
          <u.MonnaieIcon size={20} />
          {monnaie}
        </span>
        <button
          className="kk-icon-btn"
          aria-label={inputMode === "pad" ? "Basculer en saisie clavier" : "Reafficher le pave numerique"}
          title={inputMode === "pad" ? "Basculer en saisie clavier" : "Reafficher le pave numerique"}
          onClick={handleToggleInputMode}
        >
          {inputMode === "pad" ? <Keyboard size={22} aria-hidden="true" /> : <Grid3x3 size={22} aria-hidden="true" />}
        </button>
        <ThemeToggle />
      </div>

      <main className="kk-seance__main">
        {ex.support !== "aucun" && ex.supportData && <SupportView data={ex.supportData} />}

        <EquationView
          prompt={ex.prompt}
          f1={f1}
          f2={f2}
          active={active}
          inputMode={inputMode}
          onPick={(n) => {
            setActive(n);
            touchAnswerZone();
          }}
        />

        {ex.horlogeData && <HorlogeView data={ex.horlogeData} />}
        {ex.regleData && <RegleView data={ex.regleData} />}
        {ex.balanceData && <BalanceView data={ex.balanceData} />}
        {ex.fractionData && ex.saisie !== "fraction" && <FractionFigure data={ex.fractionData} />}
        {(phase === "answering" || phase === "sure") && ex.saisie === "fraction" && ex.fractionData && (
          <FractionColor key={ex.key} data={ex.fractionData} onCount={onFractionValue} />
        )}
        {(phase === "answering" || phase === "sure") && ex.saisie === "fraction_num" && (
          <FractionInput key={ex.key} onCode={onFractionCode} />
        )}
        {(phase === "answering" || phase === "sure") && ex.saisie === "heure" && ex.horlogeData && (
          <HorlogeInput key={ex.key} data={ex.horlogeData} onValue={onHeureValue} />
        )}
        {(phase === "answering" || phase === "sure") && ex.saisie === "lettres" && (
          <LettresInput key={ex.key} onText={onLettresText} />
        )}
        {ex.saisie === "droite" && ex.droiteData && <DroiteView data={ex.droiteData} />}
        {(phase === "answering" || phase === "sure") && ex.saisie === "pose" && ex.poseData && (
          <PoseView
            data={ex.poseData}
            digits={digits}
            activeCell={cell}
            onFocusCell={(i) => {
              setCell(i);
              touchAnswerZone();
            }}
          />
        )}
        {(phase === "answering" || phase === "sure") && ex.saisie === "chiffres" && ex.chiffresData && (
          <ChiffresView
            data={ex.chiffresData}
            digits={digits}
            activeCell={cell}
            onFocusCell={(i) => {
              setCell(i);
              touchAnswerZone();
            }}
          />
        )}
        {(phase === "answering" || phase === "sure") && ex.saisie === "compare" && (
          <CompareChoice
            left={ex.compareLabels?.left ?? ex.verif.a}
            right={ex.compareLabels?.right ?? ex.verif.b}
            chosen={choice}
            onPick={pickChoice}
          />
        )}
        {(phase === "answering" || phase === "sure") && ex.saisie === "qcm" && ex.options && (
          <QcmChoice options={ex.options} chosen={choice} onPick={pickChoice} />
        )}
        {(phase === "answering" || phase === "sure") && ex.saisie === "monnaie" && ex.moneyData && (
          <MoneyCompose key={ex.key} data={ex.moneyData} onTotal={onMoneyTotal} />
        )}

        {/* Schema en barres : aide optionnelle pendant la recherche (ne revele
            jamais la reponse : l'inconnue reste « ? »). */}
        {(phase === "answering" || phase === "sure") && ex.barres && (
          <div className="kk-stack" style={{ textAlign: "center" }}>
            {!showSchema ? (
              <button type="button" className="kk-btn" onClick={() => setShowSchema(true)}>
                <Info size={16} aria-hidden="true" /> Je veux un schema
              </button>
            ) : (
              <BarModelView model={ex.barres} reveal={false} />
            )}
          </div>
        )}

        {hint && phase === "answering" && (
          <p className="kk-muted" style={{ textAlign: "center" }}>
            <Info size={16} aria-hidden="true" /> Prends ton temps, tu peux t'aider de ta methode.
          </p>
        )}

        {phase === "answering" || phase === "sure" ? (
          <>
            {(ex.saisie === "clavier" || ex.saisie === "droite") &&
              !ex.prompt.includes("[q]") &&
              !ex.prompt.includes("[r]") && (
              <div className="kk-answer">
                {ex.fields === 2 ? (
                  <>
                    <div>
                      <span className="kk-answer__label">resultat</span>
                      <button
                        className={`kk-answer__box${active === 1 ? " kk-answer__box--active" : ""}${
                          active === 1 && inputMode === "keyboard" ? " kk-answer__box--caret" : ""
                        }`}
                        aria-label="resultat"
                        onClick={() => {
                          setActive(1);
                          touchAnswerZone();
                        }}
                      >
                        {f1 || "?"}
                      </button>
                    </div>
                    <div>
                      <span className="kk-answer__label">reste</span>
                      <button
                        className={`kk-answer__box${active === 2 ? " kk-answer__box--active" : ""}${
                          active === 2 && inputMode === "keyboard" ? " kk-answer__box--caret" : ""
                        }`}
                        aria-label="reste"
                        onClick={() => {
                          setActive(2);
                          touchAnswerZone();
                        }}
                      >
                        {f2 || "?"}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className={`kk-answer__box kk-answer__box--active${
                      inputMode === "keyboard" ? " kk-answer__box--caret" : ""
                    }`}
                    aria-label="reponse"
                    onClick={touchAnswerZone}
                  >
                    {f1 || "?"}
                  </button>
                )}
              </div>
            )}

            {phase === "sure" ? (
              <div className="kk-sure kk-stack">
                <p className="kk-lead" style={{ margin: "0 auto" }}>Tu es sure de toi ?</p>
                <div className="kk-row" style={{ justifyContent: "center" }}>
                  <button className="kk-btn" onClick={() => setPhase("answering")}>Je verifie</button>
                  <button className="kk-btn kk-btn--accent" onClick={doValidate}>Oui, je valide</button>
                </div>
              </div>
            ) : ex.saisie === "compare" || ex.saisie === "qcm" || ex.saisie === "monnaie" || ex.saisie === "heure" || ex.saisie === "fraction" || ex.saisie === "fraction_num" || ex.saisie === "lettres" ? (
              <div className="kk-row" style={{ justifyContent: "center" }}>
                <button
                  className="kk-btn kk-btn--accent kk-btn--big"
                  disabled={!canValidate}
                  onClick={onValiderClick}
                >
                  Valider
                </button>
              </div>
            ) : inputMode === "pad" ? (
              <div className="kk-pad">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button key={d} onClick={() => typeDigit(d)} aria-label={d}>{d}</button>
                ))}
                <button onClick={backspace} aria-label="Effacer"><Delete size={26} aria-hidden="true" /></button>
                <button onClick={() => typeDigit("0")} aria-label="0">0</button>
                <button
                  onClick={onValiderClick}
                  disabled={!canValidate}
                  aria-label="Valider"
                  style={{ background: "var(--kk-accent)", color: "var(--kk-on-accent)", borderColor: "transparent" }}
                >
                  <Check size={26} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </>
        ) : phase === "correct" ? (
          <div className="kk-banner kk-banner--ok">
            <span className="kk-banner__title"><Check size={22} aria-hidden="true" /> Bravo, c'est juste !</span>
            {lastGain > 0 && (
              <span className="kk-banner__gain"><u.MonnaieIcon size={18} /> +{lastGain} {u.monnaie}</span>
            )}
            <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => advance(true, false)}>Continuer</button>
          </div>
        ) : (
          <div className="kk-banner kk-banner--ko">
            <span className="kk-banner__title">Ce n'est pas ca, voici comment trouver</span>
            {ex.barres && <BarModelView model={ex.barres} reveal={true} />}
            {ex.saisie === "lettres" && diag ? (
              <LettresCorrection diag={diag} />
            ) : (
              <p style={{ margin: 0 }}>{ex.correction}</p>
            )}
            <button
              className="kk-btn kk-btn--accent kk-btn--block"
              onClick={() => {
                void envoyer(false, true);
                advance(false, true);
              }}
            >
              J'ai compris
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ------------------------------- Fin de seance -----------------------------
function EndScreen({
  profil,
  monnaieGained,
  stats,
  tempsJourS,
  onExit,
}: {
  profil: Profil;
  monnaieGained: number;
  stats: { answered: number; correct: number; wrong: number };
  tempsJourS: number;
  onExit: () => void;
}) {
  const u = universDef(profil.univers);
  const min = Math.round(tempsJourS / 60);
  const limite = profil.limite_jour_min;
  const restant = limite != null ? Math.max(0, limite - min) : null;
  const atteinte = limite != null && min >= limite;

  return (
    <div className="kk-page kk-center">
      <div className="kk-container" style={{ textAlign: "center", maxWidth: 520 }}>
        <div className="kk-card kk-stack">
          <div style={{ fontSize: "3rem" }} aria-hidden="true">🎉</div>
          <h1>Belle seance, {profil.surnom} !</h1>
          <p className="kk-lead" style={{ margin: "0 auto" }}>
            {stats.correct} bonnes reponses sur {stats.answered}. Ton village grandit :
            de nouvelles pierres sont posees.
          </p>
          <span className="kk-money" style={{ margin: "0 auto" }}>
            <u.MonnaieIcon size={22} /> +{monnaieGained} {u.monnaie}
          </span>
          <p className="kk-muted">
            Temps joue aujourd'hui : {min} min
            {restant != null && !atteinte ? ` (il te reste ${restant} min)` : ""}.
          </p>
          {atteinte && (
            <p className="kk-lead" style={{ margin: "0 auto" }}>
              Tu as atteint ton temps du jour. Tu peux t'arreter et revenir demain,
              ou continuer un peu si tu veux.
            </p>
          )}
          <button className="kk-btn kk-btn--accent kk-btn--big kk-btn--block" onClick={onExit}>
            Retour au village
          </button>
        </div>
      </div>
    </div>
  );
}
