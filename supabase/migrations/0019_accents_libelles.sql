-- 0019_accents_libelles.sql
-- Correction des accents manquants dans les libelles affiches (matieres et
-- competences de maths). Les libelles proviennent de la base (lus par le front
-- via getReferentiel) : seed historique saisi sans accents.
--
-- Idempotent (UPDATE cibles par code ; rejouables sans effet si deja corriges).

-- =========================================================================
-- 1. Matieres
-- =========================================================================
UPDATE public.matieres SET libelle = 'Géométrie' WHERE code = 'GE';
UPDATE public.matieres SET libelle = 'Problèmes' WHERE code = 'PB';
UPDATE public.matieres SET libelle = 'Français'  WHERE code = 'FR';

-- =========================================================================
-- 2. Competences de calcul mental (matiere MA, seules affichees aujourd'hui)
-- =========================================================================
UPDATE public.competences SET libelle = 'Moitiés'
    WHERE code = 'MA.CM.MOITIES';
UPDATE public.competences SET libelle = 'Complément à la dizaine/centaine/millier supérieur'
    WHERE code = 'MA.CM.COMPL_SUP';
UPDATE public.competences SET libelle = 'Compléments à 100 et à 1000'
    WHERE code = 'MA.CM.COMPL_100_1000';
UPDATE public.competences SET libelle = 'Sommes et différences'
    WHERE code = 'MA.CM.SOMMES_DIFF';

-- =========================================================================
-- 3. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0019_accents_libelles')
ON CONFLICT (version) DO NOTHING;
