-- cm1_grands_nombres_test.sql
-- LOT 2 (CM1) : la competence MA.NUM.GRANDS est jugee par verif_calcul (SEUL
-- JUGE). On teste directement la fonction : grands nombres acceptes (cmp/val
-- jusqu'au million), operande > 1 000 000 refusee, operation interdite refusee,
-- et NON-regression : les autres MA.NUM.* restent bornees a 10 000.
-- Transaction ROLLBACK (aucune donnee ne subsiste).

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);

-- TEST 1 : comparer deux grands nombres (500000 > 400000 -> 2).
DO $$
DECLARE e integer; r integer;
BEGIN
    SELECT expected, reste INTO e, r FROM public.verif_calcul('MA.NUM.GRANDS', 3, 'cmp', 500000, 400000, NULL, NULL);
    INSERT INTO _res(nom, ok, detail) VALUES ('1_cmp_grand', e = 2, 'expected=' || e);
END $$;

-- TEST 2 : ranger / plus grand (val) jusqu'au million (answer = 1000000).
DO $$
DECLARE e integer;
BEGIN
    SELECT expected INTO e FROM public.verif_calcul('MA.NUM.GRANDS', 4, 'val', 1000000, 0, NULL, NULL);
    INSERT INTO _res(nom, ok, detail) VALUES ('2_val_million', e = 1000000, 'expected=' || e);
END $$;

-- TEST 3 : operande > 1 000 000 refusee.
DO $$
BEGIN
    PERFORM public.verif_calcul('MA.NUM.GRANDS', 4, 'val', 1000001, 0, NULL, NULL);
    INSERT INTO _res(nom, ok, detail) VALUES ('3_refus_sup_million', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO _res(nom, ok, detail) VALUES ('3_refus_sup_million', true, 'refus attendu : ' || SQLERRM);
END $$;

-- TEST 4 : operation interdite (add) refusee pour MA.NUM.GRANDS.
DO $$
BEGIN
    PERFORM public.verif_calcul('MA.NUM.GRANDS', 1, 'add', 12345, 6789, NULL, NULL);
    INSERT INTO _res(nom, ok, detail) VALUES ('4_refus_op_interdite', false, 'add accepte a tort');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO _res(nom, ok, detail) VALUES ('4_refus_op_interdite', true, 'refus attendu : ' || SQLERRM);
END $$;

-- TEST 5 : NON-regression. MA.NUM.LIRE_ECRIRE reste bornee a 10 000.
DO $$
BEGIN
    PERFORM public.verif_calcul('MA.NUM.LIRE_ECRIRE', 2, 'val', 15000, 0, NULL, NULL);
    INSERT INTO _res(nom, ok, detail) VALUES ('5_num_classique_borne', false, '15000 accepte a tort');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO _res(nom, ok, detail) VALUES ('5_num_classique_borne', true, 'refus attendu : ' || SQLERRM);
END $$;

-- TEST 6 : la competence existe en base, portee CM1..CM2.
INSERT INTO _res(nom, ok, detail)
SELECT '6_competence_portee_CM1',
       (classe_min = 'CM1' AND classe_max = 'CM2'),
       'classe_min=' || classe_min || ' classe_max=' || classe_max
  FROM public.competences WHERE code = 'MA.NUM.GRANDS';

-- Rapport
SELECT id, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS resultat, nom, detail FROM _res ORDER BY id;
DO $$
DECLARE v_fail int;
BEGIN
    SELECT count(*) INTO v_fail FROM _res WHERE NOT ok;
    RAISE NOTICE '=== % test(s) en echec sur % ===', v_fail, (SELECT count(*) FROM _res);
    IF v_fail > 0 THEN RAISE EXCEPTION 'TESTS EN ECHEC : %', v_fail; END IF;
END $$;

ROLLBACK;
