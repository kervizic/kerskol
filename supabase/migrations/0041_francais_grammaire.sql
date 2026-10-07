-- 0041_francais_grammaire.sql
-- MATIERE FRANCAIS : GRAMMAIRE (CE2, programme cycle 2 revise 2024).
--
-- Nouvelle SOUS-MATIERE « Grammaire » (domaine `grammaire`, matiere FR),
-- reglable dans « Mes matieres » (enfant) et les reglages parent. Cinq
-- competences, 4 niveaux chacune (escalier + EMA comme les autres, via le
-- trigger de progression 0004) :
--   FR.GRAM.NATURE          nature des mots (nom, verbe, adjectif, determinant,
--                           pronom personnel sujet) ;
--   FR.GRAM.SUJET_VERBE     trouver le verbe conjugue puis son sujet ;
--   FR.GRAM.TYPES_PHRASES   types (declarative / interrogative / exclamative /
--                           imperative) ET formes (affirmative / negative) ;
--   FR.GRAM.PONCTUATION     point, point d'interrogation, point d'exclamation,
--                           majuscule ;
--   FR.GRAM.GROUPE_NOMINAL  determinant + nom + adjectif, genre et nombre DU
--                           groupe (IDENTIFICATION seulement : l'ACCORD
--                           orthographique est deja travaille par la dictee
--                           detective FR.ORTHO.DETECTIVE -> on NE DOUBLONNE PAS,
--                           la grammaire se concentre sur RECONNAITRE les
--                           elements du groupe et son genre / nombre).
--
-- Le SERVEUR reste SEUL JUGE. Une table de reference public.grammaire_item
-- (55 items) est le MIROIR EXACT de frontend/src/domain/francais/grammaire.ts
-- (test croise : supabase/tests/grammaire_test.sql + le golden vitest
-- frontend/.../francais/grammaire.test.ts). verif_grammaire normalise la saisie
-- (minuscules, espaces, apostrophes ; ponctuation de bord retiree pour un mot ;
-- ACCENTS EXIGES) et la compare a `attendu`.
--
-- Nouvelle operation normalisee `op = 'gram'` dans enregistrer_reponse :
--   p_op2            = la cle de l'item (grammaire_item.cle) ;
--   p_reponse_texte  = la saisie de l'enfant (mot clique, choix QCM, texte libre).
-- Signature de enregistrer_reponse INCHANGEE (identique a 0037) -> CREATE OR
-- REPLACE, les GRANT sont conserves.
--
-- Securite / donnees reelles : migration ADDITIVE et IDEMPOTENTE. La
-- sous-matiere `grammaire` est ajoutee ACTIVE au defaut de domaines_actifs ET
-- aux profils existants (dont Iris) ; comme on ne fait qu'AJOUTER une
-- sous-matiere, le garde-fou « au moins une sous-matiere jouable » (0039) reste
-- trivialement satisfait. Le domaine `grammaire` existe (etape 4) AVANT toute
-- ecriture de profil (etape 7), donc profils_domaines_valides l'accepte.

-- =========================================================================
-- 1. Type d'exercice « grammaire » autorise (etend la contrainte existante).
-- =========================================================================
ALTER TABLE public.exercices DROP CONSTRAINT IF EXISTS exercices_type_chk;
ALTER TABLE public.exercices ADD CONSTRAINT exercices_type_chk CHECK (type IN (
    'calcul','qcm','texte_trous','dictee','geometrie','vocabulaire','conjugaison','grammaire'));

-- =========================================================================
-- 2. Methode pedagogique (reference par exercices.methode).
-- =========================================================================
INSERT INTO public.methodes (code, libelle) VALUES
    ('grammaire', 'Grammaire explicite (manipulation de phrases)')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 3. Table de REFERENCE (source serveur du juste/faux).
