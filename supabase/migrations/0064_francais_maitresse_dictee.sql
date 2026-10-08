-- 0064_francais_maitresse_dictee.sql
-- « Dictee avec papa ou maman » (sous-matiere mots-maitresse, migration 0046).
--
-- Le PARENT lit a voix haute les MOTS (ou de courtes phrases) d'une liste ACTIVE ;
-- l'enfant les ecrit. Deux modes :
--   VOIX   : l'ecran enfant montre seulement « Mot 3 sur 10 » + une zone de saisie
--            (jamais le mot). Bouton « Mot suivant ». A la fin : correction
--            automatique mot par mot, score, mots a revoir.
--   PAPIER : l'enfant ecrit sur un cahier ; le parent coche juste/faux pour chaque
--            mot (et peut taper la graphie de l'enfant). Meme suivi.
--
-- Le SERVEUR reste SEUL JUGE : maitresse_dictee_enregistrer recalcule chaque mot
-- (normaliser_mot), DIAGNOSTIQUE la faute (accent, lettre muette, doublement,
-- homophone, son) de facon DETERMINISTE (_maitresse_diag, miroir du client),
-- stocke l'historique et met a jour une MEMOIRE PAR MOT (EMA) pour que les mots
-- rates reviennent en priorite dans le moteur. Historique visible cote parent.
--
-- VOIX : aucune synthese a la volee. L'« emplacement photo » de la dictee (scan du
-- cahier) est prevu pour plus tard : colonne photo_prevue (jamais remplie ici).
--
-- SECURITE / DONNEES REELLES : tables FOYER-SCOPED (RLS stricte), ecriture via RPC
-- SECURITY DEFINER (parent OU enfant proprietaire via peut_acceder_profil ;
-- lecture historique reservee au parent). Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Helpers purs de diagnostic (miroir EXACT du client, deterministes).
-- =========================================================================
-- Retire les accents (translate caractere a caractere).
CREATE OR REPLACE FUNCTION public._md_sans_accents(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
    SELECT translate(COALESCE(p, ''),
        'àâäéèêëîïôöùûüç', 'aaaeeeeiioouuuc');
$$;

-- Reduit toute consonne doublee a une seule (poisson -> poison).
CREATE OR REPLACE FUNCTION public._md_sans_doublons(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
    SELECT regexp_replace(COALESCE(p, ''), '([bcdfgjklmnprstz])\1', '\1', 'g');
$$;

-- Reduit les graphies d'un meme SON a une forme canonique (o/au/eau, s/ss/c/ç, g/ge/j).
CREATE OR REPLACE FUNCTION public._md_canon_son(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
    SELECT regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(
           regexp_replace(COALESCE(p, ''),
               'eau', 'o', 'g'),
               'au', 'o', 'g'),
               'ss', 's', 'g'),
               'ç', 's', 'g'),
               'c([eiy])', 's\1', 'g'),
               'ge', 'j', 'g'),
               'g([eiy])', 'j\1', 'g');
$$;

