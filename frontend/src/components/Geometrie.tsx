// Geometrie et reperage (maths, CE2). Composant AUTONOME, rendu dans Session.tsx
// quand ex.saisie === "geometrie". Il dessine une FIGURE SVG tactile et gere
// plusieurs formats de reponse :
//   - qcm        : propositions en gros boutons (la figure sert de contexte) ;
//   - clic       : on touche une figure, une case ou un sommet ; en mode
//                  « programmation », on lit un programme et on touche l'arrivee ;
//   - texte      : saisie LIBRE (N4), l'enfant tape un nom ou un code de case ;
//   - grille     : coloriage de cases (symetrie) ou placement d'un point (noeud) ;
//   - construire : quadrillage de NOEUDS aimante ; l'enfant touche les noeuds
//                  pour placer les sommets, les segments se tracent tout seuls ;
//   - programme  : l'enfant ASSEMBLE des cartes (« avance », « tourne a droite »,
//                  « tourne a gauche ») pour amener un robot jusqu'a la cible.
// Toutes les cibles tactiles font au moins 44 px. Le SERVEUR (verif_geo, op
// 'geo') reste SEUL JUGE : onSoumettre renvoie le verdict serveur ; pour
// construire/programme la saisie est un JSON (sommets / cartes) juge par
// proprietes/simulation. Feedback TOUJOURS valorisant.

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCcw, Undo2, Play, Move3d } from "lucide-react";
import type {
  GeoRender, GeoShape, GeoGridSpec, SolidName, Dir, ProgToken, Pt,
  GeoRuleSpec, GeoCompassSpec, GeoNetSpec, Cell,
} from "../domain/geometrie/geometrie";
import { canonCells, comparerGeometrie, simulerProgramme, SOLIDES_3D } from "../domain/geometrie/geometrie";

interface Props {
  item: GeoRender;
  onSoumettre: (cle: string, reponseTexte: string) => Promise<{ correct: boolean } | null>;
  onContinuer: (correct: boolean) => void;
}

const COLS = "ABCDEFGH";
function codeOf(col: number, row: number): string {
  return `${COLS[col]}${row}`;
}

// Cartes de programme affichees EN TOUTES LETTRES (jamais de fleche ni de symbole).
const PROG_LABEL: Record<ProgToken, string> = {
  avance: "avance",
  droite: "tourne à droite",
  gauche: "tourne à gauche",
};

// --------------------------------------------------------------------------
// Rendu d'une figure « formes » (polygones, cercles, segments, points) et des
// solides (dessins canoniques). viewBox 0..100.
// --------------------------------------------------------------------------
function polyPoints(pts: Array<[number, number]>): string {
  return pts.map(([x, y]) => `${x},${y}`).join(" ");
}

function ShapeEl({ s, clickable, selected, onPick }: {
  s: GeoShape; clickable: boolean; selected: boolean; onPick: () => void;
}) {
  const fill = s.fill ? "var(--kk-accent)" : "transparent";
  const stroke = s.hi ? "#16a34a" : "var(--kk-text)";
  const sw = 2.2;
  const active = clickable && !!s.name;
  const common = {
    stroke,
    strokeWidth: sw,
    fill: s.kind === "dot" ? (s.hi ? "#16a34a" : "var(--kk-text)") : fill,
    style: active ? { cursor: "pointer" as const } : undefined,
    onClick: active ? onPick : undefined,
  };

  if (s.kind === "polygon" && s.pts) {
    return (
      <g>
        <polygon
          points={polyPoints(s.pts)}
          {...common}
          fill={selected ? "var(--kk-accent)" : common.fill}
        />
        {s.label && s.pts[0] && (
          <text x={s.pts[0][0]} y={s.pts[0][1] - 2} fontSize="7" fill="var(--kk-text)">{s.label}</text>
        )}
      </g>
    );
  }
  if (s.kind === "circle") {
    return (
      <circle cx={s.cx} cy={s.cy} r={s.r} {...common} fill={selected ? "var(--kk-accent)" : common.fill} />
    );
  }
  if (s.kind === "segment" && s.pts && s.pts.length >= 2) {
    return (
      <line x1={s.pts[0][0]} y1={s.pts[0][1]} x2={s.pts[1][0]} y2={s.pts[1][1]} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    );
  }
  if (s.kind === "right" && s.cx != null && s.cy != null) {
    // Petit carre marquant l'angle droit (comme le signe de l'equerre).
    const d = 10;
    const dirX = s.cx < 50 ? 1 : -1;
    const dirY = s.cy < 50 ? 1 : -1;
    return (
      <polyline
        points={`${s.cx + dirX * d},${s.cy} ${s.cx + dirX * d},${s.cy + dirY * d} ${s.cx},${s.cy + dirY * d}`}
        fill="none" stroke="var(--kk-text)" strokeWidth={1.6}
      />
    );
  }
  if (s.kind === "dot" && s.cx != null && s.cy != null) {
    return (
      <g style={active ? { cursor: "pointer" } : undefined} onClick={active ? onPick : undefined}>
        {active && <circle cx={s.cx} cy={s.cy} r={9} fill="transparent" />}
        <circle cx={s.cx} cy={s.cy} r={selected ? 4.5 : 3} fill={selected ? "var(--kk-accent)" : common.fill as string} stroke={selected ? "var(--kk-accent)" : "none"} />
        {s.label && <text x={s.cx + 4} y={s.cy - 4} fontSize="7" fontWeight={700} fill="var(--kk-text)">{s.label}</text>}
      </g>
    );
  }
  return null;
}

