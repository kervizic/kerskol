-- 0025_rendu_rsub.sql
-- RENDU SUR PLUSIEURS ARTICLES : extension du contrat des problemes a deux
-- etapes avec une SECONDE operation INVERSEE `rsub` (reponse = c - r1).
--
-- Exemple : « Lea achete 3 cahiers a 4 €. Elle paie avec un billet de 20 €.
-- Combien lui rend-on ? » -> r1 = 3 × 4 = 12, reponse = 20 - 12 = 8.
--
-- Principe de securite INCHANGE (migrations 0022/0024) : le client envoie
-- l'enonce normalise verif:{op,a,b,op2,c} + sa saisie ; le SERVEUR recalcule et
-- decide seul « juste/faux ». `op2` (dont `rsub`) reste RESERVE a
-- MA.PB.DEUX_ETAPES. Le rendu doit etre >= 0 (c >= r1), en euros entiers.
--
-- Additive et idempotente : aucune donnee existante modifiee (Iris, foyers).
-- Seuls verif_calcul (recalcul) et les params DEUX_ETAPES N3/N4 (ajout des
-- gabarits de rendu) changent. La signature de verif_calcul est inchangee ->
-- CREATE OR REPLACE suffit (aucune fonction dependante a recreer).

-- =========================================================================
-- 1. verif_calcul : ajoute l'operation inversee `rsub` a la seconde etape.
--    Corps identique a 0024, seule la seconde etape gagne le cas `rsub`.
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

    -- Bornes globales de securite (anti-valeurs aberrantes).
    IF p_a IS NULL OR p_b IS NULL
       OR p_a < 0 OR p_b < 0 OR p_a > 100000 OR p_b > 100000 THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'operandes hors bornes';
    END IF;
    IF p_c IS NOT NULL AND (p_c < 0 OR p_c > 100000) THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'operande c hors bornes';
    END IF;

    -- La seconde etape (op2) est RESERVEE aux problemes a deux etapes.
    IF p_op2 IS NOT NULL AND p_competence <> 'MA.PB.DEUX_ETAPES' THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'op2 interdit pour cette competence';
    END IF;
    IF p_competence = 'MA.PB.DEUX_ETAPES' AND (p_op2 IS NULL OR p_c IS NULL) THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'deux etapes : op2 et c requis';
    END IF;

    -- Operations autorisees par competence (premiere etape).
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
        -- Numeration
        WHEN p_competence = 'MA.NUM.LIRE_ECRIRE'      THEN ARRAY['val']
        WHEN p_competence = 'MA.NUM.DECOMPOSER'       THEN ARRAY['val','mul','div']
        WHEN p_competence = 'MA.NUM.COMPARER'         THEN ARRAY['cmp','sub','val']
        WHEN p_competence = 'MA.NUM.SUITE'            THEN ARRAY['add','sub','val']
        -- Calculs poses
        WHEN p_competence = 'MA.POSE.ADDITION'        THEN ARRAY['add']
        WHEN p_competence = 'MA.POSE.SOUSTRACTION'    THEN ARRAY['sub']
        WHEN p_competence = 'MA.POSE.MULTIPLICATION'  THEN ARRAY['mul']
        -- Problemes
        WHEN p_competence = 'MA.PB.ADD_SUB'           THEN ARRAY['add','sub']
        WHEN p_competence = 'MA.PB.MULT_DIV'          THEN ARRAY['mul','div']
        WHEN p_competence = 'MA.PB.MONNAIE'           THEN ARRAY['val','sub','cmp']
        WHEN p_competence = 'MA.PB.DEUX_ETAPES'       THEN ARRAY['add','sub','mul','div']
        ELSE NULL
    END;

    IF v_allowed IS NULL THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'competence inconnue';
    END IF;
    IF NOT (p_op = ANY (v_allowed)) THEN
        RAISE EXCEPTION 'enonce_incoherent'
            USING DETAIL = format('operation %s interdite pour %s', p_op, p_competence);
    END IF;

    -- Recalcul arithmetique de la reponse attendue (premiere etape).
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
            expected := p_a / p_b;          -- division entiere
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

    -- Coherences specifiques par famille de competence.
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
        ELSE  -- div
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
        -- Nombres d'un probleme CE2 (operandes raisonnables, centimes compris).
        IF p_a > 20000 OR p_b > 20000 OR (p_c IS NOT NULL AND p_c > 20000) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'probleme : operande trop grand';
        END IF;
    END IF;

    -- Seconde etape (problemes a deux etapes). reste := NULL (reponse entiere).
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
                -- Le rendu doit etre >= 0 (on ne rend jamais un montant negatif).
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

-- verif_calcul reste non expose a l'API (coherent avec 0017/0022/0024).
REVOKE EXECUTE ON FUNCTION public.verif_calcul(text, integer, text, integer, integer, text, integer)
    FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 2. Params DEUX_ETAPES N3/N4 : ajout des gabarits de rendu (mul_rsub,
--    add_rsub). Miroir de frontend/src/domain/calcul/seedSources.ts.
--    Idempotent : simple mise a jour du jsonb params de deux lignes ex_calcul.
-- =========================================================================
UPDATE public.ex_calcul
   SET params = '{"types":["add_div","add_sub","mul_rsub","add_rsub"],"tables":[2,3,4,5],"qmax":10,"mag":100}'::jsonb
 WHERE exercice_id = md5('MA.PB.DEUX_ETAPES:3:calcul')::uuid;

UPDATE public.ex_calcul
   SET params = '{"types":["mul_add","mul_sub","add_div","mul_rsub","add_rsub"],"tables":[2,3,4,5,6,7,8,9],"qmax":10,"mag":100}'::jsonb
 WHERE exercice_id = md5('MA.PB.DEUX_ETAPES:4:calcul')::uuid;

-- =========================================================================
-- 3. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0025_rendu_rsub')
ON CONFLICT (version) DO NOTHING;
