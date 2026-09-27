import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { accentVars } from "../theme/childColors";

// Suit la preference systeme clair/sombre (l'app ne force pas data-theme).
export function usePrefersDark(): boolean {
  const [dark, setDark] = useState(() => {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return;
    }
    const on = () => setDark(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return dark;
}

// Redefinit --kk-accent / --kk-on-accent / --kk-accent-text pour les ECRANS
// ENFANT a partir de la couleur du profil. display:contents => aucun impact de
// mise en page, mais les variables CSS heritent bien vers les enfants.
export function ChildTheme({ couleur, children }: { couleur: string; children: ReactNode }) {
  const dark = usePrefersDark();
  const style = { display: "contents", ...accentVars(couleur, dark) } as CSSProperties;
  return <div style={style}>{children}</div>;
}
