-- qm_test.sql
-- « Questionner le monde » (migration 0052). Transaction ROLLBACK : aucune
-- donnee de test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre :
--   * la table de reference public.qm_item contient EXACTEMENT les memes items
--     que le front (48 lignes ; couverture 6 competences x 4 niveaux ; spot
--     check) : TEST CROISE avec le golden vitest (domain/qm/qm.test.ts) ;
--   * verif_qm : bonne reponse acceptee, mauvaise refusee, accents EXIGES
--     (texte), tolerance casse (qcm), comparaison structurelle (ordre / tri),
--     item absent ;
--   * enregistrer_reponse(op='qm') : verdict serveur, competence interdite,
--     item inexistant, niveau incoherent, autre foyer refuse ;
--   * garde-fou (>= 1 sous-matiere jouable) : vivant est un domaine valide ;
--     un reglage qui ne laisse rien a jouer est refuse ;
--   * la matiere QM + le domaine vivant sont actifs pour TOUS les profils (Iris).

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 48 items, couverture complete + spot check (front==SQL)
-- ===========================================================================
DO $$
DECLARE
    r record;
    got text;
    n   integer;
    attendu_n integer;
BEGIN
    -- Comptage auto-echelonne : chaque competence QM porte 8 items (4 niveaux x 2).
    SELECT count(*) INTO n FROM public.qm_item;
    SELECT count(*) * 8 INTO attendu_n FROM public.competences WHERE matiere = 'QM';
    IF n <> attendu_n THEN
        RAISE EXCEPTION 'qm_item : % items attendus (8 par competence QM), obtenu %', attendu_n, n;
    END IF;

    -- Couverture : chaque competence QM a au moins un item a chaque niveau 1..4.
    FOR r IN SELECT c.code AS competence, nv AS niveau
               FROM public.competences c, generate_series(1,4) AS nv
              WHERE c.matiere = 'QM'
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.qm_item
                        WHERE competence = r.competence AND niveau = r.niveau) THEN
            RAISE EXCEPTION 'qm_item : aucun item pour % N%', r.competence, r.niveau;
        END IF;
    END LOOP;

    -- Spot check (miroir EXACT du front, domain/qm/qm.test.ts).
    FOR r IN SELECT * FROM (VALUES
        ('qm-viv-car-n1-a','QM.VIVANT.CARACTERISTIQUES',1,'qcm','un chat'),
        ('qm-viv-car-n2-b','QM.VIVANT.CARACTERISTIQUES',2,'tri','un arbre=vivant;une voiture=non vivant;un poisson=vivant;un caillou=non vivant'),
        ('qm-viv-cyc-n2-b','QM.VIVANT.CYCLES',2,'ordre','l''œuf>le têtard>la grenouille'),
        ('qm-viv-cyc-n3-a','QM.VIVANT.CYCLES',3,'ordre','l''œuf>la chenille>la chrysalide>le papillon'),
        ('qm-viv-cha-n2-a','QM.VIVANT.CHAINES',2,'tri','la vache=herbivore;le loup=carnivore;le lapin=herbivore;le renard=carnivore'),
        ('qm-viv-cha-n3-a','QM.VIVANT.CHAINES',3,'ordre','l''herbe>le lapin>le renard'),
        ('qm-viv-pla-n4-b','QM.VIVANT.PLANTES',4,'texte','racines'),
        ('qm-viv-cor-n4-b','QM.VIVANT.CORPS',4,'texte','squelette'),
        ('qm-viv-hyg-n4-a','QM.VIVANT.HYGIENE',4,'texte','légumes'),
        ('qm-mat-eta-n3-a','QM.MATIERE.ETATS',3,'tri','le bois=solide;l''eau=liquide;l''air=gaz'),
        ('qm-mat-eau-n4-b','QM.MATIERE.EAU',4,'ordre','la glace>l''eau liquide>la vapeur'),
        ('qm-mat-mel-n2-a','QM.MATIERE.MELANGES',2,'tri','le sucre=se dissout;le sel=se dissout;le sable=ne se dissout pas;l''huile=ne se dissout pas'),
        ('qm-mat-air-n4-b','QM.MATIERE.AIR',4,'texte','vent'),
        ('qm-obj-cir-n1-a','QM.OBJETS.CIRCUIT',1,'qcm','oui'),
        ('qm-obj-cir-n2-a','QM.OBJETS.CIRCUIT',2,'clic','l''interrupteur'),
        ('qm-obj-fon-n2-a','QM.OBJETS.FONCTIONS',2,'tri','le stylo=pour écrire;le couteau=pour couper;la fourchette=pour manger'),
        ('qm-obj-lev-n4-b','QM.OBJETS.LEVIERS',4,'texte','levier'),
        ('qm-esp-pla-n2-a','QM.ESPACE.PLANETE',2,'clic','l''Afrique'),
        ('qm-esp-car-n2-a','QM.ESPACE.CARDINAUX',2,'clic','le nord'),
        ('qm-esp-pay-n2-a','QM.ESPACE.PAYSAGES',2,'tri','beaucoup d''immeubles=la ville;des champs=la campagne;beaucoup de voitures=la ville;des vaches dans un pré=la campagne'),
        ('qm-esp-fra-n4-a','QM.ESPACE.FRANCE',4,'texte','Paris')
    ) AS t(cle, competence, niveau, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.qm_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'qm_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table qm_item (% items, couverture + spot) : OK', n;
END $$;

-- ===========================================================================
-- 2. verif_qm : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    -- QCM : casse ignoree, accents gardes.
    IF NOT public.verif_qm('qm-viv-car-n1-a','un chat')      THEN RAISE EXCEPTION 'qcm juste refuse : un chat'; END IF;
    IF NOT public.verif_qm('qm-viv-car-n1-a','Un Chat')      THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    IF public.verif_qm('qm-viv-car-n1-a','un caillou')       THEN RAISE EXCEPTION 'qcm mauvaise reponse acceptee'; END IF;
    -- ORDRE : comparaison structurelle (espaces ignores, ordre strict).
    IF NOT public.verif_qm('qm-viv-cyc-n2-b','l''œuf>le têtard>la grenouille') THEN RAISE EXCEPTION 'ordre juste refuse'; END IF;
    IF NOT public.verif_qm('qm-viv-cyc-n2-b','l''œuf > le têtard > la grenouille') THEN RAISE EXCEPTION 'ordre espaces KO'; END IF;
    IF public.verif_qm('qm-viv-cyc-n2-b','la grenouille>le têtard>l''œuf') THEN RAISE EXCEPTION 'ordre inverse accepte'; END IF;
    -- TRI : comparaison structurelle.
    IF NOT public.verif_qm('qm-viv-cha-n2-a','la vache=herbivore;le loup=carnivore;le lapin=herbivore;le renard=carnivore') THEN RAISE EXCEPTION 'tri juste refuse'; END IF;
    IF public.verif_qm('qm-viv-cha-n2-a','la vache=carnivore;le loup=carnivore;le lapin=herbivore;le renard=carnivore') THEN RAISE EXCEPTION 'tri faux accepte'; END IF;
    -- TEXTE : accents EXIGES.
    IF NOT public.verif_qm('qm-viv-hyg-n4-a','légumes')      THEN RAISE EXCEPTION 'texte juste refuse : légumes'; END IF;
    IF NOT public.verif_qm('qm-viv-hyg-n4-a','Légumes')      THEN RAISE EXCEPTION 'texte casse KO'; END IF;
    IF public.verif_qm('qm-viv-hyg-n4-a','legumes')          THEN RAISE EXCEPTION 'texte accent non exige'; END IF;
    -- Item absent.
    IF public.verif_qm('cle-bidon','x')                      THEN RAISE EXCEPTION 'item absent accepte'; END IF;
    RAISE NOTICE 'verif_qm : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='qm') : verdict + coherence + RLS
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'qma@example.test', now()),
    (:'uB', 'qmb@example.test', now());
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

