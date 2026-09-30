// Avatars DiceBear (generation LOCALE, aucun appel reseau, compatible CSP).
// Trois styles seulement (taille du bundle) : Adventurer, Fun Emoji, Pixel Art.
// Ce module est PUR (aucun JSX) pour rester testable en environnement node.
//
// Stockage profils.avatar jsonb :
//   nouveau  : { style, options, couleur }
//   ancien   : { forme, couleur }  (avatar SVG maison, conserve tel quel)
import { createAvatar, type StyleOptions } from "@dicebear/core";
import { adventurer, funEmoji, pixelArt } from "@dicebear/collection";

// Les 8 couleurs d'enfant (accent). Deplace ici depuis avatars.tsx ; reexporte
// par avatars.tsx pour ne pas casser les imports existants (childColors, ...).
export const AVATAR_COLORS = [
  "#E06A00",
  "#2F855A",
  "#3182CE",
  "#805AD5",
  "#D53F8C",
  "#00838F",
  "#B7791F",
  "#5A67D8",
];

// Ordre IMPOSE : Adventurer, Fun Emoji, Pixel Art.
export const DICEBEAR_STYLES = [
  { key: "adventurer", label: "Aventurier", style: adventurer },
  { key: "funEmoji", label: "Émoji rigolo", style: funEmoji },
  { key: "pixelArt", label: "Pixel", style: pixelArt },
] as const;

export type StyleKey = (typeof DICEBEAR_STYLES)[number]["key"];
export const STYLE_KEYS: StyleKey[] = DICEBEAR_STYLES.map((s) => s.key);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STYLE_MAP: Record<string, any> = Object.fromEntries(
  DICEBEAR_STYLES.map((s) => [s.key, s.style])
);

const SEED = "kerskol"; // options epinglees -> le seed ne change que le repli.

export type AvatarOptions = Record<string, string[] | number>;

export interface DicebearAvatar {
  style: StyleKey;
  options: AvatarOptions;
  couleur: string;
}
export interface LegacyAvatar {
  forme: string;
  couleur: string;
}
export type AnyAvatar = DicebearAvatar | LegacyAvatar | Record<string, never>;

export function isDicebearAvatar(a: unknown): a is DicebearAvatar {
  return (
    !!a &&
    typeof a === "object" &&
    typeof (a as { style?: unknown }).style === "string" &&
    STYLE_KEYS.includes((a as DicebearAvatar).style)
  );
}
// Couleur d'accent de l'enfant, presente sur les deux formats d'avatar.
export function avatarColor(a: unknown): string {
  const c = (a as { couleur?: unknown } | null | undefined)?.couleur;
  return typeof c === "string" && c ? c : AVATAR_COLORS[0];
}

export function isLegacyAvatar(a: unknown): a is LegacyAvatar {
  return (
    !!a &&
    typeof a === "object" &&
    !isDicebearAvatar(a) &&
    typeof (a as { forme?: unknown }).forme === "string"
  );
}

// ---- Rendu ------------------------------------------------------------------

// Ne garde que les options connues du style (defense contre des donnees
// corrompues : DiceBear valide le schema et leverait sinon).
function sanitize(styleKey: string, options: AvatarOptions): AvatarOptions {
  const st = STYLE_MAP[styleKey] ?? adventurer;
  const props: Record<string, unknown> = st.schema?.properties ?? {};
  const out: AvatarOptions = {};
  for (const [k, v] of Object.entries(options || {})) {
    if (k in props) out[k] = v;
  }
  return out;
}

export function renderDicebearSvg(
  styleKey: string,
  options: AvatarOptions,
  size = 96
): string {
  const st = STYLE_MAP[styleKey] ?? adventurer;
  const opts = {
    seed: SEED,
    size,
    ...sanitize(styleKey, options),
  } as unknown as StyleOptions<Record<string, unknown>>;
  return createAvatar(st, opts).toString();
}

export function renderDicebearDataUri(
  styleKey: string,
  options: AvatarOptions,
  size = 96
): string {
  const st = STYLE_MAP[styleKey] ?? adventurer;
  const opts = {
    seed: SEED,
    size,
    ...sanitize(styleKey, options),
  } as unknown as StyleOptions<Record<string, unknown>>;
  return createAvatar(st, opts).toDataUri();
}

// ---- Editeur : controles derives du schema ---------------------------------

