-- 0069_cm1_fractions.sql
-- LOT 1 (CM1) - MATHEMATIQUES : « Fractions ».
-- Attendus de fin de CM1 (programme cycle 3, actualise 2025) : comprendre et
-- utiliser des fractions simples ; les placer / lire sur une droite graduee ;
-- reconnaitre des fractions egales (equivalences, fractions decimales) ;
-- comparer des fractions ; prendre une fraction d'une quantite. Sources :
--   * Eduscol, « Mathematiques CM1 - Attendus de fin d'annee » (document 13990)
--   * Programme de mathematiques du cycle 3 (dec. 2024, applicable 2025)
--
-- On REUTILISE le moteur de fractions (forme « fraction », buildFraction) : les
-- nouvelles competences n'ajoutent que des TYPES d'exercices (droite, comparer
-- deux fractions, egalites, quantite non unitaire). Le SERVEUR reste SEUL JUGE
-- (verif_calcul) : les ops restent val / cmp / div, bornes famille MA.FRAC.%
-- (<= 2000). Portee CM1..CM2 : proposees au CM1 (coeur de classe) et « en
-- avance » a un CE2 qui a deja acquis les fractions simples (prerequis).
--
-- Migration ADDITIVE et IDEMPOTENTE : aucun profil ni aucune progression n'est
-- touche (Iris reste en CE2 ; elle ne verra ces exercices que si elle passe en
-- CM1 ou si elle a valide MA.FRAC.SIMPLES au niveau 2).

-- =========================================================================
-- 1. Competences (portee CM1..CM2, domaine fractions) + prerequis
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('MA.FRAC.DROITE',   'MA', 'fractions', 'Fractions sur une droite graduee (de 0 a 1)', 701, 'CM1', 'CM2'),
    ('MA.FRAC.COMPARER', 'MA', 'fractions', 'Comparer deux fractions',                      702, 'CM1', 'CM2'),
    ('MA.FRAC.EGALITES', 'MA', 'fractions', 'Fractions egales (equivalences, decimales)',   703, 'CM1', 'CM2'),
    ('MA.FRAC.QUANTITE', 'MA', 'fractions', 'Prendre une fraction d''une quantite',         704, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE
    SET libelle = EXCLUDED.libelle, ordre = EXCLUDED.ordre,
        classe_min = EXCLUDED.classe_min, classe_max = EXCLUDED.classe_max;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.FRAC.DROITE',   'MA.FRAC.SIMPLES', 2),
    ('MA.FRAC.COMPARER', 'MA.FRAC.SIMPLES', 2),
    ('MA.FRAC.EGALITES', 'MA.FRAC.SIMPLES', 2),
    ('MA.FRAC.QUANTITE', 'MA.FRAC.SIMPLES', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Banque d'exercices (ex_calcul) : 4 competences x 4 niveaux (miroir EXACT
--    de frontend/src/domain/calcul/seedSources.ts). Le client genere depuis
--    seedSources ; ces lignes sont la reference (bookkeeping).
-- =========================================================================
DO $seed$
DECLARE
    r    record;
    v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        ('MA.FRAC.DROITE',1,'fraction','fraction','cpa_barres','aucun','nommer_fraction',
         '{"types":["droite"],"dens":[2,3,4]}'::jsonb),
        ('MA.FRAC.DROITE',2,'fraction','fraction','exemples_estompes','aucun','nommer_fraction',
         '{"types":["droite"],"dens":[2,3,4,5,6]}'::jsonb),
        ('MA.FRAC.DROITE',3,'fraction','fraction','variation','aucun','nommer_fraction',
         '{"types":["droite"],"dens":[2,3,4,5,6,8,10]}'::jsonb),
        ('MA.FRAC.DROITE',4,'fraction','fraction','probleme_dabord','aucun','nommer_fraction',
         '{"types":["droite"],"dens":[3,4,5,6,8,10]}'::jsonb),

        ('MA.FRAC.COMPARER',1,'fraction','fraction','cpa_barres','aucun','comparer_a_1',
         '{"types":["comparer_frac"],"subtypes":["meme_den"],"dens":[3,4,5,6]}'::jsonb),
        ('MA.FRAC.COMPARER',2,'fraction','fraction','exemples_estompes','aucun','comparer_a_1',
         '{"types":["comparer_frac"],"subtypes":["meme_den","meme_num"],"dens":[2,3,4,5,6]}'::jsonb),
        ('MA.FRAC.COMPARER',3,'fraction','fraction','variation','aucun','comparer_a_1',
         '{"types":["comparer_frac"],"subtypes":["a_demi","meme_num"],"dens":[4,6,8,10]}'::jsonb),
        ('MA.FRAC.COMPARER',4,'fraction','fraction','probleme_dabord','aucun','comparer_a_1',
         '{"types":["comparer_frac"],"subtypes":["quelconque","meme_num","a_demi"],"dens":[2,3,4,5,6,8]}'::jsonb),

        ('MA.FRAC.EGALITES',1,'fraction','fraction','cpa_barres','aucun','nommer_fraction',
         '{"types":["egalites"],"bases":[2,3,4],"facteurs":[2]}'::jsonb),
        ('MA.FRAC.EGALITES',2,'fraction','fraction','exemples_estompes','aucun','nommer_fraction',
         '{"types":["egalites"],"bases":[2,3,4,5],"facteurs":[2,3]}'::jsonb),
        ('MA.FRAC.EGALITES',3,'fraction','fraction','variation','aucun','nommer_fraction',
         '{"types":["egalites"],"bases":[2,3,4,5],"facteurs":[2,3,4]}'::jsonb),
        ('MA.FRAC.EGALITES',4,'fraction','fraction','probleme_dabord','aucun','nommer_fraction',
         '{"types":["egalites"],"bases":[2,5,10],"facteurs":[2,5,10]}'::jsonb),

        ('MA.FRAC.QUANTITE',1,'fraction','fraction','cpa_barres','aucun','fraction_quantite',
         '{"types":["quantite_cm1"],"dens":[2,3,4]}'::jsonb),
        ('MA.FRAC.QUANTITE',2,'fraction','fraction','exemples_estompes','aucun','fraction_quantite',
         '{"types":["quantite_cm1"],"dens":[2,3,4,5,10]}'::jsonb),
        ('MA.FRAC.QUANTITE',3,'fraction','fraction','variation','aucun','fraction_quantite',
         '{"types":["quantite_cm1"],"dens":[3,4,5]}'::jsonb),
        ('MA.FRAC.QUANTITE',4,'fraction','fraction','probleme_dabord','aucun','fraction_quantite',
         '{"types":["quantite_cm1"],"dens":[3,4,5,6,8]}'::jsonb)
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
-- 3. verif_calcul : SEUL JUGE. On reprend la definition de 0067 et on ajoute
--    les 4 competences fractions CM1 au tableau des ops autorisees. Rien
--    d'autre ne change (bornes famille MA.FRAC.% deja a 2000).
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
    -- Borne haute : 1 000 000 pour les grands nombres (CM1), 100 000 sinon.
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
-- 4. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0069_cm1_fractions')
ON CONFLICT (version) DO NOTHING;
