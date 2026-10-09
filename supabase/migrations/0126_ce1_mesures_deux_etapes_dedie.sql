-- 0126_ce1_mesures_deux_etapes_dedie.sql
-- LOT CE1 (incrément 15) - MATHS : dernières compétences CE1 DÉDIÉES ([CE1,CE1]),
-- 4 niveaux TOUS calibrés CE1, même recette que 0121-0123 :
--   MA.MES.CE1_LONGUEURS   mesurer/choisir l'unité de longueur (cm, m) ;
--   MA.MES.CE1_MASSES      masses (g, kg) et contenances (L) ;
--   MA.PB.CE1_DEUX_ETAPES  problèmes à deux étapes, tables 2-5, résultats petits.
-- Les versions partagées (MA.MES.LONGUEURS/MASSES_CONTENANCES [CE1,CE2],
-- MA.PB.DEUX_ETAPES [CE1,CM2]) débordent au CE2/CM1 (conversions mm/km/cL,
-- tables 6-9, grands nombres). Ces compétences bornées CE1 n'utilisent que
-- cm/m, g/kg/L (sans conversion) et des deux-étapes à petits nombres.
--
-- Générateurs RÉUTILISÉS (aucune UI) : buildMesure (drapeau params.ce1) et
-- buildProbleme/buildDeuxEtapes (normalisation « .CE1_ » -> « . »). Le SERVEUR
-- reste SEUL JUGE : verif_calcul est reproduite À L'IDENTIQUE (version 0123)
-- avec l'ajout des 3 codes CE1 (opérations autorisées, op2 des deux-étapes
-- étendu au code CE1, bornes CE1 : mesure <= 1000, deux-étapes <= 100).
--
-- SÛRETÉ CE2 (Iris) : [CE1,CE1] -> gate estSousNiveau ; ne reviennent qu'en
-- RÉVISION comme prérequis de remédiation des compétences liées (travaillées en
-- lacune). Le prérequis CE1 ne verrouille pas la compétence liée (garde-fou
-- générique incrément 12). Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Compétences CE1 dédiées + prérequis de remédiation.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('MA.MES.CE1_LONGUEURS',  'MA', 'mesures',   'Mesurer des longueurs : cm et m (CE1)',        770, 4, 'CE1', 'CE1', true),
    ('MA.MES.CE1_MASSES',     'MA', 'mesures',   'Masses et contenances : g, kg, L (CE1)',       771, 4, 'CE1', 'CE1', true),
    ('MA.PB.CE1_DEUX_ETAPES', 'MA', 'problemes', 'Problemes a deux etapes (CE1)',                772, 4, 'CE1', 'CE1', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.MES.LONGUEURS',          'MA.MES.CE1_LONGUEURS',  2),
    ('MA.MES.MASSES_CONTENANCES', 'MA.MES.CE1_MASSES',     2),
    ('MA.PB.DEUX_ETAPES',         'MA.PB.CE1_DEUX_ETAPES', 2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 2. Exercices + ex_calcul (type 'calcul', id deterministe). Miroir de
--    seedSources.ts (params calibres CE1).
-- =========================================================================
DO $seed$
DECLARE r record; v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        ('MA.MES.CE1_LONGUEURS',1,'longueur','mesure','cpa_barres','aucun','unite_adaptee',
         '{"ce1":true,"types":["unite"]}'::jsonb),
        ('MA.MES.CE1_LONGUEURS',2,'longueur','mesure','exemples_estompes','aucun','mesurer_regle',
         '{"ce1":true,"types":["regle"],"max":10}'::jsonb),
        ('MA.MES.CE1_LONGUEURS',3,'longueur','mesure','variation','aucun','unite_adaptee',
         '{"ce1":true,"types":["unite"]}'::jsonb),
        ('MA.MES.CE1_LONGUEURS',4,'longueur','mesure','probleme_dabord','aucun','mesurer_regle',
         '{"ce1":true,"types":["regle"],"max":20}'::jsonb),
        ('MA.MES.CE1_MASSES',1,'masse','mesure','cpa_barres','aucun','unite_adaptee',
         '{"ce1":true,"types":["unite"]}'::jsonb),
        ('MA.MES.CE1_MASSES',2,'masse','mesure','exemples_estompes','aucun','lire_balance_verre',
         '{"ce1":true,"types":["lecture"],"lecture":["balance"]}'::jsonb),
        ('MA.MES.CE1_MASSES',3,'masse','mesure','variation','aucun','unite_adaptee',
         '{"ce1":true,"types":["unite"]}'::jsonb),
        ('MA.MES.CE1_MASSES',4,'masse','mesure','probleme_dabord','aucun','lire_balance_verre',
         '{"ce1":true,"types":["lecture"],"lecture":["balance"]}'::jsonb),
        ('MA.PB.CE1_DEUX_ETAPES',1,'probleme','probleme','cpa_barres','aucun','schema_barres',
         '{"types":["mul_add","add_sub"],"tables":[2,5],"qmax":5,"mag":10}'::jsonb),
        ('MA.PB.CE1_DEUX_ETAPES',2,'probleme','probleme','exemples_estompes','aucun','schema_barres',
         '{"types":["mul_add","mul_sub","add_sub"],"tables":[2,3,5],"qmax":5,"mag":15}'::jsonb),
        ('MA.PB.CE1_DEUX_ETAPES',3,'probleme','probleme','variation','aucun','schema_barres',
         '{"types":["mul_add","mul_sub","add_sub"],"tables":[2,3,4,5],"qmax":6,"mag":20}'::jsonb),
        ('MA.PB.CE1_DEUX_ETAPES',4,'probleme','probleme','probleme_dabord','aucun','schema_barres',
         '{"types":["mul_add","mul_sub","add_rsub"],"tables":[2,3,4,5],"qmax":6,"mag":20}'::jsonb)
        ) AS t(competence,niveau,operation,forme,methode,support,correction,params)
    LOOP
        v_id := md5(r.competence || ':' || r.niveau || ':calcul')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, r.competence, 'calcul', r.niveau, r.methode, true)
        ON CONFLICT (id) DO UPDATE
            SET competence = EXCLUDED.competence, niveau = EXCLUDED.niveau,
                methode = EXCLUDED.methode, actif = true;
        INSERT INTO public.ex_calcul (exercice_id, type, operation, forme, params, support_visuel, correction_strategie)
        VALUES (v_id, 'calcul', r.operation, r.forme, r.params, r.support, r.correction)
        ON CONFLICT (exercice_id) DO UPDATE
            SET operation = EXCLUDED.operation, forme = EXCLUDED.forme,
                params = EXCLUDED.params, support_visuel = EXCLUDED.support_visuel,
                correction_strategie = EXCLUDED.correction_strategie;
    END LOOP;
