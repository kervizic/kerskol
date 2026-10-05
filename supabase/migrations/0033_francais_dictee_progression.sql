-- 0033_francais_dictee_progression.sql
-- PROGRESSION PAR NOTIONS de la dictee detective (CE2). Decision de Manu : on
-- n'est pas un prof mais une APP ; comme en maths, tout se joue PAR NIVEAU, pas
-- par calendrier. Chaque texte est rattache a une NOTION du programme ; les
-- notions sont ORDONNEES (ordre de presentation + prerequis), jamais verrouillees
-- par une date. L'enfant avance aussi vite que son niveau le permet.
--
-- Apports :
--   * colonne dictee_texte.notion (quelle difficulte le texte travaille) ;
--   * table dictee_notion : l'ordre des notions et leur prerequis ;
--   * nouveau type d'erreur pluriel_al_aux (un cheval -> des chevaux) ;
--   * rattachement des 40 textes existants (0032) + 60 nouveaux textes
--     ORIGINAUX (ids 101..160), au moins 2 par notion.
--
-- Voir docs/progression-dictee-notions.md (tableau des notions, mots, astuces,
-- sources). Les textes sont 100% ORIGINAUX (aucune liste ni recueil protege).
--
-- Migration ADDITIVE et idempotente : aucune donnee utilisateur modifiee ; le
-- francais n'est active sur aucun profil. La table dictee_erreur reste sans
-- aucun droit de lecture cote API (securite inchangee).

-- =========================================================================
-- 1. Colonne notion sur dictee_texte (additive, nullable). L'ensemble ferme est
--    aligne sur les type_faute (pour le ciblage par lacune) + 'revision'.
-- =========================================================================
ALTER TABLE public.dictee_texte ADD COLUMN IF NOT EXISTS notion text;

ALTER TABLE public.dictee_texte DROP CONSTRAINT IF EXISTS dictee_texte_notion_chk;
ALTER TABLE public.dictee_texte ADD  CONSTRAINT dictee_texte_notion_chk
    CHECK (notion IS NULL OR notion IN (
        'a_a','et_est','son_sont','on_ont','ces_ses','ce_se',
        'pluriel','pluriel_al_aux','accord','verbe_ent','m_mbp','e_er_ez',
        'revision'));

CREATE INDEX IF NOT EXISTS dictee_texte_notion_idx ON public.dictee_texte (notion);

-- =========================================================================
-- 2. Nouveau type d'erreur pluriel_al_aux dans la contrainte de dictee_erreur.
-- =========================================================================
ALTER TABLE public.dictee_erreur DROP CONSTRAINT IF EXISTS dictee_erreur_type_chk;
ALTER TABLE public.dictee_erreur ADD  CONSTRAINT dictee_erreur_type_chk
    CHECK (type IN (
        'a_a','et_est','son_sont','on_ont','ces_ses','ce_se',
        'pluriel','pluriel_al_aux','accord','verbe_ent','m_mbp','e_er_ez'));

-- =========================================================================
-- 3. Table des NOTIONS : ordre de presentation + prerequis (progression par
--    niveau, sans aucune date). Le moteur sert la 1re notion non maitrisee dans
--    cet ordre (apres les lacunes), puis la revision.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.dictee_notion (
    code      text    PRIMARY KEY,
    ordre     integer NOT NULL UNIQUE,
    prerequis text    REFERENCES public.dictee_notion(code),
    libelle   text    NOT NULL
);
COMMENT ON TABLE public.dictee_notion IS
    'Notions de la dictee detective, ORDONNEES (ordre + prerequis). Aucun '
    'verrou temporel : la progression est par niveau, comme en maths.';

