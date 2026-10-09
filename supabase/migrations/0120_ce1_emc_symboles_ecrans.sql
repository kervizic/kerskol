-- 0120_ce1_emc_symboles_ecrans.sql
-- LOT CE1 (incrément 8) - EMC : complète l'EMC CE1 (incrément 5, migration 0118)
-- avec les symboles de la République et les bases du bon usage des écrans,
-- foundationnels dès le CE1 (programme EMC 2024, cycle 2). Même méthode SÛRE :
-- portée CE1 (classe_min='CE1', classe_max inchangée = CE2).
--
-- Banques N1 vérifiées de niveau CE1 :
--   * EMC.REPUBLIQUE.SYMBOLES : reconnaître le drapeau (bleu, blanc, rouge) et
--     l'hymne (la Marseillaise) ;
--   * EMC.ECRANS.TEMPS : faire une pause, éteindre les écrans ;
--   * EMC.ECRANS.POLITESSE : être gentil en ligne « comme en vrai ».
--
-- RESTENT CE2 (plus institutionnels / esprit critique) : la commune et le maire,
-- droits et devoirs, voter (République) ; ne pas tout croire (esprit critique),
-- protéger ses informations (données).
--
-- SÛRETÉ CE2 (Iris) : classe_max inchangée (CE2) -> candidature d'un CE2
-- inchangée. Migration ADDITIVE et IDEMPOTENTE.

UPDATE public.competences
   SET classe_min = 'CE1'
 WHERE matiere = 'EMC'
   AND code IN ('EMC.REPUBLIQUE.SYMBOLES','EMC.ECRANS.TEMPS','EMC.ECRANS.POLITESSE')
   AND classe_min <> 'CE1';

DO $do$
DECLARE
    v_n integer;
    bad text;
BEGIN
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'EMC' AND classe_min = 'CE1'
       AND code IN ('EMC.REPUBLIQUE.SYMBOLES','EMC.ECRANS.TEMPS','EMC.ECRANS.POLITESSE')
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) >= 2;
    IF v_n <> 3 THEN
        RAISE EXCEPTION 'CE1 EMC symboles/écrans : 3 compétences attendues, obtenu %', v_n;
    END IF;

    -- Non-débordement : institutionnel / esprit critique restent CE2.
    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE matiere = 'EMC' AND classe_min = 'CE1'
       AND code IN ('EMC.REPUBLIQUE.COMMUNE','EMC.REPUBLIQUE.DROITS','EMC.REPUBLIQUE.VOTER',
                    'EMC.ECRANS.ESPRITCRITIQUE','EMC.ECRANS.DONNEES');
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'CE1 EMC : notion hors périmètre ouverte à tort : %', bad;
    END IF;

    -- Total EMC CE1 = 7 (0118) + 3 = 10.
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'EMC' AND classe_min = 'CE1';
    IF v_n <> 10 THEN
        RAISE EXCEPTION 'CE1 EMC : 10 compétences CE1 au total attendues, obtenu %', v_n;
    END IF;
END $do$;

INSERT INTO public.schema_migrations (version)
VALUES ('0120_ce1_emc_symboles_ecrans')
ON CONFLICT (version) DO NOTHING;
