// Lecteur « lecture rythmee » : la voix joue a vitesse naturelle, groupe par
// groupe, avec des silences inseres entre les groupes (plutot que de ralentir
// l'audio). Modes CP / CE1 / CE2 / CM, pause reglable, espacement des mots
// reglable, surlignage du groupe et du mot lus, toucher un mot pour l'entendre.
//
// N'est MONTE que si le texte dispose d'un audio + de timings valides (QC). La
// logique PURE (decoupage, liaisons, sequenceur) est testee dans
// domain/francais/lecture/. Ici : branchement React + audio (DOM).

import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2, Play, Pause, RotateCcw } from "lucide-react";
import type { BiblioTexte } from "../domain/francais/bibliotheque";
import { texteEnTokens, normaliser } from "../domain/francais/lecture/tokenize";
import { decouper, type ModeLecture } from "../domain/francais/lecture/grouping";
import {
  Sequenceur,
  horlogeReelle,
  pauseParDefaut,
  type EtatLecture,
} from "../domain/francais/lecture/sequencer";
import {
  chargerReglages,
  enregistrerReglages,
  vitesseDe,
  PAUSE_MIN,
  PAUSE_MAX,
  type ReglagesLecture,
  type Espacement,
} from "../domain/francais/lecture/reglages";
import { timingsValides, type TimingsTexte } from "../domain/francais/lecture/timings";
import {
  chargerManifest,
  chargerTimings,
  creerLecteur,
  type LecteurTranches,
} from "../lib/voix/lectureAudio";
import { markUserActivated } from "../lib/voix/player";

const MODE_LABELS: Record<ModeLecture, string> = {
  cp: "Mot à mot",
  ce1: "Petits groupes",
  ce2: "Groupes de sens",
  cm: "En continu",
};

const ESPACEMENT_LABELS: Record<Espacement, string> = {
  normal: "Normal",
  large: "Large",
  "tres-large": "Très large",
};

interface Props {
  texte: BiblioTexte;
  profilId: string;
  classe: string;
}

