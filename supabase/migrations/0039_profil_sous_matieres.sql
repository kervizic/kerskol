-- 0039_profil_sous_matieres.sql
-- Reglages MATIERES et SOUS-MATIERES par profil enfant.
--
-- On ETEND le reglage existant (profils.matieres_actives = matieres MA/FR) avec
-- les SOUS-MATIERES = `domaine` de public.competences :
--   * domaines_actifs text[]        : sous-matieres actives (ex. conjugaison,
--                                      numeration, mesures...). Defaut = toutes.
--   * enfant_regle_matieres boolean : le parent laisse-t-il l'enfant choisir ses
--                                      matieres ? Defaut true.
--
-- Une competence est jouable SSI sa matiere est active ET son domaine est actif
-- (filtrage cote client dans composer.ts ; le serveur garantit qu'il reste
-- toujours AU MOINS une sous-matiere jouable).
--
-- Securite :
--   * L'enfant (auth.uid() = profils.user_id, non parent) ne peut PAS modifier
--     ces colonnes en UPDATE direct (garde-fou trg_profils_colonnes_enfant
--     etendu) : il passe par la RPC regler_matieres, qui n'accepte que son propre
--     profil ET seulement si enfant_regle_matieres est actif.
--   * Le parent regle tout (matieres, sous-matieres, autorisation).
--
-- Migration ADDITIVE et idempotente. Aucune donnee reelle modifiee (les colonnes
-- prennent leur valeur par defaut = comportement actuel inchange).

-- =========================================================================
-- 1. Colonnes
-- =========================================================================
ALTER TABLE public.profils
    ADD COLUMN IF NOT EXISTS domaines_actifs text[] NOT NULL DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','fractions','conjugaison','orthographe'
    ]::text[];

ALTER TABLE public.profils
    ADD COLUMN IF NOT EXISTS enfant_regle_matieres boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profils.domaines_actifs IS
    'Sous-matieres actives (= public.competences.domaine). Une competence est '
    'jouable SSI sa matiere (matieres_actives) ET son domaine (ici) sont actifs. '
    'Au moins une sous-matiere jouable est garantie par trigger.';
COMMENT ON COLUMN public.profils.enfant_regle_matieres IS
    'Le parent laisse-t-il l''enfant regler ses matieres ? true par defaut. '
    'Si false, seuls les reglages du parent comptent et la section enfant est '
    'masquee.';

-- =========================================================================
-- 2. Validation : domaines connus + AU MOINS une sous-matiere jouable.
--    Un CHECK ne peut pas interroger public.competences -> trigger.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_profils_domaines_valides()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.domaines_actifs IS NULL OR array_length(NEW.domaines_actifs, 1) IS NULL THEN
        RAISE EXCEPTION 'domaines_actifs_vide';
    END IF;
    -- Chaque domaine doit exister dans le referentiel.
    IF EXISTS (
        SELECT 1 FROM unnest(NEW.domaines_actifs) AS d
         WHERE NOT EXISTS (SELECT 1 FROM public.competences c WHERE c.domaine = d)
    ) THEN
        RAISE EXCEPTION 'domaines_inconnus'
            USING HINT = 'domaines_actifs doit referencer des domaines de competences.';
    END IF;
    -- Au moins une competence jouable : matiere active ET domaine actif.
    IF NOT EXISTS (
        SELECT 1 FROM public.competences c
         WHERE c.actif
           AND c.matiere = ANY (NEW.matieres_actives)
           AND c.domaine = ANY (NEW.domaines_actifs)
    ) THEN
        RAISE EXCEPTION 'aucune_sous_matiere_active'
            USING HINT = 'Il faut laisser au moins une sous-matiere active.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profils_domaines_valides ON public.profils;
CREATE TRIGGER profils_domaines_valides
    BEFORE INSERT OR UPDATE OF matieres_actives, domaines_actifs ON public.profils
    FOR EACH ROW EXECUTE FUNCTION public.trg_profils_domaines_valides();

