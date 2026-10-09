-- 0115_ce1_geometrie_repere.sql
-- LOT CE1 (incrément 2) - GÉOMÉTRIE et REPÉRAGE : rendre jouables au CE1 les
-- compétences de géométrie et de repérage qui existent déjà (migration 0043,
-- moteur <Geometrie>, table geometrie_item). Même méthode SÛRE que 0114 : on
-- n'ouvre QUE la portée (classe_min='CE1', classe_max inchangée, reste CE2).
--
-- Attendus de fin d'année de CE1 (programme 2024, cycle 2) couverts :
--   * Espace et géométrie : reconnaître et nommer les figures planes usuelles
--     (carré, rectangle, triangle, cercle) ; côtés, sommets, angle droit
--     (« comme avec l'équerre ») ; reconnaître et nommer les solides usuels
--     (cube, pavé, boule, cône, pyramide, cylindre) et décrire face/sommet/arête.
--   * (Se) repérer et se déplacer : coder/placer une case sur un quadrillage,
--     suivre et coder des déplacements, se repérer sur un plan (gauche/droite,
--     devant/derrière).
--
-- MA.GEO.SYMETRIE reste CE2 (la symétrie axiale n'est pas un attendu CE1).
--
-- SÛRETÉ CE2 (Iris) : classe_max inchangée (CE2) -> candidature d'un CE2
-- inchangée ; aucune donnée élève touchée ; aucune compétence créée/supprimée.
-- Les banques N1-N2 sont déjà de niveau CE1 (reconnaissance d'images, QCM).
-- Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Ouverture de la portée CE1 (classe_min='CE1', classe_max inchangée).
-- =========================================================================
UPDATE public.competences
   SET classe_min = 'CE1'
 WHERE matiere = 'MA'
   AND code IN (
     'MA.GEO.FIGURES','MA.GEO.VOCABULAIRE','MA.GEO.SOLIDES',
     'MA.REPERE.QUADRILLAGE','MA.REPERE.DEPLACEMENTS','MA.REPERE.PLAN'
   )
   AND classe_min <> 'CE1';

-- =========================================================================
-- 2. Garde-fous.
-- =========================================================================
DO $do$
DECLARE
    v_n integer;
    bad text;
BEGIN
    -- 2a. Les 6 compétences ciblées sont CE1.
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'MA' AND classe_min = 'CE1'
       AND code IN ('MA.GEO.FIGURES','MA.GEO.VOCABULAIRE','MA.GEO.SOLIDES',
                    'MA.REPERE.QUADRILLAGE','MA.REPERE.DEPLACEMENTS','MA.REPERE.PLAN');
    IF v_n <> 6 THEN
        RAISE EXCEPTION 'CE1 géométrie/repère : 6 compétences CE1 attendues, obtenu %', v_n;
    END IF;

    -- 2b. classe_max reste >= CE2.
    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE code IN ('MA.GEO.FIGURES','MA.GEO.VOCABULAIRE','MA.GEO.SOLIDES',
                    'MA.REPERE.QUADRILLAGE','MA.REPERE.DEPLACEMENTS','MA.REPERE.PLAN')
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) < 2;
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'CE1 géométrie/repère : classe_max < CE2 pour %', bad;
    END IF;

    -- 2c. La symétrie n'est PAS ouverte au CE1.
    SELECT classe_min INTO bad FROM public.competences WHERE code = 'MA.GEO.SYMETRIE';
    IF bad = 'CE1' THEN
        RAISE EXCEPTION 'CE1 géométrie : MA.GEO.SYMETRIE ne doit pas être CE1';
    END IF;

    -- 2d. Total compétences maths CE1 = 27 (0114) + 6 = 33.
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'MA' AND classe_min = 'CE1';
    IF v_n <> 33 THEN
        RAISE EXCEPTION 'CE1 maths : 33 compétences CE1 au total attendues, obtenu %', v_n;
    END IF;
END $do$;

-- =========================================================================
-- 3. Enregistrement de la migration.
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0115_ce1_geometrie_repere')
ON CONFLICT (version) DO NOTHING;
