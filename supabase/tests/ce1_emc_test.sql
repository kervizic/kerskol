-- ce1_emc_test.sql
-- Vérifie l'ouverture CE1 de l'EMC (migration 0118). LECTURE SEULE.
-- Joué par deploy/test-db.sh.

DO $$
DECLARE
    v_n integer;
    bad text;
    ce1 text[] := ARRAY[
      'EMC.RESPECT.POLITESSE','EMC.RESPECT.REGLES','EMC.RESPECT.DIFFERENCES','EMC.RESPECT.MOQUERIE',
      'EMC.EMOTIONS.RECONNAITRE','EMC.EMOTIONS.CALME','EMC.EMOTIONS.EMPATHIE'];
BEGIN
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'EMC' AND classe_min = 'CE1' AND code = ANY(ce1)
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) >= 2;
    IF v_n <> 7 THEN
        RAISE EXCEPTION 'ce1_emc : 7 compétences CE1 (classe_max>=CE2) attendues, obtenu %', v_n;
    END IF;

    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE matiere = 'EMC' AND classe_min = 'CE1'
       AND (code LIKE 'EMC.REPUBLIQUE.%' OR code LIKE 'EMC.ECRANS.%'
            OR code IN ('EMC.COOPERATION','EMC.DROITS','EMC.EGALITE','EMC.ENGAGEMENT','EMC.LAICITE','EMC.PRUDENCE','EMC.SYMBOLES'));
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'ce1_emc : notion hors périmètre CE1 ouverte à tort : %', bad;
    END IF;

    RAISE NOTICE 'ce1_emc_test : PASS (7 compétences EMC CE1 ouvertes par 0118)';
END $$;
