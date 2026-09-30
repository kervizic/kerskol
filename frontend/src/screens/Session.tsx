import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Grid3x3, Info, Keyboard } from "lucide-react";
import { Spinner } from "../components/ui";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  getStoredInputMode,
  initialInputMode,
  onAnswerZoneTouch,
  onPhysicalKey,
  prefersCoarsePointer,
  setStoredInputMode,
  toggleInputMode,
  type InputMode,
} from "../lib/inputMode";
import { AvatarView } from "../domain/avatars";
import { universDef } from "../domain/univers";
import type { Avatar, Profil } from "../lib/types";
import type { Referentiel } from "../lib/api";
import {
  createSeance,
  finishSeance,
  getExercicesCalcul,
  getMonnaie,
  getProgressionDetail,
  getTempsAujourdhuiS,
  insertReponse,
  type ReponseInsert,
} from "../lib/api";
import { enqueueReponse, flushReponses } from "../lib/reponseQueue";
import { composeSession } from "../domain/calcul/composer";
import type { SupportData } from "../domain/calcul/generator";
import {
  answerCurrent,
  createEngine,
  currentSlot,
  hintForCurrent,
  isFinished,
  progress,
  shouldAskSure,
  summary,
  type EngineState,
} from "../domain/calcul/engine";

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

