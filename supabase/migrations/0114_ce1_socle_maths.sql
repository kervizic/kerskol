-- 0114_ce1_socle_maths.sql
-- LOT CE1 (incrément 1) - MATHS : rendre le programme de MATHÉMATIQUES CE1
-- JOUABLE, en réutilisant les moteurs existants (aucune nouvelle compétence,
-- aucune nouvelle banque). On se contente d'ouvrir la PORTÉE par classe
-- (classe_min = 'CE1') des compétences dont la notion commence au CE1, en
-- gardant leur classe_max (CE2/CM2) : la notion « continue » vers le haut.
--
-- Fondé sur les ATTENDUS DE FIN D'ANNÉE DE CE1 (programme 2024, cycle 2),
-- Éduscol / Éducation nationale :
--   * Nombres et calculs : nombres entiers <= 1 000 (lire/écrire/décomposer,
--     comparer/encadrer/intercaler/ranger, demi-droite graduée, valeur des
--     chiffres c/d/u, parité).
--   * Calcul : tables d'addition ; tables de multiplication par 2, 3, 4 et 5 ;
--     doubles / moitiés ; compléments (dizaine/centaine supérieure, à 100) ;
--     multiplier par 10 ; commutativité ; sommes et différences ; addition et
--     soustraction POSÉES (en colonnes). La multiplication posée et la division
--     ne sont PAS au CE1 (laissées CE2/CM1 : MA.POSE.MULTIPLICATION,
--     MA.POSE.DIVISION, MA.CM.DIV_RESTE inchangées).
--   * Problèmes <= 1 000 : champ additif (1-2 étapes), multiplicatif (sens de x,
--     itération d'addition), deux étapes mixtes, partage/groupement ; monnaie
--     (euros/centimes, rendre la monnaie) ; problèmes de grandeurs.
--   * Grandeurs et mesures : longueurs (cm, dm, m, km), masses (g, kg),
--     contenances (L) ; lire l'heure (heures entières et demi-heures) ; durées
--     (jour/semaine, heure/minute).
--   * Approche des fractions simples (1/2, 1/3, 1/4 : le N1 de MA.FRAC.SIMPLES).
--
-- SÛRETÉ POUR LES PROFILS CE2 (Iris) : on ne fait QUE baisser classe_min de
-- 'CE2' à 'CE1' ; classe_max est INCHANGÉE (reste >= CE2). Pour un enfant de
-- CE2, la candidature d'une compétence est pilotée par classeDansMarge
-- (chevauchement [classe_min, classe_max] avec [C-1, C+1]) : passer de
-- [CE2,CE2] à [CE1,CE2] ne change RIEN pour un CE2 (CE2 reste dans la portée).
-- AUCUNE donnée élève n'est touchée ; AUCUNE compétence créée ou supprimée ;
-- la géométrie et le repérage CE1 (autres moteurs) feront l'objet d'un incrément
-- ultérieur. Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Ouverture de la portée CE1 (classe_min = 'CE1', classe_max inchangée).
-- =========================================================================
UPDATE public.competences
   SET classe_min = 'CE1'
 WHERE matiere = 'MA'
   AND code IN (
     -- Numération <= 1 000
     'MA.NUM.LIRE_ECRIRE','MA.NUM.DECOMPOSER','MA.NUM.COMPARER','MA.NUM.SUITE',
     -- Calcul mental (ADDITION/DOUBLES/MOITIES/COMPL_SUP déjà CE1, migration 0066)
     'MA.CM.COMPL_100_1000','MA.CM.SOMMES_DIFF','MA.CM.X10_X100',
     -- Tables de multiplication par 2, 3, 4 et 5 (PAS 6-9)
     'MA.TABLES.2','MA.TABLES.3','MA.TABLES.4','MA.TABLES.5',
     -- Calcul posé : addition et soustraction (PAS la multiplication posée)
     'MA.POSE.ADDITION','MA.POSE.SOUSTRACTION',
     -- Problèmes (additifs, multiplicatifs, deux étapes, monnaie, grandeurs)
     'MA.PB.ADD_SUB','MA.PB.MULT_DIV','MA.PB.DEUX_ETAPES','MA.PB.MONNAIE','MA.PB.MESURES',
     -- Grandeurs et mesures
     'MA.MES.LONGUEURS','MA.MES.MASSES_CONTENANCES',
     -- Lire l'heure et durées
     'MA.MES.HEURE','MA.MES.DUREES',
     -- Approche des fractions simples (1/2, 1/3, 1/4 au N1)
     'MA.FRAC.SIMPLES'
   )
   AND classe_min <> 'CE1';

-- =========================================================================
-- 2. Garde-fous : complétude de la portée CE1 et NON-débordement.
-- =========================================================================
DO $do$
DECLARE
    v_ce1       integer;
    v_attendu   integer := 23;  -- compétences ouvertes au CE1 par cette migration
    v_total_ce1 integer;
    bad         text;
BEGIN
    -- 2a. Les 23 compétences ciblées sont bien classe_min='CE1'.
    SELECT count(*) INTO v_ce1 FROM public.competences
     WHERE matiere = 'MA' AND classe_min = 'CE1' AND code IN (
       'MA.NUM.LIRE_ECRIRE','MA.NUM.DECOMPOSER','MA.NUM.COMPARER','MA.NUM.SUITE',
       'MA.CM.COMPL_100_1000','MA.CM.SOMMES_DIFF','MA.CM.X10_X100',
       'MA.TABLES.2','MA.TABLES.3','MA.TABLES.4','MA.TABLES.5',
       'MA.POSE.ADDITION','MA.POSE.SOUSTRACTION',
       'MA.PB.ADD_SUB','MA.PB.MULT_DIV','MA.PB.DEUX_ETAPES','MA.PB.MONNAIE','MA.PB.MESURES',
       'MA.MES.LONGUEURS','MA.MES.MASSES_CONTENANCES',
       'MA.MES.HEURE','MA.MES.DUREES',
       'MA.FRAC.SIMPLES');
    IF v_ce1 <> v_attendu THEN
        RAISE EXCEPTION 'CE1 maths : % compétences CE1 attendues, obtenu %', v_attendu, v_ce1;
    END IF;

    -- 2b. classe_max de ces compétences reste >= CE2 (notion non rétrécie).
    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE matiere = 'MA' AND classe_min = 'CE1'
       AND code IN (
         'MA.NUM.LIRE_ECRIRE','MA.NUM.DECOMPOSER','MA.NUM.COMPARER','MA.NUM.SUITE',
         'MA.CM.COMPL_100_1000','MA.CM.SOMMES_DIFF','MA.CM.X10_X100',
         'MA.TABLES.2','MA.TABLES.3','MA.TABLES.4','MA.TABLES.5',
         'MA.POSE.ADDITION','MA.POSE.SOUSTRACTION',
         'MA.PB.ADD_SUB','MA.PB.MULT_DIV','MA.PB.DEUX_ETAPES','MA.PB.MONNAIE','MA.PB.MESURES',
         'MA.MES.LONGUEURS','MA.MES.MASSES_CONTENANCES','MA.MES.HEURE','MA.MES.DUREES',
         'MA.FRAC.SIMPLES')
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) < 2; -- < CE2
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'CE1 maths : classe_max < CE2 pour %', bad;
    END IF;

    -- 2c. NON-débordement : les notions NON CE1 restent classe_min='CE2'/au-delà.
    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE matiere = 'MA' AND classe_min = 'CE1'
       AND code IN ('MA.POSE.MULTIPLICATION','MA.POSE.DIVISION','MA.CM.DIV_RESTE',
                    'MA.TABLES.6','MA.TABLES.7','MA.TABLES.8','MA.TABLES.9');
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'CE1 maths : notion hors programme CE1 ouverte à tort : %', bad;
    END IF;

    -- 2d. Total des compétences maths CE1 = 23 (incrément) + 4 (0066) = 27.
    SELECT count(*) INTO v_total_ce1 FROM public.competences
     WHERE matiere = 'MA' AND classe_min = 'CE1';
    IF v_total_ce1 <> 27 THEN
        RAISE EXCEPTION 'CE1 maths : 27 compétences CE1 au total attendues, obtenu %', v_total_ce1;
    END IF;
END $do$;

-- =========================================================================
-- 3. Enregistrement de la migration.
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0114_ce1_socle_maths')
ON CONFLICT (version) DO NOTHING;
