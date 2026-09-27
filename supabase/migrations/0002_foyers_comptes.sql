-- 0002_foyers_comptes.sql
-- Foyer (famille), membres parents, invitations, profils enfants + fonctions
-- d'aide de securite et RPC de gestion du foyer.
--
-- Principes :
--   * anon n'a AUCUN acces (aucune policy anon nulle part).
--   * Un parent ne voit et n'agit que dans SON foyer.
--   * L'email de l'invite n'est jamais stocke dans invitations : il est passe
--     au mailer via mail_outbox.parametres au moment de l'invitation, puis la
--     ligne d'outbox est purgee par le mailer apres envoi. Ici on ne conserve
--     qu'un hash du token (jamais le token en clair, jamais l'email).
--   * Actions destructrices (supprimer_foyer, effacer_progression) : exigent une
--     authentification recente (claim amr du JWT < 5 minutes), sinon 'reauth_requise'.
--   * Migration idempotente : rejouable sans erreur.

-- =========================================================================
-- 0. Notes d'environnement (Supabase auto-heberge)
--    * auth.uid() / auth.jwt() et l'USAGE sur le schema auth pour
--      authenticated/anon sont deja fournis par l'image Supabase : on ne les
--      (re)cree pas ici (le role postgres n'est PAS superuser et ne peut de
--      toute facon pas ecrire dans le schema auth, proprietaire supabase_admin).
--    * RLS : on utilise ENABLE ROW LEVEL SECURITY SANS FORCE. Raison : postgres
--      n'est pas superuser sur cette image ; c'est le contournement RLS du
--      PROPRIETAIRE de table (postgres) qui permet aux fonctions/triggers
--      SECURITY DEFINER d'ecrire les donnees calculees par le serveur
--      (progression, monnaie, journal, outbox). FORCE soumettrait le
--      proprietaire a RLS et casserait ces ecritures. La securite de l'API est
--      identique : PostgREST se connecte uniquement via authenticator ->
--      authenticated/anon, qui NE SONT PAS proprietaires et restent donc
--      pleinement soumis a RLS.
-- =========================================================================
-- L'outbox (0001) etait en FORCE : on retire FORCE pour que l'enfilement par
-- fonctions SECURITY DEFINER (proprietaire postgres) fonctionne. Elle reste
-- fermee a l'API (aucune policy pour authenticated/anon, qui sont non-proprietaires).
ALTER TABLE public.mail_outbox NO FORCE ROW LEVEL SECURITY;

