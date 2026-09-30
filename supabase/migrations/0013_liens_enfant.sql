-- 0013_liens_enfant.sql
-- Rattachement du compte Google d'un enfant a son profil, via un lien EN ATTENTE
-- cree par un parent, puis consomme au premier login de l'enfant.
--
-- Flux :
--   1. Un parent, depuis ses reglages, cree un lien en attente (profil + email).
--      L'email est normalise en minuscules et n'est stocke que le temps de
--      l'attente (30 jours max), jamais au-dela.
--   2. Au login d'un compte, le front appelle rattacher_si_attendu() AVANT tout
--      creer_foyer(). Si l'email du compte correspond a un lien non expire :
--      profils.user_id = auth.uid(), le lien est supprime (l'email n'est plus
--      stocke), l'evenement est journalise. L'enfant va droit dans son village.
--   3. Un enfant relie ne peut modifier que son univers et son avatar/couleur.
--      Garanti cote base par un trigger (pas seulement cote interface).
--
-- Unicite : un compte Google -> un seul profil (profils.user_id UNIQUE) ; un
-- parent membre d'un foyer ne peut pas etre relie comme enfant.
--
-- Idempotent (rejouable sans erreur).

-- =========================================================================
-- 1. Table des liens en attente
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.liens_enfant_en_attente (
    id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    profil_id uuid        NOT NULL REFERENCES public.profils (id) ON DELETE CASCADE,
    email     text        NOT NULL,
    cree_par  uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    cree_le   timestamptz NOT NULL DEFAULT now(),
    expire_le timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
    CONSTRAINT liens_email_minuscules_chk CHECK (email = lower(email)),
    CONSTRAINT liens_profil_uniq  UNIQUE (profil_id),  -- un seul lien par profil
    CONSTRAINT liens_email_uniq   UNIQUE (email)       -- un email en attente une seule fois
);
COMMENT ON TABLE public.liens_enfant_en_attente IS
    'Rattachement enfant EN ATTENTE (profil + email en minuscules), cree par un '
    'parent, consomme au login par rattacher_si_attendu(). L''email n''est '
    'conserve que le temps de l''attente (30 jours), puis supprime au rattachement.';

-- =========================================================================
-- 2. RLS : seuls les parents du foyer du profil voient / annulent (DELETE).
--    La CREATION passe par la RPC demander_lien_enfant (validation + normalisation) :
--    aucun GRANT INSERT, aucune policy INSERT cote API.
-- =========================================================================
ALTER TABLE public.liens_enfant_en_attente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS liens_select_parent ON public.liens_enfant_en_attente;
CREATE POLICY liens_select_parent ON public.liens_enfant_en_attente
    FOR SELECT TO authenticated
    USING (public.est_parent_du_foyer(public.foyer_du_profil(profil_id)));

DROP POLICY IF EXISTS liens_delete_parent ON public.liens_enfant_en_attente;
CREATE POLICY liens_delete_parent ON public.liens_enfant_en_attente
    FOR DELETE TO authenticated
    USING (public.est_parent_du_foyer(public.foyer_du_profil(profil_id)));

