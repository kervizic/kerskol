-- 0035_francais_dictee_accents.sql
-- CORRECTION des accents/cedilles des 60 nouveaux textes (ids 101..160) de la
-- dictee detective (0033). Les textes avaient ete ecrits sans accents (ecole,
-- journee, foret, apres, pecheur, ile, vegetal...) : inacceptable pour une app
-- d'orthographe. On RE-INSERE les 60 textes avec les accents corrects, en
-- gardant EXACTEMENT les memes id/niveau/notion/theme et les memes fautes
-- plantees (les homophones fautifs restent sans accent ; les autres fautes
-- portent leurs accents de radical : « vegetal » -> « végétal », cor « végétaux »).
--
-- Invariant verifie hors-ligne : une fois les accents retires, les textes sont
-- IDENTIQUES a ceux de 0033 (aucun mot ajoute/retire/deplace). Les positions des
-- erreurs sont recalculees par le helper (exception si un mot ne s'aligne plus).
--
-- Migration ADDITIVE et idempotente : aucune donnee utilisateur modifiee ; aucun
-- changement de schema. La table dictee_erreur reste sans droit de lecture API.

-- Helper de seed (recree ici ; droppe en fin de migration). Identique a 0033.
CREATE OR REPLACE FUNCTION public._dictee_add(
    p_id integer, p_niveau integer, p_notion text,
    p_theme text, p_texte text, p_erreurs jsonb)
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    toks text[];
    e    jsonb;
    v_mot text; v_occ integer; v_cor text; v_type text;
    i integer; seen integer; pos integer;
BEGIN
    INSERT INTO public.dictee_texte (id, niveau, notion, theme, texte)
    VALUES (p_id, p_niveau, p_notion, p_theme, p_texte)
    ON CONFLICT (id) DO UPDATE SET niveau = EXCLUDED.niveau,
        notion = EXCLUDED.notion, theme = EXCLUDED.theme, texte = EXCLUDED.texte;
    DELETE FROM public.dictee_erreur WHERE texte_id = p_id;

    toks := regexp_split_to_array(btrim(p_texte), '\s+');
    FOR e IN SELECT * FROM jsonb_array_elements(p_erreurs) LOOP
        v_mot  := public.normaliser_mot(e->>'mot');
        v_occ  := COALESCE((e->>'occ')::integer, 1);
        v_cor  := e->>'cor';
        v_type := e->>'type';
        seen := 0; pos := NULL;
        FOR i IN 1 .. array_length(toks, 1) LOOP
            IF public.normaliser_mot(toks[i]) = v_mot THEN
                seen := seen + 1;
                IF seen = v_occ THEN pos := i; EXIT; END IF;
            END IF;
        END LOOP;
        IF pos IS NULL THEN
            RAISE EXCEPTION 'dictee % : mot « % » occ % introuvable dans « % »',
                p_id, e->>'mot', v_occ, p_texte;
        END IF;
        IF public.normaliser_mot(v_cor) = public.normaliser_mot(toks[pos]) THEN
            RAISE EXCEPTION 'dictee % : correction identique a la faute (« % ») position %',
                p_id, v_cor, pos;
        END IF;
        INSERT INTO public.dictee_erreur (texte_id, position, faute, correction, type)
        VALUES (p_id, pos, toks[pos], v_cor, v_type);
    END LOOP;
END $$;

-- =========================================================================
-- Textes 101..160 ré-insérés avec les accents corrects.
-- =========================================================================
-- >>> SEED START
-- PARTIE B : 60 nouveaux textes ORIGINAUX (ids 101..160), >= 2 par notion.

-- =========================================================================
-- PARTIE A -- Rattachement des 40 textes existants
-- =========================================================================
UPDATE public.dictee_texte SET notion = 'son_sont'       WHERE id = 1;
UPDATE public.dictee_texte SET notion = 'ces_ses'        WHERE id = 2;
UPDATE public.dictee_texte SET notion = 'pluriel'        WHERE id = 3;
UPDATE public.dictee_texte SET notion = 'et_est'         WHERE id = 4;
UPDATE public.dictee_texte SET notion = 'on_ont'         WHERE id = 5;
UPDATE public.dictee_texte SET notion = 'pluriel'        WHERE id = 6;
UPDATE public.dictee_texte SET notion = 'a_a'            WHERE id = 7;
UPDATE public.dictee_texte SET notion = 'son_sont'       WHERE id = 8;
UPDATE public.dictee_texte SET notion = 'pluriel'        WHERE id = 9;
UPDATE public.dictee_texte SET notion = 'pluriel'        WHERE id = 10;

UPDATE public.dictee_texte SET notion = 'ces_ses'        WHERE id = 11;
UPDATE public.dictee_texte SET notion = 'ces_ses'        WHERE id = 12;
UPDATE public.dictee_texte SET notion = 'on_ont'         WHERE id = 13;
UPDATE public.dictee_texte SET notion = 'ce_se'          WHERE id = 14;
UPDATE public.dictee_texte SET notion = 'ces_ses'        WHERE id = 15;
UPDATE public.dictee_texte SET notion = 'verbe_ent'      WHERE id = 16;
UPDATE public.dictee_texte SET notion = 'verbe_ent'      WHERE id = 17;
UPDATE public.dictee_texte SET notion = 'verbe_ent'      WHERE id = 18;
UPDATE public.dictee_texte SET notion = 'verbe_ent'      WHERE id = 19;
UPDATE public.dictee_texte SET notion = 'verbe_ent'      WHERE id = 20;

UPDATE public.dictee_texte SET notion = 'accord'         WHERE id = 21;
UPDATE public.dictee_texte SET notion = 'pluriel'        WHERE id = 22;
UPDATE public.dictee_texte SET notion = 'e_er_ez'        WHERE id = 23;
UPDATE public.dictee_texte SET notion = 'm_mbp'          WHERE id = 24;
UPDATE public.dictee_texte SET notion = 'pluriel'        WHERE id = 25;
UPDATE public.dictee_texte SET notion = 'pluriel'        WHERE id = 26;
UPDATE public.dictee_texte SET notion = 'accord'         WHERE id = 27;
UPDATE public.dictee_texte SET notion = 'pluriel'        WHERE id = 28;
UPDATE public.dictee_texte SET notion = 'pluriel'        WHERE id = 29;
UPDATE public.dictee_texte SET notion = 'accord'         WHERE id = 30;

UPDATE public.dictee_texte SET notion = 'ce_se'          WHERE id = 31;
UPDATE public.dictee_texte SET notion = 'a_a'            WHERE id = 32;
UPDATE public.dictee_texte SET notion = 'accord'         WHERE id = 33;
UPDATE public.dictee_texte SET notion = 'son_sont'       WHERE id = 34;
UPDATE public.dictee_texte SET notion = 'accord'         WHERE id = 35;
UPDATE public.dictee_texte SET notion = 'pluriel'        WHERE id = 36;
UPDATE public.dictee_texte SET notion = 'm_mbp'          WHERE id = 37;
UPDATE public.dictee_texte SET notion = 'accord'         WHERE id = 38;
UPDATE public.dictee_texte SET notion = 'ces_ses'        WHERE id = 39;
UPDATE public.dictee_texte SET notion = 'et_est'         WHERE id = 40;

-- =========================================================================
-- PARTIE B -- Nouveaux textes (par notion, ordre de présentation)
-- =========================================================================

-- Bloc 1 - pluriel
SELECT public._dictee_add(101, 1, 'pluriel', 'animaux',
  'Dans la ferme, les poule picorent le grain. Le chien garde les mouton toute la journée.',
  '[{"mot":"poule","cor":"poules","type":"pluriel"},{"mot":"mouton","cor":"moutons","type":"pluriel"}]'::jsonb);
SELECT public._dictee_add(102, 1, 'pluriel', 'ecole',
  'À l''école, les enfant rangent leur cartable. La maîtresse distribue des cahier neufs.',
  '[{"mot":"enfant","cor":"enfants","type":"pluriel"},{"mot":"cahier","cor":"cahiers","type":"pluriel"}]'::jsonb);

-- Bloc 2 - son_sont
SELECT public._dictee_add(103, 1, 'son_sont', 'maison',
  'Le soir, toute la famille range la cuisine. Les assiettes son propres après le repas.',
  '[{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);
SELECT public._dictee_add(104, 1, 'son_sont', 'nature',
  'Dans la forêt, les feuilles tombent doucement. Elles son jaunes et rouges. Les oiseaux son partis vers le sud.',
  '[{"mot":"son","occ":1,"cor":"sont","type":"son_sont"},{"mot":"son","occ":2,"cor":"sont","type":"son_sont"}]'::jsonb);

-- Bloc 3 - a_a
SELECT public._dictee_add(105, 1, 'a_a', 'sport',
  'Chaque mercredi, nous allons a la piscine avec la classe. Après l''entraînement, le groupe retourne a l''école.',
  '[{"mot":"a","occ":1,"cor":"à","type":"a_a"},{"mot":"a","occ":2,"cor":"à","type":"a_a"}]'::jsonb);
SELECT public._dictee_add(106, 1, 'a_a', 'village_breton',
  'Au port, le pêcheur donne du pain a son chien. Il pense a la mer avant de partir en bateau.',
  '[{"mot":"a","occ":1,"cor":"à","type":"a_a"},{"mot":"a","occ":2,"cor":"à","type":"a_a"}]'::jsonb);

-- Bloc 4 - et_est
SELECT public._dictee_add(107, 1, 'et_est', 'ile_tropicale',
  'Sur l''île, le soleil et chaud toute la journée. Le sable et fin sous les pieds. Les enfants nagent dans la mer bleue.',
  '[{"mot":"et","occ":1,"cor":"est","type":"et_est"},{"mot":"et","occ":2,"cor":"est","type":"et_est"}]'::jsonb);
SELECT public._dictee_add(108, 1, 'et_est', 'base_spatiale',
  'Dans la fusée, l''astronaute et calme avant le décollage. La mission et importante pour toute l''équipe.',
  '[{"mot":"et","occ":1,"cor":"est","type":"et_est"},{"mot":"et","occ":2,"cor":"est","type":"et_est"}]'::jsonb);

-- Bloc 5 - m_mbp
SELECT public._dictee_add(109, 2, 'm_mbp', 'royaume_enchante',
  'Dans le château, le roi bat le tanbour pour annoncer la fête. Toute la cour trouve ce moment très inportant.',
  '[{"mot":"tanbour","cor":"tambour","type":"m_mbp"},{"mot":"inportant","cor":"important","type":"m_mbp"}]'::jsonb);
SELECT public._dictee_add(110, 2, 'm_mbp', 'vallee_dinosaures',
  'Le petit dinosaure traverse la plaine en courant. Il veut conbler son ventre vide avant la nuit. Ses pas laissent une enpreinte énorme dans la terre molle.',
  '[{"mot":"conbler","cor":"combler","type":"m_mbp"},{"mot":"enpreinte","cor":"empreinte","type":"m_mbp"}]'::jsonb);

-- Bloc 6 - ces_ses
SELECT public._dictee_add(111, 2, 'ces_ses', 'village_gourmand',
  'Le pâtissier sort ces gâteaux tout chauds du four. Il pose ces mains pleines de farine sur le comptoir avant de servir les clients.',
  '[{"mot":"ces","occ":1,"cor":"ses","type":"ces_ses"},{"mot":"ces","occ":2,"cor":"ses","type":"ces_ses"}]'::jsonb);
SELECT public._dictee_add(112, 2, 'ces_ses', 'animaux',
  'Le renard cache ces provisions sous les feuilles avant l''hiver. Il surveille ces petits avec attention pendant qu''ils jouent.',
  '[{"mot":"ces","occ":1,"cor":"ses","type":"ces_ses"},{"mot":"ces","occ":2,"cor":"ses","type":"ces_ses"}]'::jsonb);

-- Bloc 7 - on_ont
SELECT public._dictee_add(113, 2, 'on_ont', 'ecole',
  'Pendant la récréation, les élèves on organise un grand jeu de ballon. Ils on couru dans toute la cour en riant.',
  '[{"mot":"on","occ":1,"cor":"ont","type":"on_ont"},{"mot":"on","occ":2,"cor":"ont","type":"on_ont"}]'::jsonb);
SELECT public._dictee_add(114, 2, 'on_ont', 'maison',
  'Les enfants on range leurs jouets. Après le repas, ils on aide maman à débarrasser la table. Ensuite, on allume la télévision ensemble.',
  '[{"mot":"on","occ":1,"cor":"ont","type":"on_ont"},{"mot":"on","occ":2,"cor":"ont","type":"on_ont"}]'::jsonb);

-- Bloc 8 - verbe_ent
SELECT public._dictee_add(115, 2, 'verbe_ent', 'nature',
  'Au printemps, les fleurs pousse dans le jardin. Les papillons vole autour des roses colorées.',
  '[{"mot":"pousse","cor":"poussent","type":"verbe_ent"},{"mot":"vole","cor":"volent","type":"verbe_ent"}]'::jsonb);
SELECT public._dictee_add(116, 2, 'verbe_ent', 'sport',
  'Sur le terrain, les joueurs court vers le ballon. Les supporters chante une chanson joyeuse dans les tribunes.',
  '[{"mot":"court","cor":"courent","type":"verbe_ent"},{"mot":"chante","cor":"chantent","type":"verbe_ent"}]'::jsonb);

-- Bloc 9 - ce_se
SELECT public._dictee_add(117, 2, 'ce_se', 'village_breton',
  'Le pêcheur ce prépare avant de partir en mer. Il ce lève tôt chaque matin pour attraper les poissons.',
  '[{"mot":"ce","occ":1,"cor":"se","type":"ce_se"},{"mot":"ce","occ":2,"cor":"se","type":"ce_se"}]'::jsonb);
SELECT public._dictee_add(118, 2, 'ce_se', 'ile_tropicale',
  'Le crabe ce cache sous le sable chaud. Les enfants ce baignent dans une eau turquoise et claire.',
  '[{"mot":"ce","occ":1,"cor":"se","type":"ce_se"},{"mot":"ce","occ":2,"cor":"se","type":"ce_se"}]'::jsonb);

-- Bloc 10 - accord
SELECT public._dictee_add(119, 2, 'accord', 'base_spatiale',
  'Dans la station, les astronautes portent une combinaison blanc. Ils installent des antennes puissant sur le toit.',
  '[{"mot":"blanc","cor":"blanche","type":"accord"},{"mot":"puissant","cor":"puissantes","type":"accord"}]'::jsonb);
SELECT public._dictee_add(120, 2, 'accord', 'royaume_enchante',
  'Dans le château, la reine porte une robe doré. Les chevaliers portent des armures brillant au soleil.',
  '[{"mot":"doré","cor":"dorée","type":"accord"},{"mot":"brillant","cor":"brillantes","type":"accord"}]'::jsonb);

-- Bloc 11 - pluriel_al_aux
SELECT public._dictee_add(121, 3, 'pluriel_al_aux', 'vallee_dinosaures',
  'Dans la vallée, les animal géants se déplacent lentement entre les rochers. Ils mangent des végétal verts toute la journée.',
  '[{"mot":"animal","cor":"animaux","type":"pluriel_al_aux"},{"mot":"végétal","cor":"végétaux","type":"pluriel_al_aux"}]'::jsonb);
SELECT public._dictee_add(122, 3, 'pluriel_al_aux', 'village_gourmand',
  'Au marché, le boulanger range ses journal du matin près de la caisse. Dans la vitrine, des bocal de confiture brillent au soleil.',
  '[{"mot":"journal","cor":"journaux","type":"pluriel_al_aux"},{"mot":"bocal","cor":"bocaux","type":"pluriel_al_aux"}]'::jsonb);

-- Bloc 12 - e_er_ez
SELECT public._dictee_add(123, 3, 'e_er_ez', 'animaux',
  'Le matin, le fermier part travaille aux champs après avoir nourri les poules. Le soir, il faut encore donne à manger aux lapins avant la nuit.',
  '[{"mot":"travaille","cor":"travailler","type":"e_er_ez"},{"mot":"donne","cor":"donner","type":"e_er_ez"}]'::jsonb);
SELECT public._dictee_add(124, 3, 'e_er_ez', 'ecole',
  'À la fin du cours, la maîtresse demande de ranger les cahiers et d''écouter la consigne pour avance dans l''exercice. Les élèves doivent chanter puis récite un poème devant la classe.',
  '[{"mot":"avance","cor":"avancer","type":"e_er_ez"},{"mot":"récite","cor":"réciter","type":"e_er_ez"}]'::jsonb);

-- Bloc 13 - a_a (révision et_est)
SELECT public._dictee_add(125, 3, 'a_a', 'maison',
  'Le matin, papa prépare le petit-déjeuner et maman part a son travail. La maison et calme avant le réveil des enfants.',
  '[{"mot":"a","occ":1,"cor":"à","type":"a_a"},{"mot":"et","occ":2,"cor":"est","type":"et_est"}]'::jsonb);
SELECT public._dictee_add(126, 3, 'a_a', 'nature',
  'Au bord de la rivière, le héron reste immobile et attend a côté des roseaux. L''eau et fraîche sous les nénuphars.',
  '[{"mot":"a","occ":1,"cor":"à","type":"a_a"},{"mot":"et","occ":2,"cor":"est","type":"et_est"}]'::jsonb);

-- Bloc 14 - son_sont (révision ces_ses)
SELECT public._dictee_add(127, 3, 'son_sont', 'sport',
  'Après l''entraînement, le coach range ces ballons dans le local. Les joueurs son fatigués mais contents de leur match.',
  '[{"mot":"ces","cor":"ses","type":"ces_ses"},{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);
SELECT public._dictee_add(128, 3, 'son_sont', 'village_breton',
  'Le marin range ces filets avant la tempête. Les vagues son hautes et le vent souffle fort sur le port.',
  '[{"mot":"ces","cor":"ses","type":"ces_ses"},{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);

-- Bloc 15 - verbe_ent
SELECT public._dictee_add(129, 3, 'verbe_ent', 'ile_tropicale',
  'Sur la plage, les enfants construise des châteaux de sable avant la marée. Les vagues arrive doucement et efface leurs traces.',
  '[{"mot":"construise","cor":"construisent","type":"verbe_ent"},{"mot":"arrive","cor":"arrivent","type":"verbe_ent"},{"mot":"efface","cor":"effacent","type":"verbe_ent"}]'::jsonb);
SELECT public._dictee_add(130, 3, 'verbe_ent', 'base_spatiale',
  'Dans la station, les écrans affiche plein de données. Les robots avance lentement et répare les panneaux solaires.',
  '[{"mot":"affiche","cor":"affichent","type":"verbe_ent"},{"mot":"avance","cor":"avancent","type":"verbe_ent"},{"mot":"répare","cor":"réparent","type":"verbe_ent"}]'::jsonb);

-- Bloc 16 - accord
SELECT public._dictee_add(131, 3, 'accord', 'royaume_enchante',
  'Dans le royaume, les tours sont hautes et les jardins sont immense. Une licorne blanc traverse la forêt enchantée. Les fleurs sont parfumé partout.',
  '[{"mot":"immense","cor":"immenses","type":"accord"},{"mot":"blanc","cor":"blanche","type":"accord"},{"mot":"parfumé","cor":"parfumées","type":"accord"}]'::jsonb);
SELECT public._dictee_add(132, 3, 'accord', 'vallee_dinosaures',
  'Dans la vallée, les montagnes sont hautes et les rivières sont profond. Un volcan actif crache une fumée noir. Les plantes sont immense près du cratère.',
  '[{"mot":"profond","cor":"profondes","type":"accord"},{"mot":"noir","cor":"noire","type":"accord"},{"mot":"immense","cor":"immenses","type":"accord"}]'::jsonb);

-- Bloc 17 - m_mbp
SELECT public._dictee_add(133, 3, 'm_mbp', 'village_gourmand',
  'Le chocolatier prépare un délicieux gâteau au citron pour la fête du village. Il doit conbiner le sucre et le beurre avant d''enfourner la pâte, puis ranger ses nonbreux outils de cuisine.',
  '[{"mot":"conbiner","cor":"combiner","type":"m_mbp"},{"mot":"nonbreux","cor":"nombreux","type":"m_mbp"}]'::jsonb);
SELECT public._dictee_add(134, 3, 'm_mbp', 'animaux',
  'Le hérisson cherche une cachette inportante pour hiberner avant l''arrivée du froid. Ses petites pattes tanbourinent doucement sur le sol avant qu''il ne s''endorme.',
  '[{"mot":"inportante","cor":"importante","type":"m_mbp"},{"mot":"tanbourinent","cor":"tambourinent","type":"m_mbp"}]'::jsonb);

-- Bloc 18 - pluriel (pluriels en -x / -eau / -eu / -au)
SELECT public._dictee_add(135, 3, 'pluriel', 'ecole',
  'Pendant la récréation, les élèves jouent à des jeu de ballon dans la cour. Ils rangent ensuite leurs chapeau sur le porte-manteau avant de rentrer en classe.',
  '[{"mot":"jeu","cor":"jeux","type":"pluriel"},{"mot":"chapeau","cor":"chapeaux","type":"pluriel"}]'::jsonb);
SELECT public._dictee_add(136, 3, 'pluriel', 'maison',
  'Dans le jardin, papa ramasse des caillou près de l''allée. Les enfants empilent des morceau de bois pour construire une cabane.',
  '[{"mot":"caillou","cor":"cailloux","type":"pluriel"},{"mot":"morceau","cor":"morceaux","type":"pluriel"}]'::jsonb);

-- Bloc 19 - pluriel_al_aux (révision)
SELECT public._dictee_add(137, 3, 'pluriel_al_aux', 'nature',
  'Dans la forêt, les gardes forestiers installent des signal le long du sentier. Près de la rivière, plusieurs canal traversent la vallée verdoyante.',
  '[{"mot":"signal","cor":"signaux","type":"pluriel_al_aux"},{"mot":"canal","cor":"canaux","type":"pluriel_al_aux"}]'::jsonb);
SELECT public._dictee_add(138, 3, 'pluriel_al_aux', 'sport',
  'Au centre équestre, les enfants brossent les cheval avant la compétition. Après la course, on affiche les résultats dans les journal du club.',
  '[{"mot":"cheval","cor":"chevaux","type":"pluriel_al_aux"},{"mot":"journal","cor":"journaux","type":"pluriel_al_aux"}]'::jsonb);

-- Bloc 20 - revision (mélange)
SELECT public._dictee_add(139, 3, 'revision', 'village_breton',
  'Au port, les pêcheur rentre avec leur filets pleins de poissons. Ils son fatigués mais contents de leur journée en mer.',
  '[{"mot":"pêcheur","cor":"pêcheurs","type":"pluriel"},{"mot":"rentre","cor":"rentrent","type":"verbe_ent"},{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);
SELECT public._dictee_add(140, 3, 'revision', 'ile_tropicale',
  'Sur la plage, les enfant joue avec le sable fin. Ils vont nage dans une eau turquoise a côté des rochers.',
  '[{"mot":"enfant","cor":"enfants","type":"pluriel"},{"mot":"joue","cor":"jouent","type":"verbe_ent"},{"mot":"nage","cor":"nager","type":"e_er_ez"},{"mot":"a","cor":"à","type":"a_a"}]'::jsonb);

-- Bloc 21 - e_er_ez
SELECT public._dictee_add(141, 4, 'e_er_ez', 'base_spatiale',
  'L''équipage prépare le vaisseau avant le grand départ vers Mars. Chacun doit vérifier son matériel puis se prépare pour le voyage le plus important de sa vie.',
  '[{"mot":"prépare","occ":2,"cor":"préparer","type":"e_er_ez"}]'::jsonb);
SELECT public._dictee_add(142, 4, 'e_er_ez', 'royaume_enchante',
  'Le jeune magicien s''entraîne chaque jour dans la tour du château. Il espère réussir à maîtriser le sortilège avant de partir affronte le grand dragon des montagnes.',
  '[{"mot":"affronte","cor":"affronter","type":"e_er_ez"}]'::jsonb);

-- Bloc 22 - ce_se
SELECT public._dictee_add(143, 4, 'ce_se', 'vallee_dinosaures',
  'Le jeune dinosaure explore chaque jour un peu plus loin de son nid. Le soir, il ce couche contre sa mère pour dormir au chaud.',
  '[{"mot":"ce","cor":"se","type":"ce_se"}]'::jsonb);
SELECT public._dictee_add(144, 4, 'ce_se', 'village_gourmand',
  'Le fromager prépare son étal avant l''ouverture du marché. Chaque matin, il ce lève très tôt pour choisir les meilleurs fromages de la région.',
  '[{"mot":"ce","cor":"se","type":"ce_se"}]'::jsonb);

-- Bloc 23 - accord
SELECT public._dictee_add(145, 4, 'accord', 'animaux',
  'Au fond de l''étang, les grenouilles chantent dès la tombée de la nuit. Leur chant résonne longtemps dans l''air frais et humide de la soirée tranquille, apaisant ainsi toute la campagne silencieux.',
  '[{"mot":"silencieux","cor":"silencieuse","type":"accord"}]'::jsonb);
SELECT public._dictee_add(146, 4, 'accord', 'ecole',
  'Pendant la sortie scolaire, la classe visite un grand musée rempli de tableaux anciens. La maîtresse explique chaque oeuvre avec une patience admirable, sous le regard attentif des élèves curieux et silencieuse.',
  '[{"mot":"silencieuse","cor":"silencieux","type":"accord"}]'::jsonb);

-- Bloc 24 - verbe_ent
SELECT public._dictee_add(147, 4, 'verbe_ent', 'maison',
  'Chaque dimanche, toute la famille se réunit autour d''un grand repas préparé avec soin. Les enfants, impatients, attend déjà le dessert promis par leur grand-mère.',
  '[{"mot":"attend","cor":"attendent","type":"verbe_ent"}]'::jsonb);
SELECT public._dictee_add(148, 4, 'verbe_ent', 'nature',
  'Le long du chemin forestier, de grands chênes centenaires bordent le sentier silencieux. Leurs feuilles, agitées par le vent léger, bruisse doucement au-dessus des promeneurs.',
  '[{"mot":"bruisse","cor":"bruissent","type":"verbe_ent"}]'::jsonb);

-- Bloc 25 - son_sont
SELECT public._dictee_add(149, 4, 'son_sont', 'sport',
  'Après un match très disputé, les deux équipes quittent le terrain sous les applaudissements du public conquis. Les joueurs, épuisés mais heureux, son accueillis par leurs familles à la sortie du stade.',
  '[{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);
SELECT public._dictee_add(150, 4, 'son_sont', 'village_breton',
  'Chaque année, les habitants du village préparent une grande fête pour célébrer la mer et les marins disparus. Les lanternes, allumées dès la nuit tombée, son déposées sur l''eau par les enfants.',
  '[{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);

-- Bloc 26 - pluriel_al_aux
SELECT public._dictee_add(151, 4, 'pluriel_al_aux', 'ile_tropicale',
  'Au large de l''île, les pêcheurs remontent leurs filets remplis de poissons multicolores. Non loin de là, sur les récifs, de magnifiques corail abritent une multitude de petites créatures marines.',
  '[{"mot":"corail","cor":"coraux","type":"pluriel_al_aux"}]'::jsonb);
SELECT public._dictee_add(152, 4, 'pluriel_al_aux', 'base_spatiale',
  'Dans le laboratoire de la station spatiale, les scientifiques analysent des échantillons rapportés de la Lune. Sur les écrans, plusieurs signal clignotent doucement pendant toute l''analyse.',
  '[{"mot":"signal","cor":"signaux","type":"pluriel_al_aux"}]'::jsonb);

-- Bloc 27 - revision (homophones mélangés)
SELECT public._dictee_add(153, 4, 'revision', 'royaume_enchante',
  'Dans la grande salle du château, le roi et la reine accueillent leurs invités avec joie. Ce soir-là, tout le royaume et réuni pour célébrer la naissance du jeune prince, et les musiciens on déjà commence à jouer.',
  '[{"mot":"et","occ":2,"cor":"est","type":"et_est"},{"mot":"on","cor":"ont","type":"on_ont"}]'::jsonb);
SELECT public._dictee_add(154, 4, 'revision', 'vallee_dinosaures',
  'Au bord du grand lac, plusieurs dinosaures viennent boire chaque matin avant la chaleur du jour. Ils son parfois rejoints par de petits dinosaures curieux qui s''approchent doucement a pas feutrés.',
  '[{"mot":"son","cor":"sont","type":"son_sont"},{"mot":"a","cor":"à","type":"a_a"}]'::jsonb);

-- Bloc 28 - accord
SELECT public._dictee_add(155, 4, 'accord', 'village_gourmand',
  'Tous les samedis matin, le petit marché du village s''installe sur la place principale, entre la boulangerie et l''ancienne fontaine de pierre. Les étals colorés, chargés de fruits et de légumes frais, attirent une foule nombreuse et joyeux.',
  '[{"mot":"joyeux","cor":"joyeuse","type":"accord"}]'::jsonb);
SELECT public._dictee_add(156, 4, 'accord', 'animaux',
  'Dans la basse-cour, les poules picorent tranquillement les graines éparpillées par le fermier chaque matin. Le coq, perché sur la vieille barrière de bois, observe la scène d''un air fier et attentive.',
  '[{"mot":"attentive","cor":"attentif","type":"accord"}]'::jsonb);

-- Bloc 29 - verbe_ent
SELECT public._dictee_add(157, 4, 'verbe_ent', 'ecole',
  'À la bibliothèque de l''école, de nombreux livres racontent des histoires venues du monde entier. Chaque vendredi, les élèves les plus curieux choisissent une nouvelle lecture et repart avec un sourire satisfait.',
  '[{"mot":"repart","cor":"repartent","type":"verbe_ent"}]'::jsonb);
SELECT public._dictee_add(158, 4, 'verbe_ent', 'maison',
  'Le dimanche après-midi, quand la pluie tombe sans arrêt sur le toit de la maison, les enfants sortent leurs jeux préférés et s''installe tranquillement dans le salon pour jouer ensemble.',
  '[{"mot":"s''installe","cor":"s''installent","type":"verbe_ent"}]'::jsonb);

-- Bloc 30 - revision (tout)
SELECT public._dictee_add(159, 4, 'revision', 'nature',
  'Au coeur de la forêt, les grands chêne centenaires abritent de nonbreux animaux discrets. Le matin, la brume enveloppe doucement le sous-bois et les oiseaux son déjà réveillés, chantant pour accueillir le jour nouveau.',
  '[{"mot":"chêne","cor":"chênes","type":"pluriel"},{"mot":"nonbreux","cor":"nombreux","type":"m_mbp"},{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);
SELECT public._dictee_add(160, 4, 'revision', 'sport',
  'Avant la compétition, les jeunes gymnastes s''entraînent chaque jour avec leur entraîneuse pour progresser rapidement. Ils doivent encore travaille leur équilibre, et plusieurs signal du jury indiquent déjà que la finale approche, mais ils reste concentrés malgré la pression.',
  '[{"mot":"travaille","cor":"travailler","type":"e_er_ez"},{"mot":"signal","cor":"signaux","type":"pluriel_al_aux"},{"mot":"reste","cor":"restent","type":"verbe_ent"}]'::jsonb);
-- >>> SEED END

DROP FUNCTION public._dictee_add(integer, integer, text, text, text, jsonb);

INSERT INTO public.schema_migrations (version)
VALUES ('0035_francais_dictee_accents')
ON CONFLICT (version) DO NOTHING;
