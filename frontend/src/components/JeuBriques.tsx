// « Les briques » - composant React autonome (rendu + commandes).
// ------------------------------------------------------------------------
// Toute la mecanique vit dans moteur.ts (pur, teste). Ici : la boucle de rendu
// (canvas), les commandes tactiles (gros boutons + glisser + toucher) et le
// clavier en bonus. Aucune dependance nouvelle (React uniquement).
//
// Integration Kerskol : les couleurs s'appuient sur la palette du site via les
// variables CSS --kk-* (avec repli pour la demo autonome). Les couleurs des 7
// pieces restent douces (pas de neon) et sont regroupees dans COULEURS_PIECES,
// facile a ajuster d'un seul endroit.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  MoteurBriques,
  NOM_JEU,
  COLONNES,
  LIGNES,
  DUREE_MAX_MS,
  type ResultatPartie,
} from "../domain/jeux/briques/moteur";

export interface JeuBriquesProps {
  /** Appele une seule fois en fin de partie (blocage ou 3 minutes). */
  onFini: (resultat: ResultatPartie) => void;
  /** Appele quand l'enfant quitte le jeu en cours. */
  onQuitter: () => void;
  /**
   * Appele quand l'enfant demande une nouvelle partie depuis l'ecran de fin.
   * Dans la Maison des jeux, l'hote REPASSE par le debit de bonbons (une partie
   * = un nouveau debit). Si absent, « Rejouer » relance localement, sans cout
   * (mode demo autonome du kit).
   */
  onRejouer?: () => void;
  /** Palier de vitesse de depart (0 par defaut). Permet de reprendre plus vite. */
  palierDepart?: number;
}

// Couleurs des 7 pieces : derivees de la palette chaude Kerskol (orange accent,
// vert/rouge pastel, tons terreux). Volontairement DOUCES, sans neon. Index 0..6
// correspond aux pieces I, O, T, S, Z, J, L (voir moteur.FORMES).
export const COULEURS_PIECES: readonly string[] = [
  "#3E8C8C", // I - bleu-vert ardoise
  "#D7A12C", // O - ocre/ambre
  "#8A6AA0", // T - prune doux
  "#4E9A6B", // S - vert sauge (famille succes du site)
  "#C0564A", // Z - terre cuite (famille danger du site)
  "#5B7BA6", // J - bleu poudre
  "#E06A00", // L - orange Kerskol (accent du site)
];

// Repli de couleurs de theme pour la demo autonome (surchargees par --kk-* si le
// theme Kerskol est charge dans la page hote).
const COULEUR = {
  fond: "var(--kk-bg, #FFFFFF)",
  surface: "var(--kk-surface, #F5F5F4)",
  bordure: "var(--kk-border, #E7E5E4)",
  texte: "var(--kk-text, #292524)",
  texte2: "var(--kk-text-2, #57534E)",
  accent: "var(--kk-accent, #E06A00)",
  surAccent: "var(--kk-on-accent, #FFFFFF)",
  succesBg: "var(--kk-success-bg, #DCF5E7)",
  succesTexte: "var(--kk-success-text, #1E6B45)",
  police: "var(--kk-font, 'Andika', system-ui, sans-serif)",
} as const;

const TAILLE_BOUTON = 56; // >= 56 px (cible tactile enfant)

// Dimensions couleur du plateau (grille). Valeurs fixes pour le canvas.
const COULEUR_GRILLE_VIDE = "#FFFFFF"; // repli, remplace au dessin par la surface lue
const COULEUR_LIGNE = "rgba(0,0,0,0.06)";

interface Ihm {
  score: number;
  lignes: number;
  tempsRestantMs: number;
  termine: boolean;
  resultat: ResultatPartie | null;
}

