import { useState } from "react";
import { cycleMode, getMode, type ThemeMode } from "../theme/mode";

function Sun() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2" />
    </svg>
  );
}
function Moon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z" />
    </svg>
  );
}
function Auto() {
  // Demi-soleil / demi-lune : etat automatique.
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const LABEL: Record<ThemeMode, string> = {
  auto: "Thème : automatique (suit l’appareil). Cliquer pour le thème clair.",
  light: "Thème : clair. Cliquer pour le thème sombre.",
  dark: "Thème : sombre. Cliquer pour automatique.",
};

export function ThemeToggle() {
  const [mode, setModeState] = useState<ThemeMode>(getMode());
  return (
    <button
      className="kk-icon-btn"
      aria-label={LABEL[mode]}
      title={LABEL[mode]}
      onClick={() => setModeState(cycleMode())}
    >
      {mode === "auto" ? <Auto /> : mode === "light" ? <Sun /> : <Moon />}
    </button>
  );
}
