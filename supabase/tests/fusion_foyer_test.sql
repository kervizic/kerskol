-- fusion_foyer_test.sql
-- Migration 0021 : cas c du rattachement = FUSION (au lieu de suppression).
-- Couvre : fusion 1 profil (reponses/seances deplacees, progression recalculee,
-- niveau_max preserve = max des deux, monnaie additionnee, reglages ENFANT pris
-- de la source, reglages PARENT gardes de la cible), fusion multi-profils (choix
-- de la source, les autres supprimes), ABSENCE de reauth, idempotence, et
-- supprimer_foyer (mot « SUPPRIMER » + reauth).
-- Tout en transaction ROLLBACK. Execution : deploy/test-db.sh.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;

-- --------------------------------------------------------------------------
-- Comptes. uMp = parent demandeur (foyer FM). uS = compte source (SEUL parent de
-- FS, 1 profil). uS2 = compte source (SEUL parent de FS2, 2 profils).
-- --------------------------------------------------------------------------
\set uMp 'd0000000-0000-0000-0000-0000000000a1'
\set uS  'd0000000-0000-0000-0000-0000000000a2'
\set uS2 'd0000000-0000-0000-0000-0000000000a3'
\set uDel 'd0000000-0000-0000-0000-0000000000a4'

INSERT INTO auth.users (id, email, created_at, email_confirmed_at) VALUES
    (:'uMp', 'fm@example.test',  now(), now()),
    (:'uS',  'src@example.test', now(), now()),
    (:'uS2', 'src2@example.test',now(), now()),
    (:'uDel','del@example.test', now(), now());

\set FM  'f0000000-0000-0000-0000-0000000000a1'
\set FS  'f0000000-0000-0000-0000-0000000000a2'
\set FS2 'f0000000-0000-0000-0000-0000000000a3'
\set FDel 'f0000000-0000-0000-0000-0000000000a4'
INSERT INTO foyers (id) VALUES (:'FM'), (:'FS'), (:'FS2'), (:'FDel');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    (:'FM', :'uMp'),
    (:'FS', :'uS'),     -- uS : SEUL membre (cas c)
    (:'FS2', :'uS2'),   -- uS2 : SEUL membre (cas c)
    (:'FDel', :'uDel');

-- Profils cibles dans le foyer demandeur FM (reglages PARENT a conserver).
\set pt  'c0000000-0000-0000-0000-0000000000a1'
\set pt2 'c0000000-0000-0000-0000-0000000000a2'
INSERT INTO profils (id, foyer_id, surnom, classe, matieres_actives, limite_jour_min, univers) VALUES
    (:'pt',  :'FM', 'Cible',  'CM1', '{MA}'::text[], 30, 'village_breton'),
    (:'pt2', :'FM', 'Cible2', 'CE1', '{MA}'::text[], 45, 'village_breton');

-- Profil source (FS) : reglages ENFANT a reprendre (avatar+couleur, univers).
\set ps 'c0000000-0000-0000-0000-0000000000b1'
INSERT INTO profils (id, foyer_id, surnom, classe, matieres_actives, avatar, univers) VALUES
    (:'ps', :'FS', 'Source', 'CP', '{MA}'::text[],
     '{"style":"adventurer","couleur":"#D53F8C"}'::jsonb, 'ile_tropicale');

-- Profils de FS2 (fusion multi : l'enfant choisit).
\set ps2a 'c0000000-0000-0000-0000-0000000000b2'
\set ps2b 'c0000000-0000-0000-0000-0000000000b3'
INSERT INTO profils (id, foyer_id, surnom, matieres_actives, univers) VALUES
    (:'ps2a', :'FS2', 'Alpha', '{MA}'::text[], 'base_spatiale'),
    (:'ps2b', :'FS2', 'Beta',  '{MA}'::text[], 'village_breton');

-- --------------------------------------------------------------------------
-- Donnees de jeu (inserees en proprietaire : triggers progression + monnaie).
-- Cible pt : 2 bonnes reponses ADDITION -> monnaie 4. On force ensuite un
-- niveau_max ADDITION = 3 (doit etre preserve apres recalcul).
-- --------------------------------------------------------------------------
INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le) VALUES
    (gen_random_uuid(), :'pt', 'MA.CM.ADDITION', 1, true, 3000, timestamptz '2026-01-01 10:00'),
    (gen_random_uuid(), :'pt', 'MA.CM.ADDITION', 1, true, 3000, timestamptz '2026-01-01 10:01');
UPDATE progression SET niveau_max_atteint = 3 WHERE profil_id = :'pt' AND competence = 'MA.CM.ADDITION';

