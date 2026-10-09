-- 0095_cm1_aire_carreaux.sql
-- LOT 8 (CM1) - MATHS / GEOMETRIE : AIRE PAR COMPTAGE DE CARREAUX. Nouvelle
-- competence MA.GEO.AIRE (domaine geometrie, portee CM1..CM2). La figure coloriee
-- est dessinee sur un quadrillage (GeoGridSpec / GridView, composant <Geometrie>
-- deja existant) ; l'enfant COMPTE les carreaux et SAISIT le nombre (format
-- "texte", op 'geo', verif_geo seul juge). N1-N2 rectangles, N3 figures non
-- rectangulaires (L, T), N4 figures plus grandes. AUCUNE nouvelle UI.
--
-- Miroir EXACT de geometrie.ts (cle/competence/niveau/format/attendu ; la figure
-- est cote client). Golden 112 -> 120. Migration ADDITIVE et IDEMPOTENTE ;
-- domaine geometrie deja actif.

-- =========================================================================
-- 1. Competence + prerequis.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('MA.GEO.AIRE', 'MA', 'geometrie', 'Aire par comptage de carreaux', 665, 4, 'CM1', 'CM2', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.GEO.AIRE', 'MA.GEO.FIGURES', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Seed des 8 items (figure cote client ; ici cle/competence/niveau/format/
--    attendu, spec NULL).
-- =========================================================================
INSERT INTO public.geometrie_item (cle, competence, niveau, format, attendu, spec) VALUES
    ('geo-aire-n1-a', 'MA.GEO.AIRE', 1, 'texte', '6',  NULL),
    ('geo-aire-n1-b', 'MA.GEO.AIRE', 1, 'texte', '4',  NULL),
    ('geo-aire-n2-a', 'MA.GEO.AIRE', 2, 'texte', '12', NULL),
    ('geo-aire-n2-b', 'MA.GEO.AIRE', 2, 'texte', '10', NULL),
    ('geo-aire-n3-a', 'MA.GEO.AIRE', 3, 'texte', '8',  NULL),
    ('geo-aire-n3-b', 'MA.GEO.AIRE', 3, 'texte', '5',  NULL),
    ('geo-aire-n4-a', 'MA.GEO.AIRE', 4, 'texte', '14', NULL),
    ('geo-aire-n4-b', 'MA.GEO.AIRE', 4, 'texte', '13', NULL)
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu, spec=EXCLUDED.spec;

-- =========================================================================
-- 3. Exercices de reference (type 'geometrie', id deterministe).
-- =========================================================================
DO $do$
DECLARE v_niv integer; v_id uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('MA.GEO.AIRE:' || v_niv || ':geometrie')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'MA.GEO.AIRE', 'geometrie', v_niv, 'geometrie', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
            type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Garde-fou : 8 items AIRE, couverture N1..N4, golden global 120.
-- =========================================================================
DO $do$
DECLARE n integer; v_niv integer;
BEGIN
    SELECT count(*) INTO n FROM public.geometrie_item WHERE competence = 'MA.GEO.AIRE';
    IF n <> 8 THEN RAISE EXCEPTION 'aire : 8 items attendus, obtenu %', n; END IF;
    FOR v_niv IN 1..4 LOOP
        IF NOT EXISTS (SELECT 1 FROM public.geometrie_item WHERE competence = 'MA.GEO.AIRE' AND niveau = v_niv) THEN
            RAISE EXCEPTION 'aire : aucun item au niveau %', v_niv;
        END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.geometrie_item;
    IF n <> 120 THEN RAISE EXCEPTION 'geometrie_item : golden 120 attendu, obtenu %', n; END IF;
END $do$;

INSERT INTO public.schema_migrations (version)
VALUES ('0095_cm1_aire_carreaux')
ON CONFLICT (version) DO NOTHING;
