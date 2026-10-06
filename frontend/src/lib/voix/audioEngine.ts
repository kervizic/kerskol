// Assemblage des BRIQUES (nombres, opérateurs, amorces) en Web Audio API :
// AudioBufferSourceNode programmés à l'échantillon, gap 0 par défaut + court
// fondu (évite les clics). Les briques étant rognées côté génération, l'enchaînement
// est serré (« même 50 ms paraît énorme » — on vise 0). Les clips ENTIERS
// (dictées, messages, consignes) restent joués par player.ts (silences voulus).
//
// iOS : l'AudioContext doit être repris sur un geste (voir markUserActivated/activer).

let ctx: AudioContext | null = null;
let seq = 0; // jeton d'invalidation (coupe une séquence en cours)
const bufferCache = new Map<string, AudioBuffer>();

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function webAudioDisponible(): boolean {
  return getCtx() != null;
}

async function charger(url: string): Promise<AudioBuffer | null> {
  const hit = bufferCache.get(url);
  if (hit) return hit;
  const c = getCtx();
  if (!c) return null;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.arrayBuffer();
    const buf = await c.decodeAudioData(data);
    bufferCache.set(url, buf);
    return buf;
  } catch {
    return null;
  }
}

export function stopSequence(): void {
  seq++;
}

// Joue des briques bout à bout (gap 0), fondu de `fadeMs` sur chaque. Les buffers
// manquants sont ignorés (l'app marche sans voix). Résout à la fin (ou coupure).
export async function jouerBriques(urls: string[], fadeMs = 8): Promise<void> {
  const c = getCtx();
  if (!c || urls.length === 0) return;
  stopSequence();
  const monSeq = seq;
  const buffers = await Promise.all(urls.map(charger));
  if (monSeq !== seq) return; // coupé pendant le chargement
  const fade = fadeMs / 1000;
  let t = c.currentTime + 0.02; // petite marge d'amorçage
  const fin: number[] = [];
  for (const buf of buffers) {
    if (!buf) continue;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    const d = buf.duration;
    // fondu d'entrée/sortie court pour éviter les clics aux jointures
    const f = Math.min(fade, d / 2);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + f);
    g.gain.setValueAtTime(1, t + d - f);
    g.gain.linearRampToValueAtTime(0, t + d);
    src.connect(g).connect(c.destination);
    src.start(t);
    t += d; // gap 0 : la brique suivante démarre à la fin de celle-ci
    fin.push(t);
  }
  const total = (fin[fin.length - 1] ?? c.currentTime) - c.currentTime;
  await new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, total * 1000)));
  if (monSeq !== seq) return;
}
