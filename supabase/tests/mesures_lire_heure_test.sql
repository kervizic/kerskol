-- mesures_lire_heure_test.sql
-- Scission de « Mesures et heure » en deux sous-matieres (migration 0040) :
--   * `heure`   -> MA.MES.HEURE, MA.MES.DUREES ;
--   * `mesures` -> MA.MES.LONGUEURS, MA.MES.MASSES_CONTENANCES ;
--   * MA.PB.MESURES reste dans `problemes`.
-- Verifie aussi : defaut de colonne, reglage des deux sous-matieres, garde-fou
-- « au moins une sous-matiere jouable » avec `heure` seul.
--
-- Suppose la migration 0040 appliquee. Transaction ROLLBACK. deploy/test-db.sh.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

-- ===========================================================================
-- TEST 1 : les competences heure / durees sont dans le domaine `heure`
-- ===========================================================================
SELECT _rec('1_heure_durees_domaine_heure',
    (SELECT bool_and(domaine = 'heure')
       FROM public.competences WHERE code IN ('MA.MES.HEURE','MA.MES.DUREES')),
    (SELECT string_agg(code || '=' || domaine, ', ')
       FROM public.competences WHERE code IN ('MA.MES.HEURE','MA.MES.DUREES')));

-- ===========================================================================
-- TEST 2 : les grandeurs restent dans le domaine `mesures`
-- ===========================================================================
SELECT _rec('2_grandeurs_domaine_mesures',
    (SELECT bool_and(domaine = 'mesures')
       FROM public.competences WHERE code IN ('MA.MES.LONGUEURS','MA.MES.MASSES_CONTENANCES')),
    (SELECT string_agg(code || '=' || domaine, ', ')
       FROM public.competences WHERE code IN ('MA.MES.LONGUEURS','MA.MES.MASSES_CONTENANCES')));

-- ===========================================================================
-- TEST 3 : MA.PB.MESURES reste un probleme (domaine `problemes`)
-- ===========================================================================
SELECT _rec('3_pb_mesures_reste_problemes',
    (SELECT domaine = 'problemes' FROM public.competences WHERE code = 'MA.PB.MESURES'),
    (SELECT domaine FROM public.competences WHERE code = 'MA.PB.MESURES'));

-- ===========================================================================
-- TEST 4 : le defaut de profils.domaines_actifs inclut `heure`
-- ===========================================================================
SELECT _rec('4_defaut_colonne_inclut_heure',
    (SELECT pg_get_expr(adbin, adrelid) LIKE '%heure%'
       FROM pg_attrdef d
       JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
      WHERE a.attrelid = 'public.profils'::regclass AND a.attname = 'domaines_actifs'),
    (SELECT pg_get_expr(adbin, adrelid)
       FROM pg_attrdef d
       JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
      WHERE a.attrelid = 'public.profils'::regclass AND a.attname = 'domaines_actifs'));

-- Fixture : parent + profil enfant pour tester le reglage.
\set uA 'aa444444-4444-4444-4444-444444444444'
INSERT INTO auth.users (id, email, created_at, email_confirmed_at) VALUES
    (:'uA', 'pa40@example.test', now(), now());
INSERT INTO foyers (id) VALUES ('a4000000-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('a4000000-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, matieres_actives) VALUES
    ('c4000000-0000-0000-0000-00000000000a', 'a4000000-0000-0000-0000-000000000000', 'Nael', '{MA}'::text[]);
\set p 'c4000000-0000-0000-0000-00000000000a'
\set claimsA '{"sub":"aa444444-4444-4444-4444-444444444444","role":"authenticated"}'

-- ===========================================================================
-- TEST 5 : le parent active les DEUX sous-matieres (mesures + heure)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT public.regler_matieres(:'p', ARRAY['MA'], ARRAY['mesures','heure']);
RESET ROLE;
SELECT _rec('5_regle_mesures_et_heure',
    (SELECT domaines_actifs @> ARRAY['mesures','heure'] FROM profils WHERE id = :'p'),
    (SELECT array_to_string(domaines_actifs, ',') FROM profils WHERE id = :'p'));

-- ===========================================================================
-- TEST 6 : `heure` seul reste jouable (MA.MES.HEURE actif) -> garde-fou ok
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT public.regler_matieres(:'p', ARRAY['MA'], ARRAY['heure']);
RESET ROLE;
-- Depuis la phase 6, regler_matieres re-ajoute toujours 'mots-maitresse' : le
-- reglage « heure seule » donne ['heure','mots-maitresse']. On verifie donc que
-- heure est bien active et que les autres sous-matieres de maths sont retirees.
SELECT _rec('6_heure_seule_jouable',
    (SELECT domaines_actifs @> ARRAY['heure'] AND NOT (domaines_actifs @> ARRAY['mesures'])
       FROM profils WHERE id = :'p'),
    (SELECT array_to_string(domaines_actifs, ',') FROM profils WHERE id = :'p'));

-- ===========================================================================
-- TEST 7 : simulation de la reaffectation 0040 sur un profil « ancien »
--          (domaines_actifs encore sans `heure`) -> array_append ajoute `heure`
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
-- On repart d'un reglage qui contient `mesures` sans `heure`.
SELECT public.regler_matieres(:'p', ARRAY['MA'], ARRAY['numeration','mesures']);
RESET ROLE;
UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'heure')
 WHERE id = :'p'
   AND 'mesures' = ANY (domaines_actifs)
   AND NOT ('heure' = ANY (domaines_actifs));
SELECT _rec('7_reaffectation_ajoute_heure',
    (SELECT domaines_actifs @> ARRAY['mesures','heure','numeration'] FROM profils WHERE id = :'p'),
    (SELECT array_to_string(domaines_actifs, ',') FROM profils WHERE id = :'p'));

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
