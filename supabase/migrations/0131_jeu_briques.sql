-- 0131_jeu_briques.sql
-- Deuxieme jeu de la Maison des jeux : « Les briques » (jeu de blocs qui
-- tombent, type arcade). Reutilise toute l'economie de 0130 (profils.monnaie,
-- jeu_jouer debite PRIX_PARTIE bonbons, jeu_terminer journalise la partie).
--
-- Le schema 0130 supposait implicitement UN SEUL type de jeu (grille « Relie
-- les fruits ») :
--   * palier contraint a 1..5 (les 5 tailles de grille) ;
--   * aucune colonne pour le score / les lignes d'un jeu arcade.
-- On generalise ici, de maniere ADDITIVE et IDEMPOTENTE, sans toucher aux
-- donnees existantes :
--   1. colonnes score / lignes (defaut 0 ; nulles pour les jeux de grille) ;
--   2. palier >= 0 (le palier des briques est une VITESSE qui grandit
--      librement, +1 tous les 5 lignes, et peut depasser 5) ;
--   3. jeu_terminer accepte p_score / p_lignes (defaut 0, retro-compatible).

-- =========================================================================
-- 1. Colonnes score / lignes (jeux arcade). Defaut 0, non nulles.
-- =========================================================================
ALTER TABLE public.jeu_parties
    ADD COLUMN IF NOT EXISTS score  integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lignes integer NOT NULL DEFAULT 0;

ALTER TABLE public.jeu_parties
    DROP CONSTRAINT IF EXISTS jeu_parties_score_chk;
ALTER TABLE public.jeu_parties
    ADD CONSTRAINT jeu_parties_score_chk CHECK (score >= 0 AND lignes >= 0);

-- =========================================================================
-- 2. Palier : plus de borne haute a 5 (les briques montent plus haut). On
--    garde un plancher a 0 (vitesse la plus lente d'une premiere partie).
-- =========================================================================
ALTER TABLE public.jeu_parties
    DROP CONSTRAINT IF EXISTS jeu_parties_palier_chk;
ALTER TABLE public.jeu_parties
    ADD CONSTRAINT jeu_parties_palier_chk CHECK (palier >= 0);

-- =========================================================================
-- 3. jeu_terminer : nouvelle signature avec p_score / p_lignes (defaut 0).
--    On DROP l'ancienne signature (8 args) pour eviter toute ambiguite de
--    surcharge, puis on recree la fonction (10 args, retro-compatible grace
--    aux valeurs par defaut). N'a toujours AUCUN effet sur la monnaie.
-- =========================================================================
DROP FUNCTION IF EXISTS public.jeu_terminer(uuid, text, integer, text, integer, boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION public.jeu_terminer(
    p_profil      uuid,
    p_jeu         text,
    p_palier      integer,
    p_grille_id   text,
    p_temps_ms    integer,
    p_avec_indice boolean,
    p_abandon     boolean,
    p_reussi      boolean,
    p_score       integer DEFAULT 0,
    p_lignes      integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_temps  integer;
    v_score  integer;
    v_lignes integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    IF p_jeu IS NULL OR length(btrim(p_jeu)) = 0 THEN
        RAISE EXCEPTION 'jeu_requis';
    END IF;
    IF p_palier IS NULL OR p_palier < 0 THEN
        RAISE EXCEPTION 'palier_invalide';
    END IF;
    IF p_grille_id IS NULL OR length(btrim(p_grille_id)) = 0 THEN
        RAISE EXCEPTION 'grille_requise';
    END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
    END IF;

    -- Bornes anti-abus douces : temps [0, 1 h], score/lignes >= 0 et plafonnes.
    v_temps  := least(greatest(COALESCE(p_temps_ms, 0), 0), 3_600_000);
    v_score  := least(greatest(COALESCE(p_score, 0), 0), 100_000_000);
    v_lignes := least(greatest(COALESCE(p_lignes, 0), 0), 1_000_000);

    INSERT INTO public.jeu_parties (
        profil_id, jeu, palier, grille_id, temps_ms, avec_indice, abandon, reussi, score, lignes)
    VALUES (
        p_profil, p_jeu, p_palier, p_grille_id, v_temps,
        COALESCE(p_avec_indice, false), COALESCE(p_abandon, false), COALESCE(p_reussi, false),
        v_score, v_lignes);

    RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.jeu_terminer(uuid, text, integer, text, integer, boolean, boolean, boolean, integer, integer)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jeu_terminer(uuid, text, integer, text, integer, boolean, boolean, boolean, integer, integer)
    TO authenticated;

-- =========================================================================
-- 4. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0131_jeu_briques')
ON CONFLICT (version) DO NOTHING;
