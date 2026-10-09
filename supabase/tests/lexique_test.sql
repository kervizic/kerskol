-- lexique_test.sql
-- Vocabulaire + Mots a savoir (migration 0042). Transaction ROLLBACK : aucune
-- donnee de test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre :
--   * la table de reference public.lexique_item contient EXACTEMENT les memes
--     items que le front (120 lignes ; couverture 6 competences x 4 niveaux ;
--     spot check) : TEST CROISE avec le golden vitest
--     (frontend/.../francais/lexique.test.ts) ;
--   * verif_lexique : bonne reponse acceptee, mauvaise refusee, accents EXIGES,
--     tolerance casse/espaces, normalisation qcm vs clic/texte, item absent ;
--   * enregistrer_reponse(op='lex') : verdict serveur, competence interdite,
--     item inexistant, niveau incoherent, autre foyer refuse ;
--   * garde-fou (>= 1 sous-matiere jouable) : vocabulaire et mots-invariables
--     sont des domaines valides.

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 120 items, couverture complete + spot check
-- ===========================================================================
DO $$
DECLARE
    r record;
    got text;
    n   integer;
BEGIN
    SELECT count(*) INTO n FROM public.lexique_item;
    IF n <> 164 THEN
        RAISE EXCEPTION 'lexique_item : 164 items attendus, obtenu %', n;
    END IF;

    -- Couverture : chaque competence a au moins un item a chaque niveau 1..4.
    FOR r IN SELECT c AS competence, nv AS niveau
               FROM unnest(ARRAY['FR.VOC.ALPHABET','FR.VOC.FAMILLES',
                    'FR.VOC.SYN_CONTRAIRES','FR.VOC.PREFIXE_SUFFIXE',
                    'FR.VOC.CATEGORIES','FR.VOC.SENS','FR.VOC.SENS_FIGURE',
                    'FR.VOC.REGISTRES','FR.MOTS.INVARIABLES']) AS c,
                    generate_series(1,4) AS nv
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.lexique_item
                        WHERE competence = r.competence AND niveau = r.niveau) THEN
            RAISE EXCEPTION 'lexique_item : aucun item pour % N%', r.competence, r.niveau;
        END IF;
    END LOOP;

    -- Spot check (miroir exact du front).
    FOR r IN SELECT * FROM (VALUES
        ('voc-alpha-n2-1','FR.VOC.ALPHABET',2,'clic','chat'),
        ('voc-alpha-n4-2','FR.VOC.ALPHABET',4,'texte','fraise'),
        ('voc-sens-n3-1','FR.VOC.SENS',3,'qcm','la phrase B'),
        ('voc-sens-n4-2','FR.VOC.SENS',4,'texte','souris'),
        ('voc-fig-n1-2','FR.VOC.SENS_FIGURE',1,'qcm','sens figuré'),
        ('voc-fig-n2-1','FR.VOC.SENS_FIGURE',2,'qcm','être très gentil'),
        ('voc-fig-n4-1','FR.VOC.SENS_FIGURE',4,'texte','figuré'),
        ('voc-reg-n1-1','FR.VOC.REGISTRES',1,'qcm','familier'),
        ('voc-reg-n2-2','FR.VOC.REGISTRES',2,'qcm','ravi'),
        ('voc-reg-n4-2','FR.VOC.REGISTRES',4,'texte','soutenu'),
        ('voc-fam-n3-1','FR.VOC.FAMILLES',3,'clic','voiture'),
        ('voc-syn-n3-1','FR.VOC.SYN_CONTRAIRES',3,'qcm','malheureux'),
        ('voc-ps-n1-5','FR.VOC.PREFIXE_SUFFIXE',1,'qcm','chanteur'),
        ('voc-cat-n3-1','FR.VOC.CATEGORIES',3,'clic','carotte'),
        ('mots-n1-beaucoup','FR.MOTS.INVARIABLES',1,'qcm','beaucoup'),
        ('mots-n3-deja','FR.MOTS.INVARIABLES',3,'qcm','déjà'),
        ('mots-n4-aujourdhui','FR.MOTS.INVARIABLES',4,'texte','aujourd''hui')
    ) AS t(cle, competence, niveau, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.lexique_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'lexique_item KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table lexique_item (120 + couverture + spot) : OK';
END $$;

-- ===========================================================================
-- 2. verif_lexique : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    -- Bonnes reponses.
    IF NOT public.verif_lexique('voc-alpha-n2-1','chat')         THEN RAISE EXCEPTION 'juste refuse : chat'; END IF;
    IF NOT public.verif_lexique('mots-n1-beaucoup','beaucoup')   THEN RAISE EXCEPTION 'juste refuse : beaucoup'; END IF;
    IF NOT public.verif_lexique('voc-syn-n3-1','malheureux')     THEN RAISE EXCEPTION 'juste refuse : malheureux'; END IF;
    -- Tolerance casse / espaces (clic : « Arbre » = « arbre »).
    IF NOT public.verif_lexique('voc-alpha-n2-1','  Chat ')      THEN RAISE EXCEPTION 'tolerance casse/espaces KO'; END IF;
    -- QCM : la casse ne compte pas.
    IF NOT public.verif_lexique('mots-n1-beaucoup','BEAUCOUP')   THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    -- Accents EXIGES.
    IF public.verif_lexique('mots-n3-deja','deja')               THEN RAISE EXCEPTION 'accent non exige : deja'; END IF;
    IF NOT public.verif_lexique('mots-n3-deja','déjà')           THEN RAISE EXCEPTION 'juste refuse : déjà'; END IF;
    -- Mauvaise reponse.
    IF public.verif_lexique('mots-n1-beaucoup','bocoup')         THEN RAISE EXCEPTION 'mauvaise orthographe acceptee'; END IF;
    IF public.verif_lexique('voc-cat-n3-1','pomme')              THEN RAISE EXCEPTION 'mauvaise reponse acceptee'; END IF;
    -- Item absent.
    IF public.verif_lexique('cle-bidon','arbre')                 THEN RAISE EXCEPTION 'item absent accepte'; END IF;
    RAISE NOTICE 'verif_lexique : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='lex') : verdict + coherence + RLS
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'la@example.test', now()),
    (:'uB', 'lb@example.test', now());
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

