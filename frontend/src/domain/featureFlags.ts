// Drapeaux de fonctionnalite (feature flags).
//
// Un drapeau permet de MASQUER une fonctionnalite qui n'est pas encore prete,
// SANS supprimer son code ni ses donnees : il suffit de repasser le drapeau a
// `true` pour la rendre de nouveau visible. Tant qu'il vaut `false`, la
// fonctionnalite n'apparait NULLE PART dans l'interface (ni cote enfant, ni
// cote parent, ni via une URL directe).
//
// DICTEE_PARENT : « Dictée avec papa ou maman ». Un parent lit des mots a voix
// haute et l'enfant les ecrit, avec un futur scan photo du cahier. Elle reste
// masquee tant que l'assistance par IA (reconnaissance de l'ecriture sur la
// photo) n'est pas en place. Le composant <DicteeMaitresse>, la RPC
// maitresse_dictee_enregistrer et l'historique restent intacts cote code et
// cote base ; seuls les points d'entree de l'interface sont caches.
export const FEATURE_DICTEE_PARENT = false;
