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
  pomme: { id: "pomme", image: "pomme", label: "pomme", couleur: "#C0514B" },
  banane: { id: "banane", image: "banane", label: "banane", couleur: "#B98A1E" },
  fraise: { id: "fraise", image: "fraise", label: "fraise", couleur: "#CE6A86" },
  cerise: { id: "cerise", image: "cerise", label: "cerise", couleur: "#9A3B4E" },
  raisin: { id: "raisin", image: "raisin", label: "raisin", couleur: "#7E5AA2" },
  citron: { id: "citron", image: "citron", label: "citron", couleur: "#9A8B22" },
  "orange-fruit": { id: "orange-fruit", image: "orangeFruit", label: "orange", couleur: "#CC7A33" },
  pasteque: { id: "pasteque", image: "pasteque", label: "pastèque", couleur: "#4E8D6A" },
};

export function fruitDef(id: string): FruitDef {
  return FRUITS[id] ?? FRUITS.pomme;
}

// ------------------------------- Jeux --------------------------------------
export type JeuId = "relie-les-fruits";

export interface JeuDef {
  id: JeuId;
  titre: string;
  description: string;
  emoji: string; // petite vignette (emoji systeme, decoratif)
}

export const JEUX: JeuDef[] = [
  {
    id: "relie-les-fruits",
    titre: "Relie les fruits",
    description: "Relie les fruits pareils et remplis toutes les cases.",
    emoji: "🍓",
  },
];
