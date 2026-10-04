-- 0030_lettres_ecriture.sql
-- ECRITURE LIBRE D'UN NOMBRE EN TOUTES LETTRES (MA.NUM.LIRE_ECRIRE, niveau 4).
--
-- L'enfant TAPE le nombre en toutes lettres. Le SERVEUR reste seul juge du
-- juste/faux : il genere l'ecriture francaise du nombre en orthographe
-- TRADITIONNELLE et RECTIFIEE 1990, normalise la saisie, et accepte l'une OU
-- l'autre. Toute faute d'accord (vingt/cent/mille), de trait d'union ou
-- d'orthographe rend la reponse FAUSSE.
--
-- Nouvelle operation normalisee `op = 'lettres'` : a = le nombre a ecrire, la
-- reponse est du TEXTE (p_reponse_texte). Le type de faute (diagnostic client,
-- INDICATIF) est enregistre dans reponses.type_faute pour reproposer plus tard
-- un exercice cible. Le serveur ne s'y fie jamais pour decider juste/faux.
--
-- Migration ADDITIVE et idempotente : aucune donnee utilisateur (Iris, foyers)
-- n'est modifiee. Seule la definition de l'exercice N4 LIRE_ECRIRE (reference)
-- passe de « lire (QCM) » a « ecrire en lettres (saisie libre) ».

-- =========================================================================
-- 1. Generateur d'ecriture en lettres (orthographe TRADITIONNELLE), 0..10000.
--    MIROIR EXACT de frontend/src/domain/diagnostic/lettres.ts (test croise).
--    La forme rectifiee 1990 = cette forme dont tous les espaces deviennent des
--    traits d'union (meme regle d'accord). Fonctions IMMUTABLE, pures.
-- =========================================================================
CREATE OR REPLACE FUNCTION public._lettres_sous_cent(n integer)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
DECLARE
    unites text[] := ARRAY['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf',
                            'dix','onze','douze','treize','quatorze','quinze','seize',
                            'dix-sept','dix-huit','dix-neuf'];
    dizaines text[] := ARRAY['','','vingt','trente','quarante','cinquante','soixante'];
    d integer;
    u integer;
BEGIN
    IF n < 20 THEN RETURN unites[n + 1]; END IF;
    IF n < 70 THEN
        d := n / 10; u := n % 10;
        IF u = 0 THEN RETURN dizaines[d + 1]; END IF;
        IF u = 1 THEN RETURN dizaines[d + 1] || ' et un'; END IF;
        RETURN dizaines[d + 1] || '-' || unites[u + 1];
    END IF;
    IF n < 80 THEN
        IF n = 71 THEN RETURN 'soixante et onze'; END IF;
        RETURN 'soixante-' || unites[(n - 60) + 1];
    END IF;
    IF n = 80 THEN RETURN 'quatre-vingts'; END IF;
    RETURN 'quatre-vingt-' || unites[(n - 80) + 1];
END;
$$;

CREATE OR REPLACE FUNCTION public._lettres_sous_mille(n integer)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
DECLARE
    unites text[] := ARRAY['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf'];
    c integer;
    r integer;
    cent text;
BEGIN
    IF n < 100 THEN RETURN public._lettres_sous_cent(n); END IF;
    c := n / 100; r := n % 100;
    IF c = 1 THEN cent := 'cent';
    ELSE cent := unites[c + 1] || ' cent' || CASE WHEN r = 0 THEN 's' ELSE '' END;
    END IF;
    IF r = 0 THEN RETURN cent; END IF;
    RETURN cent || ' ' || public._lettres_sous_cent(r);
END;
$$;

CREATE OR REPLACE FUNCTION public.nombre_en_lettres(n integer)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
DECLARE
    m integer;
    r integer;
    mille text;
