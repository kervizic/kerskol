-- 0017_droits_lockdown.sql
-- Verrouillage fin des droits (suite a l'audit).
--
--   * schema_migrations : RLS + fermeture totale a anon/authenticated.
--   * placement_depart : fermeture a anon (lecture authenticated conservee).
--   * TRUNCATE retire a anon/authenticated sur tout le schema public.
--   * EXECUTE retire a PUBLIC/anon/authenticated sur TOUTES les fonctions, puis
--     re-accorde aux seules RPC voulues + aux 3 helpers utilises dans les policies
--     RLS (est_parent_du_foyer, foyer_du_profil, peut_acceder_profil).
--   * bravos : UPDATE limite a la seule colonne lu_le.
--   * profils.monnaie : non modifiable via l'API (seuls les triggers serveur, via
--     le marqueur transactionnel kerskol.calcul).
--   * (niveau/progression : deja en lecture seule via 0007.)
--
-- Idempotent.

-- =========================================================================
-- 1. schema_migrations : ferme a l'API (lu par deploy.sh en superuser).
-- =========================================================================
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.schema_migrations FROM anon, authenticated;

-- =========================================================================
-- 2. placement_depart : anon n'a aucun droit (cree apres 0007 -> defaut Supabase).
-- =========================================================================
REVOKE ALL ON public.placement_depart FROM anon;

-- =========================================================================
-- 3. TRUNCATE retire partout pour anon/authenticated.
-- =========================================================================
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- =========================================================================
-- 4. EXECUTE : tout fermer, puis n'ouvrir que l'indispensable.
-- =========================================================================
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Helpers evalues DANS les policies RLS : l'appelant DOIT garder EXECUTE.
GRANT EXECUTE ON FUNCTION public.est_parent_du_foyer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.foyer_du_profil(uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.peut_acceder_profil(uuid) TO authenticated;

-- RPC exposees au front (SECURITY DEFINER), anon exclu.
GRANT EXECUTE ON FUNCTION public.creer_foyer()                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.inviter_parent(uuid, text)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.accepter_invitation(text)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.supprimer_foyer(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.effacer_progression(uuid)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.demander_lien_enfant(uuid, text)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.delier_compte_enfant(uuid)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.statut_lien_enfant()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.valider_lien_enfant(text)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.refuser_lien_enfant()               TO authenticated;

-- =========================================================================
-- 5. bravos : UPDATE limite a lu_le (l'enfant marque "lu", rien d'autre).
-- =========================================================================
REVOKE UPDATE ON public.bravos FROM authenticated;
GRANT UPDATE (lu_le) ON public.bravos TO authenticated;

-- =========================================================================
-- 6. profils.monnaie : non modifiable via l'API (seuls les triggers serveur).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_profils_monnaie_garde()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    IF current_setting('kerskol.calcul', true) = 'on' THEN
        RETURN NEW;  -- ecriture serveur de confiance (credit, remise a zero)
    END IF;
    IF NEW.monnaie IS DISTINCT FROM OLD.monnaie THEN
        RAISE EXCEPTION 'monnaie_non_modifiable'
            USING HINT = 'La monnaie est geree par le serveur uniquement.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profils_monnaie_garde ON public.profils;
CREATE TRIGGER profils_monnaie_garde
    BEFORE UPDATE ON public.profils
    FOR EACH ROW EXECUTE FUNCTION public.trg_profils_monnaie_garde();

-- effacer_progression remet monnaie a 0 : pose le marqueur serveur.
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

    PERFORM set_config('kerskol.calcul', 'on', true);  -- remise a zero de confiance
    UPDATE public.profils SET monnaie = 0 WHERE id = p_profil;
END;
$$;
REVOKE ALL ON FUNCTION public.effacer_progression(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.effacer_progression(uuid) TO authenticated;

-- =========================================================================
-- 7. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0017_droits_lockdown')
ON CONFLICT (version) DO NOTHING;
