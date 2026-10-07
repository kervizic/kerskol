// Banque d'exercices de GEOMETRIE et de REPERAGE (maths, CE2, programme cycle 2
// revise 2024). Deux sous-matieres, domaines dedies :
//
//   GEOMETRIE (domaine `geometrie`) :
//     MA.GEO.FIGURES      reconnaitre et nommer carre, rectangle, triangle
//                         (dont triangle rectangle), cercle ;
//     MA.GEO.VOCABULAIRE  cote, sommet, angle droit (reconnaitre un angle droit
//                         comme avec l'equerre) ;
//     MA.GEO.SOLIDES      cube, pave, cylindre, sphere, pyramide, cone ; face,
//                         arete, sommet ;
//     MA.GEO.SYMETRIE     symetrie axiale (completer une figure sur quadrillage,
//                         dire si une figure a un axe).
//   SE REPERER (domaine `repere`) :
//     MA.REPERE.QUADRILLAGE  cases et noeuds, coder une case (type B3), placer
//                            un point ;
//     MA.REPERE.DEPLACEMENTS deplacements codes (avancer de deux cases vers la
//                            droite...) ;
//     MA.REPERE.PLAN         gauche / droite / devant / derriere, lire un plan.
//
// Le PERIMETRE n'est pas traite ici : au CE2 la mesure de longueurs vit dans la
// sous-matiere « Mesures » (MA.MES.LONGUEURS) ; l'ajouter ici doublonnerait.
//
// ARCHITECTURE (miroir EXACT de la grammaire / du lexique) : chaque item porte
// une cle stable, un format (qcm / clic / texte / grille), une consigne redigee
// POUR L'ORAL (phrases courtes, aucun symbole ni fleche : on decrit « la deuxieme
// case vers la droite »), une reponse attendue, une explication valorisante AVEC
// un exemple, et un SCHEMA (`figure`) porte par l'exercice (meme principe que
// droiteData / moneyData). Le SERVEUR reste SEUL JUGE : la table de reference
// public.geometrie_item (migration 0043) porte (cle, competence, niveau, format,
// attendu) et verif_geo compare la saisie normalisee ; l'op dediee est 'geo'. Un
// test croise garantit front == SQL (geometrie.test.ts + geometrie_test.sql).
//
// Progression des formats (decision pedagogique) : N1 QCM sur la figure ; N2/N3
// QCM ou clic (toucher une figure, une case, un sommet) ; N4 reponse LIBRE quand
// c'est pertinent (taper un nom ou un code de case, colorier les cases de la
// symetrie). Les figures sont DETERMINISTES (donnees fixes) -> tests golden.

import { normaliser } from "../diagnostic/lettres";
import { normaliserMot } from "../francais/dictee";
import { pick, type Rng } from "../calcul/rng";
import type { Base, GeneratedExercise, ExCalcul } from "../calcul/generator";

// --------------------------------------------------------------------------
// Schema d'une figure (dessinee par le composant <Geometrie>, viewBox 0..100).
// --------------------------------------------------------------------------
export type GeoFormat = "qcm" | "clic" | "texte" | "grille" | "construire" | "programme" | "reproduire";
export type GeoInteract = "color" | "point" | "multi"; // mode d'un exercice « grille » (multi = selection de sommets)
export type Pt = [number, number]; // coordonnees entieres d'un noeud

export type SolidName = "cube" | "pave" | "cylindre" | "sphere" | "pyramide" | "cone";

// Orientation (programmation de deplacement type Blue-Bot) : Nord (haut), Est
// (droite), Sud (bas), Ouest (gauche). Decrite ORALEMENT dans la consigne.
export type Dir = "N" | "E" | "S" | "O";
export type ProgToken = "avance" | "droite" | "gauche";

// Contrat de verification PAR PROPRIETES (miroir de la colonne `spec` serveur).
export type ConstruireSpec =
  | { t: "seg"; len: number }
  | { t: "rect"; w: number; h: number }
  | { t: "tri_right" };
export interface ProgrammeSpec {
  cols: number;
  rows: number;
  start: string; // case de depart (ex. "A1")
  dir: Dir; // orientation de depart
  target: string; // case cible (ex. "C3")
  obstacles: string[]; // cases infranchissables
}
// Reproduire : un modele (polygone) a retracer ; egalite a translation pres.
// `memoire` : le modele est masque au bout de 3 secondes (refaire de memoire, N4).
export interface ReproduireSpec {
  model: Pt[];
  memoire?: boolean;
}

export interface GeoShape {
  kind: "polygon" | "circle" | "segment" | "dot" | "right";
  pts?: Array<[number, number]>; // polygon / segment (unites 0..100)
  cx?: number; // circle / dot
  cy?: number;
  r?: number;
  label?: string; // etiquette affichee (sommet A, cote...)
  name?: string; // valeur logique renvoyee au clic (mode clic)
  fill?: boolean; // forme pleine (coloriee)
  hi?: boolean; // surlignee (correction)
}

export interface GeoGridSpec {
  cols: number;
  rows: number;
  coded?: boolean; // affiche les lettres de colonnes (A..) et numeros de lignes (1..)
  nodes?: boolean; // mode noeuds (placer un point sur une intersection)
  fill?: string[]; // cases deja coloriees (codes, ex. ["B3","C3"])
  axis?: { dir: "v" | "h"; at: number }; // axe de symetrie (v: entre colonnes at|at+1)
  start?: string; // marqueur de depart (deplacements / robot)
  dir?: Dir; // orientation du robot (programmation)
  obstacles?: string[]; // cases infranchissables (programmation)
  program?: ProgToken[]; // programme a LIRE (affiche en toutes lettres)
  target?: string; // case/noeud mis en evidence (cible / correction)
  marks?: Array<{ cell: string; text: string }>; // objets d'un plan / etiquettes
}

export type GeoFigure =
  | { kind: "shapes"; shapes: GeoShape[] }
  | { kind: "solid"; solid: SolidName }
  | { kind: "grid"; grid: GeoGridSpec }
  | { kind: "build"; cols: number; rows: number; model?: Pt[]; prefill?: Pt[]; memoire?: boolean } // quadrillage de noeuds aimante
  | { kind: "none" };

export interface GeoItem {
  cle: string; // identifiant stable (PK serveur)
  competence: string; // MA.GEO.* ou MA.REPERE.*
  niveau: number; // 1..4
  format: GeoFormat;
  consigne: string; // instruction (redigee pour l'oral)
  options?: string[]; // mode qcm : propositions
  attendu: string; // reponse attendue (comparee normalisee)
  explication: string; // correction courte et valorisante, avec un exemple
  figure: GeoFigure; // schema dessine par le composant
  interact?: GeoInteract; // mode « grille » : colorier (symetrie), placer un point, selection multiple
  spec?: ConstruireSpec | ProgrammeSpec | ReproduireSpec; // contrat de verification par proprietes
}

// Donnees de RENDU (ce que l'exercice porte et que <Geometrie> affiche) : tout
// GeoItem sauf competence / niveau, portes par l'exercice lui-meme.
export type GeoRender = Pick<
  GeoItem,
  "cle" | "format" | "consigne" | "options" | "attendu" | "explication" | "figure" | "interact"
>;

// --------------------------------------------------------------------------
// Comparaison MIROIR du serveur (verif_geo) :
//   qcm    -> normaliser (accents gardes, minuscule, espaces normalises) ;
//   grille -> comparaison stricte (minuscule, espaces retires) : les codes de
//             cases contiennent « ; » et « , » qu'il ne faut pas ecraser ;
//   texte / clic -> normaliserMot (accents EXIGES, ponctuation de bord retiree).
// --------------------------------------------------------------------------
export function normGeoGrille(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, "");
}
export function comparerGeometrie(format: GeoFormat, saisie: string, attendu: string): boolean {
  if (format === "qcm") return normaliser(saisie) === normaliser(attendu);
  if (format === "grille") return normGeoGrille(saisie) === normGeoGrille(attendu);
  return normaliserMot(saisie) === normaliserMot(attendu);
}

// Tri canonique des codes de cases (ex. ["C3","B3"] -> "B3;C3"). Utilise cote
// banque (attendu) ET cote composant (saisie) pour que les deux coincident.
export function canonCells(codes: string[]): string {
  return [...codes].map((c) => c.toUpperCase()).sort().join(";");
}

