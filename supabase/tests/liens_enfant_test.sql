-- liens_enfant_test.sql
-- Rattachement enfant PAR CODE (migrations 0013 + 0014).
-- Couvre : generation + unicite du lien, messages generiques (pas d'enumeration),
-- statut au login sans divulgation, validation par code (bon/mauvais), 5 essais
-- puis annulation, "ce n'est pas moi", email non confirme, expiration, colonnes
-- interdites a l'enfant, isolation, delier, et NON-creation de foyer.
-- Entierement en transaction ROLLBACK. Execution : deploy/test-db.sh.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

-- Parent A (foyer A, profils Lou + Zoe), parent B (foyer B), enfants E/F/G.
-- E et F ont un email confirme ; G ne l'a pas.
\set uA 'aa111111-1111-1111-1111-111111111111'
\set uB 'bb222222-2222-2222-2222-222222222222'
\set uE 'ee333333-3333-3333-3333-333333333333'
\set uF 'ff444444-4444-4444-4444-444444444444'
\set uG '99555555-5555-5555-5555-555555555555'
INSERT INTO auth.users (id, email, created_at, email_confirmed_at) VALUES
    (:'uA', 'pa@example.test',   now(), now()),
    (:'uB', 'pb@example.test',   now(), now()),
    (:'uE', 'iris@example.test', now(), now()),
    (:'uF', 'noe@example.test',  now(), now()),
    (:'uG', 'gael@example.test', now(), NULL);

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
\set claimsG '{"sub":"99555555-5555-5555-5555-555555555555","role":"authenticated"}'

-- ===========================================================================
-- TEST 1 : parent A cree un lien pour Lou -> renvoie un code a 3 chiffres.
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT public.demander_lien_enfant(:'lou', '  Iris@Example.Test ') AS code_lou;
\gset
RESET ROLE;

SELECT _rec('1a_code_3_chiffres', :'code_lou' ~ '^[0-9]{3}$', 'code = ' || :'code_lou');
SELECT _rec('1b_email_normalise',
    (SELECT email FROM liens_enfant_en_attente WHERE profil_id = :'lou') = 'iris@example.test',
    'email = ' || coalesce((SELECT email FROM liens_enfant_en_attente WHERE profil_id = :'lou'), 'NULL'));
SELECT _rec('1c_code_hache_non_clair',
    (SELECT code_hash IS NOT NULL AND code_hash <> :'code_lou'
       FROM liens_enfant_en_attente WHERE profil_id = :'lou'),
    'hash present et different du code clair');

-- Code volontairement FAUX (different du vrai code).
SELECT CASE WHEN :'code_lou' = '000' THEN '111' ELSE '000' END AS wrong_lou;
\gset

-- ===========================================================================
-- TEST 2 : unicite (meme profil / meme email)
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

-- ===========================================================================
-- TEST 4 : email d'un parent -> message GENERIQUE (pas d'enumeration)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
DO $$
BEGIN
    PERFORM public.demander_lien_enfant('c2000000-0000-0000-0000-00000000000b', 'pb@example.test');
    PERFORM _rec('4_parent_generique', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('4_parent_generique', SQLERRM LIKE '%lien_impossible%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 5 : statut au login de l'enfant (en attente), sans divulgation
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
SELECT (public.statut_lien_enfant() ->> 'etat') AS st_e;
\gset
SELECT _rec('5a_statut_en_attente', :'st_e' = 'en_attente', 'etat = ' || :'st_e');
SELECT _rec('5b_pas_de_profil_divulgue',
    (public.statut_lien_enfant() ? 'profil_id') = false, 'ne doit pas contenir profil_id');
RESET ROLE;

-- ===========================================================================
-- TEST 6 : mauvais code -> ok=false, essais_restants, user_id reste NULL
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
SELECT (public.valider_lien_enfant(:'wrong_lou')) AS r6;
\gset
RESET ROLE;
SELECT _rec('6a_mauvais_code', (:'r6'::jsonb ->> 'ok') = 'false'
    AND (:'r6'::jsonb ->> 'etat') = 'code_invalide', 'r = ' || :'r6');
SELECT _rec('6b_essais_restants', (:'r6'::jsonb ->> 'essais_restants') = '4', 'r = ' || :'r6');
SELECT _rec('6c_user_id_null',
    (SELECT user_id FROM profils WHERE id = :'lou') IS NULL, 'user_id Lou doit rester NULL');

-- ===========================================================================
-- TEST 7 : bon code -> rattachement, lien supprime, journalise, pas de foyer
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
SELECT (public.valider_lien_enfant(:'code_lou')) AS r7;
\gset
RESET ROLE;
SELECT _rec('7a_ok_profil', (:'r7'::jsonb ->> 'ok') = 'true'
    AND (:'r7'::jsonb ->> 'profil_id') = :'lou', 'r = ' || :'r7');
SELECT _rec('7b_user_id_pose', (SELECT user_id FROM profils WHERE id = :'lou') = :'uE', 'user_id Lou');
SELECT _rec('7c_lien_supprime',
    (SELECT count(*) FROM liens_enfant_en_attente WHERE profil_id = :'lou') = 0, 'lien restant ?');
SELECT _rec('7d_journalise',
    (SELECT count(*) FROM journal_reglages WHERE profil_id = :'lou' AND cle = 'compte_enfant') = 1,
    'entrees journal');
SELECT _rec('7e_aucun_foyer_cree',
    (SELECT count(*) FROM membres_foyer WHERE user_id = :'uE') = 0, 'membres_foyer E');

-- ===========================================================================
-- TEST 8 : statut apres rattachement = relie (+ profil_id) ; valider idempotent
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
SELECT (public.statut_lien_enfant()) AS s8;
SELECT (public.valider_lien_enfant('000')) AS r8;
\gset
RESET ROLE;
SELECT _rec('8_valider_idempotent', (:'r8'::jsonb ->> 'ok') = 'true'
    AND (:'r8'::jsonb ->> 'profil_id') = :'lou', 'r = ' || :'r8');

-- ===========================================================================
-- TEST 9 : 5 essais max puis annulation (Zoe + enfant F)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT public.demander_lien_enfant(:'zoe', 'noe@example.test') AS code_zoe;
\gset
RESET ROLE;
SELECT CASE WHEN :'code_zoe' = '000' THEN '111' ELSE '000' END AS wrong_zoe;
\gset
SET ROLE authenticated;
SET request.jwt.claims = :'claimsF';
SELECT public.valider_lien_enfant(:'wrong_zoe');  -- essai 1
SELECT public.valider_lien_enfant(:'wrong_zoe');  -- essai 2
SELECT public.valider_lien_enfant(:'wrong_zoe');  -- essai 3
SELECT public.valider_lien_enfant(:'wrong_zoe');  -- essai 4
SELECT (public.valider_lien_enfant(:'wrong_zoe')) AS r9;  -- essai 5 -> annule
\gset
RESET ROLE;
SELECT _rec('9a_annule_au_5e', (:'r9'::jsonb ->> 'etat') = 'annule', 'r = ' || :'r9');
SELECT _rec('9b_lien_supprime',
    (SELECT count(*) FROM liens_enfant_en_attente WHERE profil_id = :'zoe') = 0, 'lien Zoe restant ?');
SELECT _rec('9c_zoe_non_reliee',
    (SELECT user_id FROM profils WHERE id = :'zoe') IS NULL, 'user_id Zoe');

-- ===========================================================================
-- TEST 10 : "Ce n'est pas moi" (refuser) supprime le lien
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT public.demander_lien_enfant(:'zoe', 'noe@example.test');
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claims = :'claimsF';
SELECT public.refuser_lien_enfant();
RESET ROLE;
SELECT _rec('10_refuser_supprime',
    (SELECT count(*) FROM liens_enfant_en_attente WHERE profil_id = :'zoe') = 0, 'lien restant ?');

-- ===========================================================================
-- TEST 11 : email non confirme -> statut + valider = email_non_confirme
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT public.demander_lien_enfant(:'zoe', 'gael@example.test') AS code_g;
\gset
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claims = :'claimsG';
SELECT (public.statut_lien_enfant() ->> 'etat') AS stg;
SELECT (public.valider_lien_enfant(:'code_g') ->> 'etat') AS rg;
\gset
RESET ROLE;
SELECT _rec('11a_statut_non_confirme', :'stg' = 'email_non_confirme', 'etat = ' || :'stg');
SELECT _rec('11b_valider_non_confirme', :'rg' = 'email_non_confirme', 'etat = ' || :'rg');
SELECT _rec('11c_zoe_non_reliee',
    (SELECT user_id FROM profils WHERE id = :'zoe') IS NULL, 'user_id Zoe');

-- ===========================================================================
-- TEST 12 : expiration -> statut = aucun (lien expire ignore)
-- ===========================================================================
UPDATE liens_enfant_en_attente SET expire_le = now() - interval '1 day' WHERE profil_id = :'zoe';
SET ROLE authenticated;
SET request.jwt.claims = :'claimsG';
SELECT (public.statut_lien_enfant() ->> 'etat') AS stexp;
\gset
RESET ROLE;
SELECT _rec('12_expire_aucun', :'stexp' = 'aucun', 'etat = ' || :'stexp');

-- ===========================================================================
-- TEST 13 : isolation de l'enfant relie (ne voit QUE son profil)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
SELECT _rec('13a_enfant_ne_voit_que_son_profil',
    (SELECT count(*) FROM profils) = 1 AND (SELECT surnom FROM profils) = 'Lou',
    'profils visibles E = ' || (SELECT count(*) FROM profils));
SELECT _rec('13b_enfant_ne_voit_pas_journal',
    (SELECT count(*) FROM journal_reglages) = 0, 'journal visible E');
RESET ROLE;

-- ===========================================================================
-- TEST 14 : colonnes interdites a l'enfant (univers/avatar ok ; reste refuse)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
DO $$
BEGIN
    UPDATE profils SET univers = 'ile_tropicale' WHERE id = 'c1000000-0000-0000-0000-00000000000a';
    PERFORM _rec('14a_univers_ok', true, 'ok');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('14a_univers_ok', false, 'refus a tort : ' || SQLERRM);
END $$;
DO $$
BEGIN
    UPDATE profils SET surnom = 'Pirate' WHERE id = 'c1000000-0000-0000-0000-00000000000a';
    PERFORM _rec('14b_surnom_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('14b_surnom_refuse', SQLERRM LIKE '%colonne_interdite_enfant%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 15 : delier (parent) -> user_id NULL + journalise
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT public.delier_compte_enfant(:'lou');
RESET ROLE;
SELECT _rec('15a_user_id_null',
    (SELECT user_id FROM profils WHERE id = :'lou') IS NULL, 'user_id Lou apres delier');
SELECT _rec('15b_delier_journalise',
    (SELECT count(*) FROM journal_reglages WHERE profil_id = :'lou' AND cle = 'compte_enfant') = 2,
    'entrees journal');

-- ===========================================================================
-- TEST 16 : l'ancien rattacher_si_attendu n'existe plus
-- ===========================================================================
SELECT _rec('16_rattacher_auto_supprime',
    NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rattacher_si_attendu'),
    'rattacher_si_attendu encore present ?');

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
