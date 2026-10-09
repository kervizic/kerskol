-- 0086_cm1_grammaire_phrase.sql
-- LOT C (CM1) - FRANCAIS / GRAMMAIRE : « Phrase simple et phrase complexe ».
-- Attendu de fin de CM1 (eduscol « Francais CM1 - Attendus de fin d'annee »,
-- document 13984) : distinguer une phrase SIMPLE (un seul verbe conjugue) d'une
-- phrase COMPLEXE (plusieurs verbes conjugues / plusieurs propositions).
--
-- On REUTILISE le moteur de grammaire (banque statique grammaire_item + juge
-- verif_grammaire par cle, composant <Grammaire>, formats qcm/clic/texte) :
-- AUCUNE nouvelle UI. Nouvelle competence FR.GRAM.PHRASE (domaine `grammaire`),
-- portee CM1..CM2. N1 QCM (compter les verbes), N2 clic (un verbe), N3 QCM
-- (phrases plus longues), N4 reponse libre. Miroir EXACT de grammaire.ts
-- (golden 126 items ; test croise grammaire_test.sql).
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaine `grammaire` deja ACTIF au defaut
-- (AUCUN changement de domaines_actifs / DEFAULT). Prerequis FR.GRAM.SUJET_VERBE
-- (niveau 2 : savoir trouver le verbe conjugue precede le comptage des verbes).

-- =========================================================================
-- 1. Competence (domaine grammaire, portee CM1..CM2) + prerequis
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('FR.GRAM.PHRASE', 'FR', 'grammaire', 'Phrase simple et phrase complexe', 747, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.GRAM.PHRASE', 'FR.GRAM.SUJET_VERBE', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Seed des 12 items (miroir EXACT de grammaire.ts).
-- =========================================================================
INSERT INTO public.grammaire_item (cle, competence, niveau, format, attendu) VALUES
    ('phr-n1-1', 'FR.GRAM.PHRASE', 1, 'qcm',   'un'),
    ('phr-n1-2', 'FR.GRAM.PHRASE', 1, 'qcm',   'simple'),
    ('phr-n1-3', 'FR.GRAM.PHRASE', 1, 'qcm',   'complexe'),
    ('phr-n2-1', 'FR.GRAM.PHRASE', 2, 'clic',  'boit'),
    ('phr-n2-2', 'FR.GRAM.PHRASE', 2, 'clic',  'chantent'),
    ('phr-n2-3', 'FR.GRAM.PHRASE', 2, 'clic',  'puis'),
    ('phr-n3-1', 'FR.GRAM.PHRASE', 3, 'qcm',   'complexe'),
    ('phr-n3-2', 'FR.GRAM.PHRASE', 3, 'qcm',   'simple'),
    ('phr-n3-3', 'FR.GRAM.PHRASE', 3, 'qcm',   'trois'),
    ('phr-n4-1', 'FR.GRAM.PHRASE', 4, 'texte', 'chantent'),
    ('phr-n4-2', 'FR.GRAM.PHRASE', 4, 'texte', 'dort'),
    ('phr-n4-3', 'FR.GRAM.PHRASE', 4, 'texte', 'sors')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (type 'grammaire', id deterministe).
-- =========================================================================
DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('FR.GRAM.PHRASE:' || v_niv || ':grammaire')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'FR.GRAM.PHRASE', 'grammaire', v_niv, 'grammaire', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
            type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Garde-fou : 12 items PHRASE, couverture N1..N4, golden global 126.
-- =========================================================================
DO $do$
DECLARE n integer; v_niv integer;
BEGIN
    SELECT count(*) INTO n FROM public.grammaire_item WHERE competence = 'FR.GRAM.PHRASE';
    IF n <> 12 THEN RAISE EXCEPTION 'phrase : 12 items attendus, obtenu %', n; END IF;
    FOR v_niv IN 1..4 LOOP
        IF NOT EXISTS (SELECT 1 FROM public.grammaire_item
                        WHERE competence = 'FR.GRAM.PHRASE' AND niveau = v_niv) THEN
            RAISE EXCEPTION 'phrase : aucun item au niveau %', v_niv;
        END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.grammaire_item;
    IF n <> 126 THEN RAISE EXCEPTION 'grammaire_item : golden 126 attendu, obtenu %', n; END IF;
END $do$;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0086_cm1_grammaire_phrase')
ON CONFLICT (version) DO NOTHING;
