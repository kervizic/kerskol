// Bascule enfant « lecture automatique » depuis l'ecran d'exercice, a cote du
// bouton haut-parleur. Grande zone tactile (kk-icon-btn) + libelle accessible.
// Volume2 = auto activee, VolumeX = auto coupee.

import { Volume2, VolumeX } from "lucide-react";

interface AutoReadToggleProps {
  active: boolean;
  disponible: boolean;
  onToggle: () => void;
}

export function AutoReadToggle({ active, disponible, onToggle }: AutoReadToggleProps) {
  if (!disponible) return null;
  const label = active ? "Couper la lecture automatique" : "Activer la lecture automatique";
  return (
    <button
      type="button"
      className="kk-icon-btn kk-voix-toggle"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      {active ? <Volume2 size={22} aria-hidden="true" /> : <VolumeX size={22} aria-hidden="true" />}
    </button>
  );
}
