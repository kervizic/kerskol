-- 0096_cm1_angles_droites.sql
-- LOT 9 (CM1) - MATHS / GEOMETRIE : ANGLES ET DROITES SUR UNE FIGURE. Nouvelle
-- competence MA.GEO.ANGLES (domaine geometrie, portee CM1..CM2). L'enfant TOUCHE
-- l'angle droit / obtus (clic sur le sommet) et reconnait le type d'un angle
-- (QCM aigu/droit/obtus) ; il identifie les paires de droites perpendiculaires /
-- paralleles (QCM). Composant <Geometrie> reutilise (clic + qcm), AUCUNE
-- nouvelle UI. Le SERVEUR (verif_geo, op 'geo') reste seul juge.
--
-- Miroir EXACT de geometrie.ts. Golden 120 -> 128. Migration ADDITIVE et
-- IDEMPOTENTE ; domaine geometrie deja actif.

INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('MA.GEO.ANGLES', 'MA', 'geometrie', 'Angles et droites sur une figure', 666, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.GEO.ANGLES', 'MA.GEO.VOCABULAIRE', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

INSERT INTO public.geometrie_item (cle, competence, niveau, format, attendu, spec) VALUES
    ('geo-ang-n1-droit',      'MA.GEO.ANGLES', 1, 'clic', 'A',      NULL),
    ('geo-ang-n1-type-aigu',  'MA.GEO.ANGLES', 1, 'qcm',  'aigu',   NULL),
    ('geo-ang-n2-obtus',      'MA.GEO.ANGLES', 2, 'clic', 'B',      NULL),
    ('geo-ang-n2-type-obtus', 'MA.GEO.ANGLES', 2, 'qcm',  'obtus',  NULL),
    ('geo-ang-n3-droit',      'MA.GEO.ANGLES', 3, 'clic', 'C',      NULL),
    ('geo-ang-n3-perp',       'MA.GEO.ANGLES', 3, 'qcm',  'a et b', NULL),
    ('geo-ang-n4-perp',       'MA.GEO.ANGLES', 4, 'qcm',  'b et c', NULL),
    ('geo-ang-n4-parallel',   'MA.GEO.ANGLES', 4, 'qcm',  'a et c', NULL)
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu, spec=EXCLUDED.spec;

DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('MA.GEO.ANGLES:' || v_niv || ':geometrie')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'MA.GEO.ANGLES', 'geometrie', v_niv, 'van_hiele', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
            type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

DO $do$
DECLARE n integer; v_niv integer;
BEGIN
    SELECT count(*) INTO n FROM public.geometrie_item WHERE competence = 'MA.GEO.ANGLES';
    IF n <> 8 THEN RAISE EXCEPTION 'angles : 8 items attendus, obtenu %', n; END IF;
    FOR v_niv IN 1..4 LOOP
        IF NOT EXISTS (SELECT 1 FROM public.geometrie_item WHERE competence = 'MA.GEO.ANGLES' AND niveau = v_niv) THEN
            RAISE EXCEPTION 'angles : aucun item au niveau %', v_niv;
        END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.geometrie_item;
    IF n <> 128 THEN RAISE EXCEPTION 'geometrie_item : golden 128 attendu, obtenu %', n; END IF;
END $do$;

INSERT INTO public.schema_migrations (version)
VALUES ('0096_cm1_angles_droites')
ON CONFLICT (version) DO NOTHING;
