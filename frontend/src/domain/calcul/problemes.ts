// Generateur de PROBLEMES en francais (TS pur, sans effet de bord).
//
// Quatre competences CE2 (voir docs/referentiel-calcul.md) :
//   * MA.PB.ADD_SUB    : problemes additifs a une etape (reunion, ajout/retrait,
//                        comparaison « de plus / de moins », recherche de l'etat
//                        initial) ;
//   * MA.PB.MULT_DIV   : problemes multiplicatifs a une etape (groupements,
//                        partages equitables, « fois plus ») ;
//   * MA.PB.MONNAIE    : billets et pieces en euros (composer une somme, rendre
//                        la monnaie, comparer des prix) ;
//   * MA.PB.DEUX_ETAPES: problemes a deux etapes (premiers exercices MIXTES).
//
// INVARIANT DE SECURITE (lot 2, migration 0022/0024) : chaque probleme se
// normalise en `verif` (op,a,b [,op2,c]) dont le serveur RECALCULE la reponse.
// Le texte de l'enonce (banque de gabarits, mascotte, univers) ne touche JAMAIS
// au calcul. Les montants d'argent sont manipules en CENTIMES entiers.
//
// La correction porte un SCHEMA EN BARRES (modele tout/parties ou comparaison),
// disponible aussi comme aide optionnelle pendant la recherche.

import { intBetween, pick, shuffle, type Rng } from "./rng";
import type {
  BarCell,
  BarModel,
  Base,
  ExCalcul,
  GeneratedExercise,
  MoneyData,
  ProblemContext,
  QcmOption,
  Verif,
  VerifOp2,
} from "./generator";

// --------------------------- Mise en forme --------------------------------
// Espace des milliers (lisible pour un enfant) : 1 234, 12 500...
function fmt(n: number): string {
  const s = String(Math.abs(Math.trunc(n)));
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (n < 0 ? "-" : "") + grouped;
}
// Somme d'argent (centimes -> « 12 € » ou « 12 € 50 »).
function euro(cents: number): string {
  const e = Math.floor(cents / 100);
  const c = cents % 100;
  return c === 0 ? `${fmt(e)} €` : `${fmt(e)} € ${String(c).padStart(2, "0")}`;
}

// --------------------------- Banques de mots ------------------------------
// Prenoms neutres et varies (aucun stereotype). `hero` = enfant/mascotte.
const NAMES = [
  "Maya", "Tom", "Lila", "Noé", "Jade", "Sami", "Lou", "Arthur", "Nina",
  "Yanis", "Zoé", "Gabin", "Inès", "Malo", "Anna", "Léo",
];
const OBJ = [
  "billes", "coquillages", "images", "autocollants", "noisettes", "perles",
  "cartes", "timbres", "crayons", "cailloux", "graines", "boutons",
];
const GRP = ["sachets", "boîtes", "paquets", "paniers", "piles", "bocaux"];
const ITEMS = [
  "un livre", "un ballon", "une trousse", "un jeu", "une plante",
  "un cadeau", "un casse-tête", "une BD",
];

function heroOf(rng: Rng, ctx?: ProblemContext): string {
  return ctx?.hero && ctx.hero.trim().length > 0 ? ctx.hero.trim() : pick(rng, NAMES);
}
function otherThan(rng: Rng, name: string): string {
  const pool = NAMES.filter((n) => n !== name);
  return pick(rng, pool);
}

// --------------------------- Modele en barres -----------------------------
function cell(value: number, known: boolean, label?: string): BarCell {
  return {
    units: Math.max(1, Math.abs(value)),
    value,
    label: known ? (label ?? fmt(value)) : "?",
    unknown: !known,
  };
}
function toutParties(whole: BarCell, parts: BarCell[]): BarModel {
  return { variant: "tout_parties", whole, parts };
}
function comparaison(grand: BarCell, petit: BarCell, diff: BarCell): BarModel {
  return { variant: "comparaison", parts: [grand, petit], diff };
}

// --------------------------- Gabarits (texte) -----------------------------
// Chaque gabarit porte un `type` (structure du probleme) et un `t` (texte). Au
// moins 15 par competence. `t` ne fait que du texte : les nombres sont deja
// calcules et passes en `v`.
export interface Vars {
  hero: string;
  friend: string;
  obj: string;
  grp: string;
  item: string;
  item2: string;
  n1: number; // premier nombre affiche
  n2: number; // second nombre affiche
  res: number; // reponse (non affichee dans l'enonce)
  sum: string; // somme a composer (formatee)
  price: string; // prix (rendre) formate
  paid: string; // montant paye (rendre) formate
  px: string; // prix X (comparer)
  py: string; // prix Y (comparer)
  // Problemes de MESURES (grandeurs) : morceaux de texte DEJA formates avec
  // leur unite (« 2 m », « 1 h 30 », « 300 g »). Le calcul reste porte par verif.
  q1: string; // 1re quantite formatee
  q2: string; // 2e quantite formatee
  uu: string; // unite attendue dans la reponse (« cm », « min », « g », « € »)
  conv: string; // rappel de conversion (« 1 m = 100 cm ») ou ""
}
export interface Gabarit {
  type: string;
  t: (v: Vars) => string;
}

