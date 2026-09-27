-- 0005_transparence.sql
-- Transparence familiale : journal des reglages (append-only) et bravos.
--
--   * journal_reglages : trace des changements de reglages "de suivi"
--     (limites de temps, matieres actives, opt-in mails). PAS pour l'univers,
--     l'avatar ou le surnom (gouts de l'enfant, non journalises).
--     Append-only : aucun UPDATE/DELETE possible, meme pour un parent.
--     Alimente par des triggers. Option : si le parent a active les mails,
--     enfilement d'un mail_outbox gabarit 'changement_reglage'.
--   * bravos : petits messages d'encouragement d'un parent a un enfant.
--   * Migration idempotente.

-- =========================================================================
-- 1. journal_reglages
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.journal_reglages (
    id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id  uuid        NOT NULL REFERENCES public.foyers (id) ON DELETE CASCADE,
    profil_id uuid        REFERENCES public.profils (id) ON DELETE SET NULL,
    auteur    uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
    cle       text        NOT NULL,
    ancienne  jsonb,
    nouvelle  jsonb,
    cree_le   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.journal_reglages IS
    'Journal append-only des changements de reglages de suivi (limites, '
    'matieres, opt-in mails). Jamais l''univers/avatar/surnom.';
CREATE INDEX IF NOT EXISTS journal_foyer_idx ON public.journal_reglages (foyer_id, cree_le);

-- =========================================================================
-- 2. bravos
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.bravos (
    id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    profil_id uuid        NOT NULL REFERENCES public.profils (id) ON DELETE CASCADE,
    auteur    uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
    message   text        NOT NULL,
    lu_le     timestamptz,
    cree_le   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bravos_message_len_chk CHECK (char_length(message) BETWEEN 1 AND 140)
);
CREATE INDEX IF NOT EXISTS bravos_profil_idx ON public.bravos (profil_id);

-- =========================================================================
-- 3. Fonction commune de journalisation d'un reglage
-- =========================================================================
CREATE OR REPLACE FUNCTION public._journaliser_reglage(
    p_foyer uuid, p_profil uuid, p_cle text, p_ancienne jsonb, p_nouvelle jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_mails boolean;
BEGIN
    INSERT INTO public.journal_reglages (foyer_id, profil_id, auteur, cle, ancienne, nouvelle)
    VALUES (p_foyer, p_profil, auth.uid(), p_cle, p_ancienne, p_nouvelle);

    -- Option mail : uniquement si l'auteur a active les mails.
    SELECT mails_actives INTO v_mails
      FROM public.parent_preferences WHERE user_id = auth.uid();
    IF coalesce(v_mails, false) THEN
        INSERT INTO public.mail_outbox (user_id, gabarit, parametres)
        VALUES (auth.uid(), 'message_service',
                jsonb_build_object('type', 'changement_reglage',
                                   'cle', p_cle,
                                   'ancienne', p_ancienne,
                                   'nouvelle', p_nouvelle));
    END IF;
END;
$$;

-- =========================================================================
-- 4. Trigger sur profils : journalise limite_jour_min, limite_semaine_min,
--    matieres_actives. Ignore univers, avatar, surnom, monnaie.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_profils_journal()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.limite_jour_min IS DISTINCT FROM OLD.limite_jour_min THEN
        PERFORM public._journaliser_reglage(NEW.foyer_id, NEW.id, 'limite_jour_min',
            to_jsonb(OLD.limite_jour_min), to_jsonb(NEW.limite_jour_min));
    END IF;
    IF NEW.limite_semaine_min IS DISTINCT FROM OLD.limite_semaine_min THEN
        PERFORM public._journaliser_reglage(NEW.foyer_id, NEW.id, 'limite_semaine_min',
            to_jsonb(OLD.limite_semaine_min), to_jsonb(NEW.limite_semaine_min));
    END IF;
    IF NEW.matieres_actives IS DISTINCT FROM OLD.matieres_actives THEN
        PERFORM public._journaliser_reglage(NEW.foyer_id, NEW.id, 'matieres_actives',
            to_jsonb(OLD.matieres_actives), to_jsonb(NEW.matieres_actives));
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profils_journal ON public.profils;
CREATE TRIGGER profils_journal
    AFTER UPDATE ON public.profils
    FOR EACH ROW EXECUTE FUNCTION public.trg_profils_journal();

-- =========================================================================
-- 5. Trigger sur parent_preferences : journalise mails_actives.
--    (foyer resolu via membres_foyer ; profil NULL car reglage du parent.)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_prefs_journal()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer uuid;
BEGIN
    IF NEW.mails_actives IS DISTINCT FROM OLD.mails_actives THEN
        SELECT foyer_id INTO v_foyer
          FROM public.membres_foyer WHERE user_id = NEW.user_id LIMIT 1;
        IF v_foyer IS NOT NULL THEN
            PERFORM public._journaliser_reglage(v_foyer, NULL, 'mails_actives',
                to_jsonb(OLD.mails_actives), to_jsonb(NEW.mails_actives));
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prefs_journal ON public.parent_preferences;
CREATE TRIGGER prefs_journal
    AFTER UPDATE ON public.parent_preferences
    FOR EACH ROW EXECUTE FUNCTION public.trg_prefs_journal();

-- =========================================================================
-- 6. RLS
-- =========================================================================
ALTER TABLE public.journal_reglages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bravos           ENABLE ROW LEVEL SECURITY;

-- journal_reglages : lecture pour les parents du foyer. Aucune ecriture cote
-- API (insertion via triggers en definer). Append-only garanti par l'absence
-- de GRANT INSERT/UPDATE/DELETE et de policies correspondantes.
DROP POLICY IF EXISTS journal_select_parent ON public.journal_reglages;
CREATE POLICY journal_select_parent ON public.journal_reglages
    FOR SELECT TO authenticated USING (public.est_parent_du_foyer(foyer_id));

-- bravos : lecture par toute personne pouvant acceder au profil (enfant + parents),
-- ecriture par les parents du foyer ; l'enfant peut marquer lu_le (update).
DROP POLICY IF EXISTS bravos_select ON public.bravos;
CREATE POLICY bravos_select ON public.bravos
    FOR SELECT TO authenticated USING (public.peut_acceder_profil(profil_id));
DROP POLICY IF EXISTS bravos_insert_parent ON public.bravos;
CREATE POLICY bravos_insert_parent ON public.bravos
    FOR INSERT TO authenticated
    WITH CHECK (public.est_parent_du_foyer(public.foyer_du_profil(profil_id))
                AND auteur = auth.uid());
DROP POLICY IF EXISTS bravos_update_lu ON public.bravos;
CREATE POLICY bravos_update_lu ON public.bravos
    FOR UPDATE TO authenticated
    USING (public.peut_acceder_profil(profil_id))
    WITH CHECK (public.peut_acceder_profil(profil_id));

-- Privileges.
GRANT SELECT                 ON public.journal_reglages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bravos           TO authenticated;

-- =========================================================================
-- 7. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0005_transparence')
ON CONFLICT (version) DO NOTHING;
