-- 0022_verif_reponses.sql
-- LOT 2 de securite : le SERVEUR decide seul si une reponse est juste, et des
-- plafonds anti-abus bornent les ecritures.
--
-- Principe : le client n'ecrit plus directement dans `reponses` (INSERT revoque)
-- et n'envoie plus de flag `correct`. Il appelle la RPC `enregistrer_reponse`
-- (SECURITY DEFINER) en transmettant l'ENONCE NORMALISE (operation + operandes)
-- et la SAISIE de l'enfant. La RPC :
--   1. verifie l'authentification et que le profil appartient au foyer appelant ;
--   2. RECALCULE la bonne reponse cote serveur (arithmetique pure) ;
--   3. VALIDE que l'enonce est coherent avec la competence (bornes du referentiel) ;
--   4. applique les PLAFONDS anti-abus (refus propre, jamais de perte) ;
--   5. insere elle-meme la reponse avec le `correct` qu'elle a decide.
-- La progression (EMA/niveaux) et la monnaie restent derivees par trigger a
-- partir de ces reponses desormais fiables. Un plafond de monnaie par jour est
-- ajoute au trigger monnaie : il borne le GAIN, ne retire jamais rien.
--
-- Regle produit respectee : jamais de perte ni de punition. Un plafond atteint
-- refuse proprement l'ecriture (ou borne le gain a 0 pour la monnaie) ; la
-- monnaie deja acquise n'est jamais diminuee.
--
-- Compatible avec l'historique (Iris) : aucune donnee existante modifiee, aucun
-- recalcul destructif. Idempotent.

-- =========================================================================
-- 1. Table de configuration des plafonds anti-abus (valeurs genereuses)
-- =========================================================================
-- Valeurs pensees pour un enfant reel intensif, jamais atteintes en usage
-- normal ; elles bornent surtout les scripts / boucles d'abus.
CREATE TABLE IF NOT EXISTS public.anti_abus_config (
    cle         text    PRIMARY KEY,
    valeur      integer NOT NULL CHECK (valeur >= 0),
    description text
);

INSERT INTO public.anti_abus_config (cle, valeur, description) VALUES
    ('reponses_par_minute', 60,   'Reponses max par profil et par minute (anti-boucle).'),
    ('reponses_par_jour',   1500, 'Reponses max par profil et par jour.'),
    ('seances_par_jour',    40,   'Seances max par profil et par jour.'),
    ('monnaie_par_jour',    1000, 'Monnaie maximale gagnable par profil et par jour (borne le gain, ne retire rien).'),
    ('profils_par_foyer',   12,   'Profils max par foyer.'),
    ('liens_par_foyer',     20,   'Demandes de rattachement simultanees (non expirees) max par foyer.')
ON CONFLICT (cle) DO NOTHING;

-- Config interne : ni anon ni authenticated n'y accedent (lue en SECURITY DEFINER).
ALTER TABLE public.anti_abus_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anti_abus_config FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.anti_abus_config FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public._plafond(p_cle text)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT valeur FROM public.anti_abus_config WHERE cle = p_cle $$;

-- =========================================================================
-- 2. Bareme de gain monnaie, factorise (meme formule partout)
--    correct = 2 ; rattrapage correct = 3 ; erreur + correction lue = 1 ;
--    reponse < 1500 ms (non lue) = 0.
-- =========================================================================
CREATE OR REPLACE FUNCTION public._gain_reponse(
    p_correct boolean, p_rattrapage boolean, p_correction_lue boolean, p_temps_ms integer)
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp
AS $$
    SELECT CASE
        WHEN p_temps_ms IS NOT NULL AND p_temps_ms < 1500 THEN 0
        WHEN p_correct AND p_rattrapage THEN 3
        WHEN p_correct THEN 2
        WHEN (NOT p_correct) AND p_correction_lue THEN 1
        ELSE 0
    END
$$;

