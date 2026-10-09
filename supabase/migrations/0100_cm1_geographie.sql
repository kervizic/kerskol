-- 0100_cm1_geographie.sql
-- LOT (CM1) - NOUVELLE MATIERE « GEOGRAPHIE » (code GEO, cycle 3, reperes CM1).
-- Six SOUS-MATIERES (un `domaine` chacune, portee CM1..CM2) :
--   GEO.REPERES    se_reperer      plan, carte, legende, points cardinaux ;
--   GEO.HABITER    habiter         se loger : ville / campagne, metropole, Paris ;
--   GEO.ACTIVITES  travail_loisirs travailler, se cultiver, loisirs et tourisme ;
--   GEO.CONSOMMER  consommer       eau, energie, alimentation (circuits, chateau d'eau) ;
--   GEO.FRANCE     france_reperes  fleuves, reliefs, mers et ocean de la France ;
--   GEO.PAYSAGES   paysages        reconnaitre des paysages (foret, mer, montagne, ville).
--
-- ADDITIF au-dessus de 0098 : contrainte qm_item (GEO.% deja autorise), branche
-- op 'qm' de enregistrer_reponse (deja elargie a GEO.%) et CHECK des types (deja
-- 'geographie') poses par 0098. Ce lot ajoute matiere, methode, competences,
-- items, exercices et activation. Meme op 'qm', meme verif_qm, meme
-- <QuestionnerLeMonde>. Les « regions » (decoupage administratif) sont
-- transversales au cycle 3 : on en reste a la localisation.
--
-- Securite / donnees reelles : ADDITIVE et IDEMPOTENTE. Matiere GEO + 6 domaines
-- ACTIFS au DEFAUT (lu en base puis complete, jamais recopie ; test de
-- completude) et sur les profils existants. Portee CM1..CM2 (masquee au CE2).

-- 1. Matiere GEO.
INSERT INTO public.matieres (code, libelle) VALUES
    ('GEO', 'Géographie')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- 2. Methode pedagogique dediee.
INSERT INTO public.methodes (code, libelle) VALUES
    ('geographie', 'Se reperer dans l''espace, lire une carte (geographie)')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- 3. Referentiel : 6 competences CM1 (une par domaine, portee CM1..CM2).
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('GEO.REPERES',   'GEO', 'se_reperer',      'Se repérer : plan et carte',           1700, 'CM1', 'CM2'),
    ('GEO.HABITER',   'GEO', 'habiter',         'Habiter en ville, à la campagne',      1710, 'CM1', 'CM2'),
    ('GEO.ACTIVITES', 'GEO', 'travail_loisirs', 'Travailler, se cultiver, les loisirs', 1720, 'CM1', 'CM2'),
    ('GEO.CONSOMMER', 'GEO', 'consommer',       'Consommer en France',                  1730, 'CM1', 'CM2'),
    ('GEO.FRANCE',    'GEO', 'france_reperes',  'La France : fleuves et reliefs',       1740, 'CM1', 'CM2'),
    ('GEO.PAYSAGES',  'GEO', 'paysages',        'Paysages et milieux',                  1750, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min,
    classe_max=EXCLUDED.classe_max, actif=true;

-- 4. Seed des items (genere depuis frontend/src/domain/geographie ; test croise).
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    ('ge-rep-n1-a', 'GEO.REPERES', 1, 'qcm', 'plan'),
    ('ge-rep-n1-b', 'GEO.REPERES', 1, 'qcm', 'légende'),
    ('ge-rep-n2-a', 'GEO.REPERES', 2, 'qcm', 'le nord'),
    ('ge-rep-n2-b', 'GEO.REPERES', 2, 'qcm', 'le sud'),
    ('ge-rep-n3-a', 'GEO.REPERES', 3, 'tri', 'la légende=sur une carte;l''échelle=sur une carte;le titre=sur une carte;une recette de gâteau=pas sur une carte'),
    ('ge-rep-n3-b', 'GEO.REPERES', 3, 'qcm', 'à connaître les distances en vrai'),
    ('ge-rep-n4-a', 'GEO.REPERES', 4, 'texte', 'ouest'),
    ('ge-rep-n4-b', 'GEO.REPERES', 4, 'texte', 'légende'),
    ('ge-hab-n1-a', 'GEO.HABITER', 1, 'qcm', 'la ville'),
    ('ge-hab-n1-b', 'GEO.HABITER', 1, 'qcm', 'la campagne'),
    ('ge-hab-n2-a', 'GEO.HABITER', 2, 'tri', 'un grand immeuble=la ville;beaucoup de magasins=la ville;un champ de blé=la campagne;une ferme=la campagne'),
    ('ge-hab-n2-b', 'GEO.HABITER', 2, 'qcm', 'métropole'),
    ('ge-hab-n3-a', 'GEO.HABITER', 3, 'qcm', 'transports en commun'),
    ('ge-hab-n3-b', 'GEO.HABITER', 3, 'tri', 'une maison=pour habiter;un appartement=pour habiter;un bureau=pour travailler;une usine=pour travailler'),
    ('ge-hab-n4-a', 'GEO.HABITER', 4, 'texte', 'métropole'),
    ('ge-hab-n4-b', 'GEO.HABITER', 4, 'texte', 'Paris'),
    ('ge-act-n1-a', 'GEO.ACTIVITES', 1, 'qcm', 'au musée'),
    ('ge-act-n1-b', 'GEO.ACTIVITES', 1, 'qcm', 'bibliothèque'),
    ('ge-act-n2-a', 'GEO.ACTIVITES', 2, 'tri', 'une usine=travail;un parc d''attractions=loisir;un musée=culture'),
    ('ge-act-n2-b', 'GEO.ACTIVITES', 2, 'qcm', 'vacances'),
    ('ge-act-n3-a', 'GEO.ACTIVITES', 3, 'qcm', 'montagne'),
    ('ge-act-n3-b', 'GEO.ACTIVITES', 3, 'tri', 'un stade=loisir;un parc=loisir;un théâtre=culture;un cinéma=culture'),
    ('ge-act-n4-a', 'GEO.ACTIVITES', 4, 'texte', 'bibliothèque'),
    ('ge-act-n4-b', 'GEO.ACTIVITES', 4, 'texte', 'loisirs'),
    ('ge-con-n1-a', 'GEO.CONSOMMER', 1, 'qcm', 'des rivières et des nappes d''eau'),
    ('ge-con-n1-b', 'GEO.CONSOMMER', 1, 'qcm', 'traitée'),
    ('ge-con-n2-a', 'GEO.CONSOMMER', 2, 'qcm', 'l''éolienne'),
    ('ge-con-n2-b', 'GEO.CONSOMMER', 2, 'tri', 'le blé=du champ;les légumes=du champ;le lait=de l''élevage;les œufs=de l''élevage'),
    ('ge-con-n3-a', 'GEO.CONSOMMER', 3, 'qcm', 'circuit court'),
    ('ge-con-n3-b', 'GEO.CONSOMMER', 3, 'qcm', 'château d''eau'),
    ('ge-con-n4-a', 'GEO.CONSOMMER', 4, 'texte', 'traitée'),
    ('ge-con-n4-b', 'GEO.CONSOMMER', 4, 'texte', 'court'),
    ('ge-fra-n1-a', 'GEO.FRANCE', 1, 'qcm', 'la Seine'),
    ('ge-fra-n1-b', 'GEO.FRANCE', 1, 'qcm', 'les Alpes'),
    ('ge-fra-n2-a', 'GEO.FRANCE', 2, 'tri', 'la Loire=un fleuve;la Garonne=un fleuve;les Pyrénées=une montagne;le Massif central=une montagne'),
    ('ge-fra-n2-b', 'GEO.FRANCE', 2, 'qcm', 'l''océan Atlantique'),
    ('ge-fra-n3-a', 'GEO.FRANCE', 3, 'qcm', 'la Loire'),
    ('ge-fra-n3-b', 'GEO.FRANCE', 3, 'tri', 'l''océan Atlantique=au nord ou à l''ouest;la Manche=au nord ou à l''ouest;la mer Méditerranée=au sud'),
    ('ge-fra-n4-a', 'GEO.FRANCE', 4, 'texte', 'Seine'),
    ('ge-fra-n4-b', 'GEO.FRANCE', 4, 'texte', 'Alpes'),
    ('ge-pay-n1-a', 'GEO.PAYSAGES', 1, 'qcm', 'forêt'),
    ('ge-pay-n1-b', 'GEO.PAYSAGES', 1, 'qcm', 'bord de mer'),
    ('ge-pay-n2-a', 'GEO.PAYSAGES', 2, 'tri', 'une forêt=paysage de nature;une plage=paysage de nature;des immeubles=paysage de ville;une grande avenue=paysage de ville'),
    ('ge-pay-n2-b', 'GEO.PAYSAGES', 2, 'qcm', 'de la neige'),
    ('ge-pay-n3-a', 'GEO.PAYSAGES', 3, 'tri', 'faire du ski=à la montagne;se baigner dans la mer=au bord de mer;visiter une ferme=à la campagne'),
    ('ge-pay-n3-b', 'GEO.PAYSAGES', 3, 'qcm', 'mer'),
    ('ge-pay-n4-a', 'GEO.PAYSAGES', 4, 'texte', 'forêt'),
    ('ge-pay-n4-b', 'GEO.PAYSAGES', 4, 'texte', 'mer')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- 5. Exercices de reference. exercice_id = md5('<competence>:<niveau>:geographie').
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOR v_comp IN SELECT code FROM public.competences WHERE code LIKE 'GEO.%' LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':geographie')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'geographie', v_niv, 'geographie', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- 6. Activation : matiere GEO + 6 domaines (defaut LU en base puis complete).
DO $do$
DECLARE v_expr text; v_cur text[];
BEGIN
    SELECT pg_get_expr(adbin, adrelid) INTO v_expr
      FROM pg_attrdef ad JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
     WHERE a.attrelid = 'public.profils'::regclass AND a.attname = 'matieres_actives';
    EXECUTE 'SELECT ' || v_expr INTO v_cur;
    IF NOT ('GEO' = ANY (v_cur)) THEN
        v_cur := v_cur || ARRAY['GEO'];
        EXECUTE 'ALTER TABLE public.profils ALTER COLUMN matieres_actives SET DEFAULT '
                || quote_literal(v_cur::text) || '::text[]';
    END IF;
END $do$;

UPDATE public.profils
   SET matieres_actives = array_append(matieres_actives, 'GEO')
 WHERE NOT ('GEO' = ANY (matieres_actives));

DO $do$
DECLARE
    v_expr text; v_cur text[]; v_before text[]; d text;
    v_new text[] := ARRAY['se_reperer','habiter','travail_loisirs','consommer',
                          'france_reperes','paysages'];
BEGIN
    SELECT pg_get_expr(adbin, adrelid) INTO v_expr
      FROM pg_attrdef ad JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
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
         FROM unnest(ARRAY['se_reperer','habiter','travail_loisirs','consommer',
                           'france_reperes','paysages']) AS d
        WHERE NOT (d = ANY (domaines_actifs)))
 WHERE NOT (domaines_actifs @> ARRAY['se_reperer','habiter','travail_loisirs','consommer',
                                     'france_reperes','paysages']);

-- 7. Enregistrement de la migration
INSERT INTO public.schema_migrations (version)
VALUES ('0100_cm1_geographie')
ON CONFLICT (version) DO NOTHING;
