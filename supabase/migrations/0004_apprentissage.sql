-- 0004_apprentissage.sql
-- Seances, reponses (append-only, idempotentes) et progression CALCULEE PAR LE
-- SERVEUR. La base fait foi : deux appareils peuvent envoyer des reponses sans
-- conflit, la progression est recalculee de facon deterministe.
--
-- Regles de progression (documentees dans docs/referentiel-calcul.md) :
--   * score : bonne reponse = 1, erreur = 0.
--   * PLACEMENT (tant que placement_termine = false) : escalier, depart niveau 1,
--     +1 par bonne reponse (plafond 3), -1 par erreur (plancher 1). Fin du
--     placement a la premiere erreur survenant APRES au moins une montee, ou
--     apres 5 questions. Le niveau plafond (3) n'est retenu que s'il a ete
--     confirme par deux bonnes reponses d'affilee ; sinon il est abaisse a 2.
--     A la fin du placement, EMA courte et longue initialisees a 0,7.
--   * HORS PLACEMENT : EMA courte alpha=0,4, EMA longue alpha=0,1.
--     Montee si EMA courte >= 0,8 ET nb_reponses_niveau >= 8 (plafond 4).
--     Descente si EMA courte < 0,5 (hysterese ; plancher 1). Le compteur
--     nb_reponses_niveau est remis a 0 a chaque changement de niveau.
--     Niveau 4 = acquis, atteignable seulement hors placement.
--   * niveau_max_atteint ne diminue jamais (le batiment ne recule pas).
--   * prochaine_revision (repetition espacee) calculee depuis la derniere
--     reponse selon la solidite : niveau 1 -> +1 j, 2 -> +3 j, 3 -> +7 j,
--     4 (acquis) -> +30 j.

