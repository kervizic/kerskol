-- numeration_calcul_pose_test.sql
-- Migration 0023 : NUMERATION jusqu'a 10 000 + CALCULS POSES.
-- Verifie, pour chaque nouvelle operation (cmp, val) et competence :
--   * bonne reponse ACCEPTEE (le serveur recalcule) ;
--   * mauvaise reponse marquee FAUSSE ;
--   * enonce HORS BORNES ou operation interdite REFUSE (enonce_incoherent).
-- Transaction ROLLBACK : aucune donnee de test ne subsiste.
-- Execution : deploy/test-db.sh.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;

\set uA '11111111-1111-1111-1111-111111111111'
\set pA 'a0000001-0000-0000-0000-000000000000'
\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'

INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'pa@example.test', now());
INSERT INTO foyers (id) VALUES ('aaaaaaaa-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, classe)
VALUES (:'pA', 'aaaaaaaa-0000-0000-0000-000000000000', 'Num', 'CE2');

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- Helper local : renvoie le verdict 'correct' d'un enregistrement.
-- (on l'appelle inline via enregistrer_reponse ->> 'correct')

-- =========================================================================
-- 1. LIRE_ECRIRE (val) : ecrire « trois mille... » = 3482
-- =========================================================================
SELECT _rec('1a_lire_ecrire_val_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.LIRE_ECRIRE', NULL, 2, NULL,
        'val', 3482, 0, 3482, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'val 3482, saisie 3482');
SELECT _rec('1b_lire_ecrire_val_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.LIRE_ECRIRE', NULL, 2, NULL,
        'val', 3482, 0, 3480, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false,
    'val 3482, saisie 3480');
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.NUM.LIRE_ECRIRE', NULL, 2, NULL, 'val', 15000, 0, 15000, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('1c_lire_ecrire_hors_bornes', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('1c_lire_ecrire_hors_bornes', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.NUM.LIRE_ECRIRE', NULL, 2, NULL, 'val', 5, 3, 5, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('1d_val_b_non_nul_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('1d_val_b_non_nul_refuse', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

-- =========================================================================
-- 2. COMPARER (cmp) : 3482 ? 3248 -> 2 (a > b)
-- =========================================================================
SELECT _rec('2a_comparer_cmp_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.COMPARER', NULL, 2, NULL,
        'cmp', 3482, 3248, 2, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'cmp 3482>3248, saisie 2');
SELECT _rec('2b_comparer_cmp_egal',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.COMPARER', NULL, 2, NULL,
        'cmp', 500, 500, 1, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'cmp 500=500, saisie 1');
SELECT _rec('2c_comparer_cmp_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.COMPARER', NULL, 2, NULL,
        'cmp', 3482, 3248, 0, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false,
    'cmp 3482>3248, saisie 0 (faux)');
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.NUM.COMPARER', NULL, 2, NULL, 'mul', 3, 4, 12, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('2d_comparer_op_interdite', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('2d_comparer_op_interdite', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

-- =========================================================================
-- 3. DECOMPOSER : valeur d'un chiffre (mul) et nombre de rangs (div)
-- =========================================================================
SELECT _rec('3a_valeur_chiffre_mul',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.DECOMPOSER', NULL, 3, NULL,
        'mul', 8, 10, 80, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'mul 8x10 = 80');
SELECT _rec('3b_compter_dizaines_div',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.DECOMPOSER', NULL, 4, NULL,
        'div', 3482, 10, 348, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'div 3482/10 = 348 (reste ignore, 1 champ)');

-- =========================================================================
-- 4. SUITE (add / sub) : voisins et bonds
-- =========================================================================
SELECT _rec('4a_suivant_add',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.SUITE', NULL, 1, NULL,
        'add', 349, 1, 350, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'add 349+1 = 350');
SELECT _rec('4b_bond_moins_1000_sub',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.SUITE', NULL, 4, NULL,
        'sub', 4820, 1000, 3820, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'sub 4820-1000 = 3820');

-- =========================================================================
-- 5. POSE.ADDITION (add)
-- =========================================================================
SELECT _rec('5a_addition_posee_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.POSE.ADDITION', NULL, 2, NULL,
        'add', 254, 178, 432, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'add 254+178 = 432');
SELECT _rec('5b_addition_posee_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.POSE.ADDITION', NULL, 2, NULL,
        'add', 254, 178, 400, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false,
    'add 254+178, saisie 400 (faux)');

-- =========================================================================
-- 6. POSE.SOUSTRACTION (sub) + soustraction negative refusee
-- =========================================================================
SELECT _rec('6a_soustraction_posee_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.POSE.SOUSTRACTION', NULL, 2, NULL,
        'sub', 432, 178, 254, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'sub 432-178 = 254');
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.POSE.SOUSTRACTION', NULL, 2, NULL, 'sub', 100, 200, -100, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('6b_soustraction_negative_refusee', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('6b_soustraction_negative_refusee', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

-- =========================================================================
-- 7. POSE.MULTIPLICATION (mul) + absence de facteur a 1 chiffre refusee
-- =========================================================================
SELECT _rec('7a_multiplication_posee_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.POSE.MULTIPLICATION', NULL, 3, NULL,
        'mul', 234, 3, 702, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'mul 234x3 = 702');
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.POSE.MULTIPLICATION', NULL, 3, NULL, 'mul', 234, 34, 7956, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('7b_mult_sans_facteur_1chiffre_refusee', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('7b_mult_sans_facteur_1chiffre_refusee', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
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
