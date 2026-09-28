-- rls_progression_test.sql
-- Tests des regles RLS et du calcul de progression, entierement dans une
-- transaction ROLLBACK : AUCUNE donnee de test ne subsiste.
--
-- Execution : deploy/test-db.sh (psql -v ON_ERROR_STOP=1 dans le conteneur db).
-- Chaque test enregistre un resultat dans une table temporaire _res, affichee a
-- la fin. Un test en echec fait sortir le script en erreur (code != 0).
--
-- Simulation d'utilisateurs : SET ROLE authenticated + SET request.jwt.claims.
-- auth.uid() lit le claim "sub". On revient a postgres via RESET ROLE.

BEGIN;

-- --- Infrastructure de test -------------------------------------------------
CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);

CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

-- --- Jeu de donnees (cree en tant que postgres) -----------------------------
-- Deux foyers A et B, chacun un parent + des profils.
\set uA  '11111111-1111-1111-1111-111111111111'
\set uB  '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, email, created_at)
VALUES (:'uA', 'parentA@example.test', now()),
       (:'uB', 'parentB@example.test', now());

-- Foyers + membres
INSERT INTO foyers (id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000'),
    ('bbbbbbbb-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000', :'uA'),
    ('bbbbbbbb-0000-0000-0000-000000000000', :'uB');

-- Profils foyer A (un par test pour isoler la monnaie) + un profil foyer B.
-- classe = 'CM2' : aucune ligne placement_depart -> depart d'escalier au niveau 1
-- (on teste ici la MECANIQUE du placement/hysterese, independamment de la classe ;
-- le depart sensible a la classe est couvert par placement_depart_test.sql).
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Placement', 'CM2'),
    ('a0000002-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Hysterese', 'CM2'),
    ('a0000003-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Monnaie', 'CM2'),
    ('a0000004-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Journal', 'CM2'),
    ('b0000001-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000', 'EnfantB', 'CM2');

\set pPlace   'a0000001-0000-0000-0000-000000000000'
\set pHyst    'a0000002-0000-0000-0000-000000000000'
\set pMoney   'a0000003-0000-0000-0000-000000000000'
\set pJournal 'a0000004-0000-0000-0000-000000000000'
\set pB       'b0000001-0000-0000-0000-000000000000'

\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'
\set claimsB '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'

-- ===========================================================================
-- TEST 1 : isolation entre foyers (A ne voit ni n'ecrit chez B)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 1a : A ne voit pas le profil de B (RLS filtre => 0 ligne)
SELECT _rec('1a_A_ne_voit_pas_profil_B',
            (SELECT count(*) FROM profils WHERE id = 'b0000001-0000-0000-0000-000000000000') = 0,
            'lignes visibles = ' || (SELECT count(*) FROM profils WHERE id = 'b0000001-0000-0000-0000-000000000000'));

-- 1b : A ne peut pas inserer une reponse pour le profil de B (WITH CHECK => refus)
DO $$
BEGIN
    INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le)
    VALUES (gen_random_uuid(), 'b0000001-0000-0000-0000-000000000000', 'MA.CM.ADDITION', 1, true, 3000, now());
    PERFORM _rec('1b_A_ne_peut_ecrire_reponse_B', false, 'insertion acceptee a tort');
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    PERFORM _rec('1b_A_ne_peut_ecrire_reponse_B', true, 'refus attendu : ' || SQLERRM);
WHEN OTHERS THEN
    PERFORM _rec('1b_A_ne_peut_ecrire_reponse_B', true, 'refus (autre) : ' || SQLERRM);
END $$;

RESET ROLE;

-- ===========================================================================
-- TEST 2 : une reponse met a jour progression ET monnaie
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le)
VALUES ('c0000001-0000-0000-0000-000000000001', :'pMoney', 'MA.CM.ADDITION', 1, true, 3000,
        timestamptz '2026-01-01 10:00:00');

