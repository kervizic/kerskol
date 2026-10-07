-- 0044_maths_donnees.sql
-- MATIERE MATHS, PHASE 4 : nouvelle SOUS-MATIERE « TABLEAUX ET GRAPHIQUES »
-- (CE2, cycle 2 revise 2024), domaine dedie `donnees`, batie sur l'architecture
-- de la geometrie (phase 3) :
--
--   MA.DONNEES.TABLEAU      lire un tableau simple puis a double entree ;
--   MA.DONNEES.COMPLETER    completer un tableau (case manquante, total) ;
--   MA.DONNEES.BARRES       lire un diagramme en barres, regler / completer une
--                           barre ;
--   MA.DONNEES.PICTOGRAMME  lire un pictogramme (une image vaut n objets) ;
--   MA.DONNEES.COMPARER     comparer a partir des donnees (combien de plus, de
--                           moins, lequel le plus).
--
-- Pas de doublon avec « Problemes » : chaque item renvoie a une REPRESENTATION
-- affichee (tableau, barres, pictogramme) qu'il faut LIRE ; aucune mascotte, ni
-- histoire. Aucune donnee de calendrier (jamais « par jour / par mois »).
--
-- REUTILISATION (meme patron que 0043) : meme format d'item (qcm / clic / texte /
-- grille), meme principe « le SERVEUR reste SEUL JUGE » via une cle d'item. On
-- ajoute UNE table de reference public.donnees_item (miroir EXACT de
-- frontend/.../donnees/donnees.ts, test croise donnees_test.sql + golden vitest)
-- et UNE op dediee op = 'don' dans enregistrer_reponse (verif_donnees). Les
-- exercices sont de type 'donnees' (AJOUTE au CHECK) ; la generation (tableaux,
-- barres, choix de l'item) est faite cote client (composant <Donnees>).
--
-- Securite / donnees reelles : migration ADDITIVE et IDEMPOTENTE. La sous-matiere
-- est ajoutee ACTIVE au defaut de domaines_actifs ET aux profils existants (dont
-- Iris) ; on n'AJOUTE qu'une sous-matiere -> le garde-fou << au moins une
-- sous-matiere jouable >> (0039) reste trivialement satisfait. Le domaine existe
-- (etape 4) AVANT toute ecriture de profil (etape 8).

-- =========================================================================
-- 1. Type d'exercice 'donnees' autorise (ajout au CHECK, idempotent).
-- =========================================================================
ALTER TABLE public.exercices DROP CONSTRAINT IF EXISTS exercices_type_chk;
ALTER TABLE public.exercices ADD CONSTRAINT exercices_type_chk CHECK (type IN (
    'calcul','qcm','texte_trous','dictee','geometrie','vocabulaire','conjugaison',
    'grammaire','mots_invariables','donnees'));

-- =========================================================================
-- 2. Methode pedagogique dediee (reference par exercices.methode).
-- =========================================================================
INSERT INTO public.methodes (code, libelle) VALUES
    ('donnees', 'Lire et construire des tableaux et des graphiques')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 3. Table de REFERENCE (source serveur du juste/faux), miroir de donnees.ts.
--    Meme forme que geometrie_item ; couvre MA.DONNEES.*.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.donnees_item (
    cle        text    PRIMARY KEY,
    competence text    NOT NULL REFERENCES public.competences (code),
    niveau     integer NOT NULL,
    format     text    NOT NULL,
    attendu    text    NOT NULL,
    CONSTRAINT donnees_item_comp_chk   CHECK (competence LIKE 'MA.DONNEES.%'),
    CONSTRAINT donnees_item_niveau_chk CHECK (niveau BETWEEN 1 AND 4),
    CONSTRAINT donnees_item_format_chk CHECK (format IN ('qcm','clic','texte','grille')),
    CONSTRAINT donnees_item_attendu_chk CHECK (btrim(attendu) <> '')
);
COMMENT ON TABLE public.donnees_item IS
    'Items de reference des tableaux et graphiques (CE2) ; miroir de '
    'frontend/.../donnees/donnees.ts. Le serveur y compare la saisie '
    'normalisee. Table SERVEUR : aucun GRANT a l''API.';
ALTER TABLE public.donnees_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donnees_item FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.donnees_item FROM anon, authenticated;

-- =========================================================================
-- 4. Referentiel : competences (matiere MA, domaine donnees). Ouvertes d'emblee
--    (pas de prerequis bloquant au CE2 ; la sous-matiere s'active par profil).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('MA.DONNEES.TABLEAU',     'MA', 'donnees', 'Lire un tableau', 670, 4, true),
    ('MA.DONNEES.COMPLETER',   'MA', 'donnees', 'Compléter un tableau', 680, 4, true),
    ('MA.DONNEES.BARRES',      'MA', 'donnees', 'Le diagramme en barres', 690, 4, true),
    ('MA.DONNEES.PICTOGRAMME', 'MA', 'donnees', 'Le pictogramme', 700, 4, true),
    ('MA.DONNEES.COMPARER',    'MA', 'donnees', 'Comparer des données', 710, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 5. Seed des items (genere depuis donnees.ts ; test croise front <-> SQL).
--    40 items : 5 competences x 4 niveaux x 2, au moins 1 item par (comp,niveau).
-- =========================================================================
INSERT INTO public.donnees_item (cle, competence, niveau, format, attendu) VALUES
    -- MA.DONNEES.TABLEAU
    ('don-tab-n1-a', 'MA.DONNEES.TABLEAU', 1, 'qcm',   '3'),
    ('don-tab-n1-b', 'MA.DONNEES.TABLEAU', 1, 'qcm',   '7'),
    ('don-tab-n2-a', 'MA.DONNEES.TABLEAU', 2, 'clic',  'Zoé'),
    ('don-tab-n2-b', 'MA.DONNEES.TABLEAU', 2, 'qcm',   '3'),
    ('don-tab-n3-a', 'MA.DONNEES.TABLEAU', 3, 'qcm',   '4'),
    ('don-tab-n3-b', 'MA.DONNEES.TABLEAU', 3, 'qcm',   '6'),
    ('don-tab-n4-a', 'MA.DONNEES.TABLEAU', 4, 'texte', '2'),
    ('don-tab-n4-b', 'MA.DONNEES.TABLEAU', 4, 'texte', '8'),
    -- MA.DONNEES.COMPLETER
    ('don-comp-n1-a', 'MA.DONNEES.COMPLETER', 1, 'qcm',   '4'),
    ('don-comp-n1-b', 'MA.DONNEES.COMPLETER', 1, 'qcm',   '3'),
    ('don-comp-n2-a', 'MA.DONNEES.COMPLETER', 2, 'qcm',   '5'),
    ('don-comp-n2-b', 'MA.DONNEES.COMPLETER', 2, 'qcm',   '4'),
    ('don-comp-n3-a', 'MA.DONNEES.COMPLETER', 3, 'qcm',   '3'),
    ('don-comp-n3-b', 'MA.DONNEES.COMPLETER', 3, 'qcm',   '6'),
    ('don-comp-n4-a', 'MA.DONNEES.COMPLETER', 4, 'texte', '3'),
    ('don-comp-n4-b', 'MA.DONNEES.COMPLETER', 4, 'texte', '5'),
    -- MA.DONNEES.BARRES
    ('don-bar-n1-a', 'MA.DONNEES.BARRES', 1, 'qcm',    '6'),
    ('don-bar-n1-b', 'MA.DONNEES.BARRES', 1, 'qcm',    '7'),
    ('don-bar-n2-a', 'MA.DONNEES.BARRES', 2, 'clic',   'bleu'),
    ('don-bar-n2-b', 'MA.DONNEES.BARRES', 2, 'clic',   'vélo'),
    ('don-bar-n3-a', 'MA.DONNEES.BARRES', 3, 'grille', '5'),
    ('don-bar-n3-b', 'MA.DONNEES.BARRES', 3, 'grille', '7'),
    ('don-bar-n4-a', 'MA.DONNEES.BARRES', 4, 'texte',  '8'),
    ('don-bar-n4-b', 'MA.DONNEES.BARRES', 4, 'texte',  '9'),
    -- MA.DONNEES.PICTOGRAMME
    ('don-pic-n1-a', 'MA.DONNEES.PICTOGRAMME', 1, 'qcm',   '4'),
    ('don-pic-n1-b', 'MA.DONNEES.PICTOGRAMME', 1, 'qcm',   '5'),
    ('don-pic-n2-a', 'MA.DONNEES.PICTOGRAMME', 2, 'qcm',   '6'),
    ('don-pic-n2-b', 'MA.DONNEES.PICTOGRAMME', 2, 'qcm',   '8'),
    ('don-pic-n3-a', 'MA.DONNEES.PICTOGRAMME', 3, 'clic',  'lapins'),
    ('don-pic-n3-b', 'MA.DONNEES.PICTOGRAMME', 3, 'clic',  'Tom'),
    ('don-pic-n4-a', 'MA.DONNEES.PICTOGRAMME', 4, 'texte', '10'),
    ('don-pic-n4-b', 'MA.DONNEES.PICTOGRAMME', 4, 'texte', '15'),
    -- MA.DONNEES.COMPARER
    ('don-cmp-n1-a', 'MA.DONNEES.COMPARER', 1, 'qcm',   'Tom'),
    ('don-cmp-n1-b', 'MA.DONNEES.COMPARER', 1, 'qcm',   'des poires'),
    ('don-cmp-n2-a', 'MA.DONNEES.COMPARER', 2, 'qcm',   '3'),
    ('don-cmp-n2-b', 'MA.DONNEES.COMPARER', 2, 'qcm',   '3'),
    ('don-cmp-n3-a', 'MA.DONNEES.COMPARER', 3, 'qcm',   '3'),
    ('don-cmp-n3-b', 'MA.DONNEES.COMPARER', 3, 'qcm',   '5'),
    ('don-cmp-n4-a', 'MA.DONNEES.COMPARER', 4, 'texte', '3'),
    ('don-cmp-n4-b', 'MA.DONNEES.COMPARER', 4, 'texte', '3')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 6. Verification serveur : saisie normalisee == `attendu` (miroir du client,
--    comparerDonnees). qcm -> normaliser_lettres (accents gardes) ; grille ->
--    comparaison stricte (minuscule, espaces retires) ; clic / texte ->
--    normaliser_mot (accents EXIGES).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_donnees(p_cle text, p_saisie text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $fn$
    SELECT COALESCE((
        SELECT CASE
                 WHEN d.format = 'qcm'
                   THEN public.normaliser_lettres(p_saisie) = public.normaliser_lettres(d.attendu)
                 WHEN d.format = 'grille'
                   THEN lower(regexp_replace(COALESCE(p_saisie, ''), '\s', '', 'g'))
                      = lower(regexp_replace(d.attendu,             '\s', '', 'g'))
                 ELSE public.normaliser_mot(p_saisie) = public.normaliser_mot(d.attendu)
               END
          FROM public.donnees_item d WHERE d.cle = p_cle
    ), false);
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_donnees(text, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 7. Exercices de reference (FK pour reponses.exercice_id + progression).
--    exercice_id deterministe = md5('<competence>:<niveau>:donnees').
--    Methode : donnees (ajoutee a l'etape 2).
-- =========================================================================
DO $do$
DECLARE
    v_comp text;
    v_niv  integer;
    v_id   uuid;
BEGIN
    FOR v_comp IN
        SELECT code FROM public.competences WHERE code LIKE 'MA.DONNEES.%'
    LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':donnees')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'donnees', v_niv, 'donnees', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 8. enregistrer_reponse : branche dediee op = 'don' (ajoutee a la version
--    0043). Signature INCHANGEE -> CREATE OR REPLACE (les GRANT sont conserves).
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

    -- Verdict serveur : TEXTE (lettres), CONJUGAISON, DICTEE, GRAMMAIRE, LEXIQUE,
    -- GEOMETRIE, DONNEES, ou arithmetique.
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
        -- L'item de reference doit exister ET coller a la competence / au niveau.
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
        -- L'item de reference doit exister ET coller a la competence / au niveau.
        IF NOT EXISTS (SELECT 1 FROM public.donnees_item d
                        WHERE d.cle = p_op2 AND d.competence = p_competence AND d.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : item de reference absent';
        END IF;
        v_correct := public.verif_donnees(p_op2, p_reponse_texte);
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
-- 9. Sous-matiere `donnees` ACTIVE par defaut (nouveaux profils) et ajoutee aux
--    profils existants (dont Iris).
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','geometrie','repere','donnees',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'donnees')
 WHERE NOT ('donnees' = ANY (domaines_actifs));

-- =========================================================================
-- 10. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0044_maths_donnees')
ON CONFLICT (version) DO NOTHING;
