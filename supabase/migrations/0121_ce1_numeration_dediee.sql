-- 0121_ce1_numeration_dediee.sql
-- LOT CE1 (incrément 9) - MATHS : première compétence CE1 DÉDIÉE.
--
-- CONTEXTE. Les incréments 1 à 8 (migrations 0114-0120) ont rendu le CE1
-- JOUABLE en OUVRANT la portée (classe_min='CE1') de compétences partagées dont
-- la classe_max reste >= CE2. Conséquence : pour ces compétences, les niveaux
-- N3-N4 sont calibrés pour le CE2 (nombres jusqu'à 10 000, etc.) ; un CE1 qui
-- progresse « monte en zone CE2 ». Le prompt demande au contraire des
-- compétences CE1 dédiées dont les 4 niveaux restent TOUS calibrés CE1.
--
-- CETTE MIGRATION crée la 1re compétence CE1 dédiée, bornée au CE1
-- (classe_min = classe_max = 'CE1') :
--   MA.NUM.CE1_MILLE — « Les nombres jusqu'à 1 000 (CE1) ».
-- Attendus de fin de CE1 (programme 2024, cycle 2, Éduscol) : lire/écrire,
-- comparer/ranger, décomposer (centaines/dizaines/unités) les nombres < 1 000.
-- Progression des 4 niveaux, TOUS au niveau CE1 (aucun débordement CE2) :
--   N1 (début CE1) : lire un nombre <= 100 (QCM, nom du nombre) ;
--   N2            : comparer deux nombres <= 1 000 (<, =, >) ;
--   N3            : décomposer un nombre < 1 000 par rang (c / d / u) ;
--   N4 (fin CE1)  : ranger — trouver le plus grand parmi trois nombres < 1 000
--                   (saisie libre, exigeant mais sans sortir du CE1).
-- Le code commence par « MA.NUM. » pour que le GÉNÉRATEUR (buildNumeration)
-- rende ces exercices exactement comme la numération existante ; seuls les
-- PARAMS (bornes <= 1 000) changent. L'écriture en toutes lettres (op 'lettres')
-- est volontairement différée : elle est verrouillée côté serveur à
-- MA.NUM.LIRE_ECRIRE (enregistrer_reponse) et toucher ce dispatcher central
-- serait disproportionné pour cet incrément ; N4 « ranger » reste jugé par
-- verif_calcul (op 'val'), même contrat de sécurité.
--
-- SÛRETÉ POUR LES CE2 (Iris). Une compétence [CE1,CE1] est, par la marge d'un
-- an, CANDIDATE pour un CE2. Pour qu'elle ne POLLUE PAS ses séances, le moteur
-- (composeSession) a été complété : une compétence dont classe_max < classe de
-- l'enfant est écartée du pool normal (jamais nouveauté/lacune) et ne revient
-- qu'EN RÉVISION comme PRÉREQUIS d'une compétence LIÉE en lacune. On définit
-- donc le lien prérequis CE1 -> CE2 : MA.NUM.COMPARER (CE2) a pour prérequis de
-- remédiation MA.NUM.CE1_MILLE. Pour éviter tout VERROUILLAGE d'une séance de
-- CE2 (le prérequis CE1 n'a pas de progression chez Iris), MA.NUM.COMPARER est
-- déclarée au « coeur » du plan CE2 (classUnlocks) côté client : elle reste
-- débloquée. Aucune donnée élève n'est touchée. Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Compétence CE1 dédiée, bornée au CE1.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max)
VALUES ('MA.NUM.CE1_MILLE', 'MA', 'numeration',
        'Les nombres jusqu''a 1 000 (CE1)', 305, 'CE1', 'CE1')
ON CONFLICT (code) DO UPDATE
    SET matiere = EXCLUDED.matiere, domaine = EXCLUDED.domaine,
        libelle = EXCLUDED.libelle, ordre = EXCLUDED.ordre,
        classe_min = EXCLUDED.classe_min, classe_max = EXCLUDED.classe_max;

-- =========================================================================
-- 2. Lien prérequis CE1 -> CE2 (canal de REMÉDIATION, cf. composeSession).
--    MA.NUM.CE1_MILLE est prérequis de MA.NUM.COMPARER : quand un CE2 est en
--    lacune sur COMPARER, la compétence CE1 revient en révision (marge -1).
-- =========================================================================
INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min)
VALUES ('MA.NUM.COMPARER', 'MA.NUM.CE1_MILLE', 2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 3. Banque : 4 niveaux, TOUS calibrés CE1 (<= 1 000). id déterministe.
-- =========================================================================
DO $seed$
DECLARE
    r    record;
    v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        -- competence, niveau, operation, forme, methode, support, correction, params
        ('MA.NUM.CE1_MILLE',1,'lire','lecture','cpa_barres','aucun','lire_nombre_jusqu_100',
         '{"type":"lire","min":0,"max":100}'::jsonb),
        ('MA.NUM.CE1_MILLE',2,'comparer','comparaison','exemples_estompes','aucun','comparer_jusqu_1000',
         '{"type":"comparer","min":0,"max":999}'::jsonb),
        ('MA.NUM.CE1_MILLE',3,'decomposer','decomposition','variation','aucun','decomposer_cdu',
         '{"type":"decomposer","ranks":["c","d","u"],"min":100,"max":999}'::jsonb),
        ('MA.NUM.CE1_MILLE',4,'comparer','comparaison','probleme_dabord','aucun','ranger_le_plus_grand',
         '{"type":"ranger","n":3,"min":100,"max":999}'::jsonb)
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
-- 4. Serveur seul juge : verif_calcul reconnaît MA.NUM.CE1_MILLE.
--    Base = version en vigueur (migration 0093) reproduite À L'IDENTIQUE, avec
--    DEUX ajouts CE1 : (a) opérations autorisées ['val','cmp'] ; (b) borne
--    stricte <= 1 000 (contrôle du niveau par les attendus CE1).
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
            -- Niveau CE1 strict : aucun nombre au-dela de 1 000.
            IF p_a > 1000 OR p_b > 1000 THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'numeration CE1 : nombre > 1000';
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

REVOKE EXECUTE ON FUNCTION public.verif_calcul(text, integer, text, integer, integer, text, integer) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 5. Garde-fous : compétence bornée CE1, 4 exercices, verif_calcul correct.
-- =========================================================================
DO $do$
DECLARE
    n       integer;
    cmn     text;
    cmx     text;
    v_exp   integer;
BEGIN
    -- 5a. Compétence bornée au CE1 (classe_min = classe_max = 'CE1').
    SELECT classe_min, classe_max INTO cmn, cmx FROM public.competences
     WHERE code = 'MA.NUM.CE1_MILLE';
    IF cmn <> 'CE1' OR cmx <> 'CE1' THEN
        RAISE EXCEPTION 'CE1 numeration dediee : portee attendue [CE1,CE1], obtenu [%,%]', cmn, cmx;
    END IF;

    -- 5b. 4 exercices actifs.
    SELECT count(*) INTO n FROM public.exercices
     WHERE competence = 'MA.NUM.CE1_MILLE' AND type = 'calcul' AND actif;
    IF n <> 4 THEN
        RAISE EXCEPTION 'CE1 numeration dediee : 4 exercices attendus, obtenu %', n;
    END IF;

    -- 5c. Prérequis de remédiation CE1 -> CE2 présent.
    SELECT count(*) INTO n FROM public.competence_prerequis
     WHERE competence = 'MA.NUM.COMPARER' AND prerequis = 'MA.NUM.CE1_MILLE';
    IF n <> 1 THEN
        RAISE EXCEPTION 'CE1 numeration dediee : prerequis MA.NUM.COMPARER <- MA.NUM.CE1_MILLE absent';
    END IF;

    -- 5d. Serveur : accepte 'val' <= 1000 et 'cmp', refuse > 1000 et op interdite.
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.NUM.CE1_MILLE', 4, 'val', 987, 0, NULL, NULL);
    IF v_exp <> 987 THEN
        RAISE EXCEPTION 'CE1 numeration dediee : val 987 attendu 987, obtenu %', v_exp;
    END IF;
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.NUM.CE1_MILLE', 2, 'cmp', 120, 450, NULL, NULL);
    IF v_exp <> 0 THEN
        RAISE EXCEPTION 'CE1 numeration dediee : cmp 120<450 attendu 0, obtenu %', v_exp;
    END IF;
    BEGIN
        PERFORM public.verif_calcul('MA.NUM.CE1_MILLE', 1, 'val', 1001, 0, NULL, NULL);
        RAISE EXCEPTION 'CE1 numeration dediee : 1001 aurait du etre refuse (> 1000)';
    EXCEPTION WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE; END IF;
    END;
    BEGIN
        PERFORM public.verif_calcul('MA.NUM.CE1_MILLE', 1, 'add', 10, 20, NULL, NULL);
        RAISE EXCEPTION 'CE1 numeration dediee : op add aurait du etre refusee';
    EXCEPTION WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE; END IF;
    END;
END $do$;

-- =========================================================================
-- 6. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0121_ce1_numeration_dediee')
ON CONFLICT (version) DO NOTHING;
