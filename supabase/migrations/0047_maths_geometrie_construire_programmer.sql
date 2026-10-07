-- 0047_maths_geometrie_construire_programmer.sql
-- MATIERE MATHS, REFONTE GEOMETRIE CE2 - LOT 1 (cycle 2 revise 2024). Le constat :
-- la geometrie de 0043 restait au niveau maternelle/CP (« Quelle est cette
-- figure ? -> carre », « clique sur le carre », « ecris cercle »). En CE2 l'enfant
-- doit DECRIRE et CONSTRUIRE, pas seulement reconnaitre.
--
-- Ce lot 1 ajoute (migration ADDITIVE et IDEMPOTENTE) :
--   * deux NOUVELLES competences :
--       MA.GEO.CONSTRUIRE   construire une figure sur quadrillage aimante
--                           (segment, carre, rectangle, triangle rectangle) ;
--       MA.REPERE.PROGRAMMER programmer un deplacement type Blue-Bot (lire un
--                           programme puis pointer l'arrivee ; assembler un
--                           programme pour atteindre une cible en evitant des
--                           obstacles) ;
--   * des DEVINETTES de proprietes sur MA.GEO.FIGURES (« j'ai quatre cotes egaux
--     et quatre angles droits, qui suis-je ? », « pourquoi ce rectangle n'est pas
--     un carre ? ») A LA PLACE des items « nomme la figure » de niveau CP, qui
--     sont RETIRES (il ne reste qu'un rappel N1 tres court).
--
-- VERIFICATION PAR PROPRIETES (serveur seul juge). verif_geo compare toujours la
-- saisie normalisee pour qcm/clic/texte/grille, MAIS pour les nouveaux formats :
--   * 'construire' : la saisie est la LISTE des sommets places (JSON [[x,y],...],
--     coordonnees de noeuds). verif_geo_construire controle nb de sommets,
--     fermeture, angles droits et longueurs d'apres la colonne `spec` (jsonb) ;
--     TOUTE position et TOUTE orientation sont acceptees ;
--   * 'programme' : la saisie est la LISTE des cartes (JSON ["avance","droite",
--     ...]). verif_geo_programme SIMULE le deplacement d'apres `spec` (grille,
--     depart, orientation, cible, obstacles) : arrivee sur la cible, sans sortir
--     ni heurter un obstacle.
-- La « lecture de programme » (pointer l'arrivee) reste un 'clic' : la case
-- d'arrivee est deterministe, stockee dans `attendu`, comparee comme une case.
--
-- Donnees reelles : on n'AJOUTE que des sous-matieres deja actives (geometrie,
-- repere) ; aucune reinitialisation des niveaux d'Iris. MA.GEO.FIGURES change de
-- difficulte (de « nommer » vers « decrire ») : signale dans le rapport, mais la
-- competence et son historique sont conserves.

-- =========================================================================
-- 1. Schema : colonne `spec` (contrat de verification par proprietes) + formats.
-- =========================================================================
ALTER TABLE public.geometrie_item ADD COLUMN IF NOT EXISTS spec jsonb;

ALTER TABLE public.geometrie_item DROP CONSTRAINT IF EXISTS geometrie_item_format_chk;
ALTER TABLE public.geometrie_item ADD CONSTRAINT geometrie_item_format_chk
    CHECK (format IN ('qcm','clic','texte','grille','construire','programme'));

-- `spec` est requis EXACTEMENT pour les formats juges par proprietes/simulation.
ALTER TABLE public.geometrie_item DROP CONSTRAINT IF EXISTS geometrie_item_spec_chk;
ALTER TABLE public.geometrie_item ADD CONSTRAINT geometrie_item_spec_chk
    CHECK ((format IN ('construire','programme')) = (spec IS NOT NULL));

COMMENT ON COLUMN public.geometrie_item.spec IS
    'Contrat de verification par proprietes (jsonb). construire : {t:rect|seg|'
    'tri_right, w,h,len}. programme : {cols,rows,start,dir,target,obstacles}. '
    'NULL pour qcm/clic/texte/grille (juges par comparaison de chaine).';

