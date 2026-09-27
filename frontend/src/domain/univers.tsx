import type { UniversId } from "../lib/types";

// Definition des 6 univers : libelle, monnaie (nom + icone SVG originale),
// couleur d'ambiance, degrade de fond et petite vignette SVG. Aucun personnage
// sous licence, aucune ressource externe. Neutre en genre.

export interface UniversDef {
  id: UniversId;
  label: string;
  monnaie: string;
  couleur: string; // couleur d'accent de l'univers (fond du compteur, etc.)
  fond: string; // degrade CSS du village
  MonnaieIcon: (p: { size?: number }) => JSX.Element;
  Vignette: (p: { size?: number }) => JSX.Element;
}

function Seed({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3c4 3 5 8 2 12s-8 4-9 1 1-9 7-13z" fill="#7CB342" />
      <path d="M12 6c-2 3-3 7-1 10" stroke="#33691E" strokeWidth="1.4" fill="none" />
    </svg>
  );
}
function Coin({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#FFC107" stroke="#B8860B" strokeWidth="1.5" />
      <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="#8A6100">$</text>
    </svg>
  );
}
function Crystal({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l6 7-6 13-6-13z" fill="#7E57C2" />
      <path d="M6 9h12M12 2v20" stroke="#EDE7F6" strokeWidth="1" fill="none" />
    </svg>
  );
}
function Star({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" fill="#FFD54F" stroke="#F9A825" strokeWidth="0.8" />
    </svg>
  );
}
function DinoEgg({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="13" rx="7" ry="9" fill="#80CBC4" />
      <path d="M6 12l3 2 3-3 3 3 3-2" stroke="#00695C" strokeWidth="1.4" fill="none" />
    </svg>
  );
}
function Candy({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="6" fill="#F06292" />
      <path d="M6 12L1 9v6zM18 12l5-3v6z" fill="#EC407A" />
      <path d="M9 12h6" stroke="#FCE4EC" strokeWidth="1.5" />
    </svg>
  );
}

function makeVignette(bg: string, emojiPath: JSX.Element) {
  return function Vignette({ size = 64 }: { size?: number }) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="12" fill={bg} />
        {emojiPath}
      </svg>
    );
  };
}

export const UNIVERS: Record<UniversId, UniversDef> = {
  village_breton: {
    id: "village_breton",
    label: "Village breton",
    monnaie: "graines",
    couleur: "#2F855A",
    fond: "linear-gradient(160deg, #B7E4C7 0%, #8FD3A6 45%, #5DAE7E 100%)",
    MonnaieIcon: Seed,
    Vignette: makeVignette("#5DAE7E", (
      <g>
        <path d="M14 44h36v8H14z" fill="#8D6E63" />
        <path d="M18 44l14-16 14 16z" fill="#C62828" />
        <rect x="28" y="36" width="8" height="8" fill="#FFF3E0" />
      </g>
    )),
  },
  ile_tropicale: {
    id: "ile_tropicale",
    label: "Île tropicale",
    monnaie: "pièces d’or",
    couleur: "#00838F",
    fond: "linear-gradient(160deg, #B3E5FC 0%, #4FC3F7 55%, #FFE082 100%)",
    MonnaieIcon: Coin,
    Vignette: makeVignette("#4FC3F7", (
      <g>
        <rect x="12" y="46" width="40" height="8" fill="#FFE082" />
        <path d="M32 46V26" stroke="#6D4C41" strokeWidth="3" />
        <path d="M32 26c-8-6-16-2-18 2 8-2 12 2 18 2zM32 26c8-6 16-2 18 2-8-2-12 2-18 2z" fill="#2E7D32" />
      </g>
    )),
  },
  base_spatiale: {
    id: "base_spatiale",
    label: "Base spatiale",
    monnaie: "cristaux",
    couleur: "#5E35B1",
    fond: "linear-gradient(160deg, #311B92 0%, #4527A0 50%, #1A237E 100%)",
    MonnaieIcon: Crystal,
    Vignette: makeVignette("#311B92", (
      <g>
        <circle cx="32" cy="30" r="12" fill="#9575CD" />
        <ellipse cx="32" cy="30" rx="18" ry="5" fill="none" stroke="#B39DDB" strokeWidth="2" />
        <circle cx="20" cy="16" r="2" fill="#FFF" />
        <circle cx="46" cy="20" r="1.5" fill="#FFF" />
      </g>
    )),
  },
  royaume_enchante: {
    id: "royaume_enchante",
    label: "Royaume enchanté",
    monnaie: "étoiles",
    couleur: "#AD1457",
    fond: "linear-gradient(160deg, #F8BBD0 0%, #CE93D8 55%, #B39DDB 100%)",
    MonnaieIcon: Star,
    Vignette: makeVignette("#CE93D8", (
      <g>
        <rect x="24" y="30" width="16" height="24" fill="#EDE7F6" />
        <path d="M24 30l8-12 8 12z" fill="#7E57C2" />
        <rect x="20" y="24" width="6" height="30" fill="#D1C4E9" />
        <rect x="38" y="24" width="6" height="30" fill="#D1C4E9" />
        <path d="M20 24l3-6 3 6zM38 24l3-6 3 6z" fill="#5E35B1" />
      </g>
    )),
  },
  vallee_dinosaures: {
    id: "vallee_dinosaures",
    label: "Vallée des dinosaures",
    monnaie: "œufs de dino",
    couleur: "#2E7D32",
    fond: "linear-gradient(160deg, #DCEDC8 0%, #AED581 50%, #C5E1A5 100%)",
    MonnaieIcon: DinoEgg,
    Vignette: makeVignette("#AED581", (
      <g>
        <path d="M14 50c0-10 6-16 14-16 4 0 6-6 12-6 8 0 10 8 10 14v8z" fill="#66BB6A" />
        <circle cx="42" cy="40" r="2" fill="#1B5E20" />
        <path d="M14 50l6-4 6 4 6-4 6 4 6-4 6 4" stroke="#33691E" strokeWidth="1.5" fill="none" />
      </g>
    )),
  },
  village_gourmand: {
    id: "village_gourmand",
    label: "Village gourmand",
    monnaie: "bonbons",
    couleur: "#C2185B",
    fond: "linear-gradient(160deg, #FFE0B2 0%, #FFCC80 50%, #F8BBD0 100%)",
    MonnaieIcon: Candy,
    Vignette: makeVignette("#FFCC80", (
      <g>
        <rect x="18" y="34" width="28" height="20" rx="4" fill="#8D6E63" />
        <path d="M18 34c0-6 6-10 14-10s14 4 14 10z" fill="#F48FB1" />
        <circle cx="26" cy="30" r="2" fill="#fff" />
        <circle cx="38" cy="30" r="2" fill="#fff" />
      </g>
    )),
  },
};

export const UNIVERS_LIST: UniversDef[] = [
  UNIVERS.village_breton,
  UNIVERS.ile_tropicale,
  UNIVERS.base_spatiale,
  UNIVERS.royaume_enchante,
  UNIVERS.vallee_dinosaures,
  UNIVERS.village_gourmand,
];

export function universDef(id: UniversId | string): UniversDef {
  return UNIVERS[(id as UniversId)] ?? UNIVERS.village_breton;
}
