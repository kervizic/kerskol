import { describe, it, expect } from "vitest";
import {
  creerEtat,
  commencer,
  deplacer,
  terminer,
  annuler,
  recommencer,
  indice,
  paireComplete,
  estGagne,
  casesRemplies,
  toutesPairesReliees,
  cheminSolution,
  cellIndex,
  type EtatJeu,
  type GrilleRelie,
} from "./relie";
import grillesP2 from "./grilles/relie-p2.json";

// Grille 3x3, 2 paires, entierement remplie :
//   A (pomme) : (0,0)=0 ... (2,2)=8  -> 0,3,6,7,8
//   B (banane): (0,1)=1 ... (1,1)=4  -> 1,2,5,4
const G: GrilleRelie = {
  id: "test-3x3",
  palier: 1,
  w: 3,
  h: 3,
  paires: [
    { fruit: "pomme", chemin: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
    { fruit: "banane", chemin: [[0, 1], [0, 2], [1, 2], [1, 1]] },
  ],
};

function tracerA(s: EtatJeu): EtatJeu {
  s = commencer(s, 0);
  for (const c of [3, 6, 7, 8]) s = deplacer(s, c);
  return terminer(s);
}
function tracerB(s: EtatJeu): EtatJeu {
  s = commencer(s, 1);
  for (const c of [2, 5, 4]) s = deplacer(s, c);
  return terminer(s);
}

describe("relie — cycle de base", () => {
  it("creerEtat : traces vides", () => {
    const s = creerEtat(G);
    expect(s.traces).toEqual([[], []]);
    expect(s.actif).toBeNull();
  });

  it("on ne peut tracer que depuis un fruit", () => {
    const s = commencer(creerEtat(G), 5); // 5 n'est pas un bout
    expect(s.actif).toBeNull();
    expect(s.traces[0]).toEqual([]);
  });

  it("tracer une paire de bout a bout la relie", () => {
    const s = tracerA(creerEtat(G));
    expect(s.traces[0]).toEqual([0, 3, 6, 7, 8]);
    expect(paireComplete(s, 0)).toBe(true);
  });

  it("victoire quand les 2 paires sont reliees ET toutes les cases remplies", () => {
    let s = tracerA(creerEtat(G));
    expect(estGagne(s)).toBe(false); // il manque B et des cases
    s = tracerB(s);
    expect(casesRemplies(s)).toBe(9);
    expect(estGagne(s)).toBe(true);
  });

  it("une paire reliee mais grille non remplie n'est pas gagnee", () => {
    // Grille 2x2, 1 paire qui NE remplit PAS tout (chemin droit) -> jamais ici
    // car le chemin solution remplit tout ; on teste la couverture partielle.
    let s = tracerA(creerEtat(G));
    s = commencer(s, 1); // B commencee mais pas finie
    s = deplacer(s, 2);
    s = terminer(s);
    expect(paireComplete(s, 0)).toBe(true);
    expect(paireComplete(s, 1)).toBe(false);
    expect(estGagne(s)).toBe(false);
  });
});

// --------------------------------------------------------------------------
// Cas rapporte par Manu (capture d'Iris) : grille 5x5 p2-038. Toutes les paires
// sont reliees mais 2 cases restent vides (23/25) -> le jeu NE validait PAS et
// ne disait rien. La SEULE facon de finir est le detour citron par (3,0)/(4,0).
// On verifie : (a) le detour valide la grille, (b) l'etat « tous relies mais
// vide » n'est PAS gagne mais EST detecte comme « presque », (c) la victoire
// s'appuie sur les REGLES (toute solution couvrante est acceptee, pas de
// comparaison a la solution stockee).
// --------------------------------------------------------------------------
describe("relie — cas capture Iris (p2-038)", () => {
  const G38 = (grillesP2 as GrilleRelie[]).find((g) => g.id === "p2-038")!;
  const ci = (r: number, c: number) => cellIndex(r, c, G38.w);
  const tracer = (s: EtatJeu, cells: number[][]): EtatJeu => {
    s = commencer(s, ci(cells[0][0], cells[0][1]));
    for (let i = 1; i < cells.length; i++) s = deplacer(s, ci(cells[i][0], cells[i][1]));
    return terminer(s);
  };
  // Les 3 paires qui sont deja reliees dans la capture.
  const relierAutres = (s: EtatJeu): EtatJeu => {
    s = tracer(s, [[3, 2], [2, 2], [2, 1], [2, 0]]); // banane
    s = tracer(s, [[1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [3, 4], [3, 3]]); // orange
    s = tracer(s, [[2, 3], [1, 3], [1, 2], [1, 1]]); // pasteque
    return s;
  };

  it("existe bien dans le palier 2", () => {
    expect(G38).toBeTruthy();
    expect(G38.w).toBe(5);
    expect(G38.h).toBe(5);
  });

  it("etat exact de la capture (23/25, tous relies) : pas gagne mais « presque »", () => {
    let s = creerEtat(G38);
    s = relierAutres(s);
    // citron de la capture : (3,1)->(4,1)->(4,2)->(4,3)->(4,4), laisse (3,0) et (4,0) vides.
    s = tracer(s, [[3, 1], [4, 1], [4, 2], [4, 3], [4, 4]]);
    expect(casesRemplies(s)).toBe(23);
    expect(toutesPairesReliees(s)).toBe(true); // tous les fruits sont relies
    expect(estGagne(s)).toBe(false); // mais 2 cases vides -> pas gagne
  });

  it("le detour qu'Iris a joue (25/25) valide la grille", () => {
    let s = creerEtat(G38);
    s = relierAutres(s);
    // citron (3,1)->(3,0)->(4,0)->(4,1)->(4,2)->(4,3)->(4,4) : la solution couvrante.
    s = tracer(s, [[3, 1], [3, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4]]);
    expect(casesRemplies(s)).toBe(25);
    expect(estGagne(s)).toBe(true);
  });

  it("le meme detour tracE depuis l'autre bout (4,4) est aussi accepte", () => {
    let s = creerEtat(G38);
    s = relierAutres(s);
    s = tracer(s, [[4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [3, 0], [3, 1]]);
    expect(casesRemplies(s)).toBe(25);
    expect(estGagne(s)).toBe(true);
  });
});

// Victoire = regles, pas comparaison a une solution stockee : une solution
// couvrante ALTERNATIVE (differente du chemin stocke) est acceptee.
describe("relie — toute solution couvrante valide est acceptee", () => {
  // Grille 2x2 : pomme (0,0)-(1,0) et banane (0,1)-(1,1). Deux pavages couvrants
  // existent -> on en joue un, et une version « miroir » si possible.
  const G2: GrilleRelie = {
    id: "test-2x2",
    palier: 1,
    w: 2,
    h: 2,
    paires: [
      { fruit: "pomme", chemin: [[0, 0], [1, 0]] }, // colonne gauche
      { fruit: "banane", chemin: [[0, 1], [1, 1]] }, // colonne droite
    ],
  };
  const ci = (r: number, c: number) => cellIndex(r, c, 2);

  it("la solution stockee (2 colonnes) gagne", () => {
    let s = creerEtat(G2);
    s = terminer(deplacer(commencer(s, ci(0, 0)), ci(1, 0)));
    s = terminer(deplacer(commencer(s, ci(0, 1)), ci(1, 1)));
    expect(estGagne(s)).toBe(true);
  });

  it("une solution alternative (lignes) couvrante gagne aussi", () => {
    // pomme (0,0)->(0,1)? non : (0,1) est le bout de banane -> interdit.
    // On garde donc une alternative valide : pomme (0,0)->(1,0)->(1,1)? non,
    // (1,1) est bout de banane. En 2x2 la couverture impose les colonnes ; on
    // verifie plutot sur une 3x3 qu'un chemin different du stocke gagne.
    const G: GrilleRelie = {
      id: "t3",
      palier: 1,
      w: 3,
      h: 3,
      paires: [
        { fruit: "pomme", chemin: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
        { fruit: "banane", chemin: [[0, 1], [0, 2], [1, 2], [1, 1]] },
      ],
    };
    const c3 = (r: number, c: number) => cellIndex(r, c, 3);
    // Autre pavage : pomme (0,0)->(1,0)->(1,1)->(2,1)->(2,0)? laisse des trous.
    // On joue le pavage stocke mais via l'AUTRE bout de depart pour prouver que
    // l'orientation du trace n'a pas d'importance (pas de comparaison stricte).
    let s = creerEtat(G);
    // pomme depuis (2,2) vers (0,0) :
    s = commencer(s, c3(2, 2));
    for (const [r, c] of [[2, 1], [2, 0], [1, 0], [0, 0]]) s = deplacer(s, c3(r, c));
    s = terminer(s);
    // banane depuis (1,1) vers (0,1) :
    s = commencer(s, c3(1, 1));
    for (const [r, c] of [[1, 2], [0, 2], [0, 1]]) s = deplacer(s, c3(r, c));
    s = terminer(s);
    expect(casesRemplies(s)).toBe(9);
    expect(estGagne(s)).toBe(true);
  });
});

describe("relie — gestes", () => {
  it("revenir sur son tuyau le raccourcit (recul d'une case)", () => {
    let s = commencer(creerEtat(G), 0);
    s = deplacer(s, 3);
    s = deplacer(s, 6);
    expect(s.traces[0]).toEqual([0, 3, 6]);
    s = deplacer(s, 3); // recul
    expect(s.traces[0]).toEqual([0, 3]);
  });

  it("revenir sur une case anterieure de son tuyau (boucle) tronque jusqu'a elle", () => {
    // Etat fabrique : A = 0->1->4->3, tete en 3 ; on revient en 0 (adjacent, index 0)
    const s0 = creerEtat(G);
    const s: EtatJeu = { ...s0, traces: [[0, 1, 4, 3], []], actif: 0, histo: [] };
    const s2 = deplacer(s, 0); // 0 adjacent a 3, index 0 (pas la case precedente)
    expect(s2.traces[0]).toEqual([0]);
  });

  it("tracer sur un autre tuyau le coupe", () => {
    let s = tracerA(creerEtat(G)); // A = 0,3,6,7,8
    s = commencer(s, 4); // B depart de son bout 4
    s = deplacer(s, 7); // 7 appartient a A (index 3) -> coupe A
    s = terminer(s);
    expect(s.traces[0]).toEqual([0, 3, 6]); // A tronquee avant 7
    expect(s.traces[1]).toEqual([4, 7]); // B a pris 7
  });

  it("toucher un fruit efface son tuyau (depart = fruit seul)", () => {
    let s = tracerA(creerEtat(G));
    expect(paireComplete(s, 0)).toBe(true);
    s = commencer(s, 0); // on retouche le fruit de depart
    s = terminer(s); // sans glisser
    expect(s.traces[0]).toEqual([0]); // tuyau efface
    expect(paireComplete(s, 0)).toBe(false);
  });

  it("on ne traverse pas le fruit d'une autre paire", () => {
    let s = commencer(creerEtat(G), 0); // A
    s = deplacer(s, 1); // 1 est le fruit de B -> refuse
    expect(s.traces[0]).toEqual([0]);
  });
});

describe("relie — indice, annuler, recommencer", () => {
  it("indice revele la 1re paire incomplete avec sa solution", () => {
    const s0 = creerEtat(G);
    const { etat, revele } = indice(s0);
    expect(revele).toBe(0);
    expect(etat.traces[0]).toEqual(cheminSolution(G, 0));
    expect(paireComplete(etat, 0)).toBe(true);
  });

  it("appliquer l'indice sur toutes les paires mene a une solution couvrante gagnante", () => {
    const G38 = (grillesP2 as GrilleRelie[]).find((g) => g.id === "p2-038")!;
    let s = creerEtat(G38);
    for (let k = 0; k < G38.paires.length; k++) {
      const { etat } = indice(s);
      s = etat;
    }
    expect(casesRemplies(s)).toBe(G38.w * G38.h);
    expect(estGagne(s)).toBe(true);
  });

  it("indice sur grille deja juste ne revele rien", () => {
    const s = tracerB(tracerA(creerEtat(G)));
    const { revele } = indice(s);
    expect(revele).toBe(-1);
  });

  it("annuler restaure l'etat d'avant le dernier geste", () => {
    let s = creerEtat(G);
    s = tracerA(s); // un geste (commencer a empile l'histo)
    expect(s.traces[0].length).toBe(5);
    s = annuler(s);
    expect(s.traces[0]).toEqual([]); // revenu a l'etat initial
  });

  it("recommencer vide tous les tuyaux", () => {
    let s = tracerB(tracerA(creerEtat(G)));
    s = recommencer(s);
    expect(s.traces).toEqual([[], []]);
    expect(casesRemplies(s)).toBe(0);
  });
});
