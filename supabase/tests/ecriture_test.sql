-- ecriture_test.sql
-- Copier et écrire (migration 0063). Transaction ROLLBACK : aucune donnée de
-- test ne subsiste. Exécution : deploy/test-db.sh.
--
-- Couvre :
--   * public.ecriture_item : 24 items, couverture 2 compétences x 4 niveaux,
--     spot check (TEST CROISÉ avec le golden vitest ecriture.test.ts) ;
--   * verif_ecriture : copie (casse/accents/point EXIGES, espaces normalisés),
--     ordre, qcm, transform, et check-list « libre » (majuscule, point, N mots,
--     verbe, mots-clés), item absent ;
--   * enregistrer_reponse(op='ecr') : verdict serveur, compétence interdite,
--     item inexistant, niveau incohérent, autre foyer refusé ; la phrase LIBRE
--     est enregistrée dans ecriture_production (relecture parent), pas la copie ;
--   * garde-fou (>= 1 sous-matière jouable) : ecriture est un domaine valide ;
--   * la migration a bien ajouté le domaine `ecriture` à tous les profils.

BEGIN;

-- ===========================================================================
-- 1. Table de référence : 24 items, couverture + spot check (front==SQL)
-- ===========================================================================
DO $$
DECLARE r record; got text; n integer;
BEGIN
    SELECT count(*) INTO n FROM public.ecriture_item;
    IF n <> 32 THEN RAISE EXCEPTION 'ecriture_item : 32 items attendus, obtenu %', n; END IF;

    FOR r IN SELECT c AS competence, nv AS niveau
               FROM unnest(ARRAY['FR.ECR.COPIE','FR.ECR.GUIDEE','FR.ECR.COPIE_CM1','FR.ECR.GUIDEE_CM1']) AS c, generate_series(1,4) AS nv
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.ecriture_item
                        WHERE competence = r.competence AND niveau = r.niveau) THEN
            RAISE EXCEPTION 'ecriture_item : aucun item pour % N%', r.competence, r.niveau;
        END IF;
    END LOOP;

    FOR r IN SELECT * FROM (VALUES
        ('ecr-copie-n1-c','FR.ECR.COPIE',1,'copie','école'),
        ('ecr-copie-n4-a','FR.ECR.COPIE',4,'copie','Le petit chat joue. Il court dans le jardin. Puis il dort au soleil.'),
        ('ecr-guide-n1-a','FR.ECR.GUIDEE',1,'ordre','Le chat dort.'),
        ('ecr-guide-n2-a','FR.ECR.GUIDEE',2,'qcm','lait'),
        ('ecr-guide-n3-c','FR.ECR.GUIDEE',3,'transform','J''ai mangé une pomme.'),
        ('ecr-guide-n4-a','FR.ECR.GUIDEE',4,'libre',''),
        ('ecr-copiecm1-n1','FR.ECR.COPIE_CM1',1,'copie','Le matin, je me lève, puis je déjeune.'),
        ('ecr-guidecm1-n1','FR.ECR.GUIDEE_CM1',1,'transform','Il mangea une pomme.'),
        ('ecr-guidecm1-n3','FR.ECR.GUIDEE_CM1',3,'transform','Les enfants chantèrent une chanson.'),
        ('ecr-guidecm1-n4','FR.ECR.GUIDEE_CM1',4,'libre','')
    ) AS t(cle, competence, niveau, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.ecriture_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'ecriture_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table ecriture_item (24 + couverture + spot) : OK';
END $$;

-- ===========================================================================
-- 2. verif_ecriture : miroir de comparerEcriture / verifieCheck
-- ===========================================================================
DO $$
BEGIN
    -- COPIE : casse, accents, point EXIGES ; espaces normalisés.
    IF NOT public.verif_ecriture('ecr-copie-n1-a','chat')          THEN RAISE EXCEPTION 'copie juste refusée (chat)'; END IF;
    IF public.verif_ecriture('ecr-copie-n1-a','Chat')              THEN RAISE EXCEPTION 'copie majuscule non exigée'; END IF;
    IF public.verif_ecriture('ecr-copie-n1-c','ecole')             THEN RAISE EXCEPTION 'copie accent non exigé (ecole)'; END IF;
    IF NOT public.verif_ecriture('ecr-copie-n1-c','école')         THEN RAISE EXCEPTION 'copie accent juste refusée'; END IF;
    IF NOT public.verif_ecriture('ecr-copie-n2-a','le  petit   chat') THEN RAISE EXCEPTION 'copie espaces non normalisés'; END IF;
    IF NOT public.verif_ecriture('ecr-copie-n3-a','Le chat dort dans le jardin.') THEN RAISE EXCEPTION 'copie phrase juste refusée'; END IF;
    IF public.verif_ecriture('ecr-copie-n3-a','Le chat dort dans le jardin')       THEN RAISE EXCEPTION 'copie point non exigé'; END IF;
    -- ORDRE : espaces retirés, casse/point gardés.
    IF NOT public.verif_ecriture('ecr-guide-n1-a','Le chat dort .') THEN RAISE EXCEPTION 'ordre juste refusé (espaces)'; END IF;
    IF public.verif_ecriture('ecr-guide-n1-a','le chat dort.')      THEN RAISE EXCEPTION 'ordre majuscule non exigée'; END IF;
    -- QCM : casse ignorée.
    IF NOT public.verif_ecriture('ecr-guide-n2-a','Lait')          THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    IF public.verif_ecriture('ecr-guide-n2-a','vélo')             THEN RAISE EXCEPTION 'qcm mauvaise réponse acceptée'; END IF;
    -- TRANSFORM : cible exacte.
    IF NOT public.verif_ecriture('ecr-guide-n3-c','J''ai mangé une pomme.') THEN RAISE EXCEPTION 'transform juste refusé'; END IF;
    IF public.verif_ecriture('ecr-guide-n3-c','je mange une pomme.')        THEN RAISE EXCEPTION 'transform faux accepté'; END IF;
    -- LIBRE : check-list (majuscule, point, >= N mots, verbe, mots-clés).
    IF NOT public.verif_ecriture('ecr-guide-n4-a','Le chat joue dans le jardin.') THEN RAISE EXCEPTION 'libre bonne phrase refusée'; END IF;
    IF public.verif_ecriture('ecr-guide-n4-a','le chat joue dans le jardin.')     THEN RAISE EXCEPTION 'libre majuscule non exigée'; END IF;
    IF public.verif_ecriture('ecr-guide-n4-a','Le chat joue dans le jardin')      THEN RAISE EXCEPTION 'libre point non exigé'; END IF;
    IF public.verif_ecriture('ecr-guide-n4-a','Le chat joue beaucoup ici.')       THEN RAISE EXCEPTION 'libre mot-clé jardin non exigé'; END IF;
    IF public.verif_ecriture('ecr-guide-n4-c','Le grand chat noir.')              THEN RAISE EXCEPTION 'libre verbe non exigé'; END IF;
    IF NOT public.verif_ecriture('ecr-guide-n4-c','La fleur aime le soleil.')     THEN RAISE EXCEPTION 'libre bonne phrase (fleur/soleil) refusée'; END IF;
    IF public.verif_ecriture('ecr-guide-n4-b','Il court.')                        THEN RAISE EXCEPTION 'libre minMots (5) non exigé'; END IF;
    IF NOT public.verif_ecriture('ecr-guide-n4-b','Ce matin le petit chien court.') THEN RAISE EXCEPTION 'libre b bonne phrase refusée'; END IF;
    -- Item absent.
    IF public.verif_ecriture('cle-bidon','x')                     THEN RAISE EXCEPTION 'item absent accepté'; END IF;
    RAISE NOTICE 'verif_ecriture : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='ecr') : verdict + cohérence + RLS + production
-- ===========================================================================
\set uA '11111111-eeee-0000-0000-000000000000'
\set uB '22222222-ffff-0000-0000-000000000000'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'ecra@example.test', now()),
    (:'uB', 'ecrb@example.test', now());
