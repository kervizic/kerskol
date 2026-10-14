// GARDE-FOU : tout le texte GENERE par gabarit / concatenation et affiche a
// l'enfant (consigne, enonce/prompt, correction, propositions) doit etre du
// francais correct. On genere exhaustivement les consignes/enonces de chaque
// gabarit (conjugaison : 6 competences x 4 niveaux ; problemes : 4 competences
// x 4 niveaux ; numeration « encadrer » et « complement au rang »), sur un
// grand nombre de graines pour couvrir les tirages aleatoires (verbe, personne,
// objet, prenom), et on REFUSE :
//   - « au / le / la / de / que / ne / se / je » colle devant une voyelle (il
//     fallait elider : « a l' », « l' », « d' », « qu' »...) ; les nombres et
//     le « h » aspire sont exclus ;
//   - les contractions non faites « de le », « de les », « a les » ;
//   - un espace double ou un espace avant un point.
// Le SERVEUR reste seul juge des reponses ; ce test ne controle que l'affichage.

import { describe, it, expect } from "vitest";
import { generateExercise, type ExCalcul } from "./calcul/generator";
import { commenceParVoyelle } from "./francais/elision";

// Petits mots qui DOIVENT s'elider devant une voyelle / h muet.
const ELIDABLES = new Set(["au", "le", "la", "de", "que", "ne", "se", "je"]);

