-- 0053_questionner_monde_matiere.sql
-- QUESTIONNER LE MONDE, sous-matiere « LA MATIERE » (domaine `matiere`). S'appuie
-- sur l'infrastructure QM posee en 0052 (matiere QM, table qm_item, verif_qm, op
-- 'qm' dans enregistrer_reponse, type exercice 'qm'). Migration ADDITIVE : on
-- ajoute seulement des competences, des items, des exercices, et on active la
-- sous-matiere `matiere`.
--
--   QM.MATIERE.ETATS     solide / liquide / gaz ;
--   QM.MATIERE.EAU       etats de l'eau et changements d'etat (fusion,
--                        solidification, evaporation, condensation) ;
--   QM.MATIERE.MELANGES  melanges et solutions simples ;
--   QM.MATIERE.AIR       l'air existe.
--
-- 4 competences x 4 niveaux x 2 = 32 items. Miroir de frontend/src/domain/qm/
-- matiere.ts (test croise qm_test.sql + golden vitest). ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Competences (matiere QM, domaine matiere). Ouvertes d'emblee.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('QM.MATIERE.ETATS',    'QM', 'matiere', 'Solide, liquide ou gaz', 860, 4, true),
    ('QM.MATIERE.EAU',      'QM', 'matiere', 'L''eau change d''état',   870, 4, true),
    ('QM.MATIERE.MELANGES', 'QM', 'matiere', 'Mélanges et solutions',  880, 4, true),
    ('QM.MATIERE.AIR',      'QM', 'matiere', 'L''air existe',           890, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 2. Seed des items (miroir de matiere.ts).
-- =========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- QM.MATIERE.ETATS
    ('qm-mat-eta-n1-a', 'QM.MATIERE.ETATS', 1, 'qcm',   'un liquide'),
    ('qm-mat-eta-n1-b', 'QM.MATIERE.ETATS', 1, 'qcm',   'un solide'),
    ('qm-mat-eta-n2-a', 'QM.MATIERE.ETATS', 2, 'tri',   'un caillou=solide;le lait=liquide;un crayon=solide;le jus=liquide'),
    ('qm-mat-eta-n2-b', 'QM.MATIERE.ETATS', 2, 'qcm',   'un solide'),
    ('qm-mat-eta-n3-a', 'QM.MATIERE.ETATS', 3, 'tri',   'le bois=solide;l''eau=liquide;l''air=gaz'),
    ('qm-mat-eta-n3-b', 'QM.MATIERE.ETATS', 3, 'qcm',   'il prend la forme de la bouteille'),
    ('qm-mat-eta-n4-a', 'QM.MATIERE.ETATS', 4, 'texte', 'air'),
    ('qm-mat-eta-n4-b', 'QM.MATIERE.ETATS', 4, 'texte', 'gaz'),
    -- QM.MATIERE.EAU
    ('qm-mat-eau-n1-a', 'QM.MATIERE.EAU', 1, 'qcm',   'en glace'),
    ('qm-mat-eau-n1-b', 'QM.MATIERE.EAU', 1, 'qcm',   'en vapeur'),
    ('qm-mat-eau-n2-a', 'QM.MATIERE.EAU', 2, 'qcm',   'la fusion'),
    ('qm-mat-eau-n2-b', 'QM.MATIERE.EAU', 2, 'qcm',   'la solidification'),
    ('qm-mat-eau-n3-a', 'QM.MATIERE.EAU', 3, 'qcm',   'l''évaporation'),
    ('qm-mat-eau-n3-b', 'QM.MATIERE.EAU', 3, 'tri',   'la solidification=devient solide;la fusion=devient liquide;l''évaporation=devient gaz'),
    ('qm-mat-eau-n4-a', 'QM.MATIERE.EAU', 4, 'texte', 'condensation'),
    ('qm-mat-eau-n4-b', 'QM.MATIERE.EAU', 4, 'ordre', 'la glace>l''eau liquide>la vapeur'),
    -- QM.MATIERE.MELANGES
    ('qm-mat-mel-n1-a', 'QM.MATIERE.MELANGES', 1, 'qcm',   'le sucre disparaît dans l''eau'),
    ('qm-mat-mel-n1-b', 'QM.MATIERE.MELANGES', 1, 'qcm',   'il tombe au fond'),
    ('qm-mat-mel-n2-a', 'QM.MATIERE.MELANGES', 2, 'tri',   'le sucre=se dissout;le sel=se dissout;le sable=ne se dissout pas;l''huile=ne se dissout pas'),
    ('qm-mat-mel-n2-b', 'QM.MATIERE.MELANGES', 2, 'qcm',   'une solution'),
    ('qm-mat-mel-n3-a', 'QM.MATIERE.MELANGES', 3, 'qcm',   'avec un filtre'),
    ('qm-mat-mel-n3-b', 'QM.MATIERE.MELANGES', 3, 'qcm',   'elles ne se mélangent pas'),
    ('qm-mat-mel-n4-a', 'QM.MATIERE.MELANGES', 4, 'texte', 'dissout'),
    ('qm-mat-mel-n4-b', 'QM.MATIERE.MELANGES', 4, 'texte', 'filtre'),
    -- QM.MATIERE.AIR
    ('qm-mat-air-n1-a', 'QM.MATIERE.AIR', 1, 'qcm',   'de l''air'),
    ('qm-mat-air-n1-b', 'QM.MATIERE.AIR', 1, 'qcm',   'quand le vent souffle'),
    ('qm-mat-air-n2-a', 'QM.MATIERE.AIR', 2, 'qcm',   'des bulles d''air'),
    ('qm-mat-air-n2-b', 'QM.MATIERE.AIR', 2, 'qcm',   'oui'),
    ('qm-mat-air-n3-a', 'QM.MATIERE.AIR', 3, 'qcm',   'rempli d''air'),
    ('qm-mat-air-n3-b', 'QM.MATIERE.AIR', 3, 'qcm',   'de l''air qui bouge'),
    ('qm-mat-air-n4-a', 'QM.MATIERE.AIR', 4, 'texte', 'air'),
    ('qm-mat-air-n4-b', 'QM.MATIERE.AIR', 4, 'texte', 'vent')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (id deterministe = md5('<competence>:<niveau>:qm')).
-- =========================================================================
DO $do$
DECLARE
    v_comp text;
    v_niv  integer;
    v_id   uuid;
BEGIN
    FOR v_comp IN
        SELECT code FROM public.competences WHERE code LIKE 'QM.MATIERE.%'
    LOOP
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
-- 4. Sous-matiere `matiere` ACTIVE par defaut (nouveaux profils) et ajoutee aux
--    profils existants (dont Iris). La matiere QM est deja active (0052).
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','geometrie','repere','donnees',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe',
        'lecture','mots-maitresse','vivant','matiere'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'matiere')
 WHERE NOT ('matiere' = ANY (domaines_actifs));

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0053_questionner_monde_matiere')
ON CONFLICT (version) DO NOTHING;
