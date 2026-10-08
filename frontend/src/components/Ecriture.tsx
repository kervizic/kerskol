// Copier et écrire (français, CE2, lot 0063). Composant AUTONOME, rendu dans
// Session.tsx quand ex.saisie === "ecriture". Cinq formats :
//   - copie     : un modèle est affiché ; l'enfant le recopie au clavier. En N4
//                 (copie différée), un bouton cache le modèle : on regarde, on
//                 cache, on écrit de mémoire. Diagnostic bienveillant si erreur.
//   - ordre     : des étiquettes-mots à remettre dans l'ordre pour faire une phrase ;
//   - qcm       : compléter une phrase en choisissant le bon mot ;
//   - transform : transformer une phrase (pluriel, passé composé) vers une cible ;
//   - libre     : écrire une phrase libre (image emoji ou début d'histoire),
//                 vérifiée par une CHECK-LIST (jamais par le sens). La phrase est
//                 enregistrée (serveur) et relue par le parent.
// Le SERVEUR (verif_ecriture, op 'ecr') reste SEUL JUGE. Feedback TOUJOURS
// valorisant. Cibles tactiles >= 44 px (classes kk-btn). INDICE N1/N2 seulement.

import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, Lightbulb, RotateCcw } from "lucide-react";
import { IMAGES } from "../domain/images";
import {
  comparerEcriture,
  diagnostiquerCopie,
  VERBES_LIBRE,
  type EcrFormat,
  type EcrCheck,
} from "../domain/francais/ecriture";
import { normaliserMot } from "../domain/francais/dictee";

export interface EcrRender {
  cle: string;
  format: EcrFormat;
  consigne: string;
  attendu: string;
  modele?: string;
  differe?: boolean;
  etiquettes?: string[];
  phrase?: string;
  options?: string[];
  check?: EcrCheck;
  amorce?: string;
  image?: string;
  exemple?: string;
  explication: string;
}

interface Props {
  item: EcrRender;
  indice: string | null; // affiche aux niveaux 1 et 2 (null sinon)
  onSoumettre: (cle: string, reponseTexte: string) => Promise<{ correct: boolean } | null>;
  onContinuer: (correct: boolean) => void;
}

// Premier conseil de check-list non respecté (feedback N4 libre, jamais sur le sens).
function conseilCheck(saisie: string, check: EcrCheck): string {
  const s = saisie.trim();
  if (s === "") return "Écris d'abord ta phrase.";
  const premier = s.charAt(0);
  if (!(premier !== premier.toLowerCase() && premier === premier.toUpperCase()))
    return "Commence ta phrase par une majuscule.";
  if (!/[.!?]$/.test(s)) return "N'oublie pas le point à la fin de la phrase.";
  const mots = s.split(/\s+/).filter(Boolean);
  if (mots.length < check.minMots) return `Essaie d'écrire au moins ${check.minMots} mots.`;
  const setMots = new Set(mots.map(normaliserMot));
  const verbes = (check.verbes && check.verbes.length ? check.verbes : VERBES_LIBRE).map(normaliserMot);
  if (!verbes.some((v) => setMots.has(v))) return "Ajoute un verbe (une action), comme joue, court ou aime.";
  for (const kw of check.motsCles) {
    if (!setMots.has(normaliserMot(kw))) return `Pense à utiliser le mot « ${kw} ».`;
  }
  return "Regarde encore ta phrase.";
}

