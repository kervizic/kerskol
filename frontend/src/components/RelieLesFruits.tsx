// Plateau du jeu « Relie les fruits ». Gestes au doigt ET a la souris (pointer
// events). Rendu des tuyaux par cellule (barres vers les voisins du meme trace).
// La couleur du tuyau n'est qu'un APPOINT : le fruit (emoji) reste le repere.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb, RotateCcw, Undo2 } from "lucide-react";
import {
  creerEtat,
  commencer,
  deplacer,
  terminer,
  annuler,
  recommencer,
  indice as appliquerIndice,
  estGagne,
  casesRemplies,
  paireDuBout,
  cellIndex,
  type EtatJeu,
  type GrilleRelie,
} from "../domain/jeux/relie";
import { fruitDef } from "../domain/jeux/registre";
import { IMAGES } from "../domain/images";
import { SpeakerButton } from "./SpeakerButton";
import { useVoix } from "../lib/voix/useVoix";
import type { Profil } from "../lib/types";

const CONSIGNE = "Relie les fruits pareils ! Remplis toutes les cases.";

export interface ResultatGrille {
  reussi: boolean;
  tempsMs: number;
  avecIndice: boolean;
}

interface Props {
  grille: GrilleRelie;
  profil: Profil | null;
  onTermine: (r: ResultatGrille) => void; // appele a la victoire
}

type Dir = "haut" | "bas" | "gauche" | "droite";

function direction(w: number, from: number, to: number): Dir {
  const d = to - from;
  if (d === -w) return "haut";
  if (d === w) return "bas";
  if (d === -1) return "gauche";
  return "droite";
}

