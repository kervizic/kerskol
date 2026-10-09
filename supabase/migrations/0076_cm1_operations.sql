-- 0076_cm1_operations.sql
-- LOT 3 (CM1) - MATHEMATIQUES : « Operations » (partie 1).
-- Attendus de fin de CM1 (programme cycle 3, actualise 2025, eduscol doc 13990) :
-- multiplication posee a deux chiffres ; addition et soustraction de nombres
-- decimaux.
--
-- On REUTILISE les moteurs existants (aucune nouvelle UI) :
--   * MA.POSE.MULT2  - multiplication posee a 2 chiffres : moteur `pose`
--     (poseData), op 'mul' (serveur recalcule a x b). Bornes MA.POSE.% <= 10000
--     (99 x 99 = 9801). Reutilise buildPose.
--   * MA.DEC.ADDITION / MA.DEC.SOUSTRACTION - addition / soustraction de decimaux :
--     saisie <DecimalInput> (CENTIEMES entiers), op 'add' / 'sub' (le serveur
--     recalcule). La soustraction est generee avec a >= b. Reutilise buildDecimal.
--
-- Nouvelles competences (portee CM1..CM2) : MA.POSE.MULT2 (domaine calcul_pose),
-- MA.DEC.ADDITION / MA.DEC.SOUSTRACTION (domaine decimaux). Plan de classe CM1.
-- Serveur SEUL JUGE (verif_calcul etendu).
--
-- RESTE du lot 3 (reporte, cf. docs/explications.md) : DIVISION POSEE (potence,
-- nouvelle UI) et CALCUL MENTAL CM1 (grands nombres / multiples).
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaines calcul_pose et decimaux deja
-- actifs (aucun changement du defaut).

