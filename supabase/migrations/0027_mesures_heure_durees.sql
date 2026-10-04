-- 0027_mesures_heure_durees.sql
-- Nouvelles competences CE2 : MESURES du temps.
--   * MA.MES.HEURE  : lire l'heure sur une horloge a aiguilles, l'ecrire en
--                     chiffres, correspondance matin / apres-midi (24 h -> 12 h).
--   * MA.MES.DUREES : conversions h <-> min, de quelle heure a quelle heure,
--                     heure d'arrivee (depart + duree), jours / semaines.
--
-- Principe de securite (lot 2, migrations 0022/0023/0024) INCHANGE : le client
-- envoie un ENONCE NORMALISE verif:{op,a,b} + sa SAISIE ; le SERVEUR recalcule la
-- bonne reponse via public.verif_calcul() et decide seul « juste/faux ».
--
-- NORMALISATION EN ENTIERS (unite la plus petite) : une HEURE de la journee est
-- normalisee en MINUTES DEPUIS MINUIT (h*60+m), une DUREE en MINUTES. Toutes ces
-- competences se ramenent aux operations existantes :
--   lecture / ecriture d'une heure  -> val (expected = minutes depuis minuit) ;
--   conversion h->min, semaines->j  -> mul / val / div ;
--   de ... a ...                    -> sub (end_min - start_min) ;
--   depart + duree -> arrivee       -> add (depart_min + duree_min) ;
--   24 h -> 12 h (et retour)        -> sub / add.
-- AUCUNE nouvelle operation n'est ajoutee : seules les bornes/competences de
-- verif_calcul sont elargies. La signature de verif_calcul est INCHANGEE
-- (CREATE OR REPLACE) : enregistrer_reponse (0026) l'appelle sans modification.
--
-- Aucune donnee existante modifiee (Iris, foyers). Les nouvelles competences
-- demarrent par le placement en escalier habituel (aucune ligne placement_depart
-- -> niveau de depart 1) ; l'ouverture se fait par le graphe de prerequis
-- (HEURE sans prerequis -> s'ouvre tot ; DUREES apres HEURE). Idempotent.

-- =========================================================================
-- 1. Nouvelles competences (matiere MA, domaine mesures)
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre) VALUES
    ('MA.MES.HEURE',  'MA', 'mesures', 'Lire et ecrire l''heure', 600),
    ('MA.MES.DUREES', 'MA', 'mesures', 'Durees : conversions, de ... a ..., heure d''arrivee', 610)
ON CONFLICT (code) DO UPDATE
    SET matiere = EXCLUDED.matiere, domaine = EXCLUDED.domaine,
        libelle = EXCLUDED.libelle, ordre = EXCLUDED.ordre;

-- =========================================================================
-- 2. Prerequis (niveau_min = 2). DUREES s'appuie sur la lecture de l'HEURE et
--    sur le calcul mental des sommes/differences (addition/soustraction de temps).
-- =========================================================================
INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.MES.DUREES', 'MA.MES.HEURE',      2),
    ('MA.MES.DUREES', 'MA.CM.SOMMES_DIFF', 2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 3. Extension des contraintes CHECK de ex_calcul (operation + forme)
-- =========================================================================
ALTER TABLE public.ex_calcul DROP CONSTRAINT IF EXISTS ex_calcul_operation_chk;
ALTER TABLE public.ex_calcul ADD  CONSTRAINT ex_calcul_operation_chk CHECK (operation IN (
    'add','sub','mul','div','double','moitie','complement',
    'lire','decomposer','comparer','encadrer','probleme','heure','duree'));

ALTER TABLE public.ex_calcul DROP CONSTRAINT IF EXISTS ex_calcul_forme_chk;
ALTER TABLE public.ex_calcul ADD  CONSTRAINT ex_calcul_forme_chk CHECK (forme IN (
    'resultat','terme_manquant','decomposition','ordre_grandeur','reste',
    'comparaison','lecture','encadrement','pose','probleme','mesure'));

-- =========================================================================
-- 4. Seed des exercices + ex_calcul (id deterministe -> idempotent)
--    Miroir de frontend/src/domain/calcul/seedSources.ts (bloc MES).
-- =========================================================================
DO $seed$
DECLARE
    r    record;
    v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        ('MA.MES.HEURE',1,'heure','cpa_barres','lire_horloge',
         '{"types":["lire"],"minuteStep":30,"saisie":"qcm"}'::jsonb),
        ('MA.MES.HEURE',2,'heure','exemples_estompes','lire_horloge',
         '{"types":["lire"],"minuteStep":15}'::jsonb),
        ('MA.MES.HEURE',3,'heure','variation','lire_horloge',
         '{"types":["lire"],"minuteStep":5}'::jsonb),
        ('MA.MES.HEURE',4,'heure','probleme_dabord','matin_apres_midi',
         '{"types":["lire","ap_midi"],"minuteStep":1}'::jsonb),

        ('MA.MES.DUREES',1,'duree','cpa_barres','conversion_h_min',
         '{"types":["conversion_hm"]}'::jsonb),
        ('MA.MES.DUREES',2,'duree','exemples_estompes','de_heure_a_heure',
         '{"types":["conversion_hm","de_a"],"demi":true,"minuteStep":15}'::jsonb),
        ('MA.MES.DUREES',3,'duree','variation','heure_arrivee',
         '{"types":["de_a","arrivee"],"minuteStep":15}'::jsonb),
        ('MA.MES.DUREES',4,'duree','probleme_dabord','jours_semaines',
         '{"types":["arrivee","jours_semaines","de_a"],"minuteStep":5}'::jsonb)
        ) AS t(competence,niveau,operation,methode,correction,params)
    LOOP
        v_id := md5(r.competence || ':' || r.niveau || ':calcul')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, r.competence, 'calcul', r.niveau, r.methode, true)
        ON CONFLICT (id) DO UPDATE
            SET competence = EXCLUDED.competence, niveau = EXCLUDED.niveau,
                methode = EXCLUDED.methode, actif = true;
        INSERT INTO public.ex_calcul (exercice_id, type, operation, forme, params, support_visuel, correction_strategie)
        VALUES (v_id, 'calcul', r.operation, 'mesure', r.params, 'aucun', r.correction)
        ON CONFLICT (exercice_id) DO UPDATE
            SET operation = EXCLUDED.operation, forme = EXCLUDED.forme,
                params = EXCLUDED.params, support_visuel = EXCLUDED.support_visuel,
                correction_strategie = EXCLUDED.correction_strategie;
    END LOOP;
