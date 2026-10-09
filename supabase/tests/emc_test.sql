-- emc_test.sql
-- « Vivre ensemble » (EMC, migration 0058). Transaction ROLLBACK : aucune
-- donnee de test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre :
--   * la table de reference public.qm_item contient EXACTEMENT les items EMC du
--     front (120 lignes EMC ; couverture 15 competences x 4 niveaux ; spot
--     check) : TEST CROISE avec le golden vitest (domain/emc/emc.test.ts) ;
--   * verif_qm sur des items EMC : bonne reponse acceptee, mauvaise refusee,
--     accents EXIGES (texte), tolerance casse (qcm), comparaison structurelle
--     (ordre / tri) ;
--   * enregistrer_reponse(op='qm') ELARGI a EMC.% : verdict serveur, competence
--     interdite, item inexistant, niveau incoherent, autre foyer refuse ;
--   * garde-fou (>= 1 sous-matiere jouable) : respect est un domaine valide ;
--   * la matiere EMC + les 4 sous-matieres sont actives pour TOUS les profils (Iris).

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 120 items EMC, couverture complete + spot (front==SQL)
-- ===========================================================================
DO $$
DECLARE
    r record;
    got text;
    n   integer;
    attendu_n integer;
BEGIN
    -- Comptage auto-echelonne : chaque competence EMC porte 8 items (4 niveaux x 2).
    SELECT count(*) INTO n FROM public.qm_item WHERE competence LIKE 'EMC.%';
    SELECT count(*) * 8 INTO attendu_n FROM public.competences WHERE matiere = 'EMC';
    IF n <> attendu_n THEN
        RAISE EXCEPTION 'qm_item EMC : % items attendus (8 par competence EMC), obtenu %', attendu_n, n;
    END IF;

    -- Couverture : chaque competence EMC a au moins un item a chaque niveau 1..4.
    FOR r IN SELECT c.code AS competence, nv AS niveau
               FROM public.competences c, generate_series(1,4) AS nv
              WHERE c.matiere = 'EMC'
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.qm_item
                        WHERE competence = r.competence AND niveau = r.niveau) THEN
            RAISE EXCEPTION 'qm_item EMC : aucun item pour % N%', r.competence, r.niveau;
        END IF;
    END LOOP;

    -- Spot check (miroir EXACT du front, domain/emc/emc.test.ts).
    FOR r IN SELECT * FROM (VALUES
        ('emc-res-reg-n2-b','EMC.RESPECT.REGLES',2,'tri','ranger son matériel=on le fait;écouter la maîtresse=on le fait;se moquer d''un camarade=on ne le fait pas;jeter du papier par terre=on ne le fait pas'),
        ('emc-res-pol-n3-b','EMC.RESPECT.POLITESSE',3,'ordre','tu demandes de l''aide, s''il te plaît>on t''aide>tu dis merci'),
        ('emc-res-moq-n2-a','EMC.RESPECT.MOQUERIE',2,'qcm','défendre Sami et prévenir un adulte'),
        ('emc-res-moq-n4-a','EMC.RESPECT.MOQUERIE',4,'texte','adulte'),
        -- CE1 dédiées (incrément 17)
        ('emc-res-ce1ent-n1-b','EMC.CE1_ENTRAIDE',1,'qcm','ranger ensemble'),
        ('emc-res-ce1ent-n4-a','EMC.CE1_ENTRAIDE',4,'texte','entraider'),
        ('emc-res-ce1ega-n4-a','EMC.CE1_EGALITE',4,'texte','droits'),
        ('emc-emo-rec-n2-b','EMC.EMOTIONS.RECONNAITRE',2,'tri','c''est mon anniversaire=joie;on a cassé mon jouet exprès=colère;je suis seul dans le noir=peur'),
        ('emc-emo-cal-n3-a','EMC.EMOTIONS.CALME',3,'ordre','je m''arrête>je respire doucement>je parle calmement'),
        ('emc-emo-rec-n4-b','EMC.EMOTIONS.RECONNAITRE',4,'texte','colère'),
        ('emc-rep-sym-n2-a','EMC.REPUBLIQUE.SYMBOLES',2,'qcm','Liberté, Égalité, Fraternité'),
        ('emc-rep-sym-n4-a','EMC.REPUBLIQUE.SYMBOLES',4,'texte','Marseillaise'),
        ('emc-rep-vot-n2-b','EMC.REPUBLIQUE.VOTER',2,'ordre','on présente les candidats>chacun vote>on compte les voix'),
        ('emc-rep-com-n4-a','EMC.REPUBLIQUE.COMMUNE',4,'texte','maire'),
        ('emc-ecr-don-n2-a','EMC.ECRANS.DONNEES',2,'tri','mon adresse=on garde pour soi;mon mot de passe=on garde pour soi;mon dessin animé préféré=on peut dire;ma couleur préférée=on peut dire'),
        ('emc-ecr-cri-n2-a','EMC.ECRANS.ESPRITCRITIQUE',2,'qcm','c''est sûrement truqué'),
        ('emc-ecr-pol-n4-b','EMC.ECRANS.POLITESSE',4,'texte','poli'),
        ('emc-ecr-cri-n4-a','EMC.ECRANS.ESPRITCRITIQUE',4,'texte','croire')
    ) AS t(cle, competence, niveau, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.qm_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'qm_item EMC KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'table qm_item EMC (% items, couverture + spot) : OK', n;
END $$;

-- ===========================================================================
-- 2. verif_qm sur des items EMC : accepte la bonne reponse, refuse les fautes
-- ===========================================================================
DO $$
BEGIN
    -- QCM : casse ignoree, accents gardes.
    IF NOT public.verif_qm('emc-res-moq-n2-a','défendre Sami et prévenir un adulte') THEN RAISE EXCEPTION 'qcm juste refuse'; END IF;
    IF NOT public.verif_qm('emc-res-moq-n2-a','Défendre Sami Et Prévenir Un Adulte') THEN RAISE EXCEPTION 'qcm casse KO'; END IF;
    IF public.verif_qm('emc-res-moq-n2-a','rigoler avec Léo')                         THEN RAISE EXCEPTION 'qcm mauvaise reponse acceptee'; END IF;
    -- ORDRE : comparaison structurelle (espaces ignores, ordre strict).
    IF NOT public.verif_qm('emc-emo-cal-n3-a','je m''arrête>je respire doucement>je parle calmement') THEN RAISE EXCEPTION 'ordre juste refuse'; END IF;
    IF NOT public.verif_qm('emc-emo-cal-n3-a','je m''arrête > je respire doucement > je parle calmement') THEN RAISE EXCEPTION 'ordre espaces KO'; END IF;
    IF public.verif_qm('emc-emo-cal-n3-a','je parle calmement>je respire doucement>je m''arrête') THEN RAISE EXCEPTION 'ordre inverse accepte'; END IF;
    -- TRI : comparaison structurelle.
    IF NOT public.verif_qm('emc-emo-rec-n2-b','c''est mon anniversaire=joie;on a cassé mon jouet exprès=colère;je suis seul dans le noir=peur') THEN RAISE EXCEPTION 'tri juste refuse'; END IF;
    IF public.verif_qm('emc-emo-rec-n2-b','c''est mon anniversaire=peur;on a cassé mon jouet exprès=colère;je suis seul dans le noir=joie') THEN RAISE EXCEPTION 'tri faux accepte'; END IF;
    -- TEXTE : accents EXIGES.
    IF NOT public.verif_qm('emc-emo-rec-n4-b','colère')     THEN RAISE EXCEPTION 'texte juste refuse : colère'; END IF;
    IF NOT public.verif_qm('emc-emo-rec-n4-b','Colère')     THEN RAISE EXCEPTION 'texte casse KO'; END IF;
    IF public.verif_qm('emc-emo-rec-n4-b','colere')         THEN RAISE EXCEPTION 'texte accent non exige'; END IF;
    -- Item absent.
    IF public.verif_qm('emc-cle-bidon','x')                 THEN RAISE EXCEPTION 'item absent accepte'; END IF;
    RAISE NOTICE 'verif_qm EMC : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='qm') ELARGI a EMC.% : verdict + coherence + RLS
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'emca@example.test', now()),
    (:'uB', 'emcb@example.test', now());
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

