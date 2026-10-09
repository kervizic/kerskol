-- 0106_cm1_emc_laicite.sql
-- LOT 4 (CM1) - EMC : alignement sur le PROGRAMME 2024, ajout de « la laicite ».
--
-- Source officielle : programme d'enseignement moral et civique, BO n° 24 du
-- 13 juin 2024 (mise en œuvre progressive 2024-2026). Attendu CM1 explicite :
-- « connaitre et expliquer avec des exemples les mots Liberte, Egalite,
-- Fraternite, laicite » ; « comprendre que la laicite accorde a chacun un droit
-- egal a exercer librement son jugement et exige le respect de ce droit chez
-- autrui » ; respect des croyances et convictions d'autrui, tolerance.
--
-- CONSTAT : l'EMC CM1 livre en 0101 (droits de l'enfant, symboles de la
-- Republique, cooperation, egalite filles-garcons, prudence numerique,
-- engagement) couvre l'essentiel du programme 2024, SAUF la LAICITE. Ce lot
-- comble ce seul ecart en ajoutant une 7e sous-matiere EMC.LAICITE (domaine
-- laicite), sans toucher aux six autres.
--
-- BIENVEILLANCE STRICTE (EMC n'est pas exempte comme l'histoire) : aucune
-- religion citee ni jugee ; le token « se moquer » reste couvert par la
-- whitelist EMC de bienveillance_test.sql (sujet enseigne : refuser la moquerie).
--
-- Securite / donnees reelles : ADDITIVE et IDEMPOTENTE. Defaut domaines_actifs
-- LU en base puis COMPLETE (jamais recopie). Portee CM1..CM2 (masquee au CE2).

-- ===========================================================================
-- 1. Referentiel : competence EMC.LAICITE.
-- ===========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('EMC.LAICITE', 'EMC', 'laicite', 'La laïcité et le respect des croyances', 1960, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min,
    classe_max=EXCLUDED.classe_max, actif=true;

-- ===========================================================================
-- 2. Seed des items (8 : EMC.LAICITE x 4 niveaux x 2). Genere depuis
--    frontend/src/domain/emc/cm1.ts ; test croise front<->SQL.
-- ===========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    ('emc-lai-n1-a', 'EMC.LAICITE', 1, 'qcm', 'oui, tous pareil'),
    ('emc-lai-n1-b', 'EMC.LAICITE', 1, 'qcm', 'ne pas croire'),
    ('emc-lai-n2-a', 'EMC.LAICITE', 2, 'qcm', 'la laïcité'),
    ('emc-lai-n2-b', 'EMC.LAICITE', 2, 'tri', 'avoir chacun ses croyances=la laïcité le permet;respecter les croyances des autres=la laïcité le permet;se moquer de la croyance d''un camarade=la laïcité ne le permet pas;obliger les autres à croire comme soi=la laïcité ne le permet pas'),
    ('emc-lai-n3-a', 'EMC.LAICITE', 3, 'qcm', 'se respecter tous les deux'),
    ('emc-lai-n3-b', 'EMC.LAICITE', 3, 'qcm', 'jugement'),
    ('emc-lai-n4-a', 'EMC.LAICITE', 4, 'texte', 'laïcité'),
    ('emc-lai-n4-b', 'EMC.LAICITE', 4, 'texte', 'tolérance')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- ===========================================================================
-- 3. Exercices de reference (type 'emc', methode 'vivre_ensemble' comme 0101).
--    exercice_id = md5('<competence>:<niveau>:emc').
-- ===========================================================================
DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('EMC.LAICITE:' || v_niv || ':emc')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'EMC.LAICITE', 'emc', v_niv, 'vivre_ensemble', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
            type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

-- ===========================================================================
-- 4. Activation du NOUVEAU domaine 'laicite' (defaut LU en base puis COMPLETE).
-- ===========================================================================
DO $do$
DECLARE
    v_expr text; v_cur text[]; v_before text[]; d text;
    v_new text[] := ARRAY['laicite'];
BEGIN
    SELECT pg_get_expr(adbin, adrelid) INTO v_expr
      FROM pg_attrdef ad
      JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
     WHERE a.attrelid = 'public.profils'::regclass AND a.attname = 'domaines_actifs';
    IF v_expr IS NULL THEN RAISE EXCEPTION 'domaines_actifs : DEFAUT introuvable'; END IF;
    EXECUTE 'SELECT ' || v_expr INTO v_cur;
    v_before := v_cur;
    FOREACH d IN ARRAY v_new LOOP
        IF NOT (d = ANY (v_cur)) THEN v_cur := v_cur || ARRAY[d]; END IF;
    END LOOP;
    FOREACH d IN ARRAY v_before LOOP
        IF NOT (d = ANY (v_cur)) THEN RAISE EXCEPTION 'completude KO : % aurait disparu', d; END IF;
    END LOOP;
    IF NOT ('laicite' = ANY (v_cur)) THEN RAISE EXCEPTION 'completude KO : laicite manque'; END IF;
    EXECUTE 'ALTER TABLE public.profils ALTER COLUMN domaines_actifs SET DEFAULT '
            || quote_literal(v_cur::text) || '::text[]';
END $do$;

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'laicite')
 WHERE NOT ('laicite' = ANY (domaines_actifs));

-- ===========================================================================
-- 5. Enregistrement de la migration
-- ===========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0106_cm1_emc_laicite')
ON CONFLICT (version) DO NOTHING;
