-- 0091_cm1_bibliotheque_comprehension.sql
-- LOT 4 (CM1) - FRANCAIS / COMPREHENSION : questions sur les textes CM1 ajoutes
-- a la page Bibliotheque (domaine public verifie, cycle 3, utilisable=oui,
-- ton=garde ; jamais de texte coupe). Quatre textes, 4 questions chacun (16) :
--   c3-010 Gautier « Premier sourire du printemps » ;
--   c3-037 Andersen « La Princesse sur un pois » ;
--   c3-021 Ségur « La poupée de cire au soleil » ;
--   c3-059 Colette « Le matin du grand départ ».
--
-- N1 QCM (info), N2 sens d'un mot, N3 inference, N4 reponse libre (clic/texte).
-- Miroir EXACT de comprehension.ts (cle/competence/niveau/format/attendu) ; le
-- SERVEUR reste seul juge (op 'lire', verif_comprehension). Golden 192 -> 208.
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaine lecture deja actif ; aucun
-- changement de domaines_actifs / DEFAULT. Les exercices de reference
-- FR.LECTURE.* (par competence/niveau) existent deja (0045).

INSERT INTO public.comprehension_item (cle, competence, niveau, format, attendu) VALUES
    -- Théophile Gautier, « Premier sourire du printemps »
    ('lec-bib-printemps-info-n1', 'FR.LECTURE.INFO',      1, 'qcm',   'les perce-neiges'),
    ('lec-bib-printemps-sens-n2', 'FR.LECTURE.SENS_MOT',  2, 'qcm',   'qui se fait en cachette'),
    ('lec-bib-printemps-inf-n3',  'FR.LECTURE.INFERENCE', 3, 'qcm',   'il les prépare avec soin, en cachette'),
    ('lec-bib-printemps-clic-n4', 'FR.LECTURE.INFO',      4, 'clic',  'cerf'),
    -- Hans Christian Andersen, « La Princesse sur un pois »
    ('lec-bib-pois-info-n1',      'FR.LECTURE.INFO',      1, 'qcm',   'épouser une vraie princesse'),
    ('lec-bib-pois-sens-n2',      'FR.LECTURE.SENS_MOT',  2, 'qcm',   'triste'),
    ('lec-bib-pois-inf-n3',       'FR.LECTURE.INFERENCE', 3, 'qcm',   'pour savoir si c''est une vraie princesse'),
    ('lec-bib-pois-texte-n4',     'FR.LECTURE.INFO',      4, 'texte', 'vingt'),
    -- La Comtesse de Ségur, « La poupée de cire au soleil »
    ('lec-bib-poupee-info-n1',    'FR.LECTURE.INFO',      1, 'qcm',   'pour la réchauffer'),
    ('lec-bib-poupee-sens-n2',    'FR.LECTURE.SENS_MOT',  2, 'qcm',   'fais attention'),
    ('lec-bib-poupee-inf-n3',     'FR.LECTURE.INFERENCE', 3, 'qcm',   'sa poupée est abîmée par le soleil'),
    ('lec-bib-poupee-clic-n4',    'FR.LECTURE.INFO',      4, 'clic',  'amies'),
    -- Colette, « Le matin du grand départ »
    ('lec-bib-depart-info-n1',    'FR.LECTURE.INFO',      1, 'qcm',   'il a couru dans toute la maison'),
    ('lec-bib-depart-sens-n2',    'FR.LECTURE.SENS_MOT',  2, 'qcm',   'perché, placé très haut'),
    ('lec-bib-depart-inf-n3',     'FR.LECTURE.INFERENCE', 3, 'qcm',   'on prépare un grand départ'),
    ('lec-bib-depart-clic-n4',    'FR.LECTURE.INFO',      4, 'clic',  'bibliothèque')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- Garde-fou : golden global 208.
DO $do$
DECLARE n integer;
BEGIN
    SELECT count(*) INTO n FROM public.comprehension_item;
    IF n <> 208 THEN RAISE EXCEPTION 'comprehension_item : golden 208 attendu, obtenu %', n; END IF;
END $do$;

INSERT INTO public.schema_migrations (version)
VALUES ('0091_cm1_bibliotheque_comprehension')
ON CONFLICT (version) DO NOTHING;
