-- inscriptions_fermees_test.sql
-- Inscriptions fermees (migration 0015) : creer_foyer limite a la liste blanche,
-- membres existants non bloques, purge des comptes orphelins.
-- Transaction ROLLBACK. Execution : deploy/test-db.sh.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;

-- uA : autorise (dans la liste) ; uB : non autorise ; uM : membre d'un foyer
-- existant dont l'email n'est PAS dans la liste (test du retour anticipe).
\set uA 'a0000000-0000-0000-0000-0000000000a1'
\set uB 'b0000000-0000-0000-0000-0000000000b1'
\set uM 'c0000000-0000-0000-0000-0000000000c1'
INSERT INTO auth.users (id, email, created_at, email_confirmed_at) VALUES
    (:'uA', 'autorise@example.test',     now(), now()),
    (:'uB', 'inconnu@example.test',      now(), now()),
    (:'uM', 'membre@example.test',       now(), now());

INSERT INTO public.inscriptions_autorisees (email) VALUES ('autorise@example.test');

-- Membre deja rattache a un foyer (email NON autorise).
INSERT INTO foyers (id) VALUES ('f0000000-0000-0000-0000-00000000000f');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('f0000000-0000-0000-0000-00000000000f', :'uM');

\set claimsA '{"sub":"a0000000-0000-0000-0000-0000000000a1","role":"authenticated"}'
\set claimsB '{"sub":"b0000000-0000-0000-0000-0000000000b1","role":"authenticated"}'
\set claimsM '{"sub":"c0000000-0000-0000-0000-0000000000c1","role":"authenticated"}'

-- TEST 1 : compte NON autorise -> inscriptions_fermees
SET ROLE authenticated;
SET request.jwt.claims = :'claimsB';
DO $$
BEGIN
    PERFORM public.creer_foyer();
    PERFORM _rec('1_non_autorise_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('1_non_autorise_refuse', SQLERRM LIKE '%inscriptions_fermees%', SQLERRM);
END $$;
RESET ROLE;

-- TEST 2 : compte autorise -> cree un foyer
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
DO $$
DECLARE v_f uuid;
BEGIN
    v_f := public.creer_foyer();
    PERFORM _rec('2_autorise_cree', v_f IS NOT NULL, 'foyer = ' || coalesce(v_f::text, 'NULL'));
END $$;
RESET ROLE;

-- TEST 3 : membre existant (email non liste) -> retourne son foyer, pas bloque
SET ROLE authenticated;
SET request.jwt.claims = :'claimsM';
DO $$
DECLARE v_f uuid;
BEGIN
    v_f := public.creer_foyer();
    PERFORM _rec('3_membre_non_bloque', v_f = 'f0000000-0000-0000-0000-00000000000f',
        'foyer = ' || coalesce(v_f::text, 'NULL'));
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('3_membre_non_bloque', false, 'refus a tort : ' || SQLERRM);
END $$;
RESET ROLE;

-- TEST 4 : purge des comptes orphelins
--   orphan_old  : > 24 h, rien -> SUPPRIME
--   orphan_new  : < 24 h       -> conserve
--   with_link   : > 24 h mais lien enfant en attente -> conserve
--   uA/uB/uM encore references (foyer, autorisation) -> conserves
INSERT INTO auth.users (id, email, created_at, email_confirmed_at) VALUES
    ('d0000000-0000-0000-0000-00000000dead', 'orphan_old@example.test', now() - interval '25 hours', now()),
    ('d0000000-0000-0000-0000-00000000new1', 'orphan_new@example.test', now() - interval '1 hour',  now()),
    ('d0000000-0000-0000-0000-00000000link', 'with_link@example.test',  now() - interval '48 hours', now());
-- un profil non relie pour porter le lien en attente
INSERT INTO profils (id, foyer_id, surnom, matieres_actives)
VALUES ('e0000000-0000-0000-0000-0000000prof1', 'f0000000-0000-0000-0000-00000000000f', 'Kid', '{MA}'::text[]);
INSERT INTO liens_enfant_en_attente (profil_id, email, cree_par)
VALUES ('e0000000-0000-0000-0000-0000000prof1', 'with_link@example.test', :'uM');

DO $$
DECLARE v_n integer;
BEGIN
    v_n := public.purge_comptes_orphelins();
    PERFORM _rec('4a_purge_compte', v_n = 1, 'supprimes = ' || v_n);
END $$;
SELECT _rec('4b_orphan_old_supprime',
    NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'd0000000-0000-0000-0000-00000000dead'), 'doit etre supprime');
SELECT _rec('4c_orphan_new_conserve',
    EXISTS (SELECT 1 FROM auth.users WHERE id = 'd0000000-0000-0000-0000-00000000new1'), 'doit rester');
SELECT _rec('4d_with_link_conserve',
    EXISTS (SELECT 1 FROM auth.users WHERE id = 'd0000000-0000-0000-0000-00000000link'), 'doit rester');
SELECT _rec('4e_autorise_conserve',
    EXISTS (SELECT 1 FROM auth.users WHERE id = :'uB'), 'uB autorise? non mais recent -> rester');

-- Rapport
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