-- Source ps : une seance + 3 bonnes reponses DOUBLES -> monnaie 6. niveau_max
-- DOUBLES force a 4 (doit etre preserve = max des deux).
\set sess 'e0000000-0000-0000-0000-0000000000b1'
INSERT INTO seances (id, profil_id, debut, fin, duree_s, monnaie_gagnee)
VALUES (:'sess', :'ps', now(), now(), 120, 6);
INSERT INTO reponses (id, profil_id, seance_id, competence, niveau, correct, temps_ms, repondu_le) VALUES
    (gen_random_uuid(), :'ps', :'sess', 'MA.CM.DOUBLES', 1, true, 3000, timestamptz '2026-01-02 10:00'),
    (gen_random_uuid(), :'ps', :'sess', 'MA.CM.DOUBLES', 1, true, 3000, timestamptz '2026-01-02 10:01'),
    (gen_random_uuid(), :'ps', :'sess', 'MA.CM.DOUBLES', 1, true, 3000, timestamptz '2026-01-02 10:02');
UPDATE progression SET niveau_max_atteint = 4 WHERE profil_id = :'ps' AND competence = 'MA.CM.DOUBLES';

-- Une reponse pour ps2a (fusion multi) : doit suivre vers pt2.
INSERT INTO reponses (id, profil_id, competence, niveau, correct, temps_ms, repondu_le) VALUES
    (gen_random_uuid(), :'ps2a', 'MA.CM.ADDITION', 1, true, 3000, timestamptz '2026-01-03 10:00');

-- Etat initial (avant fusion) pour les assertions avant/apres.
SELECT monnaie FROM profils WHERE id = :'pt'  \gset pt_monnaie_
SELECT monnaie FROM profils WHERE id = :'ps'  \gset ps_monnaie_

-- Isolation : neutralise tout lien reel preexistant (restaure par ROLLBACK).
DELETE FROM liens_enfant_en_attente;

\set claimsM  '{"sub":"d0000000-0000-0000-0000-0000000000a1","role":"authenticated"}'
\set claimsS  '{"sub":"d0000000-0000-0000-0000-0000000000a2","role":"authenticated"}'
\set claimsS2 '{"sub":"d0000000-0000-0000-0000-0000000000a3","role":"authenticated"}'
\set claimsDel '{"sub":"d0000000-0000-0000-0000-0000000000a4","role":"authenticated"}'

-- ===========================================================================
-- TEST 1 : FUSION 1 PROFIL. Le parent cree le lien pt -> src@. uS valide.
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsM';
SELECT public.demander_lien_enfant(:'pt', 'src@example.test') AS code_s \gset
RESET ROLE;

-- 1a : sans confirmer -> confirmation_fusion, 1 profil, AUCUNE reauth exigee.
SET ROLE authenticated;
SET request.jwt.claims = :'claimsS';
SELECT (public.valider_lien_enfant(:'code_s')) AS r1a \gset
RESET ROLE;
SELECT _rec('1a_confirmation_fusion', (:'r1a'::jsonb ->> 'etat') = 'confirmation_fusion', 'r = ' || :'r1a');
SELECT _rec('1b_nb_profils_1', (:'r1a'::jsonb ->> 'nb_profils') = '1', 'r = ' || :'r1a');
SELECT _rec('1c_source_listee', (:'r1a'::jsonb -> 'profils_source') @> '[{"surnom":"Source"}]'::jsonb, 'r = ' || :'r1a');

-- 1d : confirmer (1 profil -> source auto, SANS p_source_profil ni reauth).
SET ROLE authenticated;
SET request.jwt.claims = :'claimsS';
SELECT (public.valider_lien_enfant(:'code_s', true)) AS r1d \gset
RESET ROLE;
SELECT _rec('1d_ok_relie', (:'r1d'::jsonb ->> 'ok') = 'true' AND (:'r1d'::jsonb ->> 'profil_id') = :'pt', 'r = ' || :'r1d');
SELECT _rec('1e_pt_relie_uS', (SELECT user_id FROM profils WHERE id = :'pt') = :'uS', 'user_id pt');
SELECT _rec('1f_fs_supprime', (SELECT count(*) FROM foyers WHERE id = :'FS') = 0, 'FS supprime');
SELECT _rec('1g_ps_supprime', (SELECT count(*) FROM profils WHERE id = :'ps') = 0, 'ps supprime');
SELECT _rec('1h_uS_plus_parent', (SELECT count(*) FROM membres_foyer WHERE user_id = :'uS') = 0, 'uS plus membre');

-- Reponses + seances deplacees vers la cible.
SELECT _rec('1i_reponses_deplacees',
    (SELECT count(*) FROM reponses WHERE profil_id = :'pt') = 5, 'reponses pt (2+3)');