-- =========================================================================
-- 3. Verification de l'enonce : recalcule la bonne reponse ET valide la
--    coherence avec la competence (bornes du referentiel). Pure, testable.
--    Leve `enonce_incoherent` si l'operation ou les operandes ne collent pas
--    a la competence. Les bornes sont GENEREUSES : elles ne rejettent jamais
--    un exercice legitime du generateur, seulement les enonces fabriques.
--
--    L'enonce est NORMALISE cote client : chaque exercice se ramene a une
--    operation a deux operandes dont le resultat EST la reponse attendue
--    (ex. « a + ? = s » devient op=sub, a=s, b=a_connu -> reponse = s - a).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_calcul(
    p_competence text, p_niveau integer, p_op text, p_a integer, p_b integer,
    OUT expected integer, OUT reste integer)
RETURNS record
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp
AS $$
DECLARE
    v_allowed text[];
    v_table   integer;
BEGIN
    reste := NULL;

    -- Bornes globales de securite (anti-valeurs aberrantes).
    IF p_a IS NULL OR p_b IS NULL
       OR p_a < 0 OR p_b < 0 OR p_a > 100000 OR p_b > 100000 THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'operandes hors bornes';
    END IF;

    -- Operations autorisees par competence.
    v_allowed := CASE
        WHEN p_competence = 'MA.CM.ADDITION'       THEN ARRAY['add','sub']
        WHEN p_competence = 'MA.CM.DOUBLES'        THEN ARRAY['add']
        WHEN p_competence = 'MA.CM.MOITIES'        THEN ARRAY['div']
        WHEN p_competence = 'MA.CM.COMPL_SUP'      THEN ARRAY['sub']
        WHEN p_competence = 'MA.CM.COMPL_100_1000' THEN ARRAY['sub']
        WHEN p_competence = 'MA.CM.SOMMES_DIFF'    THEN ARRAY['add','sub']
        WHEN p_competence = 'MA.CM.X10_X100'       THEN ARRAY['mul']
        WHEN p_competence = 'MA.CM.DIV_RESTE'      THEN ARRAY['div']
        WHEN p_competence LIKE 'MA.TABLES.%'       THEN ARRAY['mul','div']
        ELSE NULL
    END;

    IF v_allowed IS NULL THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'competence inconnue';
    END IF;
    IF NOT (p_op = ANY (v_allowed)) THEN
        RAISE EXCEPTION 'enonce_incoherent'
            USING DETAIL = format('operation %s interdite pour %s', p_op, p_competence);
    END IF;

    -- Recalcul arithmetique de la reponse attendue.
    CASE p_op
        WHEN 'add' THEN expected := p_a + p_b;
        WHEN 'sub' THEN
            IF p_a < p_b THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'soustraction negative';
            END IF;
            expected := p_a - p_b;
        WHEN 'mul' THEN expected := p_a * p_b;
        WHEN 'div' THEN
            IF p_b = 0 THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'division par zero';
            END IF;
            expected := p_a / p_b;          -- division entiere
            reste    := p_a % p_b;
        ELSE
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'operation inconnue';
    END CASE;

    -- Coherences specifiques par famille de competence.
    IF p_competence = 'MA.CM.DOUBLES' THEN
        IF p_a <> p_b THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'double : operandes differents';
        END IF;
    ELSIF p_competence = 'MA.CM.MOITIES' THEN
        IF p_b <> 2 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'moitie : diviseur <> 2';
        END IF;
    ELSIF p_competence = 'MA.CM.X10_X100' THEN
        IF NOT (p_a IN (10,20,50,100) OR p_b IN (10,20,50,100)) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'x10/x100 : facteur absent';
        END IF;
    ELSIF p_competence LIKE 'MA.TABLES.%' THEN
        v_table := split_part(p_competence, '.', 3)::integer;
        IF p_op = 'mul' THEN
            -- La table (ou son derive x10) doit etre un des facteurs.
            IF NOT (v_table IN (p_a, p_b) OR (v_table * 10) IN (p_a, p_b)) THEN
                RAISE EXCEPTION 'enonce_incoherent'
                    USING DETAIL = format('table %s absente des facteurs', v_table);
            END IF;
        ELSE  -- div : terme manquant / commutativite / combien de fois
            IF p_a % p_b <> 0 THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'table : division non exacte';
            END IF;
            -- le diviseur = la table, OU le quotient = la table (commutativite)
            IF NOT (p_b = v_table OR expected = v_table) THEN
                RAISE EXCEPTION 'enonce_incoherent'
                    USING DETAIL = format('table %s absente', v_table);
            END IF;
        END IF;
    END IF;

    RETURN;
