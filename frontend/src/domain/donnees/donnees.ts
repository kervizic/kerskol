// Banque d'exercices « TABLEAUX ET GRAPHIQUES » (maths, CE2, programme cycle 2
// revise 2024). Nouvelle sous-matiere, domaine dedie `donnees` :
//
//   MA.DONNEES.TABLEAU      lire un tableau simple puis a double entree ;
//   MA.DONNEES.COMPLETER    completer un tableau (une case manquante, un total) ;
//   MA.DONNEES.BARRES       lire un diagramme en barres, regler / completer une
//                           barre ;
//   MA.DONNEES.PICTOGRAMME  lire un pictogramme (une image vaut n objets) ;
//   MA.DONNEES.COMPARER     comparer a partir des donnees (combien de plus, de
//                           moins, lequel le plus) : EXTRAIRE une information
//                           d'une representation, pas resoudre un probleme.
//
// Pas de doublon avec « Problemes » : ici l'enonce renvoie TOUJOURS a une
// representation affichee (tableau, barres, pictogramme) qu'il faut LIRE ; il n'y
// a ni mascotte, ni histoire, ni mise en situation. Aucune donnee de calendrier
// (jamais « par jour / par mois ») : les themes sont le quotidien d'un enfant
// (fruits de la classe, animaux, billes, livres lus...).
//
// ARCHITECTURE (miroir EXACT de la geometrie, phase 3) : chaque item porte une
// cle stable, un format (qcm / clic / texte / grille), une consigne redigee POUR
// L'ORAL (phrases courtes, aucun symbole ni fleche), une reponse attendue, une
// explication valorisante AVEC un exemple, et un SCHEMA (`figure`) porte par
// l'exercice. Le SERVEUR reste SEUL JUGE : la table de reference
// public.donnees_item (migration 0044) porte (cle, competence, niveau, format,
// attendu) et verif_donnees compare la saisie normalisee ; l'op dediee est 'don'.
// Un test croise garantit front == SQL (donnees.test.ts + donnees_test.sql).
//
// Progression des formats (decision pedagogique) : N1 QCM ; N2/N3 QCM ou clic
// (toucher une ligne, une barre) ou grille (regler une barre) ; N4 reponse LIBRE
// (taper le nombre lu ou calcule). Les figures sont DETERMINISTES -> tests golden.
//
// Le reperage lignes / colonnes du tableau reutilise le principe du quadrillage
// de la phase 3 (lire d'abord la ligne, puis la colonne).

import { normaliser } from "../diagnostic/lettres";
import { normaliserMot } from "../francais/dictee";
import { pick, type Rng } from "../calcul/rng";
import type { Base, GeneratedExercise, ExCalcul } from "../calcul/generator";

// --------------------------------------------------------------------------
// Schema d'une figure (dessinee par le composant <Donnees>).
// --------------------------------------------------------------------------
export type DonFormat = "qcm" | "clic" | "texte" | "grille";
export type DonInteract = "bar"; // mode d'un exercice « grille » : regler une barre

// Tableau (simple ou a double entree). `cells[ligne][colonne]` ; une case egale
// a "?" est la case a completer (mise en evidence). `rowHeaders` = libelles des
// lignes ; `colHeaders` = libelles des colonnes (une seule colonne = tableau
// simple, le libelle est alors le titre de la valeur, ex. « Nombre »).
export interface DonTable {
  kind: "table";
  colHeaders: string[];
  rowHeaders: string[];
  cells: string[][];
}

// Diagramme en barres. `cats` = categories (libelle + valeur). `max` = hauteur
// de l'echelle (graduations 1..max). `blank` = libelle d'une barre a REGLER
// (sa valeur dans `cats` est la reponse, la barre est dessinee vide). `hi` =
// barre mise en evidence (correction).
export interface DonBars {
  kind: "bars";
  cats: Array<{ label: string; value: number }>;
  max: number;
  blank?: string;
  hi?: string;
}