--    cle       : identifiant stable de l'item (miroir de grammaire.ts) ;
--    competence: FR.GRAM.* ; niveau : 1..4 ;
--    format    : 'qcm' | 'clic' | 'texte' (pilote la normalisation) ;
--    attendu   : la bonne reponse (normalisee a la comparaison).
--    Les consignes, phrases et explications vivent cote client (grammaire.ts) :
--    le serveur n'a besoin QUE de la cle, du format et de la reponse attendue.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.grammaire_item (
    cle        text    PRIMARY KEY,
    competence text    NOT NULL REFERENCES public.competences (code),
    niveau     integer NOT NULL,
    format     text    NOT NULL,
    attendu    text    NOT NULL,
    CONSTRAINT grammaire_item_comp_chk   CHECK (competence LIKE 'FR.GRAM.%'),
    CONSTRAINT grammaire_item_niveau_chk CHECK (niveau BETWEEN 1 AND 4),
    CONSTRAINT grammaire_item_format_chk CHECK (format IN ('qcm','clic','texte')),
    CONSTRAINT grammaire_item_attendu_chk CHECK (btrim(attendu) <> '')
);
COMMENT ON TABLE public.grammaire_item IS
    'Items de reference de la grammaire (CE2) ; miroir de '
    'frontend/.../francais/grammaire.ts. Le serveur y compare la saisie '
    'normalisee (accents exiges). Table SERVEUR : aucun GRANT a l''API.';

-- Table interne : ni anon ni authenticated n'y accedent (lue en SECURITY DEFINER
-- via enregistrer_reponse / verif_grammaire). Le client tient deja la banque.
ALTER TABLE public.grammaire_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammaire_item FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.grammaire_item FROM anon, authenticated;

-- Les competences doivent exister AVANT le seed (FK). On insere d'abord le
-- referentiel (etape 4), puis les items (etape 5).

