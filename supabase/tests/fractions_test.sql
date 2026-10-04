-- fractions_test.sql
-- MA.FRAC.SIMPLES : le SERVEUR recalcule et decide « juste/faux », borne les
-- operandes et interdit les operations hors referentiel. Transaction ROLLBACK.
-- Execution : deploy/test-db.sh.

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
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Frac', 'CE2');
\set p 'a0000001-0000-0000-0000-000000000000'
\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- nommer (code = num*100+den) : 3/4 = 304
SELECT _rec('frac_nommer_bonne',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.FRAC.SIMPLES', NULL, 1, NULL,
        'val', 304, 0, 304, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, '3/4 = code 304');
SELECT _rec('frac_nommer_mauvaise',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.FRAC.SIMPLES', NULL, 1, NULL,
        'val', 304, 0, 303, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false, 'saisie 303 pour 304');
-- colorier (parts coloriees)
SELECT _rec('frac_colorier',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.FRAC.SIMPLES', NULL, 2, NULL,
        'val', 3, 0, 3, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, 'colorie 3 parts');
-- comparer a 1 : 3/4 < 1 (0), 5/3 > 1 (2), 4/4 = 1 (1)
SELECT _rec('frac_cmp_inf',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.FRAC.SIMPLES', NULL, 3, NULL,
        'cmp', 3, 4, 0, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, '3/4 < 1');
SELECT _rec('frac_cmp_sup',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.FRAC.SIMPLES', NULL, 3, NULL,
        'cmp', 5, 3, 2, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, '5/3 > 1');
-- fraction d'une quantite : la moitie de 12 = 6 (div)
SELECT _rec('frac_quantite_div',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.FRAC.SIMPLES', NULL, 4, NULL,
        'div', 12, 2, 6, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, 'moitie de 12 = 6');
-- operation interdite (add)
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.FRAC.SIMPLES', NULL, 1, NULL, 'add', 3, 4, 7, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('frac_op_interdite', false, 'add accepte a tort');
EXCEPTION WHEN OTHERS THEN PERFORM _rec('frac_op_interdite', SQLERRM LIKE '%enonce_incoherent%', SQLERRM); END $$;
-- hors bornes (> 2000)
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.FRAC.SIMPLES', NULL, 1, NULL, 'val', 2500, 0, 2500, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('frac_hors_bornes', false, 'operande 2500 accepte a tort');
EXCEPTION WHEN OTHERS THEN PERFORM _rec('frac_hors_bornes', SQLERRM LIKE '%enonce_incoherent%', SQLERRM); END $$;

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
