-- rattachement_situations_test.sql
-- Rattachement UNIVERSEL par code (migration 0020). Couvre les 4 situations du
-- compte cible (a/b/c/d), le refus, les 5 essais, l'expiration, l'anti-
-- enumeration (reponses identiques) et l'absence de fuite d'info avant le bon
-- code. Entierement en transaction ROLLBACK. Execution : deploy/test-db.sh.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;

-- --------------------------------------------------------------------------
-- Comptes. uM = parent demandeur (foyer FM). Cibles : uA libre (a), uB deja
-- relie ailleurs (b), uC parent seul de FC (c), uD parent de FD PARTAGE (d),
-- uR refus, uX 5 essais, uEx expiration. uD2 = second parent de FD.
-- --------------------------------------------------------------------------
\set uM  'd0000000-0000-0000-0000-000000000001'
\set uA  'a0000000-0000-0000-0000-00000000000a'
\set uB  'a0000000-0000-0000-0000-00000000000b'
\set uPB 'a0000000-0000-0000-0000-0000000000b2'
\set uC  'a0000000-0000-0000-0000-00000000000c'
\set uD  'a0000000-0000-0000-0000-00000000000d'
\set uD2 'a0000000-0000-0000-0000-0000000000d2'
\set uR  'a0000000-0000-0000-0000-00000000000e'
\set uX  'a0000000-0000-0000-0000-00000000000f'
\set uEx 'a0000000-0000-0000-0000-000000000010'

INSERT INTO auth.users (id, email, created_at, email_confirmed_at) VALUES
    (:'uM',  'pm@example.test',  now(), now()),
    (:'uA',  'aa@example.test',  now(), now()),
    (:'uB',  'bb@example.test',  now(), now()),
    (:'uPB', 'pbp@example.test', now(), now()),
    (:'uC',  'cc@example.test',  now(), now()),
    (:'uD',  'dd@example.test',  now(), now()),
    (:'uD2', 'dd2@example.test', now(), now()),
    (:'uR',  'rr@example.test',  now(), now()),
    (:'uX',  'xx@example.test',  now(), now()),
    (:'uEx', 'ee@example.test',  now(), now());

\set FM 'f0000000-0000-0000-0000-0000000000f0'
\set FB 'f0000000-0000-0000-0000-0000000000fb'
\set FC 'f0000000-0000-0000-0000-0000000000fc'
\set FD 'f0000000-0000-0000-0000-0000000000fd'
INSERT INTO foyers (id) VALUES (:'FM'), (:'FB'), (:'FC'), (:'FD');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    (:'FM', :'uM'),
    (:'FB', :'uPB'),
    (:'FC', :'uC'),           -- uC : SEUL membre de FC
    (:'FD', :'uD'), (:'FD', :'uD2');  -- FD : PARTAGE (deux parents)

-- Profils vises dans le foyer demandeur FM (un par scenario).
\set pa  'c0000000-0000-0000-0000-00000000000a'
\set pb  'c0000000-0000-0000-0000-00000000000b'
\set pc  'c0000000-0000-0000-0000-00000000000c'
\set pd  'c0000000-0000-0000-0000-00000000000d'
\set pr  'c0000000-0000-0000-0000-00000000000e'
\set px  'c0000000-0000-0000-0000-00000000000f'
\set pex 'c0000000-0000-0000-0000-000000000011'
INSERT INTO profils (id, foyer_id, surnom, matieres_actives) VALUES
    (:'pa',  :'FM', 'Aya',  '{MA}'::text[]),
    (:'pb',  :'FM', 'Bo',   '{MA}'::text[]),
    (:'pc',  :'FM', 'Cal',  '{MA}'::text[]),
    (:'pd',  :'FM', 'Dao',  '{MA}'::text[]),
    (:'pr',  :'FM', 'Rea',  '{MA}'::text[]),
    (:'px',  :'FM', 'Xan',  '{MA}'::text[]),
    (:'pex', :'FM', 'Eli',  '{MA}'::text[]);

