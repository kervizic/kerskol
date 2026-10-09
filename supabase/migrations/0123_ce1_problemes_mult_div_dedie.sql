-- 0123_ce1_problemes_mult_div_dedie.sql
-- LOT CE1 (incrément 11) - MATHS : problèmes multiplicatifs CE1 dédiés.
--
-- MA.PB.MULT_DIV (partagée, ouverte au CE1 par 0114) utilise à N3-N4 les TABLES
-- 6 à 9 : hors du programme CE1 (qui ne travaille que les tables 2, 3, 4, 5).
-- On crée une compétence CE1 dédiée, bornée au CE1 (classe_min = classe_max =
-- 'CE1'), dont les 4 niveaux n'utilisent QUE les tables 2-5 (produits <= 50) :
--   MA.PB.CE1_MULT_DIV — problèmes de multiplication et de partage (CE1).
-- Attendus fin de CE1 : résoudre des problèmes relevant du sens de la
-- multiplication (groupement, itération d'addition) et du partage / groupement,
-- avec les tables mémorisées au CE1 (2, 3, 4, 5).
-- Progression (TOUS niveaux CE1) :
--   N1 : groupement / partage simples, tables 2 et 5 ;
--   N2 : + quotition (groupement), tables 2-5 ;
--   N3 : partage / quotition / groupement, tables 2-5 ;
--   N4 : + « fois plus », tables 2-5.
-- Le code se termine par MULT_DIV pour que le générateur (buildProbleme ->
-- buildMultDiv) le rende exactement comme les problèmes existants ; la banque de
-- gabarits (textes bienveillants) est réutilisée via la normalisation « .CE1_ »
-- -> « . » (frontend problemes.ts). Seuls les PARAMS (tables 2-5) changent.
--
-- SÛRETÉ CE2 (Iris) : même dispositif que 0121/0122. Compétence [CE1,CE1]
-- écartée du pool normal d'un CE2 par le moteur ; ne revient qu'en RÉVISION
-- comme prérequis de remédiation de MA.PB.MULT_DIV (déclarée au coeur du plan
-- CE2, classUnlocks, anti-verrouillage). Aucune donnée élève touchée.
-- Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Compétence CE1 dédiée, bornée au CE1.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max)
VALUES ('MA.PB.CE1_MULT_DIV', 'MA', 'problemes',
        'Problemes : multiplier et partager (CE1, tables 2 a 5)', 505, 'CE1', 'CE1')
ON CONFLICT (code) DO UPDATE
    SET matiere = EXCLUDED.matiere, domaine = EXCLUDED.domaine,
        libelle = EXCLUDED.libelle, ordre = EXCLUDED.ordre,
        classe_min = EXCLUDED.classe_min, classe_max = EXCLUDED.classe_max;

-- =========================================================================
-- 2. Lien prérequis CE1 -> CE2 (remédiation, cf. composeSession).
-- =========================================================================
INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min)
VALUES ('MA.PB.MULT_DIV', 'MA.PB.CE1_MULT_DIV', 2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 3. Banque : 4 niveaux, tables 2-5 uniquement (produits <= 50).
-- =========================================================================
DO $seed$
DECLARE
    r    record;
    v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        ('MA.PB.CE1_MULT_DIV',1,'probleme','probleme','cpa_barres','aucun','schema_barres',
         '{"types":["groupement","partage"],"tables":[2,5],"qmax":6}'::jsonb),
        ('MA.PB.CE1_MULT_DIV',2,'probleme','probleme','exemples_estompes','aucun','schema_barres',
         '{"types":["groupement","partage","quotition"],"tables":[2,3,4,5],"qmax":8}'::jsonb),
        ('MA.PB.CE1_MULT_DIV',3,'probleme','probleme','variation','aucun','schema_barres',
         '{"types":["partage","quotition","groupement"],"tables":[2,3,4,5],"qmax":10}'::jsonb),
        ('MA.PB.CE1_MULT_DIV',4,'probleme','probleme','probleme_dabord','aucun','schema_barres',
         '{"types":["partage","quotition","fois_plus","groupement"],"tables":[2,3,4,5],"qmax":10}'::jsonb)
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
-- 4. Serveur seul juge : verif_calcul reconnaît MA.PB.CE1_MULT_DIV.
--    Base = version en vigueur (migration 0122) reproduite À L'IDENTIQUE, avec
--    l'ajout du code CE1 (opérations autorisées ['mul','div'], borne problème
--    <= 20 000 héritée du préfixe MA.PB.%).
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

REVOKE EXECUTE ON FUNCTION public.verif_calcul(text, integer, text, integer, integer, text, integer) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 5. Garde-fous.
-- =========================================================================
DO $do$
DECLARE n integer; cmn text; cmx text; v_exp integer;
BEGIN
    SELECT classe_min, classe_max INTO cmn, cmx FROM public.competences WHERE code = 'MA.PB.CE1_MULT_DIV';
    IF cmn <> 'CE1' OR cmx <> 'CE1' THEN
        RAISE EXCEPTION 'CE1 pb mult/div : portee attendue [CE1,CE1], obtenu [%,%]', cmn, cmx;
    END IF;

    SELECT count(*) INTO n FROM public.exercices
     WHERE competence = 'MA.PB.CE1_MULT_DIV' AND type = 'calcul' AND actif;
    IF n <> 4 THEN
        RAISE EXCEPTION 'CE1 pb mult/div : 4 exercices attendus, obtenu %', n;
    END IF;

    SELECT count(*) INTO n FROM public.competence_prerequis
     WHERE competence = 'MA.PB.MULT_DIV' AND prerequis = 'MA.PB.CE1_MULT_DIV';
    IF n <> 1 THEN
        RAISE EXCEPTION 'CE1 pb mult/div : prerequis de remediation absent';
    END IF;

    SELECT expected INTO v_exp FROM public.verif_calcul('MA.PB.CE1_MULT_DIV', 1, 'mul', 4, 5, NULL, NULL);
    IF v_exp <> 20 THEN
        RAISE EXCEPTION 'CE1 pb mult/div : 4x5 attendu 20, obtenu %', v_exp;
    END IF;
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.PB.CE1_MULT_DIV', 3, 'div', 20, 5, NULL, NULL);
    IF v_exp <> 4 THEN
        RAISE EXCEPTION 'CE1 pb mult/div : 20/5 attendu 4, obtenu %', v_exp;
    END IF;
    BEGIN
        PERFORM public.verif_calcul('MA.PB.CE1_MULT_DIV', 1, 'cmp', 4, 5, NULL, NULL);
        RAISE EXCEPTION 'CE1 pb mult/div : op cmp aurait du etre refusee';
    EXCEPTION WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE; END IF;
    END;
END $do$;

-- =========================================================================
-- 6. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0123_ce1_problemes_mult_div_dedie')
ON CONFLICT (version) DO NOTHING;
