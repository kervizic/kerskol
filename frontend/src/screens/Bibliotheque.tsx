// Page « Bibliothèque » (lot 0060). Liste des textes du domaine public intégrés
// à Kerskol, regroupés par auteur. LECTURE SILENCIEUSE (décision Manu) : gros
// caractères, police lisible, interligne large. Chaque texte est présenté avec
// son auteur, son œuvre et la mention « domaine public ».
//
// Pas d'audio pour l'instant : un emplacement « Écouter » est prévu (bouton
// DÉSACTIVÉ et MASQUÉ) pour la future voix de Manu et les enregistrements
// LibriVox (champ librivoxUrl). Il reste dans le DOM mais n'est pas affiché.

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { BIBLIOTHEQUE, BIBLIO_AUTEURS, type BiblioTexte } from "../domain/francais/bibliotheque";
import { CLASSE_DISPONIBLE, type Profil } from "../lib/types";
import { LecteurRythme } from "../components/LecteurRythme";

interface Props {
  onExit: () => void;
  // Profil enfant courant : fournit la classe (mode de lecture par defaut) et
  // l'id (reglages memorises par profil). Optionnel (page accessible en espace
  // parent) : a defaut, classe disponible (CE2) + reglages « invite ».
  profil?: Profil;
}

function Lecture({
  texte,
  onBack,
  profilId,
  classe,
}: {
  texte: BiblioTexte;
  onBack: () => void;
  profilId: string;
  classe: string;
}) {
  return (
    <div className="kk-page">
      <div className="kk-container kk-biblio">
        <button className="kk-link kk-biblio__back" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" /> Tous les textes
        </button>

        <header className="kk-biblio__head">
          <h1 className="kk-biblio__titre">{texte.titre}</h1>
          <p className="kk-biblio__credit kk-muted">
            {texte.auteur}
            {texte.oeuvre ? <> — <em>{texte.oeuvre}</em></> : null}
          </p>
          {texte.raccourci ? (
            <p className="kk-biblio__raccourci kk-muted">
              Extrait raccourci de <em>{texte.oeuvre}</em>, {texte.auteur}.
            </p>
          ) : null}
          <p className="kk-biblio__dp kk-muted">Domaine public</p>
        </header>

        {/* Lecture rythmee : controles + texte interactif si audio+timings, sinon
            rendu statique (le composant decide selon le manifeste). */}
        <LecteurRythme texte={texte} profilId={profilId} classe={classe} />

        {texte.glossaire.length > 0 && (
          <details className="kk-biblio__gloss">
            <summary className="kk-btn">Mots difficiles</summary>
            <ul className="kk-biblio__gloss-list">
              {texte.glossaire.map((g, i) => (
                <li key={i}><strong>{g.mot}</strong> : {g.sens}</li>
              ))}
            </ul>
          </details>
        )}

        <p className="kk-biblio__source kk-muted">
          Texte du domaine public.{" "}
          <a href={texte.url} target="_blank" rel="noopener noreferrer">Source</a>
        </p>
      </div>
    </div>
  );
}

export function Bibliotheque({ onExit, profil }: Props) {
  const [ouvert, setOuvert] = useState<BiblioTexte | null>(null);
  const profilId = profil?.id ?? "invite";
  const classe = profil?.classe ?? CLASSE_DISPONIBLE;

  if (ouvert) {
    return (
      <Lecture
        texte={ouvert}
        onBack={() => setOuvert(null)}
        profilId={profilId}
        classe={classe}
      />
    );
  }

  return (
    <div className="kk-page">
      <div className="kk-container kk-biblio">
        <button className="kk-link kk-biblio__back" onClick={onExit}>
          <ArrowLeft size={18} aria-hidden="true" /> Retour
        </button>
        <h1 className="kk-biblio__titre">Bibliothèque</h1>
        <p className="kk-muted">
          Des histoires, des fables et des poésies à lire tranquillement. Tous ces
          textes sont dans le domaine public.
        </p>

        {BIBLIO_AUTEURS.map((auteur) => {
          const textes = BIBLIOTHEQUE.filter((t) => t.auteur === auteur);
          if (textes.length === 0) return null;
          return (
            <section key={auteur} className="kk-biblio__auteur">
              <h2 className="kk-biblio__auteur-nom">{auteur}</h2>
              <ul className="kk-biblio__liste">
                {textes.map((t) => (
                  <li key={t.id}>
                    <button className="kk-btn kk-btn--block kk-biblio__item" onClick={() => setOuvert(t)}>
                      <span className="kk-biblio__item-titre">{t.titre}</span>
                      {t.oeuvre ? <span className="kk-biblio__item-oeuvre kk-muted">{t.oeuvre}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default Bibliotheque;