// ADD_SUB : reunion / ajout / retrait / de_plus / de_moins / etat_recu / etat_don
const ADD_SUB_BANK: Gabarit[] = [
  { type: "reunion", t: (v) => `${v.hero} ramasse ${fmt(v.n1)} ${v.obj} le matin et ${fmt(v.n2)} ${v.obj} l'après-midi. Combien de ${v.obj} en tout ?` },
  { type: "reunion", t: (v) => `Dans une boîte il y a ${fmt(v.n1)} ${v.obj} rouges et ${fmt(v.n2)} ${v.obj} bleus. Combien de ${v.obj} en tout ?` },
  { type: "reunion", t: (v) => `${v.hero} et ${v.friend} mettent leurs ${v.obj} ensemble : ${fmt(v.n1)} et ${fmt(v.n2)}. Combien en tout ?` },
  { type: "ajout", t: (v) => `${v.hero} a ${fmt(v.n1)} ${v.obj}. ${v.friend} lui en donne ${fmt(v.n2)}. Combien ${v.hero} en a-t-il maintenant ?` },
  { type: "ajout", t: (v) => `Il y avait ${fmt(v.n1)} ${v.obj} dans le panier. On en ajoute ${fmt(v.n2)}. Combien y en a-t-il maintenant ?` },
  { type: "retrait", t: (v) => `${v.hero} a ${fmt(v.n1)} ${v.obj} et en donne ${fmt(v.n2)} à ${v.friend}. Combien lui en reste-t-il ?` },
  { type: "retrait", t: (v) => `Il y avait ${fmt(v.n1)} ${v.obj} dans la boîte. On en enlève ${fmt(v.n2)}. Combien en reste-t-il ?` },
  { type: "retrait", t: (v) => `${v.hero} avait ${fmt(v.n1)} ${v.obj}. Il en a perdu ${fmt(v.n2)}. Combien lui en reste-t-il ?` },
  { type: "de_plus", t: (v) => `${v.hero} a ${fmt(v.n1)} ${v.obj}. ${v.friend} en a ${fmt(v.n2)} de plus. Combien ${v.friend} a-t-il de ${v.obj} ?` },
  { type: "de_plus", t: (v) => `${v.friend} a ${fmt(v.n2)} ${v.obj} de plus que ${v.hero}, qui en a ${fmt(v.n1)}. Combien ${v.friend} en a-t-il ?` },
  { type: "de_moins", t: (v) => `${v.hero} a ${fmt(v.n1)} ${v.obj}. ${v.friend} en a ${fmt(v.n2)} de moins. Combien ${v.friend} a-t-il de ${v.obj} ?` },
  { type: "de_moins", t: (v) => `${v.friend} a ${fmt(v.n2)} ${v.obj} de moins que ${v.hero}, qui en a ${fmt(v.n1)}. Combien ${v.friend} en a-t-il ?` },
  { type: "etat_recu", t: (v) => `${v.hero} a reçu ${fmt(v.n2)} ${v.obj}. Maintenant il en a ${fmt(v.n1)}. Combien en avait-il avant ?` },
  { type: "etat_recu", t: (v) => `Après avoir gagné ${fmt(v.n2)} ${v.obj}, ${v.hero} en a ${fmt(v.n1)}. Combien en avait-il au départ ?` },
  { type: "etat_don", t: (v) => `${v.hero} a donné ${fmt(v.n2)} ${v.obj} et il lui en reste ${fmt(v.n1)}. Combien en avait-il au début ?` },
  { type: "etat_don", t: (v) => `${v.hero} a mangé ${fmt(v.n2)} ${v.obj}. Il lui en reste ${fmt(v.n1)}. Combien en avait-il au début ?` },
  { type: "reunion", t: (v) => `Sur l'étagère, ${fmt(v.n1)} ${v.obj} à gauche et ${fmt(v.n2)} ${v.obj} à droite. Combien de ${v.obj} en tout ?` },
  { type: "retrait", t: (v) => `${v.hero} a ${fmt(v.n1)} ${v.obj}. ${v.friend} lui en prend ${fmt(v.n2)}. Combien lui en reste-t-il ?` },
];

// MULT_DIV : groupement / partage / fois_plus
const MULT_DIV_BANK: Gabarit[] = [
  { type: "groupement", t: (v) => `${v.hero} range ses ${v.obj} dans ${fmt(v.n1)} ${v.grp} de ${fmt(v.n2)} ${v.obj} chacun. Combien de ${v.obj} en tout ?` },
  { type: "groupement", t: (v) => `Il y a ${fmt(v.n1)} ${v.grp}. Chaque ${v.grp.replace(/s$/, "")} contient ${fmt(v.n2)} ${v.obj}. Combien de ${v.obj} en tout ?` },
  { type: "groupement", t: (v) => `${v.hero} fait ${fmt(v.n1)} rangées de ${fmt(v.n2)} ${v.obj}. Combien de ${v.obj} en tout ?` },
  { type: "groupement", t: (v) => `${v.friend} achète ${fmt(v.n1)} ${v.grp} de ${fmt(v.n2)} ${v.obj}. Combien de ${v.obj} au total ?` },
  { type: "groupement", t: (v) => `Une affiche montre ${fmt(v.n1)} fois ${fmt(v.n2)} ${v.obj}. Combien de ${v.obj} en tout ?` },
  { type: "partage", t: (v) => `${v.hero} partage ${fmt(v.n1)} ${v.obj} entre ${fmt(v.n2)} amis, à parts égales. Combien de ${v.obj} par ami ?` },
  { type: "partage", t: (v) => `On range ${fmt(v.n1)} ${v.obj} dans ${fmt(v.n2)} ${v.grp} identiques. Combien de ${v.obj} par ${v.grp.replace(/s$/, "")} ?` },
  { type: "partage", t: (v) => `${fmt(v.n1)} ${v.obj} sont distribués également à ${fmt(v.n2)} enfants. Combien chacun en reçoit-il ?` },
  { type: "partage", t: (v) => `${v.hero} met ${fmt(v.n1)} ${v.obj} en ${fmt(v.n2)} tas égaux. Combien de ${v.obj} dans chaque tas ?` },
  { type: "fois_plus", t: (v) => `${v.hero} a ${fmt(v.n1)} ${v.obj}. ${v.friend} en a ${fmt(v.n2)} fois plus. Combien ${v.friend} a-t-il de ${v.obj} ?` },
  { type: "fois_plus", t: (v) => `${v.friend} a ${fmt(v.n2)} fois plus de ${v.obj} que ${v.hero}, qui en a ${fmt(v.n1)}. Combien ${v.friend} en a-t-il ?` },
  { type: "fois_plus", t: (v) => `Un arbre porte ${fmt(v.n1)} ${v.obj}. Le grand arbre d'à côté en a ${fmt(v.n2)} fois plus. Combien en a-t-il ?` },
  { type: "groupement", t: (v) => `${v.hero} colle ${fmt(v.n2)} ${v.obj} sur chacune de ses ${fmt(v.n1)} pages. Combien de ${v.obj} en tout ?` },
  { type: "partage", t: (v) => `${fmt(v.n1)} ${v.obj} à partager équitablement entre ${fmt(v.n2)} boîtes. Combien par boîte ?` },
  { type: "fois_plus", t: (v) => `${v.hero} a ${fmt(v.n1)} ${v.obj}. Il veut en avoir ${fmt(v.n2)} fois plus. Combien lui en faudra-t-il ?` },
  { type: "groupement", t: (v) => `Dans le jardin, ${fmt(v.n1)} rangs de ${fmt(v.n2)} ${v.obj}. Combien de ${v.obj} en tout ?` },
];