// Pictogramme : une image (`symbol`) vaut `each` objets. `cats` = categories
// (libelle + NOMBRE D'IMAGES). `hi` = ligne mise en evidence (correction).
export interface DonPicto {
  kind: "picto";
  each: number;
  symbol: string;
  cats: Array<{ label: string; count: number }>;
  hi?: string;
}

export type DonFigure = DonTable | DonBars | DonPicto | { kind: "none" };

export interface DonItem {
  cle: string; // identifiant stable (PK serveur)
  competence: string; // MA.DONNEES.*
  niveau: number; // 1..4
  format: DonFormat;
  consigne: string; // instruction (redigee pour l'oral)
  options?: string[]; // mode qcm : propositions
  attendu: string; // reponse attendue (comparee normalisee)
  explication: string; // correction courte et valorisante, avec un exemple
  figure: DonFigure; // schema dessine par le composant
  interact?: DonInteract; // mode « grille » : regler une barre
}

// Donnees de RENDU (ce que l'exercice porte et que <Donnees> affiche).
export type DonRender = Pick<
  DonItem,
  "cle" | "format" | "consigne" | "options" | "attendu" | "explication" | "figure" | "interact"
>;

// --------------------------------------------------------------------------
// Comparaison MIROIR du serveur (verif_donnees) :
//   qcm    -> normaliser (accents gardes, minuscule, espaces normalises) ;
//   grille -> comparaison stricte (minuscule, espaces retires) ;
//   texte / clic -> normaliserMot (accents EXIGES, ponctuation de bord retiree).
// --------------------------------------------------------------------------
export function normDonGrille(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, "");
}
export function comparerDonnees(format: DonFormat, saisie: string, attendu: string): boolean {
  if (format === "qcm") return normaliser(saisie) === normaliser(attendu);
  if (format === "grille") return normDonGrille(saisie) === normDonGrille(attendu);
  return normaliserMot(saisie) === normaliserMot(attendu);
}

// --------------------------------------------------------------------------
// Helpers de construction des figures (gardent la banque lisible).
// --------------------------------------------------------------------------
function table(colHeaders: string[], rows: Array<[string, ...string[]]>): DonFigure {
  return {
    kind: "table",
    colHeaders,
    rowHeaders: rows.map((r) => r[0]),
    cells: rows.map((r) => r.slice(1) as string[]),
  };
}
function bars(max: number, cats: Array<{ label: string; value: number }>, extra: Partial<DonBars> = {}): DonFigure {
  return { kind: "bars", max, cats, ...extra };
}
function picto(each: number, symbol: string, cats: Array<{ label: string; count: number }>, extra: Partial<DonPicto> = {}): DonFigure {
  return { kind: "picto", each, symbol, cats, ...extra };
}

