-- problemes_test.sql
-- Migration 0024 : PROBLEMES (additifs, multiplicatifs, monnaie, deux etapes).
-- Verifie, via la RPC enregistrer_reponse (le serveur recalcule et decide) :
--   * bonne reponse ACCEPTEE, mauvaise reponse FAUSSE ;
--   * enonce HORS BORNES / operation interdite REFUSE (enonce_incoherent) ;
--   * verif DEUX ETAPES (op2, c) : juste, division non exacte refusee, sous-
--     traction negative refusee, op2 absent pour deux-etapes refuse, op2 fourni
--     pour une competence a une etape refuse ;
--   * montants d'argent en CENTIMES entiers (composer / rendre / comparer).
-- Transaction ROLLBACK : aucune donnee de test ne subsiste.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;

\set uA '11111111-1111-1111-1111-111111111111'
\set pA 'a0000001-0000-0000-0000-000000000000'
\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'

INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'pb@example.test', now());
INSERT INTO foyers (id) VALUES ('aaaaaaaa-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, classe)
VALUES (:'pA', 'aaaaaaaa-0000-0000-0000-000000000000', 'Pb', 'CE2');

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- =========================================================================
-- 1. ADD_SUB : addition juste / fausse / operation interdite / hors bornes
-- =========================================================================
SELECT _rec('1a_add_sub_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.ADD_SUB', NULL, 1, NULL,
        'add', 12, 5, 17, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'add 12+5 = 17');
SELECT _rec('1b_add_sub_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.ADD_SUB', NULL, 1, NULL,
        'add', 12, 5, 16, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false,
    'add 12+5, saisie 16');
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.PB.ADD_SUB', NULL, 1, NULL, 'mul', 3, 4, 12, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('1c_add_sub_op_interdite', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('1c_add_sub_op_interdite', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.PB.ADD_SUB', NULL, 1, NULL, 'add', 50000, 5, 50005, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('1d_add_sub_hors_bornes', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('1d_add_sub_hors_bornes', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

-- =========================================================================
-- 2. MULT_DIV : groupement (mul) et partage (div exacte)
-- =========================================================================
SELECT _rec('2a_mult_div_groupement',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.MULT_DIV', NULL, 1, NULL,
        'mul', 3, 5, 15, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'mul 3x5 = 15');
SELECT _rec('2b_mult_div_partage',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.MULT_DIV', NULL, 1, NULL,
        'div', 24, 4, 6, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'div 24/4 = 6');

-- =========================================================================
-- 3. MONNAIE : composer (val, centimes) / rendre (sub, centimes) / comparer (cmp)
-- =========================================================================
SELECT _rec('3a_monnaie_composer_cents',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.MONNAIE', NULL, 3, NULL,
        'val', 1250, 0, 1250, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'val 1250 c (= 12 € 50)');
SELECT _rec('3b_monnaie_rendre_sub',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.MONNAIE', NULL, 2, NULL,
        'sub', 50, 35, 15, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'sub 50-35 = 15 € (rendu, euros entiers)');
SELECT _rec('3c_monnaie_comparer_cmp',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.MONNAIE', NULL, 2, NULL,
        'cmp', 12, 15, 0, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'cmp 12 € < 15 €');
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.PB.MONNAIE', NULL, 2, NULL, 'add', 1200, 300, 1500, NULL, 1, 3000, false, false, false, now(), 'add', 1);
    PERFORM _rec('3d_monnaie_op2_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('3d_monnaie_op2_refuse', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

-- =========================================================================
-- 4. DEUX_ETAPES : chaine op2 (mul_add, add_div), erreurs, garde-fous
-- =========================================================================
SELECT _rec('4a_deux_etapes_mul_add',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.DEUX_ETAPES', NULL, 1, NULL,
        'mul', 3, 4, 17, NULL, 1, 3000, false, false, false, now(), 'add', 5) ->> 'correct')::boolean = true,
    '3x4=12 puis +5 = 17');
SELECT _rec('4b_deux_etapes_add_div',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.DEUX_ETAPES', NULL, 3, NULL,
        'add', 8, 4, 4, NULL, 1, 3000, false, false, false, now(), 'div', 3) ->> 'correct')::boolean = true,
    '8+4=12 puis ÷3 = 4');
SELECT _rec('4c_deux_etapes_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.DEUX_ETAPES', NULL, 1, NULL,
        'mul', 3, 4, 18, NULL, 1, 3000, false, false, false, now(), 'add', 5) ->> 'correct')::boolean = false,
    '3x4+5, saisie 18 (faux)');
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.PB.DEUX_ETAPES', NULL, 3, NULL, 'add', 8, 5, 3, NULL, 1, 3000, false, false, false, now(), 'div', 4);
    PERFORM _rec('4d_deux_etapes_div_non_exacte', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('4d_deux_etapes_div_non_exacte', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.PB.DEUX_ETAPES', NULL, 1, NULL, 'mul', 2, 2, 0, NULL, 1, 3000, false, false, false, now(), 'sub', 10);
    PERFORM _rec('4e_deux_etapes_sub_negative', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('4e_deux_etapes_sub_negative', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.PB.DEUX_ETAPES', NULL, 1, NULL, 'mul', 3, 4, 12, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('4f_deux_etapes_op2_requis', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('4f_deux_etapes_op2_requis', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

RESET ROLE;

-- =========================================================================
-- Rapport
-- =========================================================================
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