-- =========================================================================
-- 1. Tables
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.foyers (
    id      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    cree_le timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.foyers IS 'Un foyer = une famille. Rattache parents et profils enfants.';

CREATE TABLE IF NOT EXISTS public.membres_foyer (
    foyer_id uuid        NOT NULL REFERENCES public.foyers (id) ON DELETE CASCADE,
    user_id  uuid        NOT NULL REFERENCES auth.users (id)   ON DELETE CASCADE,
    role     text        NOT NULL DEFAULT 'parent',
    cree_le  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (foyer_id, user_id),
    CONSTRAINT membres_foyer_role_chk CHECK (role IN ('parent'))
);
COMMENT ON TABLE public.membres_foyer IS 'Parents rattaches a un foyer (role parent uniquement pour l''instant).';

CREATE TABLE IF NOT EXISTS public.invitations (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id    uuid        NOT NULL REFERENCES public.foyers (id) ON DELETE CASCADE,
    token_hash  text        NOT NULL UNIQUE,
    expire_le   timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
    acceptee_le timestamptz,
    cree_le     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.invitations IS
    'Invitation d''un second parent. Ne stocke QUE le hash SHA-256 du token '
    '(jamais le token en clair, jamais l''email de l''invite). Expire a 7 jours.';

CREATE TABLE IF NOT EXISTS public.profils (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id         uuid        NOT NULL REFERENCES public.foyers (id) ON DELETE CASCADE,
    surnom           text        NOT NULL,
    avatar           jsonb       NOT NULL DEFAULT '{}'::jsonb,
    univers          text        NOT NULL DEFAULT 'village_breton',
    matieres_actives text[]      NOT NULL DEFAULT '{MA}',
    limite_jour_min    integer,
    limite_semaine_min integer,
    user_id          uuid        UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL,
    monnaie          integer     NOT NULL DEFAULT 0,
    cree_le          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT profils_surnom_len_chk  CHECK (char_length(surnom) BETWEEN 1 AND 30),
    CONSTRAINT profils_univers_chk     CHECK (univers IN (
        'village_breton','ile_tropicale','base_spatiale',
        'royaume_enchante','vallee_dinosaures','village_gourmand')),
    CONSTRAINT profils_monnaie_pos_chk CHECK (monnaie >= 0)
);
COMMENT ON TABLE public.profils IS
    'Profil enfant. Pas de genre ni date de naissance (RGPD). user_id : compte '
    'Google enfant optionnel, relie uniquement par un parent du foyer.';
COMMENT ON COLUMN public.profils.univers IS 'Choix esthetique de l''enfant, non journalise.';

CREATE INDEX IF NOT EXISTS membres_foyer_user_idx ON public.membres_foyer (user_id);
CREATE INDEX IF NOT EXISTS profils_foyer_idx      ON public.profils (foyer_id);
CREATE INDEX IF NOT EXISTS invitations_foyer_idx  ON public.invitations (foyer_id);

-- =========================================================================
-- 2. Fonctions d'aide de securite (SECURITY DEFINER, STABLE)
--    Recherche dans public uniquement (search_path fige).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.est_parent_du_foyer(p_foyer uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.membres_foyer m
        WHERE m.foyer_id = p_foyer AND m.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.foyer_du_profil(p_profil uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT foyer_id FROM public.profils WHERE id = p_profil;
$$;

CREATE OR REPLACE FUNCTION public.peut_acceder_profil(p_profil uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profils p
        WHERE p.id = p_profil
          AND (
                public.est_parent_du_foyer(p.foyer_id)  -- un parent du foyer
             OR p.user_id = auth.uid()                  -- ou l'enfant lui-meme
              )
    );
$$;

-- Verifie que l'authentification est recente (< 5 min) via le claim amr du JWT.
-- amr = tableau d'objets {method, timestamp}. On prend le timestamp le plus recent.
CREATE OR REPLACE FUNCTION public._reauth_recente()
RETURNS boolean
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_claims jsonb;
    v_last   bigint;
BEGIN
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
    IF v_claims IS NULL THEN
        RETURN false;
    END IF;
    SELECT max((elem->>'timestamp')::bigint)
      INTO v_last
      FROM jsonb_array_elements(coalesce(v_claims->'amr', '[]'::jsonb)) AS elem
     WHERE elem ? 'timestamp';
    IF v_last IS NULL THEN
        RETURN false;
    END IF;
    RETURN to_timestamp(v_last) > (now() - interval '5 minutes');
END;
$$;

-- =========================================================================
-- 3. RLS
-- =========================================================================
ALTER TABLE public.foyers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membres_foyer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profils       ENABLE ROW LEVEL SECURITY;

-- foyers : un membre voit son foyer (lecture seule ; creation via RPC).
DROP POLICY IF EXISTS foyers_select_membre ON public.foyers;
CREATE POLICY foyers_select_membre ON public.foyers
    FOR SELECT TO authenticated
    USING (public.est_parent_du_foyer(id));

-- membres_foyer : un parent voit les membres de ses foyers.
DROP POLICY IF EXISTS membres_select_parent ON public.membres_foyer;
CREATE POLICY membres_select_parent ON public.membres_foyer
    FOR SELECT TO authenticated
    USING (public.est_parent_du_foyer(foyer_id));

-- invitations : un parent voit et cree les invitations de ses foyers.
-- (l'insertion normale passe par la RPC inviter_parent, mais on autorise le
-- select pour suivi cote UI ; jamais de token en clair renvoye ici.)
DROP POLICY IF EXISTS invitations_select_parent ON public.invitations;
CREATE POLICY invitations_select_parent ON public.invitations
    FOR SELECT TO authenticated
    USING (public.est_parent_du_foyer(foyer_id));

-- profils : accessible par un parent du foyer OU par l'enfant (user_id).
DROP POLICY IF EXISTS profils_select ON public.profils;
CREATE POLICY profils_select ON public.profils
    FOR SELECT TO authenticated
    USING (public.peut_acceder_profil(id));

-- Insertion d'un profil : reservee aux parents du foyer vise.
DROP POLICY IF EXISTS profils_insert_parent ON public.profils;
CREATE POLICY profils_insert_parent ON public.profils
    FOR INSERT TO authenticated
    WITH CHECK (public.est_parent_du_foyer(foyer_id));

-- Mise a jour d'un profil : parent du foyer OU l'enfant (pour l'univers/avatar).
DROP POLICY IF EXISTS profils_update ON public.profils;
CREATE POLICY profils_update ON public.profils
    FOR UPDATE TO authenticated
    USING (public.peut_acceder_profil(id))
    WITH CHECK (public.peut_acceder_profil(id));

-- Suppression d'un profil : parents du foyer uniquement.
DROP POLICY IF EXISTS profils_delete_parent ON public.profils;
CREATE POLICY profils_delete_parent ON public.profils
    FOR DELETE TO authenticated
    USING (public.est_parent_du_foyer(foyer_id));

-- =========================================================================
-- 4. Privileges de table (le detail fin est porte par les policies RLS)
-- =========================================================================
GRANT SELECT ON public.foyers        TO authenticated;
GRANT SELECT ON public.membres_foyer TO authenticated;
GRANT SELECT ON public.invitations   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profils TO authenticated;

-- =========================================================================
-- 5. RPC de gestion du foyer (SECURITY DEFINER)
-- =========================================================================

-- creer_foyer : cree un foyer + rattache auth.uid() comme parent, s'il n'a pas
-- deja de foyer. Renvoie l'id du foyer (existant ou nouveau).
CREATE OR REPLACE FUNCTION public.creer_foyer()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid   uuid := auth.uid();
    v_foyer uuid;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    SELECT foyer_id INTO v_foyer
      FROM public.membres_foyer WHERE user_id = v_uid
     LIMIT 1;
    IF v_foyer IS NOT NULL THEN
        RETURN v_foyer;
    END IF;

    INSERT INTO public.foyers DEFAULT VALUES RETURNING id INTO v_foyer;
    INSERT INTO public.membres_foyer (foyer_id, user_id, role)
    VALUES (v_foyer, v_uid, 'parent');
    RETURN v_foyer;
END;
$$;

-- inviter_parent : cree une invitation pour un foyer et renvoie le token EN CLAIR
-- une seule fois (seul le hash est stocke). L'email de l'invite n'est PAS stocke
-- ici : le parametre p_email est passe au mailer via mail_outbox.parametres.
CREATE OR REPLACE FUNCTION public.inviter_parent(p_foyer uuid, p_email text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid   uuid := auth.uid();
    v_token text;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    IF NOT public.est_parent_du_foyer(p_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;

    -- Token opaque (128 bits d'entropie via deux uuid v4).
    v_token := replace(gen_random_uuid()::text, '-', '')
             || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.invitations (foyer_id, token_hash)
    VALUES (p_foyer, encode(sha256(v_token::bytea), 'hex'));

    -- Enfilement du mail d'invitation (email transmis au mailer, jamais stocke
    -- dans invitations). La ligne d'outbox est purgee par le mailer apres envoi.
    IF p_email IS NOT NULL THEN
        INSERT INTO public.mail_outbox (user_id, gabarit, parametres)
        VALUES (v_uid, 'message_service',
                jsonb_build_object('type', 'invitation_parent',
                                   'email_invite', p_email,
                                   'token', v_token));
    END IF;

    RETURN v_token;  -- renvoye une seule fois a l'appelant
END;
$$;

-- accepter_invitation : rattache auth.uid() au foyer si le token est valide
-- (non expire, non deja accepte). Renvoie le foyer rejoint.
CREATE OR REPLACE FUNCTION public.accepter_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid   uuid := auth.uid();
    v_foyer uuid;
    v_inv   uuid;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    SELECT id, foyer_id INTO v_inv, v_foyer
      FROM public.invitations
     WHERE token_hash = encode(sha256(p_token::bytea), 'hex')
       AND acceptee_le IS NULL
       AND expire_le > now()
     FOR UPDATE;

    IF v_inv IS NULL THEN
        RAISE EXCEPTION 'invitation_invalide';
    END IF;

    INSERT INTO public.membres_foyer (foyer_id, user_id, role)
    VALUES (v_foyer, v_uid, 'parent')
    ON CONFLICT (foyer_id, user_id) DO NOTHING;

    UPDATE public.invitations SET acceptee_le = now() WHERE id = v_inv;
    RETURN v_foyer;
END;
$$;

-- relier_compte_enfant : associe un compte Google (email) a un profil enfant.
-- Reserve aux parents du foyer du profil. Recherche l'utilisateur par email
-- dans auth.users.
CREATE OR REPLACE FUNCTION public.relier_compte_enfant(p_profil uuid, p_email text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer uuid;
    v_user  uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.est_parent_du_foyer(v_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;

    SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'compte_introuvable';
    END IF;

    UPDATE public.profils SET user_id = v_user WHERE id = p_profil;
END;
$$;

-- supprimer_foyer : supprime le foyer de l'appelant (cascade). Exige une
-- authentification recente (amr < 5 min).
CREATE OR REPLACE FUNCTION public.supprimer_foyer(p_foyer uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    IF NOT public.est_parent_du_foyer(p_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;
    IF NOT public._reauth_recente() THEN
        RAISE EXCEPTION 'reauth_requise';
    END IF;

    DELETE FROM public.foyers WHERE id = p_foyer;
END;
$$;

-- effacer_progression : efface reponses, seances et progression d'un profil.
-- Exige une authentification recente (amr < 5 min).
CREATE OR REPLACE FUNCTION public.effacer_progression(p_profil uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.est_parent_du_foyer(v_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;
    IF NOT public._reauth_recente() THEN
        RAISE EXCEPTION 'reauth_requise';
    END IF;

    DELETE FROM public.reponses     WHERE profil_id = p_profil;
    DELETE FROM public.seances      WHERE profil_id = p_profil;
    DELETE FROM public.progression  WHERE profil_id = p_profil;
    UPDATE public.profils SET monnaie = 0 WHERE id = p_profil;
END;
$$;

-- Droits d'execution des RPC (anon exclu).
REVOKE ALL ON FUNCTION public.creer_foyer()                       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.inviter_parent(uuid, text)          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accepter_invitation(text)           FROM PUBLIC;
REVOKE ALL ON FUNCTION public.relier_compte_enfant(uuid, text)    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.supprimer_foyer(uuid)               FROM PUBLIC;
REVOKE ALL ON FUNCTION public.effacer_progression(uuid)           FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.creer_foyer()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.inviter_parent(uuid, text)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.accepter_invitation(text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.relier_compte_enfant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supprimer_foyer(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.effacer_progression(uuid)        TO authenticated;

-- =========================================================================
-- 6. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0002_foyers_comptes')
ON CONFLICT (version) DO NOTHING;
