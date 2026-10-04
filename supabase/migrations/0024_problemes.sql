-- 0024_problemes.sql
-- Nouvelles competences CE2 : PROBLEMES (additifs, multiplicatifs, monnaie,
-- deux etapes = premiers exercices MIXTES).
--
-- Principe de securite (lot 2, migrations 0022/0023) INCHANGE : le client envoie
-- un ENONCE NORMALISE verif:{op,a,b} + sa SAISIE ; le SERVEUR recalcule la bonne
-- reponse via public.verif_calcul() et decide seul « juste/faux », en validant
-- la coherence enonce/competence (bornes du referentiel).
--
-- EXTENSION DU CONTRAT pour les PROBLEMES A DEUX ETAPES : l'enonce peut chainer
-- une SECONDE operation (op2, c). Le serveur calcule r1 = op(a,b) puis la
-- reponse = op2(r1, c). `op2` est RESERVE a MA.PB.DEUX_ETAPES. Les sommes
-- d'argent sont manipulees en CENTIMES entiers (verif val / sub / cmp).
--
-- Aucune donnee existante modifiee (Iris, foyers). Les nouvelles competences
-- demarrent par le placement en escalier habituel (aucune ligne placement_depart
-- -> niveau de depart 1) ; l'ouverture se fait par le graphe de prerequis.
-- Idempotent.

-- =========================================================================
-- 1. Nouvelles competences (matiere MA, domaine problemes)
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre) VALUES
    ('MA.PB.ADD_SUB',     'MA', 'problemes', 'Problemes : additions et soustractions', 500),
    ('MA.PB.MULT_DIV',    'MA', 'problemes', 'Problemes : multiplications et partages', 510),
    ('MA.PB.MONNAIE',     'MA', 'problemes', 'Problemes : billets et pieces (euros)', 520),
    ('MA.PB.DEUX_ETAPES', 'MA', 'problemes', 'Problemes a deux etapes', 530)
ON CONFLICT (code) DO UPDATE
    SET matiere = EXCLUDED.matiere, domaine = EXCLUDED.domaine,
        libelle = EXCLUDED.libelle, ordre = EXCLUDED.ordre;