// ==========================================================================
// BANQUE (40 items : 5 competences x 4 niveaux x 2).
// ==========================================================================
export const BANQUE_DONNEES: DonItem[] = [
  // =======================================================================
  // MA.DONNEES.TABLEAU — lire un tableau simple puis a double entree
  // =======================================================================
  // N1 : QCM — lire une valeur dans un tableau simple
  { cle: "don-tab-n1-a", competence: "MA.DONNEES.TABLEAU", niveau: 1, format: "qcm",
    consigne: "Dans ce tableau, combien d'enfants préfèrent les bananes ?",
    options: ["3", "5", "8"], attendu: "3",
    figure: table(["Nombre d'enfants"], [["pommes", "5"], ["bananes", "3"], ["fraises", "8"]]),
    explication: "On cherche la ligne des bananes et on lit le nombre à côté : 3 enfants." },
  { cle: "don-tab-n1-b", competence: "MA.DONNEES.TABLEAU", niveau: 1, format: "qcm",
    consigne: "Dans ce tableau, combien y a-t-il de moutons ?",
    options: ["7", "6", "4"], attendu: "7",
    figure: table(["Nombre d'animaux"], [["poules", "6"], ["vaches", "4"], ["moutons", "7"]]),
    explication: "On lit la ligne des moutons : il y a 7 moutons." },
  // N2 : clic sur une ligne (lire une information) + QCM double entree
  { cle: "don-tab-n2-a", competence: "MA.DONNEES.TABLEAU", niveau: 2, format: "clic",
    consigne: "Dans ce tableau, clique sur la ligne de l'enfant qui a lu 5 livres.",
    attendu: "Zoé",
    figure: table(["Livres lus"], [["Léa", "4"], ["Tom", "2"], ["Zoé", "5"]]),
    explication: "On cherche le nombre 5 dans le tableau : c'est la ligne de Zoé, qui a lu 5 livres." },
  { cle: "don-tab-n2-b", competence: "MA.DONNEES.TABLEAU", niveau: 2, format: "qcm",
    consigne: "Dans ce tableau, combien de billes rouges a Léa ?",
    options: ["3", "5", "6"], attendu: "3",
    figure: table(["Léa", "Tom"], [["billes rouges", "3", "5"], ["billes bleues", "6", "2"]]),
    explication: "On croise la ligne des billes rouges et la colonne de Léa : elle a 3 billes rouges." },
  // N3 : QCM — lire une case d'un tableau a double entree
  { cle: "don-tab-n3-a", competence: "MA.DONNEES.TABLEAU", niveau: 3, format: "qcm",
    consigne: "Dans ce tableau, combien d'oiseaux a Nadia ?",
    options: ["4", "2", "1"], attendu: "4",
    figure: table(["Nadia", "Hugo"], [["chats", "2", "1"], ["chiens", "1", "3"], ["oiseaux", "4", "2"]]),
    explication: "On croise la ligne des oiseaux et la colonne de Nadia : elle a 4 oiseaux." },
  { cle: "don-tab-n3-b", competence: "MA.DONNEES.TABLEAU", niveau: 3, format: "qcm",
    consigne: "Dans ce tableau, combien de gommes a la classe B ?",
    options: ["6", "3", "5"], attendu: "6",
    figure: table(["Classe A", "Classe B"], [["crayons", "8", "5"], ["gommes", "3", "6"]]),
    explication: "On croise la ligne des gommes et la colonne de la classe B : elle a 6 gommes." },
  // N4 : reponse libre — lire une case d'un tableau a double entree
  { cle: "don-tab-n4-a", competence: "MA.DONNEES.TABLEAU", niveau: 4, format: "texte",
    consigne: "Dans ce tableau, écris combien de poires a Sacha.",
    attendu: "2",
    figure: table(["Emma", "Sacha"], [["pommes", "4", "7"], ["poires", "5", "2"]]),
    explication: "On croise la ligne des poires et la colonne de Sacha : il a 2 poires." },
  { cle: "don-tab-n4-b", competence: "MA.DONNEES.TABLEAU", niveau: 4, format: "texte",
    consigne: "Dans ce tableau, écris combien il y a de carrés bleus.",
    attendu: "8",
    figure: table(["Rouge", "Bleu"], [["ronds", "6", "4"], ["carrés", "3", "8"]]),
    explication: "On croise la ligne des carrés et la colonne Bleu : il y a 8 carrés bleus." },

  // =======================================================================
  // MA.DONNEES.COMPLETER — completer un tableau (case manquante, total)
  // =======================================================================
  // N1 : QCM — completer avec le total
  { cle: "don-comp-n1-a", competence: "MA.DONNEES.COMPLETER", niveau: 1, format: "qcm",
    consigne: "Dans ce tableau, le total est 10. Il y a 6 filles. Quel nombre complète la case des garçons ?",
    options: ["4", "6", "10"], attendu: "4",
    figure: table(["Nombre"], [["filles", "6"], ["garçons", "?"], ["Total", "10"]]),
    explication: "6 et 4 font 10 : on écrit 4 dans la case des garçons." },
  { cle: "don-comp-n1-b", competence: "MA.DONNEES.COMPLETER", niveau: 1, format: "qcm",
    consigne: "Dans ce tableau, le total est 8 fruits. Il y a 5 pommes. Quel nombre complète la case des poires ?",
    options: ["3", "5", "8"], attendu: "3",
    figure: table(["Nombre"], [["pommes", "5"], ["poires", "?"], ["Total", "8"]]),
    explication: "5 et 3 font 8 : on écrit 3 dans la case des poires." },
  // N2 : QCM — completer avec plusieurs valeurs connues
  { cle: "don-comp-n2-a", competence: "MA.DONNEES.COMPLETER", niveau: 2, format: "qcm",
    consigne: "Dans ce tableau, le total est 12 billes. Quel nombre complète la case des billes vertes ?",
    options: ["5", "4", "3"], attendu: "5",
    figure: table(["Nombre"], [["rouges", "4"], ["bleues", "3"], ["vertes", "?"], ["Total", "12"]]),
    explication: "4 et 3 font 7. Il faut 5 de plus pour arriver à 12 : on écrit 5." },
  { cle: "don-comp-n2-b", competence: "MA.DONNEES.COMPLETER", niveau: 2, format: "qcm",
    consigne: "Dans ce tableau, le total est 11 animaux. Il y a 7 chiens. Quel nombre complète la case des chats ?",
    options: ["4", "7", "11"], attendu: "4",
    figure: table(["Nombre"], [["chiens", "7"], ["chats", "?"], ["Total", "11"]]),
    explication: "7 et 4 font 11 : on écrit 4 dans la case des chats." },
  // N3 : QCM — completer une ligne parmi plusieurs
  { cle: "don-comp-n3-a", competence: "MA.DONNEES.COMPLETER", niveau: 3, format: "qcm",
    consigne: "Dans ce tableau, le total est 14. Quel nombre complète la case des rollers ?",
    options: ["3", "5", "6"], attendu: "3",
    figure: table(["Nombre"], [["vélos", "6"], ["trottinettes", "5"], ["rollers", "?"], ["Total", "14"]]),
    explication: "6 et 5 font 11. Il faut 3 de plus pour arriver à 14 : on écrit 3." },
  { cle: "don-comp-n3-b", competence: "MA.DONNEES.COMPLETER", niveau: 3, format: "qcm",
    consigne: "Dans ce tableau, le total est 15 livres. Il y a 9 romans. Quel nombre complète la case des BD ?",
    options: ["6", "9", "15"], attendu: "6",
    figure: table(["Nombre"], [["BD", "?"], ["romans", "9"], ["Total", "15"]]),
    explication: "9 et 6 font 15 : on écrit 6 dans la case des BD." },
  // N4 : reponse libre — completer une case
  { cle: "don-comp-n4-a", competence: "MA.DONNEES.COMPLETER", niveau: 4, format: "texte",
    consigne: "Dans ce tableau, le total est 10 parties. Il y a 7 parties gagnées. Écris le nombre de parties perdues.",
    attendu: "3",
    figure: table(["Nombre"], [["gagnées", "7"], ["perdues", "?"], ["Total", "10"]]),
    explication: "7 et 3 font 10 : on écrit 3 parties perdues." },
  { cle: "don-comp-n4-b", competence: "MA.DONNEES.COMPLETER", niveau: 4, format: "texte",
    consigne: "Dans ce tableau, le total est 13 bonbons. Il y a 8 bonbons rouges. Écris le nombre de bonbons verts.",
    attendu: "5",
    figure: table(["Nombre"], [["rouges", "8"], ["verts", "?"], ["Total", "13"]]),
    explication: "8 et 5 font 13 : on écrit 5 bonbons verts." },

  // =======================================================================
  // MA.DONNEES.BARRES — lire un diagramme en barres, regler une barre
  // =======================================================================
  // N1 : QCM — lire la hauteur d'une barre
  { cle: "don-bar-n1-a", competence: "MA.DONNEES.BARRES", niveau: 1, format: "qcm",
    consigne: "Regarde le diagramme. Combien vaut la barre des bananes ?",
    options: ["6", "4", "3"], attendu: "6",
    figure: bars(8, [{ label: "pommes", value: 4 }, { label: "bananes", value: 6 }, { label: "kiwis", value: 3 }]),
    explication: "La barre des bananes monte jusqu'au trait 6 : elle vaut 6." },
  { cle: "don-bar-n1-b", competence: "MA.DONNEES.BARRES", niveau: 1, format: "qcm",
    consigne: "Regarde le diagramme. Combien vaut la barre des lapins ?",
    options: ["7", "5", "2"], attendu: "7",
    figure: bars(8, [{ label: "chats", value: 5 }, { label: "chiens", value: 2 }, { label: "lapins", value: 7 }]),
    explication: "La barre des lapins monte jusqu'au trait 7 : elle vaut 7." },
  // N2 : clic sur la barre la plus haute / la plus basse
  { cle: "don-bar-n2-a", competence: "MA.DONNEES.BARRES", niveau: 2, format: "clic",
    consigne: "Clique sur la barre la plus haute.",
    attendu: "bleu",
    figure: bars(10, [{ label: "rouge", value: 3 }, { label: "bleu", value: 8 }, { label: "vert", value: 5 }]),
    explication: "La barre bleue monte le plus haut, jusqu'au trait 8 : c'est la plus haute." },
  { cle: "don-bar-n2-b", competence: "MA.DONNEES.BARRES", niveau: 2, format: "clic",
    consigne: "Clique sur la barre la plus basse.",
    attendu: "vélo",
    figure: bars(10, [{ label: "foot", value: 6 }, { label: "vélo", value: 2 }, { label: "natation", value: 9 }]),
    explication: "La barre du vélo s'arrête le plus bas, au trait 2 : c'est la plus basse." },
  // N3 : grille — regler une barre a la bonne hauteur
  { cle: "don-bar-n3-a", competence: "MA.DONNEES.BARRES", niveau: 3, format: "grille", interact: "bar",
    consigne: "Règle la barre des cartes sur 5. Touche la hauteur 5 au-dessus des cartes.",
    attendu: "5",
    figure: bars(8, [{ label: "billes", value: 4 }, { label: "cartes", value: 5 }, { label: "timbres", value: 6 }], { blank: "cartes" }),
    explication: "On fait monter la barre des cartes jusqu'au trait 5 : elle vaut 5." },
  { cle: "don-bar-n3-b", competence: "MA.DONNEES.BARRES", niveau: 3, format: "grille", interact: "bar",
    consigne: "Règle la barre des billes bleues sur 7. Touche la hauteur 7 au-dessus des billes bleues.",
    attendu: "7",
    figure: bars(8, [{ label: "rouges", value: 3 }, { label: "bleues", value: 7 }, { label: "vertes", value: 2 }], { blank: "bleues" }),
    explication: "On fait monter la barre des billes bleues jusqu'au trait 7 : elle vaut 7." },
  // N4 : reponse libre — lire la hauteur d'une barre
  { cle: "don-bar-n4-a", competence: "MA.DONNEES.BARRES", niveau: 4, format: "texte",
    consigne: "Regarde le diagramme. Écris le nombre que montre la barre des livres.",
    attendu: "8",
    figure: bars(10, [{ label: "livres", value: 8 }, { label: "films", value: 5 }, { label: "jeux", value: 3 }]),
    explication: "La barre des livres monte jusqu'au trait 8 : elle vaut 8." },
  { cle: "don-bar-n4-b", competence: "MA.DONNEES.BARRES", niveau: 4, format: "texte",
    consigne: "Regarde le diagramme. Écris le nombre que montre la barre des tomates.",
    attendu: "9",
    figure: bars(10, [{ label: "carottes", value: 4 }, { label: "tomates", value: 9 }, { label: "salades", value: 6 }]),
    explication: "La barre des tomates monte jusqu'au trait 9 : elle vaut 9." },

  // =======================================================================
  // MA.DONNEES.PICTOGRAMME — une image vaut n objets
  // =======================================================================
  // N1 : QCM — une image vaut 1 objet (on compte les images)
  { cle: "don-pic-n1-a", competence: "MA.DONNEES.PICTOGRAMME", niveau: 1, format: "qcm",
    consigne: "Chaque image est une pomme. Combien y a-t-il de pommes ?",
    options: ["4", "2", "6"], attendu: "4",
    figure: picto(1, "pomme", [{ label: "pommes", count: 4 }]),
    explication: "Chaque image est une pomme. On compte les images : il y en a 4." },
  { cle: "don-pic-n1-b", competence: "MA.DONNEES.PICTOGRAMME", niveau: 1, format: "qcm",
    consigne: "Chaque image est une étoile. Combien y a-t-il d'étoiles ?",
    options: ["5", "4", "6"], attendu: "5",
    figure: picto(1, "étoile", [{ label: "étoiles", count: 5 }]),
    explication: "Chaque image est une étoile. On compte les images : il y en a 5." },
  // N2 : QCM — une image vaut 2 objets
  { cle: "don-pic-n2-a", competence: "MA.DONNEES.PICTOGRAMME", niveau: 2, format: "qcm",
    consigne: "Chaque image vaut 2 ballons. Il y a 3 images. Combien y a-t-il de ballons en tout ?",
    options: ["6", "3", "5"], attendu: "6",
    figure: picto(2, "ballon", [{ label: "ballons", count: 3 }]),
    explication: "Chaque image, c'est 2 ballons. 2 et 2 et 2 font 6 : il y a 6 ballons." },
  { cle: "don-pic-n2-b", competence: "MA.DONNEES.PICTOGRAMME", niveau: 2, format: "qcm",
    consigne: "Chaque image vaut 2 fleurs. Il y a 4 images. Combien y a-t-il de fleurs en tout ?",
    options: ["8", "6", "4"], attendu: "8",
    figure: picto(2, "fleur", [{ label: "fleurs", count: 4 }]),
    explication: "Chaque image, c'est 2 fleurs. 4 images font 2 et 2 et 2 et 2, donc 8 fleurs." },
  // N3 : clic — comparer deux lignes d'un pictogramme
  { cle: "don-pic-n3-a", competence: "MA.DONNEES.PICTOGRAMME", niveau: 3, format: "clic",
    consigne: "Chaque image vaut 2 animaux. Clique sur la ligne où il y a le plus d'animaux.",
    attendu: "lapins",
    figure: picto(2, "animal", [{ label: "poules", count: 2 }, { label: "lapins", count: 4 }]),
    explication: "Les lapins ont 4 images, soit 8 animaux. Les poules ont 2 images, soit 4 animaux. Les lapins sont les plus nombreux." },
  { cle: "don-pic-n3-b", competence: "MA.DONNEES.PICTOGRAMME", niveau: 3, format: "clic",
    consigne: "Chaque image vaut 5 autocollants. Clique sur la ligne de l'enfant qui a le plus d'autocollants.",
    attendu: "Tom",
    figure: picto(5, "autocollant", [{ label: "Léa", count: 2 }, { label: "Tom", count: 3 }]),
    explication: "Tom a 3 images, soit 15 autocollants. Léa a 2 images, soit 10 autocollants. Tom en a le plus." },
  // N4 : reponse libre — une image vaut n objets, calculer le total
  { cle: "don-pic-n4-a", competence: "MA.DONNEES.PICTOGRAMME", niveau: 4, format: "texte",
    consigne: "Chaque image vaut 2 glaces. Il y a 5 images. Écris combien de glaces en tout.",
    attendu: "10",
    figure: picto(2, "glace", [{ label: "glaces", count: 5 }]),
    explication: "Chaque image, c'est 2 glaces. 2 fois 5 font 10 : il y a 10 glaces." },
  { cle: "don-pic-n4-b", competence: "MA.DONNEES.PICTOGRAMME", niveau: 4, format: "texte",
    consigne: "Chaque image vaut 5 billes. Il y a 3 images. Écris combien de billes en tout.",
    attendu: "15",
    figure: picto(5, "bille", [{ label: "billes", count: 3 }]),
    explication: "Chaque image, c'est 5 billes. 5 et 5 et 5 font 15 : il y a 15 billes." },

  // =======================================================================
  // MA.DONNEES.COMPARER — comparer a partir des donnees
  // =======================================================================
  // N1 : QCM — lequel le plus
  { cle: "don-cmp-n1-a", competence: "MA.DONNEES.COMPARER", niveau: 1, format: "qcm",
    consigne: "Regarde le tableau. Qui a le plus de billes ?",
    options: ["Tom", "Léa"], attendu: "Tom",
    figure: table(["Billes"], [["Léa", "5"], ["Tom", "8"]]),
    explication: "Tom a 8 billes, Léa en a 5. 8 est plus grand que 5 : Tom en a le plus." },
  { cle: "don-cmp-n1-b", competence: "MA.DONNEES.COMPARER", niveau: 1, format: "qcm",
    consigne: "Regarde le tableau. Y a-t-il le plus de pommes ou de poires ?",
    options: ["des poires", "des pommes"], attendu: "des poires",
    figure: table(["Nombre"], [["pommes", "4"], ["poires", "7"]]),
    explication: "Il y a 7 poires et 4 pommes. 7 est plus grand que 4 : il y a le plus de poires." },
  // N2 : QCM — combien de plus
  { cle: "don-cmp-n2-a", competence: "MA.DONNEES.COMPARER", niveau: 2, format: "qcm",
    consigne: "Regarde le tableau. Combien Tom a-t-il de billes de plus que Léa ?",
    options: ["3", "9", "6"], attendu: "3",
    figure: table(["Billes"], [["Léa", "6"], ["Tom", "9"]]),
    explication: "Tom a 9 billes, Léa en a 6. 9 moins 6 font 3 : Tom a 3 billes de plus." },
  { cle: "don-cmp-n2-b", competence: "MA.DONNEES.COMPARER", niveau: 2, format: "qcm",
    consigne: "Regarde le tableau. Combien y a-t-il de chiens de plus que de chats ?",
    options: ["3", "7", "4"], attendu: "3",
    figure: table(["Nombre"], [["chats", "4"], ["chiens", "7"]]),
    explication: "Il y a 7 chiens et 4 chats. 7 moins 4 font 3 : il y a 3 chiens de plus." },
  // N3 : QCM — combien de moins (a partir d'un diagramme en barres)
  { cle: "don-cmp-n3-a", competence: "MA.DONNEES.COMPARER", niveau: 3, format: "qcm",
    consigne: "Regarde le diagramme. Combien la barre bleue a-t-elle de moins que la barre rouge ?",
    options: ["3", "5", "8"], attendu: "3",
    figure: bars(10, [{ label: "rouge", value: 8 }, { label: "bleu", value: 5 }]),
    explication: "La barre rouge vaut 8, la bleue vaut 5. 8 moins 5 font 3 : la bleue a 3 de moins." },
  { cle: "don-cmp-n3-b", competence: "MA.DONNEES.COMPARER", niveau: 3, format: "qcm",
    consigne: "Regarde le diagramme. Combien la barre du vélo a-t-elle de moins que la barre du foot ?",
    options: ["5", "4", "9"], attendu: "5",
    figure: bars(10, [{ label: "foot", value: 9 }, { label: "vélo", value: 4 }]),
    explication: "La barre du foot vaut 9, celle du vélo vaut 4. 9 moins 4 font 5 : le vélo a 5 de moins." },
  // N4 : reponse libre — combien de plus / de moins
  { cle: "don-cmp-n4-a", competence: "MA.DONNEES.COMPARER", niveau: 4, format: "texte",
    consigne: "Regarde le tableau. Écris combien Sacha a lu de livres de plus qu'Emma.",
    attendu: "3",
    figure: table(["Livres lus"], [["Emma", "7"], ["Sacha", "10"]]),
    explication: "Sacha a lu 10 livres, Emma en a lu 7. 10 moins 7 font 3 : Sacha a lu 3 livres de plus." },
  { cle: "don-cmp-n4-b", competence: "MA.DONNEES.COMPARER", niveau: 4, format: "texte",
    consigne: "Regarde le diagramme. Écris combien il y a de poires de moins que de pommes.",
    attendu: "3",
    figure: bars(10, [{ label: "pommes", value: 9 }, { label: "poires", value: 6 }]),
    explication: "Il y a 9 pommes et 6 poires. 9 moins 6 font 3 : il y a 3 poires de moins." },
];

