-- 0011_seances_update.sql
-- Le moteur de seance cloture une seance (fin, duree_s, monnaie_gagnee) apres
-- l'avoir creee. La migration 0004 n'autorisait que SELECT + INSERT sur
-- public.seances : on ajoute l'UPDATE, restreint au foyer proprietaire du
-- profil (meme regle que l'insert), et on empeche de changer de profil.

-- Politique UPDATE : lecture et ecriture limitees au profil accessible.
DROP POLICY IF EXISTS seances_update ON public.seances;
CREATE POLICY seances_update ON public.seances
    FOR UPDATE TO authenticated
    USING (public.peut_acceder_profil(profil_id))
    WITH CHECK (public.peut_acceder_profil(profil_id));

-- Empeche de reaffecter une seance a un autre profil (le profil_id est fige).
CREATE OR REPLACE FUNCTION public.trg_seances_profil_fige()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.profil_id <> OLD.profil_id THEN
        RAISE EXCEPTION 'profil_id d''une seance est fige';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seances_profil_fige ON public.seances;
CREATE TRIGGER seances_profil_fige
    BEFORE UPDATE ON public.seances
    FOR EACH ROW EXECUTE FUNCTION public.trg_seances_profil_fige();

GRANT UPDATE ON public.seances TO authenticated;

INSERT INTO public.schema_migrations (version)
VALUES ('0011_seances_update')
ON CONFLICT (version) DO NOTHING;