// MONNAIE : composer / rendre / comparer
const MONNAIE_BANK: Gabarit[] = [
  { type: "composer", t: (v) => `Compose exactement ${v.sum} avec des billets et des pièces.` },
  { type: "composer", t: (v) => `${v.hero} veut payer ${v.item} qui coûte ${v.sum}. Compose cette somme.` },
  { type: "composer", t: (v) => `Prépare ${v.sum} pile, avec le moins de billets et de pièces possible.` },
  { type: "composer", t: (v) => `${v.hero} a besoin de ${v.sum} pour ${v.item}. Compose la somme.` },
  { type: "composer", t: (v) => `Fais ${v.sum} avec des billets et des pièces.` },
  { type: "composer", t: (v) => `Dans sa tirelire, ${v.hero} veut mettre ${v.sum}. Compose cette somme.` },
  { type: "composer", t: (v) => `Compose ${v.sum} pour acheter ${v.item}.` },
  { type: "rendre", t: (v) => `${v.hero} achète ${v.item} à ${v.price}. Il paie avec ${v.paid}. Combien lui rend-on ?` },
  { type: "rendre", t: (v) => `${v.item} coûte ${v.price}. ${v.hero} donne ${v.paid}. Combien le marchand rend-il ?` },
  { type: "rendre", t: (v) => `${v.hero} paie ${v.item} (${v.price}) avec un billet de ${v.paid}. Combien d'argent lui rend-on ?` },
  { type: "rendre", t: (v) => `Pour ${v.item} à ${v.price}, ${v.hero} tend ${v.paid}. Combien lui rend-on ?` },
  { type: "comparer", t: (v) => `${v.item} coûte ${v.px}, ${v.item2} coûte ${v.py}. Place le bon signe entre les deux prix.` },
  { type: "comparer", t: (v) => `Compare les deux prix : ${v.px} et ${v.py}. Place le bon signe.` },
  { type: "comparer", t: (v) => `${v.hero} hésite entre ${v.item} à ${v.px} et ${v.item2} à ${v.py}. Place le bon signe entre les prix.` },
  { type: "comparer", t: (v) => `Deux étiquettes : ${v.px} et ${v.py}. Place le bon signe.` },
];

// DEUX_ETAPES : mul_add / mul_sub / add_div / add_sub
const DEUX_ETAPES_BANK: Gabarit[] = [
  { type: "mul_add", t: (v) => `${v.hero} achète ${fmt(v.n1)} ${v.grp} de ${fmt(v.n2)} ${v.obj}, puis trouve ${fmt(cFrom(v))} ${v.obj} de plus. Combien de ${v.obj} en tout ?` },
  { type: "mul_add", t: (v) => `Dans ${fmt(v.n1)} ${v.grp} il y a ${fmt(v.n2)} ${v.obj} chacun. On ajoute ${fmt(cFrom(v))} ${v.obj}. Combien de ${v.obj} en tout ?` },
  { type: "mul_add", t: (v) => `${v.hero} range ${fmt(v.n1)} rangées de ${fmt(v.n2)} ${v.obj}, et il en reste ${fmt(cFrom(v))} à côté. Combien de ${v.obj} en tout ?` },
  { type: "mul_add", t: (v) => `${v.friend} a ${fmt(v.n1)} ${v.grp} de ${fmt(v.n2)} ${v.obj}, plus ${fmt(cFrom(v))} ${v.obj} dans sa poche. Combien en tout ?` },
  { type: "mul_sub", t: (v) => `${v.hero} a ${fmt(v.n1)} ${v.grp} de ${fmt(v.n2)} ${v.obj}. Il en donne ${fmt(cFrom(v))}. Combien lui en reste-t-il ?` },
  { type: "mul_sub", t: (v) => `Il y a ${fmt(v.n1)} ${v.grp} de ${fmt(v.n2)} ${v.obj}. On en enlève ${fmt(cFrom(v))}. Combien en reste-t-il ?` },
  { type: "mul_sub", t: (v) => `${v.hero} prépare ${fmt(v.n1)} rangées de ${fmt(v.n2)} ${v.obj} puis en retire ${fmt(cFrom(v))}. Combien en reste-t-il ?` },
  { type: "add_div", t: (v) => `${v.hero} a ${fmt(v.n1)} ${v.obj} et ${v.friend} en a ${fmt(v.n2)}. Ils partagent le tout entre ${fmt(cFrom(v))} boîtes égales. Combien par boîte ?` },
  { type: "add_div", t: (v) => `On réunit ${fmt(v.n1)} et ${fmt(v.n2)} ${v.obj}, puis on les partage en ${fmt(cFrom(v))} parts égales. Combien par part ?` },
  { type: "add_div", t: (v) => `${fmt(v.n1)} ${v.obj} rouges et ${fmt(v.n2)} ${v.obj} verts sont rangés également dans ${fmt(cFrom(v))} ${v.grp}. Combien par ${v.grp.replace(/s$/, "")} ?` },
  { type: "add_sub", t: (v) => `${v.hero} a ${fmt(v.n1)} ${v.obj}, en gagne ${fmt(v.n2)}, puis en donne ${fmt(cFrom(v))}. Combien lui en reste-t-il ?` },
  { type: "add_sub", t: (v) => `Il y avait ${fmt(v.n1)} ${v.obj}. On en ajoute ${fmt(v.n2)}, puis on en retire ${fmt(cFrom(v))}. Combien en reste-t-il ?` },
  { type: "add_sub", t: (v) => `${v.hero} reçoit ${fmt(v.n1)} puis ${fmt(v.n2)} ${v.obj}, et en perd ${fmt(cFrom(v))}. Combien lui en reste-t-il ?` },
  { type: "mul_add", t: (v) => `Une boîte contient ${fmt(v.n1)} fois ${fmt(v.n2)} ${v.obj}, et ${fmt(cFrom(v))} ${v.obj} sont posés dessus. Combien de ${v.obj} en tout ?` },
  { type: "mul_sub", t: (v) => `${v.friend} a ${fmt(v.n1)} ${v.grp} de ${fmt(v.n2)} ${v.obj} et en mange ${fmt(cFrom(v))}. Combien lui en reste-t-il ?` },
  { type: "add_div", t: (v) => `${v.hero} et ${v.friend} ont ${fmt(v.n1)} et ${fmt(v.n2)} ${v.obj}. Ils les partagent entre ${fmt(cFrom(v))} amis. Combien chacun en reçoit-il ?` },

  // --- RENDU SUR PLUSIEURS ARTICLES (op2 = rsub : reponse = c - r1) ---------
  // mul_rsub : n articles a p €, paye avec c € -> rendu = c - n×p (euros entiers).
  { type: "mul_rsub", t: (v) => `${v.hero} achète ${fmt(v.n1)} ${v.obj} à ${fmt(v.n2)} € pièce. Il paie avec un billet de ${fmt(cFrom(v))} €. Combien lui rend-on ?` },
  { type: "mul_rsub", t: (v) => `${v.hero} prend ${fmt(v.n1)} ${v.obj} qui coûtent ${fmt(v.n2)} € chacun. Il donne ${fmt(cFrom(v))} €. Combien le marchand rend-il ?` },
  { type: "mul_rsub", t: (v) => `Au marché, les ${v.obj} coûtent ${fmt(v.n2)} € l'unité. ${v.hero} en achète ${fmt(v.n1)} et paie avec ${fmt(cFrom(v))} €. Combien lui rend-on ?` },
  { type: "mul_rsub", t: (v) => `${v.hero} achète ${fmt(v.n1)} ${v.obj} à ${fmt(v.n2)} €. Avec un billet de ${fmt(cFrom(v))} €, combien récupère-t-il ?` },
  { type: "mul_rsub", t: (v) => `${v.friend} vend ${fmt(v.n1)} ${v.obj} à ${fmt(v.n2)} € pièce à ${v.hero}, qui tend ${fmt(cFrom(v))} €. Combien ${v.friend} rend-il ?` },
  { type: "mul_rsub", t: (v) => `${v.hero} a ${fmt(cFrom(v))} €. Il achète ${fmt(v.n1)} ${v.obj} à ${fmt(v.n2)} € chacun. Combien lui reste-t-il ?` },
  // add_rsub : avec c €, on paie n1 € puis n2 € -> reste = c - (n1 + n2).
  { type: "add_rsub", t: (v) => `${v.hero} a ${fmt(cFrom(v))} €. Il achète ${v.item} à ${fmt(v.n1)} € et ${v.item2} à ${fmt(v.n2)} €. Combien lui reste-t-il ?` },
  { type: "add_rsub", t: (v) => `Avec ${fmt(cFrom(v))} €, ${v.hero} dépense ${fmt(v.n1)} € le matin et ${fmt(v.n2)} € l'après-midi. Combien lui reste-t-il ?` },
  { type: "add_rsub", t: (v) => `${v.hero} part faire des courses avec ${fmt(cFrom(v))} €. Il paie ${fmt(v.n1)} € puis ${fmt(v.n2)} €. Combien lui reste-t-il ?` },
  { type: "add_rsub", t: (v) => `${v.hero} a ${fmt(cFrom(v))} € dans sa tirelire. Il achète ${v.item} (${fmt(v.n1)} €) et ${v.item2} (${fmt(v.n2)} €). Combien reste-t-il ?` },
  { type: "add_rsub", t: (v) => `${v.hero} reçoit ${fmt(cFrom(v))} €, dépense ${fmt(v.n1)} € puis ${fmt(v.n2)} €. Combien lui reste-t-il ?` },
];