-- Profil deja relie a uB dans FB (situation b) + profils de FC (situation c).
\set pold 'c0000000-0000-0000-0000-0000000000b0'
\set pc1  'c0000000-0000-0000-0000-0000000000c1'
\set pc2  'c0000000-0000-0000-0000-0000000000c2'
INSERT INTO profils (id, foyer_id, surnom, matieres_actives, user_id) VALUES
    (:'pold', :'FB', 'Ancien', '{MA}'::text[], :'uB');
INSERT INTO profils (id, foyer_id, surnom, matieres_actives) VALUES
    (:'pc1', :'FC', 'Cfille', '{MA}'::text[]),
    (:'pc2', :'FC', 'Cgars',  '{MA}'::text[]);

-- Isolation : neutralise tout lien reel preexistant (restaure par ROLLBACK).
DELETE FROM liens_enfant_en_attente;

\set claimsM '{"sub":"d0000000-0000-0000-0000-000000000001","role":"authenticated"}'
\set claimsA '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}'
\set claimsB '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}'
\set claimsC '{"sub":"a0000000-0000-0000-0000-00000000000c","role":"authenticated"}'
\set claimsD '{"sub":"a0000000-0000-0000-0000-00000000000d","role":"authenticated"}'
\set claimsR '{"sub":"a0000000-0000-0000-0000-00000000000e","role":"authenticated"}'
\set claimsX '{"sub":"a0000000-0000-0000-0000-00000000000f","role":"authenticated"}'
\set claimsEx '{"sub":"a0000000-0000-0000-0000-000000000010","role":"authenticated"}'

-- ===========================================================================
-- TEST 1 : ANTI-ENUMERATION. Le parent cree des liens vers 4 comptes de statuts
--          differents (libre, relie ailleurs, parent, parent partage) : TOUS
--          renvoient un code a 3 chiffres (reponse identique, aucune exception).
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsM';
SELECT public.demander_lien_enfant(:'pa', 'aa@example.test') AS code_a \gset
SELECT public.demander_lien_enfant(:'pb', 'bb@example.test') AS code_b \gset
SELECT public.demander_lien_enfant(:'pc', 'cc@example.test') AS code_c \gset
SELECT public.demander_lien_enfant(:'pd', 'dd@example.test') AS code_d \gset
SELECT public.demander_lien_enfant(:'pr', 'rr@example.test') AS code_r \gset
SELECT public.demander_lien_enfant(:'px', 'xx@example.test') AS code_x \gset
SELECT public.demander_lien_enfant(:'pex','ee@example.test') AS code_e \gset
RESET ROLE;

SELECT _rec('1a_libre_code',          :'code_a' ~ '^[0-9]{3}$', 'code = ' || :'code_a');
SELECT _rec('1b_relie_ailleurs_code', :'code_b' ~ '^[0-9]{3}$', 'code = ' || :'code_b');
SELECT _rec('1c_parent_code',         :'code_c' ~ '^[0-9]{3}$', 'code = ' || :'code_c');
SELECT _rec('1d_parent_partage_code', :'code_d' ~ '^[0-9]{3}$', 'code = ' || :'code_d');

SELECT CASE WHEN :'code_c' = '000' THEN '111' ELSE '000' END AS wrong_c \gset
SELECT CASE WHEN :'code_x' = '000' THEN '111' ELSE '000' END AS wrong_x \gset

-- ===========================================================================
-- TEST 2 : affichage UNIVERSEL au chargement. Un compte PARENT (uC) et un
--          compte relie ailleurs (uB) voient quand meme 'en_attente', sans
--          aucune info de foyer/profil.
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsC';
SELECT (public.statut_lien_enfant()) AS st_c \gset
RESET ROLE;
SELECT _rec('2a_parent_voit_en_attente', (:'st_c'::jsonb ->> 'etat') = 'en_attente', 'st = ' || :'st_c');
SELECT _rec('2b_aucun_profil_divulgue', (:'st_c'::jsonb ? 'profil_id') = false, 'st = ' || :'st_c');