function SolidView({ solid }: { solid: SolidName }) {
  const acc = "var(--kk-accent)";
  const txt = "var(--kk-text)";
  const faint = "var(--kk-border)";
  let body: React.ReactNode = null;
  switch (solid) {
    case "cube":
      body = (
        <g>
          <polygon points="30,35 70,35 70,75 30,75" fill={acc} opacity={0.18} stroke={txt} strokeWidth={2} />
          <polygon points="30,35 45,20 85,20 70,35" fill={acc} opacity={0.3} stroke={txt} strokeWidth={2} />
          <polygon points="70,35 85,20 85,60 70,75" fill={acc} opacity={0.25} stroke={txt} strokeWidth={2} />
        </g>
      );
      break;
    case "pave":
      body = (
        <g>
          <polygon points="22,40 72,40 72,72 22,72" fill={acc} opacity={0.18} stroke={txt} strokeWidth={2} />
          <polygon points="22,40 38,24 88,24 72,40" fill={acc} opacity={0.3} stroke={txt} strokeWidth={2} />
          <polygon points="72,40 88,24 88,56 72,72" fill={acc} opacity={0.25} stroke={txt} strokeWidth={2} />
        </g>
      );
      break;
    case "cylindre":
      body = (
        <g>
          <path d="M28,28 L28,72 A22,8 0 0 0 72,72 L72,28" fill={acc} opacity={0.18} stroke={txt} strokeWidth={2} />
          <ellipse cx={50} cy={28} rx={22} ry={8} fill={acc} opacity={0.3} stroke={txt} strokeWidth={2} />
          <ellipse cx={50} cy={72} rx={22} ry={8} fill="none" stroke={faint} strokeWidth={1.4} strokeDasharray="3 2" />
        </g>
      );
      break;
    case "sphere":
      body = (
        <g>
          <circle cx={50} cy={50} r={28} fill={acc} opacity={0.2} stroke={txt} strokeWidth={2} />
          <ellipse cx={50} cy={50} rx={28} ry={10} fill="none" stroke={faint} strokeWidth={1.4} strokeDasharray="3 2" />
        </g>
      );
      break;
    case "pyramide":
      body = (
        <g>
          <polygon points="50,18 30,70 70,70" fill={acc} opacity={0.3} stroke={txt} strokeWidth={2} />
          <polygon points="30,70 70,70 82,60 42,60" fill={acc} opacity={0.15} stroke={txt} strokeWidth={2} />
          <line x1={50} y1={18} x2={82} y2={60} stroke={txt} strokeWidth={2} />
        </g>
      );
      break;
    case "cone":
      body = (
        <g>
          <path d="M50,18 L28,70 A22,8 0 0 0 72,70 Z" fill={acc} opacity={0.25} stroke={txt} strokeWidth={2} />
          <ellipse cx={50} cy={70} rx={22} ry={8} fill="none" stroke={faint} strokeWidth={1.4} strokeDasharray="3 2" />
        </g>
      );
      break;
  }
  return (
    <div className="kk-support kk-geo__figure">
      <svg width="200" height="200" viewBox="0 0 100 100" role="img" aria-label={`solide : ${solid}`}>
        {body}
      </svg>
    </div>
  );
}

// --------------------------------------------------------------------------
// Rendu d'une grille (quadrillage) : cases coloriees, axe de symetrie, depart,
// obstacles, robot, cible, marques (plan), cases/noeuds cliquables.
// --------------------------------------------------------------------------
const S = 14; // taille d'une case (unites SVG) -> cibles larges une fois affichees

