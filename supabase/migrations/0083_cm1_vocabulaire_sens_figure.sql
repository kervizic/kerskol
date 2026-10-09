-- 0083_cm1_vocabulaire_sens_figure.sql
-- LOT C (CM1) - FRANCAIS / VOCABULAIRE : « Sens propre et sens figuré ».
-- Attendus de fin de CM1 (eduscol « Francais CM1 - Attendus de fin d'annee »,
-- document 13984 ; lexique) : comprendre le sens propre et le sens figure d'un
-- mot ou d'une expression. Complete FR.VOC.SENS (polysemie) deja livree.
--
-- On REUTILISE le moteur de vocabulaire (banque statique lexique_item + juge
-- verif_lexique par cle, op 'lex', composant <Grammaire>) : AUCUNE nouvelle UI,
-- AUCUN nouveau juge. Nouvelle competence FR.VOC.SENS_FIGURE (domaine
-- `vocabulaire`, deja visible), portee CM1..CM2. N1 QCM (reconnaitre propre /
-- figure), N2/N3 QCM (sens d'une expression imagee), N4 reponse libre (ecrire
-- « propre » ou « figuré »). Miroir EXACT de lexique.ts (golden 152 items ;
-- test croise lexique_test.sql).
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaine `vocabulaire` deja ACTIF au defaut
-- (AUCUN changement de domaines_actifs / DEFAULT). Prerequis FR.VOC.SENS
-- (niveau 2 : comprendre qu'un mot a plusieurs sens precede le sens figure).

-- =========================================================================
-- 1. Competence (domaine vocabulaire, portee CM1..CM2) + prerequis
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('FR.VOC.SENS_FIGURE', 'FR', 'vocabulaire', 'Sens propre et sens figuré', 690, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.VOC.SENS_FIGURE', 'FR.VOC.SENS', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Seed des 12 items (miroir EXACT de lexique.ts).
-- =========================================================================
INSERT INTO public.lexique_item (cle, competence, niveau, format, attendu) VALUES
    ('voc-fig-n1-1', 'FR.VOC.SENS_FIGURE', 1, 'qcm',   'sens propre'),
    ('voc-fig-n1-2', 'FR.VOC.SENS_FIGURE', 1, 'qcm',   'sens figuré'),
    ('voc-fig-n1-3', 'FR.VOC.SENS_FIGURE', 1, 'qcm',   'sens propre'),
    ('voc-fig-n2-1', 'FR.VOC.SENS_FIGURE', 2, 'qcm',   'être très gentil'),
    ('voc-fig-n2-2', 'FR.VOC.SENS_FIGURE', 2, 'qcm',   's''évanouir'),
    ('voc-fig-n2-3', 'FR.VOC.SENS_FIGURE', 2, 'qcm',   'être distrait, rêver'),
    ('voc-fig-n3-1', 'FR.VOC.SENS_FIGURE', 3, 'qcm',   'la phrase B'),
    ('voc-fig-n3-2', 'FR.VOC.SENS_FIGURE', 3, 'qcm',   'réfléchir très fort'),
    ('voc-fig-n3-3', 'FR.VOC.SENS_FIGURE', 3, 'qcm',   'la phrase A'),
    ('voc-fig-n4-1', 'FR.VOC.SENS_FIGURE', 4, 'texte', 'figuré'),
    ('voc-fig-n4-2', 'FR.VOC.SENS_FIGURE', 4, 'texte', 'propre'),
    ('voc-fig-n4-3', 'FR.VOC.SENS_FIGURE', 4, 'texte', 'figuré')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (type 'vocabulaire', id deterministe).
-- =========================================================================
DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('FR.VOC.SENS_FIGURE:' || v_niv || ':vocabulaire')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'FR.VOC.SENS_FIGURE', 'vocabulaire', v_niv, 'vocabulaire', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
            type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Garde-fou : 12 items SENS_FIGURE, couverture N1..N4, golden global 152.
-- =========================================================================
DO $do$
DECLARE n integer; v_niv integer;
BEGIN
    SELECT count(*) INTO n FROM public.lexique_item WHERE competence = 'FR.VOC.SENS_FIGURE';
    IF n <> 12 THEN RAISE EXCEPTION 'sens_figure : 12 items attendus, obtenu %', n; END IF;
    FOR v_niv IN 1..4 LOOP
        IF NOT EXISTS (SELECT 1 FROM public.lexique_item
                        WHERE competence = 'FR.VOC.SENS_FIGURE' AND niveau = v_niv) THEN
            RAISE EXCEPTION 'sens_figure : aucun item au niveau %', v_niv;
        END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.lexique_item;
    IF n <> 152 THEN RAISE EXCEPTION 'lexique_item : golden 152 attendu, obtenu %', n; END IF;
END $do$;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0083_cm1_vocabulaire_sens_figure')
ON CONFLICT (version) DO NOTHING;
