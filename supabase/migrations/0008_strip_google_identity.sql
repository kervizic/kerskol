-- 0008_strip_google_identity.sql
-- Confidentialite : Kerskol NE CONSERVE NI LE NOM NI LA PHOTO Google du parent.
-- La page /confidentialite l'affirme : ce trigger le garantit techniquement.
--
-- Google (OIDC) renvoie a la connexion des champs d'identite (name, full_name,
-- given_name, family_name, avatar_url, picture) que GoTrue stocke dans
-- auth.users.raw_user_meta_data ET auth.identities.identity_data. On les retire
-- systematiquement, sur INSERT comme sur UPDATE, en ne gardant que l'e-mail et
-- l'identifiant technique (sub, provider_id, etc.).
--
-- Idempotent : CREATE OR REPLACE + DROP TRIGGER IF EXISTS + nettoyage
-- conditionnel des lignes existantes.

-- Fonction de trigger : retire les cles d'identite Google du document JSONB
-- concerne selon la table (users -> raw_user_meta_data, identities ->
-- identity_data). Aucun acces a une table : pas besoin de SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.kerskol_strip_google_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
    IF TG_TABLE_NAME = 'users' THEN
        IF NEW.raw_user_meta_data IS NOT NULL THEN
            NEW.raw_user_meta_data := NEW.raw_user_meta_data
                - 'name' - 'full_name' - 'given_name' - 'family_name'
                - 'avatar_url' - 'picture';
        END IF;
    ELSIF TG_TABLE_NAME = 'identities' THEN
        IF NEW.identity_data IS NOT NULL THEN
            NEW.identity_data := NEW.identity_data
                - 'name' - 'full_name' - 'given_name' - 'family_name'
                - 'avatar_url' - 'picture';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.kerskol_strip_google_identity() IS
    'Retire nom et photo Google (name, full_name, given_name, family_name, '
    'avatar_url, picture) de auth.users.raw_user_meta_data et '
    'auth.identities.identity_data. Voir page /confidentialite.';

-- auth.users : existe forcement (deploy.sh attend cette table).
DROP TRIGGER IF EXISTS kerskol_strip_google_identity ON auth.users;
CREATE TRIGGER kerskol_strip_google_identity
    BEFORE INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.kerskol_strip_google_identity();

UPDATE auth.users
   SET raw_user_meta_data = raw_user_meta_data
       - 'name' - 'full_name' - 'given_name' - 'family_name'
       - 'avatar_url' - 'picture'
 WHERE raw_user_meta_data ?| array[
       'name','full_name','given_name','family_name','avatar_url','picture'];

-- auth.identities : presente dans les versions recentes de GoTrue. Guarde par
-- to_regclass pour rester robuste si le schema evolue.
DO $$
BEGIN
    IF to_regclass('auth.identities') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS kerskol_strip_google_identity ON auth.identities;
        CREATE TRIGGER kerskol_strip_google_identity
            BEFORE INSERT OR UPDATE ON auth.identities
            FOR EACH ROW EXECUTE FUNCTION public.kerskol_strip_google_identity();

        UPDATE auth.identities
           SET identity_data = identity_data
               - 'name' - 'full_name' - 'given_name' - 'family_name'
               - 'avatar_url' - 'picture'
         WHERE identity_data ?| array[
               'name','full_name','given_name','family_name','avatar_url','picture'];
    END IF;
END $$;

-- Enregistrement de la migration.
INSERT INTO public.schema_migrations (version)
VALUES ('0008_strip_google_identity')
ON CONFLICT (version) DO NOTHING;
