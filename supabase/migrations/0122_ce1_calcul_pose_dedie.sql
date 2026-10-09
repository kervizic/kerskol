-- 0122_ce1_calcul_pose_dedie.sql
-- LOT CE1 (incrément 10) - MATHS : calcul POSÉ CE1 dédié (addition et
-- soustraction posées), bornées au CE1 (classe_min = classe_max = 'CE1').
--
-- Les compétences partagées MA.POSE.ADDITION / MA.POSE.SOUSTRACTION ouvertes au
-- CE1 (0114) débordent vers le CE2 à N3-N4 (opérandes jusqu'à 9 999). On crée
-- deux compétences CE1 dédiées dont les 4 niveaux restent calibrés CE1 :
--   MA.POSE.CE1_ADDITION     — addition posée, nombres <= 1 000 ;
--   MA.POSE.CE1_SOUSTRACTION — soustraction posée, nombres <= 1 000.
-- Attendus fin de CE1 (programme 2024, cycle 2) : poser et calculer une addition
-- ou une soustraction dans le domaine numérique <= 1 000.
-- Progression (TOUS niveaux CE1) :
--   N1 : 2 chiffres SANS retenue/emprunt ;
--   N2 : 2 chiffres AVEC retenue/emprunt ;
--   N3 : 3 chiffres SANS retenue/emprunt (<= 1 000) ;
--   N4 : 3 chiffres AVEC retenue/emprunt (<= 1 000).
-- Les codes se terminent par ADDITION / SOUSTRACTION pour que le générateur
-- (buildPose) les rende exactement comme le calcul posé existant ; seuls les
-- PARAMS (bornes <= 1 000) changent.
--
-- SÛRETÉ CE2 (Iris) : même dispositif que 0121. Compétences [CE1,CE1] écartées
-- du pool normal d'un CE2 par le moteur (composeSession) ; elles ne reviennent
-- qu'en RÉVISION comme prérequis de remédiation des compétences CE2 liées
-- (MA.POSE.ADDITION, MA.POSE.SOUSTRACTION), déclarées au coeur du plan CE2
-- (classUnlocks) pour qu'aucune séance de CE2 ne soit verrouillée. Aucune donnée
-- élève touchée. Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Compétences CE1 dédiées, bornées au CE1.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max)
VALUES
    ('MA.POSE.CE1_ADDITION',     'MA', 'calcul_pose', 'Addition posee (CE1, <= 1 000)',     405, 'CE1', 'CE1'),
    ('MA.POSE.CE1_SOUSTRACTION', 'MA', 'calcul_pose', 'Soustraction posee (CE1, <= 1 000)', 415, 'CE1', 'CE1')
ON CONFLICT (code) DO UPDATE
    SET matiere = EXCLUDED.matiere, domaine = EXCLUDED.domaine,
        libelle = EXCLUDED.libelle, ordre = EXCLUDED.ordre,
        classe_min = EXCLUDED.classe_min, classe_max = EXCLUDED.classe_max;

