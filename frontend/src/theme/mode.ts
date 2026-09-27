// Mode de theme choisi par l'appareil : automatique (suit l'OS), clair, sombre.
// Applique via data-theme sur <html> (tokens.css gere data-theme="light|dark").
// Persistance localStorage (try/catch). Un script inline-file (theme-init.js)
// pose data-theme AVANT le rendu pour eviter tout flash.

export type ThemeMode = "auto" | "light" | "dark";
const KEY = "kerskol_theme";
const listeners = new Set<() => void>();

export function getMode(): ThemeMode {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function applyMode(m: ThemeMode): void {
  try {
    const el = document.documentElement;
    if (m === "auto") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", m);
  } catch {
    /* ignore */
  }
}

export function setMode(m: ThemeMode): void {
  try {
    if (m === "auto") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, m);
  } catch {
    /* ignore */
  }
  applyMode(m);
  listeners.forEach((f) => f());
}

const ORDER: ThemeMode[] = ["auto", "light", "dark"];
export function cycleMode(): ThemeMode {
  const next = ORDER[(ORDER.indexOf(getMode()) + 1) % ORDER.length];
  setMode(next);
  return next;
}

export function prefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

// Sombre effectif = mode explicite, sinon preference systeme.
export function effectiveDark(mode: ThemeMode = getMode()): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return prefersDark();
}

export function subscribeMode(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
