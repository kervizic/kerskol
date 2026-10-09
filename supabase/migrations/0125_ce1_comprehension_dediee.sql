-- 0125_ce1_comprehension_dediee.sql
-- LOT CE1 (incrément 14) - FRANÇAIS / LECTURE : compétence CE1 DÉDIÉE
-- FR.LECTURE.CE1_INFERENCE ([CE1,CE1]) - « comprendre ce qui n'est pas dit »
-- sur des textes TRÈS COURTS, calibrés CE1. L'inférence partagée
-- (FR.LECTURE.INFERENCE) est bornée [CE2,CE2] : un CE1 n'y a pas accès. Cette
-- compétence dédiée donne au CE1 une inférence à sa portée, 4 niveaux tous CE1.
--
-- Textes ORIGINAUX du quotidien (émotions, animaux, nature), bienveillance
-- stricte, AUCUNE donnée de calendrier (ni jour, ni mois, ni date), aucun texte
-- coupé (pas de « […] »). Moteur RÉUTILISÉ : banque comprehension_item + juge
-- verif_comprehension par cle (serveur SEUL juge), op 'lire', composant de
-- lecture. Miroir EXACT de frontend/.../francais/comprehension.ts (golden 256 ;
-- test croisé comprehension_test.sql + comprehension.test.ts).
--
-- SÛRETÉ CE2 (Iris) : [CE1,CE1] -> gate estSousNiveau écarte la compétence du
-- pool normal d'un CE2 ; elle ne revient qu'EN RÉVISION comme prérequis de
-- remédiation de FR.LECTURE.INFERENCE (travaillée en lacune). Le prérequis
-- CE1 -> CE2 ne verrouille pas la compétence liée (garde-fou incrément 12).
-- Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Compétence CE1 dédiée + prérequis de remédiation vers l'inférence CE2.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('FR.LECTURE.CE1_INFERENCE', 'FR', 'lecture', 'Comprendre ce qui n''est pas dit (CE1)', 860, 4, 'CE1', 'CE1', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.LECTURE.INFERENCE', 'FR.LECTURE.CE1_INFERENCE', 2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 2. Items de référence (miroir EXACT de comprehension.ts). 12 items.
-- =========================================================================
INSERT INTO public.comprehension_item (cle, competence, niveau, format, attendu) VALUES
    ('ce1inf-n1-a', 'FR.LECTURE.CE1_INFERENCE', 1, 'qcm',   'content'),
    ('ce1inf-n1-b', 'FR.LECTURE.CE1_INFERENCE', 1, 'qcm',   'il fait froid'),
    ('ce1inf-n1-c', 'FR.LECTURE.CE1_INFERENCE', 1, 'qcm',   'manger'),
    ('ce1inf-n2-a', 'FR.LECTURE.CE1_INFERENCE', 2, 'qcm',   'il a perdu son doudou'),
    ('ce1inf-n2-b', 'FR.LECTURE.CE1_INFERENCE', 2, 'qcm',   'parce que papa arrive'),
    ('ce1inf-n2-c', 'FR.LECTURE.CE1_INFERENCE', 2, 'qcm',   'un orage'),
    ('ce1inf-n3-a', 'FR.LECTURE.CE1_INFERENCE', 3, 'qcm',   'non, il n''aime pas'),
    ('ce1inf-n3-b', 'FR.LECTURE.CE1_INFERENCE', 3, 'clic',  'parapluie'),
    ('ce1inf-n3-c', 'FR.LECTURE.CE1_INFERENCE', 3, 'qcm',   'de dormir'),
    ('ce1inf-n4-a', 'FR.LECTURE.CE1_INFERENCE', 4, 'clic',  'essoufflé'),
    ('ce1inf-n4-b', 'FR.LECTURE.CE1_INFERENCE', 4, 'clic',  'éteinte'),
    ('ce1inf-n4-c', 'FR.LECTURE.CE1_INFERENCE', 4, 'texte', 'mal')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de référence (type 'comprehension', id déterministe).
-- =========================================================================
DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('FR.LECTURE.CE1_INFERENCE:' || v_niv || ':comprehension')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'FR.LECTURE.CE1_INFERENCE', 'comprehension', v_niv, 'comprehension', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
            type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Garde-fous : 12 items, couverture N1..N4, portée [CE1,CE1], prérequis,
--    golden global comprehension_item = 256.
-- =========================================================================
DO $do$
DECLARE n integer; v_niv integer;
BEGIN
    SELECT count(*) INTO n FROM public.comprehension_item WHERE competence = 'FR.LECTURE.CE1_INFERENCE';
    IF n <> 12 THEN RAISE EXCEPTION 'CE1_INFERENCE : 12 items attendus, obtenu %', n; END IF;
    FOR v_niv IN 1..4 LOOP
        IF NOT EXISTS (SELECT 1 FROM public.comprehension_item
                        WHERE competence = 'FR.LECTURE.CE1_INFERENCE' AND niveau = v_niv) THEN
            RAISE EXCEPTION 'CE1_INFERENCE : aucun item au niveau %', v_niv;
        END IF;
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.competences
                    WHERE code = 'FR.LECTURE.CE1_INFERENCE' AND classe_min = 'CE1' AND classe_max = 'CE1') THEN
        RAISE EXCEPTION 'CE1_INFERENCE : portée [CE1,CE1] attendue';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.competence_prerequis
                    WHERE competence = 'FR.LECTURE.INFERENCE' AND prerequis = 'FR.LECTURE.CE1_INFERENCE') THEN
        RAISE EXCEPTION 'CE1_INFERENCE : prérequis de remédiation CE1 -> CE2 manquant';
    END IF;
    SELECT count(*) INTO n FROM public.comprehension_item;
    IF n <> 256 THEN RAISE EXCEPTION 'comprehension_item : golden 256 attendu, obtenu %', n; END IF;
END $do$;

-- =========================================================================
-- 5. Enregistrement de la migration.
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0125_ce1_comprehension_dediee')
ON CONFLICT (version) DO NOTHING;