END
$seed$;

-- =========================================================================
-- 3. Serveur seul juge : verif_calcul (version 0123 reproduite A L'IDENTIQUE,
--    + 3 codes CE1 : allowlist, op2 deux-etapes etendu, bornes CE1).
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

    IF p_op2 IS NOT NULL AND p_competence NOT IN ('MA.PB.DEUX_ETAPES','MA.PB.CE1_DEUX_ETAPES') THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'op2 interdit pour cette competence';
    END IF;
    IF p_competence IN ('MA.PB.DEUX_ETAPES','MA.PB.CE1_DEUX_ETAPES') AND (p_op2 IS NULL OR p_c IS NULL) THEN
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
        WHEN p_competence = 'MA.NUM.CE1_MILLE'        THEN ARRAY['val','cmp']
        WHEN p_competence = 'MA.POSE.ADDITION'        THEN ARRAY['add']
        WHEN p_competence = 'MA.POSE.SOUSTRACTION'    THEN ARRAY['sub']
        WHEN p_competence = 'MA.POSE.CE1_ADDITION'    THEN ARRAY['add']
        WHEN p_competence = 'MA.POSE.CE1_SOUSTRACTION' THEN ARRAY['sub']
        WHEN p_competence = 'MA.POSE.MULTIPLICATION'  THEN ARRAY['mul']
        WHEN p_competence = 'MA.POSE.MULT2'           THEN ARRAY['mul']
        WHEN p_competence = 'MA.POSE.DIVISION'        THEN ARRAY['div']
        WHEN p_competence = 'MA.PB.ADD_SUB'           THEN ARRAY['add','sub']
        WHEN p_competence = 'MA.PB.MULT_DIV'          THEN ARRAY['mul','div']
        WHEN p_competence = 'MA.PB.CE1_MULT_DIV'      THEN ARRAY['mul','div']
        WHEN p_competence = 'MA.PB.MONNAIE'           THEN ARRAY['val','sub','cmp']
        WHEN p_competence = 'MA.PB.DEUX_ETAPES'       THEN ARRAY['add','sub','mul','div']
        WHEN p_competence = 'MA.PB.CE1_DEUX_ETAPES'   THEN ARRAY['add','sub','mul','div']
        WHEN p_competence = 'MA.PB.MESURES'           THEN ARRAY['val','add','sub','mul','div']
        WHEN p_competence = 'MA.MES.HEURE'            THEN ARRAY['val','sub','add']
        WHEN p_competence = 'MA.MES.DUREES'           THEN ARRAY['val','add','sub','mul','div']
        WHEN p_competence = 'MA.MES.LONGUEURS'          THEN ARRAY['val','mul','div','cmp']
        WHEN p_competence = 'MA.MES.MASSES_CONTENANCES' THEN ARRAY['val','mul','div','cmp']
        WHEN p_competence = 'MA.MES.CE1_LONGUEURS'      THEN ARRAY['val']
        WHEN p_competence = 'MA.MES.CE1_MASSES'         THEN ARRAY['val']
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
        ELSIF p_competence = 'MA.NUM.CE1_MILLE' THEN
            IF p_a > 1000 OR p_b > 1000 THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'numeration CE1 : nombre > 1000';
            END IF;
        ELSIF p_a > 10000 OR p_b > 10000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'numeration : nombre > 10000';
        END IF;
    ELSIF p_competence LIKE 'MA.POSE.%' THEN
        IF p_competence LIKE 'MA.POSE.CE1_%' THEN
            IF p_a > 1000 OR p_b > 1000 THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'calcul pose CE1 : operande > 1000';
            END IF;
        ELSIF p_a > 10000 OR p_b > 10000 THEN
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
        IF p_competence = 'MA.PB.CE1_DEUX_ETAPES'
           AND (p_a > 100 OR p_b > 100 OR (p_c IS NOT NULL AND p_c > 100)) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'deux etapes CE1 : operande > 100';
        END IF;
        IF p_a > 20000 OR p_b > 20000 OR (p_c IS NOT NULL AND p_c > 20000) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'probleme : operande trop grand';
        END IF;
    ELSIF p_competence LIKE 'MA.MES.%' THEN
        IF p_competence LIKE 'MA.MES.CE1_%' AND (p_a > 1000 OR p_b > 1000) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mesure CE1 : operande > 1000';
        END IF;
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

