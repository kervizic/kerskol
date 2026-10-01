-- droits_contraintes_test.sql
-- Verrouillage des droits (0017) + contraintes d'integrite (0018).
-- Transaction ROLLBACK. Execution : deploy/test-db.sh.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;

\set uP 'aaaa0000-0000-0000-0000-00000000aaaa'
INSERT INTO auth.users (id, email, created_at, email_confirmed_at)
VALUES (:'uP', 'p@example.test', now(), now());
INSERT INTO foyers (id) VALUES ('ffff0000-0000-0000-0000-00000000ffff');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('ffff0000-0000-0000-0000-00000000ffff', :'uP');
INSERT INTO profils (id, foyer_id, surnom, matieres_actives, monnaie)
VALUES ('cccc0000-0000-0000-0000-00000000cccc', 'ffff0000-0000-0000-0000-00000000ffff', 'Lou', '{MA}'::text[], 10);
INSERT INTO bravos (id, profil_id, auteur, message)
VALUES ('bbbb0000-0000-0000-0000-00000000bbbb', 'cccc0000-0000-0000-0000-00000000cccc', :'uP', 'Bravo');

\set claimsP '{"sub":"aaaa0000-0000-0000-0000-00000000aaaa","role":"authenticated"}'
\set lou 'cccc0000-0000-0000-0000-00000000cccc'

-- ===== DROITS (0017) =======================================================

-- T1 : schema_migrations ferme a authenticated
SET ROLE authenticated;
SET request.jwt.claims = :'claimsP';
DO $$
BEGIN
    PERFORM count(*) FROM public.schema_migrations;
    PERFORM _rec('1_schema_migrations_ferme', false, 'lecture permise a tort');
EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _rec('1_schema_migrations_ferme', true, 'permission denied (ok)');
END $$;
RESET ROLE;

-- T2 : helper de policy fonctionne encore (le parent voit son profil)
SET ROLE authenticated;
SET request.jwt.claims = :'claimsP';
SELECT _rec('2_policy_helper_ok',
    (SELECT count(*) FROM profils WHERE id = 'cccc0000-0000-0000-0000-00000000cccc') = 1, 'parent voit son profil');
RESET ROLE;

-- T3 : fonction interne non executable par authenticated
SET ROLE authenticated;
SET request.jwt.claims = :'claimsP';
DO $$
BEGIN
    PERFORM public.calc_progression('cccc0000-0000-0000-0000-00000000cccc'::uuid, 'MA.CM.ADDITION');
    PERFORM _rec('3_interne_bloquee', false, 'executee a tort');
EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _rec('3_interne_bloquee', true, 'permission denied (ok)');
WHEN OTHERS THEN
    PERFORM _rec('3_interne_bloquee', SQLERRM LIKE '%permission denied%', SQLERRM);
END $$;
RESET ROLE;

-- T4 : bravos UPDATE lu_le autorise, message refuse (droit colonne)
SET ROLE authenticated;
SET request.jwt.claims = :'claimsP';
DO $$
BEGIN
    UPDATE bravos SET lu_le = now() WHERE id = 'bbbb0000-0000-0000-0000-00000000bbbb';
    PERFORM _rec('4a_bravos_lu_ok', true, 'lu_le ok');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('4a_bravos_lu_ok', false, 'refus a tort : ' || SQLERRM);
END $$;
DO $$
BEGIN
    UPDATE bravos SET message = 'change' WHERE id = 'bbbb0000-0000-0000-0000-00000000bbbb';
    PERFORM _rec('4b_bravos_message_refuse', false, 'message modifie a tort');
EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _rec('4b_bravos_message_refuse', true, 'permission denied (ok)');
END $$;
RESET ROLE;

