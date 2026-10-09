-- sciences_test.sql
-- « Sciences et technologie » (ST, PROGRAMME 2026, migrations 0098 puis 0105).
-- Transaction ROLLBACK : aucune donnee de test ne subsiste. Execution :
-- deploy/test-db.sh.
--
-- Couvre : la table de reference public.qm_item (7 competences ACTIVES x 4
-- niveaux x 2 items + spot-check CROISE avec le golden vitest
-- frontend/src/domain/sciences/sciences.test.ts) ; la DESACTIVATION de l'ancienne
-- competence « energie » (donnees conservees) ; verif_qm ; enregistrer_reponse
-- (op='qm' elargi a ST.%) ; activation (matiere ST + 2 nouveaux domaines) ;
-- completude du DEFAUT.

BEGIN;

-- ===========================================================================
-- 1. Competences actives (programme 2026) + ancienne « energie » desactivee.
-- ===========================================================================
DO $$
DECLARE r record; got text; n integer;
BEGIN
    FOR r IN SELECT unnest(ARRAY['ST.MATIERE.ETATS','ST.PHYSIQUE.LUMIERE','ST.VIVANT.CLASSER',
                                 'ST.VIVANT.ECOSYSTEMES','ST.CORPS.SANTE','ST.TERRE.CIEL',
                                 'ST.OBJETS.TECHNIQUE']) AS code
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.competences WHERE code = r.code AND actif) THEN
            RAISE EXCEPTION 'competence active attendue manquante : %', r.code;
        END IF;
        -- AU MOINS 8 items (les 8 d'entrainement libre de 0105). Depuis 0111, le
        -- Parcours de Sciences AJOUTE des items (cles « ps-* ») a certaines
        -- competences : le total peut depasser 8. On verifie le socle, pas un total exact.
        SELECT count(*) INTO n FROM public.qm_item WHERE competence = r.code;
        IF n < 8 THEN RAISE EXCEPTION 'qm_item : au moins 8 items attendus pour %, obtenu %', r.code, n; END IF;
        FOR n IN 1..4 LOOP
            IF NOT EXISTS (SELECT 1 FROM public.qm_item WHERE competence = r.code AND niveau = n) THEN
                RAISE EXCEPTION 'qm_item : aucun item pour % N%', r.code, n;
            END IF;
        END LOOP;
    END LOOP;

    IF EXISTS (SELECT 1 FROM public.competences WHERE code = 'ST.ENERGIE.SOURCES' AND actif) THEN
        RAISE EXCEPTION 'ancienne competence ST.ENERGIE.SOURCES devrait etre desactivee';
    END IF;
    SELECT count(*) INTO n FROM public.qm_item WHERE competence = 'ST.ENERGIE.SOURCES';
    IF n = 0 THEN RAISE EXCEPTION 'donnees perdues : plus aucun item pour ST.ENERGIE.SOURCES'; END IF;

    FOR r IN SELECT * FROM (VALUES
        ('st-mat-n2-b','tri','le sel=se dissout;le sucre=se dissout;le sable=ne se dissout pas;les cailloux=ne se dissout pas'),
        ('st-mat-n4-b','texte','tare'),
        ('st-lum-n2-a','tri','une vitre propre=transparent;du papier calque=translucide;un mur en pierre=opaque;un livre fermé=opaque'),
        ('st-lum-n4-a','texte','translucide'),
        ('st-viv-n3-b','ordre','la fécondation>le développement dans l''œuf>l''éclosion'),
        ('st-eco-n2-b','ordre','l''herbe>le lapin>le renard'),
        ('st-eco-n3-b','tri','l''abeille butine la fleur et la pollinise=coopération;le poisson-clown et l''anémone se protègent=coopération;le renard chasse le lapin pour se nourrir=prédation;la coccinelle se nourrit de pucerons=prédation'),
        ('st-cor-n4-b','texte','puberté'),
        ('st-ter-n2-a','tri','le thermomètre=la température;le pluviomètre=la pluie;l''anémomètre=le vent'),
        ('st-obj-n2-b','tri','le vélo=se déplacer;le bus=se déplacer;la gourde=s''hydrater;la carafe=s''hydrater')
    ) AS t(cle, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.qm_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'qm_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table qm_item ST (programme 2026 : couverture + desactivation + spot) : OK';
END $$;

-- ===========================================================================
-- 2. verif_qm : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    IF NOT public.verif_qm('st-ter-n1-a','un thermomètre') THEN RAISE EXCEPTION 'qcm juste refuse'; END IF;
    IF NOT public.verif_qm('st-ter-n1-a','Un thermomètre') THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    IF public.verif_qm('st-ter-n1-a','une balance') THEN RAISE EXCEPTION 'qcm mauvaise reponse acceptee'; END IF;
    IF NOT public.verif_qm('st-eco-n2-b','l''herbe>le lapin>le renard') THEN RAISE EXCEPTION 'ordre juste refuse'; END IF;
    IF NOT public.verif_qm('st-eco-n2-b','l''herbe > le lapin > le renard') THEN RAISE EXCEPTION 'ordre espaces KO'; END IF;
    IF public.verif_qm('st-eco-n2-b','le renard>le lapin>l''herbe') THEN RAISE EXCEPTION 'ordre inverse accepte'; END IF;
    IF NOT public.verif_qm('st-ter-n2-a','le thermomètre=la température;le pluviomètre=la pluie;l''anémomètre=le vent') THEN RAISE EXCEPTION 'tri juste refuse'; END IF;
    IF public.verif_qm('st-ter-n2-a','le thermomètre=le vent;le pluviomètre=la pluie;l''anémomètre=la température') THEN RAISE EXCEPTION 'tri faux accepte'; END IF;
    IF NOT public.verif_qm('st-eco-n4-a','écosystème') THEN RAISE EXCEPTION 'texte juste refuse'; END IF;
    IF NOT public.verif_qm('st-eco-n4-a','Écosystème') THEN RAISE EXCEPTION 'texte casse KO'; END IF;
    IF public.verif_qm('st-eco-n4-a','ecosysteme') THEN RAISE EXCEPTION 'texte accent non exige'; END IF;
    IF public.verif_qm('cle-bidon','x') THEN RAISE EXCEPTION 'item absent accepte'; END IF;
    RAISE NOTICE 'verif_qm ST : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='qm' elargi a ST.%) : verdict + coherence + RLS
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'sta@example.test', now()),
    (:'uB', 'stb@example.test', now());
INSERT INTO foyers (id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000'),
    ('bbbbbbbb-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000', :'uA'),
    ('bbbbbbbb-0000-0000-0000-000000000000', :'uB');
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'EnfantA', 'CM1'),
    ('b0000001-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000', 'EnfantB', 'CM1');

\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 3a. Bonne reponse ACCEPTEE (QCM, ST.TERRE.CIEL N1).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'ST.TERRE.CIEL', NULL, 1, 'sciences',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'st-ter-n1-a', NULL, 'seance', 'un thermomètre', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'ST « un thermomètre » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'ST.TERRE.CIEL', NULL, 1, 'sciences',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'st-ter-n1-a', NULL, 'seance', 'une balance', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'ST « une balance » devrait etre faux : %', v;
    END IF;
END $$;

-- 3c. Reponse « ordre » ACCEPTEE (ST.VIVANT.ECOSYSTEMES N2).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'ST.VIVANT.ECOSYSTEMES', NULL, 2, 'sciences',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'st-eco-n2-b', NULL, 'seance', 'l''herbe>le lapin>le renard', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'ST ordre devrait etre juste : %', v;
    END IF;
END $$;

-- 3d. Competence interdite (op='qm' sur une competence de maths) REJETEE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.TABLEAU', NULL, 1, 'sciences',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'st-ter-n1-a', NULL, 'seance', 'un thermomètre', NULL);
    RAISE EXCEPTION 'competence interdite aurait du etre rejetee';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
    END IF;
END $$;

-- 3e. Item inexistant REJETE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'ST.TERRE.CIEL', NULL, 1, 'sciences',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'cle-bidon', NULL, 'seance', 'un thermomètre', NULL);
    RAISE EXCEPTION 'item inexistant aurait du etre rejete';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
    END IF;