INSERT INTO public.dictee_notion (code, ordre, prerequis, libelle) VALUES
    ('pluriel',        1,  NULL,             'Le pluriel des noms (-s / -x)'),
    ('son_sont',       2,  'pluriel',        'son / sont'),
    ('a_a',            3,  'son_sont',       'a / à'),
    ('et_est',         4,  'a_a',            'et / est'),
    ('m_mbp',          5,  'et_est',         'm devant m, b, p'),
    ('ces_ses',        6,  'm_mbp',          'ces / ses'),
    ('on_ont',         7,  'ces_ses',        'on / ont'),
    ('verbe_ent',      8,  'on_ont',         'Le verbe au pluriel (-ent)'),
    ('ce_se',          9,  'verbe_ent',      'ce / se'),
    ('accord',         10, 'ce_se',          'L''accord du nom et de l''adjectif'),
    ('pluriel_al_aux', 11, 'accord',         'Le pluriel en -al / -aux'),
    ('e_er_ez',        12, 'pluriel_al_aux', 'é ou -er à la fin du verbe')
ON CONFLICT (code) DO UPDATE SET ordre = EXCLUDED.ordre,
    prerequis = EXCLUDED.prerequis, libelle = EXCLUDED.libelle;

ALTER TABLE public.dictee_notion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dictee_notion_select ON public.dictee_notion;
CREATE POLICY dictee_notion_select ON public.dictee_notion
    FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.dictee_notion TO authenticated;

-- =========================================================================
-- 4. Helper de seed (ajoute notion). Meme logique que 0032 : les positions
--    sont calculees a partir du mot fautif et de son occurrence ; exception si
--    le mot est introuvable ou si la correction = la faute. N'efface QUE les
--    erreurs du texte insere (jamais les autres textes).
-- =========================================================================
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
-- 5. Rattachement des 40 textes existants + 60 nouveaux textes (>=2 / notion).
--    Contenu genere : voir docs/progression-dictee-notions.md.
-- =========================================================================
-- >>> SEED START
-- Seed de la progression par NOTIONS (dictee detective CE2).
-- PARTIE A : rattache les 40 textes existants (ids 1..40) a une notion.
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
-- PARTIE B -- Nouveaux textes (par notion, ordre de presentation)
-- =========================================================================

-- Bloc 1 - pluriel
SELECT public._dictee_add(101, 1, 'pluriel', 'animaux',
  'Dans la ferme, les poule picorent le grain. Le chien garde les mouton toute la journee.',
  '[{"mot":"poule","cor":"poules","type":"pluriel"},{"mot":"mouton","cor":"moutons","type":"pluriel"}]'::jsonb);
SELECT public._dictee_add(102, 1, 'pluriel', 'ecole',
  'A l''ecole, les enfant rangent leur cartable. La maitresse distribue des cahier neufs.',
  '[{"mot":"enfant","cor":"enfants","type":"pluriel"},{"mot":"cahier","cor":"cahiers","type":"pluriel"}]'::jsonb);

