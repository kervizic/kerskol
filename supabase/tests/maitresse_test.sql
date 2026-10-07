-- maitresse_test.sql
-- Sous-matiere « Les mots de la maitresse » (migration 0046). Tests entierement
-- dans une transaction ROLLBACK : AUCUNE donnee de test ne subsiste (foyers de
-- test crees ici, jamais le foyer reel).
--
-- Couvre : isolation RLS inter-foyers, CRUD parent (auth), garde-fous (vide,
-- chevrons HTML, longueurs, plafond 10 actives), injection DETERMINISTE des
-- erreurs, coeur partage _verif_dictee_core, ops mmots / mtrou / mdictee de
-- enregistrer_reponse (juste/faux + isolation), exclusion du garde-fou
-- « au moins une sous-matiere » et force-add de regler_matieres.
--
-- Execution : deploy/test-db.sh (psql -v ON_ERROR_STOP=1 dans le conteneur db).

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

-- --- Jeu de donnees : deux foyers A et B, chacun un parent ------------------
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'
INSERT INTO auth.users (id, email, created_at)
VALUES (:'uA', 'parentA@example.test', now()),
       (:'uB', 'parentB@example.test', now());

\set fA 'aaaaaaaa-0000-0000-0000-000000000000'
\set fB 'bbbbbbbb-0000-0000-0000-000000000000'
INSERT INTO foyers (id) VALUES (:'fA'), (:'fB');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES (:'fA', :'uA'), (:'fB', :'uB');

\set pA1 'a0000001-0000-0000-0000-000000000000'
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES (:'pA1', :'fA', 'EnfantA', 'CE2');

\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'
\set claimsB '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'

-- Listes : une liste A active (mots + texte), une liste B active.
INSERT INTO maitresse_liste (foyer_id, titre, mots, texte, active)
VALUES (:'fA', 'Liste A', ARRAY['maison','toujours','jardin'], 'Le chat est beau.', true)
RETURNING id AS listea \gset
INSERT INTO maitresse_liste (foyer_id, titre, mots, texte, active)
VALUES (:'fB', 'Liste B', ARRAY['beaucoup','poisson','ecole'], 'Il a un tambour.', true)
RETURNING id AS listeb \gset

-- ===========================================================================
-- TEST 1 : isolation RLS inter-foyers
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

SELECT _rec('1a_A_voit_sa_liste',
            (SELECT count(*) FROM maitresse_liste WHERE foyer_id = :'fA') = 1,
            'listes visibles A = ' || (SELECT count(*) FROM maitresse_liste WHERE foyer_id = :'fA'));

SELECT _rec('1b_A_ne_voit_pas_liste_B',
            (SELECT count(*) FROM maitresse_liste WHERE foyer_id = :'fB') = 0,
            'listes B visibles depuis A = ' || (SELECT count(*) FROM maitresse_liste WHERE foyer_id = :'fB'));

