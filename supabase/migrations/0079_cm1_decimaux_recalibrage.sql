-- 0079_cm1_decimaux_recalibrage.sql
-- LOT A (CM1) - RECALIBRAGE des niveaux des sous-matieres decimales
-- MA.DEC.COMPARER et MA.DEC.ENCADRER (sous-matiere « decimaux », lot 0072).
--
-- Constat (audit lot A) : l'etagement etait PLAT pour ces deux competences.
--   * COMPARER : les deux decimaux a comparer partageaient TOUJOURS la meme
--     partie entiere ; la comparaison portait sur deux nombres 0..99 a chaque
--     niveau (le parametre maxE ne changeait qu'une partie entiere identique des
--     deux cotes, donc cosmetique) -> N2 = N3 = N4 en difficulte reelle.
--   * ENCADRER : « l'entier juste avant / juste apres » est une tache constante
--     (maxE cosmetique) -> N2 = N3 = N4.
--
-- Recalibrage (miroir EXACT de frontend/src/domain/calcul/decimaux.ts +
-- seedSources.ts). La difficulte porte desormais sur la STRUCTURE decimale :
--   COMPARER  N1 struct "ent"  (parties entieres differentes) ;
--             N2 struct "dix"  (meme entier, dixiemes) ;
--             N3 struct "long" (longueurs differentes, piege « 2,5 vs 2,45 ») ;
--             N4 struct "cent" (centiemes, piege du zero « 0,07 vs 0,7 »).
--   ENCADRER  N1 entre entiers, un chiffre apres la virgule ;
--             N2 entre entiers, centiemes, + « juste apres » ;
--             N3/N4 encadrement AU DIXIEME (ex. 3,47 entre 3,4 et 3,5).
--
-- Migration ADDITIVE et IDEMPOTENTE : on ne fait qu'UPDATE ex_calcul.params des
-- 8 exercices existants (COMPARER x4, ENCADRER x4). AUCUN exercice ajoute ou
-- supprime (le golden reste a 20 exercices MA.DEC.%). AUCUN changement de
-- domaines_actifs / DEFAULT. Le SERVEUR reste SEUL JUGE (op 'val', bornes
-- MA.DEC.% <= 100000 centiemes inchangees : aucune valeur generee ne depasse).

-- =========================================================================
-- 1. Mise a jour des parametres de generation (jsonb) par (competence, niveau).
-- =========================================================================
DO $do$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('MA.DEC.COMPARER',1,'{"types":["comparer_grand"],"struct":"ent","maxE":9}'::jsonb),
            ('MA.DEC.COMPARER',2,'{"types":["comparer_grand","comparer_petit"],"struct":"dix","maxE":9}'::jsonb),
            ('MA.DEC.COMPARER',3,'{"types":["comparer_grand","comparer_petit"],"struct":"long","maxE":20}'::jsonb),
            ('MA.DEC.COMPARER',4,'{"types":["comparer_grand","comparer_petit"],"struct":"cent","maxE":99}'::jsonb),
            ('MA.DEC.ENCADRER',1,'{"types":["encadrer_avant"],"pas":"entier","decimales":1,"maxE":9}'::jsonb),
            ('MA.DEC.ENCADRER',2,'{"types":["encadrer_avant","encadrer_apres"],"pas":"entier","decimales":2,"maxE":20}'::jsonb),
            ('MA.DEC.ENCADRER',3,'{"types":["encadrer_avant","encadrer_apres"],"pas":"dixieme","maxE":20}'::jsonb),
            ('MA.DEC.ENCADRER',4,'{"types":["encadrer_avant","encadrer_apres"],"pas":"dixieme","maxE":99}'::jsonb)
        ) AS t(competence,niveau,params)
    LOOP
        UPDATE public.ex_calcul x
           SET params = r.params
          FROM public.exercices e
         WHERE x.exercice_id = e.id
           AND e.competence = r.competence
           AND e.niveau = r.niveau
           AND e.type = 'calcul';
    END LOOP;
END $do$;

-- =========================================================================
-- 2. Garde-fou : les 8 exercices existent toujours et le golden MA.DEC.%
--    reste a 20 exercices.
-- =========================================================================
DO $do$
DECLARE n_maj integer; n_tot integer;
BEGIN
    SELECT count(*) INTO n_maj FROM public.exercices e
      JOIN public.ex_calcul x ON x.exercice_id = e.id
     WHERE e.competence IN ('MA.DEC.COMPARER','MA.DEC.ENCADRER')
       AND x.params ? 'maxE';
    IF n_maj <> 8 THEN
        RAISE EXCEPTION 'decimaux recalibrage : 8 exercices COMPARER/ENCADRER attendus, obtenu %', n_maj;
    END IF;
    SELECT count(*) INTO n_tot FROM public.exercices e
      JOIN public.ex_calcul x ON x.exercice_id = e.id
     WHERE e.competence LIKE 'MA.DEC.%' AND e.type = 'calcul' AND e.actif;
    IF n_tot <> 20 THEN
        RAISE EXCEPTION 'decimaux : golden 20 exercices attendu, obtenu %', n_tot;
    END IF;
END $do$;

-- =========================================================================
-- 3. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0079_cm1_decimaux_recalibrage')
ON CONFLICT (version) DO NOTHING;