-- Bloc 2 - son_sont
SELECT public._dictee_add(103, 1, 'son_sont', 'maison',
  'Le soir, toute la famille range la cuisine. Les assiettes son propres apres le repas.',
  '[{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);
SELECT public._dictee_add(104, 1, 'son_sont', 'nature',
  'Dans la foret, les feuilles tombent doucement. Elles son jaunes et rouges. Les oiseaux son partis vers le sud.',
  '[{"mot":"son","occ":1,"cor":"sont","type":"son_sont"},{"mot":"son","occ":2,"cor":"sont","type":"son_sont"}]'::jsonb);

-- Bloc 3 - a_a
SELECT public._dictee_add(105, 1, 'a_a', 'sport',
  'Chaque mercredi, nous allons a la piscine avec la classe. Apres l''entrainement, le groupe retourne a l''ecole.',
  '[{"mot":"a","occ":1,"cor":"à","type":"a_a"},{"mot":"a","occ":2,"cor":"à","type":"a_a"}]'::jsonb);
SELECT public._dictee_add(106, 1, 'a_a', 'village_breton',
  'Au port, le pecheur donne du pain a son chien. Il pense a la mer avant de partir en bateau.',
  '[{"mot":"a","occ":1,"cor":"à","type":"a_a"},{"mot":"a","occ":2,"cor":"à","type":"a_a"}]'::jsonb);

-- Bloc 4 - et_est
SELECT public._dictee_add(107, 1, 'et_est', 'ile_tropicale',
  'Sur l''ile, le soleil et chaud toute la journee. Le sable et fin sous les pieds. Les enfants nagent dans la mer bleue.',
  '[{"mot":"et","occ":1,"cor":"est","type":"et_est"},{"mot":"et","occ":2,"cor":"est","type":"et_est"}]'::jsonb);
SELECT public._dictee_add(108, 1, 'et_est', 'base_spatiale',
  'Dans la fusee, l''astronaute et calme avant le decollage. La mission et importante pour toute l''equipe.',
  '[{"mot":"et","occ":1,"cor":"est","type":"et_est"},{"mot":"et","occ":2,"cor":"est","type":"et_est"}]'::jsonb);

-- Bloc 5 - m_mbp
SELECT public._dictee_add(109, 2, 'm_mbp', 'royaume_enchante',
  'Dans le chateau, le roi bat le tanbour pour annoncer la fete. Toute la cour trouve ce moment tres inportant.',
  '[{"mot":"tanbour","cor":"tambour","type":"m_mbp"},{"mot":"inportant","cor":"important","type":"m_mbp"}]'::jsonb);
SELECT public._dictee_add(110, 2, 'm_mbp', 'vallee_dinosaures',
  'Le petit dinosaure traverse la plaine en courant. Il veut conbler son ventre vide avant la nuit. Ses pas laissent une enpreinte enorme dans la terre molle.',
  '[{"mot":"conbler","cor":"combler","type":"m_mbp"},{"mot":"enpreinte","cor":"empreinte","type":"m_mbp"}]'::jsonb);

-- Bloc 6 - ces_ses
SELECT public._dictee_add(111, 2, 'ces_ses', 'village_gourmand',
  'Le patissier sort ces gateaux tout chauds du four. Il pose ces mains pleines de farine sur le comptoir avant de servir les clients.',
  '[{"mot":"ces","occ":1,"cor":"ses","type":"ces_ses"},{"mot":"ces","occ":2,"cor":"ses","type":"ces_ses"}]'::jsonb);
SELECT public._dictee_add(112, 2, 'ces_ses', 'animaux',
  'Le renard cache ces provisions sous les feuilles avant l''hiver. Il surveille ces petits avec attention pendant qu''ils jouent.',
  '[{"mot":"ces","occ":1,"cor":"ses","type":"ces_ses"},{"mot":"ces","occ":2,"cor":"ses","type":"ces_ses"}]'::jsonb);

-- Bloc 7 - on_ont
SELECT public._dictee_add(113, 2, 'on_ont', 'ecole',
  'Pendant la recreation, les eleves on organise un grand jeu de ballon. Ils on couru dans toute la cour en riant.',
  '[{"mot":"on","occ":1,"cor":"ont","type":"on_ont"},{"mot":"on","occ":2,"cor":"ont","type":"on_ont"}]'::jsonb);
SELECT public._dictee_add(114, 2, 'on_ont', 'maison',
  'Les enfants on range leurs jouets. Apres le repas, ils on aide maman a debarrasser la table. Ensuite, on allume la television ensemble.',
  '[{"mot":"on","occ":1,"cor":"ont","type":"on_ont"},{"mot":"on","occ":2,"cor":"ont","type":"on_ont"}]'::jsonb);

-- Bloc 8 - verbe_ent
SELECT public._dictee_add(115, 2, 'verbe_ent', 'nature',
  'Au printemps, les fleurs pousse dans le jardin. Les papillons vole autour des roses colorees.',
  '[{"mot":"pousse","cor":"poussent","type":"verbe_ent"},{"mot":"vole","cor":"volent","type":"verbe_ent"}]'::jsonb);
SELECT public._dictee_add(116, 2, 'verbe_ent', 'sport',
  'Sur le terrain, les joueurs court vers le ballon. Les supporters chante une chanson joyeuse dans les tribunes.',
  '[{"mot":"court","cor":"courent","type":"verbe_ent"},{"mot":"chante","cor":"chantent","type":"verbe_ent"}]'::jsonb);

-- Bloc 9 - ce_se
SELECT public._dictee_add(117, 2, 'ce_se', 'village_breton',
  'Le pecheur ce prepare avant de partir en mer. Il ce leve tot chaque matin pour attraper les poissons.',
  '[{"mot":"ce","occ":1,"cor":"se","type":"ce_se"},{"mot":"ce","occ":2,"cor":"se","type":"ce_se"}]'::jsonb);
SELECT public._dictee_add(118, 2, 'ce_se', 'ile_tropicale',
  'Le crabe ce cache sous le sable chaud. Les enfants ce baignent dans une eau turquoise et claire.',
  '[{"mot":"ce","occ":1,"cor":"se","type":"ce_se"},{"mot":"ce","occ":2,"cor":"se","type":"ce_se"}]'::jsonb);

-- Bloc 10 - accord
SELECT public._dictee_add(119, 2, 'accord', 'base_spatiale',
  'Dans la station, les astronautes portent une combinaison blanc. Ils installent des antennes puissant sur le toit.',
  '[{"mot":"blanc","cor":"blanche","type":"accord"},{"mot":"puissant","cor":"puissantes","type":"accord"}]'::jsonb);
SELECT public._dictee_add(120, 2, 'accord', 'royaume_enchante',
  'Dans le chateau, la reine porte une robe dore. Les chevaliers portent des armures brillant au soleil.',
  '[{"mot":"dore","cor":"dorée","type":"accord"},{"mot":"brillant","cor":"brillantes","type":"accord"}]'::jsonb);

-- Bloc 11 - pluriel_al_aux
SELECT public._dictee_add(121, 3, 'pluriel_al_aux', 'vallee_dinosaures',
  'Dans la vallee, les animal geants se deplacent lentement entre les rochers. Ils mangent des vegetal verts toute la journee.',
  '[{"mot":"animal","cor":"animaux","type":"pluriel_al_aux"},{"mot":"vegetal","cor":"végétaux","type":"pluriel_al_aux"}]'::jsonb);
SELECT public._dictee_add(122, 3, 'pluriel_al_aux', 'village_gourmand',
  'Au marche, le boulanger range ses journal du matin pres de la caisse. Dans la vitrine, des bocal de confiture brillent au soleil.',
  '[{"mot":"journal","cor":"journaux","type":"pluriel_al_aux"},{"mot":"bocal","cor":"bocaux","type":"pluriel_al_aux"}]'::jsonb);

-- Bloc 12 - e_er_ez
SELECT public._dictee_add(123, 3, 'e_er_ez', 'animaux',
  'Le matin, le fermier part travaille aux champs apres avoir nourri les poules. Le soir, il faut encore donne a manger aux lapins avant la nuit.',
  '[{"mot":"travaille","cor":"travailler","type":"e_er_ez"},{"mot":"donne","cor":"donner","type":"e_er_ez"}]'::jsonb);
SELECT public._dictee_add(124, 3, 'e_er_ez', 'ecole',
  'A la fin du cours, la maitresse demande de ranger les cahiers et d''ecouter la consigne pour avance dans l''exercice. Les eleves doivent chanter puis recite un poeme devant la classe.',
  '[{"mot":"avance","cor":"avancer","type":"e_er_ez"},{"mot":"recite","cor":"réciter","type":"e_er_ez"}]'::jsonb);

-- Bloc 13 - a_a (révision et_est)
SELECT public._dictee_add(125, 3, 'a_a', 'maison',
  'Le matin, papa prepare le petit-dejeuner et maman part a son travail. La maison et calme avant le reveil des enfants.',
  '[{"mot":"a","occ":1,"cor":"à","type":"a_a"},{"mot":"et","occ":2,"cor":"est","type":"et_est"}]'::jsonb);
SELECT public._dictee_add(126, 3, 'a_a', 'nature',
  'Au bord de la riviere, le heron reste immobile et attend a cote des roseaux. L''eau et fraiche sous les nenuphars.',
  '[{"mot":"a","occ":1,"cor":"à","type":"a_a"},{"mot":"et","occ":2,"cor":"est","type":"et_est"}]'::jsonb);

-- Bloc 14 - son_sont (révision ces_ses)
SELECT public._dictee_add(127, 3, 'son_sont', 'sport',
  'Apres l''entrainement, le coach range ces ballons dans le local. Les joueurs son fatigues mais contents de leur match.',
  '[{"mot":"ces","cor":"ses","type":"ces_ses"},{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);
SELECT public._dictee_add(128, 3, 'son_sont', 'village_breton',
  'Le marin range ces filets avant la tempete. Les vagues son hautes et le vent souffle fort sur le port.',
  '[{"mot":"ces","cor":"ses","type":"ces_ses"},{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);

-- Bloc 15 - verbe_ent
SELECT public._dictee_add(129, 3, 'verbe_ent', 'ile_tropicale',
  'Sur la plage, les enfants construise des chateaux de sable avant la maree. Les vagues arrive doucement et efface leurs traces.',
  '[{"mot":"construise","cor":"construisent","type":"verbe_ent"},{"mot":"arrive","cor":"arrivent","type":"verbe_ent"},{"mot":"efface","cor":"effacent","type":"verbe_ent"}]'::jsonb);
SELECT public._dictee_add(130, 3, 'verbe_ent', 'base_spatiale',
  'Dans la station, les ecrans affiche plein de donnees. Les robots avance lentement et repare les panneaux solaires.',
  '[{"mot":"affiche","cor":"affichent","type":"verbe_ent"},{"mot":"avance","cor":"avancent","type":"verbe_ent"},{"mot":"repare","cor":"réparent","type":"verbe_ent"}]'::jsonb);

-- Bloc 16 - accord
SELECT public._dictee_add(131, 3, 'accord', 'royaume_enchante',
  'Dans le royaume, les tours sont hautes et les jardins sont immense. Une licorne blanc traverse la foret enchantee. Les fleurs sont parfume partout.',
  '[{"mot":"immense","cor":"immenses","type":"accord"},{"mot":"blanc","cor":"blanche","type":"accord"},{"mot":"parfume","cor":"parfumées","type":"accord"}]'::jsonb);
SELECT public._dictee_add(132, 3, 'accord', 'vallee_dinosaures',
  'Dans la vallee, les montagnes sont hautes et les rivieres sont profond. Un volcan actif crache une fumee noir. Les plantes sont immense pres du cratere.',
  '[{"mot":"profond","cor":"profondes","type":"accord"},{"mot":"noir","cor":"noire","type":"accord"},{"mot":"immense","cor":"immenses","type":"accord"}]'::jsonb);

-- Bloc 17 - m_mbp
SELECT public._dictee_add(133, 3, 'm_mbp', 'village_gourmand',
  'Le chocolatier prepare un delicieux gateau au citron pour la fete du village. Il doit conbiner le sucre et le beurre avant d''enfourner la pate, puis ranger ses nonbreux outils de cuisine.',
  '[{"mot":"conbiner","cor":"combiner","type":"m_mbp"},{"mot":"nonbreux","cor":"nombreux","type":"m_mbp"}]'::jsonb);
SELECT public._dictee_add(134, 3, 'm_mbp', 'animaux',
  'Le herisson cherche une cachette inportante pour hiberner avant l''arrivee du froid. Ses petites pattes tanbourinent doucement sur le sol avant qu''il ne s''endorme.',
  '[{"mot":"inportante","cor":"importante","type":"m_mbp"},{"mot":"tanbourinent","cor":"tambourinent","type":"m_mbp"}]'::jsonb);

-- Bloc 18 - pluriel (pluriels en -x / -eau / -eu / -au)
SELECT public._dictee_add(135, 3, 'pluriel', 'ecole',
  'Pendant la recreation, les eleves jouent a des jeu de ballon dans la cour. Ils rangent ensuite leurs chapeau sur le porte-manteau avant de rentrer en classe.',
  '[{"mot":"jeu","cor":"jeux","type":"pluriel"},{"mot":"chapeau","cor":"chapeaux","type":"pluriel"}]'::jsonb);
SELECT public._dictee_add(136, 3, 'pluriel', 'maison',
  'Dans le jardin, papa ramasse des caillou pres de l''allee. Les enfants empilent des morceau de bois pour construire une cabane.',
  '[{"mot":"caillou","cor":"cailloux","type":"pluriel"},{"mot":"morceau","cor":"morceaux","type":"pluriel"}]'::jsonb);

-- Bloc 19 - pluriel_al_aux (révision)
SELECT public._dictee_add(137, 3, 'pluriel_al_aux', 'nature',
  'Dans la foret, les gardes forestiers installent des signal le long du sentier. Pres de la riviere, plusieurs canal traversent la vallee verdoyante.',
  '[{"mot":"signal","cor":"signaux","type":"pluriel_al_aux"},{"mot":"canal","cor":"canaux","type":"pluriel_al_aux"}]'::jsonb);
SELECT public._dictee_add(138, 3, 'pluriel_al_aux', 'sport',
  'Au centre equestre, les enfants brossent les cheval avant la competition. Apres la course, on affiche les resultats dans les journal du club.',
  '[{"mot":"cheval","cor":"chevaux","type":"pluriel_al_aux"},{"mot":"journal","cor":"journaux","type":"pluriel_al_aux"}]'::jsonb);

-- Bloc 20 - revision (mélange)
SELECT public._dictee_add(139, 3, 'revision', 'village_breton',
  'Au port, les pecheur rentre avec leur filets pleins de poissons. Ils son fatigues mais contents de leur journee en mer.',
  '[{"mot":"pecheur","cor":"pêcheurs","type":"pluriel"},{"mot":"rentre","cor":"rentrent","type":"verbe_ent"},{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);
SELECT public._dictee_add(140, 3, 'revision', 'ile_tropicale',
  'Sur la plage, les enfant joue avec le sable fin. Ils vont nage dans une eau turquoise a cote des rochers.',
  '[{"mot":"enfant","cor":"enfants","type":"pluriel"},{"mot":"joue","cor":"jouent","type":"verbe_ent"},{"mot":"nage","cor":"nager","type":"e_er_ez"},{"mot":"a","cor":"à","type":"a_a"}]'::jsonb);

-- Bloc 21 - e_er_ez
SELECT public._dictee_add(141, 4, 'e_er_ez', 'base_spatiale',
  'L''equipage prepare le vaisseau avant le grand depart vers Mars. Chacun doit verifier son materiel puis se prepare pour le voyage le plus important de sa vie.',
  '[{"mot":"prepare","occ":2,"cor":"préparer","type":"e_er_ez"}]'::jsonb);
SELECT public._dictee_add(142, 4, 'e_er_ez', 'royaume_enchante',
  'Le jeune magicien s''entraine chaque jour dans la tour du chateau. Il espere reussir a maitriser le sortilege avant de partir affronte le grand dragon des montagnes.',
  '[{"mot":"affronte","cor":"affronter","type":"e_er_ez"}]'::jsonb);

-- Bloc 22 - ce_se
SELECT public._dictee_add(143, 4, 'ce_se', 'vallee_dinosaures',
  'Le jeune dinosaure explore chaque jour un peu plus loin de son nid. Le soir, il ce couche contre sa mere pour dormir au chaud.',
  '[{"mot":"ce","cor":"se","type":"ce_se"}]'::jsonb);
SELECT public._dictee_add(144, 4, 'ce_se', 'village_gourmand',
  'Le fromager prepare son etal avant l''ouverture du marche. Chaque matin, il ce leve tres tot pour choisir les meilleurs fromages de la region.',
  '[{"mot":"ce","cor":"se","type":"ce_se"}]'::jsonb);

-- Bloc 23 - accord
SELECT public._dictee_add(145, 4, 'accord', 'animaux',
  'Au fond de l''etang, les grenouilles chantent des la tombee de la nuit. Leur chant resonne longtemps dans l''air frais et humide de la soiree tranquille, apaisant ainsi toute la campagne silencieux.',
  '[{"mot":"silencieux","cor":"silencieuse","type":"accord"}]'::jsonb);
SELECT public._dictee_add(146, 4, 'accord', 'ecole',
  'Pendant la sortie scolaire, la classe visite un grand musee rempli de tableaux anciens. La maitresse explique chaque oeuvre avec une patience admirable, sous le regard attentif des eleves curieux et silencieuse.',
  '[{"mot":"silencieuse","cor":"silencieux","type":"accord"}]'::jsonb);

-- Bloc 24 - verbe_ent
SELECT public._dictee_add(147, 4, 'verbe_ent', 'maison',
  'Chaque dimanche, toute la famille se reunit autour d''un grand repas prepare avec soin. Les enfants, impatients, attend deja le dessert promis par leur grand-mere.',
  '[{"mot":"attend","cor":"attendent","type":"verbe_ent"}]'::jsonb);
SELECT public._dictee_add(148, 4, 'verbe_ent', 'nature',
  'Le long du chemin forestier, de grands chenes centenaires bordent le sentier silencieux. Leurs feuilles, agitees par le vent leger, bruisse doucement au-dessus des promeneurs.',
  '[{"mot":"bruisse","cor":"bruissent","type":"verbe_ent"}]'::jsonb);

-- Bloc 25 - son_sont
SELECT public._dictee_add(149, 4, 'son_sont', 'sport',
  'Apres un match tres dispute, les deux equipes quittent le terrain sous les applaudissements du public conquis. Les joueurs, epuises mais heureux, son accueillis par leurs familles a la sortie du stade.',
  '[{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);
SELECT public._dictee_add(150, 4, 'son_sont', 'village_breton',
  'Chaque annee, les habitants du village preparent une grande fete pour celebrer la mer et les marins disparus. Les lanternes, allumees des la nuit tombee, son deposees sur l''eau par les enfants.',
  '[{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);

-- Bloc 26 - pluriel_al_aux
SELECT public._dictee_add(151, 4, 'pluriel_al_aux', 'ile_tropicale',
  'Au large de l''ile, les pecheurs remontent leurs filets remplis de poissons multicolores. Non loin de la, sur les recifs, de magnifiques corail abritent une multitude de petites creatures marines.',
  '[{"mot":"corail","cor":"coraux","type":"pluriel_al_aux"}]'::jsonb);
SELECT public._dictee_add(152, 4, 'pluriel_al_aux', 'base_spatiale',
  'Dans le laboratoire de la station spatiale, les scientifiques analysent des echantillons rapportes de la Lune. Sur les ecrans, plusieurs signal clignotent doucement pendant toute l''analyse.',
  '[{"mot":"signal","cor":"signaux","type":"pluriel_al_aux"}]'::jsonb);

-- Bloc 27 - revision (homophones mélangés)
SELECT public._dictee_add(153, 4, 'revision', 'royaume_enchante',
  'Dans la grande salle du chateau, le roi et la reine accueillent leurs invites avec joie. Ce soir-la, tout le royaume et reuni pour celebrer la naissance du jeune prince, et les musiciens on deja commence a jouer.',
  '[{"mot":"et","occ":2,"cor":"est","type":"et_est"},{"mot":"on","cor":"ont","type":"on_ont"}]'::jsonb);
SELECT public._dictee_add(154, 4, 'revision', 'vallee_dinosaures',
  'Au bord du grand lac, plusieurs dinosaures viennent boire chaque matin avant la chaleur du jour. Ils son parfois rejoints par de petits dinosaures curieux qui s''approchent doucement a pas feutres.',
  '[{"mot":"son","cor":"sont","type":"son_sont"},{"mot":"a","cor":"à","type":"a_a"}]'::jsonb);

-- Bloc 28 - accord
SELECT public._dictee_add(155, 4, 'accord', 'village_gourmand',
  'Tous les samedis matin, le petit marche du village s''installe sur la place principale, entre la boulangerie et l''ancienne fontaine de pierre. Les etals colores, charges de fruits et de legumes frais, attirent une foule nombreuse et joyeux.',
  '[{"mot":"joyeux","cor":"joyeuse","type":"accord"}]'::jsonb);
SELECT public._dictee_add(156, 4, 'accord', 'animaux',
  'Dans la basse-cour, les poules picorent tranquillement les graines eparpillees par le fermier chaque matin. Le coq, perche sur la vieille barriere de bois, observe la scene d''un air fier et attentive.',
  '[{"mot":"attentive","cor":"attentif","type":"accord"}]'::jsonb);

-- Bloc 29 - verbe_ent
SELECT public._dictee_add(157, 4, 'verbe_ent', 'ecole',
  'A la bibliotheque de l''ecole, de nombreux livres racontent des histoires venues du monde entier. Chaque vendredi, les eleves les plus curieux choisissent une nouvelle lecture et repart avec un sourire satisfait.',
  '[{"mot":"repart","cor":"repartent","type":"verbe_ent"}]'::jsonb);
SELECT public._dictee_add(158, 4, 'verbe_ent', 'maison',
  'Le dimanche apres-midi, quand la pluie tombe sans arret sur le toit de la maison, les enfants sortent leurs jeux preferes et s''installe tranquillement dans le salon pour jouer ensemble.',
  '[{"mot":"s''installe","cor":"s''installent","type":"verbe_ent"}]'::jsonb);

-- Bloc 30 - revision (tout)
SELECT public._dictee_add(159, 4, 'revision', 'nature',
  'Au coeur de la foret, les grands chene centenaires abritent de nonbreux animaux discrets. Le matin, la brume enveloppe doucement le sous-bois et les oiseaux son deja reveilles, chantant pour accueillir le jour nouveau.',
  '[{"mot":"chene","cor":"chênes","type":"pluriel"},{"mot":"nonbreux","cor":"nombreux","type":"m_mbp"},{"mot":"son","cor":"sont","type":"son_sont"}]'::jsonb);
SELECT public._dictee_add(160, 4, 'revision', 'sport',
  'Avant la competition, les jeunes gymnastes s''entrainent chaque jour avec leur entraineuse pour progresser rapidement. Ils doivent encore travaille leur equilibre, et plusieurs signal du jury indiquent deja que la finale approche, mais ils reste concentres malgre la pression.',
  '[{"mot":"travaille","cor":"travailler","type":"e_er_ez"},{"mot":"signal","cor":"signaux","type":"pluriel_al_aux"},{"mot":"reste","cor":"restent","type":"verbe_ent"}]'::jsonb);
-- >>> SEED END

DROP FUNCTION public._dictee_add(integer, integer, text, text, text, jsonb);

-- =========================================================================
-- 6. dictee_charger_tous : expose en plus notion (jamais positions/corrections/
--    types). Securite inchangee.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.dictee_charger_tous()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', t.id,
        'niveau', t.niveau,
        'theme', t.theme,
        'notion', t.notion,
        'mots', to_jsonb(regexp_split_to_array(btrim(t.texte), '\s+')),
        'nb_erreurs', (SELECT count(*) FROM public.dictee_erreur e WHERE e.texte_id = t.id)
      ) ORDER BY t.niveau, t.id), '[]'::jsonb)
    FROM public.dictee_texte t;
$$;
REVOKE EXECUTE ON FUNCTION public.dictee_charger_tous() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.dictee_charger_tous() TO authenticated;

-- =========================================================================
-- 7. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0033_francais_dictee_progression')
ON CONFLICT (version) DO NOTHING;