export function RelieLesFruits({ grille, profil, onTermine }: Props) {
  const [etat, setEtat] = useState<EtatJeu>(() => creerEtat(grille));
  const avecIndiceRef = useRef(false);
  const debut = useRef<number>(Date.now());
  const gagneRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const voix = useVoix(profil);

  // Nouvelle grille -> reinitialise tout.
  useEffect(() => {
    setEtat(creerEtat(grille));
    avecIndiceRef.current = false;
    gagneRef.current = false;
    debut.current = Date.now();
  }, [grille]);

  // Consigne lue a l'arrivee (si la voix est dispo et jouable ; sinon le clip
  // manquant est journalise par useVoix, bouton grise).
  useEffect(() => {
    voix.direEnonce(CONSIGNE, { auto: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grille.id]);

  const verifierVictoire = useCallback(
    (s: EtatJeu) => {
      if (!gagneRef.current && estGagne(s)) {
        gagneRef.current = true;
        onTermine({ reussi: true, tempsMs: Date.now() - debut.current, avecIndice: avecIndiceRef.current });
      }
    },
    [onTermine]
  );

  // ----- Pointer events : on retrouve la case sous le doigt via elementFromPoint.
  const caseSousPointeur = useCallback((x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el?.closest<HTMLElement>("[data-cell]");
    if (!cell) return null;
    const v = Number(cell.dataset.cell);
    return Number.isFinite(v) ? v : null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (gagneRef.current) return;
      const c = caseSousPointeur(e.clientX, e.clientY);
      if (c == null) return;
      // On ne demarre que depuis un fruit.
      if (paireDuBout(grille, c) < 0) return;
      boardRef.current?.setPointerCapture(e.pointerId);
      voix.activer();
      setEtat((s) => commencer(s, c));
    },
    [caseSousPointeur, grille, voix]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (gagneRef.current) return;
      const c = caseSousPointeur(e.clientX, e.clientY);
      if (c == null) return;
      setEtat((s) => (s.actif == null ? s : deplacer(s, c)));
    },
    [caseSousPointeur]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (boardRef.current?.hasPointerCapture?.(e.pointerId)) {
        boardRef.current.releasePointerCapture(e.pointerId);
      }
      setEtat((s) => {
        const ns = terminer(s);
        verifierVictoire(ns);
        return ns;
      });
    },
    [verifierVictoire]
  );

  // ----- Boutons
  const onAnnuler = () => setEtat((s) => annuler(s));
  const onRecommencer = () => setEtat((s) => recommencer(s));
  const onIndice = () => {
    avecIndiceRef.current = true;
    setEtat((s) => {
      const { etat: ns } = appliquerIndice(s);
      verifierVictoire({ ...ns, actif: null });
      return ns;
    });
  };

  // ----- Donnees de rendu : par case, la paire occupante + directions reliees.
  const rendu = useMemo(() => {
    const { w, h } = grille;
    const info = new Map<
      number,
      { pair: number; dirs: Dir[]; estBout: boolean }
    >();
    etat.traces.forEach((trace, pair) => {
      for (let i = 0; i < trace.length; i++) {
        const cell = trace[i];
        const dirs: Dir[] = [];
        if (i > 0) dirs.push(direction(w, cell, trace[i - 1]));
        if (i < trace.length - 1) dirs.push(direction(w, cell, trace[i + 1]));
        info.set(cell, { pair, dirs, estBout: paireDuBout(grille, cell) === pair });
      }
    });
    // Les bouts toujours connus (pour afficher le fruit meme sans tuyau).
    const bouts = new Map<number, number>();
    grille.paires.forEach((p, pair) => {
      const a = cellIndex(p.chemin[0][0], p.chemin[0][1], w);
      const b = cellIndex(
        p.chemin[p.chemin.length - 1][0],
        p.chemin[p.chemin.length - 1][1],
        w
      );
      bouts.set(a, pair);
      bouts.set(b, pair);
    });
    return { w, h, info, bouts };
  }, [etat, grille]);

  const total = grille.w * grille.h;
  const remplies = casesRemplies(etat);

  return (
    <div className="kk-relie">
      <div className="kk-relie__consigne">
        <p className="kk-lead" style={{ margin: 0 }}>{CONSIGNE}</p>
        <SpeakerButton
          onClick={() => voix.direEnonce(CONSIGNE)}
          disponible={voix.disponible}
          jouable={voix.enonceJouable(CONSIGNE)}
          label="Relire la consigne"
        />
      </div>

      <div
        ref={boardRef}
        className="kk-relie__board"
        style={{ ["--kk-cols" as string]: rendu.w }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="grid"
        aria-label="Grille à relier"
      >
        {Array.from({ length: total }, (_, cell) => {
          const occ = rendu.info.get(cell);
          const boutPair = rendu.bouts.get(cell);
          const pair = occ?.pair ?? boutPair;
          const fruit = pair != null ? fruitDef(grille.paires[pair].fruit) : null;
          const couleur = fruit?.couleur;
          const img = fruit ? IMAGES[fruit.image] : null;
          return (
            <div
              key={cell}
              data-cell={cell}
              className="kk-relie__cell"
              role="gridcell"
            >
              {occ && couleur && (
                <span className="kk-relie__pipe" aria-hidden="true">
                  <span className="kk-relie__dot" style={{ background: couleur }} />
                  {occ.dirs.map((d) => (
                    <span
                      key={d}
                      className={`kk-relie__bar kk-relie__bar--${d}`}
                      style={{ background: couleur }}
                    />
                  ))}
                </span>
              )}
              {boutPair != null && img && (
                <img
                  className="kk-relie__fruit"
                  src={img.src}
                  alt={img.alt}
                  draggable={false}
                  width={34}
                  height={34}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="kk-relie__jauge" aria-live="polite">
        {remplies === total ? "Toutes les cases sont remplies !" : `${remplies} / ${total} cases remplies`}
      </p>

      <div className="kk-relie__actions kk-stack">
        <div style={{ display: "flex", gap: 10 }}>
          <button className="kk-btn kk-btn--block" onClick={onAnnuler} disabled={etat.histo.length === 0}>
            <Undo2 size={20} aria-hidden="true" /> Annuler
          </button>
          <button className="kk-btn kk-btn--block" onClick={onRecommencer}>
            <RotateCcw size={20} aria-hidden="true" /> Recommencer
          </button>
        </div>
        <button className="kk-btn kk-btn--block kk-relie__indice" onClick={onIndice}>
          <Lightbulb size={20} aria-hidden="true" /> Un indice
        </button>
      </div>
    </div>
  );
}
