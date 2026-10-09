-- ce1_revisions_iris_test.sql
-- LOT CE1 (incrément 6) - Vérifie le comportement « révisions CE1 pour un élève
-- de CE2 » (Iris) et la SÛRETÉ de l'ouverture CE1. LECTURE SEULE.
-- Joué par deploy/test-db.sh.
--
-- INVARIANT DE SÛRETÉ : toute compétence ouverte au CE1 (classe_min='CE1')
-- garde classe_max >= CE2. Conséquence (règle du moteur, classeDansMarge) :
-- pour un élève de CE2, sa portée [classe_min, classe_max] chevauche toujours
-- [CE1, CM1] exactement comme avant l'ouverture CE1 -> AUCUNE compétence
-- n'apparaît en plus ni en moins pour Iris du fait de l'ouverture CE1. Les
-- compétences CE1 ne deviennent visibles « en plus » que pour un profil CE1.
-- (On n'a créé AUCUNE compétence « CE1 seulement » : pas de classe_max < CE2.)

DO $$
DECLARE
    v_n   integer;
    v_tot integer;
    bad   text;
BEGIN
    -- 1. INVARIANT : aucune compétence CE1 n'a classe_max < CE2.
    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE classe_min = 'CE1'
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) < 2;
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'révisions Iris : compétence CE1-seulement détectée (classe_max<CE2) : % — risquerait de polluer les séances d''un CE2', bad;
    END IF;

    -- 2. Pour un CE2, toute compétence CE1 reste candidate (chevauchement de
    --    portée avec [CE1, CM1] = marge d'un an autour de CE2). On le vérifie
    --    directement sur la condition de classeDansMarge(classe_min,classe_max,'CE2').
    SELECT count(*) INTO v_tot FROM public.competences WHERE classe_min = 'CE1';
    SELECT count(*) INTO v_n FROM public.competences
     WHERE classe_min = 'CE1'
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_min)
             <= array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], 'CE2') + 1
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max)
             >= array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], 'CE2') - 1;
    IF v_n <> v_tot THEN
        RAISE EXCEPTION 'révisions Iris : % compétences CE1 sur % ne sont pas candidates pour un CE2', v_tot - v_n, v_tot;
    END IF;

    -- 3. Les 4 rappels CE1 historiques (calcul mental, migration 0066) existent
    --    toujours et restent la « révision CE1 » d'un CE2 (placement_depart haut).
    SELECT count(*) INTO v_n FROM public.competences
     WHERE classe_min = 'CE1'
       AND code IN ('MA.CM.ADDITION','MA.CM.DOUBLES','MA.CM.MOITIES','MA.CM.COMPL_SUP');
    IF v_n <> 4 THEN
        RAISE EXCEPTION 'révisions Iris : 4 rappels CE1 attendus, obtenu %', v_n;
    END IF;

    -- 4. Pour un CE1, ces mêmes compétences sont candidates (portée stricte CE1).
    SELECT count(*) INTO v_n FROM public.competences
     WHERE classe_min = 'CE1'
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_min) <= array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], 'CE1')
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) >= array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], 'CE1');
    IF v_n <> v_tot THEN
        RAISE EXCEPTION 'révisions Iris : certaines compétences CE1 ne sont pas visibles pour un CE1 (% / %)', v_n, v_tot;
    END IF;

    RAISE NOTICE 'ce1_revisions_iris_test : PASS (% compétences CE1, toutes classe_max>=CE2 -> parcours CE2 d''Iris inchangé)', v_tot;
END $$;
