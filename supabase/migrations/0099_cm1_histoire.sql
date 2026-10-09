-- 0099_cm1_histoire.sql
-- LOT (CM1) - NOUVELLE MATIERE « HISTOIRE » (code HIST, cycle 3, reperes CM1).
-- Six SOUS-MATIERES (un `domaine` chacune, portee CM1..CM2) :
--   HIST.TRACES       traces_anciennes  Prehistoire, grottes ornees (Lascaux) ;
--   HIST.GALLOROMAINS gaulois_romains   Gaulois et Romains : vie quotidienne, monuments ;
--   HIST.MOYENAGE     moyen_age         chateau, village, paysans, metiers, chevaliers ;
--   HIST.MONUMENTS    monuments         cathedrales, abbayes, vitraux, art gothique ;
--   HIST.ROIS         rois_de_france    Clovis, Charlemagne, rois capetiens (reperes apaises) ;
--   HIST.FRISE        frise             frise chronologique, siecles, chiffres romains.
--
-- ADDITIF au-dessus de 0098 : la contrainte qm_item (HIST.% deja autorise), la
-- branche op 'qm' de enregistrer_reponse (deja elargie a HIST.%) et le CHECK des
-- types d'exercice (deja 'histoire') ont ete poses par 0098. Ce lot n'ajoute que
-- la matiere, la methode, les competences, les items, les exercices et
-- l'activation. Meme op serveur 'qm', meme verif_qm, meme <QuestionnerLeMonde>.
--
-- BIENVEILLANCE STRICTE : aucun recit de bataille, massacre, supplice, esclavage
-- ni guerre ; reperes (dates, personnages, vie quotidienne, monuments, frise)
-- traites de facon factuelle et apaisee.
--
-- Securite / donnees reelles : ADDITIVE et IDEMPOTENTE. Matiere HIST + 6 domaines
-- ACTIFS au DEFAUT (lu en base puis complete, jamais recopie ; test de
-- completude) et sur les profils existants. Portee CM1..CM2 (masquee au CE2).

-- 1. Matiere HIST.
INSERT INTO public.matieres (code, libelle) VALUES
    ('HIST', 'Histoire')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- 2. Methode pedagogique dediee.
