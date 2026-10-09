-- 0089_cm1_grammaire_accords.sql
-- LOT 2 (CM1) - FRANCAIS / GRAMMAIRE : « Les accords ».
-- Attendus de fin de CM1 (eduscol « Francais CM1 - Attendus de fin d'annee »,
-- document 13984 : maîtriser les accords dans le groupe nominal et l'accord
-- sujet-verbe, y compris quand le sujet est éloigné ou inversé ; accord du
-- participe passé employé avec être). Trois competences :
--   FR.GRAM.ACCORD_SV  accorder le verbe avec son sujet (sujet éloigné/inversé) ;
--   FR.GRAM.ACCORD_GN  accorder dans le groupe nominal étendu (adjectifs
--                      multiples, complément du nom) ;
--   FR.GRAM.ACCORD_PP  accord du participe passé avec être.
--
-- On REUTILISE le moteur de grammaire (banque statique grammaire_item + juge
-- verif_grammaire par cle, composant <Grammaire>, formats qcm/clic/texte) :
-- AUCUNE nouvelle UI. Miroir EXACT de grammaire.ts (golden 162 items ; test
-- croise grammaire_test.sql). Formats : N1 qcm, N2 clic, N3 qcm, N4 texte
-- (recopie de la forme bien accordée : réponse libre, « nettement plus exigeant »).
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaine `grammaire` deja ACTIF au defaut
-- (AUCUN changement de domaines_actifs / DEFAULT). Portee CM1..CM2.

