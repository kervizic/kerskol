// Editeur de MATIERES et SOUS-MATIERES, partage par l'ecran enfant (Village,
// section « Mes matieres ») et l'espace parent (par enfant). De gros
// interrupteurs avec une icone Lucide. On garantit cote client qu'AU MOINS une
// sous-matiere reste active (le serveur le refuse aussi, via regler_matieres).
//
// `onChange(matieres, domaines)` PERSISTE le reglage (RPC regler_matieres). Le
// composant est optimiste : il applique localement puis previent le parent.

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import {
  MATIERES,
  auMoinsUneSousMatiere,
} from "../domain/matieres";

function Interrupteur({
  actif,
  libelle,
  onToggle,
  gros,
  disabled,
}: {
  actif: boolean;
  libelle: string;
  onToggle: () => void;
  gros?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`kk-matiere-switch${actif ? " kk-matiere-switch--on" : ""}${gros ? " kk-matiere-switch--gros" : ""}`}
      role="switch"
      aria-checked={actif}
      aria-label={libelle}
      disabled={disabled}
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        width: "100%",
        padding: gros ? "14px 18px" : "10px 14px",
        marginTop: 8,
        borderRadius: 14,
        border: "2px solid",
        borderColor: actif ? "var(--kk-accent)" : "var(--kk-border, #ccc)",
        background: actif ? "var(--kk-accent-soft, rgba(0,0,0,0.04))" : "transparent",
        fontSize: gros ? "1.1rem" : "1rem",
        fontWeight: gros ? 700 : 500,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span>{libelle}</span>
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: actif ? "var(--kk-accent)" : "var(--kk-border, #ddd)",
          color: actif ? "#fff" : "var(--kk-muted, #888)",
          flex: "0 0 auto",
        }}
      >
        {actif ? <Check size={20} /> : <X size={20} />}
      </span>
    </button>
  );
}

export function MatieresEditor({
  matieresActives,
  domainesActifs,
  onChange,
}: {
  matieresActives: string[];
  domainesActifs: string[];
  onChange: (matieres: string[], domaines: string[]) => void;
}) {
  const [mat, setMat] = useState<string[]>(matieresActives);
  const [dom, setDom] = useState<string[]>(domainesActifs);
  const [refus, setRefus] = useState(false);

  // Resynchronise si le profil change ailleurs (sauvegarde parent, etc.).
  useEffect(() => setMat(matieresActives), [matieresActives]);
  useEffect(() => setDom(domainesActifs), [domainesActifs]);

  // Applique un reglage SEULEMENT s'il reste au moins une sous-matiere jouable.
  function applique(nextMat: string[], nextDom: string[]) {
    if (!auMoinsUneSousMatiere(nextMat, nextDom)) {
      setRefus(true);
      return;
    }
    setRefus(false);
    setMat(nextMat);
    setDom(nextDom);
    onChange(nextMat, nextDom);
  }

  function toggleMatiere(code: string) {
    if (mat.includes(code)) {
      applique(mat.filter((c) => c !== code), dom);
    } else {
      // Reactiver une matiere reactive aussi ses sous-matieres (sinon rien a jouer).
      const def = MATIERES.find((m) => m.code === code)?.sousMatieres.map((s) => s.domaine) ?? [];
      applique([...mat, code], Array.from(new Set([...dom, ...def])));
    }
  }

  function toggleDomaine(code: string) {
    const next = dom.includes(code) ? dom.filter((d) => d !== code) : [...dom, code];
    applique(mat, next);
  }

  return (
    <div className="kk-matieres-editor">
      {MATIERES.map((m) => {
        const matActif = mat.includes(m.code);
        return (
          <div key={m.code} style={{ marginTop: 14 }}>
            <Interrupteur
              gros
              actif={matActif}
              libelle={m.libelle}
              onToggle={() => toggleMatiere(m.code)}
            />
            {matActif && (
              <div style={{ paddingLeft: 16 }}>
                {m.sousMatieres.map((s) => (
                  <Interrupteur
                    key={s.domaine}
                    actif={dom.includes(s.domaine)}
                    libelle={s.libelle}
                    onToggle={() => toggleDomaine(s.domaine)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {refus && (
        <p className="kk-muted" role="alert" style={{ marginTop: 10 }}>
          Il faut garder au moins une matière à travailler.
        </p>
      )}
    </div>
  );
}
