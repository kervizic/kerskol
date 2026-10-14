// Garde-fou TRANSVERSE sur TOUTES les questions a choix (QCM) de l'app, toutes
// matieres confondues. Demande de Manu (14/10) apres avoir vu en seance :
//   « Que font les etres vivants pour avoir des petits ? »
//   -> « ils se reproduisent / ils se cassent / ils rouillent »
// Deux defauts a bannir automatiquement :
//
//   (A) VOCABULAIRE HORS CE2 : un mot de la consigne OU d'une option qu'un enfant
//       de 8 ans ne connait pas est interdit, SAUF s'il est explique (il apparait
//       dans l'explication de l'item, qui le definit). Liste extensible
//       MOTS_HORS_CE2 : on y ajoute chaque cas trouve.
//
//   (B) DISTRACTEUR HORS CHAMP : une mauvaise reponse doit etre plausible et du
//       MEME domaine que la bonne. Jamais une reponse d'un autre monde, devinable
//       par simple elimination (ex. « ils rouillent » / « ils se cassent » pour
//       du vivant : c'est du vocabulaire d'objets/metal, l'enfant elimine sans
//       rien savoir). Regles extensibles REGLES_DISTRACTEURS (contexte -> mots
//       interdits dans les distracteurs) + liste OPTIONS_ABSURDES.
//
// Le SERVEUR reste SEUL JUGE : ce test ne touche QUE l'enonce, les distracteurs
// et l'explication (cote front). La reponse `attendu` n'est pas modifiee ici,
// donc les golden tests croises front <-> SQL restent verts sans migration.
//
// Liste avant/apres des corrections : docs/enonces-clarifies.md.

import { describe, it, expect } from "vitest";

import { BANQUE_QM } from "./qm";
import { BANQUE_SCIENCES } from "./sciences/bank";
import { BANQUE_HISTOIRE } from "./histoire/bank";
import { BANQUE_GEOGRAPHIE } from "./geographie/bank";
import { BANQUE_EMC } from "./emc";
import { BANQUE_GRAMMAIRE } from "./francais/grammaire";
import { BANQUE_LEXIQUE } from "./francais/lexique";
import { BANQUE_COMPREHENSION } from "./francais/comprehension";
import { BANQUE_ECRITURE } from "./francais/ecriture";
import { BANQUE_DONNEES } from "./donnees/donnees";
import { BANQUE_GEOMETRIE } from "./geometrie/geometrie";

// --------------------------------------------------------------------------
// Collecte : forme structurelle commune a toutes les banques a choix.
// --------------------------------------------------------------------------
interface ItemChoix {
  cle: string;
  competence?: string;
  consigne?: string;
  options?: string[];
  attendu: string;
  explication?: string;
}

const BANQUES: { matiere: string; items: readonly ItemChoix[] }[] = [
  { matiere: "QM", items: BANQUE_QM as unknown as ItemChoix[] },
  { matiere: "Sciences", items: BANQUE_SCIENCES as unknown as ItemChoix[] },
  { matiere: "Histoire", items: BANQUE_HISTOIRE as unknown as ItemChoix[] },
  { matiere: "Geographie", items: BANQUE_GEOGRAPHIE as unknown as ItemChoix[] },
  { matiere: "EMC", items: BANQUE_EMC as unknown as ItemChoix[] },
  { matiere: "Grammaire", items: BANQUE_GRAMMAIRE as unknown as ItemChoix[] },
  { matiere: "Lexique", items: BANQUE_LEXIQUE as unknown as ItemChoix[] },
  { matiere: "Comprehension", items: BANQUE_COMPREHENSION as unknown as ItemChoix[] },
  { matiere: "Ecriture", items: BANQUE_ECRITURE as unknown as ItemChoix[] },
  { matiere: "Donnees", items: BANQUE_DONNEES as unknown as ItemChoix[] },
  { matiere: "Geometrie", items: BANQUE_GEOMETRIE as unknown as ItemChoix[] },
];

// QCM = item qui propose des options (>= 2). Les formats « ordre / tri / clic /
// texte / libre » ne presentent pas de distracteurs a l'enfant : on n'audite
// les distracteurs que sur les vraies listes de propositions.
function estQcm(it: ItemChoix): boolean {
  return Array.isArray(it.options) && it.options.length >= 2;
}

const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "'")
    .trim();

// Les distracteurs d'un QCM = les options qui ne sont pas la bonne reponse.
function distracteurs(it: ItemChoix): string[] {
  const bon = norm(it.attendu);
  return (it.options ?? []).filter((o) => norm(o) !== bon);
}

