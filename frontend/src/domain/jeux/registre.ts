// Registre de la « Maison des jeux » : liste des jeux (un seul pour l'instant,
// prevu pour en accueillir d'autres) + chargement des grilles de « Relie les
// fruits » par palier.

import type { GrilleRelie } from "./relie";
import { PALIERS } from "./difficulte";
import p1 from "./grilles/relie-p1.json";
import p2 from "./grilles/relie-p2.json";
import p3 from "./grilles/relie-p3.json";
import p4 from "./grilles/relie-p4.json";
import p5 from "./grilles/relie-p5.json";

const GRILLES_PAR_PALIER: Record<number, GrilleRelie[]> = {
  1: p1 as unknown as GrilleRelie[],
  2: p2 as unknown as GrilleRelie[],
  3: p3 as unknown as GrilleRelie[],
  4: p4 as unknown as GrilleRelie[],
  5: p5 as unknown as GrilleRelie[],
};

export function grillesDuPalier(palier: number): GrilleRelie[] {
  return GRILLES_PAR_PALIER[palier] ?? [];
}

export function nbGrillesParPalier(): Record<number, number> {
  const out: Record<number, number> = {};
  for (const def of PALIERS) out[def.palier] = grillesDuPalier(def.palier).length;
  return out;
}

export function grilleParId(id: string): GrilleRelie | null {
  for (const def of PALIERS) {
    const g = grillesDuPalier(def.palier).find((x) => x.id === id);
    if (g) return g;
  }
  return null;
}

// ------------------------------- Catalogue fruits --------------------------
// Chaque paire se distingue par son EMOJI de fruit (repere principal) et, en
// appoint, par une teinte DOUCE harmonisee avec la palette du site (tons chauds
// / terreux, saturation moderee : jamais un aplat neon). La couleur n'est qu'un
// renfort : on ne compte jamais sur elle seule (accessibilite daltonisme).
export interface FruitDef {
  id: string; // cle stockee dans les grilles JSON
  image: string; // cle dans domain/images.ts (IMAGES)
  label: string; // nom lisible (consignes, aria)
  couleur: string; // teinte du tuyau (appoint)
}

export const FRUITS: Record<string, FruitDef> = {
  // Teintes CHOISIES pour etre nettement distinctes deux a deux (le trio
  // banane/citron/orange etait trop proche : ocre/olive/brun). On couvre des
  // familles de teintes differentes (rouge, orange, jaune dore, vert-jaune,
  // vert, rose, pourpre, lie-de-vin) tout en restant dans une palette douce et
  // chaleureuse. La couleur reste un APPOINT : le fruit (emoji) est le repere.
  pomme: { id: "pomme", image: "pomme", label: "pomme", couleur: "#C0514B" },
  banane: { id: "banane", image: "banane", label: "banane", couleur: "#D9A410" },
  fraise: { id: "fraise", image: "fraise", label: "fraise", couleur: "#CE6A86" },
  cerise: { id: "cerise", image: "cerise", label: "cerise", couleur: "#9A3B4E" },
  raisin: { id: "raisin", image: "raisin", label: "raisin", couleur: "#7E5AA2" },
  citron: { id: "citron", image: "citron", label: "citron", couleur: "#8FA81F" },
  "orange-fruit": { id: "orange-fruit", image: "orangeFruit", label: "orange", couleur: "#DC6B22" },
  pasteque: { id: "pasteque", image: "pasteque", label: "pastèque", couleur: "#4E8D6A" },
  // Fruits supplementaires (paliers 4/5, jusqu'a 12 paires). Teintes choisies
  // distinctes des 8 precedentes : ambre, bleu, vert clair, rose peche.
  ananas: { id: "ananas", image: "ananas", label: "ananas", couleur: "#C9971B" },
  myrtille: { id: "myrtille", image: "myrtille", label: "myrtille", couleur: "#4C6FB1" },
  "pomme-verte": { id: "pomme-verte", image: "pommeVerte", label: "pomme verte", couleur: "#6FA23B" },
  peche: { id: "peche", image: "peche", label: "pêche", couleur: "#E08A6E" },
};

export function fruitDef(id: string): FruitDef {
  return FRUITS[id] ?? FRUITS.pomme;
}

// ------------------------------- Jeux --------------------------------------
export type JeuId = "relie-les-fruits" | "les-briques";

// Type de jeu : « grille » (Relie les fruits, difficulte adaptative par palier
// 1..5) ou « arcade » (Les briques, partie chronometree a 3 min / blocage). Le
// type decide du branchement dans la Maison des jeux.
export type JeuType = "grille" | "arcade";

export interface JeuDef {
  id: JeuId;
  type: JeuType;
  titre: string;
  description: string;
  emoji: string; // petite vignette (emoji systeme, decoratif)
}

export const JEUX: JeuDef[] = [
  {
    id: "relie-les-fruits",
    type: "grille",
    titre: "Relie les fruits",
    description: "Relie les fruits pareils et remplis toutes les cases.",
    emoji: "🍓",
  },
  {
    id: "les-briques",
    type: "arcade",
    titre: "Les briques",
    description: "Empile les briques qui tombent et complète des lignes.",
    emoji: "🧱",
  },
];
