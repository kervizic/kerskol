-- 0051_ce2_restes_audit.sql
-- Petits restes de l'audit CE2 (lot separe). Migration ADDITIVE et IDEMPOTENTE,
-- aucune reinitialisation des niveaux d'Iris :
--
--   1. CONJUGAISON : ajout du verbe « finir » (2e groupe) aux temps simples
--      (present, futur, imparfait). Miroir EXACT de frontend/.../conjugaison.ts.
--   2. NUMERATION : la droite graduee de MA.NUM.SUITE monte jusqu'a 10 000
--      (N4 passe d'un exercice « bonds » - deja present au N2 - a une droite
--      graduee de 0 a 10 000, pas de 1000). Miroir de seedSources.ts et de 0023.
--   3. DICTEE DETECTIVE : deux nouvelles notions d'homophones, la / la et ou / ou
--      (accents), avec leurs textes (>= 2 par notion) et leurs fautes plantees.

-- =========================================================================
-- 1. CONJUGAISON : verbe « finir » (2e groupe), temps simples.
--    temps : 1=present, 2=futur, 3=imparfait ; personne : 1..6.
-- =========================================================================
INSERT INTO public.conjugaison (verbe, temps, personne, forme) VALUES
    ('finir', 1, 1, 'finis'),      ('finir', 1, 2, 'finis'),      ('finir', 1, 3, 'finit'),
    ('finir', 1, 4, 'finissons'),  ('finir', 1, 5, 'finissez'),   ('finir', 1, 6, 'finissent'),
    ('finir', 2, 1, 'finirai'),    ('finir', 2, 2, 'finiras'),    ('finir', 2, 3, 'finira'),
    ('finir', 2, 4, 'finirons'),   ('finir', 2, 5, 'finirez'),    ('finir', 2, 6, 'finiront'),
    ('finir', 3, 1, 'finissais'),  ('finir', 3, 2, 'finissais'),  ('finir', 3, 3, 'finissait'),
    ('finir', 3, 4, 'finissions'), ('finir', 3, 5, 'finissiez'),  ('finir', 3, 6, 'finissaient')
ON CONFLICT (verbe, temps, personne) DO UPDATE SET forme = EXCLUDED.forme;

-- =========================================================================
-- 2. NUMERATION : droite graduee jusqu'a 10 000 (MA.NUM.SUITE N4).
--    id deterministe de l'exercice = md5('<competence>:<niveau>:calcul').
-- =========================================================================
DO $num$
DECLARE v_id uuid := md5('MA.NUM.SUITE:4:calcul')::uuid;
BEGIN
    UPDATE public.exercices SET methode = 'plateau_lineaire', actif = true WHERE id = v_id;
    UPDATE public.ex_calcul SET
        operation = 'encadrer', forme = 'encadrement', support_visuel = 'aucun',
        correction_strategie = 'droite_graduee',
        params = '{"type":"droite","step":1000,"intervalles":10,"max":10000}'::jsonb
      WHERE exercice_id = v_id;
END $num$;

-- =========================================================================
-- 3. DICTEE DETECTIVE : homophones la / la et ou / ou.
-- =========================================================================
-- 3a. Autoriser les deux nouveaux types d'erreur.
ALTER TABLE public.dictee_erreur DROP CONSTRAINT IF EXISTS dictee_erreur_type_chk;
ALTER TABLE public.dictee_erreur ADD CONSTRAINT dictee_erreur_type_chk CHECK (type IN (
    'a_a','et_est','son_sont','on_ont','ces_ses','ce_se',
    'pluriel','pluriel_al_aux','accord','verbe_ent','m_mbp','e_er_ez',
    'la_la','ou_ou'));

-- 3b. Deux nouvelles notions, a la suite de la progression.
INSERT INTO public.dictee_notion (code, ordre, prerequis, libelle) VALUES
    ('la_la', 13, 'e_er_ez', 'la / là'),
    ('ou_ou', 14, 'la_la',   'ou / où')
ON CONFLICT (code) DO UPDATE SET ordre = EXCLUDED.ordre,
    prerequis = EXCLUDED.prerequis, libelle = EXCLUDED.libelle;

-- 3c. Helper de seed (recree ici, droppe en fin ; identique a 0035).
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

-- 3d. Textes (ids 161..164, >= 2 par notion), fautes plantees sur l'homophone.
--     « là » = l'endroit (ici, la-bas) ; « la » = article / « la chatte ».
--     « où » = le lieu (le moment) ; « ou » = ou bien.
SELECT public._dictee_add(161, 2, 'la_la', 'maison',
    'La chatte dort la, sur le tapis.',
    '[{"mot":"la","occ":2,"cor":"là","type":"la_la"}]'::jsonb);
SELECT public._dictee_add(162, 3, 'la_la', 'ecole',
    'Pose ton cartable la, près de la porte.',
    '[{"mot":"la","occ":1,"cor":"là","type":"la_la"}]'::jsonb);
SELECT public._dictee_add(163, 2, 'ou_ou', 'nature',
    'Je ne sais pas ou est le nid.',
    '[{"mot":"ou","occ":1,"cor":"où","type":"ou_ou"}]'::jsonb);
SELECT public._dictee_add(164, 3, 'ou_ou', 'village_breton',
    'Dis-moi ou tu as mis les clés.',
    '[{"mot":"ou","occ":1,"cor":"où","type":"ou_ou"}]'::jsonb);

DROP FUNCTION IF EXISTS public._dictee_add(integer, integer, text, text, text, jsonb);

-- =========================================================================
-- 4. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0051_ce2_restes_audit')
ON CONFLICT (version) DO NOTHING;