// Noyau d'un token : sans guillemet/parenthese ouvrant ni ponctuation finale.
function noyau(token: string): string {
  return token.replace(/^[«»"'([{]+/, "").replace(/[«»"')\]}.,;:!?]+$/, "");
}

// Renvoie la liste des fautes de francais detectees dans un texte genere.
export function fautesFrancais(texte: string): string[] {
  const out: string[] = [];
  if (/\bde le\b/i.test(texte)) out.push(`« de le » (-> du) : ${texte}`);
  if (/\bde les\b/i.test(texte)) out.push(`« de les » (-> des) : ${texte}`);
  if (/à les\b/i.test(texte)) out.push(`« à les » (-> aux) : ${texte}`);
  if (/ {2,}/.test(texte)) out.push(`espace double : ${texte}`);
  if (/ \./.test(texte)) out.push(`espace avant point : ${texte}`);

  const mots = texte.split(/\s+/);
  for (let i = 0; i < mots.length - 1; i++) {
    const a = noyau(mots[i]).toLowerCase();
    if (!ELIDABLES.has(a)) continue;
    const b = noyau(mots[i + 1]);
    if (b.length === 0 || /^[0-9]/.test(b)) continue; // « de 5 » est correct
    if (commenceParVoyelle(b)) out.push(`« ${a} ${b} » devant voyelle : ${texte}`);
  }
  return out;
}

// Rassemble tous les textes affiches d'un exercice genere.
function textesAffiches(ex: ReturnType<typeof generateExercise>): string[] {
  const t: string[] = [];
  if (typeof ex.prompt === "string") t.push(ex.prompt);
  if (typeof ex.correction === "string" && ex.correction) t.push(ex.correction);
  if (ex.conjPhrase) {
    t.push(ex.conjPhrase.consigne, ex.conjPhrase.complete);
    if (ex.conjPhrase.repere) t.push(ex.conjPhrase.repere);
  }
  if (Array.isArray(ex.optionsTexte)) t.push(...ex.optionsTexte);
  return t;
}

function src(competence: string, niveau: number, extra: Partial<ExCalcul> = {}): ExCalcul {
  return {
    exerciceId: "ex",
    competence,
    niveau,
    methode: null,
    operation: "",
    forme: "probleme",
    params: {},
    support: "aucun",
    correctionStrategie: null,
    ...extra,
  };
}

const SEEDS = Array.from({ length: 150 }, (_, i) => (i + 1) * 2654435761);

describe("garde-fou francais : textes generes (conjugaison)", () => {
  const COMPETENCES = [
    "FR.CONJ.PRESENT", "FR.CONJ.FUTUR", "FR.CONJ.IMPARFAIT",
    "FR.CONJ.PASSE_COMPOSE", "FR.CONJ.PASSE_SIMPLE", "FR.CONJ.IMPERATIF",
  ];
  it("aucune faute d'elision / contraction / espacement", () => {
    for (const comp of COMPETENCES) {
      for (let n = 1; n <= 4; n++) {
        for (const seed of SEEDS) {
          const ex = generateExercise(
            src(comp, n, { operation: "conj", forme: "conjugaison" }), seed
          );
          for (const texte of textesAffiches(ex)) {
            expect(fautesFrancais(texte), `${comp} N${n} seed=${seed}`).toEqual([]);
          }
        }
      }
    }
  });
});

describe("garde-fou francais : textes generes (problemes)", () => {
  const COMPETENCES = ["MA.PB.ADD_SUB", "MA.PB.MULT_DIV", "MA.PB.MONNAIE", "MA.PB.DEUX_ETAPES"];
  it("aucune faute d'elision / contraction / espacement", () => {
    for (const comp of COMPETENCES) {
      for (let n = 1; n <= 4; n++) {
        for (const seed of SEEDS) {
          const ex = generateExercise(src(comp, n), seed);
          for (const texte of textesAffiches(ex)) {
            expect(fautesFrancais(texte), `${comp} N${n} seed=${seed}`).toEqual([]);
          }
        }
      }
    }
  });
});

describe("garde-fou francais : numeration (accord de genre du rang)", () => {
  it("« encadrer » : « le millier » / « la centaine », jamais « la millier »", () => {
    for (const pas of [100, 1000]) {
      for (const seed of SEEDS) {
        const ex = generateExercise(
          src("MA.NUM.ENCADRER", 3, {
            operation: "val", forme: "encadrement", params: { type: "encadrer", pas, max: 9999 },
          }),
          seed
        );
        for (const texte of textesAffiches(ex)) {
          expect(fautesFrancais(texte), `encadrer pas=${pas} seed=${seed}`).toEqual([]);
          expect(texte.includes("la millier"), texte).toBe(false);
          expect(texte.includes("Quelle est la millier"), texte).toBe(false);
        }
      }
    }
  });

  it("« complement au rang » : « le millier juste au-dessus », jamais « la millier »", () => {
    for (const vers of ["centaine_sup", "millier_sup"]) {
      for (const seed of SEEDS) {
        const ex = generateExercise(
          src("MA.CM.COMPL_SUP", 3, {
            operation: "complement", forme: "terme_manquant", params: { vers },
          }),
          seed
        );
        for (const texte of textesAffiches(ex)) {
          expect(fautesFrancais(texte), `complement vers=${vers} seed=${seed}`).toEqual([]);
          expect(texte.includes("la millier"), texte).toBe(false);
        }
      }
    }
  });
});

describe("garde-fou francais : le detecteur fonctionne (garde-fou du test)", () => {
  it("attrape bien les fautes connues", () => {
    expect(fautesFrancais("Conjugue le verbe CHANTER au imparfait")).not.toEqual([]);
    expect(fautesFrancais("Combien de images en tout ?")).not.toEqual([]);
    expect(fautesFrancais("Il en a de plus que Arthur.")).not.toEqual([]);
    expect(fautesFrancais("Quelle est la millier juste en dessous ?")).toEqual(
      // « la millier » n'est pas une faute d'ELISION (consonne) : le detecteur
      // d'elision ne la voit pas ; c'est l'assertion dediee au genre qui la couvre.
      []
    );
    expect(fautesFrancais("On range de le jeu.")).not.toEqual([]);
    expect(fautesFrancais("Trop  d'espaces.")).not.toEqual([]);
  });
  it("laisse passer le francais correct", () => {
    expect(fautesFrancais("Conjugue le verbe CHANTER à l'imparfait")).toEqual([]);
    expect(fautesFrancais("Combien d'images en tout ?")).toEqual([]);
    expect(fautesFrancais("Il en a de plus qu'Arthur.")).toEqual([]);
    expect(fautesFrancais("Conjugue le verbe DONNER au présent")).toEqual([]);
    expect(fautesFrancais("Range les billes dans des boîtes.")).toEqual([]);
    expect(fautesFrancais("Chante une chanson !")).toEqual([]);
    expect(fautesFrancais("Il a de 8 à 10 billes.")).toEqual([]);
  });
});
