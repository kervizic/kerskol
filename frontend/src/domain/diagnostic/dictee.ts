// Diagnostic de la DICTEE DETECTIVE (francais, CE2).
//
// Le SERVEUR (verif_dictee) est seul juge : il revele, pour chaque erreur
// plantee, son type et si l'enfant l'a trouvee / bien corrigee, et liste les
// fausses alertes. Ce module ne fait QUE choisir le bon MESSAGE (style « enfant
// de 8 ans » : tres court, TOUJOURS un exemple juste / pas juste, jamais de
// grammaire abstraite) pour chaque cas, et surligner la bonne forme.
//
// Cas couverts :
//   * mot bien trouve ET bien corrige (ou trouve seul au niveau 1) -> valorisant ;
//   * mot manque -> on surligne et on montre la correction + l'astuce du type ;
//   * fausse alerte (mot juste touche) -> « Ce mot etait juste ! » ;
//   * mot trouve mais mal corrige -> « Bien trouve ! Mais on ecrit « … » » + astuce.

import type { DicteeErreurRevelee, DicteeResultat, TypeDictee } from "../francais/dictee";

export type TonDictee = "ok" | "info" | "rate";

export interface MessageDictee {
  ton: TonDictee;
  texte: string;
  surligne: string[]; // fragments de la bonne forme a mettre en evidence
}

// Astuce + exemple par type (le coeur pedagogique : remplacement quand il
// existe). Rediges POUR L'ORAL : phrases parlees courtes, les deux cas gardes,
// aucun symbole ni fleche.
export const MESSAGES_DICTEE: Record<TypeDictee, string> = {
  a_a: "Le mot a sans accent, c'est le verbe avoir. On peut dire il avait, comme dans il a un chat. Le mot à avec un accent montre où on va, comme dans il va à l'école.",
  et_est: "Le mot est, c'est le verbe être. On peut dire était, comme dans le chat est noir. Le mot et sert à relier, comme dans du pain et du lait.",
  son_sont: "Le mot son montre à qui c'est, comme dans son chat, le chat à lui. Le mot sont, c'est le verbe être. On peut dire ils étaient, comme dans ils sont là.",
  on_ont: "Le mot ont, c'est le verbe avoir. On peut dire ils avaient, comme dans ils ont faim. Le mot on veut dire quelqu'un, comme dans on joue.",
  ces_ses: "Le mot ses montre à qui c'est, comme dans ses jouets, les jouets à lui. Le mot ces montre des choses qu'on désigne, comme dans ces jouets, ceux-là.",
  ce_se: "Le mot se se place juste devant le verbe, comme dans il se lave. Le mot ce accompagne un nom, comme dans ce garçon.",
  pluriel: "Quand il y en a plusieurs, on ajoute un s, ou parfois un x. On dit un chat, et plusieurs chats. On dit un jeu, et plusieurs jeux.",
  pluriel_al_aux: "On dit un cheval, et plusieurs chevaux. Beaucoup de mots qui finissent par al font aux quand il y en a plusieurs.",
  accord: "Le petit mot qui décrit s'habille comme le nom. On dit une fleur rouge, et des fleurs rouges.",
  verbe_ent: "Quand plusieurs personnes font l'action, le verbe prend la terminaison ent. On dit il joue, et ils jouent.",
  m_mbp: "Devant les lettres m, b et p, on écrit un m à la place du n. Comme dans un tambour, une jambe, important.",
  e_er_ez: "On écrit le verbe avec e r à la fin quand on peut dire vendre, comme dans il va manger. On écrit é quand c'est déjà fait, comme dans il a mangé.",
};

// Explication courte d'un type (astuce + exemple).
export function expliquerType(type: TypeDictee): string {
  return MESSAGES_DICTEE[type];
}

// Message pour UNE erreur plantee, selon ce que l'enfant a fait.
export function messageErreur(e: DicteeErreurRevelee, niveau: number): MessageDictee {
  const astuce = expliquerType(e.type);
  // Trouvee.
  if (e.trouvee) {
    if (niveau <= 1) {
      return { ton: "ok", texte: `Bien joué, tu as trouvé le mot piégé : ${e.faute} !`, surligne: [e.correction] };
    }
    if (e.correction_ok) {
      return { ton: "ok", texte: `Bravo ! Tu as trouvé et corrigé. On écrit : ${e.correction}.`, surligne: [e.correction] };
    }
    // Trouvee mais mal corrigee.
    return {
      ton: "info",
      texte: `Bien trouvé ! Mais on écrit : ${e.correction}. ${astuce}`,
      surligne: [e.correction],
    };
  }
  // Manquee.
  return {
    ton: "rate",
    texte: `Un mot piégé était caché ici. On avait écrit ${e.faute}, mais on écrit : ${e.correction}. ${astuce}`,
    surligne: [e.correction],
  };
}

// Message pour une FAUSSE ALERTE (l'enfant a touche un mot qui etait juste).
export function messageFausseAlerte(mot: string): MessageDictee {
  return { ton: "info", texte: `Ce mot était juste ! Le mot ${mot} n'avait pas d'erreur.`, surligne: [] };
}

// Bilan valorisant (jamais punitif), toujours affiche.
export function messageBilan(res: DicteeResultat): string {
  const n = res.nb_erreurs;
  if (res.juste) {
    return n <= 1 ? "Super ! Tu as tout repéré !" : `Super détective ! Tu as tout trouvé (${n} sur ${n}) !`;
  }
  if (res.niveau <= 1) {
    return `Tu en as trouvé ${res.trouvees} sur ${n} ! Regarde les autres, tu y arriveras !`;
  }
  return `Tu en as bien corrigé ${res.corrigees} sur ${n} ! On regarde ensemble les autres.`;
}
