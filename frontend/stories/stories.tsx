// Registre des « stories » pour les captures Playwright (revue visuelle des
// composants d'UI, lots CM1). Chaque nouvelle UI (lots 2 a 6) ajoute une entree
// ici ; le script de capture (stories/capture.mjs) prend un PNG de chaque
// section, en largeur telephone (390 px) et tablette (820 px). Les captures
// vont dans docs/captures/ (hors git).
//
// Rendu volontairement STATIQUE (etat initial du composant) : on verifie la mise
// en page, les cibles tactiles (>= 44 px) et la lisibilite, pas l'interaction.

import type { ReactNode } from "react";
import Donnees from "../src/components/Donnees";
import DecimalInput from "../src/components/DecimalInput";
import type { DonRender } from "../src/domain/donnees/donnees";

export interface Story {
  id: string; // identifiant stable -> nom de fichier PNG
  label: string; // titre affiche au-dessus de la capture
  node: ReactNode;
}

const noop = () => {};
const noopSubmit = async () => null;

const hasard: DonRender = {
  cle: "has-n1-a",
  format: "qcm",
  consigne: "Tu lances un dé à six faces. Obtenir 4, est-ce possible, impossible ou certain ?",
  options: ["possible", "impossible", "certain"],
  attendu: "possible",
  explication: "Le dé a les faces 1, 2, 3, 4, 5, 6. On peut tomber sur 4 : c'est possible.",
  figure: { kind: "none" },
};

const lireCm1: DonRender = {
  cle: "lire-cm1-n3-a",
  format: "qcm",
  consigne: "Dans ce tableau, le total est 50 vêtements. Il y a 30 hauts et 12 pantalons. Quel nombre complète la case des pulls ?",
  options: ["8", "18", "12"],
  attendu: "8",
  explication: "30 et 12 font 42. Il faut 8 de plus pour arriver à 50 : on écrit 8.",
  figure: {
    kind: "table",
    colHeaders: ["Nombre"],
    rowHeaders: ["hauts", "pantalons", "pulls", "Total"],
    cells: [["30"], ["12"], ["?"], ["50"]],
  },
};

// N4 recalibre (lot A) : tableau a 3 colonnes + reponse libre (passage par
// l'unite pour une cible non multiple des colonnes montrees).
const propCourses: DonRender = {
  cle: "prop-crs-n4-a",
  format: "texte",
  consigne: "Regarde le tableau. 2 kilos coûtent 4 euros, 4 kilos coûtent 8 euros. Écris combien coûtent 5 kilos.",
  attendu: "10",
  explication: "Pour 1 kilo, c'est 2 euros, car 4 euros font 2 kilos. Pour 5 kilos : 5 fois 2 font 10 euros.",
  figure: {
    kind: "table",
    colHeaders: ["2 kilos", "4 kilos", "5 kilos"],
    rowHeaders: ["Prix en euros"],
    cells: [["4", "8", "?"]],
  },
};

// Registre. Ajouter une entree par nouveau composant d'UI.
export const STORIES: Story[] = [
  { id: "donnees-hasard-qcm", label: "Données — hasard (QCM, lot 7)",
    node: <Donnees item={hasard} onSoumettre={noopSubmit} onContinuer={noop} /> },
  { id: "donnees-lire-cm1-tableau", label: "Données — compléter un tableau CM1 (lot 7)",
    node: <Donnees item={lireCm1} onSoumettre={noopSubmit} onContinuer={noop} /> },
  { id: "decimal-input", label: "Décimaux — saisie à virgule (DecimalInput, lot 2)",
    node: <DecimalInput onCode={noop} /> },
  { id: "decimal-exercice", label: "Décimaux — exercice CM1 (consigne + saisie, lot 2)",
    node: (
      <div className="kk-stack" style={{ textAlign: "center" }}>
        <p className="kk-lead" style={{ margin: "0 auto 8px" }}>
          Écris ce nombre en chiffres : 3 unités et 25 centièmes.
        </p>
        <DecimalInput onCode={noop} />
      </div>
    ) },
  { id: "proportionnalite-table", label: "Proportionnalité — tableau à compléter (lot 4)",
    node: <Donnees item={propCourses} onSoumettre={noopSubmit} onContinuer={noop} /> },
  { id: "decimal-addition", label: "Opérations — addition de décimaux (lot 3)",
    node: (
      <div className="kk-stack" style={{ textAlign: "center" }}>
        <p className="kk-lead" style={{ margin: "0 auto 8px" }}>Calcule : 3,25 + 1,50</p>
        <DecimalInput onCode={noop} />
      </div>
    ) },
  { id: "angles-qcm", label: "Mesures — angles (QCM, lot 5)",
    node: <Donnees item={{
      cle: "ang-n2-a", format: "qcm",
      consigne: "Comment s'appelle un angle plus grand qu'un angle droit ?",
      options: ["obtus", "aigu", "droit"], attendu: "obtus",
      explication: "Un angle plus grand qu'un angle droit est un angle obtus. Obtus, c'est bien ouvert.",
      figure: { kind: "none" },
    }} onSoumettre={noopSubmit} onContinuer={noop} /> },
  { id: "droites-qcm", label: "Géométrie — perpendiculaires / parallèles (QCM, lot 6)",
    node: <Donnees item={{
      cle: "dro-n1-a", format: "qcm",
      consigne: "Deux droites qui se croisent en formant un angle droit sont... ?",
      options: ["perpendiculaires", "parallèles", "obliques"], attendu: "perpendiculaires",
      explication: "Deux droites qui forment un angle droit sont perpendiculaires. On le vérifie avec l'équerre.",
      figure: { kind: "none" },
    }} onSoumettre={noopSubmit} onContinuer={noop} /> },
];
