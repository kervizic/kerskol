// Module de diagnostic deterministe des fautes (reutilisable : nombres en
// lettres aujourd'hui, francais plus tard). Point d'entree unique.
export {
  enLettresFr,
  normaliser,
  formesAcceptees,
  estJuste,
  type Variante,
} from "./lettres";
export {
  diagnostiquer,
  MESSAGES_CATALOGUE,
  levenshtein,
  type TypeFaute,
  type Faute,
  type Diagnostic,
} from "./diagnostic";
export {
  diagnostiquerConjugaison,
  estJusteConjugaison,
  phraseAttendue,
  MESSAGES_CONJUGAISON,
} from "./conjugaison";
export {
  diagnostiquerPasseCompose,
  estJustePasseCompose,
  MESSAGES_PASSE_COMPOSE,
  type OptionsPC,
} from "./passe-compose";
export {
  messageErreur,
  messageFausseAlerte,
  messageBilan,
  expliquerType,
  MESSAGES_DICTEE,
  type MessageDictee,
  type TonDictee,
} from "./dictee";
