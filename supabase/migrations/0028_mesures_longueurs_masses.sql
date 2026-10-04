-- 0028_mesures_longueurs_masses.sql
-- Nouvelles competences CE2 : MESURES de grandeurs.
--   * MA.MES.LONGUEURS          : mm, cm, m, km. Choisir l'unite (QCM),
--                                 conversions (1 cm = 10 mm, 1 m = 100 cm,
--                                 1 km = 1000 m), comparer, mesurer un segment
--                                 sur une regle graduee (SVG).
--   * MA.MES.MASSES_CONTENANCES : g, kg (1 kg = 1000 g) ; L, dL, cL
--                                 (1 L = 10 dL = 100 cL). Choisir l'unite,
--                                 convertir, comparer, lire une balance / un
--                                 verre gradue (SVG).
--
-- Principe de securite INCHANGE : le client envoie verif:{op,a,b} + sa saisie,
-- le SERVEUR recalcule via public.verif_calcul() et decide « juste/faux ».
-- NORMALISATION EN ENTIERS dans la plus petite unite :
--   choix d'unite (QCM)   -> val (la saisie = code de l'unite) ;
--   conversions            -> mul / div ;
--   comparaisons           -> cmp (les deux mesures ramenees a la meme unite) ;
--   lecture regle/balance  -> val.
-- AUCUNE nouvelle operation serveur. Signature de verif_calcul INCHANGEE
-- (CREATE OR REPLACE) : enregistrer_reponse (0026) l'appelle tel quel.
--
-- Prerequis : les conversions s'appuient sur ×10/×100 (MA.CM.X10_X100) ; les
-- masses/contenances s'ouvrent apres les longueurs. Additive et idempotente,
-- aucune donnee existante modifiee.

-- =========================================================================
-- 1. Nouvelles competences
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre) VALUES
    ('MA.MES.LONGUEURS',          'MA', 'mesures', 'Longueurs : mm, cm, m, km', 620),
    ('MA.MES.MASSES_CONTENANCES', 'MA', 'mesures', 'Masses (g, kg) et contenances (L, dL, cL)', 630)
ON CONFLICT (code) DO UPDATE
    SET matiere = EXCLUDED.matiere, domaine = EXCLUDED.domaine,
        libelle = EXCLUDED.libelle, ordre = EXCLUDED.ordre;

-- =========================================================================
-- 2. Prerequis (niveau_min = 2)
-- =========================================================================
INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.MES.LONGUEURS',          'MA.CM.X10_X100',    2),
    ('MA.MES.MASSES_CONTENANCES', 'MA.CM.X10_X100',    2),
    ('MA.MES.MASSES_CONTENANCES', 'MA.MES.LONGUEURS',  2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 3. Extension de la contrainte CHECK des operations de ex_calcul
-- =========================================================================
ALTER TABLE public.ex_calcul DROP CONSTRAINT IF EXISTS ex_calcul_operation_chk;
ALTER TABLE public.ex_calcul ADD  CONSTRAINT ex_calcul_operation_chk CHECK (operation IN (
    'add','sub','mul','div','double','moitie','complement',
    'lire','decomposer','comparer','encadrer','probleme','heure','duree',
    'longueur','masse'));

-- =========================================================================
-- 4. Seed (miroir de seedSources.ts, bloc MES). Idempotent.
-- =========================================================================
DO $seed$
DECLARE
    r    record;
    v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        ('MA.MES.LONGUEURS',1,'longueur','cpa_barres','unite_adaptee',
         '{"types":["unite"]}'::jsonb),
        ('MA.MES.LONGUEURS',2,'longueur','exemples_estompes','conversions_longueur',
         '{"types":["conversion"]}'::jsonb),
        ('MA.MES.LONGUEURS',3,'longueur','variation','comparer_longueurs',
         '{"types":["comparer","conversion"]}'::jsonb),
        ('MA.MES.LONGUEURS',4,'longueur','probleme_dabord','mesurer_regle',
         '{"types":["regle","comparer"],"max":20}'::jsonb),

        ('MA.MES.MASSES_CONTENANCES',1,'masse','cpa_barres','unite_adaptee',
         '{"types":["unite"]}'::jsonb),
        ('MA.MES.MASSES_CONTENANCES',2,'masse','exemples_estompes','conversions_masse',
         '{"types":["conversion"]}'::jsonb),
        ('MA.MES.MASSES_CONTENANCES',3,'masse','variation','comparer_mesures',
         '{"types":["comparer","conversion"]}'::jsonb),
        ('MA.MES.MASSES_CONTENANCES',4,'masse','probleme_dabord','lire_balance_verre',
         '{"types":["lecture"],"lecture":["balance","verre"]}'::jsonb)
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
-- 5. verif_calcul : ajoute les operations autorisees des deux nouvelles
--    competences. Les bornes de la famille MA.MES.% (<= 20000) sont deja
--    posees par 0027. Signature INCHANGEE -> CREATE OR REPLACE.
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
        WHEN p_competence = 'MA.MES.HEURE'            THEN ARRAY['val','sub','add']
        WHEN p_competence = 'MA.MES.DUREES'           THEN ARRAY['val','add','sub','mul','div']
        WHEN p_competence = 'MA.MES.LONGUEURS'          THEN ARRAY['val','mul','div','cmp']
        WHEN p_competence = 'MA.MES.MASSES_CONTENANCES' THEN ARRAY['val','mul','div','cmp']
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
VALUES ('0028_mesures_longueurs_masses')
ON CONFLICT (version) DO NOTHING;