-- 3a. Bonne reponse ACCEPTEE (QCM, EMC.RESPECT.MOQUERIE N2).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'EMC.RESPECT.MOQUERIE', NULL, 2, 'vivre_ensemble',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'emc-res-moq-n2-a', NULL, 'seance', 'défendre Sami et prévenir un adulte', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'emc qcm devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse REFUSEE.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'EMC.RESPECT.MOQUERIE', NULL, 2, 'vivre_ensemble',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'emc-res-moq-n2-a', NULL, 'seance', 'rigoler avec Léo', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'emc mauvaise reponse devrait etre fausse : %', v;
    END IF;
END $$;

-- 3c. Reponse « ordre » ACCEPTEE (EMC.EMOTIONS.CALME N3).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'EMC.EMOTIONS.CALME', NULL, 3, 'vivre_ensemble',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'emc-emo-cal-n3-a', NULL, 'seance', 'je m''arrête>je respire doucement>je parle calmement', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'emc ordre devrait etre juste : %', v;
    END IF;
END $$;

-- 3d. Competence interdite (op='qm' sur une competence de maths) REJETEE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.DONNEES.TABLEAU', NULL, 1, 'vivre_ensemble',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'emc-res-moq-n2-a', NULL, 'seance', 'défendre Sami et prévenir un adulte', NULL);
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
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'EMC.RESPECT.MOQUERIE', NULL, 2, 'vivre_ensemble',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'emc-cle-bidon', NULL, 'seance', 'défendre Sami et prévenir un adulte', NULL);
    RAISE EXCEPTION 'item inexistant aurait du etre rejete';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3f. Niveau incoherent avec l'item REJETE (item N2 envoye en N3).
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'EMC.RESPECT.MOQUERIE', NULL, 3, 'vivre_ensemble',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'emc-res-moq-n2-a', NULL, 'seance', 'défendre Sami et prévenir un adulte', NULL);
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
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'EMC.RESPECT.MOQUERIE', NULL, 2, 'vivre_ensemble',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'emc-res-moq-n2-a', NULL, 'seance', 'défendre Sami et prévenir un adulte', NULL);
    RAISE EXCEPTION 'acces a un autre foyer aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%acces_refuse%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu acces_refuse) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