SELECT _rec('1j_seance_deplacee',
    (SELECT profil_id FROM seances WHERE id = :'sess') = :'pt', 'seance -> pt');

-- Monnaie = somme des deux.
SELECT _rec('1k_monnaie_somme',
    (SELECT monnaie FROM profils WHERE id = :'pt') = (:'pt_monnaie_monnaie'::int + :'ps_monnaie_monnaie'::int),
    'monnaie pt = ' || (SELECT monnaie FROM profils WHERE id = :'pt'));

-- Reglages ENFANT repris de la source (avatar + couleur, univers).
SELECT _rec('1l_univers_source', (SELECT univers FROM profils WHERE id = :'pt') = 'ile_tropicale', 'univers pt');
SELECT _rec('1m_avatar_source', (SELECT avatar ->> 'couleur' FROM profils WHERE id = :'pt') = '#D53F8C', 'avatar pt');

-- Reglages PARENT conserves depuis la cible.
SELECT _rec('1n_surnom_cible', (SELECT surnom FROM profils WHERE id = :'pt') = 'Cible', 'surnom pt');
SELECT _rec('1o_classe_cible', (SELECT classe FROM profils WHERE id = :'pt') = 'CM1', 'classe pt');
SELECT _rec('1p_limite_cible', (SELECT limite_jour_min FROM profils WHERE id = :'pt') = 30, 'limite pt');

-- Progression recalculee : DOUBLES presente (reponses deplacees) + niveau_max
-- preserve = max des deux (ADDITION >= 3 cote cible, DOUBLES = 4 cote source).
SELECT _rec('1q_progression_doubles',
    (SELECT count(*) FROM progression WHERE profil_id = :'pt' AND competence = 'MA.CM.DOUBLES') = 1, 'prog DOUBLES');
SELECT _rec('1r_nmax_addition_preserve',
    (SELECT niveau_max_atteint FROM progression WHERE profil_id = :'pt' AND competence = 'MA.CM.ADDITION') >= 3,
    'nmax ADDITION = ' || (SELECT niveau_max_atteint FROM progression WHERE profil_id = :'pt' AND competence = 'MA.CM.ADDITION'));
SELECT _rec('1s_nmax_doubles_preserve',
    (SELECT niveau_max_atteint FROM progression WHERE profil_id = :'pt' AND competence = 'MA.CM.DOUBLES') = 4,
    'nmax DOUBLES = ' || (SELECT niveau_max_atteint FROM progression WHERE profil_id = :'pt' AND competence = 'MA.CM.DOUBLES'));

-- Journal « relie, progression fusionnee » dans le foyer CIBLE (FM).
SELECT _rec('1t_journal_fusion',
    (SELECT count(*) FROM journal_reglages WHERE foyer_id = :'FM' AND profil_id = :'pt'
       AND nouvelle = to_jsonb('relie, progression fusionnee'::text)) = 1, 'journal fusion');

-- 1u : idempotence -> relancer la validation (lien consomme, deja relie) renvoie ok.
SET ROLE authenticated;
SET request.jwt.claims = :'claimsS';
SELECT (public.valider_lien_enfant(:'code_s', true)) AS r1u \gset
RESET ROLE;
SELECT _rec('1u_idempotent', (:'r1u'::jsonb ->> 'ok') = 'true' AND (:'r1u'::jsonb ->> 'profil_id') = :'pt', 'r = ' || :'r1u');

-- ===========================================================================
-- TEST 2 : FUSION MULTI-PROFILS. FS2 a 2 profils -> l'enfant choisit la source.
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsM';
SELECT public.demander_lien_enfant(:'pt2', 'src2@example.test') AS code_s2 \gset
RESET ROLE;

-- 2a : sans confirmer -> confirmation_fusion, 2 profils listes.
SET ROLE authenticated;
SET request.jwt.claims = :'claimsS2';
SELECT (public.valider_lien_enfant(:'code_s2')) AS r2a \gset
RESET ROLE;
SELECT _rec('2a_confirmation_fusion', (:'r2a'::jsonb ->> 'etat') = 'confirmation_fusion', 'r = ' || :'r2a');
SELECT _rec('2b_nb_profils_2', (:'r2a'::jsonb ->> 'nb_profils') = '2', 'r = ' || :'r2a');
SELECT _rec('2c_profils_listes',
    (:'r2a'::jsonb -> 'profils_source') @> '[{"surnom":"Alpha"},{"surnom":"Beta"}]'::jsonb, 'r = ' || :'r2a');

