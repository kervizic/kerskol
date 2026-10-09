-- geographie_test.sql
-- « Geographie » (GEO, migration 0100). Transaction ROLLBACK :
-- aucune donnee de test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre : la table de reference public.qm_item (48 items GEO, couverture
-- 6 competences x 4 niveaux + spot-check CROISE avec le golden vitest
-- frontend/src/domain/geographie/geographie.test.ts) ; verif_qm ; enregistrer_reponse
-- (op='qm' elargi a GEO.%) : verdict, competence interdite, item absent, niveau
-- incoherent, autre foyer refuse ; activation (matiere GEO + 6 domaines actifs
-- pour TOUS les profils).

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 48 items GEO, couverture complete + spot check
-- ===========================================================================
DO $$
DECLARE r record; got text; n integer; attendu_n integer;
BEGIN
    SELECT count(*) INTO n FROM public.qm_item WHERE competence LIKE 'GEO.%';
    SELECT count(*) * 8 INTO attendu_n FROM public.competences WHERE matiere = 'GEO';
    IF n <> attendu_n THEN
        RAISE EXCEPTION 'qm_item : % items GEO attendus (8 par competence), obtenu %', attendu_n, n;
    END IF;

    FOR r IN SELECT c.code AS competence, nv AS niveau
               FROM public.competences c, generate_series(1,4) AS nv
              WHERE c.matiere = 'GEO'
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.qm_item
                        WHERE competence = r.competence AND niveau = r.niveau) THEN
            RAISE EXCEPTION 'qm_item : aucun item pour % N%', r.competence, r.niveau;
        END IF;
    END LOOP;

    FOR r IN SELECT * FROM (VALUES
        ('ge-rep-n3-a','GEO.REPERES',3,'tri','la légende=sur une carte;l''échelle=sur une carte;le titre=sur une carte;une recette de gâteau=pas sur une carte'),
        ('ge-rep-n4-a','GEO.REPERES',4,'texte','ouest'),
        ('ge-hab-n2-a','GEO.HABITER',2,'tri','un grand immeuble=la ville;beaucoup de magasins=la ville;un champ de blé=la campagne;une ferme=la campagne'),
        ('ge-act-n2-a','GEO.ACTIVITES',2,'tri','une usine=travail;un parc d''attractions=loisir;un musée=culture'),
        ('ge-con-n2-b','GEO.CONSOMMER',2,'tri','le blé=du champ;les légumes=du champ;le lait=de l''élevage;les œufs=de l''élevage'),
        ('ge-fra-n1-a','GEO.FRANCE',1,'qcm','la Seine'),
        ('ge-fra-n2-a','GEO.FRANCE',2,'tri','la Loire=un fleuve;la Garonne=un fleuve;les Pyrénées=une montagne;le Massif central=une montagne'),
        ('ge-fra-n3-b','GEO.FRANCE',3,'tri','l''océan Atlantique=au nord ou à l''ouest;la Manche=au nord ou à l''ouest;la mer Méditerranée=au sud'),
        ('ge-pay-n3-a','GEO.PAYSAGES',3,'tri','faire du ski=à la montagne;se baigner dans la mer=au bord de mer;visiter une ferme=à la campagne'),
        ('ge-con-n4-b','GEO.CONSOMMER',4,'texte','court')
    ) AS t(cle, competence, niveau, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.qm_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'qm_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table qm_item GEO (% items, couverture + spot) : OK', n;
END $$;

-- ===========================================================================
-- 2. verif_qm : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    IF NOT public.verif_qm('ge-fra-n1-a','la Seine') THEN RAISE EXCEPTION 'qcm juste refuse'; END IF;
    IF NOT public.verif_qm('ge-fra-n1-a','La Seine') THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    IF public.verif_qm('ge-fra-n1-a','la Loire') THEN RAISE EXCEPTION 'qcm mauvaise reponse acceptee'; END IF;
    IF NOT public.verif_qm('ge-fra-n2-a','la Loire=un fleuve;la Garonne=un fleuve;les Pyrénées=une montagne;le Massif central=une montagne') THEN RAISE EXCEPTION 'tri juste refuse'; END IF;
    IF public.verif_qm('ge-fra-n2-a','la Loire=une montagne;la Garonne=un fleuve;les Pyrénées=une montagne;le Massif central=une montagne') THEN RAISE EXCEPTION 'tri faux accepte'; END IF;
    IF NOT public.verif_qm('ge-pay-n4-a','forêt') THEN RAISE EXCEPTION 'texte juste refuse'; END IF;
    IF NOT public.verif_qm('ge-pay-n4-a','Forêt') THEN RAISE EXCEPTION 'texte casse KO'; END IF;
    IF public.verif_qm('ge-pay-n4-a','foret') THEN RAISE EXCEPTION 'texte accent non exige'; END IF;
    IF public.verif_qm('cle-bidon','x') THEN RAISE EXCEPTION 'item absent accepte'; END IF;
    RAISE NOTICE 'verif_qm GEO : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='qm' elargi a GEO.%) : verdict + coherence + RLS
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

-- 3a. Bonne reponse ACCEPTEE (QCM « la Seine », GEO.FRANCE N1).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'GEO.FRANCE', NULL, 1, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ge-fra-n1-a', NULL, 'seance', 'la Seine', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'GEO « la Seine » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'GEO.FRANCE', NULL, 1, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ge-fra-n1-a', NULL, 'seance', 'la Loire', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'GEO « la Loire » devrait etre faux : %', v;
    END IF;
END $$;

-- 3c. Reponse « tri » ACCEPTEE (GEO.FRANCE N2).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'GEO.FRANCE', NULL, 2, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ge-fra-n2-a', NULL, 'seance', 'la Loire=un fleuve;la Garonne=un fleuve;les Pyrénées=une montagne;le Massif central=une montagne', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'GEO tri devrait etre juste : %', v;
    END IF;
END $$;

-- 3d. Competence interdite (op='qm' sur une competence de maths) REJETEE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.TABLEAU', NULL, 1, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ge-fra-n1-a', NULL, 'seance', 'la Seine', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'GEO.FRANCE', NULL, 1, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'cle-bidon', NULL, 'seance', 'la Seine', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'GEO.FRANCE', NULL, 2, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ge-fra-n1-a', NULL, 'seance', 'la Seine', NULL);
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
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'GEO.FRANCE', NULL, 1, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ge-fra-n1-a', NULL, 'seance', 'la Seine', NULL);
    RAISE EXCEPTION 'acces a un autre foyer aurait du etre refuse';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%acces_refuse%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu acces_refuse) : %', SQLERRM;
    END IF;
