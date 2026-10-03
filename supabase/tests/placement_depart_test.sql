-- placement_depart_test.sql
-- Verifie la migration 0012 : le placement demarre au niveau de depart de la
-- CLASSE (table placement_depart), pas systematiquement au niveau 1.
-- Tout en transaction ROLLBACK (aucune donnee ne subsiste).
--
-- Execution : deploy/test-db.sh

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

\set uA '11111111-1111-1111-1111-111111111111'
INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'sa@example.test', now());
INSERT INTO foyers (id) VALUES ('aaaaaaaa-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', :'uA');

-- pCE2 : classe CE2 (DOUBLES a un depart 3) ; pCM2 : classe CM2 (aucun depart -> 1).
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Ce2', 'CE2'),
    ('a0000002-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Cm2', 'CM2');

\set pCE2 'a0000001-0000-0000-0000-000000000000'
\set pCM2 'a0000002-0000-0000-0000-000000000000'
\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'

-- Depuis le lot 2 (0022), l'INSERT direct sur reponses est revoque a
-- authenticated (ecriture via la RPC enregistrer_reponse, en definer). On teste
-- ici le MOTEUR de placement en inserant comme postgres, exactement le contexte
-- dans lequel s'execute la RPC.

-- --- 1 : CE2 + DOUBLES (depart 3), UNE bonne reponse -> escalier a 3 ---------
INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le)
VALUES (gen_random_uuid(), :'pCE2', 'MA.CM.DOUBLES', 3, true, 3000, timestamptz '2026-02-01 10:00:00');

SELECT _rec('1_CE2_DOUBLES_depart3',
            (SELECT niveau FROM progression WHERE profil_id = :'pCE2' AND competence = 'MA.CM.DOUBLES') = 3,
            'niveau = ' || (SELECT niveau FROM progression WHERE profil_id = :'pCE2' AND competence = 'MA.CM.DOUBLES'));

-- --- 2 : CM2 + DOUBLES (aucun depart -> 1), UNE bonne reponse -> escalier a 2 -
INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le)
VALUES (gen_random_uuid(), :'pCM2', 'MA.CM.DOUBLES', 1, true, 3000, timestamptz '2026-02-01 10:00:00');

SELECT _rec('2_CM2_DOUBLES_depart1',
            (SELECT niveau FROM progression WHERE profil_id = :'pCM2' AND competence = 'MA.CM.DOUBLES') = 2,
            'niveau = ' || (SELECT niveau FROM progression WHERE profil_id = :'pCM2' AND competence = 'MA.CM.DOUBLES'));

-- --- 3 : CE2 + competence SANS ligne (TABLES.7) -> depart 1 -> escalier a 2 ---
INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le)
VALUES (gen_random_uuid(), :'pCE2', 'MA.TABLES.7', 1, true, 3000, timestamptz '2026-02-01 10:05:00');

SELECT _rec('3_CE2_sans_depart_defaut1',
            (SELECT niveau FROM progression WHERE profil_id = :'pCE2' AND competence = 'MA.TABLES.7') = 2,
            'niveau = ' || (SELECT niveau FROM progression WHERE profil_id = :'pCE2' AND competence = 'MA.TABLES.7'));

SELECT id, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS resultat, nom, detail
  FROM _res ORDER BY id;
DO $$
DECLARE v_fail int;
BEGIN
    SELECT count(*) INTO v_fail FROM _res WHERE NOT ok;
    RAISE NOTICE '=== % test(s) en echec sur % ===', v_fail, (SELECT count(*) FROM _res);
    IF v_fail > 0 THEN RAISE EXCEPTION 'TESTS EN ECHEC : %', v_fail; END IF;
END $$;

ROLLBACK;
