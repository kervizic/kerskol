-- geometrie_test.sql
-- Geometrie et reperage (migration 0043). Transaction ROLLBACK : aucune donnee de
-- test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre :
--   * la table de reference public.geometrie_item contient EXACTEMENT les memes
--     items que le front (66 lignes ; couverture 7 competences x 4 niveaux ;
--     spot check) : TEST CROISE avec le golden vitest
--     (frontend/.../geometrie/geometrie.test.ts) ;
--   * verif_geo : bonne reponse acceptee, mauvaise refusee, accents EXIGES
--     (texte), tolerance casse, normalisation qcm vs grille (codes de cases),
--     item absent ;
--   * enregistrer_reponse(op='geo') : verdict serveur, competence interdite,
--     item inexistant, niveau incoherent, autre foyer refuse ;
--   * garde-fou (>= 1 sous-matiere jouable) : geometrie est un domaine valide ;
--     un reglage qui ne laisse rien a jouer est refuse.

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 66 items, couverture complete + spot check (front==SQL)
-- ===========================================================================
DO $$
DECLARE
    r record;
    got text;
    n   integer;
BEGIN
    SELECT count(*) INTO n FROM public.geometrie_item;
    IF n <> 76 THEN
        RAISE EXCEPTION 'geometrie_item : 76 items attendus, obtenu %', n;
    END IF;

    -- Couverture : chaque competence a au moins un item a chaque niveau 1..4
    -- (dont les deux nouvelles competences du lot 1).
    FOR r IN SELECT c AS competence, nv AS niveau
               FROM unnest(ARRAY['MA.GEO.FIGURES','MA.GEO.VOCABULAIRE','MA.GEO.SOLIDES',
                    'MA.GEO.SYMETRIE','MA.GEO.CONSTRUIRE','MA.REPERE.QUADRILLAGE',
                    'MA.REPERE.DEPLACEMENTS','MA.REPERE.PLAN','MA.REPERE.PROGRAMMER']) AS c,
                    generate_series(1,4) AS nv
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.geometrie_item
                        WHERE competence = r.competence AND niveau = r.niveau) THEN
            RAISE EXCEPTION 'geometrie_item : aucun item pour % N%', r.competence, r.niveau;
        END IF;
    END LOOP;

    -- Spot check (miroir exact du front).
    FOR r IN SELECT * FROM (VALUES
        ('geo-fig-n1-carre','MA.GEO.FIGURES',1,'qcm','un carré'),
        ('geo-fig-n3-pourquoi','MA.GEO.FIGURES',3,'qcm','ses côtés ne sont pas tous égaux'),
        ('geo-voc-n2-sommet','MA.GEO.VOCABULAIRE',2,'clic','B'),
        ('geo-sol-n4-cone','MA.GEO.SOLIDES',4,'texte','cône'),
        ('geo-sym-n3-a','MA.GEO.SYMETRIE',3,'grille','C2;C3;D1;D4'),
        ('geo-sym-n4-a','MA.GEO.SYMETRIE',4,'grille','D1;D2;D4;E3;F2'),
        ('geo-con-n3-rect53','MA.GEO.CONSTRUIRE',3,'construire','[[0,0],[5,0],[5,3],[0,3]]'),
        ('geo-prog-n1-a','MA.REPERE.PROGRAMMER',1,'clic','B3'),
        ('geo-prog-n3-a','MA.REPERE.PROGRAMMER',3,'programme','["avance","avance","droite","avance","avance"]'),
        ('geo-quad-n1-a','MA.REPERE.QUADRILLAGE',1,'qcm','B3'),
        ('geo-dep-n3-a','MA.REPERE.DEPLACEMENTS',3,'clic','C3'),
        ('geo-plan-n2-a','MA.REPERE.PLAN',2,'qcm','devant')
    ) AS t(cle, competence, niveau, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.geometrie_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'geometrie_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table geometrie_item (76 + couverture + spot) : OK';
END $$;

-- ===========================================================================
-- 2. verif_geo : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    -- QCM : casse ignoree (normaliser_lettres), accents gardes.
    IF NOT public.verif_geo('geo-fig-n1-carre','un carré')  THEN RAISE EXCEPTION 'juste refuse : un carré'; END IF;
    IF NOT public.verif_geo('geo-fig-n1-carre','Un Carré')  THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    IF public.verif_geo('geo-fig-n1-carre','un rectangle')  THEN RAISE EXCEPTION 'mauvaise reponse acceptee'; END IF;
    -- CLIC (code de case) : tolerance casse.
    IF NOT public.verif_geo('geo-quad-n2-a','b3')           THEN RAISE EXCEPTION 'clic casse KO (b3)'; END IF;
    IF public.verif_geo('geo-quad-n2-a','c3')               THEN RAISE EXCEPTION 'mauvaise case acceptee'; END IF;
    -- TEXTE : accents EXIGES.
    IF public.verif_geo('geo-sol-n4-cone','cone')           THEN RAISE EXCEPTION 'accent non exige : cone'; END IF;
    IF NOT public.verif_geo('geo-sol-n4-cone','cône')       THEN RAISE EXCEPTION 'juste refuse : cône'; END IF;
    -- GRILLE (liste de cases) : minuscule + espaces ignores, mais contenu exact.
    IF NOT public.verif_geo('geo-sym-n3-a','c2;c3;d1;d4')   THEN RAISE EXCEPTION 'grille juste refusee'; END IF;
    IF NOT public.verif_geo('geo-sym-n3-a','C2; C3; D1; D4') THEN RAISE EXCEPTION 'grille espaces KO'; END IF;
    IF public.verif_geo('geo-sym-n3-a','c2;c3;d1')          THEN RAISE EXCEPTION 'grille incomplete acceptee'; END IF;
    -- Item absent.
    IF public.verif_geo('cle-bidon','x')                    THEN RAISE EXCEPTION 'item absent accepte'; END IF;

    -- CONSTRUIRE (par proprietes) : rectangle 5x3, toute position/orientation.
    IF NOT public.verif_geo('geo-con-n3-rect53','[[0,0],[5,0],[5,3],[0,3]]') THEN RAISE EXCEPTION 'construire rect53 juste refuse'; END IF;
    IF NOT public.verif_geo('geo-con-n3-rect53','[[2,1],[7,1],[7,4],[2,4]]') THEN RAISE EXCEPTION 'construire rect53 translate refuse'; END IF;
    IF NOT public.verif_geo('geo-con-n3-rect53','[[0,0],[3,0],[3,5],[0,5]]') THEN RAISE EXCEPTION 'construire rect53 tourne refuse'; END IF;
    IF     public.verif_geo('geo-con-n3-rect53','[[0,0],[4,0],[4,3],[0,3]]') THEN RAISE EXCEPTION 'construire 4x3 accepte a tort'; END IF;
    IF     public.verif_geo('geo-con-n3-rect53','pas du json')               THEN RAISE EXCEPTION 'construire json invalide accepte'; END IF;
    IF NOT public.verif_geo('geo-con-n4-trirect','[[0,0],[3,0],[0,3]]')      THEN RAISE EXCEPTION 'trirect juste refuse'; END IF;
    IF     public.verif_geo('geo-con-n4-trirect','[[0,0],[3,0],[6,0]]')      THEN RAISE EXCEPTION 'trirect aplati accepte'; END IF;

    -- PROGRAMME (par simulation) : toute solution qui atteint la cible est acceptee.
    IF NOT public.verif_geo('geo-prog-n3-a','["avance","avance","droite","avance","avance"]')         THEN RAISE EXCEPTION 'programme solution refusee'; END IF;
    IF NOT public.verif_geo('geo-prog-n3-a','["droite","avance","avance","gauche","avance","avance"]') THEN RAISE EXCEPTION 'programme autre solution refusee'; END IF;
    IF     public.verif_geo('geo-prog-n3-a','["avance","avance"]')                                     THEN RAISE EXCEPTION 'programme rate accepte'; END IF;
    IF     public.verif_geo('geo-prog-n3-a','rien')                                                    THEN RAISE EXCEPTION 'programme json invalide accepte'; END IF;
    IF NOT public.verif_geo('geo-prog-n4-a','["avance","avance","avance","avance","droite","avance","avance","avance","avance"]') THEN RAISE EXCEPTION 'programme obstacles solution refusee'; END IF;

    RAISE NOTICE 'verif_geo (dont construire / programme) : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='geo') : verdict + coherence + RLS
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'geoa@example.test', now()),
    (:'uB', 'geob@example.test', now());
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

