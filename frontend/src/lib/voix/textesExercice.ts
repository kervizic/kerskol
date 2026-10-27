// Enumere TOUS les textes affichables qu'un exercice peut faire lire par la voix.
// Source unique pour (1) la mesure de couverture, (2) la liste des clips a
// generer, (3) le cablage runtime du lecteur. Un texte = { kind, texte } ; la
// matiere/le domaine viennent de la source (suivis a part).
//
// Le texte de lecture d'un exercice de COMPREHENSION (comp.texte[]) est lu en
// SILENCE par l'enfant : il n'est JAMAIS verse a la voix (cf. generator.ts).

import type { GeneratedExercise } from "../../domain/calcul/generator";
import { indicePour } from "../../domain/indices";

export type ChampKind =
  | "enonce"
  | "consigne"
  | "sous-titre"
  | "phrase"
  | "choix"
  | "correction"
  | "indice"
  | "message";

export interface TexteLu {
  kind: ChampKind;
  texte: string;
}

// Messages de reussite / erreur STATIQUES (bandeaux de Session.tsx). Lus a la
// correction. Textes EXACTS affiches (le correctif voix doit matcher a l'octet).
export const MESSAGES_STATIQUES: string[] = [
  "Bravo, c'est juste !",
  "Ce n'est pas ca, voici comment trouver",
];

function push(out: TexteLu[], kind: ChampKind, t: string | null | undefined) {
  if (t && t.trim()) out.push({ kind, texte: t.trim() });
}

export function textesLus(ex: GeneratedExercise): TexteLu[] {
  const out: TexteLu[] = [];

  // Enonce principal (calcul : lu en briques ; prose : clip entier).
  push(out, "enonce", ex.prompt);

  // Correction expliquee (bandeau erreur).
  push(out, "correction", ex.correction);

  // Indice (niveaux 1 et 2).
  push(out, "indice", indicePour(ex.competence, ex.niveau));

  // Choix numeriques (QCM) : le label affiche (souvent un nombre).
  for (const o of ex.options ?? []) push(out, "choix", o.label);
  // Choix TEXTE (conjugaison) : une forme par choix.
  for (const o of ex.optionsTexte ?? []) push(out, "choix", o);

  // Conjugaison « phrase a completer ».
  if (ex.conjPhrase) {
    push(out, "consigne", ex.conjPhrase.consigne);
    push(out, "sous-titre", ex.conjPhrase.repere);
    push(out, "phrase", ex.conjPhrase.complete);
  }

  // Blocs de banque (grammaire / lexique / geo / donnees / comprehension /
  // ecriture / questionner le monde). Memes champs lus partout.
  const blocs = [ex.gram, ex.geo, ex.don, ex.comp, ex.qm, ex.ecr];
  for (const b of blocs) {
    if (!b) continue;
    const bb = b as Record<string, unknown>;
    push(out, "consigne", bb.consigne as string);
    push(out, "phrase", bb.phrase as string);
    push(out, "correction", bb.explication as string);
    for (const o of (bb.options as string[] | undefined) ?? []) push(out, "choix", o);
    for (const o of (bb.evenements as string[] | undefined) ?? []) push(out, "choix", o);
  }
  // Ecriture : modele / amorce / exemple sont des textes montres et lisibles.
  if (ex.ecr) {
    push(out, "phrase", ex.ecr.modele);
    push(out, "phrase", ex.ecr.amorce);
    push(out, "phrase", ex.ecr.exemple);
  }
  // Comprehension : phrase-preuve citee en cas d'erreur.
  if (ex.comp) push(out, "correction", ex.comp.preuve);

  return out;
}