-- =========================================================================
-- 3. Garde-fou enfant : on AJOUTE domaines_actifs et enfant_regle_matieres a la
--    liste des colonnes qu'un enfant ne peut PAS changer en UPDATE direct.
--    (Reprend 0013 a l'identique + 2 colonnes.) La RPC regler_matieres pose le
--    marqueur kerskol.calcul pour contourner ce garde-fou quand elle a verifie
--    l'autorisation.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_profils_colonnes_enfant()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    IF current_setting('kerskol.calcul', true) = 'on' THEN
        RETURN NEW;
    END IF;

    IF OLD.user_id IS NOT NULL
       AND auth.uid() = OLD.user_id
       AND NOT public.est_parent_du_foyer(OLD.foyer_id)
    THEN
        IF NEW.surnom                IS DISTINCT FROM OLD.surnom
        OR NEW.classe                IS DISTINCT FROM OLD.classe
        OR NEW.matieres_actives      IS DISTINCT FROM OLD.matieres_actives
        OR NEW.domaines_actifs       IS DISTINCT FROM OLD.domaines_actifs
        OR NEW.enfant_regle_matieres IS DISTINCT FROM OLD.enfant_regle_matieres
        OR NEW.limite_jour_min       IS DISTINCT FROM OLD.limite_jour_min
        OR NEW.limite_semaine_min    IS DISTINCT FROM OLD.limite_semaine_min
        OR NEW.foyer_id              IS DISTINCT FROM OLD.foyer_id
        OR NEW.user_id               IS DISTINCT FROM OLD.user_id
        OR NEW.monnaie               IS DISTINCT FROM OLD.monnaie
        THEN
            RAISE EXCEPTION 'colonne_interdite_enfant'
                USING HINT = 'Un enfant ne peut modifier que son univers, son avatar et ses matieres (si le parent l''autorise, via regler_matieres).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- =========================================================================
-- 4. Journalisation : on etend trg_profils_journal avec domaines_actifs et
--    enfant_regle_matieres (reprend 0036 + 2 cas).
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
    IF NEW.domaines_actifs IS DISTINCT FROM OLD.domaines_actifs THEN
        PERFORM public._journaliser_reglage(NEW.foyer_id, NEW.id, 'domaines_actifs',
            to_jsonb(OLD.domaines_actifs), to_jsonb(NEW.domaines_actifs));
    END IF;
    IF NEW.enfant_regle_matieres IS DISTINCT FROM OLD.enfant_regle_matieres THEN
        PERFORM public._journaliser_reglage(NEW.foyer_id, NEW.id, 'enfant_regle_matieres',
            to_jsonb(OLD.enfant_regle_matieres), to_jsonb(NEW.enfant_regle_matieres));
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
-- 5. RPC regler_matieres : regle matieres + sous-matieres d'un profil.
--    Autorisee au PARENT du foyer, OU a l'ENFANT proprietaire du profil SI le
--    parent l'autorise (enfant_regle_matieres). La validation (au moins une
--    sous-matiere jouable) est garantie par le trigger du point 2.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.regler_matieres(
    p_profil   uuid,
    p_matieres text[],
    p_domaines text[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer     uuid;
    v_user      uuid;
    v_autorise  boolean;
    v_uid       uuid := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    SELECT foyer_id, user_id, enfant_regle_matieres
      INTO v_foyer, v_user, v_autorise
      FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;

    -- Parent : toujours autorise. Sinon, l'enfant ne regle QUE son propre profil
    -- et seulement si le parent l'y autorise.
    IF NOT public.est_parent_du_foyer(v_foyer) THEN
        IF v_user IS DISTINCT FROM v_uid THEN
            RAISE EXCEPTION 'acces refuse : ce profil n''est pas le votre';
        END IF;
        IF NOT v_autorise THEN
            RAISE EXCEPTION 'reglage_matieres_desactive'
                USING HINT = 'Le parent n''autorise pas l''enfant a choisir ses matieres.';
        END IF;
    END IF;

    -- Ecriture de confiance : contourne le garde-fou enfant (point 3). La
    -- validation du point 2 s'applique quand meme (au moins une sous-matiere).
    PERFORM set_config('kerskol.calcul', 'on', true);
    UPDATE public.profils
       SET matieres_actives = p_matieres,
           domaines_actifs  = p_domaines
     WHERE id = p_profil;
END;
$$;

REVOKE ALL ON FUNCTION public.regler_matieres(uuid, text[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regler_matieres(uuid, text[], text[]) TO authenticated;

-- =========================================================================
-- 6. RPC regler_autorisation_matieres : le parent (SEUL) autorise ou non
--    l'enfant a choisir ses matieres.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.regler_autorisation_matieres(
    p_profil   uuid,
    p_autorise boolean
)
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

    UPDATE public.profils SET enfant_regle_matieres = p_autorise WHERE id = p_profil;
END;
$$;

REVOKE ALL ON FUNCTION public.regler_autorisation_matieres(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regler_autorisation_matieres(uuid, boolean) TO authenticated;

-- =========================================================================
-- 7. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0039_profil_sous_matieres')
ON CONFLICT (version) DO NOTHING;