function GridView({
  spec, mode, colored, selectedCell, robot, goal, obstacles,
  onToggleCell, onPickCell, onPickNode,
}: {
  spec: GeoGridSpec;
  mode: "none" | "color" | "point" | "clickCell";
  colored: string[];
  selectedCell: string | null;
  robot?: { cell: string; dir: Dir } | null;
  goal?: string | null; // case cible (programmation) affichee en vert
  obstacles?: string[];
  onToggleCell: (code: string) => void;
  onPickCell: (code: string) => void;
  onPickNode: (code: string) => void;
}) {
  const { cols, rows, coded, nodes, fill = [], axis, start, target, marks = [] } = spec;
  const LEFT = coded ? 1 : 0;
  const BOT = coded ? 1 : 0;
  const W = (LEFT + cols) * S;
  const H = (rows + BOT) * S;
  const cellX = (col: number) => (LEFT + col) * S;
  const cellYTop = (row: number) => (rows - row) * S; // haut de la case (ligne 1 en bas)
  const nodeX = (col: number) => (LEFT + col) * S;
  const nodeY = (row: number) => (rows - (row - 1)) * S;

  const prefilled = new Set(fill.map((c) => c.toUpperCase()));
  const coloredSet = new Set(colored.map((c) => c.toUpperCase()));
  const obstSet = new Set((obstacles ?? []).map((c) => c.toUpperCase()));
  const goalUp = goal ? goal.toUpperCase() : null;

  const cellsEls: React.ReactNode[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 1; row <= rows; row++) {
      const code = codeOf(col, row);
      const x = cellX(col);
      const y = cellYTop(row);
      const isPrefilled = prefilled.has(code);
      const isColored = coloredSet.has(code);
      const isSelected = selectedCell === code;
      const isStart = start && start.toUpperCase() === code;
      const isTarget = target && target.toUpperCase() === code;
      const isGoal = goalUp === code;
      const isObst = obstSet.has(code);
      let f = "transparent";
      if (isObst) f = "var(--kk-text)";
      else if (isPrefilled || isColored) f = "var(--kk-accent)";
      else if (isSelected) f = "var(--kk-accent)";
      else if (isGoal || isTarget) f = "#16a34a";
      const clickable = mode === "color" ? !isPrefilled : mode === "clickCell";
      cellsEls.push(
        <rect
          key={code}
          x={x} y={y} width={S} height={S}
          fill={f}
          fillOpacity={isObst ? 0.55 : isColored || isSelected ? 0.85 : isPrefilled ? 0.6 : isGoal || isTarget ? 0.4 : 1}
          stroke="var(--kk-border)" strokeWidth={1.2}
          style={clickable ? { cursor: "pointer" } : undefined}
          onClick={clickable ? () => (mode === "color" ? onToggleCell(code) : onPickCell(code)) : undefined}
          aria-label={coded ? `case ${code}` : undefined}
        />
      );
      const mk = marks.find((m) => m.cell.toUpperCase() === code);
      if (mk) {
        cellsEls.push(
          <text key={`${code}-mk`} x={x + S / 2} y={y + S / 2 + 3} textAnchor="middle" fontSize={S * 0.42} fontWeight={700} fill="var(--kk-text)">{mk.text}</text>
        );
      }
      // Marqueur « depart » seulement si le robot n'est pas dessine ici.
      if (isStart && !robot) {
        cellsEls.push(
          <text key={`${code}-st`} x={x + S / 2} y={y + S / 2 + 3} textAnchor="middle" fontSize={S * 0.36} fontWeight={700} fill="var(--kk-on-accent)">départ</text>
        );
      }
    }
  }

  // Etiquettes de colonnes (A..) et de lignes (1..).
  const labels: React.ReactNode[] = [];
  if (coded) {
    for (let col = 0; col < cols; col++) {
      labels.push(
        <text key={`c${col}`} x={cellX(col) + S / 2} y={rows * S + S * 0.7} textAnchor="middle" fontSize={S * 0.42} fontWeight={700} fill="var(--kk-text)">{COLS[col]}</text>
      );
    }
    for (let row = 1; row <= rows; row++) {
      labels.push(
        <text key={`r${row}`} x={LEFT * S - S * 0.3} y={cellYTop(row) + S / 2 + 3} textAnchor="end" fontSize={S * 0.42} fontWeight={700} fill="var(--kk-text)">{row}</text>
      );
    }
  }

  // Axe de symetrie.
  let axisEl: React.ReactNode = null;
  if (axis) {
    if (axis.dir === "v") {
      const x = cellX(axis.at);
      axisEl = <line x1={x} y1={0} x2={x} y2={rows * S} stroke="#E06A00" strokeWidth={3} strokeDasharray="5 3" />;
    } else {
      const y = cellYTop(axis.at);
      axisEl = <line x1={LEFT * S} y1={y} x2={(LEFT + cols) * S} y2={y} stroke="#E06A00" strokeWidth={3} strokeDasharray="5 3" />;
    }
  }

  // Robot (programmation) : rond + petit « nez » du cote ou il regarde.
  let robotEl: React.ReactNode = null;
  if (robot) {
    const up = robot.cell.toUpperCase();
    const rc = up.charCodeAt(0) - 65;
    const rr = parseInt(up.slice(1), 10);
    if (rc >= 0 && rc < cols && rr >= 1 && rr <= rows) {
      const cxp = cellX(rc) + S / 2;
      const cyp = cellYTop(rr) + S / 2;
      const nz = S * 0.32;
      const nose = robot.dir === "N" ? [0, -nz] : robot.dir === "S" ? [0, nz] : robot.dir === "E" ? [nz, 0] : [-nz, 0];
      robotEl = (
        <g>
          <circle cx={cxp} cy={cyp} r={S * 0.34} fill="var(--kk-accent)" stroke="var(--kk-text)" strokeWidth={1.2} />
          <circle cx={cxp + nose[0]} cy={cyp + nose[1]} r={S * 0.1} fill="var(--kk-text)" />
        </g>
      );
    }
  }

  // Noeuds cliquables (placer un point).
  const nodeEls: React.ReactNode[] = [];
  if (nodes && mode === "point") {
    for (let col = 0; col < cols; col++) {
      for (let row = 1; row <= rows; row++) {
        const code = codeOf(col, row);
        const x = nodeX(col);
        const y = nodeY(row);
        const isSel = selectedCell === code;
        nodeEls.push(
          <g key={`n${code}`} style={{ cursor: "pointer" }} onClick={() => onPickNode(code)}>
            <circle cx={x} cy={y} r={S * 0.5} fill="transparent" />
            <circle cx={x} cy={y} r={isSel ? S * 0.28 : S * 0.16} fill={isSel ? "var(--kk-accent)" : "var(--kk-border)"} />
          </g>
        );
      }
    }
  }

  const px = Math.min(360, Math.max(240, W * 7));
  return (
    <div className="kk-support kk-geo__grid">
      <svg width="100%" style={{ maxWidth: px }} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="quadrillage">
        {axisEl}
        {cellsEls}
        {nodeEls}
        {robotEl}
        {labels}
      </svg>
    </div>
  );
}