// --------------------------------------------------------------------------
// Verification PAR PROPRIETES (miroir EXACT de verif_geo_construire /
// verif_geo_programme cote serveur). Coordonnees ENTIERES de noeuds -> tout en
// arithmetique exacte (aucun flottant). Sert au mode demo, au feedback local et
// aux tests golden ; le SERVEUR reste seul juge en production.
// --------------------------------------------------------------------------

// Decode "A1" -> { col: 0, row: 1 } (col = lettre - A, row = numero).
export function cellColRow(code: string): { col: number; row: number } {
  const up = code.trim().toUpperCase();
  return { col: up.charCodeAt(0) - 65, row: parseInt(up.slice(1), 10) };
}

export function verifConstruire(spec: ConstruireSpec, pts: Pt[]): boolean {
  if (!Array.isArray(pts)) return false;
  if (spec.t === "seg") {
    if (pts.length !== 2) return false;
    const [x0, y0] = pts[0];
    const [x1, y1] = pts[1];
    return (x0 === x1 && Math.abs(y1 - y0) === spec.len) || (y0 === y1 && Math.abs(x1 - x0) === spec.len);
  }
  if (spec.t === "rect") {
    if (pts.length !== 4) return false;
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = pts;
    const ax = x1 - x0, ay = y1 - y0;
    const bx = x2 - x1, by = y2 - y1;
    const cx = x3 - x2, cy = y3 - y2;
    const dx = x0 - x3, dy = y0 - y3;
    if (ax * bx + ay * by !== 0) return false;
    if (bx * cx + by * cy !== 0) return false;
    if (cx * dx + cy * dy !== 0) return false;
    if (dx * ax + dy * ay !== 0) return false;
    const s0 = ax * ax + ay * ay;
    const s1 = bx * bx + by * by;
    if (s0 === 0 || s1 === 0) return false;
    const { w, h } = spec;
    return (s0 === w * w && s1 === h * h) || (s0 === h * h && s1 === w * w);
  }
  if (spec.t === "tri_right") {
    if (pts.length !== 3) return false;
    const [[x0, y0], [x1, y1], [x2, y2]] = pts;
    if ((x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0) === 0) return false; // degenere
    if ((x1 - x0) * (x2 - x0) + (y1 - y0) * (y2 - y0) === 0) return true;
    if ((x0 - x1) * (x2 - x1) + (y0 - y1) * (y2 - y1) === 0) return true;
    if ((x0 - x2) * (x1 - x2) + (y0 - y2) * (y1 - y2) === 0) return true;
    return false;
  }
  return false;
}

const TURN_RIGHT: Record<Dir, Dir> = { N: "E", E: "S", S: "O", O: "N" };
const TURN_LEFT: Record<Dir, Dir> = { N: "O", O: "S", S: "E", E: "N" };

// Simule le programme ; renvoie la case d'arrivee, ou null si sortie du
// quadrillage ou heurt d'un obstacle (ou carte inconnue).
export function simulerProgramme(spec: ProgrammeSpec, tokens: ProgToken[]): string | null {
  if (!Array.isArray(tokens) || tokens.length < 1 || tokens.length > 60) return null;
  let { col, row } = cellColRow(spec.start);
  let dir: Dir = spec.dir;
  const obst = new Set(spec.obstacles.map((o) => o.toUpperCase()));
  for (const tok of tokens) {
    if (tok === "avance") {
      let nc = col, nr = row;
      if (dir === "N") nr = row + 1;
      else if (dir === "S") nr = row - 1;
      else if (dir === "E") nc = col + 1;
      else if (dir === "O") nc = col - 1;
      if (nc < 0 || nc > spec.cols - 1 || nr < 1 || nr > spec.rows) return null;
      const code = `${String.fromCharCode(65 + nc)}${nr}`;
      if (obst.has(code)) return null;
      col = nc; row = nr;
    } else if (tok === "droite") {
      dir = TURN_RIGHT[dir];
    } else if (tok === "gauche") {
      dir = TURN_LEFT[dir];
    } else {
      return null;
    }
  }
  return `${String.fromCharCode(65 + col)}${row}`;
}

export function verifProgramme(spec: ProgrammeSpec, tokens: ProgToken[]): boolean {
  const arrivee = simulerProgramme(spec, tokens);
  return arrivee != null && arrivee.toUpperCase() === spec.target.toUpperCase();
}

// Ensemble (trie) des aretes normalisees d'un polygone, recale sur son coin
// bas-gauche : invariant par translation, sommet de depart et sens de parcours.
function edgesOf(poly: Pt[]): string[] | null {
  const n = poly.length;
  if (n < 2) return null;
  const minx = Math.min(...poly.map((p) => p[0]));
  const miny = Math.min(...poly.map((p) => p[1]));
  const res: string[] = [];
  for (let i = 0; i < n; i++) {
    const xa = poly[i][0] - minx, ya = poly[i][1] - miny;
    const xb = poly[(i + 1) % n][0] - minx, yb = poly[(i + 1) % n][1] - miny;
    res.push(xa > xb || (xa === xb && ya > yb) ? `${xb},${yb}-${xa},${ya}` : `${xa},${ya}-${xb},${yb}`);
  }
  return res.sort();
}

// Reproduire : egalite des figures A TRANSLATION pres (meme ensemble d'aretes).
export function verifReproduire(spec: ReproduireSpec, drawn: Pt[]): boolean {
  const md = edgesOf(spec.model);
  const dr = edgesOf(drawn);
  if (!md || !dr || md.length !== dr.length) return false;
  return md.every((e, i) => e === dr[i]);
}

// --------------------------------------------------------------------------
// Helpers de construction des figures (gardent la banque lisible).
// --------------------------------------------------------------------------
function square(cx: number, cy: number, s: number, extra: Partial<GeoShape> = {}): GeoShape {
  const h = s / 2;
  return { kind: "polygon", pts: [[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]], ...extra };
}
function rect(cx: number, cy: number, w: number, h: number, extra: Partial<GeoShape> = {}): GeoShape {
  const a = w / 2;
  const b = h / 2;
  return { kind: "polygon", pts: [[cx - a, cy - b], [cx + a, cy - b], [cx + a, cy + b], [cx - a, cy + b]], ...extra };
}
function triangle(cx: number, cy: number, s: number, extra: Partial<GeoShape> = {}): GeoShape {
  const h = s / 2;
  return { kind: "polygon", pts: [[cx, cy - h], [cx + h, cy + h], [cx - h, cy + h]], ...extra };
}
// Triangle rectangle : angle droit en bas a gauche (marqueur ajoute a part).
function triRight(cx: number, cy: number, s: number, extra: Partial<GeoShape> = {}): GeoShape {
  const h = s / 2;
  return { kind: "polygon", pts: [[cx - h, cy - h], [cx - h, cy + h], [cx + h, cy + h]], ...extra };
}
function dot(cx: number, cy: number, extra: Partial<GeoShape> = {}): GeoShape {
  return { kind: "dot", cx, cy, ...extra };
}

const shapes = (...s: GeoShape[]): GeoFigure => ({ kind: "shapes", shapes: s });
const grid = (g: GeoGridSpec): GeoFigure => ({ kind: "grid", grid: g });
const solid = (s: SolidName): GeoFigure => ({ kind: "solid", solid: s });
const build = (cols: number, rows: number): GeoFigure => ({ kind: "build", cols, rows });

// Construit un item « lire un programme » (format clic) : la grille affiche le
// depart, l'orientation et le programme en toutes lettres ; l'enfant touche la
// case d'arrivee. L'arrivee (`attendu`) est calculee par simulation -> toujours
// coherente (verifiee par le test golden).
function progLire(
  cle: string, niveau: number, consigne: string,
  g: GeoGridSpec, explication: string,
): GeoItem {
  const arrivee = simulerProgramme(
    { cols: g.cols, rows: g.rows, start: g.start!, dir: g.dir!, target: "A1", obstacles: g.obstacles ?? [] },
    g.program!,
  );
  return {
    cle, competence: "MA.REPERE.PROGRAMMER", niveau, format: "clic", consigne,
    attendu: arrivee ?? "", explication, figure: grid({ ...g, coded: true }),
  };
}

// Construit un item « assembler un programme » (format programme) : la grille
// montre depart, cible et obstacles ; l'enfant compose les cartes. Le `spec`
// (juge serveur) et la figure partagent la meme source.
function progEcrire(
  cle: string, niveau: number, consigne: string,
  spec: ProgrammeSpec, attenduSample: ProgToken[], explication: string,
): GeoItem {
  return {
    cle, competence: "MA.REPERE.PROGRAMMER", niveau, format: "programme", consigne,
    attendu: JSON.stringify(attenduSample), explication, spec,
    figure: grid({
      cols: spec.cols, rows: spec.rows, coded: true,
      start: spec.start, dir: spec.dir, target: spec.target, obstacles: spec.obstacles,
    }),
  };
}

