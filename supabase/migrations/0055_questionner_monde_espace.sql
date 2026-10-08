-- 0055_questionner_monde_espace.sql
-- QUESTIONNER LE MONDE, sous-matiere « L'ESPACE » (domaine `espace`). S'appuie
-- sur l'infrastructure QM (0052). Migration ADDITIVE.
--
--   QM.ESPACE.SEREPERER  se situer (plan, carte, maquette, photo aerienne) ;
--   QM.ESPACE.PLANETE    globe et planisphere, continents et oceans
--                        -> scene SVG maison (planisphereScene, clic) ;
--   QM.ESPACE.FRANCE     la France (contour, grandes villes, fleuves) ;
--   QM.ESPACE.CARDINAUX  points cardinaux -> scene rose des vents (clic) ;
--   QM.ESPACE.PAYSAGES   paysages (ville, campagne, montagne, littoral).
--
-- 5 competences x 4 niveaux x 2 = 40 items. Miroir de domain/qm/espace.ts.
-- SVG maison, AUCUNE carte sous licence.

-- =========================================================================
-- 1. Competences (matiere QM, domaine espace).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('QM.ESPACE.SEREPERER', 'QM', 'espace', 'Plans et maquettes',       940, 4, true),
    ('QM.ESPACE.PLANETE',   'QM', 'espace', 'La Terre et les continents',950, 4, true),
    ('QM.ESPACE.FRANCE',    'QM', 'espace', 'La France',                 960, 4, true),
    ('QM.ESPACE.CARDINAUX', 'QM', 'espace', 'Les points cardinaux',      970, 4, true),
    ('QM.ESPACE.PAYSAGES',  'QM', 'espace', 'Les paysages',              980, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 2. Seed des items (miroir de espace.ts).
-- =========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- QM.ESPACE.SEREPERER
    ('qm-esp-rep-n1-a', 'QM.ESPACE.SEREPERER', 1, 'qcm',   'un plan'),
    ('qm-esp-rep-n1-b', 'QM.ESPACE.SEREPERER', 1, 'qcm',   'un plan'),
    ('qm-esp-rep-n2-a', 'QM.ESPACE.SEREPERER', 2, 'qcm',   'vus de dessus'),
    ('qm-esp-rep-n2-b', 'QM.ESPACE.SEREPERER', 2, 'qcm',   'une maquette'),
    ('qm-esp-rep-n3-a', 'QM.ESPACE.SEREPERER', 3, 'qcm',   'aérienne'),
    ('qm-esp-rep-n3-b', 'QM.ESPACE.SEREPERER', 3, 'qcm',   'la légende'),
    ('qm-esp-rep-n4-a', 'QM.ESPACE.SEREPERER', 4, 'texte', 'plan'),
    ('qm-esp-rep-n4-b', 'QM.ESPACE.SEREPERER', 4, 'texte', 'maquette'),
    -- QM.ESPACE.PLANETE
    ('qm-esp-pla-n1-a', 'QM.ESPACE.PLANETE', 1, 'qcm',   'une boule'),
    ('qm-esp-pla-n1-b', 'QM.ESPACE.PLANETE', 1, 'qcm',   'l''eau'),
    ('qm-esp-pla-n2-a', 'QM.ESPACE.PLANETE', 2, 'clic',  'l''Afrique'),
    ('qm-esp-pla-n2-b', 'QM.ESPACE.PLANETE', 2, 'qcm',   'continent'),
    ('qm-esp-pla-n3-a', 'QM.ESPACE.PLANETE', 3, 'clic',  'l''Asie'),
    ('qm-esp-pla-n3-b', 'QM.ESPACE.PLANETE', 3, 'qcm',   'océan'),
    ('qm-esp-pla-n4-a', 'QM.ESPACE.PLANETE', 4, 'texte', 'Europe'),
    ('qm-esp-pla-n4-b', 'QM.ESPACE.PLANETE', 4, 'texte', 'globe'),
    -- QM.ESPACE.FRANCE
    ('qm-esp-fra-n1-a', 'QM.ESPACE.FRANCE', 1, 'qcm',   'la France'),
    ('qm-esp-fra-n1-b', 'QM.ESPACE.FRANCE', 1, 'qcm',   'Paris'),
    ('qm-esp-fra-n2-a', 'QM.ESPACE.FRANCE', 2, 'qcm',   'la Seine'),
    ('qm-esp-fra-n2-b', 'QM.ESPACE.FRANCE', 2, 'qcm',   'la Loire'),
    ('qm-esp-fra-n3-a', 'QM.ESPACE.FRANCE', 3, 'qcm',   'Marseille'),
    ('qm-esp-fra-n3-b', 'QM.ESPACE.FRANCE', 3, 'qcm',   'l''hexagone'),
    ('qm-esp-fra-n4-a', 'QM.ESPACE.FRANCE', 4, 'texte', 'Paris'),
    ('qm-esp-fra-n4-b', 'QM.ESPACE.FRANCE', 4, 'texte', 'Seine'),
    -- QM.ESPACE.CARDINAUX
    ('qm-esp-car-n1-a', 'QM.ESPACE.CARDINAUX', 1, 'qcm',   'à l''est'),
    ('qm-esp-car-n1-b', 'QM.ESPACE.CARDINAUX', 1, 'qcm',   'à l''ouest'),
    ('qm-esp-car-n2-a', 'QM.ESPACE.CARDINAUX', 2, 'clic',  'le nord'),
    ('qm-esp-car-n2-b', 'QM.ESPACE.CARDINAUX', 2, 'qcm',   'en haut'),
    ('qm-esp-car-n3-a', 'QM.ESPACE.CARDINAUX', 3, 'qcm',   'ouest'),
    ('qm-esp-car-n3-b', 'QM.ESPACE.CARDINAUX', 3, 'clic',  'le sud'),
    ('qm-esp-car-n4-a', 'QM.ESPACE.CARDINAUX', 4, 'texte', 'sud'),
    ('qm-esp-car-n4-b', 'QM.ESPACE.CARDINAUX', 4, 'texte', 'est'),
    -- QM.ESPACE.PAYSAGES
    ('qm-esp-pay-n1-a', 'QM.ESPACE.PAYSAGES', 1, 'qcm',   'la ville'),
    ('qm-esp-pay-n1-b', 'QM.ESPACE.PAYSAGES', 1, 'qcm',   'la campagne'),
    ('qm-esp-pay-n2-a', 'QM.ESPACE.PAYSAGES', 2, 'tri',   'beaucoup d''immeubles=la ville;des champs=la campagne;beaucoup de voitures=la ville;des vaches dans un pré=la campagne'),
    ('qm-esp-pay-n2-b', 'QM.ESPACE.PAYSAGES', 2, 'qcm',   'littoral'),
    ('qm-esp-pay-n3-a', 'QM.ESPACE.PAYSAGES', 3, 'qcm',   'la montagne'),
    ('qm-esp-pay-n3-b', 'QM.ESPACE.PAYSAGES', 3, 'tri',   'de hauts sommets=la montagne;des plages de sable=le littoral;des pistes de ski=la montagne;des bateaux au port=le littoral'),
    ('qm-esp-pay-n4-a', 'QM.ESPACE.PAYSAGES', 4, 'texte', 'littoral'),
    ('qm-esp-pay-n4-b', 'QM.ESPACE.PAYSAGES', 4, 'texte', 'montagne')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (id deterministe = md5('<competence>:<niveau>:qm')).
-- =========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOR v_comp IN SELECT code FROM public.competences WHERE code LIKE 'QM.ESPACE.%' LOOP
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
-- 4. Sous-matiere `espace` ACTIVE par defaut + profils existants (Iris incluse).
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','geometrie','repere','donnees',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe',
        'lecture','mots-maitresse','vivant','matiere','objets','espace'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'espace')
 WHERE NOT ('espace' = ANY (domaines_actifs));

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0055_questionner_monde_espace')
ON CONFLICT (version) DO NOTHING;
