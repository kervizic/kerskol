-- mail_outbox_securite_test.sql
-- Durcissement outbox + invitation (migration 0016) : envoi a l'invite, email
-- valide exige, purge, CHECK anti-controle sur surnom/message.
-- Transaction ROLLBACK. Execution : deploy/test-db.sh.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;

\set uP 'a1a1a1a1-0000-0000-0000-00000000aaaa'
INSERT INTO auth.users (id, email, created_at, email_confirmed_at)
VALUES (:'uP', 'parent@example.test', now(), now());
INSERT INTO foyers (id) VALUES ('f1f1f1f1-0000-0000-0000-00000000ffff');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('f1f1f1f1-0000-0000-0000-00000000ffff', :'uP');
INSERT INTO profils (id, foyer_id, surnom, matieres_actives)
VALUES ('c3c3c3c3-0000-0000-0000-00000000cccc', 'f1f1f1f1-0000-0000-0000-00000000ffff', 'Lou', '{MA}'::text[]);

\set claimsP '{"sub":"a1a1a1a1-0000-0000-0000-00000000aaaa","role":"authenticated"}'

-- TEST 1 : inviter_parent -> enfile un mail invitation_parent vers l'invite
SET ROLE authenticated;
SET request.jwt.claims = :'claimsP';
SELECT public.inviter_parent('f1f1f1f1-0000-0000-0000-00000000ffff', 'Invite@Example.Test') AS tok;
\gset
RESET ROLE;

SELECT _rec('1a_token_renvoye', length(:'tok') = 64, 'len = ' || length(:'tok'));
SELECT _rec('1b_gabarit_invitation',
    (SELECT gabarit FROM mail_outbox ORDER BY id DESC LIMIT 1) = 'invitation_parent', 'gabarit');
SELECT _rec('1c_email_invite_normalise',
    (SELECT parametres ->> 'email_invite' FROM mail_outbox ORDER BY id DESC LIMIT 1) = 'invite@example.test',
    'email_invite = ' || (SELECT parametres ->> 'email_invite' FROM mail_outbox ORDER BY id DESC LIMIT 1));
SELECT _rec('1d_user_id_est_invitant',
    (SELECT user_id FROM mail_outbox ORDER BY id DESC LIMIT 1) = :'uP', 'user_id = invitant');
SELECT _rec('1e_token_present',
    (SELECT (parametres ? 'token') FROM mail_outbox ORDER BY id DESC LIMIT 1), 'token present (transitoire)');

-- TEST 2 : email invalide refuse
SET ROLE authenticated;
SET request.jwt.claims = :'claimsP';
DO $$
BEGIN
    PERFORM public.inviter_parent('f1f1f1f1-0000-0000-0000-00000000ffff', 'pas-un-email');
    PERFORM _rec('2_email_invalide', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('2_email_invalide', SQLERRM LIKE '%email_invalide%', SQLERRM);
END $$;
RESET ROLE;

-- TEST 3 : CHECK anti-controle sur profils.surnom (CR/LF interdits)
DO $$
BEGIN
    UPDATE profils SET surnom = 'Lou' || chr(10) || 'Bcc: x@y'
     WHERE id = 'c3c3c3c3-0000-0000-0000-00000000cccc';
    PERFORM _rec('3_surnom_ctrl_refuse', false, 'accepte a tort');
EXCEPTION WHEN check_violation THEN
    PERFORM _rec('3_surnom_ctrl_refuse', true, 'rejete (check_violation)');
END $$;

-- TEST 4 : CHECK anti-controle sur bravos.message
SET ROLE authenticated;
SET request.jwt.claims = :'claimsP';
DO $$
BEGIN
    INSERT INTO bravos (profil_id, auteur, message)
    VALUES ('c3c3c3c3-0000-0000-0000-00000000cccc', 'a1a1a1a1-0000-0000-0000-00000000aaaa',
            'Bravo' || chr(13) || 'Subject: x');
    PERFORM _rec('4_message_ctrl_refuse', false, 'accepte a tort');
EXCEPTION WHEN check_violation THEN
    PERFORM _rec('4_message_ctrl_refuse', true, 'rejete (check_violation)');
WHEN OTHERS THEN
    PERFORM _rec('4_message_ctrl_refuse', SQLERRM LIKE '%bravos_message_ctrl%', SQLERRM);
END $$;
RESET ROLE;

-- TEST 5 : purge_mail_outbox supprime les lignes envoyees anciennes
UPDATE mail_outbox SET statut = 'sent', envoye_le = now() - interval '10 days'
 WHERE id = (SELECT id FROM mail_outbox ORDER BY id DESC LIMIT 1);
INSERT INTO mail_outbox (user_id, gabarit, parametres, statut, envoye_le)
VALUES (:'uP', 'message_service', '{}'::jsonb, 'sent', now() - interval '1 day');
DO $$
DECLARE v_n integer;
BEGIN
    v_n := public.purge_mail_outbox();
    PERFORM _rec('5a_purge_compte', v_n >= 1, 'supprimes = ' || v_n);
END $$;
SELECT _rec('5b_recent_conserve',
    EXISTS (SELECT 1 FROM mail_outbox WHERE envoye_le > now() - interval '2 days'), 'recent reste');

-- Rapport
SELECT id, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS resultat, nom, detail
  FROM _res ORDER BY id;
DO $$
DECLARE v_fail int;
BEGIN
    SELECT count(*) INTO v_fail FROM _res WHERE NOT ok;
    RAISE NOTICE '=== % test(s) en echec sur % ===', v_fail, (SELECT count(*) FROM _res);
    IF v_fail > 0 THEN RAISE EXCEPTION 'TESTS EN ECHEC : %', v_fail; END IF;
END $$;

ROLLBACK;
