-- 0050_maths_geometrie_regle_compas_patrons.sql
-- GEOMETRIE CE2 - PARTIE 2 (suite de 0047/0048). Migration ADDITIVE et
-- IDEMPOTENTE, sur le domaine `geometrie` deja actif (aucune nouvelle
-- sous-matiere, aucun reset des niveaux d'Iris). Ajoute :
--
--   * REGLE GRADUEE (nouvelle competence MA.GEO.MESURER_TRACER, format 'regle') :
--     mesurer un segment, tracer un trait d'une longueur donnee, placer le milieu
--     d'un segment (verif par longueur/position, tolerance ± 2 mm), et dire si
--     trois points sont alignes (qcm). Lien avec « Mesures » SANS doublon : la
--     mesure de longueurs reste dans MA.MES.LONGUEURS ; ici c'est l'USAGE de la
--     regle (lire la graduation, tracer, milieu, alignement).
--   * COMPAS (nouvelle competence MA.GEO.CERCLE, format 'cercle') : vocabulaire
--     (centre, rayon) puis tracer un cercle de rayon donne, un cercle de centre O
--     passant par A, reporter une longueur (verif centre/rayon, tolerance ± 2 mm).
--   * PATRONS de cube (nouvelle competence MA.GEO.PATRONS, format 'patron') :
--     choisir le patron qui se replie en cube, et dire si un patron donne en est
--     un. Le SERVEUR est seul juge PAR PROPRIETES : verif_patron_cube SIMULE le
--     pliage (roulement d'un cube sur le patron ; il se referme en cube ssi les 6
--     cases se posent sur 6 faces distinctes).
--   * SOLIDES (competence existante MA.GEO.SOLIDES) : quatre items en reponse
--     LIBRE (compter faces / aretes / sommets, N3/N4) ; le rendu 3D « tournable
--     au doigt » cote front ne change pas le schema.
--
-- UNITES : tout en MILLIMETRES ENTIERS (1 cm = 10 mm) ; la surface aimante au
-- centimetre -> arithmetique EXACTE (comme 0047). La tolerance `tol` (mm, portee
-- par `spec`) exprime le « ± 2 mm a l'echelle affichee ». Miroir EXACT de
-- frontend/src/domain/geometrie/geometrie.ts (test croise : geometrie_test.sql).

-- =========================================================================
-- 1. Schema : nouveaux formats (regle / cercle / patron), spec requis.
-- =========================================================================
ALTER TABLE public.geometrie_item DROP CONSTRAINT IF EXISTS geometrie_item_format_chk;
ALTER TABLE public.geometrie_item ADD CONSTRAINT geometrie_item_format_chk
    CHECK (format IN ('qcm','clic','texte','grille','construire','programme','reproduire','regle','cercle','patron'));

ALTER TABLE public.geometrie_item DROP CONSTRAINT IF EXISTS geometrie_item_spec_chk;
ALTER TABLE public.geometrie_item ADD CONSTRAINT geometrie_item_spec_chk
    CHECK ((format IN ('construire','programme','reproduire','regle','cercle','patron')) = (spec IS NOT NULL));

-- =========================================================================
-- 2. Referentiel : trois nouvelles competences (domaine `geometrie`, deja actif).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('MA.GEO.MESURER_TRACER', 'MA', 'geometrie', 'Mesurer et tracer à la règle', 640, 4, true),
    ('MA.GEO.CERCLE',         'MA', 'geometrie', 'Tracer avec le compas',        645, 4, true),
    ('MA.GEO.PATRONS',        'MA', 'geometrie', 'Patrons du cube',              648, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 3. Seed des items (miroir EXACT de geometrie.ts).
-- =========================================================================
INSERT INTO public.geometrie_item (cle, competence, niveau, format, attendu, spec) VALUES
    -- MA.GEO.SOLIDES : compter faces / aretes / sommets (reponse libre)
    ('geo-sol-n3-aretes-cube',    'MA.GEO.SOLIDES', 3, 'texte', '12', NULL),
    ('geo-sol-n3-sommets-pave',   'MA.GEO.SOLIDES', 3, 'texte', '8',  NULL),
    ('geo-sol-n4-faces-pyramide', 'MA.GEO.SOLIDES', 4, 'texte', '5',  NULL),
    ('geo-sol-n4-aretes-cube',    'MA.GEO.SOLIDES', 4, 'texte', '12', NULL),
    -- MA.GEO.MESURER_TRACER : regle graduee (mm)
    ('geo-mtr-n1-a',         'MA.GEO.MESURER_TRACER', 1, 'regle', '60', '{"t":"mesurer","len":60,"tol":2}'),
    ('geo-mtr-n1-b',         'MA.GEO.MESURER_TRACER', 1, 'regle', '40', '{"t":"mesurer","len":40,"tol":2}'),
    ('geo-mtr-n2-mes',       'MA.GEO.MESURER_TRACER', 2, 'regle', '70', '{"t":"mesurer","len":70,"tol":2}'),
    ('geo-mtr-n2-tra',       'MA.GEO.MESURER_TRACER', 2, 'regle', '50', '{"t":"tracer","len":50,"tol":2}'),
    ('geo-mtr-n3-tra',       'MA.GEO.MESURER_TRACER', 3, 'regle', '70', '{"t":"tracer","len":70,"tol":2}'),
    ('geo-mtr-n3-mil-a',     'MA.GEO.MESURER_TRACER', 3, 'regle', '30', '{"t":"milieu","mid":30,"tol":2}'),
    ('geo-mtr-n3-mil-b',     'MA.GEO.MESURER_TRACER', 3, 'regle', '50', '{"t":"milieu","mid":50,"tol":2}'),
    ('geo-mtr-n4-align-oui', 'MA.GEO.MESURER_TRACER', 4, 'qcm',   'oui', NULL),
    ('geo-mtr-n4-align-non', 'MA.GEO.MESURER_TRACER', 4, 'qcm',   'non', NULL),
    -- MA.GEO.CERCLE : compas
    ('geo-cer-n1-centre', 'MA.GEO.CERCLE', 1, 'qcm',    'le centre', NULL),
    ('geo-cer-n1-rayon',  'MA.GEO.CERCLE', 1, 'qcm',    'le rayon',  NULL),
    ('geo-cer-n2-r3',     'MA.GEO.CERCLE', 2, 'cercle', '[[50,40],[80,40]]',  '{"t":"cercle","r":30,"tol":2}'),
    ('geo-cer-n2-r2',     'MA.GEO.CERCLE', 2, 'cercle', '[[50,40],[70,40]]',  '{"t":"cercle","r":20,"tol":2}'),
    ('geo-cer-n3-passe',  'MA.GEO.CERCLE', 3, 'cercle', '[[30,40],[70,40]]',  '{"t":"cercle","r":40,"cx":30,"cy":40,"tol":2}'),
    ('geo-cer-n3-report', 'MA.GEO.CERCLE', 3, 'cercle', '[[20,40],[60,40]]',  '{"t":"cercle","r":40,"cx":20,"cy":40,"tol":2}'),
    ('geo-cer-n4-passe',  'MA.GEO.CERCLE', 4, 'cercle', '[[30,30],[60,70]]',  '{"t":"cercle","r":50,"cx":30,"cy":30,"tol":2}'),
    ('geo-cer-n4-r5',     'MA.GEO.CERCLE', 4, 'cercle', '[[60,50],[110,50]]', '{"t":"cercle","r":50,"tol":2}'),
    -- MA.GEO.PATRONS : patrons de cube
    ('geo-pat-n1-faces', 'MA.GEO.PATRONS', 1, 'qcm',    '6', NULL),
    ('geo-pat-n1-quoi',  'MA.GEO.PATRONS', 1, 'qcm',    'un dessin à plat qui se replie en cube', NULL),
    ('geo-pat-n2-choix', 'MA.GEO.PATRONS', 2, 'patron', '[[1,0],[1,1],[1,2],[1,3],[0,2],[2,2]]', '{"t":"plie"}'),
    ('geo-pat-n3-choix', 'MA.GEO.PATRONS', 3, 'patron', '[[1,0],[1,1],[1,2],[1,3],[0,1],[2,1]]', '{"t":"plie"}'),
    ('geo-pat-n4-oui',   'MA.GEO.PATRONS', 4, 'patron', 'oui', '{"t":"juge","cells":[[0,0],[1,0],[2,0],[2,1],[3,1],[4,1]]}'),
    ('geo-pat-n4-non',   'MA.GEO.PATRONS', 4, 'patron', 'non', '{"t":"juge","cells":[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]]}')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu, spec=EXCLUDED.spec;

-- =========================================================================
-- 4. Verification PAR PROPRIETES : regle, compas, patrons.
-- =========================================================================

-- Regle graduee : la saisie est un entier (mm). mesurer / tracer -> longueur ;
-- milieu -> position du milieu. |valeur - cible| <= tol.
CREATE OR REPLACE FUNCTION public.verif_geo_regle(p_spec jsonb, p_saisie text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $fn$
DECLARE
    v numeric;
    cible numeric;
    tol numeric := (p_spec->>'tol')::numeric;
BEGIN
    v := p_saisie::numeric;                       -- leve une exception si non numerique
    IF (p_spec->>'t') = 'milieu' THEN cible := (p_spec->>'mid')::numeric;
    ELSE cible := (p_spec->>'len')::numeric; END IF;
    RETURN abs(v - cible) <= tol;
EXCEPTION WHEN others THEN
    RETURN false;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_geo_regle(jsonb, text) FROM PUBLIC, anon, authenticated;

-- Compas : saisie = [[cx,cy],[px,py]] en mm (pointe + point du cercle). On
-- compare le rayon (au carre) et, si un centre est impose, la position de la
-- pointe. Tout en entiers (surface aimante au cm) -> exact.
CREATE OR REPLACE FUNCTION public.verif_geo_cercle(p_spec jsonb, p_saisie text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $fn$
DECLARE
    pts jsonb;
    cx int; cy int; px int; py int;
    r int := (p_spec->>'r')::int;
    tol int := (p_spec->>'tol')::int;
    scx int; scy int;
    r2 bigint; lo bigint; hi bigint;
BEGIN
    pts := p_saisie::jsonb;
    IF jsonb_typeof(pts) <> 'array' OR jsonb_array_length(pts) <> 2 THEN RETURN false; END IF;
    cx := (pts->0->>0)::int; cy := (pts->0->>1)::int;
    px := (pts->1->>0)::int; py := (pts->1->>1)::int;
    IF (p_spec ? 'cx') AND (p_spec ? 'cy') THEN
        scx := (p_spec->>'cx')::int; scy := (p_spec->>'cy')::int;
        IF (cx-scx)::bigint*(cx-scx) + (cy-scy)::bigint*(cy-scy) > tol::bigint*tol THEN RETURN false; END IF;
    END IF;
    r2 := (px-cx)::bigint*(px-cx) + (py-cy)::bigint*(py-cy);
    lo := greatest(0, r - tol);
    hi := r + tol;
    RETURN r2 >= lo*lo AND r2 <= hi*hi;
EXCEPTION WHEN others THEN
    RETURN false;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_geo_cercle(jsonb, text) FROM PUBLIC, anon, authenticated;

-- Roulement d'un cube : orientation = 6 caracteres (faces aux positions
-- U,D,N,S,E,W). Retourne la nouvelle orientation apres un roulement.
CREATE OR REPLACE FUNCTION public.verif_geo_roll(o text, dir text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $fn$
DECLARE
    u text := substr(o,1,1); d text := substr(o,2,1); n text := substr(o,3,1);
    s text := substr(o,4,1); e text := substr(o,5,1); w text := substr(o,6,1);
BEGIN
    IF    dir = 'E' THEN RETURN w||e||n||s||u||d;   -- U=W, D=E, E=U, W=D
    ELSIF dir = 'W' THEN RETURN e||w||n||s||d||u;   -- U=E, D=W, E=D, W=U
    ELSIF dir = 'N' THEN RETURN s||n||u||d||e||w;   -- U=S, D=N, N=U, S=D
    ELSE                 RETURN n||s||d||u||e||w;   -- 'S' : U=N, D=S, N=D, S=U
    END IF;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_geo_roll(text, text) FROM PUBLIC, anon, authenticated;

-- Patron de cube : simulation de pliage. Un hexomino se referme en cube ssi, en
-- roulant un cube de case en case (parcours en largeur), ses 6 cases se posent
-- sur 6 faces DISTINCTES (la face « dessous » peint la case).
CREATE OR REPLACE FUNCTION public.verif_patron_cube(p_cells jsonb)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $fn$
DECLARE
    n int; i int; j int;
    cx int[]; cy int[]; keyarr text[];
    faceDown text[] := array_fill(NULL::text, ARRAY[6]);
    oriArr   text[] := array_fill(NULL::text, ARRAY[6]);
    queue int[] := ARRAY[1];
    head int := 1;
    cur int; curc int; curr int; no text; nb int;
    dir record;
BEGIN
    IF p_cells IS NULL OR jsonb_typeof(p_cells) <> 'array' THEN RETURN false; END IF;
    n := jsonb_array_length(p_cells);
    IF n <> 6 THEN RETURN false; END IF;
    FOR i IN 0..5 LOOP
        cx[i+1] := (p_cells->i->>0)::int;
        cy[i+1] := (p_cells->i->>1)::int;
        keyarr[i+1] := cx[i+1] || ',' || cy[i+1];
    END LOOP;
    IF (SELECT count(DISTINCT k) FROM unnest(keyarr) AS k) <> 6 THEN RETURN false; END IF;

    oriArr[1] := 'UDNSEW';
    faceDown[1] := 'D';
    WHILE head <= array_length(queue, 1) LOOP
        cur := queue[head]; head := head + 1;
        curc := cx[cur]; curr := cy[cur];
        FOR dir IN SELECT * FROM (VALUES ('E',1,0),('W',-1,0),('N',0,1),('S',0,-1)) AS t(d,dx,dy) LOOP
            nb := NULL;
            FOR j IN 1..6 LOOP
                IF cx[j] = curc + dir.dx AND cy[j] = curr + dir.dy THEN nb := j; EXIT; END IF;
            END LOOP;
            IF nb IS NOT NULL AND faceDown[nb] IS NULL THEN
                no := public.verif_geo_roll(oriArr[cur], dir.d);
                oriArr[nb] := no;
                faceDown[nb] := substr(no, 2, 1);
                queue := array_append(queue, nb);
            END IF;
        END LOOP;
    END LOOP;

    IF (SELECT count(*) FROM unnest(faceDown) AS f WHERE f IS NOT NULL) <> 6 THEN RETURN false; END IF; -- connexe
    RETURN (SELECT count(DISTINCT f) FROM unnest(faceDown) AS f) = 6; -- 6 faces distinctes
EXCEPTION WHEN others THEN
    RETURN false;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_patron_cube(jsonb) FROM PUBLIC, anon, authenticated;

-- Patron : plie (la saisie est le patron choisi) ou juge (oui/non).
CREATE OR REPLACE FUNCTION public.verif_geo_patron(p_spec jsonb, p_saisie text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $fn$
DECLARE
    rep text;
BEGIN
    IF (p_spec->>'t') = 'plie' THEN
        RETURN public.verif_patron_cube(p_saisie::jsonb);
    END IF;
    rep := public.normaliser_lettres(p_saisie);   -- juge
    IF rep NOT IN ('oui', 'non') THEN RETURN false; END IF;
    RETURN rep = CASE WHEN public.verif_patron_cube(p_spec->'cells') THEN 'oui' ELSE 'non' END;
EXCEPTION WHEN others THEN
    RETURN false;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_geo_patron(jsonb, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 5. verif_geo : dispatch etendu (regle / cercle / patron).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_geo(p_cle text, p_saisie text)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $fn$
DECLARE g public.geometrie_item;
BEGIN
    SELECT * INTO g FROM public.geometrie_item WHERE cle = p_cle;
    IF NOT FOUND THEN RETURN false; END IF;
    IF g.format = 'qcm' THEN
        RETURN public.normaliser_lettres(p_saisie) = public.normaliser_lettres(g.attendu);
    ELSIF g.format = 'grille' THEN
        RETURN lower(regexp_replace(COALESCE(p_saisie, ''), '\s', '', 'g'))
             = lower(regexp_replace(g.attendu,             '\s', '', 'g'));
    ELSIF g.format = 'construire' THEN
        RETURN public.verif_geo_construire(g.spec, p_saisie);
    ELSIF g.format = 'programme' THEN
        RETURN public.verif_geo_programme(g.spec, p_saisie);
    ELSIF g.format = 'reproduire' THEN
        RETURN public.verif_geo_reproduire(g.spec, p_saisie);
    ELSIF g.format = 'regle' THEN
        RETURN public.verif_geo_regle(g.spec, p_saisie);
    ELSIF g.format = 'cercle' THEN
        RETURN public.verif_geo_cercle(g.spec, p_saisie);
    ELSIF g.format = 'patron' THEN
        RETURN public.verif_geo_patron(g.spec, p_saisie);
    ELSE
        RETURN public.normaliser_mot(p_saisie) = public.normaliser_mot(g.attendu);
    END IF;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_geo(text, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 6. Exercices de reference (N1..N4) pour les trois nouvelles competences.
--    id deterministe = md5('<competence>:<niveau>:geometrie'). Domaine geometrie
--    -> methode van_hiele.
-- =========================================================================
DO $do$
DECLARE
    v_comp text;
    v_niv  integer;
    v_id   uuid;
BEGIN
    FOR v_comp IN
        SELECT code FROM public.competences
         WHERE code IN ('MA.GEO.MESURER_TRACER', 'MA.GEO.CERCLE', 'MA.GEO.PATRONS')
    LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':geometrie')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'geometrie', v_niv, 'van_hiele', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 7. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0050_maths_geometrie_regle_compas_patrons')
ON CONFLICT (version) DO NOTHING;
