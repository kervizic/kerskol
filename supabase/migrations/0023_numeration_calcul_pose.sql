-- 0023_numeration_calcul_pose.sql
-- Nouvelles competences CE2 : NUMERATION jusqu'a 10 000 et CALCULS POSES
-- (addition, soustraction, multiplication par un nombre a 1 chiffre).
--
-- Principe de securite (lot 2, migration 0022) INCHANGE : le client envoie un
-- ENONCE NORMALISE verif:{op,a,b} + sa SAISIE ; le SERVEUR recalcule la bonne
-- reponse via public.verif_calcul() et decide seul « juste/faux », en validant
-- la coherence enonce/competence (bornes du referentiel).
--
-- Toutes les nouvelles competences se ramenent au contrat existant (une saisie
-- entiere, + un reste optionnel) grace a deux nouvelles operations :
--   * cmp : comparaison, expected = 0 (a<b), 1 (a=b), 2 (a>b) ;
--   * val : la reponse EST une valeur, expected = a (b = 0).
-- Tout le reste reutilise add/sub/mul/div. Pour les QCM, le client envoie la
-- VALEUR de l'option choisie (jamais un index) : le serveur la revalide via val.
--
-- Aucune donnee existante modifiee (Iris, foyers). Les nouvelles competences
-- demarrent par le placement en escalier habituel (aucune ligne placement_depart
-- -> niveau de depart 1). L'ouverture se fait par le graphe de prerequis :
-- LIRE_ECRIRE (sans prerequis) d'abord, puis le reste de la numeration, puis les
-- calculs poses. Idempotent.

-- =========================================================================
-- 1. Nouvelles competences (matiere MA)
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre) VALUES
    ('MA.NUM.LIRE_ECRIRE',    'MA', 'numeration',  'Lire et ecrire les nombres jusqu''a 10 000', 300),
    ('MA.NUM.DECOMPOSER',     'MA', 'numeration',  'Decomposer (milliers, centaines, dizaines, unites)', 310),
    ('MA.NUM.COMPARER',       'MA', 'numeration',  'Comparer, encadrer et ranger', 320),
    ('MA.NUM.SUITE',          'MA', 'numeration',  'Suite des nombres (voisins, +/- 10, 100, 1000)', 330),
    ('MA.POSE.ADDITION',      'MA', 'calcul_pose', 'Addition posee', 400),
    ('MA.POSE.SOUSTRACTION',  'MA', 'calcul_pose', 'Soustraction posee', 410),
    ('MA.POSE.MULTIPLICATION','MA', 'calcul_pose', 'Multiplication posee (par un nombre a 1 chiffre)', 420)
ON CONFLICT (code) DO UPDATE
    SET matiere = EXCLUDED.matiere, domaine = EXCLUDED.domaine,
        libelle = EXCLUDED.libelle, ordre = EXCLUDED.ordre;

