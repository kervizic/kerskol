-- 0032_francais_dictee_detective.sql
-- MATIERE FRANCAIS : DICTEE DETECTIVE (CE2). Competence FR.ORTHO.DETECTIVE,
-- 4 niveaux, ouverte d'emblee (le francais s'active par profil).
--
-- Principe : une banque de TEXTES tres courts (2 a 4 phrases, vocabulaire CE2)
-- contient des ERREURS PLANTEES (homophones a/a, et/est, son/sont, on/ont,
-- ces/ses, ce/se ; pluriel des noms ; accord nom-adjectif ; verbe au pluriel
-- -ent ; m devant m/b/p ; e/er/ez en fin de verbe). L'enfant joue au detective :
-- il TROUVE (touche) les mots fautifs, puis selon le niveau les CORRIGE.
--
-- SECURITE (exigence de la mission) : le client ne recoit JAMAIS la liste des
-- erreurs avant la validation. Le serveur n'expose que les MOTS AFFICHES du
-- texte (le texte contient deja les formes fautives) et le NOMBRE d'erreurs.
-- La table public.dictee_erreur (positions, corrections, types) n'a AUCUN
-- GRANT SELECT : elle n'est lue que par des fonctions serveur. La correction et
-- les positions ne sont revelees qu'APRES envoi (retour de enregistrer_reponse).
--
-- Verification SERVEUR seul juge : verif_dictee compare les positions touchees
-- et les corrections (normalisees : minuscules, espaces, ponctuation de bord
-- retiree ; ACCENTS EXIGES) aux erreurs plantees. Regle « juste » pour l'EMA :
-- toutes les erreurs trouvees ET (niveau >= 2) corrigees, sans fausse alerte.
--
-- Migration ADDITIVE et idempotente : aucune donnee utilisateur (Iris, foyers)
-- n'est modifiee ; le francais n'est active sur aucun profil existant.

-- =========================================================================
-- 1. Type d'exercice « dictee » : deja autorise par exercices_type_chk (0031).
-- =========================================================================

-- =========================================================================
-- 2. Normalisation d'un MOT (minuscules, espaces, apostrophes via
--    normaliser_lettres ; puis retrait de la ponctuation de bord). Les ACCENTS
--    et les traits d'union internes sont CONSERVES (accents exiges).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.normaliser_mot(s text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
    SELECT btrim(regexp_replace(public.normaliser_lettres(s),
                                '[.,;:!?«»"()…]', '', 'g'));