INSERT INTO foyers (id) VALUES
    ('aaaaaaaa-3333-0000-0000-000000000000'),
    ('bbbbbbbb-3333-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('aaaaaaaa-3333-0000-0000-000000000000', :'uA'),
    ('bbbbbbbb-3333-0000-0000-000000000000', :'uB');
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000003-0000-0000-0000-000000000000', 'aaaaaaaa-3333-0000-0000-000000000000', 'EnfantA', 'CE2'),
    ('b0000003-0000-0000-0000-000000000000', 'bbbbbbbb-3333-0000-0000-000000000000', 'EnfantB', 'CE2');

\set claimsA '{"sub":"11111111-eeee-0000-0000-000000000000","role":"authenticated"}'

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 3a. Copie correcte ACCEPTÉE (FR.ECR.COPIE N1, 'chat').
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000003-0000-0000-0000-000000000000'::uuid, NULL, 'FR.ECR.COPIE', NULL, 1, 'ecriture',
        'ecr', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ecr-copie-n1-a', NULL, 'seance', 'chat', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'copie « chat » devrait être juste : %', v; END IF;
END $$;

-- 3b. Copie fausse REFUSÉE, et AUCUNE production (ce n'est pas une phrase libre).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000003-0000-0000-0000-000000000000'::uuid, NULL, 'FR.ECR.COPIE', NULL, 1, 'ecriture',
        'ecr', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ecr-copie-n1-a', NULL, 'seance', 'Chat', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN RAISE EXCEPTION 'copie « Chat » devrait être fausse : %', v; END IF;
END $$;

-- 3c. Phrase LIBRE correcte ACCEPTÉE (FR.ECR.GUIDEE N4) + production enregistrée.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000003-0000-0000-0000-000000000000'::uuid, NULL, 'FR.ECR.GUIDEE', NULL, 4, 'ecriture',
        'ecr', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ecr-guide-n4-a', NULL, 'seance', 'Le chat joue dans le jardin.', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'phrase libre devrait être juste : %', v; END IF;
END $$;

-- 3d. La phrase libre est bien enregistrée (relecture parent) ; la copie non.
DO $$
DECLARE n_libre integer; n_copie integer;
BEGIN
    SELECT count(*) INTO n_libre FROM public.ecriture_production
     WHERE profil_id = 'a0000003-0000-0000-0000-000000000000' AND cle = 'ecr-guide-n4-a'
       AND texte = 'Le chat joue dans le jardin.';
    IF n_libre <> 1 THEN RAISE EXCEPTION 'production libre attendue (1), obtenu %', n_libre; END IF;
    SELECT count(*) INTO n_copie FROM public.ecriture_production
     WHERE profil_id = 'a0000003-0000-0000-0000-000000000000' AND cle = 'ecr-copie-n1-a';
    IF n_copie <> 0 THEN RAISE EXCEPTION 'la copie ne doit pas créer de production, obtenu %', n_copie; END IF;
    RAISE NOTICE 'ecriture_production (libre seulement) : OK';
END $$;

-- 3e. Compétence interdite (op='ecr' sur une compétence de maths) REJETÉE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000003-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.TABLEAU', NULL, 1, 'ecriture',
        'ecr', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ecr-copie-n1-a', NULL, 'seance', 'chat', NULL);
    RAISE EXCEPTION 'compétence interdite aurait dû être rejetée';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE EXCEPTION 'erreur inattendue : %', SQLERRM; END IF;
END $$;

-- 3f. Item inexistant REJETÉ.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000003-0000-0000-0000-000000000000'::uuid, NULL, 'FR.ECR.COPIE', NULL, 1, 'ecriture',
        'ecr', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'cle-bidon', NULL, 'seance', 'chat', NULL);
    RAISE EXCEPTION 'item inexistant aurait dû être rejeté';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE EXCEPTION 'erreur inattendue : %', SQLERRM; END IF;
END $$;

-- 3g. Niveau incohérent avec l'item REJETÉ (item N1 envoyé en N2).
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000003-0000-0000-0000-000000000000'::uuid, NULL, 'FR.ECR.COPIE', NULL, 2, 'ecriture',
        'ecr', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ecr-copie-n1-a', NULL, 'seance', 'chat', NULL);
    RAISE EXCEPTION 'niveau incohérent aurait dû être rejeté';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE EXCEPTION 'erreur inattendue : %', SQLERRM; END IF;
END $$;

-- 3h. Accès à un profil d'un AUTRE foyer REFUSÉ.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'b0000003-0000-0000-0000-000000000000'::uuid, NULL, 'FR.ECR.COPIE', NULL, 1, 'ecriture',
        'ecr', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ecr-copie-n1-a', NULL, 'seance', 'chat', NULL);
    RAISE EXCEPTION 'accès à un autre foyer aurait dû être refusé';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%acces_refuse%' THEN RAISE EXCEPTION 'erreur inattendue : %', SQLERRM; END IF;
END $$;

-- 3i. Le parent (même foyer) peut RELIRE la phrase (RLS select).
DO $$
DECLARE n integer;
BEGIN
    SELECT count(*) INTO n FROM public.ecriture_production
     WHERE profil_id = 'a0000003-0000-0000-0000-000000000000';
    IF n < 1 THEN RAISE EXCEPTION 'le foyer devrait relire au moins une phrase, obtenu %', n; END IF;
END $$;

RESET ROLE;

-- 3j. Un AUTRE foyer ne voit PAS les phrases (RLS).
SET ROLE authenticated;
\set claimsB '{"sub":"22222222-ffff-0000-0000-000000000000","role":"authenticated"}'
SET request.jwt.claims = :'claimsB';
DO $$
DECLARE n integer;
BEGIN
    SELECT count(*) INTO n FROM public.ecriture_production
     WHERE profil_id = 'a0000003-0000-0000-0000-000000000000';
    IF n <> 0 THEN RAISE EXCEPTION 'un autre foyer ne doit rien voir, obtenu %', n; END IF;
    RAISE NOTICE 'RLS ecriture_production : OK';
END $$;
RESET ROLE;

-- ===========================================================================
-- 4. Garde-fou >= 1 sous-matière jouable : ecriture est un domaine VALIDE.
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000003-0000-0000-0000-000000000000'::uuid,
        ARRAY['FR']::text[], ARRAY['ecriture']::text[]);
    IF NOT EXISTS (SELECT 1 FROM public.profils
                    WHERE id = 'a0000003-0000-0000-0000-000000000000' AND 'ecriture' = ANY (domaines_actifs)) THEN
        RAISE EXCEPTION 'ecriture aurait dû être active';
    END IF;
    RAISE NOTICE 'regler_matieres FR+ecriture : OK';
END $$;
RESET ROLE;

-- ===========================================================================
-- 5. La migration a bien ajouté le domaine `ecriture` à TOUS les profils.
-- ===========================================================================
DO $$
DECLARE n integer;
BEGIN
    SELECT count(*) INTO n FROM public.profils WHERE NOT ('ecriture' = ANY (domaines_actifs));
    IF n <> 0 THEN RAISE EXCEPTION 'ecriture devrait être actif pour TOUS les profils, manque dans %', n; END IF;
    RAISE NOTICE 'domaine ecriture actif pour tous les profils : OK';
END $$;

ROLLBACK;
