// Dictee detective : enquete d'orthographe (francais, CE2). Composant AUTONOME,
// rendu dans Session.tsx quand ex.saisie === "dictee".
//
// Deroule (decisions pedagogiques OBLIGATOIRES) :
//   N1 : le nombre d'erreurs est annonce ; il suffit de TROUVER (toucher).
//   N2 : trouver + CORRIGER par QCM (2-3 propositions par mot touche).
//   N3 : trouver + corriger en SAISIE LIBRE ; nombre annonce.
//   N4 : saisie libre ; nombre NON annonce (il peut n'y en avoir qu'une).
//
// SECURITE : le composant ne connait JAMAIS les erreurs avant l'envoi. Il
// n'affiche que les mots du texte (fautes comprises) et, au niveau 2, des
// propositions derivees du mot visible (sans fuite). Le serveur (verif_dictee)
// est seul juge ; il revele les erreurs dans le resultat, affiche ensuite de
// facon toujours valorisante (jamais punitive).

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { SpeakerButton } from "./SpeakerButton";
import { AutoReadToggle } from "./AutoReadToggle";
import { phrasesDepuisMots, mapperMots, spanPourToken } from "../lib/voix/toks";
import {
  propositionsDictee, motAffichable,
  type DicteeTexte, type DicteeReponse, type DicteeResultat,
} from "../domain/francais/dictee";
import { choisirTexteDictee, type ContexteDictee } from "../domain/francais/selection-dictee";
import { messageErreur, messageFausseAlerte, messageBilan } from "../domain/diagnostic/dictee";

interface Props {
  niveau: number;
  bank: DicteeTexte[];
  ctx?: ContexteDictee | null;
  onSoumettre: (texteId: number, niveau: number, reponses: DicteeReponse[]) => Promise<DicteeResultat | null>;
  onContinuer: (correct: boolean) => void;
  onResultat?: (texteId: number, correct: boolean) => void;
  // Voix : lit la dictee CORRECTE (jamais la version piegee), phrase par phrase.
  lireDictee?: (
    id: number,
    opts?: {
      auto?: boolean;
      mode?: "simple" | "dictee";
      onSentence?: (sentenceIndex: number) => void;
      onToken?: (sentenceIndex: number, tokenIndex: number) => void;
    }
  ) => void;
  voixDisponible?: boolean;
  lectureAutoActive?: boolean;
  onToggleLectureAuto?: () => void;
}

interface SelState {
  on: boolean;
  cor: string;
}