// `c` (seconde etape) est transporte dans v.res uniquement pour le rendu texte :
// on le lit via cFrom pour eviter d'afficher la reponse. On stocke le vrai `c`
// dans v via le champ dedie.
function cFrom(v: Vars): number {
  return (v as unknown as { _c: number })._c;
}

// MESURES : problemes de grandeurs (longueurs, masses, durees, monnaie). Les
// gabarits sont GRANDEUR-AGNOSTIQUES : l'unite est deja dans q1/q2/uu/conv. Un
// enonce peut demander une conversion avant de calculer (« deux etapes »
// pedagogiques), mais la normalisation reste UNE operation (l'operande converti
// est calcule cote client, le serveur recalcule op(a,b), comme tous les autres
// problemes).
const MESURES_BANK: Gabarit[] = [
  // conversion (val)
  { type: "conversion", t: (v) => `${v.hero} mesure ${v.q1}. Combien cela fait-il en ${v.uu} ? (${v.conv})` },
  { type: "conversion", t: (v) => `Convertis ${v.q1} en ${v.uu}. (${v.conv})` },
  { type: "conversion", t: (v) => `${v.q1}, c'est combien de ${v.uu} ? (${v.conv})` },
  { type: "conversion", t: (v) => `${v.hero} veut écrire ${v.q1} en ${v.uu}. Quel nombre doit-il écrire ? (${v.conv})` },
  // ajout (add, souvent apres conversion)
  { type: "ajout", t: (v) => `${v.hero} a ${v.q1} et ${v.q2}. Combien cela fait-il en tout, en ${v.uu} ? (${v.conv})` },
  { type: "ajout", t: (v) => `Un bout de ${v.q1} et un bout de ${v.q2} mis ensemble. Combien en ${v.uu} ? (${v.conv})` },
  { type: "ajout", t: (v) => `${v.hero} ajoute ${v.q2} à ${v.q1}. Combien en ${v.uu} ? (${v.conv})` },
  { type: "ajout", t: (v) => `Le matin ${v.q1}, l'après-midi ${v.q2}. Total en ${v.uu} ? (${v.conv})` },
  // retrait (sub, souvent apres conversion)
  { type: "retrait", t: (v) => `Il y a ${v.q1}. ${v.hero} enlève ${v.q2}. Combien reste-t-il, en ${v.uu} ? (${v.conv})` },
  { type: "retrait", t: (v) => `${v.hero} a ${v.q1} et en utilise ${v.q2}. Combien reste-t-il, en ${v.uu} ? (${v.conv})` },
  { type: "retrait", t: (v) => `D'un ruban de ${v.q1}, ${v.hero} coupe ${v.q2}. Combien reste-t-il, en ${v.uu} ? (${v.conv})` },
  { type: "retrait", t: (v) => `${v.q1} au départ, ${v.q2} en moins. Combien reste-t-il, en ${v.uu} ? (${v.conv})` },
  // produit (mul)
  { type: "produit", t: (v) => `${v.hero} achète ${v.q1} à ${v.q2} chacun. Combien en tout, en ${v.uu} ?` },
  { type: "produit", t: (v) => `${v.q1}, chacun de ${v.q2}. Combien en tout, en ${v.uu} ?` },
  { type: "produit", t: (v) => `${v.hero} prépare ${v.q1} de ${v.q2}. Combien en tout, en ${v.uu} ?` },
  { type: "produit", t: (v) => `Il y a ${v.q1}. Chaque part fait ${v.q2}. Combien en tout, en ${v.uu} ?` },
];

const BANK: Record<string, Gabarit[]> = {
  "MA.PB.ADD_SUB": ADD_SUB_BANK,
  "MA.PB.MULT_DIV": MULT_DIV_BANK,
  "MA.PB.MONNAIE": MONNAIE_BANK,
  "MA.PB.DEUX_ETAPES": DEUX_ETAPES_BANK,
  "MA.PB.MESURES": MESURES_BANK,
};