// --------------------------------------------------------------------------
// Construction sur quadrillage de NOEUDS aimante (format 'construire'). L'enfant
// touche les noeuds ; les segments relient les sommets dans l'ordre ; au-dela de
// deux sommets, un trait en pointilles ferme la figure.
// --------------------------------------------------------------------------
function BuildView({
  cols, rows, placed, prefillCount, model, modelVisible, onPick, locked,
}: {
  cols: number; rows: number;
  placed: Pt[]; // sommets dessines = prefill (verrouilles) + ceux de l'enfant
  prefillCount: number; // nombre de sommets verrouilles au debut de `placed`
  model?: Pt[]; // figure de reference (reproduire)
  modelVisible: boolean; // false => masquee (memoire)
  onPick: (p: Pt) => void; locked: boolean;
}) {
  const U = 12;
  const P = 10;
  const Wv = cols * U + 2 * P;
  const Hv = rows * U + 2 * P;
  const sx = (x: number) => P + x * U;
  const sy = (y: number) => P + (rows - y) * U;

  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= cols; x++) {
    lines.push(<line key={`vx${x}`} x1={sx(x)} y1={sy(0)} x2={sx(x)} y2={sy(rows)} stroke="var(--kk-border)" strokeWidth={0.8} />);
  }
  for (let y = 0; y <= rows; y++) {
    lines.push(<line key={`hy${y}`} x1={sx(0)} y1={sy(y)} x2={sx(cols)} y2={sy(y)} stroke="var(--kk-border)" strokeWidth={0.8} />);
  }

  const poly = placed.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ");
  const modelPoly = (model ?? []).map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ");

  const nodeEls: React.ReactNode[] = [];
  for (let x = 0; x <= cols; x++) {
    for (let y = 0; y <= rows; y++) {
      const idx = placed.findIndex(([vx, vy]) => vx === x && vy === y);
      const isPlaced = idx >= 0;
      const isPrefill = isPlaced && idx < prefillCount;
      nodeEls.push(
        <g key={`n${x}-${y}`} style={locked ? undefined : { cursor: "pointer" }} onClick={locked ? undefined : () => onPick([x, y])}>
          <circle cx={sx(x)} cy={sy(y)} r={U * 0.5} fill="transparent" />
          <circle cx={sx(x)} cy={sy(y)} r={isPlaced ? U * 0.26 : U * 0.14}
            fill={isPrefill ? "var(--kk-text)" : isPlaced ? "var(--kk-accent)" : "var(--kk-border)"} />
        </g>
      );
    }
  }

  const px = Math.min(380, Math.max(260, (cols + 1) * 46));
  return (
    <div className="kk-support kk-geo__grid">
      <svg width="100%" style={{ maxWidth: px }} viewBox={`0 0 ${Wv} ${Hv}`} role="img" aria-label="quadrillage à construire">
        {lines}
        {model && modelVisible && model.length >= 2 && (
          <polygon points={modelPoly} fill="#16a34a" fillOpacity={0.12} stroke="#16a34a" strokeWidth={2} strokeDasharray="4 2" />
        )}
        {placed.length >= 3 && (
          <polygon points={poly} fill="var(--kk-accent)" fillOpacity={0.14} stroke="var(--kk-accent)" strokeWidth={2} />
        )}
        {placed.length === 2 && (
          <polyline points={poly} fill="none" stroke="var(--kk-accent)" strokeWidth={2} strokeLinecap="round" />
        )}
        {nodeEls}
      </svg>
    </div>
  );
}

// --------------------------------------------------------------------------
// Solide 3D « tournable au doigt » : projection orthographique maison (aucune
// librairie). Sommets definis en 3D, tournes par glisser, faces triees par
// profondeur (peintre) puis aretes par-dessus.
// --------------------------------------------------------------------------
type V3 = [number, number, number];
interface Solid3D { verts: V3[]; faces: number[][]; }
const SOLID3D: Record<string, Solid3D> = {
  cube: {
    verts: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
    faces: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]],
  },
  pave: {
    verts: [[-1.5, -0.9, -0.7], [1.5, -0.9, -0.7], [1.5, 0.9, -0.7], [-1.5, 0.9, -0.7], [-1.5, -0.9, 0.7], [1.5, -0.9, 0.7], [1.5, 0.9, 0.7], [-1.5, 0.9, 0.7]],
    faces: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]],
  },
  pyramide: {
    verts: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [0, 1.4, 0]],
    faces: [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]],
  },
};

function Solid3DView({ solid }: { solid: SolidName }) {
  const def = SOLID3D[solid];
  const [yaw, setYaw] = useState(-0.6);
  const [pitch, setPitch] = useState(-0.5);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setYaw((y) => y + dx * 0.012);
    setPitch((p) => Math.max(-1.3, Math.min(1.3, p + dy * 0.012)));
  };
  const onUp = () => { drag.current = null; };

  const project = (v: V3): { x: number; y: number; z: number } => {
    const [x, y, z] = v;
    const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
    const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
    const sc = 24;
    return { x: 50 + x1 * sc, y: 50 - y2 * sc, z: z2 };
  };
  const pv = def.verts.map(project);
  const faces = def.faces
    .map((f, i) => ({ f, i, z: f.reduce((s, k) => s + pv[k].z, 0) / f.length }))
    .sort((a, b) => a.z - b.z); // du plus loin au plus proche
  const txt = "var(--kk-text)";
  const acc = "var(--kk-accent)";

  return (
    <div className="kk-support kk-geo__figure">
      <svg
        width="100%" style={{ maxWidth: 240, touchAction: "none", cursor: "grab" }}
        viewBox="0 0 100 100" role="img" aria-label={`solide à tourner : ${solid}`}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
      >
        {faces.map(({ f, i, z }) => {
          const pts = f.map((k) => `${pv[k].x.toFixed(1)},${pv[k].y.toFixed(1)}`).join(" ");
          const op = 0.12 + Math.max(0, Math.min(1, (z + 2) / 4)) * 0.3; // plus proche = plus visible
          return <polygon key={`f${i}`} points={pts} fill={acc} fillOpacity={op} stroke={txt} strokeWidth={1.6} strokeLinejoin="round" />;
        })}
      </svg>
      <p className="kk-hint" style={{ textAlign: "center", margin: "4px 0 0", opacity: 0.8 }}>
        <Move3d size={14} aria-hidden="true" /> tourne-le avec le doigt
      </p>
    </div>
  );
}

