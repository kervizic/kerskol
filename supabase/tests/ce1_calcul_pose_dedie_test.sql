-- ce1_calcul_pose_dedie_test.sql
-- Migration 0122 : calcul POSÉ CE1 dédié (MA.POSE.CE1_ADDITION / _SOUSTRACTION).
-- Vérifie via enregistrer_reponse (serveur SEUL juge) : bonne réponse acceptée,
-- mauvaise refusée, opérande > 1 000 ou opération interdite REFUSÉE, structure.
-- Transaction ROLLBACK : aucune donnée de test ne subsiste.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;

\set uA '31313131-3131-3131-3131-313131313131'
\set pA 'c2000001-0000-0000-0000-000000000000'
\set claimsA '{"sub":"31313131-3131-3131-3131-313131313131","role":"authenticated"}'

INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'ce1pose@example.test', now());
INSERT INTO foyers (id) VALUES ('dddddddd-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('dddddddd-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, classe)
VALUES (:'pA', 'dddddddd-0000-0000-0000-000000000000', 'Pose1', 'CE1');

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 1. Addition posée : 123 + 456 = 579 (juste) ; 580 (faux).
SELECT _rec('1a_add_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.POSE.CE1_ADDITION', NULL, 4, NULL,
        'add', 123, 456, 579, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, 'add 123+456');
SELECT _rec('1b_add_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.POSE.CE1_ADDITION', NULL, 4, NULL,
        'add', 123, 456, 580, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false, 'add 123+456 saisie 580');

-- 2. Soustraction posée : 72 - 38 = 34 (juste) ; 36 (faux).
SELECT _rec('2a_sub_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.POSE.CE1_SOUSTRACTION', NULL, 2, NULL,
        'sub', 72, 38, 34, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true, 'sub 72-38');
SELECT _rec('2b_sub_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.POSE.CE1_SOUSTRACTION', NULL, 2, NULL,
        'sub', 72, 38, 36, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false, 'sub 72-38 saisie 36');

-- 3. Opérande > 1 000 REFUSÉ.
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'c2000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.POSE.CE1_ADDITION', NULL, 1, NULL, 'add', 1200, 50, 1250, NULL, 1, 3000, false, false, false, now());
    PERFORM public._rec('3_borne_1000_refuse', false, '1200 aurait du etre refuse');
EXCEPTION WHEN others THEN
    PERFORM public._rec('3_borne_1000_refuse', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

-- 4. Opération interdite (sub sur ADDITION) REFUSÉE.
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'c2000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.POSE.CE1_ADDITION', NULL, 1, NULL, 'sub', 50, 20, 30, NULL, 1, 3000, false, false, false, now());
    PERFORM public._rec('4_op_interdite_refuse', false, 'sub aurait du etre refuse');
EXCEPTION WHEN others THEN
    PERFORM public._rec('4_op_interdite_refuse', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

RESET ROLE;

-- 5. Structure : portée [CE1,CE1], 8 exercices, prérequis CE1 -> CE2.
SELECT _rec('5a_portee_ce1',
    (SELECT count(*) = 2 FROM public.competences
      WHERE code IN ('MA.POSE.CE1_ADDITION','MA.POSE.CE1_SOUSTRACTION')
        AND classe_min = 'CE1' AND classe_max = 'CE1'), '2 competences [CE1,CE1]');
SELECT _rec('5b_huit_exercices',
    (SELECT count(*) = 8 FROM public.exercices
      WHERE competence IN ('MA.POSE.CE1_ADDITION','MA.POSE.CE1_SOUSTRACTION') AND type = 'calcul' AND actif),
    '8 exercices actifs');
SELECT _rec('5c_prerequis',
    (SELECT count(*) = 2 FROM public.competence_prerequis
      WHERE (competence='MA.POSE.ADDITION' AND prerequis='MA.POSE.CE1_ADDITION')
         OR (competence='MA.POSE.SOUSTRACTION' AND prerequis='MA.POSE.CE1_SOUSTRACTION')),
    'prerequis CE1 -> CE2');

DO $$
DECLARE n integer; bad text;
BEGIN
    SELECT count(*) INTO n FROM public._res WHERE NOT ok;
    IF n > 0 THEN
        SELECT string_agg(nom || ' (' || detail || ')', '; ') INTO bad FROM public._res WHERE NOT ok;
        RAISE EXCEPTION 'ce1_calcul_pose_dedie : % test(s) en echec : %', n, bad;
    END IF;
    RAISE NOTICE 'ce1_calcul_pose_dedie : % tests PASS', (SELECT count(*) FROM public._res);
END $$;

ROLLBACK;
