// « Remettre dans l'ordre » - composant PARTAGE pour TOUS les exercices d'ordre
// (EMC, histoire, sciences, chaines alimentaires, cycles, phrases, nombres...).
//
// Il remplace l'ancien rendu « touche les etiquettes » (pool de petits boutons,
// aucune case d'arrivee, rien ne bouge au toucher) que la classe n'arrivait pas
// a comprendre. Objectif : rendre l'action EVIDENTE pour un enfant de 8 ans.
//
// Deux variantes de presentation (meme logique) :
//   - "cases" (defaut, histoires/scenes/etapes) : N cases numerotees reliees par
//     des fleches, avec « D'abord / Ensuite / ... / Enfin » dessous ; reserve de
//     grandes cartes melangees en bas.
//   - "ligne" (phrases a remettre, nombres a ranger, facon Duolingo) : une ligne
//     d'accueil qui se remplit de gauche a droite ; banque de mots en bas.
//
// Regles d'interaction (communes) :
//   - toucher une carte de la reserve -> elle va dans la PROCHAINE case libre ;
//   - toucher une carte placee -> elle REVIENT dans la reserve ;
//   - glisser-deposer possible aussi (lacher hors d'une case -> retour) ;
//   - bouton ↺ « Recommencer » vide tout ;
//   - « Valider » reste GRISE tant que toutes les cases ne sont pas remplies ;
//   - double-toucher (< 300 ms) ignore ;
//   - cibles tactiles >= 48 dp, espacement >= 8 dp (voir app.css kk-ord__*).
//
// Le SERVEUR reste SEUL JUGE : `onSoumettre(reponse)` renvoie le verdict. `attendu`
// ne sert qu'au feedback local (quelles cartes rester en vert / reviennent) et a
// montrer la solution au 3e echec ; il n'intervient jamais dans le jugement.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, RotateCcw, Star } from "lucide-react";
import { SpeakerButton } from "./SpeakerButton";

// Mots du temps affiches SOUS les cases (variante "cases"). Jamais dans les
// etiquettes elles-memes (regle editoriale) : ils vivent uniquement ici.
const MOTS_DU_TEMPS = ["D'abord", "Ensuite", "Puis", "Et après", "Enfin"];

export interface VoixOrdre {
  disponible: boolean;
  jouable: boolean;
  relire: () => void;
}

export interface RemiseEnOrdreProps {
  cle: string; // identifiant stable de l'item (graine du melange + cle de demo)
  consigne: string;
  // Etiquettes DANS L'ORDRE CORRECT (ce que le serveur attend). Le composant les
  // melange pour l'affichage et en deduit l'ordre correct (feedback + solution).
  labels: string[];
  // Separateur utilise pour reconstruire la reponse envoyee au serveur : « > »
  // par defaut (EMC/QM/sciences), « | » pour la comprehension, « espace » pour
  // une phrase a remettre. Le serveur reste SEUL JUGE : on ne change que le rendu.
  separateur?: string;
  explication: string; // correction valorisante (sert aussi d'indice au 2e/3e echec)
  variante?: "cases" | "ligne";
  support?: ReactNode; // contenu affiche au-dessus des cases (ex : texte a lire)
  voix?: VoixOrdre | null;
  onSoumettre: (reponse: string) => Promise<{ correct: boolean } | null>;
  onContinuer: (correct: boolean) => void;
}

// Melange DETERMINISTE (graine = cle) : stable entre deux rendus, mais garanti
// different de l'ordre correct (sinon l'exercice serait deja resolu).
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function melanger(labels: string[], seed: number): string[] {
  if (labels.length < 2) return labels.slice();
  const correct = labels.join("");
  let s = seed || 1;
  for (let essai = 0; essai < 6; essai++) {
    const a = labels.slice();
    for (let i = a.length - 1; i > 0; i--) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const j = s % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (a.join("") !== correct) return a;
  }
  // Repli : rotation d'un cran (toujours != ordre correct pour n >= 2).
  return [...labels.slice(1), labels[0]];
}

// Demo « 1re fois de ce type seulement » : un drapeau localStorage par famille
// d'exercice. Pas de fenetre a fermer : une petite main animee se joue une fois.
function demoDejaVue(): boolean {
  try {
    return localStorage.getItem("kk-demo-ordre") === "1";
  } catch {
    return false;
  }
}
function marquerDemoVue(): void {
  try {
    localStorage.setItem("kk-demo-ordre", "1");
  } catch {
    /* localStorage indisponible : on montre la demo a chaque fois, sans crasher */
  }
}

function normaliser(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/g, "");
}