INSERT INTO public.methodes (code, libelle) VALUES
    ('histoire', 'Se reperer dans le temps, lire des traces (histoire)')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- 3. Referentiel : 6 competences CM1 (une par domaine, portee CM1..CM2).
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('HIST.TRACES',       'HIST', 'traces_anciennes', 'Les premières traces',   1500, 'CM1', 'CM2'),
    ('HIST.GALLOROMAINS', 'HIST', 'gaulois_romains',  'Gaulois et Romains',     1510, 'CM1', 'CM2'),
    ('HIST.MOYENAGE',     'HIST', 'moyen_age',        'Au Moyen Âge',           1520, 'CM1', 'CM2'),
    ('HIST.MONUMENTS',    'HIST', 'monuments',        'Églises et monuments',   1530, 'CM1', 'CM2'),
    ('HIST.ROIS',         'HIST', 'rois_de_france',   'Les grands rois',        1540, 'CM1', 'CM2'),
    ('HIST.FRISE',        'HIST', 'frise',            'La frise et les siècles',1550, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min,
    classe_max=EXCLUDED.classe_max, actif=true;

-- 4. Seed des items (genere depuis frontend/src/domain/histoire ; test croise
--    front<->SQL). 48 items : 6 competences x 4 niveaux x 2.
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    ('hi-tra-n1-a', 'HIST.TRACES', 1, 'qcm', 'la Préhistoire'),
    ('hi-tra-n1-b', 'HIST.TRACES', 1, 'qcm', 'peintures d''animaux'),
    ('hi-tra-n2-a', 'HIST.TRACES', 2, 'qcm', 'Lascaux'),
    ('hi-tra-n2-b', 'HIST.TRACES', 2, 'tri', 'un silex taillé=Préhistoire;une peinture de bison=Préhistoire;une tablette tactile=aujourd''hui;une voiture=aujourd''hui'),
    ('hi-tra-n3-a', 'HIST.TRACES', 3, 'qcm', 'la maîtrise du feu'),
    ('hi-tra-n3-b', 'HIST.TRACES', 3, 'ordre', 'la Préhistoire>l''Antiquité>le Moyen Âge'),
    ('hi-tra-n4-a', 'HIST.TRACES', 4, 'texte', 'Préhistoire'),
    ('hi-tra-n4-b', 'HIST.TRACES', 4, 'texte', 'Lascaux'),
    ('hi-gal-n1-a', 'HIST.GALLOROMAINS', 1, 'qcm', 'Gaule'),
    ('hi-gal-n1-b', 'HIST.GALLOROMAINS', 1, 'qcm', 'Gaulois'),
    ('hi-gal-n2-a', 'HIST.GALLOROMAINS', 2, 'qcm', 'aqueducs'),
    ('hi-gal-n2-b', 'HIST.GALLOROMAINS', 2, 'tri', 'les arènes de Nîmes=les Romains;le Pont du Gard=les Romains;un avion=aujourd''hui;un ordinateur=aujourd''hui'),
    ('hi-gal-n3-a', 'HIST.GALLOROMAINS', 3, 'qcm', 'Lyon'),
    ('hi-gal-n3-b', 'HIST.GALLOROMAINS', 3, 'qcm', 'routes pavées'),
    ('hi-gal-n4-a', 'HIST.GALLOROMAINS', 4, 'texte', 'Gard'),
    ('hi-gal-n4-b', 'HIST.GALLOROMAINS', 4, 'texte', 'Gaule'),
    ('hi-moy-n1-a', 'HIST.MOYENAGE', 1, 'qcm', 'château fort'),
    ('hi-moy-n1-b', 'HIST.MOYENAGE', 1, 'qcm', 'les paysans'),
    ('hi-moy-n2-a', 'HIST.MOYENAGE', 2, 'tri', 'un château fort=Moyen Âge;un chevalier=Moyen Âge;un téléphone=aujourd''hui;une trottinette=aujourd''hui'),
    ('hi-moy-n2-b', 'HIST.MOYENAGE', 2, 'qcm', 'marché'),
    ('hi-moy-n3-a', 'HIST.MOYENAGE', 3, 'tri', 'le forgeron=fabrique des outils en fer;le meunier=moud le grain;le boulanger=fait le pain'),
    ('hi-moy-n3-b', 'HIST.MOYENAGE', 3, 'qcm', 'les chevaliers'),
    ('hi-moy-n4-a', 'HIST.MOYENAGE', 4, 'texte', 'fort'),
    ('hi-moy-n4-b', 'HIST.MOYENAGE', 4, 'texte', 'chevaliers'),
    ('hi-mon-n1-a', 'HIST.MONUMENTS', 1, 'qcm', 'Notre-Dame'),
    ('hi-mon-n1-b', 'HIST.MONUMENTS', 1, 'qcm', 'vitraux'),
    ('hi-mon-n2-a', 'HIST.MONUMENTS', 2, 'qcm', 'abbaye'),
    ('hi-mon-n2-b', 'HIST.MONUMENTS', 2, 'tri', 'une cathédrale gothique=Moyen Âge;une abbaye=Moyen Âge;le château de Versailles=époque des rois;le château de Chambord=époque des rois'),
    ('hi-mon-n3-a', 'HIST.MONUMENTS', 3, 'qcm', 'gothique'),
    ('hi-mon-n3-b', 'HIST.MONUMENTS', 3, 'qcm', 'cent ans'),
    ('hi-mon-n4-a', 'HIST.MONUMENTS', 4, 'texte', 'vitraux'),
    ('hi-mon-n4-b', 'HIST.MONUMENTS', 4, 'texte', 'abbaye'),
    ('hi-roi-n1-a', 'HIST.ROIS', 1, 'qcm', 'Clovis'),
    ('hi-roi-n1-b', 'HIST.ROIS', 1, 'qcm', 'Charlemagne'),
    ('hi-roi-n2-a', 'HIST.ROIS', 2, 'tri', 'Clovis=baptisé à Reims;Charlemagne=a aidé les écoles;Saint Louis=rendait la justice'),
    ('hi-roi-n2-b', 'HIST.ROIS', 2, 'qcm', 'en l''an 800'),
    ('hi-roi-n3-a', 'HIST.ROIS', 3, 'qcm', 'justice'),
    ('hi-roi-n3-b', 'HIST.ROIS', 3, 'ordre', 'Clovis>Charlemagne>Saint Louis'),
    ('hi-roi-n4-a', 'HIST.ROIS', 4, 'texte', 'Clovis'),
    ('hi-roi-n4-b', 'HIST.ROIS', 4, 'texte', 'Charlemagne'),
    ('hi-fri-n1-a', 'HIST.FRISE', 1, 'qcm', 'frise chronologique'),
    ('hi-fri-n1-b', 'HIST.FRISE', 1, 'qcm', 'la Préhistoire'),
    ('hi-fri-n2-a', 'HIST.FRISE', 2, 'qcm', 'cent ans'),
    ('hi-fri-n2-b', 'HIST.FRISE', 2, 'ordre', 'la Préhistoire>l''Antiquité>le Moyen Âge>les Temps modernes'),
    ('hi-fri-n3-a', 'HIST.FRISE', 3, 'qcm', 'Ve'),
    ('hi-fri-n3-b', 'HIST.FRISE', 3, 'qcm', 'Xe'),
    ('hi-fri-n4-a', 'HIST.FRISE', 4, 'texte', 'C'),
    ('hi-fri-n4-b', 'HIST.FRISE', 4, 'texte', 'frise')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- 5. Exercices de reference. exercice_id = md5('<competence>:<niveau>:histoire').
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOR v_comp IN SELECT code FROM public.competences WHERE code LIKE 'HIST.%' LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':histoire')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'histoire', v_niv, 'histoire', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- 6. Activation : matiere HIST + 6 domaines (defaut LU en base puis complete).
DO $do$
DECLARE v_expr text; v_cur text[];
BEGIN
    SELECT pg_get_expr(adbin, adrelid) INTO v_expr
      FROM pg_attrdef ad
      JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
     WHERE a.attrelid = 'public.profils'::regclass AND a.attname = 'matieres_actives';
    EXECUTE 'SELECT ' || v_expr INTO v_cur;
    IF NOT ('HIST' = ANY (v_cur)) THEN
        v_cur := v_cur || ARRAY['HIST'];
        EXECUTE 'ALTER TABLE public.profils ALTER COLUMN matieres_actives SET DEFAULT '
                || quote_literal(v_cur::text) || '::text[]';
    END IF;
END $do$;

UPDATE public.profils
   SET matieres_actives = array_append(matieres_actives, 'HIST')
 WHERE NOT ('HIST' = ANY (matieres_actives));

DO $do$
DECLARE
    v_expr   text; v_cur text[]; v_before text[]; d text;
    v_new    text[] := ARRAY['traces_anciennes','gaulois_romains','moyen_age',
                            'monuments','rois_de_france','frise'];
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
         FROM unnest(ARRAY['traces_anciennes','gaulois_romains','moyen_age',
                           'monuments','rois_de_france','frise']) AS d
        WHERE NOT (d = ANY (domaines_actifs)))
 WHERE NOT (domaines_actifs @> ARRAY['traces_anciennes','gaulois_romains','moyen_age',
                                     'monuments','rois_de_france','frise']);

-- 7. Enregistrement de la migration
INSERT INTO public.schema_migrations (version)
VALUES ('0099_cm1_histoire')
ON CONFLICT (version) DO NOTHING;
