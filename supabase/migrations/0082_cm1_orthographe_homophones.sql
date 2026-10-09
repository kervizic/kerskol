-- 0082_cm1_orthographe_homophones.sql
-- LOT C (CM1) - FRANCAIS / ORTHOGRAPHE : « Les homophones grammaticaux ».
-- Attendus de fin de CM1 (eduscol « Francais CM1 - Attendus de fin d'annee »,
-- document 13984 ; orthographe grammaticale) : distinguer les homophones
-- grammaticaux frequents -> ou/ou, on/ont, ce/se, ces/ses, leur/leurs,
-- tout/tous, c'est/s'est.
--
-- On REUTILISE le moteur de grammaire (banque statique grammaire_item + juge
-- verif_grammaire par cle, composant <Grammaire>, format QCM) : AUCUNE nouvelle
-- UI. Le code reste FR.GRAM.* (contrainte grammaire_item_comp_chk) mais le
-- DOMAINE de la competence est `orthographe` (deja actif) : la sous-matiere
-- s'affiche sous « Orthographe ». Format QCM a tous les niveaux (on ne peut pas
-- TAPER la reponse : les deux mots se prononcent pareil) ; la difficulte croit
-- par la subtilite de la paire (ou/ou -> c'est/s'est). Miroir EXACT de
-- grammaire.ts (golden 102 items ; test croise grammaire_test.sql).
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaine `orthographe` deja ACTIF au defaut
-- (AUCUN changement de domaines_actifs / DEFAULT). Portee CM1..CM2 + prerequis
-- FR.GRAM.NATURE (niveau 2 : reconnaitre nom / verbe aide a choisir ce/se...).

-- =========================================================================
-- 1. Competence (domaine orthographe, portee CM1..CM2) + prerequis
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('FR.GRAM.HOMOPHONES', 'FR', 'orthographe', 'Les homophones (ce/se, ou/où, leur/leurs...)', 748, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.GRAM.HOMOPHONES', 'FR.GRAM.NATURE', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Seed des 12 items (miroir EXACT de grammaire.ts ; casse significative).
-- =========================================================================
INSERT INTO public.grammaire_item (cle, competence, niveau, format, attendu) VALUES
    ('homo-n1-ou',    'FR.GRAM.HOMOPHONES', 1, 'qcm', 'ou'),
    ('homo-n1-on',    'FR.GRAM.HOMOPHONES', 1, 'qcm', 'On'),
    ('homo-n1-ou2',   'FR.GRAM.HOMOPHONES', 1, 'qcm', 'où'),
    ('homo-n2-ce',    'FR.GRAM.HOMOPHONES', 2, 'qcm', 'Ce'),
    ('homo-n2-se',    'FR.GRAM.HOMOPHONES', 2, 'qcm', 'se'),
    ('homo-n2-ont',   'FR.GRAM.HOMOPHONES', 2, 'qcm', 'ont'),
    ('homo-n3-ces',   'FR.GRAM.HOMOPHONES', 3, 'qcm', 'ces'),
    ('homo-n3-tous',  'FR.GRAM.HOMOPHONES', 3, 'qcm', 'Tous'),
    ('homo-n3-leurs', 'FR.GRAM.HOMOPHONES', 3, 'qcm', 'leurs'),
    ('homo-n4-cest',  'FR.GRAM.HOMOPHONES', 4, 'qcm', 'C''est'),
    ('homo-n4-sest',  'FR.GRAM.HOMOPHONES', 4, 'qcm', 's''est'),
    ('homo-n4-leur',  'FR.GRAM.HOMOPHONES', 4, 'qcm', 'leur')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (type 'grammaire', id deterministe).
-- =========================================================================
DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('FR.GRAM.HOMOPHONES:' || v_niv || ':grammaire')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'FR.GRAM.HOMOPHONES', 'grammaire', v_niv, 'grammaire', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
            type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Garde-fou : 12 items HOMOPHONES, couverture N1..N4, golden global 102.
-- =========================================================================
DO $do$
DECLARE n integer; v_niv integer;
BEGIN
    SELECT count(*) INTO n FROM public.grammaire_item WHERE competence = 'FR.GRAM.HOMOPHONES';
    IF n <> 12 THEN RAISE EXCEPTION 'homophones : 12 items attendus, obtenu %', n; END IF;
    FOR v_niv IN 1..4 LOOP
        IF NOT EXISTS (SELECT 1 FROM public.grammaire_item
                        WHERE competence = 'FR.GRAM.HOMOPHONES' AND niveau = v_niv) THEN
            RAISE EXCEPTION 'homophones : aucun item au niveau %', v_niv;
        END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.grammaire_item;
    IF n <> 102 THEN RAISE EXCEPTION 'grammaire_item : golden 102 attendu, obtenu %', n; END IF;
END $do$;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0082_cm1_orthographe_homophones')
ON CONFLICT (version) DO NOTHING;
