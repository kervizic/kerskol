-- 0075_cm1_grandeurs_mesures.sql
-- LOT 5 (CM1) - MATHEMATIQUES : « Grandeurs et mesures ».
-- Attendus de fin de CM1 (programme cycle 3, actualise 2025, eduscol doc 13990) :
-- perimetre et aire d'un carre / d'un rectangle (formules) ; durees ; vocabulaire
-- des angles (droit / aigu / obtus).
--
-- On REUTILISE les moteurs existants (aucune nouvelle UI) :
--   * PERIMETRE / AIRE : moteur de CALCUL (saisie clavier, enonce texte avec les
--     dimensions). AIRE -> op 'mul' (serveur recalcule L x l) ; PERIMETRE ->
--     op 'val' (valeur cible encodee, comme fractions/decimaux : un perimetre
--     2x(L+l) n'est pas un produit en une operation). Domaine `mesures`.
--   * ANGLES : moteur `donnees` (op 'don', QCM, figure « none » ; code
--     MA.DONNEES.ANGLES pour le routage/verif, domaine `mesures`).
--   * DUREES : on ELARGIT simplement la portee de MA.MES.DUREES a CM1..CM2.
--
-- Nouvelles competences (portee CM1..CM2) :
--   MA.MES.PERIMETRE, MA.MES.AIRE (domaine mesures) ; MA.DONNEES.ANGLES
--   (domaine mesures). Plan de classe CM1 (coeur). Serveur SEUL JUGE.
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaines `mesures` et `heure` deja actifs
-- (aucun changement du defaut). Comptage de carreaux pour l'aire (figure) :
-- reporte (cf. docs/explications.md).

-- =========================================================================
-- 1. Referentiel : competences CM1 + elargissement de portee de DUREES.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('MA.MES.PERIMETRE',   'MA', 'mesures', 'Le périmètre',  760, 'CM1', 'CM2'),
    ('MA.MES.AIRE',        'MA', 'mesures', 'L''aire',        761, 'CM1', 'CM2'),
    ('MA.DONNEES.ANGLES',  'MA', 'mesures', 'Les angles',     762, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE
    SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine, libelle=EXCLUDED.libelle,
        ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

UPDATE public.competences SET classe_max = 'CM2'
 WHERE code = 'MA.MES.DUREES' AND classe_max <> 'CM2';

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.MES.PERIMETRE',  'MA.MES.LONGUEURS',   2),
    ('MA.MES.AIRE',       'MA.PB.MULT_DIV',     2),
    ('MA.DONNEES.ANGLES', 'MA.GEO.VOCABULAIRE', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Exercices + ex_calcul : perimetre / aire (miroir seedSources, bloc
--    GRANDEURS). operation='mul', forme='mesure' (deja autorises).
-- =========================================================================
DO $seed$
DECLARE r record; v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        ('MA.MES.PERIMETRE',1,'cpa_barres','{"types":["carre"],"min":2,"max":9}'::jsonb),
        ('MA.MES.PERIMETRE',2,'exemples_estompes','{"types":["carre","rectangle"],"min":2,"max":12}'::jsonb),
        ('MA.MES.PERIMETRE',3,'variation','{"types":["rectangle"],"min":3,"max":20}'::jsonb),
        ('MA.MES.PERIMETRE',4,'probleme_dabord','{"types":["rectangle","carre"],"min":5,"max":40}'::jsonb),
        ('MA.MES.AIRE',1,'cpa_barres','{"types":["carre"],"min":2,"max":6}'::jsonb),
        ('MA.MES.AIRE',2,'exemples_estompes','{"types":["carre","rectangle"],"min":2,"max":9}'::jsonb),
        ('MA.MES.AIRE',3,'variation','{"types":["rectangle"],"min":2,"max":12}'::jsonb),
        ('MA.MES.AIRE',4,'probleme_dabord','{"types":["rectangle","carre"],"min":3,"max":15}'::jsonb)
        ) AS t(competence,niveau,methode,params)
    LOOP
        v_id := md5(r.competence || ':' || r.niveau || ':calcul')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, r.competence, 'calcul', r.niveau, r.methode, true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
            methode=EXCLUDED.methode, actif=true;
        INSERT INTO public.ex_calcul (exercice_id, type, operation, forme, params, support_visuel, correction_strategie)
        VALUES (v_id, 'calcul', 'mul', 'mesure', r.params, 'aucun', r.competence)
        ON CONFLICT (exercice_id) DO UPDATE SET operation=EXCLUDED.operation, forme=EXCLUDED.forme,
            params=EXCLUDED.params, support_visuel=EXCLUDED.support_visuel, correction_strategie=EXCLUDED.correction_strategie;
    END LOOP;
END $seed$;

-- =========================================================================
-- 3. Angles : items de reference (miroir donnees.ts) + exercices donnees.
-- =========================================================================
INSERT INTO public.donnees_item (cle, competence, niveau, format, attendu) VALUES
    ('ang-n1-a', 'MA.DONNEES.ANGLES', 1, 'qcm',   'droit'),
    ('ang-n1-b', 'MA.DONNEES.ANGLES', 1, 'qcm',   'aigu'),
    ('ang-n2-a', 'MA.DONNEES.ANGLES', 2, 'qcm',   'obtus'),
    ('ang-n2-b', 'MA.DONNEES.ANGLES', 2, 'qcm',   'droit'),
    ('ang-n3-a', 'MA.DONNEES.ANGLES', 3, 'qcm',   'aigu'),
    ('ang-n3-b', 'MA.DONNEES.ANGLES', 3, 'qcm',   'obtus'),
    ('ang-n4-a', 'MA.DONNEES.ANGLES', 4, 'texte', 'droit'),
    ('ang-n4-b', 'MA.DONNEES.ANGLES', 4, 'texte', 'aigu')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('MA.DONNEES.ANGLES:' || v_niv || ':donnees')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'MA.DONNEES.ANGLES', 'donnees', v_niv, 'donnees', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence, type=EXCLUDED.type,
            niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. verif_calcul : SEUL JUGE. Definition courante (0072, avec MA.DEC) + ajout
--    des familles MA.MES.PERIMETRE (val/mul) et MA.MES.AIRE (mul). Les bornes
--    MA.MES.% (<= 20000) couvrent perimetres et aires. CREATE OR REPLACE.
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
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0075_cm1_grandeurs_mesures')
ON CONFLICT (version) DO NOTHING;
