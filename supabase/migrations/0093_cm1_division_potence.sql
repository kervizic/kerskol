-- 0093_cm1_division_potence.sql
-- LOT 6 (CM1) - MATHS : DIVISION POSEE EN POTENCE. Nouvelle competence
-- MA.POSE.DIVISION (domaine calcul_pose, portee CM1..CM2). Le juge serveur
-- (op 'div' : expected = quotient, reste = dividende % diviseur) EXISTE DEJA ;
-- ce lot ajoute le composant <PotenceView> cote client (saisie "potence",
-- quotient + reste) et autorise l'operation 'div' pour MA.POSE.DIVISION dans
-- verif_calcul. Diviseur a 1 chiffre au CM1, dividende croissant.
--
-- Miroir seedSources.ts (bloc POSE / DIVISION, forme 'pose'). Le SERVEUR reste
-- SEUL JUGE. Migration ADDITIVE et IDEMPOTENTE ; domaine calcul_pose deja actif.

-- =========================================================================
-- 1. Competence + prerequis (apres la division avec reste, niveau 2).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('MA.POSE.DIVISION', 'MA', 'calcul_pose', 'Division posée en potence', 773, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.POSE.DIVISION', 'MA.CM.DIV_RESTE', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Exercices + ex_calcul (4 niveaux, op 'div', forme 'pose').
-- =========================================================================
DO $seed$
DECLARE r record; v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        ('MA.POSE.DIVISION',1,'div','pose','cpa_barres','{"min":20,"max":50,"bmin":2,"bmax":5}'::jsonb),
        ('MA.POSE.DIVISION',2,'div','pose','exemples_estompes','{"min":30,"max":99,"bmin":2,"bmax":9}'::jsonb),
        ('MA.POSE.DIVISION',3,'div','pose','variation','{"min":100,"max":500,"bmin":2,"bmax":9}'::jsonb),
        ('MA.POSE.DIVISION',4,'div','pose','probleme_dabord','{"min":100,"max":999,"bmin":2,"bmax":9}'::jsonb)
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
-- 3. verif_calcul : SEUL JUGE. Reprend la definition 0080 et AJOUTE la ligne
--    MA.POSE.DIVISION -> ['div']. Reste INCHANGE.
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
        WHEN p_competence = 'MA.CM.DIV10_100'         THEN ARRAY['div']
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
        WHEN p_competence = 'MA.POSE.DIVISION'        THEN ARRAY['div']
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
    ELSIF p_competence = 'MA.CM.DIV10_100' THEN
        IF NOT (p_b IN (10,100)) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'div10/100 : diviseur hors (10,100)';
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
        IF p_competence = 'MA.POSE.DIVISION' AND p_b < 2 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'division posee : diviseur < 2';
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
        IF p_a > 2000 OR p_b > 2000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'fraction : operande trop grand';
        END IF;
    ELSIF p_competence LIKE 'MA.DEC.%' THEN
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
-- 4. Garde-fou : competence + 4 exercices ; verif_calcul accepte 'div',
--    refuse 'mul', calcule quotient + reste.
-- =========================================================================
DO $do$
DECLARE n integer; v_exp integer; v_res integer;
BEGIN
    SELECT count(*) INTO n FROM public.exercices
     WHERE competence = 'MA.POSE.DIVISION' AND type = 'calcul' AND actif;
    IF n <> 4 THEN
        RAISE EXCEPTION 'division potence : 4 exercices attendus, obtenu %', n;
    END IF;
    SELECT expected, reste INTO v_exp, v_res FROM public.verif_calcul('MA.POSE.DIVISION', 1, 'div', 47, 5, NULL, NULL);
    IF v_exp <> 9 OR v_res <> 2 THEN
        RAISE EXCEPTION 'division potence : 47 / 5 attendu 9 reste 2, obtenu % reste %', v_exp, v_res;
    END IF;
    BEGIN
        PERFORM public.verif_calcul('MA.POSE.DIVISION', 1, 'mul', 47, 5, NULL, NULL);
        RAISE EXCEPTION 'division potence : op mul aurait du etre refusee';
    EXCEPTION WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE; END IF;
    END;
END $do$;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0093_cm1_division_potence')
ON CONFLICT (version) DO NOTHING;
