-- 0081_cm1_grammaire_complements.sql
-- LOT C (CM1) - FRANCAIS / GRAMMAIRE : « Les compléments ».
-- Attendus de fin de CM1 (programme cycle 3, actualise 2025 ; eduscol « Francais
-- CM1 - Attendus de fin d'annee », document 13984) : identifier les constituants
-- d'une phrase simple -> sujet, verbe, COMPLEMENTS D'OBJET (direct / indirect) et
-- COMPLEMENTS CIRCONSTANCIELS (temps, lieu).
--
-- On REUTILISE INTEGRALEMENT le moteur de grammaire (banque statique
-- grammaire_item + verif_grammaire par cle, composant <Grammaire>, formats
-- qcm / clic / texte) : AUCUNE nouvelle UI, AUCUN nouveau juge. Nouvelle
-- competence FR.GRAM.COMPLEMENTS (domaine `grammaire`, deja visible), portee
-- CM1..CM2. Miroir EXACT de frontend/src/domain/francais/grammaire.ts
-- (golden 90 items ; test croise grammaire_test.sql).
--
-- Etagement : N1 QCM (reconnaitre) ; N2 clic (un mot) ; N3 QCM (distinguer
-- objet direct / indirect) ou clic ; N4 reponse libre (ecrire le nom noyau).
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaine `grammaire` deja ACTIF (AUCUN
-- changement de domaines_actifs / DEFAULT). Visibilite : sous-matiere
-- `grammaire` visible CP..CM2 ; la portee CM1..CM2 de la competence + le
-- prerequis FR.GRAM.SUJET_VERBE (niveau 2) la reservent au CM1 (et « en avance »
-- a un CE2 seulement s'il a acquis sujet/verbe).

-- =========================================================================
-- 1. Competence (domaine grammaire, portee CM1..CM2) + prerequis
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('FR.GRAM.COMPLEMENTS', 'FR', 'grammaire', 'Les compléments (objet et circonstanciels)', 745, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.GRAM.COMPLEMENTS', 'FR.GRAM.SUJET_VERBE', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Seed des 12 items (miroir EXACT de grammaire.ts).
-- =========================================================================
INSERT INTO public.grammaire_item (cle, competence, niveau, format, attendu) VALUES
    ('comp-n1-cod',     'FR.GRAM.COMPLEMENTS', 1, 'qcm',   'la voiture'),
    ('comp-n1-cc-temps','FR.GRAM.COMPLEMENTS', 1, 'qcm',   'demain'),
    ('comp-n1-cc-lieu', 'FR.GRAM.COMPLEMENTS', 1, 'qcm',   'sur le lit'),
    ('comp-n2-cod',     'FR.GRAM.COMPLEMENTS', 2, 'clic',  'bateau'),
    ('comp-n2-cc-lieu', 'FR.GRAM.COMPLEMENTS', 2, 'clic',  'dehors'),
    ('comp-n2-cc-temps','FR.GRAM.COMPLEMENTS', 2, 'clic',  'tôt'),
    ('comp-n3-coi',     'FR.GRAM.COMPLEMENTS', 3, 'qcm',   'un complément d''objet indirect'),
    ('comp-n3-cod',     'FR.GRAM.COMPLEMENTS', 3, 'qcm',   'un complément d''objet direct'),
    ('comp-n3-cc-clic', 'FR.GRAM.COMPLEMENTS', 3, 'clic',  'matin'),
    ('comp-n4-cod',     'FR.GRAM.COMPLEMENTS', 4, 'texte', 'fleurs'),
    ('comp-n4-cod2',    'FR.GRAM.COMPLEMENTS', 4, 'texte', 'gâteau'),
    ('comp-n4-cc',      'FR.GRAM.COMPLEMENTS', 4, 'texte', 'ciel')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (type 'grammaire', id deterministe).
-- =========================================================================
DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('FR.GRAM.COMPLEMENTS:' || v_niv || ':grammaire')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'FR.GRAM.COMPLEMENTS', 'grammaire', v_niv, 'grammaire', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
            type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Garde-fou : 12 items COMPLEMENTS, couverture N1..N4, golden global 90.
-- =========================================================================
DO $do$
DECLARE n integer; v_niv integer;
BEGIN
    SELECT count(*) INTO n FROM public.grammaire_item WHERE competence = 'FR.GRAM.COMPLEMENTS';
    IF n <> 12 THEN RAISE EXCEPTION 'complements : 12 items attendus, obtenu %', n; END IF;
    FOR v_niv IN 1..4 LOOP
        IF NOT EXISTS (SELECT 1 FROM public.grammaire_item
                        WHERE competence = 'FR.GRAM.COMPLEMENTS' AND niveau = v_niv) THEN
            RAISE EXCEPTION 'complements : aucun item au niveau %', v_niv;
        END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.grammaire_item;
    IF n <> 90 THEN RAISE EXCEPTION 'grammaire_item : golden 90 attendu, obtenu %', n; END IF;
END $do$;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0081_cm1_grammaire_complements')
ON CONFLICT (version) DO NOTHING;
