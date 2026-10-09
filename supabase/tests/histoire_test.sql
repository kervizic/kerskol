-- histoire_test.sql
-- « Histoire » (HIST, NOUVEAU PROGRAMME 2026, migrations 0099 puis 0103).
-- Transaction ROLLBACK : aucune donnee de test ne subsiste. Execution :
-- deploy/test-db.sh.
--
-- Couvre : la table de reference public.qm_item (5 competences ACTIVES x 4
-- niveaux x 2 items + spot-check CROISE avec le golden vitest
-- frontend/src/domain/histoire/histoire.test.ts) ; la DESACTIVATION propre des
-- anciennes competences (ancien programme, donnees conservees) ; verif_qm ;
-- enregistrer_reponse (op='qm' elargi a HIST.%) ; activation (matiere HIST + 3
-- nouveaux domaines actifs pour TOUS les profils) ; completude du DEFAUT.

BEGIN;

-- ===========================================================================
-- 1. Competences actives (nouveau programme) + anciennes desactivees.
-- ===========================================================================
DO $$
DECLARE r record; got text; n integer;
BEGIN
    -- Les 5 competences actives correspondent exactement au nouveau programme.
    FOR r IN SELECT unnest(ARRAY['HIST.MOYENAGE','HIST.MONARCHIE','HIST.EXPLORATIONS',
                                 'HIST.REVOLUTION','HIST.FRISE']) AS code
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.competences WHERE code = r.code AND actif) THEN
            RAISE EXCEPTION 'competence active attendue manquante : %', r.code;
        END IF;
        -- AU MOINS 8 items par competence active (les 8 items d'entrainement libre
        -- de 0103), couverture des 4 niveaux. Depuis 0107, le Parcours d'Histoire
        -- AJOUTE des items (cles « pa-* ») aux memes competences : le total peut
        -- donc depasser 8. On verifie la presence du socle, pas un total exact.
        SELECT count(*) INTO n FROM public.qm_item WHERE competence = r.code;
        IF n < 8 THEN RAISE EXCEPTION 'qm_item : au moins 8 items attendus pour %, obtenu %', r.code, n; END IF;
        FOR n IN 1..4 LOOP
            IF NOT EXISTS (SELECT 1 FROM public.qm_item WHERE competence = r.code AND niveau = n) THEN
                RAISE EXCEPTION 'qm_item : aucun item pour % N%', r.code, n;
            END IF;
        END LOOP;
    END LOOP;

    -- Les anciennes competences (ancien programme) sont DESACTIVEES mais leurs
    -- donnees (items) restent en base : AUCUNE perte.
    FOR r IN SELECT unnest(ARRAY['HIST.TRACES','HIST.GALLOROMAINS','HIST.ROIS','HIST.MONUMENTS']) AS code
    LOOP
        IF EXISTS (SELECT 1 FROM public.competences WHERE code = r.code AND actif) THEN
            RAISE EXCEPTION 'ancienne competence % devrait etre desactivee (actif=false)', r.code;
        END IF;
        SELECT count(*) INTO n FROM public.qm_item WHERE competence = r.code;
        IF n = 0 THEN RAISE EXCEPTION 'donnees perdues : plus aucun item pour l''ancienne competence %', r.code; END IF;
    END LOOP;

    -- Spot-check croise front <-> SQL (memes triplets des deux cotes).
    FOR r IN SELECT * FROM (VALUES
        ('hi-moy-n2-b','tri','l''abbaye=l''Église;la cathédrale=l''Église;le château fort=le seigneur;le donjon=le seigneur'),
        ('hi-moy-n3-b','tri','des murs épais et de petites fenêtres=art roman;des arcs ronds (plein cintre)=art roman;de grandes fenêtres avec des vitraux=art gothique;des arcs en pointe (ogives)=art gothique'),
        ('hi-nar-n2-b','tri','les prêtres et les évêques=le clergé;les seigneurs et les grands nobles=la noblesse;les paysans, les artisans et les bourgeois=le tiers état'),
        ('hi-nar-n3-b','ordre','François Ier>Henri IV>Louis XIV'),
        ('hi-exp-n2-b','ordre','de l''Europe vers l''Afrique>de l''Afrique vers l''Amérique>de l''Amérique vers l''Europe'),
        ('hi-exp-n3-a','qcm','la traite des esclaves'),
        ('hi-exp-n3-b','qcm','le Code noir'),
        ('hi-rev-n3-b','ordre','la réunion des États généraux>la prise de la Bastille>la Déclaration des droits de l''Homme et du citoyen'),
        ('hi-fri-n3-a','qcm','XVIe siècle'),
        ('hi-fri-n4-b','texte','XVI')
    ) AS t(cle, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.qm_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'qm_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table qm_item HIST (nouveau programme : couverture + desactivation + spot) : OK';
END $$;

-- ===========================================================================
-- 2. verif_qm : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    IF NOT public.verif_qm('hi-nar-n1-a','François Ier') THEN RAISE EXCEPTION 'qcm juste refuse'; END IF;
    IF NOT public.verif_qm('hi-nar-n1-a','françois ier') THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    IF public.verif_qm('hi-nar-n1-a','Astérix') THEN RAISE EXCEPTION 'qcm mauvaise reponse acceptee'; END IF;
    IF NOT public.verif_qm('hi-nar-n3-b','François Ier>Henri IV>Louis XIV') THEN RAISE EXCEPTION 'ordre juste refuse'; END IF;
    IF NOT public.verif_qm('hi-nar-n3-b','François Ier > Henri IV > Louis XIV') THEN RAISE EXCEPTION 'ordre espaces KO'; END IF;
    IF public.verif_qm('hi-nar-n3-b','Louis XIV>Henri IV>François Ier') THEN RAISE EXCEPTION 'ordre inverse accepte'; END IF;
    IF NOT public.verif_qm('hi-moy-n2-b','l''abbaye=l''Église;la cathédrale=l''Église;le château fort=le seigneur;le donjon=le seigneur') THEN RAISE EXCEPTION 'tri juste refuse'; END IF;
    IF public.verif_qm('hi-moy-n2-b','l''abbaye=le seigneur;la cathédrale=l''Église;le château fort=l''Église;le donjon=le seigneur') THEN RAISE EXCEPTION 'tri faux accepte'; END IF;
    IF NOT public.verif_qm('hi-moy-n4-b','cathédrale') THEN RAISE EXCEPTION 'texte juste refuse'; END IF;
    IF NOT public.verif_qm('hi-moy-n4-b','Cathédrale') THEN RAISE EXCEPTION 'texte casse KO'; END IF;
    IF public.verif_qm('hi-moy-n4-b','cathedrale') THEN RAISE EXCEPTION 'texte accent non exige'; END IF;
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

-- 3a. Bonne reponse ACCEPTEE (QCM, HIST.MONARCHIE N1).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'HIST.MONARCHIE', NULL, 1, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'hi-nar-n1-a', NULL, 'seance', 'François Ier', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'HIST « François Ier » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'HIST.MONARCHIE', NULL, 1, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'hi-nar-n1-a', NULL, 'seance', 'Astérix', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'HIST « Astérix » devrait etre faux : %', v;
    END IF;
END $$;

-- 3c. Reponse « ordre » ACCEPTEE (HIST.MONARCHIE N3).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'HIST.MONARCHIE', NULL, 3, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'hi-nar-n3-b', NULL, 'seance', 'François Ier>Henri IV>Louis XIV', NULL);
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
        'hi-nar-n1-a', NULL, 'seance', 'François Ier', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'HIST.MONARCHIE', NULL, 1, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'cle-bidon', NULL, 'seance', 'François Ier', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'HIST.MONARCHIE', NULL, 2, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'hi-nar-n1-a', NULL, 'seance', 'François Ier', NULL);
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
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'HIST.MONARCHIE', NULL, 1, 'histoire',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'hi-nar-n1-a', NULL, 'seance', 'François Ier', NULL);
    RAISE EXCEPTION 'acces a un autre foyer aurait du etre refuse';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%acces_refuse%' THEN
        RAISE EXCEPTION 'erreur inattendue (attendu acces_refuse) : %', SQLERRM;
    END IF;