END $$;

-- 3f. Niveau incoherent avec l'item REJETE (item N1 envoye en N2).
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'ST.TERRE.CIEL', NULL, 2, 'sciences',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'st-ter-n1-a', NULL, 'seance', 'un thermomètre', NULL);
    RAISE EXCEPTION 'niveau incoherent aurait du etre rejete';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
    END IF;
END $$;

-- 3g. Acces a un profil d'un AUTRE foyer REFUSE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'ST.TERRE.CIEL', NULL, 1, 'sciences',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'st-ter-n1-a', NULL, 'seance', 'un thermomètre', NULL);
    RAISE EXCEPTION 'acces a un autre foyer aurait du etre refuse';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%acces_refuse%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu acces_refuse) : %', SQLERRM;
    END IF;
END $$;

RESET ROLE;

-- ===========================================================================
-- 4. Activation : matiere ST + 2 nouveaux domaines actifs pour TOUS les profils.
-- ===========================================================================
DO $$
DECLARE n integer; d text;
BEGIN
    SELECT count(*) INTO n FROM public.profils WHERE NOT ('ST' = ANY (matieres_actives));
    IF n <> 0 THEN RAISE EXCEPTION 'ST devrait etre active pour TOUS les profils, manque dans %', n; END IF;
    FOREACH d IN ARRAY ARRAY['etats_matiere','lumiere','classification','ecosystemes',
                             'corps_humain','ciel_terre','objets_techniques']
    LOOP
        SELECT count(*) INTO n FROM public.profils WHERE NOT (d = ANY (domaines_actifs));
        IF n <> 0 THEN RAISE EXCEPTION 'domaine % devrait etre actif pour TOUS les profils, manque dans %', d, n; END IF;
    END LOOP;
    RAISE NOTICE 'matiere ST + 7 domaines (programme 2026) actifs pour tous les profils : OK';
END $$;

-- ===========================================================================
-- 5. Completude du DEFAUT : domaines historiques + nouveaux domaines ST
--    presents (non-regression : on ne retire JAMAIS un domaine du defaut).
-- ===========================================================================
DO $$
DECLARE v_expr text; v_cur text[]; d text;
BEGIN
    SELECT pg_get_expr(adbin, adrelid) INTO v_expr
      FROM pg_attrdef ad
      JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
     WHERE a.attrelid = 'public.profils'::regclass AND a.attname = 'domaines_actifs';
    EXECUTE 'SELECT ' || v_expr INTO v_cur;
    FOREACH d IN ARRAY ARRAY['numeration','lecture','vivant','respect','decimaux',
                             'etats_matiere','classification','corps_humain',
                             'objets_techniques','ciel_terre','lumiere','ecosystemes']
    LOOP
        IF NOT (d = ANY (v_cur)) THEN
            RAISE EXCEPTION 'DEFAUT domaines_actifs incomplet : % manquant', d;
        END IF;
    END LOOP;
    RAISE NOTICE 'DEFAUT domaines_actifs complet (historique + ST programme 2026) : OK';
END $$;

ROLLBACK;
