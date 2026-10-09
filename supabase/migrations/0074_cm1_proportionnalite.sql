-- 0074_cm1_proportionnalite.sql
-- LOT 4 (CM1) - MATHEMATIQUES : « Proportionnalite ».
-- Attendus de fin de CM1 (programme cycle 3, actualise 2025, eduscol doc 13990) :
-- resoudre des problemes de proportionnalite simples (recettes, courses, achats)
-- en utilisant un tableau et des procedures (passage par l'unite, coefficient,
-- proprietes additives/multiplicatives).
--
-- NOUVELLE SOUS-MATIERE / domaine `proportionnalite` (portee CM1..CM2, visible
-- CM1+). On REUTILISE INTEGRALEMENT le moteur `donnees` (tableau + op 'don',
-- SERVEUR SEUL JUGE, composant <Donnees>) : les competences gardent un CODE en
-- MA.DONNEES.PROP_* (routage client buildDonnees + verif_donnees + CHECK de
-- donnees_item exigent le prefixe MA.DONNEES.), mais leur DOMAINE est
-- 'proportionnalite' (nouvelle sous-matiere). AUCUNE nouvelle UI, aucun nouveau
-- juge : un tableau de proportionnalite est un tableau a completer.
--
--   MA.DONNEES.PROP_RECETTE   proportionnaliser une recette (ingredients) ;
--   MA.DONNEES.PROP_COURSES   proportionnaliser un prix (courses, achats).
--
-- Miroir EXACT de frontend/src/domain/donnees/donnees.ts (16 items : 2 x 4 x 2 ;
-- golden 72 au total) ; test croise donnees_test.sql.
--
-- Migration ADDITIVE et IDEMPOTENTE. Le domaine `proportionnalite` est ajoute
-- ACTIF au defaut (liste COMPLETE, cf. correctif 0073) et aux profils existants ;
-- la sous-matiere reste MASQUEE pour un CE2 (visibilite stricte CM1 cote client).

-- =========================================================================
-- 1. Referentiel : 2 competences CM1 (domaine proportionnalite, codes
--    MA.DONNEES.PROP_* pour reutiliser le moteur donnees).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('MA.DONNEES.PROP_RECETTE', 'MA', 'proportionnalite', 'Proportionnalité : les recettes', 750, 'CM1', 'CM2'),
    ('MA.DONNEES.PROP_COURSES', 'MA', 'proportionnalite', 'Proportionnalité : les courses', 751, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE
    SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine, libelle=EXCLUDED.libelle,
        ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

-- Prerequis : la proportionnalite repose sur le raisonnement multiplicatif.
INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.DONNEES.PROP_RECETTE', 'MA.PB.MULT_DIV', 2),
    ('MA.DONNEES.PROP_COURSES', 'MA.PB.MULT_DIV', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Seed des items de reference (miroir de donnees.ts ; 16 items).
-- =========================================================================
INSERT INTO public.donnees_item (cle, competence, niveau, format, attendu) VALUES
    -- Recettes
    ('prop-rec-n1-a', 'MA.DONNEES.PROP_RECETTE', 1, 'qcm',   '8'),
    ('prop-rec-n1-b', 'MA.DONNEES.PROP_RECETTE', 1, 'qcm',   '9'),
    ('prop-rec-n2-a', 'MA.DONNEES.PROP_RECETTE', 2, 'qcm',   '30'),
    ('prop-rec-n2-b', 'MA.DONNEES.PROP_RECETTE', 2, 'qcm',   '400'),
    ('prop-rec-n3-a', 'MA.DONNEES.PROP_RECETTE', 3, 'qcm',   '18'),
    ('prop-rec-n3-b', 'MA.DONNEES.PROP_RECETTE', 3, 'qcm',   '30'),
    ('prop-rec-n4-a', 'MA.DONNEES.PROP_RECETTE', 4, 'texte', '24'),
    ('prop-rec-n4-b', 'MA.DONNEES.PROP_RECETTE', 4, 'texte', '300'),
    -- Courses
    ('prop-crs-n1-a', 'MA.DONNEES.PROP_COURSES', 1, 'qcm',   '12'),
    ('prop-crs-n1-b', 'MA.DONNEES.PROP_COURSES', 1, 'qcm',   '8'),
    ('prop-crs-n2-a', 'MA.DONNEES.PROP_COURSES', 2, 'qcm',   '6'),
    ('prop-crs-n2-b', 'MA.DONNEES.PROP_COURSES', 2, 'qcm',   '20'),
    ('prop-crs-n3-a', 'MA.DONNEES.PROP_COURSES', 3, 'qcm',   '24'),
    ('prop-crs-n3-b', 'MA.DONNEES.PROP_COURSES', 3, 'qcm',   '45'),
    ('prop-crs-n4-a', 'MA.DONNEES.PROP_COURSES', 4, 'texte', '10'),
    ('prop-crs-n4-b', 'MA.DONNEES.PROP_COURSES', 4, 'texte', '10')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (type 'donnees', methode 'donnees').
-- =========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOR v_comp IN
        SELECT code FROM public.competences
         WHERE code IN ('MA.DONNEES.PROP_RECETTE', 'MA.DONNEES.PROP_COURSES')
    LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':donnees')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'donnees', v_niv, 'donnees', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Sous-matiere `proportionnalite` ACTIVE par defaut (liste COMPLETE, cf.
--    correctif 0073) + ajoutee aux profils existants.
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','decimaux','proportionnalite','geometrie','repere','donnees',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe',
        'lecture','mots-maitresse','vivant','matiere','objets','espace','temps',
        'respect','emotions','republique','ecrans','ecriture'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'proportionnalite')
 WHERE NOT ('proportionnalite' = ANY (domaines_actifs));

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0074_cm1_proportionnalite')
ON CONFLICT (version) DO NOTHING;
