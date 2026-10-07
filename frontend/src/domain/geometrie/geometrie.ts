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
export type GeoFormat = "qcm" | "clic" | "texte" | "grille";
export type GeoInteract = "color" | "point"; // mode d'un exercice « grille »

export type SolidName = "cube" | "pave" | "cylindre" | "sphere" | "pyramide" | "cone";

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
  start?: string; // marqueur de depart (deplacements)
  target?: string; // case/noeud mis en evidence (correction)
  marks?: Array<{ cell: string; text: string }>; // objets d'un plan / etiquettes
}

export type GeoFigure =
  | { kind: "shapes"; shapes: GeoShape[] }
  | { kind: "solid"; solid: SolidName }
  | { kind: "grid"; grid: GeoGridSpec }
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
  interact?: GeoInteract; // mode « grille » : colorier (symetrie) ou placer un point
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
function circle(cx: number, cy: number, r: number, extra: Partial<GeoShape> = {}): GeoShape {
  return { kind: "circle", cx, cy, r, ...extra };
}
function dot(cx: number, cy: number, extra: Partial<GeoShape> = {}): GeoShape {
  return { kind: "dot", cx, cy, ...extra };
}

const shapes = (...s: GeoShape[]): GeoFigure => ({ kind: "shapes", shapes: s });
const grid = (g: GeoGridSpec): GeoFigure => ({ kind: "grid", grid: g });
const solid = (s: SolidName): GeoFigure => ({ kind: "solid", solid: s });

