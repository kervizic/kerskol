// « Dictée avec papa ou maman » (sous-matiere mots-maitresse). Le PARENT lit a
// voix haute les mots d'une liste ACTIVE ; l'enfant les ecrit. Deux modes :
//   VOIX   : l'ecran enfant montre seulement « Mot X sur N » + une zone de saisie
//            (jamais le mot). Un bouton discret « parent » permet au parent qui
//            tient l'appareil de revoir le mot a lire.
//   PAPIER : l'enfant ecrit sur un cahier ; le parent coche juste / faux (et peut
//            taper la graphie de l'enfant).
// A la fin : correction automatique mot par mot (SERVEUR seul juge), score, mots
// a revoir (ils remontent dans l'EMA et reviennent en priorite). Un emplacement
// « Prendre en photo la dictée » est prevu (desactive) pour plus tard.
// Accessible depuis l'espace parent ET l'ecran enfant.

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, Camera, ChevronRight } from "lucide-react";
import type { MaitresseListe } from "../domain/francais/maitresse";
import { listesAvecMots } from "../domain/francais/maitresse";
import { diagnostiquerMot, messageBilanDictee } from "../domain/diagnostic/maitresse";
import { Spinner } from "./ui";
import {
  getMaitresse, enregistrerDicteeMaitresse,
  type DicteeMaitresseReponse, type DicteeMaitresseResultat,
} from "../lib/api";

type Mode = "voix" | "papier";

// Ordonne les mots d'une liste en commençant par les plus faibles (EMA haut).
function ordreMots(liste: MaitresseListe): number[] {
  const n = liste.mots.length;
  const idx = Array.from({ length: n }, (_, i) => i + 1); // 1-base
  const ema = liste.ema && liste.ema.length === n ? liste.ema : null;
  if (!ema) return idx;
  return idx.sort((a, b) => (ema[b - 1] - ema[a - 1]) || (a - b));
}

