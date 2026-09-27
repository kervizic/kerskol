-- 0010_classe.sql
-- Classe scolaire de l'enfant (CP..CM2). Le profil existant recoit CE2.
-- Le changement de classe est JOURNALISE (extension de trg_profils_journal) et
-- horodate (classe_maj_le, pose par un trigger BEFORE). Idempotent.

-- =========================================================================
-- 1. Colonnes
-- =========================================================================
ALTER TABLE public.profils
    ADD COLUMN IF NOT EXISTS classe        text        NOT NULL DEFAULT 'CE2',
    ADD COLUMN IF NOT EXISTS classe_maj_le timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.profils DROP CONSTRAINT IF EXISTS profils_classe_chk;
ALTER TABLE public.profils ADD  CONSTRAINT profils_classe_chk
    CHECK (classe IN ('CP','CE1','CE2','CM1','CM2'));

COMMENT ON COLUMN public.profils.classe IS
    'Classe scolaire (CP..CM2). Le calcul CE2 sert de contenu tant que le '
    'programme de la classe n''est pas disponible (voir docs/pedagogie.md).';

-- =========================================================================
-- 2. classe_maj_le : horodatage du dernier changement de classe (BEFORE UPDATE)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_profils_classe_maj()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.classe IS DISTINCT FROM OLD.classe THEN
        NEW.classe_maj_le := now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profils_classe_maj ON public.profils;
CREATE TRIGGER profils_classe_maj
    BEFORE UPDATE ON public.profils
    FOR EACH ROW EXECUTE FUNCTION public.trg_profils_classe_maj();

-- =========================================================================
-- 3. Journalisation : on etend le trigger de journal (limites + matieres +
--    classe). L'univers/avatar/surnom restent NON journalises.
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
    RETURN NEW;
END;
$$;

-- =========================================================================
-- 4. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0010_classe')
ON CONFLICT (version) DO NOTHING;
