// Hook d'orchestration de la voix : charge le manifest, resout les cles en URL,
// pilote la file d'attente audio, respecte le reglage par profil et le geste iOS.
//
// Toute l'API est sans danger : si la voix n'est pas disponible (manifest absent,
// clips manquants), les fonctions ne font rien et l'app continue normalement.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  chargerAlignement,
  chargerManifest,
  clesManquantes,
  sequenceJouable,
  texteProseJouable,
  urlPourTexte,
  urlsPourCles,
  type Alignement,
  type VoixManifest,
} from "./manifest";
import { enonceEnCles } from "./verbalize";
import { signalerBriquesManquantes } from "./journal";
import { lectureAutoDeProfil, shouldAutoPlay, shouldPlayManual } from "./autoplay";
import { effectiveLectureAuto, getStoredLectureAuto, setStoredLectureAuto } from "./lectureAutoLocale";
import { markUserActivated, playItems, playUrls, precharger, scheduleTick, stop } from "./player";
import { jouerBriques, stopSequence, webAudioDisponible } from "./audioEngine";

// Rappels de surlignage karaoke (indices relatifs a la phrase du clip).
export interface KaraokeCallbacks {
  onSentence?: (sentenceIndex: number) => void;
  onToken?: (sentenceIndex: number, tokenIndex: number) => void; // -1 fin, -2 phrase entiere (repli)
}

// silences (ms) — calques sur la recette audiobook (0,5 s intra, 1,0 s fin)
const GAP_NOMBRE = 110; // enchainement serre pour les nombres/operateurs
const GAP_PHRASE = 500; // entre deux phrases de dictee (lecture simple)
const GAP_DICTEE = 1500; // entre phrases en MODE dictee (temps d'ecrire)
const GAP_PARAGRAPHE = 1000;

export interface Voix {
  disponible: boolean;
  lectureAutoActive: boolean;
  basculerLectureAuto: () => void; // bascule enfant depuis l'exercice (persistee par profil)
  activer: () => void; // a appeler au 1er geste de seance (debloque iOS)
  couper: () => void;
  direCles: (cles: string[], opts?: { auto?: boolean; gapMs?: number }) => void;
  direEnonce: (prompt: string, opts?: { auto?: boolean }) => void;
  // Lit un TEXTE affiche quelconque (enonce de calcul en briques, sinon clip
  // prose entier : consigne, indice, phrase, message...). Ne joue RIEN si aucun
  // audio ne correspond (jamais de faux son).
  direTexte: (texte: string, opts?: { auto?: boolean }) => void;
  // true si l'enonce peut etre lu EN ENTIER (toutes ses briques existent) ; sert
  // a griser le bouton audio plutot que de jouer une phrase incomplete.
  enonceJouable: (prompt: string) => boolean;
  // true si un texte affiche (prose ou calcul) est lisible en entier.
  texteJouable: (texte: string) => boolean;
  direDictee: (
    id: number,
    opts?: { auto?: boolean; mode?: "simple" | "dictee" } & KaraokeCallbacks
  ) => void;
}