// Construit un item « construire une figure » (format construire).
function con(
  cle: string, niveau: number, consigne: string,
  spec: ConstruireSpec, cols: number, rows: number,
  attenduSample: Pt[], explication: string,
): GeoItem {
  return {
    cle, competence: "MA.GEO.CONSTRUIRE", niveau, format: "construire", consigne,
    attendu: JSON.stringify(attenduSample), explication, spec, figure: build(cols, rows),
  };
}

// Construit un item « completer un sommet manquant » : des sommets sont deja
// places (prefill), l'enfant pose le dernier ; la figure complete doit valider le
// `spec` (rectangle/carre). Jugee comme une construction.
function comp(
  cle: string, niveau: number, consigne: string,
  spec: ConstruireSpec, cols: number, rows: number,
  prefill: Pt[], attenduSample: Pt[], explication: string,
): GeoItem {
  return {
    cle, competence: "MA.GEO.CONSTRUIRE", niveau, format: "construire", consigne,
    attendu: JSON.stringify(attenduSample), explication, spec,
    figure: { kind: "build", cols, rows, prefill },
  };
}

// Construit un item « reproduire une figure » (ou « de memoire » si memoire=true :
// le modele est masque au bout de 3 s). Jugee a translation pres.
function rep(
  cle: string, niveau: number, consigne: string,
  model: Pt[], cols: number, rows: number,
  attenduSample: Pt[], explication: string, memoire = false,
): GeoItem {
  const spec: ReproduireSpec = memoire ? { model, memoire: true } : { model };
  return {
    cle, competence: "MA.GEO.CONSTRUIRE", niveau, format: "reproduire", consigne,
    attendu: JSON.stringify(attenduSample), explication, spec,
    figure: { kind: "build", cols, rows, model, ...(memoire ? { memoire: true } : {}) },
  };
}

