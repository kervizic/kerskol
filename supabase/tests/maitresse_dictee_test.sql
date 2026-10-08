-- maitresse_dictee_test.sql
-- « Dictee avec papa ou maman » (migration 0064). Tests dans une transaction
-- ROLLBACK : AUCUNE donnee de test ne subsiste.
--
-- Couvre : diagnostic deterministe de la faute (_maitresse_diag), enregistrement
-- d'une dictee (serveur seul juge) en mode VOIX et PAPIER, score + mots a revoir,
-- memoire par mot (EMA), historique reserve au parent, isolation inter-foyers,
-- champ ema expose par maitresse_charger.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

-- --- Jeu de donnees : deux foyers A et B ----------------------------------
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'
INSERT INTO auth.users (id, email, created_at)
VALUES (:'uA', 'parentA@example.test', now()), (:'uB', 'parentB@example.test', now());

\set fA 'aaaaaaaa-0000-0000-0000-000000000000'
\set fB 'bbbbbbbb-0000-0000-0000-000000000000'
INSERT INTO foyers (id) VALUES (:'fA'), (:'fB');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES (:'fA', :'uA'), (:'fB', :'uB');

\set pA1 'a0000001-0000-0000-0000-000000000000'
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES (:'pA1', :'fA', 'EnfantA', 'CE2');

\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'
\set claimsB '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'

INSERT INTO maitresse_liste (foyer_id, titre, mots, texte, active)
VALUES (:'fA', 'Liste A', ARRAY['maison','poisson','toujours','bateau','est'], NULL, true)
RETURNING id AS listea \gset

-- Expose l'id de liste A pour les blocs plpgsql (les \set psql n'y sont pas visibles).
SELECT set_config('kerskol.test_la', :'listea', false);

-- ===========================================================================
-- TEST 1 : diagnostic deterministe de la faute
-- ===========================================================================
SELECT _rec('1a_diag_homophone', _maitresse_diag('est', 'et') = 'homophone', _maitresse_diag('est','et'));
SELECT _rec('1b_diag_accent',    _maitresse_diag('élève', 'eleve') = 'accent', _maitresse_diag('élève','eleve'));
SELECT _rec('1c_diag_doublement', _maitresse_diag('poisson', 'poison') = 'doublement', _maitresse_diag('poisson','poison'));
SELECT _rec('1d_diag_muette',    _maitresse_diag('toujours', 'toujour') = 'lettre_muette', _maitresse_diag('toujours','toujour'));
SELECT _rec('1e_diag_son',       _maitresse_diag('bateau', 'bato') = 'son', _maitresse_diag('bateau','bato'));
SELECT _rec('1f_diag_lettre',    _maitresse_diag('jardin', 'jradin') = 'lettre', _maitresse_diag('jardin','jradin'));
SELECT _rec('1g_diag_juste',     _maitresse_diag('maison', 'Maison') IS NULL, COALESCE(_maitresse_diag('maison','Maison'),'NULL'));

-- ===========================================================================
-- TEST 2 : enregistrement VOIX (serveur juge, score, mots a revoir, type)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

SELECT maitresse_dictee_enregistrer(:'pA1', :'listea', 'voix', jsonb_build_array(
    jsonb_build_object('index', 1, 'saisie', 'maison'),   -- juste
    jsonb_build_object('index', 2, 'saisie', 'poison'),   -- faux : doublement
    jsonb_build_object('index', 3, 'saisie', 'toujour')   -- faux : lettre muette
)) AS r \gset

SELECT _rec('2a_score', (:'r'::jsonb->>'score_juste') = '1' AND (:'r'::jsonb->>'score_total') = '3',
            'score = ' || (:'r'::jsonb->>'score_juste') || '/' || (:'r'::jsonb->>'score_total'));
SELECT _rec('2b_a_revoir', (:'r'::jsonb->'a_revoir') = '["poisson","toujours"]'::jsonb,
            'a_revoir = ' || (:'r'::jsonb->>'a_revoir'));
