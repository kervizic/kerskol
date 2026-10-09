-- 0108_cm1_frise_histoire.sql
-- LOT 1 (CM1) - FRISE PERSONNELLE du Parcours d'Histoire (type Timeline).
--
-- Chaque chapitre fait gagner 2-3 cartes-evenements. L'enfant les place parmi
-- celles deja gagnees ; le SERVEUR verifie l'ORDRE chronologique (jamais le
-- client) et n'enregistre la carte que si l'ordre est correct. La frise est
-- stockee PAR PROFIL et grandit sur l'annee.
--
-- Deux tables :
--   * public.frise_carte_ref    : referentiel SERVEUR-ONLY (verite de l'ordre via
--     cle_tri). FORCE RLS + REVOKE (comme public.qm_item).
--   * public.frise_carte_profil : cartes correctement placees par un profil
--     (par-profil, RLS). Ecrite UNIQUEMENT par la RPC frise_placer (SECURITY
--     DEFINER) ; aucun GRANT direct au client.
--
-- Deux RPC (SECURITY DEFINER, exposees a authenticated, verifient
-- peut_acceder_profil) :
--   * frise_etat(p_profil)            -> text[] des cles placees (ordre chrono) ;
--   * frise_placer(p_profil, p_cle, p_ordre) -> boolean (ordre correct -> acquis).
--
-- Securite / donnees reelles : ADDITIVE et IDEMPOTENTE. Aucun changement du
-- DEFAUT de profils.domaines_actifs (la frise est un ecran dedie, non pilote par
-- domaines_actifs). Miroir front : frontend/src/domain/histoire/parcours.ts.

-- ===========================================================================
-- 1. Referentiel SERVEUR-ONLY des cartes (verite de l'ordre = cle_tri AAAAMMJJ).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.frise_carte_ref (
    cle        text PRIMARY KEY,
    titre      text   NOT NULL,
    cle_tri    bigint NOT NULL,                 -- cle de tri chronologique (AAAAMMJJ)
    date_label text   NOT NULL,
    periode    text   NOT NULL,
    chapitre   text   NOT NULL,
    CONSTRAINT frise_ref_titre_chk   CHECK (btrim(titre) <> ''),
    CONSTRAINT frise_ref_periode_chk CHECK (periode IN ('moyen_age','temps_modernes','contemporaine'))
);
COMMENT ON TABLE public.frise_carte_ref IS
  'Referentiel serveur-only des cartes de frise (ordre chronologique = cle_tri). Jamais expose au client.';
ALTER TABLE public.frise_carte_ref ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frise_carte_ref FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.frise_carte_ref FROM anon, authenticated;

INSERT INTO public.frise_carte_ref (cle, titre, cle_tri, date_label, periode, chapitre) VALUES
    ('fri-1000-villages',    'Des villages partout',                      10000101, 'vers l''an 1000', 'moyen_age',      'moyen_age'),
    ('fri-1163-notredame',   'On commence Notre-Dame de Paris',           11630101, '1163',            'moyen_age',      'moyen_age'),
    ('fri-1492-colomb',      'Christophe Colomb atteint l''Amérique',     14921012, '1492',            'temps_modernes', 'explorations'),
    ('fri-1515-marignan',    'François Ier gagne à Marignan',             15150913, '1515',            'temps_modernes', 'monarchie'),
    ('fri-1519-magellan',    'Magellan part faire le tour du monde',      15190920, '1519',            'temps_modernes', 'explorations'),
    ('fri-1598-nantes',      'L''édit de Nantes (Henri IV)',              15980413, '1598',            'temps_modernes', 'monarchie'),
    ('fri-1682-versailles',  'Louis XIV s''installe à Versailles',        16820506, '1682',            'temps_modernes', 'monarchie'),
    ('fri-1685-codenoir',    'Le Code noir',                              16850301, '1685',            'temps_modernes', 'traite'),
    ('fri-1789-bastille',    'Prise de la Bastille',                      17890714, '14 juillet 1789', 'contemporaine',  'revolution'),
    ('fri-1789-declaration', 'Déclaration des droits de l''Homme',        17890826, '26 août 1789',    'contemporaine',  'revolution'),
    ('fri-1794-abolition',   'La France abolit l''esclavage (Révolution)',17940204, '4 février 1794',  'contemporaine',  'traite')
