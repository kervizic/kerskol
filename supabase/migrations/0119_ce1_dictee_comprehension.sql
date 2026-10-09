-- 0119_ce1_dictee_comprehension.sql
-- LOT CE1 (incrément 7) - FRANÇAIS, dictée et compréhension : complète le
-- français CE1 (incrément 3, migration 0116) avec la DICTÉE DÉTECTIVE et la
-- COMPRÉHENSION DE LECTURE, qui dépendent du NIVEAU DES TEXTES. Vérifié :
--   * dictée : la sélection est pilotée par le NIVEAU de l'enfant
--     (choisirTexteDictee) ; les 18 textes de niveau 1 sont courts (2 phrases),
--     bienveillants et porteurs d'erreurs-détective CE1 (son/sont, ces/ses,
--     et/est, pluriels) -> un CE1 reçoit bien des textes CE1 ;
--   * compréhension : banques N1 de niveau CE1 (retrouver une information,
--     vrai/faux, remettre dans l'ordre, sens d'un mot) ; FR.LECTURE.INFO compte
--     57 items N1.
--
-- Même méthode SÛRE : on ouvre la portée (classe_min='CE1', classe_max
-- inchangée = CE2).
--
-- RESTE CE2 : FR.LECTURE.INFERENCE (inférence, notion la plus avancée ; banque
-- N1 trop mince, l'essentiel est en N3) -> incrément dédié si besoin.
--
-- Attendus CE1 (Éduscol) : « comprendre un texte et contrôler sa compréhension »
-- (retrouver l'explicite, remettre en ordre, sens d'un mot selon le contexte) ;
-- orthographe en situation de dictée.
--
-- SÛRETÉ CE2 (Iris) : classe_max inchangée (CE2) -> candidature d'un CE2
-- inchangée. Migration ADDITIVE et IDEMPOTENTE.

UPDATE public.competences
   SET classe_min = 'CE1'
 WHERE matiere = 'FR'
   AND code IN (
     'FR.ORTHO.DETECTIVE',
     'FR.LECTURE.INFO','FR.LECTURE.VRAIFAUX','FR.LECTURE.ORDRE','FR.LECTURE.SENS_MOT'
   )
   AND classe_min <> 'CE1';

DO $do$
DECLARE
    v_n integer;
    bad text;
    ce1 text[] := ARRAY['FR.ORTHO.DETECTIVE','FR.LECTURE.INFO','FR.LECTURE.VRAIFAUX',
                        'FR.LECTURE.ORDRE','FR.LECTURE.SENS_MOT'];
BEGIN
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'FR' AND classe_min = 'CE1' AND code = ANY(ce1)
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) >= 2;
    IF v_n <> 5 THEN
        RAISE EXCEPTION 'CE1 dictée/compréhension : 5 compétences attendues, obtenu %', v_n;
    END IF;

    -- Non-débordement : l'inférence reste CE2 pour cet incrément.
    IF (SELECT classe_min FROM public.competences WHERE code = 'FR.LECTURE.INFERENCE') = 'CE1' THEN
        RAISE EXCEPTION 'CE1 : FR.LECTURE.INFERENCE ne doit pas être ouverte dans cet incrément';
    END IF;

    -- Il existe bien des textes de dictée de niveau 1 (pour un CE1).
    SELECT count(*) INTO v_n FROM public.dictee_texte WHERE niveau = 1;
    IF v_n < 5 THEN
        RAISE EXCEPTION 'CE1 dictée : trop peu de textes de niveau 1 (%)', v_n;
    END IF;
END $do$;

INSERT INTO public.schema_migrations (version)
VALUES ('0119_ce1_dictee_comprehension')
ON CONFLICT (version) DO NOTHING;