SET ROLE authenticated;
SET request.jwt.claims = :'claimsB';
SELECT (public.statut_lien_enfant() ->> 'etat') AS st_b \gset
RESET ROLE;
SELECT _rec('2c_relie_ailleurs_voit_en_attente', :'st_b' = 'en_attente', 'st = ' || :'st_b');

-- ===========================================================================
-- TEST 3 : AUCUNE FUITE avant le bon code. uC (parent) saisit un MAUVAIS code :
--          reponse 'code_invalide' seulement, SANS 'nb_profils' ni mention de
--          suppression de foyer.
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsC';
SELECT (public.valider_lien_enfant(:'wrong_c')) AS r3 \gset
RESET ROLE;
SELECT _rec('3a_mauvais_code_invalide', (:'r3'::jsonb ->> 'etat') = 'code_invalide', 'r = ' || :'r3');
SELECT _rec('3b_pas_de_fuite_nb_profils', (:'r3'::jsonb ? 'nb_profils') = false, 'r = ' || :'r3');
SELECT _rec('3c_essais_restants', (:'r3'::jsonb ->> 'essais_restants') = '4', 'r = ' || :'r3');
SELECT _rec('3d_foyer_fc_intact', (SELECT count(*) FROM foyers WHERE id = :'FC') = 1, 'FC doit exister');

-- ===========================================================================
-- TEST 4 : SITUATION A (compte libre) -> rattachement direct.
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';
SELECT (public.valider_lien_enfant(:'code_a')) AS r4 \gset
RESET ROLE;
SELECT _rec('4a_ok', (:'r4'::jsonb ->> 'ok') = 'true' AND (:'r4'::jsonb ->> 'profil_id') = :'pa', 'r = ' || :'r4');
SELECT _rec('4b_user_id_pose', (SELECT user_id FROM profils WHERE id = :'pa') = :'uA', 'user_id Aya');
SELECT _rec('4c_lien_supprime', (SELECT count(*) FROM liens_enfant_en_attente WHERE profil_id = :'pa') = 0, 'lien restant ?');
SELECT _rec('4d_aucun_foyer_cree', (SELECT count(*) FROM membres_foyer WHERE user_id = :'uA') = 0, 'membres A');
SELECT _rec('4e_journalise', (SELECT count(*) FROM journal_reglages WHERE profil_id = :'pa' AND cle = 'compte_enfant') = 1, 'journal pa');

-- ===========================================================================
-- TEST 5 : SITUATION B (deja relie a un AUTRE profil) -> confirmation requise,
--          puis delien de l'ancien (journal FB) + relien du nouveau.
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsB';
SELECT (public.valider_lien_enfant(:'code_b')) AS r5a \gset
RESET ROLE;
SELECT _rec('5a_confirmation_demandee', (:'r5a'::jsonb ->> 'etat') = 'confirmation_autre_profil', 'r = ' || :'r5a');
SELECT _rec('5b_pas_encore_relie', (SELECT user_id FROM profils WHERE id = :'pb') IS NULL, 'pb pas relie');
SELECT _rec('5c_ancien_intact', (SELECT user_id FROM profils WHERE id = :'pold') = :'uB', 'pold encore uB');

SET ROLE authenticated;
SET request.jwt.claims = :'claimsB';
SELECT (public.valider_lien_enfant(:'code_b', true)) AS r5b \gset
RESET ROLE;
SELECT _rec('5d_relie', (:'r5b'::jsonb ->> 'ok') = 'true' AND (:'r5b'::jsonb ->> 'profil_id') = :'pb', 'r = ' || :'r5b');
SELECT _rec('5e_nouveau_pose', (SELECT user_id FROM profils WHERE id = :'pb') = :'uB', 'pb = uB');
SELECT _rec('5f_ancien_delie', (SELECT user_id FROM profils WHERE id = :'pold') IS NULL, 'pold delie');
SELECT _rec('5g_journal_ancien_foyer',
    (SELECT count(*) FROM journal_reglages WHERE foyer_id = :'FB' AND profil_id = :'pold'
       AND nouvelle = to_jsonb('delie'::text)) = 1, 'journal FB delie');