export default function RemiseEnOrdre({
  cle,
  consigne,
  labels,
  separateur = ">",
  explication,
  variante = "cases",
  support,
  voix,
  onSoumettre,
  onContinuer,
}: RemiseEnOrdreProps) {
  const n = labels.length;
  const melange = useMemo(() => melanger(labels, hash(cle)), [labels, cle]);
  // L'ordre correct est DIRECTEMENT la liste `labels` (deja dans le bon ordre).
  const ordreCorrect = useMemo(() => labels.map(normaliser), [labels]);

  // placement[i] = etiquette dans la case i, ou null. Les cartes « verrouillees »
  // (bien placees apres un echec, ou solution montree) ne peuvent plus bouger.
  const [placement, setPlacement] = useState<(string | null)[]>(() => Array(n).fill(null));
  const [verrou, setVerrou] = useState<boolean[]>(() => Array(n).fill(false));
  const [secousse, setSecousse] = useState<number | null>(null); // case qui tremble
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ correct: boolean } | null>(null);
  const [erreurReseau, setErreurReseau] = useState(false);
  const [essais, setEssais] = useState(0);
  const [indice, setIndice] = useState<string | null>(null);
  const [solutionMontree, setSolutionMontree] = useState(false);
  const [demo, setDemo] = useState(() => !demoDejaVue());

  const dernierTap = useRef<{ cible: string; t: number }>({ cible: "", t: 0 }); // garde anti double-toucher
  const dragLabel = useRef<string | null>(null); // etiquette en cours de glisser

  // La demo se joue une fois puis se retire d'elle-meme (pas de fenetre a fermer).
  useEffect(() => {
    if (!demo) return;
    marquerDemoVue();
    const t = setTimeout(() => setDemo(false), 3200);
    return () => clearTimeout(t);
  }, [demo]);

  const place = new Set(placement.filter((x): x is string => x != null));
  const reserve = melange.filter((l) => !place.has(l));
  const prochaineLibre = placement.findIndex((x) => x == null);
  const complet = prochaineLibre === -1;
  const peutValider = complet && !res && !busy;

  // Ignore un SECOND toucher sur LA MEME cible dans les 300 ms (evite le
  // double-placement sur tablette), sans gener l'enfant qui enchaine vite des
  // cartes DIFFERENTES.
  const antiDoubleTap = useCallback((cible: string): boolean => {
    const t = Date.now();
    if (dernierTap.current.cible === cible && t - dernierTap.current.t < 300) return false;
    dernierTap.current = { cible, t };
    return true;
  }, []);

  const placerCarte = useCallback(
    (label: string, caseVisee?: number) => {
      if (res || busy) return;
      setPlacement((p) => {
        if (p.includes(label)) return p; // deja placee
        const cible = caseVisee != null && p[caseVisee] == null ? caseVisee : p.findIndex((x) => x == null);
        if (cible === -1) return p;
        const copie = p.slice();
        copie[cible] = label;
        return copie;
      });
      setIndice(null);
    },
    [res, busy],
  );

  const retirerCarte = useCallback(
    (i: number) => {
      if (res || busy || verrou[i]) return;
      setPlacement((p) => {
        if (p[i] == null) return p;
        const copie = p.slice();
        copie[i] = null;
        return copie;
      });
    },
    [res, busy, verrou],
  );

  const recommencer = useCallback(() => {
    if (busy) return;
    setPlacement(Array(n).fill(null));
    setVerrou(Array(n).fill(false));
    setIndice(null);
    setSecousse(null);
  }, [busy, n]);

  const soumettre = useCallback(async () => {
    if (!peutValider) return;
    setBusy(true);
    const reponse = placement.join(separateur);
    try {
      const r = await onSoumettre(reponse);
      if (!r) {
        setErreurReseau(true);
        return;
      }
      if (r.correct) {
        setVerrou(Array(n).fill(true));
        setRes(r);
        return;
      }
      // Echec : les cartes BIEN placees (bonne position absolue) restent, en vert
      // et verrouillees ; les fausses reviennent dans la reserve avec une secousse.
      const nouvelEssai = essais + 1;
      setEssais(nouvelEssai);
      const bonnes = placement.map((lab, i) => lab != null && normaliser(lab) === ordreCorrect[i]);
      if (nouvelEssai >= 3) {
        // 3e echec : on MONTRE la solution (animation BD) et on la lit.
        setPlacement(labels.slice());
        setVerrou(Array(n).fill(true));
        setSolutionMontree(true);
        setIndice(explication);
        setRes({ correct: false });
        return;
      }
      setPlacement((p) => p.map((lab, i) => (bonnes[i] ? lab : null)));
      setVerrou(bonnes);
      // Premiere case fausse : on la fait trembler sans croix rouge.
      const premiereFausse = bonnes.findIndex((b) => !b);
      setSecousse(premiereFausse === -1 ? 0 : premiereFausse);
      setTimeout(() => setSecousse(null), 500);
      // Indice propre a l'item : doux au 1er echec, plus appuye au 2e.
      setIndice(
        nouvelEssai >= 2
          ? `Commence par le début : ${labels[0]}`
          : explication || "Regarde bien ce qui se passe en premier.",
      );
      if (voix?.disponible && voix.jouable) voix.relire();
    } catch {
      setErreurReseau(true);
    } finally {
      setBusy(false);
    }
  }, [peutValider, placement, separateur, onSoumettre, n, essais, ordreCorrect, labels, explication, voix]);

  // Phrase relue a la reussite : « D'abord X, ensuite Y, enfin Z. »
  const relecture = useMemo(() => {
    const mots = labels.map((lab, i) => {
      const prefixe = i === 0 ? "D'abord" : i === labels.length - 1 ? "enfin" : i === 1 ? "ensuite" : "puis";
      return `${prefixe} ${lab.toLowerCase()}`;
    });
    return mots.join(", ") + ".";
  }, [labels]);

  const titreCase = (i: number): string => {
    if (variante !== "cases") return "";
    if (i === n - 1) return "Enfin";
    return MOTS_DU_TEMPS[Math.min(i, MOTS_DU_TEMPS.length - 2)];
  };

  // ---- Rendu d'une case / emplacement ----
  const Case = ({ i }: { i: number }) => {
    const lab = placement[i];
    const bonApresCorrige = res != null && lab != null && normaliser(lab) === ordreCorrect[i];
    const estProchaine = i === prochaineLibre && !res;
    const cls = [
      variante === "cases" ? "kk-ord__case" : "kk-ord__slot",
      lab ? "kk-ord__case--pleine" : "kk-ord__case--vide",
      estProchaine ? "kk-ord__case--prochaine" : "",
      verrou[i] && (bonApresCorrige || res?.correct || solutionMontree) ? "kk-ord__case--ok" : "",
      secousse === i ? "kk-ord__case--secousse" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <div className="kk-ord__colonne">
        <div
          className={cls}
          role="button"
          tabIndex={lab && !verrou[i] ? 0 : -1}
          aria-label={lab ? `Case ${i + 1} : ${lab}. Touche pour renvoyer.` : `Case ${i + 1}, vide`}
          onClick={() => lab && antiDoubleTap(`case-${i}`) && retirerCarte(i)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && lab) {
              e.preventDefault();
              retirerCarte(i);
            }
          }}
          onDragOver={(e) => {
            if (!lab && dragLabel.current) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragLabel.current) {
              placerCarte(dragLabel.current, i);
              dragLabel.current = null;
            }
          }}
        >
          <span className="kk-ord__rang" aria-hidden="true">
            {i + 1}
          </span>
          {lab ? <span className="kk-ord__texte">{lab}</span> : <span className="kk-ord__placeholder" aria-hidden="true" />}
        </div>
        {variante === "cases" && <span className="kk-ord__tempo">{titreCase(i)}</span>}
      </div>
    );
  };

  return (
    <div className={`kk-stack kk-ord kk-ord--${variante}`} data-demo={demo ? "1" : undefined}>
      <div className="kk-ord__consigne">
        <p className="kk-lead" style={{ textAlign: "center", margin: 0 }}>
          {consigne}
        </p>
        {voix?.disponible && (
          <SpeakerButton onClick={voix.relire} disponible={voix.disponible} jouable={voix.jouable} />
        )}
      </div>

      {support && <div className="kk-ord__support">{support}</div>}

      {/* Les cases d'arrivee, reliees par des fleches (variante "cases"). */}
      <div className="kk-ord__cases" aria-label="cases à remplir dans l'ordre">
        {placement.map((_, i) => (
          <div className="kk-ord__maillon" key={i}>
            {i > 0 && variante === "cases" && (
              <span className="kk-ord__fleche" aria-hidden="true">
                →
              </span>
            )}
            <Case i={i} />
          </div>
        ))}
      </div>

      {/* La reserve de cartes melangees (grandes cibles tactiles). */}
      {!res && (
        <>
          <div className="kk-ord__reserve" aria-label="cartes à placer">
            {reserve.map((lab, i) => (
              <button
                key={lab}
                type="button"
                className={`kk-ord__carte${demo && i === 0 ? " kk-ord__carte--demo" : ""}`}
                draggable
                onDragStart={() => {
                  dragLabel.current = lab;
                }}
                onDragEnd={() => {
                  dragLabel.current = null;
                }}
                onClick={() => antiDoubleTap(`carte-${lab}`) && placerCarte(lab)}
              >
                {lab}
              </button>
            ))}
            {reserve.length === 0 && !complet && <span className="kk-ord__reserve-vide" />}
            {demo && <span className="kk-ord__main" aria-hidden="true">👆</span>}
          </div>

          <div className="kk-ord__actions">
            <button type="button" className="kk-btn kk-ord__recommencer" onClick={recommencer} disabled={place.size === 0 || busy}>
              <RotateCcw size={18} aria-hidden="true" /> Recommencer
            </button>
          </div>
        </>
      )}

      {indice && !res?.correct && (
        <p className="kk-ord__indice" aria-live="polite">
          {indice}
        </p>
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
            {res.correct ? <Star size={22} aria-hidden="true" /> : null}{" "}
            {res.correct
              ? "Bravo ! Tu as tout remis dans l'ordre."
              : solutionMontree
                ? "Voici l'ordre. Regarde bien, on recommencera une autre fois."
                : "Presque ! Regarde la bonne réponse."}
          </span>
          {res.correct && (
            <p className="kk-ord__relecture" aria-live="polite">
              {relecture}
            </p>
          )}
          <p className="kk-geo__expl" aria-live="polite" style={{ margin: "8px 0" }}>
            {explication}
          </p>
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(res.correct)}>
            Continuer
          </button>
        </div>
      )}
    </div>
  );
}
