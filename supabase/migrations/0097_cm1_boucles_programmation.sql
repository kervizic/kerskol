-- 0097_cm1_boucles_programmation.sql
-- LOT 10 (CM1) - MATHS / PROGRAMMATION : les BOUCLES « répète N fois ». Nouvelle
-- competence MA.REPERE.BOUCLES (domaine repere, portee CM1..CM2). Introduction
-- du concept de boucle par LECTURE (clic sur la case d'arrivee d'un programme
-- contenant une boucle, decrite en toutes lettres dans la consigne) et
-- RECONNAISSANCE (QCM : ce que fait une boucle, quel programme en utilise une,
-- equivalence boucle <-> programme deroule). Composant <Geometrie> reutilise
-- (clic + qcm), AUCUNE nouvelle UI. verif_geo (op 'geo') seul juge.
--
-- Miroir EXACT de geometrie.ts. Golden 128 -> 136. Migration ADDITIVE et
-- IDEMPOTENTE ; domaine repere deja actif.

INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('MA.REPERE.BOUCLES', 'MA', 'repere', 'Les boucles (répète N fois)', 656, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.REPERE.BOUCLES', 'MA.REPERE.PROGRAMMER', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

INSERT INTO public.geometrie_item (cle, competence, niveau, format, attendu, spec) VALUES
    ('geo-bcl-n1-compte',    'MA.REPERE.BOUCLES', 1, 'qcm',  '3 cases', NULL),
    ('geo-bcl-n1-choix',     'MA.REPERE.BOUCLES', 1, 'qcm',  'répète 4 fois : avance', NULL),
    ('geo-bcl-n2-a',         'MA.REPERE.BOUCLES', 2, 'clic', 'B4', NULL),
    ('geo-bcl-n2-b',         'MA.REPERE.BOUCLES', 2, 'clic', 'A5', NULL),
    ('geo-bcl-n3-pourquoi',  'MA.REPERE.BOUCLES', 3, 'qcm',  'pour éviter d''écrire plusieurs fois la même chose', NULL),
    ('geo-bcl-n3-a',         'MA.REPERE.BOUCLES', 3, 'clic', 'C3', NULL),
    ('geo-bcl-n4-a',         'MA.REPERE.BOUCLES', 4, 'clic', 'C1', NULL),
    ('geo-bcl-n4-equiv',     'MA.REPERE.BOUCLES', 4, 'qcm',  'avance, tourne à droite, avance, tourne à droite, avance, tourne à droite', NULL)
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu, spec=EXCLUDED.spec;

DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('MA.REPERE.BOUCLES:' || v_niv || ':geometrie')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'MA.REPERE.BOUCLES', 'geometrie', v_niv, 'spatial', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
            type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

DO $do$
DECLARE n integer; v_niv integer;
BEGIN
    SELECT count(*) INTO n FROM public.geometrie_item WHERE competence = 'MA.REPERE.BOUCLES';
    IF n <> 8 THEN RAISE EXCEPTION 'boucles : 8 items attendus, obtenu %', n; END IF;
    FOR v_niv IN 1..4 LOOP
        IF NOT EXISTS (SELECT 1 FROM public.geometrie_item WHERE competence = 'MA.REPERE.BOUCLES' AND niveau = v_niv) THEN
            RAISE EXCEPTION 'boucles : aucun item au niveau %', v_niv;
        END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.geometrie_item;
    IF n <> 136 THEN RAISE EXCEPTION 'geometrie_item : golden 136 attendu, obtenu %', n; END IF;
END $do$;

INSERT INTO public.schema_migrations (version)
VALUES ('0097_cm1_boucles_programmation')
ON CONFLICT (version) DO NOTHING;
