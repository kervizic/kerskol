-- mesures_test.sql
-- MESURES du temps (MA.MES.HEURE, MA.MES.DUREES) : le SERVEUR recalcule et
-- decide « juste/faux », borne les operandes et interdit les operations hors
-- referentiel. Transaction ROLLBACK : aucune donnee de test ne subsiste.
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
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Heure', 'CE2');
\set p 'a0000001-0000-0000-0000-000000000000'
\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- --- MA.MES.HEURE : lecture (val = minutes depuis minuit, 3 h 45 = 225) ---
SELECT _rec('heure_lire_bonne',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.HEURE', NULL, 1, NULL,
        'val', 225, 0, 225, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    '3 h 45 = 225 min');
SELECT _rec('heure_lire_mauvaise',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.HEURE', NULL, 1, NULL,
        'val', 225, 0, 230, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false,
    'saisie 230 pour 225');

-- --- MA.MES.HEURE : matin/apres-midi (14 h -> 2 h, sub) ---
SELECT _rec('heure_ap_midi_bonne',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.HEURE', NULL, 4, NULL,
        'sub', 14, 12, 2, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    '14 - 12 = 2');

-- --- MA.MES.HEURE : operation INTERDITE (cmp non autorise) refusee ---
DO $$
BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.MES.HEURE', NULL, 1, NULL, 'cmp', 3, 4, 0, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('heure_op_interdite', false, 'cmp accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('heure_op_interdite', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

-- --- MA.MES.HEURE : operande HORS BORNES refusee ---
DO $$
BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.MES.HEURE', NULL, 1, NULL, 'val', 25000, 0, 25000, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('heure_hors_bornes', false, 'operande 25000 accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('heure_hors_bornes', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

-- --- MA.MES.DUREES : conversion h->min (mul), de_a (sub), arrivee (add), jours (div) ---
SELECT _rec('duree_conversion_mul',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.DUREES', NULL, 1, NULL,
        'mul', 2, 60, 120, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    '2 h = 120 min');
SELECT _rec('duree_de_a_sub',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.DUREES', NULL, 2, NULL,
        'sub', 525, 480, 45, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    'de 8 h a 8 h 45 = 45 min');
SELECT _rec('duree_arrivee_add',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.DUREES', NULL, 3, NULL,
        'add', 615, 45, 660, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    '10 h 15 + 45 min = 11 h = 660 min');
SELECT _rec('duree_jours_div',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.DUREES', NULL, 4, NULL,
        'div', 14, 7, 2, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = true,
    '14 jours = 2 semaines');
SELECT _rec('duree_arrivee_mauvaise',
    (public.enregistrer_reponse(gen_random_uuid(), :'p'::uuid, NULL, 'MA.MES.DUREES', NULL, 3, NULL,
        'add', 615, 45, 700, NULL, 1, 3000, false, false, false, now()) ->> 'correct')::boolean = false,
    'saisie 700 pour 660');

-- --- MA.MES.DUREES : operande HORS BORNES refusee ---
DO $$
BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.MES.DUREES', NULL, 1, NULL, 'val', 25000, 0, 25000, NULL, 1, 3000, false, false, false, now());
    PERFORM _rec('duree_hors_bornes', false, 'operande 25000 accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('duree_hors_bornes', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

-- --- op2 (seconde etape) INTERDIT hors MA.PB.DEUX_ETAPES ---
DO $$
BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'a0000001-0000-0000-0000-000000000000'::uuid, NULL,
        'MA.MES.DUREES', NULL, 3, NULL, 'add', 100, 20, 125, NULL, 1, 3000, false, false, false, now(),
        'add', 5);
    PERFORM _rec('duree_op2_interdit', false, 'op2 accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('duree_op2_interdit', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

RESET ROLE;

-- --- Rapport ---
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
