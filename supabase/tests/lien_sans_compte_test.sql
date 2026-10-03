-- lien_sans_compte_test.sql
-- Non-regression du bug "Relier un compte Google" : le parent doit pouvoir
-- creer un lien pour une adresse dont AUCUN compte n'existe encore (le flux
-- voulu : le lien est cree AVANT la 1re connexion de l'enfant). Puis, une fois
-- le compte cree et l'email confirme, la validation par code relie le profil.
-- Entierement en transaction ROLLBACK. Execution : deploy/test-db.sh.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

-- Parent A (foyer A, profil Nina). L'adresse de l'enfant n'existe PAS encore
-- dans auth.users au moment ou le parent cree le lien.
\set uA 'aa111111-1111-1111-1111-111111111111'
\set uChild 'cc999999-9999-9999-9999-999999999999'
INSERT INTO auth.users (id, email, created_at, email_confirmed_at) VALUES
    (:'uA', 'pa@example.test', now(), now());

INSERT INTO foyers (id) VALUES ('a1000000-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('a1000000-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, matieres_actives) VALUES
    ('c1000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000000', 'Nina', '{MA}'::text[]);

\set nina 'c1000000-0000-0000-0000-00000000000a'

-- Isolation : neutralise tout lien REEL preexistant le temps de la transaction.
DELETE FROM liens_enfant_en_attente;

\set claimsA     '{"sub":"aa111111-1111-1111-1111-111111111111","role":"authenticated"}'
\set claimsChild '{"sub":"cc999999-9999-9999-9999-999999999999","role":"authenticated"}'

-- ===========================================================================
-- TEST 1 : adresse SANS compte existant -> succes, code a 3 chiffres renvoye.
-- ===========================================================================
SELECT _rec('0_compte_absent_au_depart',
    NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = 'futur@example.test'),
    'le compte ne doit pas exister avant');

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT public.demander_lien_enfant(:'nina', 'Futur@Example.Test') AS code_nina \gset
RESET ROLE;

SELECT _rec('1a_code_3_chiffres', :'code_nina' ~ '^[0-9]{3}$', 'code = ' || :'code_nina');
SELECT _rec('1b_lien_cree_email_normalise',
    (SELECT email FROM liens_enfant_en_attente WHERE profil_id = :'nina') = 'futur@example.test',
    'email = ' || coalesce((SELECT email FROM liens_enfant_en_attente WHERE profil_id = :'nina'), 'NULL'));

-- ===========================================================================
-- TEST 2 : le compte est cree PLUS TARD (1re connexion Google), email confirme.
--          statut_lien_enfant -> en_attente ; valider avec le bon code -> relie.
-- ===========================================================================
INSERT INTO auth.users (id, email, created_at, email_confirmed_at) VALUES
    (:'uChild', 'futur@example.test', now(), now());

SET ROLE authenticated;
SET request.jwt.claims = :'claimsChild';
SELECT (public.statut_lien_enfant() ->> 'etat') AS st_child \gset
SELECT (public.valider_lien_enfant(:'code_nina')) AS r2 \gset
RESET ROLE;

SELECT _rec('2a_statut_en_attente', :'st_child' = 'en_attente', 'etat = ' || :'st_child');
SELECT _rec('2b_validation_ok', (:'r2'::jsonb ->> 'ok') = 'true'
    AND (:'r2'::jsonb ->> 'profil_id') = :'nina', 'r = ' || :'r2');
SELECT _rec('2c_user_id_pose',
    (SELECT user_id FROM profils WHERE id = :'nina') = :'uChild', 'user_id Nina');
SELECT _rec('2d_lien_supprime',
    (SELECT count(*) FROM liens_enfant_en_attente WHERE profil_id = :'nina') = 0, 'lien restant ?');
SELECT _rec('2e_journalise',
    (SELECT count(*) FROM journal_reglages WHERE profil_id = :'nina' AND cle = 'compte_enfant') = 1,
    'entrees journal');
SELECT _rec('2f_aucun_foyer_cree',
    (SELECT count(*) FROM membres_foyer WHERE user_id = :'uChild') = 0, 'membres_foyer enfant');

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
