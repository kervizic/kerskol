// Images des billets et pieces en euros utilisees par l'exercice de monnaie
// (MA.PB.MONNAIE). Source UNIQUE de verite : la cle est la valeur en CENTIMES,
// coherente avec BILLS_EUR / COINS_EUR / COINS_CENT (problemes.ts).
//
// - Billets (>= 5 EUR) : images officielles BCE marquees SPECIMEN (recto),
//   redimensionnees a <= 72 dpi de la taille reelle (decision BCE/2013/10).
// - Pieces : face COMMUNE depuis Wikimedia Commons (licences libres).
// Le detail des sources / auteurs / licences est sur la page /credits et dans
// docs/credits.md. Les fichiers sont servis en statique depuis /public/monnaie/.

export interface MoneyAsset {
  /** Chemin servi (public/). */
  src: string;
  /** Texte alternatif lisible ("billet de 20 euros", "piece de 50 centimes"). */
  alt: string;
  /** Largeur d'affichage en px (realisme relatif, cible tactile >= 44 px). */
  width: number;
  /** true = billet (coins arrondis), false = piece (ronde). */
  bill: boolean;
}

// Largeurs choisies pour conserver les proportions reelles tout en restant
// grosses et cliquables. Billets : ~ proportionnel a la largeur reelle (120 ->
// 160 mm). Pieces : ~ proportionnel au diametre reel (16 -> 26 mm), min 46 px.
export const MONEY_ASSETS: Record<number, MoneyAsset> = {
  // --- Pieces en centimes ---
  1: { src: "/monnaie/piece-1c.png", alt: "pièce de 1 centime", width: 46, bill: false },
  2: { src: "/monnaie/piece-2c.png", alt: "pièce de 2 centimes", width: 50, bill: false },
  5: { src: "/monnaie/piece-5c.png", alt: "pièce de 5 centimes", width: 55, bill: false },
  10: { src: "/monnaie/piece-10c.png", alt: "pièce de 10 centimes", width: 52, bill: false },
  20: { src: "/monnaie/piece-20c.png", alt: "pièce de 20 centimes", width: 58, bill: false },
  50: { src: "/monnaie/piece-50c.png", alt: "pièce de 50 centimes", width: 63, bill: false },
  // --- Pieces en euros ---
  100: { src: "/monnaie/piece-1e.png", alt: "pièce de 1 euro", width: 60, bill: false },
  200: { src: "/monnaie/piece-2e.png", alt: "pièce de 2 euros", width: 67, bill: false },
  // --- Billets ---
  500: { src: "/monnaie/billet-5.png", alt: "billet de 5 euros", width: 120, bill: true },
  1000: { src: "/monnaie/billet-10.png", alt: "billet de 10 euros", width: 128, bill: true },
  2000: { src: "/monnaie/billet-20.png", alt: "billet de 20 euros", width: 136, bill: true },
  5000: { src: "/monnaie/billet-50.png", alt: "billet de 50 euros", width: 144, bill: true },
  10000: { src: "/monnaie/billet-100.png", alt: "billet de 100 euros", width: 150, bill: true },
  20000: { src: "/monnaie/billet-200.png", alt: "billet de 200 euros", width: 156, bill: true },
  50000: { src: "/monnaie/billet-500.png", alt: "billet de 500 euros", width: 162, bill: true },
};

export function moneyAsset(cents: number): MoneyAsset | undefined {
  return MONEY_ASSETS[cents];
}