export const OPTION_LABELS: Record<string, string> = {
  hair: "Coiffure",
  hairColor: "Couleur des cheveux",
  skinColor: "Couleur de peau",
  eyes: "Yeux",
  eyesColor: "Couleur des yeux",
  eyebrows: "Sourcils",
  mouth: "Bouche",
  mouthColor: "Couleur de la bouche",
  glasses: "Lunettes",
  glassesColor: "Couleur des lunettes",
  features: "Détails du visage",
  earrings: "Boucles d'oreilles",
  accessories: "Accessoires",
  accessoriesColor: "Couleur des accessoires",
  beard: "Barbe",
  clothing: "Vêtements",
  clothingColor: "Couleur des vêtements",
  hat: "Chapeau",
  hatColor: "Couleur du chapeau",
  backgroundColor: "Fond",
};

// Ordre d'affichage adapte aux enfants (les plus visibles d'abord).
const CONTROL_ORDER = [
  "hair",
  "hairColor",
  "skinColor",
  "eyes",
  "eyesColor",
  "eyebrows",
  "mouth",
  "mouthColor",
  "glasses",
  "glassesColor",
  "features",
  "earrings",
  "accessories",
  "accessoriesColor",
  "beard",
  "clothing",
  "clothingColor",
  "hat",
  "hatColor",
  "backgroundColor",
];

export type Control =
  | {
      key: string;
      label: string;
      kind: "variant";
      values: string[];
      optional: boolean;
    }
  | { key: string; label: string; kind: "color"; values: string[] };

const HEX6 = /^[0-9a-fA-F]{6}$/;
function isColorDefaults(def: unknown): def is string[] {
  return (
    Array.isArray(def) && def.length > 0 && def.every((v) => typeof v === "string" && HEX6.test(v))
  );
}

export function controlsForStyle(styleKey: string): Control[] {
  const st = STYLE_MAP[styleKey] ?? adventurer;
  const props: Record<string, { type?: string; items?: { enum?: string[] }; default?: unknown }> =
    st.schema?.properties ?? {};
  const keys = Object.keys(props);
  const ordered = [
    ...CONTROL_ORDER.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !CONTROL_ORDER.includes(k)),
  ];
  const out: Control[] = [];
  for (const key of ordered) {
    if (key === "base" || key.endsWith("Probability")) continue;
    const spec = props[key];
    const label = OPTION_LABELS[key] ?? key;
    const variants = spec?.items?.enum;
    if (Array.isArray(variants) && variants.length > 0) {
      out.push({
        key,
        label,
        kind: "variant",
        values: variants,
        optional: `${key}Probability` in props,
      });
    } else if (isColorDefaults(spec?.default)) {
      out.push({ key, label, kind: "color", values: spec!.default as string[] });
    }
  }
  return out;
}

// ---- Selection : lecture / ecriture des options -----------------------------

export function selectedVariant(options: AvatarOptions, key: string): string | null {
  const prob = options[`${key}Probability`];
  if (typeof prob === "number" && prob === 0) return null;
  const v = options[key];
  return Array.isArray(v) && v.length > 0 ? v[0] : null;
}

export function selectedColor(options: AvatarOptions, key: string): string | null {
  const v = options[key];
  return Array.isArray(v) && v.length > 0 ? v[0] : null;
}

export function setVariant(
  options: AvatarOptions,
  key: string,
  value: string | null,
  optional: boolean
): AvatarOptions {
  const next: AvatarOptions = { ...options };
  if (value === null) {
    if (optional) next[`${key}Probability`] = 0;
    return next;
  }
  next[key] = [value];
  if (optional) next[`${key}Probability`] = 100;
  return next;
}

export function setColor(options: AvatarOptions, key: string, value: string): AvatarOptions {
  return { ...options, [key]: [value] };
}

// Options d'apercu pour UNE vignette : l'avatar courant avec une seule option
// remplacee (apercu contextuel facon "playground").
export function previewOptions(
  base: AvatarOptions,
  control: Control,
  value: string | null
): AvatarOptions {
  if (control.kind === "color") {
    return value ? setColor(base, control.key, value) : base;
  }
  return setVariant(base, control.key, value, control.optional);
}

// ---- Aleatoire & defauts ----------------------------------------------------

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

export function randomOptions(styleKey: string, rand: () => number = Math.random): AvatarOptions {
  const controls = controlsForStyle(styleKey);
  let options: AvatarOptions = {};
  for (const c of controls) {
    if (c.kind === "color") {
      options = setColor(options, c.key, pick(c.values, rand));
    } else if (c.optional) {
      // 55% de chance d'afficher l'element optionnel.
      const on = rand() < 0.55;
      options = setVariant(options, c.key, on ? pick(c.values, rand) : null, true);
    } else {
      options = setVariant(options, c.key, pick(c.values, rand), false);
    }
  }
  return options;
}

export function defaultDicebearAvatar(
  couleur: string,
  styleKey: StyleKey = STYLE_KEYS[0],
  rand: () => number = Math.random
): DicebearAvatar {
  return { style: styleKey, options: randomOptions(styleKey, rand), couleur };
}
