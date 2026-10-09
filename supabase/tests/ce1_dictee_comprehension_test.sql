-- ce1_dictee_comprehension_test.sql
-- Vérifie l'ouverture CE1 de la dictée détective et de la compréhension
-- (migration 0119). LECTURE SEULE. Joué par deploy/test-db.sh.

DO $$
DECLARE
    v_n integer;
    ce1 text[] := ARRAY['FR.ORTHO.DETECTIVE','FR.LECTURE.INFO','FR.LECTURE.VRAIFAUX',
                        'FR.LECTURE.ORDRE','FR.LECTURE.SENS_MOT'];
BEGIN
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'FR' AND classe_min = 'CE1' AND code = ANY(ce1)
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) >= 2;
    IF v_n <> 5 THEN
        RAISE EXCEPTION 'ce1_dictee_comprehension : 5 compétences CE1 attendues, obtenu %', v_n;
    END IF;

    IF (SELECT classe_min FROM public.competences WHERE code = 'FR.LECTURE.INFERENCE') = 'CE1' THEN
        RAISE EXCEPTION 'ce1_dictee_comprehension : FR.LECTURE.INFERENCE ne doit pas être CE1';
    END IF;

    -- Des textes de dictée de niveau 1 (CE1) existent.
    SELECT count(*) INTO v_n FROM public.dictee_texte WHERE niveau = 1;
    IF v_n < 5 THEN
        RAISE EXCEPTION 'ce1_dictee_comprehension : trop peu de textes de dictée niveau 1 (%)', v_n;
    END IF;

    RAISE NOTICE 'ce1_dictee_comprehension_test : PASS (dictée détective + 4 compétences de compréhension CE1)';
END $$;