-- 3a. Bonne reponse ACCEPTEE (QCM « un carré », MA.GEO.FIGURES N1).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.GEO.FIGURES', NULL, 1, 'van_hiele',
        'geo', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'geo-fig-n1-carre', NULL, 'seance', 'un carré', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'geo « un carré » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.GEO.FIGURES', NULL, 1, 'van_hiele',
        'geo', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'geo-fig-n1-carre', NULL, 'seance', 'un triangle', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'geo « un triangle » devrait etre faux : %', v;
    END IF;
END $$;

-- 3c. Reponse « grille » (symetrie) ACCEPTEE (MA.GEO.SYMETRIE N3).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.GEO.SYMETRIE', NULL, 3, 'van_hiele',
        'geo', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'geo-sym-n3-a', NULL, 'seance', 'C2;C3;D1;D4', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'geo symetrie devrait etre juste : %', v;
    END IF;
END $$;

-- 3c-bis. CONSTRUIRE (MA.GEO.CONSTRUIRE N3) : rectangle 5x3 juste, 4x3 faux.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.GEO.CONSTRUIRE', NULL, 3, 'van_hiele',
        'geo', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'geo-con-n3-rect53', NULL, 'seance', '[[0,0],[5,0],[5,3],[0,3]]', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'construire rect 5x3 devrait etre juste : %', v;
    END IF;
