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

// Astuce + exemple par type (le coeur pedagogique : remplacement quand il existe).
export const MESSAGES_DICTEE: Record<TypeDictee, string> = {
  a_a: "a sans accent = avoir : il a un chat (il avait). / à avec accent : il va à l'école.",
  et_est: "est = était : le chat est noir. / et = et puis : du pain et du lait.",
  son_sont: "son chat = le chat à lui. / ils sont là = ils étaient là.",
  on_ont: "ont = avaient : ils ont faim. / on = quelqu'un : on joue.",
  ces_ses: "ses jouets = les jouets à lui. / ces jouets = ceux-là, je les montre.",
  ce_se: "se = juste devant le verbe : il se lave. / ce = ce garçon, ce que.",
  pluriel: "Quand il y en a plusieurs, on ajoute un s (ou un x) : un chat → des chats, un jeu → des jeux.",
  pluriel_al_aux: "un cheval → des chevaux. Beaucoup de mots en -al font -aux au pluriel.",
  accord: "Le petit mot qui décrit s'habille comme le nom : une fleur rouge → des fleurs rouges.",
  verbe_ent: "Plusieurs qui font l'action : le verbe prend -ent : il joue → ils jouent.",
  m_mbp: "Devant m, b, p, on écrit m et pas n : un tambour, une jambe, important.",
  e_er_ez: "er quand on peut dire « vendre » : il va manger (vendre). / é quand c'est fait : il a mangé (vendu).",
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
      return { ton: "ok", texte: `Bien joué, tu as trouvé le mot piégé « ${e.faute} » !`, surligne: [e.correction] };
    }
    if (e.correction_ok) {
      return { ton: "ok", texte: `Bravo ! Tu as trouvé ET corrigé : on écrit « ${e.correction} ».`, surligne: [e.correction] };
    }
    // Trouvee mais mal corrigee.
    return {
      ton: "info",
      texte: `Bien trouvé ! Mais on écrit « ${e.correction} ». ${astuce}`,
      surligne: [e.correction],
    };
  }
  // Manquee.
  return {
    ton: "rate",
    texte: `Un mot piégé était caché ici : « ${e.faute} » → on écrit « ${e.correction} ». ${astuce}`,
    surligne: [e.correction],
  };
}

// Message pour une FAUSSE ALERTE (l'enfant a touche un mot qui etait juste).
export function messageFausseAlerte(mot: string): MessageDictee {
  return { ton: "info", texte: `Ce mot était juste ! « ${mot} » n'avait pas d'erreur.`, surligne: [] };
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