// Expose le nombre de gabarits par competence (test : >= 15).
export function templateCount(competence: string): number {
  return (BANK[competence] ?? []).length;
}
export { BANK as PROBLEME_BANK };

// --------------------------- Helpers de params ----------------------------
function numList(v: unknown, fb: number[]): number[] {
  return Array.isArray(v) && v.length > 0 ? (v as number[]) : fb;
}
function strList(v: unknown, fb: string[]): string[] {
  return Array.isArray(v) && v.length > 0 ? (v as string[]) : fb;
}

function renderGabarit(rng: Rng, competence: string, type: string, v: Vars): string {
  const all = BANK[competence] ?? [];
  const matching = all.filter((g) => g.type === type);
  const g = matching.length > 0 ? pick(rng, matching) : pick(rng, all);
  return g.t(v);
}

function baseVars(hero: string, friend: string, obj: string, grp: string): Vars {
  return {
    hero, friend, obj, grp,
    item: "", item2: "",
    n1: 0, n2: 0, res: 0,
    sum: "", price: "", paid: "", px: "", py: "",
    q1: "", q2: "", uu: "", conv: "",
  };
}

// =========================================================================
// Dispatch principal
// =========================================================================
export function buildProbleme(
  src: ExCalcul,
  rng: Rng,
  base: Base,
  ctx?: ProblemContext
): GeneratedExercise {
  const comp = src.competence;
  const p = (src.params || {}) as Record<string, unknown>;
  if (comp.endsWith("ADD_SUB")) return buildAddSub(comp, rng, base, ctx, p);
  if (comp.endsWith("MULT_DIV")) return buildMultDiv(comp, rng, base, ctx, p);
  if (comp.endsWith("MONNAIE")) return buildMonnaie(comp, rng, base, ctx, p);
  if (comp.endsWith("MESURES")) return buildMesuresProbleme(comp, rng, base, ctx, p);
  return buildDeuxEtapes(comp, rng, base, ctx, p);
}

// --------------------------- ADD_SUB --------------------------------------
function buildAddSub(
  comp: string, rng: Rng, base: Base, ctx: ProblemContext | undefined,
  p: Record<string, unknown>
): GeneratedExercise {
  const mag = Number(p.mag ?? 20);
  const types = strList(p.types, ["reunion", "ajout", "retrait"]);
  const type = pick(rng, types);
  const hero = heroOf(rng, ctx);
  const friend = otherThan(rng, hero);
  const obj = pick(rng, OBJ);
  const v = baseVars(hero, friend, obj, pick(rng, GRP));

  const lo = Math.max(2, Math.floor(mag * 0.2));
  let verif: Verif;
  let answer: number;
  let barres: BarModel;
  let correction: string;

  if (type === "reunion" || type === "ajout") {
    const a = intBetween(rng, lo, Math.max(lo + 1, Math.floor(mag * 0.6)));
    const b = intBetween(rng, 1, Math.max(1, Math.floor(mag * 0.5)));
    answer = a + b;
    verif = { op: "add", a, b };
    v.n1 = a; v.n2 = b;
    barres = toutParties(cell(answer, false), [cell(a, true), cell(b, true)]);
    correction = type === "ajout"
      ? `J'ajoute : ${fmt(a)} + ${fmt(b)} = ${fmt(answer)}.`
      : `Je réunis les deux quantités : ${fmt(a)} + ${fmt(b)} = ${fmt(answer)}.`;
  } else if (type === "retrait") {
    const a = intBetween(rng, Math.max(4, Math.floor(mag * 0.4)), mag);
    const b = intBetween(rng, 1, Math.max(1, a - 1));
    answer = a - b;
    verif = { op: "sub", a, b };
    v.n1 = a; v.n2 = b;
    barres = toutParties(cell(a, true), [cell(answer, false), cell(b, true)]);
    correction = `Je retire : ${fmt(a)} − ${fmt(b)} = ${fmt(answer)}.`;
  } else if (type === "de_plus") {
    const a = intBetween(rng, lo, mag);
    const b = intBetween(rng, 1, Math.max(1, Math.floor(mag * 0.5)));
    answer = a + b;
    verif = { op: "add", a, b };
    v.n1 = a; v.n2 = b;
    barres = comparaison(cell(answer, false), cell(a, true), cell(b, true));
    correction = `Quand il y a de plus, j'ajoute. ${fmt(a)} + ${fmt(b)} = ${fmt(answer)}.`;
  } else if (type === "de_moins") {
    const a = intBetween(rng, Math.max(4, Math.floor(mag * 0.4)), mag);
    const b = intBetween(rng, 1, Math.max(1, Math.min(a - 1, Math.floor(mag * 0.5))));
    answer = a - b;
    verif = { op: "sub", a, b };
    v.n1 = a; v.n2 = b;
    barres = comparaison(cell(a, true), cell(answer, false), cell(b, true));
    correction = `Quand il y a de moins, je retire. ${fmt(a)} − ${fmt(b)} = ${fmt(answer)}.`;
  } else if (type === "etat_recu") {
    // avant + recu = total ; on cherche avant = total - recu.
    const total = intBetween(rng, Math.max(6, Math.floor(mag * 0.5)), mag);
    const recu = intBetween(rng, 1, Math.max(1, total - 1));
    answer = total - recu;
    verif = { op: "sub", a: total, b: recu };
    v.n1 = total; v.n2 = recu;
    barres = toutParties(cell(total, true), [cell(answer, false), cell(recu, true)]);
    correction = `avant + ${fmt(recu)} = ${fmt(total)}, donc avant = ${fmt(total)} − ${fmt(recu)} = ${fmt(answer)}.`;
  } else {
    // etat_don : avant = reste + donne.
    const reste = intBetween(rng, 1, Math.max(2, Math.floor(mag * 0.6)));
    const donne = intBetween(rng, 1, Math.max(1, Math.floor(mag * 0.5)));
    answer = reste + donne;
    verif = { op: "add", a: reste, b: donne };
    v.n1 = reste; v.n2 = donne;
    barres = toutParties(cell(answer, false), [cell(reste, true), cell(donne, true)]);
    correction = `au début = reste + donné : ${fmt(reste)} + ${fmt(donne)} = ${fmt(answer)}.`;
  }

  return {
    ...base,
    prompt: renderGabarit(rng, comp, type, v),
    answer,
    verif,
    barres,
    correction,
  };
}