-- =========================================================================
-- 4. Referentiel : competences de grammaire (matiere FR, domaine `grammaire`).
--    Ouvertes d'emblee (le francais s'active par profil ; pas de prerequis
--    bloquant entre competences de grammaire au CE2).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('FR.GRAM.NATURE',         'FR', 'grammaire', 'Reconnaître la nature des mots', 700, 4, true),
    ('FR.GRAM.SUJET_VERBE',    'FR', 'grammaire', 'Trouver le verbe et son sujet',  710, 4, true),
    ('FR.GRAM.TYPES_PHRASES',  'FR', 'grammaire', 'Types et formes de phrases',     720, 4, true),
    ('FR.GRAM.PONCTUATION',    'FR', 'grammaire', 'La ponctuation et la majuscule', 730, 4, true),
    ('FR.GRAM.GROUPE_NOMINAL', 'FR', 'grammaire', 'Le groupe nominal',              740, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 5. Seed des 55 items (genere depuis grammaire.ts ; test croise front <-> SQL).
-- =========================================================================
INSERT INTO public.grammaire_item (cle, competence, niveau, format, attendu) VALUES
    ('nature-n1-nom', 'FR.GRAM.NATURE', 1, 'qcm', 'chat'),
    ('nature-n1-verbe', 'FR.GRAM.NATURE', 1, 'qcm', 'joue'),
    ('nature-n1-adjectif', 'FR.GRAM.NATURE', 1, 'qcm', 'grand'),
    ('nature-n1-determinant', 'FR.GRAM.NATURE', 1, 'qcm', 'le'),
    ('nature-n1-pronom', 'FR.GRAM.NATURE', 1, 'qcm', 'elle'),
    ('nature-n2-nom', 'FR.GRAM.NATURE', 2, 'clic', 'chien'),
    ('nature-n2-verbe', 'FR.GRAM.NATURE', 2, 'clic', 'chante'),
    ('nature-n2-adjectif', 'FR.GRAM.NATURE', 2, 'clic', 'petit'),
    ('nature-n2-determinant', 'FR.GRAM.NATURE', 2, 'clic', 'le'),
    ('nature-n2-pronom', 'FR.GRAM.NATURE', 2, 'clic', 'elle'),
    ('nature-n3-verbe', 'FR.GRAM.NATURE', 3, 'clic', 'joue'),
    ('nature-n3-nom', 'FR.GRAM.NATURE', 3, 'clic', 'télévision'),
    ('nature-n3-adjectif', 'FR.GRAM.NATURE', 3, 'clic', 'rouge'),
    ('nature-n3-determinant', 'FR.GRAM.NATURE', 3, 'clic', 'mon'),
    ('nature-n4-verbe', 'FR.GRAM.NATURE', 4, 'texte', 'volent'),
    ('nature-n4-nom', 'FR.GRAM.NATURE', 4, 'texte', 'bateau'),
    ('nature-n4-adjectif', 'FR.GRAM.NATURE', 4, 'texte', 'grande'),
    ('sv-n1-verbe', 'FR.GRAM.SUJET_VERBE', 1, 'qcm', 'aboie'),
    ('sv-n1-sujet', 'FR.GRAM.SUJET_VERBE', 1, 'qcm', 'La fille'),
    ('sv-n2-verbe', 'FR.GRAM.SUJET_VERBE', 2, 'clic', 'dort'),
    ('sv-n2-sujet-pronom', 'FR.GRAM.SUJET_VERBE', 2, 'clic', 'elle'),
    ('sv-n2-sujet-nom', 'FR.GRAM.SUJET_VERBE', 2, 'clic', 'paul'),
    ('sv-n3-verbe', 'FR.GRAM.SUJET_VERBE', 3, 'clic', 'partiront'),
    ('sv-n3-sujet', 'FR.GRAM.SUJET_VERBE', 3, 'clic', 'lucie'),
    ('sv-n4-sujet', 'FR.GRAM.SUJET_VERBE', 4, 'texte', 'nous'),
    ('sv-n4-verbe', 'FR.GRAM.SUJET_VERBE', 4, 'texte', 'écoutent'),
    ('types-n1-question', 'FR.GRAM.TYPES_PHRASES', 1, 'qcm', 'Elle pose une question'),
    ('types-n1-ordre', 'FR.GRAM.TYPES_PHRASES', 1, 'qcm', 'Elle donne un ordre'),
    ('types-n1-raconte', 'FR.GRAM.TYPES_PHRASES', 1, 'qcm', 'Elle raconte quelque chose'),
    ('types-n2-emotion', 'FR.GRAM.TYPES_PHRASES', 2, 'qcm', 'Elle montre une émotion forte'),
    ('types-n2-negative', 'FR.GRAM.TYPES_PHRASES', 2, 'qcm', 'Elle dit non, c''est une phrase négative'),
    ('types-n2-affirmative', 'FR.GRAM.TYPES_PHRASES', 2, 'qcm', 'Elle dit oui, c''est une phrase affirmative'),
    ('types-n3-interro', 'FR.GRAM.TYPES_PHRASES', 3, 'qcm', 'Interrogative'),
    ('types-n3-imperative', 'FR.GRAM.TYPES_PHRASES', 3, 'qcm', 'Impérative'),
    ('types-n3-declarative', 'FR.GRAM.TYPES_PHRASES', 3, 'qcm', 'Déclarative'),
    ('types-n4-exclamative', 'FR.GRAM.TYPES_PHRASES', 4, 'qcm', 'Exclamative'),
    ('types-n4-interro', 'FR.GRAM.TYPES_PHRASES', 4, 'qcm', 'Interrogative'),
    ('types-n4-negative', 'FR.GRAM.TYPES_PHRASES', 4, 'qcm', 'Négative'),
    ('ponct-n1-point', 'FR.GRAM.PONCTUATION', 1, 'qcm', '.'),
    ('ponct-n1-interro', 'FR.GRAM.PONCTUATION', 1, 'qcm', '?'),
    ('ponct-n2-exclam', 'FR.GRAM.PONCTUATION', 2, 'qcm', '!'),
    ('ponct-n2-interro', 'FR.GRAM.PONCTUATION', 2, 'qcm', '?'),
    ('ponct-n3-majuscule', 'FR.GRAM.PONCTUATION', 3, 'clic', 'paris'),
    ('ponct-n3-majuscule2', 'FR.GRAM.PONCTUATION', 3, 'clic', 'julie'),
    ('ponct-n4-point', 'FR.GRAM.PONCTUATION', 4, 'qcm', '.'),
    ('ponct-n4-exclam', 'FR.GRAM.PONCTUATION', 4, 'qcm', '!'),
    ('gn-n1-pluriel', 'FR.GRAM.GROUPE_NOMINAL', 1, 'qcm', 'Au pluriel'),
    ('gn-n1-singulier', 'FR.GRAM.GROUPE_NOMINAL', 1, 'qcm', 'Au singulier'),
    ('gn-n2-determinant', 'FR.GRAM.GROUPE_NOMINAL', 2, 'clic', 'les'),
    ('gn-n2-nom', 'FR.GRAM.GROUPE_NOMINAL', 2, 'clic', 'arbre'),
    ('gn-n2-adjectif', 'FR.GRAM.GROUPE_NOMINAL', 2, 'clic', 'jolie'),
    ('gn-n3-feminin', 'FR.GRAM.GROUPE_NOMINAL', 3, 'qcm', 'Féminin'),
    ('gn-n3-adjectif', 'FR.GRAM.GROUPE_NOMINAL', 3, 'clic', 'beau'),
    ('gn-n4-nom', 'FR.GRAM.GROUPE_NOMINAL', 4, 'texte', 'histoire'),
    ('gn-n4-adjectif', 'FR.GRAM.GROUPE_NOMINAL', 4, 'texte', 'long')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 6. Verification serveur : saisie normalisee == `attendu`.
--    qcm   -> normaliser_lettres (accents gardes, minuscules, apostrophes) ;
--    clic / texte -> normaliser_mot (en plus, ponctuation de bord retiree, car
--    on clique / tape UN mot). Accents EXIGES. Item absent -> false.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_grammaire(p_cle text, p_saisie text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
    SELECT COALESCE((
        SELECT CASE WHEN g.format = 'qcm'
                    THEN public.normaliser_lettres(p_saisie) = public.normaliser_lettres(g.attendu)
                    ELSE public.normaliser_mot(p_saisie)     = public.normaliser_mot(g.attendu)
               END
          FROM public.grammaire_item g WHERE g.cle = p_cle
    ), false);
$$;
REVOKE EXECUTE ON FUNCTION public.verif_grammaire(text, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 7. Exercices de reference (FK pour reponses.exercice_id + progression).
--    exercice_id deterministe = md5('<competence>:<niveau>:grammaire').
--    La GENERATION (choix de l'item, rendu QCM/clic/texte) est faite cote
--    client a partir de grammaire.ts ; ces lignes servent de reference.
-- =========================================================================
DO $$
DECLARE
    v_comp text;
    v_niv  integer;
    v_id   uuid;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY[
        'FR.GRAM.NATURE','FR.GRAM.SUJET_VERBE','FR.GRAM.TYPES_PHRASES',
        'FR.GRAM.PONCTUATION','FR.GRAM.GROUPE_NOMINAL'
    ] LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':grammaire')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'grammaire', v_niv, 'grammaire', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $$;

-- =========================================================================
-- 8. enregistrer_reponse : branche dediee op = 'gram'. Signature INCHANGEE
--    (identique a 0037) -> CREATE OR REPLACE (les GRANT sont conserves).
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

    -- Verdict serveur : TEXTE (lettres), CONJUGAISON, DICTEE, GRAMMAIRE, ou arithmetique.
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
        -- L'item de reference doit exister ET coller a la competence / au niveau.
        IF NOT EXISTS (SELECT 1 FROM public.grammaire_item g
                        WHERE g.cle = p_op2 AND g.competence = p_competence AND g.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : item de reference absent';
        END IF;
        v_correct := public.verif_grammaire(p_op2, p_reponse_texte);
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
-- 9. Sous-matiere `grammaire` ACTIVE par defaut (nouveaux profils) et ajoutee
--    aux profils existants (dont Iris). On n'AJOUTE qu'une sous-matiere ->
--    garde-fou « au moins une sous-matiere jouable » trivialement respecte.
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions',
        'grammaire','conjugaison','orthographe'
    ]::text[];

-- Profils existants : ajoute `grammaire` a ceux qui ne l'ont pas encore.
-- Guard NOT ANY -> idempotent. Declenche profils_domaines_valides (ok, le
-- domaine existe) et la journalisation du reglage.
UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'grammaire')
 WHERE NOT ('grammaire' = ANY (domaines_actifs));

-- =========================================================================
-- 10. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0041_francais_grammaire')
ON CONFLICT (version) DO NOTHING;
