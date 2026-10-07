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

import { useMemo, useState } from "react";
import { Check, RotateCcw, Undo2, Play } from "lucide-react";
import type { GeoRender, GeoShape, GeoGridSpec, SolidName, Dir, ProgToken } from "../domain/geometrie/geometrie";
import { canonCells, comparerGeometrie, simulerProgramme } from "../domain/geometrie/geometrie";

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
  cols, rows, vertices, onPick, locked,
}: {
  cols: number; rows: number; vertices: Array<[number, number]>; onPick: (p: [number, number]) => void; locked: boolean;
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

  const poly = vertices.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ");

  const nodeEls: React.ReactNode[] = [];
  for (let x = 0; x <= cols; x++) {
    for (let y = 0; y <= rows; y++) {
      const idx = vertices.findIndex(([vx, vy]) => vx === x && vy === y);
      const placed = idx >= 0;
      nodeEls.push(
        <g key={`n${x}-${y}`} style={locked ? undefined : { cursor: "pointer" }} onClick={locked ? undefined : () => onPick([x, y])}>
          <circle cx={sx(x)} cy={sy(y)} r={U * 0.5} fill="transparent" />
          <circle cx={sx(x)} cy={sy(y)} r={placed ? U * 0.26 : U * 0.14} fill={placed ? "var(--kk-accent)" : "var(--kk-border)"} />
        </g>
      );
    }
  }

  const px = Math.min(380, Math.max(260, (cols + 1) * 46));
  return (
    <div className="kk-support kk-geo__grid">
      <svg width="100%" style={{ maxWidth: px }} viewBox={`0 0 ${Wv} ${Hv}`} role="img" aria-label="quadrillage à construire">
        {lines}
        {vertices.length >= 3 && (
          <polygon points={poly} fill="var(--kk-accent)" fillOpacity={0.14} stroke="var(--kk-accent)" strokeWidth={2} />
        )}
        {vertices.length === 2 && (
          <polyline points={poly} fill="none" stroke="var(--kk-accent)" strokeWidth={2} strokeLinecap="round" />
        )}
        {nodeEls}
      </svg>
    </div>
  );
}

export default function Geometrie({ item, onSoumettre, onContinuer }: Props) {
  const [choix, setChoix] = useState<string | null>(null); // qcm / clic / point
  const [colored, setColored] = useState<string[]>([]); // grille color
  const [saisie, setSaisie] = useState(""); // texte
  const [vertices, setVertices] = useState<Array<[number, number]>>([]); // construire
  const [tokens, setTokens] = useState<ProgToken[]>([]); // programme
  const [robotCell, setRobotCell] = useState<string | null>(null); // apercu du robot
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ correct: boolean } | null>(null);
  const [erreurReseau, setErreurReseau] = useState(false);

  const isColor = item.format === "grille" && item.interact === "color";
  const isPoint = item.format === "grille" && item.interact === "point";
  const gridClic = item.format === "clic" && item.figure.kind === "grid";
  const isConstruire = item.format === "construire" && item.figure.kind === "build";
  const isProgramme = item.format === "programme" && item.figure.kind === "grid";
  const grid = item.figure.kind === "grid" ? item.figure.grid : null;
  const programAffiche = grid?.program ?? null; // programme a LIRE (clic)

  // Reponse courante (texte envoye au serveur) selon le format.
  const reponse = useMemo(() => {
    if (item.format === "qcm") return choix ?? "";
    if (item.format === "texte") return saisie;
    if (isColor) return canonCells(colored);
    if (isConstruire) return vertices.length >= 2 ? JSON.stringify(vertices) : "";
    if (isProgramme) return tokens.length >= 1 ? JSON.stringify(tokens) : "";
    return choix ?? ""; // clic (figure ou grille) / point
  }, [item.format, isColor, isConstruire, isProgramme, choix, saisie, colored, vertices, tokens]);

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

  const pickNode = (p: [number, number]) => {
    if (res) return;
    setVertices((prev) => [...prev, p]);
  };

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
      {fig.kind === "solid" && <SolidView solid={fig.solid} />}
      {fig.kind === "shapes" && (
        <div className="kk-support kk-geo__figure">
          <svg width="100%" style={{ maxWidth: 320 }} viewBox="0 0 100 100" role="img" aria-label="figure">
            {fig.shapes.map((s, i) => (
              <ShapeEl
                key={i}
                s={res ? { ...s, hi: s.name != null && comparerGeometrie("clic", s.name, item.attendu) } : s}
                clickable={item.format === "clic" && !res}
                selected={item.format === "clic" && choix != null && s.name === choix}
                onPick={() => !res && s.name && setChoix(s.name)}
              />
            ))}
          </svg>
        </div>
      )}
      {fig.kind === "build" && (
        <BuildView cols={fig.cols} rows={fig.rows} vertices={vertices} onPick={pickNode} locked={Boolean(res)} />
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

      {/* CONSTRUIRE : commandes annuler / effacer. */}
      {isConstruire && !res && (
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
