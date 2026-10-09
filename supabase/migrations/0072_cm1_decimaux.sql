-- 0072_cm1_decimaux.sql
-- LOT 2 (CM1) - MATHEMATIQUES : « Nombres decimaux ».
-- Attendus de fin de CM1 (programme cycle 3, actualise 2025, eduscol doc 13990) :
-- comprendre et utiliser les nombres decimaux (dixiemes, centiemes) ; les ecrire,
-- les comparer, les encadrer entre deux entiers ; faire le lien avec les
-- fractions decimales.
--
-- NOUVELLE SOUS-MATIERE / domaine `decimaux` (portee CM1..CM2, visible CM1+).
-- Trois competences, toutes jugees par le SERVEUR (verif_calcul, op 'val') :
--   MA.DEC.ECRIRE    ecrire un decimal (dixiemes / centiemes / fraction decimale) ;
--   MA.DEC.COMPARER  comparer deux decimaux (ecrire le plus grand / le plus petit) ;
--   MA.DEC.ENCADRER  encadrer entre deux entiers (ecrire l'entier avant / apres).
--
-- ENCODAGE EN CENTIEMES (entier) : un decimal x est code round(x*100) (ex. 3,25
-- -> 325). Le composant <DecimalInput> (pave + virgule) convertit la saisie ;
-- aucun flottant ne circule. La reponse attendue est la valeur cible (op 'val',
-- expected = a). Bornes : famille MA.DEC.% <= 100000 centiemes (= 1000,00), via
-- la borne generale de verif_calcul.
--
-- Generation CLIENT (buildDecimal) depuis ex_calcul.params (forme 'decimal'),
-- miroir de frontend/src/domain/calcul/seedSources.ts (bloc DEC) et
-- decimaux.ts. Serveur = seul juge (verif_calcul). Plan de classe CM1 (coeur).
--
-- Migration ADDITIVE et IDEMPOTENTE. Le domaine `decimaux` est ajoute ACTIF au
-- defaut et aux profils existants ; la sous-matiere reste MASQUEE pour un CE2
-- (visibilite stricte classeMin='CM1' cote client), donc Iris ne la voit pas
-- dans ses reglages (elle ne pourrait la croiser qu'« en avance », prerequis
-- MA.FRAC.SIMPLES niveau 2).

-- =========================================================================
-- 1. Extension des CHECK de ex_calcul : operation + forme 'decimal'.
-- =========================================================================
ALTER TABLE public.ex_calcul DROP CONSTRAINT IF EXISTS ex_calcul_operation_chk;
ALTER TABLE public.ex_calcul ADD  CONSTRAINT ex_calcul_operation_chk CHECK (operation IN (
    'add','sub','mul','div','double','moitie','complement','lire','decomposer',
    'comparer','encadrer','probleme','heure','duree','longueur','masse','fraction','decimal'));
ALTER TABLE public.ex_calcul DROP CONSTRAINT IF EXISTS ex_calcul_forme_chk;
ALTER TABLE public.ex_calcul ADD  CONSTRAINT ex_calcul_forme_chk CHECK (forme IN (
    'resultat','terme_manquant','decomposition','ordre_grandeur','reste','comparaison',
    'lecture','encadrement','pose','probleme','mesure','fraction','decimal'));

-- =========================================================================
-- 2. Referentiel : 3 competences CM1 (domaine decimaux, portee CM1..CM2).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('MA.DEC.ECRIRE',   'MA', 'decimaux', 'Écrire un nombre décimal',   740, 'CM1', 'CM2'),
    ('MA.DEC.COMPARER', 'MA', 'decimaux', 'Comparer des nombres décimaux', 741, 'CM1', 'CM2'),
    ('MA.DEC.ENCADRER', 'MA', 'decimaux', 'Encadrer un nombre décimal',  742, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE
    SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine, libelle=EXCLUDED.libelle,
        ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

-- Prerequis : les decimaux prolongent les fractions (lien fractions decimales) ;
-- comparer / encadrer supposent savoir ecrire un decimal.
INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.DEC.ECRIRE',   'MA.FRAC.SIMPLES', 2),
    ('MA.DEC.COMPARER', 'MA.DEC.ECRIRE',   2),
    ('MA.DEC.ENCADRER', 'MA.DEC.ECRIRE',   2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 3. Seed exercices + ex_calcul (miroir EXACT de seedSources.ts, bloc DEC).
--    operation='decimal', forme='decimal'. La generation lit params cote client.
-- =========================================================================
DO $seed$
DECLARE
    r    record;
    v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        ('MA.DEC.ECRIRE',1,'cpa_barres','{"types":["ecrire_dixiemes"],"maxE":9}'::jsonb),
        ('MA.DEC.ECRIRE',2,'exemples_estompes','{"types":["ecrire_centiemes","ecrire_dixiemes"],"maxE":9}'::jsonb),
        ('MA.DEC.ECRIRE',3,'variation','{"types":["ecrire_centiemes","ecrire_fraction"],"maxE":20}'::jsonb),
        ('MA.DEC.ECRIRE',4,'probleme_dabord','{"types":["ecrire_fraction","ecrire_centiemes"],"maxE":99}'::jsonb),
        ('MA.DEC.COMPARER',1,'cpa_barres','{"types":["comparer_grand"],"maxE":5}'::jsonb),
        ('MA.DEC.COMPARER',2,'exemples_estompes','{"types":["comparer_grand","comparer_petit"],"maxE":9}'::jsonb),
        ('MA.DEC.COMPARER',3,'variation','{"types":["comparer_grand","comparer_petit"],"maxE":20}'::jsonb),
        ('MA.DEC.COMPARER',4,'probleme_dabord','{"types":["comparer_grand","comparer_petit"],"maxE":99}'::jsonb),
        ('MA.DEC.ENCADRER',1,'cpa_barres','{"types":["encadrer_avant"],"maxE":5}'::jsonb),
        ('MA.DEC.ENCADRER',2,'exemples_estompes','{"types":["encadrer_avant","encadrer_apres"],"maxE":9}'::jsonb),
        ('MA.DEC.ENCADRER',3,'variation','{"types":["encadrer_avant","encadrer_apres"],"maxE":20}'::jsonb),
        ('MA.DEC.ENCADRER',4,'probleme_dabord','{"types":["encadrer_avant","encadrer_apres"],"maxE":99}'::jsonb)
        ) AS t(competence,niveau,methode,params)
    LOOP
        v_id := md5(r.competence || ':' || r.niveau || ':calcul')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, r.competence, 'calcul', r.niveau, r.methode, true)
        ON CONFLICT (id) DO UPDATE
            SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
                methode=EXCLUDED.methode, actif=true;
        INSERT INTO public.ex_calcul (exercice_id, type, operation, forme, params, support_visuel, correction_strategie)
        VALUES (v_id, 'calcul', 'decimal', 'decimal', r.params, 'aucun', 'ecrire_decimal')
        ON CONFLICT (exercice_id) DO UPDATE
            SET operation=EXCLUDED.operation, forme=EXCLUDED.forme, params=EXCLUDED.params,
                support_visuel=EXCLUDED.support_visuel, correction_strategie=EXCLUDED.correction_strategie;
    END LOOP;
END
$seed$;

-- =========================================================================
-- 4. verif_calcul : SEUL JUGE. Definition reprise a l'identique (0069) + ajout
--    de la famille MA.DEC.% (ops autorisees val / cmp ; bornes <= 100000 via la
--    borne generale). CREATE OR REPLACE : signature inchangee.
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
$$;

-- =========================================================================
-- 5. Sous-matiere `decimaux` ACTIVE par defaut + ajoutee aux profils existants.
--    (Visibilite stricte CM1 cote client : un CE2 ne la voit pas dans ses
--    reglages ; elle reste jouable « en avance » si prerequis acquis.)
-- =========================================================================
-- DEFAUT COMPLET (liste de 0063) + 'decimaux'. NB : la liste doit inclure TOUTES
-- les sous-matieres deja presentes au defaut (QM, EMC, ecriture), sinon un
-- nouveau profil les perdrait (cf. correctif 0073).
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','decimaux','geometrie','repere','donnees',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe',
        'lecture','mots-maitresse','vivant','matiere','objets','espace','temps',
        'respect','emotions','republique','ecrans','ecriture'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'decimaux')
 WHERE NOT ('decimaux' = ANY (domaines_actifs));

-- =========================================================================
-- 6. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0072_cm1_decimaux')
ON CONFLICT (version) DO NOTHING;