SELECT _rec('5h_lien_supprime', (SELECT count(*) FROM liens_enfant_en_attente WHERE profil_id = :'pb') = 0, 'lien pb');

-- ===========================================================================
-- TEST 6 : SITUATION C (parent SEUL de son foyer). Confirmation + reauth Google
--          recente exigee (amr < 5 min).
-- ===========================================================================
-- 6a : confirmation (sans confirmer) -> nb_profils = 2 (profils de FC), FC intact.
SET ROLE authenticated;
SET request.jwt.claims = :'claimsC';
SELECT (public.valider_lien_enfant(:'code_c')) AS r6a \gset
RESET ROLE;
SELECT _rec('6a_confirmation_suppression', (:'r6a'::jsonb ->> 'etat') = 'confirmation_suppression_foyer', 'r = ' || :'r6a');
SELECT _rec('6b_nb_profils', (:'r6a'::jsonb ->> 'nb_profils') = '2', 'r = ' || :'r6a');
SELECT _rec('6c_fc_intact', (SELECT count(*) FROM foyers WHERE id = :'FC') = 1, 'FC existe');

-- 6d : confirmer SANS reauth recente (amr vieux) -> reauth_requise, FC intact.
SELECT jsonb_build_object('sub', :'uC', 'role', 'authenticated', 'amr',
    jsonb_build_array(jsonb_build_object('method','oauth','timestamp',(extract(epoch from now())::bigint - 600))))::text AS cc_old \gset
SET ROLE authenticated;
SET request.jwt.claims = :'cc_old';
SELECT (public.valider_lien_enfant(:'code_c', true)) AS r6d \gset
RESET ROLE;
SELECT _rec('6d_reauth_requise', (:'r6d'::jsonb ->> 'etat') = 'reauth_requise', 'r = ' || :'r6d');
SELECT _rec('6e_fc_toujours_intact', (SELECT count(*) FROM foyers WHERE id = :'FC') = 1, 'FC existe');
SELECT _rec('6f_pc_non_relie', (SELECT user_id FROM profils WHERE id = :'pc') IS NULL, 'pc libre');

-- 6g : confirmer AVEC reauth recente -> suppression FC (cascade) + rattachement.
SELECT jsonb_build_object('sub', :'uC', 'role', 'authenticated', 'amr',
    jsonb_build_array(jsonb_build_object('method','oauth','timestamp',(extract(epoch from now())::bigint))))::text AS cc_recent \gset
SET ROLE authenticated;
SET request.jwt.claims = :'cc_recent';
SELECT (public.valider_lien_enfant(:'code_c', true)) AS r6g \gset
RESET ROLE;
SELECT _rec('6g_relie', (:'r6g'::jsonb ->> 'ok') = 'true' AND (:'r6g'::jsonb ->> 'profil_id') = :'pc', 'r = ' || :'r6g');
SELECT _rec('6h_pc_relie', (SELECT user_id FROM profils WHERE id = :'pc') = :'uC', 'pc = uC');
SELECT _rec('6i_fc_supprime', (SELECT count(*) FROM foyers WHERE id = :'FC') = 0, 'FC supprime');
SELECT _rec('6j_profils_fc_supprimes', (SELECT count(*) FROM profils WHERE id IN (:'pc1', :'pc2')) = 0, 'profils FC supprimes');
SELECT _rec('6k_uC_plus_parent', (SELECT count(*) FROM membres_foyer WHERE user_id = :'uC') = 0, 'uC plus membre');
SELECT _rec('6l_lien_supprime', (SELECT count(*) FROM liens_enfant_en_attente WHERE profil_id = :'pc') = 0, 'lien pc');