-- Deux mots forment-ils une paire d'homophones grammaticaux (CE2) ?
CREATE OR REPLACE FUNCTION public._md_homophone(c text, s text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
    SELECT (c, s) IN (
        ('est','et'),('et','est'),('sont','son'),('son','sont'),
        ('on','ont'),('ont','on'),('a','à'),('à','a'),('ou','où'),('où','ou'),
        ('la','là'),('là','la'),('ces','ses'),('ses','ces'),('ce','se'),('se','ce'),
        ('mes','mais'),('mais','mes'),('peu','peux'),('peux','peu'));
$$;

-- Type de faute entre la bonne graphie et la saisie (NULL si identiques).
-- Ordre IDENTIQUE au client (diagnostiquerMot) : homophone, accent, doublement,
-- lettre muette, son, puis « lettre » par defaut.
CREATE OR REPLACE FUNCTION public._maitresse_diag(p_correct text, p_saisie text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
DECLARE c text; s text;
BEGIN
    c := public.normaliser_mot(COALESCE(p_correct, ''));
    s := public.normaliser_mot(COALESCE(p_saisie, ''));
    IF c = s THEN RETURN NULL; END IF;
    IF public._md_homophone(c, s) THEN RETURN 'homophone'; END IF;
    IF public._md_sans_accents(c) = public._md_sans_accents(s) THEN RETURN 'accent'; END IF;
    IF public._md_sans_doublons(c) = public._md_sans_doublons(s) THEN RETURN 'doublement'; END IF;
    IF (char_length(c) = char_length(s) + 1 AND left(c, char_length(s)) = s AND right(c, 1) ~ '[stxdpezg]')
    OR (char_length(s) = char_length(c) + 1 AND left(s, char_length(c)) = c AND right(s, 1) ~ '[stxdpezg]')
    THEN RETURN 'lettre_muette'; END IF;
    IF public._md_canon_son(public._md_sans_accents(c)) = public._md_canon_son(public._md_sans_accents(s))
    THEN RETURN 'son'; END IF;
    RETURN 'lettre';
END $$;
REVOKE EXECUTE ON FUNCTION public._maitresse_diag(text, text) FROM PUBLIC, anon;

-- =========================================================================
-- 2. Tables FOYER-SCOPED : en-tete de dictee, mots, memoire par mot (EMA).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.maitresse_dictee (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id    uuid        NOT NULL REFERENCES public.foyers (id) ON DELETE CASCADE,
    profil_id   uuid        NOT NULL REFERENCES public.profils (id) ON DELETE CASCADE,
    liste_id    uuid        REFERENCES public.maitresse_liste (id) ON DELETE SET NULL,
    mode        text        NOT NULL,
    score_juste integer     NOT NULL DEFAULT 0,
    score_total integer     NOT NULL DEFAULT 0,
    photo_prevue boolean    NOT NULL DEFAULT false, -- emplacement « scan du cahier » (futur)
    cree_le     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT maitresse_dictee_mode_chk CHECK (mode IN ('voix', 'papier'))
);
COMMENT ON TABLE public.maitresse_dictee IS
    'En-tete d''une dictee avec papa ou maman (foyer-scoped, RLS stricte).';
CREATE INDEX IF NOT EXISTS maitresse_dictee_profil_idx ON public.maitresse_dictee (profil_id, cree_le DESC);

CREATE TABLE IF NOT EXISTS public.maitresse_dictee_mot (
    dictee_id  uuid    NOT NULL REFERENCES public.maitresse_dictee (id) ON DELETE CASCADE,
    position   integer NOT NULL,
    mot        text    NOT NULL,          -- la bonne graphie (mot de la liste)
    saisie     text,                      -- ce qu'a ecrit l'enfant (peut etre NULL en mode papier)
    correct    boolean NOT NULL,
    type_faute text,                      -- NULL si correct
    PRIMARY KEY (dictee_id, position)
);

CREATE TABLE IF NOT EXISTS public.maitresse_mot_ema (
    profil_id uuid        NOT NULL REFERENCES public.profils (id) ON DELETE CASCADE,
    liste_id  uuid        NOT NULL REFERENCES public.maitresse_liste (id) ON DELETE CASCADE,
    mot_index integer     NOT NULL,       -- 1-base dans maitresse_liste.mots
    ema       real        NOT NULL DEFAULT 0, -- 0 = maitrise ; vers 1 = a revoir
    maj_le    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (profil_id, liste_id, mot_index)
);
COMMENT ON TABLE public.maitresse_mot_ema IS
    'Memoire par mot (moyenne mobile) : plus l''enfant rate un mot, plus son EMA '
    'monte, et plus il revient en priorite dans les exercices et les dictees.';

-- RLS : lecture reservee au PARENT du foyer (l'enfant passe par les RPC). anon: rien.
ALTER TABLE public.maitresse_dictee      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maitresse_dictee      FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.maitresse_dictee_mot  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maitresse_dictee_mot  FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.maitresse_mot_ema     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maitresse_mot_ema     FORCE  ROW LEVEL SECURITY;
REVOKE ALL ON public.maitresse_dictee, public.maitresse_dictee_mot, public.maitresse_mot_ema
    FROM anon, authenticated;

DROP POLICY IF EXISTS maitresse_dictee_select ON public.maitresse_dictee;
CREATE POLICY maitresse_dictee_select ON public.maitresse_dictee
    FOR SELECT TO authenticated USING (public.est_parent_du_foyer(foyer_id));
GRANT SELECT ON public.maitresse_dictee TO authenticated;

DROP POLICY IF EXISTS maitresse_dictee_mot_select ON public.maitresse_dictee_mot;
CREATE POLICY maitresse_dictee_mot_select ON public.maitresse_dictee_mot
    FOR SELECT TO authenticated USING (EXISTS (
        SELECT 1 FROM public.maitresse_dictee d
         WHERE d.id = dictee_id AND public.est_parent_du_foyer(d.foyer_id)));
GRANT SELECT ON public.maitresse_dictee_mot TO authenticated;

DROP POLICY IF EXISTS maitresse_mot_ema_select ON public.maitresse_mot_ema;
CREATE POLICY maitresse_mot_ema_select ON public.maitresse_mot_ema
    FOR SELECT TO authenticated USING (EXISTS (
        SELECT 1 FROM public.profils p
         WHERE p.id = profil_id AND public.est_parent_du_foyer(p.foyer_id)));
GRANT SELECT ON public.maitresse_mot_ema TO authenticated;

-- =========================================================================
-- 3. Enregistrement d'une dictee (SERVEUR SEUL JUGE). p_reponses : tableau
--    d'objets { index:int (1-base dans mots), saisie:text, juste:bool? }.
--    En mode papier, `juste` (coche du parent) fait foi si present ; sinon on
--    compare la saisie. Renvoie le detail mot par mot, le score, les mots a revoir.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.maitresse_dictee_enregistrer(
    p_profil uuid, p_liste uuid, p_mode text, p_reponses jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_foyer uuid; v_liste public.maitresse_liste%ROWTYPE;
    v_mode text; v_did uuid; r jsonb;
    v_idx int; v_mot text; v_saisie text; v_correct boolean; v_type text;
    v_juste int := 0; v_total int := 0; v_mots jsonb := '[]'::jsonb; v_revoir jsonb := '[]'::jsonb;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
    v_mode := COALESCE(p_mode, 'voix');
    IF v_mode NOT IN ('voix', 'papier') THEN RAISE EXCEPTION 'mode_inconnu'; END IF;

    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN RAISE EXCEPTION 'profil_introuvable'; END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN RAISE EXCEPTION 'acces_refuse'; END IF;

    SELECT * INTO v_liste FROM public.maitresse_liste
      WHERE id = p_liste AND foyer_id = v_foyer AND active = true;
    IF v_liste.id IS NULL THEN RAISE EXCEPTION 'liste_absente_ou_inactive'; END IF;
    IF COALESCE(array_length(v_liste.mots, 1), 0) < 1 THEN RAISE EXCEPTION 'liste_sans_mots'; END IF;
    IF p_reponses IS NULL OR jsonb_typeof(p_reponses) <> 'array' THEN RAISE EXCEPTION 'reponses_invalides'; END IF;

    INSERT INTO public.maitresse_dictee (foyer_id, profil_id, liste_id, mode)
    VALUES (v_foyer, p_profil, v_liste.id, v_mode) RETURNING id INTO v_did;

    FOR r IN SELECT * FROM jsonb_array_elements(p_reponses) LOOP
        v_idx := NULLIF(r->>'index', '')::int;
        CONTINUE WHEN v_idx IS NULL OR v_idx < 1 OR v_idx > COALESCE(array_length(v_liste.mots, 1), 0);
        v_mot := v_liste.mots[v_idx];
        v_saisie := NULLIF(btrim(COALESCE(r->>'saisie', '')), '');
        IF v_mode = 'papier' AND jsonb_typeof(r->'juste') = 'boolean' THEN
            v_correct := (r->>'juste')::boolean;
        ELSE
            v_correct := public.normaliser_mot(COALESCE(v_saisie, '')) = public.normaliser_mot(v_mot);
        END IF;
        v_type := CASE WHEN v_correct THEN NULL
                       ELSE public._maitresse_diag(v_mot, COALESCE(v_saisie, '')) END;

        INSERT INTO public.maitresse_dictee_mot (dictee_id, position, mot, saisie, correct, type_faute)
        VALUES (v_did, v_idx, v_mot, v_saisie, v_correct, v_type);

        -- Memoire par mot : EMA = 0.6*ancien + 0.4*(rate ? 1 : 0).
        INSERT INTO public.maitresse_mot_ema (profil_id, liste_id, mot_index, ema, maj_le)
        VALUES (p_profil, v_liste.id, v_idx,
                round((CASE WHEN v_correct THEN 0 ELSE 1 END) * 0.4::numeric, 4), now())
        ON CONFLICT (profil_id, liste_id, mot_index) DO UPDATE
            SET ema = round((public.maitresse_mot_ema.ema * 0.6
                      + (CASE WHEN v_correct THEN 0 ELSE 1 END) * 0.4)::numeric, 4),
                maj_le = now();

        v_total := v_total + 1;
        IF v_correct THEN v_juste := v_juste + 1;
        ELSE v_revoir := v_revoir || to_jsonb(v_mot); END IF;
        v_mots := v_mots || jsonb_build_object(
            'index', v_idx, 'mot', v_mot, 'saisie', v_saisie, 'correct', v_correct, 'type', v_type);
    END LOOP;

    UPDATE public.maitresse_dictee SET score_juste = v_juste, score_total = v_total WHERE id = v_did;

    RETURN jsonb_build_object(
        'dictee_id', v_did, 'mode', v_mode,
        'score_juste', v_juste, 'score_total', v_total,
        'mots', v_mots, 'a_revoir', v_revoir);
END $$;
REVOKE EXECUTE ON FUNCTION public.maitresse_dictee_enregistrer(uuid, uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.maitresse_dictee_enregistrer(uuid, uuid, text, jsonb) TO authenticated;

-- =========================================================================
-- 4. Historique des dictees d'un profil (espace PARENT) : date, mode, score,
--    titre de la liste, mots rates. Reservee au parent du foyer.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.maitresse_historique(p_profil uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_foyer uuid; v_res jsonb;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN RAISE EXCEPTION 'profil_introuvable'; END IF;
    IF NOT public.est_parent_du_foyer(v_foyer) THEN RAISE EXCEPTION 'acces_refuse'; END IF;

    SELECT COALESCE(jsonb_agg(q.ligne ORDER BY (q.ligne->>'cree_le') DESC), '[]'::jsonb) INTO v_res
    FROM (
        SELECT jsonb_build_object(
            'id', d.id, 'cree_le', d.cree_le, 'mode', d.mode,
            'score_juste', d.score_juste, 'score_total', d.score_total,
            'titre', COALESCE(l.titre, '(liste supprimée)'),
            'rates', COALESCE((SELECT jsonb_agg(m.mot ORDER BY m.position)
                                 FROM public.maitresse_dictee_mot m
                                WHERE m.dictee_id = d.id AND NOT m.correct), '[]'::jsonb)
        ) AS ligne
          FROM public.maitresse_dictee d
          LEFT JOIN public.maitresse_liste l ON l.id = d.liste_id
         WHERE d.profil_id = p_profil
         ORDER BY d.cree_le DESC
         LIMIT 30) q;
    RETURN v_res;
END $$;
REVOKE EXECUTE ON FUNCTION public.maitresse_historique(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.maitresse_historique(uuid) TO authenticated;

-- =========================================================================
-- 5. maitresse_charger : AJOUTE la memoire par mot (ema) pour que les exercices
--    priorisent les mots rates. Champ ADDITIF ; le reste est inchange (0046).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.maitresse_charger(p_profil uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_foyer uuid; v_res jsonb;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN RAISE EXCEPTION 'profil_introuvable'; END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN RAISE EXCEPTION 'acces_refuse'; END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id',    l.id,
            'titre', l.titre,
            'mots',  to_jsonb(l.mots),
            'texte', l.texte,
            'ema', COALESCE((
                SELECT jsonb_agg(COALESCE(e.ema, 0) ORDER BY g.i)
                  FROM generate_series(1, COALESCE(array_length(l.mots, 1), 0)) AS g(i)
                  LEFT JOIN public.maitresse_mot_ema e
                         ON e.profil_id = p_profil AND e.liste_id = l.id AND e.mot_index = g.i),
                '[]'::jsonb),
            'dictees', CASE
                WHEN l.texte IS NOT NULL AND btrim(l.texte) <> '' THEN (
                    SELECT jsonb_object_agg(niv::text, jsonb_build_object(
                             'mots', inj->'mots', 'nb', inj->'nb'))
                      FROM generate_series(1, 4) AS niv
                      CROSS JOIN LATERAL (SELECT public._maitresse_injecter(l.texte, niv) AS inj) s)
                ELSE NULL END
        ) ORDER BY l.cree_le), '[]'::jsonb)
      INTO v_res
      FROM public.maitresse_liste l
     WHERE l.foyer_id = v_foyer AND l.active = true;
    RETURN v_res;
END $$;
REVOKE EXECUTE ON FUNCTION public.maitresse_charger(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.maitresse_charger(uuid) TO authenticated;

-- =========================================================================
-- 6. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0064_francais_maitresse_dictee')
ON CONFLICT (version) DO NOTHING;
