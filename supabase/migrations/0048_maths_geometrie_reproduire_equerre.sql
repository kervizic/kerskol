-- 0048_maths_geometrie_reproduire_equerre.sql
-- REFONTE GEOMETRIE CE2 - LOT 2 (suite de 0047). Migration ADDITIVE et IDEMPOTENTE.
-- Ajoute, sur les competences EXISTANTES (aucune nouvelle competence, aucun reset
-- des niveaux d'Iris) :
--
--   * REPRODUIRE une figure (format 'reproduire', MA.GEO.CONSTRUIRE) : un modele
--     est montre, l'enfant le retrace de noeud en noeud sur un quadrillage.
--     Verification serveur PAR PROPRIETES : egalite des figures A TRANSLATION PRES
--     (meme ensemble d'aretes apres recalage sur le coin bas-gauche). Sert aussi
--     au « refaire de memoire » (N4) : meme verification, le modele est masque au
--     bout de 3 secondes cote client.
--   * COMPLETER un sommet manquant (format 'construire' avec sommets pre-places,
--     MA.GEO.CONSTRUIRE) : trois coins sont donnes, l'enfant pose le quatrieme ;
--     la figure complete doit etre le rectangle/carre attendu.
--   * EQUERRE / « touche tous les angles droits » (format 'grille', selection
--     MULTIPLE de sommets, MA.GEO.VOCABULAIRE) : l'enfant touche les sommets qui
--     sont des angles droits ; le serveur compare l'ENSEMBLE canonique des sommets
--     (meme comparaison que la symetrie : minuscule, espaces retires).
--   * SYMETRIE : ajout d'un item de completion plus grand au N4 (la symetrie etait
--     deja au bon niveau en N3/N4, on confirme et on remonte le plafond).

-- =========================================================================
-- 1. Schema : autoriser le format 'reproduire' (spec requis comme construire).
-- =========================================================================
ALTER TABLE public.geometrie_item DROP CONSTRAINT IF EXISTS geometrie_item_format_chk;
ALTER TABLE public.geometrie_item ADD CONSTRAINT geometrie_item_format_chk
    CHECK (format IN ('qcm','clic','texte','grille','construire','programme','reproduire'));

ALTER TABLE public.geometrie_item DROP CONSTRAINT IF EXISTS geometrie_item_spec_chk;
ALTER TABLE public.geometrie_item ADD CONSTRAINT geometrie_item_spec_chk
    CHECK ((format IN ('construire','programme','reproduire')) = (spec IS NOT NULL));

-- =========================================================================
-- 2. Verification « reproduire » : egalite a TRANSLATION pres.
--    On compare l'ensemble (trie) des ARETES normalisees, chaque figure etant
--    d'abord recalee sur son coin bas-gauche (min x, min y). Independant du
--    sommet de depart et du sens de parcours ; capture la connectivite.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_geo_edges(poly jsonb)
RETURNS text[]
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $fn$
DECLARE
    n int;
    minx int; miny int;
    i int;
    xa int; ya int; xb int; yb int;
    res text[] := ARRAY[]::text[];
    e text;
BEGIN
    IF poly IS NULL OR jsonb_typeof(poly) <> 'array' THEN RETURN NULL; END IF;
    n := jsonb_array_length(poly);
    IF n < 2 THEN RETURN NULL; END IF;
    SELECT min((p->>0)::int), min((p->>1)::int) INTO minx, miny
      FROM jsonb_array_elements(poly) p;
    FOR i IN 0..n-1 LOOP
        xa := (poly->i->>0)::int - minx;               ya := (poly->i->>1)::int - miny;
        xb := (poly->((i+1)%n)->>0)::int - minx;       yb := (poly->((i+1)%n)->>1)::int - miny;
        IF (xa > xb) OR (xa = xb AND ya > yb) THEN      -- arete non orientee (canonique)
            e := xb || ',' || yb || '-' || xa || ',' || ya;
        ELSE
            e := xa || ',' || ya || '-' || xb || ',' || yb;
        END IF;
        res := array_append(res, e);
    END LOOP;
    RETURN (SELECT array_agg(x ORDER BY x) FROM unnest(res) AS x);
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_geo_edges(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verif_geo_reproduire(p_spec jsonb, p_saisie text)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $fn$
DECLARE
    drawn jsonb;
    md text[];
    dr text[];
BEGIN
    drawn := p_saisie::jsonb;
    IF jsonb_typeof(drawn) <> 'array' THEN RETURN false; END IF;
    md := public.verif_geo_edges(p_spec->'model');
    dr := public.verif_geo_edges(drawn);
    IF md IS NULL OR dr IS NULL THEN RETURN false; END IF;
    RETURN md = dr;
EXCEPTION WHEN others THEN
    RETURN false;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_geo_reproduire(jsonb, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 3. verif_geo : ajout de la branche 'reproduire'.
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
    ELSE
        RETURN public.normaliser_mot(p_saisie) = public.normaliser_mot(g.attendu);
    END IF;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_geo(text, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 4. Seed des nouveaux items (miroir EXACT de geometrie.ts ; test croise).
--    `attendu` : pour reproduire, un exemple de reproduction valide (ici une
--    copie TRANSLATEE du modele, ce qui prouve l'acceptation a translation pres).
-- =========================================================================
INSERT INTO public.geometrie_item (cle, competence, niveau, format, attendu, spec) VALUES
    -- MA.GEO.CONSTRUIRE : completer un sommet manquant (construire pre-rempli)
    ('geo-con-n2-comp-carre', 'MA.GEO.CONSTRUIRE', 2, 'construire', '[[0,0],[3,0],[3,3],[0,3]]', '{"t":"rect","w":3,"h":3}'),
    ('geo-con-n3-comp-rect',  'MA.GEO.CONSTRUIRE', 3, 'construire', '[[0,0],[4,0],[4,2],[0,2]]', '{"t":"rect","w":4,"h":2}'),
    -- MA.GEO.CONSTRUIRE : reproduire une figure (N3) et de memoire (N4)
    ('geo-rep-n3-rect', 'MA.GEO.CONSTRUIRE', 3, 'reproduire', '[[1,1],[5,1],[5,3],[1,3]]',
        '{"model":[[0,0],[4,0],[4,2],[0,2]]}'),
    ('geo-rep-n3-ell',  'MA.GEO.CONSTRUIRE', 3, 'reproduire', '[[1,1],[4,1],[4,2],[2,2],[2,3],[1,3]]',
        '{"model":[[0,0],[3,0],[3,1],[1,1],[1,2],[0,2]]}'),
    ('geo-rep-n4-mem-rect', 'MA.GEO.CONSTRUIRE', 4, 'reproduire', '[[2,1],[5,1],[5,3],[2,3]]',
        '{"model":[[0,0],[3,0],[3,2],[0,2]],"memoire":true}'),
    ('geo-rep-n4-mem-tri',  'MA.GEO.CONSTRUIRE', 4, 'reproduire', '[[1,1],[4,1],[1,3]]',
        '{"model":[[0,0],[3,0],[0,2]],"memoire":true}'),
    -- MA.GEO.VOCABULAIRE : touche tous les angles droits (equerre, selection multiple)
    ('geo-voc-n3-equerre', 'MA.GEO.VOCABULAIRE', 3, 'grille', 'A;B', NULL),
    ('geo-voc-n4-equerre', 'MA.GEO.VOCABULAIRE', 4, 'grille', 'A;E', NULL),
    -- MA.GEO.SYMETRIE : completion par symetrie plus grande (N4)
    ('geo-sym-n4-c', 'MA.GEO.SYMETRIE', 4, 'grille', 'A5;B6;C5;D6;E5', NULL)
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu, spec=EXCLUDED.spec;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0048_maths_geometrie_reproduire_equerre')
ON CONFLICT (version) DO NOTHING;
