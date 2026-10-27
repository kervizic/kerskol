-- 0130_maison_des_jeux.sql
-- MAISON DES JEUX : un nouveau lieu de l'appli enfant, avec un premier jeu
-- « Relie les fruits » (puzzle type Numberlink, libre de droits).
--
-- Economie (reutilise la monnaie existante profils.monnaie, geree par le
-- serveur via le marqueur transactionnel 'kerskol.calcul') :
--   * une partie = UNE grille = PRIX_PARTIE bonbons (config 'jeu_prix_partie') ;
--   * debit ATOMIQUE cote serveur, JAMAIS de solde negatif (UPDATE conditionnel
--     + contrainte CHECK monnaie >= 0 en filet) ;
--   * les jeux DEPENSENT des bonbons, ils n'en creditent pas.
--
-- Progression adaptative : on journalise chaque grille terminee (palier, temps
-- mesure discretement, indice, abandon, reussite). Le palier courant et les
-- cibles de temps sont DERIVES de cet historique cote client (logique pure
-- testee : frontend/src/domain/jeux/difficulte.ts) et restent visibles dans
-- l'espace parent (lecture seule).
--
-- Additive et idempotente. Aucune donnee existante modifiee.

-- =========================================================================
-- 1. Prix d'une partie (config anti-abus reglable). Defaut 10 bonbons.
-- =========================================================================
INSERT INTO public.anti_abus_config (cle, valeur, description) VALUES
    ('jeu_prix_partie', 10, 'Prix en bonbons d''une partie (une grille) dans la Maison des jeux.')
ON CONFLICT (cle) DO NOTHING;

-- =========================================================================
-- 2. Journal des parties de jeu (une ligne par grille terminee).
--    Ecrit uniquement par jeu_terminer (SECURITY DEFINER) ; lecture seule API.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.jeu_parties (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    profil_id   uuid        NOT NULL REFERENCES public.profils (id) ON DELETE CASCADE,
    jeu         text        NOT NULL,
    palier      integer     NOT NULL,
    grille_id   text        NOT NULL,
    temps_ms    integer     NOT NULL DEFAULT 0,
    avec_indice boolean     NOT NULL DEFAULT false,
    abandon     boolean     NOT NULL DEFAULT false,
    reussi      boolean     NOT NULL DEFAULT false,
    cree_le     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT jeu_parties_palier_chk CHECK (palier BETWEEN 1 AND 5),
    CONSTRAINT jeu_parties_temps_chk  CHECK (temps_ms >= 0)
);
CREATE INDEX IF NOT EXISTS jeu_parties_profil_jeu_idx
    ON public.jeu_parties (profil_id, jeu, cree_le);

ALTER TABLE public.jeu_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jeu_parties FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jeu_parties_select ON public.jeu_parties;
CREATE POLICY jeu_parties_select ON public.jeu_parties
    FOR SELECT TO authenticated USING (public.peut_acceder_profil(profil_id));
REVOKE ALL ON public.jeu_parties FROM anon, authenticated;
GRANT SELECT ON public.jeu_parties TO authenticated;

-- =========================================================================
-- 3. jeu_jouer : debite le prix d'une partie, ATOMIQUE, sans solde negatif.
--    Renvoie le nouveau solde. Leve 'pas_assez_de_bonbons' si insuffisant.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.jeu_jouer(p_profil uuid, p_jeu text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_prix    integer;
    v_monnaie integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    IF p_jeu IS NULL OR length(btrim(p_jeu)) = 0 THEN
        RAISE EXCEPTION 'jeu_requis';
    END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
    END IF;

    v_prix := public._plafond('jeu_prix_partie');

    -- Debit atomique : l'UPDATE ne touche la ligne que si le solde suffit
    -- (verrou de ligne implicite). Le marqueur autorise l'ecriture de monnaie.
    PERFORM set_config('kerskol.calcul', 'on', true);
    UPDATE public.profils
       SET monnaie = monnaie - v_prix
     WHERE id = p_profil AND monnaie >= v_prix
     RETURNING monnaie INTO v_monnaie;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'pas_assez_de_bonbons'
            USING HINT = 'Il te faut plus de bonbons pour jouer.';
    END IF;

    RETURN jsonb_build_object('ok', true, 'prix', v_prix, 'monnaie', v_monnaie);
END;
$$;
REVOKE ALL ON FUNCTION public.jeu_jouer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jeu_jouer(uuid, text) TO authenticated;

-- =========================================================================
-- 4. jeu_terminer : journalise une grille terminee (progression + temps).
--    N'a AUCUN effet sur la monnaie (le debit a eu lieu a jeu_jouer).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.jeu_terminer(
    p_profil      uuid,
    p_jeu         text,
    p_palier      integer,
    p_grille_id   text,
    p_temps_ms    integer,
    p_avec_indice boolean,
    p_abandon     boolean,
    p_reussi      boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_temps integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    IF p_jeu IS NULL OR length(btrim(p_jeu)) = 0 THEN
        RAISE EXCEPTION 'jeu_requis';
    END IF;
    IF p_palier IS NULL OR p_palier < 1 OR p_palier > 5 THEN
        RAISE EXCEPTION 'palier_invalide';
    END IF;
    IF p_grille_id IS NULL OR length(btrim(p_grille_id)) = 0 THEN
        RAISE EXCEPTION 'grille_requise';
    END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
    END IF;

    -- Temps borne (anti-abus doux) : [0, 1 heure].
    v_temps := least(greatest(COALESCE(p_temps_ms, 0), 0), 3_600_000);

    INSERT INTO public.jeu_parties (
        profil_id, jeu, palier, grille_id, temps_ms, avec_indice, abandon, reussi)
    VALUES (
        p_profil, p_jeu, p_palier, p_grille_id, v_temps,
        COALESCE(p_avec_indice, false), COALESCE(p_abandon, false), COALESCE(p_reussi, false));

    RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.jeu_terminer(uuid, text, integer, text, integer, boolean, boolean, boolean)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jeu_terminer(uuid, text, integer, text, integer, boolean, boolean, boolean)
    TO authenticated;

-- =========================================================================
-- 5. effacer_progression : purge AUSSI l'historique de jeu (coherence quand un
--    parent remet un profil a zero). Corps identique a 0017 + la purge jeu.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.effacer_progression(p_profil uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.est_parent_du_foyer(v_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;
    IF NOT public._reauth_recente() THEN
        RAISE EXCEPTION 'reauth_requise';
    END IF;

    DELETE FROM public.reponses     WHERE profil_id = p_profil;
    DELETE FROM public.seances      WHERE profil_id = p_profil;
    DELETE FROM public.progression  WHERE profil_id = p_profil;
    DELETE FROM public.jeu_parties  WHERE profil_id = p_profil;

    PERFORM set_config('kerskol.calcul', 'on', true);  -- remise a zero de confiance
    UPDATE public.profils SET monnaie = 0 WHERE id = p_profil;
END;
$$;
REVOKE ALL ON FUNCTION public.effacer_progression(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.effacer_progression(uuid) TO authenticated;

-- =========================================================================
-- 6. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0130_maison_des_jeux')
ON CONFLICT (version) DO NOTHING;