// ==========================================================================
// BANQUE
// ==========================================================================
export const BANQUE_GEOMETRIE: GeoItem[] = [
  // =======================================================================
  // MA.GEO.FIGURES — DECRIRE les figures par leurs proprietes (devinettes)
  //   N1 = court rappel « nommer » (CE1) ; N2..N4 = devinettes de proprietes
  //   (cotes, sommets, angles droits). On NE demande plus « nomme la figure »
  //   au-dela du rappel N1 : au CE2 l'enfant raisonne sur les proprietes.
  // =======================================================================
  // N1 : rappel court — reconnaitre une figure dessinee
  { cle: "geo-fig-n1-carre", competence: "MA.GEO.FIGURES", niveau: 1, format: "qcm",
    consigne: "Quelle est cette figure ?", options: ["un carré", "un rectangle", "un triangle"],
    attendu: "un carré", figure: shapes(square(50, 50, 48, { fill: true })),
    explication: "Cette figure a quatre côtés de la même longueur et quatre coins bien droits : c'est un carré." },
  { cle: "geo-fig-n1-triangle", competence: "MA.GEO.FIGURES", niveau: 1, format: "qcm",
    consigne: "Quelle est cette figure ?", options: ["un triangle", "un carré", "un cercle"],
    attendu: "un triangle", figure: shapes(triangle(50, 52, 56, { fill: true })),
    explication: "Cette figure a trois côtés et trois coins : c'est un triangle." },
  // N2 : devinette simple (sans dessin) — on reconnait par le nombre de cotes
  { cle: "geo-fig-n2-dev-triangle", competence: "MA.GEO.FIGURES", niveau: 2, format: "qcm",
    consigne: "Je suis une figure. J'ai trois côtés et trois sommets. Qui suis-je ?",
    options: ["un triangle", "un carré", "un cercle"], attendu: "un triangle", figure: { kind: "none" },
    explication: "Trois côtés et trois sommets : c'est un triangle. Par exemple, un morceau de part de pizza a trois côtés." },
  { cle: "geo-fig-n2-dev-cercle", competence: "MA.GEO.FIGURES", niveau: 2, format: "qcm",
    consigne: "Je suis une figure. Je suis toute ronde et je n'ai aucun coin. Qui suis-je ?",
    options: ["un cercle", "un carré", "un triangle"], attendu: "un cercle", figure: { kind: "none" },
    explication: "Toute ronde, sans aucun coin : c'est un cercle. Par exemple, une assiette ronde a la forme d'un cercle." },
  // N3 : proprietes du carre et difference carre / rectangle
  { cle: "geo-fig-n3-dev-carre", competence: "MA.GEO.FIGURES", niveau: 3, format: "qcm",
    consigne: "Je suis une figure. J'ai quatre côtés de la même longueur et quatre angles droits. Qui suis-je ?",
    options: ["un carré", "un rectangle", "un triangle"], attendu: "un carré", figure: { kind: "none" },
    explication: "Quatre côtés égaux et quatre angles droits : c'est un carré. Le rectangle, lui, n'a pas tous ses côtés égaux." },
  { cle: "geo-fig-n3-pourquoi", competence: "MA.GEO.FIGURES", niveau: 3, format: "qcm",
    consigne: "Regarde cette figure. Elle a quatre angles droits. Pourquoi n'est-ce pas un carré ?",
    options: ["ses côtés ne sont pas tous égaux", "elle n'a pas d'angle droit", "elle a trois côtés"],
    attendu: "ses côtés ne sont pas tous égaux", figure: shapes(rect(50, 50, 74, 38, { fill: true })),
    explication: "Un carré a ses quatre côtés égaux. Ici, il y a deux côtés longs et deux côtés courts : c'est un rectangle, pas un carré." },
  // N4 : proprietes plus fines (rectangle, triangle rectangle)
  { cle: "geo-fig-n4-dev-rectangle", competence: "MA.GEO.FIGURES", niveau: 4, format: "qcm",
    consigne: "Je suis une figure. J'ai quatre angles droits, mais mes côtés ne sont pas tous de la même longueur. Qui suis-je ?",
    options: ["un rectangle", "un carré", "un triangle"], attendu: "un rectangle", figure: { kind: "none" },
    explication: "Quatre angles droits mais des côtés de deux longueurs différentes : c'est un rectangle. Par exemple, une porte a la forme d'un rectangle." },
  { cle: "geo-fig-n4-dev-trirect", competence: "MA.GEO.FIGURES", niveau: 4, format: "qcm",
    consigne: "Je suis une figure. J'ai trois côtés, et l'un de mes coins est un angle droit comme le coin d'une feuille. Qui suis-je ?",
    options: ["un triangle rectangle", "un carré", "un cercle"], attendu: "un triangle rectangle", figure: { kind: "none" },
    explication: "Trois côtés et un angle droit : c'est un triangle rectangle. On peut vérifier l'angle droit avec l'équerre." },

  // =======================================================================
  // MA.GEO.VOCABULAIRE — cote, sommet, angle droit
  // =======================================================================
  // N1 : QCM — compter cotes / sommets
  { cle: "geo-voc-n1-cotes-carre", competence: "MA.GEO.VOCABULAIRE", niveau: 1, format: "qcm",
    consigne: "Combien de côtés a ce carré ?", options: ["4", "3", "5"], attendu: "4",
    figure: shapes(square(50, 50, 46)),
    explication: "Un côté, c'est un bord droit de la figure. Le carré a quatre côtés." },
  { cle: "geo-voc-n1-sommets-triangle", competence: "MA.GEO.VOCABULAIRE", niveau: 1, format: "qcm",
    consigne: "Combien de sommets a ce triangle ?", options: ["3", "4", "2"], attendu: "3",
    figure: shapes(triangle(50, 52, 54)),
    explication: "Un sommet, c'est un coin, là où deux côtés se rejoignent. Le triangle a trois sommets." },
  { cle: "geo-voc-n1-cotes-triangle", competence: "MA.GEO.VOCABULAIRE", niveau: 1, format: "qcm",
    consigne: "Combien de côtés a ce triangle ?", options: ["3", "4", "1"], attendu: "3",
    figure: shapes(triangle(50, 52, 54)),
    explication: "Le triangle a trois bords droits, donc trois côtés." },
  // N2 : clic sur un sommet / sur l'angle droit
  { cle: "geo-voc-n2-sommet", competence: "MA.GEO.VOCABULAIRE", niveau: 2, format: "clic",
    consigne: "Clique sur le sommet B.", attendu: "B",
    figure: shapes(
      square(50, 50, 48),
      dot(26, 26, { name: "A", label: "A" }), dot(74, 26, { name: "B", label: "B" }),
      dot(74, 74, { name: "C", label: "C" }), dot(26, 74, { name: "D", label: "D" })),
    explication: "Un sommet, c'est un coin. Le sommet B est le coin en haut à droite." },
  { cle: "geo-voc-n2-angledroit", competence: "MA.GEO.VOCABULAIRE", niveau: 2, format: "clic",
    consigne: "Clique sur le coin qui forme un angle droit.", attendu: "A",
    figure: shapes(
      triRight(50, 50, 52),
      { kind: "right", cx: 24, cy: 76 },
      dot(24, 76, { name: "A", label: "A" }), dot(76, 76, { name: "B", label: "B" }), dot(24, 24, { name: "C", label: "C" })),
    explication: "L'angle droit est bien carré, comme le coin d'une feuille. Ici c'est le coin A, en bas à gauche." },
  // N3 : QCM — reconnaitre un angle droit (comme avec l'equerre)
  { cle: "geo-voc-n3-angle-oui", competence: "MA.GEO.VOCABULAIRE", niveau: 3, format: "qcm",
    consigne: "Ce coin est-il un angle droit, comme le coin d'une feuille ?", options: ["oui", "non"],
    attendu: "oui", figure: shapes({ kind: "segment", pts: [[20, 20], [20, 80]] }, { kind: "segment", pts: [[20, 80], [82, 80]] }, { kind: "right", cx: 20, cy: 80 }),
    explication: "Les deux traits forment un coin bien carré : c'est un angle droit. On peut le vérifier avec l'équerre." },
  { cle: "geo-voc-n3-angle-non", competence: "MA.GEO.VOCABULAIRE", niveau: 3, format: "qcm",
    consigne: "Ce coin est-il un angle droit, comme le coin d'une feuille ?", options: ["non", "oui"],
    attendu: "non", figure: shapes({ kind: "segment", pts: [[20, 30], [20, 80]] }, { kind: "segment", pts: [[20, 80], [80, 55]] }),
    explication: "Ce coin est trop ouvert, il n'est pas bien carré : ce n'est pas un angle droit." },
  // N4 : reponse libre — compter / nommer
  { cle: "geo-voc-n4-cotes-rectangle", competence: "MA.GEO.VOCABULAIRE", niveau: 4, format: "texte",
    consigne: "Écris combien de côtés a ce rectangle.", attendu: "4", figure: shapes(rect(50, 50, 72, 40)),
    explication: "Le rectangle a quatre bords droits, donc quatre côtés." },
  { cle: "geo-voc-n4-sommet", competence: "MA.GEO.VOCABULAIRE", niveau: 4, format: "texte",
    consigne: "Comment s'appelle le coin d'une figure, là où deux côtés se rejoignent ? Écris le mot.",
    attendu: "sommet", figure: shapes(square(50, 50, 46), dot(27, 27, { hi: true })),
    explication: "Le coin où deux côtés se rejoignent s'appelle un sommet." },

  // =======================================================================
  // MA.GEO.SOLIDES — cube, pave, cylindre, sphere, pyramide, cone
  // =======================================================================
  // N1 : QCM — nommer le solide
  { cle: "geo-sol-n1-cube", competence: "MA.GEO.SOLIDES", niveau: 1, format: "qcm",
    consigne: "Quel est ce solide ?", options: ["un cube", "une boule", "un cylindre"], attendu: "un cube",
    figure: solid("cube"), explication: "Toutes ses faces sont des carrés pareils : c'est un cube, comme un dé." },
  { cle: "geo-sol-n1-sphere", competence: "MA.GEO.SOLIDES", niveau: 1, format: "qcm",
    consigne: "Quel est ce solide ?", options: ["une boule", "un cube", "un cône"], attendu: "une boule",
    figure: solid("sphere"), explication: "Il est tout rond comme un ballon : c'est une boule, on dit aussi une sphère." },
  { cle: "geo-sol-n1-cylindre", competence: "MA.GEO.SOLIDES", niveau: 1, format: "qcm",
    consigne: "Quel est ce solide ?", options: ["un cylindre", "un cube", "une pyramide"], attendu: "un cylindre",
    figure: solid("cylindre"), explication: "Il a deux ronds plats et un tour rond, comme une boîte de conserve : c'est un cylindre." },
  // N2 : QCM — l'objet du quotidien -> le solide
  { cle: "geo-sol-n2-ballon", competence: "MA.GEO.SOLIDES", niveau: 2, format: "qcm",
    consigne: "Un ballon de foot a la forme de quel solide ?", options: ["une boule", "un cube", "un pavé"], attendu: "une boule",
    figure: solid("sphere"), explication: "Le ballon est tout rond : il a la forme d'une boule, une sphère." },
  { cle: "geo-sol-n2-boite", competence: "MA.GEO.SOLIDES", niveau: 2, format: "qcm",
    consigne: "Une boîte à chaussures a la forme de quel solide ?", options: ["un pavé", "une boule", "un cône"], attendu: "un pavé",
    figure: solid("pave"), explication: "La boîte a des faces rectangles : c'est un pavé, on dit aussi un pavé droit." },
  { cle: "geo-sol-n2-de", competence: "MA.GEO.SOLIDES", niveau: 2, format: "qcm",
    consigne: "Un dé à jouer a la forme de quel solide ?", options: ["un cube", "un cylindre", "une pyramide"], attendu: "un cube",
    figure: solid("cube"), explication: "Le dé a six faces carrées pareilles : c'est un cube." },
  // N3 : QCM — compter faces / sommets
  { cle: "geo-sol-n3-faces-cube", competence: "MA.GEO.SOLIDES", niveau: 3, format: "qcm",
    consigne: "Combien de faces a un cube ?", options: ["6", "4", "8"], attendu: "6",
    figure: solid("cube"), explication: "Une face, c'est un côté plat du solide. Le cube a six faces carrées." },
  { cle: "geo-sol-n3-sommets-cube", competence: "MA.GEO.SOLIDES", niveau: 3, format: "qcm",
    consigne: "Combien de sommets a un cube ?", options: ["8", "6", "4"], attendu: "8",
    figure: solid("cube"), explication: "Un sommet, c'est un coin du solide. Le cube a huit coins." },
  // N4 : reponse libre — nommer le solide
  { cle: "geo-sol-n4-pyramide", competence: "MA.GEO.SOLIDES", niveau: 4, format: "texte",
    consigne: "Écris le nom de ce solide.", attendu: "pyramide", figure: solid("pyramide"),
    explication: "Il a une base et des faces triangles qui montent vers un sommet : c'est une pyramide." },
  { cle: "geo-sol-n4-cone", competence: "MA.GEO.SOLIDES", niveau: 4, format: "texte",
    consigne: "Écris le nom de ce solide.", attendu: "cône", figure: solid("cone"),
    explication: "Il a un rond plat en bas et une pointe en haut, comme un chapeau de fête : c'est un cône." },
  { cle: "geo-sol-n4-cylindre", competence: "MA.GEO.SOLIDES", niveau: 4, format: "texte",
    consigne: "Écris le nom de ce solide.", attendu: "cylindre", figure: solid("cylindre"),
    explication: "Deux ronds plats et un tour rond, comme une boîte de conserve : c'est un cylindre." },

  // =======================================================================
  // MA.GEO.SYMETRIE — symetrie axiale
  // =======================================================================
  // N1/N2 : QCM — la figure a-t-elle un axe de symetrie ?
  { cle: "geo-sym-n1-oui", competence: "MA.GEO.SYMETRIE", niveau: 1, format: "qcm",
    consigne: "Si on plie cette figure sur le trait du milieu, les deux moitiés se superposent. A-t-elle un axe de symétrie ?",
    options: ["oui", "non"], attendu: "oui",
    figure: grid({ cols: 4, rows: 4, axis: { dir: "v", at: 2 }, fill: ["A2", "A3", "B1", "B4", "C1", "C4", "D2", "D3"] }),
    explication: "En pliant sur le trait du milieu, chaque case retrouve sa jumelle de l'autre côté : il y a un axe de symétrie." },
  { cle: "geo-sym-n1-non", competence: "MA.GEO.SYMETRIE", niveau: 1, format: "qcm",
    consigne: "Si on plie cette figure sur le trait du milieu, les deux moitiés se superposent-elles ? A-t-elle un axe de symétrie ?",
    options: ["non", "oui"], attendu: "non",
    figure: grid({ cols: 4, rows: 4, axis: { dir: "v", at: 2 }, fill: ["A1", "A2", "B3", "C4", "D1"] }),
    explication: "En pliant, les cases ne retombent pas l'une sur l'autre : cette figure n'a pas d'axe de symétrie." },
  { cle: "geo-sym-n2-oui", competence: "MA.GEO.SYMETRIE", niveau: 2, format: "qcm",
    consigne: "Le trait est-il un axe de symétrie de cette figure ?", options: ["oui", "non"], attendu: "oui",
    figure: grid({ cols: 4, rows: 4, axis: { dir: "h", at: 2 }, fill: ["A2", "A3", "B2", "B3", "C1", "C4", "D1", "D4"] }),
    explication: "Le haut et le bas sont pareils autour du trait : c'est bien un axe de symétrie." },
  { cle: "geo-sym-n2-non", competence: "MA.GEO.SYMETRIE", niveau: 2, format: "qcm",
    consigne: "Le trait est-il un axe de symétrie de cette figure ?", options: ["non", "oui"], attendu: "non",
    figure: grid({ cols: 4, rows: 4, axis: { dir: "v", at: 2 }, fill: ["A1", "B2", "C3", "D4", "B4"] }),
    explication: "Les deux côtés du trait ne sont pas pareils : ce n'est pas un axe de symétrie." },
  // N3/N4 : grille — colorier les cases pour completer la figure par symetrie
  { cle: "geo-sym-n3-a", competence: "MA.GEO.SYMETRIE", niveau: 3, format: "grille", interact: "color",
    consigne: "Colorie les cases de droite pour que la figure soit pareille des deux côtés du trait.",
    attendu: canonCells(["C2", "C3", "D1", "D4"]),
    figure: grid({ cols: 4, rows: 4, axis: { dir: "v", at: 2 }, fill: ["A1", "A4", "B2", "B3"] }),
    explication: "Chaque case coloriée à gauche a sa jumelle à droite, à la même distance du trait. On colorie C2, C3, D1 et D4." },
  { cle: "geo-sym-n3-b", competence: "MA.GEO.SYMETRIE", niveau: 3, format: "grille", interact: "color",
    consigne: "Colorie les cases du haut pour que la figure soit pareille des deux côtés du trait.",
    attendu: canonCells(["A3", "B3", "C4", "D4"]),
    figure: grid({ cols: 4, rows: 4, axis: { dir: "h", at: 2 }, fill: ["A2", "B2", "C1", "D1"] }),
    explication: "On plie sur le trait du milieu : chaque case du bas a sa jumelle en haut. On colorie A3, B3, C4 et D4." },
  { cle: "geo-sym-n4-a", competence: "MA.GEO.SYMETRIE", niveau: 4, format: "grille", interact: "color",
    consigne: "Colorie les cases de droite pour compléter la figure par symétrie sur le trait du milieu.",
    attendu: canonCells(["D1", "D2", "D4", "E3", "F2"]),
    figure: grid({ cols: 6, rows: 4, axis: { dir: "v", at: 3 }, fill: ["C1", "C2", "C4", "B3", "A2"] }),
    explication: "Chaque case coloriée à gauche a sa jumelle à droite, à la même distance du trait : D1, D2, D4, E3 et F2." },
  { cle: "geo-sym-n4-b", competence: "MA.GEO.SYMETRIE", niveau: 4, format: "grille", interact: "color",
    consigne: "Colorie les cases du haut pour compléter la figure par symétrie sur le trait du milieu.",
    attendu: canonCells(["A4", "B5", "C6", "D5", "E4"]),
    figure: grid({ cols: 5, rows: 6, axis: { dir: "h", at: 3 }, fill: ["A3", "B2", "C1", "D2", "E3"] }),
    explication: "On plie sur le trait du milieu : chaque case du bas a sa jumelle en haut, à la même distance. On colorie A4, B5, C6, D5 et E4." },

  // =======================================================================
  // MA.REPERE.QUADRILLAGE — coder une case, placer un point
  // =======================================================================
  // N1 : QCM — quelle case est coloriee ?
  { cle: "geo-quad-n1-a", competence: "MA.REPERE.QUADRILLAGE", niveau: 1, format: "qcm",
    consigne: "Quelle case est coloriée ?", options: ["B3", "C2", "A1"], attendu: "B3",
    figure: grid({ cols: 4, rows: 4, coded: true, fill: ["B3"] }),
    explication: "On lit d'abord la lettre de la colonne, puis le numéro de la ligne. La case coloriée est dans la colonne B, à la ligne 3 : c'est B3." },
  { cle: "geo-quad-n1-b", competence: "MA.REPERE.QUADRILLAGE", niveau: 1, format: "qcm",
    consigne: "Quelle case est coloriée ?", options: ["C2", "B3", "D4"], attendu: "C2",
    figure: grid({ cols: 4, rows: 4, coded: true, fill: ["C2"] }),
    explication: "Colonne C, ligne 2 : la case coloriée est C2." },
  // N2 : clic — toucher la case demandee
  { cle: "geo-quad-n2-a", competence: "MA.REPERE.QUADRILLAGE", niveau: 2, format: "clic",
    consigne: "Clique sur la case B3.", attendu: "B3",
    figure: grid({ cols: 4, rows: 4, coded: true }),
    explication: "On cherche la colonne B, puis on monte à la ligne 3 : c'est la case B3." },
  { cle: "geo-quad-n2-b", competence: "MA.REPERE.QUADRILLAGE", niveau: 2, format: "clic",
    consigne: "Clique sur la case D1.", attendu: "D1",
    figure: grid({ cols: 4, rows: 4, coded: true }),
    explication: "Colonne D, ligne 1 : la case D1 est tout en bas à droite." },
  // N3 : grille — placer un point sur un noeud
  { cle: "geo-quad-n3-a", competence: "MA.REPERE.QUADRILLAGE", niveau: 3, format: "grille", interact: "point",
    consigne: "Place un point sur le nœud B3.", attendu: "B3",
    figure: grid({ cols: 4, rows: 4, coded: true, nodes: true }),
    explication: "Un nœud, c'est un point de croisement des traits. On prend la colonne B et la ligne 3 : c'est le nœud B3." },
  { cle: "geo-quad-n3-b", competence: "MA.REPERE.QUADRILLAGE", niveau: 3, format: "grille", interact: "point",
    consigne: "Place un point sur le nœud A2.", attendu: "A2",
    figure: grid({ cols: 4, rows: 4, coded: true, nodes: true }),
    explication: "Le nœud A2 est au croisement de la colonne A et de la ligne 2." },
  // N4 : reponse libre — ecrire le code de la case coloriee
  { cle: "geo-quad-n4-a", competence: "MA.REPERE.QUADRILLAGE", niveau: 4, format: "texte",
    consigne: "Écris le code de la case coloriée (une lettre et un chiffre).", attendu: "C3",
    figure: grid({ cols: 4, rows: 4, coded: true, fill: ["C3"] }),
    explication: "Colonne C, ligne 3 : on écrit C3." },
  { cle: "geo-quad-n4-b", competence: "MA.REPERE.QUADRILLAGE", niveau: 4, format: "texte",
    consigne: "Écris le code de la case coloriée (une lettre et un chiffre).", attendu: "A4",
    figure: grid({ cols: 4, rows: 4, coded: true, fill: ["A4"] }),
    explication: "Colonne A, ligne 4 : on écrit A4." },

  // =======================================================================
  // MA.REPERE.DEPLACEMENTS — deplacements codes
  // =======================================================================
  // N1 : QCM — un seul deplacement
  { cle: "geo-dep-n1-a", competence: "MA.REPERE.DEPLACEMENTS", niveau: 1, format: "qcm",
    consigne: "Tu pars de la case B2 et tu avances de deux cases vers la droite. Sur quelle case arrives-tu ?",
    options: ["D2", "B4", "C2"], attendu: "D2",
    figure: grid({ cols: 4, rows: 4, coded: true, start: "B2" }),
    explication: "Vers la droite, on change de colonne : de B on passe à C puis à D. On reste à la ligne 2, donc on arrive en D2." },
  { cle: "geo-dep-n1-b", competence: "MA.REPERE.DEPLACEMENTS", niveau: 1, format: "qcm",
    consigne: "Tu pars de la case C1 et tu montes de deux cases vers le haut. Sur quelle case arrives-tu ?",
    options: ["C3", "A1", "C2"], attendu: "C3",
    figure: grid({ cols: 4, rows: 4, coded: true, start: "C1" }),
    explication: "Vers le haut, on change de ligne : de la ligne 1 on passe à 2 puis à 3. On reste dans la colonne C, donc on arrive en C3." },
  // N2 : QCM — deux deplacements
  { cle: "geo-dep-n2-a", competence: "MA.REPERE.DEPLACEMENTS", niveau: 2, format: "qcm",
    consigne: "Tu pars de A1. Tu avances d'une case vers la droite, puis tu montes de deux cases. Sur quelle case arrives-tu ?",
    options: ["B3", "C1", "A3"], attendu: "B3",
    figure: grid({ cols: 4, rows: 4, coded: true, start: "A1" }),
    explication: "Une case vers la droite : de A à B. Puis deux cases vers le haut : de la ligne 1 à la ligne 3. On arrive en B3." },
  { cle: "geo-dep-n2-b", competence: "MA.REPERE.DEPLACEMENTS", niveau: 2, format: "qcm",
    consigne: "Tu pars de D4. Tu descends de deux cases, puis tu vas d'une case vers la gauche. Sur quelle case arrives-tu ?",
    options: ["C2", "B4", "D2"], attendu: "C2",
    figure: grid({ cols: 4, rows: 4, coded: true, start: "D4" }),
    explication: "Deux cases vers le bas : de la ligne 4 à la ligne 2. Une case vers la gauche : de D à C. On arrive en C2." },
  // N3 : clic — toucher la case d'arrivee
  { cle: "geo-dep-n3-a", competence: "MA.REPERE.DEPLACEMENTS", niveau: 3, format: "clic",
    consigne: "Pars de la case B2, avance d'une case vers la droite puis monte d'une case. Clique sur la case d'arrivée.",
    attendu: "C3", figure: grid({ cols: 4, rows: 4, coded: true, start: "B2" }),
    explication: "Une case vers la droite : de B à C. Une case vers le haut : de la ligne 2 à la ligne 3. On arrive en C3." },
  { cle: "geo-dep-n3-b", competence: "MA.REPERE.DEPLACEMENTS", niveau: 3, format: "clic",
    consigne: "Pars de la case A4, descends de deux cases puis avance de deux cases vers la droite. Clique sur la case d'arrivée.",
    attendu: "C2", figure: grid({ cols: 4, rows: 4, coded: true, start: "A4" }),
    explication: "Deux cases vers le bas : de la ligne 4 à la ligne 2. Deux cases vers la droite : de A à C. On arrive en C2." },
  // N4 : reponse libre — ecrire la case d'arrivee
  { cle: "geo-dep-n4-a", competence: "MA.REPERE.DEPLACEMENTS", niveau: 4, format: "texte",
    consigne: "Pars de B1. Avance de deux cases vers la droite, puis monte de trois cases. Écris le code de la case d'arrivée.",
    attendu: "D4", figure: grid({ cols: 4, rows: 4, coded: true, start: "B1" }),
    explication: "Deux cases vers la droite : de B à D. Trois cases vers le haut : de la ligne 1 à la ligne 4. On arrive en D4." },
  { cle: "geo-dep-n4-b", competence: "MA.REPERE.DEPLACEMENTS", niveau: 4, format: "texte",
    consigne: "Pars de D3. Va d'une case vers la gauche, puis descends de deux cases. Écris le code de la case d'arrivée.",
    attendu: "C1", figure: grid({ cols: 4, rows: 4, coded: true, start: "D3" }),
    explication: "Une case vers la gauche : de D à C. Deux cases vers le bas : de la ligne 3 à la ligne 1. On arrive en C1." },

  // =======================================================================
  // MA.REPERE.PLAN — gauche / droite / devant / derriere, lire un plan
  // =======================================================================
  { cle: "geo-plan-n1-a", competence: "MA.REPERE.PLAN", niveau: 1, format: "qcm",
    consigne: "Sur ce plan de la chambre, qu'y a-t-il à droite du lit ?", options: ["la lampe", "la porte", "le tapis"],
    attendu: "la lampe", figure: grid({ cols: 3, rows: 1, marks: [{ cell: "A1", text: "porte" }, { cell: "B1", text: "lit" }, { cell: "C1", text: "lampe" }] }),
    explication: "À droite du lit, juste à côté, il y a la lampe." },
  { cle: "geo-plan-n1-b", competence: "MA.REPERE.PLAN", niveau: 1, format: "qcm",
    consigne: "Sur ce plan, qu'y a-t-il à gauche de la table ?", options: ["la chaise", "la fenêtre", "le placard"],
    attendu: "la chaise", figure: grid({ cols: 3, rows: 1, marks: [{ cell: "A1", text: "chaise" }, { cell: "B1", text: "table" }, { cell: "C1", text: "fenêtre" }] }),
    explication: "À gauche de la table, juste à côté, il y a la chaise." },
  { cle: "geo-plan-n2-a", competence: "MA.REPERE.PLAN", niveau: 2, format: "qcm",
    consigne: "Sur ce plan, la fleur est devant ou derrière la maison ?", options: ["devant", "derrière"],
    attendu: "devant", figure: grid({ cols: 1, rows: 3, marks: [{ cell: "A3", text: "arbre" }, { cell: "A2", text: "maison" }, { cell: "A1", text: "fleur" }] }),
    explication: "La fleur est en bas, du côté de l'entrée : elle est devant la maison. L'arbre, lui, est derrière." },
  { cle: "geo-plan-n2-b", competence: "MA.REPERE.PLAN", niveau: 2, format: "qcm",
    consigne: "Sur ce plan de la classe, le tableau est devant ou derrière les élèves ?", options: ["devant", "derrière"],
    attendu: "devant", figure: grid({ cols: 1, rows: 3, marks: [{ cell: "A3", text: "tableau" }, { cell: "A2", text: "élèves" }, { cell: "A1", text: "porte" }] }),
    explication: "Les élèves regardent vers le haut du plan, où se trouve le tableau : le tableau est devant eux." },
  { cle: "geo-plan-n3-a", competence: "MA.REPERE.PLAN", niveau: 3, format: "qcm",
    consigne: "Sur ce plan, pour aller de la porte jusqu'à la fenêtre, tu vas vers la droite ou vers la gauche ?",
    options: ["vers la droite", "vers la gauche"], attendu: "vers la droite",
    figure: grid({ cols: 3, rows: 1, marks: [{ cell: "A1", text: "porte" }, { cell: "B1", text: "bureau" }, { cell: "C1", text: "fenêtre" }] }),
    explication: "La porte est à gauche et la fenêtre à droite : pour aller de l'une à l'autre, on va vers la droite." },
  { cle: "geo-plan-n3-b", competence: "MA.REPERE.PLAN", niveau: 3, format: "qcm",
    consigne: "Sur ce plan, pour aller du banc jusqu'au toboggan, tu vas vers la droite ou vers la gauche ?",
    options: ["vers la gauche", "vers la droite"], attendu: "vers la gauche",
    figure: grid({ cols: 3, rows: 1, marks: [{ cell: "A1", text: "toboggan" }, { cell: "B1", text: "bac à sable" }, { cell: "C1", text: "banc" }] }),
    explication: "Le banc est à droite et le toboggan à gauche : pour aller de l'un à l'autre, on va vers la gauche." },
  { cle: "geo-plan-n4-a", competence: "MA.REPERE.PLAN", niveau: 4, format: "texte",
    consigne: "Sur ce plan, écris ce qu'il y a à droite de la table.",
    attendu: "la fenêtre", figure: grid({ cols: 3, rows: 1, marks: [{ cell: "A1", text: "chaise" }, { cell: "B1", text: "table" }, { cell: "C1", text: "fenêtre" }] }),
    explication: "À droite de la table, juste à côté, il y a la fenêtre." },
  { cle: "geo-plan-n4-b", competence: "MA.REPERE.PLAN", niveau: 4, format: "texte",
    consigne: "Sur ce plan, écris ce qu'il y a à gauche de la maison.",
    attendu: "l'arbre", figure: grid({ cols: 3, rows: 1, marks: [{ cell: "A1", text: "arbre" }, { cell: "B1", text: "maison" }, { cell: "C1", text: "garage" }] }),
    explication: "À gauche de la maison, juste à côté, il y a l'arbre." },

  // =======================================================================
  // MA.GEO.CONSTRUIRE — construire sur quadrillage aimante (toucher des noeuds)
  //   N1 = tracer un segment ; N2 = carre guide ; N3 = rectangle ; N4 = triangle
  //   rectangle / rectangle plus grand. Le serveur verifie les PROPRIETES
  //   (longueurs, angles droits), toute position et toute orientation acceptees.
  // =======================================================================
  con("geo-con-n1-seg3", 1, "Touche deux nœuds pour tracer un trait droit de 3 carreaux de long.",
    { t: "seg", len: 3 }, 6, 6, [[0, 0], [0, 3]],
    "Un trait bien droit, long de trois carreaux. Tu peux le tracer vers le haut, vers le bas ou sur le côté."),
  con("geo-con-n1-seg4", 1, "Touche deux nœuds pour tracer un trait droit de 4 carreaux de long.",
    { t: "seg", len: 4 }, 6, 6, [[0, 0], [4, 0]],
    "Un trait bien droit, long de quatre carreaux. Compte bien quatre carreaux entre les deux points."),
  con("geo-con-n2-carre3", 2, "Construis un carré de 3 carreaux de côté. Touche les nœuds pour placer les quatre coins.",
    { t: "rect", w: 3, h: 3 }, 6, 6, [[0, 0], [3, 0], [3, 3], [0, 3]],
    "Un carré a ses quatre côtés égaux. Ici, chaque côté mesure trois carreaux et chaque coin est un angle droit."),
  con("geo-con-n2-carre4", 2, "Construis un carré de 4 carreaux de côté. Touche les nœuds pour placer les quatre coins.",
    { t: "rect", w: 4, h: 4 }, 6, 6, [[0, 0], [4, 0], [4, 4], [0, 4]],
    "Un carré a ses quatre côtés égaux. Ici, chaque côté mesure quatre carreaux."),
  con("geo-con-n3-rect53", 3, "Construis un rectangle de 5 carreaux sur 3. Touche les nœuds pour placer les quatre coins.",
    { t: "rect", w: 5, h: 3 }, 7, 5, [[0, 0], [5, 0], [5, 3], [0, 3]],
    "Le rectangle a deux côtés longs de cinq carreaux et deux côtés courts de trois carreaux, avec quatre angles droits."),
  con("geo-con-n3-rect42", 3, "Construis un rectangle de 4 carreaux sur 2. Touche les nœuds pour placer les quatre coins.",
    { t: "rect", w: 4, h: 2 }, 6, 5, [[0, 0], [4, 0], [4, 2], [0, 2]],
    "Deux côtés longs de quatre carreaux, deux côtés courts de deux carreaux, et quatre angles droits : c'est un rectangle."),
  con("geo-con-n4-trirect", 4, "Construis un triangle qui a un angle droit, comme le coin d'une feuille.",
    { t: "tri_right" }, 6, 6, [[0, 0], [3, 0], [0, 3]],
    "Un triangle rectangle a trois côtés et un coin bien carré. Par exemple, pars d'un coin, va tout droit, puis remonte."),
  con("geo-con-n4-rect63", 4, "Construis un rectangle de 6 carreaux sur 3. Touche les nœuds pour placer les quatre coins.",
    { t: "rect", w: 6, h: 3 }, 8, 5, [[0, 0], [6, 0], [6, 3], [0, 3]],
    "Deux côtés longs de six carreaux, deux côtés courts de trois carreaux, et quatre angles droits : c'est un rectangle."),

  // =======================================================================
  // MA.REPERE.PROGRAMMER — programmer un deplacement (type Blue-Bot)
  //   N1/N2 = LIRE un programme et toucher la case d'arrivee (clic) ;
  //   N3/N4 = ASSEMBLER un programme pour atteindre une cible (N4 : en evitant
  //   des obstacles). Le serveur SIMULE le deplacement.
  // =======================================================================
  progLire("geo-prog-n1-a", 1,
    "Le robot est sur la case B1 et il regarde vers le haut. Il suit son programme. Clique sur la case où il arrive.",
    { cols: 4, rows: 4, start: "B1", dir: "N", program: ["avance", "avance"] },
    "Le robot regarde vers le haut. Il avance de deux cases : de B1 à B2, puis à B3. Il arrive sur la case B3."),
  progLire("geo-prog-n1-b", 1,
    "Le robot est sur la case C1 et il regarde vers le haut. Il suit son programme. Clique sur la case où il arrive.",
    { cols: 4, rows: 4, start: "C1", dir: "N", program: ["avance", "avance", "avance"] },
    "Le robot avance de trois cases vers le haut : de C1 à C2, C3, puis C4. Il arrive sur la case C4."),
  progLire("geo-prog-n2-a", 2,
    "Le robot est sur la case A1 et il regarde vers le haut. Il suit son programme. Clique sur la case où il arrive.",
    { cols: 5, rows: 5, start: "A1", dir: "N", program: ["avance", "avance", "droite", "avance"] },
    "Il avance deux fois vers le haut (A1, A2, A3), puis tourne à droite : il regarde maintenant vers la droite. Il avance d'une case et arrive en B3."),
  progLire("geo-prog-n2-b", 2,
    "Le robot est sur la case A1 et il regarde vers la droite. Il suit son programme. Clique sur la case où il arrive.",
    { cols: 5, rows: 5, start: "A1", dir: "E", program: ["avance", "avance", "gauche", "avance"] },
    "Il avance deux fois vers la droite (A1, B1, C1), puis tourne à gauche : il regarde vers le haut. Il avance d'une case et arrive en C2."),
  progEcrire("geo-prog-n3-a", 3,
    "Le robot est sur la case A1 et il regarde vers le haut. Assemble un programme pour l'amener jusqu'à la case verte.",
    { cols: 5, rows: 5, start: "A1", dir: "N", target: "C3", obstacles: [] },
    ["avance", "avance", "droite", "avance", "avance"],
    "Une solution : avance, avance (jusqu'en A3), tourne à droite, puis avance, avance pour arriver en C3."),
  progEcrire("geo-prog-n3-b", 3,
    "Le robot est sur la case A1 et il regarde vers la droite. Assemble un programme pour l'amener jusqu'à la case verte.",
    { cols: 5, rows: 5, start: "A1", dir: "E", target: "D2", obstacles: [] },
    ["avance", "avance", "avance", "gauche", "avance"],
    "Une solution : avance trois fois (jusqu'en D1), tourne à gauche, puis avance une fois pour arriver en D2."),
  progEcrire("geo-prog-n4-a", 4,
    "Le robot est sur la case A1 et il regarde vers le haut. Assemble un programme pour atteindre la case verte en évitant les cases grises.",
    { cols: 5, rows: 5, start: "A1", dir: "N", target: "E5", obstacles: ["C3", "C4", "D3"] },
    ["avance", "avance", "avance", "avance", "droite", "avance", "avance", "avance", "avance"],
    "Une solution : monte tout en haut (jusqu'en A5), tourne à droite, puis longe le haut jusqu'en E5. Tu passes loin des cases grises."),
  progEcrire("geo-prog-n4-b", 4,
    "Le robot est sur la case A1 et il regarde vers le haut. Assemble un programme pour atteindre la case verte en évitant les cases grises.",
    { cols: 5, rows: 5, start: "A1", dir: "N", target: "E3", obstacles: ["C1", "C2", "D2"] },
    ["avance", "avance", "droite", "avance", "avance", "avance", "avance"],
    "Une solution : avance deux fois (jusqu'en A3), tourne à droite, puis avance jusqu'en E3. Tu passes au-dessus des cases grises."),

  // =======================================================================
  // LOT 2 — completer, reproduire, refaire de memoire, equerre, symetrie
  // =======================================================================
  // MA.GEO.CONSTRUIRE : completer un sommet manquant (3 coins donnes)
  comp("geo-con-n2-comp-carre", 2, "Il manque un coin à ce carré. Touche le nœud qui complète le carré.",
    { t: "rect", w: 3, h: 3 }, 6, 6, [[0, 0], [3, 0], [3, 3]], [[0, 0], [3, 0], [3, 3], [0, 3]],
    "Le quatrième coin ferme le carré. Place-le en face, pour que les quatre côtés soient égaux."),
  comp("geo-con-n3-comp-rect", 3, "Il manque un coin à ce rectangle. Touche le nœud qui complète le rectangle.",
    { t: "rect", w: 4, h: 2 }, 6, 5, [[0, 0], [4, 0], [4, 2]], [[0, 0], [4, 0], [4, 2], [0, 2]],
    "Le quatrième coin est en face. Les côtés opposés d'un rectangle ont la même longueur."),
  // MA.GEO.CONSTRUIRE : reproduire une figure (N3)
  rep("geo-rep-n3-rect", 3, "Regarde le modèle. Reproduis la même figure sur le quadrillage, de nœud en nœud.",
    [[0, 0], [4, 0], [4, 2], [0, 2]], 6, 4, [[1, 1], [5, 1], [5, 3], [1, 3]],
    "Compte les carreaux de chaque côté comme sur le modèle. Tu peux la tracer un peu plus loin, c'est la même figure."),
  rep("geo-rep-n3-ell", 3, "Regarde le modèle. Reproduis la même figure sur le quadrillage, de nœud en nœud.",
    [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]], 5, 4, [[1, 1], [4, 1], [4, 2], [2, 2], [2, 3], [1, 3]],
    "Suis le contour du modèle, un nœud après l'autre. Compte bien les carreaux à chaque coin."),
  // MA.GEO.CONSTRUIRE : refaire de mémoire (N4) — le modèle se cache après 3 secondes
  rep("geo-rep-n4-mem-rect", 4, "Observe bien ce rectangle. Il va se cacher. Refais-le ensuite de mémoire sur le quadrillage.",
    [[0, 0], [3, 0], [3, 2], [0, 2]], 5, 4, [[2, 1], [5, 1], [5, 3], [2, 3]],
    "C'est un rectangle de trois carreaux sur deux. Tu peux le tracer n'importe où, c'est la même figure.", true),
  rep("geo-rep-n4-mem-tri", 4, "Observe bien ce triangle. Il va se cacher. Refais-le ensuite de mémoire sur le quadrillage.",
    [[0, 0], [3, 0], [0, 2]], 5, 4, [[1, 1], [4, 1], [1, 3]],
    "C'est un triangle rectangle : un côté de trois carreaux, un côté de deux carreaux, et un angle droit entre les deux.", true),

  // MA.GEO.VOCABULAIRE : équerre — toucher TOUS les angles droits (sélection multiple)
  { cle: "geo-voc-n3-equerre", competence: "MA.GEO.VOCABULAIRE", niveau: 3, format: "grille", interact: "multi",
    consigne: "Touche tous les coins de cette figure qui sont des angles droits, comme le coin d'une feuille.",
    attendu: canonCells(["A", "B"]),
    figure: shapes(
      { kind: "segment", pts: [[20, 80], [20, 25]] }, { kind: "segment", pts: [[20, 25], [75, 25]] },
      { kind: "segment", pts: [[75, 25], [60, 80]] }, { kind: "segment", pts: [[60, 80], [20, 80]] },
      dot(20, 80, { name: "A", label: "A" }), dot(20, 25, { name: "B", label: "B" }),
      dot(75, 25, { name: "C", label: "C" }), dot(60, 80, { name: "D", label: "D" })),
    explication: "Les coins A et B sont bien carrés : ce sont des angles droits. Les coins C et D sont penchés, ce ne sont pas des angles droits." },
  { cle: "geo-voc-n4-equerre", competence: "MA.GEO.VOCABULAIRE", niveau: 4, format: "grille", interact: "multi",
    consigne: "Touche tous les coins de cette figure qui sont des angles droits.",
    attendu: canonCells(["A", "E"]),
    figure: shapes(
      { kind: "segment", pts: [[25, 80], [25, 40]] }, { kind: "segment", pts: [[25, 40], [50, 22]] },
      { kind: "segment", pts: [[50, 22], [75, 40]] }, { kind: "segment", pts: [[75, 40], [75, 80]] },
      { kind: "segment", pts: [[75, 80], [25, 80]] },
      dot(25, 80, { name: "A", label: "A" }), dot(25, 40, { name: "B", label: "B" }),
      dot(50, 22, { name: "C", label: "C" }), dot(75, 40, { name: "D", label: "D" }), dot(75, 80, { name: "E", label: "E" })),
    explication: "Les coins A et E, en bas, sont bien carrés : ce sont des angles droits. Le toit (B, C, D) est penché, ce ne sont pas des angles droits." },

  // MA.GEO.SYMETRIE : complétion par symétrie plus grande (N4, remontée)
  { cle: "geo-sym-n4-c", competence: "MA.GEO.SYMETRIE", niveau: 4, format: "grille", interact: "color",
    consigne: "Colorie les cases du haut pour compléter la figure par symétrie sur le trait du milieu.",
    attendu: canonCells(["A5", "B6", "C5", "D6", "E5"]),
    figure: grid({ cols: 5, rows: 6, axis: { dir: "h", at: 4 }, fill: ["A4", "B3", "C4", "D3", "E4"] }),
    explication: "On plie sur le trait du milieu : chaque case du bas a sa jumelle en haut, à la même distance. On colorie A5, B6, C5, D6 et E5." },
];

