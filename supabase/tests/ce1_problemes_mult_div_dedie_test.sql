-- ce1_problemes_mult_div_dedie_test.sql
-- Migration 0123 : problèmes mult/div CE1 dédiés (MA.PB.CE1_MULT_DIV, tables 2-5).
-- Vérifie via enregistrer_reponse (serveur SEUL juge) : mul/div acceptés,
-- mauvaise réponse refusée, opération interdite REFUSÉE, structure.
-- Transaction ROLLBACK.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;

\set uA '41414141-4141-4141-4141-414141414141'
\set pA 'c3000001-0000-0000-0000-000000000000'
\set claimsA '{"sub":"41414141-4141-4141-4141-414141414141","role":"authenticated"}'

INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'ce1pb@example.test', now());
INSERT INTO foyers (id) VALUES ('eeeeeeee-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('eeeeeeee-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, classe)
VALUES (:'pA', 'eeeeeeee-0000-0000-0000-000000000000', 'Pb1', 'CE1');

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 1. Multiplication : 4 x 5 = 20 (juste) ; 24 (faux).
SELECT _rec('1a_mul_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.CE1_MULT_DIV', NULL, 1, NULL,
        'mul', 4, 5, 20, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, 'mul 4x5');
SELECT _rec('1b_mul_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.CE1_MULT_DIV', NULL, 1, NULL,
        'mul', 4, 5, 24, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false, 'mul 4x5 saisie 24');

-- 2. Division (partage) : 20 / 5 = 4 (juste) ; 5 (faux).
SELECT _rec('2a_div_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.CE1_MULT_DIV', NULL, 3, NULL,
        'div', 20, 5, 4, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, 'div 20/5');
SELECT _rec('2b_div_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.PB.CE1_MULT_DIV', NULL, 3, NULL,
        'div', 20, 5, 5, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false, 'div 20/5 saisie 5');

-- 3. Opération interdite (cmp) REFUSÉE.
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'c3000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.PB.CE1_MULT_DIV', NULL, 1, NULL, 'cmp', 4, 5, 0, NULL, 1, 3000, false, false, false, now());
    PERFORM public._rec('3_op_interdite_refuse', false, 'cmp aurait du etre refuse');
EXCEPTION WHEN others THEN
    PERFORM public._rec('3_op_interdite_refuse', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

RESET ROLE;

-- 4. Structure : portée [CE1,CE1], 4 exercices, prérequis CE1 -> CE2.
SELECT _rec('4a_portee_ce1',
    (SELECT classe_min = 'CE1' AND classe_max = 'CE1' FROM public.competences WHERE code = 'MA.PB.CE1_MULT_DIV'),
    '[CE1,CE1]');
SELECT _rec('4b_quatre_exercices',
    (SELECT count(*) = 4 FROM public.exercices WHERE competence = 'MA.PB.CE1_MULT_DIV' AND type = 'calcul' AND actif),
    '4 exercices');
SELECT _rec('4c_prerequis',
    EXISTS (SELECT 1 FROM public.competence_prerequis WHERE competence = 'MA.PB.MULT_DIV' AND prerequis = 'MA.PB.CE1_MULT_DIV'),
    'MA.PB.MULT_DIV <- MA.PB.CE1_MULT_DIV');

DO $$
DECLARE n integer; bad text;
BEGIN
    SELECT count(*) INTO n FROM public._res WHERE NOT ok;
    IF n > 0 THEN
        SELECT string_agg(nom || ' (' || detail || ')', '; ') INTO bad FROM public._res WHERE NOT ok;
        RAISE EXCEPTION 'ce1_problemes_mult_div_dedie : % test(s) en echec : %', n, bad;
    END IF;
    RAISE NOTICE 'ce1_problemes_mult_div_dedie : % tests PASS', (SELECT count(*) FROM public._res);
END $$;

ROLLBACK;
