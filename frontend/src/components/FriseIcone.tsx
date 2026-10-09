// Petites images des cartes de frise : schemas SVG FAITS MAISON (aucune image
// protegee, aucune licence externe). Chaque icone est dessinee avec des
// primitives simples et les variables de theme var(--kk-*) (clair/sombre).
import type { FriseIconeType } from "../domain/histoire/parcours";

const S = "var(--kk-text)";
const A = "var(--kk-accent)";

function paths(type: FriseIconeType) {
  switch (type) {
    case "village":
      return (
        <>
          <path d="M8 30 V18 l6 -5 l6 5 V30 Z" fill="none" stroke={S} strokeWidth={2} />
          <path d="M22 30 V20 l5 -4 l5 4 V30 Z" fill="none" stroke={S} strokeWidth={2} />
          <line x1="4" y1="30" x2="34" y2="30" stroke={S} strokeWidth={2} />
        </>
      );
    case "cathedrale":
      return (
        <>
          <rect x="11" y="16" width="16" height="16" fill="none" stroke={S} strokeWidth={2} />
          <path d="M11 16 L19 7 L27 16" fill="none" stroke={S} strokeWidth={2} />
          <line x1="19" y1="7" x2="19" y2="2" stroke={S} strokeWidth={2} />
          <line x1="15" y1="4" x2="23" y2="4" stroke={S} strokeWidth={2} />
        </>
      );
    case "chateau":
      return (
        <>
          <rect x="9" y="16" width="20" height="16" fill="none" stroke={S} strokeWidth={2} />
          <rect x="9" y="12" width="4" height="4" fill="none" stroke={S} strokeWidth={2} />
          <rect x="17" y="12" width="4" height="4" fill="none" stroke={S} strokeWidth={2} />
          <rect x="25" y="12" width="4" height="4" fill="none" stroke={S} strokeWidth={2} />
        </>
      );
    case "couronne":
      return (
        <path d="M8 28 L8 14 L15 20 L19 12 L23 20 L30 14 L30 28 Z" fill="none" stroke={S} strokeWidth={2} />
      );
    case "soleil":
      return (
        <>
          <circle cx="19" cy="19" r="7" fill="none" stroke={A} strokeWidth={2} />
          <line x1="19" y1="4" x2="19" y2="9" stroke={A} strokeWidth={2} />
          <line x1="19" y1="29" x2="19" y2="34" stroke={A} strokeWidth={2} />
          <line x1="4" y1="19" x2="9" y2="19" stroke={A} strokeWidth={2} />
          <line x1="29" y1="19" x2="34" y2="19" stroke={A} strokeWidth={2} />
        </>
      );
    case "caravelle":
      return (
        <>
          <path d="M6 28 h26 l-4 5 h-18 Z" fill="none" stroke={S} strokeWidth={2} />
          <line x1="19" y1="6" x2="19" y2="28" stroke={S} strokeWidth={2} />
          <path d="M19 8 l9 4 l-9 4 Z" fill="none" stroke={S} strokeWidth={2} />
        </>
      );
    case "planisphere":
      return (
        <>
          <circle cx="19" cy="19" r="13" fill="none" stroke={S} strokeWidth={2} />
          <ellipse cx="19" cy="19" rx="5" ry="13" fill="none" stroke={S} strokeWidth={1.5} />
          <line x1="6" y1="19" x2="32" y2="19" stroke={S} strokeWidth={1.5} />
        </>
      );
    case "chaines":
      return (
        <>
          <circle cx="12" cy="19" r="5" fill="none" stroke={S} strokeWidth={2} />
          <circle cx="24" cy="19" r="5" fill="none" stroke={S} strokeWidth={2} />
          <line x1="17" y1="19" x2="19" y2="19" stroke={S} strokeWidth={2} />
        </>
      );
    case "bastille":
      return (
        <>
          <rect x="12" y="12" width="14" height="20" fill="none" stroke={S} strokeWidth={2} />
          <rect x="12" y="8" width="4" height="4" fill="none" stroke={S} strokeWidth={2} />
          <rect x="22" y="8" width="4" height="4" fill="none" stroke={S} strokeWidth={2} />
        </>
      );
    case "declaration":
      return (
        <>
          <rect x="11" y="6" width="16" height="26" rx="2" fill="none" stroke={S} strokeWidth={2} />
          <line x1="15" y1="13" x2="23" y2="13" stroke={S} strokeWidth={1.5} />
          <line x1="15" y1="18" x2="23" y2="18" stroke={S} strokeWidth={1.5} />
          <line x1="15" y1="23" x2="20" y2="23" stroke={S} strokeWidth={1.5} />
        </>
      );
  }
}

export function FriseIcone({ type, size = 36 }: { type: FriseIconeType; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" role="img" aria-hidden="true" focusable="false">
      {paths(type)}
    </svg>
  );
}