-- 1c : A ne peut pas creer une liste chez B (non parent)
DO $$
BEGIN
    PERFORM maitresse_upsert(NULL, 'bbbbbbbb-0000-0000-0000-000000000000', 'Pirate',
                             ARRAY['un','deux','trois'], NULL);
    PERFORM _rec('1c_A_ne_cree_pas_chez_B', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('1c_A_ne_cree_pas_chez_B', SQLERRM LIKE '%acces refuse%', SQLERRM);
END $$;

-- 1d : maitresse_charger d'un profil d'un autre foyer -> refus
DO $$
BEGIN
    PERFORM maitresse_charger('a0000001-0000-0000-0000-000000000000');
    PERFORM _rec('1d_charger_profil_A_par_A_ok', true, 'ok');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('1d_charger_profil_A_par_A_ok', false, SQLERRM);
END $$;

RESET ROLE;

SET ROLE authenticated;
SET request.jwt.claims = :'claimsB';
DO $$
BEGIN
    PERFORM maitresse_charger('a0000001-0000-0000-0000-000000000000');
    PERFORM _rec('1e_B_ne_charge_pas_profil_A', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('1e_B_ne_charge_pas_profil_A', SQLERRM LIKE '%acces_refuse%', SQLERRM);
END $$;
RESET ROLE;

-- ===========================================================================
-- TEST 2 : garde-fous de validation (trigger + CHECK)
-- ===========================================================================
-- 2a : liste vide (< 3 mots, pas de texte) -> refus
DO $$
BEGIN
    INSERT INTO maitresse_liste (foyer_id, titre, mots) VALUES
        ('aaaaaaaa-0000-0000-0000-000000000000', 'Trop court', ARRAY['un','deux']);
    PERFORM _rec('2a_liste_vide_refusee', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('2a_liste_vide_refusee', SQLERRM LIKE '%maitresse_vide%', SQLERRM);
END $$;

-- 2b : chevrons HTML dans un mot -> refus
DO $$
BEGIN
    INSERT INTO maitresse_liste (foyer_id, titre, mots) VALUES
        ('aaaaaaaa-0000-0000-0000-000000000000', 'Injection',
         ARRAY['maison','<script>','jardin']);
    PERFORM _rec('2b_html_refuse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('2b_html_refuse', SQLERRM LIKE '%maitresse_html%', SQLERRM);
END $$;

-- 2c : titre trop long (> 60) -> CHECK
DO $$
BEGIN
    INSERT INTO maitresse_liste (foyer_id, titre, mots) VALUES
        ('aaaaaaaa-0000-0000-0000-000000000000', repeat('x', 61),
         ARRAY['maison','toujours','jardin']);
    PERFORM _rec('2c_titre_long_refuse', false, 'accepte a tort');
EXCEPTION WHEN check_violation THEN
    PERFORM _rec('2c_titre_long_refuse', true, 'refus attendu : ' || SQLERRM);
WHEN OTHERS THEN
    PERFORM _rec('2c_titre_long_refuse', true, 'refus (autre) : ' || SQLERRM);
END $$;

-- 2d : trop de mots (> 20) -> CHECK
DO $$
BEGIN
    INSERT INTO maitresse_liste (foyer_id, titre, mots) VALUES
        ('aaaaaaaa-0000-0000-0000-000000000000', 'Trop de mots',
         (SELECT array_agg('mot' || g) FROM generate_series(1, 21) g));
    PERFORM _rec('2d_trop_de_mots_refuse', false, 'accepte a tort');
EXCEPTION WHEN check_violation THEN
    PERFORM _rec('2d_trop_de_mots_refuse', true, 'refus attendu : ' || SQLERRM);
WHEN OTHERS THEN
    PERFORM _rec('2d_trop_de_mots_refuse', true, 'refus (autre) : ' || SQLERRM);
END $$;

-- 2e : plafond de 10 listes actives par foyer
DO $$
DECLARE i integer;
BEGIN
    -- On a deja 1 liste A active -> on en ajoute 9 (total 10).
    FOR i IN 1..9 LOOP
        INSERT INTO maitresse_liste (foyer_id, titre, mots, active)
        VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'Active ' || i,
                ARRAY['maison','toujours','jardin'], true);
    END LOOP;
    -- La 11e active doit echouer.
    BEGIN
        INSERT INTO maitresse_liste (foyer_id, titre, mots, active)
        VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'Active 11',
                ARRAY['maison','toujours','jardin'], true);
        PERFORM _rec('2e_plafond_actives', false, '11e active acceptee a tort');
    EXCEPTION WHEN OTHERS THEN
        PERFORM _rec('2e_plafond_actives', SQLERRM LIKE '%maitresse_trop_actives%', SQLERRM);
    END;
END $$;

-- ===========================================================================
-- TEST 3 : injection DETERMINISTE des erreurs
-- ===========================================================================
-- « Le chat est beau et il a un tambour. » niveau 2 -> 2 erreurs :
--   pos 3 : est -> et (et_est) ; pos 9 : tambour. -> tanbour. (m_mbp).
SELECT _rec('3a_injection_nb',
            (_maitresse_injecter('Le chat est beau et il a un tambour.', 2)->>'nb')::int = 2,
            'nb = ' || (_maitresse_injecter('Le chat est beau et il a un tambour.', 2)->>'nb'));

SELECT _rec('3b_injection_pos_et_type',
            (_maitresse_injecter('Le chat est beau et il a un tambour.', 2)#>>'{erreurs,0,position}') = '3'
        AND (_maitresse_injecter('Le chat est beau et il a un tambour.', 2)#>>'{erreurs,0,faute}') = 'et'
        AND (_maitresse_injecter('Le chat est beau et il a un tambour.', 2)#>>'{erreurs,0,type}') = 'et_est'
        AND (_maitresse_injecter('Le chat est beau et il a un tambour.', 2)#>>'{erreurs,1,position}') = '9'
        AND (_maitresse_injecter('Le chat est beau et il a un tambour.', 2)#>>'{erreurs,1,faute}') = 'tanbour.'
        AND (_maitresse_injecter('Le chat est beau et il a un tambour.', 2)#>>'{erreurs,1,type}') = 'm_mbp',
            'injection = ' || (_maitresse_injecter('Le chat est beau et il a un tambour.', 2)->>'erreurs'));

-- 3c : deterministe (deux appels identiques)
SELECT _rec('3c_deterministe',
            _maitresse_injecter('Le chat est beau et il a un tambour.', 3)
          = _maitresse_injecter('Le chat est beau et il a un tambour.', 3),
            'ok');

-- 3d : niveau 1 = 1 seule erreur
SELECT _rec('3d_niveau1_une_erreur',
            (_maitresse_injecter('Le chat est beau et il a un tambour.', 1)->>'nb')::int = 1,
            'nb N1 = ' || (_maitresse_injecter('Le chat est beau et il a un tambour.', 1)->>'nb'));

-- ===========================================================================
-- TEST 4 : coeur partage _verif_dictee_core
-- ===========================================================================
-- Une erreur a la position 3 ; l'enfant la trouve et corrige -> juste.
SELECT _rec('4a_core_juste',
            (_verif_dictee_core(2,
               '[{"position":3,"faute":"et","correction":"est","type":"et_est"}]'::jsonb,
               '[{"pos":3,"cor":"est"}]'::jsonb)->>'juste')::boolean,
            'resultat juste attendu');

-- Fausse alerte (position 1 touchee a tort) -> faux.
SELECT _rec('4b_core_fausse_alerte',
            (_verif_dictee_core(2,
               '[{"position":3,"faute":"et","correction":"est","type":"et_est"}]'::jsonb,
               '[{"pos":1}]'::jsonb)->>'juste')::boolean = false,
            'faux attendu (fausse alerte)');

-- ===========================================================================
-- TEST 5 : enregistrer_reponse op mmots (mot a apprendre)
-- ===========================================================================
-- Id de la liste B expose via un parametre de session (les \set psql ne sont pas
-- visibles dans un bloc plpgsql) pour le test d'isolation 5c.
SELECT set_config('kerskol.test_listeb', :'listeb', false);

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 5a : bon mot (index 1 = maison) -> correct
SELECT _rec('5a_mmots_correct',
    (enregistrer_reponse(
        p_id:=gen_random_uuid(), p_profil:=:'pA1', p_seance:=NULL,
        p_competence:='FR.MAITRESSE.MOTS',
        p_exercice:=md5('FR.MAITRESSE.MOTS:1:mots_maitresse')::uuid,
        p_niveau:=1, p_methode:='mots_maitresse', p_op:='mmots',
        p_a:=1, p_b:=0, p_reponse:=NULL, p_reste:=NULL, p_fields:=1,
        p_temps_ms:=3000, p_correction_lue:=false, p_rattrapage:=false,
        p_placement:=false, p_repondu_le:=now(),
        p_op2:=:'listea', p_reponse_texte:='maison')->>'correct')::boolean,
    'maison doit etre juste');

-- 5b : mauvais mot -> faux
SELECT _rec('5b_mmots_faux',
    (enregistrer_reponse(
        p_id:=gen_random_uuid(), p_profil:=:'pA1', p_seance:=NULL,
        p_competence:='FR.MAITRESSE.MOTS',
        p_exercice:=md5('FR.MAITRESSE.MOTS:1:mots_maitresse')::uuid,
        p_niveau:=1, p_methode:='mots_maitresse', p_op:='mmots',
        p_a:=1, p_b:=0, p_reponse:=NULL, p_reste:=NULL, p_fields:=1,
        p_temps_ms:=3000, p_correction_lue:=false, p_rattrapage:=false,
        p_placement:=false, p_repondu_le:=now(),
        p_op2:=:'listea', p_reponse_texte:='mezon')->>'correct')::boolean = false,
    'mezon doit etre faux');

-- 5c : liste d'un AUTRE foyer -> refus (isolation)
DO $$
BEGIN
    PERFORM enregistrer_reponse(
        p_id:=gen_random_uuid(), p_profil:='a0000001-0000-0000-0000-000000000000', p_seance:=NULL,
        p_competence:='FR.MAITRESSE.MOTS',
        p_exercice:=md5('FR.MAITRESSE.MOTS:1:mots_maitresse')::uuid,
        p_niveau:=1, p_methode:='mots_maitresse', p_op:='mmots',
        p_a:=1, p_b:=0, p_reponse:=NULL, p_reste:=NULL, p_fields:=1,
        p_temps_ms:=3000, p_correction_lue:=false, p_rattrapage:=false,
        p_placement:=false, p_repondu_le:=now(),
        p_op2:=current_setting('kerskol.test_listeb'), p_reponse_texte:='beaucoup');
    PERFORM _rec('5c_mmots_isolation', false, 'liste B acceptee a tort');
EXCEPTION WHEN OTHERS THEN
    -- Isolation OK : enonce_incoherent (DETAIL « mmots : liste absente ou inactive »).
    PERFORM _rec('5c_mmots_isolation', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

RESET ROLE;

-- ===========================================================================
-- TEST 6 : op mtrou (mot a trou du texte) — texte « Le chat est beau. »
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- token 2 = « chat »
SELECT _rec('6a_mtrou_correct',
    (enregistrer_reponse(
        p_id:=gen_random_uuid(), p_profil:=:'pA1', p_seance:=NULL,
        p_competence:='FR.MAITRESSE.DICTEE',
        p_exercice:=md5('FR.MAITRESSE.DICTEE:1:dictee_maitresse')::uuid,
        p_niveau:=1, p_methode:='dictee_maitresse', p_op:='mtrou',
        p_a:=2, p_b:=0, p_reponse:=NULL, p_reste:=NULL, p_fields:=1,
        p_temps_ms:=3000, p_correction_lue:=false, p_rattrapage:=false,
        p_placement:=false, p_repondu_le:=now(),
        p_op2:=:'listea', p_reponse_texte:='chat')->>'correct')::boolean,
    'chat (token 2) doit etre juste');

SELECT _rec('6b_mtrou_faux',
    (enregistrer_reponse(
        p_id:=gen_random_uuid(), p_profil:=:'pA1', p_seance:=NULL,
        p_competence:='FR.MAITRESSE.DICTEE',
        p_exercice:=md5('FR.MAITRESSE.DICTEE:1:dictee_maitresse')::uuid,
        p_niveau:=1, p_methode:='dictee_maitresse', p_op:='mtrou',
        p_a:=2, p_b:=0, p_reponse:=NULL, p_reste:=NULL, p_fields:=1,
        p_temps_ms:=3000, p_correction_lue:=false, p_rattrapage:=false,
        p_placement:=false, p_repondu_le:=now(),
        p_op2:=:'listea', p_reponse_texte:='chien')->>'correct')::boolean = false,
    'chien doit etre faux');

-- ===========================================================================
-- TEST 7 : op mdictee (dictee detective sur le texte) — N1, erreur pos 3
-- ===========================================================================
SELECT _rec('7a_mdictee_juste',
    (enregistrer_reponse(
        p_id:=gen_random_uuid(), p_profil:=:'pA1', p_seance:=NULL,
        p_competence:='FR.MAITRESSE.DICTEE',
        p_exercice:=md5('FR.MAITRESSE.DICTEE:1:dictee_maitresse')::uuid,
        p_niveau:=1, p_methode:='dictee_maitresse', p_op:='mdictee',
        p_a:=NULL, p_b:=0, p_reponse:=NULL, p_reste:=NULL, p_fields:=1,
        p_temps_ms:=3000, p_correction_lue:=false, p_rattrapage:=false,
        p_placement:=false, p_repondu_le:=now(),
        p_op2:=:'listea', p_dictee:='[{"pos":3}]'::jsonb)->>'correct')::boolean,
    'touche la position 3 (N1) -> juste');

SELECT _rec('7b_mdictee_fausse_alerte',
    (enregistrer_reponse(
        p_id:=gen_random_uuid(), p_profil:=:'pA1', p_seance:=NULL,
        p_competence:='FR.MAITRESSE.DICTEE',
        p_exercice:=md5('FR.MAITRESSE.DICTEE:1:dictee_maitresse')::uuid,
        p_niveau:=1, p_methode:='dictee_maitresse', p_op:='mdictee',
        p_a:=NULL, p_b:=0, p_reponse:=NULL, p_reste:=NULL, p_fields:=1,
        p_temps_ms:=3000, p_correction_lue:=false, p_rattrapage:=false,
        p_placement:=false, p_repondu_le:=now(),
        p_op2:=:'listea', p_dictee:='[{"pos":1}]'::jsonb)->>'correct')::boolean = false,
    'touche la position 1 (juste) -> fausse alerte -> faux');

RESET ROLE;

-- ===========================================================================
-- TEST 8 : garde-fou « au moins une sous-matiere » EXCLUT mots-maitresse
-- ===========================================================================
DO $$
BEGIN
    UPDATE profils
       SET matieres_actives = ARRAY['FR'], domaines_actifs = ARRAY['mots-maitresse']
     WHERE id = 'a0000001-0000-0000-0000-000000000000';
    PERFORM _rec('8_guard_exclut_maitresse', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('8_guard_exclut_maitresse', SQLERRM LIKE '%aucune_sous_matiere_active%', SQLERRM);
END $$;

-- ===========================================================================
-- TEST 9 : regler_matieres RE-AJOUTE toujours mots-maitresse
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT regler_matieres('a0000001-0000-0000-0000-000000000000',
                       ARRAY['FR','MA'], ARRAY['grammaire']);
RESET ROLE;

SELECT _rec('9_regler_force_maitresse',
            (SELECT 'mots-maitresse' = ANY (domaines_actifs) FROM profils
              WHERE id = 'a0000001-0000-0000-0000-000000000000'),
            'domaines = ' || (SELECT array_to_string(domaines_actifs, ',') FROM profils
                               WHERE id = 'a0000001-0000-0000-0000-000000000000'));

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
