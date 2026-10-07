-- sous_matieres_test.sql
-- Reglages matieres / sous-matieres par profil (migration 0039).
-- Verifie : RPC regler_matieres (parent + enfant autorise), garde-fou « au moins
-- une sous-matiere », autorisation parent, cloisonnement enfant, et le blocage
-- de l'UPDATE direct par l'enfant.
--
-- Entierement en transaction ROLLBACK. Execution : deploy/test-db.sh.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

-- Parent A (foyer A), enfant E relie au profil Lou ; profil Zoe sans compte.
\set uA 'aa111111-1111-1111-1111-111111111111'
\set uE 'ee333333-3333-3333-3333-333333333333'
INSERT INTO auth.users (id, email, created_at, email_confirmed_at) VALUES
    (:'uA', 'pa@example.test',   now(), now()),
    (:'uE', 'iris@example.test', now(), now());

INSERT INTO foyers (id) VALUES ('a1000000-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('a1000000-0000-0000-0000-000000000000', :'uA');

INSERT INTO profils (id, foyer_id, surnom, user_id, matieres_actives) VALUES
    ('c1000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000000', 'Lou', :'uE', '{MA}'::text[]),
    ('c2000000-0000-0000-0000-00000000000b', 'a1000000-0000-0000-0000-000000000000', 'Zoe', NULL, '{MA}'::text[]);

\set lou 'c1000000-0000-0000-0000-00000000000a'
\set zoe 'c2000000-0000-0000-0000-00000000000b'
\set claimsA '{"sub":"aa111111-1111-1111-1111-111111111111","role":"authenticated"}'
\set claimsE '{"sub":"ee333333-3333-3333-3333-333333333333","role":"authenticated"}'

-- ===========================================================================
-- TEST 1 : le PARENT regle matieres + sous-matieres (MA numeration + FR conjugaison)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT public.regler_matieres(:'lou', ARRAY['MA','FR'], ARRAY['numeration','conjugaison']);
RESET ROLE;
SELECT _rec('1_parent_regle',
    (SELECT matieres_actives @> ARRAY['MA','FR'] AND domaines_actifs @> ARRAY['numeration','conjugaison']
       FROM profils WHERE id = :'lou'),
    (SELECT array_to_string(domaines_actifs, ',') FROM profils WHERE id = :'lou'));

-- ===========================================================================
-- TEST 2 : refus si AUCUNE sous-matiere (tableau vide)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
DO $$
BEGIN
    PERFORM public.regler_matieres('c1000000-0000-0000-0000-00000000000a', ARRAY['MA'], ARRAY[]::text[]);
    PERFORM _rec('2_vide_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    -- Depuis la phase 6, regler_matieres re-ajoute toujours 'mots-maitresse' : un
    -- domaines vide devient ['mots-maitresse'], exclu du garde-fou -> refuse via
    -- aucune_sous_matiere_active (au lieu de domaines_actifs_vide). Toujours refuse.
    PERFORM _rec('2_vide_refuse',
                 SQLERRM LIKE '%domaines_actifs_vide%' OR SQLERRM LIKE '%aucune_sous_matiere_active%',
                 SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 3 : refus si aucune sous-matiere JOUABLE (FR seul, mais domaines MA)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
DO $$
BEGIN
    PERFORM public.regler_matieres('c1000000-0000-0000-0000-00000000000a', ARRAY['FR'], ARRAY['numeration','mesures']);
    PERFORM _rec('3_aucune_jouable_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('3_aucune_jouable_refuse', SQLERRM LIKE '%aucune_sous_matiere_active%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 4 : refus d'un domaine INCONNU
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
DO $$
BEGIN
    PERFORM public.regler_matieres('c1000000-0000-0000-0000-00000000000a', ARRAY['MA'], ARRAY['zzz_inconnu']);
    PERFORM _rec('4_domaine_inconnu_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('4_domaine_inconnu_refuse', SQLERRM LIKE '%domaines_inconnus%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 5 : l'ENFANT regle SON profil quand le parent l'autorise (defaut true)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
SELECT public.regler_matieres(:'lou', ARRAY['MA'], ARRAY['numeration','calcul_mental']);
RESET ROLE;
SELECT _rec('5_enfant_autorise_regle',
    (SELECT domaines_actifs @> ARRAY['numeration','calcul_mental'] AND NOT (domaines_actifs @> ARRAY['conjugaison'])
       FROM profils WHERE id = :'lou'),
    (SELECT array_to_string(domaines_actifs, ',') FROM profils WHERE id = :'lou'));

-- ===========================================================================
-- TEST 6 : le PARENT retire l'autorisation -> l'enfant ne peut plus regler
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT public.regler_autorisation_matieres(:'lou', false);
RESET ROLE;
SELECT _rec('6a_autorisation_off',
    (SELECT enfant_regle_matieres = false FROM profils WHERE id = :'lou'), '');

SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
DO $$
BEGIN
    PERFORM public.regler_matieres('c1000000-0000-0000-0000-00000000000a', ARRAY['MA'], ARRAY['mesures']);
    PERFORM _rec('6b_enfant_non_autorise_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('6b_enfant_non_autorise_refuse', SQLERRM LIKE '%reglage_matieres_desactive%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 7 : un enfant ne regle PAS le profil d'un autre
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
DO $$
BEGIN
    PERFORM public.regler_matieres('c2000000-0000-0000-0000-00000000000b', ARRAY['MA'], ARRAY['mesures']);
    PERFORM _rec('7_enfant_autre_profil_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('7_enfant_autre_profil_refuse', SQLERRM LIKE '%acces refuse%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 8 : seul le PARENT regle l'autorisation (l'enfant ne peut pas)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
DO $$
BEGIN
    PERFORM public.regler_autorisation_matieres('c1000000-0000-0000-0000-00000000000a', true);
    PERFORM _rec('8_enfant_autorisation_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('8_enfant_autorisation_refuse', SQLERRM LIKE '%acces refuse%', SQLERRM);
END $$;
RESET ROLE;

-- Les RPC ci-dessus ont pose le marqueur transactionnel kerskol.calcul ('on',
-- local a la transaction). Comme TOUT ce test tient dans une seule transaction,
-- on le remet a 'off' pour simuler une transaction normale (en prod, chaque
-- appel PostgREST est une transaction distincte ou le marqueur n'est pas pose).
SELECT set_config('kerskol.calcul', 'off', true);

-- ===========================================================================
-- TEST 9 : l'UPDATE DIRECT par l'enfant des nouvelles colonnes est bloque
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsE';
DO $$
BEGIN
    UPDATE public.profils SET domaines_actifs = ARRAY['mesures']
     WHERE id = 'c1000000-0000-0000-0000-00000000000a';
    PERFORM _rec('9a_update_direct_domaines_bloque', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('9a_update_direct_domaines_bloque', SQLERRM LIKE '%colonne_interdite_enfant%', SQLERRM);
END $$;
DO $$
BEGIN
    UPDATE public.profils SET enfant_regle_matieres = true
     WHERE id = 'c1000000-0000-0000-0000-00000000000a';
    PERFORM _rec('9b_update_direct_autorisation_bloque', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('9b_update_direct_autorisation_bloque', SQLERRM LIKE '%colonne_interdite_enfant%', SQLERRM);
END $$;
RESET ROLE;

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
    IF v_fail > 0 THEN
        RAISE EXCEPTION 'TESTS EN ECHEC : %', v_fail;
    END IF;
END $$;

ROLLBACK;
