// Logique PURE (testee) de declenchement de la lecture automatique.
//
// Contraintes :
//  - reglage par profil enfant (profil.lecture_auto, espace parent) ;
//  - iOS/Safari : l'audio ne peut demarrer qu'APRES un premier geste utilisateur
//    dans la seance -> on exige un "flag d'activation" (pose au 1er tap) ;
//  - rien a lire si aucun clip n'est disponible (app fonctionne sans voix).
//
// La lecture par le BOUTON haut-parleur n'est PAS soumise a lecture_auto : elle
// part toujours d'un geste, donc shouldPlayManual ne verifie que la presence de
// clips. L'auto (shouldAutoPlay) exige en plus le reglage et l'activation.

export function shouldAutoPlay(
  lectureAutoProfil: boolean,
  userActivated: boolean,
  hasClips: boolean
): boolean {
  return Boolean(lectureAutoProfil && userActivated && hasClips);
}

export function shouldPlayManual(hasClips: boolean): boolean {
  return Boolean(hasClips);
}

// Valeur par defaut du reglage quand le profil ne le porte pas (ex. mode demo,
// anciens profils avant migration) : lecture auto ACTIVE (comportement attendu).
export function lectureAutoDeProfil(profil: { lecture_auto?: boolean | null } | null): boolean {
  if (!profil) return true;
  return profil.lecture_auto !== false;
}