// --------------------------------------------------------------------------
// Regle graduee 1D (format 'regle'). Graduations en cm ; appui a la graduation
// la plus proche (cible large, regle defilante si besoin). mesurer/tracer = deux
// appuis (longueur) ; milieu = un appui (position du milieu).
// --------------------------------------------------------------------------
const CMPX = 42; // pixels par centimetre (cible tactile confortable)
function RuleView({ rule, taps, onTap, locked, attenduMm }: {
  rule: GeoRuleSpec; taps: number[]; onTap: (cm: number) => void; locked: boolean; attenduMm: number | null;
}) {
  const { maxCm, task, seg } = rule;
  const PAD = 24;
  const W = maxCm * CMPX + 2 * PAD;
  const H = 96;
  const xOf = (cm: number) => PAD + cm * CMPX;
  const yRule = 54;

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    if (locked) return;
    const svg = e.currentTarget;
    const r = svg.getBoundingClientRect();
    const xClient = (e.clientX - r.left) * (W / r.width);
    const cm = Math.round((xClient - PAD) / CMPX);
    if (cm >= 0 && cm <= maxCm) onTap(cm);
  };

  const ticks: React.ReactNode[] = [];
  for (let c = 0; c <= maxCm; c++) {
    const x = xOf(c);
    ticks.push(<line key={`t${c}`} x1={x} y1={yRule} x2={x} y2={yRule + 16} stroke="var(--kk-text)" strokeWidth={1.4} />);
    ticks.push(<text key={`n${c}`} x={x} y={yRule + 30} textAnchor="middle" fontSize={11} fill="var(--kk-text)">{c}</text>);
    if (c < maxCm) {
      const xh = x + CMPX / 2;
      ticks.push(<line key={`h${c}`} x1={xh} y1={yRule} x2={xh} y2={yRule + 9} stroke="var(--kk-border)" strokeWidth={1.1} />);
    }
  }

  return (
    <div className="kk-support kk-geo__grid" style={{ overflowX: "auto" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="règle graduée"
        style={{ touchAction: "none", maxWidth: "none" }} onPointerDown={pick}>
        {/* corps de la regle */}
        <rect x={PAD} y={yRule} width={maxCm * CMPX} height={20} fill="var(--kk-support-bg, #fff8e1)" stroke="var(--kk-text)" strokeWidth={1.4} />
        {ticks}
        {/* segment pose (mesurer / milieu) */}
        {seg && (
          <line x1={xOf(seg.a)} y1={yRule - 14} x2={xOf(seg.b)} y2={yRule - 14} stroke="var(--kk-accent)" strokeWidth={5} strokeLinecap="round" />
        )}
        {seg && [seg.a, seg.b].map((c, i) => (
          <line key={`cap${i}`} x1={xOf(c)} y1={yRule - 20} x2={xOf(c)} y2={yRule - 8} stroke="var(--kk-accent)" strokeWidth={2} />
        ))}
        {/* appuis de l'enfant */}
        {taps.map((c, i) => (
          <g key={`tap${i}`}>
            <line x1={xOf(c)} y1={yRule - 24} x2={xOf(c)} y2={yRule + 18} stroke="#E06A00" strokeWidth={2.4} />
            <circle cx={xOf(c)} cy={yRule - 24} r={5} fill="#E06A00" />
          </g>
        ))}
        {/* trait trace entre deux appuis */}
        {task !== "milieu" && taps.length >= 2 && (
          <line x1={xOf(taps[0])} y1={yRule - 14} x2={xOf(taps[1])} y2={yRule - 14} stroke="#16a34a" strokeWidth={5} strokeLinecap="round" />
        )}
        {/* correction : milieu attendu */}
        {locked && task === "milieu" && attenduMm != null && (
          <circle cx={xOf(attenduMm / 10)} cy={yRule - 14} r={6} fill="#16a34a" />
        )}
      </svg>
    </div>
  );
}

// --------------------------------------------------------------------------
// Compas 2D (format 'cercle'). Surface au cm, appui au noeud le plus proche.
// Premier appui = pointe (centre), sauf centre impose ; deuxieme = ecartement.
// --------------------------------------------------------------------------
function CompassView({ compass, taps, onTap, locked }: {
  compass: GeoCompassSpec; taps: Pt[]; onTap: (p: Pt) => void; locked: boolean;
}) {
  const { wCm, hCm, points = [], centerFixed } = compass;
  const px = Math.min(44, Math.floor(340 / wCm)); // px par cm
  const PAD = 20;
  const W = wCm * px + 2 * PAD;
  const H = hCm * px + 2 * PAD;
  const sx = (cm: number) => PAD + cm * px;
  const sy = (cm: number) => PAD + (hCm - cm) * px; // y vers le haut

  const centerMm: Pt | null = centerFixed ? [centerFixed.x * 10, centerFixed.y * 10] : taps.length >= 1 ? taps[0] : null;
  const edgeMm: Pt | null = centerFixed ? (taps[0] ?? null) : (taps[1] ?? null);
  const rPx = centerMm && edgeMm ? Math.hypot((edgeMm[0] - centerMm[0]) / 10, (edgeMm[1] - centerMm[1]) / 10) * px : 0;

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    if (locked) return;
    const svg = e.currentTarget;
    const r = svg.getBoundingClientRect();
    const xc = (e.clientX - r.left) * (W / r.width);
    const yc = (e.clientY - r.top) * (H / r.height);
    const col = Math.round((xc - PAD) / px);
    const row = Math.round((hCm - (yc - PAD) / px));
    if (col < 0 || col > wCm || row < 0 || row > hCm) return;
    onTap([col * 10, row * 10]);
  };

  const dots: React.ReactNode[] = [];
  for (let c = 0; c <= wCm; c++) for (let r = 0; r <= hCm; r++) {
    dots.push(<circle key={`d${c}-${r}`} cx={sx(c)} cy={sy(r)} r={1.4} fill="var(--kk-border)" />);
  }

  return (
    <div className="kk-support kk-geo__grid" style={{ overflow: "auto" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="surface pour le compas"
        style={{ touchAction: "none", maxWidth: "100%" }} onPointerDown={pick}>
        {dots}
        {/* reperes donnes (O, A...) */}
        {points.map((p, i) => (
          <g key={`p${i}`}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={4} fill="var(--kk-text)" />
            {p.label && <text x={sx(p.x) + 6} y={sy(p.y) - 6} fontSize={13} fontWeight={700} fill="var(--kk-text)">{p.label}</text>}
          </g>
        ))}
        {/* cercle trace */}
        {centerMm && edgeMm && rPx > 0 && (
          <circle cx={sx(centerMm[0] / 10)} cy={sy(centerMm[1] / 10)} r={rPx} fill="var(--kk-accent)" fillOpacity={0.12} stroke="var(--kk-accent)" strokeWidth={2.2} />
        )}
        {/* pointe (centre) */}
        {centerMm && <circle cx={sx(centerMm[0] / 10)} cy={sy(centerMm[1] / 10)} r={4.5} fill="#E06A00" />}
        {/* point du cercle (ecartement) */}
        {edgeMm && <circle cx={sx(edgeMm[0] / 10)} cy={sy(edgeMm[1] / 10)} r={4.5} fill="#16a34a" />}
      </svg>
    </div>
  );
}

// --------------------------------------------------------------------------
// Patron(s) de cube (format 'patron'). Dessine un ou plusieurs patrons (cases) ;
// pour le choix, chaque patron est une grande cible ; a la correction, petite
// animation : le bon patron se « replie » (fondu vers un cube).
// --------------------------------------------------------------------------
function NetDrawing({ cells, size = 26, color = "var(--kk-accent)" }: { cells: Cell[]; size?: number; color?: string }) {
  const minC = Math.min(...cells.map((c) => c[0]));
  const minR = Math.min(...cells.map((c) => c[1]));
  const maxC = Math.max(...cells.map((c) => c[0]));
  const maxR = Math.max(...cells.map((c) => c[1]));
  const W = (maxC - minC + 1) * size;
  const H = (maxR - minR + 1) * size;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="patron">
      {cells.map((c, i) => (
        <rect key={i} x={(c[0] - minC) * size} y={(maxR - c[1]) * size} width={size} height={size}
          fill={color} fillOpacity={0.3} stroke="var(--kk-text)" strokeWidth={1.6} />
      ))}
    </svg>
  );
}

function NetView({ net, choice, onChoose, locked, bonId }: {
  net: GeoNetSpec; choice: string | null; onChoose: (id: string) => void; locked: boolean; bonId: string | null;
}) {
  if (net.choices) {
    return (
      <div className="kk-row" style={{ justifyContent: "center", flexWrap: "wrap", gap: 12 }}>
        {net.choices.map((ch) => {
          const sel = choice === ch.id;
          const bon = locked && bonId === ch.id;
          return (
            <button key={ch.id} type="button" disabled={locked}
              onClick={() => onChoose(ch.id)}
              className="kk-btn"
              style={{
                padding: 10, minHeight: 44,
                outline: sel ? "3px solid var(--kk-accent)" : bon ? "3px solid #16a34a" : "2px solid var(--kk-border)",
                background: bon ? "rgba(22,163,74,0.08)" : undefined,
                animation: bon ? "kk-fold 1.2s ease-in-out" : undefined,
              }}
              aria-pressed={sel} aria-label={`patron ${ch.id}`}>
              <NetDrawing cells={ch.cells} color={bon ? "#16a34a" : "var(--kk-accent)"} />
            </button>
          );
        })}
      </div>
    );
  }
  // patron unique (juge) : le dessin se replie a la correction
  return (
    <div className="kk-support kk-geo__figure" style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ animation: locked ? "kk-fold 1.2s ease-in-out" : undefined }}>
        <NetDrawing cells={net.cells ?? []} size={30} />
      </div>
    </div>
  );
}

