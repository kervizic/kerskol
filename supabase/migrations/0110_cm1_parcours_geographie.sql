-- 0110_cm1_parcours_geographie.sql
-- LOT 3 (CM1) - PARCOURS DE GEOGRAPHIE (meme methode « parcours » que l'Histoire,
-- SANS frise). Seed des items 'qm' des etapes QUESTIONS et JE RETIENS, sous les
-- COMPETENCES GEO.* EXISTANTES (0104) : ils alimentent l'EMA existant, sans
-- nouvelle competence ni nouveau domaine. Une question par chapitre est au format
-- 'clic' (completer une carte : toucher le bon continent).
--
-- Miroir EXACT de frontend/src/domain/geographie/parcours.ts. Test croise :
-- parcoursGeo.test.ts (front) + supabase/tests/parcours_geo_test.sql (SQL).
--
-- Geographie FACTUELLE et HONNETE (inegalites, eau, faim nommees avec mesure,
-- sans misere). GEO reste sous bienveillance stricte (aucun mot dramatique).
--
-- Securite / donnees reelles : ADDITIVE et IDEMPOTENTE (ON CONFLICT (cle) DO
-- UPDATE). Aucun changement de schema, de competence, de domaine ni du DEFAUT
-- de profils.domaines_actifs. Serveur seul juge (op 'qm' + verif_qm, GEO.% deja
-- acceptes en 0098). qm_item accepte deja GEO.% et le format 'clic'.

INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- Chapitre 1 - Se nourrir dans le monde (GEO.NOURRIR)
    ('pg-nou-q1',  'GEO.NOURRIR',    1, 'qcm',   'le riz'),
    ('pg-nou-q2',  'GEO.NOURRIR',    2, 'qcm',   'des céréales'),
    ('pg-nou-q3',  'GEO.NOURRIR',    2, 'clic',  'l''Asie'),
    ('pg-nou-q4',  'GEO.NOURRIR',    4, 'texte', 'sous-alimentation'),
    ('pg-nou-jr1', 'GEO.NOURRIR',    2, 'texte', 'céréales'),
    ('pg-nou-jr2', 'GEO.NOURRIR',    2, 'texte', 'riz'),
    ('pg-nou-jr3', 'GEO.NOURRIR',    4, 'texte', 'sous-alimentation'),
    -- Chapitre 2 - Les inegalites dans le monde (GEO.INEGALITES)
    ('pg-ine-q1',  'GEO.INEGALITES', 1, 'qcm',   'de l''eau'),
    ('pg-ine-q2',  'GEO.INEGALITES', 2, 'qcm',   'l''eau potable'),
    ('pg-ine-q3',  'GEO.INEGALITES', 2, 'clic',  'l''Afrique'),
    ('pg-ine-q4',  'GEO.INEGALITES', 4, 'texte', 'planisphère'),
    ('pg-ine-jr1', 'GEO.INEGALITES', 2, 'texte', 'potable'),
    ('pg-ine-jr2', 'GEO.INEGALITES', 3, 'texte', 'essentiels'),
    ('pg-ine-jr3', 'GEO.INEGALITES', 2, 'texte', 'planisphère')
ON CONFLICT (cle) DO UPDATE SET
    competence = EXCLUDED.competence,
    niveau     = EXCLUDED.niveau,
    format     = EXCLUDED.format,
    attendu    = EXCLUDED.attendu;

INSERT INTO public.schema_migrations (version)
VALUES ('0110_cm1_parcours_geographie')
ON CONFLICT (version) DO NOTHING;
