-- profils_insert_test.sql
-- Non-regression du bug de CREATION de profil : un parent authentifie doit
-- pouvoir INSERER un profil AVEC RETURNING (equivalent PostgREST
-- Prefer: return=representation). Verifie aussi que la policy SELECT reste
-- correcte (parent voit, enfant voit son profil, tiers ne voit pas) et que
-- creer_foyer est idempotent. Entierement en transaction ROLLBACK.
--
-- Execution : deploy/test-db.sh (psql -v ON_ERROR_STOP=1 dans le conteneur db).

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

-- Deux parents (A, B) + un enfant relie (E) ; foyer A pour le parent A.
\set uA 'aa111111-1111-1111-1111-111111111111'
\set uB 'bb222222-2222-2222-2222-222222222222'
\set uE 'ee333333-3333-3333-3333-333333333333'
INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'pa@example.test', now()),
    (:'uB', 'pb@example.test', now()),
    (:'uE', 'enfant@example.test', now());

INSERT INTO foyers (id) VALUES ('a1000000-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('a1000000-0000-0000-0000-000000000000', :'uA');

\set claimsA '{"sub":"aa111111-1111-1111-1111-111111111111","role":"authenticated"}'
\set claimsB '{"sub":"bb222222-2222-2222-2222-222222222222","role":"authenticated"}'
\set claimsE '{"sub":"ee333333-3333-3333-3333-333333333333","role":"authenticated"}'

-- ===========================================================================
-- TEST 1 : le parent A insere un profil AVEC RETURNING (return=representation)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

DO $$
DECLARE v_id uuid;
BEGIN
    INSERT INTO profils (foyer_id, surnom, avatar, univers, matieres_actives, limite_jour_min)
    VALUES ('a1000000-0000-0000-0000-000000000000', 'Lou',
            '{"forme":"chaton","couleur":"#D53F8C"}'::jsonb, 'village_gourmand',
            '{MA}'::text[], 15)
    RETURNING id INTO v_id;   -- RETURNING => declenche la policy SELECT sur la ligne
    PERFORM _rec('1_insert_profil_avec_returning', v_id IS NOT NULL,
                 'id renvoye = ' || coalesce(v_id::text, 'NULL'));
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('1_insert_profil_avec_returning', false, 'refus a tort : ' || SQLERRM);
END $$;

RESET ROLE;

-- Relier l'enfant E au profil (fait par un parent via RPC, ici en postgres)
UPDATE profils SET user_id = :'uE'
 WHERE foyer_id = 'a1000000-0000-0000-0000-000000000000' AND surnom = 'Lou';

-- ===========================================================================
-- TEST 2 : le parent A voit le profil ; TEST 3 : l'enfant E voit son profil
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT _rec('2_parent_voit_profil',
            (SELECT count(*) FROM profils WHERE surnom = 'Lou') = 1,
            'profils visibles A = ' || (SELECT count(*) FROM profils WHERE surnom = 'Lou'));
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
SELECT _rec('3_enfant_voit_son_profil',
            (SELECT count(*) FROM profils WHERE surnom = 'Lou') = 1,
            'profils visibles E = ' || (SELECT count(*) FROM profils WHERE surnom = 'Lou'));
RESET ROLE;

-- ===========================================================================
-- TEST 4 : un tiers (parent B) ne voit pas le profil ni ne peut l'inserer
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsB';
SELECT _rec('4a_tiers_ne_voit_pas',
            (SELECT count(*) FROM profils WHERE surnom = 'Lou') = 0,
            'profils visibles B = ' || (SELECT count(*) FROM profils WHERE surnom = 'Lou'));
DO $$
BEGIN
    INSERT INTO profils (foyer_id, surnom, matieres_actives)
    VALUES ('a1000000-0000-0000-0000-000000000000', 'Intrus', '{MA}'::text[]);
    PERFORM _rec('4b_tiers_ne_peut_inserer', false, 'insertion acceptee a tort');
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    PERFORM _rec('4b_tiers_ne_peut_inserer', true, 'refus attendu : ' || SQLERRM);
WHEN OTHERS THEN
    PERFORM _rec('4b_tiers_ne_peut_inserer', true, 'refus (autre) : ' || SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 5 : creer_foyer idempotent (meme foyer renvoye au 2e appel)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT _rec('5_creer_foyer_idempotent',
            public.creer_foyer() = public.creer_foyer(),
            'foyer = ' || public.creer_foyer()::text);
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
