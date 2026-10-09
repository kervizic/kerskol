-- 0127_ce1_qm_dedie.sql
-- LOT CE1 (incrément 16) - QUESTIONNER LE MONDE : 2 notions CE1 des attendus en
-- vigueur non encore couvertes par une compétence dédiée (0117 avait ouvert au
-- CE1 les 16 compétences QM partagées : cycles de vie, calendrier, jour/nuit,
-- plans et maquettes, etc. — déjà jouables au CE1). On ajoute ici 2 compétences
-- CE1 DÉDIÉES ([CE1,CE1]) qui complètent le programme :
--   QM.TEMPS.CE1_SAISONS   les 4 saisons de l'année ;
--   QM.ESPACE.CE1_DEPLACER se repérer et se déplacer (devant/derrière,
--                          gauche/droite, itinéraire, lire un plan simple).
--
-- Moteur RÉUTILISÉ (aucune UI) : banque qm_item + juge verif_qm par cle (op
-- 'qm', SERVEUR SEUL JUGE) ; miroir EXACT de qm/temps.ts + qm/espace.ts. 8 items
-- par compétence (2 par niveau). Test croisé qm_test.sql (golden = nb QM x 8) +
-- qm.test.ts (26 compétences, 208 items).
--
-- SÛRETÉ CE2 (Iris) : [CE1,CE1] -> gate estSousNiveau ; ne reviennent qu'en
-- RÉVISION comme prérequis de remédiation des compétences liées (QM.TEMPS.
-- CALENDRIER, QM.ESPACE.SEREPERER, toutes deux [CE1,CE2]). Garde-fou générique
-- (incrément 12). Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Compétences CE1 dédiées + prérequis de remédiation.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, classe_min, classe_max, actif) VALUES
    ('QM.TEMPS.CE1_SAISONS',   'QM', 'temps',  'Les saisons',                 865, 4, 'CE1', 'CE1', true),
    ('QM.ESPACE.CE1_DEPLACER', 'QM', 'espace', 'Se repérer et se déplacer',   866, 4, 'CE1', 'CE1', true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux,
    classe_min=EXCLUDED.classe_min, classe_max=EXCLUDED.classe_max, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('QM.TEMPS.CALENDRIER',  'QM.TEMPS.CE1_SAISONS',   2),
    ('QM.ESPACE.SEREPERER',  'QM.ESPACE.CE1_DEPLACER', 2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 2. Items de référence (miroir EXACT de qm/temps.ts + qm/espace.ts).
-- =========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    ('qm-tps-ce1sais-n1-a', 'QM.TEMPS.CE1_SAISONS', 1, 'qcm',   '4'),
    ('qm-tps-ce1sais-n1-b', 'QM.TEMPS.CE1_SAISONS', 1, 'qcm',   'l''hiver'),
    ('qm-tps-ce1sais-n2-a', 'QM.TEMPS.CE1_SAISONS', 2, 'qcm',   'l''été'),
    ('qm-tps-ce1sais-n2-b', 'QM.TEMPS.CE1_SAISONS', 2, 'qcm',   'l''automne'),
    ('qm-tps-ce1sais-n3-a', 'QM.TEMPS.CE1_SAISONS', 3, 'qcm',   'le printemps'),
    ('qm-tps-ce1sais-n3-b', 'QM.TEMPS.CE1_SAISONS', 3, 'qcm',   'l''automne'),
    ('qm-tps-ce1sais-n4-a', 'QM.TEMPS.CE1_SAISONS', 4, 'texte', 'printemps'),
    ('qm-tps-ce1sais-n4-b', 'QM.TEMPS.CE1_SAISONS', 4, 'texte', 'hiver'),
    ('qm-esp-ce1dep-n1-a', 'QM.ESPACE.CE1_DEPLACER', 1, 'qcm',   'en dessous'),
    ('qm-esp-ce1dep-n1-b', 'QM.ESPACE.CE1_DEPLACER', 1, 'qcm',   'derrière moi'),
    ('qm-esp-ce1dep-n2-a', 'QM.ESPACE.CE1_DEPLACER', 2, 'qcm',   'un itinéraire'),
    ('qm-esp-ce1dep-n2-b', 'QM.ESPACE.CE1_DEPLACER', 2, 'qcm',   'la légende'),
    ('qm-esp-ce1dep-n3-a', 'QM.ESPACE.CE1_DEPLACER', 3, 'qcm',   'tout droit, à gauche, à droite'),
    ('qm-esp-ce1dep-n3-b', 'QM.ESPACE.CE1_DEPLACER', 3, 'qcm',   'par un rectangle'),
    ('qm-esp-ce1dep-n4-a', 'QM.ESPACE.CE1_DEPLACER', 4, 'texte', 'droite'),
    ('qm-esp-ce1dep-n4-b', 'QM.ESPACE.CE1_DEPLACER', 4, 'texte', 'plan')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de référence (type 'qm', id déterministe).
-- =========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['QM.TEMPS.CE1_SAISONS','QM.ESPACE.CE1_DEPLACER'] LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':qm')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'qm', v_niv, 'questionner_monde', true)
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
    FOREACH v_comp IN ARRAY ARRAY['QM.TEMPS.CE1_SAISONS','QM.ESPACE.CE1_DEPLACER'] LOOP
        SELECT count(*) INTO n FROM public.qm_item WHERE competence = v_comp;
        IF n <> 8 THEN RAISE EXCEPTION '% : 8 items attendus, obtenu %', v_comp, n; END IF;
        FOR v_niv IN 1..4 LOOP
            IF NOT EXISTS (SELECT 1 FROM public.qm_item WHERE competence = v_comp AND niveau = v_niv) THEN
                RAISE EXCEPTION '% : aucun item au niveau %', v_comp, v_niv;
            END IF;
        END LOOP;
        IF NOT EXISTS (SELECT 1 FROM public.competences
                        WHERE code = v_comp AND classe_min = 'CE1' AND classe_max = 'CE1') THEN
            RAISE EXCEPTION '% : portée [CE1,CE1] attendue', v_comp;
        END IF;
    END LOOP;
    SELECT count(*) INTO n FROM public.competence_prerequis
     WHERE (competence,prerequis) IN (
        ('QM.TEMPS.CALENDRIER','QM.TEMPS.CE1_SAISONS'),
        ('QM.ESPACE.SEREPERER','QM.ESPACE.CE1_DEPLACER'));
    IF n <> 2 THEN RAISE EXCEPTION 'prérequis de remédiation : 2 attendus, obtenu %', n; END IF;
END $gf$;

-- =========================================================================
-- 5. Enregistrement de la migration.
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0127_ce1_qm_dedie')
ON CONFLICT (version) DO NOTHING;