-- =========================================================================
-- 1. Seances
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.seances (
    id             uuid        PRIMARY KEY,             -- fourni par le client
    profil_id      uuid        NOT NULL REFERENCES public.profils (id) ON DELETE CASCADE,
    debut          timestamptz,
    fin            timestamptz,
    duree_s        integer,
    monnaie_gagnee integer     NOT NULL DEFAULT 0,
    cree_le        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seances_profil_idx ON public.seances (profil_id);

-- =========================================================================
-- 2. Reponses (APPEND-ONLY, idempotentes par id)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.reponses (
    id             uuid        PRIMARY KEY,             -- fourni par le client = idempotence
    profil_id      uuid        NOT NULL REFERENCES public.profils (id) ON DELETE CASCADE,
    seance_id      uuid        REFERENCES public.seances (id) ON DELETE SET NULL,
    competence     text        NOT NULL REFERENCES public.competences (code),
    exercice_id    uuid        REFERENCES public.exercices (id),
    niveau         integer     NOT NULL,
    methode        text        REFERENCES public.methodes (code),
    correct        boolean     NOT NULL,
    temps_ms       integer,
    aide_utilisee  boolean     NOT NULL DEFAULT false,
    correction_lue boolean     NOT NULL DEFAULT false,
    rattrapage     boolean     NOT NULL DEFAULT false,
    placement      boolean     NOT NULL DEFAULT false,
    repondu_le     timestamptz NOT NULL,                -- horloge client (ordre de rejeu)
    recu_le        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.reponses IS
    'Journal des reponses, append-only. id fourni par le client => rejouer une '
    'insertion (meme id) est sans effet (ON CONFLICT DO NOTHING cote client).';
CREATE INDEX IF NOT EXISTS reponses_profil_comp_idx
    ON public.reponses (profil_id, competence, repondu_le);
CREATE INDEX IF NOT EXISTS reponses_seance_idx ON public.reponses (seance_id);

-- =========================================================================
-- 3. Progression (une ligne par couple profil x competence)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.progression (
    profil_id          uuid        NOT NULL REFERENCES public.profils (id) ON DELETE CASCADE,
    competence         text        NOT NULL REFERENCES public.competences (code),
    niveau             integer     NOT NULL DEFAULT 1,
    niveau_max_atteint integer     NOT NULL DEFAULT 1,
    ema_courte         numeric(5,4) NOT NULL DEFAULT 0,
    ema_longue         numeric(5,4) NOT NULL DEFAULT 0,
    nb_reponses_niveau integer     NOT NULL DEFAULT 0,
    placement_termine  boolean     NOT NULL DEFAULT false,
    derniere_reponse   timestamptz,
    prochaine_revision timestamptz,
    maj_le             timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (profil_id, competence)
);
COMMENT ON TABLE public.progression IS
    'Etat calcule par le serveur (trigger sur reponses). Lecture seule cote API.';

-- =========================================================================
-- 4. Fonction pure de calcul : rejoue toutes les reponses d'un couple
--    (profil, competence) et renvoie l'etat de progression.
--    Testable isolement (aucun effet de bord).
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
-- 5. Trigger de recalcul de la progression (SECURITY DEFINER : ecrit
--    progression malgre RLS ; garantit niveau_max_atteint non decroissant).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_reponses_progression()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_calc     public.progression;
    v_nmax_old integer;
BEGIN
    v_calc := public.calc_progression(NEW.profil_id, NEW.competence);

    SELECT niveau_max_atteint INTO v_nmax_old
      FROM public.progression
     WHERE profil_id = NEW.profil_id AND competence = NEW.competence;

    INSERT INTO public.progression AS p (
        profil_id, competence, niveau, niveau_max_atteint,
        ema_courte, ema_longue, nb_reponses_niveau, placement_termine,
        derniere_reponse, prochaine_revision, maj_le)
    VALUES (
        v_calc.profil_id, v_calc.competence, v_calc.niveau,
        greatest(v_calc.niveau_max_atteint, coalesce(v_nmax_old, 1)),
        v_calc.ema_courte, v_calc.ema_longue, v_calc.nb_reponses_niveau,
        v_calc.placement_termine, v_calc.derniere_reponse,
        v_calc.prochaine_revision, now())
    ON CONFLICT (profil_id, competence) DO UPDATE SET
        niveau             = EXCLUDED.niveau,
        niveau_max_atteint = greatest(EXCLUDED.niveau_max_atteint, p.niveau_max_atteint),
        ema_courte         = EXCLUDED.ema_courte,
        ema_longue         = EXCLUDED.ema_longue,
        nb_reponses_niveau = EXCLUDED.nb_reponses_niveau,
        placement_termine  = EXCLUDED.placement_termine,
        derniere_reponse   = EXCLUDED.derniere_reponse,
        prochaine_revision = EXCLUDED.prochaine_revision,
        maj_le             = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reponses_progression ON public.reponses;
CREATE TRIGGER reponses_progression
    AFTER INSERT ON public.reponses
    FOR EACH ROW EXECUTE FUNCTION public.trg_reponses_progression();

-- =========================================================================
-- 6. Trigger monnaie : credite profils.monnaie selon la reponse.
--    Idempotent : garanti par la PK de reponses (une meme id ne peut etre
--    inseree deux fois ; le client utilise ON CONFLICT DO NOTHING).
--    Bareme : correct = 2 ; rattrapage correct = 3 ; erreur + correction_lue
--    = 1 ; reponse < 1500 ms (non lue) = 0.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_reponses_monnaie()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_gain integer := 0;
BEGIN
    IF NEW.temps_ms IS NOT NULL AND NEW.temps_ms < 1500 THEN
        v_gain := 0;                                   -- trop rapide pour etre lue
    ELSIF NEW.correct AND NEW.rattrapage THEN
        v_gain := 3;
    ELSIF NEW.correct THEN
        v_gain := 2;
    ELSIF NOT NEW.correct AND NEW.correction_lue THEN
        v_gain := 1;
    END IF;

    IF v_gain <> 0 THEN
        UPDATE public.profils SET monnaie = monnaie + v_gain WHERE id = NEW.profil_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reponses_monnaie ON public.reponses;
CREATE TRIGGER reponses_monnaie
    AFTER INSERT ON public.reponses
    FOR EACH ROW EXECUTE FUNCTION public.trg_reponses_monnaie();

-- =========================================================================
-- 7. RLS
-- =========================================================================
ALTER TABLE public.seances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seances     FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.reponses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reponses    FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression FORCE  ROW LEVEL SECURITY;

-- seances : insert + select si acces au profil.
DROP POLICY IF EXISTS seances_select ON public.seances;
CREATE POLICY seances_select ON public.seances
    FOR SELECT TO authenticated USING (public.peut_acceder_profil(profil_id));
DROP POLICY IF EXISTS seances_insert ON public.seances;
CREATE POLICY seances_insert ON public.seances
    FOR INSERT TO authenticated WITH CHECK (public.peut_acceder_profil(profil_id));

-- reponses : insert + select si acces au profil. APPEND-ONLY (pas d'update/delete).
DROP POLICY IF EXISTS reponses_select ON public.reponses;
CREATE POLICY reponses_select ON public.reponses
    FOR SELECT TO authenticated USING (public.peut_acceder_profil(profil_id));
DROP POLICY IF EXISTS reponses_insert ON public.reponses;
CREATE POLICY reponses_insert ON public.reponses
    FOR INSERT TO authenticated WITH CHECK (public.peut_acceder_profil(profil_id));

-- progression : lecture seule (ecriture par le trigger, en definer).
DROP POLICY IF EXISTS progression_select ON public.progression;
CREATE POLICY progression_select ON public.progression
    FOR SELECT TO authenticated USING (public.peut_acceder_profil(profil_id));

-- Privileges : aucun UPDATE/DELETE pour authenticated sur reponses (append-only),
-- ni sur progression (calculee).
GRANT SELECT, INSERT ON public.seances  TO authenticated;
GRANT SELECT, INSERT ON public.reponses TO authenticated;
GRANT SELECT         ON public.progression TO authenticated;

-- =========================================================================
-- 8. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0004_apprentissage')
ON CONFLICT (version) DO NOTHING;