REVOKE EXECUTE ON FUNCTION public.verif_calcul(text, integer, text, integer, integer, text, integer) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 4. Garde-fous : portee [CE1,CE1], 4 exercices chacune, prerequis presents,
--    verif_calcul coherente sur un cas par competence.
-- =========================================================================
DO $gf$
DECLARE n integer; v_comp text; v_exp integer;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['MA.MES.CE1_LONGUEURS','MA.MES.CE1_MASSES','MA.PB.CE1_DEUX_ETAPES'] LOOP
        IF NOT EXISTS (SELECT 1 FROM public.competences
                        WHERE code = v_comp AND classe_min = 'CE1' AND classe_max = 'CE1') THEN
            RAISE EXCEPTION '% : portee [CE1,CE1] attendue', v_comp;
        END IF;
        SELECT count(*) INTO n FROM public.exercices WHERE competence = v_comp AND type = 'calcul' AND actif;
        IF n <> 4 THEN RAISE EXCEPTION '% : 4 exercices attendus, obtenu %', v_comp, n; END IF;
    END LOOP;

    SELECT count(*) INTO n FROM public.competence_prerequis
     WHERE (competence,prerequis) IN (
        ('MA.MES.LONGUEURS','MA.MES.CE1_LONGUEURS'),
        ('MA.MES.MASSES_CONTENANCES','MA.MES.CE1_MASSES'),
        ('MA.PB.DEUX_ETAPES','MA.PB.CE1_DEUX_ETAPES'));
    IF n <> 3 THEN RAISE EXCEPTION 'prerequis de remediation : 3 attendus, obtenu %', n; END IF;

    -- Mesure CE1 : choix d'unite (val) accepte le code.
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.MES.CE1_LONGUEURS', 1, 'val', 2, 0, NULL, NULL);
    IF v_exp <> 2 THEN RAISE EXCEPTION 'CE1_LONGUEURS val KO : %', v_exp; END IF;
    -- Deux etapes CE1 : 3 x 4 = 12 puis + 5 = 17.
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.PB.CE1_DEUX_ETAPES', 2, 'mul', 3, 4, 'add', 5);
    IF v_exp <> 17 THEN RAISE EXCEPTION 'CE1_DEUX_ETAPES mul+add KO : %', v_exp; END IF;
    -- Borne CE1 deux-etapes : operande > 100 refuse.
    BEGIN
        PERFORM public.verif_calcul('MA.PB.CE1_DEUX_ETAPES', 1, 'add', 150, 10, 'sub', 5);
        RAISE EXCEPTION 'borne CE1 deux-etapes non appliquee';
    EXCEPTION WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE; END IF;
    END;
END
$gf$;

-- =========================================================================
-- 5. Enregistrement de la migration.
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0126_ce1_mesures_deux_etapes_dedie')
ON CONFLICT (version) DO NOTHING;
