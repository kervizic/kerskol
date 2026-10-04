import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Pause, Play, Timer, X } from "lucide-react";
import { Spinner } from "../components/ui";
import { ThemeToggle } from "../components/ThemeToggle";
import { AvatarView } from "../domain/avatars";
import { universDef } from "../domain/univers";
import type { Profil } from "../lib/types";
import {
  createSeance,
  finishSeance,
  getExercicesCalcul,
  getProgression,
  insertReponse,
  plafondCode,
  terminerDefi,
  type DefiResult,
  type ReponseInsert,
} from "../lib/api";
import { enqueueReponse } from "../lib/reponseQueue";
import {
  buildDefiExercise,
  DEFI_DUREE_S,
  eligibleThemes,
  type EligibleTheme,
} from "../domain/calcul/defi";
import type { ExCalcul, GeneratedExercise } from "../domain/calcul/generator";

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

type Stage = "loading" | "choose" | "play" | "done";

export function DefiChrono({
  profil,
  onExit,
  onProfilChange,
}: {
  profil: Profil;
  onExit: () => void;
  onProfilChange: (p: Profil) => void;
}) {
  const u = universDef(profil.univers);
  const reduced = useMemo(prefersReducedMotion, []);

  const [stage, setStage] = useState<Stage>("loading");
  const [sources, setSources] = useState<ExCalcul[]>([]);
  const [themes, setThemes] = useState<EligibleTheme[]>([]);
  const [current, setCurrent] = useState<EligibleTheme | null>(null);

  const [ex, setEx] = useState<GeneratedExercise | null>(null);
  const [val, setVal] = useState("");
  const [flash, setFlash] = useState<{ correct: boolean; answer: number } | null>(null);
  const [goodCount, setGoodCount] = useState(0); // affichage local (le serveur fait foi)
  const [remainingMs, setRemainingMs] = useState(DEFI_DUREE_S * 1000);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<DefiResult | null>(null);
  const [limite, setLimite] = useState(false);

  const seanceId = useRef("");
  const startedAt = useRef(0);
  const deadline = useRef(0);
  const pausedRemaining = useRef(DEFI_DUREE_S * 1000);
  const questionStart = useRef(0);
  const seedCounter = useRef(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishing = useRef(false);

  // --- Chargement : progression + sources -> themes eligibles --------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [prog, srcs] = await Promise.all([
          getProgression(profil.id),
          getExercicesCalcul(),
        ]);
        if (!alive) return;
        setSources(srcs);
        setThemes(eligibleThemes(prog));
        setStage("choose");
      } catch {
        if (alive) {
          setThemes([]);
          setStage("choose");
        }
      }
    })();
    return () => {
      alive = false;
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  const nextExercise = useCallback(
    (eligible: EligibleTheme) => {
      seedCounter.current += 1;
      const seed = ((Date.now() ^ (seedCounter.current * 0x85ebca6b)) >>> 0) + seedCounter.current;
      const g = buildDefiExercise(sources, eligible.competences, seed, {
        hero: profil.surnom,
        univers: profil.univers,
      });
      setEx(g);
      setVal("");
      setFlash(null);
      questionStart.current = Date.now();
    },
    [sources, profil.surnom, profil.univers]
  );

  const finish = useCallback(async () => {
    if (finishing.current || !current) return;
    finishing.current = true;
    setStage("done");
    const dureeS = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    await finishSeance(seanceId.current, { duree_s: dureeS, monnaie_gagnee: 0 }).catch(() => {});
    try {
      const res = await terminerDefi(seanceId.current, current.theme.id);
      setResult(res);
      if (res.monnaie != null) onProfilChange({ ...profil, monnaie: res.monnaie });
    } catch {
      setResult({ score: goodCount, record: goodCount, nouveau_record: false, credit: 0, monnaie: null });
    }
  }, [current, profil, onProfilChange, goodCount]);

  // --- Minuteur (barre qui se vide) ---------------------------------------
  useEffect(() => {
    if (stage !== "play" || paused) return;
    const tick = () => {
      const left = deadline.current - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        void finish();
      } else {
        setRemainingMs(left);
      }
    };
    // Mouvement discret si prefers-reduced-motion (pas de drain fluide).
    const period = reduced ? 1000 : 100;
    const h = window.setInterval(tick, period);
    tick();
    return () => window.clearInterval(h);
  }, [stage, paused, reduced, finish]);

  function startTheme(t: EligibleTheme) {
    setCurrent(t);
    seanceId.current = uuid();
    startedAt.current = Date.now();
    deadline.current = Date.now() + DEFI_DUREE_S * 1000;
    pausedRemaining.current = DEFI_DUREE_S * 1000;
    setRemainingMs(DEFI_DUREE_S * 1000);
    setGoodCount(0);
    setPaused(false);
    finishing.current = false;
    void createSeance(seanceId.current, profil.id).catch(() => {});
    setStage("play");
    nextExercise(t);
  }

  // Envoi d'une reponse (mode defi) : le serveur recalcule et enregistre.
  const sendAnswer = useCallback(
    (reponse: number) => {
      if (!ex) return;
      const row: ReponseInsert = {
        id: uuid(),
        profil_id: profil.id,
        seance_id: seanceId.current,
        competence: ex.competence,
        exercice_id: ex.exerciceId,
        niveau: ex.niveau,
        methode: ex.methode,
        op: ex.verif.op,
        a: ex.verif.a,
        b: ex.verif.b,
        op2: ex.verif.op2 ?? null,
        c: ex.verif.c ?? null,
        reponse,
        reste: null,
        fields: 1,
        temps_ms: Date.now() - questionStart.current,
        correction_lue: false,
        rattrapage: false,
        placement: false,
        repondu_le: new Date().toISOString(),
        mode: "defi",
      };
      insertReponse(row).catch((e) => {
        if (plafondCode(e)) {
          setLimite(true);
          void finish();
          return;
        }
        enqueueReponse(row); // reseau coupe : rejeu plus tard (sans effet progression)
      });
    },
    [ex, profil.id, finish]
  );

  // Validation d'une reponse : feedback bref puis exercice suivant (pas de
  // penalite de temps ; une erreur montre la bonne reponse).
  const submit = useCallback(
    (reponse: number) => {
      if (!ex || !current || flash || stage !== "play") return;
      const correct = reponse === ex.answer;
      sendAnswer(reponse);
      if (correct) setGoodCount((n) => n + 1);
      setFlash({ correct, answer: ex.answer });
      const delay = correct ? 450 : 1300;
      flashTimer.current = setTimeout(() => {
        if (deadline.current - Date.now() <= 0) void finish();
        else nextExercise(current);
      }, delay);
    },
    [ex, current, flash, stage, sendAnswer, nextExercise, finish]
  );

  const saisie = ex?.saisie ?? "clavier";
  const canValidate = val !== "";
  const submitClavier = useCallback(() => {
    if (canValidate) submit(Number(val));
  }, [canValidate, val, submit]);

  // Clavier physique (saisie clavier uniquement).
  useEffect(() => {
    if (stage !== "play" || saisie !== "clavier") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key >= "0" && e.key <= "9") setVal((v) => (v.length >= 6 ? v : v + e.key));
      else if (e.key === "Backspace") setVal((v) => v.slice(0, -1));
      else if (e.key === "Enter" && val !== "") submit(Number(val));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, saisie, val, submit]);

  // ------------------------------- Rendus --------------------------------
  if (stage === "loading") {
    return (
      <div className="kk-page kk-center">
        <Spinner />
      </div>
    );
  }

  if (stage === "choose") {
    return (
      <div className="kk-page kk-center">
        <div className="kk-container" style={{ maxWidth: 520 }}>
          <div className="kk-card kk-stack">
            <div className="kk-row" style={{ alignItems: "center" }}>
              <Timer size={28} aria-hidden="true" />
              <h1 style={{ margin: 0 }}>Défi chrono</h1>
            </div>
            {themes.length === 0 ? (
              <>
                <p className="kk-lead">
                  Continue tes séances, le défi arrive bientôt&nbsp;! Tu pourras
                  jouer dès que tu maîtrises bien une famille de calculs.
                </p>
                <button className="kk-btn kk-btn--accent kk-btn--block" onClick={onExit}>
                  Retour à mon village
                </button>
              </>
            ) : (
              <>
                <p className="kk-lead" style={{ margin: 0 }}>
                  {DEFI_DUREE_S} secondes, un maximum de bonnes réponses. Choisis
                  ton défi&nbsp;:
                </p>
                <div className="kk-stack">
                  {themes.map((t) => (
                    <button
                      key={t.theme.id}
                      className="kk-btn kk-btn--accent kk-btn--big kk-btn--block"
                      onClick={() => startTheme(t)}
                    >
                      {t.theme.label}
                    </button>
                  ))}
                </div>
                <button className="kk-btn kk-btn--block" onClick={onExit}>
                  Plus tard
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    const score = result?.score ?? goodCount;
    const record = result?.record ?? score;
    const nouveau = result?.nouveau_record ?? false;
    return (
      <div className="kk-page kk-center">
        <div className="kk-container" style={{ maxWidth: 520, textAlign: "center" }}>
          <div className="kk-card kk-stack">
            <div style={{ fontSize: "3rem" }} aria-hidden="true">{nouveau ? "🏆" : "🎉"}</div>
            {limite ? (
              <h1>Pause&nbsp;! Reviens un peu plus tard.</h1>
            ) : nouveau ? (
              <h1>Nouveau record&nbsp;!</h1>
            ) : (
              <h1>Bravo, {score} bonne{score > 1 ? "s" : ""} réponse{score > 1 ? "s" : ""}&nbsp;!</h1>
            )}
            <p className="kk-lead" style={{ margin: "0 auto" }}>
              {nouveau
                ? `Tu as battu ton record avec ${score} bonne${score > 1 ? "s" : ""} réponse${score > 1 ? "s" : ""} !`
                : `Ton record sur ce défi : ${record}.`}
            </p>
            {result && result.credit > 0 && (
              <span className="kk-money" style={{ margin: "0 auto" }}>
                <u.MonnaieIcon size={22} /> +{result.credit} {u.monnaie}
              </span>
            )}
            <div className="kk-row" style={{ justifyContent: "center" }}>
              {current && !limite && (
                <button className="kk-btn kk-btn--accent" onClick={() => startTheme(current)}>
                  Rejouer
                </button>
              )}
              <button className="kk-btn kk-btn--block" onClick={onExit}>
                Retour à mon village
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- stage === "play" ---------------------------------------------------
  const pct = Math.max(0, Math.min(100, (remainingMs / (DEFI_DUREE_S * 1000)) * 100));
  const secondes = Math.ceil(remainingMs / 1000);

  function pauseToggle() {
    if (paused) {
      deadline.current = Date.now() + pausedRemaining.current;
      setPaused(false);
    } else {
      pausedRemaining.current = Math.max(0, deadline.current - Date.now());
      setPaused(true);
    }
  }

  return (
    <div className="kk-seance">
      <div className="kk-seance__top">
        <button className="kk-avatar-corner" onClick={onExit} aria-label="Quitter le défi" title="Quitter le défi">
          <AvatarView avatar={profil.avatar} size={40} />
        </button>
        <div
          className="kk-defi-timer"
          role="timer"
          aria-label={`Temps restant : ${secondes} secondes`}
        >
          <div className="kk-defi-timer__fill" style={{ width: `${pct}%`, transition: reduced ? "none" : "width 0.1s linear" }} />
        </div>
        <span className="kk-money" aria-label={`${goodCount} bonnes réponses`}>
          <Check size={18} aria-hidden="true" /> {goodCount}
        </span>
        <button className="kk-icon-btn" onClick={pauseToggle} aria-label={paused ? "Reprendre" : "Pause"} title={paused ? "Reprendre" : "Pause"}>
          {paused ? <Play size={22} aria-hidden="true" /> : <Pause size={22} aria-hidden="true" />}
        </button>
        <ThemeToggle />
      </div>

      <main className="kk-seance__main">
        {paused ? (
          <div className="kk-card kk-stack" style={{ textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
            <h2 style={{ margin: 0 }}>Pause</h2>
            <p className="kk-muted">Tu peux reprendre quand tu veux, rien n'est perdu.</p>
            <button className="kk-btn kk-btn--accent kk-btn--block" onClick={pauseToggle}>
              <Play size={18} aria-hidden="true" /> Reprendre
            </button>
            <button className="kk-btn kk-btn--block" onClick={() => void finish()}>
              <X size={18} aria-hidden="true" /> Arrêter le défi
            </button>
          </div>
        ) : !ex ? (
          <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
            <Spinner />
          </div>
        ) : (
          <>
            <PromptView prompt={ex.prompt} val={val} />

            {flash ? (
              <div className={`kk-banner ${flash.correct ? "kk-banner--ok" : "kk-banner--ko"}`} aria-live="polite">
                <span className="kk-banner__title">
                  {flash.correct ? (
                    <><Check size={22} aria-hidden="true" /> Bravo&nbsp;!</>
                  ) : (
                    <>Presque&nbsp;! La réponse était {flash.answer}.</>
                  )}
                </span>
              </div>
            ) : saisie === "compare" ? (
              <div className="kk-compare">
                <span className="kk-compare__num">{ex.verif.a}</span>
                <div className="kk-compare__signs">
                  {[{ v: 0, s: "<" }, { v: 1, s: "=" }, { v: 2, s: ">" }].map((o) => (
                    <button key={o.v} type="button" className="kk-btn kk-compare__sign" onClick={() => submit(o.v)} aria-label={o.s}>
                      {o.s}
                    </button>
                  ))}
                </div>
                <span className="kk-compare__num">{ex.verif.b}</span>
              </div>
            ) : saisie === "qcm" && ex.options ? (
              <div className="kk-qcm">
                {ex.options.map((o, i) => (
                  <button key={i} type="button" className="kk-btn kk-qcm__opt" onClick={() => submit(o.value)}>
                    {o.label}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="kk-pad">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                    <button key={d} onClick={() => setVal((v) => (v.length >= 6 ? v : v + d))} aria-label={d}>{d}</button>
                  ))}
                  <button onClick={() => setVal((v) => v.slice(0, -1))} aria-label="Effacer" style={{ fontSize: "1.5rem" }}>⌫</button>
                  <button onClick={() => setVal((v) => (v.length >= 6 ? v : v + "0"))} aria-label="0">0</button>
                  <button
                    onClick={submitClavier}
                    disabled={!canValidate}
                    aria-label="Valider"
                    style={{ background: "var(--kk-accent)", color: "var(--kk-on-accent)", borderColor: "transparent" }}
                  >
                    <Check size={26} aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Affiche l'enonce ; si « [q] » est present (ex. « 7 × 3 = [q] »), on remplace
// par la saisie en cours, sinon on montre une case separee sous le texte.
function PromptView({ prompt, val }: { prompt: string; val: string }) {
  if (prompt.includes("[q]") || prompt.includes("[r]")) {
    const parts = prompt.split(/(\[q\]|\[r\])/).filter((p) => p !== "");
    return (
      <div className="kk-enonce kk-eq" aria-live="polite">
        {parts.map((p, i) =>
          p === "[q]" || p === "[r]" ? (
            <span key={i} className="kk-answer__box kk-eq__box kk-answer__box--active">{val || "?"}</span>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </div>
    );
  }
  return (
    <>
      <div className="kk-enonce" aria-live="polite">{prompt}</div>
      <div className="kk-answer">
        <span className="kk-answer__box kk-answer__box--active">{val || "?"}</span>
      </div>
    </>
  );
}
