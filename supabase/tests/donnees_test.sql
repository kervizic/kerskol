-- donnees_test.sql
-- Tableaux et graphiques (migration 0044). Transaction ROLLBACK : aucune donnee
-- de test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre :
--   * la table de reference public.donnees_item contient EXACTEMENT les memes
--     items que le front (56 lignes ; couverture 7 competences x 4 niveaux ;
--     spot check) : TEST CROISE avec le golden vitest
--     (frontend/.../donnees/donnees.test.ts) ;
--   * verif_donnees : bonne reponse acceptee, mauvaise refusee, accents EXIGES
--     (texte / clic), tolerance casse, normalisation qcm vs grille, item absent ;
--   * enregistrer_reponse(op='don') : verdict serveur, competence interdite,
--     item inexistant, niveau incoherent, autre foyer refuse ;
--   * garde-fou (>= 1 sous-matiere jouable) : donnees est un domaine valide ;
--     un reglage qui ne laisse rien a jouer est refuse.

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 40 items, couverture complete + spot check (front==SQL)
-- ===========================================================================
DO $$
DECLARE
    r record;
    got text;
    n   integer;
BEGIN
    SELECT count(*) INTO n FROM public.donnees_item;
    IF n <> 56 THEN
        RAISE EXCEPTION 'donnees_item : 56 items attendus, obtenu %', n;
    END IF;

    -- Couverture : chaque competence a au moins un item a chaque niveau 1..4.
    FOR r IN SELECT c AS competence, nv AS niveau
               FROM unnest(ARRAY['MA.DONNEES.TABLEAU','MA.DONNEES.COMPLETER','MA.DONNEES.BARRES',
                    'MA.DONNEES.PICTOGRAMME','MA.DONNEES.COMPARER',
                    'MA.DONNEES.LIRE_CM1','MA.DONNEES.HASARD']) AS c,
                    generate_series(1,4) AS nv
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.donnees_item
                        WHERE competence = r.competence AND niveau = r.niveau) THEN
            RAISE EXCEPTION 'donnees_item : aucun item pour % N%', r.competence, r.niveau;
        END IF;
    END LOOP;

    -- Spot check (miroir exact du front).
    FOR r IN SELECT * FROM (VALUES
        ('don-tab-n1-a','MA.DONNEES.TABLEAU',1,'qcm','3'),
        ('don-tab-n2-a','MA.DONNEES.TABLEAU',2,'clic','Zoé'),
        ('don-comp-n2-a','MA.DONNEES.COMPLETER',2,'qcm','5'),
        ('don-bar-n2-b','MA.DONNEES.BARRES',2,'clic','vélo'),
        ('don-bar-n3-a','MA.DONNEES.BARRES',3,'grille','5'),
        ('don-pic-n3-a','MA.DONNEES.PICTOGRAMME',3,'clic','lapins'),
        ('don-pic-n4-b','MA.DONNEES.PICTOGRAMME',4,'texte','15'),
        ('don-cmp-n1-b','MA.DONNEES.COMPARER',1,'qcm','des poires'),
        ('don-cmp-n4-a','MA.DONNEES.COMPARER',4,'texte','3'),
        -- LOT 7 (CM1) : donnees et probabilites
        ('lire-cm1-n1-a','MA.DONNEES.LIRE_CM1',1,'qcm','24'),
        ('lire-cm1-n3-a','MA.DONNEES.LIRE_CM1',3,'qcm','8'),
        ('lire-cm1-n4-b','MA.DONNEES.LIRE_CM1',4,'texte','60'),
        ('has-n1-a','MA.DONNEES.HASARD',1,'qcm','possible'),
        ('has-n2-b','MA.DONNEES.HASARD',2,'qcm','impossible'),
        ('has-n3-a','MA.DONNEES.HASARD',3,'qcm','certain'),
        ('has-n4-a','MA.DONNEES.HASARD',4,'texte','impossible')
    ) AS t(cle, competence, niveau, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.donnees_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'donnees_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table donnees_item (40 + couverture + spot) : OK';
END $$;

-- ===========================================================================
-- 2. verif_donnees : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    -- QCM : casse ignoree (normaliser_lettres), accents gardes.
    IF NOT public.verif_donnees('don-cmp-n1-b','des poires')  THEN RAISE EXCEPTION 'juste refuse : des poires'; END IF;
    IF NOT public.verif_donnees('don-cmp-n1-b','Des Poires')  THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    IF public.verif_donnees('don-cmp-n1-b','des pommes')      THEN RAISE EXCEPTION 'mauvaise reponse acceptee'; END IF;
    -- CLIC (libelle) : tolerance casse, accents EXIGES.
    IF NOT public.verif_donnees('don-tab-n2-a','zoé')         THEN RAISE EXCEPTION 'clic casse KO (zoé)'; END IF;
    IF public.verif_donnees('don-tab-n2-a','zoe')             THEN RAISE EXCEPTION 'accent non exige : zoe'; END IF;
    IF public.verif_donnees('don-tab-n2-a','Tom')             THEN RAISE EXCEPTION 'mauvaise ligne acceptee'; END IF;
    -- TEXTE : nombre exact.
    IF NOT public.verif_donnees('don-pic-n4-b','15')          THEN RAISE EXCEPTION 'juste refuse : 15'; END IF;
    IF public.verif_donnees('don-pic-n4-b','10')              THEN RAISE EXCEPTION 'mauvais nombre accepte'; END IF;
    -- GRILLE (reglage barre) : espaces ignores.
    IF NOT public.verif_donnees('don-bar-n3-a','5')           THEN RAISE EXCEPTION 'grille juste refusee'; END IF;
    IF NOT public.verif_donnees('don-bar-n3-a',' 5 ')         THEN RAISE EXCEPTION 'grille espaces KO'; END IF;
    IF public.verif_donnees('don-bar-n3-a','6')               THEN RAISE EXCEPTION 'grille mauvaise hauteur acceptee'; END IF;
    -- Item absent.
    IF public.verif_donnees('cle-bidon','x')                  THEN RAISE EXCEPTION 'item absent accepte'; END IF;
    -- LOT 7 (CM1) : hasard (qcm, casse ignoree) et texte libre (N4).
    IF NOT public.verif_donnees('has-n2-a','impossible')      THEN RAISE EXCEPTION 'hasard juste refuse : impossible'; END IF;
    IF NOT public.verif_donnees('has-n2-a','Impossible')      THEN RAISE EXCEPTION 'hasard casse KO'; END IF;
    IF public.verif_donnees('has-n2-a','possible')            THEN RAISE EXCEPTION 'hasard mauvaise reponse acceptee'; END IF;
    IF NOT public.verif_donnees('has-n4-a','impossible')      THEN RAISE EXCEPTION 'hasard texte juste refuse'; END IF;
    IF NOT public.verif_donnees('lire-cm1-n4-b','60')         THEN RAISE EXCEPTION 'lire cm1 texte juste refuse : 60'; END IF;
    IF public.verif_donnees('lire-cm1-n4-b','40')             THEN RAISE EXCEPTION 'lire cm1 mauvais total accepte'; END IF;
    RAISE NOTICE 'verif_donnees : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='don') : verdict + coherence + RLS
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'dona@example.test', now()),
    (:'uB', 'donb@example.test', now());
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

