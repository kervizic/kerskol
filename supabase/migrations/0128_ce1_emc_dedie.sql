-- 0128_ce1_emc_dedie.sql
-- LOT CE1 (incrément 17) - EMC (programme 2024) : 2 attendus CE1 absents au CE1.
-- 0118/0120 ont ouvert au CE1 le respect, les émotions, les symboles de la
-- République et les écrans. Restaient, seulement au CM1 (EMC.COOPERATION,
-- EMC.EGALITE), deux notions pourtant attendues DÈS le CE1 (« respecter autrui,
-- coopérer » ; « l'égalité filles-garçons »). On ajoute donc 2 compétences CE1
-- DÉDIÉES ([CE1,CE1]), domaine respect (actif au CE1) :
--   EMC.CE1_ENTRAIDE  s'entraider et coopérer en classe ;
--   EMC.CE1_EGALITE   filles et garçons, les mêmes droits.
--
-- Moteur RÉUTILISÉ (aucune UI) : banque qm_item (partagée QM/EMC) + juge
-- verif_qm par cle (op 'qm', SERVEUR SEUL JUGE) ; exercices type 'emc'. Miroir
-- EXACT de emc/respect.ts. 8 items par compétence (2 par niveau). Test croisé
-- emc_test.sql (golden = nb EMC x 8) + emc.test.ts (24 compétences, 192 items).
--
-- SÛRETÉ CE2 (Iris) : [CE1,CE1] -> gate estSousNiveau ; ne reviennent qu'en
-- RÉVISION comme prérequis de remédiation de compétences liées CE1-visibles
-- (EMC.RESPECT.REGLES, EMC.RESPECT.DIFFERENCES, toutes deux [CE1,CE2]). Garde-fou
-- générique (incrément 12). Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Compétences CE1 dédiées + prérequis de remédiation.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('EMC.CE1_ENTRAIDE', 'EMC', 'respect', 'S''entraider et coopérer',       905, 4, 'CE1', 'CE1', true),
    ('EMC.CE1_EGALITE',  'EMC', 'respect', 'Filles et garçons, l''égalité',  906, 4, 'CE1', 'CE1', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('EMC.RESPECT.REGLES',      'EMC.CE1_ENTRAIDE', 2),
    ('EMC.RESPECT.DIFFERENCES', 'EMC.CE1_EGALITE',  2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 2. Items de référence (miroir EXACT de emc/respect.ts).
-- =========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    ('emc-res-ce1ent-n1-a', 'EMC.CE1_ENTRAIDE', 1, 'qcm',   'je l''aide à les ramasser'),
    ('emc-res-ce1ent-n1-b', 'EMC.CE1_ENTRAIDE', 1, 'qcm',   'ranger ensemble'),
    ('emc-res-ce1ent-n2-a', 'EMC.CE1_ENTRAIDE', 2, 'qcm',   'l''inviter à jouer'),
    ('emc-res-ce1ent-n2-b', 'EMC.CE1_ENTRAIDE', 2, 'qcm',   'j''aide quand même le groupe'),
    ('emc-res-ce1ent-n3-a', 'EMC.CE1_ENTRAIDE', 3, 'qcm',   'se partager le travail'),
    ('emc-res-ce1ent-n3-b', 'EMC.CE1_ENTRAIDE', 3, 'qcm',   'lui expliquer gentiment'),
    ('emc-res-ce1ent-n4-a', 'EMC.CE1_ENTRAIDE', 4, 'texte', 'entraider'),
    ('emc-res-ce1ent-n4-b', 'EMC.CE1_ENTRAIDE', 4, 'texte', 'service'),
    ('emc-res-ce1ega-n1-a', 'EMC.CE1_EGALITE', 1, 'qcm',   'les filles et les garçons'),
    ('emc-res-ce1ega-n1-b', 'EMC.CE1_EGALITE', 1, 'qcm',   'les filles et les garçons'),
    ('emc-res-ce1ega-n2-a', 'EMC.CE1_EGALITE', 2, 'qcm',   'tout à fait normal'),
    ('emc-res-ce1ega-n2-b', 'EMC.CE1_EGALITE', 2, 'qcm',   'une fille ou un garçon'),
    ('emc-res-ce1ega-n3-a', 'EMC.CE1_EGALITE', 3, 'qcm',   'les couleurs sont pour tout le monde'),
    ('emc-res-ce1ega-n3-b', 'EMC.CE1_EGALITE', 3, 'qcm',   'la même récompense'),
    ('emc-res-ce1ega-n4-a', 'EMC.CE1_EGALITE', 4, 'texte', 'droits'),
    ('emc-res-ce1ega-n4-b', 'EMC.CE1_EGALITE', 4, 'qcm',   'égalité')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de référence (type 'emc', id déterministe).
-- =========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['EMC.CE1_ENTRAIDE','EMC.CE1_EGALITE'] LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':emc')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'emc', v_niv, 'vivre_ensemble', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Garde-fous : 8 items par compétence, couverture N1..N4, portée [CE1,CE1],
--    prérequis de remédiation présents.
-- =========================================================================
DO $gf$
DECLARE n integer; v_comp text; v_niv integer;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['EMC.CE1_ENTRAIDE','EMC.CE1_EGALITE'] LOOP
        SELECT count(*) INTO n FROM public.qm_item WHERE competence = v_comp;
        IF n <> 8 THEN RAISE EXCEPTION '% : 8 items attendus, obtenu %', v_comp, n; END IF;
        FOR v_niv IN 1..4 LOOP
            IF (SELECT count(*) FROM public.qm_item WHERE competence = v_comp AND niveau = v_niv) <> 2 THEN
                RAISE EXCEPTION '% : 2 items attendus au niveau %', v_comp, v_niv;
            END IF;
        END LOOP;
        IF NOT EXISTS (SELECT 1 FROM public.competences
                        WHERE code = v_comp AND classe_min = 'CE1' AND classe_max = 'CE1') THEN
            RAISE EXCEPTION '% : portée [CE1,CE1] attendue', v_comp;
        END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.competence_prerequis
     WHERE (competence,prerequis) IN (
        ('EMC.RESPECT.REGLES','EMC.CE1_ENTRAIDE'),
        ('EMC.RESPECT.DIFFERENCES','EMC.CE1_EGALITE'));
    IF n <> 2 THEN RAISE EXCEPTION 'prérequis de remédiation : 2 attendus, obtenu %', n; END IF;
END $gf$;

-- =========================================================================
-- 5. Enregistrement de la migration.
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0128_ce1_emc_dedie')
ON CONFLICT (version) DO NOTHING;