// ==========================================================================
// BANQUE
// ==========================================================================
export const BANQUE_GEOMETRIE: GeoItem[] = [
  // =======================================================================
  // MA.GEO.FIGURES — reconnaitre et nommer les figures planes
  // =======================================================================
  // N1 : QCM « quelle est cette figure ? » (une figure dessinee)
  { cle: "geo-fig-n1-carre", competence: "MA.GEO.FIGURES", niveau: 1, format: "qcm",
    consigne: "Quelle est cette figure ?", options: ["un carré", "un rectangle", "un triangle"],
    attendu: "un carré", figure: shapes(square(50, 50, 48, { fill: true })),
    explication: "Cette figure a quatre côtés de la même longueur et quatre coins bien droits : c'est un carré." },
  { cle: "geo-fig-n1-rectangle", competence: "MA.GEO.FIGURES", niveau: 1, format: "qcm",
    consigne: "Quelle est cette figure ?", options: ["un rectangle", "un carré", "un cercle"],
    attendu: "un rectangle", figure: shapes(rect(50, 50, 72, 40, { fill: true })),
    explication: "Cette figure a quatre coins droits, deux côtés longs et deux côtés courts : c'est un rectangle." },
  { cle: "geo-fig-n1-triangle", competence: "MA.GEO.FIGURES", niveau: 1, format: "qcm",
    consigne: "Quelle est cette figure ?", options: ["un triangle", "un carré", "un cercle"],
    attendu: "un triangle", figure: shapes(triangle(50, 52, 56, { fill: true })),
    explication: "Cette figure a trois côtés et trois coins : c'est un triangle." },
  { cle: "geo-fig-n1-cercle", competence: "MA.GEO.FIGURES", niveau: 1, format: "qcm",
    consigne: "Quelle est cette figure ?", options: ["un cercle", "un carré", "un triangle"],
    attendu: "un cercle", figure: shapes(circle(50, 50, 30, { fill: true })),
    explication: "Cette figure est toute ronde, sans aucun coin : c'est un cercle." },
  // N2 : clic sur la bonne figure parmi trois
  { cle: "geo-fig-n2-carre", competence: "MA.GEO.FIGURES", niveau: 2, format: "clic",
    consigne: "Clique sur le carré.", attendu: "carré",
    figure: shapes(circle(20, 50, 15, { name: "cercle" }), square(50, 50, 30, { name: "carré" }), triangle(82, 52, 30, { name: "triangle" })),
    explication: "Le carré a quatre côtés de la même longueur. C'est celui du milieu." },
  { cle: "geo-fig-n2-triangle", competence: "MA.GEO.FIGURES", niveau: 2, format: "clic",
    consigne: "Clique sur le triangle.", attendu: "triangle",
    figure: shapes(square(20, 50, 28, { name: "carré" }), triangle(50, 52, 30, { name: "triangle" }), circle(82, 50, 15, { name: "cercle" })),
    explication: "Le triangle a trois côtés. C'est celui du milieu." },
  { cle: "geo-fig-n2-cercle", competence: "MA.GEO.FIGURES", niveau: 2, format: "clic",
    consigne: "Clique sur le cercle.", attendu: "cercle",
    figure: shapes(triangle(20, 52, 30, { name: "triangle" }), rect(52, 50, 34, 24, { name: "rectangle" }), circle(84, 50, 15, { name: "cercle" })),
    explication: "Le cercle est tout rond, sans coin. C'est celui de droite." },
  // N3 : QCM — reconnaitre un triangle rectangle (un angle droit comme un coin de feuille)
  { cle: "geo-fig-n3-trirect", competence: "MA.GEO.FIGURES", niveau: 3, format: "qcm",
    consigne: "Ce triangle a-t-il un angle droit, comme le coin d'une feuille ?", options: ["oui", "non"],
    attendu: "oui", figure: shapes(triRight(50, 50, 52, { fill: true }), { kind: "right", cx: 24, cy: 76 }),
    explication: "Un de ses coins forme un angle droit, bien carré comme le coin d'une feuille. On dit un triangle rectangle." },
  { cle: "geo-fig-n3-tri", competence: "MA.GEO.FIGURES", niveau: 3, format: "qcm",
    consigne: "Ce triangle a-t-il un angle droit, comme le coin d'une feuille ?", options: ["non", "oui"],
    attendu: "non", figure: shapes(triangle(50, 52, 56, { fill: true })),
    explication: "Aucun de ses coins n'est bien carré : c'est un triangle ordinaire, pas un triangle rectangle." },
  { cle: "geo-fig-n3-rect", competence: "MA.GEO.FIGURES", niveau: 3, format: "qcm",
    consigne: "Quelle est cette figure ?", options: ["un rectangle", "un carré", "un triangle rectangle"],
    attendu: "un rectangle", figure: shapes(rect(50, 50, 74, 38, { fill: true })),
    explication: "Elle a quatre coins droits mais ses côtés ne sont pas tous égaux : c'est un rectangle." },
  // N4 : reponse libre — ecrire le nom de la figure
  { cle: "geo-fig-n4-carre", competence: "MA.GEO.FIGURES", niveau: 4, format: "texte",
    consigne: "Écris le nom de cette figure.", attendu: "carré", figure: shapes(square(50, 50, 46, { fill: true })),
    explication: "Quatre côtés égaux et quatre coins droits : c'est un carré." },
  { cle: "geo-fig-n4-rectangle", competence: "MA.GEO.FIGURES", niveau: 4, format: "texte",
    consigne: "Écris le nom de cette figure.", attendu: "rectangle", figure: shapes(rect(50, 50, 72, 40, { fill: true })),
    explication: "Quatre coins droits, deux côtés longs et deux côtés courts : c'est un rectangle." },
  { cle: "geo-fig-n4-triangle", competence: "MA.GEO.FIGURES", niveau: 4, format: "texte",
    consigne: "Écris le nom de cette figure.", attendu: "triangle", figure: shapes(triangle(50, 52, 56, { fill: true })),
    explication: "Trois côtés et trois coins : c'est un triangle." },
  { cle: "geo-fig-n4-cercle", competence: "MA.GEO.FIGURES", niveau: 4, format: "texte",
    consigne: "Écris le nom de cette figure.", attendu: "cercle", figure: shapes(circle(50, 50, 30, { fill: true })),
    explication: "Tout rond, sans coin : c'est un cercle." },

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
];

// Competences par sous-matiere (ordre d'affichage = ordre du referentiel).
export const COMPETENCES_GEOMETRIE = [
  "MA.GEO.FIGURES",
  "MA.GEO.VOCABULAIRE",
  "MA.GEO.SOLIDES",
  "MA.GEO.SYMETRIE",
] as const;
export const COMPETENCES_REPERE = [
  "MA.REPERE.QUADRILLAGE",
  "MA.REPERE.DEPLACEMENTS",
  "MA.REPERE.PLAN",
] as const;
export const COMPETENCES_GEO_TOUTES = [...COMPETENCES_GEOMETRIE, ...COMPETENCES_REPERE] as const;

// Items jouables pour une competence et un niveau donnes.
export function itemsGeoDe(competence: string, niveau: number): GeoItem[] {
  return BANQUE_GEOMETRIE.filter((i) => i.competence === competence && i.niveau === niveau);
}

// Juge local (mode demo + feedback immediat) : miroir exact du serveur.
export function estJusteGeometrie(cle: string, saisie: string): boolean {
  const item = BANQUE_GEOMETRIE.find((i) => i.cle === cle);
  if (!item) return false;
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
