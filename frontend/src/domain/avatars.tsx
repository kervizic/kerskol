// Rendu d'avatar UNIFIE :
//   - nouveaux avatars DiceBear  -> <img> data-URI (genere localement, CSP-OK)
//   - anciens avatars SVG maison  -> rendu inchange (retrocompatibilite : le
//     profil d'Iris continue de s'afficher tant qu'il n'en choisit pas un neuf)
import { useMemo } from "react";
import {
  AVATAR_COLORS,
  isDicebearAvatar,
  isLegacyAvatar,
  renderDicebearDataUri,
  type AnyAvatar,
  type DicebearAvatar,
  type LegacyAvatar,
} from "./avatarConfig";

// Reexport pour ne pas casser les imports existants (childColors, ecrans).
export { AVATAR_COLORS };

// ---- Avatars SVG maison (legacy, conserves pour la retrocompatibilite) ------

export interface AvatarShape {
  id: string;
  label: string;
  render: (couleur: string) => JSX.Element;
}

// Chaque render dessine dans un viewBox 0 0 64 64.
export const AVATAR_SHAPES: AvatarShape[] = [
  {
    id: "goeland",
    label: "Goéland",
    render: (c) => (
      <g>
        <circle cx="32" cy="34" r="18" fill={c} />
        <circle cx="26" cy="30" r="3.5" fill="#fff" />
        <circle cx="38" cy="30" r="3.5" fill="#fff" />
        <circle cx="26" cy="30" r="1.6" fill="#222" />
        <circle cx="38" cy="30" r="1.6" fill="#222" />
        <path d="M28 40q4 4 8 0" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M30 38l4 0 -2 4z" fill="#F6AD55" />
      </g>
    ),
  },
  {
    id: "herisson",
    label: "Hérisson",
    render: (c) => (
      <g>
        <path d="M14 44c0-14 8-22 18-22s18 8 18 22z" fill={c} />
        <path d="M18 30l-4-6M26 24l-2-8M34 22v-8M42 24l2-8M48 30l4-6" stroke={c} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="40" cy="40" rx="10" ry="8" fill="#F6E0C8" />
        <circle cx="42" cy="38" r="1.8" fill="#222" />
        <circle cx="48" cy="40" r="1.6" fill="#222" />
      </g>
    ),
  },
  {
    id: "etoile",
    label: "Étoile rieuse",
    render: (c) => (
      <g>
        <path d="M32 8l6.2 13.4 14.6 1.5-10.9 9.8 3 14.4L32 34.9 19.1 42.5l3-14.4L11.2 22.9l14.6-1.5z" fill={c} />
        <circle cx="27" cy="26" r="2" fill="#222" />
        <circle cx="37" cy="26" r="2" fill="#222" />
        <path d="M28 31q4 3 8 0" stroke="#222" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: "nuage",
    label: "Nuage",
    render: (c) => (
      <g>
        <path d="M18 42a10 10 0 0 1 2-19 12 12 0 0 1 23-2 9 9 0 0 1 3 21z" fill={c} />
        <circle cx="26" cy="34" r="2.2" fill="#fff" />
        <circle cx="38" cy="34" r="2.2" fill="#fff" />
        <path d="M28 39q4 3 8 0" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: "robot",
    label: "Petit robot",
    render: (c) => (
      <g>
        <rect x="18" y="22" width="28" height="24" rx="6" fill={c} />
        <rect x="24" y="28" width="7" height="7" rx="2" fill="#fff" />
        <rect x="33" y="28" width="7" height="7" rx="2" fill="#fff" />
        <rect x="26" y="39" width="12" height="3" rx="1.5" fill="#fff" />
        <path d="M32 22v-6" stroke={c} strokeWidth="3" />
        <circle cx="32" cy="14" r="3" fill={c} />
      </g>
    ),
  },
  {
    id: "chaton",
    label: "Chaton",
    render: (c) => (
      <g>
        <path d="M18 24l6 8M46 24l-6 8" stroke={c} strokeWidth="6" strokeLinecap="round" />
        <circle cx="32" cy="36" r="16" fill={c} />
        <circle cx="26" cy="34" r="2.2" fill="#222" />
        <circle cx="38" cy="34" r="2.2" fill="#222" />
        <path d="M30 40h4l-2 2z" fill="#fff" />
        <path d="M22 38l-6 2M42 38l6 2" stroke="#fff" strokeWidth="1.4" />
      </g>
    ),
  },
];

export function avatarShape(id: string | undefined): AvatarShape {
  return AVATAR_SHAPES.find((a) => a.id === id) ?? AVATAR_SHAPES[0];
}

function DicebearImg({ avatar, size }: { avatar: DicebearAvatar; size: number }) {
  const uri = useMemo(
    () => renderDicebearDataUri(avatar.style, avatar.options, size),
    [avatar.style, JSON.stringify(avatar.options), size]
  );
  return (
    <img src={uri} width={size} height={size} alt="" role="img" aria-label="Avatar" style={{ display: "block", borderRadius: "16%" }} />
  );
}

function LegacySvg({ forme, couleur, size }: { forme: string | undefined; couleur: string; size: number }) {
  const shape = avatarShape(forme);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={shape.label}>
      {shape.render(couleur)}
    </svg>
  );
}

// Point d'entree unique. Accepte l'objet avatar (nouveau ou ancien) ; retombe
// sur une forme maison par defaut si l'avatar est vide.
export function AvatarView({ avatar, size = 64 }: { avatar: AnyAvatar | undefined; size?: number }) {
  if (isDicebearAvatar(avatar)) {
    return <DicebearImg avatar={avatar} size={size} />;
  }
  const forme = isLegacyAvatar(avatar) ? avatar.forme : undefined;
  const couleur = (avatar as LegacyAvatar | undefined)?.couleur || "#E06A00";
  return <LegacySvg forme={forme} couleur={couleur} size={size} />;
}
