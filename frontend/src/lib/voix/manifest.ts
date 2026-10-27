// Chargement du manifest de voix et resolution des URL de clips.
//
// - manifest : committe dans le repo, servi par l'app a /voix/manifest.json.
// - fichiers audio : NON committes ; deposes sur le VPS (/opt/kerskol/audio),
//   servis par le vhost kerskol a /audio/<voice>/<clip_id>.mp3 (cache long,
//   noms immuables car <clip_id> est un hash du texte).
//
// Robustesse : toute erreur (manifest absent, clip manquant) renvoie null et
// n'interrompt JAMAIS l'app ; la voix est un bonus, pas une dependance.

export interface ClipInfo {
  text: string;
  ms: number;
  cat: string;
}

export interface VoixManifest {
  voice: string;
  format: string;
  sample_rate: number;
  bitrate: string;
  clips: Record<string, ClipInfo>;
  keys: Record<string, string>;
}

export const MANIFEST_URL = "/voix/manifest.json";
export const AUDIO_BASE = "/audio";

let cache: VoixManifest | null = null;
let enCours: Promise<VoixManifest | null> | null = null;

export async function chargerManifest(): Promise<VoixManifest | null> {
  if (cache) return cache;
  if (enCours) return enCours;
  enCours = fetch(MANIFEST_URL, { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: VoixManifest | null) => {
      if (j && j.keys && j.clips) cache = j;
      return cache;
    })
    .catch(() => null)
    .finally(() => {
      enCours = null;
    });
  return enCours;
}

// --- Alignement au mot (karaoke) ------------------------------------------
export interface MotAligne {
  w: string;
  s: number; // debut ms (relatif au clip)
  e: number; // fin ms
}
export interface ClipAligne {
  words: MotAligne[];
  align_ok: boolean;
  dur_ms: number;
}
export interface Alignement {
  voice: string;
  mp3_offset_ms: number;
  clips: Record<string, ClipAligne>;
}

export const ALIGNEMENT_URL = `${AUDIO_BASE}/alignement.json`;

let alnCache: Alignement | null = null;
let alnEnCours: Promise<Alignement | null> | null = null;

export async function chargerAlignement(): Promise<Alignement | null> {
  if (alnCache) return alnCache;
  if (alnEnCours) return alnEnCours;
  alnEnCours = fetch(ALIGNEMENT_URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((j: Alignement | null) => {
      if (j && j.clips) alnCache = j;
      return alnCache;
    })
    .catch(() => null)
    .finally(() => {
      alnEnCours = null;
    });
  return alnEnCours;
}

// --- Lecture d'un texte en PROSE (clip entier) ----------------------------
// Un texte affiche en prose (enonce EMC/conjugaison, consigne, indice, phrase,
// message...) est lu par UN clip entier dont le texte PRONONCE nettoye est
// identique a `nettoyer(texteAffiche)`. On indexe clips[].text -> clip_id pour
// retrouver ce clip sans hash ni cle logique (cf. docs/voix.md). Aucun
// respelling sur la prose : clips[].text == nettoyer(affichage).
import { nettoyer } from "./nettoyage";

const idxCache = new WeakMap<VoixManifest, Map<string, string>>();

function indexTextes(manifest: VoixManifest): Map<string, string> {
  let idx = idxCache.get(manifest);
  if (idx) return idx;
  idx = new Map<string, string>();
  for (const [id, info] of Object.entries(manifest.clips)) {
    const cle = nettoyer(info.text);
    if (cle && !idx.has(cle)) idx.set(cle, id);
  }
  idxCache.set(manifest, idx);
  return idx;
}

// URL du clip prose pour un texte affiche, ou null si aucun clip ne correspond.
export function urlPourTexte(manifest: VoixManifest | null, texte: string): string | null {
  if (!manifest) return null;
  const id = indexTextes(manifest).get(nettoyer(texte));
  return id ? `${AUDIO_BASE}/${manifest.voice}/${id}.mp3` : null;
}

export function texteProseJouable(manifest: VoixManifest | null, texte: string): boolean {
  return urlPourTexte(manifest, texte) !== null;
}

// URL du fichier audio pour une cle logique, ou null si absente du manifest.
export function urlPourCle(manifest: VoixManifest | null, cle: string): string | null {
  if (!manifest) return null;
  const id = manifest.keys[cle];
  if (!id) return null;
  return `${AUDIO_BASE}/${manifest.voice}/${id}.mp3`;
}

// Resout une sequence de cles en URL, en sautant les cles absentes.
export function urlsPourCles(manifest: VoixManifest | null, cles: string[]): string[] {
  const out: string[] = [];
  for (const c of cles) {
    const u = urlPourCle(manifest, c);
    if (u) out.push(u);
  }
  return out;
}

// Cles ABSENTES du manifest parmi `cles` (briques audio manquantes). Sert a ne
// JAMAIS jouer une phrase incomplete : si une seule brique manque, on prefere ne
// rien lire (cf. docs/voix.md + bug du 10/10 : la voix sautait silencieusement le
// 1er nombre d'une addition car son clip n'etait pas encore genere).
export function clesManquantes(manifest: VoixManifest | null, cles: string[]): string[] {
  if (!manifest) return cles.slice();
  return cles.filter((c) => !manifest.keys[c]);
}

// Une sequence est JOUABLE si elle contient au moins une brique ET que TOUTES ses
// briques existent dans le manifest (aucune phrase tronquee).
export function sequenceJouable(manifest: VoixManifest | null, cles: string[]): boolean {
  return cles.length > 0 && clesManquantes(manifest, cles).length === 0;
}