END
$seed$;

-- =========================================================================
-- 5. Extension de verif_calcul : operations autorisees + bornes des mesures.
--    Signature INCHANGEE -> CREATE OR REPLACE (enregistrer_reponse continue de
--    l'appeler tel quel). Corps = celui de 0024 + deux familles MA.MES.*.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_calcul(
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

    IF p_a IS NULL OR p_b IS NULL
       OR p_a < 0 OR p_b < 0 OR p_a > 100000 OR p_b > 100000 THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'operandes hors bornes';
    END IF;
    IF p_c IS NOT NULL AND (p_c < 0 OR p_c > 100000) THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'operande c hors bornes';
    END IF;

    IF p_op2 IS NOT NULL AND p_competence <> 'MA.PB.DEUX_ETAPES' THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'op2 interdit pour cette competence';
    END IF;
    IF p_competence = 'MA.PB.DEUX_ETAPES' AND (p_op2 IS NULL OR p_c IS NULL) THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'deux etapes : op2 et c requis';
    END IF;

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
        WHEN p_competence = 'MA.NUM.LIRE_ECRIRE'      THEN ARRAY['val']
        WHEN p_competence = 'MA.NUM.DECOMPOSER'       THEN ARRAY['val','mul','div']
        WHEN p_competence = 'MA.NUM.COMPARER'         THEN ARRAY['cmp','sub','val']
        WHEN p_competence = 'MA.NUM.SUITE'            THEN ARRAY['add','sub','val']
        WHEN p_competence = 'MA.POSE.ADDITION'        THEN ARRAY['add']
        WHEN p_competence = 'MA.POSE.SOUSTRACTION'    THEN ARRAY['sub']
        WHEN p_competence = 'MA.POSE.MULTIPLICATION'  THEN ARRAY['mul']
        WHEN p_competence = 'MA.PB.ADD_SUB'           THEN ARRAY['add','sub']
        WHEN p_competence = 'MA.PB.MULT_DIV'          THEN ARRAY['mul','div']
        WHEN p_competence = 'MA.PB.MONNAIE'           THEN ARRAY['val','sub','cmp']
        WHEN p_competence = 'MA.PB.DEUX_ETAPES'       THEN ARRAY['add','sub','mul','div']
        -- Mesures du temps
        WHEN p_competence = 'MA.MES.HEURE'            THEN ARRAY['val','sub','add']
        WHEN p_competence = 'MA.MES.DUREES'           THEN ARRAY['val','add','sub','mul','div']
        ELSE NULL
    END;

    IF v_allowed IS NULL THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'competence inconnue';
    END IF;
    IF NOT (p_op = ANY (v_allowed)) THEN
        RAISE EXCEPTION 'enonce_incoherent'
            USING DETAIL = format('operation %s interdite pour %s', p_op, p_competence);
    END IF;

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
            expected := p_a / p_b;
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
        ELSE
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
        IF p_a > 20000 OR p_b > 20000 OR (p_c IS NOT NULL AND p_c > 20000) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'probleme : operande trop grand';
        END IF;
    ELSIF p_competence LIKE 'MA.MES.%' THEN
        -- Temps normalise en minutes : une journee = 1440 min, une semaine =
        -- 10080 min ; borne genereuse (jamais atteinte par le generateur).
        IF p_a > 20000 OR p_b > 20000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mesure : operande trop grand';
        END IF;
    END IF;

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
            WHEN 'rsub' THEN
                -- Soustraction INVERSEE : reponse = c - r1 (rendu / « il reste »).
                IF p_c < expected THEN
                    RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'deux etapes : rendu negatif';
                END IF;
                expected := p_c - expected;
            ELSE
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'op2 inconnue';
        END CASE;
        reste := NULL;
    END IF;

    RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verif_calcul(text, integer, text, integer, integer, text, integer)
    FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 6. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0027_mesures_heure_durees')
ON CONFLICT (version) DO NOTHING;
