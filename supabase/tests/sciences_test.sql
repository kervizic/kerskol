-- sciences_test.sql
-- « Sciences et technologie » (ST, migration 0098). Transaction ROLLBACK :
-- aucune donnee de test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre : la table de reference public.qm_item (48 items ST, couverture
-- 6 competences x 4 niveaux + spot-check CROISE avec le golden vitest
-- frontend/src/domain/sciences/sciences.test.ts) ; verif_qm ; enregistrer_reponse
-- (op='qm' elargi a ST.%) : verdict, competence interdite, item absent, niveau
-- incoherent, autre foyer refuse ; activation (matiere ST + 6 domaines actifs
-- pour TOUS les profils).

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 48 items ST, couverture complete + spot check
-- ===========================================================================
DO $$
DECLARE r record; got text; n integer; attendu_n integer;
BEGIN
    SELECT count(*) INTO n FROM public.qm_item WHERE competence LIKE 'ST.%';
    SELECT count(*) * 8 INTO attendu_n FROM public.competences WHERE matiere = 'ST';
    IF n <> attendu_n THEN
        RAISE EXCEPTION 'qm_item : % items ST attendus (8 par competence), obtenu %', attendu_n, n;
    END IF;

    FOR r IN SELECT c.code AS competence, nv AS niveau
               FROM public.competences c, generate_series(1,4) AS nv
              WHERE c.matiere = 'ST'
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.qm_item
                        WHERE competence = r.competence AND niveau = r.niveau) THEN
            RAISE EXCEPTION 'qm_item : aucun item pour % N%', r.competence, r.niveau;
        END IF;
    END LOOP;

    FOR r IN SELECT * FROM (VALUES
        ('st-mat-n2-a','ST.MATIERE.ETATS',2,'tri','un glaçon=solide;le jus d''orange=liquide;l''air du ballon=gaz'),
        ('st-mat-n4-a','ST.MATIERE.ETATS',4,'texte','fonte'),
        ('st-viv-n3-b','ST.VIVANT.CLASSER',3,'ordre','l''herbe>la sauterelle>la grenouille'),
        ('st-viv-n4-b','ST.VIVANT.CLASSER',4,'texte','carnivore'),
        ('st-cor-n3-a','ST.CORPS.SANTE',3,'ordre','la bouche>l''estomac>l''intestin'),
        ('st-ene-n2-a','ST.ENERGIE.SOURCES',2,'tri','le soleil=renouvelable;le vent=renouvelable;le pétrole=s''épuise;le charbon=s''épuise'),
        ('st-obj-n2-a','ST.OBJETS.TECHNIQUE',2,'tri','le stylo=pour écrire;les ciseaux=pour couper;la règle=pour mesurer'),
        ('st-obj-n3-a','ST.OBJETS.TECHNIQUE',3,'ordre','la bougie>la lampe à huile>l''ampoule électrique'),
        ('st-ter-n1-b','ST.TERRE.CIEL',1,'qcm','le système solaire'),
        ('st-ter-n4-a','ST.TERRE.CIEL',4,'texte','Soleil')
    ) AS t(cle, competence, niveau, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.qm_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'qm_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table qm_item ST (% items, couverture + spot) : OK', n;
END $$;

-- ===========================================================================
-- 2. verif_qm : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    IF NOT public.verif_qm('st-ter-n1-b','le système solaire') THEN RAISE EXCEPTION 'qcm juste refuse'; END IF;
    IF NOT public.verif_qm('st-ter-n1-b','Le Système Solaire') THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    IF public.verif_qm('st-ter-n1-b','la forêt') THEN RAISE EXCEPTION 'qcm mauvaise reponse acceptee'; END IF;
    IF NOT public.verif_qm('st-cor-n3-a','la bouche>l''estomac>l''intestin') THEN RAISE EXCEPTION 'ordre juste refuse'; END IF;
    IF NOT public.verif_qm('st-cor-n3-a','la bouche > l''estomac > l''intestin') THEN RAISE EXCEPTION 'ordre espaces KO'; END IF;
    IF public.verif_qm('st-cor-n3-a','l''intestin>l''estomac>la bouche') THEN RAISE EXCEPTION 'ordre inverse accepte'; END IF;
    IF NOT public.verif_qm('st-ene-n2-a','le soleil=renouvelable;le vent=renouvelable;le pétrole=s''épuise;le charbon=s''épuise') THEN RAISE EXCEPTION 'tri juste refuse'; END IF;
    IF public.verif_qm('st-ene-n2-a','le soleil=s''épuise;le vent=renouvelable;le pétrole=s''épuise;le charbon=s''épuise') THEN RAISE EXCEPTION 'tri faux accepte'; END IF;
    IF NOT public.verif_qm('st-ene-n4-a','électricité') THEN RAISE EXCEPTION 'texte juste refuse'; END IF;
    IF NOT public.verif_qm('st-ene-n4-a','Électricité') THEN RAISE EXCEPTION 'texte casse KO'; END IF;
    IF public.verif_qm('st-ene-n4-a','electricite') THEN RAISE EXCEPTION 'texte accent non exige'; END IF;
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

-- 3a. Bonne reponse ACCEPTEE (QCM « le système solaire », ST.TERRE.CIEL N1).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'ST.TERRE.CIEL', NULL, 1, 'sciences',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'st-ter-n1-b', NULL, 'seance', 'le système solaire', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'ST « le système solaire » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'ST.TERRE.CIEL', NULL, 1, 'sciences',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'st-ter-n1-b', NULL, 'seance', 'la forêt', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'ST « la forêt » devrait etre faux : %', v;
    END IF;
END $$;

-- 3c. Reponse « ordre » ACCEPTEE (ST.CORPS.SANTE N3).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'ST.CORPS.SANTE', NULL, 3, 'sciences',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'st-cor-n3-a', NULL, 'seance', 'la bouche>l''estomac>l''intestin', NULL);
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
        'st-ter-n1-b', NULL, 'seance', 'le système solaire', NULL);
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
        'cle-bidon', NULL, 'seance', 'le système solaire', NULL);
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
        'st-ter-n1-b', NULL, 'seance', 'le système solaire', NULL);
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
        'st-ter-n1-b', NULL, 'seance', 'le système solaire', NULL);
    RAISE EXCEPTION 'acces a un autre foyer aurait du etre refuse';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%acces_refuse%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu acces_refuse) : %', SQLERRM;
    END IF;
