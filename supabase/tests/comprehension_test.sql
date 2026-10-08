-- comprehension_test.sql
-- Comprendre un texte (migration 0045). Transaction ROLLBACK : aucune donnee de
-- test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre :
--   * la table de reference public.comprehension_item contient EXACTEMENT les
--     memes items que le front (192 lignes ; couverture 5 competences x 4 niveaux ;
--     spot check) : TEST CROISE avec le golden vitest
--     (frontend/.../francais/comprehension.test.ts) ;
--   * verif_comprehension : bonne reponse acceptee, mauvaise refusee, accents
--     EXIGES (texte / clic), tolerance casse, normalisation qcm vs ordre, item
--     absent ;
--   * enregistrer_reponse(op='lire') : verdict serveur, competence interdite,
--     item inexistant, niveau incoherent, autre foyer refuse ;
--   * garde-fou (>= 1 sous-matiere jouable) : lecture est un domaine valide ;
--     un reglage qui ne laisse rien a jouer est refuse ;
--   * la migration a bien ajoute le domaine `lecture` a tous les profils.

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 192 items, couverture complete + spot check (front==SQL)
-- ===========================================================================
DO $$
DECLARE
    r record;
    got text;
    n   integer;
BEGIN
    SELECT count(*) INTO n FROM public.comprehension_item;
    IF n <> 203 THEN
        RAISE EXCEPTION 'comprehension_item : 203 items attendus, obtenu %', n;
    END IF;

    -- Couverture : chaque competence a au moins un item a chaque niveau 1..4.
    FOR r IN SELECT c AS competence, nv AS niveau
               FROM unnest(ARRAY['FR.LECTURE.INFO','FR.LECTURE.INFERENCE','FR.LECTURE.ORDRE',
                    'FR.LECTURE.VRAIFAUX','FR.LECTURE.SENS_MOT']) AS c,
                    generate_series(1,4) AS nv
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.comprehension_item
                        WHERE competence = r.competence AND niveau = r.niveau) THEN
            RAISE EXCEPTION 'comprehension_item : aucun item pour % N%', r.competence, r.niveau;
        END IF;
    END LOOP;

    -- Spot check (miroir exact du front).
    FOR r IN SELECT * FROM (VALUES
        ('lec-info-n1-a','FR.LECTURE.INFO',1,'qcm','Mistigri'),
        ('lec-info-n3-b','FR.LECTURE.INFO',3,'clic','coffre'),
        ('lec-info-n4-b','FR.LECTURE.INFO',4,'texte','Biscuit'),
        ('lec-inf-n4-a','FR.LECTURE.INFERENCE',4,'clic','chien'),
        ('lec-inf-n4-c','FR.LECTURE.INFERENCE',4,'texte','impatiente'),
        ('lec-ord-n2-a','FR.LECTURE.ORDRE',2,'ordre','Sacha met son manteau|Sacha part à l''école'),
        ('lec-ord-n3-b','FR.LECTURE.ORDRE',3,'ordre','la chenille mange des feuilles|elle se transforme en chrysalide|un papillon s''envole'),
        ('lec-vf-n1-b','FR.LECTURE.VRAIFAUX',1,'qcm','faux'),
        ('lec-vf-n4-a','FR.LECTURE.VRAIFAUX',4,'texte','faux'),
        ('lec-sens-n3-a','FR.LECTURE.SENS_MOT',3,'qcm','où l''on glisse facilement'),
        ('lec-sens-n4-a','FR.LECTURE.SENS_MOT',4,'clic','tempête'),
        -- Textes de la bibliotheque (domaine public, lot 0060)
        ('lec-bib-papillon-sens-n1','FR.LECTURE.SENS_MOT',1,'qcm','une petite lettre d''amour'),
        ('lec-bib-martin-info-n4','FR.LECTURE.INFO',4,'clic','martin-pêcheur'),
        ('lec-bib-corbeau-ord-n3','FR.LECTURE.ORDRE',3,'ordre','le renard dit bonjour et flatte le corbeau|le corbeau ouvre son bec pour chanter|le renard attrape le fromage tombé'),
        ('lec-bib-lievre-info-n1','FR.LECTURE.INFO',1,'qcm','la tortue'),
        -- Textes de la bibliotheque completes (lot 0062) : spot check par format
        ('lec-bib-cendrillon-info-n4','FR.LECTURE.INFO',4,'clic','citrouille'),
        ('lec-bib-hareng-ord-n3','FR.LECTURE.ORDRE',3,'ordre','l''homme monte à l''échelle|il plante le clou dans le mur|il redescend de l''échelle'),
        ('lec-bib-orge-ord-n4','FR.LECTURE.ORDRE',4,'ordre','la femme va voir la sorcière|la sorcière donne un grain d''orge|la femme plante le grain'),
        ('lec-bib-clopinet-info-n4','FR.LECTURE.INFO',4,'texte','pomme'),
        ('lec-bib-paon-info-n4','FR.LECTURE.INFO',4,'texte','demain'),
        ('lec-bib-cigogne-info-n4','FR.LECTURE.INFO',4,'clic','vase'),
        ('lec-bib-camille-sens-n4','FR.LECTURE.SENS_MOT',4,'clic','attachement'),
        ('lec-bib-noel-info-n1','FR.LECTURE.INFO',1,'qcm','blanche'),
        ('lec-bib-serpent-sens-n2','FR.LECTURE.SENS_MOT',2,'qcm','un animal long et sans pattes')
    ) AS t(cle, competence, niveau, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.comprehension_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'comprehension_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table comprehension_item (192 + couverture + spot) : OK';
END $$;

-- ===========================================================================
-- 2. verif_comprehension : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    -- QCM : casse ignoree (normaliser_lettres), accents gardes.
    IF NOT public.verif_comprehension('lec-vf-n1-a','vrai')          THEN RAISE EXCEPTION 'juste refuse : vrai'; END IF;
    IF NOT public.verif_comprehension('lec-vf-n1-a','Vrai')          THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    IF public.verif_comprehension('lec-vf-n1-a','faux')              THEN RAISE EXCEPTION 'mauvaise reponse acceptee'; END IF;
    IF NOT public.verif_comprehension('lec-sens-n3-a','où l''on glisse facilement') THEN RAISE EXCEPTION 'qcm accents KO'; END IF;
    -- CLIC (mot) : tolerance casse et ponctuation, accents EXIGES.
    IF NOT public.verif_comprehension('lec-info-n3-b','Coffre.')     THEN RAISE EXCEPTION 'clic casse/ponct KO (coffre)'; END IF;
    IF NOT public.verif_comprehension('lec-sens-n4-a','tempête')     THEN RAISE EXCEPTION 'clic juste refuse (tempête)'; END IF;
    IF public.verif_comprehension('lec-sens-n4-a','tempete')         THEN RAISE EXCEPTION 'accent non exige : tempete'; END IF;
    -- TEXTE : mot exact, accents exiges.
    IF NOT public.verif_comprehension('lec-info-n4-b','Biscuit')     THEN RAISE EXCEPTION 'texte juste refuse : Biscuit'; END IF;
    IF public.verif_comprehension('lec-info-n4-b','chat')            THEN RAISE EXCEPTION 'texte mauvais accepte : chat'; END IF;
    -- ORDRE : espaces ignores, suite exacte.
    IF NOT public.verif_comprehension('lec-ord-n2-a','Sacha met son manteau | Sacha part à l''école') THEN RAISE EXCEPTION 'ordre juste (espaces) refuse'; END IF;
    IF public.verif_comprehension('lec-ord-n2-a','Sacha part à l''école|Sacha met son manteau')       THEN RAISE EXCEPTION 'ordre inverse accepte'; END IF;
    -- Item absent.
    IF public.verif_comprehension('cle-bidon','x')                   THEN RAISE EXCEPTION 'item absent accepte'; END IF;
    RAISE NOTICE 'verif_comprehension : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='lire') : verdict + coherence + RLS
-- ===========================================================================
\set uA '11111111-aaaa-0000-0000-000000000000'
\set uB '22222222-bbbb-0000-0000-000000000000'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'leca@example.test', now()),
    (:'uB', 'lecb@example.test', now());
