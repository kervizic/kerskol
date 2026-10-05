-- 0034_francais_dictee_ciblage.sql
-- CIBLAGE de la dictee detective PAR NIVEAU (aucune logique de calendrier).
-- Decision de Manu : on n'est pas un prof mais une app ; comme en maths, chaque
-- notion a son propre suivi (escalier) et l'enfant avance aussi vite que son
-- niveau le permet. Pas de date, pas de semaine, pas de rentree.
--
-- Trois apports :
--   1. dictee_vu : les derniers textes faits (anti-repetition, par COMPTE et non
--      par date) ;
--   2. dictee_notion_suivi : par (profil, notion), la SERIE de reussites
--      consecutives (escalier), le total de reussites et d'echecs -> maitrise ;
--   3. dictee_enregistrer(profil, texte, correct) : appelee apres le verdict
--      serveur ; marque le texte vu et met a jour le suivi de sa notion ;
--      dictee_contexte(profil) : expose au client l'ordre des notions, la
--      maitrise et les lacunes par notion, et les derniers textes vus.
--
-- Le CHOIX du texte est une fonction PURE cote client (choisirTexteDictee, testee
-- en vitest) : lacunes d'abord, puis 1re notion non maitrisee dans l'ordre, puis
-- revision ; jamais le meme texte recemment. Aucune notion n'est verrouillee par
-- le temps.
--
-- Migration ADDITIVE et idempotente : aucune donnee utilisateur modifiee.

-- =========================================================================
-- 1. Textes VUS recemment (anti-repetition). Propre a chaque profil. On lit les
--    N derniers (par vu_le), jamais une fenetre de dates.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.dictee_vu (
    profil_id uuid        NOT NULL REFERENCES public.profils(id)      ON DELETE CASCADE,
    texte_id  integer     NOT NULL REFERENCES public.dictee_texte(id) ON DELETE CASCADE,
    vu_le     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (profil_id, texte_id)
);
COMMENT ON TABLE public.dictee_vu IS
    'Derniers textes de dictee faits par profil (anti-repetition, par compte).';

ALTER TABLE public.dictee_vu ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dictee_vu_select ON public.dictee_vu;
CREATE POLICY dictee_vu_select ON public.dictee_vu
    FOR SELECT TO authenticated USING (public.peut_acceder_profil(profil_id));
GRANT SELECT ON public.dictee_vu TO authenticated;

-- =========================================================================
-- 2. Suivi par NOTION (escalier, comme en maths). serie = reussites
--    consecutives (remise a 0 a chaque echec) ; maitrise = serie >= 2.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.dictee_notion_suivi (
    profil_id uuid        NOT NULL REFERENCES public.profils(id) ON DELETE CASCADE,
    notion    text        NOT NULL,
    serie     integer     NOT NULL DEFAULT 0,
    reussites integer     NOT NULL DEFAULT 0,
    echecs    integer     NOT NULL DEFAULT 0,
    maj_le    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (profil_id, notion)
);
COMMENT ON TABLE public.dictee_notion_suivi IS
    'Suivi par (profil, notion) : serie de reussites consecutives (escalier), '
    'totaux. Aucun verrou temporel : progression par niveau.';

ALTER TABLE public.dictee_notion_suivi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dictee_notion_suivi_select ON public.dictee_notion_suivi;
CREATE POLICY dictee_notion_suivi_select ON public.dictee_notion_suivi
    FOR SELECT TO authenticated USING (public.peut_acceder_profil(profil_id));
GRANT SELECT ON public.dictee_notion_suivi TO authenticated;

-- =========================================================================
-- 3. dictee_enregistrer : marque le texte vu + met a jour le suivi de sa notion.
--    Appelee par le client APRES le verdict serveur (il connait correct + texte).
--    Le verdict lui-meme reste juge par enregistrer_reponse/verif_dictee.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.dictee_enregistrer(
    p_profil uuid, p_texte integer, p_correct boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
    v_notion text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
    END IF;

    SELECT notion INTO v_notion FROM public.dictee_texte WHERE id = p_texte;
    IF v_notion IS NULL THEN
        RETURN;  -- texte inconnu ou non rattache : no-op silencieux
    END IF;

    INSERT INTO public.dictee_vu (profil_id, texte_id, vu_le)
    VALUES (p_profil, p_texte, now())
    ON CONFLICT (profil_id, texte_id) DO UPDATE SET vu_le = now();

    INSERT INTO public.dictee_notion_suivi (profil_id, notion, serie, reussites, echecs, maj_le)
    VALUES (p_profil, v_notion,
            CASE WHEN p_correct THEN 1 ELSE 0 END,
            CASE WHEN p_correct THEN 1 ELSE 0 END,
            CASE WHEN p_correct THEN 0 ELSE 1 END,
            now())
    ON CONFLICT (profil_id, notion) DO UPDATE SET
        serie     = CASE WHEN p_correct THEN public.dictee_notion_suivi.serie + 1 ELSE 0 END,
        reussites = public.dictee_notion_suivi.reussites + CASE WHEN p_correct THEN 1 ELSE 0 END,
        echecs    = public.dictee_notion_suivi.echecs    + CASE WHEN p_correct THEN 0 ELSE 1 END,
        maj_le    = now();
END $$;
REVOKE EXECUTE ON FUNCTION public.dictee_enregistrer(uuid, integer, boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.dictee_enregistrer(uuid, integer, boolean) TO authenticated;

-- =========================================================================
-- 4. dictee_contexte : pour un profil, expose au client de quoi CHOISIR le texte
--    (ordre des notions, maitrise, lacunes, derniers textes vus). Aucune date.
--      * maitrise[notion]  = (serie >= 2) ;
--      * lacunes[notion]   = echecs quand serie = 0 et echecs > 0 (notion en
--                            difficulte, a revoir en priorite) ;
--      * ordre             = codes des notions dans l'ordre de presentation ;
--      * vus               = 10 derniers textes faits (anti-repetition).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.dictee_contexte(p_profil uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
    v_ordre    jsonb;
    v_maitrise jsonb;
    v_lacunes  jsonb;
    v_vus      integer[];
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
    END IF;

    SELECT COALESCE(jsonb_agg(code ORDER BY ordre), '[]'::jsonb) INTO v_ordre
      FROM public.dictee_notion;

    SELECT COALESCE(jsonb_object_agg(notion, serie >= 2), '{}'::jsonb) INTO v_maitrise
      FROM public.dictee_notion_suivi WHERE profil_id = p_profil;

    SELECT COALESCE(jsonb_object_agg(notion, echecs), '{}'::jsonb) INTO v_lacunes
      FROM public.dictee_notion_suivi
     WHERE profil_id = p_profil AND serie = 0 AND echecs > 0;

    SELECT COALESCE(array_agg(texte_id), ARRAY[]::integer[]) INTO v_vus
      FROM (SELECT texte_id FROM public.dictee_vu
             WHERE profil_id = p_profil ORDER BY vu_le DESC LIMIT 10) q;

    RETURN jsonb_build_object(
        'ordre', v_ordre,
        'maitrise', v_maitrise,
        'lacunes', v_lacunes,
        'vus', to_jsonb(v_vus));
END $$;
REVOKE EXECUTE ON FUNCTION public.dictee_contexte(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.dictee_contexte(uuid) TO authenticated;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0034_francais_dictee_ciblage')
ON CONFLICT (version) DO NOTHING;
