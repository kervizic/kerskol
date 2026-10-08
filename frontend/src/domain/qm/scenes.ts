// Scenes SVG maison pour « Questionner le monde » (format clic / illustration).
// Primitives simples, couleurs de theme (var(--kk-*)). Aucune image protegee.
// Chaque scene est DETERMINISTE (tests golden stables).

import type { QmScene, QmSceneEl, QmZone } from "./types";

const WIRE = "var(--kk-text)";

// --------------------------------------------------------------------------
// Circuit electrique simple (pile, ampoule, fils, interrupteur). Boucle
// rectangulaire ; ampoule en haut, pile en bas, interrupteur a droite.
//   closed   : interrupteur ferme (levier vertical) ou ouvert (levier releve) ;
//   broken   : un fil est coupe (petite coupure en bas a gauche) ;
//   withZones: ajoute 3 zones cliquables (l'ampoule, l'interrupteur, la pile).
// L'ampoule s'allume SSI closed ET non broken (simulation simple cote serveur
// via l'attendu de l'item).
// --------------------------------------------------------------------------
export function circuitScene(opts: { closed: boolean; broken?: boolean; withZones?: boolean }): QmScene {
  const broken = opts.broken ?? false;
  const lit = opts.closed && !broken;
  const els: QmSceneEl[] = [
    // Fil gauche + haut + droite (avec coupures pour les composants).
    { t: "line", x1: 24, y1: 24, x2: 24, y2: 78, stroke: WIRE, sw: 2 }, // gauche
    { t: "line", x1: 24, y1: 24, x2: 51, y2: 24, stroke: WIRE, sw: 2 }, // haut-gauche
    { t: "line", x1: 69, y1: 24, x2: 96, y2: 24, stroke: WIRE, sw: 2 }, // haut-droite
    { t: "line", x1: 96, y1: 24, x2: 96, y2: 42, stroke: WIRE, sw: 2 }, // droite-haut
    { t: "line", x1: 96, y1: 58, x2: 96, y2: 78, stroke: WIRE, sw: 2 }, // droite-bas
    { t: "line", x1: 68, y1: 78, x2: 96, y2: 78, stroke: WIRE, sw: 2 }, // bas-droite
    // Ampoule (cercle + filament en croix). Allumee -> halo jaune.
    ...(lit
      ? [{ t: "circle" as const, cx: 60, cy: 24, r: 13, fill: "#fde047", stroke: "none", opacity: 0.6 }]
      : []),
    { t: "circle", cx: 60, cy: 24, r: 9, stroke: WIRE, sw: 2, fill: "none" },
    { t: "line", x1: 54, y1: 19, x2: 66, y2: 29, stroke: WIRE, sw: 1.2 },
    { t: "line", x1: 54, y1: 29, x2: 66, y2: 19, stroke: WIRE, sw: 1.2 },
    // Pile (deux plaques : longue = +, courte epaisse = -).
    { t: "line", x1: 57, y1: 71, x2: 57, y2: 85, stroke: WIRE, sw: 1.2 },
    { t: "line", x1: 63, y1: 74, x2: 63, y2: 82, stroke: WIRE, sw: 3 },
    // Interrupteur (contact haut + pivot bas + levier).
    { t: "circle", cx: 96, cy: 42, r: 2, fill: WIRE, stroke: "none" },
    { t: "circle", cx: 96, cy: 58, r: 2, fill: WIRE, stroke: "none" },
    opts.closed
      ? { t: "line", x1: 96, y1: 58, x2: 96, y2: 42, stroke: WIRE, sw: 2 }
      : { t: "line", x1: 96, y1: 58, x2: 86, y2: 44, stroke: WIRE, sw: 2 },
  ];
  // Fil du bas gauche : entier ou coupe.
  if (broken) {
    els.push({ t: "line", x1: 24, y1: 78, x2: 36, y2: 78, stroke: WIRE, sw: 2 });
    els.push({ t: "line", x1: 44, y1: 78, x2: 52, y2: 78, stroke: WIRE, sw: 2 });
    els.push({ t: "line", x1: 37, y1: 74, x2: 41, y2: 82, stroke: WIRE, sw: 1.2 });
    els.push({ t: "line", x1: 43, y1: 74, x2: 39, y2: 82, stroke: WIRE, sw: 1.2 });
  } else {
    els.push({ t: "line", x1: 24, y1: 78, x2: 52, y2: 78, stroke: WIRE, sw: 2 });
  }
  const zones: QmZone[] = opts.withZones
    ? [
        { label: "l'ampoule", shape: "rect", x: 50, y: 13, w: 20, h: 20 },
        { label: "l'interrupteur", shape: "rect", x: 84, y: 36, w: 22, h: 28 },
        { label: "la pile", shape: "rect", x: 50, y: 69, w: 22, h: 20 },
      ]
    : [];
  return { kind: "scene", viewBox: "0 0 120 96", els, zones };
}

