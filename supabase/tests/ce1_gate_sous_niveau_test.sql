-- ce1_gate_sous_niveau_test.sql
-- LOT CE1 (incrément 12) - Garde-fou SOUS-NIVEAU, contrat SERVEUR (double
-- authoring avec le gate client composeSession / computePort). LECTURE SEULE.
-- Joué par deploy/test-db.sh. Vaut pour TOUTES les matières (MA, FR, QM, EMC).
--
-- RÈGLE : une compétence de classe inférieure (compétence dédiée [X,X] dont la
-- portée PLAFONNE) ne doit arriver à un enfant plus avancé QU'EN RÉVISION, via
-- le lien de remédiation vers une compétence LIÉE de classe supérieure. Côté
-- données, cela impose la DIRECTION des prérequis : si P est prérequis de C et
-- que P plafonne (classe_max de P) strictement SOUS la classe_min de C, alors
-- c'est un lien de remédiation « classe inférieure -> classe supérieure »
-- (jamais l'inverse), et il ne doit jamais empêcher C d'exister pour un enfant
-- de la classe de C (garanti côté client par isUnlocked(ignore=sousNiveau)).
--
-- Ce test vérifie la COHÉRENCE STRUCTURELLE qui rend ce garde-fou sûr :
--   1. tout prérequis « plafonnant sous la dépendante » va bien du bas vers le
--      haut (classe_max(P) < classe_min(C)) — direction de remédiation ;
--   2. aucune compétence dédiée [CE1,CE1] n'a elle-même un prérequis d'une
--      compétence de classe strictement supérieure au CE1 (sinon elle serait
--      verrouillée pour un CE1) ;
--   3. les compétences CE1 dédiées actuelles (maths, migrations 0121-0123)
--      portent bien un lien de remédiation vers une compétence liée CE2+.

DO $$
DECLARE
    rk constant text[] := ARRAY['CP','CE1','CE2','CM1','CM2'];
    bad text;
    v_n integer;
BEGIN
    -- 1. Direction de remédiation : pour tout prérequis (C <- P) où P plafonne
    --    sous C (classe_max(P) < classe_min(C)), c'est bien un lien montant.
    --    (Trivialement vrai par la condition ; on vérifie plutôt l'ABSENCE du
    --    cas dangereux inverse : P plafonne sous C ET C plafonne aussi sous P,
    --    c-à-d un lien entre deux compétences dédiées de classes incompatibles.)
    SELECT string_agg(cp.competence || ' <- ' || cp.prerequis, ', ')
      INTO bad
      FROM public.competence_prerequis cp
      JOIN public.competences c ON c.code = cp.competence
      JOIN public.competences p ON p.code = cp.prerequis
     WHERE p.classe_max IS NOT NULL AND c.classe_min IS NOT NULL
       AND array_position(rk, p.classe_max) < array_position(rk, c.classe_min)
       -- cas dangereux : la dépendante C plafonne elle aussi SOUS le prérequis P
       AND c.classe_max IS NOT NULL AND p.classe_min IS NOT NULL
       AND array_position(rk, c.classe_max) < array_position(rk, p.classe_min);
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'gate sous-niveau : lien de remédiation incohérent (classes croisées) : %', bad;
    END IF;

    -- 2. Aucune compétence dédiée [CE1,CE1] ne dépend d'une compétence de classe
    --    strictement supérieure au CE1 (elle serait verrouillée pour un CE1).
    SELECT string_agg(cp.competence || ' <- ' || cp.prerequis, ', ')
      INTO bad
      FROM public.competence_prerequis cp
      JOIN public.competences c ON c.code = cp.competence
      JOIN public.competences p ON p.code = cp.prerequis
     WHERE c.classe_min = 'CE1' AND c.classe_max = 'CE1'
       AND p.classe_min IS NOT NULL
       AND array_position(rk, p.classe_min) > array_position(rk, 'CE1');
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'gate sous-niveau : compétence CE1 dédiée verrouillée par un prérequis de classe supérieure : %', bad;
    END IF;

    -- 3. Les compétences CE1 dédiées (classe_min=classe_max=CE1) existantes ont
    --    chacune un lien de remédiation vers une compétence liée CE2+ (sinon
    --    elles n'atteindraient jamais un CE2, contredisant la recette 0121-0123).
    SELECT count(*) INTO v_n FROM public.competences d
     WHERE d.classe_min = 'CE1' AND d.classe_max = 'CE1'
       AND NOT EXISTS (
         SELECT 1 FROM public.competence_prerequis cp
          JOIN public.competences c ON c.code = cp.competence
         WHERE cp.prerequis = d.code
           AND c.classe_max IS NOT NULL
           AND array_position(rk, c.classe_max) >= array_position(rk, 'CE2')
       );
    IF v_n > 0 THEN
        SELECT string_agg(code, ', ') INTO bad FROM public.competences d
         WHERE d.classe_min = 'CE1' AND d.classe_max = 'CE1'
           AND NOT EXISTS (
             SELECT 1 FROM public.competence_prerequis cp
              JOIN public.competences c ON c.code = cp.competence
             WHERE cp.prerequis = d.code
               AND c.classe_max IS NOT NULL
               AND array_position(rk, c.classe_max) >= array_position(rk, 'CE2')
           );
        RAISE EXCEPTION 'gate sous-niveau : % compétence(s) CE1 dédiée(s) sans lien de remédiation vers une compétence CE2+ : %', v_n, bad;
    END IF;

    SELECT count(*) INTO v_n FROM public.competences WHERE classe_min = 'CE1' AND classe_max = 'CE1';
    RAISE NOTICE 'ce1_gate_sous_niveau_test : PASS (% compétence(s) CE1 dédiée(s), liens de remédiation CE1 -> CE2+ cohérents)', v_n;
END $$;