export function LecteurRythme({ texte, profilId, classe }: Props) {
  const tokens = useMemo(() => texteEnTokens(texte.corps), [texte]);
  const [timings, setTimings] = useState<TimingsTexte | null>(null);
  const [reglages, setReglages] = useState<ReglagesLecture>(() =>
    chargerReglages(profilId, classe)
  );
  const [etat, setEtat] = useState<EtatLecture>("arret");
  const [segActif, setSegActif] = useState(-1);
  const [motActif, setMotActif] = useState(-1);

  const lecteurRef = useRef<LecteurTranches | null>(null);
  const seqRef = useRef<Sequenceur | null>(null);

  const segments = useMemo(() => decouper(tokens, reglages.mode), [tokens, reglages.mode]);
  const timingMap = useMemo(
    () => new Map((timings?.mots ?? []).map((m) => [m.index, m])),
    [timings]
  );
  const tokensSegmentActif = useMemo(() => {
    const s = segments[segActif];
    return s ? new Set(s.tokens) : new Set<number>();
  }, [segments, segActif]);

  // Chargement audio + timings (uniquement si le manifeste declare ce texte).
  useEffect(() => {
    let annule = false;
    (async () => {
      const manifest = await chargerManifest();
      if (annule || !manifest.textes.includes(texte.id)) return;
      const t = await chargerTimings(texte.id);
      if (annule || !t) return;
      // Garde-fou : l'alignement doit couvrir exactement le texte affiche.
      if (!timingsValides(t, tokens.map((tk) => tk.mot), normaliser)) return;
      setTimings(t);
    })();
    return () => {
      annule = true;
    };
  }, [texte.id, tokens]);

  // Lecteur audio (un par texte).
  useEffect(() => {
    if (!timings) return;
    const lec = creerLecteur(timings);
    lecteurRef.current = lec;
    return () => {
      seqRef.current?.stop();
      seqRef.current = null;
      lec.detruire();
      lecteurRef.current = null;
      setEtat("arret");
      setSegActif(-1);
      setMotActif(-1);
    };
  }, [timings]);

  // Stoppe la lecture si on change de mode (les groupes changent).
  useEffect(() => {
    seqRef.current?.stop();
    seqRef.current = null;
    setEtat("arret");
    setSegActif(-1);
    setMotActif(-1);
  }, [reglages.mode]);

  function majReglages(patch: Partial<ReglagesLecture>) {
    setReglages((prev) => {
      const suivant = { ...prev, ...patch };
      enregistrerReglages(profilId, suivant);
      // pause / vitesse peuvent changer a chaud
      seqRef.current?.reglages(suivant.pauseMs, vitesseDe(suivant));
      return suivant;
    });
  }

  function construireSequenceur(): Sequenceur | null {
    const lecteur = lecteurRef.current;
    if (!lecteur) return null;
    const seq = new Sequenceur(segments, timingMap, {
      pauseMs: reglages.pauseMs,
      vitesse: vitesseDe(reglages),
      horloge: horlogeReelle(),
      lecteur,
      onSegment: (i) => {
        setSegActif(i);
        setMotActif(-1);
      },
      onMot: (i) => setMotActif(i),
      onFin: () => {
        setEtat("arret");
        setSegActif(-1);
        setMotActif(-1);
      },
    });
    return seq;
  }

  function surPrincipal() {
    markUserActivated();
    if (etat === "lecture") {
      seqRef.current?.pause();
      setEtat("pause");
      return;
    }
    if (etat === "pause") {
      seqRef.current?.reprendre();
      setEtat("lecture");
      return;
    }
    // arret -> demarrer
    const seq = construireSequenceur();
    if (!seq) return;
    seqRef.current = seq;
    seq.demarrer();
    setEtat("lecture");
  }

  function surRecommencer() {
    markUserActivated();
    let seq = seqRef.current;
    if (!seq) {
      seq = construireSequenceur();
      if (!seq) return;
      seqRef.current = seq;
    }
    seq.recommencer();
    setEtat("lecture");
  }

  function surToucherMot(tokenIndex: number) {
    const lecteur = lecteurRef.current;
    const m = timingMap.get(tokenIndex);
    if (!lecteur || !m) return;
    markUserActivated();
    // la lecture suivie prend le dessus si en cours : on met en pause d'abord
    if (etat === "lecture") {
      seqRef.current?.pause();
      setEtat("pause");
    }
    setMotActif(tokenIndex);
    lecteur.jouer(m.debut_ms, m.fin_ms, 1);
  }

  if (!timings) {
    // Pas d'audio pour ce texte : rendu statique (comportement historique).
    return (
      <article className="kk-biblio__texte" aria-label={`texte : ${texte.titre}`}>
        {texte.corps.map((para, i) => (
          <p key={i} className="kk-biblio__para">
            {para}
          </p>
        ))}
      </article>
    );
  }

  const audioDispo = Boolean(timings);
  const labelPrincipal =
    etat === "lecture" ? "Pause" : etat === "pause" ? "Reprendre" : "Écouter";

  // Rendu du texte par paragraphes / vers, mot par mot (surlignage + toucher).
  const paras: number[] = [];
  for (const tk of tokens) if (!paras.includes(tk.para)) paras.push(tk.para);

  return (
    <div className="kk-lr">
      {/* Barre de controles (cibles >= 44 px) */}
      <div className="kk-lr__controls" role="group" aria-label="Lecture audio">
        <button type="button" className="kk-btn kk-lr__play" onClick={surPrincipal} disabled={!audioDispo}>
          {etat === "lecture" ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
          {labelPrincipal}
        </button>
        <button
          type="button"
          className="kk-btn kk-lr__restart"
          onClick={surRecommencer}
          disabled={!audioDispo}
        >
          <RotateCcw size={20} aria-hidden="true" /> Recommencer
        </button>
      </div>

      {/* Mode de lecture */}
      <div className="kk-lr__row">
        <span className="kk-lr__label">Découpage</span>
        <div className="kk-lr__segmented" role="group" aria-label="Mode de lecture">
          {(Object.keys(MODE_LABELS) as ModeLecture[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`kk-lr__opt${reglages.mode === m ? " kk-lr__opt--on" : ""}`}
              aria-pressed={reglages.mode === m}
              onClick={() => majReglages({ mode: m, pauseMs: pauseParDefaut(m) })}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Pause entre les groupes */}
      <div className="kk-lr__row">
        <label className="kk-lr__label" htmlFor={`pause-${texte.id}`}>
          Pause : {reglages.pauseMs} ms
        </label>
        <input
          id={`pause-${texte.id}`}
          className="kk-lr__slider"
          type="range"
          min={PAUSE_MIN}
          max={PAUSE_MAX}
          step={50}
          value={reglages.pauseMs}
          onChange={(e) => majReglages({ pauseMs: Number(e.target.value) })}
        />
      </div>

      {/* Espacement des mots */}
      <div className="kk-lr__row">
        <span className="kk-lr__label">Espacement</span>
        <div className="kk-lr__segmented" role="group" aria-label="Espacement des mots">
          {(Object.keys(ESPACEMENT_LABELS) as Espacement[]).map((e) => (
            <button
              key={e}
              type="button"
              className={`kk-lr__opt${reglages.espacement === e ? " kk-lr__opt--on" : ""}`}
              aria-pressed={reglages.espacement === e}
              onClick={() => majReglages({ espacement: e })}
            >
              {ESPACEMENT_LABELS[e]}
            </button>
          ))}
        </div>
      </div>

      {/* Ralenti leger (mode continu uniquement) */}
      {reglages.mode === "cm" && (
        <div className="kk-lr__row">
          <label className="kk-lr__check">
            <input
              type="checkbox"
              checked={reglages.ralenti}
              onChange={(e) => majReglages({ ralenti: e.target.checked })}
            />
            Lecture un peu plus lente
          </label>
        </div>
      )}

      {/* Texte interactif */}
      <article
        className={`kk-biblio__texte kk-lr__texte kk-lr__texte--${reglages.espacement}`}
        aria-label={`texte : ${texte.titre}`}
      >
        {paras.map((pi) => {
          const tokensPara = tokens.filter((t) => t.para === pi);
          const lignes: number[] = [];
          for (const t of tokensPara) if (!lignes.includes(t.ligne)) lignes.push(t.ligne);
          return (
            <p key={pi} className="kk-lr__para">
              {lignes.map((li, k) => (
                <span key={li} className="kk-lr__ligne">
                  {k > 0 && <br />}
                  {tokensPara
                    .filter((t) => t.ligne === li)
                    .map((t) => {
                      const actifMot = t.index === motActif;
                      const actifSeg = tokensSegmentActif.has(t.index);
                      const cls =
                        "kk-lr__mot" +
                        (actifSeg ? " kk-lr__mot--seg" : "") +
                        (actifMot ? " kk-lr__mot--mot" : "");
                      return (
                        <button
                          key={t.index}
                          type="button"
                          className={cls}
                          onClick={() => surToucherMot(t.index)}
                          aria-label={`écouter le mot ${t.mot}`}
                        >
                          {t.avant}
                          {t.mot}
                          {t.apres}
                        </button>
                      );
                    })}
                </span>
              ))}
            </p>
          );
        })}
      </article>

      <p className="kk-lr__aide kk-muted">
        <Volume2 size={14} aria-hidden="true" /> Touche un mot pour l'entendre tout seul.
      </p>
    </div>
  );
}

export default LecteurRythme;
