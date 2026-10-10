// Bouton haut-parleur pour (re)lire une consigne/dictee a voix haute.
// - `disponible` : la voix est chargee (manifest + clips). Faux => rien (bouton mort inutile).
// - `jouable`    : CET enonce peut etre lu EN ENTIER (toutes ses briques existent).
//   Faux => bouton GRISE non cliquable : on prefere ne rien lire plutot qu'une
//   phrase incomplete (bug du 10/10 : clip d'un nombre non encore genere).

import { Volume2 } from "lucide-react";

interface SpeakerButtonProps {
  onClick: () => void;
  disponible: boolean;
  jouable?: boolean;
  label?: string;
}

export function SpeakerButton({ onClick, disponible, jouable = true, label = "Lire à voix haute" }: SpeakerButtonProps) {
  if (!disponible) return null;
  const titre = jouable ? label : "Audio bientôt disponible";
  return (
    <button
      type="button"
      className={`kk-icon-btn kk-voix-btn${jouable ? "" : " kk-voix-btn--indispo"}`}
      aria-label={titre}
      title={titre}
      onClick={jouable ? onClick : undefined}
      disabled={!jouable}
      aria-disabled={!jouable}
      style={jouable ? undefined : { opacity: 0.4, cursor: "not-allowed" }}
    >
      <Volume2 size={22} aria-hidden="true" />
    </button>
  );
}
