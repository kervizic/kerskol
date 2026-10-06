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
