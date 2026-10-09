-- 0102_cm1_bibliotheque_poemes.sql
-- LOT (CM1) - FRANCAIS / COMPREHENSION : questions sur DEUX nouveaux textes CM1
-- ajoutes a la page Bibliotheque (domaine public verifie, cycle 3, utilisable=oui,
-- ton=garde ; JAMAIS de texte coupe). Deux poemes, 4 questions chacun (8) :
--   c3-052 Paul Verlaine « La lune blanche » ;
--   c3-071 Jean Aicard « Les Berceaux ».
--
-- Les 10 autres textes CM1 « ok » du kit sont ABREGES (marqueur « [...] » dans la
-- version du kit) : non integres (regle « jamais de texte coupe »). c3-049
-- (Renard) est ecarte car son corps contient « meurent » (garde-fou bienveillance).
--
-- Miroir EXACT de comprehension.ts (cle/competence/niveau/format/attendu) ; le
-- SERVEUR reste seul juge (op 'lire', verif_comprehension). Golden 208 -> 216.
-- ADDITIVE et IDEMPOTENTE. Domaine lecture deja actif ; aucun changement de
-- domaines_actifs. Les exercices FR.LECTURE.* (par competence/niveau) existent
-- deja (0045).

INSERT INTO public.comprehension_item (cle, competence, niveau, format, attendu) VALUES
    ('lec-bib-lune-info-n1', 'FR.LECTURE.INFO', 1, 'qcm', 'blanche'),
    ('lec-bib-lune-sens-n2', 'FR.LECTURE.SENS_MOT', 2, 'qcm', 'brille doucement'),
    ('lec-bib-lune-inf-n3', 'FR.LECTURE.INFERENCE', 3, 'qcm', 'le calme et la douceur'),
    ('lec-bib-lune-clic-n4', 'FR.LECTURE.INFO', 4, 'clic', 'saule'),
    ('lec-bib-berceaux-info-n1', 'FR.LECTURE.INFO', 1, 'qcm', 'à de petites barques'),
    ('lec-bib-berceaux-sens-n2', 'FR.LECTURE.SENS_MOT', 2, 'qcm', 'une petite barque légère'),
    ('lec-bib-berceaux-inf-n3', 'FR.LECTURE.INFERENCE', 3, 'qcm', 'ils dorment paisiblement'),
    ('lec-bib-berceaux-texte-n4', 'FR.LECTURE.INFO', 4, 'texte', 'femmes')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

INSERT INTO public.schema_migrations (version)
VALUES ('0102_cm1_bibliotheque_poemes')
ON CONFLICT (version) DO NOTHING;
