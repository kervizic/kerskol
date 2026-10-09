// « Ma frise du temps » (type Timeline). Composant AUTONOME. Deux modes :
//   - CONSULTATION (aPlacer absent) : affiche, dans l'ordre chronologique, les
//     cartes-evenements deja gagnees, avec le siecle (chiffres romains) et la
//     periode (Moyen Âge / Temps modernes / époque contemporaine).
//   - PLACEMENT (aPlacer present) : l'enfant insere une NOUVELLE carte parmi
//     celles deja placees (il choisit la position). Le SERVEUR verifie l'ordre
//     (onPlacer renvoie le verdict) ; la carte n'est acquise que si l'ordre est
//     correct. Feedback TOUJOURS valorisant, on peut reessayer.
//
// La frise grandit sur l'annee (stockee par profil cote serveur). Toutes les
// petites images sont des schemas SVG faits maison (FriseIcone).

import { Fragment, useState } from "react";
import { Check, Plus } from "lucide-react";
import type { FriseCarte, Periode } from "../domain/histoire/parcours";
import { FriseIcone } from "./FriseIcone";

interface Props {
  // Cartes deja placees. Le parent les fournit TRIEES chronologiquement.
  cartes: FriseCarte[];
  // Mode placement : la carte a inserer (sinon consultation seule).
  aPlacer?: FriseCarte | null;
  // Verifie l'ordre propose cote serveur (liste des cles dans l'ordre choisi).
  onPlacer?: (ordreCles: string[]) => Promise<{ correct: boolean } | null>;
  // Appele apres une bonne reponse (ou pour fermer la consultation).
  onContinuer?: () => void;
  titre?: string;
}

const PERIODE_LABEL: Record<Periode, string> = {
  moyen_age: "Moyen Âge",
  temps_modernes: "Temps modernes",
  contemporaine: "époque contemporaine",
};
const PERIODE_COULEUR: Record<Periode, string> = {
  moyen_age: "#8a6d3b",
  temps_modernes: "#2c6e9b",
  contemporaine: "#c0392b",
};

const ROMAINS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];

// Siecle (en chiffres romains) d'une carte, a partir de sa cle de tri (AAAAMMJJ).
export function siecleRomain(cleTri: number): string {
  const annee = Math.floor(cleTri / 10000);
  const siecle = Math.ceil(annee / 100);
  const r = ROMAINS[siecle - 1] ?? String(siecle);
  return `${r}e siècle`;
}

// Une carte posee sur la frise.
function Carte({ c, surbrillance }: { c: FriseCarte; surbrillance?: boolean }) {
  return (
    <div
      role="listitem"
      className="kk-frise__carte"
      style={{
        border: `2px solid ${surbrillance ? "var(--kk-accent)" : "var(--kk-border)"}`,
        borderRadius: 10, padding: 8, minWidth: 116, maxWidth: 148,
        textAlign: "center", background: "var(--kk-bg)", flex: "0 0 auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center" }}>
        <FriseIcone type={c.icone} size={34} />
      </div>
      <div style={{ fontWeight: 600, fontSize: "0.8rem", lineHeight: 1.15, margin: "4px 0" }}>{c.titre}</div>
      <div style={{ fontSize: "0.85rem" }}>{c.dateLabel}</div>
      <div className="kk-muted" style={{ fontSize: "0.7rem" }}>{siecleRomain(c.cleTri)}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 2 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: PERIODE_COULEUR[c.periode] }} aria-hidden="true" />
        <span className="kk-muted" style={{ fontSize: "0.68rem" }}>{PERIODE_LABEL[c.periode]}</span>
      </div>
    </div>
  );
}

// Bouton « insérer ici » (fente), mode placement.
function Fente({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className="kk-btn"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      style={{
        minWidth: 40, minHeight: 44, flex: "0 0 auto",
        borderStyle: "dashed",
        borderColor: active ? "var(--kk-accent)" : "var(--kk-border)",
        padding: "4px 6px",
      }}
    >
      <Plus size={18} aria-hidden="true" />
    </button>
  );
}