$$;
REVOKE EXECUTE ON FUNCTION public.normaliser_mot(text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 3. Tables de reference.
--    dictee_texte : le texte AFFICHE (contient deja les formes fautives), en
--      mots separes par des espaces (tokenisation = split sur les espaces).
--    dictee_erreur : erreurs plantees. position = index (1-base) du mot fautif
--      dans le texte ; faute = le mot tel qu'affiche ; correction = la bonne
--      forme ; type = la typologie (pour le diagnostic et le reciblage).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.dictee_texte (
    id     integer PRIMARY KEY,
    niveau integer NOT NULL,
    theme  text    NOT NULL,
    texte  text    NOT NULL,
    CONSTRAINT dictee_texte_niveau_chk CHECK (niveau BETWEEN 1 AND 4),
    CONSTRAINT dictee_texte_texte_chk  CHECK (btrim(texte) <> '')
);
COMMENT ON TABLE public.dictee_texte IS
    'Textes affiches de la dictee detective (contiennent les formes fautives). '
    'Seuls les mots et le nombre d''erreurs sont exposes au client.';

CREATE TABLE IF NOT EXISTS public.dictee_erreur (
    texte_id   integer NOT NULL REFERENCES public.dictee_texte(id) ON DELETE CASCADE,
    position   integer NOT NULL,
    faute      text    NOT NULL,
    correction text    NOT NULL,
    type       text    NOT NULL,
    PRIMARY KEY (texte_id, position),
    CONSTRAINT dictee_erreur_position_chk CHECK (position >= 1),
    CONSTRAINT dictee_erreur_type_chk CHECK (type IN (
        'a_a','et_est','son_sont','on_ont','ces_ses','ce_se',
        'pluriel','accord','verbe_ent','m_mbp','e_er_ez'))
);
COMMENT ON TABLE public.dictee_erreur IS
    'Erreurs plantees (positions/corrections/types). AUCUN GRANT SELECT : lue '
    'uniquement par les fonctions serveur ; jamais exposee avant validation.';

-- RLS : lecture seule du TEXTE AFFICHE par les comptes authentifies (sert de
-- repli ; l'exposition passe de toute facon par dictee_charger_tous). La table
-- des erreurs reste sans aucun droit de lecture cote API.
ALTER TABLE public.dictee_texte  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dictee_erreur ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dictee_texte_select_auth ON public.dictee_texte;
CREATE POLICY dictee_texte_select_auth ON public.dictee_texte
    FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.dictee_texte TO authenticated;
-- public.dictee_erreur : pas de policy, pas de GRANT -> inaccessible cote API.

-- =========================================================================
-- 4. Seed helper : insere un texte et calcule les POSITIONS des erreurs a
--    partir du mot fautif et de son occurrence (evite tout comptage manuel).
--    p_erreurs = [{"mot":"a","occ":1,"cor":"à","type":"a_a"}, ...] ; occ = 1
--    par defaut. Leve une exception si le mot/occurrence est introuvable.
-- =========================================================================
CREATE OR REPLACE FUNCTION public._dictee_add(
    p_id integer, p_niveau integer, p_theme text, p_texte text, p_erreurs jsonb)
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    toks text[];
    e    jsonb;
    v_mot text; v_occ integer; v_cor text; v_type text;
    i integer; seen integer; pos integer;
BEGIN
    INSERT INTO public.dictee_texte (id, niveau, theme, texte)
    VALUES (p_id, p_niveau, p_theme, p_texte)
    ON CONFLICT (id) DO UPDATE SET niveau = EXCLUDED.niveau,
        theme = EXCLUDED.theme, texte = EXCLUDED.texte;
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

-- Reseed idempotent (reference uniquement, aucune donnee utilisateur).
DELETE FROM public.dictee_erreur;
DELETE FROM public.dictee_texte;

-- --- NIVEAU 1 (trouver seulement) ----------------------------------------
SELECT public._dictee_add(1, 1, 'animaux',
  'Le chat et le chien son dans le jardin. On joue avec eux tous les jours.',
  '[{"mot":"son","cor":"sont","type":"son_sont"}]');
SELECT public._dictee_add(2, 1, 'ecole',
  'Léa a rangé ces crayons dans la trousse. Elle et contente de son travail.',
  '[{"mot":"ces","cor":"ses","type":"ces_ses"},{"mot":"et","cor":"est","type":"et_est"}]');
SELECT public._dictee_add(3, 1, 'village_breton',
  'Au port, les bateau rentrent le soir. Les mouettes volent au-dessus de l''eau.',
  '[{"mot":"bateau","cor":"bateaux","type":"pluriel"}]');
SELECT public._dictee_add(4, 1, 'ile_tropicale',
  'Sur la plage, le sable et doux. Je ramasse des coquillage avec ma sœur.',
  '[{"mot":"et","cor":"est","type":"et_est"},{"mot":"coquillage","cor":"coquillages","type":"pluriel"}]');
SELECT public._dictee_add(5, 1, 'maison',
  'Papa lave la voiture. Les enfants on aidé a rincer le toit.',
  '[{"mot":"on","cor":"ont","type":"on_ont"},{"mot":"a","cor":"à","type":"a_a"}]');
SELECT public._dictee_add(6, 1, 'nature',
  'Dans le pré, les vache mangent l''herbe. Un oiseau chante sur la branche.',
  '[{"mot":"vache","cor":"vaches","type":"pluriel"}]');
SELECT public._dictee_add(7, 1, 'sport',
  'Nous allons a la piscine le mercredi. J''aime nager avec mes amis.',
  '[{"mot":"a","cor":"à","type":"a_a"}]');
SELECT public._dictee_add(8, 1, 'royaume_enchante',
  'La princesse et le roi habitent le château. Ils son très gentils.',
  '[{"mot":"son","cor":"sont","type":"son_sont"}]');
SELECT public._dictee_add(9, 1, 'base_spatiale',
  'La fusée décolle vers les étoiles. Les astronaute regardent la Terre de là-haut.',
  '[{"mot":"astronaute","cor":"astronautes","type":"pluriel"}]');
SELECT public._dictee_add(10, 1, 'vallee_dinosaures',
  'Les dinosaure vivaient il y a longtemps. On n''en voit plus dans la forêt.',
  '[{"mot":"dinosaure","cor":"dinosaures","type":"pluriel"}]');

-- --- NIVEAU 2 (trouver + corriger par QCM) -------------------------------
SELECT public._dictee_add(11, 2, 'village_gourmand',
  'Le boulanger a préparé ces petits pains. Ils sentent bon et son encore chauds.',
  '[{"mot":"ces","cor":"ses","type":"ces_ses"},{"mot":"son","cor":"sont","type":"son_sont"}]');
SELECT public._dictee_add(12, 2, 'ecole',
  'Chaque élève sort ces cahiers. Il range sa trousse a côté du livre.',
  '[{"mot":"ces","cor":"ses","type":"ces_ses"},{"mot":"a","cor":"à","type":"a_a"}]');
SELECT public._dictee_add(13, 2, 'animaux',
  'Les oiseaux on fait un nid dans l''arbre. Ils protègent ces petits du vent.',
  '[{"mot":"on","cor":"ont","type":"on_ont"},{"mot":"ces","cor":"ses","type":"ces_ses"}]');
SELECT public._dictee_add(14, 2, 'ile_tropicale',
  'Le perroquet répète se que dit le marin. Son plumage et vert et bleu.',
  '[{"mot":"se","cor":"ce","type":"ce_se"},{"mot":"et","occ":1,"cor":"est","type":"et_est"}]');
SELECT public._dictee_add(15, 2, 'maison',
  'Maman range ces clés dans le tiroir. Elle ce prépare a partir au marché.',
  '[{"mot":"ces","cor":"ses","type":"ces_ses"},{"mot":"ce","cor":"se","type":"ce_se"},{"mot":"a","cor":"à","type":"a_a"}]');
SELECT public._dictee_add(16, 2, 'nature',
  'Les feuilles tombe en automne. Les enfants saute dans les tas de feuilles.',
  '[{"mot":"tombe","cor":"tombent","type":"verbe_ent"},{"mot":"saute","cor":"sautent","type":"verbe_ent"}]');
SELECT public._dictee_add(17, 2, 'sport',
  'Les joueurs cours sur le terrain. Ils on gagné le match a la fin.',
  '[{"mot":"cours","cor":"courent","type":"verbe_ent"},{"mot":"on","cor":"ont","type":"on_ont"},{"mot":"a","cor":"à","type":"a_a"}]');
SELECT public._dictee_add(18, 2, 'village_breton',
  'Les pêcheurs rentre au port. Leurs filets son pleins de poissons argentés.',
  '[{"mot":"rentre","cor":"rentrent","type":"verbe_ent"},{"mot":"son","cor":"sont","type":"son_sont"}]');
SELECT public._dictee_add(19, 2, 'royaume_enchante',
  'Le chevalier monte sur son cheval. Les gardes ouvre la porte et le roi salue ces amis.',
  '[{"mot":"ouvre","cor":"ouvrent","type":"verbe_ent"},{"mot":"ces","cor":"ses","type":"ces_ses"}]');
SELECT public._dictee_add(20, 2, 'base_spatiale',
  'Les astronautes flotte dans la station. On regarde la Terre a travers le hublot.',
  '[{"mot":"flotte","cor":"flottent","type":"verbe_ent"},{"mot":"a","cor":"à","type":"a_a"}]');

-- --- NIVEAU 3 (trouver + corriger en saisie libre ; nombre annonce) ------
SELECT public._dictee_add(21, 3, 'nature',
  'Dans la forêt, les grand arbres cachent le ciel. Les oiseau chantent et le ruisseau coule doucement.',
  '[{"mot":"grand","cor":"grands","type":"accord"},{"mot":"oiseau","cor":"oiseaux","type":"pluriel"}]');
SELECT public._dictee_add(22, 3, 'village_gourmand',
  'Le marchand vend des fromage et des pomme rouge. Les client achètent leur déjeuner.',
  '[{"mot":"fromage","cor":"fromages","type":"pluriel"},{"mot":"pomme","cor":"pommes","type":"pluriel"},{"mot":"rouge","cor":"rouges","type":"accord"},{"mot":"client","cor":"clients","type":"pluriel"}]');
SELECT public._dictee_add(23, 3, 'ecole',
  'Les enfants vont chanté une chanson. La maîtresse veut les félicité pour leur travail.',
  '[{"mot":"chanté","cor":"chanter","type":"e_er_ez"},{"mot":"félicité","cor":"féliciter","type":"e_er_ez"}]');
SELECT public._dictee_add(24, 3, 'maison',
  'Je range ma chanbre avant le dîner. Mon petit frère porte son tanbour dans le salon.',
  '[{"mot":"chanbre","cor":"chambre","type":"m_mbp"},{"mot":"tanbour","cor":"tambour","type":"m_mbp"}]');
SELECT public._dictee_add(25, 3, 'ile_tropicale',
  'Les tortue nagent près du récif. Elles cherchent des petit poissons a manger.',
  '[{"mot":"tortue","cor":"tortues","type":"pluriel"},{"mot":"petit","cor":"petits","type":"accord"},{"mot":"a","cor":"à","type":"a_a"}]');
SELECT public._dictee_add(26, 3, 'sport',
  'Après le match, les joueur sont fatigué. Ils vont se doucher et rentré a la maison.',
  '[{"mot":"joueur","cor":"joueurs","type":"pluriel"},{"mot":"fatigué","cor":"fatigués","type":"accord"},{"mot":"rentré","cor":"rentrer","type":"e_er_ez"},{"mot":"a","cor":"à","type":"a_a"}]');
SELECT public._dictee_add(27, 3, 'vallee_dinosaures',
  'Les dinosaures courent vers la rivière. Leurs petit les suive sur le chemin boueux.',
  '[{"mot":"petit","cor":"petits","type":"accord"},{"mot":"suive","cor":"suivent","type":"verbe_ent"}]');
SELECT public._dictee_add(28, 3, 'royaume_enchante',
  'La fée agite sa baguette. Des étoile dorées tonbent du ciel et touchent le sol.',
  '[{"mot":"étoile","cor":"étoiles","type":"pluriel"},{"mot":"tonbent","cor":"tombent","type":"m_mbp"}]');
SELECT public._dictee_add(29, 3, 'base_spatiale',
  'Les robot explorent la planète rouge. Ils envoie des photo a la station spatiale.',
  '[{"mot":"robot","cor":"robots","type":"pluriel"},{"mot":"envoie","cor":"envoient","type":"verbe_ent"},{"mot":"photo","cor":"photos","type":"pluriel"},{"mot":"a","cor":"à","type":"a_a"}]');
SELECT public._dictee_add(30, 3, 'village_breton',
  'Les crêpes sont délicieuse. Grand-mère va en prépare encore pour les voisin ce soir.',
  '[{"mot":"délicieuse","cor":"délicieuses","type":"accord"},{"mot":"prépare","cor":"préparer","type":"e_er_ez"},{"mot":"voisin","cor":"voisins","type":"pluriel"}]');

-- --- NIVEAU 4 (saisie libre ; nombre NON annonce ; souvent subtil) -------
SELECT public._dictee_add(31, 4, 'ecole',
  'Pendant la récréation, les enfants jouent ensemble. Ils ce racontent des histoires drôles.',
  '[{"mot":"ce","cor":"se","type":"ce_se"}]');
SELECT public._dictee_add(32, 4, 'maison',
  'Le soir, toute la famille se retrouve a table. On parle de notre journée et on rit.',
  '[{"mot":"a","cor":"à","type":"a_a"}]');
SELECT public._dictee_add(33, 4, 'nature',
  'Au printemps, les abeilles butinent les fleurs. Elles rapportent le pollen dans leur ruche doré.',
  '[{"mot":"doré","cor":"dorée","type":"accord"}]');
SELECT public._dictee_add(34, 4, 'ile_tropicale',
  'La mer est calme ce matin. Les dauphins sautent hors de l''eau et son suivis par les oiseaux.',
  '[{"mot":"son","cor":"sont","type":"son_sont"}]');
SELECT public._dictee_add(35, 4, 'vallee_dinosaures',
  'Le petit dinosaure cherche sa maman. Il la retrouve près du lac et ils mangent des feuilles tendre.',
  '[{"mot":"tendre","cor":"tendres","type":"accord"}]');
SELECT public._dictee_add(36, 4, 'royaume_enchante',
  'Le magicien prépare une potion étrange. Il mélange des plantes, de l''eau et des poudre colorées avec soin.',
  '[{"mot":"poudre","cor":"poudres","type":"pluriel"}]');
SELECT public._dictee_add(37, 4, 'base_spatiale',
  'Les scientifiques observent une comète. Elle passe vite et inpressionne tout le monde a la station.',
  '[{"mot":"inpressionne","cor":"impressionne","type":"m_mbp"},{"mot":"a","cor":"à","type":"a_a"}]');
SELECT public._dictee_add(38, 4, 'sport',
  'Le coureur arrive le premier. La foule applaudit et crie son nom. Il lève les bras, heureux et fière de lui.',
  '[{"mot":"fière","cor":"fier","type":"accord"}]');
SELECT public._dictee_add(39, 4, 'village_gourmand',
  'Au marché, les odeurs sont délicieuses. Le pâtissier dispose ces gâteaux et les client se pressent pour mangé les tartes.',
  '[{"mot":"ces","cor":"ses","type":"ces_ses"},{"mot":"client","cor":"clients","type":"pluriel"},{"mot":"mangé","cor":"manger","type":"e_er_ez"}]');
SELECT public._dictee_add(40, 4, 'animaux',
  'Dans la ferme, le fermier nourrit ses animaux. Les poules picorent et les vaches broutent. Tout le monde et calme ce matin.',
  '[{"mot":"et","occ":2,"cor":"est","type":"et_est"}]');

DROP FUNCTION public._dictee_add(integer, integer, text, text, jsonb);

-- =========================================================================
-- 5. dictee_charger_tous : expose au client les MOTS AFFICHES + le nombre
--    d'erreurs (jamais les positions/corrections/types). SECURITY DEFINER pour
--    compter dans dictee_erreur sans accorder de droit de lecture a l'API.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.dictee_charger_tous()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', t.id,
        'niveau', t.niveau,
        'theme', t.theme,
        'mots', to_jsonb(regexp_split_to_array(btrim(t.texte), '\s+')),
        'nb_erreurs', (SELECT count(*) FROM public.dictee_erreur e WHERE e.texte_id = t.id)
      ) ORDER BY t.niveau, t.id), '[]'::jsonb)
    FROM public.dictee_texte t;
