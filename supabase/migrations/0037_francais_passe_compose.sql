-- 0037_francais_passe_compose.sql
-- MATIERE FRANCAIS : PASSE COMPOSE (CE2, programme 2024 cycle 2).
--
-- 4e competence de conjugaison : FR.CONJ.PASSE_COMPOSE. Temps COMPOSE =
-- auxiliaire (avoir / etre) au present + participe passe. Verbes du programme :
-- etre, avoir, aller, faire, dire, venir, pouvoir, voir, vouloir, prendre,
-- finir + 1er groupe (chanter, jouer, aimer, regarder, donner, trouver, parler,
-- manger, placer). Au CE2 : accord du participe avec ETRE seulement (elle est
-- allee, ils sont venus), PAS de COD (participe invariable avec AVOIR).
--
-- Table de REFERENCE dediee public.conjugaison_pc(verbe, personne, genre,
-- auxiliaire, forme) : 20 verbes x 6 personnes x 2 genres = 240 lignes. Pour les
-- verbes avec AVOIR, les lignes m et f sont IDENTIQUES (invariable). Miroir
-- EXACT de frontend/src/domain/francais/passe-compose.ts (golden pcGolden() +
-- supabase/tests/passe_compose_test.sql).
--
-- Operation serveur reutilisee : op = 'conj' avec p_a = 4 (passe compose) :
--   p_op2 = verbe ; p_b = personne (1..6) ; p_reponse_texte = la saisie ;
--   p_c  = GENRE impose (0 = masculin, 1 = feminin) ou NULL = genre LIBRE
--          (les deux ecritures m/f sont acceptees : je suis alle / allee).
-- verif_passe_compose compare la saisie normalisee (accents EXIGES) a la ou aux
-- forme(s) de reference. Le SERVEUR reste seul juge.
--
-- Migration ADDITIVE et idempotente : aucune donnee utilisateur modifiee.

-- =========================================================================
-- 1. Table de reference dediee au passe compose (source serveur du juste/faux).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.conjugaison_pc (
    verbe       text    NOT NULL,
    personne    integer NOT NULL,
    genre       text    NOT NULL,
    auxiliaire  text    NOT NULL,
    forme       text    NOT NULL,
    PRIMARY KEY (verbe, personne, genre),
    CONSTRAINT conjugaison_pc_personne_chk CHECK (personne BETWEEN 1 AND 6),
    CONSTRAINT conjugaison_pc_genre_chk    CHECK (genre IN ('m','f')),
    CONSTRAINT conjugaison_pc_aux_chk      CHECK (auxiliaire IN ('avoir','etre')),
    CONSTRAINT conjugaison_pc_forme_chk    CHECK (btrim(forme) <> '')
);
COMMENT ON TABLE public.conjugaison_pc IS
    'Formes de reference du passe compose (CE2) ; miroir de '
    'frontend/.../francais/passe-compose.ts. Accord avec etre uniquement.';

ALTER TABLE public.conjugaison_pc ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conjugaison_pc_select_auth ON public.conjugaison_pc;
CREATE POLICY conjugaison_pc_select_auth ON public.conjugaison_pc
    FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.conjugaison_pc TO authenticated;
-- Pas de GRANT INSERT/UPDATE/DELETE : ecriture impossible cote API.