-- ===========================================================================
-- 4. Iris : la migration a bien ajoute la matiere EMC et les 4 sous-matieres a
--    TOUS les profils (mecanisme d'ajout aux profils existants). VERIFIE AVANT
--    tout regler_matieres (la section 5 mute volontairement un profil de test).
-- ===========================================================================
DO $$
DECLARE n integer; d text;
BEGIN
    FOREACH d IN ARRAY ARRAY['respect','emotions','republique','ecrans'] LOOP
        SELECT count(*) INTO n FROM public.profils WHERE NOT (d = ANY (domaines_actifs));
        IF n <> 0 THEN
            RAISE EXCEPTION 'le domaine % devrait etre actif pour TOUS les profils, manque dans %', d, n;
        END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.profils WHERE NOT ('EMC' = ANY (matieres_actives));
    IF n <> 0 THEN
        RAISE EXCEPTION 'EMC devrait etre active pour TOUS les profils, manque dans %', n;
    END IF;
    RAISE NOTICE 'matiere EMC + 4 sous-matieres actives pour tous les profils : OK';
END $$;

-- ===========================================================================
-- 5. Garde-fou >= 1 sous-matiere jouable (via regler_matieres / trigger 0039).
--    NB : mute le profil de test A (domaines = ['respect']) -> doit rester APRES
--    la verification « tous les profils » de la section 4.
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 5a. EMC + respect seul -> accepte (une competence EMC.RESPECT.* est jouable).
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000001-0000-0000-0000-000000000000'::uuid,
        ARRAY['EMC']::text[], ARRAY['respect']::text[]);
    IF NOT EXISTS (SELECT 1 FROM public.profils
                    WHERE id = 'a0000001-0000-0000-0000-000000000000'
                      AND 'respect' = ANY (domaines_actifs)
                      AND 'EMC' = ANY (matieres_actives)) THEN
        RAISE EXCEPTION 'EMC + respect auraient du etre actifs';
    END IF;
    RAISE NOTICE 'regler_matieres EMC+respect : OK';
END $$;

-- 5b. MA actif mais seul le domaine respect actif -> AUCUNE sous-matiere jouable
--     (MA n'a pas de competence domaine respect) -> refuse.
DO $$
BEGIN
    PERFORM public.regler_matieres('a0000001-0000-0000-0000-000000000000'::uuid,
        ARRAY['MA']::text[], ARRAY['respect']::text[]);
    RAISE EXCEPTION 'un reglage sans sous-matiere jouable aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%aucune_sous_matiere%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu aucune_sous_matiere_active) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

ROLLBACK;