-- =========================================================================
-- 1. Competences (domaine grammaire, portee CM1..CM2) + prerequis
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('FR.GRAM.ACCORD_SV', 'FR', 'grammaire', 'Accorder le verbe avec son sujet', 750, 4, 'CM1', 'CM2', true),
    ('FR.GRAM.ACCORD_GN', 'FR', 'grammaire', 'Accorder dans le groupe nominal',  751, 4, 'CM1', 'CM2', true),
    ('FR.GRAM.ACCORD_PP', 'FR', 'grammaire', 'Accorder le participe passé (être)', 752, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.GRAM.ACCORD_SV', 'FR.GRAM.SUJET_VERBE',    2),
    ('FR.GRAM.ACCORD_GN', 'FR.GRAM.GROUPE_NOMINAL', 2),
    ('FR.GRAM.ACCORD_PP', 'FR.GRAM.GROUPE_NOMINAL', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Seed des 36 items (miroir EXACT de grammaire.ts : cle/competence/niveau/
--    format/attendu ; le contenu riche reste cote client).
-- =========================================================================
INSERT INTO public.grammaire_item (cle, competence, niveau, format, attendu) VALUES
    ('asv-n1-pluriel',    'FR.GRAM.ACCORD_SV', 1, 'qcm',   'jouent'),
    ('asv-n1-singulier',  'FR.GRAM.ACCORD_SV', 1, 'qcm',   'dort'),
    ('asv-n1-nous',       'FR.GRAM.ACCORD_SV', 1, 'qcm',   'chantons'),
    ('asv-n2-inverse',    'FR.GRAM.ACCORD_SV', 2, 'clic',  'oiseaux'),
    ('asv-n2-eloigne',    'FR.GRAM.ACCORD_SV', 2, 'clic',  'bébés'),
    ('asv-n2-verbe',      'FR.GRAM.ACCORD_SV', 2, 'clic',  'écoutent'),
    ('asv-n3-eloigne',    'FR.GRAM.ACCORD_SV', 3, 'qcm',   'poussent'),
    ('asv-n3-inverse',    'FR.GRAM.ACCORD_SV', 3, 'qcm',   'courent'),
    ('asv-n3-eloigne2',   'FR.GRAM.ACCORD_SV', 3, 'qcm',   'jouent'),
    ('asv-n4-eloigne',    'FR.GRAM.ACCORD_SV', 4, 'texte', 'écoutent'),
    ('asv-n4-inverse',    'FR.GRAM.ACCORD_SV', 4, 'texte', 'volent'),
    ('asv-n4-singulier',  'FR.GRAM.ACCORD_SV', 4, 'texte', 'aboie'),
    ('agn-n1-pluriel',    'FR.GRAM.ACCORD_GN', 1, 'qcm',   'rouges'),
    ('agn-n1-feminin',    'FR.GRAM.ACCORD_GN', 1, 'qcm',   'verte'),
    ('agn-n1-masc-pluriel','FR.GRAM.ACCORD_GN',1, 'qcm',   'noirs'),
    ('agn-n2-noyau',      'FR.GRAM.ACCORD_GN', 2, 'clic',  'feuilles'),
    ('agn-n2-couleur',    'FR.GRAM.ACCORD_GN', 2, 'clic',  'blanche'),
    ('agn-n2-cdn',        'FR.GRAM.ACCORD_GN', 2, 'clic',  'bouquet'),
    ('agn-n3-multi',      'FR.GRAM.ACCORD_GN', 3, 'qcm',   'silencieuses'),
    ('agn-n3-cdn',        'FR.GRAM.ACCORD_GN', 3, 'qcm',   'blanches'),
    ('agn-n3-fem-pluriel','FR.GRAM.ACCORD_GN', 3, 'qcm',   'joyeuses'),
    ('agn-n4-multi',      'FR.GRAM.ACCORD_GN', 4, 'texte', 'obéissants'),
    ('agn-n4-cdn',        'FR.GRAM.ACCORD_GN', 4, 'texte', 'neufs'),
    ('agn-n4-feminin',    'FR.GRAM.ACCORD_GN', 4, 'texte', 'amusante'),
    ('app-n1-feminin',    'FR.GRAM.ACCORD_PP', 1, 'qcm',   'partie'),
    ('app-n1-masculin',   'FR.GRAM.ACCORD_PP', 1, 'qcm',   'tombé'),
    ('app-n1-pluriel',    'FR.GRAM.ACCORD_PP', 1, 'qcm',   'arrivés'),
    ('app-n2-pp',         'FR.GRAM.ACCORD_PP', 2, 'clic',  'arrivées'),
    ('app-n2-sujet',      'FR.GRAM.ACCORD_PP', 2, 'clic',  'sœurs'),
    ('app-n2-pp2',        'FR.GRAM.ACCORD_PP', 2, 'clic',  'parti'),
    ('app-n3-fem-pluriel','FR.GRAM.ACCORD_PP', 3, 'qcm',   'fanées'),
    ('app-n3-masc-pluriel','FR.GRAM.ACCORD_PP',3, 'qcm',   'rentrés'),
    ('app-n3-feminin',    'FR.GRAM.ACCORD_PP', 3, 'qcm',   'montée'),
    ('app-n4-feminin',    'FR.GRAM.ACCORD_PP', 4, 'texte', 'descendues'),
    ('app-n4-masculin',   'FR.GRAM.ACCORD_PP', 4, 'texte', 'envolés'),
    ('app-n4-feminin2',   'FR.GRAM.ACCORD_PP', 4, 'texte', 'restée')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (type 'grammaire', id deterministe).
-- =========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['FR.GRAM.ACCORD_SV','FR.GRAM.ACCORD_GN','FR.GRAM.ACCORD_PP'] LOOP
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
-- 4. Garde-fou : 12 items par competence, couverture N1..N4, golden global 162.
-- =========================================================================
DO $do$
DECLARE n integer; v_comp text; v_niv integer;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['FR.GRAM.ACCORD_SV','FR.GRAM.ACCORD_GN','FR.GRAM.ACCORD_PP'] LOOP
        SELECT count(*) INTO n FROM public.grammaire_item WHERE competence = v_comp;
        IF n <> 12 THEN RAISE EXCEPTION '% : 12 items attendus, obtenu %', v_comp, n; END IF;
        FOR v_niv IN 1..4 LOOP
            IF NOT EXISTS (SELECT 1 FROM public.grammaire_item
                            WHERE competence = v_comp AND niveau = v_niv) THEN
                RAISE EXCEPTION '% : aucun item au niveau %', v_comp, v_niv;
            END IF;
        END LOOP;
    END LOOP;
    SELECT count(*) INTO n FROM public.grammaire_item;
    IF n <> 162 THEN RAISE EXCEPTION 'grammaire_item : golden 162 attendu, obtenu %', n; END IF;
END $do$;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0089_cm1_grammaire_accords')
ON CONFLICT (version) DO NOTHING;
