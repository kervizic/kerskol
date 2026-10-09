-- geographie_test.sql
-- « Geographie » (GEO, NOUVEAU PROGRAMME 2026, migrations 0100 puis 0104).
-- Transaction ROLLBACK : aucune donnee de test ne subsiste. Execution :
-- deploy/test-db.sh.
--
-- Couvre : la table de reference public.qm_item (4 competences ACTIVES x 4
-- niveaux x 2 items + spot-check CROISE avec le golden vitest
-- frontend/src/domain/geographie/geographie.test.ts) ; la DESACTIVATION propre
-- des anciennes competences (donnees conservees) ; verif_qm ;
-- enregistrer_reponse (op='qm' elargi a GEO.%) ; activation (matiere GEO + 4
-- nouveaux domaines) ; completude du DEFAUT.

BEGIN;

-- ===========================================================================
-- 1. Competences actives (nouveau programme) + anciennes desactivees.
-- ===========================================================================
DO $$
DECLARE r record; got text; n integer;
BEGIN
    FOR r IN SELECT unnest(ARRAY['GEO.NOURRIR','GEO.INEGALITES','GEO.DEPLACER','GEO.COMMUNIQUER']) AS code
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.competences WHERE code = r.code AND actif) THEN
            RAISE EXCEPTION 'competence active attendue manquante : %', r.code;
        END IF;
        -- AU MOINS 8 items (les 8 d'entrainement libre de 0104). Depuis 0110, le
        -- Parcours de Geographie AJOUTE des items (cles « pg-* ») aux memes
        -- competences : le total peut depasser 8. On verifie le socle, pas un total exact.
        SELECT count(*) INTO n FROM public.qm_item WHERE competence = r.code;
        IF n < 8 THEN RAISE EXCEPTION 'qm_item : au moins 8 items attendus pour %, obtenu %', r.code, n; END IF;
        FOR n IN 1..4 LOOP
            IF NOT EXISTS (SELECT 1 FROM public.qm_item WHERE competence = r.code AND niveau = n) THEN
                RAISE EXCEPTION 'qm_item : aucun item pour % N%', r.code, n;
            END IF;
        END LOOP;
    END LOOP;

    FOR r IN SELECT unnest(ARRAY['GEO.REPERES','GEO.HABITER','GEO.ACTIVITES',
                                 'GEO.CONSOMMER','GEO.FRANCE','GEO.PAYSAGES']) AS code
    LOOP
        IF EXISTS (SELECT 1 FROM public.competences WHERE code = r.code AND actif) THEN
            RAISE EXCEPTION 'ancienne competence % devrait etre desactivee (actif=false)', r.code;
        END IF;
        SELECT count(*) INTO n FROM public.qm_item WHERE competence = r.code;
        IF n = 0 THEN RAISE EXCEPTION 'donnees perdues : plus aucun item pour l''ancienne competence %', r.code; END IF;
    END LOOP;

    FOR r IN SELECT * FROM (VALUES
        ('ge-nou-n2-b','tri','le blé=l''agriculture;les légumes=l''agriculture;le lait=l''élevage;le poisson=la pêche'),
        ('ge-nou-n4-a','texte','céréales'),
        ('ge-ine-n2-b','tri','l''eau potable=un besoin essentiel;aller à l''école=un besoin essentiel;voir un médecin=un besoin essentiel;un jeu vidéo=un loisir'),
        ('ge-ine-n4-a','texte','planisphère'),
        ('ge-dep-n2-a','tri','le train=sur terre;la voiture=sur terre;le bateau=sur l''eau;l''avion=dans les airs'),
        ('ge-dep-n4-b','texte','kilomètres'),
        ('ge-com-n2-a','qcm','câbles'),
        ('ge-com-n3-a','tri','envoyer un message=communiquer;faire un appel vidéo=communiquer;lire les informations=s''informer;chercher sur une carte=s''informer'),
        ('ge-com-n3-b','qcm','accès'),
        ('ge-com-n4-b','texte','données')
    ) AS t(cle, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.qm_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'qm_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table qm_item GEO (nouveau programme : couverture + desactivation + spot) : OK';
END $$;

-- ===========================================================================
-- 2. verif_qm : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    IF NOT public.verif_qm('ge-com-n1-a','Internet') THEN RAISE EXCEPTION 'qcm juste refuse'; END IF;
    IF NOT public.verif_qm('ge-com-n1-a','internet') THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    IF public.verif_qm('ge-com-n1-a','le marché') THEN RAISE EXCEPTION 'qcm mauvaise reponse acceptee'; END IF;
    IF NOT public.verif_qm('ge-dep-n2-a','le train=sur terre;la voiture=sur terre;le bateau=sur l''eau;l''avion=dans les airs') THEN RAISE EXCEPTION 'tri juste refuse'; END IF;
    IF NOT public.verif_qm('ge-dep-n2-a','le train = sur terre; la voiture = sur terre; le bateau = sur l''eau; l''avion = dans les airs') THEN RAISE EXCEPTION 'tri espaces KO'; END IF;
    IF public.verif_qm('ge-dep-n2-a','le train=dans les airs;la voiture=sur terre;le bateau=sur l''eau;l''avion=sur terre') THEN RAISE EXCEPTION 'tri faux accepte'; END IF;
    IF NOT public.verif_qm('ge-nou-n4-a','céréales') THEN RAISE EXCEPTION 'texte juste refuse'; END IF;
    IF NOT public.verif_qm('ge-nou-n4-a','Céréales') THEN RAISE EXCEPTION 'texte casse KO'; END IF;
    IF public.verif_qm('ge-nou-n4-a','cereales') THEN RAISE EXCEPTION 'texte accent non exige'; END IF;
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

-- 3a. Bonne reponse ACCEPTEE (QCM, GEO.COMMUNIQUER N1).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'GEO.COMMUNIQUER', NULL, 1, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ge-com-n1-a', NULL, 'seance', 'Internet', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'GEO « Internet » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'GEO.COMMUNIQUER', NULL, 1, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ge-com-n1-a', NULL, 'seance', 'le marché', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'GEO « le marché » devrait etre faux : %', v;
    END IF;
END $$;

-- 3c. Reponse « tri » ACCEPTEE (GEO.DEPLACER N2).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'GEO.DEPLACER', NULL, 2, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ge-dep-n2-a', NULL, 'seance', 'le train=sur terre;la voiture=sur terre;le bateau=sur l''eau;l''avion=dans les airs', NULL);
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
        'ge-com-n1-a', NULL, 'seance', 'Internet', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'GEO.COMMUNIQUER', NULL, 1, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'cle-bidon', NULL, 'seance', 'Internet', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'GEO.COMMUNIQUER', NULL, 2, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ge-com-n1-a', NULL, 'seance', 'Internet', NULL);
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
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'GEO.COMMUNIQUER', NULL, 1, 'geographie',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'ge-com-n1-a', NULL, 'seance', 'Internet', NULL);
    RAISE EXCEPTION 'acces a un autre foyer aurait du etre refuse';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%acces_refuse%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu acces_refuse) : %', SQLERRM;
    END IF;
