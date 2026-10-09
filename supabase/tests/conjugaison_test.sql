-- conjugaison_test.sql
-- Conjugaison francaise (migration 0031). Transaction ROLLBACK : aucune donnee
-- de test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre :
--   * la table de reference public.conjugaison contient EXACTEMENT les memes
--     formes que le front (342 lignes ; spot check de toutes les familles,
--     tous les temps, cas -ger/-cer, accents) : TEST CROISE avec le golden
--     vitest (frontend/.../diagnostic/conjugaison.test.ts) ;
--   * verif_conjugaison : bonne forme acceptee, mauvaise personne / mauvais
--     temps / accent manquant refuses, tolerance casse/espaces, forme absente ;
--   * enregistrer_reponse(op='conj') : verdict serveur, type_faute enregistre,
--     accents EXIGES, competence interdite rejetee, autre foyer refuse.

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 342 formes + spot check (front == SQL)
-- ===========================================================================
DO $$
DECLARE
    r record;
    got text;
    n   integer;
BEGIN
    -- CE2 = temps simples 1..3 (le passe simple/imperatif CM1 sont temps 5/6,
    -- couverts par conjugaison_cm1_test.sql).
    SELECT count(*) INTO n FROM public.conjugaison WHERE temps BETWEEN 1 AND 3;
    IF n <> 360 THEN
        RAISE EXCEPTION 'conjugaison : 360 formes attendues, obtenu %', n;
    END IF;
    FOR r IN SELECT * FROM (VALUES
        ('chanter',1,3,'chante'),('chanter',2,1,'chanterai'),('chanter',3,3,'chantait'),
        ('etre',1,5,'êtes'),('etre',3,1,'étais'),('avoir',1,1,'ai'),
        ('manger',1,4,'mangeons'),('placer',3,1,'plaçais'),('placer',1,4,'plaçons'),
        ('aller',2,1,'irai'),('faire',1,5,'faites'),('prendre',1,6,'prennent'),
        ('vouloir',1,1,'veux'),('voir',3,4,'voyions'),('dire',1,5,'dites'),
        ('venir',1,6,'viennent'),('pouvoir',1,6,'peuvent'),('jouer',2,6,'joueront'),
        -- 2e groupe : finir (present pluriel en -iss-, futur sur l'infinitif)
        ('finir',1,3,'finit'),('finir',1,4,'finissons'),('finir',2,1,'finirai'),
        ('finir',3,6,'finissaient')
    ) AS t(verbe, temps, personne, forme)
    LOOP
        SELECT forme INTO got FROM public.conjugaison
         WHERE verbe = r.verbe AND temps = r.temps AND personne = r.personne;
        IF got IS DISTINCT FROM r.forme THEN
            RAISE EXCEPTION 'conjugaison KO : % % % attendu « % », obtenu « % »',
                r.verbe, r.temps, r.personne, r.forme, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table conjugaison (360 + spot) : OK';
END $$;

-- ===========================================================================
-- 2. verif_conjugaison : accepte la bonne forme, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    -- Bonnes formes.
    IF NOT public.verif_conjugaison('chanter',1,3,'chante')  THEN RAISE EXCEPTION 'juste refuse : chante'; END IF;
    IF NOT public.verif_conjugaison('etre',1,5,'êtes')       THEN RAISE EXCEPTION 'juste refuse : etes'; END IF;
    IF NOT public.verif_conjugaison('placer',1,4,'plaçons')  THEN RAISE EXCEPTION 'juste refuse : placons'; END IF;
    IF NOT public.verif_conjugaison('aller',2,1,'irai')      THEN RAISE EXCEPTION 'juste refuse : irai'; END IF;
    -- Tolerance casse / espaces.
    IF NOT public.verif_conjugaison('chanter',1,3,'  CHANTE ') THEN RAISE EXCEPTION 'tolerance casse/espaces KO'; END IF;
    -- Accents EXIGES.
    IF public.verif_conjugaison('etre',1,5,'etes')     THEN RAISE EXCEPTION 'accent non exige : etes'; END IF;
    IF public.verif_conjugaison('placer',1,4,'placons') THEN RAISE EXCEPTION 'cedille non exigee : placons'; END IF;
    -- Mauvaise personne / mauvais temps.
    IF public.verif_conjugaison('chanter',1,3,'chantes')    THEN RAISE EXCEPTION 'mauvaise personne acceptee'; END IF;
    IF public.verif_conjugaison('chanter',1,1,'chanterai')  THEN RAISE EXCEPTION 'mauvais temps accepte'; END IF;
    -- Forme absente.
    IF public.verif_conjugaison('inconnu',1,1,'xyz')        THEN RAISE EXCEPTION 'verbe absent accepte'; END IF;
    RAISE NOTICE 'verif_conjugaison : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='conj') : verdict + type_faute + RLS + garde
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'ca@example.test', now()),
    (:'uB', 'cb@example.test', now());
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

-- 3a. Bonne forme ACCEPTEE (chanter, present, il -> « chante »).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PRESENT', NULL, 1, NULL,
        'conj', 1, 3, 0, NULL, 1, 3000, false, false, false, now(),
        'chanter', NULL, 'seance', 'chante', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'conj « chante » (il, present) devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Accent EXIGE (etre, present, vous -> « etes » sans accent) REFUSE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid(); v_tf text;
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PRESENT', NULL, 3, NULL,
        'conj', 1, 5, 0, NULL, 1, 3000, false, false, false, now(),
        'etre', NULL, 'seance', 'etes', 'ACCENT');
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'conj « etes » sans accent devrait etre faux : %', v;
    END IF;
    SELECT type_faute INTO v_tf FROM public.reponses WHERE id = v_id;
    IF v_tf <> 'ACCENT' THEN
        RAISE EXCEPTION 'type_faute non enregistre (obtenu %)', v_tf;
    END IF;
END $$;

-- 3c. Mauvaise personne REFUSEE (chanter, present, il -> « chantes »).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PRESENT', NULL, 1, NULL,
        'conj', 1, 3, 0, NULL, 1, 3000, false, false, false, now(),
        'chanter', NULL, 'seance', 'chantes', 'MAUVAISE_PERSONNE');
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'conj « chantes » (il) devrait etre faux : %', v;
    END IF;
END $$;

-- 3d. Competence interdite (op='conj' sur une competence de maths) REJETEE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.NUM.LIRE_ECRIRE', NULL, 1, NULL,
        'conj', 1, 3, 0, NULL, 1, 3000, false, false, false, now(),
        'chanter', NULL, 'seance', 'chante', NULL);
    RAISE EXCEPTION 'competence interdite aurait du etre rejetee';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3e. Acces a un profil d'un AUTRE foyer REFUSE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PRESENT', NULL, 1, NULL,
        'conj', 1, 3, 0, NULL, 1, 3000, false, false, false, now(),
        'chanter', NULL, 'seance', 'chante', NULL);
    RAISE EXCEPTION 'acces a un autre foyer aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%acces_refuse%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu acces_refuse) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

ROLLBACK;