-- Privileges : l'image Supabase accorde tout par defaut -> on ferme puis on
-- ouvre le strict minimum (select pour l'affichage, delete pour annuler).
REVOKE ALL ON public.liens_enfant_en_attente FROM anon, authenticated;
GRANT SELECT, DELETE ON public.liens_enfant_en_attente TO authenticated;

-- =========================================================================
-- 3. Restriction des colonnes modifiables par l'enfant lui-meme.
--    Un enfant relie (auth.uid() = profils.user_id, non parent du foyer) ne peut
--    changer QUE univers et avatar. Toute autre colonne (surnom, classe, limites,
--    matieres, foyer, user_id, monnaie...) est refusee cote base.
--    Le credit de monnaie par le trigger serveur (trg_reponses_monnaie) est
--    autorise via le marqueur transactionnel kerskol.calcul.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_profils_colonnes_enfant()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    -- Ecriture calculee par le serveur (monnaie) : on laisse passer.
    IF current_setting('kerskol.calcul', true) = 'on' THEN
        RETURN NEW;
    END IF;

    -- L'auteur est-il l'enfant lui-meme (et pas un parent du foyer) ?
    IF OLD.user_id IS NOT NULL
       AND auth.uid() = OLD.user_id
       AND NOT public.est_parent_du_foyer(OLD.foyer_id)
    THEN
        IF NEW.surnom             IS DISTINCT FROM OLD.surnom
        OR NEW.classe             IS DISTINCT FROM OLD.classe
        OR NEW.matieres_actives   IS DISTINCT FROM OLD.matieres_actives
        OR NEW.limite_jour_min    IS DISTINCT FROM OLD.limite_jour_min
        OR NEW.limite_semaine_min IS DISTINCT FROM OLD.limite_semaine_min
        OR NEW.foyer_id           IS DISTINCT FROM OLD.foyer_id
        OR NEW.user_id            IS DISTINCT FROM OLD.user_id
        OR NEW.monnaie            IS DISTINCT FROM OLD.monnaie
        THEN
            RAISE EXCEPTION 'colonne_interdite_enfant'
                USING HINT = 'Un enfant ne peut modifier que son univers et son avatar.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profils_colonnes_enfant ON public.profils;
CREATE TRIGGER profils_colonnes_enfant
    BEFORE UPDATE ON public.profils
    FOR EACH ROW EXECUTE FUNCTION public.trg_profils_colonnes_enfant();

-- Le trigger de monnaie pose le marqueur transactionnel pour se distinguer d'une
-- ecriture directe par l'enfant. (CREATE OR REPLACE : on reprend 0004 a l'identique
-- en ajoutant la seule ligne set_config.)
CREATE OR REPLACE FUNCTION public.trg_reponses_monnaie()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_gain integer := 0;
BEGIN
    PERFORM set_config('kerskol.calcul', 'on', true);  -- ecriture serveur de confiance

    IF NEW.temps_ms IS NOT NULL AND NEW.temps_ms < 1500 THEN
        v_gain := 0;                                   -- trop rapide pour etre lue
    ELSIF NEW.correct AND NEW.rattrapage THEN
        v_gain := 3;
    ELSIF NEW.correct THEN
        v_gain := 2;
    ELSIF NOT NEW.correct AND NEW.correction_lue THEN
        v_gain := 1;
    END IF;

    IF v_gain <> 0 THEN
        UPDATE public.profils SET monnaie = monnaie + v_gain WHERE id = NEW.profil_id;
    END IF;
    RETURN NEW;
END;
$$;

