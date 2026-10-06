// File d'attente audio : joue une sequence de clips a la suite, avec de courts
// silences, et peut etre coupee a tout moment (changement d'exercice, demontage).
//
// - un seul clip joue a la fois ; les suivants s'enchainent via l'evenement
//   "ended" (et un silence gapAfterMs) ;
// - stop() annule la sequence en cours (jeton d'invalidation) ;
// - aucune exception ne remonte : une lecture refusee (iOS avant geste) ou un
//   fichier manquant est avalee, l'app continue ;
// - gestion du geste iOS : markUserActivated() est appele au 1er tap de seance.
//
// Module singleton (une seule voix a la fois dans l'app). Non teste unitairement
// (DOM/HTMLAudioElement) ; la logique PURE testee vit dans verbalize.ts /
// autoplay.ts.

export interface PlayItem {
  url: string;
  gapAfterMs?: number;
}

let token = 0; // invalide les enchainements en cours
let current: HTMLAudioElement | null = null;
let activated = false;

export function markUserActivated(): void {
  activated = true;
}

export function isUserActivated(): boolean {
  return activated;
}

export function stop(): void {
  token++;
  if (current) {
    try {
      current.pause();
      current.src = "";
    } catch {
      /* ignore */
    }
    current = null;
  }
}

function jouerUn(url: string): Promise<void> {
  return new Promise<void>((resolve) => {
    let fini = false;
    const done = () => {
      if (fini) return;
      fini = true;
      resolve();
    };
    try {
      const a = new Audio(url);
      current = a;
      a.addEventListener("ended", done, { once: true });
      a.addEventListener("error", done, { once: true });
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(done); // lecture refusee -> on enchaine sans bloquer
    } catch {
      done();
    }
  });
}

function attendre(ms: number, monToken: number): Promise<void> {
  return new Promise<void>((resolve) => {
    if (ms <= 0) return resolve();
    setTimeout(() => resolve(), ms);
  }).then(() => {
    if (monToken !== token) return; // coupe pendant le silence
  });
}

// Joue une sequence. Renvoie une promesse resolue a la fin (ou a la coupure).
export async function playItems(items: PlayItem[]): Promise<void> {
  stop();
  const monToken = token;
  for (const it of items) {
    if (monToken !== token) return; // coupe
    await jouerUn(it.url);
    if (monToken !== token) return;
    if (it.gapAfterMs && it.gapAfterMs > 0) await attendre(it.gapAfterMs, monToken);
  }
}

// Confort : joue une liste d'URL avec un meme silence entre chaque.
export function playUrls(urls: string[], gapMs = 120): Promise<void> {
  return playItems(urls.map((url, i) => ({ url, gapAfterMs: i < urls.length - 1 ? gapMs : 0 })));
}

// Prechargement doux du PROCHAIN clip (mise en cache a la demande, pas tout
// precharger) : cree un element audio en preload sans le jouer.
export function precharger(urls: string[]): void {
  for (const url of urls) {
    try {
      const a = new Audio();
      a.preload = "auto";
      a.src = url;
    } catch {
      /* ignore */
    }
  }
}
