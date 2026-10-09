-- grammaire_test.sql
-- Grammaire francaise (migration 0041). Transaction ROLLBACK : aucune donnee de
-- test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre :
--   * la table de reference public.grammaire_item contient EXACTEMENT les memes
--     items que le front (55 lignes ; couverture 5 competences x 4 niveaux ;
--     spot check) : TEST CROISE avec le golden vitest
--     (frontend/.../francais/grammaire.test.ts) ;
--   * verif_grammaire : bonne reponse acceptee, mauvaise refusee, accents
--     EXIGES, tolerance casse/espaces, normalisation qcm vs clic, item absent ;
--   * enregistrer_reponse(op='gram') : verdict serveur, competence interdite,
--     item inexistant, niveau incoherent, autre foyer refuse ;
--   * garde-fou (>= 1 sous-matiere jouable) : grammaire est un domaine valide ;
--     un reglage qui ne laisse rien a jouer est refuse.

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 55 items, couverture complete + spot check (front==SQL)
-- ===========================================================================
DO $$
DECLARE
    r record;
    got text;
    n   integer;
BEGIN
    SELECT count(*) INTO n FROM public.grammaire_item;
    IF n <> 162 THEN
        RAISE EXCEPTION 'grammaire_item : 162 items attendus, obtenu %', n;
    END IF;

    -- Couverture : chaque competence a au moins un item a chaque niveau 1..4.
    FOR r IN SELECT c AS competence, nv AS niveau
               FROM unnest(ARRAY['FR.GRAM.NATURE','FR.GRAM.SUJET_VERBE',
                    'FR.GRAM.TYPES_PHRASES','FR.GRAM.PONCTUATION',
                    'FR.GRAM.GROUPE_NOMINAL','FR.GRAM.COMPLEMENTS','FR.GRAM.HOMOPHONES',
                    'FR.GRAM.CLASSES','FR.GRAM.PHRASE']) AS c,
                    generate_series(1,4) AS nv
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.grammaire_item
                        WHERE competence = r.competence AND niveau = r.niveau) THEN
            RAISE EXCEPTION 'grammaire_item : aucun item pour % N%', r.competence, r.niveau;
        END IF;
    END LOOP;

    -- Spot check (miroir exact du front).
    FOR r IN SELECT * FROM (VALUES
        ('nature-n2-verbe','FR.GRAM.NATURE',2,'clic','chante'),
        ('nature-n3-nom','FR.GRAM.NATURE',3,'clic','télévision'),
        ('sv-n1-sujet','FR.GRAM.SUJET_VERBE',1,'qcm','La fille'),
        ('types-n3-interro','FR.GRAM.TYPES_PHRASES',3,'qcm','Interrogative'),
        ('types-n2-negative','FR.GRAM.TYPES_PHRASES',2,'qcm','Elle dit non, c''est une phrase négative'),
        ('ponct-n1-interro','FR.GRAM.PONCTUATION',1,'qcm','?'),
        ('ponct-n3-majuscule','FR.GRAM.PONCTUATION',3,'clic','paris'),
        ('gn-n1-pluriel','FR.GRAM.GROUPE_NOMINAL',1,'qcm','Au pluriel'),
        ('gn-n4-nom','FR.GRAM.GROUPE_NOMINAL',4,'texte','histoire'),
        ('comp-n1-cod','FR.GRAM.COMPLEMENTS',1,'qcm','la voiture'),
        ('comp-n2-cod','FR.GRAM.COMPLEMENTS',2,'clic','bateau'),
        ('comp-n3-coi','FR.GRAM.COMPLEMENTS',3,'qcm','un complément d''objet indirect'),
        ('comp-n4-cc','FR.GRAM.COMPLEMENTS',4,'texte','ciel'),
        ('homo-n1-on','FR.GRAM.HOMOPHONES',1,'qcm','On'),
        ('homo-n2-se','FR.GRAM.HOMOPHONES',2,'qcm','se'),
        ('homo-n3-ces','FR.GRAM.HOMOPHONES',3,'qcm','ces'),
        ('homo-n4-sest','FR.GRAM.HOMOPHONES',4,'qcm','s''est'),
        ('cls-n1-adverbe','FR.GRAM.CLASSES',1,'qcm','vite'),
        ('cls-n2-conj','FR.GRAM.CLASSES',2,'clic','mais'),
        ('cls-n3-pronom','FR.GRAM.CLASSES',3,'qcm','un pronom'),
        ('cls-n4-conj','FR.GRAM.CLASSES',4,'texte','donc'),
        ('phr-n1-3','FR.GRAM.PHRASE',1,'qcm','complexe'),
        ('phr-n2-1','FR.GRAM.PHRASE',2,'clic','boit'),
        ('phr-n3-3','FR.GRAM.PHRASE',3,'qcm','trois'),
        ('phr-n4-2','FR.GRAM.PHRASE',4,'texte','dort')
    ) AS t(cle, competence, niveau, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.grammaire_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'grammaire_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table grammaire_item (55 + couverture + spot) : OK';
END $$;

-- ===========================================================================
-- 2. verif_grammaire : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    -- Bonnes reponses.
    IF NOT public.verif_grammaire('nature-n2-verbe','chante')      THEN RAISE EXCEPTION 'juste refuse : chante'; END IF;
    IF NOT public.verif_grammaire('types-n3-interro','Interrogative') THEN RAISE EXCEPTION 'juste refuse : Interrogative'; END IF;
    -- Tolerance casse / espaces (clic : « Le » = « le »).
    IF NOT public.verif_grammaire('nature-n2-determinant','  Le ') THEN RAISE EXCEPTION 'tolerance casse/espaces KO'; END IF;
    -- QCM : la casse ne compte pas (normaliser_lettres).
    IF NOT public.verif_grammaire('types-n3-interro','interrogative') THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    -- Accents EXIGES.
    IF public.verif_grammaire('nature-n3-nom','television')        THEN RAISE EXCEPTION 'accent non exige : television'; END IF;
    IF NOT public.verif_grammaire('nature-n3-nom','télévision')    THEN RAISE EXCEPTION 'juste refuse : télévision'; END IF;
    -- Mauvaise reponse.
    IF public.verif_grammaire('nature-n2-verbe','fille')           THEN RAISE EXCEPTION 'mauvaise reponse acceptee'; END IF;
    IF public.verif_grammaire('ponct-n1-interro','.')              THEN RAISE EXCEPTION 'mauvais signe accepte'; END IF;
    -- Item absent.
    IF public.verif_grammaire('cle-bidon','chat')                  THEN RAISE EXCEPTION 'item absent accepte'; END IF;
    RAISE NOTICE 'verif_grammaire : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='gram') : verdict + coherence + RLS
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'ga@example.test', now()),
    (:'uB', 'gb@example.test', now());