END;
$$;

-- =========================================================================
-- 4. RPC d'enregistrement d'une reponse (le SERVEUR decide « juste/faux »).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.enregistrer_reponse(
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
    p_repondu_le     timestamptz)
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
BEGIN
    -- 4.1 Authentification.
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    -- 4.2 Le profil doit appartenir au foyer de l'appelant (ou etre l'enfant lui-meme).
    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
    END IF;

    -- 4.3 Idempotence : si l'id existe deja, on renvoie son verdict sans rejouer
    --     (ni credit, ni comptage de plafond). Le client rejoue sa file hors-ligne.
    SELECT true, correct INTO v_existe, v_exist_cor
      FROM public.reponses WHERE id = p_id;
    IF v_existe THEN
        RETURN jsonb_build_object(
            'ok', true, 'deja', true, 'correct', v_exist_cor,
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
    END IF;

    -- 4.4 Recalcul + coherence de l'enonce (leve enonce_incoherent sinon).
    SELECT expected, reste INTO v_expected, v_reste
      FROM public.verif_calcul(p_competence, p_niveau, p_op, p_a, p_b);

    -- Le SERVEUR decide « juste » : la saisie doit egaler la reponse recalculee
    -- (et le reste si l'exercice a deux champs). Le flag client n'existe plus.
    v_correct := (p_reponse = v_expected)
                 AND (COALESCE(p_fields, 1) < 2 OR p_reste = v_reste);

    -- 4.5 Plafonds anti-abus (fenetres sur recu_le = horloge SERVEUR).
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

    -- 4.6 Insertion : c'est la RPC (definer) qui pose `correct`.
    INSERT INTO public.reponses (
        id, profil_id, seance_id, competence, exercice_id, niveau, methode,
        correct, temps_ms, aide_utilisee, correction_lue, rattrapage, placement,
        repondu_le)
    VALUES (
        p_id, p_profil, p_seance, p_competence, p_exercice, p_niveau, p_methode,
        v_correct, p_temps_ms, false, COALESCE(p_correction_lue, false),
        COALESCE(p_rattrapage, false), COALESCE(p_placement, false),
        COALESCE(p_repondu_le, now()));

    RETURN jsonb_build_object(
        'ok', true, 'deja', false,
        'correct', v_correct,
        'reponse_attendue', v_expected,
        'reste_attendu', v_reste,
        'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
EXCEPTION
    WHEN unique_violation THEN
        -- Course : un rejeu concurrent a insere le meme id entre-temps.
        RETURN jsonb_build_object(
            'ok', true, 'deja', true,
            'correct', (SELECT correct FROM public.reponses WHERE id = p_id),
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
END;
$$;

REVOKE ALL ON FUNCTION public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz)
    TO authenticated;

-- =========================================================================
-- 5. Verrouillage : le client ne peut plus inserer de reponse en direct.
--    (La policy RLS reste, mais sans le privilege INSERT elle est inoperante
--    pour authenticated. L'ecriture passe exclusivement par la RPC ci-dessus,
--    qui s'execute en definer et contourne donc RLS.)
-- =========================================================================
REVOKE INSERT ON public.reponses FROM authenticated;
DROP POLICY IF EXISTS reponses_insert ON public.reponses;

-- =========================================================================
-- 6. Trigger monnaie : plafond journalier (borne le gain, ne retire jamais).
--    Reste AFTER INSERT (ne se declenche pas sur ON CONFLICT DO NOTHING =>
--    pas de double credit au rejeu).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_reponses_monnaie()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_gain        integer;
    v_cap         integer;
    v_deja_jour   integer;   -- gain deja acquis aujourd'hui (NEW inclus)
    v_avant       integer;   -- gain d'aujourd'hui AVANT cette reponse
    v_credit      integer;
BEGIN
    v_gain := public._gain_reponse(NEW.correct, NEW.rattrapage, NEW.correction_lue, NEW.temps_ms);
    IF v_gain <= 0 THEN
        RETURN NEW;
    END IF;

    v_cap := public._plafond('monnaie_par_jour');

    -- Gain cumule du jour (fenetre serveur recu_le), NEW deja insere ici.
    SELECT COALESCE(sum(public._gain_reponse(correct, rattrapage, correction_lue, temps_ms)), 0)
      INTO v_deja_jour
      FROM public.reponses
     WHERE profil_id = NEW.profil_id AND recu_le >= date_trunc('day', now());
    v_avant  := v_deja_jour - v_gain;
    v_credit := least(v_gain, greatest(v_cap - v_avant, 0));

    IF v_credit > 0 THEN
        PERFORM set_config('kerskol.calcul', 'on', true);  -- ecriture serveur de confiance
        UPDATE public.profils SET monnaie = monnaie + v_credit WHERE id = NEW.profil_id;
    END IF;
    RETURN NEW;
END;
$$;

-- =========================================================================
-- 7. Plafond : seances par jour et par profil.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_seances_plafond()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_n integer;
BEGIN
    SELECT count(*) INTO v_n FROM public.seances
     WHERE profil_id = NEW.profil_id AND cree_le >= date_trunc('day', now());
    IF v_n >= public._plafond('seances_par_jour') THEN
        RAISE EXCEPTION 'plafond_seances_jour';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seances_plafond ON public.seances;
CREATE TRIGGER seances_plafond
    BEFORE INSERT ON public.seances
    FOR EACH ROW EXECUTE FUNCTION public.trg_seances_plafond();

-- =========================================================================
-- 8. Plafond : profils par foyer.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_profils_plafond()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_n integer;
BEGIN
    SELECT count(*) INTO v_n FROM public.profils WHERE foyer_id = NEW.foyer_id;
    IF v_n >= public._plafond('profils_par_foyer') THEN
        RAISE EXCEPTION 'plafond_profils_foyer';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profils_plafond ON public.profils;
CREATE TRIGGER profils_plafond
    BEFORE INSERT ON public.profils
    FOR EACH ROW EXECUTE FUNCTION public.trg_profils_plafond();

-- =========================================================================
-- 9. Plafond : demandes de rattachement simultanees (non expirees) par foyer.
--    Complete le rate-limit existant (5 essais par code, migrations 0014/0020).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_liens_plafond()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer uuid;
    v_n     integer;
BEGIN
    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = NEW.profil_id;
    SELECT count(*) INTO v_n
      FROM public.liens_enfant_en_attente l
      JOIN public.profils p ON p.id = l.profil_id
     WHERE p.foyer_id = v_foyer AND l.expire_le > now();
    IF v_n >= public._plafond('liens_par_foyer') THEN
        RAISE EXCEPTION 'plafond_liens_foyer';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS liens_plafond ON public.liens_enfant_en_attente;
CREATE TRIGGER liens_plafond
    BEFORE INSERT ON public.liens_enfant_en_attente
    FOR EACH ROW EXECUTE FUNCTION public.trg_liens_plafond();

-- =========================================================================
-- 9b. Lockdown EXECUTE : les helpers internes ne sont pas exposes a l'API
--     (coherent avec 0017). Seule la RPC enregistrer_reponse reste executable
--     par authenticated. Les fonctions trigger n'ont pas besoin d'EXECUTE pour
--     se declencher.
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public._plafond(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._gain_reponse(boolean, boolean, boolean, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verif_calcul(text, integer, text, integer, integer) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 10. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0022_verif_reponses')
ON CONFLICT (version) DO NOTHING;
