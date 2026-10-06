// Hook d'orchestration de la voix : charge le manifest, resout les cles en URL,
// pilote la file d'attente audio, respecte le reglage par profil et le geste iOS.
//
// Toute l'API est sans danger : si la voix n'est pas disponible (manifest absent,
// clips manquants), les fonctions ne font rien et l'app continue normalement.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chargerManifest, urlsPourCles, type VoixManifest } from "./manifest";
import { enonceEnCles } from "./verbalize";
import { lectureAutoDeProfil, shouldAutoPlay, shouldPlayManual } from "./autoplay";
import { markUserActivated, playItems, playUrls, precharger, stop } from "./player";

// silences (ms) — calques sur la recette audiobook (0,5 s intra, 1,0 s fin)
const GAP_NOMBRE = 110; // enchainement serre pour les nombres/operateurs
const GAP_PHRASE = 500; // entre deux phrases de dictee (lecture simple)
const GAP_DICTEE = 1500; // entre phrases en MODE dictee (temps d'ecrire)
const GAP_PARAGRAPHE = 1000;

export interface Voix {
  disponible: boolean;
  lectureAutoActive: boolean;
  activer: () => void; // a appeler au 1er geste de seance (debloque iOS)
  couper: () => void;
  direCles: (cles: string[], opts?: { auto?: boolean; gapMs?: number }) => void;
  direEnonce: (prompt: string, opts?: { auto?: boolean }) => void;
  direDictee: (id: number, opts?: { auto?: boolean; mode?: "simple" | "dictee" }) => void;
}

export function useVoix(profil: { lecture_auto?: boolean | null } | null): Voix {
  const [manifest, setManifest] = useState<VoixManifest | null>(null);
  const lectureAuto = lectureAutoDeProfil(profil);
  const activeRef = useRef(false);

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

  const disponible = Boolean(manifest && Object.keys(manifest.keys).length > 0);

  const activer = useCallback(() => {
    activeRef.current = true;
    markUserActivated();
  }, []);

  const couper = useCallback(() => stop(), []);

  const direCles = useCallback(
    (cles: string[], opts?: { auto?: boolean; gapMs?: number }) => {
      const urls = urlsPourCles(manifest, cles);
      const hasClips = urls.length > 0;
      const ok = opts?.auto
        ? shouldAutoPlay(lectureAuto, activeRef.current, hasClips)
        : shouldPlayManual(hasClips);
      if (!ok) return;
      if (!opts?.auto) activer();
      void playUrls(urls, opts?.gapMs ?? GAP_NOMBRE);
    },
    [manifest, lectureAuto, activer]
  );

  const direEnonce = useCallback(
    (prompt: string, opts?: { auto?: boolean }) => {
      direCles(enonceEnCles(prompt), { auto: opts?.auto, gapMs: GAP_NOMBRE });
    },
    [direCles]
  );

  const direDictee = useCallback(
    (id: number, opts?: { auto?: boolean; mode?: "simple" | "dictee" }) => {
      if (!manifest) return;
      // recupere les phrases dictee:<id>:s0, s1, ... dans l'ordre
      const cles = Object.keys(manifest.keys)
        .filter((k) => k.startsWith(`dictee:${id}:s`))
        .sort((a, b) => {
          const na = parseInt(a.slice(a.lastIndexOf("s") + 1), 10);
          const nb = parseInt(b.slice(b.lastIndexOf("s") + 1), 10);
          return na - nb;
        });
      const urls = urlsPourCles(manifest, cles);
      const hasClips = urls.length > 0;
      const ok = opts?.auto
        ? shouldAutoPlay(lectureAuto, activeRef.current, hasClips)
        : shouldPlayManual(hasClips);
      if (!ok) return;
      if (!opts?.auto) activer();

      if (opts?.mode === "dictee") {
        // decouverte (lecture continue) -> ecriture phrase par phrase (pauses
        // longues) -> relecture complete. Pas de clip "mot a mot" : granularite
        // phrase (cf. docs/voix.md).
        const items = [
          ...urls.map((url) => ({ url, gapAfterMs: GAP_PHRASE })),
          ...urls.map((url, i) => ({ url, gapAfterMs: i < urls.length - 1 ? GAP_DICTEE : GAP_PARAGRAPHE })),
          ...urls.map((url) => ({ url, gapAfterMs: GAP_PHRASE })),
        ];
        void playItems(items);
      } else {
        void playUrls(urls, GAP_PHRASE);
      }
    },
    [manifest, lectureAuto, activer]
  );

  // precharge discret du manifest -> rien d'autre (mise en cache a la demande)
  useEffect(() => {
    if (manifest) precharger([]); // no-op : placeholder d'API, cache a la demande
  }, [manifest]);

  return useMemo(
    () => ({ disponible, lectureAutoActive: lectureAuto, activer, couper, direCles, direEnonce, direDictee }),
    [disponible, lectureAuto, activer, couper, direCles, direEnonce, direDictee]
  );
}
