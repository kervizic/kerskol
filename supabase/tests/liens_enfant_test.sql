-- liens_enfant_test.sql
-- Rattachement du compte Google d'un enfant a son profil (migration 0013).
-- Couvre : creation du lien en attente, normalisation email, unicite, RLS
-- (parent uniquement), rattachement au login, idempotence, expiration,
-- colonnes interdites a l'enfant, isolation de l'enfant (ne voit que son profil,
-- ni journal), delier, et NON-creation de foyer pour l'enfant.
-- Entierement en transaction ROLLBACK. Execution : deploy/test-db.sh.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

-- Parent A (foyer A, profils Lou + Zoe), parent B (foyer B), enfants E et F.
\set uA 'aa111111-1111-1111-1111-111111111111'
\set uB 'bb222222-2222-2222-2222-222222222222'
\set uE 'ee333333-3333-3333-3333-333333333333'
\set uF 'ff444444-4444-4444-4444-444444444444'
INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'pa@example.test',     now()),
    (:'uB', 'pb@example.test',     now()),
    (:'uE', 'iris@example.test',   now()),
    (:'uF', 'noe@example.test',    now());

INSERT INTO foyers (id) VALUES
    ('a1000000-0000-0000-0000-000000000000'),
    ('b1000000-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('a1000000-0000-0000-0000-000000000000', :'uA'),
    ('b1000000-0000-0000-0000-000000000000', :'uB');

INSERT INTO profils (id, foyer_id, surnom, matieres_actives) VALUES
    ('c1000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000000', 'Lou', '{MA}'::text[]),
    ('c2000000-0000-0000-0000-00000000000b', 'a1000000-0000-0000-0000-000000000000', 'Zoe', '{MA}'::text[]);

\set lou 'c1000000-0000-0000-0000-00000000000a'
\set zoe 'c2000000-0000-0000-0000-00000000000b'

\set claimsA '{"sub":"aa111111-1111-1111-1111-111111111111","role":"authenticated"}'
\set claimsB '{"sub":"bb222222-2222-2222-2222-222222222222","role":"authenticated"}'
\set claimsE '{"sub":"ee333333-3333-3333-3333-333333333333","role":"authenticated"}'
\set claimsF '{"sub":"ff444444-4444-4444-4444-444444444444","role":"authenticated"}'

-- ===========================================================================
-- TEST 1 : parent A cree un lien en attente pour Lou, email normalise minuscules
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
DO $$
BEGIN
    PERFORM public.demander_lien_enfant('c1000000-0000-0000-0000-00000000000a', '  Iris@Example.Test ');
    PERFORM _rec('1_cree_lien_en_attente', true, 'ok');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('1_cree_lien_en_attente', false, 'refus a tort : ' || SQLERRM);
END $$;
RESET ROLE;

SELECT _rec('1b_email_normalise_minuscules',
    (SELECT email FROM liens_enfant_en_attente WHERE profil_id = :'lou') = 'iris@example.test',
    'email stocke = ' || coalesce((SELECT email FROM liens_enfant_en_attente WHERE profil_id = :'lou'), 'NULL'));

-- ===========================================================================
-- TEST 2 : unicite (meme profil / meme email deja en attente)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
DO $$
BEGIN
    PERFORM public.demander_lien_enfant('c1000000-0000-0000-0000-00000000000a', 'autre@example.test');
    PERFORM _rec('2a_meme_profil_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('2a_meme_profil_refuse', SQLERRM LIKE '%lien_deja_en_attente%', SQLERRM);
END $$;
DO $$
BEGIN
    PERFORM public.demander_lien_enfant('c2000000-0000-0000-0000-00000000000b', 'iris@example.test');
    PERFORM _rec('2b_meme_email_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('2b_meme_email_refuse', SQLERRM LIKE '%email_deja_en_attente%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 3 : un tiers (parent B) ne peut creer pour Lou ni voir le lien
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsB';
DO $$
BEGIN
    PERFORM public.demander_lien_enfant('c1000000-0000-0000-0000-00000000000a', 'x@example.test');
    PERFORM _rec('3a_tiers_ne_cree_pas', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('3a_tiers_ne_cree_pas', SQLERRM LIKE '%acces refuse%', SQLERRM);
END $$;
SELECT _rec('3b_tiers_ne_voit_pas_lien',
    (SELECT count(*) FROM liens_enfant_en_attente) = 0,
    'liens visibles B = ' || (SELECT count(*) FROM liens_enfant_en_attente));
RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT _rec('3c_parent_voit_son_lien',
    (SELECT count(*) FROM liens_enfant_en_attente) = 1,
    'liens visibles A = ' || (SELECT count(*) FROM liens_enfant_en_attente));
RESET ROLE;

-- ===========================================================================
-- TEST 4 : parent-membre ne peut etre relie comme enfant (email d'un parent)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
DO $$
BEGIN
    PERFORM public.demander_lien_enfant('c2000000-0000-0000-0000-00000000000b', 'pb@example.test');
    PERFORM _rec('4_parent_pas_enfant', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('4_parent_pas_enfant', SQLERRM LIKE '%compte_est_parent%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 5 : rattachement au login de l'enfant (Iris), sans creer de foyer
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
DO $$
DECLARE v_p uuid;
BEGIN
    v_p := public.rattacher_si_attendu();
    PERFORM _rec('5a_rattache_renvoie_profil', v_p = 'c1000000-0000-0000-0000-00000000000a',
        'profil renvoye = ' || coalesce(v_p::text, 'NULL'));
END $$;
RESET ROLE;

SELECT _rec('5b_user_id_pose',
    (SELECT user_id FROM profils WHERE id = :'lou') = :'uE',
    'user_id Lou = ' || coalesce((SELECT user_id::text FROM profils WHERE id = :'lou'), 'NULL'));
SELECT _rec('5c_lien_supprime',
    (SELECT count(*) FROM liens_enfant_en_attente WHERE profil_id = :'lou') = 0, 'lien restant ?');
SELECT _rec('5d_journalise',
    (SELECT count(*) FROM journal_reglages WHERE profil_id = :'lou' AND cle = 'compte_enfant') = 1,
    'entrees journal = ' || (SELECT count(*) FROM journal_reglages WHERE profil_id = :'lou' AND cle = 'compte_enfant'));
SELECT _rec('5e_aucun_foyer_cree',
    (SELECT count(*) FROM membres_foyer WHERE user_id = :'uE') = 0,
    'membres_foyer E = ' || (SELECT count(*) FROM membres_foyer WHERE user_id = :'uE'));

-- ===========================================================================
-- TEST 6 : idempotence (deja relie -> renvoie le meme profil, sans erreur)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
DO $$
DECLARE v_p uuid;
BEGIN
    v_p := public.rattacher_si_attendu();
    PERFORM _rec('6_idempotent', v_p = 'c1000000-0000-0000-0000-00000000000a',
        'profil = ' || coalesce(v_p::text, 'NULL'));
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 7 : isolation de l'enfant : ne voit QUE son profil, pas le journal
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
SELECT _rec('7a_enfant_ne_voit_que_son_profil',
    (SELECT count(*) FROM profils) = 1 AND (SELECT surnom FROM profils) = 'Lou',
    'profils visibles E = ' || (SELECT count(*) FROM profils));
SELECT _rec('7b_enfant_ne_voit_pas_journal',
    (SELECT count(*) FROM journal_reglages) = 0,
    'journal visible E = ' || (SELECT count(*) FROM journal_reglages));
SELECT _rec('7c_enfant_ne_voit_pas_liens',
    (SELECT count(*) FROM liens_enfant_en_attente) = 0, 'liens visibles E');
RESET ROLE;

-- ===========================================================================
-- TEST 8 : colonnes interdites a l'enfant (base, pas seulement UI)
--   univers + avatar autorises ; classe/surnom/limites/matieres refuses.
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
DO $$
BEGIN
    UPDATE profils SET univers = 'ile_tropicale' WHERE id = 'c1000000-0000-0000-0000-00000000000a';
    UPDATE profils SET avatar  = '{"forme":"chaton","couleur":"#123456"}'::jsonb
     WHERE id = 'c1000000-0000-0000-0000-00000000000a';
    PERFORM _rec('8a_univers_avatar_ok', true, 'ok');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('8a_univers_avatar_ok', false, 'refus a tort : ' || SQLERRM);
END $$;
DO $$
BEGIN
    UPDATE profils SET classe = 'CM2' WHERE id = 'c1000000-0000-0000-0000-00000000000a';
    PERFORM _rec('8b_classe_refusee', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('8b_classe_refusee', SQLERRM LIKE '%colonne_interdite_enfant%', SQLERRM);
END $$;
DO $$
BEGIN
    UPDATE profils SET surnom = 'Pirate' WHERE id = 'c1000000-0000-0000-0000-00000000000a';
    PERFORM _rec('8c_surnom_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('8c_surnom_refuse', SQLERRM LIKE '%colonne_interdite_enfant%', SQLERRM);
END $$;
DO $$
BEGIN
    UPDATE profils SET limite_jour_min = 5 WHERE id = 'c1000000-0000-0000-0000-00000000000a';
    PERFORM _rec('8d_limite_refusee', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('8d_limite_refusee', SQLERRM LIKE '%colonne_interdite_enfant%', SQLERRM);
END $$;
DO $$
BEGIN
    UPDATE profils SET matieres_actives = '{MA,FR}'::text[] WHERE id = 'c1000000-0000-0000-0000-00000000000a';
    PERFORM _rec('8e_matieres_refusees', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('8e_matieres_refusees', SQLERRM LIKE '%colonne_interdite_enfant%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 9 : le credit de monnaie (trigger serveur) reste possible pour l'enfant
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
DO $$
DECLARE v_comp text; v_avant int; v_apres int;
BEGIN
    SELECT code INTO v_comp FROM public.competences WHERE matiere = 'MA' AND actif LIMIT 1;
    SELECT monnaie INTO v_avant FROM profils WHERE id = 'c1000000-0000-0000-0000-00000000000a';
    INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le)
    VALUES (gen_random_uuid(), 'c1000000-0000-0000-0000-00000000000a', v_comp, 1, true, 3000, now());
    SELECT monnaie INTO v_apres FROM profils WHERE id = 'c1000000-0000-0000-0000-00000000000a';
    PERFORM _rec('9_monnaie_creditee', v_apres = v_avant + 2,
        format('avant=%s apres=%s comp=%s', v_avant, v_apres, v_comp));
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('9_monnaie_creditee', false, 'erreur : ' || SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 10 : compte deja relie -> ne peut etre remis en attente sur un autre profil
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
DO $$
BEGIN
    PERFORM public.demander_lien_enfant('c2000000-0000-0000-0000-00000000000b', 'iris@example.test');
    PERFORM _rec('10_compte_deja_relie', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('10_compte_deja_relie', SQLERRM LIKE '%compte_deja_relie%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 11 : expiration : un lien expire n'est pas rattache au login
-- ===========================================================================
INSERT INTO liens_enfant_en_attente (profil_id, email, cree_par, expire_le)
VALUES ('c2000000-0000-0000-0000-00000000000b', 'noe@example.test', :'uA', now() - interval '1 day');
SET ROLE authenticated;
SET request.jwt.claims = :'claimsF';
DO $$
DECLARE v_p uuid;
BEGIN
    v_p := public.rattacher_si_attendu();
    PERFORM _rec('11_expire_non_rattache', v_p IS NULL, 'profil renvoye = ' || coalesce(v_p::text, 'NULL'));
END $$;
RESET ROLE;
SELECT _rec('11b_zoe_non_reliee',
    (SELECT user_id FROM profils WHERE id = :'zoe') IS NULL, 'user_id Zoe doit rester NULL');

-- ===========================================================================
-- TEST 12 : delier (parent) -> user_id NULL + journalise ; puis login = NULL
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
DO $$
BEGIN
    PERFORM public.delier_compte_enfant('c1000000-0000-0000-0000-00000000000a');
    PERFORM _rec('12a_delier_ok', true, 'ok');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('12a_delier_ok', false, 'refus a tort : ' || SQLERRM);
END $$;
RESET ROLE;
SELECT _rec('12b_user_id_null',
    (SELECT user_id FROM profils WHERE id = :'lou') IS NULL, 'user_id Lou apres delier');
SELECT _rec('12c_delier_journalise',
    (SELECT count(*) FROM journal_reglages WHERE profil_id = :'lou' AND cle = 'compte_enfant') = 2,
    'entrees journal = ' || (SELECT count(*) FROM journal_reglages WHERE profil_id = :'lou' AND cle = 'compte_enfant'));

SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
DO $$
DECLARE v_p uuid;
BEGIN
    v_p := public.rattacher_si_attendu();
    PERFORM _rec('12d_login_apres_delier', v_p IS NULL, 'profil renvoye = ' || coalesce(v_p::text, 'NULL'));
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 13 : l'ancien relier_compte_enfant n'existe plus
-- ===========================================================================
SELECT _rec('13_ancien_rpc_supprime',
    NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'relier_compte_enfant'),
    'relier_compte_enfant encore present ?');

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