INSERT INTO foyers (id) VALUES
    ('aaaaaaaa-1111-0000-0000-000000000000'),
    ('bbbbbbbb-1111-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('aaaaaaaa-1111-0000-0000-000000000000', :'uA'),
    ('bbbbbbbb-1111-0000-0000-000000000000', :'uB');
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000002-0000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'EnfantA', 'CE2'),
    ('b0000002-0000-0000-0000-000000000000', 'bbbbbbbb-1111-0000-0000-000000000000', 'EnfantB', 'CE2');

\set claimsA '{"sub":"11111111-aaaa-0000-0000-000000000000","role":"authenticated"}'

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 3a. Bonne reponse ACCEPTEE (QCM « Mistigri », FR.LECTURE.INFO N1).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000002-0000-0000-0000-000000000000'::uuid, NULL, 'FR.LECTURE.INFO', NULL, 1, 'comprehension',
        'lire', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'lec-info-n1-a', NULL, 'seance', 'Mistigri', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'lire « Mistigri » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000002-0000-0000-0000-000000000000'::uuid, NULL, 'FR.LECTURE.INFO', NULL, 1, 'comprehension',
        'lire', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'lec-info-n1-a', NULL, 'seance', 'Minou', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'lire « Minou » devrait etre faux : %', v;
    END IF;