-- 3a. Bonne reponse ACCEPTEE (QCM « un chat », QM.VIVANT.CARACTERISTIQUES N1).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'QM.VIVANT.CARACTERISTIQUES', NULL, 1, 'questionner_monde',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'qm-viv-car-n1-a', NULL, 'seance', 'un chat', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'qm « un chat » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'QM.VIVANT.CARACTERISTIQUES', NULL, 1, 'questionner_monde',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'qm-viv-car-n1-a', NULL, 'seance', 'un caillou', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'qm « un caillou » devrait etre faux : %', v;
    END IF;
END $$;

-- 3c. Reponse « ordre » ACCEPTEE (QM.VIVANT.CYCLES N2).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'QM.VIVANT.CYCLES', NULL, 2, 'questionner_monde',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'qm-viv-cyc-n2-b', NULL, 'seance', 'l''œuf>le têtard>la grenouille', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'qm ordre devrait etre juste : %', v;
    END IF;
END $$;

-- 3d. Competence interdite (op='qm' sur une competence de maths) REJETEE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.TABLEAU', NULL, 1, 'questionner_monde',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'qm-viv-car-n1-a', NULL, 'seance', 'un chat', NULL);
    RAISE EXCEPTION 'competence interdite aurait du etre rejetee';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3e. Item inexistant REJETE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'QM.VIVANT.CARACTERISTIQUES', NULL, 1, 'questionner_monde',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'cle-bidon', NULL, 'seance', 'un chat', NULL);
    RAISE EXCEPTION 'item inexistant aurait du etre rejete';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3f. Niveau incoherent avec l'item REJETE (item N1 envoye en N2).
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'QM.VIVANT.CARACTERISTIQUES', NULL, 2, 'questionner_monde',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'qm-viv-car-n1-a', NULL, 'seance', 'un chat', NULL);
    RAISE EXCEPTION 'niveau incoherent aurait du etre rejete';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3g. Acces a un profil d'un AUTRE foyer REFUSE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'QM.VIVANT.CARACTERISTIQUES', NULL, 1, 'questionner_monde',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'qm-viv-car-n1-a', NULL, 'seance', 'un chat', NULL);
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

