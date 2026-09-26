-- 0006_seed_referentiel_calcul.sql
-- Donnees de depart du referentiel de CALCUL (matiere MA), validees par Manu.
-- 16 competences, 4 niveaux chacune ; prerequis ; au moins un exercice + une
-- ligne ex_calcul par competence x niveau, avec params jsonb exploitables par
-- le generateur cote client.
--
-- Idempotence : les competences/prerequis utilisent ON CONFLICT ; les exercices
-- ont un id DETERMINISTE derive de (competence, niveau) via md5(...)::uuid, de
-- sorte qu'un rejeu met a jour au lieu de dupliquer.
-- Voir docs/referentiel-calcul.md pour la description complete (tableaux).

-- =========================================================================
-- 1. Competences (matiere MA)
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre) VALUES
    ('MA.CM.ADDITION',       'MA', 'calcul_mental',         'Tables d''addition',                 10),
    ('MA.CM.DOUBLES',        'MA', 'calcul_mental',         'Doubles',                            20),
    ('MA.CM.MOITIES',        'MA', 'calcul_mental',         'Moities',                            30),
    ('MA.CM.COMPL_SUP',      'MA', 'calcul_mental',         'Complement a la dizaine/centaine/millier superieur', 40),
    ('MA.CM.COMPL_100_1000', 'MA', 'calcul_mental',         'Complements a 100 et a 1000',        50),
    ('MA.CM.SOMMES_DIFF',    'MA', 'calcul_mental',         'Sommes et differences',              60),
    ('MA.CM.X10_X100',       'MA', 'calcul_mental',         'Multiplier par 10, 100 (et 20, 50)', 70),
    ('MA.TABLES.2',          'MA', 'tables_multiplication', 'Table de 2',                        100),
    ('MA.TABLES.5',          'MA', 'tables_multiplication', 'Table de 5',                        110),
    ('MA.TABLES.3',          'MA', 'tables_multiplication', 'Table de 3',                        120),
    ('MA.TABLES.4',          'MA', 'tables_multiplication', 'Table de 4',                        130),
    ('MA.TABLES.6',          'MA', 'tables_multiplication', 'Table de 6',                        140),
    ('MA.TABLES.9',          'MA', 'tables_multiplication', 'Table de 9',                        150),
    ('MA.TABLES.8',          'MA', 'tables_multiplication', 'Table de 8',                        160),
    ('MA.TABLES.7',          'MA', 'tables_multiplication', 'Table de 7',                        170),
    ('MA.CM.DIV_RESTE',      'MA', 'calcul_mental',         'Division avec reste',               200)
ON CONFLICT (code) DO UPDATE
    SET matiere = EXCLUDED.matiere, domaine = EXCLUDED.domaine,
        libelle = EXCLUDED.libelle, ordre = EXCLUDED.ordre;

