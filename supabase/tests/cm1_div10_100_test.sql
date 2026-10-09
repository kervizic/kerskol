-- cm1_div10_100_test.sql
-- Calcul mental CM1 « Diviser par 10 et 100 » (migration 0080). Transaction
-- ROLLBACK. Execution : deploy/test-db.sh. Couvre le jugement SERVEUR
-- (verif_calcul, op 'div' + garde-fou diviseur) et le referentiel.

BEGIN;

-- ===========================================================================
-- 1. verif_calcul : op 'div' acceptee, quotient exact, reste calcule.
-- ===========================================================================
DO $$
DECLARE r record;
BEGIN
    r := public.verif_calcul('MA.CM.DIV10_100', 1, 'div', 450, 10, NULL, NULL);
    IF r.expected <> 45 THEN RAISE EXCEPTION '450/10 : expected % (attendu 45)', r.expected; END IF;
    r := public.verif_calcul('MA.CM.DIV10_100', 3, 'div', 2000, 100, NULL, NULL);
    IF r.expected <> 20 THEN RAISE EXCEPTION '2000/100 : expected % (attendu 20)', r.expected; END IF;
    RAISE NOTICE 'verif_calcul MA.CM.DIV10_100 (div) : OK';
END $$;

-- ===========================================================================
-- 2. Garde-fou : diviseur hors (10,100) rejete.
-- ===========================================================================
DO $$
BEGIN
    PERFORM public.verif_calcul('MA.CM.DIV10_100', 1, 'div', 45, 3, NULL, NULL);
    RAISE EXCEPTION 'diviseur 3 aurait du etre rejete';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
    END IF;
END $$;

-- ===========================================================================
-- 3. Operation interdite (mul) -> rejet.
-- ===========================================================================
DO $$
BEGIN
    PERFORM public.verif_calcul('MA.CM.DIV10_100', 1, 'mul', 45, 10, NULL, NULL);
    RAISE EXCEPTION 'op mul aurait du etre interdite pour MA.CM.DIV10_100';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
    END IF;
END $$;

-- ===========================================================================
-- 4. Referentiel : competence portee CM1..CM2, 4 exercices, domaine actif.
-- ===========================================================================
DO $$
DECLARE n integer;
BEGIN
    SELECT count(*) INTO n FROM public.competences
     WHERE code = 'MA.CM.DIV10_100' AND domaine = 'calcul_mental'
       AND classe_min = 'CM1' AND classe_max = 'CM2';
    IF n <> 1 THEN RAISE EXCEPTION 'competence DIV10_100 : % (attendu 1)', n; END IF;

    SELECT count(*) INTO n FROM public.exercices e
      JOIN public.ex_calcul x ON x.exercice_id = e.id
     WHERE e.competence = 'MA.CM.DIV10_100' AND e.type = 'calcul'
       AND x.operation = 'div' AND x.forme = 'resultat' AND e.actif;
    IF n <> 4 THEN RAISE EXCEPTION 'exercices DIV10_100 : % (attendu 4)', n; END IF;

    SELECT count(*) INTO n FROM public.profils WHERE NOT ('calcul_mental' = ANY (domaines_actifs));
    IF n <> 0 THEN RAISE EXCEPTION 'domaine calcul_mental manquant pour % profils', n; END IF;

    RAISE NOTICE 'referentiel DIV10_100 (1 competence, 4 exercices, domaine actif) : OK';
END $$;

ROLLBACK;
