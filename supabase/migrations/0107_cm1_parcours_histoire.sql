-- 0107_cm1_parcours_histoire.sql
-- LOT 1 (CM1) - PARCOURS D'HISTOIRE (methode « parcours » validee par Manu).
--
-- Chaque chapitre est un parcours en 4 etapes : recit -> questions -> frise ->
-- « je retiens ». Cette migration seed UNIQUEMENT les items 'qm' des etapes
-- QUESTIONS et JE RETIENS (la frise est traitee en 0108). Les items reutilisent
-- les COMPETENCES HIST.* EXISTANTES (0103) : ils alimentent donc l'EMA existant
-- (progression / revisions espacees), sans nouvelle competence ni nouveau
-- domaine. Les 40 items d'entrainement libre (0103) restent INCHANGES ; on
-- AJOUTE simplement des items (cles prefixees « pa-* ») aux memes competences.
--
-- Miroir EXACT de frontend/src/domain/histoire/parcours.ts (helpers ordre()/tri()
-- et comparateur comparerQm). Test croise : parcours.test.ts (front) +
-- supabase/tests/parcours_histoire_test.sql (SQL).
--
-- VERITE HISTORIQUE (« n'adoucis pas l'Histoire ») : traite, esclavage, Code
-- noir, guerres de religion, 1789 - factuel, sans detail macabre. L'exemption de
-- bienveillance pour HIST.% est deja en place (0103+).
--
-- Securite / donnees reelles : ADDITIVE et IDEMPOTENTE (ON CONFLICT (cle) DO
-- UPDATE). Aucun changement de schema, de competence, de domaine, ni du DEFAUT
-- de profils.domaines_actifs. Serveur seul juge (op 'qm' + verif_qm, deja
-- elargis a HIST.% en 0098/0099). qm_item accepte deja HIST.% (CHECK 0098).

INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- THEME 1 - Moyen Age (HIST.MOYENAGE)
    ('pa-moy-q1',  'HIST.MOYENAGE',    1, 'qcm',   'la seigneurie'),
    ('pa-moy-q2',  'HIST.MOYENAGE',    2, 'qcm',   'la dîme'),
    ('pa-moy-q3',  'HIST.MOYENAGE',    3, 'tri',   'le château=le seigneur;le donjon=le seigneur;l''église du village=l''Église;l''abbaye=l''Église'),
    ('pa-moy-q4',  'HIST.MOYENAGE',    4, 'texte', 'corvée'),
    ('pa-moy-jr1', 'HIST.MOYENAGE',    2, 'texte', 'seigneurie'),
    ('pa-moy-jr2', 'HIST.MOYENAGE',    3, 'texte', 'corvée'),
    ('pa-moy-jr3', 'HIST.MOYENAGE',    2, 'texte', 'dîme'),
    -- THEME 2 - Monarchie (HIST.MONARCHIE)
    ('pa-nar-q1',  'HIST.MONARCHIE',   1, 'qcm',   'François Ier'),
    ('pa-nar-q2',  'HIST.MONARCHIE',   2, 'qcm',   'le massacre de la Saint-Barthélemy'),
    ('pa-nar-q3',  'HIST.MONARCHIE',   3, 'qcm',   'la monarchie absolue'),
    ('pa-nar-q4',  'HIST.MONARCHIE',   4, 'texte', 'Nantes'),
    ('pa-nar-jr1', 'HIST.MONARCHIE',   2, 'texte', 'Renaissance'),
    ('pa-nar-jr2', 'HIST.MONARCHIE',   3, 'texte', 'absolue'),
    ('pa-nar-jr3', 'HIST.MONARCHIE',   2, 'texte', 'Versailles'),
    -- THEME 3a - Explorations (HIST.EXPLORATIONS)
    ('pa-exp-q1',  'HIST.EXPLORATIONS', 1, 'qcm',   'les caravelles'),
    ('pa-exp-q2',  'HIST.EXPLORATIONS', 2, 'qcm',   'la boussole'),
    ('pa-exp-q3',  'HIST.EXPLORATIONS', 3, 'ordre', 'l''Europe>l''océan Atlantique>l''Amérique>l''océan Pacifique'),
    ('pa-exp-q4',  'HIST.EXPLORATIONS', 4, 'texte', 'Colomb'),
    ('pa-exp-jr1', 'HIST.EXPLORATIONS', 2, 'texte', 'caravelles'),
    ('pa-exp-jr2', 'HIST.EXPLORATIONS', 2, 'texte', 'boussole'),
    ('pa-exp-jr3', 'HIST.EXPLORATIONS', 2, 'texte', 'Amérique'),
    -- THEME 3b - Traite et esclavage (HIST.EXPLORATIONS)
    ('pa-tra-q1',  'HIST.EXPLORATIONS', 2, 'qcm',   'la traite des esclaves'),
    ('pa-tra-q2',  'HIST.EXPLORATIONS', 3, 'qcm',   'le Code noir'),
    ('pa-tra-q3',  'HIST.EXPLORATIONS', 3, 'qcm',   'parce qu''il prive des personnes de leur liberté'),
    ('pa-tra-q4',  'HIST.EXPLORATIONS', 4, 'texte', 'Afrique'),
    ('pa-tra-jr1', 'HIST.EXPLORATIONS', 2, 'texte', 'traite'),
    ('pa-tra-jr2', 'HIST.EXPLORATIONS', 2, 'texte', 'esclave'),
    ('pa-tra-jr3', 'HIST.EXPLORATIONS', 3, 'texte', 'Code noir'),
    -- THEME 4 - 1789, la Revolution (HIST.REVOLUTION)
    ('pa-rev-q1',  'HIST.REVOLUTION',  1, 'qcm',   'la Bastille'),
    ('pa-rev-q2',  'HIST.REVOLUTION',  2, 'qcm',   'la Déclaration des droits de l''Homme et du citoyen'),
    ('pa-rev-q3',  'HIST.REVOLUTION',  3, 'ordre', 'la réunion des États généraux>la prise de la Bastille>la Déclaration des droits de l''Homme'),
    ('pa-rev-q4',  'HIST.REVOLUTION',  4, 'texte', '14 juillet'),
    ('pa-rev-jr1', 'HIST.REVOLUTION',  2, 'texte', 'Bastille'),
    ('pa-rev-jr2', 'HIST.REVOLUTION',  2, 'texte', 'droits'),
    ('pa-rev-jr3', 'HIST.REVOLUTION',  2, 'texte', 'Révolution')
ON CONFLICT (cle) DO UPDATE SET
    competence = EXCLUDED.competence,
    niveau     = EXCLUDED.niveau,
    format     = EXCLUDED.format,
    attendu    = EXCLUDED.attendu;

-- Enregistrement de la migration.
INSERT INTO public.schema_migrations (version)
VALUES ('0107_cm1_parcours_histoire')
ON CONFLICT (version) DO NOTHING;
