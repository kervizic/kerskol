-- 0077_cm1_geometrie.sql
-- LOT 6 (CM1) - MATHEMATIQUES : « Espace et géométrie ».
-- Attendus de fin de CM1 (programme cycle 3, actualise 2025, eduscol doc 13990) :
-- droites perpendiculaires et paralleles ; cercle (compas) ; programme de
-- construction ; symetrie axiale.
--
-- On REUTILISE les OUTILS VIRTUELS existants (moteur geometrie, composant
-- <Geometrie>, verif_geo), aucune nouvelle UI, aucun nouveau juge :
--   * CERCLE (compas), SYMETRIE (axe), CONSTRUIRE (programme de construction) :
--     ces competences existent deja (CE2). On ELARGIT leur portee a CM1..CM2 ;
--     leur contenu (traces au compas, symetriques, figures a construire) couvre
--     deja le niveau CM1. Elles rejoignent le coeur du plan de classe CM1.
--   * PERPENDICULAIRES / PARALLELES : vocabulaire nouveau, livre via le moteur
--     `donnees` (op 'don', QCM, figure « none » ; code MA.DONNEES.DROITES pour
--     le routage/verif, domaine `geometrie`).
--
-- Miroir front (donnees.ts, 88 items au total) <-> SQL (donnees_item). Plan de
-- classe CM1. Serveur SEUL JUGE.
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaine `geometrie` deja actif (aucun
-- changement du defaut). RESTE (cf. docs/explications.md) : reconnaissance
-- VISUELLE (tracer/identifier perpendiculaires et paralleles sur une figure)
-- demande une figure dediee dans <Geometrie>.

-- =========================================================================
-- 1. Elargissement de portee a CM1..CM2 des competences geometrie reutilisees.
-- =========================================================================
UPDATE public.competences SET classe_max = 'CM2'
 WHERE code IN ('MA.GEO.CERCLE', 'MA.GEO.SYMETRIE', 'MA.GEO.CONSTRUIRE')
   AND classe_max <> 'CM2';

-- =========================================================================
-- 2. Nouvelle competence : droites perpendiculaires / paralleles (vocabulaire).
--    Code MA.DONNEES.DROITES (moteur donnees), domaine `geometrie`.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('MA.DONNEES.DROITES', 'MA', 'geometrie', 'Droites perpendiculaires et parallèles', 635, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE
    SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine, libelle=EXCLUDED.libelle,
        ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.DONNEES.DROITES', 'MA.GEO.VOCABULAIRE', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 3. Items de reference (miroir donnees.ts) + exercices donnees (DROITES).
-- =========================================================================
INSERT INTO public.donnees_item (cle, competence, niveau, format, attendu) VALUES
    ('dro-n1-a', 'MA.DONNEES.DROITES', 1, 'qcm',   'perpendiculaires'),
    ('dro-n1-b', 'MA.DONNEES.DROITES', 1, 'qcm',   'parallèles'),
    ('dro-n2-a', 'MA.DONNEES.DROITES', 2, 'qcm',   'parallèles'),
    ('dro-n2-b', 'MA.DONNEES.DROITES', 2, 'qcm',   'perpendiculaires'),
    ('dro-n3-a', 'MA.DONNEES.DROITES', 3, 'qcm',   'perpendiculaires'),
    ('dro-n3-b', 'MA.DONNEES.DROITES', 3, 'qcm',   'parallèles'),
    ('dro-n4-a', 'MA.DONNEES.DROITES', 4, 'texte', 'perpendiculaires'),
    ('dro-n4-b', 'MA.DONNEES.DROITES', 4, 'texte', 'parallèles')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('MA.DONNEES.DROITES:' || v_niv || ':donnees')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'MA.DONNEES.DROITES', 'donnees', v_niv, 'donnees', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence, type=EXCLUDED.type,
            niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0077_cm1_geometrie')
ON CONFLICT (version) DO NOTHING;
