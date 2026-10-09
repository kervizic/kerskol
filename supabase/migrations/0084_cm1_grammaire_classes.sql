-- 0084_cm1_grammaire_classes.sql
-- LOT C (CM1) - FRANCAIS / GRAMMAIRE : « Les classes de mots élargies ».
-- Attendus de fin de CM1 (eduscol « Francais CM1 - Attendus de fin d'annee »,
-- document 13984 : identifier les classes de mots). Au-dela des classes deja
-- travaillees (nom, verbe, adjectif, determinant, pronom personnel sujet dans
-- FR.GRAM.NATURE), le CM1 ajoute : l'ADVERBE, la CONJONCTION DE COORDINATION
-- (mais, et, ou, donc...), et le PRONOM au sens large.
--
-- On REUTILISE le moteur de grammaire (banque statique grammaire_item + juge
-- verif_grammaire par cle, composant <Grammaire>, formats qcm/clic/texte) :
-- AUCUNE nouvelle UI. Nouvelle competence FR.GRAM.CLASSES (domaine `grammaire`),
-- portee CM1..CM2. N1 QCM, N2 clic, N3 QCM (donner la classe), N4 reponse libre.
-- Miroir EXACT de grammaire.ts (golden 114 items ; test croise grammaire_test.sql).
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaine `grammaire` deja ACTIF au defaut
-- (AUCUN changement de domaines_actifs / DEFAULT). Prerequis FR.GRAM.NATURE
-- (niveau 2 : les classes de base precedent les classes elargies).

-- =========================================================================
-- 1. Competence (domaine grammaire, portee CM1..CM2) + prerequis
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('FR.GRAM.CLASSES', 'FR', 'grammaire', 'Les classes de mots (adverbe, conjonction, pronom)', 746, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.GRAM.CLASSES', 'FR.GRAM.NATURE', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Seed des 12 items (miroir EXACT de grammaire.ts).
-- =========================================================================
INSERT INTO public.grammaire_item (cle, competence, niveau, format, attendu) VALUES
    ('cls-n1-adverbe',  'FR.GRAM.CLASSES', 1, 'qcm',   'vite'),
    ('cls-n1-conj',     'FR.GRAM.CLASSES', 1, 'qcm',   'mais'),
    ('cls-n1-adverbe2', 'FR.GRAM.CLASSES', 1, 'qcm',   'doucement'),
    ('cls-n2-adverbe',  'FR.GRAM.CLASSES', 2, 'clic',  'tranquillement'),
    ('cls-n2-conj',     'FR.GRAM.CLASSES', 2, 'clic',  'mais'),
    ('cls-n2-adverbe3', 'FR.GRAM.CLASSES', 2, 'clic',  'bientôt'),
    ('cls-n3-adverbe',  'FR.GRAM.CLASSES', 3, 'qcm',   'un adverbe'),
    ('cls-n3-conj',     'FR.GRAM.CLASSES', 3, 'qcm',   'une conjonction'),
    ('cls-n3-pronom',   'FR.GRAM.CLASSES', 3, 'qcm',   'un pronom'),
    ('cls-n4-adverbe',  'FR.GRAM.CLASSES', 4, 'texte', 'joyeusement'),
    ('cls-n4-conj',     'FR.GRAM.CLASSES', 4, 'texte', 'donc'),
    ('cls-n4-adverbe2', 'FR.GRAM.CLASSES', 4, 'texte', 'dehors')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (type 'grammaire', id deterministe).
-- =========================================================================
DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('FR.GRAM.CLASSES:' || v_niv || ':grammaire')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'FR.GRAM.CLASSES', 'grammaire', v_niv, 'grammaire', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
            type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Garde-fou : 12 items CLASSES, couverture N1..N4, golden global 114.
-- =========================================================================
DO $do$
DECLARE n integer; v_niv integer;
BEGIN
    SELECT count(*) INTO n FROM public.grammaire_item WHERE competence = 'FR.GRAM.CLASSES';
    IF n <> 12 THEN RAISE EXCEPTION 'classes : 12 items attendus, obtenu %', n; END IF;
    FOR v_niv IN 1..4 LOOP
        IF NOT EXISTS (SELECT 1 FROM public.grammaire_item
                        WHERE competence = 'FR.GRAM.CLASSES' AND niveau = v_niv) THEN
            RAISE EXCEPTION 'classes : aucun item au niveau %', v_niv;
        END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.grammaire_item;
    IF n <> 114 THEN RAISE EXCEPTION 'grammaire_item : golden 114 attendu, obtenu %', n; END IF;
END $do$;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0084_cm1_grammaire_classes')
ON CONFLICT (version) DO NOTHING;
