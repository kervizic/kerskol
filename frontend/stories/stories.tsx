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
import Grammaire from "../src/components/Grammaire";
import Comprehension from "../src/components/Comprehension";
import Ecriture from "../src/components/Ecriture";
import { generateExercise as genEx } from "../src/domain/calcul/generator";
import type { DonRender } from "../src/domain/donnees/donnees";
import type { GramRender } from "../src/domain/francais/grammaire";
import { generateExercise } from "../src/domain/calcul/generator";
import type { ExCalcul, GeneratedExercise } from "../src/domain/calcul/generator";

export interface Story {
  id: string; // identifiant stable -> nom de fichier PNG
  label: string; // titre affiche au-dessus de la capture
  node: ReactNode;
}

const noop = () => {};
const noopSubmit = async () => null;

// --- Conjugaison CM1 (lot 1) : revue visuelle du rendu « phrase a completer »
// pour le passe simple et l'imperatif. On rend le VRAI conjPhrase genere
// (meme balisage que ConjugaisonView de Session.tsx) + les gros boutons QCM,
// pour verifier la mise en page, le repere et les cibles tactiles (>= 44 px).
function srcConj(competence: string, niveau: number): ExCalcul {
  return {
    exerciceId: "ex", competence, niveau, methode: null, operation: "conj",
    forme: "conjugaison", params: {}, support: "aucun", correctionStrategie: null,
  };
}
// Choisit un exercice correspondant a un predicat (verbe/personne lisibles).
function pickConj(competence: string, niveau: number, pred: (e: GeneratedExercise) => boolean): GeneratedExercise {
  for (let i = 1; i <= 300; i++) {
    const e = generateExercise(srcConj(competence, niveau), i * 2654435761);
    if (pred(e)) return e;
  }
  return generateExercise(srcConj(competence, niveau), 2654435761);
}
function ConjPhraseStory({ ex }: { ex: GeneratedExercise }) {
  const p = ex.conjPhrase!;
  return (
    <div className="kk-conj">
      <h2 className="kk-consigne">{p.consigne}</h2>
      {p.repere && <p className="kk-repere">{p.repere}</p>}
      <p className="kk-phrase" aria-label={p.complete}>
        {p.prefixe}
        <span className="kk-sujet">{p.sujet}</span>
        {p.colle ? "" : " "}
        <span className="kk-answer__box kk-conj__box" aria-label="la case à compléter">?</span>
        {" "}
        {p.suite}
        {p.apres}
      </p>
      {ex.optionsTexte && (
        <div className="kk-qcm">
          {ex.optionsTexte.map((o, i) => (
            <button key={i} type="button" className="kk-btn kk-qcm__opt">{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}
// Decimal sur droite graduee (lot 7) : replique le SVG de DroiteView (privé a
// Session) avec des labels decimaux, pour un exercice MA.DEC.DROITE reel.
const exDroiteDec = genEx({
  exerciceId: "ex", competence: "MA.DEC.DROITE", niveau: 2, methode: null,
  operation: "val", forme: "decimal", params: { types: ["droite"], maxE: 5 },
  support: "aucun", correctionStrategie: null,
}, 42424242);
function DroiteDecStory() {
  const d = exDroiteDec.droiteData!;
  const W = 520, H = 96, pad = 28, axisY = 62;
  const span = Math.max(1, d.to - d.from);
  const x = (v: number) => pad + ((v - d.from) / span) * (W - 2 * pad);
  const fmt = (v: number) => {
    const e = Math.floor(v / 100), dd = Math.round(v % 100);
    if (dd === 0) return String(e);
    return `${e},${dd % 10 === 0 ? dd / 10 : dd < 10 ? `0${dd}` : dd}`;
  };
  const ticks: number[] = [];
  for (let v = d.from; v <= d.to + 1e-6; v += d.step) ticks.push(Math.round(v));
  return (
    <div style={{ textAlign: "center" }}>
      <p className="kk-lead" style={{ margin: "0 auto 8px" }}>{exDroiteDec.prompt}</p>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="droite graduee decimale">
        <line x1={pad} y1={axisY} x2={W - pad} y2={axisY} stroke="#bbb" strokeWidth={3} />
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={x(v)} y1={axisY - 6} x2={x(v)} y2={axisY + 6} stroke="#bbb" strokeWidth={2} />
            {(v === d.from || v === d.to) && (
              <text x={x(v)} y={axisY + 24} textAnchor="middle" fontSize="16" fontWeight={700} fill="#333">{fmt(v)}</text>
            )}
          </g>
        ))}
        <path d={`M ${x(d.at)} ${axisY - 30} L ${x(d.at)} ${axisY - 6}`} stroke="#d35400" strokeWidth={3} />
        <polygon points={`${x(d.at) - 4},${axisY - 10} ${x(d.at) + 4},${axisY - 10} ${x(d.at)},${axisY - 3}`} fill="#d35400" />
      </svg>
    </div>
  );
}

// Division posee en potence (lot 6) : markup identique a PotenceView (privé a
// Session). Statique (quotient/reste vides). On genere un exercice reel.
const exDivision = genEx({
  exerciceId: "ex", competence: "MA.POSE.DIVISION", niveau: 2, methode: null,
  operation: "div", forme: "pose", params: { min: 40, max: 99, bmin: 3, bmax: 7 },
  support: "aucun", correctionStrategie: null,
}, 123456789);
function PotenceStory() {
  const d = exDivision.potenceData!;
  const cell = { padding: "6px 12px", fontSize: "1.8rem", fontWeight: 700, textAlign: "center" } as const;
  const vBar = "3px solid #333";
  const boxCls = "kk-answer__box kk-potence__box";
  return (
    <div style={{ textAlign: "center" }}>
      <p className="kk-lead" style={{ margin: "0 auto 8px" }}>{exDivision.prompt}</p>
      <div className="kk-potence" role="group" aria-label="division en potence"
        style={{ display: "grid", gridTemplateColumns: "auto auto", justifyContent: "center", alignItems: "center", margin: "12px 0" }}>
        <div style={{ ...cell, borderRight: vBar, textAlign: "right" }}>{d.dividende}</div>
        <div style={{ ...cell, borderBottom: vBar }}>{d.diviseur}</div>
        <div style={{ ...cell, borderRight: vBar, textAlign: "right", display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ fontSize: "1rem", fontWeight: 400 }}>reste</span>
          <button type="button" className={boxCls} aria-label="reste">?</button>
        </div>
        <div style={cell}><button type="button" className={`${boxCls} kk-answer__box--active`} aria-label="quotient">?</button></div>
      </div>
    </div>
  );
}

// Passe simple N3 (il/ils, repere « Il y a longtemps, », melange des temps).
const exPasseSimple = pickConj("FR.CONJ.PASSE_SIMPLE", 3, (e) => e.conj?.personne === 3);
// Imperatif N2, 2e personne (tu) d'un verbe en -er : piege « pas de s ».
const exImperatif = pickConj("FR.CONJ.IMPERATIF", 2, (e) =>
  e.conj?.personne === 2 && ["chanter", "jouer", "aimer", "regarder", "donner", "trouver", "parler"].includes(e.conj.verbe));

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

// Grammaire CM1 (lot C) : N3, distinguer complement d'objet direct / indirect
// (QCM a libelles longs -> verifie la mise en page des gros boutons).
const complementCoi: GramRender = {
  cle: "comp-n3-coi",
  format: "qcm",
  consigne: "Dans la phrase, le complément « à ma grand-mère » est de quelle sorte ?",
  phrase: "Je téléphone à ma grand-mère.",
  options: ["un complément d'objet indirect", "un complément d'objet direct"],
  attendu: "un complément d'objet indirect",
  explication: "Je téléphone à qui ? À ma grand-mère. Il y a le petit mot à : c'est un complément d'objet indirect.",
};

// Orthographe CM1 (lot C) : homophones grammaticaux (QCM « choisis le bon mot »).
const homophone: GramRender = {
  cle: "homo-n2-ce",
  format: "qcm",
  consigne: "Choisis le bon mot pour compléter la phrase.",
  phrase: "… gâteau est délicieux.",
  options: ["Ce", "Se"],
  attendu: "Ce",
  explication: "ce se met devant un nom. Ce gâteau, comme ce chien : ce est un petit mot devant le nom.",
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
  { id: "grammaire-complements-coi", label: "Grammaire — compléments COD/COI (lot C, N3)",
    node: <Grammaire item={complementCoi} onSoumettre={noopSubmit} onContinuer={noop} /> },
  { id: "orthographe-homophones", label: "Orthographe — homophones ce/se (lot C, N2)",
    node: <Grammaire item={homophone} onSoumettre={noopSubmit} onContinuer={noop} /> },
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
  { id: "division-potence", label: "Division posée en potence (lot 6)",
    node: <PotenceStory /> },
  { id: "decimal-droite", label: "Décimal sur droite graduée (lot 7)",
    node: <DroiteDecStory /> },
  { id: "ecriture-passe-simple", label: "Écriture — transformer au passé simple (lot 5)",
    node: <Ecriture item={{
      cle: "ecr-guidecm1-n3", format: "transform",
      consigne: "Récris cette phrase au passé simple. Attention, il y a plusieurs personnes.",
      phrase: "Les enfants chantent une chanson.",
      attendu: "Les enfants chantèrent une chanson.",
      explication: "Bravo ! Au passé simple, avec ils : Les enfants chantèrent une chanson.",
    }} onSoumettre={noopSubmit} onContinuer={noop} /> },
  { id: "comp-biblio-cm1", label: "Compréhension — texte CM1 bibliothèque (inférence N3, lot 4)",
    node: <Comprehension item={{
      cle: "lec-bib-pois-inf-n3", format: "qcm",
      texte: ["Puis, sans rien dire, elle entra dans la chambre à coucher, ôta toute la literie, et mit un pois au fond du lit. Ensuite elle prit vingt matelas, qu'elle étendit sur le pois, et encore vingt édredons qu'elle entassa par-dessus les matelas."],
      consigne: "Pourquoi la vieille reine cache-t-elle un pois sous les matelas ?",
      options: ["pour savoir si c'est une vraie princesse", "pour que la princesse mange le pois", "pour rendre le lit plus doux"],
      attendu: "pour savoir si c'est une vraie princesse",
      explication: "C'est une épreuve : une vraie princesse a la peau si fine qu'elle sentira le pois.",
      source: "Hans Christian Andersen, « La Princesse sur un pois »",
      preuve: "Puis, sans rien dire, elle entra dans la chambre à coucher, ôta toute la literie, et mit un pois au fond du lit. Ensuite elle prit vingt matelas, qu'elle étendit sur le pois, et encore vingt édredons qu'elle entassa par-dessus les matelas.",
    }} onSoumettre={noopSubmit} onContinuer={noop} /> },
  { id: "accord-sv-qcm", label: "Accord — sujet-verbe éloigné (QCM, lot 2)",
    node: <Grammaire item={{
      cle: "asv-n3-eloigne", format: "qcm",
      consigne: "Choisis le verbe bien accordé.", phrase: "Les fleurs du jardin … vite.",
      options: ["poussent", "pousse"], attendu: "poussent",
      explication: "Qui pousse ? Les fleurs, au pluriel. Le groupe du jardin ne change rien : les fleurs poussent.",
    }} onSoumettre={noopSubmit} onContinuer={noop} /> },
  { id: "accord-pp-texte", label: "Accord — participe passé avec être (recopie N4, lot 2)",
    node: <Grammaire item={{
      cle: "app-n4-feminin", format: "texte",
      consigne: "Recopie le participe passé bien accordé.", phrase: "Elles sont (descendues / descendu) de l'arbre.",
      attendu: "descendues",
      explication: "Elles est féminin pluriel. Avec être : elles sont descendues, avec es.",
    }} onSoumettre={noopSubmit} onContinuer={noop} /> },
  { id: "conj-passe-simple", label: "Conjugaison — passé simple N3 (il/ils, lot 1)",
    node: <ConjPhraseStory ex={exPasseSimple} /> },
  { id: "conj-imperatif", label: "Conjugaison — impératif N2 « tu » sans s (lot 1)",
    node: <ConjPhraseStory ex={exImperatif} /> },
  { id: "droites-qcm", label: "Géométrie — perpendiculaires / parallèles (QCM, lot 6)",
    node: <Donnees item={{
      cle: "dro-n1-a", format: "qcm",
      consigne: "Deux droites qui se croisent en formant un angle droit sont... ?",
      options: ["perpendiculaires", "parallèles", "obliques"], attendu: "perpendiculaires",
      explication: "Deux droites qui forment un angle droit sont perpendiculaires. On le vérifie avec l'équerre.",
      figure: { kind: "none" },
    }} onSoumettre={noopSubmit} onContinuer={noop} /> },
];