-- =========================================================================
-- 2. Prerequis (niveau_min = 2 partout)
-- =========================================================================
INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.CM.DOUBLES',        'MA.CM.ADDITION',   2),
    ('MA.CM.MOITIES',        'MA.CM.DOUBLES',    2),
    ('MA.CM.COMPL_SUP',      'MA.CM.ADDITION',   2),
    ('MA.CM.COMPL_100_1000', 'MA.CM.COMPL_SUP',  2),
    ('MA.CM.SOMMES_DIFF',    'MA.CM.ADDITION',   2),
    ('MA.CM.SOMMES_DIFF',    'MA.CM.COMPL_SUP',  2),
    ('MA.TABLES.2',          'MA.CM.DOUBLES',    2),
    ('MA.TABLES.5',          'MA.CM.X10_X100',   2),
    ('MA.TABLES.5',          'MA.CM.MOITIES',    2),
    ('MA.TABLES.3',          'MA.TABLES.2',      2),
    ('MA.TABLES.4',          'MA.TABLES.2',      2),
    ('MA.TABLES.6',          'MA.TABLES.3',      2),
    ('MA.TABLES.9',          'MA.CM.X10_X100',   2),
    ('MA.TABLES.9',          'MA.CM.SOMMES_DIFF',2),
    ('MA.TABLES.8',          'MA.TABLES.4',      2),
    ('MA.TABLES.7',          'MA.TABLES.2',      2),
    ('MA.TABLES.7',          'MA.TABLES.5',      2),
    ('MA.CM.DIV_RESTE',      'MA.TABLES.2',      2),
    ('MA.CM.DIV_RESTE',      'MA.TABLES.5',      2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 3. Exercices + ex_calcul (id deterministe -> idempotent)
-- =========================================================================
DO $seed$
DECLARE
    r    record;
    v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        -- competence, niveau, operation, forme, methode, support, correction, params
        -- ---- ADDITION ----
        ('MA.CM.ADDITION',1,'add','resultat','cpa_barres','droite','compter_a_partir_du_plus_grand',
         '{"a":{"min":1,"max":8},"b":{"min":1,"max":8},"contrainte":"somme_inf_10"}'::jsonb),
        ('MA.CM.ADDITION',2,'add','decomposition','exemples_estompes','aucun','doubles_et_presque_doubles',
         '{"type":"doubles_presque_doubles","a":{"min":1,"max":10}}'::jsonb),
        ('MA.CM.ADDITION',3,'add','decomposition','variation','droite','passage_par_la_dizaine',
         '{"type":"passage_par_10","a":{"min":6,"max":9},"b":{"min":3,"max":9}}'::jsonb),
        ('MA.CM.ADDITION',4,'add','terme_manquant','probleme_dabord','aucun','completer_a_la_somme',
         '{"type":"terme_manquant","somme":{"min":11,"max":18},"terme_connu":{"min":2,"max":9}}'::jsonb),
        -- ---- DOUBLES ----
        ('MA.CM.DOUBLES',1,'double','resultat','cpa_barres','rectangle','double_par_paquets',
         '{"n":{"min":1,"max":10}}'::jsonb),
        ('MA.CM.DOUBLES',2,'double','resultat','exemples_estompes','aucun','double_decompose',
         '{"n":{"min":11,"max":20}}'::jsonb),
        ('MA.CM.DOUBLES',3,'double','resultat','variation','aucun','double_nombres_ronds',
         '{"nombres":[25,30,40,50,60,100]}'::jsonb),
        ('MA.CM.DOUBLES',4,'double','resultat','probleme_dabord','aucun','double_melange',
         '{"melange":true,"n":{"min":1,"max":20},"nombres":[25,30,40,50,60,100]}'::jsonb),
        -- ---- MOITIES ----
        ('MA.CM.MOITIES',1,'moitie','resultat','cpa_barres','rectangle','partage_en_deux',
         '{"pairs":{"min":2,"max":20}}'::jsonb),
        ('MA.CM.MOITIES',2,'moitie','resultat','exemples_estompes','aucun','moitie_decomposee',
         '{"pairs":{"min":22,"max":40}}'::jsonb),
        ('MA.CM.MOITIES',3,'moitie','resultat','variation','aucun','moitie_nombres_ronds',
         '{"nombres":[50,60,100]}'::jsonb),
        ('MA.CM.MOITIES',4,'moitie','resultat','probleme_dabord','aucun','moitie_melange',
         '{"melange":true,"pairs":{"min":2,"max":40},"nombres":[50,60,100]}'::jsonb),
        -- ---- COMPL_SUP ----
        ('MA.CM.COMPL_SUP',1,'complement','terme_manquant','cpa_barres','droite','complement_a_10',
         '{"cible":10,"a":{"min":1,"max":9}}'::jsonb),
        ('MA.CM.COMPL_SUP',2,'complement','resultat','exemples_estompes','droite','vers_dizaine_superieure',
         '{"vers":"dizaine_sup","n":{"min":41,"max":98}}'::jsonb),
        ('MA.CM.COMPL_SUP',3,'complement','resultat','variation','aucun','vers_centaine_superieure',
         '{"vers":"centaine_sup","n":{"min":410,"max":990}}'::jsonb),
        ('MA.CM.COMPL_SUP',4,'complement','resultat','probleme_dabord','aucun','vers_millier_superieur',
         '{"vers":"millier_sup","n":{"min":4100,"max":9900}}'::jsonb),
        -- ---- COMPL_100_1000 ----
        ('MA.CM.COMPL_100_1000',1,'complement','terme_manquant','cpa_barres','droite','dizaines_a_100',
         '{"cible":100,"nombres":[10,20,30,40,50,60,70,80,90]}'::jsonb),
        ('MA.CM.COMPL_100_1000',2,'complement','terme_manquant','exemples_estompes','aucun','tout_nombre_a_100',
         '{"cible":100,"n":{"min":1,"max":99}}'::jsonb),
        ('MA.CM.COMPL_100_1000',3,'complement','terme_manquant','variation','aucun','centaines_a_1000',
         '{"cible":1000,"nombres":[100,200,300,400,500,600,700,800,900]}'::jsonb),
        ('MA.CM.COMPL_100_1000',4,'complement','terme_manquant','probleme_dabord','aucun','dizaines_a_1000',
         '{"cible":1000,"n":{"min":10,"max":990,"multiple_de":10}}'::jsonb),
        -- ---- SOMMES_DIFF ----
        ('MA.CM.SOMMES_DIFF',1,'add','resultat','cpa_barres','aucun','dizaines_sans_retenue',
         '{"type":"dizaines_sans_retenue","a":{"min":20,"max":89},"b":{"multiple_de":10,"min":10,"max":40},"ops":["add","sub"]}'::jsonb),
        ('MA.CM.SOMMES_DIFF',2,'add','decomposition','variation','aucun','ajout_proche_dizaine',
         '{"type":"ajout_proche_dizaine","a":{"min":10,"max":89},"ajouts":[9,19,-9]}'::jsonb),
        ('MA.CM.SOMMES_DIFF',3,'add','resultat','exemples_estompes','aucun','addition_avec_retenue',
         '{"type":"deux_chiffres_avec_retenue","a":{"min":13,"max":89},"b":{"min":13,"max":89}}'::jsonb),
        ('MA.CM.SOMMES_DIFF',4,'add','ordre_grandeur','probleme_dabord','aucun','estimer_puis_calculer',
         '{"a":{"min":100,"max":999},"b":{"min":11,"max":99},"ops":["add","sub"]}'::jsonb),
        -- ---- X10_X100 ----
        ('MA.CM.X10_X100',1,'mul','resultat','cpa_barres','droite','decaler_les_chiffres',
         '{"a":{"min":2,"max":9},"facteur":10}'::jsonb),
        ('MA.CM.X10_X100',2,'mul','resultat','exemples_estompes','aucun','decaler_les_chiffres',
         '{"a":{"min":10,"max":99},"facteur":10}'::jsonb),
        ('MA.CM.X10_X100',3,'mul','resultat','variation','aucun','deux_zeros',
         '{"a":{"min":2,"max":99},"facteur":100}'::jsonb),
        ('MA.CM.X10_X100',4,'mul','resultat','probleme_dabord','aucun','x10_puis_double_ou_moitie',
         '{"a":{"min":2,"max":50},"facteurs":[20,50]}'::jsonb),
        -- ---- DIV_RESTE ----
        ('MA.CM.DIV_RESTE',1,'div','resultat','cpa_barres','rectangle','division_exacte_par_les_tables',
         '{"type":"exacte","tables":[2,3,4,5],"quotient":{"min":1,"max":10}}'::jsonb),
        ('MA.CM.DIV_RESTE',2,'div','reste','exemples_estompes','aucun','plus_grand_multiple_inferieur',
         '{"type":"avec_reste","diviseur":{"min":2,"max":9},"dividende":{"min":10,"max":89}}'::jsonb),
        ('MA.CM.DIV_RESTE',3,'div','reste','variation','aucun','division_par_nombres_ronds',
         '{"type":"avec_reste","diviseurs":[10,25,50,100],"dividende":{"min":30,"max":990}}'::jsonb),
        ('MA.CM.DIV_RESTE',4,'div','reste','probleme_dabord','aucun','division_en_contexte',
         '{"type":"melange","tables":[2,3,4,5,6,7,8,9],"diviseurs":[10,25,50,100],"contexte":true}'::jsonb)
        ) AS t(competence,niveau,operation,forme,methode,support,correction,params)
    LOOP
        v_id := md5(r.competence || ':' || r.niveau || ':calcul')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, r.competence, 'calcul', r.niveau, r.methode, true)
        ON CONFLICT (id) DO UPDATE
            SET competence = EXCLUDED.competence, niveau = EXCLUDED.niveau,
                methode = EXCLUDED.methode, actif = true;
        INSERT INTO public.ex_calcul (exercice_id, type, operation, forme, params, support_visuel, correction_strategie)
        VALUES (v_id, 'calcul', r.operation, r.forme, r.params, r.support, r.correction)
        ON CONFLICT (exercice_id) DO UPDATE
            SET operation = EXCLUDED.operation, forme = EXCLUDED.forme,
                params = EXCLUDED.params, support_visuel = EXCLUDED.support_visuel,
                correction_strategie = EXCLUDED.correction_strategie;
    END LOOP;
