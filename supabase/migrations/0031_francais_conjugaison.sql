-- 0031_francais_conjugaison.sql
-- MATIERE FRANCAIS : CONJUGAISON (CE2, programme 2024 cycle 2).
--
-- Trois competences, 4 niveaux chacune : FR.CONJ.PRESENT, FR.CONJ.FUTUR,
-- FR.CONJ.IMPARFAIT (present / futur / imparfait de l'indicatif). Verbes : etre,
-- avoir, verbes reguliers du 1er groupe (+ cas -ger « manger » et -cer « placer »
-- au niveau haut) et les irreguliers frequents du programme (aller, dire, faire,
-- pouvoir, prendre, venir, voir, vouloir).
--
-- Le SERVEUR reste seul juge du juste/faux : une table de conjugaison de
-- REFERENCE (public.conjugaison) porte les formes exactes ; verif_conjugaison
-- normalise la saisie (minuscules, espaces, apostrophes) et la compare a la
-- forme de reference, ACCENTS EXIGES. La table est le MIROIR EXACT de
-- frontend/src/domain/francais/conjugaison.ts (seed genere depuis cette table ;
-- test croise : supabase/tests/conjugaison_test.sql + le golden vitest).
--
-- Nouvelle operation normalisee `op = 'conj'` dans enregistrer_reponse :
--   p_op2            = le verbe (cle d'infinitif, ex. 'chanter', 'etre') ;
--   p_a              = le temps (1 = present, 2 = futur, 3 = imparfait) ;
--   p_b              = la personne (1..6 : je, tu, il, nous, vous, ils) ;
--   p_reponse_texte  = la saisie TEXTE de l'enfant (forme verbale seule) ;
--   p_type_faute     = diagnostic client (INDICATIF, jamais juge).
--
-- Migration ADDITIVE et idempotente : aucune donnee utilisateur (Iris, foyers)
-- n'est modifiee.

-- =========================================================================
-- 1. Type d'exercice « conjugaison » autorise (etend la contrainte existante).
-- =========================================================================
ALTER TABLE public.exercices DROP CONSTRAINT IF EXISTS exercices_type_chk;
ALTER TABLE public.exercices ADD CONSTRAINT exercices_type_chk CHECK (type IN (
    'calcul','qcm','texte_trous','dictee','geometrie','vocabulaire','conjugaison'));

-- =========================================================================
-- 2. Table de conjugaison de REFERENCE (source serveur du juste/faux).
--    temps : 1=present, 2=futur, 3=imparfait ; personne : 1..6.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.conjugaison (
    verbe    text    NOT NULL,
    temps    integer NOT NULL,
    personne integer NOT NULL,
    forme    text    NOT NULL,
    PRIMARY KEY (verbe, temps, personne),
    CONSTRAINT conjugaison_temps_chk    CHECK (temps BETWEEN 1 AND 3),
    CONSTRAINT conjugaison_personne_chk CHECK (personne BETWEEN 1 AND 6),
    CONSTRAINT conjugaison_forme_chk    CHECK (btrim(forme) <> '')
);
COMMENT ON TABLE public.conjugaison IS
    'Formes de reference (CE2) ; miroir de frontend/.../francais/conjugaison.ts. '
    'Le serveur y compare la saisie normalisee, accents exiges.';

-- RLS : lecture seule par les comptes authentifies (coherent avec 0003).
ALTER TABLE public.conjugaison ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conjugaison_select_auth ON public.conjugaison;
CREATE POLICY conjugaison_select_auth ON public.conjugaison
    FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.conjugaison TO authenticated;
-- Pas de GRANT INSERT/UPDATE/DELETE : ecriture impossible cote API.

-- Seed (342 formes) genere depuis la table TS (test croise front <-> SQL).
INSERT INTO public.conjugaison (verbe, temps, personne, forme) VALUES
    ('aimer',1,1,'aime'),('aimer',1,2,'aimes'),('aimer',1,3,'aime'),('aimer',1,4,'aimons'),('aimer',1,5,'aimez'),('aimer',1,6,'aiment'),
    ('aimer',2,1,'aimerai'),('aimer',2,2,'aimeras'),('aimer',2,3,'aimera'),('aimer',2,4,'aimerons'),('aimer',2,5,'aimerez'),('aimer',2,6,'aimeront'),
    ('aimer',3,1,'aimais'),('aimer',3,2,'aimais'),('aimer',3,3,'aimait'),('aimer',3,4,'aimions'),('aimer',3,5,'aimiez'),('aimer',3,6,'aimaient'),
    ('aller',1,1,'vais'),('aller',1,2,'vas'),('aller',1,3,'va'),('aller',1,4,'allons'),('aller',1,5,'allez'),('aller',1,6,'vont'),
    ('aller',2,1,'irai'),('aller',2,2,'iras'),('aller',2,3,'ira'),('aller',2,4,'irons'),('aller',2,5,'irez'),('aller',2,6,'iront'),
    ('aller',3,1,'allais'),('aller',3,2,'allais'),('aller',3,3,'allait'),('aller',3,4,'allions'),('aller',3,5,'alliez'),('aller',3,6,'allaient'),
    ('avoir',1,1,'ai'),('avoir',1,2,'as'),('avoir',1,3,'a'),('avoir',1,4,'avons'),('avoir',1,5,'avez'),('avoir',1,6,'ont'),
    ('avoir',2,1,'aurai'),('avoir',2,2,'auras'),('avoir',2,3,'aura'),('avoir',2,4,'aurons'),('avoir',2,5,'aurez'),('avoir',2,6,'auront'),
    ('avoir',3,1,'avais'),('avoir',3,2,'avais'),('avoir',3,3,'avait'),('avoir',3,4,'avions'),('avoir',3,5,'aviez'),('avoir',3,6,'avaient'),
    ('chanter',1,1,'chante'),('chanter',1,2,'chantes'),('chanter',1,3,'chante'),('chanter',1,4,'chantons'),('chanter',1,5,'chantez'),('chanter',1,6,'chantent'),
    ('chanter',2,1,'chanterai'),('chanter',2,2,'chanteras'),('chanter',2,3,'chantera'),('chanter',2,4,'chanterons'),('chanter',2,5,'chanterez'),('chanter',2,6,'chanteront'),
    ('chanter',3,1,'chantais'),('chanter',3,2,'chantais'),('chanter',3,3,'chantait'),('chanter',3,4,'chantions'),('chanter',3,5,'chantiez'),('chanter',3,6,'chantaient'),
    ('dire',1,1,'dis'),('dire',1,2,'dis'),('dire',1,3,'dit'),('dire',1,4,'disons'),('dire',1,5,'dites'),('dire',1,6,'disent'),
    ('dire',2,1,'dirai'),('dire',2,2,'diras'),('dire',2,3,'dira'),('dire',2,4,'dirons'),('dire',2,5,'direz'),('dire',2,6,'diront'),
    ('dire',3,1,'disais'),('dire',3,2,'disais'),('dire',3,3,'disait'),('dire',3,4,'disions'),('dire',3,5,'disiez'),('dire',3,6,'disaient'),
    ('donner',1,1,'donne'),('donner',1,2,'donnes'),('donner',1,3,'donne'),('donner',1,4,'donnons'),('donner',1,5,'donnez'),('donner',1,6,'donnent'),
    ('donner',2,1,'donnerai'),('donner',2,2,'donneras'),('donner',2,3,'donnera'),('donner',2,4,'donnerons'),('donner',2,5,'donnerez'),('donner',2,6,'donneront'),
    ('donner',3,1,'donnais'),('donner',3,2,'donnais'),('donner',3,3,'donnait'),('donner',3,4,'donnions'),('donner',3,5,'donniez'),('donner',3,6,'donnaient'),
    ('etre',1,1,'suis'),('etre',1,2,'es'),('etre',1,3,'est'),('etre',1,4,'sommes'),('etre',1,5,'êtes'),('etre',1,6,'sont'),
    ('etre',2,1,'serai'),('etre',2,2,'seras'),('etre',2,3,'sera'),('etre',2,4,'serons'),('etre',2,5,'serez'),('etre',2,6,'seront'),
    ('etre',3,1,'étais'),('etre',3,2,'étais'),('etre',3,3,'était'),('etre',3,4,'étions'),('etre',3,5,'étiez'),('etre',3,6,'étaient'),
    ('faire',1,1,'fais'),('faire',1,2,'fais'),('faire',1,3,'fait'),('faire',1,4,'faisons'),('faire',1,5,'faites'),('faire',1,6,'font'),
    ('faire',2,1,'ferai'),('faire',2,2,'feras'),('faire',2,3,'fera'),('faire',2,4,'ferons'),('faire',2,5,'ferez'),('faire',2,6,'feront'),
    ('faire',3,1,'faisais'),('faire',3,2,'faisais'),('faire',3,3,'faisait'),('faire',3,4,'faisions'),('faire',3,5,'faisiez'),('faire',3,6,'faisaient'),
    ('jouer',1,1,'joue'),('jouer',1,2,'joues'),('jouer',1,3,'joue'),('jouer',1,4,'jouons'),('jouer',1,5,'jouez'),('jouer',1,6,'jouent'),
    ('jouer',2,1,'jouerai'),('jouer',2,2,'joueras'),('jouer',2,3,'jouera'),('jouer',2,4,'jouerons'),('jouer',2,5,'jouerez'),('jouer',2,6,'joueront'),
    ('jouer',3,1,'jouais'),('jouer',3,2,'jouais'),('jouer',3,3,'jouait'),('jouer',3,4,'jouions'),('jouer',3,5,'jouiez'),('jouer',3,6,'jouaient'),
    ('manger',1,1,'mange'),('manger',1,2,'manges'),('manger',1,3,'mange'),('manger',1,4,'mangeons'),('manger',1,5,'mangez'),('manger',1,6,'mangent'),
    ('manger',2,1,'mangerai'),('manger',2,2,'mangeras'),('manger',2,3,'mangera'),('manger',2,4,'mangerons'),('manger',2,5,'mangerez'),('manger',2,6,'mangeront'),
    ('manger',3,1,'mangeais'),('manger',3,2,'mangeais'),('manger',3,3,'mangeait'),('manger',3,4,'mangions'),('manger',3,5,'mangiez'),('manger',3,6,'mangeaient'),
    ('parler',1,1,'parle'),('parler',1,2,'parles'),('parler',1,3,'parle'),('parler',1,4,'parlons'),('parler',1,5,'parlez'),('parler',1,6,'parlent'),
    ('parler',2,1,'parlerai'),('parler',2,2,'parleras'),('parler',2,3,'parlera'),('parler',2,4,'parlerons'),('parler',2,5,'parlerez'),('parler',2,6,'parleront'),
    ('parler',3,1,'parlais'),('parler',3,2,'parlais'),('parler',3,3,'parlait'),('parler',3,4,'parlions'),('parler',3,5,'parliez'),('parler',3,6,'parlaient'),
    ('placer',1,1,'place'),('placer',1,2,'places'),('placer',1,3,'place'),('placer',1,4,'plaçons'),('placer',1,5,'placez'),('placer',1,6,'placent'),
    ('placer',2,1,'placerai'),('placer',2,2,'placeras'),('placer',2,3,'placera'),('placer',2,4,'placerons'),('placer',2,5,'placerez'),('placer',2,6,'placeront'),
    ('placer',3,1,'plaçais'),('placer',3,2,'plaçais'),('placer',3,3,'plaçait'),('placer',3,4,'placions'),('placer',3,5,'placiez'),('placer',3,6,'plaçaient'),
    ('pouvoir',1,1,'peux'),('pouvoir',1,2,'peux'),('pouvoir',1,3,'peut'),('pouvoir',1,4,'pouvons'),('pouvoir',1,5,'pouvez'),('pouvoir',1,6,'peuvent'),
    ('pouvoir',2,1,'pourrai'),('pouvoir',2,2,'pourras'),('pouvoir',2,3,'pourra'),('pouvoir',2,4,'pourrons'),('pouvoir',2,5,'pourrez'),('pouvoir',2,6,'pourront'),
    ('pouvoir',3,1,'pouvais'),('pouvoir',3,2,'pouvais'),('pouvoir',3,3,'pouvait'),('pouvoir',3,4,'pouvions'),('pouvoir',3,5,'pouviez'),('pouvoir',3,6,'pouvaient'),
    ('prendre',1,1,'prends'),('prendre',1,2,'prends'),('prendre',1,3,'prend'),('prendre',1,4,'prenons'),('prendre',1,5,'prenez'),('prendre',1,6,'prennent'),
    ('prendre',2,1,'prendrai'),('prendre',2,2,'prendras'),('prendre',2,3,'prendra'),('prendre',2,4,'prendrons'),('prendre',2,5,'prendrez'),('prendre',2,6,'prendront'),
    ('prendre',3,1,'prenais'),('prendre',3,2,'prenais'),('prendre',3,3,'prenait'),('prendre',3,4,'prenions'),('prendre',3,5,'preniez'),('prendre',3,6,'prenaient'),
    ('regarder',1,1,'regarde'),('regarder',1,2,'regardes'),('regarder',1,3,'regarde'),('regarder',1,4,'regardons'),('regarder',1,5,'regardez'),('regarder',1,6,'regardent'),
    ('regarder',2,1,'regarderai'),('regarder',2,2,'regarderas'),('regarder',2,3,'regardera'),('regarder',2,4,'regarderons'),('regarder',2,5,'regarderez'),('regarder',2,6,'regarderont'),
    ('regarder',3,1,'regardais'),('regarder',3,2,'regardais'),('regarder',3,3,'regardait'),('regarder',3,4,'regardions'),('regarder',3,5,'regardiez'),('regarder',3,6,'regardaient'),
    ('trouver',1,1,'trouve'),('trouver',1,2,'trouves'),('trouver',1,3,'trouve'),('trouver',1,4,'trouvons'),('trouver',1,5,'trouvez'),('trouver',1,6,'trouvent'),
    ('trouver',2,1,'trouverai'),('trouver',2,2,'trouveras'),('trouver',2,3,'trouvera'),('trouver',2,4,'trouverons'),('trouver',2,5,'trouverez'),('trouver',2,6,'trouveront'),
    ('trouver',3,1,'trouvais'),('trouver',3,2,'trouvais'),('trouver',3,3,'trouvait'),('trouver',3,4,'trouvions'),('trouver',3,5,'trouviez'),('trouver',3,6,'trouvaient'),
    ('venir',1,1,'viens'),('venir',1,2,'viens'),('venir',1,3,'vient'),('venir',1,4,'venons'),('venir',1,5,'venez'),('venir',1,6,'viennent'),
    ('venir',2,1,'viendrai'),('venir',2,2,'viendras'),('venir',2,3,'viendra'),('venir',2,4,'viendrons'),('venir',2,5,'viendrez'),('venir',2,6,'viendront'),
    ('venir',3,1,'venais'),('venir',3,2,'venais'),('venir',3,3,'venait'),('venir',3,4,'venions'),('venir',3,5,'veniez'),('venir',3,6,'venaient'),
    ('voir',1,1,'vois'),('voir',1,2,'vois'),('voir',1,3,'voit'),('voir',1,4,'voyons'),('voir',1,5,'voyez'),('voir',1,6,'voient'),
    ('voir',2,1,'verrai'),('voir',2,2,'verras'),('voir',2,3,'verra'),('voir',2,4,'verrons'),('voir',2,5,'verrez'),('voir',2,6,'verront'),
    ('voir',3,1,'voyais'),('voir',3,2,'voyais'),('voir',3,3,'voyait'),('voir',3,4,'voyions'),('voir',3,5,'voyiez'),('voir',3,6,'voyaient'),
    ('vouloir',1,1,'veux'),('vouloir',1,2,'veux'),('vouloir',1,3,'veut'),('vouloir',1,4,'voulons'),('vouloir',1,5,'voulez'),('vouloir',1,6,'veulent'),
    ('vouloir',2,1,'voudrai'),('vouloir',2,2,'voudras'),('vouloir',2,3,'voudra'),('vouloir',2,4,'voudrons'),('vouloir',2,5,'voudrez'),('vouloir',2,6,'voudront'),
    ('vouloir',3,1,'voulais'),('vouloir',3,2,'voulais'),('vouloir',3,3,'voulait'),('vouloir',3,4,'voulions'),('vouloir',3,5,'vouliez'),('vouloir',3,6,'voulaient')
ON CONFLICT (verbe, temps, personne) DO UPDATE SET forme = EXCLUDED.forme;

-- =========================================================================
-- 3. Verification serveur : saisie normalisee == forme de reference.
--    Accents EXIGES (normaliser_lettres les conserve). Forme absente -> false.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_conjugaison(
    p_verbe text, p_temps integer, p_personne integer, p_saisie text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
    SELECT COALESCE((
        SELECT public.normaliser_lettres(p_saisie) = public.normaliser_lettres(c.forme)
          FROM public.conjugaison c
         WHERE c.verbe = p_verbe AND c.temps = p_temps AND c.personne = p_personne
    ), false);
$$;
REVOKE EXECUTE ON FUNCTION public.verif_conjugaison(text, integer, integer, text)
    FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 4. Referentiel : competences de conjugaison (matiere FR) + prerequis.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('FR.CONJ.PRESENT',   'FR', 'conjugaison', 'Conjuguer au présent',    510, 4, true),
    ('FR.CONJ.FUTUR',     'FR', 'conjugaison', 'Conjuguer au futur',      520, 4, true),
    ('FR.CONJ.IMPARFAIT', 'FR', 'conjugaison', 'Conjuguer à l''imparfait', 530, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- Futur et imparfait s'ouvrent apres le present niveau 2 (present ouvert d'emblee).
INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.CONJ.FUTUR',     'FR.CONJ.PRESENT', 2),
    ('FR.CONJ.IMPARFAIT', 'FR.CONJ.PRESENT', 2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 5. Exercices de reference (FK pour reponses.exercice_id + progression).
--    exercice_id deterministe = md5('<competence>:<niveau>:conjugaison').
--    La GENERATION (verbes, personnes, QCM/libre) est faite cote client a
--    partir de frontend/.../francais/conjugaison.ts ; ces lignes servent de
--    reference (FK, type, methode, niveau).
-- =========================================================================
DO $$
DECLARE
    v_comp text;
    v_niv  integer;
    v_id   uuid;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['FR.CONJ.PRESENT','FR.CONJ.FUTUR','FR.CONJ.IMPARFAIT'] LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':conjugaison')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'conjugaison', v_niv, 'morphologie', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $$;

-- =========================================================================
-- 6. enregistrer_reponse : branche dediee op = 'conj'. Signature INCHANGEE
--    (identique a 0030) -> CREATE OR REPLACE (les GRANT sont conserves).
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
    p_type_faute     text DEFAULT NULL)
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

    -- Verdict serveur : TEXTE (ecriture en lettres), CONJUGAISON, ou arithmetique.
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
        IF p_op2 IS NULL OR p_a IS NULL OR p_a < 1 OR p_a > 3
           OR p_b IS NULL OR p_b < 1 OR p_b > 6 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : verbe/temps/personne invalides';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.conjugaison
                        WHERE verbe = p_op2 AND temps = p_a AND personne = p_b) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : forme de reference absente';
        END IF;
        v_correct := public.verif_conjugaison(p_op2, p_a, p_b, p_reponse_texte);
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
        COALESCE(p_repondu_le, now()), v_mode, NULLIF(btrim(COALESCE(p_type_faute, '')), ''));

    RETURN jsonb_build_object(
        'ok', true, 'deja', false,
        'correct', v_correct,
        'reponse_attendue', v_expected,
        'reste_attendu', v_reste,
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
-- 7. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0031_francais_conjugaison')
ON CONFLICT (version) DO NOTHING;
