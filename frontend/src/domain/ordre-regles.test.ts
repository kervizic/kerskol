// Liste de controle, point 11 : regles de donnees sur CHAQUE exercice « remettre
// dans l'ordre » (QmItem format "ordre"), toutes matieres confondues.
//
// Verifie pour chaque item :
//   - 3 a 6 etiquettes (3 en decouverte, 4-5 ensuite, 6 max) ;
//   - longueurs proches : ecart <= 2 mots entre la plus courte et la plus longue ;
//   - un picto (emoji non vide) par etiquette ;
//   - aucun MOT DU TEMPS dans les etiquettes (d'abord/ensuite/puis/enfin/apres) :
//     ces mots vivent SOUS les cases, jamais sur les cartes ;
//   - etiquettes toutes distinctes (prerequis d'une permutation unique).
//
// La « seule permutation logique » (chaque etape cause la suivante) reste une
// propriete editoriale, non verifiable automatiquement : on teste ici les regles
// mecaniques qui l'accompagnent.

import { describe, it, expect } from "vitest";
import type { QmItem } from "./qm/types";
import { BANQUE_EMC } from "./emc";
import { BANQUE_EMC_CM1 } from "./emc/cm1";
import { BANQUE_QM } from "./qm";
import { BANQUE_SCIENCES } from "./sciences/bank";
import { itemsParcoursSciencesTousQm } from "./sciences/parcours";
import { BANQUE_HISTOIRE } from "./histoire/bank";
import { itemsParcoursTousQm } from "./histoire/parcours";
import { pictoPourEtiquette } from "./pictos";

const TOUS: QmItem[] = [
  ...BANQUE_EMC,
  ...BANQUE_EMC_CM1,
  ...BANQUE_QM,
  ...BANQUE_SCIENCES,
  ...itemsParcoursSciencesTousQm(),
  ...BANQUE_HISTOIRE,
  ...itemsParcoursTousQm(),
];

const ITEMS_ORDRE = TOUS.filter((i) => i.format === "ordre");

const MOTS_DU_TEMPS = /\b(d'abord|dabord|ensuite|puis|enfin|apres|après)\b/i;

function nbMots(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

describe("Regles des exercices « remettre dans l'ordre » (point 11)", () => {
  it("il y a bien des exercices d'ordre a verifier", () => {
    expect(ITEMS_ORDRE.length).toBeGreaterThan(20);
  });

  for (const item of ITEMS_ORDRE) {
    const labels = item.options ?? [];
    describe(`${item.cle}`, () => {
      it("a 3 a 6 etiquettes", () => {
        expect(labels.length, item.cle).toBeGreaterThanOrEqual(3);
        expect(labels.length, item.cle).toBeLessThanOrEqual(6);
      });

      it("longueurs proches : ecart <= 2 mots", () => {
        const tailles = labels.map(nbMots);
        const ecart = Math.max(...tailles) - Math.min(...tailles);
        expect(ecart, `${item.cle} : ${labels.join(" | ")}`).toBeLessThanOrEqual(2);
      });

      it("un picto par etiquette", () => {
        for (const l of labels) {
          expect(pictoPourEtiquette(l), `${item.cle} / ${l}`).toMatch(/\S/);
        }
      });

      it("aucun mot du temps dans les etiquettes", () => {
        for (const l of labels) {
          expect(MOTS_DU_TEMPS.test(l), `${item.cle} / ${l}`).toBe(false);
        }
      });

      it("etiquettes toutes distinctes", () => {
        expect(new Set(labels).size, item.cle).toBe(labels.length);
      });
    });
  }
});
