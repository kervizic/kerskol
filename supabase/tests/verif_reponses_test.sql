-- verif_reponses_test.sql
-- LOT 2 : verification serveur des reponses + plafonds anti-abus.
-- Transaction ROLLBACK : aucune donnee de test ne subsiste.
-- Execution : deploy/test-db.sh.
--
-- Couvre : bonne reponse acceptee, mauvaise reponse marquee fausse, flag
-- « juste » client impossible (RPC sans champ correct + INSERT direct revoque),
-- enonce incoherent refuse, acces a un profil d'un autre foyer refuse, chaque
-- plafond declenche, monnaie jamais diminuee.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;

-- --- Jeu de donnees ---------------------------------------------------------
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'
\set uC '33333333-3333-3333-3333-333333333333'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'pa@example.test', now()),
    (:'uB', 'pb@example.test', now()),
    (:'uC', 'pc@example.test', now());
INSERT INTO foyers (id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000'),
    ('bbbbbbbb-0000-0000-0000-000000000000'),
    ('cccccccc-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000', :'uA'),
    ('bbbbbbbb-0000-0000-0000-000000000000', :'uB'),
    ('cccccccc-0000-0000-0000-000000000000', :'uC');
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Bon',    'CM2'),
    ('a0000002-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Minute', 'CM2'),
    ('a0000003-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Jour',   'CM2'),
    ('a0000004-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Money',  'CM2'),
    ('a0000005-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Seance', 'CM2'),
    ('b0000001-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000', 'EnfantB','CM2');

\set pBon    'a0000001-0000-0000-0000-000000000000'
\set pMin    'a0000002-0000-0000-0000-000000000000'
\set pJour   'a0000003-0000-0000-0000-000000000000'
\set pMoney  'a0000004-0000-0000-0000-000000000000'
\set pSeance 'a0000005-0000-0000-0000-000000000000'
\set pB      'b0000001-0000-0000-0000-000000000000'
\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'

-- ===========================================================================
-- TEST 1 : bonne reponse ACCEPTEE (le serveur recalcule 3 + 4 = 7)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

SELECT _rec('1_bonne_reponse_acceptee',
    (public.enregistrer_reponse(
        gen_random_uuid(), :'pBon'::uuid, NULL, 'MA.CM.ADDITION', NULL, 1, NULL,
        'add', 3, 4, 7, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'add 3+4, saisie 7');

-- progression creee + monnaie creditee (2)
SELECT _rec('1b_progression_creee',
    (SELECT count(*) FROM progression WHERE profil_id = :'pBon' AND competence = 'MA.CM.ADDITION') = 1);
SELECT _rec('1c_monnaie_creditee',
    (SELECT monnaie FROM profils WHERE id = :'pBon') = 2,
    'monnaie = ' || (SELECT monnaie FROM profils WHERE id = :'pBon'));

-- ===========================================================================
-- TEST 2 : mauvaise reponse marquee FAUSSE (saisie 5 pour 3+4=7)
-- ===========================================================================
SELECT _rec('2_mauvaise_reponse_fausse',
    (public.enregistrer_reponse(
        gen_random_uuid(), :'pBon'::uuid, NULL, 'MA.CM.ADDITION', NULL, 1, NULL,
        'add', 3, 4, 5, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false,
    'add 3+4, saisie 5');

-- Pas de credit supplementaire (faux sans correction_lue => gain 0).
SELECT _rec('2b_pas_de_credit_sur_faux',
    (SELECT monnaie FROM profils WHERE id = :'pBon') = 2,
    'monnaie = ' || (SELECT monnaie FROM profils WHERE id = :'pBon'));

-- ===========================================================================
-- TEST 3 : flag « juste » client impossible
--   3a : la RPC ne possede aucun parametre `correct` (saisie fausse => faux,
--        on ne PEUT PAS forcer vrai). Deja prouve par TEST 2.
--   3b : l'INSERT direct sur reponses est REVOQUE a authenticated.
-- ===========================================================================
DO $$
BEGIN
    INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le)
    VALUES (gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000', 'MA.CM.ADDITION', 1, true, 3000, now());
    PERFORM _rec('3b_insert_direct_revoque', false, 'INSERT direct accepte a tort');
EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _rec('3b_insert_direct_revoque', true, 'refus attendu : ' || SQLERRM);
WHEN OTHERS THEN
    PERFORM _rec('3b_insert_direct_revoque', true, 'refus (autre) : ' || SQLERRM);
END $$;

-- ===========================================================================
-- TEST 4 : enonce INCOHERENT refuse
--   4a : table 9 avec facteurs 2 x 2 (la table n'apparait pas) ;
--   4b : operation interdite pour la competence (add sur une table).
-- ===========================================================================
DO $$
BEGIN
    PERFORM public.enregistrer_reponse(
        gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.TABLES.9', NULL, 2, NULL,
        'mul', 2, 2, 4, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('4a_enonce_incoherent_table', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('4a_enonce_incoherent_table', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

DO $$
BEGIN
    PERFORM public.enregistrer_reponse(
        gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.TABLES.2', NULL, 1, NULL,
        'add', 2, 3, 5, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('4b_operation_interdite', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('4b_operation_interdite', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

-- ===========================================================================
-- TEST 5 : acces a un profil d'un AUTRE foyer refuse
-- ===========================================================================
DO $$
BEGIN
    PERFORM public.enregistrer_reponse(
        gen_random_uuid(), 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.CM.ADDITION', NULL, 1, NULL,
        'add', 1, 1, 2, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('5_autre_foyer_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('5_autre_foyer_refuse', SQLERRM LIKE '%acces_refuse%', SQLERRM);
END $$;

RESET ROLE;

-- ===========================================================================
-- TEST 6 : plafond MONNAIE par jour (borne le gain, ne retire JAMAIS)
--   cap = 3 ; 3 bonnes reponses (gain 2 chacune) => monnaie 2, 3, 3.
-- ===========================================================================
UPDATE public.anti_abus_config SET valeur = 3 WHERE cle = 'monnaie_par_jour';
SET ROLE authenticated; SET request.jwt.claims = :'claimsA';

SELECT public.enregistrer_reponse(gen_random_uuid(), :'pMoney'::uuid, NULL, 'MA.CM.ADDITION', NULL, 1, NULL,
    'add', 3, 4, 7, NULL, 1, 3000, false, false, false, now());
SELECT _rec('6a_monnaie_cap_etape1', (SELECT monnaie FROM profils WHERE id = :'pMoney') = 2,
    'monnaie = ' || (SELECT monnaie FROM profils WHERE id = :'pMoney'));
SELECT public.enregistrer_reponse(gen_random_uuid(), :'pMoney'::uuid, NULL, 'MA.CM.ADDITION', NULL, 1, NULL,
    'add', 3, 4, 7, NULL, 1, 3000, false, false, false, now());
SELECT _rec('6b_monnaie_cap_etape2', (SELECT monnaie FROM profils WHERE id = :'pMoney') = 3,
    'monnaie = ' || (SELECT monnaie FROM profils WHERE id = :'pMoney'));
SELECT public.enregistrer_reponse(gen_random_uuid(), :'pMoney'::uuid, NULL, 'MA.CM.ADDITION', NULL, 1, NULL,
    'add', 3, 4, 7, NULL, 1, 3000, false, false, false, now());
SELECT _rec('6c_monnaie_plafonnee_jamais_diminuee', (SELECT monnaie FROM profils WHERE id = :'pMoney') = 3,
    'monnaie = ' || (SELECT monnaie FROM profils WHERE id = :'pMoney'));

RESET ROLE;

-- ===========================================================================
-- TEST 7 : plafond REPONSES par minute
--   cap = 2 ; la 3e reponse est refusee (plafond_reponses_minute).
-- ===========================================================================
UPDATE public.anti_abus_config SET valeur = 2 WHERE cle = 'reponses_par_minute';
SET ROLE authenticated; SET request.jwt.claims = :'claimsA';

SELECT public.enregistrer_reponse(gen_random_uuid(), :'pMin'::uuid, NULL, 'MA.CM.ADDITION', NULL, 1, NULL,
    'add', 1, 1, 2, NULL, 1, 3000, false, false, false, now());
SELECT public.enregistrer_reponse(gen_random_uuid(), :'pMin'::uuid, NULL, 'MA.CM.ADDITION', NULL, 1, NULL,
    'add', 1, 1, 2, NULL, 1, 3000, false, false, false, now());
DO $$
BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000002-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.CM.ADDITION', NULL, 1, NULL, 'add', 1, 1, 2, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('7_plafond_minute', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('7_plafond_minute', SQLERRM LIKE '%plafond_reponses_minute%', SQLERRM);
END $$;

RESET ROLE;
UPDATE public.anti_abus_config SET valeur = 60 WHERE cle = 'reponses_par_minute';  -- restaure

-- ===========================================================================
-- TEST 8 : plafond REPONSES par jour
--   cap = 2 ; la 3e reponse est refusee (plafond_reponses_jour).
-- ===========================================================================
UPDATE public.anti_abus_config SET valeur = 2 WHERE cle = 'reponses_par_jour';
SET ROLE authenticated; SET request.jwt.claims = :'claimsA';

SELECT public.enregistrer_reponse(gen_random_uuid(), :'pJour'::uuid, NULL, 'MA.CM.ADDITION', NULL, 1, NULL,
    'add', 1, 1, 2, NULL, 1, 3000, false, false, false, now());
SELECT public.enregistrer_reponse(gen_random_uuid(), :'pJour'::uuid, NULL, 'MA.CM.ADDITION', NULL, 1, NULL,
    'add', 1, 1, 2, NULL, 1, 3000, false, false, false, now());
DO $$
BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000003-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.CM.ADDITION', NULL, 1, NULL, 'add', 1, 1, 2, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('8_plafond_jour', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('8_plafond_jour', SQLERRM LIKE '%plafond_reponses_jour%', SQLERRM);
END $$;

RESET ROLE;
UPDATE public.anti_abus_config SET valeur = 1500 WHERE cle = 'reponses_par_jour';  -- restaure

-- ===========================================================================
-- TEST 9 : plafond SEANCES par jour
-- ===========================================================================
UPDATE public.anti_abus_config SET valeur = 1 WHERE cle = 'seances_par_jour';
INSERT INTO seances (id, profil_id, debut) VALUES (gen_random_uuid(), :'pSeance', now());
DO $$
BEGIN
    INSERT INTO seances (id, profil_id, debut) VALUES (gen_random_uuid(), 'a0000005-0000-0000-0000-000000000000', now());
    PERFORM _rec('9_plafond_seances', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('9_plafond_seances', SQLERRM LIKE '%plafond_seances_jour%', SQLERRM);
END $$;

-- ===========================================================================
-- TEST 10 : plafond PROFILS par foyer (foyer C, cap = 1)
-- ===========================================================================
UPDATE public.anti_abus_config SET valeur = 1 WHERE cle = 'profils_par_foyer';
INSERT INTO profils (id, foyer_id, surnom, classe)
VALUES (gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000000', 'C1', 'CM2');
DO $$
BEGIN
    INSERT INTO profils (id, foyer_id, surnom, classe)
    VALUES (gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000000', 'C2', 'CM2');
    PERFORM _rec('10_plafond_profils', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('10_plafond_profils', SQLERRM LIKE '%plafond_profils_foyer%', SQLERRM);
END $$;

-- ===========================================================================
-- TEST 11 : plafond LIENS (demandes de rattachement) par foyer (cap = 0)
-- ===========================================================================
UPDATE public.anti_abus_config SET valeur = 0 WHERE cle = 'liens_par_foyer';
DO $$
BEGIN
    INSERT INTO liens_enfant_en_attente (profil_id, email, cree_par)
    VALUES ('a0000001-0000-0000-0000-000000000000', 'lien@example.test',
            '11111111-1111-1111-1111-111111111111');
    PERFORM _rec('11_plafond_liens', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('11_plafond_liens', SQLERRM LIKE '%plafond_liens_foyer%', SQLERRM);
END $$;

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
    IF v_fail > 0 THEN RAISE EXCEPTION 'TESTS EN ECHEC : %', v_fail; END IF;
END $$;

ROLLBACK;