-- =========================================================================
-- 2. Prerequis (niveau_min = 2). Ouverture progressive.
--    ADD_SUB / MONNAIE s'appuient sur SOMMES_DIFF ; MULT_DIV sur les tables 2 et
--    5 ; DEUX_ETAPES (MIXTES) sur ADD_SUB et MULT_DIV.
-- =========================================================================
INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.PB.ADD_SUB',     'MA.CM.SOMMES_DIFF', 2),
    ('MA.PB.MULT_DIV',    'MA.TABLES.2',       2),
    ('MA.PB.MULT_DIV',    'MA.TABLES.5',       2),
    ('MA.PB.MONNAIE',     'MA.CM.SOMMES_DIFF', 2),
    ('MA.PB.MONNAIE',     'MA.NUM.LIRE_ECRIRE',2),
    ('MA.PB.DEUX_ETAPES', 'MA.PB.ADD_SUB',     2),
    ('MA.PB.DEUX_ETAPES', 'MA.PB.MULT_DIV',    2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 3. Extension des contraintes CHECK de ex_calcul (operation + forme)
-- =========================================================================
ALTER TABLE public.ex_calcul DROP CONSTRAINT IF EXISTS ex_calcul_operation_chk;
ALTER TABLE public.ex_calcul ADD  CONSTRAINT ex_calcul_operation_chk CHECK (operation IN (
    'add','sub','mul','div','double','moitie','complement',
    'lire','decomposer','comparer','encadrer','probleme'));

ALTER TABLE public.ex_calcul DROP CONSTRAINT IF EXISTS ex_calcul_forme_chk;
ALTER TABLE public.ex_calcul ADD  CONSTRAINT ex_calcul_forme_chk CHECK (forme IN (
    'resultat','terme_manquant','decomposition','ordre_grandeur','reste',
    'comparaison','lecture','encadrement','pose','probleme'));

-- =========================================================================
-- 4. Seed des exercices + ex_calcul (id deterministe -> idempotent)
--    Miroir de frontend/src/domain/calcul/seedSources.ts (bloc PB).
-- =========================================================================
DO $seed$
DECLARE
    r    record;
    v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        -- competence, niveau, methode, params
        ('MA.PB.ADD_SUB',1,'cpa_barres',
         '{"types":["reunion","ajout","retrait"],"mag":20}'::jsonb),
        ('MA.PB.ADD_SUB',2,'exemples_estompes',
         '{"types":["de_plus","de_moins","reunion","retrait"],"mag":100}'::jsonb),
        ('MA.PB.ADD_SUB',3,'variation',
         '{"types":["reunion","ajout","retrait","de_plus","de_moins"],"mag":1000}'::jsonb),
        ('MA.PB.ADD_SUB',4,'probleme_dabord',
         '{"types":["etat_recu","etat_don","de_plus","de_moins"],"mag":1000}'::jsonb),

        ('MA.PB.MULT_DIV',1,'cpa_barres',
         '{"types":["groupement","partage"],"tables":[2,3,4,5],"qmax":10}'::jsonb),
        ('MA.PB.MULT_DIV',2,'exemples_estompes',
         '{"types":["fois_plus","groupement"],"tables":[2,3,4,5],"qmax":10}'::jsonb),
        ('MA.PB.MULT_DIV',3,'variation',
         '{"types":["groupement","partage","fois_plus"],"tables":[2,3,4,5,6,7,8,9],"qmax":10}'::jsonb),
        ('MA.PB.MULT_DIV',4,'probleme_dabord',
         '{"types":["partage","fois_plus","groupement"],"tables":[2,3,4,5,6,7,8,9],"qmax":10}'::jsonb),

        ('MA.PB.MONNAIE',1,'cpa_barres',
         '{"types":["composer"],"mag":50}'::jsonb),
        ('MA.PB.MONNAIE',2,'exemples_estompes',
         '{"types":["comparer","rendre"],"mag":100}'::jsonb),
        ('MA.PB.MONNAIE',3,'variation',
         '{"types":["composer"],"cents":true,"mag":30}'::jsonb),
        ('MA.PB.MONNAIE',4,'probleme_dabord',
         '{"types":["rendre","comparer"],"mag":100}'::jsonb),

        ('MA.PB.DEUX_ETAPES',1,'cpa_barres',
         '{"types":["mul_add","add_sub"],"tables":[2,3,4,5],"qmax":5,"mag":10}'::jsonb),
        ('MA.PB.DEUX_ETAPES',2,'exemples_estompes',
         '{"types":["mul_sub","mul_add"],"tables":[2,3,4,5],"qmax":5,"mag":20}'::jsonb),
        ('MA.PB.DEUX_ETAPES',3,'variation',
         '{"types":["add_div","add_sub"],"tables":[2,3,4,5],"qmax":10,"mag":100}'::jsonb),
        ('MA.PB.DEUX_ETAPES',4,'probleme_dabord',
         '{"types":["mul_add","mul_sub","add_div"],"tables":[2,3,4,5,6,7,8,9],"qmax":10,"mag":100}'::jsonb)
        ) AS t(competence,niveau,methode,params)
    LOOP
        v_id := md5(r.competence || ':' || r.niveau || ':calcul')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, r.competence, 'calcul', r.niveau, r.methode, true)
        ON CONFLICT (id) DO UPDATE
            SET competence = EXCLUDED.competence, niveau = EXCLUDED.niveau,
                methode = EXCLUDED.methode, actif = true;
        INSERT INTO public.ex_calcul (exercice_id, type, operation, forme, params, support_visuel, correction_strategie)
        VALUES (v_id, 'calcul', 'probleme', 'probleme', r.params, 'aucun', 'schema_barres')
        ON CONFLICT (exercice_id) DO UPDATE
            SET operation = EXCLUDED.operation, forme = EXCLUDED.forme,
                params = EXCLUDED.params, support_visuel = EXCLUDED.support_visuel,
                correction_strategie = EXCLUDED.correction_strategie;
    END LOOP;