// --------------------------- MULT_DIV -------------------------------------
function buildMultDiv(
  comp: string, rng: Rng, base: Base, ctx: ProblemContext | undefined,
  p: Record<string, unknown>
): GeneratedExercise {
  const tables = numList(p.tables, [2, 3, 4, 5]);
  const qmax = Number(p.qmax ?? 10);
  const types = strList(p.types, ["groupement", "partage"]);
  const type = pick(rng, types);
  const hero = heroOf(rng, ctx);
  const friend = otherThan(rng, hero);
  const obj = pick(rng, OBJ);
  const grp = pick(rng, GRP);
  const v = baseVars(hero, friend, obj, grp);

  let verif: Verif;
  let answer: number;
  let barres: BarModel;
  let correction: string;

  if (type === "groupement") {
    const n = intBetween(rng, 2, qmax); // nombre de groupes
    const per = pick(rng, tables); // contenu d'un groupe (table connue)
    answer = n * per;
    verif = { op: "mul", a: n, b: per };
    v.n1 = n; v.n2 = per;
    barres = toutParties(
      cell(answer, false),
      Array.from({ length: Math.min(n, 10) }, () => cell(per, true))
    );
    correction = `${fmt(n)} groupes de ${fmt(per)}, c'est ${fmt(n)} × ${fmt(per)} = ${fmt(answer)}.`;
  } else if (type === "partage") {
    const divisor = pick(rng, tables);
    const quotient = intBetween(rng, 2, qmax);
    const total = divisor * quotient;
    answer = quotient;
    verif = { op: "div", a: total, b: divisor };
    v.n1 = total; v.n2 = divisor;
    barres = toutParties(
      cell(total, true),
      Array.from({ length: Math.min(divisor, 10) }, () => cell(quotient, false))
    );
    correction = `Je partage ${fmt(total)} en ${fmt(divisor)} parts égales : ${fmt(total)} ÷ ${fmt(divisor)} = ${fmt(quotient)}.`;
  } else {
    // fois_plus
    const a = intBetween(rng, 2, Math.min(10, qmax));
    const times = pick(rng, tables);
    answer = a * times;
    verif = { op: "mul", a, b: times };
    v.n1 = a; v.n2 = times;
    barres = toutParties(
      cell(answer, false),
      Array.from({ length: Math.min(times, 10) }, () => cell(a, true))
    );
    correction = `${fmt(times)} fois plus que ${fmt(a)} : ${fmt(a)} × ${fmt(times)} = ${fmt(answer)}.`;
  }

  return {
    ...base,
    prompt: renderGabarit(rng, comp, type, v),
    answer,
    verif,
    barres,
    correction,
  };
}

// --------------------------- MONNAIE --------------------------------------
// Billets/pieces proposes (centimes), du plus grand au plus petit.
const BILLS_EUR = [5000, 2000, 1000, 500]; // 50, 20, 10, 5 €
const COINS_EUR = [200, 100]; // 2, 1 €
const COINS_CENT = [50, 20, 10]; // 50, 20, 10 c

function buildMonnaie(
  comp: string, rng: Rng, base: Base, ctx: ProblemContext | undefined,
  p: Record<string, unknown>
): GeneratedExercise {
  const types = strList(p.types, ["composer"]);
  const cents = p.cents === true;
  const mag = Number(p.mag ?? 50); // ordre de grandeur en euros
  const type = pick(rng, types);
  const hero = heroOf(rng, ctx);
  const friend = otherThan(rng, hero);
  const v = baseVars(hero, friend, pick(rng, OBJ), pick(rng, GRP));
  v.item = pick(rng, ITEMS);
  v.item2 = pick(rng, ITEMS.filter((x) => x !== v.item));

  if (type === "composer") {
    let target: number; // centimes
    if (cents) {
      const e = intBetween(rng, 2, Math.max(3, mag));
      const c = pick(rng, [0, 10, 20, 50, 50, 10]); // multiples de 10 c
      target = e * 100 + c;
    } else {
      target = intBetween(rng, 3, Math.max(4, mag)) * 100;
    }
    const units = cents ? [...BILLS_EUR, ...COINS_EUR, ...COINS_CENT] : [...BILLS_EUR, ...COINS_EUR];
    const money: MoneyData = { target, cents, units };
    v.sum = euro(target);
    return {
      ...base,
      saisie: "monnaie",
      moneyData: money,
      prompt: renderGabarit(rng, comp, type, v),
      answer: target,
      verif: { op: "val", a: target, b: 0 },
      correction: `Il faut composer exactement ${euro(target)}. ${decomposeHint(target)}`,
    };
  }

  if (type === "rendre") {
    // Euros ENTIERS : la reponse se tape au pave numerique (pas de centimes).
    const price = intBetween(rng, 3, Math.max(5, mag - 1));
    const paid = roundPaid(price); // billet/piece arrondi au-dessus
    const rendu = paid - price;
    const barres = toutParties(cell(paid, true, `${fmt(paid)} €`), [
      cell(price, true, `${fmt(price)} €`),
      cell(rendu, false),
    ]);
    v.price = `${fmt(price)} €`;
    v.paid = `${fmt(paid)} €`;
    return {
      ...base,
      prompt: renderGabarit(rng, comp, type, v),
      answer: rendu,
      verif: { op: "sub", a: paid, b: price },
      barres,
      correction: `On paie ${fmt(paid)} € pour ${fmt(price)} €. On rend ${fmt(paid)} − ${fmt(price)} = ${fmt(rendu)} €.`,
    };
  }

  // comparer : deux prix en euros entiers, saisie compare.
  const x = intBetween(rng, 2, Math.max(4, mag));
  let y = intBetween(rng, 2, Math.max(4, mag));
  if (rng() < 0.2) y = x; // parfois egaux
  const answer = x < y ? 0 : x === y ? 1 : 2;
  const signe = answer === 0 ? "<" : answer === 1 ? "=" : ">";
  v.px = `${fmt(x)} €`;
  v.py = `${fmt(y)} €`;
  return {
    ...base,
    saisie: "compare",
    prompt: renderGabarit(rng, comp, type, v),
    answer,
    verif: { op: "cmp", a: x, b: y },
    correction: `${fmt(x)} € ${signe} ${fmt(y)} €.`,
  };
}

// Arrondit un prix a un montant « payable » juste au-dessus (billet rond).
function roundPaid(price: number): number {
  for (const b of [5, 10, 20, 50, 100]) {
    if (b > price) return b;
  }
  return Math.ceil(price / 100) * 100 + 100;
}
// Decomposition gloutonne pour la correction (aide a composer).
function decomposeHint(target: number): string {
  const units = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10];
  let rest = target;
  const parts: string[] = [];
  for (const u of units) {
    while (rest >= u) {
      parts.push(euro(u));
      rest -= u;
    }
  }
  return parts.length > 0 ? `Par exemple : ${parts.join(" + ")}.` : "";
}

