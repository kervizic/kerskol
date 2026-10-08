-- 0056_questionner_monde_temps.sql
-- QUESTIONNER LE MONDE, sous-matiere « LE TEMPS » (domaine `temps`). S'appuie sur
-- l'infrastructure QM (0052). Migration ADDITIVE.
--
--   QM.TEMPS.CALENDRIER   jours, semaines, mois, saisons, lire un calendrier
--                         -> scene SVG maison (monthScene, clic sur un jour) ;
--   QM.TEMPS.FRISE        frise chronologique (avant/apres, ranger) ;
--   QM.TEMPS.GENERATIONS  generations, arbre genealogique simple ;
--   QM.TEMPS.AUTREFOIS    autrefois et aujourd'hui (objets, modes de vie, ecole) ;
--   QM.TEMPS.JOURNUIT     alternance jour / nuit.
--
-- NB : calendrier, saisons, frise chronologique sont ICI autorises et attendus
-- (ancienne consigne « jamais de calendrier » ANNULEE par Manu pour ce chantier).
--
-- 5 competences x 4 niveaux x 2 = 40 items. Miroir de domain/qm/temps.ts.

-- =========================================================================
-- 1. Competences (matiere QM, domaine temps).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('QM.TEMPS.CALENDRIER',  'QM', 'temps', 'Le calendrier',          990, 4, true),
    ('QM.TEMPS.FRISE',       'QM', 'temps', 'Avant et après',        1000, 4, true),
    ('QM.TEMPS.GENERATIONS', 'QM', 'temps', 'Les générations',       1010, 4, true),
    ('QM.TEMPS.AUTREFOIS',   'QM', 'temps', 'Autrefois et aujourd''hui',1020, 4, true),
    ('QM.TEMPS.JOURNUIT',    'QM', 'temps', 'Le jour et la nuit',    1030, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 2. Seed des items (miroir de temps.ts).
-- =========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- QM.TEMPS.CALENDRIER
    ('qm-tps-cal-n1-a', 'QM.TEMPS.CALENDRIER', 1, 'qcm',   '7'),
    ('qm-tps-cal-n1-b', 'QM.TEMPS.CALENDRIER', 1, 'qcm',   'mardi'),
    ('qm-tps-cal-n2-a', 'QM.TEMPS.CALENDRIER', 2, 'clic',  'mercredi'),
    ('qm-tps-cal-n2-b', 'QM.TEMPS.CALENDRIER', 2, 'qcm',   '12'),
    ('qm-tps-cal-n3-a', 'QM.TEMPS.CALENDRIER', 3, 'qcm',   'lundi'),
    ('qm-tps-cal-n3-b', 'QM.TEMPS.CALENDRIER', 3, 'clic',  'samedi'),
    ('qm-tps-cal-n4-a', 'QM.TEMPS.CALENDRIER', 4, 'texte', 'hiver'),
    ('qm-tps-cal-n4-b', 'QM.TEMPS.CALENDRIER', 4, 'texte', 'janvier'),
    -- QM.TEMPS.FRISE
    ('qm-tps-fri-n1-a', 'QM.TEMPS.FRISE', 1, 'qcm',   'le matin'),
    ('qm-tps-fri-n1-b', 'QM.TEMPS.FRISE', 1, 'qcm',   'hier'),
    ('qm-tps-fri-n2-a', 'QM.TEMPS.FRISE', 2, 'ordre', 'le matin>le midi>le soir'),
    ('qm-tps-fri-n2-b', 'QM.TEMPS.FRISE', 2, 'ordre', 'hier>aujourd''hui>demain'),
    ('qm-tps-fri-n3-a', 'QM.TEMPS.FRISE', 3, 'ordre', 'on prépare la pâte>on fait cuire au four>on mange le gâteau'),
    ('qm-tps-fri-n3-b', 'QM.TEMPS.FRISE', 3, 'ordre', 'le réveil>l''école>le coucher'),
    ('qm-tps-fri-n4-a', 'QM.TEMPS.FRISE', 4, 'ordre', 'le printemps>l''été>l''automne>l''hiver'),
    ('qm-tps-fri-n4-b', 'QM.TEMPS.FRISE', 4, 'ordre', 'le bébé>l''enfant>l''adolescent>l''adulte'),
    -- QM.TEMPS.GENERATIONS
    ('qm-tps-gen-n1-a', 'QM.TEMPS.GENERATIONS', 1, 'qcm',   'le grand-père'),
    ('qm-tps-gen-n1-b', 'QM.TEMPS.GENERATIONS', 1, 'qcm',   'grand-père'),
    ('qm-tps-gen-n2-a', 'QM.TEMPS.GENERATIONS', 2, 'ordre', 'le grand-père>le père>l''enfant'),
    ('qm-tps-gen-n2-b', 'QM.TEMPS.GENERATIONS', 2, 'qcm',   'grand-mère'),
    ('qm-tps-gen-n3-a', 'QM.TEMPS.GENERATIONS', 3, 'qcm',   'grands-parents'),
    ('qm-tps-gen-n3-b', 'QM.TEMPS.GENERATIONS', 3, 'ordre', 'les grands-parents>les parents>les enfants'),
    ('qm-tps-gen-n4-a', 'QM.TEMPS.GENERATIONS', 4, 'texte', 'parents'),
    ('qm-tps-gen-n4-b', 'QM.TEMPS.GENERATIONS', 4, 'texte', 'oncle'),
    -- QM.TEMPS.AUTREFOIS
    ('qm-tps-aut-n1-a', 'QM.TEMPS.AUTREFOIS', 1, 'qcm',   'une plume'),
    ('qm-tps-aut-n1-b', 'QM.TEMPS.AUTREFOIS', 1, 'qcm',   'une bougie'),
    ('qm-tps-aut-n2-a', 'QM.TEMPS.AUTREFOIS', 2, 'tri',   'la plume et l''encre=autrefois;l''ordinateur=aujourd''hui;la bougie=autrefois;la lampe électrique=aujourd''hui'),
    ('qm-tps-aut-n2-b', 'QM.TEMPS.AUTREFOIS', 2, 'qcm',   'au lavoir'),
    ('qm-tps-aut-n3-a', 'QM.TEMPS.AUTREFOIS', 3, 'tri',   'le cheval pour voyager=autrefois;la voiture=aujourd''hui;la lettre par la poste=autrefois;le message sur un écran=aujourd''hui'),
    ('qm-tps-aut-n3-b', 'QM.TEMPS.AUTREFOIS', 3, 'qcm',   'une ardoise'),
    ('qm-tps-aut-n4-a', 'QM.TEMPS.AUTREFOIS', 4, 'texte', 'craie'),
    ('qm-tps-aut-n4-b', 'QM.TEMPS.AUTREFOIS', 4, 'texte', 'bougie'),
    -- QM.TEMPS.JOURNUIT
    ('qm-tps-jou-n1-a', 'QM.TEMPS.JOURNUIT', 1, 'qcm',   'le soleil'),
    ('qm-tps-jou-n1-b', 'QM.TEMPS.JOURNUIT', 1, 'qcm',   'la lune'),
    ('qm-tps-jou-n2-a', 'QM.TEMPS.JOURNUIT', 2, 'qcm',   'parce que la Terre tourne'),
    ('qm-tps-jou-n2-b', 'QM.TEMPS.JOURNUIT', 2, 'qcm',   'jour'),
    ('qm-tps-jou-n3-a', 'QM.TEMPS.JOURNUIT', 3, 'ordre', 'le lever du soleil>le midi>le coucher du soleil>la nuit'),
    ('qm-tps-jou-n3-b', 'QM.TEMPS.JOURNUIT', 3, 'qcm',   '24 heures'),
    ('qm-tps-jou-n4-a', 'QM.TEMPS.JOURNUIT', 4, 'texte', 'soleil'),
    ('qm-tps-jou-n4-b', 'QM.TEMPS.JOURNUIT', 4, 'texte', 'tourne')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (id deterministe = md5('<competence>:<niveau>:qm')).
-- =========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOR v_comp IN SELECT code FROM public.competences WHERE code LIKE 'QM.TEMPS.%' LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':qm')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'qm', v_niv, 'questionner_monde', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Sous-matiere `temps` ACTIVE par defaut + profils existants (Iris incluse).
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','geometrie','repere','donnees',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe',
        'lecture','mots-maitresse','vivant','matiere','objets','espace','temps'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'temps')
 WHERE NOT ('temps' = ANY (domaines_actifs));

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0056_questionner_monde_temps')
ON CONFLICT (version) DO NOTHING;