// --------------------------------------------------------------------------
// (A) VOCABULAIRE HORS CE2 — liste extensible. Un mot de cette liste est
// interdit dans une consigne ou une option, SAUF s'il est explique (present
// dans l'explication de l'item). Ajouter ici chaque mot trouve trop difficile.
// --------------------------------------------------------------------------
export const MOTS_HORS_CE2: string[] = [
  // Ne PAS y mettre une notion qui EST le sujet du jour (ex. « symetrie » en
  // geometrie, « revolution » en histoire, « republique » en EMC) : le mot est
  // alors enseigne par la sequence et repris dans l'explication. On n'y met que
  // du JARGON qui, s'il apparait tel quel face a l'enfant sans un mot simple
  // pour le definir, le laisse devant un mot vide de sens.
  //
  // Classification scientifique (doit toujours etre glose : « ovipare veut
  // dire qui pond des oeufs ») :
  "photosynthese",
  "metamorphose",
  "vertebre",
  "invertebre",
  "ovipare",
  "vivipare",
  "condensation",
  "evaporation",
  "precipitation",
  "constituant",
  "dissolution",
];

// Mots a NE PAS flaguer meme s'ils contiennent un stem interdit (faux positifs
// de sous-chaine). Extensible.
const MOTS_TOLERES: string[] = [];

function motsDe(txt: string): string[] {
  return norm(txt)
    .replace(/[.,;:!?«»"()…]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// --------------------------------------------------------------------------
// (B) DISTRACTEURS HORS CHAMP — regles contexte -> mots interdits parmi les
// distracteurs. Si le contexte (consigne + bonne reponse) matche, aucun
// distracteur ne doit matcher les mots interdits (= reponse d'un autre monde).
// --------------------------------------------------------------------------
export const REGLES_DISTRACTEURS: {
  nom: string;
  contexte: RegExp;
  interdits: RegExp;
}[] = [
  {
    nom: "vivant/biologie : pas de vocabulaire d'objet/metal",
    contexte:
      /(etre|etres) vivants?|animal|animaux|\bplante|\bpoule\b|\bchat\b|\bpetits\b|se nourri|se reprodui|herbivore|carnivore|omnivore|cycle de vie|squelette|racine/i,
    interdits:
      /rouill|en metal|en acier|en plastique|en fer|se cassent?|des roues|un moteur|une pile|se branche|electr|prend la poussiere/i,
  },
];

// Options jamais valides comme distracteur (reponses « blague » / vides de sens
// pedagogique). Extensible.
// NB : « rien du tout » n'est PAS listé : c'est parfois une vraie reponse
// instructive (ex. la morale du Heron de La Fontaine). On ne bannit que les
// non-reponses « blague » qui ne sont jamais justes nulle part.
export const OPTIONS_ABSURDES: RegExp[] = [
  /^n'importe quoi$/i,
  /^je ne sais pas$/i,
  /^des betises$/i,
];

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------
const TOUS = BANQUES.flatMap((b) =>
  b.items.map((it) => ({ ...it, matiere: b.matiere })),
);
const QCM = TOUS.filter(estQcm);

describe("QCM — garde-fou transverse (vocabulaire CE2 + distracteurs)", () => {
  it("il y a bien des QCM collectes dans plusieurs matieres", () => {
    expect(QCM.length).toBeGreaterThan(50);
    expect(new Set(QCM.map((q) => q.matiere)).size).toBeGreaterThanOrEqual(5);
  });

  it("(A) aucun mot hors CE2 dans la consigne ou une option sans explication", () => {
    const stems = MOTS_HORS_CE2.map(norm);
    const toleres = new Set(MOTS_TOLERES.map(norm));
    for (const it of TOUS) {
      const expl = norm(it.explication ?? "");
      const champs: string[] = [it.consigne ?? "", ...(it.options ?? [])];
      for (const champ of champs) {
        for (const mot of motsDe(champ)) {
          if (toleres.has(mot)) continue;
          const stem = stems.find((s) => mot === s || mot.startsWith(s));
          if (!stem) continue;
          // Explique si le stem apparait dans l'explication -> toleré (la notion
          // est definie a l'enfant). Sinon : refuse.
          const explique = expl.includes(stem);
          expect(
            explique,
            `[${it.matiere} ${it.cle}] mot hors CE2 « ${mot} » non explique : ${champ}`,
          ).toBe(true);
        }
      }
    }
  });

  it("(B) aucun distracteur hors champ (regle contexte -> interdits)", () => {
    for (const it of QCM) {
      const contexte = `${it.consigne ?? ""} ${it.attendu}`;
      for (const regle of REGLES_DISTRACTEURS) {
        if (!regle.contexte.test(contexte)) continue;
        for (const d of distracteurs(it)) {
          expect(
            regle.interdits.test(d),
            `[${it.matiere} ${it.cle}] distracteur hors champ « ${d} » (regle: ${regle.nom}) — consigne: ${it.consigne}`,
          ).toBe(false);
        }
      }
    }
  });

  it("(B bis) aucune option « blague » / vide de sens", () => {
    for (const it of QCM) {
      for (const o of it.options ?? []) {
        for (const re of OPTIONS_ABSURDES) {
          expect(
            re.test(o.trim()),
            `[${it.matiere} ${it.cle}] option absurde « ${o} »`,
          ).toBe(false);
        }
      }
    }
  });
});