-- 3a. Bonne reponse ACCEPTEE (QCM « 3 », MA.DONNEES.TABLEAU N1).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.TABLEAU', NULL, 1, 'donnees',
        'don', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'don-tab-n1-a', NULL, 'seance', '3', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'don « 3 » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.TABLEAU', NULL, 1, 'donnees',
        'don', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'don-tab-n1-a', NULL, 'seance', '8', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'don « 8 » devrait etre faux : %', v;
    END IF;
END $$;

-- 3c. Reponse « grille » (reglage barre) ACCEPTEE (MA.DONNEES.BARRES N3).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.BARRES', NULL, 3, 'donnees',
        'don', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'don-bar-n3-a', NULL, 'seance', '5', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'don reglage barre devrait etre juste : %', v;
    END IF;
END $$;

-- 3d. Competence interdite (op='don' sur une competence de francais) REJETEE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.GRAM.NATURE', NULL, 1, 'donnees',
        'don', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'don-tab-n1-a', NULL, 'seance', '3', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.TABLEAU', NULL, 1, 'donnees',
        'don', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'cle-bidon', NULL, 'seance', '3', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.TABLEAU', NULL, 2, 'donnees',
        'don', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'don-tab-n1-a', NULL, 'seance', '3', NULL);
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
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.TABLEAU', NULL, 1, 'donnees',
        'don', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'don-tab-n1-a', NULL, 'seance', '3', NULL);
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

-- 4a. donnees est un domaine VALIDE : MA + donnees seul -> accepte.
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000001-0000-0000-0000-000000000000'::uuid,
        ARRAY['MA']::text[], ARRAY['donnees']::text[]);
    IF NOT EXISTS (SELECT 1 FROM public.profils
                    WHERE id = 'a0000001-0000-0000-0000-000000000000'
                      AND 'donnees' = ANY (domaines_actifs)) THEN
        RAISE EXCEPTION 'donnees aurait du etre active';
    END IF;
    RAISE NOTICE 'regler_matieres MA+donnees : OK';
END $$;

-- 4b. MA eteint mais seul le domaine donnees actif cote FR -> AUCUNE
--     sous-matiere jouable -> refuse.
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000001-0000-0000-0000-000000000000'::uuid,
        ARRAY['FR']::text[], ARRAY['donnees']::text[]);
    RAISE EXCEPTION 'un reglage sans sous-matiere jouable aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%aucune_sous_matiere%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu aucune_sous_matiere_active) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

-- ===========================================================================
-- 5. Iris : la migration a bien ajoute le domaine `donnees` a tous les profils.
--    (Verifie le mecanisme d'ajout aux profils existants, sans donnee reelle.)
-- ===========================================================================
DO $$
DECLARE n integer;
BEGIN
    SELECT count(*) INTO n FROM public.profils WHERE NOT ('donnees' = ANY (domaines_actifs));
    IF n <> 0 THEN
        RAISE EXCEPTION 'donnees devrait etre actif pour TOUS les profils, manque dans %', n;
    END IF;
    RAISE NOTICE 'domaine donnees actif pour tous les profils : OK';
END $$;

ROLLBACK;
