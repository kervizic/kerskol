-- 0066_classes_competences.sql
-- SOCLE MULTI-CLASSES (lot 1). La classe de l'enfant existe deja
-- (public.profils.classe, migration 0010, defaut CE2). Ce lot ajoute la PORTEE
-- de chaque competence par classe : classe_min / classe_max.
--
-- Regle du moteur (cote client, composeSession) : pour un enfant de classe C,
-- une competence est CANDIDATE si sa portee [classe_min, classe_max] chevauche
-- [C-1, C+1] (revision de la classe d'avant si lacune, un peu d'avance si la
-- competence est acquise). La VISIBILITE des sous-matieres reste pilotee cote
-- client (matieres.ts), stricte par classe.
--
-- Migration ADDITIVE et IDEMPOTENTE :
--   * toutes les competences existantes = CE2 (DEFAULT applique aux lignes
--     existantes) ; AUCUN reset d'une progression ou d'un profil (Iris reste en
--     CE2) ;
--   * on marque CE1 les competences qui sont des RAPPELS CE1 evidents
--     (revisions de calcul mental de la classe precedente).

-- =========================================================================
-- 1. Colonnes de portee par classe
-- =========================================================================
ALTER TABLE public.competences
    ADD COLUMN IF NOT EXISTS classe_min text NOT NULL DEFAULT 'CE2',
    ADD COLUMN IF NOT EXISTS classe_max text NOT NULL DEFAULT 'CE2';

ALTER TABLE public.competences DROP CONSTRAINT IF EXISTS competences_classe_min_chk;
ALTER TABLE public.competences ADD  CONSTRAINT competences_classe_min_chk
    CHECK (classe_min IN ('CP','CE1','CE2','CM1','CM2'));
ALTER TABLE public.competences DROP CONSTRAINT IF EXISTS competences_classe_max_chk;
ALTER TABLE public.competences ADD  CONSTRAINT competences_classe_max_chk
    CHECK (classe_max IN ('CP','CE1','CE2','CM1','CM2'));
-- Ordre coherent : classe_min <= classe_max (ordre scolaire CP<CE1<CE2<CM1<CM2).
ALTER TABLE public.competences DROP CONSTRAINT IF EXISTS competences_classe_ordre_chk;
ALTER TABLE public.competences ADD  CONSTRAINT competences_classe_ordre_chk
    CHECK (array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_min)
        <= array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max));

COMMENT ON COLUMN public.competences.classe_min IS
    'Classe minimale ou la competence est au programme (CP..CM2).';
COMMENT ON COLUMN public.competences.classe_max IS
    'Classe maximale ou la competence est au programme (CP..CM2).';

-- =========================================================================
-- 2. Rappels CE1 evidents : revisions de calcul mental de la classe d'avant.
--    classe_min = CE1 (classe_max reste CE2) -> candidates en revision pour un
--    CE2 et deja presentes pour un CE1.
-- =========================================================================
UPDATE public.competences
   SET classe_min = 'CE1'
 WHERE code IN ('MA.CM.ADDITION','MA.CM.DOUBLES','MA.CM.MOITIES','MA.CM.COMPL_SUP')
   AND classe_min = 'CE2';

-- =========================================================================
-- 3. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0066_classes_competences')
ON CONFLICT (version) DO NOTHING;