-- ===========================================================================
-- TEST 7 : SITUATION D (parent d'un foyer PARTAGE) -> refus clair, lien
--          supprime, FD intact, journal du foyer demandeur (sans info compte).
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsD';
SELECT (public.valider_lien_enfant(:'code_d', true)) AS r7 \gset
RESET ROLE;
SELECT _rec('7a_refus_partage', (:'r7'::jsonb ->> 'etat') = 'refus_foyer_partage', 'r = ' || :'r7');
SELECT _rec('7b_pd_non_relie', (SELECT user_id FROM profils WHERE id = :'pd') IS NULL, 'pd libre');
SELECT _rec('7c_fd_intact', (SELECT count(*) FROM foyers WHERE id = :'FD') = 1, 'FD existe');
SELECT _rec('7d_lien_supprime', (SELECT count(*) FROM liens_enfant_en_attente WHERE profil_id = :'pd') = 0, 'lien pd');
SELECT _rec('7e_journal_refuse',
    (SELECT count(*) FROM journal_reglages WHERE foyer_id = :'FM' AND profil_id = :'pd'
       AND nouvelle = to_jsonb('rattachement refuse'::text)) = 1, 'journal FM refuse');
SELECT _rec('7f_journal_sans_auteur',
    (SELECT bool_and(auteur IS NULL) FROM journal_reglages WHERE profil_id = :'pd'
       AND nouvelle = to_jsonb('rattachement refuse'::text)), 'auteur masque');

-- ===========================================================================
-- TEST 8 : REFUS ("ce n'est pas moi") -> lien supprime + journal « refuse »
--          dans le foyer demandeur.
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsR';
SELECT public.refuser_lien_enfant();
RESET ROLE;
SELECT _rec('8a_lien_supprime', (SELECT count(*) FROM liens_enfant_en_attente WHERE profil_id = :'pr') = 0, 'lien pr');
SELECT _rec('8b_journal_refuse',
    (SELECT count(*) FROM journal_reglages WHERE foyer_id = :'FM' AND profil_id = :'pr'
       AND nouvelle = to_jsonb('rattachement refuse'::text)) = 1, 'journal FM refuse pr');

-- ===========================================================================
-- TEST 9 : 5 MAUVAIS CODES -> annule, lien supprime, journal « annule ».
-- ===========================================================================
SET ROLE authenticated;
SET request.jwt.claims = :'claimsX';
-- 4 premiers essais, puis le 5e qui annule (le resultat du 5e dans r9).
SELECT public.valider_lien_enfant(:'wrong_x');
SELECT public.valider_lien_enfant(:'wrong_x');
SELECT public.valider_lien_enfant(:'wrong_x');
SELECT public.valider_lien_enfant(:'wrong_x');
SELECT (public.valider_lien_enfant(:'wrong_x')) AS r9 \gset
RESET ROLE;
SELECT _rec('9a_annule', (:'r9'::jsonb ->> 'etat') = 'annule', 'r = ' || :'r9');
SELECT _rec('9b_lien_supprime', (SELECT count(*) FROM liens_enfant_en_attente WHERE profil_id = :'px') = 0, 'lien px');
SELECT _rec('9c_px_non_relie', (SELECT user_id FROM profils WHERE id = :'px') IS NULL, 'px libre');
SELECT _rec('9d_journal_annule',
    (SELECT count(*) FROM journal_reglages WHERE foyer_id = :'FM' AND profil_id = :'px'
       AND nouvelle = to_jsonb('rattachement annule'::text)) = 1, 'journal FM annule px');

-- ===========================================================================
-- TEST 10 : EXPIRATION -> statut = aucun (lien expire ignore).
-- ===========================================================================
UPDATE liens_enfant_en_attente SET expire_le = now() - interval '1 day' WHERE profil_id = :'pex';
SET ROLE authenticated;
SET request.jwt.claims = :'claimsEx';
SELECT (public.statut_lien_enfant() ->> 'etat') AS st_ex \gset
SELECT (public.valider_lien_enfant(:'code_e') ->> 'etat') AS r10 \gset
RESET ROLE;
SELECT _rec('10a_statut_aucun', :'st_ex' = 'aucun', 'st = ' || :'st_ex');
SELECT _rec('10b_valider_aucun', :'r10' = 'aucun', 'r = ' || :'r10');

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