END $$;

-- 3c. Reponse « ordre » (remise en ordre) ACCEPTEE (FR.LECTURE.ORDRE N2).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000002-0000-0000-0000-000000000000'::uuid, NULL, 'FR.LECTURE.ORDRE', NULL, 2, 'comprehension',
        'lire', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'lec-ord-n2-a', NULL, 'seance', 'Sacha met son manteau|Sacha part à l''école', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'lire remise en ordre devrait etre juste : %', v;
    END IF;
END $$;

-- 3d. Competence interdite (op='lire' sur une competence de maths) REJETEE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000002-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.TABLEAU', NULL, 1, 'comprehension',
        'lire', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'lec-info-n1-a', NULL, 'seance', 'Mistigri', NULL);
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
        v_id, 'a0000002-0000-0000-0000-000000000000'::uuid, NULL, 'FR.LECTURE.INFO', NULL, 1, 'comprehension',
        'lire', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'cle-bidon', NULL, 'seance', 'Mistigri', NULL);
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
        v_id, 'a0000002-0000-0000-0000-000000000000'::uuid, NULL, 'FR.LECTURE.INFO', NULL, 2, 'comprehension',
        'lire', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'lec-info-n1-a', NULL, 'seance', 'Mistigri', NULL);
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
        v_id, 'b0000002-0000-0000-0000-000000000000'::uuid, NULL, 'FR.LECTURE.INFO', NULL, 1, 'comprehension',
        'lire', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'lec-info-n1-a', NULL, 'seance', 'Mistigri', NULL);
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

-- 4a. lecture est un domaine VALIDE : FR + lecture seul -> accepte.
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000002-0000-0000-0000-000000000000'::uuid,
        ARRAY['FR']::text[], ARRAY['lecture']::text[]);
    IF NOT EXISTS (SELECT 1 FROM public.profils
                    WHERE id = 'a0000002-0000-0000-0000-000000000000'
                      AND 'lecture' = ANY (domaines_actifs)) THEN
        RAISE EXCEPTION 'lecture aurait du etre active';
    END IF;
    RAISE NOTICE 'regler_matieres FR+lecture : OK';
END $$;

-- 4b. FR eteint mais seul le domaine lecture actif cote MA -> AUCUNE
--     sous-matiere jouable -> refuse.
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000002-0000-0000-0000-000000000000'::uuid,
        ARRAY['MA']::text[], ARRAY['lecture']::text[]);
    RAISE EXCEPTION 'un reglage sans sous-matiere jouable aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%aucune_sous_matiere%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu aucune_sous_matiere_active) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

-- ===========================================================================
-- 5. Iris : la migration a bien ajoute le domaine `lecture` a tous les profils.
--    (Verifie le mecanisme d'ajout aux profils existants, sans donnee reelle.)
-- ===========================================================================
DO $$
DECLARE n integer;
BEGIN
    SELECT count(*) INTO n FROM public.profils WHERE NOT ('lecture' = ANY (domaines_actifs));
    IF n <> 0 THEN
        RAISE EXCEPTION 'lecture devrait etre actif pour TOUS les profils, manque dans %', n;
    END IF;
    RAISE NOTICE 'domaine lecture actif pour tous les profils : OK';
END $$;

ROLLBACK;