END $$;

RESET ROLE;

-- ===========================================================================
-- 4. Activation : matiere GEO + 4 nouveaux domaines actifs pour TOUS les profils.
-- ===========================================================================
DO $$
DECLARE n integer; d text;
BEGIN
    SELECT count(*) INTO n FROM public.profils WHERE NOT ('GEO' = ANY (matieres_actives));
    IF n <> 0 THEN RAISE EXCEPTION 'GEO devrait etre active pour TOUS les profils, manque dans %', n; END IF;
    FOREACH d IN ARRAY ARRAY['se_nourrir','inegalites','se_deplacer','communiquer']
    LOOP
        SELECT count(*) INTO n FROM public.profils WHERE NOT (d = ANY (domaines_actifs));
        IF n <> 0 THEN RAISE EXCEPTION 'domaine % devrait etre actif pour TOUS les profils, manque dans %', d, n; END IF;
    END LOOP;
    RAISE NOTICE 'matiere GEO + 4 domaines (nouveau programme) actifs pour tous les profils : OK';
END $$;

-- ===========================================================================
-- 5. Completude du DEFAUT : domaines historiques + nouveaux domaines GEO
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
                             'se_reperer','habiter','paysages',
                             'se_nourrir','inegalites','se_deplacer','communiquer']
    LOOP
        IF NOT (d = ANY (v_cur)) THEN
            RAISE EXCEPTION 'DEFAUT domaines_actifs incomplet : % manquant', d;
        END IF;
    END LOOP;
    RAISE NOTICE 'DEFAUT domaines_actifs complet (historique + GEO nouveau programme) : OK';
END $$;

ROLLBACK;