export default function Geometrie({ item, onSoumettre, onContinuer }: Props) {
  const [choix, setChoix] = useState<string | null>(null); // qcm / clic / point
  const [colored, setColored] = useState<string[]>([]); // grille color
  const [saisie, setSaisie] = useState(""); // texte
  const [vertices, setVertices] = useState<Pt[]>([]); // sommets ajoutes par l'enfant (construire / reproduire)
  const [tokens, setTokens] = useState<ProgToken[]>([]); // programme
  const [multiSel, setMultiSel] = useState<string[]>([]); // selection multiple (equerre)
  const [robotCell, setRobotCell] = useState<string | null>(null); // apercu du robot
  const [modelVisible, setModelVisible] = useState(true); // modele a reproduire (memoire)
  const [ruleTaps, setRuleTaps] = useState<number[]>([]); // appuis sur la regle (cm)
  const [compassTaps, setCompassTaps] = useState<Pt[]>([]); // appuis du compas (mm)
  const [netChoice, setNetChoice] = useState<string | null>(null); // patron choisi (id)
  const [netJuge, setNetJuge] = useState<"oui" | "non" | null>(null); // reponse oui/non (patron juge)
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ correct: boolean } | null>(null);
  const [erreurReseau, setErreurReseau] = useState(false);

  const isColor = item.format === "grille" && item.interact === "color";
  const isPoint = item.format === "grille" && item.interact === "point";
  const isMulti = item.format === "grille" && item.interact === "multi";
  const gridClic = item.format === "clic" && item.figure.kind === "grid";
  const isConstruire = item.format === "construire" && item.figure.kind === "build";
  const isReproduire = item.format === "reproduire" && item.figure.kind === "build";
  const isBuild = isConstruire || isReproduire;
  const isProgramme = item.format === "programme" && item.figure.kind === "grid";
  const grid = item.figure.kind === "grid" ? item.figure.grid : null;
  const buildFig = item.figure.kind === "build" ? item.figure : null;
  const prefill = buildFig?.prefill ?? [];
  const programAffiche = grid?.program ?? null; // programme a LIRE (clic)

  // Partie 2 : regle, compas, patrons.
  const ruleFig = item.format === "regle" && item.figure.kind === "rule" ? item.figure.rule : null;
  const compassFig = item.format === "cercle" && item.figure.kind === "compass" ? item.figure.compass : null;
  const netFig = item.format === "patron" && item.figure.kind === "net" ? item.figure.net : null;
  const isPatronChoix = Boolean(netFig?.choices);
  const isPatronJuge = Boolean(netFig && !netFig.choices);
  // Patron a surligner a la correction (choix) : celui dont les cases == attendu.
  const bonNetId = netFig?.choices?.find((c) => JSON.stringify(c.cells) === item.attendu)?.id ?? null;

  // « Refaire de memoire » : le modele reste visible 3 s puis se cache.
  const memoire = Boolean(buildFig?.memoire);
  useEffect(() => {
    if (!memoire) return;
    setModelVisible(true);
    const t = setTimeout(() => setModelVisible(false), 3000);
    return () => clearTimeout(t);
  }, [memoire, item.cle]);

  // Sommets dessines = prefill (verrouilles) + ceux de l'enfant.
  const placed = useMemo(() => [...prefill, ...vertices], [prefill, vertices]);

  // Points du compas : [pointe, point du cercle]. Pointe imposee si centerFixed.
  const compassPts = useMemo((): Pt[] | null => {
    if (!compassFig) return null;
    if (compassFig.centerFixed) {
      const c: Pt = [compassFig.centerFixed.x * 10, compassFig.centerFixed.y * 10];
      return compassTaps.length >= 1 ? [c, compassTaps[0]] : null;
    }
    return compassTaps.length >= 2 ? [compassTaps[0], compassTaps[1]] : null;
  }, [compassFig, compassTaps]);

  // Reponse courante (texte envoye au serveur) selon le format.
  const reponse = useMemo(() => {
    if (item.format === "qcm") return choix ?? "";
    if (item.format === "texte") return saisie;
    if (isColor) return canonCells(colored);
    if (isMulti) return canonCells(multiSel);
    if (isBuild) return placed.length >= 2 ? JSON.stringify(placed) : "";
    if (isProgramme) return tokens.length >= 1 ? JSON.stringify(tokens) : "";
    if (ruleFig) {
      if (ruleFig.task === "milieu") return ruleTaps.length >= 1 ? String(ruleTaps[0] * 10) : "";
      return ruleTaps.length >= 2 ? String(Math.abs(ruleTaps[1] - ruleTaps[0]) * 10) : "";
    }
    if (compassFig) return compassPts ? JSON.stringify(compassPts) : "";
    if (isPatronChoix) {
      const ch = netFig?.choices?.find((c) => c.id === netChoice);
      return ch ? JSON.stringify(ch.cells) : "";
    }
    if (isPatronJuge) return netJuge ?? "";
    return choix ?? ""; // clic (figure ou grille) / point
  }, [item.format, isColor, isMulti, isBuild, isProgramme, choix, saisie, colored, multiSel, placed, tokens,
    ruleFig, ruleTaps, compassFig, compassPts, isPatronChoix, isPatronJuge, netFig, netChoice, netJuge]);

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

  const toggleCell = (code: string) => {
    if (res) return;
    setColored((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const pickNode = (p: Pt) => {
    if (res) return;
    setVertices((prev) => [...prev, p]);
  };

  const toggleMulti = (name: string) => {
    if (res) return;
    setMultiSel((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };
  // Sommets « angle droit » attendus (equerre), pour le surlignage apres coup.
  const attenduMultiSet = useMemo(
    () => new Set(item.attendu.toUpperCase().split(";").filter(Boolean)),
    [item.attendu],
  );

  const addToken = (t: ProgToken) => {
    if (res) return;
    setRobotCell(null);
    setTokens((prev) => [...prev, t]);
  };

  // Apercu local du deplacement (le serveur reste seul juge).
  const essayer = () => {
    if (!grid || tokens.length === 0) return;
    const arr = simulerProgramme(
      { cols: grid.cols, rows: grid.rows, start: grid.start ?? "A1", dir: grid.dir ?? "N", target: grid.target ?? "A1", obstacles: grid.obstacles ?? [] },
      tokens,
    );
    setRobotCell(arr ?? grid.start ?? null);
  };

  const fig = item.figure;
  const gridMode: "none" | "color" | "point" | "clickCell" = isColor
    ? "color"
    : isPoint
      ? "point"
      : gridClic
        ? "clickCell"
        : "none";

  // Robot a afficher : apercu si demande, sinon au depart (lecture / assemblage).
  const robotAffiche: { cell: string; dir: Dir } | null = grid && (isProgramme || programAffiche)
    ? { cell: robotCell ?? grid.start ?? "A1", dir: grid.dir ?? "N" }
    : null;

  return (
    <div className="kk-stack kk-geo">
      <p className="kk-lead" style={{ textAlign: "center", margin: "0 auto" }}>{item.consigne}</p>

      {/* Programme a LIRE : cartes affichees en toutes lettres. */}
      {programAffiche && (
        <div className="kk-geo__cards" role="list" aria-label="programme à lire">
          {programAffiche.map((t, i) => (
            <span key={i} role="listitem" className="kk-chip">{i + 1}. {PROG_LABEL[t]}</span>
          ))}
        </div>
      )}

      {/* Figure */}
      {fig.kind === "solid" && (SOLIDES_3D.includes(fig.solid) ? <Solid3DView solid={fig.solid} /> : <SolidView solid={fig.solid} />)}
      {fig.kind === "shapes" && (
        <div className="kk-support kk-geo__figure">
          <svg width="100%" style={{ maxWidth: 320 }} viewBox="0 0 100 100" role="img" aria-label="figure">
            {fig.shapes.map((s, i) => {
              const hiAfter = res && s.name != null
                && (isMulti ? attenduMultiSet.has(s.name.toUpperCase()) : comparerGeometrie("clic", s.name, item.attendu));
              const sel = isMulti
                ? s.name != null && multiSel.includes(s.name)
                : item.format === "clic" && choix != null && s.name === choix;
              return (
                <ShapeEl
                  key={i}
                  s={res ? { ...s, hi: Boolean(hiAfter) } : s}
                  clickable={(item.format === "clic" || isMulti) && !res}
                  selected={Boolean(sel)}
                  onPick={() => {
                    if (res || !s.name) return;
                    if (isMulti) toggleMulti(s.name);
                    else setChoix(s.name);
                  }}
                />
              );
            })}
          </svg>
        </div>
      )}
      {fig.kind === "build" && (
        <BuildView
          cols={fig.cols} rows={fig.rows} placed={placed} prefillCount={prefill.length}
          model={fig.model} modelVisible={memoire ? modelVisible : true}
          onPick={pickNode} locked={Boolean(res)}
        />
      )}
      {memoire && !modelVisible && !res && (
        <p className="kk-lead" style={{ textAlign: "center", margin: 0 }}>Le modèle est caché. À toi de le refaire&nbsp;!</p>
      )}
      {fig.kind === "grid" && (
        <GridView
          spec={res && (gridMode === "point" || gridMode === "clickCell") ? { ...fig.grid, target: item.attendu } : fig.grid}
          mode={res ? "none" : gridMode}
          colored={colored}
          selectedCell={choix}
          robot={robotAffiche}
          goal={isProgramme ? fig.grid.target ?? null : null}
          obstacles={fig.grid.obstacles}
          onToggleCell={toggleCell}
          onPickCell={(c) => !res && setChoix(c)}
          onPickNode={(c) => !res && setChoix(c)}
        />
      )}

      {/* REGLE graduee (mesurer / tracer / milieu). */}
      {ruleFig && (
        <>
          <RuleView
            rule={ruleFig} taps={ruleTaps} locked={Boolean(res)}
            attenduMm={res ? Number(item.attendu) : null}
            onTap={(cm) => {
              if (res) return;
              setRuleTaps((prev) => {
                if (ruleFig.task === "milieu") return [cm];
                if (prev.length >= 2) return [cm];
                return [...prev, cm];
              });
            }}
          />
          {!res && ruleTaps.length > 0 && (
            <div className="kk-row" style={{ justifyContent: "center" }}>
              <button type="button" className="kk-btn" onClick={() => setRuleTaps([])}>
                <RotateCcw size={18} aria-hidden="true" /> Effacer
              </button>
            </div>
          )}
        </>
      )}

      {/* COMPAS (tracer un cercle). */}
      {compassFig && (
        <>
          <CompassView
            compass={compassFig} taps={compassTaps} locked={Boolean(res)}
            onTap={(p) => {
              if (res) return;
              const max = compassFig.centerFixed ? 1 : 2;
              setCompassTaps((prev) => (prev.length >= max ? [p] : [...prev, p]));
            }}
          />
          {!res && compassTaps.length > 0 && (
            <div className="kk-row" style={{ justifyContent: "center" }}>
              <button type="button" className="kk-btn" onClick={() => setCompassTaps([])}>
                <RotateCcw size={18} aria-hidden="true" /> Effacer
              </button>
            </div>
          )}
        </>
      )}

      {/* PATRON de cube. */}
      {netFig && (
        <NetView net={netFig} choice={netChoice} locked={Boolean(res)} bonId={bonNetId}
          onChoose={(id) => { if (!res) setNetChoice(id); }} />
      )}
      {isPatronJuge && !res && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          {(["oui", "non"] as const).map((v) => (
            <button key={v} type="button"
              className={`kk-btn kk-btn--accent${netJuge === v ? " kk-qcm__opt--active" : ""}`}
              aria-pressed={netJuge === v} onClick={() => setNetJuge(v)}>
              {v}
            </button>
          ))}
        </div>
      )}

      {/* CONSTRUIRE / REPRODUIRE : commandes annuler / effacer. */}
      {isBuild && !res && (
        <div className="kk-row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" className="kk-btn" disabled={vertices.length === 0} onClick={() => setVertices((p) => p.slice(0, -1))}>
            <Undo2 size={18} aria-hidden="true" /> Annuler le dernier point
          </button>
          <button type="button" className="kk-btn" disabled={vertices.length === 0} onClick={() => setVertices([])}>
            <RotateCcw size={18} aria-hidden="true" /> Tout effacer
          </button>
        </div>
      )}

      {/* PROGRAMME : cartes assemblees + boutons. */}
      {isProgramme && (
        <>
          <div className="kk-geo__cards" role="list" aria-label="ton programme">
            {tokens.length === 0 && <span className="kk-chip kk-chip--empty">Ton programme est vide</span>}
            {tokens.map((t, i) => (
              <span key={i} role="listitem" className="kk-chip">{i + 1}. {PROG_LABEL[t]}</span>
            ))}
          </div>
          {!res && (
            <>
              <div className="kk-row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" className="kk-btn kk-btn--accent" onClick={() => addToken("avance")}>avance</button>
                <button type="button" className="kk-btn kk-btn--accent" onClick={() => addToken("gauche")}>tourne à gauche</button>
                <button type="button" className="kk-btn kk-btn--accent" onClick={() => addToken("droite")}>tourne à droite</button>
              </div>
              <div className="kk-row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" className="kk-btn" disabled={tokens.length === 0} onClick={essayer}>
                  <Play size={18} aria-hidden="true" /> Essayer
                </button>
                <button type="button" className="kk-btn" disabled={tokens.length === 0} onClick={() => { setTokens((p) => p.slice(0, -1)); setRobotCell(null); }}>
                  <Undo2 size={18} aria-hidden="true" /> Enlever la dernière carte
                </button>
                <button type="button" className="kk-btn" disabled={tokens.length === 0} onClick={() => { setTokens([]); setRobotCell(null); }}>
                  <RotateCcw size={18} aria-hidden="true" /> Tout effacer
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* QCM : gros boutons empiles. */}
      {item.format === "qcm" && item.options && (
        <div className="kk-qcm">
          {item.options.map((o, i) => {
            const choisi = choix === o;
            const bon = res && comparerGeometrie("qcm", o, item.attendu);
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
