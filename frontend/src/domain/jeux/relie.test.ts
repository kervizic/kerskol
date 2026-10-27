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
  cheminSolution,
  type EtatJeu,
  type GrilleRelie,
} from "./relie";

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