ON CONFLICT (cle) DO UPDATE SET
    titre = EXCLUDED.titre, cle_tri = EXCLUDED.cle_tri, date_label = EXCLUDED.date_label,
    periode = EXCLUDED.periode, chapitre = EXCLUDED.chapitre;

-- ===========================================================================
-- 2. Table PAR-PROFIL des cartes correctement placees.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.frise_carte_profil (
    profil_id uuid        NOT NULL REFERENCES public.profils (id) ON DELETE CASCADE,
    cle       text        NOT NULL REFERENCES public.frise_carte_ref (cle),
    gagnee_le timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (profil_id, cle)
);
CREATE INDEX IF NOT EXISTS frise_carte_profil_profil_idx
    ON public.frise_carte_profil (profil_id);

ALTER TABLE public.frise_carte_profil ENABLE ROW LEVEL SECURITY;
-- Lecture reservee au profil/parent (defense en profondeur ; l'acces normal
-- passe par les RPC SECURITY DEFINER). Aucune ecriture directe cote client.
DROP POLICY IF EXISTS frise_carte_profil_select ON public.frise_carte_profil;
CREATE POLICY frise_carte_profil_select ON public.frise_carte_profil
    FOR SELECT TO authenticated USING (public.peut_acceder_profil(profil_id));

-- ===========================================================================
-- 3. RPC frise_etat : cles placees par un profil, triees chronologiquement.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.frise_etat(p_profil uuid)
RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $fn$
DECLARE
    v_out text[];
BEGIN
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces refuse';
    END IF;
    SELECT array_agg(p.cle ORDER BY r.cle_tri)
      INTO v_out
      FROM public.frise_carte_profil p
      JOIN public.frise_carte_ref r ON r.cle = p.cle
     WHERE p.profil_id = p_profil;
    RETURN COALESCE(v_out, ARRAY[]::text[]);
END;
$fn$;
REVOKE ALL ON FUNCTION public.frise_etat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.frise_etat(uuid) TO authenticated;

-- ===========================================================================
-- 4. RPC frise_placer : verifie l'ORDRE propose et acquiert la carte si correct.
--    p_ordre = la liste des cles dans l'ordre choisi (cartes placees + nouvelle).
--    L'ordre est correct ssi c'est l'ordre croissant des cle_tri, que toutes les
--    cles existent dans le referentiel, et que la nouvelle carte y figure.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.frise_placer(p_profil uuid, p_cle text, p_ordre text[])
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp
AS $fn$
DECLARE
    v_attendu text[];
    v_correct boolean;
BEGIN
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces refuse';
    END IF;
    IF p_cle IS NULL OR p_ordre IS NULL OR array_length(p_ordre, 1) IS NULL THEN
        RETURN false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.frise_carte_ref WHERE cle = p_cle) THEN
        RETURN false;
    END IF;
    -- Ordre attendu = les cles de p_ordre triees par cle_tri (uniquement celles
    -- qui existent dans le referentiel). Si une cle est inconnue ou dupliquee,
    -- l'egalite echouera.
    SELECT array_agg(r.cle ORDER BY r.cle_tri)
      INTO v_attendu
      FROM public.frise_carte_ref r
     WHERE r.cle = ANY (p_ordre);

    v_correct := COALESCE(p_ordre = v_attendu, false) AND (p_cle = ANY (p_ordre));

    IF v_correct THEN
        INSERT INTO public.frise_carte_profil (profil_id, cle)
        VALUES (p_profil, p_cle)
        ON CONFLICT (profil_id, cle) DO NOTHING;
    END IF;
    RETURN v_correct;
END;
$fn$;
REVOKE ALL ON FUNCTION public.frise_placer(uuid, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.frise_placer(uuid, text, text[]) TO authenticated;

-- Enregistrement de la migration.
INSERT INTO public.schema_migrations (version)
VALUES ('0108_cm1_frise_histoire')
ON CONFLICT (version) DO NOTHING;