$$;
REVOKE EXECUTE ON FUNCTION public.dictee_charger_tous() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.dictee_charger_tous() TO authenticated;

-- =========================================================================
-- 6. verif_dictee : compare les reponses de l'enfant aux erreurs plantees.
--    p_reponses = [{"pos":int,"cor":text?}, ...]. Correction normalisee,
--    ACCENTS EXIGES. SECURITY INVOKER : appelee uniquement depuis
--    enregistrer_reponse (SECURITY DEFINER) -> lit dictee_erreur en tant que
--    proprietaire. REVOQUEE cote API (le client ne l'appelle jamais).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_dictee(
    p_texte integer, p_niveau integer, p_reponses jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE
    v_nb        integer;
    v_trouvees  integer;
    v_corrigees integer;
    v_erreurs   jsonb;
    v_type      text;
    v_fa        integer[];
    v_juste     boolean;
BEGIN
    IF p_reponses IS NULL OR jsonb_typeof(p_reponses) <> 'array' THEN
        p_reponses := '[]'::jsonb;
    END IF;

    WITH rep AS (
        SELECT (r->>'pos')::integer AS pos,
               NULLIF(btrim(COALESCE(r->>'cor','')), '') AS cor
          FROM jsonb_array_elements(p_reponses) r
         WHERE (r->>'pos') ~ '^[0-9]+$'
    ),
    rep_d AS (
        SELECT pos, (array_agg(cor))[1] AS cor FROM rep GROUP BY pos
    ),
    err AS (
        SELECT position, faute, correction, type
          FROM public.dictee_erreur WHERE texte_id = p_texte
    ),
    joined AS (
        SELECT e.position, e.faute, e.correction, e.type,
               (rd.pos IS NOT NULL) AS trouvee,
               rd.cor AS cor_saisie,
               CASE WHEN rd.pos IS NULL THEN false
                    WHEN p_niveau <= 1 THEN true
                    ELSE public.normaliser_mot(COALESCE(rd.cor,'')) = public.normaliser_mot(e.correction)
               END AS correction_ok
          FROM err e LEFT JOIN rep_d rd ON rd.pos = e.position
    )
    SELECT count(*),
           count(*) FILTER (WHERE trouvee),
           count(*) FILTER (WHERE correction_ok),
           COALESCE(jsonb_agg(jsonb_build_object(
               'position', position, 'faute', faute, 'correction', correction,
               'type', type, 'trouvee', trouvee, 'correction_ok', correction_ok,
               'cor_saisie', cor_saisie) ORDER BY position), '[]'::jsonb),
           (SELECT j2.type FROM joined j2
             WHERE (NOT j2.trouvee) OR (NOT j2.correction_ok)
             ORDER BY (CASE WHEN NOT j2.trouvee THEN 0 ELSE 1 END), j2.position
             LIMIT 1)
      INTO v_nb, v_trouvees, v_corrigees, v_erreurs, v_type
      FROM joined;

    SELECT array_agg(pos ORDER BY pos) INTO v_fa
      FROM (SELECT DISTINCT (r->>'pos')::integer AS pos
              FROM jsonb_array_elements(p_reponses) r
             WHERE (r->>'pos') ~ '^[0-9]+$') q
     WHERE pos NOT IN (SELECT position FROM public.dictee_erreur WHERE texte_id = p_texte);
    v_fa := COALESCE(v_fa, ARRAY[]::integer[]);

    v_juste := (v_trouvees = v_nb)
               AND (p_niveau <= 1 OR v_corrigees = v_nb)
               AND (array_length(v_fa, 1) IS NULL);
    IF v_juste THEN v_type := NULL; END IF;

    RETURN jsonb_build_object(
        'juste', v_juste,
        'niveau', p_niveau,
        'nb_erreurs', v_nb,
        'trouvees', v_trouvees,
        'corrigees', v_corrigees,
        'fausses_alertes', to_jsonb(v_fa),
        'type_dominant', v_type,
        'erreurs', v_erreurs);
END $$;
REVOKE EXECUTE ON FUNCTION public.verif_dictee(integer, integer, jsonb)
    FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 7. Referentiel : competence FR.ORTHO.DETECTIVE (matiere FR), ouverte
--    d'emblee (aucun prerequis), 4 niveaux.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('FR.ORTHO.DETECTIVE', 'FR', 'orthographe', 'Dictée détective', 600, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere = EXCLUDED.matiere, domaine = EXCLUDED.domaine,
    libelle = EXCLUDED.libelle, ordre = EXCLUDED.ordre, nb_niveaux = EXCLUDED.nb_niveaux, actif = true;

-- Methode referencee par exercices.methode (FK vers public.methodes).
INSERT INTO public.methodes (code, libelle) VALUES
    ('orthographe', 'Orthographe : reperer et corriger les erreurs (dictee detective)')
ON CONFLICT (code) DO NOTHING;

-- =========================================================================
-- 8. Exercices de reference (FK pour reponses.exercice_id + progression).
--    exercice_id deterministe = md5('<competence>:<niveau>:dictee').
-- =========================================================================
DO $$
DECLARE
    v_niv integer;
    v_id  uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('FR.ORTHO.DETECTIVE:' || v_niv || ':dictee')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'FR.ORTHO.DETECTIVE', 'dictee', v_niv, 'orthographe', true)
        ON CONFLICT (id) DO UPDATE SET competence = EXCLUDED.competence,
            type = EXCLUDED.type, niveau = EXCLUDED.niveau,
            methode = EXCLUDED.methode, actif = true;
    END LOOP;
