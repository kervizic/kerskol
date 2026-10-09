-- 0124_ce1_francais_dedie.sql
-- LOT CE1 (incrément 13) - FRANÇAIS : 3 compétences CE1 DÉDIÉES ([CE1,CE1]),
-- 4 niveaux TOUS calibrés CE1, sans débordement CM1. Ce sont exactement les
-- notions que 0116 avait DIFFÉRÉES parce que leurs versions partagées sont
-- calibrées CM1 (FR.GRAM.ACCORD_GN / ACCORD_SV / HOMOPHONES, [CM1,CM2]) :
--   FR.GRAM.CE1_ACCORD_GN  accord déterminant + nom + adjectif (genre/nombre) ;
--   FR.GRAM.CE1_ACCORD_SV  accord du verbe avec le sujet, au présent ;
--   FR.GRAM.CE1_HOMOPHONES a/à, et/est, son/sont, on/ont.
-- (Mots invariables et ordre alphabétique sont DÉJÀ servis au CE1 par les
--  compétences partagées FR.MOTS.INVARIABLES et FR.VOC.ALPHABET, ouvertes CE1
--  par 0116 : on ne crée pas de doublon.)
--
-- Moteur RÉUTILISÉ (aucune UI nouvelle) : banque grammaire_item + juge
-- verif_grammaire par cle, composant <Grammaire>, formats qcm/clic/texte. Miroir
-- EXACT de frontend/.../francais/grammaire.ts (cle/format/attendu). Test croisé :
-- supabase/tests/grammaire_test.sql + frontend grammaire.test.ts (golden 198).
--
-- SÛRETÉ CE2 (Iris). Chaque compétence est bornée [CE1,CE1] : le gate
-- composeSession (estSousNiveau) l'écarte du pool normal d'un CE2 ; elle ne
-- revient qu'EN RÉVISION comme prérequis de remédiation de la compétence CM1
-- liée (travaillée en lacune). Le prérequis CE1 -> CM1 ne VERROUILLE pas la
-- compétence liée (garde-fou générique isUnlocked(ignore=sousNiveau), incrément
-- 12). Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Compétences CE1 dédiées + prérequis de remédiation vers la version CM1.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('FR.GRAM.CE1_ACCORD_GN',  'FR', 'grammaire',   'Accorder le groupe du nom (CE1)',        760, 4, 'CE1', 'CE1', true),
    ('FR.GRAM.CE1_ACCORD_SV',  'FR', 'grammaire',   'Accorder le verbe avec le sujet (CE1)',  761, 4, 'CE1', 'CE1', true),
    ('FR.GRAM.CE1_HOMOPHONES', 'FR', 'orthographe', 'Les petits mots : a/à, et/est, son/sont, on/ont (CE1)', 762, 4, 'CE1', 'CE1', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.GRAM.ACCORD_GN',  'FR.GRAM.CE1_ACCORD_GN',  2),
    ('FR.GRAM.ACCORD_SV',  'FR.GRAM.CE1_ACCORD_SV',  2),
    ('FR.GRAM.HOMOPHONES', 'FR.GRAM.CE1_HOMOPHONES', 2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 2. Items de référence (miroir EXACT de grammaire.ts). 12 par compétence.
-- =========================================================================
INSERT INTO public.grammaire_item (cle, competence, niveau, format, attendu) VALUES
    ('ce1agn-n1-pluriel',     'FR.GRAM.CE1_ACCORD_GN', 1, 'qcm',   'chats'),
    ('ce1agn-n1-feminin',     'FR.GRAM.CE1_ACCORD_GN', 1, 'qcm',   'petite'),
    ('ce1agn-n1-determinant', 'FR.GRAM.CE1_ACCORD_GN', 1, 'qcm',   'Les'),
    ('ce1agn-n2-nom',         'FR.GRAM.CE1_ACCORD_GN', 2, 'clic',  'maisons'),
    ('ce1agn-n2-adjectif',    'FR.GRAM.CE1_ACCORD_GN', 2, 'clic',  'petite'),
    ('ce1agn-n2-determinant', 'FR.GRAM.CE1_ACCORD_GN', 2, 'clic',  'des'),
    ('ce1agn-n3-fem-pluriel', 'FR.GRAM.CE1_ACCORD_GN', 3, 'qcm',   'vertes'),
    ('ce1agn-n3-masc-pluriel','FR.GRAM.CE1_ACCORD_GN', 3, 'qcm',   'noirs'),
    ('ce1agn-n3-phrase',      'FR.GRAM.CE1_ACCORD_GN', 3, 'qcm',   'les petits chats'),
    ('ce1agn-n4-pluriel',     'FR.GRAM.CE1_ACCORD_GN', 4, 'texte', 'bleus'),
    ('ce1agn-n4-feminin',     'FR.GRAM.CE1_ACCORD_GN', 4, 'texte', 'jolie'),
    ('ce1agn-n4-fem-pluriel', 'FR.GRAM.CE1_ACCORD_GN', 4, 'texte', 'rouges'),
    ('ce1asv-n1-il',          'FR.GRAM.CE1_ACCORD_SV', 1, 'qcm',   'joue'),
    ('ce1asv-n1-ils',         'FR.GRAM.CE1_ACCORD_SV', 1, 'qcm',   'mangent'),
    ('ce1asv-n1-nous',        'FR.GRAM.CE1_ACCORD_SV', 1, 'qcm',   'chantons'),
    ('ce1asv-n2-verbe',       'FR.GRAM.CE1_ACCORD_SV', 2, 'clic',  'jouent'),
    ('ce1asv-n2-sujet',       'FR.GRAM.CE1_ACCORD_SV', 2, 'clic',  'chien'),
    ('ce1asv-n2-verbe2',      'FR.GRAM.CE1_ACCORD_SV', 2, 'clic',  'regardons'),
    ('ce1asv-n3-ils',         'FR.GRAM.CE1_ACCORD_SV', 3, 'qcm',   'volent'),
    ('ce1asv-n3-elle',        'FR.GRAM.CE1_ACCORD_SV', 3, 'qcm',   'finit'),
    ('ce1asv-n3-vous',        'FR.GRAM.CE1_ACCORD_SV', 3, 'qcm',   'parlez'),
    ('ce1asv-n4-ils',         'FR.GRAM.CE1_ACCORD_SV', 4, 'texte', 'jouent'),
    ('ce1asv-n4-nous',        'FR.GRAM.CE1_ACCORD_SV', 4, 'texte', 'regardons'),
    ('ce1asv-n4-elles',       'FR.GRAM.CE1_ACCORD_SV', 4, 'texte', 'chantent'),
    ('ce1homo-n1-a',          'FR.GRAM.CE1_HOMOPHONES', 1, 'qcm',  'a'),
    ('ce1homo-n1-et',         'FR.GRAM.CE1_HOMOPHONES', 1, 'qcm',  'et'),
    ('ce1homo-n1-on',         'FR.GRAM.CE1_HOMOPHONES', 1, 'qcm',  'On'),
    ('ce1homo-n2-aaccent',    'FR.GRAM.CE1_HOMOPHONES', 2, 'qcm',  'à'),
    ('ce1homo-n2-est',        'FR.GRAM.CE1_HOMOPHONES', 2, 'qcm',  'est'),
    ('ce1homo-n2-sont',       'FR.GRAM.CE1_HOMOPHONES', 2, 'qcm',  'sont'),
    ('ce1homo-n3-son',        'FR.GRAM.CE1_HOMOPHONES', 3, 'qcm',  'son'),
    ('ce1homo-n3-ont',        'FR.GRAM.CE1_HOMOPHONES', 3, 'qcm',  'ont'),
    ('ce1homo-n3-a',          'FR.GRAM.CE1_HOMOPHONES', 3, 'qcm',  'a'),
    ('ce1homo-n4-est',        'FR.GRAM.CE1_HOMOPHONES', 4, 'qcm',  'est'),
    ('ce1homo-n4-sont',       'FR.GRAM.CE1_HOMOPHONES', 4, 'qcm',  'sont'),
    ('ce1homo-n4-ont',        'FR.GRAM.CE1_HOMOPHONES', 4, 'qcm',  'ont')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de référence (type 'grammaire', id déterministe).
-- =========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['FR.GRAM.CE1_ACCORD_GN','FR.GRAM.CE1_ACCORD_SV','FR.GRAM.CE1_HOMOPHONES'] LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':grammaire')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'grammaire', v_niv, 'grammaire', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Garde-fous : 12 items par compétence, couverture N1..N4, bornes CE1,
--    prérequis de remédiation présents, golden global grammaire_item = 198.
-- =========================================================================
DO $do$
DECLARE n integer; v_comp text; v_niv integer; bad text;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['FR.GRAM.CE1_ACCORD_GN','FR.GRAM.CE1_ACCORD_SV','FR.GRAM.CE1_HOMOPHONES'] LOOP
        SELECT count(*) INTO n FROM public.grammaire_item WHERE competence = v_comp;
        IF n <> 12 THEN RAISE EXCEPTION '% : 12 items attendus, obtenu %', v_comp, n; END IF;
        FOR v_niv IN 1..4 LOOP
            IF NOT EXISTS (SELECT 1 FROM public.grammaire_item WHERE competence = v_comp AND niveau = v_niv) THEN
                RAISE EXCEPTION '% : aucun item au niveau %', v_comp, v_niv;
            END IF;
        END LOOP;
        IF NOT EXISTS (SELECT 1 FROM public.competences
                        WHERE code = v_comp AND classe_min = 'CE1' AND classe_max = 'CE1') THEN
            RAISE EXCEPTION '% : portée [CE1,CE1] attendue', v_comp;
        END IF;
    END LOOP;

    -- Prérequis de remédiation CE1 -> CM1 présents.
    SELECT string_agg(x.competence || ' <- ' || x.prerequis, ', ') INTO bad
      FROM (VALUES
        ('FR.GRAM.ACCORD_GN','FR.GRAM.CE1_ACCORD_GN'),
        ('FR.GRAM.ACCORD_SV','FR.GRAM.CE1_ACCORD_SV'),
        ('FR.GRAM.HOMOPHONES','FR.GRAM.CE1_HOMOPHONES')) AS x(competence, prerequis)
     WHERE NOT EXISTS (SELECT 1 FROM public.competence_prerequis cp
                        WHERE cp.competence = x.competence AND cp.prerequis = x.prerequis);
    IF bad IS NOT NULL THEN RAISE EXCEPTION 'prérequis de remédiation manquant : %', bad; END IF;

    SELECT count(*) INTO n FROM public.grammaire_item;
    IF n <> 198 THEN RAISE EXCEPTION 'grammaire_item : golden 198 attendu, obtenu %', n; END IF;
END $do$;

-- =========================================================================
-- 5. Enregistrement de la migration.
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0124_ce1_francais_dedie')
ON CONFLICT (version) DO NOTHING;
