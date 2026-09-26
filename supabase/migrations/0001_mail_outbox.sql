-- 0001_mail_outbox.sql
-- Preferences parent (opt-in mails) + file d'attente d'envoi (outbox) + role
-- technique du mailer avec privileges minimaux.
--
-- Principes :
--   * L'email du destinataire n'est JAMAIS stocke ici : il est lu dans
--     auth.users au moment de l'envoi par le service mailer.
--   * L'outbox est totalement fermee a anon / authenticated (RLS sans policy).
--     L'enfilement se fait cote serveur de confiance (service_role / fonction
--     SECURITY DEFINER), jamais directement depuis le front.
--   * Un parent ne voit et ne modifie que ses propres preferences.
--   * Migration idempotente : rejouable sans erreur.

-- =========================================================================
-- 1. Table des preferences parent (opt-in explicite, defaut = desactive)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.parent_preferences (
    user_id       uuid        PRIMARY KEY
                              REFERENCES auth.users (id) ON DELETE CASCADE,
    mails_actives boolean     NOT NULL DEFAULT false,
    cree_le       timestamptz NOT NULL DEFAULT now(),
    maj_le        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.parent_preferences IS
    'Preferences du parent. mails_actives : opt-in explicite (RGPD), defaut false.';

-- =========================================================================
-- 2. File d'attente d'envoi (outbox)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.mail_outbox (
    id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        uuid        NOT NULL
                              REFERENCES auth.users (id) ON DELETE CASCADE,
    gabarit        text        NOT NULL,
    parametres     jsonb       NOT NULL DEFAULT '{}'::jsonb,
    statut         text        NOT NULL DEFAULT 'pending',
    essais         integer     NOT NULL DEFAULT 0,
    prochain_essai timestamptz NOT NULL DEFAULT now(),
    derniere_erreur text,
    cree_le        timestamptz NOT NULL DEFAULT now(),
    envoye_le      timestamptz,
    CONSTRAINT mail_outbox_statut_chk
        CHECK (statut IN ('pending', 'sent', 'failed')),
    CONSTRAINT mail_outbox_gabarit_chk
        CHECK (gabarit IN ('resume_hebdomadaire', 'message_service'))
);

COMMENT ON TABLE public.mail_outbox IS
    'File d''attente des mails a envoyer. Aucun email destinataire stocke : '
    'il est resolu depuis auth.users a l''envoi.';
COMMENT ON COLUMN public.mail_outbox.parametres IS
    'Donnees du gabarit (surnom, progression...). Aucune donnee sensible sur l''enfant.';

-- Index de picking du worker : les lignes a traiter en priorite.
CREATE INDEX IF NOT EXISTS mail_outbox_pending_idx
    ON public.mail_outbox (prochain_essai)
    WHERE statut = 'pending';

-- =========================================================================
-- 3. Row Level Security
-- =========================================================================

-- parent_preferences : un parent ne gere QUE ses propres preferences.
ALTER TABLE public.parent_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_preferences_select_own ON public.parent_preferences;
CREATE POLICY parent_preferences_select_own
    ON public.parent_preferences
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS parent_preferences_insert_own ON public.parent_preferences;
CREATE POLICY parent_preferences_insert_own
    ON public.parent_preferences
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS parent_preferences_update_own ON public.parent_preferences;
CREATE POLICY parent_preferences_update_own
    ON public.parent_preferences
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- mail_outbox : RLS activee SANS aucune policy pour anon/authenticated
-- => table totalement fermee cote API publique. Seul kerskol_mailer (plus bas)
-- recoit une policy dediee.
ALTER TABLE public.mail_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_outbox FORCE ROW LEVEL SECURITY;

-- =========================================================================
-- 4. Role technique du mailer (privileges minimaux)
-- =========================================================================
-- Le role est cree NOLOGIN ici ; le mot de passe et l'attribut LOGIN sont
-- appliques hors depot (gen-secrets.sh + deploy.sh, valeur dans /opt/kerskol/.env).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kerskol_mailer') THEN
        CREATE ROLE kerskol_mailer NOLOGIN NOINHERIT;
    END IF;
END
$$;

-- Acces schemas (lecture seule sur auth pour resoudre l'email a l'envoi)
GRANT USAGE ON SCHEMA public TO kerskol_mailer;
GRANT USAGE ON SCHEMA auth   TO kerskol_mailer;

-- Outbox : lecture + mise a jour du statut/essais uniquement (pas d'INSERT ni DELETE).
GRANT SELECT, UPDATE ON public.mail_outbox TO kerskol_mailer;

-- Preferences : lecture seule (verifier que l'opt-in est actif).
GRANT SELECT ON public.parent_preferences TO kerskol_mailer;

-- auth.users : SELECT sur les seules colonnes necessaires (id + email).
GRANT SELECT (id, email) ON auth.users TO kerskol_mailer;

-- Policy dediee au mailer sur l'outbox (RLS forcee : le role n'est pas owner).
DROP POLICY IF EXISTS mail_outbox_mailer_all ON public.mail_outbox;
CREATE POLICY mail_outbox_mailer_all
    ON public.mail_outbox
    FOR ALL TO kerskol_mailer
    USING (true)
    WITH CHECK (true);

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0001_mail_outbox')
ON CONFLICT (version) DO NOTHING;
