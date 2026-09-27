-- classe_test.sql
-- Classe scolaire : defaut CE2, contrainte CHECK, journalisation + horodatage du
-- changement de classe. Transaction ROLLBACK (aucune donnee ne subsiste).

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

\set uA 'ca111111-1111-1111-1111-111111111111'
INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'pc@example.test', now());
INSERT INTO foyers (id) VALUES ('c1000000-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('c1000000-0000-0000-0000-000000000000', :'uA');
\set claimsA '{"sub":"ca111111-1111-1111-1111-111111111111","role":"authenticated"}'

-- TEST 1 : classe par defaut = CE2 (insert sans classe)
INSERT INTO profils (id, foyer_id, surnom)
VALUES ('c0000001-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Sansclasse');
SELECT _rec('1_classe_defaut_CE2',
            (SELECT classe FROM profils WHERE id = 'c0000001-0000-0000-0000-000000000000') = 'CE2',
            'classe = ' || (SELECT classe FROM profils WHERE id = 'c0000001-0000-0000-0000-000000000000'));

-- TEST 2 : la contrainte CHECK rejette une classe invalide
DO $$
BEGIN
    UPDATE profils SET classe = 'GS' WHERE id = 'c0000001-0000-0000-0000-000000000000';
    PERFORM _rec('2_check_classe_invalide', false, 'valeur invalide acceptee a tort');
EXCEPTION WHEN check_violation THEN
    PERFORM _rec('2_check_classe_invalide', true, 'refus attendu : ' || SQLERRM);
END $$;

-- TEST 3 + 4 : changement de classe journalise + classe_maj_le mis a jour
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
UPDATE profils SET classe = 'CM1' WHERE id = 'c0000001-0000-0000-0000-000000000000';
RESET ROLE;

SELECT _rec('3_changement_classe_journalise',
            (SELECT count(*) FROM journal_reglages
              WHERE profil_id = 'c0000001-0000-0000-0000-000000000000' AND cle = 'classe') = 1,
            'entrees journal classe = ' || (SELECT count(*) FROM journal_reglages
              WHERE profil_id = 'c0000001-0000-0000-0000-000000000000' AND cle = 'classe'));

SELECT _rec('4_classe_maj_le_pose',
            (SELECT classe_maj_le >= cree_le FROM profils
              WHERE id = 'c0000001-0000-0000-0000-000000000000'),
            'classe_maj_le renseigne apres changement');

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
