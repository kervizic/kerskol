-- 0117_ce1_questionner_le_monde.sql
-- LOT CE1 (incrément 4) - QUESTIONNER LE MONDE : rendre jouables au CE1 les
-- compétences QM foundationnelles (cycle 2, programme en vigueur) qui existent
-- déjà (moteur QM, table qm_item). Même méthode SÛRE : on ouvre la portée
-- (classe_min='CE1', classe_max inchangée = CE2).
--
-- NB programme : le nouveau programme de SCIENCES (BO n°24 du 11/06/2026) ne
-- s'applique au CE1 qu'à la rentrée 2027 ; on reste donc sur « Questionner le
-- monde » (cycle 2) en vigueur cette année.
--
-- Périmètre CE1 (banques N1 vérifiées de niveau CE1, QCM de reconnaissance) :
--   * le vivant : vivant/non vivant, besoins des plantes, cycles de vie, le
--     corps, l'hygiène ;
--   * la matière : solide/liquide/gaz, l'eau change d'état ;
--   * les objets : à quoi ça sert, les écrans et moi (PAS le circuit électrique,
--     qui relève du cycle 3) ;
--   * l'espace : plans et maquettes (se repérer), la Terre et les continents
--     (globe) ;
--   * le temps : calendrier, frise (avant/après), générations, jour/nuit,
--     autrefois/aujourd'hui.
--
-- RESTENT CE2 : chaînes alimentaires, l'air, mélanges/solutions, circuit
-- électrique, leviers, paysages, la France, points cardinaux.
--
-- SÛRETÉ CE2 (Iris) : classe_max inchangée (CE2) -> candidature d'un CE2
-- inchangée ; aucune donnée élève touchée. Migration ADDITIVE et IDEMPOTENTE.

UPDATE public.competences
   SET classe_min = 'CE1'
 WHERE matiere = 'QM'
   AND code IN (
     'QM.VIVANT.CARACTERISTIQUES','QM.VIVANT.PLANTES','QM.VIVANT.CYCLES',
     'QM.VIVANT.CORPS','QM.VIVANT.HYGIENE',
     'QM.MATIERE.ETATS','QM.MATIERE.EAU',
     'QM.OBJETS.FONCTIONS','QM.OBJETS.NUMERIQUE',
     'QM.ESPACE.SEREPERER','QM.ESPACE.PLANETE',
     'QM.TEMPS.CALENDRIER','QM.TEMPS.FRISE','QM.TEMPS.GENERATIONS',
     'QM.TEMPS.JOURNUIT','QM.TEMPS.AUTREFOIS'
   )
   AND classe_min <> 'CE1';

DO $do$
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
     WHERE matiere = 'QM' AND classe_min = 'CE1' AND code = ANY(ce1);
    IF v_n <> 16 THEN
        RAISE EXCEPTION 'CE1 QM : 16 compétences CE1 attendues, obtenu %', v_n;
    END IF;

    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE code = ANY(ce1)
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) < 2;
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'CE1 QM : classe_max < CE2 pour %', bad;
    END IF;

    -- Non-débordement : notions cycle 3 / CE2 non ouvertes au CE1.
    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE matiere = 'QM' AND classe_min = 'CE1'
       AND code IN ('QM.OBJETS.CIRCUIT','QM.OBJETS.LEVIERS','QM.MATIERE.AIR',
                    'QM.MATIERE.MELANGES','QM.VIVANT.CHAINES','QM.ESPACE.PAYSAGES',
                    'QM.ESPACE.FRANCE','QM.ESPACE.CARDINAUX');
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'CE1 QM : notion hors CE1 ouverte à tort : %', bad;
    END IF;
END $do$;

INSERT INTO public.schema_migrations (version)
VALUES ('0117_ce1_questionner_le_monde')
ON CONFLICT (version) DO NOTHING;