BEGIN
    IF n IS NULL OR n < 0 OR n > 10000 THEN
        RAISE EXCEPTION 'nombre_hors_bornes' USING DETAIL = 'nombre_en_lettres attend 0..10000';
    END IF;
    IF n < 1000 THEN RETURN public._lettres_sous_mille(n); END IF;
    m := n / 1000; r := n % 1000;
    IF m = 1 THEN mille := 'mille';
    ELSE mille := public._lettres_sous_mille(m) || ' mille';
    END IF;
    IF r = 0 THEN RETURN mille; END IF;
    RETURN mille || ' ' || public._lettres_sous_mille(r);
END;
$$;

-- =========================================================================
-- 2. Normalisation d'une saisie (MIROIR de normaliser() cote front) :
--    minuscules ; espaces insecables (NBSP, NNBSP, figure space) -> espace ;
--    apostrophes typographiques -> droite ; espaces multiples et de bord
--    supprimes. Les traits d'union et les accents sont CONSERVES.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.normaliser_lettres(s text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
    SELECT btrim(regexp_replace(
        translate(
            translate(lower(coalesce(s, '')),
                      chr(160) || chr(8239) || chr(8199), '   '),
            chr(8217) || chr(700) || chr(8216) || chr(96),
            chr(39) || chr(39) || chr(39) || chr(39)),
        '\s+', ' ', 'g'));
$$;

-- =========================================================================
-- 3. Verification serveur : accepte l'orthographe traditionnelle OU 1990.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_lettres(n integer, saisie text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
    SELECT public.normaliser_lettres(saisie) IN (
        public.normaliser_lettres(public.nombre_en_lettres(n)),
        public.normaliser_lettres(replace(public.nombre_en_lettres(n), ' ', '-'))
    );
$$;

-- Lockdown EXECUTE : helpers internes non exposes a l'API (coherent avec 0017).
REVOKE EXECUTE ON FUNCTION public._lettres_sous_cent(integer)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._lettres_sous_mille(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.nombre_en_lettres(integer)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normaliser_lettres(text)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verif_lettres(integer, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 4. Colonne additive : type de faute (diagnostic INDICATIF, jamais juge).
-- =========================================================================
ALTER TABLE public.reponses ADD COLUMN IF NOT EXISTS type_faute text;
COMMENT ON COLUMN public.reponses.type_faute IS
    'Type de faute diagnostique cote client (indicatif). Le serveur reste seul juge du juste/faux.';

-- =========================================================================
-- 5. Exercice de reference N4 LIRE_ECRIRE : « ecrire en lettres » (saisie libre).
--    exercice_id deterministe = md5(competence:niveau:calcul) (cf. 0023).
-- =========================================================================
UPDATE public.ex_calcul
   SET params = '{"type":"ecrire_lettres","min":100,"max":10000}'::jsonb,
       correction_strategie = 'ecrire_en_lettres'
 WHERE exercice_id = md5('MA.NUM.LIRE_ECRIRE:4:calcul')::uuid;

-- =========================================================================
-- 6. enregistrer_reponse : signature elargie (p_reponse_texte, p_type_faute en
--    fin, defaut NULL). Branche dediee op = 'lettres' (verif_lettres) ; sinon
--    chemin arithmetique inchange. DROP + CREATE (changement de signature).
-- =========================================================================
DROP FUNCTION IF EXISTS public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz, text, integer, text);

CREATE FUNCTION public.enregistrer_reponse(
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

    -- Verdict serveur : branche TEXTE (ecriture en lettres) ou arithmetique.
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

REVOKE ALL ON FUNCTION public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz,
    text, integer, text, text, text)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enregistrer_reponse(
    uuid, uuid, uuid, text, uuid, integer, text, text, integer, integer,
    integer, integer, integer, integer, boolean, boolean, boolean, timestamptz,
    text, integer, text, text, text)
    TO authenticated;

-- =========================================================================
-- 7. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0030_lettres_ecriture')
ON CONFLICT (version) DO NOTHING;
