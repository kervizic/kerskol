-- ce1_numeration_dediee_test.sql
-- Migration 0121 : compétence CE1 DÉDIÉE MA.NUM.CE1_MILLE (nombres <= 1 000).
-- Vérifie, de bout en bout via enregistrer_reponse (serveur SEUL juge) :
--   * bonne réponse ACCEPTÉE (val <= 1000, cmp) ;
--   * mauvaise réponse marquée FAUSSE ;
--   * nombre > 1 000 ou opération interdite REFUSÉ (enonce_incoherent) ;
--   * portée bornée au CE1 et lien prérequis de remédiation CE1 -> CE2.
-- Transaction ROLLBACK : aucune donnée de test ne subsiste.
-- Exécution : deploy/test-db.sh (migration 0121 déjà appliquée).

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;

\set uA '21212121-2121-2121-2121-212121212121'
\set pA 'c1000001-0000-0000-0000-000000000000'
\set claimsA '{"sub":"21212121-2121-2121-2121-212121212121","role":"authenticated"}'

INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'ce1num@example.test', now());
INSERT INTO foyers (id) VALUES ('cccccccc-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('cccccccc-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, classe)
VALUES (:'pA', 'cccccccc-0000-0000-0000-000000000000', 'Num1', 'CE1');

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- =========================================================================
-- 1. N4 ranger (val) : 987 est la bonne réponse ; 980 est faux.
-- =========================================================================
SELECT _rec('1a_val_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.CE1_MILLE', NULL, 4, NULL,
        'val', 987, 0, 987, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'val 987, saisie 987');
SELECT _rec('1b_val_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.CE1_MILLE', NULL, 4, NULL,
        'val', 987, 0, 980, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false,
    'val 987, saisie 980');

-- =========================================================================
-- 2. N2 comparer (cmp) : 120 < 450 -> 0 attendu ; 2 est faux.
-- =========================================================================
SELECT _rec('2a_cmp_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.CE1_MILLE', NULL, 2, NULL,
        'cmp', 120, 450, 0, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'cmp 120<450 -> 0');
SELECT _rec('2b_cmp_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'MA.NUM.CE1_MILLE', NULL, 2, NULL,
        'cmp', 120, 450, 2, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false,
    'cmp 120<450, saisie 2');

-- =========================================================================
-- 3. Garde-fou de NIVEAU CE1 : nombre > 1 000 REFUSÉ (enonce_incoherent).
-- =========================================================================
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'c1000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.NUM.CE1_MILLE', NULL, 1, NULL, 'val', 1001, 0, 1001, NULL, 1, 3000, false, false, false, now());
    PERFORM public._rec('3_borne_1000_refuse', false, '1001 aurait du etre refuse');
EXCEPTION WHEN others THEN
    PERFORM public._rec('3_borne_1000_refuse', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

-- =========================================================================
-- 4. Opération interdite (add) REFUSÉE.
-- =========================================================================
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'c1000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.NUM.CE1_MILLE', NULL, 1, NULL, 'add', 10, 20, 30, NULL, 1, 3000, false, false, false, now());
    PERFORM public._rec('4_op_add_refuse', false, 'add aurait du etre refuse');
EXCEPTION WHEN others THEN
    PERFORM public._rec('4_op_add_refuse', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

RESET ROLE;

-- =========================================================================
-- 5. Structure : portée [CE1,CE1], 4 exercices, prérequis CE1 -> CE2.
-- =========================================================================
SELECT _rec('5a_portee_ce1',
    (SELECT classe_min = 'CE1' AND classe_max = 'CE1' FROM public.competences WHERE code = 'MA.NUM.CE1_MILLE'),
    'classe_min=classe_max=CE1');
SELECT _rec('5b_quatre_exercices',
    (SELECT count(*) = 4 FROM public.exercices WHERE competence = 'MA.NUM.CE1_MILLE' AND type = 'calcul' AND actif),
    '4 exercices actifs');
SELECT _rec('5c_prerequis_remediation',
    EXISTS (SELECT 1 FROM public.competence_prerequis
             WHERE competence = 'MA.NUM.COMPARER' AND prerequis = 'MA.NUM.CE1_MILLE'),
    'MA.NUM.COMPARER <- MA.NUM.CE1_MILLE');

-- =========================================================================
-- Bilan : échoue (RAISE) si un test est faux.
-- =========================================================================
DO $$
DECLARE n integer; bad text;
BEGIN
    SELECT count(*) INTO n FROM public._res WHERE NOT ok;
    IF n > 0 THEN
        SELECT string_agg(nom || ' (' || detail || ')', '; ') INTO bad FROM public._res WHERE NOT ok;
        RAISE EXCEPTION 'ce1_numeration_dediee : % test(s) en echec : %', n, bad;
    END IF;
    RAISE NOTICE 'ce1_numeration_dediee : % tests PASS', (SELECT count(*) FROM public._res);
END $$;

ROLLBACK;