END
$seed$;

-- =========================================================================
-- 5. Extension de verif_calcul : seconde operation (op2, c) + bornes des
--    nouvelles competences. Signature elargie -> on DROP les fonctions qui en
--    dependent puis on les recree (CREATE OR REPLACE ne change pas une signature).
-- =========================================================================
DROP FUNCTION IF EXISTS public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz);
DROP FUNCTION IF EXISTS public.verif_calcul(text, integer, text, integer, integer);

CREATE FUNCTION public.verif_calcul(
    p_competence text, p_niveau integer, p_op text, p_a integer, p_b integer,
    p_op2 text, p_c integer,
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
    IF p_c IS NOT NULL AND (p_c < 0 OR p_c > 100000) THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'operande c hors bornes';
    END IF;

    -- La seconde etape (op2) est RESERVEE aux problemes a deux etapes.
    IF p_op2 IS NOT NULL AND p_competence <> 'MA.PB.DEUX_ETAPES' THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'op2 interdit pour cette competence';
    END IF;
    IF p_competence = 'MA.PB.DEUX_ETAPES' AND (p_op2 IS NULL OR p_c IS NULL) THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'deux etapes : op2 et c requis';
    END IF;

    -- Operations autorisees par competence (premiere etape).
    v_allowed := CASE
        WHEN p_competence = 'MA.CM.ADDITION'          THEN ARRAY['add','sub']
        WHEN p_competence = 'MA.CM.DOUBLES'           THEN ARRAY['add']
        WHEN p_competence = 'MA.CM.MOITIES'           THEN ARRAY['div']
        WHEN p_competence = 'MA.CM.COMPL_SUP'         THEN ARRAY['sub']
        WHEN p_competence = 'MA.CM.COMPL_100_1000'    THEN ARRAY['sub']
        WHEN p_competence = 'MA.CM.SOMMES_DIFF'       THEN ARRAY['add','sub']
        WHEN p_competence = 'MA.CM.X10_X100'          THEN ARRAY['mul']
        WHEN p_competence = 'MA.CM.DIV_RESTE'         THEN ARRAY['div']
        WHEN p_competence LIKE 'MA.TABLES.%'          THEN ARRAY['mul','div']
        -- Numeration
        WHEN p_competence = 'MA.NUM.LIRE_ECRIRE'      THEN ARRAY['val']
        WHEN p_competence = 'MA.NUM.DECOMPOSER'       THEN ARRAY['val','mul','div']
        WHEN p_competence = 'MA.NUM.COMPARER'         THEN ARRAY['cmp','sub','val']
        WHEN p_competence = 'MA.NUM.SUITE'            THEN ARRAY['add','sub','val']
        -- Calculs poses
        WHEN p_competence = 'MA.POSE.ADDITION'        THEN ARRAY['add']
        WHEN p_competence = 'MA.POSE.SOUSTRACTION'    THEN ARRAY['sub']
        WHEN p_competence = 'MA.POSE.MULTIPLICATION'  THEN ARRAY['mul']
        -- Problemes
        WHEN p_competence = 'MA.PB.ADD_SUB'           THEN ARRAY['add','sub']
        WHEN p_competence = 'MA.PB.MULT_DIV'          THEN ARRAY['mul','div']
        WHEN p_competence = 'MA.PB.MONNAIE'           THEN ARRAY['val','sub','cmp']
        WHEN p_competence = 'MA.PB.DEUX_ETAPES'       THEN ARRAY['add','sub','mul','div']
        ELSE NULL
    END;

    IF v_allowed IS NULL THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'competence inconnue';
    END IF;
    IF NOT (p_op = ANY (v_allowed)) THEN
        RAISE EXCEPTION 'enonce_incoherent'
            USING DETAIL = format('operation %s interdite pour %s', p_op, p_competence);
    END IF;

    -- Recalcul arithmetique de la reponse attendue (premiere etape).
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
        WHEN 'cmp' THEN
            expected := CASE WHEN p_a < p_b THEN 0 WHEN p_a = p_b THEN 1 ELSE 2 END;
        WHEN 'val' THEN
            IF p_b <> 0 THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'val : b doit valoir 0';
            END IF;
            expected := p_a;
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
            IF NOT (v_table IN (p_a, p_b) OR (v_table * 10) IN (p_a, p_b)) THEN
                RAISE EXCEPTION 'enonce_incoherent'
                    USING DETAIL = format('table %s absente des facteurs', v_table);
            END IF;
        ELSE  -- div
            IF p_a % p_b <> 0 THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'table : division non exacte';
            END IF;
            IF NOT (p_b = v_table OR expected = v_table) THEN
                RAISE EXCEPTION 'enonce_incoherent'
                    USING DETAIL = format('table %s absente', v_table);
            END IF;
        END IF;
    ELSIF p_competence LIKE 'MA.NUM.%' THEN
        IF p_a > 10000 OR p_b > 10000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'numeration : nombre > 10000';
        END IF;
    ELSIF p_competence LIKE 'MA.POSE.%' THEN
        IF p_a > 10000 OR p_b > 10000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'calcul pose : operande > 10000';
        END IF;
        IF p_competence = 'MA.POSE.MULTIPLICATION'
           AND NOT (p_a BETWEEN 2 AND 9 OR p_b BETWEEN 2 AND 9) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mult. posee : aucun facteur a 1 chiffre';
        END IF;
    ELSIF p_competence LIKE 'MA.PB.%' THEN
        -- Nombres d'un probleme CE2 (operandes raisonnables, centimes compris).
        IF p_a > 20000 OR p_b > 20000 OR (p_c IS NOT NULL AND p_c > 20000) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'probleme : operande trop grand';
        END IF;
    END IF;

    -- Seconde etape (problemes a deux etapes). reste := NULL (reponse entiere).
    IF p_op2 IS NOT NULL THEN
        CASE p_op2
            WHEN 'add' THEN expected := expected + p_c;
            WHEN 'sub' THEN
                IF expected < p_c THEN
                    RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'deux etapes : soustraction negative';
                END IF;
                expected := expected - p_c;
            WHEN 'mul' THEN expected := expected * p_c;
            WHEN 'div' THEN
                IF p_c = 0 THEN
                    RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'deux etapes : division par zero';
                END IF;
                IF expected % p_c <> 0 THEN
                    RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'deux etapes : division non exacte';
                END IF;
                expected := expected / p_c;
            ELSE
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'op2 inconnue';
        END CASE;
        reste := NULL;
    END IF;

    RETURN;
END;
$$;

-- =========================================================================
-- 6. RPC d'enregistrement : signature elargie (p_op2, p_c en fin, defauts NULL
--    pour la compatibilite des reponses hors-ligne anterieures). Le corps est
--    identique a 0022, seul l'appel a verif_calcul transmet op2/c.
-- =========================================================================
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
    p_c              integer DEFAULT NULL)
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
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
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
        RETURN jsonb_build_object(
            'ok', true, 'deja', true,
            'correct', (SELECT correct FROM public.reponses WHERE id = p_id),
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
END;
$$;

-- =========================================================================
-- 7. Droits : seule la RPC reste executable par authenticated ; les helpers
--    (verif_calcul) ne sont PAS exposes a l'API (coherent avec 0017/0022/0023).
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.verif_calcul(text, integer, text, integer, integer, text, integer)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz, text, integer)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz, text, integer)
    TO authenticated;

-- =========================================================================
-- 8. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0024_problemes')
ON CONFLICT (version) DO NOTHING;