// Competences par sous-matiere (ordre d'affichage = ordre du referentiel).
export const COMPETENCES_GEOMETRIE = [
  "MA.GEO.FIGURES",
  "MA.GEO.VOCABULAIRE",
  "MA.GEO.SOLIDES",
  "MA.GEO.SYMETRIE",
  "MA.GEO.CONSTRUIRE",
] as const;
export const COMPETENCES_REPERE = [
  "MA.REPERE.QUADRILLAGE",
  "MA.REPERE.DEPLACEMENTS",
  "MA.REPERE.PLAN",
  "MA.REPERE.PROGRAMMER",
] as const;
export const COMPETENCES_GEO_TOUTES = [...COMPETENCES_GEOMETRIE, ...COMPETENCES_REPERE] as const;

// Items jouables pour une competence et un niveau donnes.
export function itemsGeoDe(competence: string, niveau: number): GeoItem[] {
  return BANQUE_GEOMETRIE.filter((i) => i.competence === competence && i.niveau === niveau);
}

// Juge local (mode demo + feedback immediat) : miroir exact du serveur. Pour les
// formats juges par proprietes (construire / programme), la saisie est un JSON
// (liste de sommets ou de cartes) compare au `spec` de l'item.
export function estJusteGeometrie(cle: string, saisie: string): boolean {
  const item = BANQUE_GEOMETRIE.find((i) => i.cle === cle);
  if (!item) return false;
  if (item.format === "construire") {
    try {
      return verifConstruire(item.spec as ConstruireSpec, JSON.parse(saisie) as Pt[]);
    } catch {
      return false;
    }
  }
  if (item.format === "programme") {
    try {
      return verifProgramme(item.spec as ProgrammeSpec, JSON.parse(saisie) as ProgToken[]);
    } catch {
      return false;
    }
  }
  if (item.format === "reproduire") {
    try {
      return verifReproduire(item.spec as ReproduireSpec, JSON.parse(saisie) as Pt[]);
    } catch {
      return false;
    }
  }
  return comparerGeometrie(item.format, saisie, item.attendu);
}