function formaterTemps(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function JeuBriques({ onFini, onQuitter, onRejouer, palierDepart = 0 }: JeuBriquesProps): JSX.Element {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moteurRef = useRef<MoteurBriques | null>(null);
  const rafRef = useRef<number>(0);
  const dernierTempsRef = useRef<number>(0);
  const finEnvoyeeRef = useRef<boolean>(false);
  const repeatRef = useRef<number | null>(null);
  const tailleCelluleRef = useRef<number>(24);

  const [ihm, setIhm] = useState<Ihm>({
    score: 0,
    lignes: 0,
    tempsRestantMs: DUREE_MAX_MS,
    termine: false,
    resultat: null,
  });

  // --- Dessin ---------------------------------------------------------------
  const dessiner = useCallback(() => {
    const canvas = canvasRef.current;
    const moteur = moteurRef.current;
    if (!canvas || !moteur) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const taille = tailleCelluleRef.current;
    const w = COLONNES * taille;
    const h = LIGNES * taille;

    // Fond du plateau.
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COULEUR_GRILLE_VIDE;
    ctx.fillRect(0, 0, w, h);

    // Quadrillage leger.
    ctx.strokeStyle = COULEUR_LIGNE;
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLONNES; c++) {
      ctx.beginPath();
      ctx.moveTo(c * taille + 0.5, 0);
      ctx.lineTo(c * taille + 0.5, h);
      ctx.stroke();
    }
    for (let r = 0; r <= LIGNES; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * taille + 0.5);
      ctx.lineTo(w, r * taille + 0.5);
      ctx.stroke();
    }

    const dessinerCase = (x: number, y: number, couleur: string, alpha = 1) => {
      if (y < 0) return;
      const g = Math.max(1, Math.floor(taille * 0.08));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = couleur;
      arrondi(ctx, x * taille + g, y * taille + g, taille - 2 * g, taille - 2 * g, Math.floor(taille * 0.18));
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    // Cases posees.
    for (let r = 0; r < LIGNES; r++) {
      for (let c = 0; c < COLONNES; c++) {
        const v = moteur.grille[r][c];
        if (v !== 0) dessinerCase(c, r, COULEURS_PIECES[v - 1]);
      }
    }

    // Piece fantome (ou elle va tomber).
    if (!moteur.terminee) {
      const f = moteur.fantome();
      for (let r = 0; r < f.forme.length; r++) {
        for (let c = 0; c < f.forme[r].length; c++) {
          if (f.forme[r][c]) dessinerCase(f.x + c, f.y + r, COULEURS_PIECES[f.couleur - 1], 0.22);
        }
      }
      // Piece active.
      const p = moteur.piece;
      for (let r = 0; r < p.forme.length; r++) {
        for (let c = 0; c < p.forme[r].length; c++) {
          if (p.forme[r][c]) dessinerCase(p.x + c, p.y + r, COULEURS_PIECES[p.couleur - 1]);
        }
      }
    }
  }, []);

  // --- Boucle de jeu --------------------------------------------------------
  const boucle = useCallback(
    (t: number) => {
      const moteur = moteurRef.current;
      if (!moteur) return;
      const dt = dernierTempsRef.current ? t - dernierTempsRef.current : 0;
      dernierTempsRef.current = t;
      // Borne le dt (onglet en arriere-plan) pour ne pas « sauter » la partie.
      moteur.tick(Math.min(dt, 1000 / 10));
      dessiner();

      setIhm((prev) => {
        const maj: Ihm = {
          score: moteur.score,
          lignes: moteur.lignesTotal,
          tempsRestantMs: moteur.tempsRestantMs,
          termine: moteur.terminee,
          resultat: moteur.terminee ? moteur.resultat() : null,
        };
        // evite les rerenders inutiles
        if (
          prev.score === maj.score &&
          prev.lignes === maj.lignes &&
          prev.termine === maj.termine &&
          Math.abs(prev.tempsRestantMs - maj.tempsRestantMs) < 500
        ) {
          return prev;
        }
        return maj;
      });

      if (moteur.terminee) {
        if (!finEnvoyeeRef.current) {
          finEnvoyeeRef.current = true;
          onFini(moteur.resultat());
        }
        return; // stoppe la boucle
      }
      rafRef.current = requestAnimationFrame(boucle);
    },
    [dessiner, onFini],
  );

  const demarrer = useCallback(() => {
    finEnvoyeeRef.current = false;
    dernierTempsRef.current = 0;
    moteurRef.current = new MoteurBriques({ palierDepart });
    setIhm({
      score: 0,
      lignes: 0,
      tempsRestantMs: DUREE_MAX_MS,
      termine: false,
      resultat: null,
    });
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(boucle);
  }, [boucle, palierDepart]);

  // --- Dimensionnement responsive (390 px et au-dela) -----------------------
  useLayoutEffect(() => {
    const ajuster = () => {
      const conteneur = conteneurRef.current;
      const canvas = canvasRef.current;
      if (!conteneur || !canvas) return;
      const largeurDispo = conteneur.clientWidth;
      // Hauteur plafonnee pour laisser la place au HUD et aux boutons.
      const hauteurDispo = Math.max(240, window.innerHeight - 260);
      const taille = Math.max(
        14,
        Math.floor(Math.min(largeurDispo / COLONNES, hauteurDispo / LIGNES)),
      );
      tailleCelluleRef.current = taille;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = COLONNES * taille * dpr;
      canvas.height = LIGNES * taille * dpr;
      canvas.style.width = `${COLONNES * taille}px`;
      canvas.style.height = `${LIGNES * taille}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dessiner();
    };
    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, [dessiner]);

  // --- Cycle de vie ---------------------------------------------------------
  useEffect(() => {
    demarrer();
    return () => cancelAnimationFrame(rafRef.current);
    // demarrer est stable (useCallback) ; on ne relance qu'au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Actions joueur -------------------------------------------------------
  const action = useCallback(
    (type: "gauche" | "droite" | "tourner" | "bas" | "chute") => {
      const m = moteurRef.current;
      if (!m || m.terminee) return;
      if (type === "gauche") m.deplacer(-1, 0);
      else if (type === "droite") m.deplacer(1, 0);
      else if (type === "tourner") m.tourner();
      else if (type === "bas") m.descendre();
      else if (type === "chute") m.chuteRapide();
      dessiner();
    },
    [dessiner],
  );

  const demarrerRepetition = useCallback(
    (type: "gauche" | "droite" | "bas") => {
      action(type);
      if (repeatRef.current) window.clearInterval(repeatRef.current);
      repeatRef.current = window.setInterval(() => action(type), 110);
    },
    [action],
  );

  const arreterRepetition = useCallback(() => {
    if (repeatRef.current) {
      window.clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }, []);

  // --- Clavier (bonus) ------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          action("gauche");
          break;
        case "ArrowRight":
          action("droite");
          break;
        case "ArrowUp":
          action("tourner");
          break;
        case "ArrowDown":
          action("bas");
          break;
        case " ":
          e.preventDefault();
          action("chute");
          break;
        default:
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [action]);

  // --- Gestes sur le plateau (glisser / toucher) ----------------------------
  const geste = useRef<{ x: number; y: number; px: number; bouge: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    geste.current = { x: e.clientX, y: e.clientY, px: e.clientX, bouge: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = geste.current;
    if (!g) return;
    const seuil = tailleCelluleRef.current; // une case = un pas
    if (e.clientX - g.px >= seuil) {
      action("droite");
      g.px += seuil;
      g.bouge = true;
    } else if (g.px - e.clientX >= seuil) {
      action("gauche");
      g.px -= seuil;
      g.bouge = true;
    }
    if (e.clientY - g.y >= seuil * 2) g.bouge = true; // glissement vertical ample
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const g = geste.current;
    geste.current = null;
    if (!g) return;
    const dx = Math.abs(e.clientX - g.x);
    const dy = e.clientY - g.y;
    if (!g.bouge && dx < tailleCelluleRef.current && Math.abs(dy) < tailleCelluleRef.current) {
      action("tourner"); // simple toucher = rotation
    } else if (dy > tailleCelluleRef.current * 3) {
      action("chute"); // grand glissement vers le bas = chute rapide
    }
  };

  // --- Rendu ----------------------------------------------------------------
  const styleBoutonCmd: React.CSSProperties = {
    minWidth: TAILLE_BOUTON,
    minHeight: TAILLE_BOUTON,
    width: "100%",
    height: TAILLE_BOUTON + 8,
    fontSize: 26,
    borderRadius: 14,
    border: `1px solid ${COULEUR.bordure}`,
    background: COULEUR.surface,
    color: COULEUR.texte,
    fontFamily: COULEUR.police,
    cursor: "pointer",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  const m = moteurRef.current;
  const formeSuivante = m?.formeSuivante() ?? [];
  const couleurSuivante = m ? COULEURS_PIECES[m.couleurSuivante() - 1] : COULEUR.accent;

  return (
    <div
      ref={conteneurRef}
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: 12,
        boxSizing: "border-box",
        fontFamily: COULEUR.police,
        color: COULEUR.texte,
        background: COULEUR.fond,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: "100%",
      }}
    >
      {/* Bandeau d'info */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <strong style={{ fontSize: 20, color: COULEUR.accent }}>{NOM_JEU}</strong>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center" }}>
          <Info label="Lignes" valeur={String(ihm.lignes)} />
          <Info label="Score" valeur={String(ihm.score)} />
          <Info label="Temps" valeur={formaterTemps(ihm.tempsRestantMs)} />
          <ApercuSuivante forme={formeSuivante} couleur={couleurSuivante} />
          <button
            type="button"
            onClick={onQuitter}
            aria-label="Quitter le jeu"
            style={{
              minWidth: 44,
              minHeight: 44,
              borderRadius: 12,
              border: `1px solid ${COULEUR.bordure}`,
              background: COULEUR.surface,
              color: COULEUR.texte2,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Plateau */}
      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            touchAction: "none",
            borderRadius: 12,
            border: `2px solid ${COULEUR.bordure}`,
            background: COULEUR.surface,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        />

        {ihm.termine && ihm.resultat && (
          <EcranFin
            resultat={ihm.resultat}
            onRejouer={onRejouer ?? demarrer}
            onQuitter={onQuitter}
          />
        )}
      </div>

      {/* Commandes tactiles : gros boutons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        <button
          type="button"
          aria-label="Gauche"
          style={styleBoutonCmd}
          onPointerDown={() => demarrerRepetition("gauche")}
          onPointerUp={arreterRepetition}
          onPointerLeave={arreterRepetition}
          onPointerCancel={arreterRepetition}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Tourner"
          style={styleBoutonCmd}
          onPointerDown={() => action("tourner")}
        >
          ↻
        </button>
        <button
          type="button"
          aria-label="Descendre"
          style={styleBoutonCmd}
          onPointerDown={() => demarrerRepetition("bas")}
          onPointerUp={arreterRepetition}
          onPointerLeave={arreterRepetition}
          onPointerCancel={arreterRepetition}
        >
          ⬇
        </button>
        <button
          type="button"
          aria-label="Droite"
          style={styleBoutonCmd}
          onPointerDown={() => demarrerRepetition("droite")}
          onPointerUp={arreterRepetition}
          onPointerLeave={arreterRepetition}
          onPointerCancel={arreterRepetition}
        >
          →
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: COULEUR.texte2, textAlign: "center" }}>
        Astuce : glisse à gauche/droite, touche le plateau pour tourner.
      </p>
    </div>
  );
}

// -------------------------- Sous-composants d'IHM --------------------------

function Info({ label, valeur }: { label: string; valeur: string }): JSX.Element {
  return (
    <div style={{ textAlign: "center", lineHeight: 1.1 }}>
      <div style={{ fontSize: 11, color: COULEUR.texte2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{valeur}</div>
    </div>
  );
}

function ApercuSuivante({ forme, couleur }: { forme: number[][]; couleur: string }): JSX.Element {
  const n = forme.length || 4;
  const cell = 10;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11, color: COULEUR.texte2 }}>Suivante</div>
      <div
        aria-label="Prochaine piece"
        style={{
          width: n * cell,
          height: n * cell,
          display: "grid",
          gridTemplateColumns: `repeat(${n}, ${cell}px)`,
          gap: 1,
          margin: "2px auto 0",
        }}
      >
        {forme.flat().map((v, i) => (
          <div
            key={i}
            style={{
              width: cell,
              height: cell,
              borderRadius: 2,
              background: v ? couleur : "transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function EcranFin({
  resultat,
  onRejouer,
  onQuitter,
}: {
  resultat: ResultatPartie;
  onRejouer: () => void;
  onQuitter: () => void;
}): JSX.Element {
  return (
    <div
      role="dialog"
      aria-label="Fin de la partie"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 20,
        textAlign: "center",
        background: "rgba(255,255,255,0.92)",
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 40 }}>🎉</div>
      <h2 style={{ margin: 0, color: COULEUR.succesTexte, fontSize: 24 }}>Bravo !</h2>
      <p style={{ margin: 0, fontSize: 18 }}>
        Tu as fait <strong>{resultat.lignes}</strong>{" "}
        {resultat.lignes > 1 ? "lignes" : "ligne"} !
      </p>
      <p style={{ margin: 0, fontSize: 14, color: COULEUR.texte2 }}>Score : {resultat.score}</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={onRejouer}
          style={{
            minHeight: TAILLE_BOUTON,
            padding: "0 22px",
            fontSize: 18,
            fontWeight: 700,
            borderRadius: 14,
            border: "none",
            background: COULEUR.accent,
            color: COULEUR.surAccent,
            cursor: "pointer",
          }}
        >
          Rejouer
        </button>
        <button
          type="button"
          onClick={onQuitter}
          style={{
            minHeight: TAILLE_BOUTON,
            padding: "0 22px",
            fontSize: 18,
            borderRadius: 14,
            border: `1px solid ${COULEUR.bordure}`,
            background: COULEUR.surface,
            color: COULEUR.texte,
            cursor: "pointer",
          }}
        >
          Terminer
        </button>
      </div>
    </div>
  );
}

// Rectangle arrondi (compatibilite : pas de dependance a ctx.roundRect).
function arrondi(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export default JeuBriques;
