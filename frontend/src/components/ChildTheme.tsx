import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { accentVars } from "../theme/childColors";
import { effectiveDark, subscribeMode } from "../theme/mode";

// Sombre EFFECTIF : suit le mode choisi (auto/clair/sombre) ET la preference
// systeme quand le mode est auto. Se re-rend quand l'un ou l'autre change.
export function useEffectiveDark(): boolean {
  const [dark, setDark] = useState(() => effectiveDark());
  useEffect(() => {
    const update = () => setDark(effectiveDark());
    const offMode = subscribeMode(update);
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener?.("change", update);
    } catch {
      /* ignore */
    }
    // Sync initial (au cas ou l'etat aurait change avant le montage).
    update();
    return () => {
      offMode();
      mq?.removeEventListener?.("change", update);
    };
  }, []);
  return dark;
}

// Redefinit --kk-accent / --kk-on-accent / --kk-accent-text pour les ECRANS
// ENFANT a partir de la couleur du profil ET du mode clair/sombre effectif.
// display:contents => aucun impact de mise en page ; les variables heritent.
export function ChildTheme({ couleur, children }: { couleur: string; children: ReactNode }) {
  const dark = useEffectiveDark();
  const style = { display: "contents", ...accentVars(couleur, dark) } as CSSProperties;
  return <div style={style}>{children}</div>;
}