-- 3a. Bonne reponse ACCEPTEE (qcm « beaucoup », FR.MOTS.INVARIABLES N1).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.MOTS.INVARIABLES', NULL, 1, 'mots_invariables',
        'lex', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'mots-n1-beaucoup', NULL, 'seance', 'beaucoup', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'lex « beaucoup » devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE (qcm « bocoup »).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.MOTS.INVARIABLES', NULL, 1, 'mots_invariables',
        'lex', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'mots-n1-beaucoup', NULL, 'seance', 'bocoup', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'lex « bocoup » devrait etre faux : %', v;
    END IF;
END $$;

-- 3c. Competence interdite (op='lex' sur une competence de maths) REJETEE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.NUM.LIRE_ECRIRE', NULL, 1, 'mots_invariables',
        'lex', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'mots-n1-beaucoup', NULL, 'seance', 'beaucoup', NULL);
    RAISE EXCEPTION 'competence interdite aurait du etre rejetee';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3d. Item inexistant REJETE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.MOTS.INVARIABLES', NULL, 1, 'mots_invariables',
        'lex', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'cle-bidon', NULL, 'seance', 'beaucoup', NULL);
    RAISE EXCEPTION 'item inexistant aurait du etre rejete';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3e. Niveau incoherent avec l'item REJETE (item N1 envoye en N2).
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.MOTS.INVARIABLES', NULL, 2, 'mots_invariables',
        'lex', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'mots-n1-beaucoup', NULL, 'seance', 'beaucoup', NULL);
    RAISE EXCEPTION 'niveau incoherent aurait du etre rejete';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3f. Vocabulaire (clic « arbre ») ACCEPTE (couvre FR.VOC.*).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.VOC.ALPHABET', NULL, 2, 'vocabulaire',
        'lex', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'voc-alpha-n2-1', NULL, 'seance', 'chat', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'lex « chat » devrait etre juste : %', v;
    END IF;
END $$;

-- 3g. Acces a un profil d'un AUTRE foyer REFUSE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.MOTS.INVARIABLES', NULL, 1, 'mots_invariables',
        'lex', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'mots-n1-beaucoup', NULL, 'seance', 'beaucoup', NULL);
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

-- 4a. vocabulaire et mots-invariables sont des domaines VALIDES.
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000001-0000-0000-0000-000000000000'::uuid,
        ARRAY['FR']::text[], ARRAY['vocabulaire','mots-invariables']::text[]);
    IF NOT EXISTS (SELECT 1 FROM public.profils
                    WHERE id = 'a0000001-0000-0000-0000-000000000000'
                      AND 'vocabulaire' = ANY (domaines_actifs)
                      AND 'mots-invariables' = ANY (domaines_actifs)) THEN
        RAISE EXCEPTION 'vocabulaire + mots-invariables auraient du etre actifs';
    END IF;
    RAISE NOTICE 'regler_matieres FR + vocabulaire/mots-invariables : OK';
END $$;

-- 4b. FR eteint mais seuls ces domaines actifs -> AUCUNE sous-matiere jouable -> refuse.
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000001-0000-0000-0000-000000000000'::uuid,
        ARRAY['MA']::text[], ARRAY['vocabulaire']::text[]);
    RAISE EXCEPTION 'un reglage sans sous-matiere jouable aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%aucune_sous_matiere%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu aucune_sous_matiere_active) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

ROLLBACK;
