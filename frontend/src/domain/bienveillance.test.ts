// Test BIENVEILLANCE (decision de Manu, regle absolue du projet).
//
// TOUS les contenus montres a l'enfant doivent etre OPTIMISTES et PLEINS DE
// BIENVEILLANCE : rien de dramatique ni de cruel (pas de mort, pas de violence,
// pas de peur forte, pas d'enfant malheureux / abandonne / puni / moque, pas de
// catastrophe). Les faits scientifiques necessaires restent possibles s'ils sont
// dits avec douceur (chaine alimentaire « le renard mange des souris pour se
// nourrir » ; cycle de vie : on prefere « la plante se fane » a « mourir », sauf
// quand le programme exige « mourir » comme caracteristique du vivant -- dit
// alors calmement, sans exemple triste).
//
// Ce test parcourt TOUTES les banques de contenu enfant (statiques + enonces
// GENERES de maths) et ECHOUE si un mot / une expression interdit(e) apparait
// dans un champ affiche a l'enfant (consigne, enonce, options, texte, attendu,
// explication, indice, message de correction, correction d'un exercice).
//
// LISTE BLANCHE (whitelist) EXPLICITE ET COMMENTEE -- les seuls cas pedagogiques
// ou un mot sensible est garde VOLONTAIREMENT :
//   * qm-viv-car-n4-a : « mourir / meurt » = derniere caracteristique du vivant
//     (naitre, grandir, se nourrir, se reproduire, mourir). Exige par le
//     programme, dit calmement (« la derniere etape de la vie »), sans exemple
//     triste, sans animal ni enfant.
//   * domaine EMC.* : « se moquer / moquerie » et « blesser (les sentiments) »
//     sont le SUJET MEME enseigne (refuser la moquerie, s'excuser quand on a
//     blesse un ami). Toujours avec une issue positive et le reflexe « en parler
//     a un adulte de confiance ». Les scenes ne sont jamais cruelles.
//   * l'indice de EMC.RESPECT.MOQUERIE (meme raison).
//
// Les mots « triste / malheureux / mechant / laid » NE SONT PAS dans la liste
// interdite : ce sont des mots de vocabulaire indispensables (antonymes,
// nommage des emotions) et la regle vise les SCENES, pas ces mots isoles. Leur
// usage reste surveille par la revue editoriale (audit bienveillance), pas par
// ce garde-fou automatique, afin d'eviter les faux positifs.

import { describe, it, expect } from "vitest";
import { BANQUE_COMPREHENSION } from "./francais/comprehension";
import { BANQUE_ECRITURE } from "./francais/ecriture";
import { BIBLIOTHEQUE } from "./francais/bibliotheque";
import { BANQUE_QM } from "./qm";
import { BANQUE_EMC } from "./emc";
import { BANQUE_SCIENCES } from "./sciences";
import { BANQUE_GRAMMAIRE } from "./francais/grammaire";
import { BANQUE_LEXIQUE } from "./francais/lexique";
import { BANQUE_DONNEES } from "./donnees/donnees";
import { BANQUE_GEOMETRIE } from "./geometrie/geometrie";
import { INDICES } from "./indices";
import { MESSAGES_CATALOGUE } from "./diagnostic/diagnostic";
import { generateExercise } from "./calcul/generator";
import { SEED_SOURCES } from "./calcul/seedSources";