-- 4a. QM + vivant seul -> accepte (une competence QM.VIVANT.* est jouable).
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000001-0000-0000-0000-000000000000'::uuid,
        ARRAY['QM']::text[], ARRAY['vivant']::text[]);
    IF NOT EXISTS (SELECT 1 FROM public.profils
                    WHERE id = 'a0000001-0000-0000-0000-000000000000'
                      AND 'vivant' = ANY (domaines_actifs)
                      AND 'QM' = ANY (matieres_actives)) THEN
        RAISE EXCEPTION 'QM + vivant auraient du etre actifs';
    END IF;
    RAISE NOTICE 'regler_matieres QM+vivant : OK';
END $$;

-- 4b. MA actif mais seul le domaine vivant actif -> AUCUNE sous-matiere jouable
--     (MA n'a pas de competence domaine vivant) -> refuse.
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000001-0000-0000-0000-000000000000'::uuid,
        ARRAY['MA']::text[], ARRAY['vivant']::text[]);
    RAISE EXCEPTION 'un reglage sans sous-matiere jouable aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%aucune_sous_matiere%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu aucune_sous_matiere_active) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

-- ===========================================================================
-- 5. Iris : la migration a bien ajoute la matiere QM et le domaine vivant a
--    TOUS les profils (mecanisme d'ajout aux profils existants).
-- ===========================================================================
DO $$
DECLARE n integer;
BEGIN
    SELECT count(*) INTO n FROM public.profils WHERE NOT ('vivant' = ANY (domaines_actifs));
    IF n <> 0 THEN
        RAISE EXCEPTION 'vivant devrait etre actif pour TOUS les profils, manque dans %', n;
    END IF;
    SELECT count(*) INTO n FROM public.profils WHERE NOT ('QM' = ANY (matieres_actives));
    IF n <> 0 THEN
        RAISE EXCEPTION 'QM devrait etre active pour TOUS les profils, manque dans %', n;
    END IF;
    RAISE NOTICE 'matiere QM + domaine vivant actifs pour tous les profils : OK';
END $$;

ROLLBACK;
