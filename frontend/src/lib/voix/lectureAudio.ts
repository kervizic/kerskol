// Adaptateur audio pour la « lecture rythmee » (cote DOM, non teste unitairement
// — la logique PURE vit dans domain/francais/lecture/).
//
// On lit UN seul fichier audio par texte et on joue des TRANCHES [debut,fin] via
// un HTMLAudioElement :
//  - `preservesPitch` garde la HAUTEUR quand on ralentit (option CM 0.9) ;
//  - un ecouteur `timeupdate` met en pause des que currentTime depasse la fin de
//    la tranche (le silence inter-segment est gere par le sequenceur) ;
//  - choix de source Opus/OGG (petit) avec repli AAC/M4A pour Safari iOS.
//
// Les fichiers sont HEBERGES par le site : /voix/lecture/<id>.{opus,m4a,json}.

import type { Lecteur } from "../../domain/francais/lecture/sequencer";
import type { TimingsTexte } from "../../domain/francais/lecture/timings";

const BASE = "/voix/lecture";

export interface ManifestLecture {
  textes: string[]; // ids des textes disposant d'un audio + timings valides
}

export async function chargerManifest(): Promise<ManifestLecture> {
  try {
    const r = await fetch(`${BASE}/manifest.json`, { cache: "no-cache" });
    if (!r.ok) return { textes: [] };
    const j = (await r.json()) as Partial<ManifestLecture>;
    return { textes: Array.isArray(j.textes) ? j.textes.filter((x) => typeof x === "string") : [] };
  } catch {
    return { textes: [] };
  }
}

export async function chargerTimings(id: string): Promise<TimingsTexte | null> {
  try {
    const r = await fetch(`${BASE}/${id}.json`, { cache: "force-cache" });
    if (!r.ok) return null;
    return (await r.json()) as TimingsTexte;
  } catch {
    return null;
  }
}

// Choisit l'URL audio jouable par le navigateur (Opus sinon AAC).
function choisirSource(audio: TimingsTexte["audio"]): string | null {
  const test = document.createElement("audio");
  const opus = `${BASE}/${audio.opus}`;
  const m4a = `${BASE}/${audio.m4a}`;
  const peutOpus = test.canPlayType('audio/ogg; codecs="opus"');
  if (peutOpus === "probably" || peutOpus === "maybe") return opus;
  const peutAac = test.canPlayType('audio/mp4; codecs="mp4a.40.2"');
  if (peutAac === "probably" || peutAac === "maybe") return m4a;
  return opus; // dernier recours
}

function reglerPreservesPitch(el: HTMLAudioElement, on: boolean): void {
  const a = el as HTMLAudioElement & {
    preservesPitch?: boolean;
    mozPreservesPitch?: boolean;
    webkitPreservesPitch?: boolean;
  };
  a.preservesPitch = on;
  a.mozPreservesPitch = on;
  a.webkitPreservesPitch = on;
}

export interface LecteurTranches extends Lecteur {
  readonly element: HTMLAudioElement;
  detruire(): void;
}

/**
 * Cree un lecteur de tranches lie a un texte (audio + timings deja charges).
 * Reutilisable pour tous les segments et la lecture d'un mot seul.
 */
export function creerLecteur(timings: TimingsTexte): LecteurTranches {
  const src = choisirSource(timings.audio);
  const el = new Audio();
  if (src) el.src = src;
  el.preload = "auto";
  reglerPreservesPitch(el, true);

  let finCibleSec = Infinity;
  const surTimeupdate = () => {
    if (el.currentTime >= finCibleSec) {
      el.pause();
      finCibleSec = Infinity;
    }
  };
  el.addEventListener("timeupdate", surTimeupdate);

  return {
    element: el,
    jouer(debutMs: number, finMs: number, vitesse: number) {
      try {
        reglerPreservesPitch(el, true);
        el.playbackRate = vitesse > 0 ? vitesse : 1;
        finCibleSec = finMs / 1000;
        el.currentTime = debutMs / 1000;
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {
        /* lecture refusee (iOS avant geste) : on ignore */
      }
    },
    pause() {
      try {
        el.pause();
      } catch {
        /* ignore */
      }
    },
    stop() {
      try {
        el.pause();
        finCibleSec = Infinity;
      } catch {
        /* ignore */
      }
    },
    detruire() {
      el.removeEventListener("timeupdate", surTimeupdate);
      try {
        el.pause();
        el.src = "";
      } catch {
        /* ignore */
      }
    },
  };
}