export function useVoix(profil: { id?: string; lecture_auto?: boolean | null } | null): Voix {
  const [manifest, setManifest] = useState<VoixManifest | null>(null);
  const activeRef = useRef(false);

  // Reglage parent = defaut ; surcharge enfant locale par profil = prime.
  const profilId = profil?.id ?? null;
  const parDefaut = lectureAutoDeProfil(profil);
  const [surcharge, setSurcharge] = useState<boolean | null>(() =>
    profilId ? getStoredLectureAuto(profilId) : null
  );
  useEffect(() => {
    setSurcharge(profilId ? getStoredLectureAuto(profilId) : null);
  }, [profilId]);
  const lectureAuto = effectiveLectureAuto(surcharge, parDefaut);

  useEffect(() => {
    let vivant = true;
    chargerManifest().then((m) => {
      if (vivant) setManifest(m);
    });
    return () => {
      vivant = false;
    };
  }, []);

  // coupe la voix au demontage du composant qui detient le hook
  useEffect(() => () => stop(), []);

  // alignement au mot (karaoke) : chargement paresseux une fois.
  const alnRef = useRef<Alignement | null>(null);
  useEffect(() => {
    chargerAlignement().then((a) => {
      alnRef.current = a;
    });
  }, []);

  const disponible = Boolean(manifest && Object.keys(manifest.keys).length > 0);

  const activer = useCallback(() => {
    activeRef.current = true;
    markUserActivated();
    webAudioDisponible(); // cree/relance l'AudioContext sur le geste (iOS)
  }, []);

  const couper = useCallback(() => {
    stop(); // clips entiers (HTMLAudio) + minuteries karaoke
    stopSequence(); // briques (Web Audio)
  }, []);

  // Bascule enfant : applique tout de suite, memorise pour ce profil ; couper
  // l'auto coupe aussi le son en cours.
  const basculerLectureAuto = useCallback(() => {
    const next = !lectureAuto;
    if (profilId) setStoredLectureAuto(profilId, next);
    setSurcharge(next);
    if (!next) stop();
  }, [lectureAuto, profilId]);

  // Joue une liste d'URL (briques assemblees en Web Audio, ou 1 clip prose en
  // HTMLAudio), en respectant la bascule auto et le geste iOS. Ne joue rien si la
  // liste est vide (jamais de faux son).
  const jouerUrls = useCallback(
    (urls: string[], opts: { auto?: boolean; gapMs?: number; brique?: boolean }) => {
      const hasClips = urls.length > 0;
      const ok = opts.auto
        ? shouldAutoPlay(lectureAuto, activeRef.current, hasClips)
        : shouldPlayManual(hasClips);
      if (!ok) return;
      if (!opts.auto) activer();
      stop();
      if (opts.brique && urls.length > 1 && webAudioDisponible()) void jouerBriques(urls);
      else void playUrls(urls, opts.gapMs ?? GAP_NOMBRE);
    },
    [lectureAuto, activer]
  );

  const direCles = useCallback(
    (cles: string[], opts?: { auto?: boolean; gapMs?: number }) => {
      // Regle d'or : ne JAMAIS lire une phrase incomplete. Si une seule brique
      // manque, on ne joue rien (et on journalise la liste des clips a generer).
      const manquantes = clesManquantes(manifest, cles);
      if (manquantes.length > 0) {
        signalerBriquesManquantes(manquantes);
        return;
      }
      jouerUrls(urlsPourCles(manifest, cles), { auto: opts?.auto, gapMs: opts?.gapMs ?? GAP_NOMBRE, brique: true });
    },
    [manifest, jouerUrls]
  );

  // Lit n'importe quel texte affiche : calcul en briques si jouable, sinon clip
  // prose entier s'il existe, sinon RIEN (bouton grise cote appelant).
  const direTexte = useCallback(
    (texte: string, opts?: { auto?: boolean }) => {
      const cles = enonceEnCles(texte);
      if (sequenceJouable(manifest, cles)) {
        jouerUrls(urlsPourCles(manifest, cles), { auto: opts?.auto, gapMs: GAP_NOMBRE, brique: true });
        return;
      }
      const url = urlPourTexte(manifest, texte);
      if (url) jouerUrls([url], { auto: opts?.auto, brique: false });
    },
    [manifest, jouerUrls]
  );

  const direEnonce = useCallback(
    (prompt: string, opts?: { auto?: boolean }) => direTexte(prompt, opts),
    [direTexte]
  );

  // Jouable si toutes les briques de calcul existent, OU si un clip prose au meme
  // texte existe (sinon bouton grise, jamais de lecture partielle).
  const texteJouable = useCallback(
    (texte: string) =>
      sequenceJouable(manifest, enonceEnCles(texte)) || texteProseJouable(manifest, texte),
    [manifest]
  );
  const enonceJouable = texteJouable;

  const direDictee = useCallback(
    (id: number, opts?: { auto?: boolean; mode?: "simple" | "dictee" } & KaraokeCallbacks) => {
      if (!manifest) return;
      // phrases dictee:<id>:s0, s1, ... dans l'ordre (= index de phrase)
      const cles = Object.keys(manifest.keys)
        .filter((k) => k.startsWith(`dictee:${id}:s`))
        .sort((a, b) => {
          const na = parseInt(a.slice(a.lastIndexOf("s") + 1), 10);
          const nb = parseInt(b.slice(b.lastIndexOf("s") + 1), 10);
          return na - nb;
        });
      // phrase -> { url, cid, sentenceIndex } (l'index de phrase = l'ordre sN)
      const phrases = cles
        .map((cle, idx) => ({
          cid: manifest.keys[cle],
          sentenceIndex: idx,
          url: urlsPourCles(manifest, [cle])[0] ?? null,
        }))
        .filter((p): p is { cid: string; sentenceIndex: number; url: string } => Boolean(p.url));

      const hasClips = phrases.length > 0;
      const ok = opts?.auto
        ? shouldAutoPlay(lectureAuto, activeRef.current, hasClips)
        : shouldPlayManual(hasClips);
      if (!ok) return;
      if (!opts?.auto) activer();

      // decouverte (lecture continue) -> ecriture phrase par phrase (pauses
      // longues) -> relecture complete. Granularite phrase (cf. docs/voix.md).
      type It = { url: string; gapAfterMs: number; cid: string; sentenceIndex: number };
      let items: It[];
      if (opts?.mode === "dictee") {
        items = [
          ...phrases.map((p) => ({ ...p, gapAfterMs: GAP_PHRASE })),
          ...phrases.map((p, i) => ({ ...p, gapAfterMs: i < phrases.length - 1 ? GAP_DICTEE : GAP_PARAGRAPHE })),
          ...phrases.map((p) => ({ ...p, gapAfterMs: GAP_PHRASE })),
        ];
      } else {
        items = phrases.map((p) => ({ ...p, gapAfterMs: GAP_PHRASE }));
      }

      const planifierKaraoke = (cid: string, sentenceIndex: number) => {
        opts?.onSentence?.(sentenceIndex);
        const a = alnRef.current?.clips[cid];
        const offset = alnRef.current?.mp3_offset_ms ?? 0;
        if (!a || !a.align_ok || a.words.length === 0) {
          opts?.onToken?.(sentenceIndex, -2); // repli : phrase entiere surlignee
          return;
        }
        a.words.forEach((w, j) => scheduleTick(w.s + offset, () => opts?.onToken?.(sentenceIndex, j)));
        const dernier = a.words[a.words.length - 1];
        scheduleTick(dernier.e + offset, () => opts?.onToken?.(sentenceIndex, -1));
      };

      void playItems(
        items.map((it) => ({ url: it.url, gapAfterMs: it.gapAfterMs })),
        {
          onItemStart: (i) => {
            if (opts?.onSentence || opts?.onToken) planifierKaraoke(items[i].cid, items[i].sentenceIndex);
          },
        }
      );
    },
    [manifest, lectureAuto, activer]
  );

  // precharge discret du manifest -> rien d'autre (mise en cache a la demande)
  useEffect(() => {
    if (manifest) precharger([]); // no-op : placeholder d'API, cache a la demande
  }, [manifest]);

  return useMemo(
    () => ({ disponible, lectureAutoActive: lectureAuto, basculerLectureAuto, activer, couper, direCles, direEnonce, direTexte, enonceJouable, texteJouable, direDictee }),
    [disponible, lectureAuto, basculerLectureAuto, activer, couper, direCles, direEnonce, direTexte, enonceJouable, texteJouable, direDictee]
  );
}
