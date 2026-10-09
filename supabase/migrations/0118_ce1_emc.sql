-- 0118_ce1_emc.sql
-- LOT CE1 (incrément 5) - EMC (« Vivre ensemble ») : rendre jouables au CE1 les
-- compétences du domaine SENSIBILITÉ / vivre ensemble, foundationnelles et
-- communes à tout le cycle 2 (programme EMC 2024). Même méthode SÛRE : on ouvre
-- la portée (classe_min='CE1', classe_max inchangée = CE2).
--
-- Périmètre CE1 (prudent, banques N1 vérifiées de niveau CE1) :
--   * respecter les autres : la politesse, les règles de la classe, respecter
--     les différences, dire non à la moquerie ;
--   * les émotions : reconnaître les émotions, se calmer, l'empathie.
--
-- RESTENT CE2 pour cet incrément (plus institutionnels / à vérifier sur les
-- attendus CE1) : la République (symboles, commune, droits/devoirs, voter) et
-- les écrans (temps d'écran, politesse en ligne, esprit critique, données) ->
-- incrément dédié après vérification fine des attendus EMC CE1.
--
-- SÛRETÉ CE2 (Iris) : classe_max inchangée (CE2) -> candidature d'un CE2
-- inchangée ; aucune donnée élève touchée. Migration ADDITIVE et IDEMPOTENTE.

UPDATE public.competences
   SET classe_min = 'CE1'
 WHERE matiere = 'EMC'
   AND code IN (
     'EMC.RESPECT.POLITESSE','EMC.RESPECT.REGLES','EMC.RESPECT.DIFFERENCES','EMC.RESPECT.MOQUERIE',
     'EMC.EMOTIONS.RECONNAITRE','EMC.EMOTIONS.CALME','EMC.EMOTIONS.EMPATHIE'
   )
   AND classe_min <> 'CE1';

DO $do$
DECLARE
    v_n integer;
    bad text;
    ce1 text[] := ARRAY[
      'EMC.RESPECT.POLITESSE','EMC.RESPECT.REGLES','EMC.RESPECT.DIFFERENCES','EMC.RESPECT.MOQUERIE',
      'EMC.EMOTIONS.RECONNAITRE','EMC.EMOTIONS.CALME','EMC.EMOTIONS.EMPATHIE'];
BEGIN
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'EMC' AND classe_min = 'CE1' AND code = ANY(ce1);
    IF v_n <> 7 THEN
        RAISE EXCEPTION 'CE1 EMC : 7 compétences CE1 attendues, obtenu %', v_n;
    END IF;

    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE code = ANY(ce1)
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) < 2;
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'CE1 EMC : classe_max < CE2 pour %', bad;
    END IF;

    -- Non-débordement : République et écrans non ouverts au CE1 dans cet incrément.
    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE matiere = 'EMC' AND classe_min = 'CE1'
       AND (code LIKE 'EMC.REPUBLIQUE.%' OR code LIKE 'EMC.ECRANS.%');
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'CE1 EMC : notion non prévue ouverte à tort : %', bad;
    END IF;
END $do$;

INSERT INTO public.schema_migrations (version)
VALUES ('0118_ce1_emc')
ON CONFLICT (version) DO NOTHING;
