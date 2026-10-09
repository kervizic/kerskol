// Saisie LIBRE d'un nombre DECIMAL (competences MA.DEC.*, CM1). Pave numerique
// large (cibles >= 44 px) + une touche virgule. La valeur remontee (onCode) est
// le CODE EN CENTIEMES (entier) via decimalToCentiemes : "3,25" -> 325,
// "3,5" -> 350, "0,07" -> 7, "7" -> 700 ; vide / invalide -> -1. Au plus 4
// chiffres pour la partie entiere, 2 decimales, une seule virgule. Le serveur
// (verif_calcul, op 'val') reste SEUL JUGE ; ce composant ne fait que saisir.
import { useCallback, useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { decimalToCentiemes } from "../domain/calcul/decimaux";

export default function DecimalInput({ onCode }: { onCode: (code: number) => void }) {
  const [txt, setTxt] = useState("");

  useEffect(() => {
    onCode(decimalToCentiemes(txt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txt]);

  const onDigit = useCallback((digit: string) => {
    setTxt((cur) => {
      const comma = cur.indexOf(",");
      if (comma >= 0) {
        if (cur.length - comma - 1 >= 2) return cur; // au plus 2 decimales
      } else if (cur.length >= 4) {
        return cur; // au plus 4 chiffres pour la partie entiere
      }
      return cur + digit;
    });
  }, []);
  const onComma = useCallback(() => {
    setTxt((cur) => (cur === "" ? "0," : cur.includes(",") ? cur : cur + ","));
  }, []);
  const onDelete = useCallback(() => setTxt((c) => c.slice(0, -1)), []);

  // Clavier physique : chiffres, virgule/point, effacement.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key >= "0" && e.key <= "9") onDigit(e.key);
      else if (e.key === "," || e.key === ".") { e.preventDefault(); onComma(); }
      else if (e.key === "Backspace") onDelete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDigit, onComma, onDelete]);

  return (
    <div className="kk-fracinput" role="group" aria-label="ecrire le nombre decimal">
      <div
        className="kk-answer__box kk-answer__box--active"
        aria-label={`nombre : ${txt || "a completer"}`}
        style={{ minWidth: 120, textAlign: "center" }}
      >
        {txt || "?"}
      </div>
      <div className="kk-pad kk-pad--mini">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button type="button" key={d} onClick={() => onDigit(d)} aria-label={d}>{d}</button>
        ))}
        <button type="button" onClick={onComma} aria-label="virgule">,</button>
        <button type="button" onClick={() => onDigit("0")} aria-label="0">0</button>
        <button type="button" onClick={onDelete} aria-label="Effacer"><Delete size={26} aria-hidden="true" /></button>
      </div>
    </div>
  );
}
