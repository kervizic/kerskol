-- 0062_bibliotheque_comprehension_complet.sql
-- BIBLIOTHEQUE (domaine public) : COMPLETE « Comprendre un texte » pour CHAQUE
-- texte de la page Bibliotheque qui n'avait pas encore de questions (lot 0060
-- n'en couvrait que 6 textes, 13 questions). On ajoute 137 questions ORIGINALES
-- ecrites pour le CE2 (3 a 4 par texte, reparties N1 info explicite, N2 qui/ou/
-- quand ou sens d'un mot, N3 inference/ordre/pronom, N4 reponse libre), soit
-- ~150 questions bibliotheque au total.
--
-- Migration ADDITIVE et IDEMPOTENTE : elle n'ajoute que des lignes de REFERENCE
-- dans public.comprehension_item (le SERVEUR reste SEUL JUGE), miroir EXACT de
-- frontend/.../francais/comprehension.ts. Aucune donnee utilisateur (Iris,
-- foyers) n'est touchee ; aucun profil n'est modifie (le domaine `lecture` est
-- deja actif pour tous depuis 0045).
--
-- Le test croise supabase/tests/comprehension_test.sql verifie que la table
-- porte EXACTEMENT les memes cles / format / attendu que le front (golden : 192
-- items au total). Les 8 textes ecartes par le garde-fou bienveillance (mot
-- sensible dans le CORPS : Le Loup et le Chien, Le Cygne, Le Chene et le
-- Roseau...) ne sont volontairement PAS integres.

INSERT INTO public.comprehension_item (cle, competence, niveau, format, attendu) VALUES
    -- Anatole France, « La curiosité dans la rue »
    ('lec-bib-curio-info-n1',     'FR.LECTURE.INFO',      1, 'qcm',   'pour aimer'),
    ('lec-bib-curio-sens-n2',     'FR.LECTURE.SENS_MOT',  2, 'qcm',   'respiré pour sentir l''odeur'),
    ('lec-bib-curio-info-n3',     'FR.LECTURE.INFO',      3, 'clic',  'rue'),
    -- Anatole France, « Les images d'Épinal »
    ('lec-bib-epinal-info-n1',    'FR.LECTURE.INFO',      1, 'qcm',   'les images d''Épinal'),
    ('lec-bib-epinal-sens-n2',    'FR.LECTURE.SENS_MOT',  2, 'qcm',   'le petit texte écrit sous une image'),
    ('lec-bib-epinal-inf-n3',     'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce qu''elles faisaient travailler son imagination'),
    -- Charles Cros, « Le Hareng saur »
    ('lec-bib-hareng-info-n1',    'FR.LECTURE.INFO',      1, 'qcm',   'un hareng saur'),
    ('lec-bib-hareng-sens-n2',    'FR.LECTURE.SENS_MOT',  2, 'qcm',   'un poisson séché et fumé'),
    ('lec-bib-hareng-ord-n3',     'FR.LECTURE.ORDRE',     3, 'ordre', 'l''homme monte à l''échelle|il plante le clou dans le mur|il redescend de l''échelle'),
    -- Charles Perrault, « La marraine de Cendrillon »
    ('lec-bib-cendrillon-info-n1','FR.LECTURE.INFO',      1, 'qcm',   'au bal'),
    ('lec-bib-cendrillon-info-n2','FR.LECTURE.INFO',      2, 'qcm',   'sa marraine la fée'),
    ('lec-bib-cendrillon-inf-n3', 'FR.LECTURE.INFERENCE', 3, 'qcm',   'triste'),
    ('lec-bib-cendrillon-info-n4','FR.LECTURE.INFO',      4, 'clic',  'citrouille'),
    -- Colette, « Toby-Chien prend le train »
    ('lec-bib-toby-info-n1',      'FR.LECTURE.INFO',      1, 'qcm',   'vers la vitre'),
    ('lec-bib-toby-sens-n2',      'FR.LECTURE.SENS_MOT',  2, 'qcm',   'très occupé'),
    ('lec-bib-toby-inf-n3',       'FR.LECTURE.INFERENCE', 3, 'qcm',   'un train'),
    ('lec-bib-toby-inf-n4',       'FR.LECTURE.INFERENCE', 4, 'clic',  'bientôt'),
    -- Colette, « Le nourrisson de Musette »
    ('lec-bib-musette-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'un petit chien'),
    ('lec-bib-musette-sens-n2',   'FR.LECTURE.SENS_MOT',  2, 'qcm',   'un tout petit qu''on nourrit encore de lait'),
    ('lec-bib-musette-inf-n3',    'FR.LECTURE.INFERENCE', 3, 'qcm',   'à un petit gendarme'),
    ('lec-bib-musette-info-n4',   'FR.LECTURE.INFO',      4, 'clic',  'dix'),
    -- Colette, « Le premier feu »
    ('lec-bib-feu-info-n1',       'FR.LECTURE.INFO',      1, 'qcm',   'le premier feu de la saison'),
    ('lec-bib-feu-sens-n2',       'FR.LECTURE.SENS_MOT',  2, 'qcm',   'regarder longtemps avec plaisir'),
    ('lec-bib-feu-inf-n3',        'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce qu''ils aiment sa chaleur et sa lumière'),
    -- George Sand, « La famille de Gribouille »
    ('lec-bib-gribouille-info-n1','FR.LECTURE.INFO',      1, 'qcm',   'Gribouille'),
    ('lec-bib-gribouille-info-n2','FR.LECTURE.INFO',      2, 'qcm',   'sept'),
    ('lec-bib-gribouille-sens-n3','FR.LECTURE.SENS_MOT',  3, 'qcm',   'celui qui surveille une forêt et ses animaux'),
    ('lec-bib-gribouille-info-n4','FR.LECTURE.INFO',      4, 'clic',  'ruisseau'),
    -- George Sand, « Ce que disent les fleurs »
    ('lec-bib-fleurs-info-n1',    'FR.LECTURE.INFO',      1, 'qcm',   'ce que les fleurs se disaient'),
    ('lec-bib-fleurs-sens-n2',    'FR.LECTURE.SENS_MOT',  2, 'qcm',   'parler tout bas, bavarder gentiment'),
    ('lec-bib-fleurs-inf-n3',     'FR.LECTURE.INFERENCE', 3, 'qcm',   'pour que les fleurs ne l''entendent pas'),
    -- George Sand, « La petite Bichette »
    ('lec-bib-bichette-info-n1',  'FR.LECTURE.INFO',      1, 'qcm',   'trois'),
    ('lec-bib-bichette-info-n2',  'FR.LECTURE.INFO',      2, 'qcm',   'Bichette'),
    ('lec-bib-bichette-inf-n3',   'FR.LECTURE.INFERENCE', 3, 'qcm',   'beaucoup de tendresse'),
    ('lec-bib-bichette-info-n4',  'FR.LECTURE.INFO',      4, 'clic',  'lapin'),
    -- George Sand, « Clopinet rêve de la mer »
    ('lec-bib-clopinet-info-n1',  'FR.LECTURE.INFO',      1, 'qcm',   'marin'),
    ('lec-bib-clopinet-sens-n2',  'FR.LECTURE.SENS_MOT',  2, 'qcm',   'un pré où pousse l''herbe'),
    ('lec-bib-clopinet-inf-n3',   'FR.LECTURE.INFERENCE', 3, 'qcm',   'il habite loin de la mer mais veut être marin'),
    ('lec-bib-clopinet-info-n4',  'FR.LECTURE.INFO',      4, 'texte', 'pomme'),
    -- Hans Christian Andersen, « Que la campagne était belle ! »
    ('lec-bib-campagne-info-n1',  'FR.LECTURE.INFO',      1, 'qcm',   'l''été'),
    ('lec-bib-campagne-sens-n2',  'FR.LECTURE.SENS_MOT',  2, 'qcm',   'un gros tas'),
    ('lec-bib-campagne-inf-n3',   'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce que les feuilles étaient très hautes'),
    ('lec-bib-campagne-info-n4',  'FR.LECTURE.INFO',      4, 'clic',  'cigogne'),
    -- Hans Christian Andersen, « Le grain d'orge magique »
    ('lec-bib-orge-info-n1',      'FR.LECTURE.INFO',      1, 'qcm',   'avoir un petit enfant'),
    ('lec-bib-orge-info-n2',      'FR.LECTURE.INFO',      2, 'qcm',   'une vieille sorcière'),
    ('lec-bib-orge-inf-n3',       'FR.LECTURE.INFERENCE', 3, 'qcm',   'le planter dans un pot'),
    ('lec-bib-orge-ord-n4',       'FR.LECTURE.ORDRE',     4, 'ordre', 'la femme va voir la sorcière|la sorcière donne un grain d''orge|la femme plante le grain'),
    -- Jean de La Fontaine, « Le Rat de ville et le Rat des champs »
    ('lec-bib-rats-info-n1',      'FR.LECTURE.INFO',      1, 'qcm',   'le rat des champs'),
    ('lec-bib-rats-sens-n2',      'FR.LECTURE.SENS_MOT',  2, 'qcm',   'un très bon repas de fête'),
    ('lec-bib-rats-inf-n3',       'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce qu''ils entendent du bruit'),
    -- Jean de La Fontaine, « Le Lion et le Rat »
    ('lec-bib-lion-info-n1',      'FR.LECTURE.INFO',      1, 'qcm',   'le lion'),
    ('lec-bib-lion-sens-n2',      'FR.LECTURE.SENS_MOT',  2, 'qcm',   'un filet pour attraper les animaux'),
    ('lec-bib-lion-inf-n3',       'FR.LECTURE.INFERENCE', 3, 'qcm',   'il ronge le filet avec ses dents'),
    ('lec-bib-lion-info-n4',      'FR.LECTURE.INFO',      4, 'clic',  'rat'),
    -- Jean de La Fontaine, « Le Renard et la Cigogne »
    ('lec-bib-cigogne-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'la cigogne'),
    ('lec-bib-cigogne-sens-n2',   'FR.LECTURE.SENS_MOT',  2, 'qcm',   'une soupe claire, sans grand-chose dedans'),
    ('lec-bib-cigogne-inf-n3',    'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce que son long bec n''y arrive pas'),
    ('lec-bib-cigogne-info-n4',   'FR.LECTURE.INFO',      4, 'clic',  'vase'),
    -- Jean de La Fontaine, « Le Héron »
    ('lec-bib-heron-info-n1',     'FR.LECTURE.INFO',      1, 'qcm',   'le long d''une rivière'),
    ('lec-bib-heron-sens-n2',     'FR.LECTURE.SENS_MOT',  2, 'qcm',   'qui fait le difficile'),
    ('lec-bib-heron-inf-n3',      'FR.LECTURE.INFERENCE', 3, 'qcm',   'un petit escargot'),
    -- Jean de La Fontaine, « Le Coche et la Mouche »
    ('lec-bib-coche-info-n1',     'FR.LECTURE.INFO',      1, 'qcm',   'six'),
    ('lec-bib-coche-sens-n2',     'FR.LECTURE.SENS_MOT',  2, 'qcm',   'une grande voiture tirée par des chevaux'),
    ('lec-bib-coche-inf-n3',      'FR.LECTURE.INFERENCE', 3, 'qcm',   'non, ce sont les chevaux qui ont tout fait'),
    -- Jean de La Fontaine, « Le Gland et la Citrouille »
    ('lec-bib-gland-info-n1',     'FR.LECTURE.INFO',      1, 'qcm',   'la citrouille'),
    ('lec-bib-gland-sens-n2',     'FR.LECTURE.SENS_MOT',  2, 'qcm',   'toute fine'),
    ('lec-bib-gland-inf-n3',      'FR.LECTURE.INFERENCE', 3, 'qcm',   'un petit gland lui tombe dessus, pas une grosse citrouille'),
    -- Jean-Pierre Claris de Florian, « Le Grillon »
    ('lec-bib-grillon-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'un papillon'),
    ('lec-bib-grillon-sens-n2',   'FR.LECTURE.SENS_MOT',  2, 'qcm',   'voler légèrement de-ci de-là'),
    ('lec-bib-grillon-inf-n3',    'FR.LECTURE.INFERENCE', 3, 'qcm',   'qu''il est bien d''être tranquille et caché'),
    -- Jean-Pierre Claris de Florian, « Le Chat et le Miroir »
    ('lec-bib-miroir-info-n1',    'FR.LECTURE.INFO',      1, 'qcm',   'un miroir'),
    ('lec-bib-miroir-inf-n2',     'FR.LECTURE.INFERENCE', 2, 'qcm',   'un autre chat, comme un frère'),
    ('lec-bib-miroir-inf-n3',     'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce qu''il n''arrive pas à attraper le chat qu''il voit'),
    ('lec-bib-miroir-info-n4',    'FR.LECTURE.INFO',      4, 'clic',  'souris'),
    -- Jules Renard, « Le Ver luisant »
    ('lec-bib-verluisant-info-n1','FR.LECTURE.INFO',      1, 'qcm',   'le soir'),
    ('lec-bib-verluisant-sens-n2','FR.LECTURE.SENS_MOT',  2, 'qcm',   'qui brille'),
    ('lec-bib-verluisant-inf-n3', 'FR.LECTURE.INFERENCE', 3, 'qcm',   'à une goutte de lune'),
    -- Jules Renard, « Les Fourmis »
    ('lec-bib-fourmis-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'au chiffre 3'),
    ('lec-bib-fourmis-sens-n2',   'FR.LECTURE.SENS_MOT',  2, 'qcm',   'un tout petit insecte qui vit en groupe'),
    ('lec-bib-fourmis-inf-n3',    'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce qu''il y a énormément de fourmis'),
    -- Jules Renard, « Le Hérisson »
    ('lec-bib-herisson-info-n1',  'FR.LECTURE.INFO',      1, 'qcm',   'de ne pas trop le serrer'),
    ('lec-bib-herisson-sens-n2',  'FR.LECTURE.SENS_MOT',  2, 'qcm',   'tenir fort en appuyant'),
    ('lec-bib-herisson-inf-n3',   'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce qu''il est couvert de piquants'),
    -- Jules Renard, « Le Serpent »
    ('lec-bib-serpent-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'trop long'),
    ('lec-bib-serpent-sens-n2',   'FR.LECTURE.SENS_MOT',  2, 'qcm',   'un animal long et sans pattes'),
    -- Jules Renard, « Le Lézard »
    ('lec-bib-lezard-info-n1',    'FR.LECTURE.INFO',      1, 'qcm',   'sur l''épaule de l''homme'),
    ('lec-bib-lezard-sens-n2',    'FR.LECTURE.SENS_MOT',  2, 'qcm',   'qui ne bouge pas du tout'),
    ('lec-bib-lezard-inf-n3',     'FR.LECTURE.INFERENCE', 3, 'qcm',   'il ne bouge pas et son manteau a la couleur du mur'),
    -- Jules Renard, « Le Paon »
    ('lec-bib-paon-info-n1',      'FR.LECTURE.INFO',      1, 'qcm',   'se marier'),
    ('lec-bib-paon-sens-n2',      'FR.LECTURE.SENS_MOT',  2, 'qcm',   'le bouquet de plumes sur sa tête'),
    ('lec-bib-paon-inf-n3',       'FR.LECTURE.INFERENCE', 3, 'qcm',   'il appelle sa fiancée'),
    ('lec-bib-paon-info-n4',      'FR.LECTURE.INFO',      4, 'texte', 'demain'),
    -- Jules Renard, « Les Pigeons »
    ('lec-bib-pigeons-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'ils l''ennuient'),
    ('lec-bib-pigeons-sens-n2',   'FR.LECTURE.SENS_MOT',  2, 'qcm',   'un peu sot, naïf'),
    ('lec-bib-pigeons-inf-n3',    'FR.LECTURE.INFERENCE', 3, 'qcm',   'rester tranquilles en place'),
    -- Jules Renard, « Le Cheval »
    ('lec-bib-cheval-info-n1',    'FR.LECTURE.INFO',      1, 'qcm',   'à une cerise'),
    ('lec-bib-cheval-sens-n2',    'FR.LECTURE.SENS_MOT',  2, 'qcm',   'les longs poils sur le cou du cheval'),
    ('lec-bib-cheval-inf-n3',     'FR.LECTURE.INFERENCE', 3, 'qcm',   'avec beaucoup de soin et de douceur'),
    -- Jules Renard, « L'Âne »
    ('lec-bib-ane-info-n1',       'FR.LECTURE.INFO',      1, 'qcm',   'le facteur Jacquot'),
    ('lec-bib-ane-sens-n2',       'FR.LECTURE.SENS_MOT',  2, 'qcm',   'le trajet qu''on fait pour distribuer'),
    ('lec-bib-ane-inf-n3',        'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce qu''il sent un chardon qu''il aime'),
    -- Jules Renard, « Les Moutons »
    ('lec-bib-moutons-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'ils mangeaient l''herbe'),
    ('lec-bib-moutons-sens-n2',   'FR.LECTURE.SENS_MOT',  2, 'qcm',   'tranquille, qui ne se presse pas'),
    ('lec-bib-moutons-inf-n3',    'FR.LECTURE.INFERENCE', 3, 'qcm',   'à des nuages'),
    -- Jules Renard, « Les Grenouilles »
    ('lec-bib-grenouilles-info-n1','FR.LECTURE.INFO',     1, 'qcm',   'sur les feuilles du nénuphar'),
    ('lec-bib-grenouilles-sens-n2','FR.LECTURE.SENS_MOT', 2, 'qcm',   'la boue molle au fond de l''eau'),
    ('lec-bib-grenouilles-inf-n3','FR.LECTURE.INFERENCE', 3, 'qcm',   'une ligne pour pêcher'),
    -- La Comtesse de Ségur, « La boîte à mouches »
    ('lec-bib-mouches-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'à attraper des mouches'),
    ('lec-bib-mouches-info-n2',   'FR.LECTURE.INFO',      2, 'qcm',   'dans une petite boîte en papier'),
    ('lec-bib-mouches-inf-n3',    'FR.LECTURE.INFERENCE', 3, 'qcm',   'pour que les mouches ne s''envolent pas toutes'),
    -- La Comtesse de Ségur, « Camille et Madeleine »
    ('lec-bib-camille-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'huit ans'),
    ('lec-bib-camille-info-n2',   'FR.LECTURE.INFO',      2, 'qcm',   'deux'),
    ('lec-bib-camille-inf-n3',    'FR.LECTURE.INFERENCE', 3, 'qcm',   'très bien, elles ne se disputent jamais'),
    ('lec-bib-camille-sens-n4',   'FR.LECTURE.SENS_MOT',  4, 'clic',  'attachement'),
    -- La Comtesse de Ségur, « La ronde de joie »
    ('lec-bib-ronde-info-n1',     'FR.LECTURE.INFO',      1, 'qcm',   'elles dansent une ronde'),
    ('lec-bib-ronde-sens-n2',     'FR.LECTURE.SENS_MOT',  2, 'qcm',   'un grand bruit joyeux'),
    ('lec-bib-ronde-inf-n3',      'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce qu''elles sont fatiguées d''avoir tant dansé'),
    -- La Comtesse de Ségur, « Le goûter à la ferme »
    ('lec-bib-gouter-info-n1',    'FR.LECTURE.INFO',      1, 'qcm',   'du lait chaud et du pain'),
    ('lec-bib-gouter-sens-n2',    'FR.LECTURE.SENS_MOT',  2, 'qcm',   'tirer le lait des vaches'),
    ('lec-bib-gouter-inf-n3',     'FR.LECTURE.INFERENCE', 3, 'qcm',   'très bon, ils se régalent'),
    -- La Comtesse de Ségur, « Cadichon et le petit Jacques »
    ('lec-bib-cadichon-info-n1',  'FR.LECTURE.INFO',      1, 'qcm',   'Cadichon'),
    ('lec-bib-cadichon-sens-n2',  'FR.LECTURE.SENS_MOT',  2, 'qcm',   'à voix très douce, en chuchotant'),
    ('lec-bib-cadichon-inf-n3',   'FR.LECTURE.INFERENCE', 3, 'qcm',   'parce que Jacques est doux et gentil avec lui'),
    ('lec-bib-cadichon-info-n4',  'FR.LECTURE.INFO',      4, 'clic',  'bonheur'),
    -- La Comtesse de Ségur, « La promenade au moulin »
    ('lec-bib-moulin-info-n1',    'FR.LECTURE.INFO',      1, 'qcm',   'au moulin, par les bois'),
    ('lec-bib-moulin-sens-n2',    'FR.LECTURE.SENS_MOT',  2, 'qcm',   'rendait moins forte'),
    ('lec-bib-moulin-inf-n3',     'FR.LECTURE.INFERENCE', 3, 'qcm',   'très agréable, pleine de petits plaisirs'),
    -- Marceline Desbordes-Valmore, « Les Roses de Saadi »
    ('lec-bib-roses-info-n1',     'FR.LECTURE.INFO',      1, 'qcm',   'des roses'),
    ('lec-bib-roses-sens-n2',     'FR.LECTURE.SENS_MOT',  2, 'qcm',   'remplie d''un bon parfum'),
    ('lec-bib-roses-inf-n3',      'FR.LECTURE.INFERENCE', 3, 'qcm',   'il y en avait trop et les nœuds ont lâché'),
    -- Marie-Catherine d'Aulnoy, « La princesse Florine »
    ('lec-bib-florine-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'Florine'),
    ('lec-bib-florine-info-n2',   'FR.LECTURE.INFO',      2, 'qcm',   'quinze ans'),
    ('lec-bib-florine-sens-n3',   'FR.LECTURE.SENS_MOT',  3, 'qcm',   'des pierres précieuses, comme les diamants'),
    ('lec-bib-florine-info-n4',   'FR.LECTURE.INFO',      4, 'clic',  'fleurs'),
    -- Théophile Gautier, « Noël »
    ('lec-bib-noel-info-n1',      'FR.LECTURE.INFO',      1, 'qcm',   'blanche'),
    ('lec-bib-noel-sens-n2',      'FR.LECTURE.SENS_MOT',  2, 'qcm',   'faire sonner joyeusement les cloches'),
    ('lec-bib-noel-inf-n3',       'FR.LECTURE.INFERENCE', 3, 'qcm',   'pour le réchauffer')
ON CONFLICT (cle) DO UPDATE SET
    competence = EXCLUDED.competence,
    niveau     = EXCLUDED.niveau,
    format     = EXCLUDED.format,
    attendu    = EXCLUDED.attendu;

-- Enregistrement de la migration (etait ABSENT : la migration se reappliquait a
-- chaque deploiement car deploy.sh ne la trouvait jamais dans schema_migrations ;
-- lot 11, nettoyage sans risque -- cette migration est purement idempotente).
INSERT INTO public.schema_migrations (version)
VALUES ('0062_bibliotheque_comprehension_complet')
ON CONFLICT (version) DO NOTHING;
