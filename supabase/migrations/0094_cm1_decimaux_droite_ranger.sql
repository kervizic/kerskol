-- 0094_cm1_decimaux_droite_ranger.sql
-- LOT 7 (CM1) - MATHS / DECIMAUX : deux competences additives (domaine decimaux,
-- portee CM1..CM2) :
--   MA.DEC.DROITE  placer / lire un decimal sur une DROITE GRADUEE (reutilise
--                  <DroiteView> avec des labels decimaux ; graduation en
--                  dixiemes entre deux entiers) ;
--   MA.DEC.RANGER  ranger des decimaux (ecrire le plus petit / le plus grand de
--                  trois nombres ; pieges du zero et des longueurs).
--
-- Les deux sont jugees par le SERVEUR via l'op 'val' (reponse = valeur cible en
-- CENTIEMES). verif_calcul autorise deja ['val','cmp'] pour MA.DEC.% : AUCUN
-- changement de fonction. Miroir seedSources.ts (bloc DEC). Migration ADDITIVE
-- et IDEMPOTENTE ; domaine decimaux deja actif.

-- =========================================================================
-- 1. Competences + prerequis.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('MA.DEC.DROITE', 'MA', 'decimaux', 'Placer un décimal sur une droite graduée', 743, 4, 'CM1', 'CM2', true),
    ('MA.DEC.RANGER', 'MA', 'decimaux', 'Ranger des décimaux',                      744, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.DEC.DROITE', 'MA.DEC.ECRIRE',   2),
    ('MA.DEC.RANGER', 'MA.DEC.COMPARER', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Exercices + ex_calcul (4 niveaux, op 'val', forme 'decimal').
-- =========================================================================
DO $seed$
DECLARE r record; v_id uuid;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
        ('MA.DEC.DROITE',1,'val','decimal','cpa_barres','{"types":["droite"],"maxE":2}'::jsonb),
        ('MA.DEC.DROITE',2,'val','decimal','exemples_estompes','{"types":["droite"],"maxE":5}'::jsonb),
        ('MA.DEC.DROITE',3,'val','decimal','variation','{"types":["droite"],"maxE":10}'::jsonb),
        ('MA.DEC.DROITE',4,'val','decimal','probleme_dabord','{"types":["droite"],"maxE":20}'::jsonb),
        ('MA.DEC.RANGER',1,'val','decimal','cpa_barres','{"types":["ranger_petit"],"maxE":2}'::jsonb),
        ('MA.DEC.RANGER',2,'val','decimal','exemples_estompes','{"types":["ranger_petit","ranger_grand"],"maxE":5}'::jsonb),
        ('MA.DEC.RANGER',3,'val','decimal','variation','{"types":["ranger_petit","ranger_grand"],"maxE":10}'::jsonb),
        ('MA.DEC.RANGER',4,'val','decimal','probleme_dabord','{"types":["ranger_petit","ranger_grand"],"maxE":20}'::jsonb)
        ) AS t(competence,niveau,operation,forme,methode,params)
    LOOP
        v_id := md5(r.competence || ':' || r.niveau || ':calcul')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, r.competence, 'calcul', r.niveau, r.methode, true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
            methode=EXCLUDED.methode, actif=true;
        INSERT INTO public.ex_calcul (exercice_id, type, operation, forme, params, support_visuel, correction_strategie)
        VALUES (v_id, 'calcul', r.operation, r.forme, r.params, 'aucun', r.methode)
        ON CONFLICT (exercice_id) DO UPDATE SET operation=EXCLUDED.operation, forme=EXCLUDED.forme,
            params=EXCLUDED.params, support_visuel=EXCLUDED.support_visuel, correction_strategie=EXCLUDED.correction_strategie;
    END LOOP;
END $seed$;

-- =========================================================================
-- 3. Garde-fou : competences + 4 exercices chacune ; op 'val' acceptee.
-- =========================================================================
DO $do$
DECLARE n integer; v_exp integer;
BEGIN
    SELECT count(*) INTO n FROM public.exercices
     WHERE competence IN ('MA.DEC.DROITE','MA.DEC.RANGER') AND type = 'calcul' AND actif;
    IF n <> 8 THEN
        RAISE EXCEPTION 'decimaux droite/ranger : 8 exercices attendus, obtenu %', n;
    END IF;
    SELECT expected INTO v_exp FROM public.verif_calcul('MA.DEC.DROITE', 1, 'val', 240, 0, NULL, NULL);
    IF v_exp <> 240 THEN
        RAISE EXCEPTION 'decimaux droite : val 240 attendu, obtenu %', v_exp;
    END IF;
END $do$;

INSERT INTO public.schema_migrations (version)
VALUES ('0094_cm1_decimaux_droite_ranger')
ON CONFLICT (version) DO NOTHING;
