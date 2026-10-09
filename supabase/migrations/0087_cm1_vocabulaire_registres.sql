-- 0087_cm1_vocabulaire_registres.sql
-- LOT C (CM1) - FRANCAIS / VOCABULAIRE : « Les registres de langue ».
-- Attendu de fin de CM1 (eduscol « Francais CM1 - Attendus de fin d'annee »,
-- document 13984 ; lexique) : reconnaitre les registres de langue - FAMILIER,
-- COURANT, SOUTENU - et choisir le mot adapte a la situation.
--
-- On REUTILISE le moteur de vocabulaire (banque statique lexique_item + juge
-- verif_lexique par cle, op 'lex', composant <Grammaire>) : AUCUNE nouvelle UI.
-- Nouvelle competence FR.VOC.REGISTRES (domaine `vocabulaire`, deja visible),
-- portee CM1..CM2. N1 QCM (registre d'un mot), N2/N3 QCM (synonyme / classer),
-- N4 reponse libre (ecrire le registre). Miroir EXACT de lexique.ts
-- (golden 164 items ; test croise lexique_test.sql).
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaine `vocabulaire` deja ACTIF au defaut
-- (AUCUN changement de domaines_actifs / DEFAULT). Prerequis
-- FR.VOC.SYN_CONTRAIRES (niveau 2 : connaitre des synonymes precede le choix du
-- registre adapte).

-- =========================================================================
-- 1. Competence (domaine vocabulaire, portee CM1..CM2) + prerequis
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('FR.VOC.REGISTRES', 'FR', 'vocabulaire', 'Les registres de langue (familier, courant, soutenu)', 691, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.VOC.REGISTRES', 'FR.VOC.SYN_CONTRAIRES', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Seed des 12 items (miroir EXACT de lexique.ts).
-- =========================================================================
INSERT INTO public.lexique_item (cle, competence, niveau, format, attendu) VALUES
    ('voc-reg-n1-1', 'FR.VOC.REGISTRES', 1, 'qcm',   'familier'),
    ('voc-reg-n1-2', 'FR.VOC.REGISTRES', 1, 'qcm',   'familier'),
    ('voc-reg-n1-3', 'FR.VOC.REGISTRES', 1, 'qcm',   'soutenu'),
    ('voc-reg-n2-1', 'FR.VOC.REGISTRES', 2, 'qcm',   'livre'),
    ('voc-reg-n2-2', 'FR.VOC.REGISTRES', 2, 'qcm',   'ravi'),
    ('voc-reg-n2-3', 'FR.VOC.REGISTRES', 2, 'qcm',   'causer'),
    ('voc-reg-n3-1', 'FR.VOC.REGISTRES', 3, 'qcm',   'courant'),
    ('voc-reg-n3-2', 'FR.VOC.REGISTRES', 3, 'qcm',   'familier'),
    ('voc-reg-n3-3', 'FR.VOC.REGISTRES', 3, 'qcm',   'soutenu'),
    ('voc-reg-n4-1', 'FR.VOC.REGISTRES', 4, 'texte', 'familier'),
    ('voc-reg-n4-2', 'FR.VOC.REGISTRES', 4, 'texte', 'soutenu'),
    ('voc-reg-n4-3', 'FR.VOC.REGISTRES', 4, 'texte', 'courant')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (type 'vocabulaire', id deterministe).
-- =========================================================================
DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('FR.VOC.REGISTRES:' || v_niv || ':vocabulaire')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'FR.VOC.REGISTRES', 'vocabulaire', v_niv, 'vocabulaire', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
            type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Garde-fou : 12 items REGISTRES, couverture N1..N4, golden global 164.
-- =========================================================================
DO $do$
DECLARE n integer; v_niv integer;
BEGIN
    SELECT count(*) INTO n FROM public.lexique_item WHERE competence = 'FR.VOC.REGISTRES';
    IF n <> 12 THEN RAISE EXCEPTION 'registres : 12 items attendus, obtenu %', n; END IF;
    FOR v_niv IN 1..4 LOOP
        IF NOT EXISTS (SELECT 1 FROM public.lexique_item
                        WHERE competence = 'FR.VOC.REGISTRES' AND niveau = v_niv) THEN
            RAISE EXCEPTION 'registres : aucun item au niveau %', v_niv;
        END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.lexique_item;
    IF n <> 164 THEN RAISE EXCEPTION 'lexique_item : golden 164 attendu, obtenu %', n; END IF;
END $do$;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0087_cm1_vocabulaire_registres')
ON CONFLICT (version) DO NOTHING;