// Minuscules + suppression des accents (compare sur une forme ASCII stable).
function deburr(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Mots interdits (testes sur la forme sans accent, avec frontieres de mot).
const FORBIDDEN: { token: string; re: RegExp }[] = [
  { token: "mort", re: /\b(mort|morte|morts|mortes)\b/ },
  { token: "mourir", re: /\b(mourir|mourra|mourrait|mourront|mourut|mourons|mourez|mourant|meurt|meurs|meurent)\b/ },
  { token: "tuer", re: /\b(tuer|tue|tues|tuee|tuees|tuent|tuait|tua|tuons|tuez)\b/ },
  { token: "deces", re: /\b(deces|decede|decedee|decedes)\b/ },
  { token: "devorer", re: /\b(devorer|devore|devores|devorent|devora|devorait|devoree)\b/ },
  { token: "sang", re: /\b(sang|saigne|saigner|saignement|saignant|ensanglante)\b/ },
  { token: "blesser", re: /\b(blesse|blesses|blessee|blessees|blesser|blessure|blessures|blessant|blessante)\b/ },
  { token: "battu", re: /\b(battu|battue|battus|battues)\b/ },
  { token: "abandon", re: /\b(abandon|abandonne|abandonner|abandonnee|abandonnes|abandonnees)\b/ },
  { token: "puni", re: /\b(puni|punie|punis|punies|punir|punition|punitions)\b/ },
  { token: "moquer", re: /\b(moque|moques|moquer|moquent|moquait|moquerie|moqueries|moqueur|moqueuse)\b/ },
  { token: "cruel", re: /\b(cruel|cruelle|cruels|cruelles|cruaute|atroce|atroces)\b/ },
  { token: "terreur", re: /\b(terrifie|terrifiee|terrifier|terrifiant|terrifiante|terreur|effroi|effrayant|effrayante|effrayer|epouvante|cauchemar|cauchemars)\b/ },
  { token: "noye", re: /\b(noye|noyee|noyes|noyer|noyade|noie)\b/ },
  { token: "catastrophe", re: /\b(catastrophe|catastrophes|catastrophique|catastrophiques)\b/ },
  { token: "arme", re: /\b(guerre|guerres|fusil|fusils|pistolet|pistolets|poignard|poignards|massacre|massacres|sanglant|sanglante)\b/ },
  { token: "cru", re: /\b(mange[a-z]* tout cru|tout crus?)\b/ },
  { token: "peur-forte", re: /\b(mortes? de peur|pleure[a-z]* de peur|folle? de peur|peur panique|terrorise[a-z]*)\b/ },
];

// Seuls cas pedagogiques ou un mot sensible est garde volontairement.
function estAutorise(competence: string, cle: string, token: string): boolean {
  if (cle === "qm-viv-car-n4-a" && (token === "mourir" || token === "mort")) return true;
  if (competence.startsWith("EMC.") && (token === "moquer" || token === "blesser")) return true;
  return false;
}

interface Violation { source: string; token: string; texte: string }

// Collecte recursive des chaines AFFICHEES a l'enfant. On ignore les cles
// techniques (identifiant, competence, format) : elles contiennent des codes en
// majuscules (ex. EMC.RESPECT.MOQUERIE) qui ne sont pas montres a l'enfant.
const SKIP_KEYS = new Set(["cle", "competence", "format"]);
function collectStrings(v: unknown, out: string[]): void {
  if (typeof v === "string") { out.push(v); return; }
  if (Array.isArray(v)) { for (const x of v) collectStrings(x, out); return; }
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (SKIP_KEYS.has(k)) continue;
      collectStrings(val, out);
    }
  }
}

function scan(source: string, competence: string, cle: string, textes: string[], acc: Violation[]): void {
  for (const t of textes) {
    const d = deburr(t);
    for (const f of FORBIDDEN) {
      if (f.re.test(d) && !estAutorise(competence, cle, f.token)) {
        acc.push({ source: `${source} [${cle || competence}]`, token: f.token, texte: t });
      }
    }
  }
}

type ItemLike = { cle?: string; competence?: string } & Record<string, unknown>;

function scanBanque(nom: string, banque: readonly unknown[], acc: Violation[]): void {
  for (const item of banque) {
    const it = item as ItemLike;
    const strs: string[] = [];
    collectStrings(it, strs);
    scan(nom, it.competence ?? "", it.cle ?? "", strs, acc);
  }
}

describe("bienveillance : aucun contenu enfant ne contient de mot interdit", () => {
  it("banques statiques (lecture, QM, EMC, grammaire, vocabulaire, donnees, geometrie)", () => {
    const acc: Violation[] = [];
    scanBanque("comprehension", BANQUE_COMPREHENSION, acc);
    scanBanque("ecriture", BANQUE_ECRITURE, acc);
    scanBanque("bibliotheque", BIBLIOTHEQUE, acc);
    scanBanque("qm", BANQUE_QM, acc);
    scanBanque("emc", BANQUE_EMC, acc);
    scanBanque("sciences", BANQUE_SCIENCES, acc);
    scanBanque("grammaire", BANQUE_GRAMMAIRE, acc);
    scanBanque("lexique", BANQUE_LEXIQUE, acc);
    scanBanque("donnees", BANQUE_DONNEES, acc);
    scanBanque("geometrie", BANQUE_GEOMETRIE, acc);
    expect(acc, JSON.stringify(acc, null, 2)).toEqual([]);
  });

  it("indices (bouton « Indice »)", () => {
    const acc: Violation[] = [];
    for (const [competence, texte] of Object.entries(INDICES)) {
      scan("indice", competence, competence, [texte], acc);
    }
    expect(acc, JSON.stringify(acc, null, 2)).toEqual([]);
  });

  it("messages de correction (ecriture des nombres en lettres)", () => {
    const acc: Violation[] = [];
    for (const [cle, texte] of Object.entries(MESSAGES_CATALOGUE)) {
      scan("message", "", cle, [texte], acc);
    }
    expect(acc, JSON.stringify(acc, null, 2)).toEqual([]);
  });

  it("enonces et corrections de maths GENERES (problemes, monnaie, mesures, calcul)", () => {
    const acc: Violation[] = [];
    for (const src of SEED_SOURCES) {
      for (let seed = 1; seed <= 25; seed++) {
        const g = generateExercise(src, seed * 7919 + src.niveau);
        const strs: string[] = [g.prompt, g.correction];
        if (g.optionsTexte) strs.push(...g.optionsTexte);
        scan("maths-genere", src.competence, src.competence, strs, acc);
      }
    }
    expect(acc, JSON.stringify(acc, null, 2)).toEqual([]);
  });
});