-- T5 : profils.monnaie non modifiable via l'API (parent inclus)
SET ROLE authenticated;
SET request.jwt.claims = :'claimsP';
DO $$
BEGIN
    UPDATE profils SET monnaie = 999 WHERE id = 'cccc0000-0000-0000-0000-00000000cccc';
    PERFORM _rec('5_monnaie_bloquee', false, 'monnaie modifiee a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('5_monnaie_bloquee', SQLERRM LIKE '%monnaie_non_modifiable%', SQLERRM);
END $$;
RESET ROLE;

-- ===== CONTRAINTES (0018) ==================================================

-- T6 : avatar trop gros refuse
DO $$
BEGIN
    UPDATE profils SET avatar = jsonb_build_object('style','adventurer','couleur','#E06A00',
        'blob', repeat('x', 5000)) WHERE id = 'cccc0000-0000-0000-0000-00000000cccc';
    PERFORM _rec('6_avatar_taille', false, 'accepte a tort');
EXCEPTION WHEN check_violation THEN
    PERFORM _rec('6_avatar_taille', true, 'rejete');
END $$;

-- T7 : avatar style inconnu refuse
DO $$
BEGIN
    UPDATE profils SET avatar = '{"style":"martien","couleur":"#E06A00"}'::jsonb WHERE id = 'cccc0000-0000-0000-0000-00000000cccc';
    PERFORM _rec('7_avatar_style', false, 'accepte a tort');
EXCEPTION WHEN check_violation THEN
    PERFORM _rec('7_avatar_style', true, 'rejete');
END $$;

-- T8 : avatar couleur hors palette refusee
DO $$
BEGIN
    UPDATE profils SET avatar = '{"style":"adventurer","couleur":"#123456"}'::jsonb WHERE id = 'cccc0000-0000-0000-0000-00000000cccc';
    PERFORM _rec('8_avatar_couleur', false, 'accepte a tort');
EXCEPTION WHEN check_violation THEN
    PERFORM _rec('8_avatar_couleur', true, 'rejete');
END $$;

-- T9 : avatar valide (style + couleur palette) accepte
DO $$
BEGIN
    UPDATE profils SET avatar = '{"style":"pixelArt","couleur":"#3182CE"}'::jsonb WHERE id = 'cccc0000-0000-0000-0000-00000000cccc';
    PERFORM _rec('9_avatar_valide', true, 'ok');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('9_avatar_valide', false, 'refus a tort : ' || SQLERRM);
END $$;

-- T10 : reponses niveau hors bornes refuse
DO $$
BEGIN
    INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le)
    VALUES (gen_random_uuid(), 'cccc0000-0000-0000-0000-00000000cccc', 'MA.CM.ADDITION', 9, true, 3000, now());
    PERFORM _rec('10_reponses_niveau', false, 'accepte a tort');
EXCEPTION WHEN check_violation THEN
    PERFORM _rec('10_reponses_niveau', true, 'rejete');
WHEN OTHERS THEN
    PERFORM _rec('10_reponses_niveau', SQLERRM LIKE '%reponses_niveau%', SQLERRM);
END $$;

-- T11 : reponses temps_ms hors bornes refuse
DO $$
BEGIN
    INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le)
    VALUES (gen_random_uuid(), 'cccc0000-0000-0000-0000-00000000cccc', 'MA.CM.ADDITION', 1, true, 999999, now());
    PERFORM _rec('11_reponses_temps', false, 'accepte a tort');
EXCEPTION WHEN check_violation THEN
    PERFORM _rec('11_reponses_temps', true, 'rejete');
WHEN OTHERS THEN
    PERFORM _rec('11_reponses_temps', SQLERRM LIKE '%reponses_temps%', SQLERRM);
END $$;

-- T12 : limite_jour_min hors bornes refuse ; valeur valide acceptee
DO $$
BEGIN
    UPDATE profils SET limite_jour_min = 2 WHERE id = 'cccc0000-0000-0000-0000-00000000cccc';
    PERFORM _rec('12a_limite_jour_min', false, 'accepte a tort');
EXCEPTION WHEN check_violation THEN
    PERFORM _rec('12a_limite_jour_min', true, 'rejete');
END $$;
DO $$
BEGIN
    UPDATE profils SET limite_semaine_min = 120 WHERE id = 'cccc0000-0000-0000-0000-00000000cccc';
    PERFORM _rec('12b_limite_valide', true, 'ok');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('12b_limite_valide', false, 'refus a tort : ' || SQLERRM);
END $$;

-- T13 : matieres_actives avec code inconnu refuse
DO $$
BEGIN
    UPDATE profils SET matieres_actives = '{MA,ZZZ}'::text[] WHERE id = 'cccc0000-0000-0000-0000-00000000cccc';
    PERFORM _rec('13_matieres_inconnues', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('13_matieres_inconnues', SQLERRM LIKE '%matieres_inconnues%', SQLERRM);
END $$;

-- Rapport
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
