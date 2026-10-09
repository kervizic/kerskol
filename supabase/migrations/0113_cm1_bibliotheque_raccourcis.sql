-- 0113_cm1_bibliotheque_raccourcis.sql
-- LOT (CM1) - FRANCAIS / COMPREHENSION : questions sur SEPT nouveaux textes CM1
-- ajoutes a la page Bibliotheque. Decision de Manu (9 octobre 2026) : « ok pour
-- garder » les textes RACCOURCIS pour la longueur (on abrege une oeuvre longue),
-- MAIS sans jamais afficher le marqueur « [...] » (« pour un enfant il ne va pas
-- comprendre les crochets »). Les coupes tombent entre phrases / paragraphes et
-- le texte affiche reste bienveillant d'un bout a l'autre.
--
-- Les textes du kit (lecture seule de ../kerskol-kits/bibliotheque-domaine-public)
-- classes CM1, statut ok (utilisable=oui, ton=garde), qui contenaient « [...] » :
--   c3-014 Berceuse ...................... Charles Cros
--   c3-020 La troupe du signor Vitalis ... Hector Malot
--   c3-047 La fee Poussiere ............... George Sand
--   c3-053 L'ecolier ..................... Marceline Desbordes-Valmore
--   c3-055 La Belle aux cheveux d'or ..... Marie-Catherine d'Aulnoy
--   c3-075 Ce que disent les hirondelles . Theophile Gautier
--   c3-081 Abeille et les tresors du roi Loc  Anatole France
--
-- TROIS textes « ok » du kit sont REFUSES (un passage dur subsiste dans le texte
-- affiche ; regle Manu : on ne coupe jamais pour cacher un passage dur) :
--   c3-028 Les dons des fees (Belle au Bois dormant) : « morte / mourra / mourir » ;
--   c3-038 Les Musiciens de Breme : « mort / assommer / depouiller de sa peau » ;
--   c3-057 Le Chat botte : « meure / mort » + l'idee de manger le chat.
--
-- 4 questions par texte (N1 info, N2 vocabulaire, N3 inference, N4 reponse libre)
-- = 28 items. Miroir EXACT de comprehension.ts (cle/competence/niveau/format/
-- attendu) ; le SERVEUR reste SEUL JUGE (op 'lire', verif_comprehension). Golden
-- 216 -> 244. ADDITIVE et IDEMPOTENTE. Domaine lecture deja actif ; aucun
-- changement de domaines_actifs. Les exercices FR.LECTURE.* existent deja (0045).

INSERT INTO public.comprehension_item (cle, competence, niveau, format, attendu) VALUES
    ('lec-bib-berceuse-info-n1',  'FR.LECTURE.INFO',      1, 'qcm',   'noir'),
    ('lec-bib-berceuse-sens-n2',  'FR.LECTURE.SENS_MOT',  2, 'qcm',   'éteindre la flamme de la chandelle'),
    ('lec-bib-berceuse-inf-n3',   'FR.LECTURE.INFERENCE', 3, 'qcm',   'la douceur et le sommeil'),
    ('lec-bib-berceuse-texte-n4', 'FR.LECTURE.INFO',      4, 'texte', 'éteignoir'),
    ('lec-bib-vitalis-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'Capi'),
    ('lec-bib-vitalis-sens-n2',   'FR.LECTURE.SENS_MOT',  2, 'qcm',   'pousser de petits aboiements'),
    ('lec-bib-vitalis-inf-n3',    'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce qu''il les traite comme des amis bien élevés'),
    ('lec-bib-vitalis-texte-n4',  'FR.LECTURE.INFO',      4, 'texte', 'montre'),
    ('lec-bib-poussiere-info-n1', 'FR.LECTURE.INFO',      1, 'qcm',   'parce qu''elle est toute grise et poudreuse'),
    ('lec-bib-poussiere-sens-n2', 'FR.LECTURE.SENS_MOT',  2, 'qcm',   'toute petite et mince'),
    ('lec-bib-poussiere-inf-n3',  'FR.LECTURE.INFERENCE', 3, 'qcm',   'en une dame resplendissante dans un palais enchanté'),
    ('lec-bib-poussiere-texte-n4','FR.LECTURE.INFO',      4, 'texte', 'trois'),
    ('lec-bib-ecolier-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'à l''école'),
    ('lec-bib-ecolier-sens-n2',   'FR.LECTURE.SENS_MOT',  2, 'qcm',   'un vent froid'),
    ('lec-bib-ecolier-inf-n3',    'FR.LECTURE.INFERENCE', 3, 'qcm',   'fabriquer son miel'),
    ('lec-bib-ecolier-texte-n4',  'FR.LECTURE.INFO',      4, 'texte', 'quatre'),
    ('lec-bib-belle-info-n1',     'FR.LECTURE.INFO',      1, 'qcm',   'parce que ses cheveux sont plus fins et plus blonds que l''or'),
    ('lec-bib-belle-sens-n2',     'FR.LECTURE.SENS_MOT',  2, 'qcm',   'une personne envoyée par le roi pour parler en son nom'),
    ('lec-bib-belle-inf-n3',      'FR.LECTURE.INFERENCE', 3, 'qcm',   'qu''elle n''a pas envie de se marier'),
    ('lec-bib-belle-texte-n4',    'FR.LECTURE.INFO',      4, 'texte', 'Avenant'),
    ('lec-bib-hirondelles-info-n1','FR.LECTURE.INFO',     1, 'qcm',   'elles se rassemblent pour le départ'),
    ('lec-bib-hirondelles-sens-n2','FR.LECTURE.SENS_MOT', 2, 'qcm',   'bavarder gaiement'),
    ('lec-bib-hirondelles-inf-n3','FR.LECTURE.INFERENCE', 3, 'qcm',   'd''avoir des ailes pour voler avec elles'),
    ('lec-bib-hirondelles-texte-n4','FR.LECTURE.INFO',    4, 'texte', 'printemps'),
    ('lec-bib-abeille-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'un coffre plein de pierres précieuses'),
    ('lec-bib-abeille-sens-n2',   'FR.LECTURE.SENS_MOT',  2, 'qcm',   'une personne qui aime trop l''argent'),
    ('lec-bib-abeille-inf-n3',    'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce qu''elle aime le soleil et son ami plus que les richesses'),
    ('lec-bib-abeille-texte-n4',  'FR.LECTURE.INFO',      4, 'texte', 'soleil')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- Garde-fou : couverture et compte final (miroir du golden comprehension_test.sql
-- et de NB_ITEMS_GOLDEN cote front).
DO $$
DECLARE n integer;
BEGIN
    SELECT count(*) INTO n FROM public.comprehension_item;
    IF n <> 244 THEN
        RAISE EXCEPTION 'comprehension_item : 244 items attendus apres lot 0113, obtenu %', n;
    END IF;
    -- Aucune reponse de reference ne doit porter de marqueur de coupe affiche.
    IF EXISTS (SELECT 1 FROM public.comprehension_item
                WHERE attendu ~ '\[(\.\.\.|…)\]|\((\.\.\.|…)\)') THEN
        RAISE EXCEPTION 'comprehension_item : marqueur de coupe « [...] » / « (…) » interdit a l''affichage';
    END IF;
END $$;

INSERT INTO public.schema_migrations (version)
VALUES ('0113_cm1_bibliotheque_raccourcis')
ON CONFLICT (version) DO NOTHING;
