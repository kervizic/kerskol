-- cm1_fractions_test.sql
-- LOT 1 (CM1) : les competences MA.FRAC.{DROITE,COMPARER,EGALITES,QUANTITE}
-- sont jugees par verif_calcul (SEUL JUGE). On teste directement la fonction :
-- ops autorisees acceptees, ops interdites refusees, borne famille MA.FRAC.%
-- (<= 2000) respectee, portee CM1..CM2, et NON-regression (MA.FRAC.SIMPLES).
-- Transaction ROLLBACK (aucune donnee ne subsiste).

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);

-- TEST 1 : comparer 1/3 et 1/2 -> a=1*2=2, b=1*3=3 -> 2<3 -> expected 0 (1/3<1/2).
DO $$
DECLARE e integer;
BEGIN
    SELECT expected INTO e FROM public.verif_calcul('MA.FRAC.COMPARER', 1, 'cmp', 2, 3, NULL, NULL);
    INSERT INTO _res(nom, ok, detail) VALUES ('1_comparer_cmp', e = 0, 'expected=' || e);
END $$;

-- TEST 2 : droite graduee, code de 3/4 = 3*100+4 = 304 (val).
DO $$
DECLARE e integer;
BEGIN
    SELECT expected INTO e FROM public.verif_calcul('MA.FRAC.DROITE', 2, 'val', 304, 0, NULL, NULL);
    INSERT INTO _res(nom, ok, detail) VALUES ('2_droite_val', e = 304, 'expected=' || e);
END $$;

-- TEST 3 : fraction d'une quantite, 1/4 de 20 (div) -> 5.
DO $$
DECLARE e integer;
BEGIN
    SELECT expected INTO e FROM public.verif_calcul('MA.FRAC.QUANTITE', 1, 'div', 20, 4, NULL, NULL);
    INSERT INTO _res(nom, ok, detail) VALUES ('3_quantite_div', e = 5, 'expected=' || e);
END $$;

-- TEST 4 : egalite 2/3 = 4/6, reponse = 4 (val).
DO $$
DECLARE e integer;
BEGIN
    SELECT expected INTO e FROM public.verif_calcul('MA.FRAC.EGALITES', 4, 'val', 4, 0, NULL, NULL);
    INSERT INTO _res(nom, ok, detail) VALUES ('4_egalites_val', e = 4, 'expected=' || e);
END $$;

-- TEST 5 : borne famille MA.FRAC.% -> operande > 2000 refusee.
DO $$
BEGIN
    PERFORM public.verif_calcul('MA.FRAC.DROITE', 4, 'val', 2001, 0, NULL, NULL);
    INSERT INTO _res(nom, ok, detail) VALUES ('5_refus_sup_2000', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO _res(nom, ok, detail) VALUES ('5_refus_sup_2000', true, 'refus attendu : ' || SQLERRM);
END $$;

-- TEST 6 : operation interdite (val) pour MA.FRAC.COMPARER (seul cmp autorise).
DO $$
BEGIN
    PERFORM public.verif_calcul('MA.FRAC.COMPARER', 1, 'val', 5, 0, NULL, NULL);
    INSERT INTO _res(nom, ok, detail) VALUES ('6_refus_op_interdite', false, 'val accepte a tort');
EXCEPTION WHEN OTHERS THEN
    INSERT INTO _res(nom, ok, detail) VALUES ('6_refus_op_interdite', true, 'refus attendu : ' || SQLERRM);
END $$;

-- TEST 7 : les 4 competences existent, portee CM1..CM2.
INSERT INTO _res(nom, ok, detail)
SELECT '7_competences_portee_CM1',
       count(*) = 4,
       'count CM1..CM2 = ' || count(*)
  FROM public.competences
 WHERE code IN ('MA.FRAC.DROITE','MA.FRAC.COMPARER','MA.FRAC.EGALITES','MA.FRAC.QUANTITE')
   AND classe_min = 'CM1' AND classe_max = 'CM2';

-- TEST 8 : NON-regression. MA.FRAC.SIMPLES garde ses ops (div : 1/2 de 12 = 6).
DO $$
DECLARE e integer;
BEGIN
    SELECT expected INTO e FROM public.verif_calcul('MA.FRAC.SIMPLES', 4, 'div', 12, 2, NULL, NULL);
    INSERT INTO _res(nom, ok, detail) VALUES ('8_simples_nonregression', e = 6, 'expected=' || e);
END $$;

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
