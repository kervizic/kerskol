-- ce1_francais_test.sql
-- Vérifie l'ouverture du cœur FRANÇAIS CE1 (migration 0116). LECTURE SEULE.
-- Joué par deploy/test-db.sh.

DO $$
DECLARE
    v_n integer;
    bad text;
    ce1 text[] := ARRAY[
      'FR.GRAM.NATURE','FR.GRAM.SUJET_VERBE','FR.GRAM.GROUPE_NOMINAL',
      'FR.GRAM.TYPES_PHRASES','FR.GRAM.PONCTUATION',
      'FR.VOC.ALPHABET','FR.VOC.FAMILLES','FR.VOC.SYN_CONTRAIRES',
      'FR.VOC.CATEGORIES','FR.VOC.SENS','FR.VOC.PREFIXE_SUFFIXE',
      'FR.MOTS.INVARIABLES',
      'FR.CONJ.PRESENT','FR.CONJ.FUTUR','FR.CONJ.IMPARFAIT',
      'FR.ECR.COPIE','FR.ECR.GUIDEE'];
BEGIN
    -- 1. Les 17 compétences FR ciblées sont CE1 avec classe_max >= CE2.
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'FR' AND classe_min = 'CE1' AND code = ANY(ce1)
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) >= 2;
    IF v_n <> 17 THEN
        RAISE EXCEPTION 'ce1_francais : 17 compétences CE1 (classe_max>=CE2) attendues, obtenu %', v_n;
    END IF;

    -- 2. Non-débordement : les notions non-CE1 restent >= CE2.
    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE matiere = 'FR' AND classe_min = 'CE1'
       AND code IN ('FR.GRAM.ACCORD_GN','FR.GRAM.ACCORD_SV','FR.GRAM.ACCORD_PP',
                    'FR.GRAM.PHRASE','FR.GRAM.CLASSES','FR.GRAM.COMPLEMENTS',
                    'FR.GRAM.HOMOPHONES','FR.CONJ.PASSE_COMPOSE','FR.CONJ.PASSE_SIMPLE',
                    'FR.CONJ.IMPERATIF','FR.VOC.REGISTRES','FR.VOC.SENS_FIGURE',
                    'FR.ECR.COPIE_CM1','FR.ECR.GUIDEE_CM1');
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'ce1_francais : notion hors CE1 ouverte à tort : %', bad;
    END IF;

    -- 3. Chaîne conjugaison : futur et imparfait ont bien le présent en prérequis
    --    (le présent, CE1, s'ouvre en premier).
    SELECT count(*) INTO v_n FROM public.competence_prerequis
     WHERE competence IN ('FR.CONJ.FUTUR','FR.CONJ.IMPARFAIT') AND prerequis = 'FR.CONJ.PRESENT';
    IF v_n <> 2 THEN
        RAISE EXCEPTION 'ce1_francais : futur/imparfait devraient avoir présent en prérequis (obtenu %)', v_n;
    END IF;

    RAISE NOTICE 'ce1_francais_test : PASS (17 compétences français CE1 ouvertes par 0116)';
END $$;
