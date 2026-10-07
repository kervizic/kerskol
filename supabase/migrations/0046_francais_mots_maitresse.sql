-- 0046_francais_mots_maitresse.sql
-- MATIERE FRANCAIS, PHASE 6 : sous-matiere « Les mots de la maitresse ».
--
-- Le PARENT (jamais l'enfant) saisit, dans l'espace parent, des LISTES DE MOTS
-- a apprendre et/ou des TEXTES de dictee donnes par la maitresse. Ces listes
-- deviennent des exercices pour l'enfant. Domaine dedie `mots-maitresse`, deux
-- competences :
--   FR.MAITRESSE.MOTS    les mots a apprendre (QCM orthographe N1-N2, memoriser
--                        puis ecrire N3-N4) ;
--   FR.MAITRESSE.DICTEE  le texte de la maitresse (mot a trou, dictee detective
--                        avec erreurs INJECTEES de facon DETERMINISTE).
--
-- VOIX : aucune synthese a la volee (la voix Naf est pre-generee). Les exercices
-- marchent SANS audio. Aucun audio genere ici.
--
-- SECURITE / DONNEES REELLES :
--   * Tables FOYER-SCOPED (RLS stricte via est_parent_du_foyer) : un foyer ne
--     voit QUE ses listes. L'enfant (compte distinct, non parent) lit via la RPC
--     SECURITY DEFINER maitresse_charger (peut_acceder_profil).
--   * Les CRUD passent par des RPC SECURITY DEFINER (validation + garde-fous).
--   * Pour la dictee detective, le client ne recoit QUE les mots AFFICHES (deja
--     fautifs) + le nombre d'erreurs ; positions / corrections / types restent
--     serveur (meme modele que la dictee globale, migration 0032).
--   * Migration ADDITIVE et IDEMPOTENTE ; aucune donnee reelle ecrite.
--
-- GARDE-FOUS : titre 1..60 ; mots 0 ou 3..20, chaque mot 1..30 ; texte <= 600 ;
-- au moins un contenu jouable (>=3 mots OU un texte) ; au plus 10 listes actives
-- par foyer ; aucun chevron < > (anti-injection HTML).
--
-- VISIBILITE : le domaine `mots-maitresse` est ACTIF par defaut mais le moteur ne
-- le propose QUE s'il existe au moins une liste active (filtrage cote client).
-- Il n'est PAS compte dans le garde-fou « au moins une sous-matiere jouable »
-- (trg_profils_domaines_valides patche ci-dessous) et regler_matieres le
-- RE-AJOUTE toujours (il reste actif quoi que regle le parent).

-- =========================================================================
-- 1. Types d'exercice autorises (ajout au CHECK, idempotent).
-- =========================================================================
ALTER TABLE public.exercices DROP CONSTRAINT IF EXISTS exercices_type_chk;
ALTER TABLE public.exercices ADD CONSTRAINT exercices_type_chk CHECK (type IN (
    'calcul','qcm','texte_trous','dictee','geometrie','vocabulaire','conjugaison',
    'grammaire','mots_invariables','donnees','comprehension',
    'mots_maitresse','dictee_maitresse'));

-- =========================================================================
-- 2. Methodes dediees (reference par exercices.methode).
-- =========================================================================
INSERT INTO public.methodes (code, libelle) VALUES
    ('mots_maitresse',   'Les mots a apprendre de la maitresse'),
    ('dictee_maitresse', 'La dictee de la maitresse (texte du foyer)')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 3. Competences (matiere FR, domaine mots-maitresse), 4 niveaux, ouvertes.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('FR.MAITRESSE.MOTS',   'FR', 'mots-maitresse', 'Les mots a apprendre', 900, 4, true),
    ('FR.MAITRESSE.DICTEE', 'FR', 'mots-maitresse', 'La dictee de la maitresse', 910, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 4. Table FOYER-SCOPED des listes de la maitresse.
--    mots : liste de mots a apprendre (0 = aucun ; sinon 3..20).
--    texte : texte de dictee (null si liste de mots seule). Pre-remplissable
--            plus tard par une saisie photo (le champ accepte deja un texte).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.maitresse_liste (
    id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    foyer_id  uuid        NOT NULL REFERENCES public.foyers (id) ON DELETE CASCADE,
    titre     text        NOT NULL,
    mots      text[]      NOT NULL DEFAULT ARRAY[]::text[],
    texte     text,
    active    boolean     NOT NULL DEFAULT false,
    date_ajout date       NOT NULL DEFAULT current_date,
    cree_par  uuid,
    cree_le   timestamptz NOT NULL DEFAULT now(),
    maj_le    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT maitresse_titre_chk  CHECK (char_length(btrim(titre)) BETWEEN 1 AND 60),
    CONSTRAINT maitresse_mots_nb_chk CHECK (
        COALESCE(array_length(mots, 1), 0) = 0
     OR COALESCE(array_length(mots, 1), 0) BETWEEN 3 AND 20),
    CONSTRAINT maitresse_texte_len_chk CHECK (texte IS NULL OR char_length(texte) <= 600)
);
COMMENT ON TABLE public.maitresse_liste IS
    'Listes de mots et/ou textes de dictee saisis par le PARENT (foyer-scoped, '
    'RLS stricte). Deviennent des exercices pour l''enfant. Le client ne recoit '
    'jamais les erreurs de la dictee avant validation (injection serveur).';

CREATE INDEX IF NOT EXISTS maitresse_liste_foyer_idx  ON public.maitresse_liste (foyer_id);
CREATE INDEX IF NOT EXISTS maitresse_liste_active_idx ON public.maitresse_liste (foyer_id, active);

-- RLS : un PARENT du foyer voit/ecrit ses listes. L'ecriture passe toutefois par
-- les RPC (seul droit direct accorde = SELECT) ; aucune lecture par l'enfant en
-- direct (il passe par maitresse_charger). anon : rien.
ALTER TABLE public.maitresse_liste ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maitresse_liste FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.maitresse_liste FROM anon, authenticated;
DROP POLICY IF EXISTS maitresse_select_parent ON public.maitresse_liste;
CREATE POLICY maitresse_select_parent ON public.maitresse_liste
    FOR SELECT TO authenticated USING (public.est_parent_du_foyer(foyer_id));
GRANT SELECT ON public.maitresse_liste TO authenticated;

-- =========================================================================
-- 5. Validation + sanitisation (trigger BEFORE INSERT/UPDATE). Centralise tous
--    les garde-fous que le CHECK ne peut pas exprimer (par-mot, anti-chevrons,
--    au moins un contenu, plafond de listes actives).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_maitresse_valider()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    m text;
    v_nb_actives integer;
BEGIN
    NEW.titre := btrim(NEW.titre);
    IF NEW.titre ~ '[<>]' THEN
        RAISE EXCEPTION 'maitresse_html' USING DETAIL = 'titre : chevrons interdits';
    END IF;
    IF NEW.texte IS NOT NULL THEN
        IF btrim(NEW.texte) = '' THEN
            NEW.texte := NULL;
        ELSIF NEW.texte ~ '[<>]' THEN
            RAISE EXCEPTION 'maitresse_html' USING DETAIL = 'texte : chevrons interdits';
        END IF;
    END IF;
    -- Mots : trim chacun, rejet des vides / chevrons / trop longs.
    IF NEW.mots IS NULL THEN NEW.mots := ARRAY[]::text[]; END IF;
    FOR i IN 1 .. COALESCE(array_length(NEW.mots, 1), 0) LOOP
        NEW.mots[i] := btrim(NEW.mots[i]);
        m := NEW.mots[i];
        IF m = '' THEN
            RAISE EXCEPTION 'maitresse_mot_vide' USING DETAIL = 'un mot est vide';
        END IF;
        IF m ~ '[<>]' THEN
            RAISE EXCEPTION 'maitresse_html' USING DETAIL = 'mot : chevrons interdits';
        END IF;
        IF char_length(m) > 30 THEN
            RAISE EXCEPTION 'maitresse_mot_long' USING DETAIL = 'un mot depasse 30 caracteres';
        END IF;
    END LOOP;
    -- Au moins un contenu jouable : >= 3 mots OU un texte non vide.
    IF COALESCE(array_length(NEW.mots, 1), 0) < 3 AND NEW.texte IS NULL THEN
        RAISE EXCEPTION 'maitresse_vide'
            USING HINT = 'Mets au moins 3 mots ou un texte de dictee.';
    END IF;
    -- Plafond de listes actives par foyer (10).
    IF NEW.active THEN
        SELECT count(*) INTO v_nb_actives FROM public.maitresse_liste
         WHERE foyer_id = NEW.foyer_id AND active AND id <> NEW.id;
        IF v_nb_actives >= 10 THEN
            RAISE EXCEPTION 'maitresse_trop_actives'
                USING HINT = 'Au plus 10 listes actives a la fois.';
        END IF;
    END IF;
    NEW.maj_le := now();
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS maitresse_valider ON public.maitresse_liste;
CREATE TRIGGER maitresse_valider
    BEFORE INSERT OR UPDATE ON public.maitresse_liste
    FOR EACH ROW EXECUTE FUNCTION public.trg_maitresse_valider();

-- =========================================================================
-- 6. CRUD parent (SECURITY DEFINER ; validation parent du foyer).
-- =========================================================================
-- Cree (p_id NULL) ou met a jour une liste. Les nouvelles listes sont INACTIVES
-- (le parent previsualise puis active). Renvoie l'id de la liste.
CREATE OR REPLACE FUNCTION public.maitresse_upsert(
    p_id    uuid,
    p_foyer uuid,
    p_titre text,
    p_mots  text[],
    p_texte text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_id  uuid;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
    IF NOT public.est_parent_du_foyer(p_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;
    IF p_id IS NULL THEN
        INSERT INTO public.maitresse_liste (foyer_id, titre, mots, texte, cree_par)
        VALUES (p_foyer, p_titre, COALESCE(p_mots, ARRAY[]::text[]), p_texte, v_uid)
        RETURNING id INTO v_id;
    ELSE
        -- La liste doit appartenir au foyer indique (verifie par est_parent).
        UPDATE public.maitresse_liste
           SET titre = p_titre, mots = COALESCE(p_mots, ARRAY[]::text[]), texte = p_texte
         WHERE id = p_id AND foyer_id = p_foyer
        RETURNING id INTO v_id;
        IF v_id IS NULL THEN RAISE EXCEPTION 'liste_introuvable'; END IF;
    END IF;
    RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.maitresse_upsert(uuid, uuid, text, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.maitresse_upsert(uuid, uuid, text, text[], text) TO authenticated;

-- Active / desactive une liste (le plafond de 10 actives est verifie par trigger).
CREATE OR REPLACE FUNCTION public.maitresse_activer(p_id uuid, p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_foyer uuid;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
    SELECT foyer_id INTO v_foyer FROM public.maitresse_liste WHERE id = p_id;
    IF v_foyer IS NULL THEN RAISE EXCEPTION 'liste_introuvable'; END IF;
    IF NOT public.est_parent_du_foyer(v_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;
    UPDATE public.maitresse_liste SET active = p_active WHERE id = p_id;
END $$;
REVOKE ALL ON FUNCTION public.maitresse_activer(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.maitresse_activer(uuid, boolean) TO authenticated;

-- Supprime une liste.
CREATE OR REPLACE FUNCTION public.maitresse_supprimer(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_foyer uuid;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentification requise'; END IF;
    SELECT foyer_id INTO v_foyer FROM public.maitresse_liste WHERE id = p_id;
    IF v_foyer IS NULL THEN RETURN; END IF;
    IF NOT public.est_parent_du_foyer(v_foyer) THEN
        RAISE EXCEPTION 'acces refuse : non parent du foyer';
    END IF;
    DELETE FROM public.maitresse_liste WHERE id = p_id;
END $$;
REVOKE ALL ON FUNCTION public.maitresse_supprimer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.maitresse_supprimer(uuid) TO authenticated;

-- =========================================================================
-- 7. Injection DETERMINISTE des erreurs de la dictee detective sur le texte de
--    la maitresse (aucune aleatoire). Scanne les mots de gauche a droite, pose
--    au plus k erreurs (k = 1 au N1, 2 au N2, 3 au N3, 2 au N4). Types surs,
--    reconnus a la seule forme : homophones est/sont/ont/a/ses, et m devant
--    b/m/p (tambour -> tanbour). La ponctuation et la majuscule de debut sont
--    preservees. Renvoie { mots:[...affiches fautifs...], erreurs:[...], nb }.
--    Les ERREURS ne sont PAS exposees au client (seuls mots + nb le sont).
-- =========================================================================
CREATE OR REPLACE FUNCTION public._maitresse_injecter(p_texte text, p_niveau integer)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
DECLARE
    toks text[]; n integer; i integer; k integer; got integer := 0;
    tok text; lead text; trail text; core text; ncore text;
    fcore text; ftype text; faute text;
    out_toks text[]; erreurs jsonb := '[]'::jsonb;
BEGIN
    toks := regexp_split_to_array(btrim(COALESCE(p_texte, '')), '\s+');
    n := COALESCE(array_length(toks, 1), 0);
    out_toks := toks;
    k := CASE WHEN p_niveau <= 1 THEN 1 WHEN p_niveau = 2 THEN 2
              WHEN p_niveau = 3 THEN 3 ELSE 2 END;
    IF n = 0 THEN
        RETURN jsonb_build_object('mots', to_jsonb(ARRAY[]::text[]), 'erreurs', erreurs, 'nb', 0);
    END IF;
    FOR i IN 1 .. n LOOP
        EXIT WHEN got >= k;
        tok   := toks[i];
        lead  := COALESCE((regexp_match(tok, '^([«"(\[…]*)'))[1], '');
        trail := COALESCE((regexp_match(tok, '([.,;:!?»")\]…]*)$'))[1], '');
        core  := substr(tok, char_length(lead) + 1,
                        GREATEST(char_length(tok) - char_length(lead) - char_length(trail), 0));
        IF core = '' THEN CONTINUE; END IF;
        ncore := lower(public.normaliser_mot(core));
        fcore := NULL; ftype := NULL;
        IF    ncore = 'est'  THEN fcore := 'et';  ftype := 'et_est';
        ELSIF ncore = 'sont' THEN fcore := 'son'; ftype := 'son_sont';
        ELSIF ncore = 'ont'  THEN fcore := 'on';  ftype := 'on_ont';
        ELSIF ncore = 'à'    THEN fcore := 'a';   ftype := 'a_a';
        ELSIF ncore = 'ses'  THEN fcore := 'ces'; ftype := 'ces_ses';
        ELSIF core ~ 'm[bmp]' AND char_length(core) > 3 THEN
            fcore := regexp_replace(core, 'm([bmp])', 'n\1');
            ftype := 'm_mbp';
        END IF;
        IF fcore IS NULL OR public.normaliser_mot(fcore) = public.normaliser_mot(core) THEN
            CONTINUE;
        END IF;
        -- Preserve une majuscule initiale (debut de phrase).
        IF left(core, 1) ~ '[A-ZÀ-Þ]' THEN
            fcore := upper(left(fcore, 1)) || substr(fcore, 2);
        END IF;
        faute := lead || fcore || trail;
        out_toks[i] := faute;
        erreurs := erreurs || jsonb_build_object(
            'position', i, 'faute', faute, 'correction', core, 'type', ftype);
        got := got + 1;
    END LOOP;
    RETURN jsonb_build_object('mots', to_jsonb(out_toks), 'erreurs', erreurs, 'nb', got);
END $$;
REVOKE EXECUTE ON FUNCTION public._maitresse_injecter(text, integer) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 8. REFACTOR dictee : coeur generique _verif_dictee_core(niveau, erreurs, rep)
--    qui prend les erreurs en jsonb. verif_dictee (dictee globale) et la dictee
--    de la maitresse l'appellent -> moteur partage. Comportement observable de
--    verif_dictee INCHANGE (meme forme de sortie ; dictee_test.sql reste vert).
-- =========================================================================
CREATE OR REPLACE FUNCTION public._verif_dictee_core(
    p_niveau integer, p_erreurs jsonb, p_reponses jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE
    v_nb integer; v_trouvees integer; v_corrigees integer;
    v_erreurs jsonb; v_type text; v_fa integer[]; v_juste boolean;
BEGIN
    IF p_erreurs  IS NULL OR jsonb_typeof(p_erreurs)  <> 'array' THEN p_erreurs  := '[]'::jsonb; END IF;
    IF p_reponses IS NULL OR jsonb_typeof(p_reponses) <> 'array' THEN p_reponses := '[]'::jsonb; END IF;

    WITH rep AS (
        SELECT (r->>'pos')::integer AS pos,
               NULLIF(btrim(COALESCE(r->>'cor', '')), '') AS cor
          FROM jsonb_array_elements(p_reponses) r
         WHERE (r->>'pos') ~ '^[0-9]+$'
    ),
    rep_d AS (SELECT pos, (array_agg(cor))[1] AS cor FROM rep GROUP BY pos),
    err AS (
        SELECT (e->>'position')::integer AS position, e->>'faute' AS faute,
               e->>'correction' AS correction, e->>'type' AS type
          FROM jsonb_array_elements(p_erreurs) e
    ),
    joined AS (
        SELECT e.position, e.faute, e.correction, e.type,
               (rd.pos IS NOT NULL) AS trouvee, rd.cor AS cor_saisie,
               CASE WHEN rd.pos IS NULL THEN false
                    WHEN p_niveau <= 1 THEN true
                    ELSE public.normaliser_mot(COALESCE(rd.cor, '')) = public.normaliser_mot(e.correction)
               END AS correction_ok
          FROM err e LEFT JOIN rep_d rd ON rd.pos = e.position
    )
    SELECT count(*),
           count(*) FILTER (WHERE trouvee),
           count(*) FILTER (WHERE correction_ok),
           COALESCE(jsonb_agg(jsonb_build_object(
               'position', position, 'faute', faute, 'correction', correction,
               'type', type, 'trouvee', trouvee, 'correction_ok', correction_ok,
               'cor_saisie', cor_saisie) ORDER BY position), '[]'::jsonb),
           (SELECT j2.type FROM joined j2
             WHERE (NOT j2.trouvee) OR (NOT j2.correction_ok)
             ORDER BY (CASE WHEN NOT j2.trouvee THEN 0 ELSE 1 END), j2.position
             LIMIT 1)
      INTO v_nb, v_trouvees, v_corrigees, v_erreurs, v_type
      FROM joined;

    SELECT array_agg(pos ORDER BY pos) INTO v_fa
      FROM (SELECT DISTINCT (r->>'pos')::integer AS pos
              FROM jsonb_array_elements(p_reponses) r
             WHERE (r->>'pos') ~ '^[0-9]+$') q
     WHERE pos NOT IN (SELECT (e->>'position')::integer FROM jsonb_array_elements(p_erreurs) e);
    v_fa := COALESCE(v_fa, ARRAY[]::integer[]);

    v_juste := (v_trouvees = v_nb)
               AND (p_niveau <= 1 OR v_corrigees = v_nb)
               AND (array_length(v_fa, 1) IS NULL);
    IF v_juste THEN v_type := NULL; END IF;

    RETURN jsonb_build_object(
        'juste', v_juste, 'niveau', p_niveau, 'nb_erreurs', v_nb,
        'trouvees', v_trouvees, 'corrigees', v_corrigees,
        'fausses_alertes', to_jsonb(v_fa), 'type_dominant', v_type, 'erreurs', v_erreurs);
END $$;
REVOKE EXECUTE ON FUNCTION public._verif_dictee_core(integer, jsonb, jsonb)
    FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verif_dictee(
    p_texte integer, p_niveau integer, p_reponses jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE v_err jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'position', position, 'faute', faute,
               'correction', correction, 'type', type) ORDER BY position), '[]'::jsonb)
      INTO v_err
      FROM public.dictee_erreur WHERE texte_id = p_texte;
    RETURN public._verif_dictee_core(p_niveau, v_err, p_reponses);
END $$;
REVOKE EXECUTE ON FUNCTION public.verif_dictee(integer, integer, jsonb)
    FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 9. Chargement cote ENFANT (SECURITY DEFINER) : listes ACTIVES du foyer du
--    profil, avec les donnees d'AFFICHAGE. Pour la dictee, on expose par niveau
--    les mots AFFICHES (deja fautifs) + le nombre d'erreurs ; jamais positions
--    ni corrections. `texte` (correct) sert aux mots a trou.
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
-- 10. Exercices de reference (FK pour reponses.exercice_id + progression).
--     MOTS -> type mots_maitresse ; DICTEE -> type dictee_maitresse.
-- =========================================================================
DO $do$
DECLARE
    v_rows record;
    v_niv integer;
    v_id  uuid;
BEGIN
    FOR v_rows IN (VALUES
        ('FR.MAITRESSE.MOTS',   'mots_maitresse'),
        ('FR.MAITRESSE.DICTEE', 'dictee_maitresse')) AS t(comp, typ)
    LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_rows.comp || ':' || v_niv || ':' || v_rows.typ)::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_rows.comp, v_rows.typ, v_niv, v_rows.typ, true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 11. enregistrer_reponse : branches dediees op = mmots / mtrou / mdictee.
--     Signature INCHANGEE (version 0045, 24 args) -> CREATE OR REPLACE (les
--     GRANT sont conserves). p_op2 = id de liste (uuid en texte) ; p_a = index
--     1-base (mot a apprendre ou mot a trou) ; p_dictee = positions touchees.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.enregistrer_reponse(
    p_id             uuid,
    p_profil         uuid,
    p_seance         uuid,
    p_competence     text,
    p_exercice       uuid,
    p_niveau         integer,
    p_methode        text,
    p_op             text,
    p_a              integer,
    p_b              integer,
    p_reponse        integer,
    p_reste          integer,
    p_fields         integer,
    p_temps_ms       integer,
    p_correction_lue boolean,
    p_rattrapage     boolean,
    p_placement      boolean,
    p_repondu_le     timestamptz,
    p_op2            text DEFAULT NULL,
    p_c              integer DEFAULT NULL,
    p_mode           text DEFAULT 'seance',
    p_reponse_texte  text DEFAULT NULL,
    p_type_faute     text DEFAULT NULL,
    p_dictee         jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer     uuid;
    v_expected  integer;
    v_reste     integer;
    v_correct   boolean;
    v_existe    boolean;
    v_exist_cor boolean;
    v_n         integer;
    v_niv       integer;
    v_mode      text;
    v_type      text;
    v_dictee    jsonb;
    v_tniv      integer;
    v_liste     public.maitresse_liste%ROWTYPE;
    v_toks      text[];
    v_inj       jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    v_mode := COALESCE(p_mode, 'seance');
    IF v_mode NOT IN ('seance', 'defi') THEN
        RAISE EXCEPTION 'mode_inconnu';
    END IF;

    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
    END IF;

    IF v_mode = 'defi' THEN
        SELECT niveau INTO v_niv FROM public.progression
         WHERE profil_id = p_profil AND competence = p_competence;
        IF v_niv IS NULL OR v_niv < 3 THEN
            RAISE EXCEPTION 'defi_non_eligible'
                USING DETAIL = 'le defi ne porte que sur des competences maitrisees (niveau >= 3)';
        END IF;
    END IF;

    SELECT true, correct INTO v_existe, v_exist_cor
      FROM public.reponses WHERE id = p_id;
    IF v_existe THEN
        RETURN jsonb_build_object(
            'ok', true, 'deja', true, 'correct', v_exist_cor,
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
    END IF;

    v_type   := NULLIF(btrim(COALESCE(p_type_faute, '')), '');
    v_dictee := NULL;

    IF p_op = 'lettres' THEN
        IF p_competence <> 'MA.NUM.LIRE_ECRIRE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lettres : competence interdite';
        END IF;
        IF p_a IS NULL OR p_a < 0 OR p_a > 10000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lettres : nombre hors bornes';
        END IF;
        v_correct := public.verif_lettres(p_a, p_reponse_texte);
        v_expected := p_a;
        v_reste := NULL;
    ELSIF p_op = 'conj' THEN
        IF p_competence NOT LIKE 'FR.CONJ.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : competence interdite';
        END IF;
        IF p_op2 IS NULL OR p_a IS NULL OR p_a < 1 OR p_a > 4
           OR p_b IS NULL OR p_b < 1 OR p_b > 6 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : verbe/temps/personne invalides';
        END IF;
        IF p_a = 4 THEN
            IF p_competence <> 'FR.CONJ.PASSE_COMPOSE' THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : passe compose hors competence';
            END IF;
            IF p_c IS NOT NULL AND p_c NOT IN (0, 1) THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : genre invalide';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM public.conjugaison_pc
                            WHERE verbe = p_op2 AND personne = p_b) THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : forme de reference absente';
            END IF;
            v_correct := public.verif_passe_compose(p_op2, p_b, p_c, p_reponse_texte);
        ELSE
            IF p_competence = 'FR.CONJ.PASSE_COMPOSE' THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : temps simple hors competence';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM public.conjugaison
                            WHERE verbe = p_op2 AND temps = p_a AND personne = p_b) THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : forme de reference absente';
            END IF;
            v_correct := public.verif_conjugaison(p_op2, p_a, p_b, p_reponse_texte);
        END IF;
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'dictee' THEN
        IF p_competence <> 'FR.ORTHO.DETECTIVE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : competence interdite';
        END IF;
        IF p_a IS NULL OR p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : texte/niveau invalides';
        END IF;
        SELECT niveau INTO v_tniv FROM public.dictee_texte WHERE id = p_a;
        IF v_tniv IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : texte absent';
        END IF;
        IF v_tniv <> p_niveau THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : niveau incoherent';
        END IF;
        v_dictee  := public.verif_dictee(p_a, p_niveau, p_dictee);
        v_correct := (v_dictee->>'juste')::boolean;
        v_type    := v_dictee->>'type_dominant';
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'gram' THEN
        IF p_competence NOT LIKE 'FR.GRAM.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.grammaire_item g
                        WHERE g.cle = p_op2 AND g.competence = p_competence AND g.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : item de reference absent';
        END IF;
        v_correct := public.verif_grammaire(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'lex' THEN
        IF p_competence NOT LIKE 'FR.VOC.%' AND p_competence NOT LIKE 'FR.MOTS.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.lexique_item g
                        WHERE g.cle = p_op2 AND g.competence = p_competence AND g.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : item de reference absent';
        END IF;
        v_correct := public.verif_lexique(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'geo' THEN
        IF p_competence NOT LIKE 'MA.GEO.%' AND p_competence NOT LIKE 'MA.REPERE.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'geo : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'geo : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'geo : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.geometrie_item g
                        WHERE g.cle = p_op2 AND g.competence = p_competence AND g.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'geo : item de reference absent';
        END IF;
        v_correct := public.verif_geo(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'don' THEN
        IF p_competence NOT LIKE 'MA.DONNEES.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.donnees_item d
                        WHERE d.cle = p_op2 AND d.competence = p_competence AND d.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : item de reference absent';
        END IF;
        v_correct := public.verif_donnees(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'lire' THEN
        IF p_competence NOT LIKE 'FR.LECTURE.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lire : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lire : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lire : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.comprehension_item c
                        WHERE c.cle = p_op2 AND c.competence = p_competence AND c.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lire : item de reference absent';
        END IF;
        v_correct := public.verif_comprehension(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'mmots' THEN
        -- Mots a apprendre : la saisie (QCM ou memorisation) doit egaler le mot
        -- stocke a l'index p_a de la liste active du foyer du profil.
        IF p_competence <> 'FR.MAITRESSE.MOTS' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mmots : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mmots : liste manquante';
        END IF;
        SELECT * INTO v_liste FROM public.maitresse_liste
          WHERE id = p_op2::uuid AND foyer_id = v_foyer AND active = true;
        IF v_liste.id IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mmots : liste absente ou inactive';
        END IF;
        IF p_a IS NULL OR p_a < 1 OR p_a > COALESCE(array_length(v_liste.mots, 1), 0) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mmots : index hors bornes';
        END IF;
        v_correct := public.normaliser_mot(COALESCE(p_reponse_texte, '')) = public.normaliser_mot(v_liste.mots[p_a]);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'mtrou' THEN
        -- Mot a trou : la saisie doit egaler le mot a l'index p_a du texte.
        IF p_competence <> 'FR.MAITRESSE.DICTEE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mtrou : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mtrou : liste manquante';
        END IF;
        SELECT * INTO v_liste FROM public.maitresse_liste
          WHERE id = p_op2::uuid AND foyer_id = v_foyer AND active = true;
        IF v_liste.id IS NULL OR v_liste.texte IS NULL OR btrim(v_liste.texte) = '' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mtrou : liste/texte absent';
        END IF;
        v_toks := regexp_split_to_array(btrim(v_liste.texte), '\s+');
        IF p_a IS NULL OR p_a < 1 OR p_a > COALESCE(array_length(v_toks, 1), 0) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mtrou : index hors bornes';
        END IF;
        v_correct := public.normaliser_mot(COALESCE(p_reponse_texte, '')) = public.normaliser_mot(v_toks[p_a]);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'mdictee' THEN
        -- Dictee detective sur le texte de la maitresse : injection deterministe
        -- puis coeur partage _verif_dictee_core.
        IF p_competence <> 'FR.MAITRESSE.DICTEE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mdictee : competence interdite';
        END IF;
        IF p_op2 IS NULL OR p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mdictee : liste/niveau invalides';
        END IF;
        SELECT * INTO v_liste FROM public.maitresse_liste
          WHERE id = p_op2::uuid AND foyer_id = v_foyer AND active = true;
        IF v_liste.id IS NULL OR v_liste.texte IS NULL OR btrim(v_liste.texte) = '' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mdictee : liste/texte absent';
        END IF;
        v_inj     := public._maitresse_injecter(v_liste.texte, p_niveau);
        v_dictee  := public._verif_dictee_core(p_niveau, v_inj->'erreurs', p_dictee);
        v_correct := (v_dictee->>'juste')::boolean;
        v_type    := v_dictee->>'type_dominant';
        v_expected := NULL;
        v_reste := NULL;
    ELSE
        SELECT expected, reste INTO v_expected, v_reste
          FROM public.verif_calcul(p_competence, p_niveau, p_op, p_a, p_b, p_op2, p_c);
        v_correct := (p_reponse = v_expected)
                     AND (COALESCE(p_fields, 1) < 2 OR p_reste = v_reste);
    END IF;

    SELECT count(*) INTO v_n FROM public.reponses
     WHERE profil_id = p_profil AND recu_le >= now() - interval '1 minute';
    IF v_n >= public._plafond('reponses_par_minute') THEN
        RAISE EXCEPTION 'plafond_reponses_minute';
    END IF;

    SELECT count(*) INTO v_n FROM public.reponses
     WHERE profil_id = p_profil AND recu_le >= date_trunc('day', now());
    IF v_n >= public._plafond('reponses_par_jour') THEN
        RAISE EXCEPTION 'plafond_reponses_jour';
    END IF;

    INSERT INTO public.reponses (
        id, profil_id, seance_id, competence, exercice_id, niveau, methode,
        correct, temps_ms, aide_utilisee, correction_lue, rattrapage, placement,
        repondu_le, mode, type_faute)
    VALUES (
        p_id, p_profil, p_seance, p_competence, p_exercice, p_niveau, p_methode,
        v_correct, p_temps_ms, false, COALESCE(p_correction_lue, false),
        COALESCE(p_rattrapage, false), COALESCE(p_placement, false),
        COALESCE(p_repondu_le, now()), v_mode, v_type);

    RETURN jsonb_build_object(
        'ok', true, 'deja', false,
        'correct', v_correct,
        'reponse_attendue', v_expected,
        'reste_attendu', v_reste,
        'dictee', v_dictee,
        'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'ok', true, 'deja', true,
            'correct', (SELECT correct FROM public.reponses WHERE id = p_id),
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
END;
$$;

-- =========================================================================
-- 12. Garde-fou « au moins une sous-matiere jouable » : on EXCLUT le domaine
--     mots-maitresse (il depend du contenu du foyer, pas d'un reglage). Reprend
--     trg_profils_domaines_valides (0039) a l'identique + cette exclusion.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_profils_domaines_valides()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.domaines_actifs IS NULL OR array_length(NEW.domaines_actifs, 1) IS NULL THEN
        RAISE EXCEPTION 'domaines_actifs_vide';
    END IF;
    IF EXISTS (
        SELECT 1 FROM unnest(NEW.domaines_actifs) AS d
         WHERE NOT EXISTS (SELECT 1 FROM public.competences c WHERE c.domaine = d)
    ) THEN
        RAISE EXCEPTION 'domaines_inconnus'
            USING HINT = 'domaines_actifs doit referencer des domaines de competences.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.competences c
         WHERE c.actif
           AND c.domaine <> 'mots-maitresse'
           AND c.matiere = ANY (NEW.matieres_actives)
           AND c.domaine = ANY (NEW.domaines_actifs)
    ) THEN
        RAISE EXCEPTION 'aucune_sous_matiere_active'
            USING HINT = 'Il faut laisser au moins une sous-matiere active.';
    END IF;
    RETURN NEW;
END;
$$;

-- =========================================================================
-- 13. regler_matieres : le domaine mots-maitresse reste TOUJOURS actif (il est
--     re-ajoute quoi que regle le parent, car sa visibilite depend des listes,
--     pas d'un interrupteur). Reprend 0039 + ce force-add.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.regler_matieres(
    p_profil   uuid,
    p_matieres text[],
    p_domaines text[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer     uuid;
    v_user      uuid;
    v_autorise  boolean;
    v_uid       uuid := auth.uid();
    v_domaines  text[];
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    SELECT foyer_id, user_id, enfant_regle_matieres
      INTO v_foyer, v_user, v_autorise
      FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;

    IF NOT public.est_parent_du_foyer(v_foyer) THEN
        IF v_user IS DISTINCT FROM v_uid THEN
            RAISE EXCEPTION 'acces refuse : ce profil n''est pas le votre';
        END IF;
        IF NOT v_autorise THEN
            RAISE EXCEPTION 'reglage_matieres_desactive'
                USING HINT = 'Le parent n''autorise pas l''enfant a choisir ses matieres.';
        END IF;
    END IF;

    -- Le domaine mots-maitresse reste toujours present (dedup).
    v_domaines := COALESCE(p_domaines, ARRAY[]::text[]);
    IF NOT ('mots-maitresse' = ANY (v_domaines)) THEN
        v_domaines := array_append(v_domaines, 'mots-maitresse');
    END IF;

    PERFORM set_config('kerskol.calcul', 'on', true);
    UPDATE public.profils
       SET matieres_actives = p_matieres,
           domaines_actifs  = v_domaines
     WHERE id = p_profil;
END;
$$;

-- =========================================================================
-- 14. Sous-matiere mots-maitresse ACTIVE par defaut (nouveaux profils) et
--     ajoutee aux profils existants (dont Iris).
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','geometrie','repere','donnees',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe',
        'lecture','mots-maitresse'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'mots-maitresse')
 WHERE NOT ('mots-maitresse' = ANY (domaines_actifs));

-- =========================================================================
-- 15. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0046_francais_mots_maitresse')
ON CONFLICT (version) DO NOTHING;