END $$;
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.GEO.CONSTRUIRE', NULL, 3, 'van_hiele',
        'geo', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'geo-con-n3-rect53', NULL, 'seance', '[[0,0],[4,0],[4,3],[0,3]]', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'construire rect 4x3 devrait etre faux : %', v;
    END IF;
END $$;

-- 3c-ter. PROGRAMME (MA.REPERE.PROGRAMMER N3) : une solution atteint la cible.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.REPERE.PROGRAMMER', NULL, 3, 'spatial',
        'geo', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'geo-prog-n3-a', NULL, 'seance', '["avance","avance","droite","avance","avance"]', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'programme solution devrait etre juste : %', v;
    END IF;
END $$;
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.REPERE.PROGRAMMER', NULL, 3, 'spatial',
        'geo', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'geo-prog-n3-a', NULL, 'seance', '["avance","avance"]', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'programme rate devrait etre faux : %', v;
    END IF;
END $$;

-- 3d. Competence interdite (op='geo' sur une competence de francais) REJETEE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.GRAM.NATURE', NULL, 1, 'van_hiele',
        'geo', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'geo-fig-n1-carre', NULL, 'seance', 'un carré', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.GEO.FIGURES', NULL, 1, 'van_hiele',
        'geo', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'cle-bidon', NULL, 'seance', 'un carré', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.GEO.FIGURES', NULL, 2, 'van_hiele',
        'geo', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'geo-fig-n1-carre', NULL, 'seance', 'un carré', NULL);
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
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.GEO.FIGURES', NULL, 1, 'van_hiele',
        'geo', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'geo-fig-n1-carre', NULL, 'seance', 'un carré', NULL);
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

-- 4a. geometrie est un domaine VALIDE : MA + geometrie seul -> accepte.
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000001-0000-0000-0000-000000000000'::uuid,
        ARRAY['MA']::text[], ARRAY['geometrie']::text[]);
    IF NOT EXISTS (SELECT 1 FROM public.profils
                    WHERE id = 'a0000001-0000-0000-0000-000000000000'
                      AND 'geometrie' = ANY (domaines_actifs)) THEN
        RAISE EXCEPTION 'geometrie aurait du etre active';
    END IF;
    RAISE NOTICE 'regler_matieres MA+geometrie : OK';
END $$;

-- 4b. MA eteint mais seul le domaine geometrie actif cote FR -> AUCUNE
--     sous-matiere jouable -> refuse.
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000001-0000-0000-0000-000000000000'::uuid,
        ARRAY['FR']::text[], ARRAY['geometrie']::text[]);
    RAISE EXCEPTION 'un reglage sans sous-matiere jouable aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%aucune_sous_matiere%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu aucune_sous_matiere_active) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

ROLLBACK;