// --------------------------- DEUX_ETAPES ----------------------------------
function buildDeuxEtapes(
  comp: string, rng: Rng, base: Base, ctx: ProblemContext | undefined,
  p: Record<string, unknown>
): GeneratedExercise {
  const tables = numList(p.tables, [2, 3, 4, 5]);
  const mag = Number(p.mag ?? 20);
  const types = strList(p.types, ["mul_add", "add_sub"]);
  const type = pick(rng, types);
  const hero = heroOf(rng, ctx);
  const friend = otherThan(rng, hero);
  const obj = pick(rng, OBJ);
  const grp = pick(rng, GRP);
  const v = baseVars(hero, friend, obj, grp);

  let verif: Verif;
  let answer: number;
  let r1: number;
  let barres: BarModel | undefined;
  let correction: string;
  let c: number;

  if (type === "mul_add" || type === "mul_sub") {
    const n = intBetween(rng, 2, Math.min(10, Number(p.qmax ?? 10)));
    const per = pick(rng, tables);
    r1 = n * per;
    const op2: VerifOp2 = type === "mul_add" ? "add" : "sub";
    c = op2 === "add"
      ? intBetween(rng, 1, Math.max(1, Math.floor(mag * 0.5)))
      : intBetween(rng, 1, Math.max(1, r1 - 1));
    answer = op2 === "add" ? r1 + c : r1 - c;
    verif = { op: "mul", a: n, b: per, op2, c };
    v.n1 = n; v.n2 = per;
    barres = toutParties(
      cell(r1, false, `${fmt(n)}×${fmt(per)}`),
      Array.from({ length: Math.min(n, 10) }, () => cell(per, true))
    );
    correction = `D'abord ${fmt(n)} × ${fmt(per)} = ${fmt(r1)}. Ensuite ${fmt(r1)} ${op2 === "add" ? "+" : "−"} ${fmt(c)} = ${fmt(answer)}.`;
  } else if (type === "mul_rsub") {
    // Rendu sur plusieurs articles : n articles a p € payes avec c € ->
    // rendu = c - n×p (euros entiers, rendu >= 0).
    const n = intBetween(rng, 2, Math.min(10, Number(p.qmax ?? 10)));
    const per = pick(rng, tables);
    r1 = n * per; // cout total
    c = roundPaid(r1); // montant paye : billet rond strictement > cout
    answer = c - r1;
    verif = { op: "mul", a: n, b: per, op2: "rsub", c };
    v.n1 = n; v.n2 = per;
    barres = toutParties(cell(c, true, `${fmt(c)} €`), [
      cell(r1, true, `${fmt(n)}×${fmt(per)}`),
      cell(answer, false),
    ]);
    correction = `D'abord le prix : ${fmt(n)} × ${fmt(per)} = ${fmt(r1)} €. On rend ${fmt(c)} − ${fmt(r1)} = ${fmt(answer)} €.`;
  } else if (type === "add_rsub") {
    // « Il reste combien » apres deux achats : avec c €, on depense a € puis
    // b € -> reste = c - (a + b) (euros entiers, reste >= 0).
    const hi = Math.max(4, Math.floor(mag / 2));
    const a = intBetween(rng, 2, hi);
    const b = intBetween(rng, 2, hi);
    r1 = a + b; // total depense
    c = roundPaid(r1); // argent disponible au depart
    answer = c - r1;
    verif = { op: "add", a, b, op2: "rsub", c };
    v.n1 = a; v.n2 = b;
    v.item = pick(rng, ITEMS);
    v.item2 = pick(rng, ITEMS.filter((x) => x !== v.item));
    barres = toutParties(cell(c, true, `${fmt(c)} €`), [
      cell(a, true, `${fmt(a)} €`),
      cell(b, true, `${fmt(b)} €`),
      cell(answer, false),
    ]);
    correction = `D'abord le total dépensé : ${fmt(a)} + ${fmt(b)} = ${fmt(r1)} €. Il reste ${fmt(c)} − ${fmt(r1)} = ${fmt(answer)} €.`;
  } else if (type === "add_div") {
    const divisor = pick(rng, tables);
    const quotient = intBetween(rng, 2, Number(p.qmax ?? 10));
    r1 = divisor * quotient; // total divisible
    // Scinde r1 en deux parts affichees a + b = r1.
    const a = intBetween(rng, 1, Math.max(1, r1 - 1));
    const b = r1 - a;
    c = divisor;
    answer = quotient;
    verif = { op: "add", a, b, op2: "div", c };
    v.n1 = a; v.n2 = b;
    barres = toutParties(cell(r1, false), [cell(a, true), cell(b, true)]);
    correction = `D'abord ${fmt(a)} + ${fmt(b)} = ${fmt(r1)}. Ensuite ${fmt(r1)} ÷ ${fmt(c)} = ${fmt(answer)}.`;
  } else {
    // add_sub : (a + b) - c
    const a = intBetween(rng, 2, mag);
    const b = intBetween(rng, 2, mag);
    r1 = a + b;
    c = intBetween(rng, 1, Math.max(1, r1 - 1));
    answer = r1 - c;
    verif = { op: "add", a, b, op2: "sub", c };
    v.n1 = a; v.n2 = b;
    barres = toutParties(cell(r1, false), [cell(a, true), cell(b, true)]);
    correction = `D'abord ${fmt(a)} + ${fmt(b)} = ${fmt(r1)}. Ensuite ${fmt(r1)} − ${fmt(c)} = ${fmt(answer)}.`;
  }

  // Le texte lit `c` via cFrom : on l'attache a v sans l'exposer comme reponse.
  (v as unknown as { _c: number })._c = c;

  return {
    ...base,
    prompt: renderGabarit(rng, comp, type, v),
    answer,
    verif,
    barres,
    correction,
  };
}

// =========================================================================
// MESURES : problemes de grandeurs (longueurs, masses, durees, monnaie).
// Une ou deux etapes PEDAGOGIQUES (convertir puis calculer), mais la
// normalisation reste UNE operation : l'operande converti est calcule cote
// client et le serveur recalcule op(a,b) (meme contrat que les autres
// problemes). Diagnostic deterministe par PIEGES (oubli de conversion, mauvaise
// unite, mauvaise operation) ; repli ERREUR_CALCUL. Le serveur reste seul juge.
// =========================================================================
type Grandeur = "longueur" | "masse" | "duree" | "monnaie";

