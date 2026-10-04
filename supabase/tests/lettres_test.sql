-- lettres_test.sql
-- Ecriture libre d'un nombre en toutes lettres (migration 0030).
-- Transaction ROLLBACK : aucune donnee de test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre :
--   * nombre_en_lettres produit EXACTEMENT les memes chaines que le generateur
--     front (golden partage avec diagnostic.test.ts : TEST CROISE) ;
--   * invariant pleine plage 0..10000 : la forme traditionnelle ET la forme
--     rectifiee 1990 (espaces -> traits d'union) sont acceptees par verif_lettres ;
--   * les fautes (accord vingt/cent/mille, trait d'union, orthographe) sont refusees ;
--   * enregistrer_reponse(op='lettres') : bonne reponse acceptee, mauvaise
--     refusee, type_faute enregistre, acces a un profil d'un autre foyer refuse.

BEGIN;

-- ===========================================================================
-- 1. GOLDEN : nombre_en_lettres == chaines attendues (identiques au front)
-- ===========================================================================
DO $$
DECLARE
    r record;
    got text;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        (0,'zéro'),(1,'un'),(5,'cinq'),(10,'dix'),(11,'onze'),(16,'seize'),
        (17,'dix-sept'),(19,'dix-neuf'),(20,'vingt'),(21,'vingt et un'),
        (22,'vingt-deux'),(30,'trente'),(31,'trente et un'),(40,'quarante'),
        (41,'quarante et un'),(50,'cinquante'),(51,'cinquante et un'),
        (60,'soixante'),(61,'soixante et un'),(69,'soixante-neuf'),
        (70,'soixante-dix'),(71,'soixante et onze'),(72,'soixante-douze'),
        (76,'soixante-seize'),(77,'soixante-dix-sept'),(79,'soixante-dix-neuf'),
        (80,'quatre-vingts'),(81,'quatre-vingt-un'),(82,'quatre-vingt-deux'),
        (90,'quatre-vingt-dix'),(91,'quatre-vingt-onze'),(99,'quatre-vingt-dix-neuf'),
        (100,'cent'),(101,'cent un'),(120,'cent vingt'),(123,'cent vingt-trois'),
        (171,'cent soixante et onze'),(180,'cent quatre-vingts'),(199,'cent quatre-vingt-dix-neuf'),
        (200,'deux cents'),(201,'deux cent un'),(280,'deux cent quatre-vingts'),
        (300,'trois cents'),(301,'trois cent un'),(999,'neuf cent quatre-vingt-dix-neuf'),
        (1000,'mille'),(1001,'mille un'),(1100,'mille cent'),(1180,'mille cent quatre-vingts'),
        (1200,'mille deux cents'),(1221,'mille deux cent vingt et un'),
        (1980,'mille neuf cent quatre-vingts'),(2000,'deux mille'),(2001,'deux mille un'),
        (2080,'deux mille quatre-vingts'),(2200,'deux mille deux cents'),
        (2300,'deux mille trois cents'),(2321,'deux mille trois cent vingt et un'),
        (3000,'trois mille'),(5555,'cinq mille cinq cent cinquante-cinq'),
        (8888,'huit mille huit cent quatre-vingt-huit'),(9999,'neuf mille neuf cent quatre-vingt-dix-neuf'),
        (10000,'dix mille'),
        (37,'trente-sept'),(148,'cent quarante-huit'),(256,'deux cent cinquante-six'),
        (512,'cinq cent douze'),(742,'sept cent quarante-deux'),(1024,'mille vingt-quatre'),
        (1515,'mille cinq cent quinze'),(2718,'deux mille sept cent dix-huit'),
        (3141,'trois mille cent quarante et un'),(4096,'quatre mille quatre-vingt-seize'),
        (6400,'six mille quatre cents'),(7000,'sept mille'),(7071,'sept mille soixante et onze'),
        (8191,'huit mille cent quatre-vingt-onze'),(9090,'neuf mille quatre-vingt-dix')
    ) AS t(n, mot)
    LOOP
        got := public.nombre_en_lettres(r.n);
        IF got <> r.mot THEN
            RAISE EXCEPTION 'golden KO : % attendu « % », obtenu « % »', r.n, r.mot, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'golden nombre_en_lettres : OK';
END $$;

-- ===========================================================================
-- 2. INVARIANT PLEINE PLAGE 0..10000 : trad ET 1990 acceptees par verif_lettres
-- ===========================================================================
DO $$
DECLARE
    i integer;
    trad text;
BEGIN
    FOR i IN 0..10000 LOOP
        trad := public.nombre_en_lettres(i);
        IF NOT public.verif_lettres(i, trad) THEN
            RAISE EXCEPTION 'verif_lettres refuse la forme traditionnelle de %', i;
        END IF;
        IF NOT public.verif_lettres(i, replace(trad, ' ', '-')) THEN
            RAISE EXCEPTION 'verif_lettres refuse la forme 1990 de %', i;
        END IF;
    END LOOP;
    -- Tolerances de saisie.
    IF NOT public.verif_lettres(2321, '  Deux mille  trois cent VINGT et un ') THEN
        RAISE EXCEPTION 'verif_lettres : tolerance casse/espaces KO';
    END IF;
    RAISE NOTICE 'invariant 0..10000 : OK';
END $$;

-- ===========================================================================
-- 3. FAUTES refusees (accord, trait d'union, orthographe)
-- ===========================================================================
DO $$
BEGIN
    IF public.verif_lettres(200, 'deux cent')     THEN RAISE EXCEPTION 'faux accepte : 200 sans s'; END IF;
    IF public.verif_lettres(23,  'vingt trois')   THEN RAISE EXCEPTION 'faux accepte : 23 sans trait'; END IF;
    IF public.verif_lettres(21,  'vingt-un')      THEN RAISE EXCEPTION 'faux accepte : 21 sans et'; END IF;
    IF public.verif_lettres(3000,'trois milles')  THEN RAISE EXCEPTION 'faux accepte : mille avec s'; END IF;
    IF public.verif_lettres(60,  'soixant')       THEN RAISE EXCEPTION 'faux accepte : mot mal ecrit'; END IF;
    IF public.verif_lettres(80,  'quatre-vingt')  THEN RAISE EXCEPTION 'faux accepte : 80 sans s'; END IF;
    RAISE NOTICE 'fautes refusees : OK';
END $$;

-- ===========================================================================
-- 4. enregistrer_reponse(op='lettres') : verdict serveur + type_faute + RLS foyer
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'la@example.test', now()),
    (:'uB', 'lb@example.test', now());
INSERT INTO foyers (id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000'),
    ('bbbbbbbb-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000', :'uA'),
    ('bbbbbbbb-0000-0000-0000-000000000000', :'uB');
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'EnfantA', 'CE2'),
    ('b0000001-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000', 'EnfantB', 'CE2');

\set pA 'a0000001-0000-0000-0000-000000000000'
\set pB 'b0000001-0000-0000-0000-000000000000'
\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 4a. Bonne ecriture (orthographe 1990) ACCEPTEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.NUM.LIRE_ECRIRE', NULL, 4, NULL,
        'lettres', 203, 0, 203, NULL, 1, 3000, false, false, false, now(),
        NULL, NULL, 'seance', 'deux-cent-trois', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'lettres 203 « deux-cent-trois » devrait etre juste : %', v;
    END IF;
END $$;

-- 4b. Bonne ecriture (traditionnelle) ACCEPTEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.NUM.LIRE_ECRIRE', NULL, 4, NULL,
        'lettres', 80, 0, 80, NULL, 1, 3000, false, false, false, now(),
        NULL, NULL, 'seance', 'quatre-vingts', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'lettres 80 « quatre-vingts » devrait etre juste : %', v;
    END IF;
END $$;

-- 4c. Faute d'accord REFUSEE + type_faute enregistre.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid(); v_tf text;
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.NUM.LIRE_ECRIRE', NULL, 4, NULL,
        'lettres', 200, 0, 200, NULL, 1, 3000, false, false, false, now(),
        NULL, NULL, 'seance', 'deux cent', 'S_VINGT_CENT');
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'lettres 200 « deux cent » devrait etre faux : %', v;
    END IF;
    SELECT type_faute INTO v_tf FROM public.reponses WHERE id = v_id;
    IF v_tf <> 'S_VINGT_CENT' THEN
        RAISE EXCEPTION 'type_faute non enregistre (obtenu %)', v_tf;
    END IF;
END $$;

-- 4d. Acces a un profil d'un AUTRE foyer REFUSE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.NUM.LIRE_ECRIRE', NULL, 4, NULL,
        'lettres', 203, 0, 203, NULL, 1, 3000, false, false, false, now(),
        NULL, NULL, 'seance', 'deux-cent-trois', NULL);
    RAISE EXCEPTION 'acces a un autre foyer aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%acces_refuse%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu acces_refuse) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

ROLLBACK;