export default function DicteeMaitresse({
  profil, onExit,
}: {
  profil: { id: string };
  onExit: () => void;
}) {
  const [bank, setBank] = useState<MaitresseListe[] | null>(null);
  useEffect(() => {
    let alive = true;
    setBank(null);
    getMaitresse(profil.id).then((b) => alive && setBank(b)).catch(() => alive && setBank([]));
    return () => { alive = false; };
  }, [profil.id]);
  const listes = useMemo(() => listesAvecMots(bank ?? []), [bank]);
  const [listeId, setListeId] = useState<string>(listes[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("voix");
  const [phase, setPhase] = useState<"config" | "run" | "result">("config");

  const liste = listes.find((l) => l.id === listeId) ?? listes[0] ?? null;
  const ordre = useMemo(() => (liste ? ordreMots(liste) : []), [liste]);

  const [pos, setPos] = useState(0); // position courante dans `ordre`
  const [reps, setReps] = useState<DicteeMaitresseReponse[]>([]);
  const [saisie, setSaisie] = useState("");
  const [montrerMot, setMontrerMot] = useState(false); // reveal parent (voix)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<DicteeMaitresseResultat | null>(null);

  if (bank === null) {
    return (
      <div className="kk-page"><div className="kk-container" style={{ display: "flex", justifyContent: "center", padding: 32 }}>
        <Spinner />
      </div></div>
    );
  }

  if (listes.length === 0) {
    return (
      <div className="kk-page"><div className="kk-container kk-stack">
        <button className="kk-link" onClick={onExit}><ArrowLeft size={18} aria-hidden="true" /> Retour</button>
        <h1>Dictée avec papa ou maman</h1>
        <p className="kk-muted">
          Il n'y a pas encore de liste de mots active. Demande à un parent d'ajouter une
          liste dans « Les mots de la maîtresse ».
        </p>
      </div></div>
    );
  }

  const total = ordre.length;
  const motIndex = ordre[pos]; // 1-base dans liste.mots
  const motCourant = liste ? liste.mots[motIndex - 1] : "";

  async function terminer(repsFinales: DicteeMaitresseReponse[]) {
    if (!liste) return;
    setBusy(true); setErr(null);
    try {
      const r = await enregistrerDicteeMaitresse(profil.id, liste.id, mode, repsFinales);
      setRes(r);
      setPhase("result");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "L'enregistrement a échoué.");
    } finally {
      setBusy(false);
    }
  }

  function avancer(rep: DicteeMaitresseReponse) {
    const next = [...reps, rep];
    setReps(next);
    setSaisie(""); setMontrerMot(false);
    if (pos + 1 >= total) {
      void terminer(next);
    } else {
      setPos(pos + 1);
    }
  }

  // --- Ecran de configuration ---------------------------------------------
  if (phase === "config") {
    return (
      <div className="kk-page"><div className="kk-container kk-stack">
        <button className="kk-link" onClick={onExit}><ArrowLeft size={18} aria-hidden="true" /> Retour</button>
        <h1>Dictée avec papa ou maman</h1>
        <p className="kk-muted" style={{ margin: 0 }}>
          Un parent lit les mots à voix haute. L'enfant les écrit. À la fin, on corrige
          ensemble et on voit les mots à revoir.
        </p>

        <label className="kk-field">
          <span>La liste à dicter</span>
          <select className="kk-input" value={listeId} onChange={(e) => setListeId(e.target.value)}>
            {listes.map((l) => (
              <option key={l.id} value={l.id}>{l.titre} ({l.mots.length} mots)</option>
            ))}
          </select>
        </label>

        <fieldset className="kk-stack" style={{ border: "none", padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600 }}>Comment fait l'enfant ?</legend>
          <label className="kk-switch-row">
            <input type="radio" name="mode" checked={mode === "voix"} onChange={() => setMode("voix")} />
            <span>Il écrit sur l'écran (le mot reste caché).</span>
          </label>
          <label className="kk-switch-row">
            <input type="radio" name="mode" checked={mode === "papier"} onChange={() => setMode("papier")} />
            <span>Il écrit sur le cahier (dictée sur papier) : le parent coche.</span>
          </label>
        </fieldset>

        <button
          className="kk-btn kk-btn--accent kk-btn--big kk-btn--block"
          disabled={!liste || liste.mots.length === 0}
          onClick={() => { setPos(0); setReps([]); setSaisie(""); setRes(null); setPhase("run"); }}
        >
          Commencer la dictée
        </button>

        {/* Emplacement prevu (plus tard) : scan du cahier. */}
        <button className="kk-btn kk-btn--block" disabled title="Bientôt disponible">
          <Camera size={18} aria-hidden="true" /> Prendre en photo la dictée (bientôt)
        </button>
      </div></div>
    );
  }

  // --- Ecran de resultat ---------------------------------------------------
  if (phase === "result" && res) {
    return (
      <div className="kk-page"><div className="kk-container kk-stack">
        <h1>C'est corrigé !</h1>
        <div className="kk-banner kk-banner--ok">
          <span className="kk-banner__title">{messageBilanDictee(res.score_juste, res.score_total)}</span>
        </div>
        <ul className="kk-list">
          {res.mots.map((m) => (
            <li key={m.index} style={{ padding: "8px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span aria-hidden="true" style={{ fontSize: "1.3rem" }}>{m.correct ? "✅" : "✏️"}</span>
              <div>
                <strong>{m.mot}</strong>
                {!m.correct && (
                  <p className="kk-muted" style={{ margin: "2px 0 0", fontSize: "0.9rem" }}>
                    {diagnostiquerMot(m.mot, m.saisie ?? "").message}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
        {res.a_revoir.length > 0 && (
          <p className="kk-muted">
            Mots à revoir (ils reviendront en premier) : <strong>{res.a_revoir.join(", ")}</strong>.
          </p>
        )}
        <button className="kk-btn kk-btn--accent kk-btn--block" onClick={onExit}>Terminer</button>
      </div></div>
    );
  }

  // --- Ecran de dictee en cours -------------------------------------------
  return (
    <div className="kk-page"><div className="kk-container kk-stack" style={{ textAlign: "center" }}>
      <p className="kk-lead" aria-live="polite" style={{ fontWeight: 700 }}>
        Mot {pos + 1} sur {total}
      </p>

      {mode === "voix" ? (
        <>
          <p className="kk-muted">Écoute bien le mot, puis écris-le.</p>
          <div className="kk-row" style={{ justifyContent: "center" }}>
            <input
              className="kk-lettres__input"
              style={{ maxWidth: 280, fontSize: "1.3rem", textAlign: "center" }}
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && saisie.trim() !== "") avancer({ index: motIndex, saisie }); }}
              aria-label={`Mot ${pos + 1}`}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          {/* Aide PARENT discrete : revoir le mot a lire (l'enfant ne doit pas regarder). */}
          <button type="button" className="kk-btn kk-btn--ghost" onClick={() => setMontrerMot((v) => !v)}
            aria-expanded={montrerMot} style={{ fontSize: "0.85rem" }}>
            {montrerMot ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
            {" "}Parent : {montrerMot ? "cacher" : "voir"} le mot à lire
          </button>
          {montrerMot && <p className="kk-muted" style={{ fontStyle: "italic" }}>À lire : {motCourant}</p>}

          <button
            className="kk-btn kk-btn--accent kk-btn--big kk-btn--block"
            disabled={busy || saisie.trim() === ""}
            onClick={() => avancer({ index: motIndex, saisie })}
          >
            {pos + 1 >= total ? <>Terminer <Check size={20} aria-hidden="true" /></> : <>Mot suivant <ChevronRight size={20} aria-hidden="true" /></>}
          </button>
        </>
      ) : (
        <>
          <p className="kk-muted">L'enfant a écrit ce mot sur le cahier. Le parent coche.</p>
          <p className="kk-lead" style={{ fontSize: "1.8rem", fontWeight: 700 }}>{motCourant}</p>
          <label className="kk-field" style={{ textAlign: "left" }}>
            <span>Graphie de l'enfant (facultatif)</span>
            <input className="kk-input" value={saisie} onChange={(e) => setSaisie(e.target.value)}
              placeholder="ce que l'enfant a écrit" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </label>
          <div className="kk-row" style={{ justifyContent: "center", gap: 12 }}>
            <button
              className="kk-btn kk-btn--big"
              disabled={busy}
              onClick={() => avancer({ index: motIndex, juste: false, saisie: saisie || undefined })}
            >
              ✏️ À revoir
            </button>
            <button
              className="kk-btn kk-btn--accent kk-btn--big"
              disabled={busy}
              onClick={() => avancer({ index: motIndex, juste: true, saisie: saisie || undefined })}
            >
              ✅ Juste
            </button>
          </div>
        </>
      )}

      {err && <p className="kk-banner" style={{ color: "var(--kk-danger, #b00)" }}>{err}</p>}
    </div></div>
  );
}