export default function Frise({ cartes, aPlacer, onPlacer, onContinuer, titre }: Props) {
  const placement = Boolean(aPlacer && onPlacer);
  const [pos, setPos] = useState<number | null>(null); // index d'insertion 0..cartes.length
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ correct: boolean } | null>(null);
  const [erreurReseau, setErreurReseau] = useState(false);

  // Ordre propose (cles) = cartes placees + la nouvelle a `pos`.
  const ordreCles = (): string[] => {
    const cles = cartes.map((c) => c.cle);
    if (placement && pos !== null && aPlacer) cles.splice(pos, 0, aPlacer.cle);
    return cles;
  };

  const valider = async () => {
    if (!placement || pos === null || !aPlacer || !onPlacer || busy || res) return;
    setBusy(true);
    try {
      const r = await onPlacer(ordreCles());
      if (r) setRes(r);
      else setErreurReseau(true);
    } catch {
      setErreurReseau(true);
    } finally {
      setBusy(false);
    }
  };

  const reessayer = () => {
    setRes(null);
    setPos(null);
  };

  // Rail de placement interactif : fentes + cartes, avec apercu de la nouvelle
  // carte a la position choisie.
  const railPlacement = (
    <div className="kk-frise__rail" role="list" aria-label="ma frise du temps"
      style={{ display: "flex", alignItems: "stretch", gap: 6, overflowX: "auto", padding: "4px 2px" }}>
      {Array.from({ length: cartes.length + 1 }).map((_, idx) => (
        <Fragment key={idx}>
          <Fente active={pos === idx} onClick={() => setPos(idx)}
            label={idx === 0 ? "insérer au début" : `insérer après ${cartes[idx - 1].titre}`} />
          {pos === idx && aPlacer && <Carte c={aPlacer} surbrillance />}
          {idx < cartes.length && <Carte c={cartes[idx]} />}
        </Fragment>
      ))}
    </div>
  );

  // Rail d'affichage simple (consultation, ou apres une bonne reponse).
  const railAffichage = (liste: FriseCarte[]) => (
    <div className="kk-frise__rail" role="list" aria-label="ma frise du temps"
      style={{ display: "flex", alignItems: "stretch", gap: 6, overflowX: "auto", padding: "4px 2px" }}>
      {liste.length === 0 ? (
        <p className="kk-muted" style={{ margin: 0 }}>
          Ta frise est encore vide. Fais un chapitre pour gagner tes premières cartes !
        </p>
      ) : (
        liste.map((c) => <Carte key={c.cle} c={c} surbrillance={placement && aPlacer?.cle === c.cle} />)
      )}
    </div>
  );

  // Liste finale (apres bonne reponse) : cartes + nouvelle, triee par cle de tri.
  const listeFinale = (): FriseCarte[] => {
    if (!aPlacer) return cartes;
    return [...cartes, aPlacer].sort((a, b) => a.cleTri - b.cleTri);
  };

  return (
    <div className="kk-stack kk-frise">
      {titre && <h2 style={{ textAlign: "center", margin: 0 }}>{titre}</h2>}

      {/* Mode placement : la carte a placer (date cachee tant qu'elle n'est pas
          correctement posee). */}
      {placement && !res && aPlacer && (
        <div className="kk-stack" style={{ alignItems: "center" }}>
          <p className="kk-lead" style={{ textAlign: "center", margin: 0 }}>
            Place cette carte au bon endroit sur ta frise :
          </p>
          <div className="kk-frise__aplacer"
            style={{ border: "2px dashed var(--kk-accent)", borderRadius: 10, padding: 8,
              minWidth: 116, maxWidth: 160, textAlign: "center", background: "var(--kk-bg)" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <FriseIcone type={aPlacer.icone} size={34} />
            </div>
            <div style={{ fontWeight: 600, fontSize: "0.82rem", lineHeight: 1.15, margin: "4px 0" }}>{aPlacer.titre}</div>
            <div className="kk-muted" style={{ fontSize: "0.85rem" }}>date : ?</div>
          </div>
        </div>
      )}

      {placement && !res ? railPlacement : railAffichage(res?.correct ? listeFinale() : cartes)}

      {/* Validation du placement. */}
      {placement && !res && !erreurReseau && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <button className="kk-btn kk-btn--accent kk-btn--big" disabled={pos === null || busy} onClick={valider}>
            <Check size={22} aria-hidden="true" /> Valider
          </button>
        </div>
      )}

      {erreurReseau && !res && (
        <div className="kk-banner">
          <p style={{ margin: 0 }}>On vérifiera ton placement dès que la connexion revient. Bravo d'avoir cherché !</p>
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer?.()}>Continuer</button>
        </div>
      )}

      {/* Feedback serveur. */}
      {res && (
        <div className={`kk-banner ${res.correct ? "kk-banner--ok" : ""}`}>
          <span className="kk-banner__title">
            {res.correct ? <Check size={22} aria-hidden="true" /> : null}{" "}
            {res.correct
              ? "Bravo ! La carte est bien placée."
              : "Ce n'est pas encore le bon endroit. Regarde bien les autres dates et réessaie."}
          </span>
          {res.correct ? (
            <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer?.()}>Continuer</button>
          ) : (
            <button className="kk-btn kk-btn--accent kk-btn--block" onClick={reessayer}>Réessayer</button>
          )}
        </div>
      )}

      {/* Consultation : bouton de fermeture si fourni. */}
      {!placement && onContinuer && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <button className="kk-btn kk-btn--block" onClick={() => onContinuer()}>Fermer</button>
        </div>
      )}
    </div>
  );
}
