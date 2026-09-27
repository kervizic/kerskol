-- 0003_referentiel.sql
-- Referentiel pedagogique (donnees de structure, lues par tous les enfants) :
-- matieres, competences, prerequis, methodes, exercices et, pour le calcul,
-- la table specialisee ex_calcul.
--
-- Principes :
--   * Lecture pour authenticated, ecriture INTERDITE cote API (seed applique
--     par migration = superuser postgres).
--   * anon : aucun acces.
--   * Migration idempotente.

-- =========================================================================
-- 1. Matieres
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.matieres (
    code    text PRIMARY KEY,
    libelle text NOT NULL
);
COMMENT ON TABLE public.matieres IS
    'MA maths-calcul, GE geometrie, PB problemes, FR francais, EN anglais.';

INSERT INTO public.matieres (code, libelle) VALUES
    ('MA', 'Maths - calcul'),
    ('GE', 'Geometrie'),
    ('PB', 'Problemes'),
    ('FR', 'Francais'),
    ('EN', 'Anglais')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 2. Competences
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.competences (
    code       text    PRIMARY KEY,
    matiere    text    NOT NULL REFERENCES public.matieres (code),
    domaine    text    NOT NULL,
    libelle    text    NOT NULL,
    ordre      integer NOT NULL DEFAULT 0,
    nb_niveaux integer NOT NULL DEFAULT 4,
    actif      boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE public.competences IS 'Competences suivies, 4 niveaux par defaut.';

-- =========================================================================
-- 3. Prerequis entre competences
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.competence_prerequis (
    competence text    NOT NULL REFERENCES public.competences (code) ON DELETE CASCADE,
    prerequis  text    NOT NULL REFERENCES public.competences (code) ON DELETE CASCADE,
    niveau_min integer NOT NULL DEFAULT 2,
    PRIMARY KEY (competence, prerequis),
    CONSTRAINT prerequis_pas_soi_meme_chk CHECK (competence <> prerequis)
);
COMMENT ON TABLE public.competence_prerequis IS
    'Le prerequis doit etre atteint au niveau_min pour debloquer la competence.';

-- =========================================================================
-- 4. Methodes pedagogiques
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.methodes (
    code    text PRIMARY KEY,
    libelle text NOT NULL
);
INSERT INTO public.methodes (code, libelle) VALUES
    ('cpa_barres',         'Concret-image-abstrait (modele en barres, Singapour)'),
    ('exemples_estompes',  'Exemples resolus progressivement estompes'),
    ('variation',          'Variation (bianshi) : un parametre a la fois'),
    ('probleme_dabord',    'Probleme d''abord (hatsumon / neriage)'),
    ('plateau_lineaire',   'Plateau lineaire numerote (sens du nombre)'),
    ('schemas',            'Instruction par schemas (types de problemes)'),
    ('van_hiele',          'Progression de van Hiele (geometrie)'),
    ('spatial',            'Entrainement spatial'),
    ('relecture_audio',    'Relecture avec modele audio (fluence)'),
    ('dictee_sons',        'Dictee son par son'),
    ('lecture_reciproque', 'Lecture reciproque (questionner, clarifier, resumer, predire)'),
    ('morphologie',        'Morphologie par familles de mots'),
    ('ecoute_chansons',    'Ecoute de chansons espacee (anglais)'),
    ('gestes',             'Gestes (TPR)')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 5. Exercices (table generique) + cle composee (id, type) pour specialiser
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.exercices (
    id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    competence text    NOT NULL REFERENCES public.competences (code),
    type       text    NOT NULL,
    niveau     integer NOT NULL,
    methode    text    REFERENCES public.methodes (code),
    actif      boolean NOT NULL DEFAULT true,
    CONSTRAINT exercices_type_chk CHECK (type IN (
        'calcul','qcm','texte_trous','dictee','geometrie','vocabulaire')),
    CONSTRAINT exercices_niveau_chk CHECK (niveau BETWEEN 1 AND 4),
    -- Cle candidate exploitee par les FK composees des tables specialisees.
    CONSTRAINT exercices_id_type_uk UNIQUE (id, type)
);
COMMENT ON TABLE public.exercices IS
    'Descripteur generique d''exercice. Les tables par type (ex_calcul, ...) '
    'referencent (id, type) pour garantir la coherence du type.';
CREATE INDEX IF NOT EXISTS exercices_comp_niveau_idx
    ON public.exercices (competence, niveau) WHERE actif;

-- =========================================================================
-- 6. ex_calcul (specialisation type = calcul)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ex_calcul (
    exercice_id         uuid    PRIMARY KEY,
    type                text    NOT NULL DEFAULT 'calcul',
    operation           text    NOT NULL,
    forme               text    NOT NULL,
    params              jsonb   NOT NULL,
    support_visuel      text,
    correction_strategie text,
    CONSTRAINT ex_calcul_type_chk       CHECK (type = 'calcul'),
    CONSTRAINT ex_calcul_operation_chk  CHECK (operation IN (
        'add','sub','mul','div','double','moitie','complement')),
    CONSTRAINT ex_calcul_forme_chk      CHECK (forme IN (
        'resultat','terme_manquant','decomposition','ordre_grandeur','reste')),
    CONSTRAINT ex_calcul_support_chk    CHECK (
        support_visuel IS NULL OR support_visuel IN ('rectangle','droite','aucun')),
    CONSTRAINT ex_calcul_exercice_fk FOREIGN KEY (exercice_id, type)
        REFERENCES public.exercices (id, type) ON DELETE CASCADE
);
COMMENT ON TABLE public.ex_calcul IS
    'Parametres du generateur cote client pour les exercices de calcul. '
    'params jsonb : bornes, tables, cibles, listes de nombres.';

-- =========================================================================
-- 7. RLS : lecture pour authenticated, aucune ecriture cote API, anon exclu
-- =========================================================================
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'matieres','competences','competence_prerequis','methodes','exercices','ex_calcul'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS %I_select_auth ON public.%I;', t, t);
        EXECUTE format(
            'CREATE POLICY %I_select_auth ON public.%I FOR SELECT TO authenticated USING (true);',
            t, t);
        EXECUTE format('GRANT SELECT ON public.%I TO authenticated;', t);
        -- Pas de GRANT INSERT/UPDATE/DELETE : ecriture impossible cote API.
    END LOOP;
END
$$;

-- =========================================================================
-- 8. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0003_referentiel')
ON CONFLICT (version) DO NOTHING;