-- =========================================================================
-- 2. Referentiel : deux nouvelles competences (domaines deja actifs).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('MA.GEO.CONSTRUIRE',     'MA', 'geometrie', 'Construire des figures', 635, 4, true),
    ('MA.REPERE.PROGRAMMER',  'MA', 'repere',    'Programmer un déplacement', 655, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 3. RETRAIT des items « nommer la figure » de niveau CP (on garde geo-fig-n1-carre
--    et geo-fig-n1-triangle comme rappel N1 tres court ; le reste est supprime).
--    Aucune FK sur geometrie_item (reponses reference exercices, pas l'item) :
--    suppression sure, l'historique d'Iris n'est pas touche.
-- =========================================================================
DELETE FROM public.geometrie_item WHERE cle IN (
    'geo-fig-n1-rectangle','geo-fig-n1-cercle',
    'geo-fig-n2-carre','geo-fig-n2-triangle','geo-fig-n2-cercle',
    'geo-fig-n3-trirect','geo-fig-n3-tri','geo-fig-n3-rect',
    'geo-fig-n4-carre','geo-fig-n4-rectangle','geo-fig-n4-triangle','geo-fig-n4-cercle'
);

-- =========================================================================
-- 4. Seed des nouveaux items (miroir EXACT de geometrie.ts ; test croise).
--    MA.GEO.FIGURES (devinettes de proprietes) : qcm, spec NULL.
--    MA.GEO.CONSTRUIRE : format 'construire', spec = figure attendue.
--    MA.REPERE.PROGRAMMER : N1/N2 lecture ('clic', arrivee dans `attendu`),
--                           N3/N4 assemblage ('programme', spec = puzzle).
--    `attendu` porte, pour construire/programme, UN exemple de solution valide
--    (sert aussi de fixture au test croise). Le juge reste `spec`.
-- =========================================================================
INSERT INTO public.geometrie_item (cle, competence, niveau, format, attendu, spec) VALUES
    -- MA.GEO.FIGURES : rappel N1 (conserve) + devinettes de proprietes
    ('geo-fig-n1-carre',        'MA.GEO.FIGURES', 1, 'qcm',   'un carré',    NULL),
    ('geo-fig-n1-triangle',     'MA.GEO.FIGURES', 1, 'qcm',   'un triangle', NULL),
    ('geo-fig-n2-dev-triangle', 'MA.GEO.FIGURES', 2, 'qcm',   'un triangle', NULL),
    ('geo-fig-n2-dev-cercle',   'MA.GEO.FIGURES', 2, 'qcm',   'un cercle',   NULL),
    ('geo-fig-n3-dev-carre',    'MA.GEO.FIGURES', 3, 'qcm',   'un carré',    NULL),
    ('geo-fig-n3-pourquoi',     'MA.GEO.FIGURES', 3, 'qcm',   'ses côtés ne sont pas tous égaux', NULL),
    ('geo-fig-n4-dev-rectangle','MA.GEO.FIGURES', 4, 'qcm',   'un rectangle', NULL),
    ('geo-fig-n4-dev-trirect',  'MA.GEO.FIGURES', 4, 'qcm',   'un triangle rectangle', NULL),
    -- MA.GEO.CONSTRUIRE : construire sur quadrillage aimante
    ('geo-con-n1-seg3',  'MA.GEO.CONSTRUIRE', 1, 'construire', '[[0,0],[0,3]]',                 '{"t":"seg","len":3}'),
    ('geo-con-n1-seg4',  'MA.GEO.CONSTRUIRE', 1, 'construire', '[[0,0],[4,0]]',                 '{"t":"seg","len":4}'),
    ('geo-con-n2-carre3','MA.GEO.CONSTRUIRE', 2, 'construire', '[[0,0],[3,0],[3,3],[0,3]]',     '{"t":"rect","w":3,"h":3}'),
    ('geo-con-n2-carre4','MA.GEO.CONSTRUIRE', 2, 'construire', '[[0,0],[4,0],[4,4],[0,4]]',     '{"t":"rect","w":4,"h":4}'),
    ('geo-con-n3-rect53','MA.GEO.CONSTRUIRE', 3, 'construire', '[[0,0],[5,0],[5,3],[0,3]]',     '{"t":"rect","w":5,"h":3}'),
    ('geo-con-n3-rect42','MA.GEO.CONSTRUIRE', 3, 'construire', '[[0,0],[4,0],[4,2],[0,2]]',     '{"t":"rect","w":4,"h":2}'),
    ('geo-con-n4-trirect','MA.GEO.CONSTRUIRE',4, 'construire', '[[0,0],[3,0],[0,3]]',           '{"t":"tri_right"}'),
    ('geo-con-n4-rect63','MA.GEO.CONSTRUIRE', 4, 'construire', '[[0,0],[6,0],[6,3],[0,3]]',     '{"t":"rect","w":6,"h":3}'),
    -- MA.REPERE.PROGRAMMER : N1/N2 lire un programme -> pointer l'arrivee (clic)
    ('geo-prog-n1-a', 'MA.REPERE.PROGRAMMER', 1, 'clic', 'B3', NULL),
    ('geo-prog-n1-b', 'MA.REPERE.PROGRAMMER', 1, 'clic', 'C4', NULL),
    ('geo-prog-n2-a', 'MA.REPERE.PROGRAMMER', 2, 'clic', 'B3', NULL),
    ('geo-prog-n2-b', 'MA.REPERE.PROGRAMMER', 2, 'clic', 'C2', NULL),
    -- MA.REPERE.PROGRAMMER : N3/N4 assembler un programme (simulation serveur)
    ('geo-prog-n3-a', 'MA.REPERE.PROGRAMMER', 3, 'programme', '["avance","avance","droite","avance","avance"]',
        '{"cols":5,"rows":5,"start":"A1","dir":"N","target":"C3","obstacles":[]}'),
    ('geo-prog-n3-b', 'MA.REPERE.PROGRAMMER', 3, 'programme', '["avance","avance","avance","gauche","avance"]',
        '{"cols":5,"rows":5,"start":"A1","dir":"E","target":"D2","obstacles":[]}'),
    ('geo-prog-n4-a', 'MA.REPERE.PROGRAMMER', 4, 'programme', '["avance","avance","avance","avance","droite","avance","avance","avance","avance"]',
        '{"cols":5,"rows":5,"start":"A1","dir":"N","target":"E5","obstacles":["C3","C4","D3"]}'),
    ('geo-prog-n4-b', 'MA.REPERE.PROGRAMMER', 4, 'programme', '["avance","avance","droite","avance","avance","avance","avance"]',
        '{"cols":5,"rows":5,"start":"A1","dir":"N","target":"E3","obstacles":["C1","C2","D2"]}')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu, spec=EXCLUDED.spec;

-- =========================================================================
-- 5. Verification par PROPRIETES : construire (geometrie) et programme (simulation).
--    Coordonnees ENTIERES (noeuds du quadrillage) -> tout en arithmetique exacte.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_geo_construire(p_spec jsonb, p_saisie text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $fn$
DECLARE
    pts jsonb;
    n   integer;
    t   text := p_spec->>'t';
    x0 int; y0 int; x1 int; y1 int; x2 int; y2 int; x3 int; y3 int;
    e1x int; e1y int; e2x int; e2y int; e3x int; e3y int; e4x int; e4y int;
    s0 int; s1 int; w int; h int; len int;
BEGIN
    pts := p_saisie::jsonb;                       -- leve une exception si JSON invalide
    IF jsonb_typeof(pts) <> 'array' THEN RETURN false; END IF;
    n := jsonb_array_length(pts);

    IF t = 'seg' THEN
        IF n <> 2 THEN RETURN false; END IF;
        x0 := (pts->0->>0)::int; y0 := (pts->0->>1)::int;
        x1 := (pts->1->>0)::int; y1 := (pts->1->>1)::int;
        len := (p_spec->>'len')::int;
        -- segment droit (horizontal ou vertical) de longueur `len`
        RETURN ((x0 = x1 AND abs(y1 - y0) = len) OR (y0 = y1 AND abs(x1 - x0) = len));

    ELSIF t = 'rect' THEN
        IF n <> 4 THEN RETURN false; END IF;
        x0 := (pts->0->>0)::int; y0 := (pts->0->>1)::int;
        x1 := (pts->1->>0)::int; y1 := (pts->1->>1)::int;
        x2 := (pts->2->>0)::int; y2 := (pts->2->>1)::int;
        x3 := (pts->3->>0)::int; y3 := (pts->3->>1)::int;
        e1x := x1 - x0; e1y := y1 - y0;           -- cotes consecutifs
        e2x := x2 - x1; e2y := y2 - y1;
        e3x := x3 - x2; e3y := y3 - y2;
        e4x := x0 - x3; e4y := y0 - y3;
        -- quatre angles droits (produit scalaire nul entre cotes consecutifs)
        IF (e1x*e2x + e1y*e2y) <> 0 THEN RETURN false; END IF;
        IF (e2x*e3x + e2y*e3y) <> 0 THEN RETURN false; END IF;
        IF (e3x*e4x + e3y*e4y) <> 0 THEN RETURN false; END IF;
        IF (e4x*e1x + e4y*e1y) <> 0 THEN RETURN false; END IF;
        s0 := e1x*e1x + e1y*e1y;                   -- longueurs au carre (exact)
        s1 := e2x*e2x + e2y*e2y;
        IF s0 = 0 OR s1 = 0 THEN RETURN false; END IF;
        w := (p_spec->>'w')::int; h := (p_spec->>'h')::int;
        -- les deux dimensions, dans un sens ou dans l'autre (toute orientation)
        RETURN ((s0 = w*w AND s1 = h*h) OR (s0 = h*h AND s1 = w*w));

    ELSIF t = 'tri_right' THEN
        IF n <> 3 THEN RETURN false; END IF;
        x0 := (pts->0->>0)::int; y0 := (pts->0->>1)::int;
        x1 := (pts->1->>0)::int; y1 := (pts->1->>1)::int;
        x2 := (pts->2->>0)::int; y2 := (pts->2->>1)::int;
        -- non degenere (aire non nulle)
        IF ((x1-x0)*(y2-y0) - (y1-y0)*(x2-x0)) = 0 THEN RETURN false; END IF;
        -- un angle droit en P0, P1 ou P2
        IF ((x1-x0)*(x2-x0) + (y1-y0)*(y2-y0)) = 0 THEN RETURN true; END IF;
        IF ((x0-x1)*(x2-x1) + (y0-y1)*(y2-y1)) = 0 THEN RETURN true; END IF;
        IF ((x0-x2)*(x1-x2) + (y0-y2)*(y1-y2)) = 0 THEN RETURN true; END IF;
        RETURN false;
    END IF;
    RETURN false;
EXCEPTION WHEN others THEN
    RETURN false;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_geo_construire(jsonb, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verif_geo_programme(p_spec jsonb, p_saisie text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $fn$
DECLARE
    toks jsonb;
    ntok integer;
    i    integer;
    tok  text;
    cols int := (p_spec->>'cols')::int;
    rows int := (p_spec->>'rows')::int;
    dir  text := upper(p_spec->>'dir');
    col  int;
    rw   int;
    tcol int;
    trow int;
    ncol int;
    nrow int;
    obst text[];
BEGIN
    toks := p_saisie::jsonb;                      -- leve une exception si JSON invalide
    IF jsonb_typeof(toks) <> 'array' THEN RETURN false; END IF;
    ntok := jsonb_array_length(toks);
    IF ntok < 1 OR ntok > 60 THEN RETURN false; END IF;

    col := ascii(left(upper(p_spec->>'start'),1)) - ascii('A');
    rw  := substring(upper(p_spec->>'start') from 2)::int;
    tcol := ascii(left(upper(p_spec->>'target'),1)) - ascii('A');
    trow := substring(upper(p_spec->>'target') from 2)::int;

    SELECT array_agg(upper(value)) INTO obst
      FROM jsonb_array_elements_text(COALESCE(p_spec->'obstacles','[]'::jsonb));
    obst := COALESCE(obst, ARRAY[]::text[]);

    FOR i IN 0..ntok-1 LOOP
        tok := toks->>i;
        IF tok = 'avance' THEN
            ncol := col; nrow := rw;
            IF    dir = 'N' THEN nrow := rw + 1;
            ELSIF dir = 'S' THEN nrow := rw - 1;
            ELSIF dir = 'E' THEN ncol := col + 1;
            ELSIF dir = 'O' THEN ncol := col - 1;
            ELSE RETURN false;
            END IF;
            IF ncol < 0 OR ncol > cols - 1 OR nrow < 1 OR nrow > rows THEN RETURN false; END IF;
            IF (chr(ncol + ascii('A')) || nrow::text) = ANY (obst) THEN RETURN false; END IF;
            col := ncol; rw := nrow;
        ELSIF tok = 'droite' THEN
            dir := CASE dir WHEN 'N' THEN 'E' WHEN 'E' THEN 'S' WHEN 'S' THEN 'O' WHEN 'O' THEN 'N' END;
        ELSIF tok = 'gauche' THEN
            dir := CASE dir WHEN 'N' THEN 'O' WHEN 'O' THEN 'S' WHEN 'S' THEN 'E' WHEN 'E' THEN 'N' END;
        ELSE
            RETURN false;
        END IF;
    END LOOP;

    RETURN (col = tcol AND rw = trow);
EXCEPTION WHEN others THEN
    RETURN false;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_geo_programme(jsonb, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 6. verif_geo : dispatch etendu (construire / programme juges par `spec`).
--    Signature inchangee -> CREATE OR REPLACE. Passe de SQL a plpgsql.
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
    ELSE
        RETURN public.normaliser_mot(p_saisie) = public.normaliser_mot(g.attendu);
    END IF;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_geo(text, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 7. Exercices de reference pour les deux nouvelles competences (N1..N4).
--    id deterministe = md5('<competence>:<niveau>:geometrie'). CONSTRUIRE ->
--    van_hiele (geometrie) ; PROGRAMMER -> spatial (reperage).
-- =========================================================================
DO $do$
DECLARE
    v_comp text;
    v_niv  integer;
    v_id   uuid;
    v_meth text;
BEGIN
    FOR v_comp, v_meth IN
        SELECT code, CASE WHEN code LIKE 'MA.REPERE.%' THEN 'spatial' ELSE 'van_hiele' END
          FROM public.competences
         WHERE code IN ('MA.GEO.CONSTRUIRE', 'MA.REPERE.PROGRAMMER')
    LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':geometrie')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'geometrie', v_niv, v_meth, true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 8. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0047_maths_geometrie_construire_programmer')
ON CONFLICT (version) DO NOTHING;