END
$seed$;

-- =========================================================================
-- 4. Tables de multiplication (2..9), 4 niveaux, strategie de correction dediee
-- =========================================================================
DO $tables$
DECLARE
    t   record;
    v_id uuid;
    v_corr text;
BEGIN
    FOR t IN
        SELECT * FROM (VALUES
            (2,'double'),
            (3,'double_plus_une_fois'),
            (4,'double_du_double'),
            (5,'moitie_de_x10'),
            (6,'double_de_x3'),
            (7,'cinq_fois_plus_deux_fois'),
            (8,'double_de_x4'),
            (9,'dix_fois_moins_une_fois')
        ) AS x(n, corr)
    LOOP
        v_corr := t.corr;

        -- N1 : produits dans l'ordre x1..x10, support rectangle, cpa_barres
        v_id := md5('MA.TABLES.' || t.n || ':1:calcul')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'MA.TABLES.' || t.n, 'calcul', 1, 'cpa_barres', true)
        ON CONFLICT (id) DO UPDATE SET methode = EXCLUDED.methode, actif = true;
        INSERT INTO public.ex_calcul (exercice_id, type, operation, forme, params, support_visuel, correction_strategie)
        VALUES (v_id, 'calcul', 'mul', 'resultat',
                jsonb_build_object('table', t.n, 'facteur', jsonb_build_object('min',1,'max',10), 'ordre', 'croissant'),
                'rectangle', v_corr)
        ON CONFLICT (exercice_id) DO UPDATE
            SET operation = EXCLUDED.operation, forme = EXCLUDED.forme, params = EXCLUDED.params,
                support_visuel = EXCLUDED.support_visuel, correction_strategie = EXCLUDED.correction_strategie;

        -- N2 : desordre, saisie, sans support, exemples_estompes
        v_id := md5('MA.TABLES.' || t.n || ':2:calcul')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'MA.TABLES.' || t.n, 'calcul', 2, 'exemples_estompes', true)
        ON CONFLICT (id) DO UPDATE SET methode = EXCLUDED.methode, actif = true;
        INSERT INTO public.ex_calcul (exercice_id, type, operation, forme, params, support_visuel, correction_strategie)
        VALUES (v_id, 'calcul', 'mul', 'resultat',
                jsonb_build_object('table', t.n, 'facteur', jsonb_build_object('min',1,'max',10), 'ordre', 'aleatoire', 'saisie', true),
                'aucun', v_corr)
        ON CONFLICT (exercice_id) DO UPDATE
            SET operation = EXCLUDED.operation, forme = EXCLUDED.forme, params = EXCLUDED.params,
                support_visuel = EXCLUDED.support_visuel, correction_strategie = EXCLUDED.correction_strategie;

        -- N3 : terme manquant, commutativite, "combien de fois", variation
        v_id := md5('MA.TABLES.' || t.n || ':3:calcul')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'MA.TABLES.' || t.n, 'calcul', 3, 'variation', true)
        ON CONFLICT (id) DO UPDATE SET methode = EXCLUDED.methode, actif = true;
        INSERT INTO public.ex_calcul (exercice_id, type, operation, forme, params, support_visuel, correction_strategie)
        VALUES (v_id, 'calcul', 'mul', 'terme_manquant',
                jsonb_build_object('table', t.n, 'facteur', jsonb_build_object('min',1,'max',10),
                                   'variantes', jsonb_build_array('terme_manquant','commutativite','combien_de_fois')),
                'aucun', v_corr)
        ON CONFLICT (exercice_id) DO UPDATE
            SET operation = EXCLUDED.operation, forme = EXCLUDED.forme, params = EXCLUDED.params,
                support_visuel = EXCLUDED.support_visuel, correction_strategie = EXCLUDED.correction_strategie;

        -- N4 : melange des tables debloquees + derives (70x8, 7x80), probleme_dabord
        v_id := md5('MA.TABLES.' || t.n || ':4:calcul')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'MA.TABLES.' || t.n, 'calcul', 4, 'probleme_dabord', true)
        ON CONFLICT (id) DO UPDATE SET methode = EXCLUDED.methode, actif = true;
        INSERT INTO public.ex_calcul (exercice_id, type, operation, forme, params, support_visuel, correction_strategie)
        VALUES (v_id, 'calcul', 'mul', 'resultat',
                jsonb_build_object('table', t.n, 'tables_debloquees', true,
                                   'derives', jsonb_build_array('70x8','7x80')),
                'aucun', v_corr)
        ON CONFLICT (exercice_id) DO UPDATE
            SET operation = EXCLUDED.operation, forme = EXCLUDED.forme, params = EXCLUDED.params,
                support_visuel = EXCLUDED.support_visuel, correction_strategie = EXCLUDED.correction_strategie;
    END LOOP;
END
$tables$;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0006_seed_referentiel_calcul')
ON CONFLICT (version) DO NOTHING;
