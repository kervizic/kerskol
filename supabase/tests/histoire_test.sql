-- histoire_test.sql
-- « Histoire » (HIST, migration 0099). Transaction ROLLBACK :
-- aucune donnee de test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre : la table de reference public.qm_item (48 items HIST, couverture
-- 6 competences x 4 niveaux + spot-check CROISE avec le golden vitest
-- frontend/src/domain/histoire/histoire.test.ts) ; verif_qm ; enregistrer_reponse
-- (op='qm' elargi a HIST.%) : verdict, competence interdite, item absent, niveau
-- incoherent, autre foyer refuse ; activation (matiere HIST + 6 domaines actifs
-- pour TOUS les profils).

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 48 items HIST, couverture complete + spot check
-- ===========================================================================
DO $$
DECLARE r record; got text; n integer; attendu_n integer;
BEGIN
    SELECT count(*) INTO n FROM public.qm_item WHERE competence LIKE 'HIST.%';
    SELECT count(*) * 8 INTO attendu_n FROM public.competences WHERE matiere = 'HIST';
    IF n <> attendu_n THEN
        RAISE EXCEPTION 'qm_item : % items HIST attendus (8 par competence), obtenu %', attendu_n, n;
    END IF;

    FOR r IN SELECT c.code AS competence, nv AS niveau
               FROM public.competences c, generate_series(1,4) AS nv
              WHERE c.matiere = 'HIST'
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.qm_item
                        WHERE competence = r.competence AND niveau = r.niveau) THEN
            RAISE EXCEPTION 'qm_item : aucun item pour % N%', r.competence, r.niveau;
        END IF;
    END LOOP;

    FOR r IN SELECT * FROM (VALUES
        ('hi-tra-n2-b','HIST.TRACES',2,'tri','un silex taillé=Préhistoire;une peinture de bison=Préhistoire;une tablette tactile=aujourd''hui;une voiture=aujourd''hui'),
        ('hi-tra-n3-b','HIST.TRACES',3,'ordre','la Préhistoire>l''Antiquité>le Moyen Âge'),
        ('hi-gal-n2-b','HIST.GALLOROMAINS',2,'tri','les arènes de Nîmes=les Romains;le Pont du Gard=les Romains;un avion=aujourd''hui;un ordinateur=aujourd''hui'),
        ('hi-moy-n3-a','HIST.MOYENAGE',3,'tri','le forgeron=fabrique des outils en fer;le meunier=moud le grain;le boulanger=fait le pain'),
        ('hi-mon-n2-b','HIST.MONUMENTS',2,'tri','une cathédrale gothique=Moyen Âge;une abbaye=Moyen Âge;le château de Versailles=époque des rois;le château de Chambord=époque des rois'),
        ('hi-roi-n2-a','HIST.ROIS',2,'tri','Clovis=baptisé à Reims;Charlemagne=a aidé les écoles;Saint Louis=rendait la justice'),
        ('hi-roi-n3-b','HIST.ROIS',3,'ordre','Clovis>Charlemagne>Saint Louis'),
        ('hi-fri-n2-b','HIST.FRISE',2,'ordre','la Préhistoire>l''Antiquité>le Moyen Âge>les Temps modernes'),
        ('hi-fri-n3-a','HIST.FRISE',3,'qcm','Ve'),
        ('hi-fri-n4-a','HIST.FRISE',4,'texte','C')
    ) AS t(cle, competence, niveau, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.qm_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'qm_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table qm_item HIST (% items, couverture + spot) : OK', n;
END $$;

-- ===========================================================================
-- 2. verif_qm : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    IF NOT public.verif_qm('hi-roi-n1-a','Clovis') THEN RAISE EXCEPTION 'qcm juste refuse'; END IF;
    IF NOT public.verif_qm('hi-roi-n1-a','clovis') THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    IF public.verif_qm('hi-roi-n1-a','Astérix') THEN RAISE EXCEPTION 'qcm mauvaise reponse acceptee'; END IF;
    IF NOT public.verif_qm('hi-roi-n3-b','Clovis>Charlemagne>Saint Louis') THEN RAISE EXCEPTION 'ordre juste refuse'; END IF;
    IF NOT public.verif_qm('hi-roi-n3-b','Clovis > Charlemagne > Saint Louis') THEN RAISE EXCEPTION 'ordre espaces KO'; END IF;
    IF public.verif_qm('hi-roi-n3-b','Saint Louis>Charlemagne>Clovis') THEN RAISE EXCEPTION 'ordre inverse accepte'; END IF;
    IF NOT public.verif_qm('hi-roi-n2-a','Clovis=baptisé à Reims;Charlemagne=a aidé les écoles;Saint Louis=rendait la justice') THEN RAISE EXCEPTION 'tri juste refuse'; END IF;
    IF public.verif_qm('hi-roi-n2-a','Clovis=rendait la justice;Charlemagne=a aidé les écoles;Saint Louis=baptisé à Reims') THEN RAISE EXCEPTION 'tri faux accepte'; END IF;
    IF NOT public.verif_qm('hi-tra-n4-a','Préhistoire') THEN RAISE EXCEPTION 'texte juste refuse'; END IF;
    IF NOT public.verif_qm('hi-tra-n4-a','préhistoire') THEN RAISE EXCEPTION 'texte casse KO'; END IF;
    IF public.verif_qm('hi-tra-n4-a','Prehistoire') THEN RAISE EXCEPTION 'texte accent non exige'; END IF;
    IF public.verif_qm('cle-bidon','x') THEN RAISE EXCEPTION 'item absent accepte'; END IF;
    RAISE NOTICE 'verif_qm HIST : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='qm' elargi a HIST.%) : verdict + coherence + RLS
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

-- 3a. Bonne reponse ACCEPTEE (QCM « le système solaire », ST.TERRE.CIEL N1).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'HIST.ROIS', NULL, 1, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'hi-roi-n1-a', NULL, 'seance', 'Clovis', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'HIST « Clovis » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'HIST.ROIS', NULL, 1, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'hi-roi-n1-a', NULL, 'seance', 'Astérix', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'HIST « Astérix » devrait etre faux : %', v;
    END IF;
END $$;

-- 3c. Reponse « ordre » ACCEPTEE (ST.CORPS.SANTE N3).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'HIST.ROIS', NULL, 3, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'hi-roi-n3-b', NULL, 'seance', 'Clovis>Charlemagne>Saint Louis', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'HIST ordre devrait etre juste : %', v;
    END IF;
END $$;

-- 3d. Competence interdite (op='qm' sur une competence de maths) REJETEE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.TABLEAU', NULL, 1, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'hi-roi-n1-a', NULL, 'seance', 'Clovis', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'HIST.ROIS', NULL, 1, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'cle-bidon', NULL, 'seance', 'Clovis', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'HIST.ROIS', NULL, 2, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'hi-roi-n1-a', NULL, 'seance', 'Clovis', NULL);
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
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'HIST.ROIS', NULL, 1, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'hi-roi-n1-a', NULL, 'seance', 'Clovis', NULL);
    RAISE EXCEPTION 'acces a un autre foyer aurait du etre refuse';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%acces_refuse%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu acces_refuse) : %', SQLERRM;
    END IF;
