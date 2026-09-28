import { useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { cycleMode, getMode, type ThemeMode } from "../theme/mode";

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
      {mode === "auto" ? <SunMoon size={26} aria-hidden="true" /> : mode === "light" ? <Sun size={26} aria-hidden="true" /> : <Moon size={26} aria-hidden="true" />}
    </button>
  );
}