INSERT INTO foyers (id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000'),
    ('bbbbbbbb-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000', :'uA'),
    ('bbbbbbbb-0000-0000-0000-000000000000', :'uB');
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'EnfantA', 'CE2'),
    ('b0000001-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000', 'EnfantB', 'CE2');

\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 3a. Bonne reponse ACCEPTEE (clic « chante », FR.GRAM.NATURE N2).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.GRAM.NATURE', NULL, 2, 'grammaire',
        'gram', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'nature-n2-verbe', NULL, 'seance', 'chante', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'gram « chante » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE (clic « fille »).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.GRAM.NATURE', NULL, 2, 'grammaire',
        'gram', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'nature-n2-verbe', NULL, 'seance', 'fille', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'gram « fille » devrait etre faux : %', v;
    END IF;
END $$;

-- 3c. Competence interdite (op='gram' sur une competence de maths) REJETEE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.NUM.LIRE_ECRIRE', NULL, 2, 'grammaire',
        'gram', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'nature-n2-verbe', NULL, 'seance', 'chante', NULL);
    RAISE EXCEPTION 'competence interdite aurait du etre rejetee';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3d. Item inexistant REJETE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.GRAM.NATURE', NULL, 2, 'grammaire',
        'gram', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'cle-bidon', NULL, 'seance', 'chante', NULL);
    RAISE EXCEPTION 'item inexistant aurait du etre rejete';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3e. Niveau incoherent avec l'item REJETE (item N2 envoye en N3).
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.GRAM.NATURE', NULL, 3, 'grammaire',
        'gram', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'nature-n2-verbe', NULL, 'seance', 'chante', NULL);
    RAISE EXCEPTION 'niveau incoherent aurait du etre rejete';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3f. Acces a un profil d'un AUTRE foyer REFUSE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.GRAM.NATURE', NULL, 2, 'grammaire',
        'gram', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'nature-n2-verbe', NULL, 'seance', 'chante', NULL);
    RAISE EXCEPTION 'acces a un autre foyer aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%acces_refuse%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu acces_refuse) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

-- ===========================================================================
-- 4. Garde-fou >= 1 sous-matiere jouable (via regler_matieres / trigger 0039)
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 4a. grammaire est un domaine VALIDE : FR + grammaire seul -> accepte.
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000001-0000-0000-0000-000000000000'::uuid,
        ARRAY['FR']::text[], ARRAY['grammaire']::text[]);
    IF NOT EXISTS (SELECT 1 FROM public.profils
                    WHERE id = 'a0000001-0000-0000-0000-000000000000'
                      AND 'grammaire' = ANY (domaines_actifs)) THEN
        RAISE EXCEPTION 'grammaire aurait du etre active';
    END IF;
    RAISE NOTICE 'regler_matieres FR+grammaire : OK';
END $$;

-- 4b. FR eteint mais seul le domaine grammaire actif -> AUCUNE sous-matiere
--     jouable -> refuse.
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000001-0000-0000-0000-000000000000'::uuid,
        ARRAY['MA']::text[], ARRAY['grammaire']::text[]);
    RAISE EXCEPTION 'un reglage sans sous-matiere jouable aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%aucune_sous_matiere%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu aucune_sous_matiere_active) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

ROLLBACK;
