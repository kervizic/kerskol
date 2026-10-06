// Positions temporelles dans un assemblage de clips (B3). Le lecteur enchaine
// des clips separes par des silences ; pour surligner le bon mot il faut savoir
// a quel instant demarre chaque clip : debut(n) = Σ (duree(k) + pause_apres(k))
// pour k < n, avec les pauses EXACTES inserees par le lecteur.

export interface ElementAssemblage {
  durMs: number; // duree reelle du clip
  gapApresMs: number; // silence insere APRES ce clip par le lecteur
}

// Instant de debut de chaque element (ms), relatif au debut de la sequence.
export function positionsDebut(items: ElementAssemblage[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const it of items) {
    out.push(acc);
    acc += it.durMs + it.gapApresMs;
  }
  return out;
}

// Duree totale jouee (clips + silences). Doit egaler le dernier debut + sa duree
// + son silence (invariant verifie par les tests, pour eviter la derive).
export function dureeTotale(items: ElementAssemblage[]): number {
  return items.reduce((s, it) => s + it.durMs + it.gapApresMs, 0);
}
