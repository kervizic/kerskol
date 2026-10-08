-- 0065_bibliotheque_comprehension_recup.sql
-- LOT 0 (decision Manu) : 3 fables de La Fontaine RECUPEREES pour la page
-- Bibliotheque (« Le Chene et le Roseau », « La Laitiere et le Pot au lait »,
-- « L'Ours et les deux Compagnons »). Elles avaient ete ecartees au lot 0062
-- parce que leur CORPS complet contenait un mot sensible ; l'extrait AFFICHE a
-- ete COUPE aux limites de phrase pour retirer ce mot (le garde-fou
-- bienveillance passe desormais sur le texte affiche). On ajoute ici les 11
-- questions de comprehension associees (4 + 4 + 3), miroir EXACT de
-- frontend/src/domain/francais/comprehension.ts.
--
-- Migration ADDITIVE et IDEMPOTENTE : elle n'ajoute que des lignes de REFERENCE
-- dans public.comprehension_item (le SERVEUR reste SEUL JUGE). Aucune donnee
-- utilisateur (Iris, foyers) n'est touchee ; aucun profil n'est modifie.
-- Golden : 192 + 11 = 203 items (comprehension_test.sql).

INSERT INTO public.comprehension_item (cle, competence, niveau, format, attendu) VALUES
    -- Jean de La Fontaine, « Le Chêne et le Roseau »
    ('lec-bib-chene-info-n1',     'FR.LECTURE.INFO',      1, 'qcm',  'au roseau'),
    ('lec-bib-chene-sens-n2',     'FR.LECTURE.SENS_MOT',  2, 'qcm',  'un vent doux et léger'),
    ('lec-bib-chene-inf-n3',      'FR.LECTURE.INFERENCE', 3, 'qcm',  'pour ne pas se casser'),
    ('lec-bib-chene-clic-n4',     'FR.LECTURE.INFO',      4, 'clic', 'roseau'),
    -- Jean de La Fontaine, « La Laitière et le Pot au lait »
    ('lec-bib-laitiere-info-n1',  'FR.LECTURE.INFO',      1, 'qcm',  'un pot au lait'),
    ('lec-bib-laitiere-sens-n2',  'FR.LECTURE.SENS_MOT',  2, 'qcm',  'tous les poussins nés des œufs d''une poule'),
    ('lec-bib-laitiere-inf-n3',   'FR.LECTURE.INFERENCE', 3, 'qcm',  'parce que Perrette saute de joie'),
    ('lec-bib-laitiere-clic-n4',  'FR.LECTURE.INFO',      4, 'clic', 'lait'),
    -- Jean de La Fontaine, « L'Ours et les deux Compagnons »
    ('lec-bib-ours-info-n1',      'FR.LECTURE.INFO',      1, 'qcm',  'la peau d''un ours'),
    ('lec-bib-ours-sens-n2',      'FR.LECTURE.SENS_MOT',  2, 'qcm',  'le point le plus haut'),
    ('lec-bib-ours-inf-n3',       'FR.LECTURE.INFERENCE', 3, 'qcm',  'il ne faut pas vendre une chose qu''on n''a pas encore')
ON CONFLICT (cle) DO UPDATE SET
    competence = EXCLUDED.competence,
    niveau     = EXCLUDED.niveau,
    format     = EXCLUDED.format,
    attendu    = EXCLUDED.attendu;

-- Enregistrement de la migration.
INSERT INTO public.schema_migrations (version)
VALUES ('0065_bibliotheque_comprehension_recup')
ON CONFLICT (version) DO NOTHING;
