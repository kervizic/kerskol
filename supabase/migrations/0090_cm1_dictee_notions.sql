-- 0090_cm1_dictee_notions.sql
-- LOT 3 (CM1) - FRANCAIS / DICTEE DETECTIVE : notions CM1 branchees sur les
-- lots 1-2 (conjugaison passe simple / imperatif ; accords sujet-verbe et
-- participe passe avec etre). Textes ORIGINAUX, bienveillants, univers « a la
-- maison », vocabulaire CM1, phrases courtes. Un seul mot piege par texte.
--
-- Quatre nouvelles notions / types d'erreur :
--   accord_sv       accord sujet-verbe quand le sujet est eloigne ou inverse ;
--   participe_passe accord du participe passe avec etre ;
--   passe_simple    passe simple au lieu de l'imparfait dans un recit ;
--   imperatif       imperatif (le « tu » des verbes en -er sans s).
--
-- Le moteur (verif_dictee, selection, injection d'erreurs) est GENERIQUE : il
-- calcule le type_dominant a partir des types plantes, sans logique par type.
-- Cote client, dictee.ts (TypeDictee) + diagnostic/dictee.ts (MESSAGES_DICTEE)
-- portent les astuces des 4 nouvelles notions. Le SERVEUR reste seul juge.
--
-- Migration ADDITIVE et IDEMPOTENTE. Domaine dictee deja actif ; aucun
-- changement de domaines_actifs / DEFAULT.

-- =========================================================================
-- 1. Etend les contraintes de type (erreur) et de notion (texte).
-- =========================================================================
ALTER TABLE public.dictee_erreur DROP CONSTRAINT IF EXISTS dictee_erreur_type_chk;
ALTER TABLE public.dictee_erreur ADD  CONSTRAINT dictee_erreur_type_chk
    CHECK (type IN (
        'a_a','et_est','son_sont','on_ont','ces_ses','ce_se',
        'pluriel','pluriel_al_aux','accord','verbe_ent','m_mbp','e_er_ez',
        'la_la','ou_ou',
        'accord_sv','participe_passe','passe_simple','imperatif'));

ALTER TABLE public.dictee_texte DROP CONSTRAINT IF EXISTS dictee_texte_notion_chk;
ALTER TABLE public.dictee_texte ADD  CONSTRAINT dictee_texte_notion_chk
    CHECK (notion IS NULL OR notion IN (
        'a_a','et_est','son_sont','on_ont','ces_ses','ce_se',
        'pluriel','pluriel_al_aux','accord','verbe_ent','m_mbp','e_er_ez',
        'revision','la_la','ou_ou',
        'accord_sv','participe_passe','passe_simple','imperatif'));

-- =========================================================================
-- 2. Nouvelles notions (ordre 15-18). Les prerequis pointent sur des notions
--    pedagogiquement proches (deja ordonnees). Aucun verrou temporel.
-- =========================================================================
INSERT INTO public.dictee_notion (code, ordre, prerequis, libelle) VALUES
    ('accord_sv',       15, 'verbe_ent', 'Accord sujet-verbe (sujet éloigné ou inversé)'),
    ('participe_passe', 16, 'accord',    'Accord du participe passé avec être'),
    ('passe_simple',    17, 'e_er_ez',   'Le passé simple dans un récit'),
    ('imperatif',       18, 'verbe_ent', 'L''impératif (pas de s avec tu)')
ON CONFLICT (code) DO UPDATE SET ordre = EXCLUDED.ordre,
    prerequis = EXCLUDED.prerequis, libelle = EXCLUDED.libelle;

-- =========================================================================
-- 3. Textes (ids 301-312 ; 3 par notion, niveaux 2-4). Positions calculees par
--    _dictee_add a partir du mot fautif ; exception si mot absent ou si la
--    correction egale la faute.
-- =========================================================================
-- accord_sv : le verbe s'accorde avec son sujet (eloigne ou inverse).
SELECT public._dictee_add(301, 2, 'accord_sv', 'maison',
    'Les chats de la maison dort sur le canapé.',
    '[{"mot":"dort","cor":"dorment","type":"accord_sv"}]'::jsonb);
SELECT public._dictee_add(302, 3, 'accord_sv', 'jardin',
    'Le matin, chante les oiseaux du jardin.',
    '[{"mot":"chante","cor":"chantent","type":"accord_sv"}]'::jsonb);
SELECT public._dictee_add(303, 4, 'accord_sv', 'maison',
    'Les amis de mon frère arrive ce soir à la maison.',
    '[{"mot":"arrive","cor":"arrivent","type":"accord_sv"}]'::jsonb);
-- participe_passe : accord du participe passe avec etre.
SELECT public._dictee_add(304, 2, 'participe_passe', 'maison',
    'Maman est parti au marché ce matin.',
    '[{"mot":"parti","cor":"partie","type":"participe_passe"}]'::jsonb);
SELECT public._dictee_add(305, 3, 'participe_passe', 'maison',
    'Mes sœurs sont venu à la maison hier.',
    '[{"mot":"venu","cor":"venues","type":"participe_passe"}]'::jsonb);
SELECT public._dictee_add(306, 4, 'participe_passe', 'ecole',
    'Les enfants sont rentré de l''école très contents.',
    '[{"mot":"rentré","cor":"rentrés","type":"participe_passe"}]'::jsonb);
-- passe_simple : le passe simple (et non l'imparfait) dans un recit.
SELECT public._dictee_add(307, 2, 'passe_simple', 'maison',
    'Il y a longtemps, le chat sautait sur la table et attrapa la souris.',
    '[{"mot":"sautait","cor":"sauta","type":"passe_simple"}]'::jsonb);
SELECT public._dictee_add(308, 3, 'passe_simple', 'maison',
    'Ce soir-là, papa rentrait à la maison et alluma la lampe.',
    '[{"mot":"rentrait","cor":"rentra","type":"passe_simple"}]'::jsonb);
SELECT public._dictee_add(309, 4, 'passe_simple', 'jardin',
    'Soudain, le vent soufflait très fort et la porte claqua.',
    '[{"mot":"soufflait","cor":"souffla","type":"passe_simple"}]'::jsonb);
-- imperatif : l'imperatif, le « tu » des verbes en -er sans s.
SELECT public._dictee_add(310, 2, 'imperatif', 'maison',
    'Range ta chambre et fermes la porte, s''il te plaît.',
    '[{"mot":"fermes","cor":"ferme","type":"imperatif"}]'::jsonb);
SELECT public._dictee_add(311, 3, 'imperatif', 'maison',
    'Mange ta soupe, puis brosses tes dents avant de dormir.',
    '[{"mot":"brosses","cor":"brosse","type":"imperatif"}]'::jsonb);
SELECT public._dictee_add(312, 4, 'imperatif', 'maison',
    'Avant de dormir, prends ton livre et ranges tes jouets.',
    '[{"mot":"ranges","cor":"range","type":"imperatif"}]'::jsonb);

-- =========================================================================
-- 4. Garde-fou : 18 notions, chacune >= 2 textes, 4 nouveaux types plantes.
-- =========================================================================
DO $do$
DECLARE n integer; v_code text;
BEGIN
    SELECT count(*) INTO n FROM public.dictee_notion;
    IF n <> 18 THEN RAISE EXCEPTION 'dictee_notion : 18 attendues, obtenu %', n; END IF;
    FOREACH v_code IN ARRAY ARRAY['accord_sv','participe_passe','passe_simple','imperatif'] LOOP
        SELECT count(*) INTO n FROM public.dictee_texte WHERE notion = v_code;
        IF n < 2 THEN RAISE EXCEPTION 'dictee : notion % a % texte(s) (>= 2 attendus)', v_code, n; END IF;
        SELECT count(*) INTO n FROM public.dictee_erreur WHERE type = v_code;
        IF n < 1 THEN RAISE EXCEPTION 'dictee : aucun exemple du type %', v_code; END IF;
    END LOOP;
END $do$;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0090_cm1_dictee_notions')
ON CONFLICT (version) DO NOTHING;