END $$;

RESET ROLE;

-- ===========================================================================
-- 4. Activation : matiere HIST + 6 domaines actifs pour TOUS les profils.
-- ===========================================================================
DO $$
DECLARE n integer; d text;
BEGIN
    SELECT count(*) INTO n FROM public.profils WHERE NOT ('HIST' = ANY (matieres_actives));
    IF n <> 0 THEN RAISE EXCEPTION 'HIST devrait etre active pour TOUS les profils, manque dans %', n; END IF;
    FOREACH d IN ARRAY ARRAY['traces_anciennes','gaulois_romains','moyen_age','monuments','rois_de_france','frise']
    LOOP
        SELECT count(*) INTO n FROM public.profils WHERE NOT (d = ANY (domaines_actifs));
        IF n <> 0 THEN RAISE EXCEPTION 'domaine % devrait etre actif pour TOUS les profils, manque dans %', d, n; END IF;
    END LOOP;
    RAISE NOTICE 'matiere HIST + 6 domaines actifs pour tous les profils : OK';
END $$;

-- ===========================================================================
-- 5. Completude du DEFAUT : les domaines historiques ET les 6 nouveaux sont
--    dans le DEFAUT de profils.domaines_actifs (non-regression de 0073).
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
                             'energie','objets_techniques','ciel_terre',
                             'traces_anciennes','gaulois_romains','moyen_age',
                             'monuments','rois_de_france','frise']
    LOOP
        IF NOT (d = ANY (v_cur)) THEN
            RAISE EXCEPTION 'DEFAUT domaines_actifs incomplet : % manquant', d;
        END IF;
    END LOOP;
    RAISE NOTICE 'DEFAUT domaines_actifs complet (historique + ST + HIST) : OK';
END $$;

ROLLBACK;
