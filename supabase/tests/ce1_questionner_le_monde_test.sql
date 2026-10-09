-- ce1_questionner_le_monde_test.sql
-- Vérifie l'ouverture CE1 de « Questionner le monde » (migration 0117).
-- LECTURE SEULE. Joué par deploy/test-db.sh.

DO $$
DECLARE
    v_n integer;
    bad text;
    ce1 text[] := ARRAY[
      'QM.VIVANT.CARACTERISTIQUES','QM.VIVANT.PLANTES','QM.VIVANT.CYCLES',
      'QM.VIVANT.CORPS','QM.VIVANT.HYGIENE',
      'QM.MATIERE.ETATS','QM.MATIERE.EAU',
      'QM.OBJETS.FONCTIONS','QM.OBJETS.NUMERIQUE',
      'QM.ESPACE.SEREPERER','QM.ESPACE.PLANETE',
      'QM.TEMPS.CALENDRIER','QM.TEMPS.FRISE','QM.TEMPS.GENERATIONS',
      'QM.TEMPS.JOURNUIT','QM.TEMPS.AUTREFOIS'];
BEGIN
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'QM' AND classe_min = 'CE1' AND code = ANY(ce1)
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) >= 2;
    IF v_n <> 16 THEN
        RAISE EXCEPTION 'ce1_qm : 16 compétences CE1 (classe_max>=CE2) attendues, obtenu %', v_n;
    END IF;

    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE matiere = 'QM' AND classe_min = 'CE1'
       AND code IN ('QM.OBJETS.CIRCUIT','QM.OBJETS.LEVIERS','QM.MATIERE.AIR',
                    'QM.MATIERE.MELANGES','QM.VIVANT.CHAINES','QM.ESPACE.PAYSAGES',
                    'QM.ESPACE.FRANCE','QM.ESPACE.CARDINAUX');
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'ce1_qm : notion hors CE1 ouverte à tort : %', bad;
    END IF;

    RAISE NOTICE 'ce1_questionner_le_monde_test : PASS (16 compétences QM CE1 ouvertes par 0117)';
END $$;