END $$;

RESET ROLE;

-- ===========================================================================
-- 4. Activation : matiere GEO + 6 domaines actifs pour TOUS les profils.
-- ===========================================================================
DO $$
DECLARE n integer; d text;
BEGIN
    SELECT count(*) INTO n FROM public.profils WHERE NOT ('GEO' = ANY (matieres_actives));
    IF n <> 0 THEN RAISE EXCEPTION 'GEO devrait etre active pour TOUS les profils, manque dans %', n; END IF;
    FOREACH d IN ARRAY ARRAY['se_reperer','habiter','travail_loisirs','consommer','france_reperes','paysages']
    LOOP
        SELECT count(*) INTO n FROM public.profils WHERE NOT (d = ANY (domaines_actifs));
        IF n <> 0 THEN RAISE EXCEPTION 'domaine % devrait etre actif pour TOUS les profils, manque dans %', d, n; END IF;
    END LOOP;
    RAISE NOTICE 'matiere GEO + 6 domaines actifs pour tous les profils : OK';
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
                             'se_reperer','habiter','travail_loisirs','consommer',
                             'france_reperes','paysages']
    LOOP
        IF NOT (d = ANY (v_cur)) THEN
            RAISE EXCEPTION 'DEFAUT domaines_actifs incomplet : % manquant', d;
        END IF;
    END LOOP;
    RAISE NOTICE 'DEFAUT domaines_actifs complet (historique + GEO) : OK';
END $$;

ROLLBACK;