-- Seed (240 formes) genere depuis la table TS (test croise front <-> SQL).
INSERT INTO public.conjugaison_pc (verbe, personne, genre, auxiliaire, forme) VALUES
    ('aimer',1,'m','avoir','ai aimé'),
    ('aimer',1,'f','avoir','ai aimé'),
    ('aimer',2,'m','avoir','as aimé'),
    ('aimer',2,'f','avoir','as aimé'),
    ('aimer',3,'m','avoir','a aimé'),
    ('aimer',3,'f','avoir','a aimé'),
    ('aimer',4,'m','avoir','avons aimé'),
    ('aimer',4,'f','avoir','avons aimé'),
    ('aimer',5,'m','avoir','avez aimé'),
    ('aimer',5,'f','avoir','avez aimé'),
    ('aimer',6,'m','avoir','ont aimé'),
    ('aimer',6,'f','avoir','ont aimé'),
    ('aller',1,'m','etre','suis allé'),
    ('aller',1,'f','etre','suis allée'),
    ('aller',2,'m','etre','es allé'),
    ('aller',2,'f','etre','es allée'),
    ('aller',3,'m','etre','est allé'),
    ('aller',3,'f','etre','est allée'),
    ('aller',4,'m','etre','sommes allés'),
    ('aller',4,'f','etre','sommes allées'),
    ('aller',5,'m','etre','êtes allés'),
    ('aller',5,'f','etre','êtes allées'),
    ('aller',6,'m','etre','sont allés'),
    ('aller',6,'f','etre','sont allées'),
    ('avoir',1,'m','avoir','ai eu'),
    ('avoir',1,'f','avoir','ai eu'),
    ('avoir',2,'m','avoir','as eu'),
    ('avoir',2,'f','avoir','as eu'),
    ('avoir',3,'m','avoir','a eu'),
    ('avoir',3,'f','avoir','a eu'),
    ('avoir',4,'m','avoir','avons eu'),
    ('avoir',4,'f','avoir','avons eu'),
    ('avoir',5,'m','avoir','avez eu'),
    ('avoir',5,'f','avoir','avez eu'),
    ('avoir',6,'m','avoir','ont eu'),
    ('avoir',6,'f','avoir','ont eu'),
    ('chanter',1,'m','avoir','ai chanté'),
    ('chanter',1,'f','avoir','ai chanté'),
    ('chanter',2,'m','avoir','as chanté'),
    ('chanter',2,'f','avoir','as chanté'),
    ('chanter',3,'m','avoir','a chanté'),
    ('chanter',3,'f','avoir','a chanté'),
    ('chanter',4,'m','avoir','avons chanté'),
    ('chanter',4,'f','avoir','avons chanté'),
    ('chanter',5,'m','avoir','avez chanté'),
    ('chanter',5,'f','avoir','avez chanté'),
    ('chanter',6,'m','avoir','ont chanté'),
    ('chanter',6,'f','avoir','ont chanté'),
    ('dire',1,'m','avoir','ai dit'),
    ('dire',1,'f','avoir','ai dit'),
    ('dire',2,'m','avoir','as dit'),
    ('dire',2,'f','avoir','as dit'),
    ('dire',3,'m','avoir','a dit'),
    ('dire',3,'f','avoir','a dit'),
    ('dire',4,'m','avoir','avons dit'),
    ('dire',4,'f','avoir','avons dit'),
    ('dire',5,'m','avoir','avez dit'),
    ('dire',5,'f','avoir','avez dit'),
    ('dire',6,'m','avoir','ont dit'),
    ('dire',6,'f','avoir','ont dit'),
    ('donner',1,'m','avoir','ai donné'),
    ('donner',1,'f','avoir','ai donné'),
    ('donner',2,'m','avoir','as donné'),
    ('donner',2,'f','avoir','as donné'),
    ('donner',3,'m','avoir','a donné'),
    ('donner',3,'f','avoir','a donné'),
    ('donner',4,'m','avoir','avons donné'),
    ('donner',4,'f','avoir','avons donné'),
    ('donner',5,'m','avoir','avez donné'),
    ('donner',5,'f','avoir','avez donné'),
    ('donner',6,'m','avoir','ont donné'),
    ('donner',6,'f','avoir','ont donné'),
    ('etre',1,'m','avoir','ai été'),
    ('etre',1,'f','avoir','ai été'),
    ('etre',2,'m','avoir','as été'),
    ('etre',2,'f','avoir','as été'),
    ('etre',3,'m','avoir','a été'),
    ('etre',3,'f','avoir','a été'),
    ('etre',4,'m','avoir','avons été'),
    ('etre',4,'f','avoir','avons été'),
    ('etre',5,'m','avoir','avez été'),
    ('etre',5,'f','avoir','avez été'),
    ('etre',6,'m','avoir','ont été'),
    ('etre',6,'f','avoir','ont été'),
    ('faire',1,'m','avoir','ai fait'),
    ('faire',1,'f','avoir','ai fait'),
    ('faire',2,'m','avoir','as fait'),
    ('faire',2,'f','avoir','as fait'),
    ('faire',3,'m','avoir','a fait'),
    ('faire',3,'f','avoir','a fait'),
    ('faire',4,'m','avoir','avons fait'),
    ('faire',4,'f','avoir','avons fait'),
    ('faire',5,'m','avoir','avez fait'),
    ('faire',5,'f','avoir','avez fait'),
    ('faire',6,'m','avoir','ont fait'),
    ('faire',6,'f','avoir','ont fait'),
    ('finir',1,'m','avoir','ai fini'),
    ('finir',1,'f','avoir','ai fini'),
    ('finir',2,'m','avoir','as fini'),
    ('finir',2,'f','avoir','as fini'),
    ('finir',3,'m','avoir','a fini'),
    ('finir',3,'f','avoir','a fini'),
    ('finir',4,'m','avoir','avons fini'),
    ('finir',4,'f','avoir','avons fini'),
    ('finir',5,'m','avoir','avez fini'),
    ('finir',5,'f','avoir','avez fini'),
    ('finir',6,'m','avoir','ont fini'),
    ('finir',6,'f','avoir','ont fini'),
    ('jouer',1,'m','avoir','ai joué'),
    ('jouer',1,'f','avoir','ai joué'),
    ('jouer',2,'m','avoir','as joué'),
    ('jouer',2,'f','avoir','as joué'),
    ('jouer',3,'m','avoir','a joué'),
    ('jouer',3,'f','avoir','a joué'),
    ('jouer',4,'m','avoir','avons joué'),
    ('jouer',4,'f','avoir','avons joué'),
    ('jouer',5,'m','avoir','avez joué'),
    ('jouer',5,'f','avoir','avez joué'),
    ('jouer',6,'m','avoir','ont joué'),
    ('jouer',6,'f','avoir','ont joué'),
    ('manger',1,'m','avoir','ai mangé'),
    ('manger',1,'f','avoir','ai mangé'),
    ('manger',2,'m','avoir','as mangé'),
    ('manger',2,'f','avoir','as mangé'),
    ('manger',3,'m','avoir','a mangé'),
    ('manger',3,'f','avoir','a mangé'),
    ('manger',4,'m','avoir','avons mangé'),
    ('manger',4,'f','avoir','avons mangé'),
    ('manger',5,'m','avoir','avez mangé'),
    ('manger',5,'f','avoir','avez mangé'),
    ('manger',6,'m','avoir','ont mangé'),
    ('manger',6,'f','avoir','ont mangé'),
    ('parler',1,'m','avoir','ai parlé'),
    ('parler',1,'f','avoir','ai parlé'),
    ('parler',2,'m','avoir','as parlé'),
    ('parler',2,'f','avoir','as parlé'),
    ('parler',3,'m','avoir','a parlé'),
    ('parler',3,'f','avoir','a parlé'),
    ('parler',4,'m','avoir','avons parlé'),
    ('parler',4,'f','avoir','avons parlé'),
    ('parler',5,'m','avoir','avez parlé'),
    ('parler',5,'f','avoir','avez parlé'),
    ('parler',6,'m','avoir','ont parlé'),
    ('parler',6,'f','avoir','ont parlé'),
    ('placer',1,'m','avoir','ai placé'),
    ('placer',1,'f','avoir','ai placé'),
    ('placer',2,'m','avoir','as placé'),
    ('placer',2,'f','avoir','as placé'),
    ('placer',3,'m','avoir','a placé'),
    ('placer',3,'f','avoir','a placé'),
    ('placer',4,'m','avoir','avons placé'),
    ('placer',4,'f','avoir','avons placé'),
    ('placer',5,'m','avoir','avez placé'),
    ('placer',5,'f','avoir','avez placé'),
    ('placer',6,'m','avoir','ont placé'),
    ('placer',6,'f','avoir','ont placé'),
    ('pouvoir',1,'m','avoir','ai pu'),
    ('pouvoir',1,'f','avoir','ai pu'),
    ('pouvoir',2,'m','avoir','as pu'),
    ('pouvoir',2,'f','avoir','as pu'),
    ('pouvoir',3,'m','avoir','a pu'),
    ('pouvoir',3,'f','avoir','a pu'),
    ('pouvoir',4,'m','avoir','avons pu'),
    ('pouvoir',4,'f','avoir','avons pu'),
    ('pouvoir',5,'m','avoir','avez pu'),
    ('pouvoir',5,'f','avoir','avez pu'),
    ('pouvoir',6,'m','avoir','ont pu'),
    ('pouvoir',6,'f','avoir','ont pu'),
    ('prendre',1,'m','avoir','ai pris'),
    ('prendre',1,'f','avoir','ai pris'),
    ('prendre',2,'m','avoir','as pris'),
    ('prendre',2,'f','avoir','as pris'),
    ('prendre',3,'m','avoir','a pris'),
    ('prendre',3,'f','avoir','a pris'),
    ('prendre',4,'m','avoir','avons pris'),
    ('prendre',4,'f','avoir','avons pris'),
    ('prendre',5,'m','avoir','avez pris'),
    ('prendre',5,'f','avoir','avez pris'),
    ('prendre',6,'m','avoir','ont pris'),
    ('prendre',6,'f','avoir','ont pris'),
    ('regarder',1,'m','avoir','ai regardé'),
    ('regarder',1,'f','avoir','ai regardé'),
    ('regarder',2,'m','avoir','as regardé'),
    ('regarder',2,'f','avoir','as regardé'),
    ('regarder',3,'m','avoir','a regardé'),
    ('regarder',3,'f','avoir','a regardé'),
    ('regarder',4,'m','avoir','avons regardé'),
    ('regarder',4,'f','avoir','avons regardé'),
    ('regarder',5,'m','avoir','avez regardé'),
    ('regarder',5,'f','avoir','avez regardé'),
    ('regarder',6,'m','avoir','ont regardé'),
    ('regarder',6,'f','avoir','ont regardé'),
    ('trouver',1,'m','avoir','ai trouvé'),
    ('trouver',1,'f','avoir','ai trouvé'),
    ('trouver',2,'m','avoir','as trouvé'),
    ('trouver',2,'f','avoir','as trouvé'),
    ('trouver',3,'m','avoir','a trouvé'),
    ('trouver',3,'f','avoir','a trouvé'),
    ('trouver',4,'m','avoir','avons trouvé'),
    ('trouver',4,'f','avoir','avons trouvé'),
    ('trouver',5,'m','avoir','avez trouvé'),
    ('trouver',5,'f','avoir','avez trouvé'),
    ('trouver',6,'m','avoir','ont trouvé'),
    ('trouver',6,'f','avoir','ont trouvé'),
    ('venir',1,'m','etre','suis venu'),
    ('venir',1,'f','etre','suis venue'),
    ('venir',2,'m','etre','es venu'),
    ('venir',2,'f','etre','es venue'),
    ('venir',3,'m','etre','est venu'),
    ('venir',3,'f','etre','est venue'),
    ('venir',4,'m','etre','sommes venus'),
    ('venir',4,'f','etre','sommes venues'),
    ('venir',5,'m','etre','êtes venus'),
    ('venir',5,'f','etre','êtes venues'),
    ('venir',6,'m','etre','sont venus'),
    ('venir',6,'f','etre','sont venues'),
    ('voir',1,'m','avoir','ai vu'),
    ('voir',1,'f','avoir','ai vu'),
    ('voir',2,'m','avoir','as vu'),
    ('voir',2,'f','avoir','as vu'),
    ('voir',3,'m','avoir','a vu'),
    ('voir',3,'f','avoir','a vu'),
    ('voir',4,'m','avoir','avons vu'),
    ('voir',4,'f','avoir','avons vu'),
    ('voir',5,'m','avoir','avez vu'),
    ('voir',5,'f','avoir','avez vu'),
    ('voir',6,'m','avoir','ont vu'),
    ('voir',6,'f','avoir','ont vu'),
    ('vouloir',1,'m','avoir','ai voulu'),
    ('vouloir',1,'f','avoir','ai voulu'),
    ('vouloir',2,'m','avoir','as voulu'),
    ('vouloir',2,'f','avoir','as voulu'),
    ('vouloir',3,'m','avoir','a voulu'),
    ('vouloir',3,'f','avoir','a voulu'),
    ('vouloir',4,'m','avoir','avons voulu'),
    ('vouloir',4,'f','avoir','avons voulu'),
    ('vouloir',5,'m','avoir','avez voulu'),
    ('vouloir',5,'f','avoir','avez voulu'),
    ('vouloir',6,'m','avoir','ont voulu'),
    ('vouloir',6,'f','avoir','ont voulu')