-- =========================================================================
-- 2. Prerequis (niveau_min = 2). Ouverture progressive, pas de flot.
-- =========================================================================
INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.NUM.DECOMPOSER',      'MA.NUM.LIRE_ECRIRE', 2),
    ('MA.NUM.COMPARER',        'MA.NUM.LIRE_ECRIRE', 2),
    ('MA.NUM.SUITE',           'MA.NUM.LIRE_ECRIRE', 2),
    ('MA.POSE.ADDITION',       'MA.CM.SOMMES_DIFF',  2),
    ('MA.POSE.ADDITION',       'MA.NUM.DECOMPOSER',  2),
    ('MA.POSE.SOUSTRACTION',   'MA.POSE.ADDITION',   2),
    ('MA.POSE.MULTIPLICATION', 'MA.POSE.ADDITION',   2),
    ('MA.POSE.MULTIPLICATION', 'MA.CM.X10_X100',     2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 3. Extension des contraintes CHECK de ex_calcul (operations + formes)
-- =========================================================================
ALTER TABLE public.ex_calcul DROP CONSTRAINT IF EXISTS ex_calcul_operation_chk;
ALTER TABLE public.ex_calcul ADD  CONSTRAINT ex_calcul_operation_chk CHECK (operation IN (
    'add','sub','mul','div','double','moitie','complement',
    'lire','decomposer','comparer','encadrer'));

ALTER TABLE public.ex_calcul DROP CONSTRAINT IF EXISTS ex_calcul_forme_chk;
ALTER TABLE public.ex_calcul ADD  CONSTRAINT ex_calcul_forme_chk CHECK (forme IN (
    'resultat','terme_manquant','decomposition','ordre_grandeur','reste',
    'comparaison','lecture','encadrement','pose'));

-- =========================================================================
-- 4. Seed des exercices + ex_calcul (id deterministe -> idempotent)
--    Miroir de frontend/src/domain/calcul/seedSources.ts (NUM + POSE).
-- =========================================================================
DO $seed$
DECLARE
    r    record;
    v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        -- competence, niveau, operation, forme, methode, support, correction, params
        -- ---- NUMERATION : lire / ecrire ----
        ('MA.NUM.LIRE_ECRIRE',1,'lire','lecture','cpa_barres','aucun','lire_nombre',
         '{"type":"lire","max":100}'::jsonb),
        ('MA.NUM.LIRE_ECRIRE',2,'lire','lecture','exemples_estompes','aucun','ecrire_nombre',
         '{"type":"ecrire","max":1000}'::jsonb),
        ('MA.NUM.LIRE_ECRIRE',3,'lire','lecture','variation','aucun','ecrire_nombre',
         '{"type":"ecrire","max":9999}'::jsonb),
        ('MA.NUM.LIRE_ECRIRE',4,'lire','lecture','probleme_dabord','aucun','lire_nombre',
         '{"type":"lire","max":9999}'::jsonb),
        -- ---- NUMERATION : decomposer ----
        ('MA.NUM.DECOMPOSER',1,'decomposer','decomposition','cpa_barres','aucun','decomposition_rangs',
         '{"type":"decomposer","ranks":["c","d","u"],"max":999}'::jsonb),
        ('MA.NUM.DECOMPOSER',2,'decomposer','decomposition','exemples_estompes','aucun','decomposition_rangs',
         '{"type":"decomposer","ranks":["m","c","d","u"],"min":1000,"max":9999}'::jsonb),
        ('MA.NUM.DECOMPOSER',3,'decomposer','decomposition','variation','aucun','valeur_position',
         '{"type":"valeur_chiffre","max":9999}'::jsonb),
        ('MA.NUM.DECOMPOSER',4,'decomposer','decomposition','probleme_dabord','aucun','compter_rangs',
         '{"type":"compter_rangs","max":9999}'::jsonb),
        -- ---- NUMERATION : comparer / encadrer / ranger ----
        ('MA.NUM.COMPARER',1,'comparer','comparaison','cpa_barres','aucun','comparer_signes',
         '{"type":"comparer","min":0,"max":100}'::jsonb),
        ('MA.NUM.COMPARER',2,'comparer','comparaison','exemples_estompes','aucun','comparer_signes',
         '{"type":"comparer","min":0,"max":9999}'::jsonb),
        ('MA.NUM.COMPARER',3,'comparer','comparaison','variation','aucun','encadrement',
         '{"type":"encadrer","pas":100,"max":9999}'::jsonb),
        ('MA.NUM.COMPARER',4,'comparer','comparaison','probleme_dabord','aucun','ranger',
         '{"type":"ranger","min":1000,"max":9999,"n":3}'::jsonb),
        -- ---- NUMERATION : suite ----
        ('MA.NUM.SUITE',1,'encadrer','encadrement','cpa_barres','aucun','voisins',
         '{"type":"voisins","max":1000}'::jsonb),
        ('MA.NUM.SUITE',2,'encadrer','encadrement','exemples_estompes','aucun','bonds',
         '{"type":"bond","pas":[10,100],"max":9999}'::jsonb),
        ('MA.NUM.SUITE',3,'encadrer','encadrement','plateau_lineaire','aucun','droite_graduee',
         '{"type":"droite","step":100,"intervalles":10,"max":1000}'::jsonb),
        ('MA.NUM.SUITE',4,'encadrer','encadrement','probleme_dabord','aucun','bonds',
         '{"type":"bond","pas":[1,10,100,1000],"max":10000}'::jsonb),
        -- ---- CALCUL POSE : addition ----
        ('MA.POSE.ADDITION',1,'add','pose','cpa_barres','aucun','addition_posee',
         '{"terms":2,"min":10,"max":99,"sans_retenue":true}'::jsonb),
        ('MA.POSE.ADDITION',2,'add','pose','exemples_estompes','aucun','addition_posee',
         '{"terms":2,"min":10,"max":999}'::jsonb),
        ('MA.POSE.ADDITION',3,'add','pose','variation','aucun','addition_posee',
         '{"terms":2,"min":100,"max":9999}'::jsonb),
        ('MA.POSE.ADDITION',4,'add','pose','probleme_dabord','aucun','addition_posee',
         '{"terms":3,"min":10,"max":999}'::jsonb),
        -- ---- CALCUL POSE : soustraction ----
        ('MA.POSE.SOUSTRACTION',1,'sub','pose','cpa_barres','aucun','soustraction_posee',
         '{"min":10,"max":99,"bmin":10,"bmax":99,"sans_retenue":true}'::jsonb),
        ('MA.POSE.SOUSTRACTION',2,'sub','pose','exemples_estompes','aucun','soustraction_posee',
         '{"min":20,"max":999,"bmin":10,"bmax":999}'::jsonb),
        ('MA.POSE.SOUSTRACTION',3,'sub','pose','variation','aucun','soustraction_posee',
         '{"min":100,"max":9999,"bmin":100,"bmax":9999}'::jsonb),
        ('MA.POSE.SOUSTRACTION',4,'sub','pose','probleme_dabord','aucun','soustraction_posee',
         '{"min":1000,"max":9999,"bmin":100,"bmax":9999}'::jsonb),
        -- ---- CALCUL POSE : multiplication (x 1 chiffre) ----
        ('MA.POSE.MULTIPLICATION',1,'mul','pose','cpa_barres','aucun','multiplication_posee',
         '{"min":11,"max":99,"bmin":2,"bmax":4}'::jsonb),
        ('MA.POSE.MULTIPLICATION',2,'mul','pose','exemples_estompes','aucun','multiplication_posee',
         '{"min":11,"max":99,"bmin":2,"bmax":9}'::jsonb),
        ('MA.POSE.MULTIPLICATION',3,'mul','pose','variation','aucun','multiplication_posee',
         '{"min":100,"max":999,"bmin":2,"bmax":9}'::jsonb),
        ('MA.POSE.MULTIPLICATION',4,'mul','pose','probleme_dabord','aucun','multiplication_posee',
         '{"min":100,"max":999,"bmin":2,"bmax":9}'::jsonb)
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
-- 5. Extension de verif_calcul : operations cmp / val + bornes des nouvelles
--    competences. Les bornes sont GENEREUSES : elles n'ecartent que les enonces
--    fabriques, jamais un exercice legitime du generateur.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_calcul(
    p_competence text, p_niveau integer, p_op text, p_a integer, p_b integer,
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

    -- Operations autorisees par competence.
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
        ELSE NULL
    END;

    IF v_allowed IS NULL THEN
        RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'competence inconnue';
    END IF;
    IF NOT (p_op = ANY (v_allowed)) THEN
        RAISE EXCEPTION 'enonce_incoherent'
            USING DETAIL = format('operation %s interdite pour %s', p_op, p_competence);
    END IF;

    -- Recalcul arithmetique de la reponse attendue.
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
        -- Nombres cibles jusqu'a 10 000 (operandes bornes).
        IF p_a > 10000 OR p_b > 10000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'numeration : nombre > 10000';
        END IF;
    ELSIF p_competence LIKE 'MA.POSE.%' THEN
        -- Operandes poses jusqu'a 10 000 (le resultat peut etre plus grand :
        -- 3 termes, ou somme partielle normalisee en a).
        IF p_a > 10000 OR p_b > 10000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'calcul pose : operande > 10000';
        END IF;
        -- La multiplication posee se fait par un nombre a 1 chiffre.
        IF p_competence = 'MA.POSE.MULTIPLICATION'
           AND NOT (p_a BETWEEN 2 AND 9 OR p_b BETWEEN 2 AND 9) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mult. posee : aucun facteur a 1 chiffre';
        END IF;
    END IF;

    RETURN;
END;
$$;

-- Lockdown EXECUTE coherent avec 0017/0022 : helper non expose a l'API.
REVOKE EXECUTE ON FUNCTION public.verif_calcul(text, integer, text, integer, integer) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 6. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0023_numeration_calcul_pose')
ON CONFLICT (version) DO NOTHING;
