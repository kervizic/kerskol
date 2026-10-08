// Diagnostic DETERMINISTE d'un mot ecrit par l'enfant dans « les mots de la
// maitresse » (mots a apprendre, mot a trou, dictee avec papa/maman).
//
// Le SERVEUR reste SEUL JUGE du juste/faux (normaliser_mot) et calcule AUSSI le
// type de faute (fonction SQL _maitresse_diag, meme classification). Ce module
// ne fait que choisir le MESSAGE bienveillant correspondant, redige pour un
// enfant de 8 ans : phrases courtes, comprehensibles a l'oral, un exemple
// concret, jamais de reproche. On epelle toujours la bonne forme a la fin.

import { normaliserMot } from "../francais/dictee";
import { sansAccents, epeler } from "../francais/maitresse";

// Types de faute (MIROIR de _maitresse_diag cote SQL).
export type TypeFauteMot =
  | "homophone" | "accent" | "doublement" | "lettre_muette" | "son" | "lettre";

export interface DiagnosticMot {
  type: TypeFauteMot;
  message: string;
}

const HOMO: Record<string, string[]> = {
  a: ["à"], "à": ["a"], et: ["est"], est: ["et"], son: ["sont"], sont: ["son"],
  on: ["ont"], ont: ["on"], ou: ["où"], "où": ["ou"], la: ["là"], "là": ["la"],
  ces: ["ses", "c'est"], ses: ["ces", "c'est"], ce: ["se"], se: ["ce"],
  mes: ["mais", "met"], mais: ["mes", "met"], peu: ["peux"], peux: ["peu"],
};

// Reduit une consonne doublee a une seule (poisson -> poison).
function sansDoublons(w: string): string {
  return w.replace(/([bcdfgjklmnprstz])\1/g, "$1");
}

// Reduit les graphies d'un meme SON a une forme canonique (pour reperer une
// confusion de son : o/au/eau, s/ss/c/ç, g/ge/j).
function canonSon(w: string): string {
  return w
    .replace(/eau/g, "o").replace(/au/g, "o")
    .replace(/ss/g, "s").replace(/ç/g, "s").replace(/c([eiy])/g, "s$1")
    .replace(/ge/g, "j").replace(/g([eiy])/g, "j$1");
}

const FIN_MUETTE = new Set(["s", "t", "x", "d", "p", "e", "z", "g"]);

// Diagnostique l'ecart entre la bonne graphie et la saisie de l'enfant.
// `correct` et `saisie` sont des mots bruts ; on normalise comme le serveur.
export function diagnostiquerMot(correct: string, saisie: string): DiagnosticMot {
  const c = normaliserMot(correct);
  const s = normaliserMot(saisie);
  const bonMot = correct.trim();

  const final = (type: TypeFauteMot, message: string): DiagnosticMot => ({ type, message });

  // Homophone (le piege le plus parlant).
  if (HOMO[c]?.includes(s) || HOMO[s]?.includes(c)) {
    return final("homophone",
      `Attention, deux petits mots se ressemblent ! Ici on écrit : ${bonMot}. On l'épelle : ${epeler(bonMot)}.`);
  }
  // Accent : memes lettres, un accent manque ou se trompe.
  if (c !== s && sansAccents(c) === sansAccents(s)) {
    return final("accent",
      `C'est une histoire d'accent. On écrit : ${bonMot}. Regarde bien le petit chapeau ou l'accent sur la lettre !`);
  }
  // Doublement : une lettre est en double, ou il en manque une.
  if (c !== s && sansDoublons(c) === sansDoublons(s)) {
    return final("doublement",
      `Ici, il faut penser à la lettre double. On écrit : ${bonMot}. On l'épelle : ${epeler(bonMot)}.`);
  }
  // Lettre muette finale : il manque (ou il y a en trop) une lettre a la fin
  // qu'on n'entend pas.
  if (c.length === s.length + 1 && c.startsWith(s) && FIN_MUETTE.has(c[c.length - 1])) {
    return final("lettre_muette",
      `Il y a une lettre magique à la fin qu'on n'entend pas. On écrit : ${bonMot}. On l'épelle : ${epeler(bonMot)}.`);
  }
  if (s.length === c.length + 1 && s.startsWith(c) && FIN_MUETTE.has(s[s.length - 1])) {
    return final("lettre_muette",
      `Ici, il n'y a pas de lettre en plus à la fin. On écrit : ${bonMot}. On l'épelle : ${epeler(bonMot)}.`);
  }
  // Confusion de son (o/au/eau, s/ss/c/ç, g/ge/j).
  if (c !== s && canonSon(sansAccents(c)) === canonSon(sansAccents(s))) {
    return final("son",
      `On entend le bon son, mais ça ne s'écrit pas comme ça ici. On écrit : ${bonMot}. On l'épelle : ${epeler(bonMot)}.`);
  }
  // Defaut : une ou plusieurs lettres differentes.
  return final("lettre",
    `C'est presque ça ! On écrit : ${bonMot}. On l'épelle : ${epeler(bonMot)}.`);
}

// Message de bilan d'une dictee avec papa ou maman (toujours valorisant).
export function messageBilanDictee(juste: number, total: number): string {
  if (total > 0 && juste === total) return `Bravo ! Tu as écrit les ${total} mots sans erreur !`;
  if (juste === 0) return `Tu as bien essayé ! On revoit ces mots ensemble, tu vas y arriver.`;
  return `Super, tu as réussi ${juste} mot${juste > 1 ? "s" : ""} sur ${total} ! On revoit les autres ensemble.`;
}
