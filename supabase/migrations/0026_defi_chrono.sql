-- 0026_defi_chrono.sql
-- DEFI CHRONO (option, jamais impose) : un jeu de rapidite de 60 s sur des
-- competences DEJA MAITRISEES (niveau >= 3). Il ne doit JAMAIS influer sur la
-- progression (EMA / niveaux), ni permettre a un enfant de perdre quoi que ce
-- soit.
--
-- Principes de securite (coherents avec 0022/0024) :
--   * chaque reponse passe par enregistrer_reponse (le serveur recalcule et
--     decide juste/faux, applique les plafonds) ;
--   * les reponses de defi portent mode = 'defi' et sont EXCLUES de
--     calc_progression (aucun effet sur EMA / niveaux : la vitesse ne fait
--     jamais baisser un niveau) ;
--   * le defi n'est autorise (cote serveur) que sur une competence maitrisee
--     (progression.niveau >= 3) ;
--   * le SCORE et le RECORD sont calcules par le SERVEUR a partir des reponses
--     verifiees (le client ne peut pas declarer un score) ;
--   * la recompense (monnaie) respecte le plafond monnaie/jour existant et un
--     plafond par defi ; elle ne retire jamais rien.
--
-- Plafond anti-abus : un enfant rapide peut depasser 60 reponses/min en defi ;
-- on releve donc reponses_par_minute de 60 a 90 (reste raisonnable, borne les
-- boucles d'abus). Les autres plafonds sont inchanges.
--
-- Additive et idempotente. Aucune donnee existante modifiee (Iris, foyers) :
-- la colonne mode a pour defaut 'seance' (les reponses historiques restent des
-- reponses de seance et conservent tout leur effet sur la progression).

-- =========================================================================
-- 1. Colonne mode sur reponses (seance | defi). Defaut 'seance' (historique).
-- =========================================================================
ALTER TABLE public.reponses
    ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'seance';
ALTER TABLE public.reponses DROP CONSTRAINT IF EXISTS reponses_mode_chk;
ALTER TABLE public.reponses
    ADD CONSTRAINT reponses_mode_chk CHECK (mode IN ('seance', 'defi'));
CREATE INDEX IF NOT EXISTS reponses_defi_idx
    ON public.reponses (profil_id, seance_id) WHERE mode = 'defi';

-- =========================================================================
-- 2. Plafonds : reponses/min releve pour le defi + plafonds propres au defi.
-- =========================================================================
UPDATE public.anti_abus_config
   SET valeur = 90,
       description = 'Reponses max par profil et par minute (anti-boucle ; releve pour le defi chrono rapide).'
 WHERE cle = 'reponses_par_minute';

INSERT INTO public.anti_abus_config (cle, valeur, description) VALUES
    ('defi_monnaie_par_defi', 30, 'Monnaie max gagnable en un seul defi chrono (hors bonus record).'),
    ('defi_bonus_record',     5,  'Bonus de monnaie (modeste) a chaque nouveau record personnel.')
ON CONFLICT (cle) DO NOTHING;

-- =========================================================================
-- 3. Table des resultats de defi (une ligne par defi termine).
--    Source du RECORD (max score par profil x theme) et du resume parent.
--    Ecrite uniquement par terminer_defi (SECURITY DEFINER) ; lecture seule API.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.defi_resultats (
    seance_id      uuid        PRIMARY KEY REFERENCES public.seances (id) ON DELETE CASCADE,
    profil_id      uuid        NOT NULL REFERENCES public.profils (id) ON DELETE CASCADE,
    theme          text        NOT NULL,
    score          integer     NOT NULL DEFAULT 0,
    monnaie_credit integer     NOT NULL DEFAULT 0,
    nouveau_record boolean     NOT NULL DEFAULT false,
    cree_le        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS defi_resultats_profil_theme_idx
    ON public.defi_resultats (profil_id, theme);

ALTER TABLE public.defi_resultats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defi_resultats FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS defi_resultats_select ON public.defi_resultats;
CREATE POLICY defi_resultats_select ON public.defi_resultats
    FOR SELECT TO authenticated USING (public.peut_acceder_profil(profil_id));
REVOKE ALL ON public.defi_resultats FROM anon, authenticated;
GRANT SELECT ON public.defi_resultats TO authenticated;

-- =========================================================================
-- 4. calc_progression : EXCLUT les reponses de defi (mode = 'defi').
--    Corps identique a 0012, seule la clause WHERE de la boucle change.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.calc_progression(p_profil uuid, p_competence text)
RETURNS public.progression
LANGUAGE plpgsql STABLE SET search_path = public, pg_temp
AS $$
DECLARE
    r                RECORD;
    v                public.progression;
    v_placement_ok   boolean := false;
    v_depart         integer := 1;
    v_niveau_place   integer := 1;
    v_streak         integer := 0;
    v_risen          boolean := false;
    v_qplace         integer := 0;
    v_ec             numeric := 0;
    v_el             numeric := 0;
    v_niveau         integer := 1;
    v_nb             integer := 0;
    v_nmax           integer := 1;
    v_score          integer;
    v_derniere       timestamptz;
    v_post_init      boolean := false;
BEGIN
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
           AND mode = 'seance'                      -- le defi n'affecte JAMAIS la progression
         ORDER BY repondu_le, recu_le, id
    LOOP
        v_score := CASE WHEN r.correct THEN 1 ELSE 0 END;
        v_derniere := r.repondu_le;

        IF NOT v_placement_ok THEN
            v_qplace := v_qplace + 1;
            IF r.correct THEN
                v_streak := v_streak + 1;
                v_niveau_place := least(v_niveau_place + 1, 3);
                v_risen := true;
            ELSE
                v_streak := 0;
                v_niveau_place := greatest(v_niveau_place - 1, 1);
            END IF;

            IF (NOT r.correct AND v_risen) OR v_qplace >= 5 THEN
                v_placement_ok := true;
                IF v_niveau_place >= 3 AND v_streak < 2 THEN
                    v_niveau_place := 2;
                END IF;
                v_niveau := v_niveau_place;
                v_nmax   := greatest(v_nmax, v_niveau);
                v_ec := 0.7; v_el := 0.7; v_nb := 0; v_post_init := true;
            END IF;
        ELSE
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
-- 5. Trigger monnaie : les reponses de defi ne creditent RIEN ici (la monnaie
--    du defi est reglee a la fin par terminer_defi). Le plafond journalier des
--    reponses de SEANCE tient compte des credits de defi deja acquis le jour.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_reponses_monnaie()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_gain        integer;
    v_cap         integer;
    v_deja_jour   integer;
    v_avant       integer;
    v_credit      integer;
BEGIN
    -- Le defi est credite a la fin (terminer_defi), jamais par reponse.
    IF NEW.mode = 'defi' THEN
        RETURN NEW;
    END IF;

    v_gain := public._gain_reponse(NEW.correct, NEW.rattrapage, NEW.correction_lue, NEW.temps_ms);
    IF v_gain <= 0 THEN
        RETURN NEW;
    END IF;

    v_cap := public._plafond('monnaie_par_jour');

    -- Gain cumule du jour = reponses de SEANCE (NEW inclus) + credits de DEFI.
    SELECT COALESCE(sum(public._gain_reponse(correct, rattrapage, correction_lue, temps_ms)), 0)
      INTO v_deja_jour
      FROM public.reponses
     WHERE profil_id = NEW.profil_id AND recu_le >= date_trunc('day', now())
       AND mode = 'seance';
    v_deja_jour := v_deja_jour + COALESCE((
        SELECT sum(monnaie_credit) FROM public.defi_resultats
         WHERE profil_id = NEW.profil_id AND cree_le >= date_trunc('day', now())), 0);

    v_avant  := v_deja_jour - v_gain;
    v_credit := least(v_gain, greatest(v_cap - v_avant, 0));

    IF v_credit > 0 THEN
        PERFORM set_config('kerskol.calcul', 'on', true);
        UPDATE public.profils SET monnaie = monnaie + v_credit WHERE id = NEW.profil_id;
    END IF;
    RETURN NEW;
END;
$$;

-- =========================================================================
-- 6. enregistrer_reponse : signature elargie (p_mode en fin, defaut 'seance').
--    En mode 'defi', la competence doit etre MAITRISEE (progression.niveau >= 3)
--    et la reponse est marquee mode = 'defi' (exclue de la progression).
--    DROP + CREATE (changement de signature) puis re-grant.
-- =========================================================================
DROP FUNCTION IF EXISTS public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz, text, integer);

CREATE FUNCTION public.enregistrer_reponse(
    p_id             uuid,
    p_profil         uuid,
    p_seance         uuid,
    p_competence     text,
    p_exercice       uuid,
    p_niveau         integer,
    p_methode        text,
    p_op             text,
    p_a              integer,
    p_b              integer,
    p_reponse        integer,
    p_reste          integer,
    p_fields         integer,
    p_temps_ms       integer,
    p_correction_lue boolean,
    p_rattrapage     boolean,
    p_placement      boolean,
    p_repondu_le     timestamptz,
    p_op2            text DEFAULT NULL,
    p_c              integer DEFAULT NULL,
    p_mode           text DEFAULT 'seance')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer     uuid;
    v_expected  integer;
    v_reste     integer;
    v_correct   boolean;
    v_existe    boolean;
    v_exist_cor boolean;
    v_n         integer;
    v_niv       integer;
    v_mode      text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    v_mode := COALESCE(p_mode, 'seance');
    IF v_mode NOT IN ('seance', 'defi') THEN
        RAISE EXCEPTION 'mode_inconnu';
    END IF;

    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
    END IF;

    -- Le defi ne porte que sur des competences DEJA MAITRISEES (niveau >= 3).
    IF v_mode = 'defi' THEN
        SELECT niveau INTO v_niv FROM public.progression
         WHERE profil_id = p_profil AND competence = p_competence;
        IF v_niv IS NULL OR v_niv < 3 THEN
            RAISE EXCEPTION 'defi_non_eligible'
                USING DETAIL = 'le defi ne porte que sur des competences maitrisees (niveau >= 3)';
        END IF;
    END IF;

    SELECT true, correct INTO v_existe, v_exist_cor
      FROM public.reponses WHERE id = p_id;
    IF v_existe THEN
        RETURN jsonb_build_object(
            'ok', true, 'deja', true, 'correct', v_exist_cor,
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
    END IF;

    SELECT expected, reste INTO v_expected, v_reste
      FROM public.verif_calcul(p_competence, p_niveau, p_op, p_a, p_b, p_op2, p_c);

    v_correct := (p_reponse = v_expected)
                 AND (COALESCE(p_fields, 1) < 2 OR p_reste = v_reste);

    SELECT count(*) INTO v_n FROM public.reponses
     WHERE profil_id = p_profil AND recu_le >= now() - interval '1 minute';
    IF v_n >= public._plafond('reponses_par_minute') THEN
        RAISE EXCEPTION 'plafond_reponses_minute';
    END IF;

    SELECT count(*) INTO v_n FROM public.reponses
     WHERE profil_id = p_profil AND recu_le >= date_trunc('day', now());
    IF v_n >= public._plafond('reponses_par_jour') THEN
        RAISE EXCEPTION 'plafond_reponses_jour';
    END IF;

    INSERT INTO public.reponses (
        id, profil_id, seance_id, competence, exercice_id, niveau, methode,
        correct, temps_ms, aide_utilisee, correction_lue, rattrapage, placement,
        repondu_le, mode)
    VALUES (
        p_id, p_profil, p_seance, p_competence, p_exercice, p_niveau, p_methode,
        v_correct, p_temps_ms, false, COALESCE(p_correction_lue, false),
        COALESCE(p_rattrapage, false), COALESCE(p_placement, false),
        COALESCE(p_repondu_le, now()), v_mode);

    RETURN jsonb_build_object(
        'ok', true, 'deja', false,
        'correct', v_correct,
        'reponse_attendue', v_expected,
        'reste_attendu', v_reste,
        'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'ok', true, 'deja', true,
            'correct', (SELECT correct FROM public.reponses WHERE id = p_id),
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
END;
$$;

REVOKE ALL ON FUNCTION public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz, text, integer, text)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz, text, integer, text)
    TO authenticated;

-- =========================================================================
-- 7. terminer_defi : calcule le SCORE cote serveur (reponses verifiees du
--    defi), gere le RECORD (max par profil x theme) et credite la monnaie en
--    respectant le plafond par defi ET le plafond monnaie/jour. Idempotent.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.terminer_defi(p_seance uuid, p_theme text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_profil    uuid;
    v_score     integer;
    v_prev      integer;
    v_nouveau   boolean;
    v_desire    integer;
    v_cap_defi  integer;
    v_bonus     integer;
    v_cap_jour  integer;
    v_jour      integer;
    v_credit    integer;
    v_row       public.defi_resultats;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    IF p_theme IS NULL OR length(btrim(p_theme)) = 0 THEN
        RAISE EXCEPTION 'theme_requis';
    END IF;

    SELECT profil_id INTO v_profil FROM public.seances WHERE id = p_seance;
    IF v_profil IS NULL THEN
        RAISE EXCEPTION 'seance_introuvable';
    END IF;
    IF NOT public.peut_acceder_profil(v_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
    END IF;

    -- Idempotence : un defi deja cloture renvoie son resultat tel quel.
    SELECT * INTO v_row FROM public.defi_resultats WHERE seance_id = p_seance;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'ok', true, 'deja', true,
            'score', v_row.score,
            'record', greatest(v_row.score, COALESCE((
                SELECT max(score) FROM public.defi_resultats
                 WHERE profil_id = v_profil AND theme = p_theme), 0)),
            'nouveau_record', v_row.nouveau_record,
            'credit', v_row.monnaie_credit,
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = v_profil));
    END IF;

    -- SCORE = nombre de bonnes reponses de defi verifiees de cette seance.
    SELECT count(*) INTO v_score FROM public.reponses
     WHERE seance_id = p_seance AND profil_id = v_profil AND mode = 'defi' AND correct;

    -- RECORD precedent (max score du meme theme, hors ce defi).
    SELECT COALESCE(max(score), 0) INTO v_prev FROM public.defi_resultats
     WHERE profil_id = v_profil AND theme = p_theme;
    v_nouveau := v_score > v_prev;

    -- Recompense desiree : 1 par bonne reponse (plafonnee par defi) + bonus record.
    v_cap_defi := public._plafond('defi_monnaie_par_defi');
    v_bonus    := CASE WHEN v_nouveau THEN public._plafond('defi_bonus_record') ELSE 0 END;
    v_desire   := least(v_score, v_cap_defi) + v_bonus;

    -- Respect du plafond monnaie/jour (reponses de seance + credits de defi deja acquis).
    v_cap_jour := public._plafond('monnaie_par_jour');
    SELECT COALESCE(sum(public._gain_reponse(correct, rattrapage, correction_lue, temps_ms)), 0)
      INTO v_jour FROM public.reponses
     WHERE profil_id = v_profil AND recu_le >= date_trunc('day', now()) AND mode = 'seance';
    v_jour := v_jour + COALESCE((
        SELECT sum(monnaie_credit) FROM public.defi_resultats
         WHERE profil_id = v_profil AND cree_le >= date_trunc('day', now())), 0);
    v_credit := least(v_desire, greatest(v_cap_jour - v_jour, 0));

    INSERT INTO public.defi_resultats (seance_id, profil_id, theme, score, monnaie_credit, nouveau_record)
    VALUES (p_seance, v_profil, p_theme, v_score, v_credit, v_nouveau);

    IF v_credit > 0 THEN
        PERFORM set_config('kerskol.calcul', 'on', true);  -- ecriture serveur de confiance
        UPDATE public.profils SET monnaie = monnaie + v_credit WHERE id = v_profil;
    END IF;

    RETURN jsonb_build_object(
        'ok', true, 'deja', false,
        'score', v_score,
        'record', greatest(v_score, v_prev),
        'nouveau_record', v_nouveau,
        'credit', v_credit,
        'monnaie', (SELECT monnaie FROM public.profils WHERE id = v_profil));
END;
$$;

REVOKE ALL ON FUNCTION public.terminer_defi(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.terminer_defi(uuid, text) TO authenticated;

-- =========================================================================
-- 8. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0026_defi_chrono')
ON CONFLICT (version) DO NOTHING;