END $$;

-- =========================================================================
-- 9. enregistrer_reponse : branche dediee op = 'dictee'. Nouveau parametre
--    p_dictee jsonb (liste {pos, cor?}) a la fin, DEFAULT NULL. Ajouter un
--    parametre CHANGE la signature : on DROP l'ancienne (23 args) pour eviter
--    toute surcharge ambigue (PostgREST), puis on recree et on re-GRANT.
--    p_a = id du texte ; p_niveau = niveau joue.
-- =========================================================================
DROP FUNCTION IF EXISTS public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz,
    text, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.enregistrer_reponse(
    p_id             uuid,
    p_profil         uuid,
    p_seance         uuid,
    p_competence     text,
    p_exercice       uuid,
    p_niveau         integer,
    p_methode        text,
    p_op             text,
    p_a              integer,
    p_b              integer,
    p_reponse        integer,
    p_reste          integer,
    p_fields         integer,
    p_temps_ms       integer,
    p_correction_lue boolean,
    p_rattrapage     boolean,
    p_placement      boolean,
    p_repondu_le     timestamptz,
    p_op2            text DEFAULT NULL,
    p_c              integer DEFAULT NULL,
    p_mode           text DEFAULT 'seance',
    p_reponse_texte  text DEFAULT NULL,
    p_type_faute     text DEFAULT NULL,
    p_dictee         jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer     uuid;
    v_expected  integer;
    v_reste     integer;
    v_correct   boolean;
    v_existe    boolean;
    v_exist_cor boolean;
    v_n         integer;
    v_niv       integer;
    v_mode      text;
    v_type      text;
    v_dictee    jsonb;
    v_tniv      integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    v_mode := COALESCE(p_mode, 'seance');
    IF v_mode NOT IN ('seance', 'defi') THEN
        RAISE EXCEPTION 'mode_inconnu';
    END IF;

    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
    END IF;

    IF v_mode = 'defi' THEN
        SELECT niveau INTO v_niv FROM public.progression
         WHERE profil_id = p_profil AND competence = p_competence;
        IF v_niv IS NULL OR v_niv < 3 THEN
            RAISE EXCEPTION 'defi_non_eligible'
                USING DETAIL = 'le defi ne porte que sur des competences maitrisees (niveau >= 3)';
        END IF;
    END IF;

    SELECT true, correct INTO v_existe, v_exist_cor
      FROM public.reponses WHERE id = p_id;
    IF v_existe THEN
        RETURN jsonb_build_object(
            'ok', true, 'deja', true, 'correct', v_exist_cor,
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
    END IF;

    v_type   := NULLIF(btrim(COALESCE(p_type_faute, '')), '');
    v_dictee := NULL;

    -- Verdict serveur : TEXTE (lettres), CONJUGAISON, DICTEE, ou arithmetique.
    IF p_op = 'lettres' THEN
        IF p_competence <> 'MA.NUM.LIRE_ECRIRE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lettres : competence interdite';
        END IF;
        IF p_a IS NULL OR p_a < 0 OR p_a > 10000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lettres : nombre hors bornes';
        END IF;
        v_correct := public.verif_lettres(p_a, p_reponse_texte);
        v_expected := p_a;
        v_reste := NULL;
    ELSIF p_op = 'conj' THEN
        IF p_competence NOT LIKE 'FR.CONJ.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : competence interdite';
        END IF;
        IF p_op2 IS NULL OR p_a IS NULL OR p_a < 1 OR p_a > 3
           OR p_b IS NULL OR p_b < 1 OR p_b > 6 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : verbe/temps/personne invalides';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.conjugaison
                        WHERE verbe = p_op2 AND temps = p_a AND personne = p_b) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : forme de reference absente';
        END IF;
        v_correct := public.verif_conjugaison(p_op2, p_a, p_b, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'dictee' THEN
        IF p_competence <> 'FR.ORTHO.DETECTIVE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : competence interdite';
        END IF;
        IF p_a IS NULL OR p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : texte/niveau invalides';
        END IF;
        SELECT niveau INTO v_tniv FROM public.dictee_texte WHERE id = p_a;
        IF v_tniv IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : texte absent';
        END IF;
        IF v_tniv <> p_niveau THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : niveau incoherent';
        END IF;
        v_dictee  := public.verif_dictee(p_a, p_niveau, p_dictee);
        v_correct := (v_dictee->>'juste')::boolean;
        v_type    := v_dictee->>'type_dominant';  -- serveur = source de verite
        v_expected := NULL;
        v_reste := NULL;
    ELSE
        SELECT expected, reste INTO v_expected, v_reste
          FROM public.verif_calcul(p_competence, p_niveau, p_op, p_a, p_b, p_op2, p_c);
        v_correct := (p_reponse = v_expected)
                     AND (COALESCE(p_fields, 1) < 2 OR p_reste = v_reste);
    END IF;

    SELECT count(*) INTO v_n FROM public.reponses
     WHERE profil_id = p_profil AND recu_le >= now() - interval '1 minute';
    IF v_n >= public._plafond('reponses_par_minute') THEN
        RAISE EXCEPTION 'plafond_reponses_minute';
    END IF;

    SELECT count(*) INTO v_n FROM public.reponses
     WHERE profil_id = p_profil AND recu_le >= date_trunc('day', now());
    IF v_n >= public._plafond('reponses_par_jour') THEN
        RAISE EXCEPTION 'plafond_reponses_jour';
    END IF;

    INSERT INTO public.reponses (
        id, profil_id, seance_id, competence, exercice_id, niveau, methode,
        correct, temps_ms, aide_utilisee, correction_lue, rattrapage, placement,
        repondu_le, mode, type_faute)
    VALUES (
        p_id, p_profil, p_seance, p_competence, p_exercice, p_niveau, p_methode,
        v_correct, p_temps_ms, false, COALESCE(p_correction_lue, false),
        COALESCE(p_rattrapage, false), COALESCE(p_placement, false),
        COALESCE(p_repondu_le, now()), v_mode, v_type);

    RETURN jsonb_build_object(
        'ok', true, 'deja', false,
        'correct', v_correct,
        'reponse_attendue', v_expected,
        'reste_attendu', v_reste,
        'dictee', v_dictee,
        'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'ok', true, 'deja', true,
            'correct', (SELECT correct FROM public.reponses WHERE id = p_id),
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
END;
$$;

REVOKE ALL ON FUNCTION public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz,
    text, integer, text, text, text, jsonb)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz,
    text, integer, text, text, text, jsonb)
    TO authenticated;

-- =========================================================================
-- 10. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0032_francais_dictee_detective')
ON CONFLICT (version) DO NOTHING;
