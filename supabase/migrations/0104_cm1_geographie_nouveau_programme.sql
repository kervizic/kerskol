-- 0104_cm1_geographie_nouveau_programme.sql
-- LOT 2 (CM1) - GEOGRAPHIE refaite selon le NOUVEAU PROGRAMME 2026.
--
-- Source officielle : programme d'histoire-geographie du cycle 3 (annexe 4),
-- applicable au CM1 a la rentree 2026.
--   https://www.education.gouv.fr/sites/default/files/document/annexe-4-programme-d-histoire-geographie-cycle-3-516779.pdf
-- CM1 geographie = « la diversite des modes de vie dans le monde ». QUATRE
-- sous-matieres :
--   GEO.NOURRIR     se_nourrir   se nourrir dans le monde (cereales, agriculture,
--                                elevage, peche, alimentation variee) ;
--   GEO.INEGALITES  inegalites   les inegalites dans le monde (eau potable,
--                                sante, education ; planisphere) ;
--   GEO.DEPLACER    se_deplacer  se deplacer (modes, infrastructures, distances
--                                en kilometres et temps de trajet) ;
--   GEO.COMMUNIQUER communiquer  communiquer avec Internet (usages, cables
--                                sous-marins et satellites, inegalites d'acces).
--
-- BIENVEILLANCE STRICTE : la geographie reste sous la regle de bienveillance
-- (seule l'histoire est exemptee). Les inegalites sont dites avec mesure.
--
-- ANCIEN programme (0100 : se_reperer, habiter, travail_loisirs, consommer,
-- france_reperes, paysages) : competences DESACTIVEES (actif=false) cote
-- competences ET exercices, SANS perte de donnees (items et reponses conserves).
--
-- Securite / donnees reelles : ADDITIVE et IDEMPOTENTE. Defaut domaines_actifs
-- LU en base puis COMPLETE (jamais recopie). Portee CM1..CM2 (masquee au CE2).

-- ===========================================================================
-- 1. Referentiel : competences actives (nouveau programme).
-- ===========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('GEO.NOURRIR',     'GEO', 'se_nourrir',  'Se nourrir dans le monde',     1700, 'CM1', 'CM2'),
    ('GEO.INEGALITES',  'GEO', 'inegalites',  'Les inégalités dans le monde', 1710, 'CM1', 'CM2'),
    ('GEO.DEPLACER',    'GEO', 'se_deplacer', 'Se déplacer',                  1720, 'CM1', 'CM2'),
    ('GEO.COMMUNIQUER', 'GEO', 'communiquer', 'Communiquer avec Internet',    1730, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min,
    classe_max=EXCLUDED.classe_max, actif=true;

-- Anciennes sous-matieres (ancien programme) : DESACTIVEES, donnees conservees.
UPDATE public.competences SET actif=false
 WHERE code IN ('GEO.REPERES','GEO.HABITER','GEO.ACTIVITES','GEO.CONSOMMER','GEO.FRANCE','GEO.PAYSAGES');

-- ===========================================================================
-- 2. Seed des items (32 : 4 competences x 4 niveaux x 2). Genere depuis
--    frontend/src/domain/geographie/bank.ts ; test croise front<->SQL.
-- ===========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- GEO.NOURRIR
    ('ge-nou-n1-a', 'GEO.NOURRIR', 1, 'qcm', 'manger et boire'),
    ('ge-nou-n1-b', 'GEO.NOURRIR', 1, 'qcm', 'des céréales'),
    ('ge-nou-n2-a', 'GEO.NOURRIR', 2, 'qcm', 'le riz'),
    ('ge-nou-n2-b', 'GEO.NOURRIR', 2, 'tri', 'le blé=l''agriculture;les légumes=l''agriculture;le lait=l''élevage;le poisson=la pêche'),
    ('ge-nou-n3-a', 'GEO.NOURRIR', 3, 'qcm', 'habitudes de chaque pays'),
    ('ge-nou-n3-b', 'GEO.NOURRIR', 3, 'qcm', 'manque parfois'),
    ('ge-nou-n4-a', 'GEO.NOURRIR', 4, 'texte', 'céréales'),
    ('ge-nou-n4-b', 'GEO.NOURRIR', 4, 'texte', 'riz'),
    -- GEO.INEGALITES
    ('ge-ine-n1-a', 'GEO.INEGALITES', 1, 'qcm', 'un planisphère'),
    ('ge-ine-n1-b', 'GEO.INEGALITES', 1, 'qcm', 'potable'),
    ('ge-ine-n2-a', 'GEO.INEGALITES', 2, 'qcm', 'inégalités'),
    ('ge-ine-n2-b', 'GEO.INEGALITES', 2, 'tri', 'l''eau potable=un besoin essentiel;aller à l''école=un besoin essentiel;voir un médecin=un besoin essentiel;un jeu vidéo=un loisir'),
    ('ge-ine-n3-a', 'GEO.INEGALITES', 3, 'qcm', 'éducation'),
    ('ge-ine-n3-b', 'GEO.INEGALITES', 3, 'qcm', 'santé'),
    ('ge-ine-n4-a', 'GEO.INEGALITES', 4, 'texte', 'planisphère'),
    ('ge-ine-n4-b', 'GEO.INEGALITES', 4, 'texte', 'potable'),
    -- GEO.DEPLACER
    ('ge-dep-n1-a', 'GEO.DEPLACER', 1, 'qcm', 'train'),
    ('ge-dep-n1-b', 'GEO.DEPLACER', 1, 'qcm', 'avion'),
    ('ge-dep-n2-a', 'GEO.DEPLACER', 2, 'tri', 'le train=sur terre;la voiture=sur terre;le bateau=sur l''eau;l''avion=dans les airs'),
    ('ge-dep-n2-b', 'GEO.DEPLACER', 2, 'qcm', 'des infrastructures'),
    ('ge-dep-n3-a', 'GEO.DEPLACER', 3, 'qcm', 'en heures et minutes'),
    ('ge-dep-n3-b', 'GEO.DEPLACER', 3, 'qcm', 'moins'),
    ('ge-dep-n4-a', 'GEO.DEPLACER', 4, 'texte', 'infrastructures'),
    ('ge-dep-n4-b', 'GEO.DEPLACER', 4, 'texte', 'kilomètres'),
    -- GEO.COMMUNIQUER
    ('ge-com-n1-a', 'GEO.COMMUNIQUER', 1, 'qcm', 'Internet'),
    ('ge-com-n1-b', 'GEO.COMMUNIQUER', 1, 'qcm', 'un message'),
    ('ge-com-n2-a', 'GEO.COMMUNIQUER', 2, 'qcm', 'câbles'),
    ('ge-com-n2-b', 'GEO.COMMUNIQUER', 2, 'qcm', 'des satellites'),
    ('ge-com-n3-a', 'GEO.COMMUNIQUER', 3, 'tri', 'envoyer un message=communiquer;faire un appel vidéo=communiquer;lire les informations=s''informer;chercher sur une carte=s''informer'),
    ('ge-com-n3-b', 'GEO.COMMUNIQUER', 3, 'qcm', 'accès'),
    ('ge-com-n4-a', 'GEO.COMMUNIQUER', 4, 'texte', 'câbles'),
    ('ge-com-n4-b', 'GEO.COMMUNIQUER', 4, 'texte', 'Internet')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- ===========================================================================
-- 3. Exercices de reference. exercice_id = md5('<competence>:<niveau>:geographie').
-- ===========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['GEO.NOURRIR','GEO.INEGALITES','GEO.DEPLACER','GEO.COMMUNIQUER'] LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':geographie')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'geographie', v_niv, 'geographie', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- Exercices des anciennes competences : desactives (donnees conservees).
UPDATE public.exercices SET actif=false
 WHERE competence IN ('GEO.REPERES','GEO.HABITER','GEO.ACTIVITES','GEO.CONSOMMER','GEO.FRANCE','GEO.PAYSAGES');

-- ===========================================================================
-- 4. Activation des 4 NOUVEAUX domaines (defaut LU en base puis COMPLETE ;
--    on ne retire RIEN).
-- ===========================================================================
DO $do$
DECLARE
    v_expr text; v_cur text[]; v_before text[]; d text;
    v_new text[] := ARRAY['se_nourrir','inegalites','se_deplacer','communiquer'];
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
    FOREACH d IN ARRAY v_new LOOP
        IF NOT (d = ANY (v_cur)) THEN RAISE EXCEPTION 'completude KO : % manque', d; END IF;
    END LOOP;
    EXECUTE 'ALTER TABLE public.profils ALTER COLUMN domaines_actifs SET DEFAULT '
            || quote_literal(v_cur::text) || '::text[]';
END $do$;

UPDATE public.profils
   SET domaines_actifs = domaines_actifs || (
       SELECT array_agg(d)
         FROM unnest(ARRAY['se_nourrir','inegalites','se_deplacer','communiquer']) AS d
        WHERE NOT (d = ANY (domaines_actifs)))
 WHERE NOT (domaines_actifs @> ARRAY['se_nourrir','inegalites','se_deplacer','communiquer']);

-- ===========================================================================
-- 5. Enregistrement de la migration
-- ===========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0104_cm1_geographie_nouveau_programme')
ON CONFLICT (version) DO NOTHING;
