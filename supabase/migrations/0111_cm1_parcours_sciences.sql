-- 0111_cm1_parcours_sciences.sql
-- LOT 5 (CM1) - PARCOURS DE SCIENCES (meme methode « parcours », SANS frise).
-- Seed des items 'qm' (QUESTIONS + JE RETIENS) sous les COMPETENCES ST.*
-- EXISTANTES (0105) : ils alimentent l'EMA existant, sans nouvelle competence ni
-- nouveau domaine. Une question par chapitre est au format 'clic' (completer un
-- schema : toucher la bonne case).
--
-- Miroir EXACT de frontend/src/domain/sciences/parcours.ts. Test croise :
-- parcoursSciences.test.ts (front) + supabase/tests/parcours_sciences_test.sql.
--
-- Securite / donnees reelles : ADDITIVE et IDEMPOTENTE (ON CONFLICT (cle) DO
-- UPDATE). Aucun changement de schema, de competence, de domaine ni du DEFAUT de
-- profils.domaines_actifs. Serveur seul juge (op 'qm' + verif_qm, ST.% deja
-- acceptes en 0098). qm_item accepte deja ST.% et les formats 'clic' et 'tri'.

INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- Chapitre 1 - Les etats de la matiere (ST.MATIERE.ETATS)
    ('ps-eta-q1',  'ST.MATIERE.ETATS', 1, 'qcm',   'à l''état solide'),
    ('ps-eta-q2',  'ST.MATIERE.ETATS', 2, 'clic',  'le gaz'),
    ('ps-eta-q3',  'ST.MATIERE.ETATS', 3, 'qcm',   'homogène'),
    ('ps-eta-q4',  'ST.MATIERE.ETATS', 4, 'texte', 'solidification'),
    ('ps-eta-jr1', 'ST.MATIERE.ETATS', 2, 'texte', 'solide'),
    ('ps-eta-jr2', 'ST.MATIERE.ETATS', 2, 'texte', 'liquide'),
    ('ps-eta-jr3', 'ST.MATIERE.ETATS', 2, 'texte', 'gazeux'),
    -- Chapitre 2 - Classer le vivant (ST.VIVANT.CLASSER)
    ('ps-cla-q1',  'ST.VIVANT.CLASSER', 1, 'qcm',   'des plumes'),
    ('ps-cla-q2',  'ST.VIVANT.CLASSER', 2, 'tri',   'le chat=des poils;l''oiseau=des plumes;le poisson=des écailles'),
    ('ps-cla-q3',  'ST.VIVANT.CLASSER', 3, 'qcm',   'ovipare'),
    ('ps-cla-q4',  'ST.VIVANT.CLASSER', 4, 'texte', 'vertébré'),
    ('ps-cla-jr1', 'ST.VIVANT.CLASSER', 2, 'texte', 'poils'),
    ('ps-cla-jr2', 'ST.VIVANT.CLASSER', 3, 'texte', 'ovipare'),
    ('ps-cla-jr3', 'ST.VIVANT.CLASSER', 4, 'texte', 'vertébré')
ON CONFLICT (cle) DO UPDATE SET
    competence = EXCLUDED.competence,
    niveau     = EXCLUDED.niveau,
    format     = EXCLUDED.format,
    attendu    = EXCLUDED.attendu;

INSERT INTO public.schema_migrations (version)
VALUES ('0111_cm1_parcours_sciences')
ON CONFLICT (version) DO NOTHING;
