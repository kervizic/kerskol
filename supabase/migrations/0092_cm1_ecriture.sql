-- 0092_cm1_ecriture.sql
-- LOT 5 (CM1) - FRANCAIS / COPIER ET ÉCRIRE : écriture guidée CM1. Deux
-- competences additives (moteur ecriture_item + verif_ecriture reutilises,
-- AUCUNE nouvelle UI) :
--   FR.ECR.COPIE_CM1  : recopier des phrases plus longues avec des connecteurs
--                       (puis, ensuite, car, mais, enfin) ; N4 copie différée ;
--   FR.ECR.GUIDEE_CM1 : transformer une phrase au passé simple (N1-N3, branché
--                       sur le lot 1) ; N4 phrase LIBRE avec check-list CM1
--                       (>= 8 mots, connecteur « puis » imposé).
--
-- Miroir EXACT de ecriture.ts (cle/competence/niveau/format/attendu/params) ;
-- le SERVEUR reste seul juge (op 'ecr', verif_ecriture). Golden 24 -> 32.
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaine `ecriture` deja actif ; aucun
-- changement de domaines_actifs / DEFAULT. Portee CM1..CM2.

-- =========================================================================
-- 1. Competences (domaine ecriture, portee CM1..CM2) + prerequis.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('FR.ECR.COPIE_CM1',  'FR', 'ecriture', 'Recopier des phrases plus longues', 862, 4, 'CM1', 'CM2', true),
    ('FR.ECR.GUIDEE_CM1', 'FR', 'ecriture', 'Écrire au passé simple et en autonomie', 872, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.ECR.COPIE_CM1',  'FR.ECR.COPIE',  2),
    ('FR.ECR.GUIDEE_CM1', 'FR.ECR.GUIDEE', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Seed des 8 items (miroir EXACT de ecriture.ts).
-- =========================================================================
INSERT INTO public.ecriture_item (cle, competence, niveau, format, attendu, params) VALUES
    ('ecr-copiecm1-n1', 'FR.ECR.COPIE_CM1',  1, 'copie',     'Le matin, je me lève, puis je déjeune.', NULL),
    ('ecr-copiecm1-n2', 'FR.ECR.COPIE_CM1',  2, 'copie',     'Je fais mes devoirs, ensuite je joue dans le jardin.', NULL),
    ('ecr-copiecm1-n3', 'FR.ECR.COPIE_CM1',  3, 'copie',     'Je range ma chambre, car maman arrive, mais je garde mon livre préféré.', NULL),
    ('ecr-copiecm1-n4', 'FR.ECR.COPIE_CM1',  4, 'copie',     'D''abord, nous préparons le goûter. Ensuite, nous jouons ensemble. Enfin, nous rangeons tout.', NULL),
    ('ecr-guidecm1-n1', 'FR.ECR.GUIDEE_CM1', 1, 'transform', 'Il mangea une pomme.', NULL),
    ('ecr-guidecm1-n2', 'FR.ECR.GUIDEE_CM1', 2, 'transform', 'Elle regarda les étoiles.', NULL),
    ('ecr-guidecm1-n3', 'FR.ECR.GUIDEE_CM1', 3, 'transform', 'Les enfants chantèrent une chanson.', NULL),
    ('ecr-guidecm1-n4', 'FR.ECR.GUIDEE_CM1', 4, 'libre',     '', '{"minMots":8,"motsCles":["puis"]}')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu, params=EXCLUDED.params;

-- =========================================================================
-- 3. Exercices de reference (type 'ecriture', id deterministe).
-- =========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['FR.ECR.COPIE_CM1','FR.ECR.GUIDEE_CM1'] LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':ecriture')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'ecriture', v_niv, 'ecriture', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Garde-fou : 4 items par competence, couverture N1..N4, golden 32.
-- =========================================================================
DO $do$
DECLARE n integer; v_comp text; v_niv integer;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['FR.ECR.COPIE_CM1','FR.ECR.GUIDEE_CM1'] LOOP
        SELECT count(*) INTO n FROM public.ecriture_item WHERE competence = v_comp;
        IF n <> 4 THEN RAISE EXCEPTION '% : 4 items attendus, obtenu %', v_comp, n; END IF;
        FOR v_niv IN 1..4 LOOP
            IF NOT EXISTS (SELECT 1 FROM public.ecriture_item WHERE competence = v_comp AND niveau = v_niv) THEN
                RAISE EXCEPTION '% : aucun item au niveau %', v_comp, v_niv;
            END IF;
        END LOOP;
    END LOOP;
    SELECT count(*) INTO n FROM public.ecriture_item;
    IF n <> 32 THEN RAISE EXCEPTION 'ecriture_item : golden 32 attendu, obtenu %', n; END IF;
END $do$;

INSERT INTO public.schema_migrations (version)
VALUES ('0092_cm1_ecriture')
ON CONFLICT (version) DO NOTHING;