// Competences de la sous-matiere (ordre d'affichage = ordre du referentiel).
export const COMPETENCES_DONNEES = [
  "MA.DONNEES.TABLEAU",
  "MA.DONNEES.COMPLETER",
  "MA.DONNEES.BARRES",
  "MA.DONNEES.PICTOGRAMME",
  "MA.DONNEES.COMPARER",
] as const;

// Items jouables pour une competence et un niveau donnes.
export function itemsDonDe(competence: string, niveau: number): DonItem[] {
  return BANQUE_DONNEES.filter((i) => i.competence === competence && i.niveau === niveau);
}

// Juge local (mode demo + feedback immediat) : miroir exact du serveur.
export function estJusteDonnees(cle: string, saisie: string): boolean {
  const item = BANQUE_DONNEES.find((i) => i.cle === cle);
  if (!item) return false;
  return comparerDonnees(item.format, saisie, item.attendu);
}

// Recupere un item par sa cle (utilise par le composant d'exercice).
export function itemDonParCle(cle: string): DonItem | undefined {
  return BANQUE_DONNEES.find((i) => i.cle === cle);
}

// ==========================================================================
// GENERATEUR : choisit un ITEM de la banque pour la competence et le niveau, de
// facon reproductible (graine). Le composant <Donnees> le rend ; le serveur
// (verif_donnees, op 'don') est seul juge via la cle. Repli robuste si aucun
// item (ne devrait pas arriver : le referentiel ne cree l'exercice que si des
// items existent).
// ==========================================================================
export function buildDonnees(src: ExCalcul, rng: Rng, base: Base): GeneratedExercise {
  const items = itemsDonDe(src.competence, src.niveau);
  const item = items.length > 0 ? pick(rng, items) : null;
  if (!item) {
    return {
      ...base,
      forme: "donnees",
      support: "aucun",
      saisie: "donnees",
      prompt: "Tableaux et graphiques",
      answer: 0,
      reste: null,
      fields: 1,
      verif: { op: "don", a: 0, b: 0, cle: "" },
      correction: "",
    };
  }
  return {
    ...base,
    forme: "donnees",
    support: "aucun",
    saisie: "donnees",
    prompt: item.consigne,
    answer: 0,
    reste: null,
    fields: 1,
    don: {
      cle: item.cle,
      format: item.format,
      consigne: item.consigne,
      options: item.options,
      attendu: item.attendu,
      explication: item.explication,
      figure: item.figure,
      interact: item.interact,
    },
    verif: { op: "don", a: 0, b: 0, cle: item.cle },
    correction: item.explication,
  };
}
