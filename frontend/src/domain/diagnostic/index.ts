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
  type TypeFaute,
  type Faute,
  type Diagnostic,
} from "./diagnostic";
