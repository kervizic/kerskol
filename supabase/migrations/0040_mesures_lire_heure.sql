-- 0040_mesures_lire_heure.sql
-- Scission de la sous-matiere « Mesures et heure » (domaine `mesures`) en DEUX
-- sous-matieres reglables :
--   * `mesures`  -> « Mesures »      : longueurs, masses, contenances
--                   (MA.MES.LONGUEURS, MA.MES.MASSES_CONTENANCES) ;
--   * `heure`    -> « Lire l'heure » : heure et durees
--                   (MA.MES.HEURE, MA.MES.DUREES).
--
-- Decision (validee par Manu) : MA.PB.MESURES (problemes de grandeurs) RESTE
-- dans le domaine `problemes` (« Problemes et monnaie »). C'est une competence
-- de RESOLUTION DE PROBLEMES dont les prerequis couvrent a la fois les longueurs,
-- les masses, les durees ET la monnaie : la rattacher a « Mesures » ou a « Lire
-- l'heure » serait arbitraire et la couperait des autres problemes. On la laisse
-- donc avec ses pairs (MA.PB.ADD_SUB, MA.PB.MONNAIE, ...).
--
-- Ce que fait la migration :
--   1. Reaffecte MA.MES.HEURE et MA.MES.DUREES au domaine `heure` (les mesures
--      de grandeurs restent dans `mesures`). Seule la colonne `domaine` change :
--      codes, prerequis, exercices, bornes de verif_calcul (MA.MES.%) INCHANGES.
--   2. Met a jour le DEFAUT de profils.domaines_actifs pour inclure `heure`
--      (nouveaux profils = toutes les sous-matieres actives, comportement
--      historique conserve).
--   3. Pour chaque profil qui avait `mesures` ACTIF, ajoute `heure` a
--      domaines_actifs. Un profil qui avait desactive `mesures` garde les deux
--      sous-matieres eteintes (l'heure etait alors deja injouable).
--
-- Securite / invariants : le domaine `heure` existe (etape 1) AVANT toute
-- ecriture de profil (etape 3), donc le trigger profils_domaines_valides (0039)
-- accepte la nouvelle valeur ; et comme on ne fait qu'AJOUTER une sous-matiere,
-- le garde-fou « au moins une sous-matiere jouable » reste trivialement
-- satisfait. Migration ADDITIVE et IDEMPOTENTE (reexecutable sans effet de bord).

-- =========================================================================
-- 1. Reaffectation des competences heure / durees au domaine `heure`.
--    (Attention : `heure` est AUSSI une valeur de ex_calcul.operation ; ici il
--    s'agit de la colonne competences.domaine, espace de noms distinct.)
-- =========================================================================
UPDATE public.competences
   SET domaine = 'heure'
 WHERE code IN ('MA.MES.HEURE', 'MA.MES.DUREES')
   AND domaine <> 'heure';

-- =========================================================================
-- 2. Nouveau defaut de la colonne : on insere `heure` juste apres `mesures`.
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','conjugaison','orthographe'
    ]::text[];

-- =========================================================================
-- 3. Profils existants : qui avait `mesures` actif doit aussi avoir `heure`
--    (donc les deux coches, ex. Iris). Guard NOT ANY -> idempotent.
--    Declenche profils_domaines_valides (ok) et la journalisation du reglage.
-- =========================================================================
UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'heure')
 WHERE 'mesures' = ANY (domaines_actifs)
   AND NOT ('heure' = ANY (domaines_actifs));

-- =========================================================================
-- 4. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0040_mesures_lire_heure')
ON CONFLICT (version) DO NOTHING;
