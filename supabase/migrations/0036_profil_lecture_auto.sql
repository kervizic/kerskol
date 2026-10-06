-- 0036_profil_lecture_auto.sql
-- Reglage PAR PROFIL enfant : lecture automatique a voix haute des consignes et
-- dictees (voix de synthese). Active par defaut ; desactivable dans l'espace
-- parent. Le changement est JOURNALISE (transparence, comme les autres reglages).
-- Migration ADDITIVE et idempotente ; aucune donnee utilisateur modifiee.

-- =========================================================================
-- 1. Colonne
-- =========================================================================
ALTER TABLE public.profils
    ADD COLUMN IF NOT EXISTS lecture_auto boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profils.lecture_auto IS
    'Lecture auto des consignes/dictees a voix haute (TTS). true par defaut ; '
    'reglage par profil dans l''espace parent. Le bouton haut-parleur reste '
    'toujours disponible independamment de ce reglage.';

-- =========================================================================
-- 2. Journalisation : on etend trg_profils_journal (limites + matieres +
--    classe + lecture_auto). Corps re-declare a l'identique de 0010 + le cas
--    lecture_auto, pour ne rien perdre.
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
    IF NEW.classe IS DISTINCT FROM OLD.classe THEN
        PERFORM public._journaliser_reglage(NEW.foyer_id, NEW.id, 'classe',
            to_jsonb(OLD.classe), to_jsonb(NEW.classe));
    END IF;
    IF NEW.lecture_auto IS DISTINCT FROM OLD.lecture_auto THEN
        PERFORM public._journaliser_reglage(NEW.foyer_id, NEW.id, 'lecture_auto',
            to_jsonb(OLD.lecture_auto), to_jsonb(NEW.lecture_auto));
    END IF;
    RETURN NEW;
END;
$$;

-- =========================================================================
-- 3. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0036_profil_lecture_auto')
ON CONFLICT (version) DO NOTHING;