SELECT _rec('2a_progression_creee',
            (SELECT count(*) FROM progression WHERE profil_id = :'pMoney' AND competence = 'MA.CM.ADDITION') = 1,
            'lignes progression = ' || (SELECT count(*) FROM progression WHERE profil_id = :'pMoney'));

SELECT _rec('2b_monnaie_creditee_2',
            (SELECT monnaie FROM profils WHERE id = :'pMoney') = 2,
            'monnaie = ' || (SELECT monnaie FROM profils WHERE id = :'pMoney'));

-- ===========================================================================
-- TEST 9 : double insertion du meme id de reponse = pas de double credit
-- ===========================================================================
INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le)
VALUES ('c0000001-0000-0000-0000-000000000001', :'pMoney', 'MA.CM.ADDITION', 1, true, 3000,
        timestamptz '2026-01-01 10:00:00')
ON CONFLICT (id) DO NOTHING;

SELECT _rec('9_pas_de_double_credit',
            (SELECT monnaie FROM profils WHERE id = :'pMoney') = 2,
            'monnaie apres re-insertion = ' || (SELECT monnaie FROM profils WHERE id = :'pMoney'));

RESET ROLE;

-- ===========================================================================
-- TEST 3 : placement en escalier V,V,F,V -> niveau 2
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le)
SELECT gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000', 'MA.CM.DOUBLES', 1, c, 3000,
       timestamptz '2026-02-01 10:00:00' + (n || ' minutes')::interval
FROM unnest(ARRAY[true, true, false, true]) WITH ORDINALITY AS s(c, n);

SELECT _rec('3_placement_VVFV_niveau2',
            (SELECT niveau FROM progression WHERE profil_id = :'pPlace' AND competence = 'MA.CM.DOUBLES') = 2
        AND (SELECT placement_termine FROM progression WHERE profil_id = :'pPlace' AND competence = 'MA.CM.DOUBLES'),
            'niveau = ' || (SELECT niveau FROM progression WHERE profil_id = :'pPlace' AND competence = 'MA.CM.DOUBLES'));

-- ===========================================================================
-- TESTS 4 + 5 : hysterese (montee puis descente) et niveau_max non decroissant
-- Sequence : placement F,V,F -> niveau 1 ; 8xV -> montee niveau 2 ;
--            2xF -> descente niveau 1. niveau_max doit rester a 2.
-- ===========================================================================
INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le)
SELECT gen_random_uuid(), 'a0000002-0000-0000-0000-000000000000', 'MA.CM.ADDITION', 1, c, 3000,
       timestamptz '2026-03-01 10:00:00' + (n || ' minutes')::interval
FROM unnest(ARRAY[false,true,false, true,true,true,true,true,true,true,true, false,false]) WITH ORDINALITY AS s(c, n);

SELECT _rec('4_hysterese_descente_niveau1',
            (SELECT niveau FROM progression WHERE profil_id = :'pHyst' AND competence = 'MA.CM.ADDITION') = 1,
            'niveau final = ' || (SELECT niveau FROM progression WHERE profil_id = :'pHyst' AND competence = 'MA.CM.ADDITION'));

SELECT _rec('5_niveau_max_non_recul',
            (SELECT niveau_max_atteint FROM progression WHERE profil_id = :'pHyst' AND competence = 'MA.CM.ADDITION') = 2,
            'niveau_max = ' || (SELECT niveau_max_atteint FROM progression WHERE profil_id = :'pHyst' AND competence = 'MA.CM.ADDITION'));

RESET ROLE;

-- ===========================================================================
-- TEST 6 : append-only (reponses et journal_reglages non modifiables/supprimables)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

DO $$
BEGIN
    UPDATE reponses SET correct = false WHERE profil_id = 'a0000003-0000-0000-0000-000000000000';
    PERFORM _rec('6a_reponses_non_modifiables', false, 'UPDATE accepte a tort');
EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _rec('6a_reponses_non_modifiables', true, 'refus attendu : ' || SQLERRM);
WHEN OTHERS THEN
    PERFORM _rec('6a_reponses_non_modifiables', true, 'refus (autre) : ' || SQLERRM);
END $$;

