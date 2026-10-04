// Logique pure de la saisie de l'heure (horloge a aiguilles). Chaque bloc
// (heures / minutes) est independant et fait le TOUR DU CADRAN sans se bloquer
// aux bornes ; le depassement des minutes NE change PAS l'heure (plus simple
// pour l'enfant). La valeur envoyee au serveur reste minutes = h * 60 + m.

// Ajout (ou retrait) d'heures avec tour du cadran.
//  - cadran 12 h : valeurs 1..12 (11 + 3 -> 2 ; 12 + 1 -> 1 ; 1 - 1 -> 12).
//  - format 24 h : valeurs 0..23 modulo 24 (23 + 3 -> 2).
export function wrapHour(value: number, hoursMax: number): number {
  if (hoursMax === 24) {
    return ((value % 24) + 24) % 24; // 0..23
  }
  // Cadran classique : 1..12. On raisonne modulo 12 puis on decale de +1.
  return (((value - 1) % 12) + 12) % 12 + 1;
}

// Ajout (ou retrait) de minutes avec tour du cadran, modulo 60
// (50 + 15 -> 5 ; 58 + 5 -> 3 ; 0 - 1 -> 59). Ne touche jamais aux heures.
export function wrapMinute(value: number): number {
  return ((value % 60) + 60) % 60;
}

// Heure de depart d'un nouvel exercice (jamais la reponse) : 12 h (cadran 12 h)
// ou 0 h (format 24 h).
export function startHour(hoursMax: number): number {
  return hoursMax === 24 ? 0 : 12;
}

// Minutes de depart / remise a zero.
export const START_MINUTE = 0;
