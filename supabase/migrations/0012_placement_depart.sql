-- 0012_placement_depart.sql
-- Niveau de DEPART du placement, sensible a la CLASSE de l'enfant.
--
-- Contexte (docs/referentiel-calcul.md) : le placement en escalier partait
-- TOUJOURS du niveau 1. Pour une eleve de CE2, les competences de revision de la
-- classe precedente (ADDITION, DOUBLES...) demarraient donc trop bas. On ajoute
-- un parametre (classe, competence) -> niveau_depart, utilise par calc_progression
-- a la 1re reponse. En l'absence de ligne, le depart reste 1 (comportement
-- historique inchange).
--
-- Idempotent. Ne modifie AUCUNE donnee existante : la progression n'est recalculee
-- que lors de la prochaine reponse inseree pour le couple (profil, competence).

-- =========================================================================
-- 1. Table de parametres
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.placement_depart (
    classe        text    NOT NULL,
    competence    text    NOT NULL REFERENCES public.competences (code),
    niveau_depart integer NOT NULL DEFAULT 1 CHECK (niveau_depart BETWEEN 1 AND 3),
    PRIMARY KEY (classe, competence)
);
COMMENT ON TABLE public.placement_depart IS
    'Niveau de depart du placement par (classe, competence). Absence de ligne = 1.';

-- Lecture seule cote API (ecriture reservee aux migrations).
ALTER TABLE public.placement_depart ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS placement_depart_select ON public.placement_depart;
CREATE POLICY placement_depart_select ON public.placement_depart
    FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.placement_depart TO authenticated;

-- =========================================================================
-- 2. Seed CE2 : revisions de la classe precedente (CE1) demarrent haut.
--    (Les competences coeur de CE2 restent au depart 1 -> pas de ligne.)
-- =========================================================================
INSERT INTO public.placement_depart (classe, competence, niveau_depart) VALUES
    ('CE2', 'MA.CM.ADDITION',   3),
    ('CE2', 'MA.CM.DOUBLES',    3),
    ('CE2', 'MA.CM.MOITIES',    2),
    ('CE2', 'MA.CM.COMPL_SUP',  2),
    ('CE2', 'MA.CM.SOMMES_DIFF',2)
ON CONFLICT (classe, competence) DO UPDATE SET niveau_depart = EXCLUDED.niveau_depart;

-- =========================================================================
-- 3. calc_progression : depart d'escalier fonction de la classe du profil.
--    Identique a 0004 hormis l'initialisation de v_niveau_place.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.calc_progression(p_profil uuid, p_competence text)
RETURNS public.progression
LANGUAGE plpgsql STABLE SET search_path = public, pg_temp
AS $$
DECLARE
    r                RECORD;
    v                public.progression;
    -- placement
    v_placement_ok   boolean := false;   -- placement termine ?
    v_depart         integer := 1;       -- niveau de depart (classe)
    v_niveau_place   integer := 1;       -- position escalier
    v_streak         integer := 0;       -- bonnes reponses consecutives (placement)
    v_risen          boolean := false;   -- a-t-on deja monte ?
    v_qplace         integer := 0;       -- questions consommees au placement
    -- hors placement
    v_ec             numeric := 0;       -- ema courte
    v_el             numeric := 0;       -- ema longue
    v_niveau         integer := 1;
    v_nb             integer := 0;       -- nb reponses au niveau courant
    v_nmax           integer := 1;
    v_score          integer;
    v_derniere       timestamptz;
    v_post_init      boolean := false;   -- EMA amorcee (0,7) apres placement ?
BEGIN
    -- Niveau de depart selon la classe du profil (defaut 1).
    SELECT coalesce(pd.niveau_depart, 1) INTO v_depart
      FROM public.profils pr
      LEFT JOIN public.placement_depart pd
        ON pd.classe = pr.classe AND pd.competence = p_competence
     WHERE pr.id = p_profil;
    IF v_depart IS NULL THEN v_depart := 1; END IF;
    v_niveau_place := v_depart;

    FOR r IN
        SELECT correct, repondu_le
          FROM public.reponses
         WHERE profil_id = p_profil AND competence = p_competence
         ORDER BY repondu_le, recu_le, id
    LOOP
        v_score := CASE WHEN r.correct THEN 1 ELSE 0 END;
        v_derniere := r.repondu_le;

        IF NOT v_placement_ok THEN
            ----------------------------------------------------------------
            -- Phase de placement (escalier)
            ----------------------------------------------------------------
            v_qplace := v_qplace + 1;
            IF r.correct THEN
                v_streak := v_streak + 1;
                v_niveau_place := least(v_niveau_place + 1, 3);
                v_risen := true;
            ELSE
                v_streak := 0;
                v_niveau_place := greatest(v_niveau_place - 1, 1);
            END IF;

            -- Fin du placement : erreur apres une montee, ou 5 questions.
            IF (NOT r.correct AND v_risen) OR v_qplace >= 5 THEN
                v_placement_ok := true;
                -- Le plafond (3) exige une confirmation par 2 bonnes d'affilee.
                IF v_niveau_place >= 3 AND v_streak < 2 THEN
                    v_niveau_place := 2;
                END IF;
                v_niveau := v_niveau_place;
                v_nmax   := greatest(v_nmax, v_niveau);
                v_ec := 0.7; v_el := 0.7; v_nb := 0; v_post_init := true;
            END IF;
        ELSE
            ----------------------------------------------------------------
            -- Hors placement (EMA + hysterese)
            ----------------------------------------------------------------
            v_ec := 0.4 * v_score + 0.6 * v_ec;
            v_el := 0.1 * v_score + 0.9 * v_el;
            v_nb := v_nb + 1;

            IF v_ec >= 0.8 AND v_nb >= 8 AND v_niveau < 4 THEN
                v_niveau := v_niveau + 1;
                v_nb := 0;
            ELSIF v_ec < 0.5 AND v_niveau > 1 THEN
                v_niveau := v_niveau - 1;
                v_nb := 0;
            END IF;
            v_nmax := greatest(v_nmax, v_niveau);
        END IF;
    END LOOP;

    -- Assemblage du resultat.
    v.profil_id          := p_profil;
    v.competence         := p_competence;
    v.placement_termine  := v_placement_ok;
    v.niveau             := CASE WHEN v_placement_ok THEN v_niveau ELSE v_niveau_place END;
    v.niveau_max_atteint := greatest(v_nmax, v.niveau);
    v.ema_courte         := round(v_ec, 4);
    v.ema_longue         := round(v_el, 4);
    v.nb_reponses_niveau := v_nb;
    v.derniere_reponse   := v_derniere;
    v.maj_le             := now();

    -- Repetition espacee : delai fonction de la solidite (le niveau atteint).
    IF v_derniere IS NULL THEN
        v.prochaine_revision := NULL;
    ELSE
        v.prochaine_revision := v_derniere + CASE v.niveau
            WHEN 1 THEN interval '1 day'
            WHEN 2 THEN interval '3 days'
            WHEN 3 THEN interval '7 days'
            ELSE        interval '30 days'
        END;
    END IF;

    RETURN v;
END;
$$;

-- =========================================================================
-- 4. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0012_placement_depart')
ON CONFLICT (version) DO NOTHING;