-- 2d : confirmer SANS choisir -> redemande le choix (FS2 intact).
SET ROLE authenticated;
SET request.jwt.claims = :'claimsS2';
SELECT (public.valider_lien_enfant(:'code_s2', true)) AS r2d \gset
RESET ROLE;
SELECT _rec('2d_choix_requis', (:'r2d'::jsonb ->> 'etat') = 'confirmation_fusion', 'r = ' || :'r2d');
SELECT _rec('2e_fs2_intact', (SELECT count(*) FROM foyers WHERE id = :'FS2') = 1, 'FS2 existe');

-- 2f : confirmer AVEC choix de Alpha (ps2a) -> fusion, Beta (ps2b) supprime.
SET ROLE authenticated;
SET request.jwt.claims = :'claimsS2';
SELECT (public.valider_lien_enfant(:'code_s2', true, :'ps2a')) AS r2f \gset
RESET ROLE;
SELECT _rec('2f_ok_relie', (:'r2f'::jsonb ->> 'ok') = 'true' AND (:'r2f'::jsonb ->> 'profil_id') = :'pt2', 'r = ' || :'r2f');
SELECT _rec('2g_pt2_relie', (SELECT user_id FROM profils WHERE id = :'pt2') = :'uS2', 'user_id pt2');
SELECT _rec('2h_univers_alpha', (SELECT univers FROM profils WHERE id = :'pt2') = 'base_spatiale', 'univers pt2');
SELECT _rec('2i_reponse_alpha_deplacee',
    (SELECT count(*) FROM reponses WHERE profil_id = :'pt2') = 1, 'reponse pt2');
SELECT _rec('2j_fs2_supprime', (SELECT count(*) FROM foyers WHERE id = :'FS2') = 0, 'FS2 supprime');
SELECT _rec('2k_profils_fs2_supprimes',
    (SELECT count(*) FROM profils WHERE id IN (:'ps2a', :'ps2b')) = 0, 'Alpha+Beta supprimes');

-- ===========================================================================
-- TEST 3 : supprimer_foyer -> exige le mot « SUPPRIMER » + reauth recente.
-- ===========================================================================
-- 3a : sans le mot -> confirmation_requise (foyer intact).
SET ROLE authenticated;
SET request.jwt.claims = :'claimsDel';
DO $$
BEGIN
    PERFORM public.supprimer_foyer('f0000000-0000-0000-0000-0000000000a4');
    PERFORM _rec('3a_mot_requis', false, 'suppression acceptee a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('3a_mot_requis', SQLERRM LIKE '%confirmation_requise%', 'err = ' || SQLERRM);
END $$;
RESET ROLE;
SELECT _rec('3b_foyer_intact', (SELECT count(*) FROM foyers WHERE id = :'FDel') = 1, 'FDel existe');

-- 3c : bon mot mais SANS reauth recente -> reauth_requise (foyer intact).
SET ROLE authenticated;
SET request.jwt.claims = :'claimsDel';
DO $$
BEGIN
    PERFORM public.supprimer_foyer('f0000000-0000-0000-0000-0000000000a4', 'SUPPRIMER');
    PERFORM _rec('3c_reauth_requise', false, 'suppression acceptee a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('3c_reauth_requise', SQLERRM LIKE '%reauth_requise%', 'err = ' || SQLERRM);
END $$;
RESET ROLE;
SELECT _rec('3d_foyer_intact', (SELECT count(*) FROM foyers WHERE id = :'FDel') = 1, 'FDel existe');

-- 3e : bon mot + reauth recente -> suppression effective.
SELECT jsonb_build_object('sub', :'uDel', 'role', 'authenticated', 'amr',
    jsonb_build_array(jsonb_build_object('method','oauth','timestamp',(extract(epoch from now())::bigint))))::text AS del_recent \gset
SET ROLE authenticated;
SET request.jwt.claims = :'del_recent';
SELECT public.supprimer_foyer(:'FDel', 'SUPPRIMER');
RESET ROLE;
SELECT _rec('3e_foyer_supprime', (SELECT count(*) FROM foyers WHERE id = :'FDel') = 0, 'FDel supprime');

-- ===========================================================================
-- Rapport
-- ===========================================================================
SELECT id, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS resultat, nom, detail
  FROM _res ORDER BY id;

DO $$
DECLARE v_fail int;
BEGIN
    SELECT count(*) INTO v_fail FROM _res WHERE NOT ok;
    RAISE NOTICE '=== % test(s) en echec sur % ===', v_fail, (SELECT count(*) FROM _res);
    IF v_fail > 0 THEN
        RAISE EXCEPTION 'TESTS EN ECHEC : %', v_fail;
    END IF;
END $$;

ROLLBACK;