export default function Ecriture({ item, indice, onSoumettre, onContinuer }: Props) {
  const [saisie, setSaisie] = useState("");
  const [choix, setChoix] = useState<string | null>(null); // qcm
  const [seq, setSeq] = useState<string[]>([]); // ordre
  const [cacheModele, setCacheModele] = useState(false); // copie différée
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ correct: boolean } | null>(null);
  const [erreurReseau, setErreurReseau] = useState(false);
  const [montrerIndice, setMontrerIndice] = useState(false);

  const etiquettes = item.etiquettes ?? [];
  const img = item.image ? IMAGES[item.image] : undefined;

  const reponse = useMemo(() => {
    if (item.format === "qcm") return choix ?? "";
    if (item.format === "ordre") return seq.join(" ");
    return saisie; // copie / transform / libre
  }, [item.format, choix, seq, saisie]);

  const complet =
    item.format === "ordre"
      ? seq.length === etiquettes.length && etiquettes.length > 0
      : reponse.trim().length > 0;
  const peutValider = complet && !res && !busy;

  const soumettre = async () => {
    if (!peutValider) return;
    setBusy(true);
    try {
      const r = await onSoumettre(item.cle, reponse);
      if (r) setRes(r);
      else setErreurReseau(true);
    } catch {
      setErreurReseau(true);
    } finally {
      setBusy(false);
    }
  };

  const effacer = () => {
    if (res) return;
    setSaisie("");
    setChoix(null);
    setSeq([]);
  };

  const toggleEtiquette = (mot: string, idx: number) => {
    if (res) return;
    const key = `${idx}:${mot}`;
    setSeq((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));
  };
  // Phrase reconstruite à partir des étiquettes (clés "idx:mot" -> mot).
  const seqMots = seq.map((k) => k.slice(k.indexOf(":") + 1));
  const reponseOrdre = seqMots.join(" ");

  // Message de feedback (toujours valorisant).
  const messageWrong = (() => {
    if (item.format === "copie" || item.format === "transform") return diagnostiquerCopie(reponse, item.attendu);
    if (item.format === "libre" && item.check) return conseilCheck(reponse, item.check);
    return "Ce n'est pas encore ça, mais tu y es presque.";
  })();

  return (
    <div className="kk-stack kk-lecture">
      {/* Consigne. */}
      <p className="kk-lead" style={{ textAlign: "center", margin: "0 auto" }}>{item.consigne}</p>

      {/* COPIE : le modèle à recopier (masquable en copie différée). */}
      {item.format === "copie" && item.modele && (
        <div className="kk-stack" style={{ alignItems: "center" }}>
          {!cacheModele ? (
            <p className="kk-support kk-lecture__p" style={{ textAlign: "center", fontSize: "1.3rem" }}>{item.modele}</p>
          ) : (
            <p className="kk-muted" style={{ textAlign: "center" }}>Modèle caché : écris de mémoire. Tu peux le revoir si besoin.</p>
          )}
          {item.differe && !res && (
            <button type="button" className="kk-btn" onClick={() => setCacheModele((v) => !v)}>
              {cacheModele ? (<><Eye size={16} aria-hidden="true" /> Revoir le modèle</>) : (<><EyeOff size={16} aria-hidden="true" /> J'ai regardé, je cache</>)}
            </button>
          )}
        </div>
      )}

      {/* QCM / TRANSFORM : la phrase support (avec le trou « … » ou à transformer). */}
      {(item.format === "qcm" || item.format === "transform") && item.phrase && (
        <p className="kk-support kk-lecture__p" style={{ textAlign: "center", fontSize: "1.2rem" }}>{item.phrase}</p>
      )}

      {/* LIBRE : image déclencheur (emoji) ou début d'histoire. */}
      {item.format === "libre" && (
        <div className="kk-stack" style={{ alignItems: "center" }}>
          {img && <img src={img.src} alt={img.alt} width={96} height={96} style={{ imageRendering: "auto" }} />}
          {item.amorce && <p className="kk-support kk-lecture__p" style={{ textAlign: "center", fontSize: "1.2rem" }}>{item.amorce}</p>}
        </div>
      )}

      {/* Indice (niveaux 1 et 2). */}
      {indice && !res && (
        <div className="kk-stack kk-indice" style={{ textAlign: "center" }}>
          <button type="button" className="kk-btn" aria-expanded={montrerIndice} onClick={() => setMontrerIndice((v) => !v)}>
            <Lightbulb size={16} aria-hidden="true" /> Indice
          </button>
          {montrerIndice && <p className="kk-indice__texte kk-muted" aria-live="polite">{indice}</p>}
        </div>
      )}

      {/* QCM : gros boutons. */}
      {item.format === "qcm" && item.options && (
        <div className="kk-qcm">
          {item.options.map((o, i) => {
            const choisi = choix === o;
            const bon = res && comparerEcriture("qcm", o, item.attendu);
            const extra = (choisi && !res) || (res && bon) ? " kk-qcm__opt--active" : "";
            return (
              <button key={i} type="button" className={`kk-btn kk-qcm__opt${extra}`} disabled={Boolean(res)} aria-pressed={choisi} onClick={() => setChoix(o)}>
                {o}
              </button>
            );
          })}
        </div>
      )}

      {/* ORDRE : étiquettes-mots à ranger. */}
      {item.format === "ordre" && (
        <div className="kk-stack kk-lecture__ordre">
          {reponseOrdre && (
            <p className="kk-support kk-lecture__p" aria-live="polite" style={{ textAlign: "center", fontSize: "1.2rem", minHeight: "1.5em" }}>{reponseOrdre}</p>
          )}
          <div className="kk-qcm">
            {etiquettes.map((mot, i) => {
              const key = `${i}:${mot}`;
              const rang = seq.indexOf(key);
              const pris = rang >= 0;
              const extra = pris ? " kk-qcm__opt--active" : "";
              return (
                <button key={i} type="button" className={`kk-btn kk-qcm__opt${extra}`} disabled={Boolean(res)} aria-pressed={pris} onClick={() => toggleEtiquette(mot, i)}>
                  <span className="kk-lecture__rang" aria-hidden="true">{pris ? rang + 1 : "•"}</span> {mot}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* COPIE / TRANSFORM / LIBRE : saisie clavier. */}
      {(item.format === "copie" || item.format === "transform") && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <input
            className="kk-lettres__input"
            style={{ maxWidth: 420, width: "100%" }}
            value={saisie}
            disabled={Boolean(res)}
            onChange={(ev) => setSaisie(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === "Enter") void soumettre(); }}
            aria-label={item.consigne}
            autoCapitalize="sentences"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      )}
      {item.format === "libre" && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <textarea
            className="kk-lettres__input"
            style={{ maxWidth: 480, width: "100%", minHeight: 72, resize: "vertical" }}
            value={saisie}
            disabled={Boolean(res)}
            onChange={(ev) => setSaisie(ev.target.value)}
            aria-label={item.consigne}
            autoCapitalize="sentences"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      )}

      {/* Contrôles : Valider / Effacer. */}
      {!res && !erreurReseau && (
        <div className="kk-row" style={{ justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <button className="kk-btn kk-btn--accent kk-btn--big" disabled={!peutValider} onClick={soumettre}>
            <Check size={22} aria-hidden="true" /> Valider
          </button>
          <button type="button" className="kk-btn kk-btn--big" onClick={effacer} disabled={!complet}>
            <RotateCcw size={18} aria-hidden="true" /> Effacer
          </button>
        </div>
      )}

      {erreurReseau && !res && (
        <div className="kk-banner">
          <p style={{ margin: 0 }}>On vérifiera ta phrase dès que la connexion revient. Bravo d'avoir écrit !</p>
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(false)}>Continuer</button>
        </div>
      )}

      {/* Feedback serveur : toujours valorisant. */}
      {res && (
        <div className={`kk-banner ${res.correct ? "kk-banner--ok" : ""}`}>
          <span className="kk-banner__title">
            {res.correct ? <Check size={22} aria-hidden="true" /> : null}{" "}
            {res.correct ? "Bravo ! C'est tout bon." : messageWrong}
          </span>
          <p className="kk-geo__expl" aria-live="polite" style={{ margin: "8px 0" }}>{item.explication}</p>
          {item.format === "libre" && item.exemple && (
            <p className="kk-muted" style={{ margin: "0 0 8px" }}>Exemple de phrase : {item.exemple}</p>
          )}
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(res.correct)}>Continuer</button>
        </div>
      )}
    </div>
  );
}
