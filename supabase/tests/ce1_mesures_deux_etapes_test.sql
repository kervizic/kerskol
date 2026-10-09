-- ce1_mesures_deux_etapes_test.sql
-- Migration 0126 : compétences MATHS CE1 dédiées (mesures longueurs cm/m,
-- masses g/kg/L, problèmes à deux étapes). Vérifie le SERVEUR SEUL JUGE
-- (verif_calcul) : bonnes réponses acceptées, mauvaises refusées, bornes CE1
-- (mesure <= 1000, deux-étapes <= 100), opération interdite ; + structure
-- (portée [CE1,CE1], 4 exercices, prérequis de remédiation). LECTURE SEULE.
-- Exécution : deploy/test-db.sh (0126 déjà appliquée).

DO $$
DECLARE v_exp integer; v_res integer; n integer;
BEGIN
    -- 1. Mesure longueur CE1 : choix d'unité (val) = code de l'unité.
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.MES.CE1_LONGUEURS', 1, 'val', 3, 0, NULL, NULL);
    IF v_exp <> 3 THEN RAISE EXCEPTION 'CE1_LONGUEURS val juste KO : %', v_exp; END IF;
    -- Lecture d'une règle (val) : 12 cm.
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.MES.CE1_LONGUEURS', 2, 'val', 12, 0, NULL, NULL);
    IF v_exp <> 12 THEN RAISE EXCEPTION 'CE1_LONGUEURS regle KO : %', v_exp; END IF;

    -- 2. Masse CE1 : balance (val) = 300 g.
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.MES.CE1_MASSES', 2, 'val', 300, 0, NULL, NULL);
    IF v_exp <> 300 THEN RAISE EXCEPTION 'CE1_MASSES val KO : %', v_exp; END IF;

    -- 3. Opération interdite sur une mesure CE1 (mul) refusée.
    BEGIN
        PERFORM public.verif_calcul('MA.MES.CE1_LONGUEURS', 1, 'mul', 3, 4, NULL, NULL);
        RAISE EXCEPTION 'CE1_LONGUEURS mul aurait du etre refuse';
    EXCEPTION WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE; END IF;
    END;

    -- 4. Borne CE1 mesure : opérande > 1000 refusé.
    BEGIN
        PERFORM public.verif_calcul('MA.MES.CE1_MASSES', 2, 'val', 1500, 0, NULL, NULL);
        RAISE EXCEPTION 'CE1_MASSES > 1000 aurait du etre refuse';
    EXCEPTION WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE; END IF;
    END;

    -- 5. Problème à deux étapes CE1 : 4 x 3 = 12 puis + 5 = 17.
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.PB.CE1_DEUX_ETAPES', 1, 'mul', 4, 3, 'add', 5);
    IF v_exp <> 17 THEN RAISE EXCEPTION 'CE1_DEUX_ETAPES mul+add juste KO : %', v_exp; END IF;
    -- Deux étapes avec soustraction : 5 x 4 = 20 puis - 8 = 12.
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.PB.CE1_DEUX_ETAPES', 2, 'mul', 5, 4, 'sub', 8);
    IF v_exp <> 12 THEN RAISE EXCEPTION 'CE1_DEUX_ETAPES mul-sub KO : %', v_exp; END IF;

    -- 6. Borne CE1 deux-étapes : opérande > 100 refusé.
    BEGIN
        PERFORM public.verif_calcul('MA.PB.CE1_DEUX_ETAPES', 1, 'add', 120, 10, 'sub', 5);
        RAISE EXCEPTION 'CE1_DEUX_ETAPES > 100 aurait du etre refuse';
    EXCEPTION WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE; END IF;
    END;

    -- 7. op2 interdit sur une compétence qui n'est pas « deux étapes ».
    BEGIN
        PERFORM public.verif_calcul('MA.PB.CE1_MULT_DIV', 1, 'mul', 4, 5, 'add', 2);
        RAISE EXCEPTION 'op2 sur CE1_MULT_DIV aurait du etre refuse';
    EXCEPTION WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN RAISE; END IF;
    END;

    -- 8. Structure : portée [CE1,CE1], 4 exercices, prérequis de remédiation.
    SELECT count(*) INTO n FROM public.competences
     WHERE code IN ('MA.MES.CE1_LONGUEURS','MA.MES.CE1_MASSES','MA.PB.CE1_DEUX_ETAPES')
       AND classe_min = 'CE1' AND classe_max = 'CE1';
    IF n <> 3 THEN RAISE EXCEPTION '3 compétences [CE1,CE1] attendues, obtenu %', n; END IF;

    SELECT count(*) INTO n FROM public.competence_prerequis
     WHERE (competence,prerequis) IN (
        ('MA.MES.LONGUEURS','MA.MES.CE1_LONGUEURS'),
        ('MA.MES.MASSES_CONTENANCES','MA.MES.CE1_MASSES'),
        ('MA.PB.DEUX_ETAPES','MA.PB.CE1_DEUX_ETAPES'));
    IF n <> 3 THEN RAISE EXCEPTION '3 prérequis de remédiation attendus, obtenu %', n; END IF;

    RAISE NOTICE 'ce1_mesures_deux_etapes_test : PASS';
END $$;
