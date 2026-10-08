-- 0061_bibliotheque_dictee.sql
-- BIBLIOTHEQUE (domaine public) : extraits courts de dictee detective (CE2),
-- inspires des textes de la bibliotheque (meme vocabulaire, memes themes :
-- la ferme, le chaton, le train, les agneaux, le feu...). Orthographe ACTUELLE
-- (aucun mot trop ancien) ; chaque extrait est rattache a une NOTION existante
-- (migrations 0033-0035) et porte UNE erreur injectee, deterministe.
--
-- Comme toute dictee detective, le texte AFFICHE contient deja la forme fautive ;
-- le serveur (verif_dictee) reste seul juge. La table dictee_erreur n'a aucun
-- droit de lecture cote API. Migration ADDITIVE et idempotente : on n'ajoute que
-- des textes de reference (ids 201..210) ; aucune donnee utilisateur (Iris,
-- foyers) n'est touchee ; le francais n'est active sur aucun profil.
--
-- Notions couvertes : a_a, et_est, pluriel, son_sont, on_ont, verbe_ent, accord,
-- ces_ses, e_er_ez, m_mbp. On ne force aucune notion absente du texte.

-- Helper de seed (recree ici ; droppe en fin de migration). Identique a 0033/0035
-- (positions calculees a partir du mot fautif ; exception si introuvable ou si la
-- correction = la faute).
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

-- a / à
SELECT public._dictee_add(201, 2, 'a_a', 'ferme',
  'Nous allons faire un tour a la ferme. On boit du bon lait tout chaud.',
  '[{"mot":"a","cor":"à","type":"a_a"}]');
-- et / est
SELECT public._dictee_add(202, 2, 'et_est', 'chaton',
  'Le petit chat et déjà ravissant. Il joue avec une boule de papier.',
  '[{"mot":"et","cor":"est","type":"et_est"}]');
-- pluriel des noms
SELECT public._dictee_add(203, 2, 'pluriel', 'ferme',
  'À la ferme, on trait les vache. Le lait est tout chaud.',
  '[{"mot":"vache","cor":"vaches","type":"pluriel"}]');
-- son / sont
SELECT public._dictee_add(204, 2, 'son_sont', 'agneaux',
  'Les trois agneaux son tout petits. Ils dorment près de leur maman.',
  '[{"mot":"son","cor":"sont","type":"son_sont"}]');
-- on / ont
SELECT public._dictee_add(205, 2, 'on_ont', 'train',
  'Les voyageurs on pris le train. Il roule vers les montagnes.',
  '[{"mot":"on","cor":"ont","type":"on_ont"}]');
-- verbe au pluriel (-ent)
SELECT public._dictee_add(206, 3, 'verbe_ent', 'chaton',
  'Les passereaux vole très vite. Le petit chat les regarde par la vitre.',
  '[{"mot":"vole","cor":"volent","type":"verbe_ent"}]');
-- accord du nom et de l'adjectif
SELECT public._dictee_add(207, 3, 'accord', 'foret',
  'Le garde-chasse a une joli maison. Elle est au milieu de la forêt.',
  '[{"mot":"joli","cor":"jolie","type":"accord"}]');
-- ces / ses
SELECT public._dictee_add(208, 3, 'ces_ses', 'brebis',
  'Catherine garde ces trois brebis. Ses agneaux sont tout blancs.',
  '[{"mot":"ces","cor":"ses","type":"ces_ses"}]');
-- é ou -er à la fin du verbe
SELECT public._dictee_add(209, 3, 'e_er_ez', 'ronde',
  'Les petites filles se mettent à dansé une ronde. Elles crient de joie.',
  '[{"mot":"dansé","cor":"danser","type":"e_er_ez"}]');
-- m devant m, b, p
SELECT public._dictee_add(210, 3, 'm_mbp', 'feu',
  'De tenps en temps, le feu crépite dans la cheminée. Les chats le regardent.',
  '[{"mot":"tenps","cor":"temps","type":"m_mbp"}]');

DROP FUNCTION IF EXISTS public._dictee_add(integer, integer, text, text, text, jsonb);
