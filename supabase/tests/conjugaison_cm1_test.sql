-- conjugaison_cm1_test.sql
-- Conjugaison CM1 : passe simple (temps 5) et imperatif (temps 6), migration
-- 0088. Transaction ROLLBACK : aucune donnee de test ne subsiste.
-- Execution : deploy/test-db.sh.
--
-- Couvre :
--   * la table public.conjugaison contient 88 formes CM1 (34 passe simple +
--     54 imperatif) + spot check (front == SQL, golden cm1Golden()) ;
--   * verif_conjugaison sur les temps 5/6 : bonne forme acceptee, « s » en trop
--     (imperatif) refuse, accent manquant refuse ;
--   * enregistrer_reponse(op='conj', p_a=5/6) : verdict, lien temps<->competence
--     (passe simple <-> FR.CONJ.PASSE_SIMPLE, imperatif <-> FR.CONJ.IMPERATIF),
--     competences croisees rejetees.

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 88 formes CM1 + spot check (front == SQL)
-- ===========================================================================
DO $$
DECLARE
    r record;
    got text;
    n5  integer;
    n6  integer;
BEGIN
    SELECT count(*) INTO n5 FROM public.conjugaison WHERE temps = 5;
    SELECT count(*) INTO n6 FROM public.conjugaison WHERE temps = 6;
    IF n5 <> 34 THEN RAISE EXCEPTION 'passe simple : 34 formes attendues, obtenu %', n5; END IF;
    IF n6 <> 54 THEN RAISE EXCEPTION 'imperatif : 54 formes attendues, obtenu %', n6; END IF;

    FOR r IN SELECT * FROM (VALUES
        -- passe simple (temps 5)
        ('chanter',5,3,'chanta'),('chanter',5,6,'chantèrent'),
        ('manger',5,3,'mangea'),('placer',5,3,'plaça'),
        ('etre',5,3,'fut'),('etre',5,6,'furent'),
        ('avoir',5,3,'eut'),('aller',5,6,'allèrent'),
        ('faire',5,3,'fit'),('venir',5,6,'vinrent'),
        ('prendre',5,3,'prit'),('voir',5,6,'virent'),
        -- imperatif (temps 6)
        ('chanter',6,2,'chante'),('chanter',6,4,'chantons'),('chanter',6,5,'chantez'),
        ('manger',6,4,'mangeons'),('placer',6,4,'plaçons'),
        ('etre',6,2,'sois'),('avoir',6,2,'aie'),('aller',6,2,'va'),
        ('faire',6,5,'faites'),('dire',6,5,'dites'),('finir',6,4,'finissons')
    ) AS t(verbe, temps, personne, forme)
    LOOP
        SELECT forme INTO got FROM public.conjugaison
         WHERE verbe = r.verbe AND temps = r.temps AND personne = r.personne;
        IF got IS DISTINCT FROM r.forme THEN
            RAISE EXCEPTION 'conjugaison CM1 KO : % % % attendu « % », obtenu « % »',
                r.verbe, r.temps, r.personne, r.forme, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table conjugaison CM1 (88 + spot) : OK';
END $$;

-- ===========================================================================
-- 2. verif_conjugaison sur les temps CM1
-- ===========================================================================
DO $$
BEGIN
    -- Bonnes formes.
    IF NOT public.verif_conjugaison('chanter',5,3,'chanta')     THEN RAISE EXCEPTION 'juste refuse : chanta'; END IF;
    IF NOT public.verif_conjugaison('chanter',5,6,'chantèrent') THEN RAISE EXCEPTION 'juste refuse : chantèrent'; END IF;
    IF NOT public.verif_conjugaison('chanter',6,2,'chante')     THEN RAISE EXCEPTION 'juste refuse : chante (imp)'; END IF;
    IF NOT public.verif_conjugaison('etre',6,2,'sois')          THEN RAISE EXCEPTION 'juste refuse : sois'; END IF;
    IF NOT public.verif_conjugaison('avoir',6,2,'aie')          THEN RAISE EXCEPTION 'juste refuse : aie'; END IF;
    -- Imperatif -er : le « s » en trop est REFUSE (chante, pas chantes).
    IF public.verif_conjugaison('chanter',6,2,'chantes')        THEN RAISE EXCEPTION 'chantes (imp) devrait etre faux'; END IF;
    -- Accent manquant REFUSE.
    IF public.verif_conjugaison('chanter',5,6,'chanterent')     THEN RAISE EXCEPTION 'chanterent sans accent devrait etre faux'; END IF;
    -- Forme absente (personne non couverte) -> faux.
    IF public.verif_conjugaison('chanter',5,1,'chantai')        THEN RAISE EXCEPTION 'passe simple personne 1 ne devrait pas exister'; END IF;
    RAISE NOTICE 'verif_conjugaison CM1 : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='conj', p_a=5/6) : verdict + lien temps/competence
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'

INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'cm1@example.test', now());
INSERT INTO foyers (id) VALUES ('aaaaaaaa-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'EnfantCM1', 'CM1');

\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 3a. Passe simple bon (chanter, il -> « chanta »).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PASSE_SIMPLE', NULL, 1, NULL,
        'conj', 5, 3, 0, NULL, 1, 3000, false, false, false, now(),
        'chanter', NULL, 'seance', 'chanta', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'passe simple « chanta » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Imperatif : « chantes » (s en trop) REFUSE + type_faute enregistre.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid(); v_tf text;
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.IMPERATIF', NULL, 1, NULL,
        'conj', 6, 2, 0, NULL, 1, 3000, false, false, false, now(),
        'chanter', NULL, 'seance', 'chantes', 'TERMINAISON');
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'imperatif « chantes » devrait etre faux : %', v;
    END IF;
    SELECT type_faute INTO v_tf FROM public.reponses WHERE id = v_id;
    IF v_tf <> 'TERMINAISON' THEN
        RAISE EXCEPTION 'type_faute non enregistre (obtenu %)', v_tf;
    END IF;
END $$;

-- 3c. Imperatif bon (chanter, tu -> « chante »).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.IMPERATIF', NULL, 1, NULL,
        'conj', 6, 2, 0, NULL, 1, 3000, false, false, false, now(),
        'chanter', NULL, 'seance', 'chante', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'imperatif « chante » devrait etre juste : %', v;
    END IF;
END $$;

-- 3d. Croisement interdit : passe simple (p_a=5) sous competence IMPERATIF REJETE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.IMPERATIF', NULL, 1, NULL,
        'conj', 5, 3, 0, NULL, 1, 3000, false, false, false, now(),
        'chanter', NULL, 'seance', 'chanta', NULL);
    RAISE EXCEPTION 'passe simple sous competence imperatif aurait du etre rejete';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3e. Croisement interdit : temps simple (p_a=1) sous competence PASSE_SIMPLE REJETE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PASSE_SIMPLE', NULL, 1, NULL,
        'conj', 1, 3, 0, NULL, 1, 3000, false, false, false, now(),
        'chanter', NULL, 'seance', 'chante', NULL);
    RAISE EXCEPTION 'temps simple sous competence passe simple aurait du etre rejete';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

ROLLBACK;