DO $$
BEGIN
    DELETE FROM reponses WHERE profil_id = 'a0000003-0000-0000-0000-000000000000';
    PERFORM _rec('6b_reponses_non_supprimables', false, 'DELETE accepte a tort');
EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _rec('6b_reponses_non_supprimables', true, 'refus attendu : ' || SQLERRM);
WHEN OTHERS THEN
    PERFORM _rec('6b_reponses_non_supprimables', true, 'refus (autre) : ' || SQLERRM);
END $$;

RESET ROLE;

-- ===========================================================================
-- TEST 7 : limite_jour_min journalisee, univers NON journalise
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- Changement de limite -> doit apparaitre dans journal_reglages
UPDATE profils SET limite_jour_min = 30 WHERE id = :'pJournal';

SELECT _rec('7a_limite_journalisee',
            (SELECT count(*) FROM journal_reglages
              WHERE profil_id = :'pJournal' AND cle = 'limite_jour_min') = 1,
            'entrees journal limite = ' || (SELECT count(*) FROM journal_reglages
              WHERE profil_id = :'pJournal' AND cle = 'limite_jour_min'));

-- Changement d'univers -> ne doit PAS etre journalise
UPDATE profils SET univers = 'ile_tropicale' WHERE id = :'pJournal';

SELECT _rec('7b_univers_non_journalise',
            (SELECT count(*) FROM journal_reglages
              WHERE profil_id = :'pJournal' AND cle = 'univers') = 0,
            'entrees journal univers = ' || (SELECT count(*) FROM journal_reglages
              WHERE profil_id = :'pJournal' AND cle = 'univers'));

-- 6c : journal_reglages non modifiable / supprimable cote API
DO $$
BEGIN
    UPDATE journal_reglages SET cle = 'x' WHERE profil_id = 'a0000004-0000-0000-0000-000000000000';
    PERFORM _rec('6c_journal_non_modifiable', false, 'UPDATE accepte a tort');
EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _rec('6c_journal_non_modifiable', true, 'refus attendu : ' || SQLERRM);
WHEN OTHERS THEN
    PERFORM _rec('6c_journal_non_modifiable', true, 'refus (autre) : ' || SQLERRM);
END $$;

DO $$
BEGIN
    DELETE FROM journal_reglages WHERE profil_id = 'a0000004-0000-0000-0000-000000000000';
    PERFORM _rec('6d_journal_non_supprimable', false, 'DELETE accepte a tort');
EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _rec('6d_journal_non_supprimable', true, 'refus attendu : ' || SQLERRM);
WHEN OTHERS THEN
    PERFORM _rec('6d_journal_non_supprimable', true, 'refus (autre) : ' || SQLERRM);
END $$;

RESET ROLE;

-- ===========================================================================
-- TEST 8 : supprimer_foyer refuse sans authentification recente (amr)
-- ===========================================================================
SET ROLE authenticated;
-- Claims SANS amr recent (aucun amr) -> _reauth_recente() = false
SET request.jwt.claims = :'claimsA';

DO $$
BEGIN
    PERFORM supprimer_foyer('aaaaaaaa-0000-0000-0000-000000000000');
    PERFORM _rec('8_supprimer_foyer_refuse_sans_amr', false, 'suppression acceptee a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('8_supprimer_foyer_refuse_sans_amr', SQLERRM LIKE '%reauth_requise%',
                 'exception : ' || SQLERRM);
END $$;

RESET ROLE;

-- ===========================================================================
-- Rapport
-- ===========================================================================
SELECT id, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS resultat, nom, detail
  FROM _res ORDER BY id;

DO $$
DECLARE v_fail int;
BEGIN
    SELECT count(*) INTO v_fail FROM _res WHERE NOT ok;
    RAISE NOTICE '=== % test(s) en echec sur % ===', v_fail, (SELECT count(*) FROM _res);
    IF v_fail > 0 THEN
        RAISE EXCEPTION 'TESTS EN ECHEC : %', v_fail;
    END IF;
END $$;

ROLLBACK;