END $$;

RESET ROLE;

-- ===========================================================================
-- 4. Activation : matiere ST + 6 domaines actifs pour TOUS les profils.
-- ===========================================================================
DO $$
DECLARE n integer; d text;
BEGIN
    SELECT count(*) INTO n FROM public.profils WHERE NOT ('ST' = ANY (matieres_actives));
    IF n <> 0 THEN RAISE EXCEPTION 'ST devrait etre active pour TOUS les profils, manque dans %', n; END IF;
    FOREACH d IN ARRAY ARRAY['etats_matiere','classification','corps_humain','energie','objets_techniques','ciel_terre']
    LOOP
        SELECT count(*) INTO n FROM public.profils WHERE NOT (d = ANY (domaines_actifs));
        IF n <> 0 THEN RAISE EXCEPTION 'domaine % devrait etre actif pour TOUS les profils, manque dans %', d, n; END IF;
    END LOOP;
    RAISE NOTICE 'matiere ST + 6 domaines actifs pour tous les profils : OK';
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
                             'energie','objets_techniques','ciel_terre']
    LOOP
        IF NOT (d = ANY (v_cur)) THEN
            RAISE EXCEPTION 'DEFAUT domaines_actifs incomplet : % manquant', d;
        END IF;
    END LOOP;
    RAISE NOTICE 'DEFAUT domaines_actifs complet (historique + ST) : OK';
END $$;

ROLLBACK;