ON CONFLICT (verbe, personne, genre) DO UPDATE
    SET auxiliaire = EXCLUDED.auxiliaire, forme = EXCLUDED.forme;

-- =========================================================================
-- 2. Verification serveur : saisie normalisee == forme de reference.
--    p_genre : 0 = masculin, 1 = feminin, NULL = libre (m OU f acceptes).
--    Accents EXIGES (normaliser_lettres les conserve).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_passe_compose(
    p_verbe text, p_personne integer, p_genre integer, p_saisie text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
    SELECT COALESCE((
        SELECT bool_or(public.normaliser_lettres(p_saisie) = public.normaliser_lettres(c.forme))
          FROM public.conjugaison_pc c
         WHERE c.verbe = p_verbe AND c.personne = p_personne
           AND (p_genre IS NULL
                OR c.genre = CASE WHEN p_genre = 1 THEN 'f' ELSE 'm' END)
    ), false);
$$;
REVOKE EXECUTE ON FUNCTION public.verif_passe_compose(text, integer, integer, text)
    FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 3. Referentiel : competence FR.CONJ.PASSE_COMPOSE + prerequis.
--    S'ouvre apres le present niveau 2 (comme futur / imparfait).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('FR.CONJ.PASSE_COMPOSE', 'FR', 'conjugaison', 'Conjuguer au passé composé', 540, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.CONJ.PASSE_COMPOSE', 'FR.CONJ.PRESENT', 2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 4. Exercices de reference (FK pour reponses.exercice_id + progression).
-- =========================================================================
DO $$
DECLARE
    v_niv integer;
    v_id  uuid;
BEGIN
    FOR v_niv IN 1..4 LOOP
        v_id := md5('FR.CONJ.PASSE_COMPOSE:' || v_niv || ':conjugaison')::uuid;
        INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
        VALUES (v_id, 'FR.CONJ.PASSE_COMPOSE', 'conjugaison', v_niv, 'morphologie', true)
        ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
            type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
    END LOOP;
END $$;

-- =========================================================================
-- 5. enregistrer_reponse : branche op = 'conj' etendue au passe compose
--    (p_a = 4 -> verif_passe_compose, genre via p_c). Reste INCHANGE.
--    CREATE OR REPLACE (signature identique a 0032, GRANT conserves).
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

    -- Verdict serveur : TEXTE (lettres), CONJUGAISON, DICTEE, ou arithmetique.
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
            -- Passe compose : competence dediee ; genre impose (0/1) ou libre (NULL).
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
            -- Temps simples (present/futur/imparfait) : table 0031.
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
        v_type    := v_dictee->>'type_dominant';  -- serveur = source de verite
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
-- 6. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0037_francais_passe_compose')
ON CONFLICT (version) DO NOTHING;
