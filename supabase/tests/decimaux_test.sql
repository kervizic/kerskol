-- decimaux_test.sql
-- Nombres decimaux CM1 (migration 0072). Transaction ROLLBACK : aucune donnee
-- de test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre le jugement SERVEUR (verif_calcul) de la famille MA.DEC.% :
--   * op 'val' : reponse = valeur cible encodee en centiemes (3,25 -> 325) ;
--   * op 'cmp' : comparaison de deux decimaux (centiemes) ;
--   * ops interdites (add/sub/...) rejetees ;
--   * bornes (<= 100000 centiemes) ;
--   * referentiel : 3 competences portee CM1..CM2, 12 exercices decimaux,
--     domaine `decimaux` actif pour tous les profils.

BEGIN;

-- ===========================================================================
-- 1. verif_calcul : op 'val' (ecrire / encadrer) et 'cmp' (comparer)
-- ===========================================================================
DO $$
DECLARE r record;
BEGIN
    -- ECRIRE 3,25 -> 325 (val : expected = a, b = 0)
    r := public.verif_calcul('MA.DEC.ECRIRE', 2, 'val', 325, 0, NULL, NULL);
    IF r.expected <> 325 THEN RAISE EXCEPTION 'val 325 : expected % (attendu 325)', r.expected; END IF;

    -- ENCADRER : entier avant 3,25 -> 300 (val)
    r := public.verif_calcul('MA.DEC.ENCADRER', 1, 'val', 300, 0, NULL, NULL);
    IF r.expected <> 300 THEN RAISE EXCEPTION 'val 300 : expected %', r.expected; END IF;

    -- COMPARER : 3,45 (345) vs 3,7 (370) -> cmp = 0 (a < b)
    r := public.verif_calcul('MA.DEC.COMPARER', 2, 'cmp', 345, 370, NULL, NULL);
    IF r.expected <> 0 THEN RAISE EXCEPTION 'cmp 345<370 : expected % (attendu 0)', r.expected; END IF;
    r := public.verif_calcul('MA.DEC.COMPARER', 2, 'cmp', 500, 500, NULL, NULL);
    IF r.expected <> 1 THEN RAISE EXCEPTION 'cmp egal : expected % (attendu 1)', r.expected; END IF;

    RAISE NOTICE 'verif_calcul MA.DEC (val/cmp) : OK';
END $$;

-- ===========================================================================
-- 2. Operation interdite (add) sur une competence decimale -> rejet
-- ===========================================================================
DO $$
BEGIN
    PERFORM public.verif_calcul('MA.DEC.ECRIRE', 1, 'add', 300, 25, NULL, NULL);
    RAISE EXCEPTION 'op add aurait du etre interdite pour MA.DEC.ECRIRE';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
    END IF;
END $$;

-- ===========================================================================
-- 3. Borne haute (> 100000 centiemes) -> rejet
-- ===========================================================================
DO $$
BEGIN
    PERFORM public.verif_calcul('MA.DEC.ECRIRE', 1, 'val', 200000, 0, NULL, NULL);
    RAISE EXCEPTION 'valeur hors bornes aurait du etre rejetee';
EXCEPTION WHEN others THEN
    -- Le message est 'enonce_incoherent' ; le detail (« hors bornes ») n'est pas
    -- dans SQLERRM. On verifie donc le message standard de rejet.
    IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
    END IF;
END $$;

-- ===========================================================================
-- 4. Referentiel : competences, portee, exercices, domaine actif
-- ===========================================================================
DO $$
DECLARE n integer;
BEGIN
    -- 5 competences : ECRIRE / COMPARER / ENCADRER (lot 2) + ADDITION / SOUSTRACTION (lot 3).
    SELECT count(*) INTO n FROM public.competences
     WHERE code LIKE 'MA.DEC.%' AND domaine = 'decimaux'
       AND classe_min = 'CM1' AND classe_max = 'CM2';
    IF n <> 5 THEN RAISE EXCEPTION 'competences decimaux : % (attendu 5)', n; END IF;

    -- 20 exercices (5 x 4), forme 'decimal' ; operation decimal (lot 2) ou add/sub (lot 3).
    SELECT count(*) INTO n FROM public.exercices e
      JOIN public.ex_calcul x ON x.exercice_id = e.id
     WHERE e.competence LIKE 'MA.DEC.%' AND e.type = 'calcul'
       AND x.forme = 'decimal' AND x.operation IN ('decimal','add','sub') AND e.actif;
    IF n <> 20 THEN RAISE EXCEPTION 'exercices decimaux : % (attendu 20)', n; END IF;

    SELECT count(*) INTO n FROM public.profils WHERE NOT ('decimaux' = ANY (domaines_actifs));
    IF n <> 0 THEN RAISE EXCEPTION 'domaine decimaux manquant pour % profils', n; END IF;

    RAISE NOTICE 'referentiel decimaux (5 competences, 20 exercices, domaine actif) : OK';
END $$;

ROLLBACK;
