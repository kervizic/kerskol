-- ce1_socle_maths_test.sql
-- Vérifie l'ouverture du socle MATHS CE1 (migration 0114). LECTURE SEULE :
-- aucune donnée modifiée. Joué par deploy/test-db.sh.
--
-- Attendus : les 23 compétences du programme CE1 sont classe_min='CE1' avec
-- classe_max >= CE2 (la notion continue), les notions NON CE1 (multiplication
-- posée, division, tables 6-9) restent >= CE2, et un profil CE1 « voit » bien
-- ces compétences comme CANDIDATES (chevauchement de portée à +/- 1 an).

DO $$
DECLARE
    v_n   integer;
    bad   text;
    ce1   text[] := ARRAY[
        'MA.NUM.LIRE_ECRIRE','MA.NUM.DECOMPOSER','MA.NUM.COMPARER','MA.NUM.SUITE',
        'MA.CM.COMPL_100_1000','MA.CM.SOMMES_DIFF','MA.CM.X10_X100',
        'MA.TABLES.2','MA.TABLES.3','MA.TABLES.4','MA.TABLES.5',
        'MA.POSE.ADDITION','MA.POSE.SOUSTRACTION',
        'MA.PB.ADD_SUB','MA.PB.MULT_DIV','MA.PB.DEUX_ETAPES','MA.PB.MONNAIE','MA.PB.MESURES',
        'MA.MES.LONGUEURS','MA.MES.MASSES_CONTENANCES','MA.MES.HEURE','MA.MES.DUREES',
        'MA.FRAC.SIMPLES'];
    -- Géométrie et repérage ouverts au CE1 par 0115 (SYMETRIE reste CE2).
    geo   text[] := ARRAY[
        'MA.GEO.FIGURES','MA.GEO.VOCABULAIRE','MA.GEO.SOLIDES',
        'MA.REPERE.QUADRILLAGE','MA.REPERE.DEPLACEMENTS','MA.REPERE.PLAN'];
BEGIN
    -- 1. Les 23 compétences ciblées existent et sont CE1.
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'MA' AND classe_min = 'CE1' AND code = ANY(ce1);
    IF v_n <> 23 THEN
        RAISE EXCEPTION 'ce1_socle : 23 compétences CE1 attendues, obtenu %', v_n;
    END IF;

    -- 2. classe_max >= CE2 pour toutes (notion non rétrécie).
    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE code = ANY(ce1)
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) < 2;
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'ce1_socle : classe_max < CE2 pour %', bad;
    END IF;

    -- 3. Non-débordement : notions hors CE1 toujours >= CE2.
    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE matiere = 'MA' AND classe_min = 'CE1'
       AND code IN ('MA.POSE.MULTIPLICATION','MA.POSE.DIVISION','MA.CM.DIV_RESTE',
                    'MA.TABLES.6','MA.TABLES.7','MA.TABLES.8','MA.TABLES.9');
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'ce1_socle : notion hors CE1 ouverte à tort : %', bad;
    END IF;

    -- 4a. Les 6 compétences géométrie/repère sont CE1 avec classe_max >= CE2.
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'MA' AND classe_min = 'CE1' AND code = ANY(geo)
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) >= 2;
    IF v_n <> 6 THEN
        RAISE EXCEPTION 'ce1_socle : 6 compétences géométrie/repère CE1 attendues, obtenu %', v_n;
    END IF;

    -- 4b. La symétrie reste CE2 (pas un attendu CE1).
    IF (SELECT classe_min FROM public.competences WHERE code = 'MA.GEO.SYMETRIE') = 'CE1' THEN
        RAISE EXCEPTION 'ce1_socle : MA.GEO.SYMETRIE ne doit pas être CE1';
    END IF;

    -- 4c. Total compétences maths CE1 = 27 (0114+0066) + 6 (0115) + 4 dédiées
    --     CE1 [CE1,CE1] (0121 MA.NUM.CE1_MILLE ; 0122 MA.POSE.CE1_ADDITION,
    --     MA.POSE.CE1_SOUSTRACTION ; 0123 MA.PB.CE1_MULT_DIV) = 37.
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'MA' AND classe_min = 'CE1';
    IF v_n <> 37 THEN
        RAISE EXCEPTION 'ce1_socle : 37 compétences maths CE1 attendues, obtenu %', v_n;
    END IF;

    -- 5. Candidature d'un profil CE1 : une compétence [CE1,CE2] chevauche la
    --    marge [CP, CE2] d'un enfant CE1. On vérifie que LIRE_ECRIRE est bien
    --    candidate (classe_min <= 'CE1'+1 et classe_max >= 'CE1'-1).
    SELECT count(*) INTO v_n FROM public.competences
     WHERE code = 'MA.NUM.LIRE_ECRIRE'
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_min) <= array_position(ARRAY['CP','CE1','CE2','CM1','CM2'],'CE1') + 1
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) >= array_position(ARRAY['CP','CE1','CE2','CM1','CM2'],'CE1') - 1;
    IF v_n <> 1 THEN
        RAISE EXCEPTION 'ce1_socle : MA.NUM.LIRE_ECRIRE devrait être candidate pour un CE1';
    END IF;

    -- 6. Sûreté Iris (CE2) : ces compétences restent candidates pour un CE2
    --    (classe_max >= CE2), donc aucune régression de son parcours.
    SELECT count(*) INTO v_n FROM public.competences
     WHERE code = ANY(ce1)
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) >= array_position(ARRAY['CP','CE1','CE2','CM1','CM2'],'CE2');
    IF v_n <> 23 THEN
        RAISE EXCEPTION 'ce1_socle : certaines compétences ne sont plus candidates pour un CE2 (obtenu %)', v_n;
    END IF;

    RAISE NOTICE 'ce1_socle_maths_test : PASS (37 compétences maths CE1 : 23 par 0114, 6 géo/repère par 0115, 4 par 0066, 1 dédiée par 0121, 2 dédiées par 0122, 1 dédiée par 0123)';
END $$;
