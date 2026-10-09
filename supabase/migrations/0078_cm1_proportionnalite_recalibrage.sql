-- 0078_cm1_proportionnalite_recalibrage.sql
-- LOT A (CM1) - RECALIBRAGE des niveaux de la sous-matiere « proportionnalite ».
--
-- Constat (signale par Manu) : la proportionnalite livree en 0074 avait un
-- etagement PLAT. N1 « 3 pommes = 6 €, 6 pommes ? » (doublement) et N4
-- « 2 gateaux = 6 oeufs, 8 gateaux ? » (coefficient entier x4) avaient la MEME
-- difficulte : a chaque niveau, on multipliait la quantite donnee par un
-- coefficient entier. Le N4 n'etait pas plus exigeant que le N1.
--
-- Nouvel etagement (miroir EXACT de frontend/src/domain/donnees/donnees.ts) :
--   N1  doublement (coefficient x2) ;
--   N2  coefficient entier (x3, x4) ;
--   N3  passage par l'unite : la cible n'est PAS un multiple de la donnee
--       (coefficient de colonne non entier), il faut trouver la valeur pour 1 ;
--   N4  tableau a 3 colonnes + passage par l'unite pour une cible qui n'est
--       multiple d'AUCUNE colonne montree. Nettement plus exigeant que le N1.
--
-- Migration ADDITIVE et IDEMPOTENTE : on ne touche QUE la colonne `attendu` des
-- 16 items de reference (les cles, competences, niveaux et formats sont
-- inchanges). AUCUN changement de domaines_actifs / DEFAULT (cf. incidents 0063
-- et 0072). AUCUN item ajoute ou supprime : le golden reste a 88.

-- =========================================================================
-- 1. Mise a jour des reponses attendues (seules les valeurs recalibrees
--    changent ; les autres UPDATE sont des no-op idempotents).
-- =========================================================================
UPDATE public.donnees_item AS d SET attendu = v.attendu
FROM (VALUES
    -- Recettes
    ('prop-rec-n1-a', '8'),
    ('prop-rec-n1-b', '6'),
    ('prop-rec-n2-a', '30'),
    ('prop-rec-n2-b', '400'),
    ('prop-rec-n3-a', '10'),
    ('prop-rec-n3-b', '12'),
    ('prop-rec-n4-a', '21'),
    ('prop-rec-n4-b', '125'),
    -- Courses
    ('prop-crs-n1-a', '12'),
    ('prop-crs-n1-b', '4'),
    ('prop-crs-n2-a', '9'),
    ('prop-crs-n2-b', '40'),
    ('prop-crs-n3-a', '12'),
    ('prop-crs-n3-b', '25'),
    ('prop-crs-n4-a', '10'),
    ('prop-crs-n4-b', '5')
) AS v(cle, attendu)
WHERE d.cle = v.cle;

-- =========================================================================
-- 2. Garde-fou : les 16 items PROP existent toujours (sinon la migration 0074
--    n'a pas ete appliquee) et le golden global reste a 88.
-- =========================================================================
DO $do$
DECLARE n_prop integer; n_tot integer;
BEGIN
    SELECT count(*) INTO n_prop FROM public.donnees_item
     WHERE competence IN ('MA.DONNEES.PROP_RECETTE','MA.DONNEES.PROP_COURSES');
    IF n_prop <> 16 THEN
        RAISE EXCEPTION 'proportionnalite : 16 items attendus, obtenu %', n_prop;
    END IF;
    SELECT count(*) INTO n_tot FROM public.donnees_item;
    IF n_tot <> 88 THEN
        RAISE EXCEPTION 'donnees_item : golden 88 attendu, obtenu %', n_tot;
    END IF;
END $do$;

-- =========================================================================
-- 3. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0078_cm1_proportionnalite_recalibrage')
ON CONFLICT (version) DO NOTHING;