END $$;

RESET ROLE;

-- ===========================================================================
-- 4. Activation : matiere HIST + 3 nouveaux domaines actifs pour TOUS les profils.
-- ===========================================================================
DO $$
DECLARE n integer; d text;
BEGIN
    SELECT count(*) INTO n FROM public.profils WHERE NOT ('HIST' = ANY (matieres_actives));
    IF n <> 0 THEN RAISE EXCEPTION 'HIST devrait etre active pour TOUS les profils, manque dans %', n; END IF;
    FOREACH d IN ARRAY ARRAY['moyen_age','monarchie','explorations','revolution','frise']
    LOOP
        SELECT count(*) INTO n FROM public.profils WHERE NOT (d = ANY (domaines_actifs));
        IF n <> 0 THEN RAISE EXCEPTION 'domaine % devrait etre actif pour TOUS les profils, manque dans %', d, n; END IF;
    END LOOP;
    RAISE NOTICE 'matiere HIST + 5 domaines (nouveau programme) actifs pour tous les profils : OK';
END $$;

-- ===========================================================================
-- 5. Completude du DEFAUT : les domaines historiques, ST ET les nouveaux
--    domaines HIST sont dans le DEFAUT de profils.domaines_actifs (non-regression
--    de 0073 / 0099 : on ne retire JAMAIS un domaine du defaut).
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
                             'moyen_age','frise','monarchie','explorations','revolution']
    LOOP
        IF NOT (d = ANY (v_cur)) THEN
            RAISE EXCEPTION 'DEFAUT domaines_actifs incomplet : % manquant', d;
        END IF;
    END LOOP;
    RAISE NOTICE 'DEFAUT domaines_actifs complet (historique + ST + HIST nouveau programme) : OK';
END $$;

ROLLBACK;