SELECT _rec('2c_type_doublement',
            (:'r'::jsonb#>>'{mots,1,type}') = 'doublement' AND (:'r'::jsonb#>>'{mots,1,correct}') = 'false',
            'mot2 type = ' || (:'r'::jsonb#>>'{mots,1,type}'));

RESET ROLE;

-- EMA : les mots rates (index 2 et 3) ont un ema > 0, le mot juste (index 1) = 0.
SELECT _rec('2d_ema_rate',
    (SELECT ema FROM maitresse_mot_ema WHERE profil_id = :'pA1' AND liste_id = :'listea' AND mot_index = 2) > 0,
    'ema mot2 = ' || COALESCE((SELECT ema::text FROM maitresse_mot_ema WHERE profil_id = :'pA1' AND liste_id = :'listea' AND mot_index = 2), 'NULL'));
SELECT _rec('2e_ema_juste',
    COALESCE((SELECT ema FROM maitresse_mot_ema WHERE profil_id = :'pA1' AND liste_id = :'listea' AND mot_index = 1), 0) = 0,
    'ema mot1 = ' || COALESCE((SELECT ema::text FROM maitresse_mot_ema WHERE profil_id = :'pA1' AND liste_id = :'listea' AND mot_index = 1), 'NULL'));

-- ===========================================================================
-- TEST 3 : mode PAPIER (la coche du parent fait foi)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

SELECT maitresse_dictee_enregistrer(:'pA1', :'listea', 'papier', jsonb_build_array(
    jsonb_build_object('index', 1, 'juste', true),                       -- coche juste
    jsonb_build_object('index', 4, 'juste', false, 'saisie', 'bato')     -- coche faux + graphie
)) AS r2 \gset

SELECT _rec('3a_papier_score', (:'r2'::jsonb->>'score_juste') = '1' AND (:'r2'::jsonb->>'score_total') = '2',
            'score = ' || (:'r2'::jsonb->>'score_juste') || '/' || (:'r2'::jsonb->>'score_total'));
SELECT _rec('3b_papier_type_son', (:'r2'::jsonb#>>'{mots,1,type}') = 'son',
            'mot bateau/bato type = ' || (:'r2'::jsonb#>>'{mots,1,type}'));

RESET ROLE;

-- ===========================================================================
-- TEST 4 : historique (reserve au parent)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT maitresse_historique(:'pA1') AS h \gset
SELECT _rec('4a_historique_2_dictees', jsonb_array_length(:'h'::jsonb) = 2,
            'nb dictees = ' || jsonb_array_length(:'h'::jsonb));
RESET ROLE;

-- B (autre foyer) ne lit pas l'historique de A
SET ROLE authenticated;
SET request.jwt.claims = :'claimsB';
DO $$
BEGIN
    PERFORM maitresse_historique('a0000001-0000-0000-0000-000000000000');
    PERFORM _rec('4b_historique_isolation', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('4b_historique_isolation', SQLERRM LIKE '%acces_refuse%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 5 : isolation d'enregistrement (B ne dicte pas pour le profil de A)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsB';
DO $$
BEGIN
    PERFORM maitresse_dictee_enregistrer('a0000001-0000-0000-0000-000000000000'::uuid,
        current_setting('kerskol.test_la')::uuid, 'voix',
        jsonb_build_array(jsonb_build_object('index', 1, 'saisie', 'maison')));
    PERFORM _rec('5_enreg_isolation', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('5_enreg_isolation', SQLERRM LIKE '%acces_refuse%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 6 : maitresse_charger expose le champ ema (longueur = nb de mots)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT maitresse_charger(:'pA1') AS c \gset
SELECT _rec('6a_charger_ema_present',
    jsonb_typeof(:'c'::jsonb#>'{0,ema}') = 'array'
    AND jsonb_array_length(:'c'::jsonb#>'{0,ema}') = 5,
    'ema len = ' || COALESCE(jsonb_array_length(:'c'::jsonb#>'{0,ema}')::text, 'NULL'));
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
