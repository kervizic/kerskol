-- mesures_grandeurs_test.sql
-- MESURES de grandeurs (MA.MES.LONGUEURS, MA.MES.MASSES_CONTENANCES) : le
-- SERVEUR recalcule et decide « juste/faux », borne les operandes, interdit les
-- operations hors referentiel. Transaction ROLLBACK. Execution : deploy/test-db.sh.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;

\set uA '11111111-1111-1111-1111-111111111111'
INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'pa@example.test', now());
INSERT INTO foyers (id) VALUES ('aaaaaaaa-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Mesure', 'CE2');
\set p 'a0000001-0000-0000-0000-000000000000'
\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- --- MA.MES.LONGUEURS ---
SELECT _rec('lon_unite_val',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.LONGUEURS', NULL, 1, NULL,
        'val', 2, 0, 2, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, 'unite cm = code 2');
SELECT _rec('lon_conv_mul',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.LONGUEURS', NULL, 2, NULL,
        'mul', 3, 10, 30, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, '3 cm = 30 mm');
SELECT _rec('lon_conv_div',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.LONGUEURS', NULL, 2, NULL,
        'div', 300, 100, 3, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, '300 cm = 3 m');
SELECT _rec('lon_cmp',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.LONGUEURS', NULL, 3, NULL,
        'cmp', 30, 25, 2, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, '3 cm > 25 mm');
SELECT _rec('lon_regle_val',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.LONGUEURS', NULL, 4, NULL,
        'val', 12, 0, 12, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, 'trait 12 cm');
SELECT _rec('lon_mauvaise',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.LONGUEURS', NULL, 2, NULL,
        'mul', 3, 10, 13, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false, 'saisie 13 pour 30');
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.MES.LONGUEURS', NULL, 2, NULL, 'add', 3, 10, 13, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('lon_op_interdite', false, 'add accepte a tort');
EXCEPTION WHEN OTHERS THEN PERFORM _rec('lon_op_interdite', SQLERRM LIKE '%enonce_incoherent%', SQLERRM); END $$;
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.MES.LONGUEURS', NULL, 2, NULL, 'val', 25000, 0, 25000, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('lon_hors_bornes', false, 'operande 25000 accepte a tort');
EXCEPTION WHEN OTHERS THEN PERFORM _rec('lon_hors_bornes', SQLERRM LIKE '%enonce_incoherent%', SQLERRM); END $$;

-- --- MA.MES.MASSES_CONTENANCES ---
SELECT _rec('mas_unite_val',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.MASSES_CONTENANCES', NULL, 1, NULL,
        'val', 11, 0, 11, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, 'unite kg = code 11');
SELECT _rec('mas_conv_mul',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.MASSES_CONTENANCES', NULL, 2, NULL,
        'mul', 2, 1000, 2000, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, '2 kg = 2000 g');
SELECT _rec('mas_cmp',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.MASSES_CONTENANCES', NULL, 3, NULL,
        'cmp', 2000, 1500, 2, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, '2 kg > 1500 g');
SELECT _rec('mas_balance_val',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.MASSES_CONTENANCES', NULL, 4, NULL,
        'val', 500, 0, 500, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, 'balance 500 g');
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.MES.MASSES_CONTENANCES', NULL, 2, NULL, 'sub', 10, 3, 7, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('mas_op_interdite', false, 'sub accepte a tort');
EXCEPTION WHEN OTHERS THEN PERFORM _rec('mas_op_interdite', SQLERRM LIKE '%enonce_incoherent%', SQLERRM); END $$;
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.MES.MASSES_CONTENANCES', NULL, 2, NULL, 'val', 25000, 0, 25000, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('mas_hors_bornes', false, 'operande 25000 accepte a tort');
EXCEPTION WHEN OTHERS THEN PERFORM _rec('mas_hors_bornes', SQLERRM LIKE '%enonce_incoherent%', SQLERRM); END $$;

RESET ROLE;

SELECT id, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS resultat, nom, detail FROM _res ORDER BY id;
DO $$
DECLARE v_fail int;
BEGIN
    SELECT count(*) INTO v_fail FROM _res WHERE NOT ok;
    RAISE NOTICE '=== % test(s) en echec sur % ===', v_fail, (SELECT count(*) FROM _res);
    IF v_fail > 0 THEN RAISE EXCEPTION 'TESTS EN ECHEC : %', v_fail; END IF;
END $$;

ROLLBACK;
