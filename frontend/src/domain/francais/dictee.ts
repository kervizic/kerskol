// Dictee detective (francais, CE2) : types partages + helpers PURS.
//
// SECURITE : ce module ne contient AUCUNE erreur plantee. Le client ne connait
// que les MOTS AFFICHES du texte (fautes comprises, telles qu'affichees) et le
// NOMBRE d'erreurs. Positions, corrections et types ne sont connus qu'APRES
// l'envoi (reponse du serveur, type DicteeResultat).
//
// La generation des QCM (niveau 2) se fait a partir du MOT VISIBLE seul (familles
// d'homophones, singulier/pluriel, -ent, m/b/p, er/e) : elle ne revele jamais si
// le mot est une erreur ni quelle est la correction (les propositions incluent
// toujours le mot tel qu'affiche).

export type TypeDictee =
  | "a_a" | "et_est" | "son_sont" | "on_ont" | "ces_ses" | "ce_se"
  | "pluriel" | "pluriel_al_aux" | "accord" | "verbe_ent" | "m_mbp" | "e_er_ez"
  | "la_la" | "ou_ou"
  // Notions CM1 (lot 3, branchées sur les lots 1-2).
  | "accord_sv" | "participe_passe" | "passe_simple" | "imperatif";

// Texte servi par le serveur (dictee_charger_tous) : jamais d'erreurs.
// notion rattache le texte a une notion de la progression (migration 0033) ;
// null pour les textes non encore rattaches. Le CHOIX du texte selon le niveau
// et les lacunes vit dans ./selection-dictee (fonction pure, testee).
export interface DicteeTexte {
  id: number;
  niveau: number;
  theme: string;
  mots: string[];
  nbErreurs: number;
  notion?: string | null;
}

// Erreur REVELEE par le serveur apres validation (jamais avant).
export interface DicteeErreurRevelee {
  position: number;
  faute: string;
  correction: string;
  type: TypeDictee;
  trouvee: boolean;
  correction_ok: boolean;
  cor_saisie: string | null;
}

// Resultat complet renvoye par verif_dictee (via enregistrer_reponse).
export interface DicteeResultat {
  juste: boolean;
  niveau: number;
  nb_erreurs: number;
  trouvees: number;
  corrigees: number;
  fausses_alertes: number[];
  type_dominant: TypeDictee | null;
  erreurs: DicteeErreurRevelee[];
}

// Reponse envoyee au serveur pour un mot touche : position (1-base) + correction
// eventuelle (niveaux 2+). Le serveur compare, le client ne juge pas.
export interface DicteeReponse {
  pos: number;
  cor?: string;
}

// Normalisation d'un MOT, MIROIR EXACT de public.normaliser_mot (SQL) :
// minuscules, espaces reduits, apostrophes typographiques -> ', ponctuation de
// bord retiree. Les ACCENTS et les traits d'union internes sont CONSERVES.
export function normaliserMot(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[’ʼ‘`]/g, "'")
    .replace(/[   ]/g, " ")
    .replace(/[.,;:!?«»"()…]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Mot affichable (sans la ponctuation de bord) pour les boutons de correction.
export function motAffichable(token: string): string {
  const m = token.match(/^[«"(…]*(.*?)[.,;:!?»")…]*$/);
  return (m ? m[1] : token) || token;
}

// Familles d'homophones : paires substituables a partir du mot visible.
const PAIRES: [RegExp, string[]][] = [
  [/^a$/, ["a", "à"]],
  [/^à$/, ["à", "a"]],
  [/^et$/, ["et", "est"]],
  [/^est$/, ["est", "et"]],
  [/^son$/, ["son", "sont"]],
  [/^sont$/, ["sont", "son"]],
  [/^on$/, ["on", "ont"]],
  [/^ont$/, ["ont", "on"]],
  [/^ces$/, ["ces", "ses"]],
  [/^ses$/, ["ses", "ces"]],
  [/^ce$/, ["ce", "se"]],
  [/^se$/, ["se", "ce"]],
  [/^la$/, ["la", "là"]],
  [/^là$/, ["là", "la"]],
  [/^ou$/, ["ou", "où"]],
  [/^où$/, ["où", "ou"]],
];

// Propositions de correction (QCM niveau 2) derivees du MOT VISIBLE. Renvoie au
// moins 2 options (dont le mot tel qu'affiche) ou [] si aucune famille ne
// s'applique (l'interface bascule alors en saisie libre pour ce mot).
export function propositionsDictee(token: string): string[] {
  const mot = motAffichable(token);
  const bas = normaliserMot(mot);
  const out: string[] = [];
  const push = (v: string) => {
    if (v && !out.some((x) => normaliserMot(x) === normaliserMot(v))) out.push(v);
  };

  // 1) Homophones : la paire substituable (dans les deux sens).
  for (const [re, props] of PAIRES) {
    if (re.test(bas)) {
      props.forEach(push);
      return out;
    }
  }
  // Le mot tel qu'affiche figure TOUJOURS (ne revele pas si c'est une erreur).
  push(mot);
  // 2) Verbe au pluriel : forme en -ent -> on propose la forme sans « nt ».
  if (/ent$/.test(bas) && bas.length > 3) {
    push(mot.slice(0, -2));
  } else if (/aux$/.test(bas) && bas.length > 3) {
    // 3) Pluriel en -aux : on propose le singulier en -al (chevaux -> cheval).
    push(mot.slice(0, -3) + "al");
  } else if (/als?$/.test(bas) && bas.length > 2) {
    // 4) Mot en -al : on propose le pluriel en -aux (cheval -> chevaux).
    push(mot.replace(/s$/, "").replace(/al$/, "aux"));
  } else if (/e$/.test(bas)) {
    // 5) Forme en -e : pluriel du nom/adjectif (+s) OU verbe pluriel (+ent).
    push(mot + "s");
    push(mot + "nt");
  } else if (/(s|x)$/.test(bas) && bas.length > 2) {
    // 6) Deja au pluriel : on propose le singulier.
    push(mot.slice(0, -1));
  } else {
    // 7) Autre fin : on propose le pluriel (x pour -eau/-eu/-au, sinon s).
    push(/(eau|eu|au)$/.test(bas) ? mot + "x" : mot + "s");
  }
  return out.length >= 2 ? out.slice(0, 3) : [];
}
