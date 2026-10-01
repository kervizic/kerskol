-- 0016_mail_outbox_securite.sql
-- Durcissement de la file d'envoi et de l'invitation parent.
--
--   * inviter_parent : le mail part desormais a l'INVITE (email saisi, valide),
--     plus au parent invitant. Gabarit dedie 'invitation_parent'. Le jeton et
--     l'email ne sont stockes que le temps de l'envoi (effaces par le mailer).
--   * mail_outbox : le mailer peut effacer (UPDATE parametres) et purger (DELETE)
--     les lignes envoyees. purge_mail_outbox() pour le cron.
--   * CHECK anti-caracteres de controle sur profils.surnom et bravos.message
--     (defense contre l'injection d'en-tetes email cote base).
--
-- Idempotent.

-- =========================================================================
-- 1. Gabarit 'invitation_parent' autorise dans l'outbox
-- =========================================================================
ALTER TABLE public.mail_outbox DROP CONSTRAINT IF EXISTS mail_outbox_gabarit_chk;
ALTER TABLE public.mail_outbox ADD  CONSTRAINT mail_outbox_gabarit_chk
    CHECK (gabarit IN ('resume_hebdomadaire', 'message_service', 'invitation_parent'));

-- =========================================================================
-- 2. inviter_parent : envoi a l'invite (email valide), jeton/email transitoires
-- =========================================================================
CREATE OR REPLACE FUNCTION public.inviter_parent(p_foyer uuid, p_email text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid   uuid := auth.uid();
    v_token text;
    v_email text := lower(trim(p_email));
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    IF NOT public.est_parent_du_foyer(p_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;
    IF p_email IS NOT NULL AND v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RAISE EXCEPTION 'email_invalide';
    END IF;

    v_token := replace(gen_random_uuid()::text, '-', '')
             || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.invitations (foyer_id, token_hash)
    VALUES (p_foyer, encode(sha256(v_token::bytea), 'hex'));

    -- Enfilement du mail d'invitation vers l'INVITE. email + jeton stockes
    -- transitoirement (effaces par le mailer apres envoi). user_id = parent
    -- invitant (FK/piste d'audit ; le mailer n'envoie PAS a cette adresse pour
    -- ce gabarit).
    IF p_email IS NOT NULL THEN
        INSERT INTO public.mail_outbox (user_id, gabarit, parametres)
        VALUES (v_uid, 'invitation_parent',
                jsonb_build_object('email_invite', v_email, 'token', v_token));
    END IF;

    RETURN v_token;  -- renvoye une seule fois a l'appelant
END;
$$;
REVOKE ALL ON FUNCTION public.inviter_parent(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inviter_parent(uuid, text) TO authenticated;

-- =========================================================================
-- 3. Droits du mailer : effacer (UPDATE deja accorde) + purger (DELETE)
-- =========================================================================
GRANT DELETE ON public.mail_outbox TO kerskol_mailer;

-- =========================================================================
-- 4. Purge periodique des lignes envoyees (> 7 jours). Service uniquement.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.purge_mail_outbox()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_n integer;
BEGIN
    WITH d AS (
        DELETE FROM public.mail_outbox
         WHERE statut IN ('sent', 'failed')
           AND coalesce(envoye_le, cree_le) < now() - interval '7 days'
        RETURNING 1
    )
    SELECT count(*) INTO v_n FROM d;
    RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_mail_outbox() FROM PUBLIC;

-- =========================================================================
-- 5. CHECK anti-caracteres de controle (injection d'en-tetes email)
-- =========================================================================
ALTER TABLE public.profils DROP CONSTRAINT IF EXISTS profils_surnom_ctrl_chk;
ALTER TABLE public.profils ADD  CONSTRAINT profils_surnom_ctrl_chk
    CHECK (surnom !~ '[[:cntrl:]]') NOT VALID;

ALTER TABLE public.bravos DROP CONSTRAINT IF EXISTS bravos_message_ctrl_chk;
ALTER TABLE public.bravos ADD  CONSTRAINT bravos_message_ctrl_chk
    CHECK (message !~ '[[:cntrl:]]') NOT VALID;

-- =========================================================================
-- 6. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0016_mail_outbox_securite')
ON CONFLICT (version) DO NOTHING;
