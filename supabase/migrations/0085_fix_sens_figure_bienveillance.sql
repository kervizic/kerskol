-- 0085_fix_sens_figure_bienveillance.sql
-- LOT C - correctif BIENVEILLANCE de la competence FR.VOC.SENS_FIGURE (0083).
--
-- Le test de bienveillance (frontend/src/domain/bienveillance.test.ts) interdit
-- le mot « dévorer » dans tout contenu enfant. Deux items « sens figuré »
-- l'utilisaient (voc-fig-n1-2 « Marie dévore son livre » ; voc-fig-n3-3
-- « Le chien dévore sa gamelle »). Ils sont reformules cote front avec des
-- expressions imagees sans mot sensible (« avoir la pêche » ; « couper la poire
-- en deux »).
--
-- Seul voc-fig-n3-3 change de REPONSE attendue (la figure/consigne etant cote
-- front uniquement ; lexique_item ne porte que cle/competence/niveau/format/
-- attendu). On met donc a jour son `attendu` dans la table de reference.
-- Migration ADDITIVE/IDEMPOTENTE (UPDATE d'une ligne existante).

UPDATE public.lexique_item
   SET attendu = 'trouver un accord, partager'
 WHERE cle = 'voc-fig-n3-3' AND competence = 'FR.VOC.SENS_FIGURE';

-- Garde-fou : la ligne existe et le golden reste a 152.
DO $do$
DECLARE n integer;
BEGIN
    SELECT count(*) INTO n FROM public.lexique_item
     WHERE cle = 'voc-fig-n3-3' AND attendu = 'trouver un accord, partager';
    IF n <> 1 THEN RAISE EXCEPTION 'voc-fig-n3-3 non mis a jour (obtenu %)', n; END IF;
    SELECT count(*) INTO n FROM public.lexique_item;
    IF n <> 152 THEN RAISE EXCEPTION 'lexique_item : golden 152 attendu, obtenu %', n; END IF;
END $do$;

INSERT INTO public.schema_migrations (version)
VALUES ('0085_fix_sens_figure_bienveillance')
ON CONFLICT (version) DO NOTHING;