export default function DicteeDetective({ niveau, bank, ctx, onSoumettre, onContinuer, onResultat, lireDictee, voixDisponible, lectureAutoActive, onToggleLectureAuto }: Props) {
  // CHOIX DU TEXTE par NIVEAU et lacunes (notion a travailler, pas de repetition) ;
  // repli sur le niveau seul si le contexte est absent. Aucune logique de date.
  const texte = useMemo(
    () => choisirTexteDictee(bank, { niveau, ordre: ctx?.ordre ?? [], maitrise: ctx?.maitrise, lacunes: ctx?.lacunes, vus: ctx?.vus }),
    [bank, niveau, ctx],
  );
  const [sel, setSel] = useState<Record<number, SelState>>({});
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<DicteeResultat | null>(null);
  const [erreurReseau, setErreurReseau] = useState(false);

  // Karaoke : surlignage du mot en cours (pos = index+1). Repli phrase entiere
  // si l'alignement n'est pas fiable (tokenIndex -2).
  const [surlignes, setSurlignes] = useState<Set<number>>(new Set());
  const phrases = useMemo(() => (texte ? phrasesDepuisMots(texte.mots) : []), [texte]);
  const spansParPhrase = useMemo(
    () => (texte ? phrases.map((idxs) => mapperMots(idxs.map((i) => texte.mots[i]))) : []),
    [phrases, texte]
  );
  const onSentence = useCallback(() => setSurlignes(new Set()), []);
  const onToken = useCallback(
    (s: number, tok: number) => {
      if (tok === -1) return setSurlignes(new Set());
      const idxs = phrases[s] ?? [];
      if (tok === -2) return setSurlignes(new Set(idxs.map((i) => i + 1)));
      const local = spanPourToken(spansParPhrase[s] ?? [], tok);
      if (local >= 0 && idxs[local] !== undefined) setSurlignes(new Set([idxs[local] + 1]));
    },
    [phrases, spansParPhrase]
  );

  // Lecture AUTO de la dictee a l'arrivee sur l'exercice (mode dictee : lecture
  // continue -> phrase par phrase -> relecture). Avant le verdict uniquement.
  useEffect(() => {
    if (texte && !res) lireDictee?.(texte.id, { auto: true, mode: "dictee", onSentence, onToken });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte?.id]);

  if (!texte) {
    // Banque indisponible (ne devrait pas arriver si l'exercice existe).
    return (
      <div className="kk-stack" style={{ textAlign: "center" }}>
        <p className="kk-muted">La dictée n'est pas disponible pour l'instant.</p>
        <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(false)}>
          Continuer
        </button>
      </div>
    );
  }

  const corrige = niveau >= 2; // N2+ : il faut corriger (QCM N2, libre N3/N4)
  const annonce = niveau <= 3; // nombre d'erreurs annonce sauf au niveau 4
  const nbSel = Object.values(sel).filter((s) => s.on).length;

  const toggle = (pos: number) => {
    if (res) return;
    setSel((prev) => {
      const cur = prev[pos];
      if (cur?.on) {
        const next = { ...prev };
        delete next[pos];
        return next;
      }
      return { ...prev, [pos]: { on: true, cor: "" } };
    });
  };
  const setCor = (pos: number, cor: string) =>
    setSel((prev) => ({ ...prev, [pos]: { on: true, cor } }));

  const soumettre = async () => {
    if (busy || res) return;
    setBusy(true);
    const reponses: DicteeReponse[] = Object.entries(sel)
      .filter(([, s]) => s.on)
      .map(([pos, s]) => (corrige ? { pos: Number(pos), cor: s.cor } : { pos: Number(pos) }));
    try {
      const r = await onSoumettre(texte.id, niveau, reponses);
      if (r) {
        setRes(r);
        // Suivi par notion (escalier) + anti-repetition, apres le verdict serveur.
        onResultat?.(texte.id, r.juste);
      } else setErreurReseau(true);
    } catch {
      setErreurReseau(true);
    } finally {
      setBusy(false);
    }
  };

  // Positions revelees (apres envoi) pour colorer les mots.
  const errByPos = new Map<number, DicteeResultat["erreurs"][number]>();
  if (res) for (const e of res.erreurs) errByPos.set(e.position, e);
  const faussesAlertes = new Set(res?.fausses_alertes ?? []);

  return (
    <div className="kk-stack kk-dictee">
      <p className="kk-lead" style={{ textAlign: "center", margin: "0 auto" }}>
        <Search size={18} aria-hidden="true" />{" "}
        {annonce
          ? `Trouve les ${texte.nbErreurs} mot${texte.nbErreurs > 1 ? "s" : ""} piégé${texte.nbErreurs > 1 ? "s" : ""}`
          : "Trouve les mots piégés (il peut y en avoir un ou plusieurs)"}
        {corrige ? ", puis corrige-les." : "."}
        {lireDictee && (
          <>
            {" "}
            <SpeakerButton
              disponible={Boolean(voixDisponible)}
              label="Réécouter la dictée"
              onClick={() => lireDictee(texte.id, { mode: "dictee", onSentence, onToken })}
            />
            {onToggleLectureAuto && (
              <AutoReadToggle
                disponible={Boolean(voixDisponible)}
                active={Boolean(lectureAutoActive)}
                onToggle={onToggleLectureAuto}
              />
            )}
          </>
        )}
      </p>

      {/* Texte : chaque mot est touchable. */}
      <p className="kk-dictee__texte" style={{ fontSize: "1.3rem", lineHeight: 2.1, textAlign: "center" }}>
        {texte.mots.map((mot, i) => {
          const pos = i + 1;
          const on = Boolean(sel[pos]?.on);
          const e = errByPos.get(pos);
          const fa = faussesAlertes.has(pos);
          const surligne = surlignes.has(pos);
          let bg = "transparent";
          let color = "inherit";
          if (res) {
            if (e && e.trouvee && (niveau <= 1 || e.correction_ok)) { bg = "#16a34a"; color = "#fff"; }
            else if (e && e.trouvee) { bg = "#E06A00"; color = "#fff"; }
            else if (e) { bg = "#f59e0b"; color = "#fff"; }
            else if (fa) { bg = "#3b82f6"; color = "#fff"; }
          } else if (on) {
            bg = "var(--kk-accent)"; color = "var(--kk-on-accent)";
          }
          return (
            <button
              key={pos}
              type="button"
              className="kk-dictee__mot"
              onClick={() => toggle(pos)}
              disabled={Boolean(res)}
              aria-current={surligne ? "true" : undefined}
              style={{
                display: "inline-block", margin: "2px 4px", padding: "4px 10px",
                minHeight: 40, borderRadius: 10,
                border: surligne ? "2px solid #2563eb" : "2px solid var(--kk-border, #ccc)",
                background: surligne && bg === "transparent" ? "#dbeafe" : bg,
                color: surligne && bg === "transparent" ? "#1e3a8a" : color,
                boxShadow: surligne ? "0 0 0 3px rgba(37,99,235,0.35)" : undefined,
                font: "inherit", cursor: res ? "default" : "pointer",
                transition: "background 80ms, box-shadow 80ms",
              }}
            >
              {res && e ? e.correction : mot}
            </button>
          );
        })}
      </p>

      {/* Correction des mots touches (N2 : QCM ; N3/N4 : saisie libre). */}
      {corrige && !res && nbSel > 0 && (
        <div className="kk-stack">
          {Object.entries(sel)
            .filter(([, s]) => s.on)
            .map(([posStr]) => {
              const pos = Number(posStr);
              const mot = texte.mots[pos - 1];
              const options = niveau === 2 ? propositionsDictee(mot) : [];
              return (
                <div key={pos} className="kk-dictee__corr" style={{ textAlign: "center" }}>
                  <span className="kk-muted">« {motAffichable(mot)} » → </span>
                  {options.length >= 2 ? (
                    <span className="kk-row" style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                      {options.map((o) => (
                        <button
                          key={o}
                          type="button"
                          className={`kk-btn${sel[pos]?.cor === o ? " kk-btn--accent" : ""}`}
                          onClick={() => setCor(pos, o)}
                        >
                          {o}
                        </button>
                      ))}
                    </span>
                  ) : (
                    <input
                      className="kk-lettres__input"
                      style={{ maxWidth: 180, display: "inline-block" }}
                      value={sel[pos]?.cor ?? ""}
                      onChange={(ev) => setCor(pos, ev.target.value)}
                      aria-label={`Corriger ${motAffichable(mot)}`}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Bouton « J'ai fini » (la saisie a boutons/clavier compte comme libre). */}
      {!res && !erreurReseau && (
        <div className="kk-row" style={{ justifyContent: "center" }}>
          <button className="kk-btn kk-btn--accent kk-btn--big" disabled={busy} onClick={soumettre}>
            <Check size={22} aria-hidden="true" /> J'ai fini
          </button>
        </div>
      )}

      {erreurReseau && !res && (
        <div className="kk-banner">
          <p style={{ margin: 0 }}>On vérifiera ta dictée dès que la connexion revient. Bravo d'avoir cherché !</p>
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(false)}>
            Continuer
          </button>
        </div>
      )}

      {/* Feedback serveur : toujours valorisant, jamais punitif. */}
      {res && (
        <div className={`kk-banner ${res.juste ? "kk-banner--ok" : ""}`}>
          <span className="kk-banner__title">
            {res.juste ? <Check size={22} aria-hidden="true" /> : null} {messageBilan(res)}
          </span>
          <ul className="kk-dictee__bilan" style={{ textAlign: "left", listStyle: "none", padding: 0, margin: "8px 0" }}>
            {res.erreurs.map((e) => {
              const m = messageErreur(e, niveau);
              const icone = m.ton === "ok" ? "✅" : m.ton === "info" ? "💡" : "🔍";
              return (
                <li key={e.position} style={{ margin: "6px 0" }}>
                  {icone} {m.texte}
                </li>
              );
            })}
            {(res.fausses_alertes ?? []).map((pos) => (
              <li key={`fa-${pos}`} style={{ margin: "6px 0" }}>
                💙 {messageFausseAlerte(motAffichable(texte.mots[pos - 1] ?? "")).texte}
              </li>
            ))}
          </ul>
          <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => onContinuer(res.juste)}>
            Continuer
          </button>
        </div>
      )}
    </div>
  );
}