// --- Persistance de la seance (reprise apres rechargement) ----------------
interface Snapshot {
  seanceId: string;
  startedAt: number;
  engine: EngineState;
  placement: Record<string, boolean>;
}
function snapKey(profilId: string): string {
  return `kerskol_seance_${profilId}`;
}
function loadSnapshot(profilId: string): Snapshot | null {
  try {
    const raw = window.sessionStorage.getItem(snapKey(profilId));
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}
function saveSnapshot(profilId: string, s: Snapshot): void {
  try {
    window.sessionStorage.setItem(snapKey(profilId), JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
function clearSnapshot(profilId: string): void {
  try {
    window.sessionStorage.removeItem(snapKey(profilId));
  } catch {
    /* ignore */
  }
}

// --- Support visuel (niveau 1) --------------------------------------------
function SupportView({ data }: { data: SupportData }) {
  if (data.kind === "rectangle") {
    const rows = Math.min(data.rows, 10);
    const cols = Math.min(data.cols, 10);
    const r = 9;
    const gap = 26;
    const w = cols * gap + 12;
    const h = rows * gap + 12;
    const dots = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        dots.push(<circle key={`${x}-${y}`} cx={12 + x * gap} cy={12 + y * gap} r={r} fill="var(--kk-accent)" />);
    return (
      <div className="kk-support">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${rows} rangees de ${cols}`}>
          {dots}
        </svg>
      </div>
    );
  }
  // Droite graduee : depart + bond(s) etiquetes. Le point d'arrivee (la reponse)
  // n'est JAMAIS etiquete.
  const from = data.from;
  const to = data.to;
  const span = Math.max(1, to - from);
  const W = 520;
  const H = 92;
  const pad = 24;
  const axisY = 62;
  const x = (v: number) => pad + ((v - from) / span) * (W - 2 * pad);

  // Graduations regulieres lisibles : vise ~10-16 intervalles avec un pas rond.
  const rawStep = span / 12;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1, rawStep))));
  const niceStep = [1, 2, 5, 10].map((m) => m * pow).find((s) => span / s <= 16) ?? pow * 10;
  const ticks: number[] = [];
  for (let v = from; v <= to + 1e-6; v += niceStep) ticks.push(Math.round(v));

  return (
    <div className="kk-support">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="droite graduee">
        <line x1={pad} y1={axisY} x2={W - pad} y2={axisY} stroke="var(--kk-border)" strokeWidth={3} />
        {ticks.map((v, i) => (
          <line key={`t${i}`} x1={x(v)} y1={axisY - 6} x2={x(v)} y2={axisY + 6} stroke="var(--kk-border)" strokeWidth={2} />
        ))}
        {data.jumps.map((j, i) => {
          const x1 = x(j.from);
          const x2 = x(j.to);
          const mx = (x1 + x2) / 2;
          return (
            <g key={`j${i}`}>
              <path
                d={`M ${x1} ${axisY - 6} Q ${mx} ${axisY - 34} ${x2} ${axisY - 6}`}
                fill="none"
                stroke="var(--kk-accent)"
                strokeWidth={3}
                markerEnd="url(#kk-arrow)"
              />
              {j.label && (
                <text x={mx} y={axisY - 36} textAnchor="middle" fontSize="17" fontWeight={700} fill="var(--kk-accent)">
                  {j.label}
                </text>
              )}
            </g>
          );
        })}
        {data.points.map((p, i) => (
          <g key={`p${i}`}>
            <circle cx={x(p.v)} cy={axisY} r={7} fill="var(--kk-accent)" />
            <text x={x(p.v)} y={axisY + 24} textAnchor="middle" fontSize="17" fontWeight={700} fill="var(--kk-text)">
              {p.label}
            </text>
          </g>
        ))}
        <defs>
          <marker id="kk-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--kk-accent)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

// Rend l'operation avec la (les) case(s) de reponse A LEUR PLACE dans l'egalite
// (« 2 + 5 = [ ] », « 7 × [ ] = 56 », « 38 ÷ 5 = [ ] reste [ ] »). Les enonces
// sans jeton (questions) restent en texte simple, la case est affichee a part.
function EquationView({
  prompt,
  f1,
  f2,
  active,
  inputMode,
  onPick,
}: {
  prompt: string;
  f1: string;
  f2: string;
  active: 1 | 2;
  inputMode: InputMode;
  onPick: (n: 1 | 2) => void;
}) {
  if (!prompt.includes("[q]") && !prompt.includes("[r]")) {
    return (
      <div className="kk-enonce" aria-live="polite">
        {prompt}
      </div>
    );
  }
  const parts = prompt.split(/(\[q\]|\[r\])/).filter((p) => p !== "");
  return (
    <div className="kk-enonce kk-eq" aria-live="polite">
      {parts.map((p, i) => {
        if (p === "[q]" || p === "[r]") {
          const slot: 1 | 2 = p === "[r]" ? 2 : 1;
          const val = slot === 2 ? f2 : f1;
          const isActive = active === slot;
          return (
            <button
              key={i}
              type="button"
              className={`kk-answer__box kk-eq__box${isActive ? " kk-answer__box--active" : ""}${
                isActive && inputMode === "keyboard" ? " kk-answer__box--caret" : ""
              }`}
              aria-label={slot === 2 ? "reste" : "reponse"}
              onClick={() => onPick(slot)}
            >
              {val || "?"}
            </button>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}

type Phase = "answering" | "sure" | "correct" | "wrong";

export function Session({
  profil,
  referentiel,
  onExit,
  onProfilChange,
}: {
  profil: Profil;
  referentiel: Referentiel;
  onExit: () => void;
  onProfilChange: (p: Profil) => void;
}) {
  const u = universDef(profil.univers);
  const av = profil.avatar as Avatar;

  const [engine, setEngine] = useState<EngineState | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [empty, setEmpty] = useState(false);
  const [f1, setF1] = useState("");
  const [f2, setF2] = useState("");
  const [active, setActive] = useState<1 | 2>(1);
  const [monnaie, setMonnaie] = useState(profil.monnaie);
  const [lastGain, setLastGain] = useState(0);
  const [done, setDone] = useState(false);
  const [tempsJourS, setTempsJourS] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>(() =>
    initialInputMode(prefersCoarsePointer(), getStoredInputMode())
  );

  const seanceId = useRef<string>("");
  const startedAt = useRef<number>(0);
  const questionStart = useRef<number>(0);
  const placement = useRef<Record<string, boolean>>({});
  const monnaieStart = useRef<number>(profil.monnaie);

  // --- Initialisation : reprise ou nouvelle seance ------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      // Rejoue d'abord les reponses en attente (reseau retabli).
      await flushReponses(insertReponse).catch(() => {});
      const snap = loadSnapshot(profil.id);
      if (snap && !isFinished(snap.engine)) {
        seanceId.current = snap.seanceId;
        startedAt.current = snap.startedAt;
        placement.current = snap.placement;
        questionStart.current = Date.now();
        if (alive) setEngine(snap.engine);
        getMonnaie(profil.id).then((m) => alive && setMonnaie(m)).catch(() => {});
        return;
      }
      try {
        const [progress_, sources] = await Promise.all([
          getProgressionDetail(profil.id),
          getExercicesCalcul(),
        ]);
        const plan = composeSession({
          competences: referentiel.competences,
          prerequis: referentiel.prerequis,
          progress: progress_,
          sources,
          seed: (Date.now() ^ 0x9e3779b9) >>> 0,
          now: Date.now(),
          classe: profil.classe,
        });
        placement.current = {};
        for (const p of progress_) placement.current[p.competence] = p.placement_termine;
        if (plan.length === 0) {
          if (alive) setEmpty(true);
          return;
        }
        const eng = createEngine(plan, (Date.now() ^ 0x85ebca6b) >>> 0);
        seanceId.current = uuid();
        startedAt.current = Date.now();
        questionStart.current = Date.now();
        monnaieStart.current = profil.monnaie;
        await createSeance(seanceId.current, profil.id).catch(() => {});
        saveSnapshot(profil.id, {
          seanceId: seanceId.current,
          startedAt: startedAt.current,
          engine: eng,
          placement: placement.current,
        });
        if (alive) setEngine(eng);
      } catch {
        if (alive) setEmpty(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  const slot = engine ? currentSlot(engine) : null;
  const ex = slot?.exercise ?? null;
  const prog = engine ? progress(engine) : { done: 0, total: 1 };

  useEffect(() => {
    // Nouvelle question : reinitialise la saisie et le chrono.
    setF1("");
    setF2("");
    setActive(1);
    questionStart.current = Date.now();
  }, [ex?.key]);

  const persist = useCallback(
    (eng: EngineState) => {
      saveSnapshot(profil.id, {
        seanceId: seanceId.current,
        startedAt: startedAt.current,
        engine: eng,
        placement: placement.current,
      });
    },
    [profil.id]
  );

  const relire = useCallback(async () => {
    try {
      const [m, prg] = await Promise.all([
        getMonnaie(profil.id),
        getProgressionDetail(profil.id),
      ]);
      setMonnaie(m);
      onProfilChange({ ...profil, monnaie: m });
      for (const p of prg) placement.current[p.competence] = p.placement_termine;
    } catch {
      /* hors ligne : la file rejouera plus tard */
    }
  }, [profil, onProfilChange]);

  // Envoie la reponse (ou la met en file si le reseau est coupe).
  const envoyer = useCallback(
    async (correct: boolean, correctionRead: boolean) => {
      if (!ex || !slot) return;
      const tooFast = Date.now() - questionStart.current;
      const row: ReponseInsert = {
        id: uuid(),
        profil_id: profil.id,
        seance_id: seanceId.current,
        competence: ex.competence,
        exercice_id: slot.source.exerciceId,
        niveau: ex.niveau,
        methode: ex.methode,
        correct,
        temps_ms: tooFast,
        aide_utilisee: false,
        correction_lue: correctionRead,
        rattrapage: ex.rattrapage,
        placement: !placement.current[ex.competence],
        repondu_le: new Date().toISOString(),
      };
      try {
        await insertReponse(row);
        await relire();
      } catch {
        enqueueReponse(row);
        // Credit optimiste local (reconcilie au prochain flush).
        const gain = tooFast < 1500 ? 0 : correct && ex.rattrapage ? 3 : correct ? 2 : correctionRead ? 1 : 0;
        setMonnaie((m) => {
          const nm = m + gain;
          onProfilChange({ ...profil, monnaie: nm });
          return nm;
        });
      }
    },
    [ex, slot, profil, relire, onProfilChange]
  );

  const value = ex && ex.fields === 2 ? { q: f1, r: f2 } : { q: f1, r: "" };

  const isCorrect = useCallback((): boolean => {
    if (!ex) return false;
    if (ex.fields === 2) {
      return Number(value.q) === ex.answer && Number(value.r) === (ex.reste ?? -1);
    }
    return value.q !== "" && Number(value.q) === ex.answer;
  }, [ex, value.q, value.r]);

  const canValidate = ex ? (ex.fields === 2 ? f1 !== "" && f2 !== "" : f1 !== "") : false;

  const doValidate = useCallback(() => {
    if (!engine || !ex || !canValidate) return;
    const correct = isCorrect();
    if (correct) {
      const temps = Date.now() - questionStart.current;
      setLastGain(temps < 1500 ? 0 : ex.rattrapage ? 3 : 2); // meme bareme que le trigger
      void envoyer(true, false);
      setPhase("correct");
    } else {
      setPhase("wrong");
    }
  }, [engine, ex, canValidate, isCorrect, envoyer]);

  // « Tu es sure de toi ? » ~1 sur 6, avant de valider.
  const onValiderClick = useCallback(() => {
    if (!engine || !canValidate) return;
    if (phase === "answering" && shouldAskSure(engine)) {
      setPhase("sure");
      return;
    }
    doValidate();
  }, [engine, canValidate, phase, doValidate]);

  const advance = useCallback(
    (correct: boolean, correctionRead: boolean) => {
      if (!engine) return;
      const { state } = answerCurrent(engine, correct, { correctionRead });
      persist(state);
      if (isFinished(state)) {
        void finir(state);
      } else {
        setEngine(state);
        setPhase("answering");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, persist]
  );

  const finir = useCallback(
    async (state: EngineState) => {
      const dureeS = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      const gained = Math.max(0, monnaie - monnaieStart.current);
      await finishSeance(seanceId.current, { duree_s: dureeS, monnaie_gagnee: gained }).catch(() => {});
      await flushReponses(insertReponse).catch(() => {});
      const deja = await getTempsAujourdhuiS(profil.id).catch(() => 0);
      setTempsJourS(deja + dureeS);
      setEngine(state);
      clearSnapshot(profil.id);
      setDone(true);
    },
    [monnaie, profil.id]
  );

  // --- Saisie (pave + clavier) -------------------------------------------
  const typeDigit = useCallback(
    (d: string) => {
      if (phase !== "answering") return;
      const setter = ex?.fields === 2 && active === 2 ? setF2 : setF1;
      setter((v) => (v.length >= 6 ? v : v + d));
    },
    [phase, ex, active]
  );
  const backspace = useCallback(() => {
    if (phase !== "answering") return;
    const setter = ex?.fields === 2 && active === 2 ? setF2 : setF1;
    setter((v) => v.slice(0, -1));
  }, [phase, ex, active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isDigit = e.key >= "0" && e.key <= "9";
      const isNav = e.key === "Backspace" || e.key === "Enter" || e.key === "Tab";
      // Frappe clavier physique : bascule vers la saisie clavier (masque le pave).
      if ((isDigit || isNav) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setInputMode((m) => onPhysicalKey(m));
      }
      if (isDigit) typeDigit(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Enter") {
        if (phase === "answering") onValiderClick();
        else if (phase === "correct") advance(true, false);
      } else if (e.key === "Tab" && ex?.fields === 2) {
        e.preventDefault();
        setActive((a) => (a === 1 ? 2 : 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typeDigit, backspace, phase, onValiderClick, advance, ex]);

  // Toucher la zone de reponse reaffiche le pave (bascule automatique et
  // reversible). Utilise aussi bien pour le clic souris que le toucher.
  const touchAnswerZone = useCallback(() => {
    setInputMode((m) => onAnswerZoneTouch(m));
  }, []);

  // Bouton discret : force explicitement l'autre mode, memorise par appareil.
  const handleToggleInputMode = useCallback(() => {
    setInputMode((m) => {
      const next = toggleInputMode(m);
      setStoredInputMode(next);
      return next;
    });
  }, []);

  // ------------------------------- Rendu ---------------------------------
  if (empty) {
    return (
      <div className="kk-page kk-center">
        <div className="kk-container" style={{ textAlign: "center", maxWidth: 480 }}>
          <div className="kk-card kk-stack">
            <h1>Rien a reviser pour l'instant</h1>
            <p className="kk-lead" style={{ margin: "0 auto" }}>
              Reviens un peu plus tard, tes prochains exercices se preparent.
            </p>
            <button className="kk-btn kk-btn--accent kk-btn--block" onClick={onExit}>
              Retour au village
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (done && engine) {
    return (
      <EndScreen
        profil={profil}
        monnaieGained={Math.max(0, monnaie - monnaieStart.current)}
        stats={summary(engine)}
        tempsJourS={tempsJourS}
        onExit={onExit}
      />
    );
  }

  if (!engine || !ex) {
    return (
      <div className="kk-page kk-center">
        <Spinner />
      </div>
    );
  }

  const hint = hintForCurrent(engine);

  return (
    <div className="kk-seance">
      <div className="kk-seance__top">
        <button className="kk-avatar-corner" onClick={onExit} aria-label="Quitter la seance" title="Retour au village">
          <AvatarView forme={av?.forme} couleur={av?.couleur || "#E06A00"} size={40} />
        </button>
        <div className="kk-progress" role="progressbar" aria-valuenow={prog.done} aria-valuemax={prog.total}>
          <div className="kk-progress__fill" style={{ width: `${(prog.done / Math.max(1, prog.total)) * 100}%` }} />
        </div>
        <span className="kk-money">
          <u.MonnaieIcon size={20} />
          {monnaie}
        </span>
        <button
          className="kk-icon-btn"
          aria-label={inputMode === "pad" ? "Basculer en saisie clavier" : "Reafficher le pave numerique"}
          title={inputMode === "pad" ? "Basculer en saisie clavier" : "Reafficher le pave numerique"}
          onClick={handleToggleInputMode}
        >
          {inputMode === "pad" ? <Keyboard size={22} aria-hidden="true" /> : <Grid3x3 size={22} aria-hidden="true" />}
        </button>
        <ThemeToggle />
      </div>

      <main className="kk-seance__main">
        {ex.support !== "aucun" && ex.supportData && <SupportView data={ex.supportData} />}

        <EquationView
          prompt={ex.prompt}
          f1={f1}
          f2={f2}
          active={active}
          inputMode={inputMode}
          onPick={(n) => {
            setActive(n);
            touchAnswerZone();
          }}
        />

        {hint && phase === "answering" && (
          <p className="kk-muted" style={{ textAlign: "center" }}>
            <Info size={16} aria-hidden="true" /> Prends ton temps, tu peux t'aider de ta methode.
          </p>
        )}

        {phase === "answering" || phase === "sure" ? (
          <>
            {!ex.prompt.includes("[q]") && !ex.prompt.includes("[r]") && (
              <div className="kk-answer">
                {ex.fields === 2 ? (
                  <>
                    <div>
                      <span className="kk-answer__label">resultat</span>
                      <button
                        className={`kk-answer__box${active === 1 ? " kk-answer__box--active" : ""}${
                          active === 1 && inputMode === "keyboard" ? " kk-answer__box--caret" : ""
                        }`}
                        aria-label="resultat"
                        onClick={() => {
                          setActive(1);
                          touchAnswerZone();
                        }}
                      >
                        {f1 || "?"}
                      </button>
                    </div>
                    <div>
                      <span className="kk-answer__label">reste</span>
                      <button
                        className={`kk-answer__box${active === 2 ? " kk-answer__box--active" : ""}${
                          active === 2 && inputMode === "keyboard" ? " kk-answer__box--caret" : ""
                        }`}
                        aria-label="reste"
                        onClick={() => {
                          setActive(2);
                          touchAnswerZone();
                        }}
                      >
                        {f2 || "?"}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className={`kk-answer__box kk-answer__box--active${
                      inputMode === "keyboard" ? " kk-answer__box--caret" : ""
                    }`}
                    aria-label="reponse"
                    onClick={touchAnswerZone}
                  >
                    {f1 || "?"}
                  </button>
                )}
              </div>
            )}

            {phase === "sure" ? (
              <div className="kk-sure kk-stack">
                <p className="kk-lead" style={{ margin: "0 auto" }}>Tu es sure de toi ?</p>
                <div className="kk-row" style={{ justifyContent: "center" }}>
                  <button className="kk-btn" onClick={() => setPhase("answering")}>Je verifie</button>
                  <button className="kk-btn kk-btn--accent" onClick={doValidate}>Oui, je valide</button>
                </div>
              </div>
            ) : inputMode === "pad" ? (
              <div className="kk-pad">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button key={d} onClick={() => typeDigit(d)} aria-label={d}>{d}</button>
                ))}
                <button onClick={backspace} aria-label="Effacer" style={{ fontSize: "1.5rem" }}>⌫</button>
                <button onClick={() => typeDigit("0")} aria-label="0">0</button>
                <button
                  onClick={onValiderClick}
                  disabled={!canValidate}
                  aria-label="Valider"
                  style={{ background: "var(--kk-accent)", color: "var(--kk-on-accent)", borderColor: "transparent" }}
                >
                  <Check size={26} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </>
        ) : phase === "correct" ? (
          <div className="kk-banner kk-banner--ok">
            <span className="kk-banner__title"><Check size={22} aria-hidden="true" /> Bravo, c'est juste !</span>
            {lastGain > 0 && (
              <span className="kk-banner__gain"><u.MonnaieIcon size={18} /> +{lastGain} {u.monnaie}</span>
            )}
            <button className="kk-btn kk-btn--accent kk-btn--block" onClick={() => advance(true, false)}>Continuer</button>
          </div>
        ) : (
          <div className="kk-banner kk-banner--ko">
            <span className="kk-banner__title">Ce n'est pas ca, voici comment trouver</span>
            <p style={{ margin: 0 }}>{ex.correction}</p>
            <button
              className="kk-btn kk-btn--accent kk-btn--block"
              onClick={() => {
                void envoyer(false, true);
                advance(false, true);
              }}
            >
              J'ai compris
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ------------------------------- Fin de seance -----------------------------
function EndScreen({
  profil,
  monnaieGained,
  stats,
  tempsJourS,
  onExit,
}: {
  profil: Profil;
  monnaieGained: number;
  stats: { answered: number; correct: number; wrong: number };
  tempsJourS: number;
  onExit: () => void;
}) {
  const u = universDef(profil.univers);
  const min = Math.round(tempsJourS / 60);
  const limite = profil.limite_jour_min;
  const restant = limite != null ? Math.max(0, limite - min) : null;
  const atteinte = limite != null && min >= limite;

  return (
    <div className="kk-page kk-center">
      <div className="kk-container" style={{ textAlign: "center", maxWidth: 520 }}>
        <div className="kk-card kk-stack">
          <div style={{ fontSize: "3rem" }} aria-hidden="true">🎉</div>
          <h1>Belle seance, {profil.surnom} !</h1>
          <p className="kk-lead" style={{ margin: "0 auto" }}>
            {stats.correct} bonnes reponses sur {stats.answered}. Ton village grandit :
            de nouvelles pierres sont posees.
          </p>
          <span className="kk-money" style={{ margin: "0 auto" }}>
            <u.MonnaieIcon size={22} /> +{monnaieGained} {u.monnaie}
          </span>
          <p className="kk-muted">
            Temps joue aujourd'hui : {min} min
            {restant != null && !atteinte ? ` (il te reste ${restant} min)` : ""}.
          </p>
          {atteinte && (
            <p className="kk-lead" style={{ margin: "0 auto" }}>
              Tu as atteint ton temps du jour. Tu peux t'arreter et revenir demain,
              ou continuer un peu si tu veux.
            </p>
          )}
          <button className="kk-btn kk-btn--accent kk-btn--big kk-btn--block" onClick={onExit}>
            Retour au village
          </button>
        </div>
      </div>
    </div>
  );
}