// --------------------------------------------------------------------------
// Planisphere SIMPLIFIE maison (aucune carte sous licence) : fond ocean + 5
// continents schematiques (ellipses) etiquetes. Zones cliquables sur chaque
// continent. viewBox large (160 x 90).
// --------------------------------------------------------------------------
const CONTINENT = "#86efac"; // vert clair
const OCEAN = "#bae6fd"; // bleu clair
export function planisphereScene(opts: { withZones?: boolean } = {}): QmScene {
  const conts: Array<{ label: string; cx: number; cy: number; rx: number; ry: number; tag: string; zx: number; zy: number; zw: number; zh: number }> = [
    { label: "l'Amérique", cx: 28, cy: 48, rx: 15, ry: 30, tag: "Amérique", zx: 13, zy: 18, zw: 30, zh: 60 },
    { label: "l'Europe", cx: 82, cy: 26, rx: 8, ry: 7, tag: "Europe", zx: 73, zy: 17, zw: 18, zh: 17 },
    { label: "l'Afrique", cx: 86, cy: 58, rx: 13, ry: 19, tag: "Afrique", zx: 72, zy: 38, zw: 28, zh: 40 },
    { label: "l'Asie", cx: 120, cy: 32, rx: 24, ry: 15, tag: "Asie", zx: 96, zy: 16, zw: 48, zh: 32 },
    { label: "l'Océanie", cx: 134, cy: 70, rx: 10, ry: 7, tag: "Océanie", zx: 123, zy: 62, zw: 22, zh: 16 },
  ];
  const els: QmSceneEl[] = [
    { t: "rect", x: 2, y: 2, w: 156, h: 86, fill: OCEAN, stroke: "var(--kk-border)", sw: 1, opacity: 0.55 },
  ];
  for (const c of conts) {
    els.push({ t: "ellipse", cx: c.cx, cy: c.cy, rx: c.rx, ry: c.ry, fill: CONTINENT, stroke: "var(--kk-text)", sw: 1 });
    els.push({ t: "text", x: c.cx, y: c.cy + 2, text: c.tag, fontSize: 7, fill: "var(--kk-text)" });
  }
  const zones: QmZone[] = opts.withZones
    ? conts.map((c) => ({ label: c.label, shape: "rect" as const, x: c.zx, y: c.zy, w: c.zw, h: c.zh }))
    : [];
  return { kind: "scene", viewBox: "0 0 160 90", els, zones };
}

// --------------------------------------------------------------------------
// Rose des vents maison : croix nord/sud/est/ouest. Zones cliquables aux 4 tips.
// --------------------------------------------------------------------------
export function roseVentsScene(opts: { withZones?: boolean } = {}): QmScene {
  const els: QmSceneEl[] = [
    { t: "line", x1: 50, y1: 16, x2: 50, y2: 84, stroke: "var(--kk-text)", sw: 2 },
    { t: "line", x1: 16, y1: 50, x2: 84, y2: 50, stroke: "var(--kk-text)", sw: 2 },
    { t: "polygon", points: "50,12 46,22 54,22", fill: "var(--kk-accent)", stroke: "none" }, // fleche nord
    { t: "circle", cx: 50, cy: 50, r: 3, fill: "var(--kk-text)", stroke: "none" },
    { t: "text", x: 50, y: 10, text: "N", fontSize: 10, fill: "var(--kk-text)" },
    { t: "text", x: 50, y: 95, text: "S", fontSize: 10, fill: "var(--kk-text)" },
    { t: "text", x: 90, y: 53, text: "E", fontSize: 10, fill: "var(--kk-text)" },
    { t: "text", x: 10, y: 53, text: "O", fontSize: 10, fill: "var(--kk-text)" },
  ];
  const zones: QmZone[] = opts.withZones
    ? [
        { label: "le nord", shape: "rect", x: 38, y: 4, w: 24, h: 22 },
        { label: "le sud", shape: "rect", x: 38, y: 74, w: 24, h: 22 },
        { label: "l'est", shape: "rect", x: 74, y: 38, w: 22, h: 24 },
        { label: "l'ouest", shape: "rect", x: 4, y: 38, w: 22, h: 24 },
      ]
    : [];
  return { kind: "scene", viewBox: "0 0 100 100", els, zones };
}

// --------------------------------------------------------------------------
// Calendrier d'un mois (grille 7 colonnes = jours de la semaine). En-tete avec
// les jours abreges, puis les numeros 1..days (debut lundi). Zones cliquables :
// chaque COLONNE est un jour de la semaine (clic « clique sur le mercredi »).
// --------------------------------------------------------------------------
const JOURS_ABR = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
export function monthScene(opts: { days?: number; withDayZones?: boolean } = {}): QmScene {
  const days = opts.days ?? 28;
  const COLW = 24;
  const HEADH = 16;
  const ROWH = 20;
  const rows = Math.ceil(days / 7);
  const H = HEADH + rows * ROWH;
  const els: QmSceneEl[] = [];
  for (let i = 0; i < 7; i++) {
    els.push({ t: "rect", x: i * COLW, y: 0, w: COLW, h: HEADH, fill: "var(--kk-border)", stroke: "var(--kk-text)", sw: 0.8 });
    els.push({ t: "text", x: i * COLW + COLW / 2, y: HEADH / 2 + 3, text: JOURS_ABR[i], fontSize: 7, fill: "var(--kk-text)" });
  }
  for (let d = 1; d <= days; d++) {
    const col = (d - 1) % 7;
    const row = Math.floor((d - 1) / 7);
    const x = col * COLW;
    const y = HEADH + row * ROWH;
    els.push({ t: "rect", x, y, w: COLW, h: ROWH, fill: "none", stroke: "var(--kk-border)", sw: 0.8 });
    els.push({ t: "text", x: x + COLW / 2, y: y + ROWH / 2 + 3, text: String(d), fontSize: 8, fill: "var(--kk-text)" });
  }
  const zones: QmZone[] = opts.withDayZones
    ? JOURS.map((j, i) => ({ label: j, shape: "rect" as const, x: i * COLW, y: 0, w: COLW, h: H }))
    : [];
  return { kind: "scene", viewBox: `0 0 ${7 * COLW} ${H}`, els, zones };
}
