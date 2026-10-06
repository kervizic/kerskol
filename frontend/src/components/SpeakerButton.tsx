// Bouton haut-parleur pour (re)lire une consigne/dictee a voix haute.
// Ne s'affiche que si la voix est disponible (manifest + clips charges), pour
// ne pas montrer un bouton mort quand l'audio manque.

import { Volume2 } from "lucide-react";

interface SpeakerButtonProps {
  onClick: () => void;
  disponible: boolean;
  label?: string;
}

export function SpeakerButton({ onClick, disponible, label = "Lire à voix haute" }: SpeakerButtonProps) {
  if (!disponible) return null;
  return (
    <button
      type="button"
      className="kk-icon-btn kk-voix-btn"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Volume2 size={22} aria-hidden="true" />
    </button>
  );
}