// Recupere un item par sa cle (utilise par le composant d'exercice).
export function itemGeoParCle(cle: string): GeoItem | undefined {
  return BANQUE_GEOMETRIE.find((i) => i.cle === cle);
}

// ==========================================================================
// GENERATEUR : le generateur choisit un ITEM de la banque pour la competence et
// le niveau, de facon reproductible (graine). Le composant <Geometrie> le rend ;
// le serveur (verif_geo, op 'geo') est seul juge via la cle. Repli robuste si
// aucun item (ne devrait pas arriver : le referentiel ne cree l'exercice que si
// des items existent).
// ==========================================================================
export function buildGeometrie(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const items = itemsGeoDe(src.competence, src.niveau);
  const item = items.length > 0 ? pick(rng, items) : null;
  if (!item) {
    return {
      ...base,
      forme: "geometrie",
      support: "aucun",
      saisie: "geometrie",
      prompt: "Géométrie",
      answer: 0,
      reste: null,
      fields: 1,
      verif: { op: "geo", a: 0, b: 0, cle: "" },
      correction: "",
    };
  }
  return {
    ...base,
    forme: "geometrie",
    support: "aucun",
    saisie: "geometrie",
    prompt: item.consigne,
    answer: 0,
    reste: null,
    fields: 1,
    geo: {
      cle: item.cle,
      format: item.format,
      consigne: item.consigne,
      options: item.options,
      attendu: item.attendu,
      explication: item.explication,
      figure: item.figure,
      interact: item.interact,
    },
    verif: { op: "geo", a: 0, b: 0, cle: item.cle },
    correction: item.explication,
  };
}
