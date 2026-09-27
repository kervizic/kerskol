-- strip_google_identity_test.sql
-- Verifie que le trigger de la migration 0008 retire bien nom et photo Google
-- de auth.users.raw_user_meta_data et auth.identities.identity_data, sur INSERT
-- comme sur UPDATE, tout en conservant l'e-mail et l'identifiant technique.
--
-- Execution : deploy/test-db.sh (psql -v ON_ERROR_STOP=1 dans le conteneur db).
-- Tout est joue dans une transaction ROLLBACK : aucune donnee ne subsiste.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);

\set u1 '33333333-3333-3333-3333-333333333333'

-- Cles d'identite Google qui NE doivent PAS subsister.
\set meta '{"name":"Jean Dupont","full_name":"Jean Dupont","given_name":"Jean","family_name":"Dupont","avatar_url":"https://x/y.jpg","picture":"https://x/z.jpg","email":"jean@example.test","sub":"google-123","iss":"https://accounts.google.com"}'

-- --- auth.users : INSERT ---------------------------------------------------
INSERT INTO auth.users (id, email, created_at, raw_user_meta_data)
VALUES (:'u1', 'jean@example.test', now(), :'meta'::jsonb);

INSERT INTO _res (nom, ok, detail)
SELECT 'users.insert: nom/photo retires',
       NOT (raw_user_meta_data ?| array[
            'name','full_name','given_name','family_name','avatar_url','picture']),
       raw_user_meta_data::text
  FROM auth.users WHERE id = :'u1';

INSERT INTO _res (nom, ok, detail)
SELECT 'users.insert: email + sub conserves',
       (raw_user_meta_data->>'email' = 'jean@example.test'
        AND raw_user_meta_data->>'sub' = 'google-123'),
       raw_user_meta_data::text
  FROM auth.users WHERE id = :'u1';

-- --- auth.users : UPDATE (re-injection des cles) ---------------------------
UPDATE auth.users
   SET raw_user_meta_data =
       raw_user_meta_data || '{"name":"Re-injecte","picture":"https://x/re.jpg"}'::jsonb
 WHERE id = :'u1';

INSERT INTO _res (nom, ok, detail)
SELECT 'users.update: nom/photo re-retires',
       NOT (raw_user_meta_data ?| array['name','picture']),
       raw_user_meta_data::text
  FROM auth.users WHERE id = :'u1';

-- --- auth.identities : INSERT ----------------------------------------------
INSERT INTO auth.identities
       (provider_id, user_id, identity_data, provider, created_at, updated_at)
VALUES ('google-123', :'u1', :'meta'::jsonb, 'google', now(), now());

INSERT INTO _res (nom, ok, detail)
SELECT 'identities.insert: nom/photo retires',
       NOT (identity_data ?| array[
            'name','full_name','given_name','family_name','avatar_url','picture']),
       identity_data::text
  FROM auth.identities WHERE user_id = :'u1';

INSERT INTO _res (nom, ok, detail)
SELECT 'identities.insert: email + sub conserves',
       (identity_data->>'email' = 'jean@example.test'
        AND identity_data->>'sub' = 'google-123'),
       identity_data::text
  FROM auth.identities WHERE user_id = :'u1';

-- --- auth.identities : UPDATE ----------------------------------------------
UPDATE auth.identities
   SET identity_data =
       identity_data || '{"full_name":"Re-injecte","avatar_url":"https://x/re.jpg"}'::jsonb
 WHERE user_id = :'u1';

INSERT INTO _res (nom, ok, detail)
SELECT 'identities.update: nom/photo re-retires',
       NOT (identity_data ?| array['full_name','avatar_url']),
       identity_data::text
  FROM auth.identities WHERE user_id = :'u1';

-- --- Bilan -----------------------------------------------------------------
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
