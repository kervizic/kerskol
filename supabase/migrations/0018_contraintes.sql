-- 0018_contraintes.sql
-- Contraintes d'integrite (suite a l'audit). Les CHECK sont poses NOT VALID :
-- ils s'appliquent a toute INSERT/UPDATE future SANS rejouer la validation sur
-- les lignes reelles existantes (aucune donnee reelle touchee).
--
--   * profils.avatar : <= 4 Ko, style dans la liste (ou ancien format "forme"),
--     couleur dans la palette des 8.
--   * reponses : niveau 1..4, temps_ms NULL ou 0..600000 ms.
--   * profils : limite_jour_min NULL ou 5..600 ; limite_semaine_min NULL ou 5..3000.
--   * profils.matieres_actives : sous-ensemble des codes de public.matieres (trigger).
--   * classe : deja contrainte (0010).
--
-- Idempotent.

-- =========================================================================
-- 1. avatar : taille + style + couleur
-- =========================================================================
ALTER TABLE public.profils DROP CONSTRAINT IF EXISTS profils_avatar_chk;
ALTER TABLE public.profils ADD  CONSTRAINT profils_avatar_chk CHECK (
    char_length(avatar::text) <= 4096
    AND (
        avatar = '{}'::jsonb
        OR (avatar ? 'style' AND avatar ->> 'style' IN ('adventurer', 'funEmoji', 'pixelArt'))
        OR (avatar ? 'forme')
    )
    AND (
        NOT (avatar ? 'couleur')
        OR avatar ->> 'couleur' IN (
            '#E06A00', '#2F855A', '#3182CE', '#805AD5',
            '#D53F8C', '#00838F', '#B7791F', '#5A67D8'
        )
    )
) NOT VALID;

-- =========================================================================
-- 2. reponses : niveau + temps_ms bornes
-- =========================================================================
ALTER TABLE public.reponses DROP CONSTRAINT IF EXISTS reponses_niveau_chk;
ALTER TABLE public.reponses ADD  CONSTRAINT reponses_niveau_chk
    CHECK (niveau BETWEEN 1 AND 4) NOT VALID;

ALTER TABLE public.reponses DROP CONSTRAINT IF EXISTS reponses_temps_ms_chk;
ALTER TABLE public.reponses ADD  CONSTRAINT reponses_temps_ms_chk
    CHECK (temps_ms IS NULL OR temps_ms BETWEEN 0 AND 600000) NOT VALID;

-- =========================================================================
-- 3. profils : limites de temps bornees
-- =========================================================================
ALTER TABLE public.profils DROP CONSTRAINT IF EXISTS profils_limite_jour_chk;
ALTER TABLE public.profils ADD  CONSTRAINT profils_limite_jour_chk
    CHECK (limite_jour_min IS NULL OR limite_jour_min BETWEEN 5 AND 600) NOT VALID;

ALTER TABLE public.profils DROP CONSTRAINT IF EXISTS profils_limite_semaine_chk;
ALTER TABLE public.profils ADD  CONSTRAINT profils_limite_semaine_chk
    CHECK (limite_semaine_min IS NULL OR limite_semaine_min BETWEEN 5 AND 3000) NOT VALID;

-- =========================================================================
-- 4. matieres_actives : sous-ensemble des codes de public.matieres (trigger,
--    car un CHECK ne peut pas interroger une autre table).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_profils_matieres_valides()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.matieres_actives IS NULL OR array_length(NEW.matieres_actives, 1) IS NULL THEN
        RAISE EXCEPTION 'matieres_actives_vide';
    END IF;
    IF EXISTS (
        SELECT 1 FROM unnest(NEW.matieres_actives) AS mc
         WHERE NOT EXISTS (SELECT 1 FROM public.matieres m WHERE m.code = mc)
    ) THEN
        RAISE EXCEPTION 'matieres_inconnues'
            USING HINT = 'matieres_actives doit referencer des codes existants.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profils_matieres_valides ON public.profils;
CREATE TRIGGER profils_matieres_valides
    BEFORE INSERT OR UPDATE OF matieres_actives ON public.profils
    FOR EACH ROW EXECUTE FUNCTION public.trg_profils_matieres_valides();

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0018_contraintes')
ON CONFLICT (version) DO NOTHING;
