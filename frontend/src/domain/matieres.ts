// Catalogue des MATIERES et SOUS-MATIERES activables par profil (reglages
// enfant et parent). Une sous-matiere = un `domaine` de public.competences.
//
// Modele d'activation (etend profils.matieres_actives) :
//   - matieres_actives : les MATIERES actives (codes MA, FR) ;
//   - domaines_actifs  : les SOUS-MATIERES actives (codes de domaine).
// Une competence est jouable SSI sa matiere est active ET son domaine est actif.
// Au moins une sous-matiere doit rester active (verifie aussi cote serveur).
//
// Les libelles collent au programme reel : « heure » et « durees » vivent dans
// le domaine `heure` (sous-matiere « Lire l'heure »), les grandeurs (longueurs,
// masses, contenances) dans `mesures`, et « monnaie » dans le domaine
// `problemes` (cf. public.competences).

export interface SousMatiere {
  domaine: string; // = public.competences.domaine
  libelle: string;
}
export interface MatiereDef {
  code: string; // = public.competences.matiere (MA, FR)
  libelle: string;
  sousMatieres: SousMatiere[];
}

export const MATIERES: MatiereDef[] = [
  {
    code: "MA",
    libelle: "Maths",
    sousMatieres: [
      { domaine: "numeration", libelle: "Les nombres" },
      { domaine: "calcul_mental", libelle: "Calcul mental" },
      { domaine: "tables_multiplication", libelle: "Tables de multiplication" },
      { domaine: "calcul_pose", libelle: "Calcul posé" },
      { domaine: "problemes", libelle: "Problèmes et monnaie" },
      { domaine: "mesures", libelle: "Mesures" },
      { domaine: "heure", libelle: "Lire l'heure" },
      { domaine: "fractions", libelle: "Fractions" },
      { domaine: "geometrie", libelle: "Géométrie" },
      { domaine: "repere", libelle: "Se repérer" },
      { domaine: "donnees", libelle: "Tableaux et graphiques" },
    ],
  },
  {
    code: "FR",
    libelle: "Français",
    sousMatieres: [
      { domaine: "grammaire", libelle: "Grammaire" },
      { domaine: "vocabulaire", libelle: "Vocabulaire" },
      { domaine: "mots-invariables", libelle: "Mots à savoir" },
      { domaine: "conjugaison", libelle: "Conjugaison" },
      { domaine: "orthographe", libelle: "Dictée détective" },
      { domaine: "lecture", libelle: "Comprendre un texte" },
    ],
  },
  {
    // Sous-matieres ajoutees au fur et a mesure des lots (chaque `domaine` doit
    // exister dans public.competences, sinon regler_matieres refuse l'enregistrement).
    code: "QM",
    libelle: "Questionner le monde",
    sousMatieres: [
      { domaine: "vivant", libelle: "Le vivant" },
    ],
  },
];

// Tous les codes matieres / tous les domaines connus (defauts « tout actif »).
export const TOUTES_MATIERES: string[] = MATIERES.map((m) => m.code);
export const TOUS_DOMAINES: string[] = MATIERES.flatMap((m) =>
  m.sousMatieres.map((s) => s.domaine),
);

export function matiereDe(domaine: string): string | undefined {
  for (const m of MATIERES) {
    if (m.sousMatieres.some((s) => s.domaine === domaine)) return m.code;
  }
  return undefined;
}

// Une competence (matiere, domaine) est-elle jouable, selon les reglages du
// profil ? Matiere active ET sous-matiere active.
export function competenceActivable(
  matiere: string,
  domaine: string,
  matieresActives: string[],
  domainesActifs: string[],
): boolean {
  return matieresActives.includes(matiere) && domainesActifs.includes(domaine);
}

// Y a-t-il au moins une sous-matiere jouable (matiere active ET domaine actif) ?
// Garde-fou : on refuse un reglage qui ne laisserait plus rien a travailler.
export function auMoinsUneSousMatiere(
  matieresActives: string[],
  domainesActifs: string[],
): boolean {
  return MATIERES.some(
    (m) =>
      matieresActives.includes(m.code) &&
      m.sousMatieres.some((s) => domainesActifs.includes(s.domaine)),
  );
}