interface Conversion {
  grand: string; // unite « grande » (m, kg, h, €)
  petit: string; // unite « petite » (cm, g, min, c)
  facteur: number; // 1 grand = facteur petit
  conv: string; // rappel affiche (« 1 m = 100 cm »)
  faux: number; // facteur FAUX frequent (piege « mauvaise unite »)
}
const CONVERSIONS: Record<Grandeur, Conversion[]> = {
  longueur: [
    { grand: "m", petit: "cm", facteur: 100, conv: "1 m = 100 cm", faux: 10 },
    { grand: "km", petit: "m", facteur: 1000, conv: "1 km = 1 000 m", faux: 100 },
  ],
  masse: [{ grand: "kg", petit: "g", facteur: 1000, conv: "1 kg = 1 000 g", faux: 100 }],
  duree: [{ grand: "h", petit: "min", facteur: 60, conv: "1 h = 60 min", faux: 100 }],
  monnaie: [{ grand: "€", petit: "c", facteur: 100, conv: "1 € = 100 c", faux: 10 }],
};
const PRODUIT_OBJ = ["paquets", "sachets", "boîtes", "rubans", "sacs", "bocaux"];
const PRODUIT_MONNAIE = ["pommes", "cahiers", "jouets", "gâteaux", "cartes"];

function qte(valeur: number, unite: string): string {
  return `${fmt(valeur)} ${unite}`;
}

interface MesureProb {
  structure: string;
  v: Vars;
  answer: number;
  verif: Verif;
  correction: string;
  pieges: { answer: number; type: string }[];
}

function genererMesure(rng: Rng, grandeur: Grandeur, structure: string, hero: string): MesureProb {
  const c = pick(rng, CONVERSIONS[grandeur]);
  const v = baseVars(hero, hero, "", "");
  v.conv = c.conv;

  if (structure === "produit") {
    // N objets de P (petites) unites : total = N x P (aucune conversion).
    const n = intBetween(rng, 2, 6);
    const per = intBetween(rng, 2, 9);
    const answer = n * per;
    const estMonnaie = grandeur === "monnaie";
    const unite = estMonnaie ? c.grand : c.petit;
    const obj = estMonnaie ? pick(rng, PRODUIT_MONNAIE) : pick(rng, PRODUIT_OBJ);
    v.q1 = `${fmt(n)} ${obj}`;
    v.q2 = qte(per, unite);
    v.uu = unite;
    v.conv = "";
    return {
      structure, v, answer,
      verif: { op: "mul", a: n, b: per },
      correction: `Je multiplie : ${fmt(n)} × ${fmt(per)} = ${fmt(answer)} ${unite}.`,
      pieges: [{ answer: n + per, type: "MAUVAISE_OP" }],
    };
  }

  if (structure === "conversion") {
    const n = intBetween(rng, 2, 9);
    const answer = n * c.facteur;
    v.q1 = qte(n, c.grand);
    v.uu = c.petit;
    return {
      structure, v, answer,
      verif: { op: "val", a: answer, b: 0 },
      correction: `${c.conv}, donc ${fmt(n)} ${c.grand} = ${fmt(n)} × ${fmt(c.facteur)} = ${fmt(answer)} ${c.petit}.`,
      pieges: [
        { answer: n, type: "OUBLI_CONVERSION" },
        { answer: n * c.faux, type: "MAUVAISE_UNITE" },
      ],
    };
  }

  // ajout / retrait : un grand (a convertir) + un petit, dans la petite unite.
  const g = intBetween(rng, structure === "retrait" ? 2 : 1, 5);
  const a = g * c.facteur;
  const b = intBetween(rng, 5, Math.max(6, c.facteur - 1));
  v.q1 = qte(g, c.grand);
  v.q2 = qte(b, c.petit);
  v.uu = c.petit;

  if (structure === "retrait") {
    const answer = a - b; // a = g x facteur >= facteur > b, donc > 0
    return {
      structure, v, answer,
      verif: { op: "sub", a, b },
      correction: `${c.conv}, donc ${fmt(g)} ${c.grand} = ${fmt(a)} ${c.petit}. Puis ${fmt(a)} − ${fmt(b)} = ${fmt(answer)} ${c.petit}.`,
      pieges: [{ answer: a + b, type: "MAUVAISE_OP" }],
    };
  }
  // ajout
  const answer = a + b;
  return {
    structure, v, answer,
    verif: { op: "add", a, b },
    correction: `${c.conv}, donc ${fmt(g)} ${c.grand} = ${fmt(a)} ${c.petit}. Puis ${fmt(a)} + ${fmt(b)} = ${fmt(answer)} ${c.petit}.`,
    pieges: [
      { answer: g + b, type: "OUBLI_CONVERSION" },
      { answer: a - b, type: "MAUVAISE_OP" },
    ],
  };
}

function buildMesuresProbleme(
  comp: string, rng: Rng, base: Base, ctx: ProblemContext | undefined,
  p: Record<string, unknown>
): GeneratedExercise {
  const grandeurs = strList(p.grandeurs, ["longueur", "masse"]) as Grandeur[];
  const structures = strList(p.structures, ["conversion"]);
  const grandeur = pick(rng, grandeurs);
  const structure = pick(rng, structures);
  const hero = heroOf(rng, ctx);
  const r = genererMesure(rng, grandeur, structure, hero);

  // Pieges valides : positifs, distincts de la bonne reponse.
  const pieges = r.pieges.filter((x) => x.answer >= 0 && x.answer !== r.answer);

  const qcm = p.saisie === "qcm";
  let options: QcmOption[] | undefined;
  if (qcm) {
    const vals = new Set<number>([r.answer]);
    const opts: QcmOption[] = [{ label: fmt(r.answer), value: r.answer }];
    for (const pg of pieges) {
      if (!vals.has(pg.answer)) { vals.add(pg.answer); opts.push({ label: fmt(pg.answer), value: pg.answer }); }
    }
    // Complete jusqu'a 3 options avec des valeurs plausibles distinctes.
    let pad = 1;
    while (opts.length < 3 && pad <= 50) {
      const cand = r.answer + (pad % 2 === 0 ? -pad : pad) * 10;
      if (cand >= 0 && !vals.has(cand)) { vals.add(cand); opts.push({ label: fmt(cand), value: cand }); }
      pad++;
    }
    options = shuffle(rng, opts);
  }

  return {
    ...base,
    prompt: renderGabarit(rng, comp, r.structure, r.v),
    answer: r.answer,
    verif: r.verif,
    saisie: qcm ? "qcm" : "clavier",
    options,
    diagPieges: pieges,
    diagFallback: "ERREUR_CALCUL",
    correction: r.correction,
  };
}