-- =========================================================================
-- 4. RPC demander_lien_enfant : cree un lien en attente (parent uniquement).
--    Normalise l'email, verifie l'unicite (compte deja relie, parent, doublon).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.demander_lien_enfant(p_profil uuid, p_email text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer uuid;
    v_email text := lower(trim(p_email));
    v_uid   uuid := auth.uid();
    v_cible uuid;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;
    IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RAISE EXCEPTION 'email_invalide';
    END IF;

    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.est_parent_du_foyer(v_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;

    -- Le profil est-il deja relie a un compte ?
    IF EXISTS (SELECT 1 FROM public.profils WHERE id = p_profil AND user_id IS NOT NULL) THEN
        RAISE EXCEPTION 'profil_deja_relie';
    END IF;

    -- Un compte existe deja avec cet email ? Verifier qu'il n'est pas parent
    -- d'un foyer ni deja relie a un autre profil.
    SELECT id INTO v_cible FROM auth.users WHERE lower(email) = v_email LIMIT 1;
    IF v_cible IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.membres_foyer WHERE user_id = v_cible) THEN
            RAISE EXCEPTION 'compte_est_parent';
        END IF;
        IF EXISTS (SELECT 1 FROM public.profils WHERE user_id = v_cible) THEN
            RAISE EXCEPTION 'compte_deja_relie';
        END IF;
    END IF;

    -- Doublons de lien en attente (messages clairs avant la contrainte).
    IF EXISTS (SELECT 1 FROM public.liens_enfant_en_attente WHERE profil_id = p_profil) THEN
        RAISE EXCEPTION 'lien_deja_en_attente';
    END IF;
    IF EXISTS (SELECT 1 FROM public.liens_enfant_en_attente WHERE email = v_email) THEN
        RAISE EXCEPTION 'email_deja_en_attente';
    END IF;

    INSERT INTO public.liens_enfant_en_attente (profil_id, email, cree_par)
    VALUES (p_profil, v_email, v_uid);
END;
$$;

-- =========================================================================
-- 5. RPC delier_compte_enfant : detache le compte (user_id -> NULL), journalise.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.delier_compte_enfant(p_profil uuid)
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

    SELECT foyer_id, user_id INTO v_foyer, v_user
      FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.est_parent_du_foyer(v_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'non_relie';
    END IF;

    UPDATE public.profils SET user_id = NULL WHERE id = p_profil;

    INSERT INTO public.journal_reglages (foyer_id, profil_id, auteur, cle, ancienne, nouvelle)
    VALUES (v_foyer, p_profil, auth.uid(), 'compte_enfant',
            to_jsonb('relie'::text), to_jsonb('delie'::text));
END;
$$;

-- =========================================================================
-- 6. RPC rattacher_si_attendu : au login, relie le compte si un lien l'attend.
--    Renvoie l'id du profil relie (ou deja relie), sinon NULL.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.rattacher_si_attendu()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid    uuid := auth.uid();
    v_email  text;
    v_profil uuid;
    v_lien   uuid;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    -- Deja relie a un profil ? On renvoie ce profil (login suivant de l'enfant).
    SELECT id INTO v_profil FROM public.profils WHERE user_id = v_uid LIMIT 1;
    IF v_profil IS NOT NULL THEN
        RETURN v_profil;
    END IF;

    -- Un parent membre d'un foyer n'est jamais rattache comme enfant.
    IF EXISTS (SELECT 1 FROM public.membres_foyer WHERE user_id = v_uid) THEN
        RETURN NULL;
    END IF;

    SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
    IF v_email IS NULL THEN
        RETURN NULL;
    END IF;

    -- Lien en attente, non expire, pour cet email.
    SELECT id, profil_id INTO v_lien, v_profil
      FROM public.liens_enfant_en_attente
     WHERE email = v_email AND expire_le > now()
     FOR UPDATE;
    IF v_profil IS NULL THEN
        RETURN NULL;
    END IF;

    -- Course : le profil a-t-il ete relie a un autre compte entre-temps ?
    IF EXISTS (SELECT 1 FROM public.profils WHERE id = v_profil AND user_id IS NOT NULL) THEN
        DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;
        RETURN NULL;
    END IF;

    UPDATE public.profils SET user_id = v_uid WHERE id = v_profil;
    DELETE FROM public.liens_enfant_en_attente WHERE id = v_lien;  -- email plus stocke

    INSERT INTO public.journal_reglages (foyer_id, profil_id, auteur, cle, ancienne, nouvelle)
    SELECT foyer_id, id, v_uid, 'compte_enfant', to_jsonb('en_attente'::text), to_jsonb('relie'::text)
      FROM public.profils WHERE id = v_profil;

    RETURN v_profil;
END;
$$;

-- =========================================================================
-- 7. Retrait de l'ancien relier_compte_enfant : il reliait directement
--    (contourne le lien en attente et exige un compte deja existant).
-- =========================================================================
DROP FUNCTION IF EXISTS public.relier_compte_enfant(uuid, text);

-- =========================================================================
-- 8. Droits d'execution des RPC (anon exclu).
-- =========================================================================
REVOKE ALL ON FUNCTION public.demander_lien_enfant(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delier_compte_enfant(uuid)       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rattacher_si_attendu()           FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demander_lien_enfant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delier_compte_enfant(uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.rattacher_si_attendu()           TO authenticated;

-- =========================================================================
-- 9. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0013_liens_enfant')
ON CONFLICT (version) DO NOTHING;
