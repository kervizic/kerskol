// Derive, pour chaque couleur d'enfant, des accents ACCESSIBLES (clair + sombre)
// a partir de la couleur choisie (avatar.couleur). Tout est CALCULE ici et
// VERIFIE par childColors.test.ts (ratios WCAG). Les bandeaux succes/erreur ne
// sont pas touches (menthe/saumon, definis dans tokens.css).

import { AVATAR_COLORS } from "../domain/avatars";

export const BG_LIGHT = "#FFFFFF";
export const BG_DARK = "#1C1917";
const TEXT_DARK = "#1C1917"; // texte fonce pose sur un bouton clair

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}
function rgbToHex({ r, g, b }: Rgb): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lin(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Mixe `hex` vers `target` (t=0 -> hex, t=1 -> target).
function mix(hex: string, target: Rgb, t: number): string {
  const c = hexToRgb(hex);
  return rgbToHex({
    r: c.r + (target.r - c.r) * t,
    g: c.g + (target.g - c.g) * t,
    b: c.b + (target.b - c.b) * t,
  });
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

// Assombrit (bg clair) ou eclaircit (bg sombre) la couleur jusqu'a atteindre le
// ratio cible contre le fond. Deterministe : pas de 0..1 en 41 paliers.
export function accessibleText(base: string, bg: string, target: number): string {
  const toward = luminance(bg) > 0.5 ? BLACK : WHITE; // fond clair -> vers noir
  let out = base;
  for (let i = 0; i <= 40; i++) {
    out = mix(base, toward, i / 40);
    if (contrast(out, bg) >= target) return out;
  }
  return out; // extreme (noir/blanc) si jamais atteint
}

// Meilleur texte sur un bouton plein `accent` : blanc ou fonce selon le contraste.
export function bestOn(accent: string): string {
  return contrast(accent, "#FFFFFF") >= contrast(accent, TEXT_DARK)
    ? "#FFFFFF"
    : TEXT_DARK;
}

// Bouton plein : on assombrit la couleur choisie jusqu'a ce que le TEXTE BLANC
// tienne >= 3:1 (gros texte gras / composant UI). Meme remplissage clair/sombre,
// texte blanc dans les deux cas -> rendu coherent et accessible.
export function accentFill(base: string): string {
  if (contrast(base, "#FFFFFF") >= 3) return base;
  return accessibleText(base, "#FFFFFF", 3); // assombrit vers le noir
}

export interface AccentTriple {
  accent: string; // --kk-accent (bouton plein, gros titres)
  onAccent: string; // --kk-on-accent (texte sur bouton)
  accentText: string; // --kk-accent-text (liens/petit texte accent sur le fond)
}
export interface AccentPair {
  light: AccentTriple;
  dark: AccentTriple;
}

export function buildAccent(base: string): AccentPair {
  const fill = accentFill(base);
  return {
    light: { accent: fill, onAccent: "#FFFFFF", accentText: accessibleText(base, BG_LIGHT, 4.5) },
    dark: { accent: fill, onAccent: "#FFFFFF", accentText: accessibleText(base, BG_DARK, 4.5) },
  };
}

// Variables CSS a poser en style inline sur un conteneur d'ecran enfant.
export function accentVars(base: string, dark: boolean): Record<string, string> {
  const t = buildAccent(base)[dark ? "dark" : "light"];
  return {
    "--kk-accent": t.accent,
    "--kk-on-accent": t.onAccent,
    "--kk-accent-text": t.accentText,
  };
}

export const CHILD_COLORS = AVATAR_COLORS;