-- =========================================================================
-- 1. Referentiel : 3 competences CM1.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('MA.POSE.MULT2',        'MA', 'calcul_pose', 'Multiplication posée à 2 chiffres', 770, 'CM1', 'CM2'),
    ('MA.DEC.ADDITION',      'MA', 'decimaux',    'Additionner des décimaux',          771, 'CM1', 'CM2'),
    ('MA.DEC.SOUSTRACTION',  'MA', 'decimaux',    'Soustraire des décimaux',           772, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE
    SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine, libelle=EXCLUDED.libelle,
        ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.POSE.MULT2',       'MA.POSE.MULTIPLICATION', 2),
    ('MA.DEC.ADDITION',     'MA.DEC.ECRIRE',          2),
    ('MA.DEC.SOUSTRACTION', 'MA.DEC.ECRIRE',          2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Exercices + ex_calcul (miroir seedSources.ts : blocs DEC add/sub, MULT2).
-- =========================================================================
DO $seed$
DECLARE r record; v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        ('MA.POSE.MULT2',1,'mul','pose','cpa_barres','{"min":11,"max":25,"bmin":11,"bmax":20}'::jsonb),
        ('MA.POSE.MULT2',2,'mul','pose','exemples_estompes','{"min":11,"max":49,"bmin":11,"bmax":29}'::jsonb),
        ('MA.POSE.MULT2',3,'mul','pose','variation','{"min":12,"max":99,"bmin":11,"bmax":49}'::jsonb),
        ('MA.POSE.MULT2',4,'mul','pose','probleme_dabord','{"min":12,"max":99,"bmin":12,"bmax":99}'::jsonb),
        ('MA.DEC.ADDITION',1,'add','decimal','cpa_barres','{"maxE":5}'::jsonb),
        ('MA.DEC.ADDITION',2,'add','decimal','exemples_estompes','{"maxE":9}'::jsonb),
        ('MA.DEC.ADDITION',3,'add','decimal','variation','{"maxE":20}'::jsonb),
        ('MA.DEC.ADDITION',4,'add','decimal','probleme_dabord','{"maxE":50}'::jsonb),
        ('MA.DEC.SOUSTRACTION',1,'sub','decimal','cpa_barres','{"maxE":5}'::jsonb),
        ('MA.DEC.SOUSTRACTION',2,'sub','decimal','exemples_estompes','{"maxE":9}'::jsonb),
        ('MA.DEC.SOUSTRACTION',3,'sub','decimal','variation','{"maxE":20}'::jsonb),
        ('MA.DEC.SOUSTRACTION',4,'sub','decimal','probleme_dabord','{"maxE":50}'::jsonb)
        ) AS t(competence,niveau,operation,forme,methode,params)
    LOOP
        v_id := md5(r.competence || ':' || r.niveau || ':calcul')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, r.competence, 'calcul', r.niveau, r.methode, true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
            methode=EXCLUDED.methode, actif=true;
        INSERT INTO public.ex_calcul (exercice_id, type, operation, forme, params, support_visuel, correction_strategie)
        VALUES (v_id, 'calcul', r.operation, r.forme, r.params, 'aucun', r.methode)
        ON CONFLICT (exercice_id) DO UPDATE SET operation=EXCLUDED.operation, forme=EXCLUDED.forme,
            params=EXCLUDED.params, support_visuel=EXCLUDED.support_visuel, correction_strategie=EXCLUDED.correction_strategie;
    END LOOP;
END $seed$;

-- =========================================================================
-- 3. verif_calcul : SEUL JUGE. Definition courante (0075) + familles
--    MA.POSE.MULT2 (mul), MA.DEC.ADDITION (add), MA.DEC.SOUSTRACTION (sub).
--    Bornes : MA.POSE.% <= 10000 ; MA.DEC.% <= 100000 (centiemes). CREATE OR REPLACE.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_calcul(p_competence text, p_niveau integer, p_op text, p_a integer, p_b integer, p_op2 text, p_c integer, OUT expected integer, OUT reste integer)
 RETURNS record
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_allowed text[];
    v_table   integer;
BEGIN
    reste := NULL;

    IF p_a IS NULL OR p_b IS NULL OR p_a < 0 OR p_b < 0 THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'operandes manquants ou negatifs';
    END IF;
    -- Borne haute : 1 000 000 pour les grands nombres (CM1), 100 000 sinon
    -- (couvre les decimaux CM1 codes en centiemes : 1000,00 = 100000).
    IF p_competence = 'MA.NUM.GRANDS' THEN
        IF p_a > 1000000 OR p_b > 1000000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'grands nombres : operande > 1000000';
        END IF;
    ELSIF p_a > 100000 OR p_b > 100000 THEN
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
        WHEN p_competence = 'MA.NUM.GRANDS'           THEN ARRAY['cmp','val']
        WHEN p_competence = 'MA.POSE.ADDITION'        THEN ARRAY['add']
        WHEN p_competence = 'MA.POSE.SOUSTRACTION'    THEN ARRAY['sub']
        WHEN p_competence = 'MA.POSE.MULTIPLICATION'  THEN ARRAY['mul']
        WHEN p_competence = 'MA.POSE.MULT2'           THEN ARRAY['mul']
        WHEN p_competence = 'MA.PB.ADD_SUB'           THEN ARRAY['add','sub']
        WHEN p_competence = 'MA.PB.MULT_DIV'          THEN ARRAY['mul','div']
        WHEN p_competence = 'MA.PB.MONNAIE'           THEN ARRAY['val','sub','cmp']
        WHEN p_competence = 'MA.PB.DEUX_ETAPES'       THEN ARRAY['add','sub','mul','div']
        WHEN p_competence = 'MA.PB.MESURES'           THEN ARRAY['val','add','sub','mul','div']
        WHEN p_competence = 'MA.MES.HEURE'            THEN ARRAY['val','sub','add']
        WHEN p_competence = 'MA.MES.DUREES'           THEN ARRAY['val','add','sub','mul','div']
        WHEN p_competence = 'MA.MES.LONGUEURS'          THEN ARRAY['val','mul','div','cmp']
        WHEN p_competence = 'MA.MES.MASSES_CONTENANCES' THEN ARRAY['val','mul','div','cmp']
        WHEN p_competence = 'MA.MES.PERIMETRE'         THEN ARRAY['val','mul']
        WHEN p_competence = 'MA.MES.AIRE'              THEN ARRAY['mul']
        WHEN p_competence = 'MA.FRAC.SIMPLES'         THEN ARRAY['val','cmp','div']
        WHEN p_competence = 'MA.FRAC.DROITE'          THEN ARRAY['val']
        WHEN p_competence = 'MA.FRAC.COMPARER'        THEN ARRAY['cmp']
        WHEN p_competence = 'MA.FRAC.EGALITES'        THEN ARRAY['val']
        WHEN p_competence = 'MA.FRAC.QUANTITE'        THEN ARRAY['div','val']
        WHEN p_competence = 'MA.DEC.ADDITION'          THEN ARRAY['add']
        WHEN p_competence = 'MA.DEC.SOUSTRACTION'      THEN ARRAY['sub']
        WHEN p_competence LIKE 'MA.DEC.%'             THEN ARRAY['val','cmp']
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
        IF p_competence = 'MA.NUM.GRANDS' THEN
            IF p_a > 1000000 OR p_b > 1000000 THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'grands nombres > 1000000';
            END IF;
        ELSIF p_a > 10000 OR p_b > 10000 THEN
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
    ELSIF p_competence LIKE 'MA.FRAC.%' THEN
        -- Fractions : codes num*100+den, produits de comparaison et quantites
        -- petits (<= 2000).
        IF p_a > 2000 OR p_b > 2000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'fraction : operande trop grand';
        END IF;
    ELSIF p_competence LIKE 'MA.DEC.%' THEN
        -- Decimaux CM1 : codes en centiemes, <= 100000 (= 1000,00).
        IF p_a > 100000 OR p_b > 100000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'decimal : operande trop grand';
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
$function$;

-- =========================================================================
-- 4. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0076_cm1_operations')
ON CONFLICT (version) DO NOTHING;