-- =========================================================================
-- 2. Liens prérequis CE1 -> CE2 (canal de REMÉDIATION, cf. composeSession).
-- =========================================================================
INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min)
VALUES
    ('MA.POSE.ADDITION',     'MA.POSE.CE1_ADDITION',     2),
    ('MA.POSE.SOUSTRACTION', 'MA.POSE.CE1_SOUSTRACTION', 2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 3. Banque : 4 niveaux par compétence, TOUS calibrés CE1 (<= 1 000).
-- =========================================================================
DO $seed$
DECLARE
    r    record;
    v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        -- Addition posée CE1
        ('MA.POSE.CE1_ADDITION',1,'add','pose','cpa_barres','aucun','addition_posee',
         '{"terms":2,"min":11,"max":99,"sans_retenue":true}'::jsonb),
        ('MA.POSE.CE1_ADDITION',2,'add','pose','exemples_estompes','aucun','addition_posee',
         '{"terms":2,"min":11,"max":89}'::jsonb),
        ('MA.POSE.CE1_ADDITION',3,'add','pose','variation','aucun','addition_posee',
         '{"terms":2,"min":100,"max":499,"sans_retenue":true}'::jsonb),
        ('MA.POSE.CE1_ADDITION',4,'add','pose','probleme_dabord','aucun','addition_posee',
         '{"terms":2,"min":100,"max":450}'::jsonb),
        -- Soustraction posée CE1
        ('MA.POSE.CE1_SOUSTRACTION',1,'sub','pose','cpa_barres','aucun','soustraction_posee',
         '{"min":11,"max":99,"bmin":10,"bmax":99,"sans_retenue":true}'::jsonb),
        ('MA.POSE.CE1_SOUSTRACTION',2,'sub','pose','exemples_estompes','aucun','soustraction_posee',
         '{"min":20,"max":99,"bmin":10,"bmax":98}'::jsonb),
        ('MA.POSE.CE1_SOUSTRACTION',3,'sub','pose','variation','aucun','soustraction_posee',
         '{"min":100,"max":999,"bmin":10,"bmax":500,"sans_retenue":true}'::jsonb),
        ('MA.POSE.CE1_SOUSTRACTION',4,'sub','pose','probleme_dabord','aucun','soustraction_posee',
         '{"min":100,"max":999,"bmin":10,"bmax":900}'::jsonb)
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
-- 4. Serveur seul juge : verif_calcul reconnaît les codes CE1 posés.
--    Base = version en vigueur (migration 0121) reproduite À L'IDENTIQUE, avec
--    ajout des deux codes CE1 posés (add / sub) et borne stricte <= 1 000.
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
            -- Niveau CE1 strict : opérandes posés <= 1 000.
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
DECLARE n integer; v_exp integer;
BEGIN
    SELECT count(*) INTO n FROM public.competences
     WHERE code IN ('MA.POSE.CE1_ADDITION','MA.POSE.CE1_SOUSTRACTION')
       AND classe_min = 'CE1' AND classe_max = 'CE1';
    IF n <> 2 THEN
        RAISE EXCEPTION 'CE1 pose dedie : 2 competences [CE1,CE1] attendues, obtenu %', n;
    END IF;

    SELECT count(*) INTO n FROM public.exercices
     WHERE competence IN ('MA.POSE.CE1_ADDITION','MA.POSE.CE1_SOUSTRACTION')
       AND type = 'calcul' AND actif;
    IF n <> 8 THEN
        RAISE EXCEPTION 'CE1 pose dedie : 8 exercices attendus, obtenu %', n;
    END IF;

    SELECT count(*) INTO n FROM public.competence_prerequis
     WHERE (competence = 'MA.POSE.ADDITION'     AND prerequis = 'MA.POSE.CE1_ADDITION')
        OR (competence = 'MA.POSE.SOUSTRACTION' AND prerequis = 'MA.POSE.CE1_SOUSTRACTION');
    IF n <> 2 THEN
        RAISE EXCEPTION 'CE1 pose dedie : prerequis de remediation manquants (obtenu %)', n;
    END IF;

    -- Serveur : add 123+456 = 579 accepté ; op interdite (cmp) refusée ; > 1000 refusé.
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.POSE.CE1_ADDITION', 4, 'add', 123, 456, NULL, NULL);
    IF v_exp <> 579 THEN
        RAISE EXCEPTION 'CE1 pose dedie : 123+456 attendu 579, obtenu %', v_exp;
    END IF;
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.POSE.CE1_SOUSTRACTION', 2, 'sub', 72, 38, NULL, NULL);
    IF v_exp <> 34 THEN
        RAISE EXCEPTION 'CE1 pose dedie : 72-38 attendu 34, obtenu %', v_exp;
    END IF;
    BEGIN
        PERFORM public.verif_calcul('MA.POSE.CE1_ADDITION', 1, 'add', 1200, 50, NULL, NULL);
        RAISE EXCEPTION 'CE1 pose dedie : operande 1200 aurait du etre refuse (> 1000)';
    EXCEPTION WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM public.verif_calcul('MA.POSE.CE1_ADDITION', 1, 'sub', 50, 20, NULL, NULL);
        RAISE EXCEPTION 'CE1 pose dedie : op sub aurait du etre refusee pour ADDITION';
    EXCEPTION WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE; END IF;
    END;
END $do$;

-- =========================================================================
-- 6. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0122_ce1_calcul_pose_dedie')
ON CONFLICT (version) DO NOTHING;
