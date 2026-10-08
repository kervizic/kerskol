-- 0054_questionner_monde_objets.sql
-- QUESTIONNER LE MONDE, sous-matiere « LES OBJETS » (domaine `objets`). S'appuie
-- sur l'infrastructure QM (0052). Migration ADDITIVE.
--
--   QM.OBJETS.CIRCUIT    circuit electrique simple (pile, ampoule, fils,
--                        interrupteur ; ouvert/ferme ; dangers de l'electricite)
--                        -> scene SVG maison cote client (circuitScene) ;
--                        « l'ampoule s'allume ? » = simulation simple portee par
--                        l'attendu de l'item (oui si circuit ferme et non coupe) ;
--   QM.OBJETS.FONCTIONS  objets et leurs fonctions ;
--   QM.OBJETS.LEVIERS    leviers et balances simples ;
--   QM.OBJETS.NUMERIQUE  usage responsable des objets numeriques.
--
-- 4 competences x 4 niveaux x 2 = 32 items. Miroir de domain/qm/objets.ts.

-- =========================================================================
-- 1. Competences (matiere QM, domaine objets).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('QM.OBJETS.CIRCUIT',   'QM', 'objets', 'Le circuit électrique', 900, 4, true),
    ('QM.OBJETS.FONCTIONS', 'QM', 'objets', 'À quoi ça sert',        910, 4, true),
    ('QM.OBJETS.LEVIERS',   'QM', 'objets', 'Balances et leviers',   920, 4, true),
    ('QM.OBJETS.NUMERIQUE', 'QM', 'objets', 'Les écrans et moi',     930, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 2. Seed des items (miroir de objets.ts).
-- =========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- QM.OBJETS.CIRCUIT
    ('qm-obj-cir-n1-a', 'QM.OBJETS.CIRCUIT', 1, 'qcm',   'oui'),
    ('qm-obj-cir-n1-b', 'QM.OBJETS.CIRCUIT', 1, 'qcm',   'non'),
    ('qm-obj-cir-n2-a', 'QM.OBJETS.CIRCUIT', 2, 'clic',  'l''interrupteur'),
    ('qm-obj-cir-n2-b', 'QM.OBJETS.CIRCUIT', 2, 'qcm',   'non'),
    ('qm-obj-cir-n3-a', 'QM.OBJETS.CIRCUIT', 3, 'clic',  'la pile'),
    ('qm-obj-cir-n3-b', 'QM.OBJETS.CIRCUIT', 3, 'qcm',   'd''une pile'),
    ('qm-obj-cir-n4-a', 'QM.OBJETS.CIRCUIT', 4, 'texte', 'boucle'),
    ('qm-obj-cir-n4-b', 'QM.OBJETS.CIRCUIT', 4, 'texte', 'prise'),
    -- QM.OBJETS.FONCTIONS
    ('qm-obj-fon-n1-a', 'QM.OBJETS.FONCTIONS', 1, 'qcm',   'à se protéger de la pluie'),
    ('qm-obj-fon-n1-b', 'QM.OBJETS.FONCTIONS', 1, 'qcm',   'à couper'),
    ('qm-obj-fon-n2-a', 'QM.OBJETS.FONCTIONS', 2, 'tri',   'le stylo=pour écrire;le couteau=pour couper;la fourchette=pour manger'),
    ('qm-obj-fon-n2-b', 'QM.OBJETS.FONCTIONS', 2, 'qcm',   'une montre'),
    ('qm-obj-fon-n3-a', 'QM.OBJETS.FONCTIONS', 3, 'qcm',   'un vélo'),
    ('qm-obj-fon-n3-b', 'QM.OBJETS.FONCTIONS', 3, 'tri',   'le savon=pour se laver;la lampe=pour s''éclairer;la voiture=pour se déplacer'),
    ('qm-obj-fon-n4-a', 'QM.OBJETS.FONCTIONS', 4, 'texte', 'clé'),
    ('qm-obj-fon-n4-b', 'QM.OBJETS.FONCTIONS', 4, 'texte', 'balai'),
    -- QM.OBJETS.LEVIERS
    ('qm-obj-lev-n1-a', 'QM.OBJETS.LEVIERS', 1, 'qcm',   'il descend'),
    ('qm-obj-lev-n1-b', 'QM.OBJETS.LEVIERS', 1, 'qcm',   'le plus lourd'),
    ('qm-obj-lev-n2-a', 'QM.OBJETS.LEVIERS', 2, 'qcm',   'le même poids'),
    ('qm-obj-lev-n2-b', 'QM.OBJETS.LEVIERS', 2, 'qcm',   'à soulever plus facilement'),
    ('qm-obj-lev-n3-a', 'QM.OBJETS.LEVIERS', 3, 'qcm',   'il descend'),
    ('qm-obj-lev-n3-b', 'QM.OBJETS.LEVIERS', 3, 'qcm',   '5 kg'),
    ('qm-obj-lev-n4-a', 'QM.OBJETS.LEVIERS', 4, 'texte', 'équilibre'),
    ('qm-obj-lev-n4-b', 'QM.OBJETS.LEVIERS', 4, 'texte', 'levier'),
    -- QM.OBJETS.NUMERIQUE
    ('qm-obj-num-n1-a', 'QM.OBJETS.NUMERIQUE', 1, 'qcm',   'demander à un adulte'),
    ('qm-obj-num-n1-b', 'QM.OBJETS.NUMERIQUE', 1, 'qcm',   'mauvais pour les yeux'),
    ('qm-obj-num-n2-a', 'QM.OBJETS.NUMERIQUE', 2, 'tri',   'faire une pause souvent=bon usage;jouer toute la journée=mauvais usage;demander à un adulte=bon usage;utiliser un écran la nuit=mauvais usage'),
    ('qm-obj-num-n2-b', 'QM.OBJETS.NUMERIQUE', 2, 'qcm',   'j''en parle à un adulte'),
    ('qm-obj-num-n3-a', 'QM.OBJETS.NUMERIQUE', 3, 'qcm',   'pour reposer les yeux'),
    ('qm-obj-num-n3-b', 'QM.OBJETS.NUMERIQUE', 3, 'qcm',   'non, il faut vérifier'),
    ('qm-obj-num-n4-a', 'QM.OBJETS.NUMERIQUE', 4, 'texte', 'adulte'),
    ('qm-obj-num-n4-b', 'QM.OBJETS.NUMERIQUE', 4, 'texte', 'yeux')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (id deterministe = md5('<competence>:<niveau>:qm')).
-- =========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOR v_comp IN SELECT code FROM public.competences WHERE code LIKE 'QM.OBJETS.%' LOOP
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
-- 4. Sous-matiere `objets` ACTIVE par defaut + profils existants (Iris incluse).
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','geometrie','repere','donnees',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe',
        'lecture','mots-maitresse','vivant','matiere','objets'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'objets')
 WHERE NOT ('objets' = ANY (domaines_actifs));

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0054_questionner_monde_objets')
ON CONFLICT (version) DO NOTHING;
