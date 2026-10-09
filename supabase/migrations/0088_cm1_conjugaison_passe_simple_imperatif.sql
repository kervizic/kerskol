-- 0088_cm1_conjugaison_passe_simple_imperatif.sql
-- MATIERE FRANCAIS : CONJUGAISON CM1 (programme 2024, cycle 3).
--
-- Deux nouveaux temps, ajoutes a la MEME table de reference public.conjugaison
-- (0031) avec un code temps dedie (verif_conjugaison inchangee) :
--   * PASSE SIMPLE (temps = 5) : 3e personnes seulement (il = 3, ils = 6),
--     comme dans les histoires au CM1. Verbes : -er (chanter, jouer, aimer,
--     regarder, donner, trouver, parler), cas -ger/-cer (manger, placer), et les
--     irreguliers etre, avoir, aller, faire, dire, venir, prendre, voir.
--   * IMPERATIF present (temps = 6) : tu = 2, nous = 4, vous = 5 ; PAS de sujet
--     affiche (c'est un ordre). Le « tu » des verbes en -er n'a PAS de s
--     (chante !). Verbes : les memes + finir (finis/finissons/finissez).
--
-- Miroir EXACT de frontend/src/domain/francais/conjugaison-cm1.ts (golden
-- cm1Golden() + supabase/tests/conjugaison_cm1_test.sql). Accents et cedille
-- SIGNIFICATIFS. Le SERVEUR reste seul juge (op 'conj', p_a = 5 ou 6).
--
-- Migration ADDITIVE et idempotente : aucune donnee utilisateur modifiee.

-- =========================================================================
-- 1. Etend la contrainte de temps de la table de reference (ajoute 5 et 6 ;
--    4 reste reserve au passe compose, qui a sa propre table conjugaison_pc).
-- =========================================================================
ALTER TABLE public.conjugaison DROP CONSTRAINT IF EXISTS conjugaison_temps_chk;
ALTER TABLE public.conjugaison ADD CONSTRAINT conjugaison_temps_chk
    CHECK (temps IN (1, 2, 3, 5, 6));

-- =========================================================================
-- 2. Seed des formes CM1 (88 lignes : 34 passe simple + 54 imperatif).
-- =========================================================================
INSERT INTO public.conjugaison (verbe, temps, personne, forme) VALUES
    -- PASSE SIMPLE (temps 5), personnes 3 (il) et 6 (ils).
    ('chanter',5,3,'chanta'),('chanter',5,6,'chantèrent'),
    ('jouer',5,3,'joua'),('jouer',5,6,'jouèrent'),
    ('aimer',5,3,'aima'),('aimer',5,6,'aimèrent'),
    ('regarder',5,3,'regarda'),('regarder',5,6,'regardèrent'),
    ('donner',5,3,'donna'),('donner',5,6,'donnèrent'),
    ('trouver',5,3,'trouva'),('trouver',5,6,'trouvèrent'),
    ('parler',5,3,'parla'),('parler',5,6,'parlèrent'),
    ('manger',5,3,'mangea'),('manger',5,6,'mangèrent'),
    ('placer',5,3,'plaça'),('placer',5,6,'placèrent'),
    ('etre',5,3,'fut'),('etre',5,6,'furent'),
    ('avoir',5,3,'eut'),('avoir',5,6,'eurent'),
    ('aller',5,3,'alla'),('aller',5,6,'allèrent'),
    ('faire',5,3,'fit'),('faire',5,6,'firent'),
    ('dire',5,3,'dit'),('dire',5,6,'dirent'),
    ('venir',5,3,'vint'),('venir',5,6,'vinrent'),
    ('prendre',5,3,'prit'),('prendre',5,6,'prirent'),
    ('voir',5,3,'vit'),('voir',5,6,'virent'),
    -- IMPERATIF present (temps 6), personnes 2 (tu), 4 (nous), 5 (vous).
    ('chanter',6,2,'chante'),('chanter',6,4,'chantons'),('chanter',6,5,'chantez'),
    ('jouer',6,2,'joue'),('jouer',6,4,'jouons'),('jouer',6,5,'jouez'),
    ('aimer',6,2,'aime'),('aimer',6,4,'aimons'),('aimer',6,5,'aimez'),
    ('regarder',6,2,'regarde'),('regarder',6,4,'regardons'),('regarder',6,5,'regardez'),
    ('donner',6,2,'donne'),('donner',6,4,'donnons'),('donner',6,5,'donnez'),
    ('trouver',6,2,'trouve'),('trouver',6,4,'trouvons'),('trouver',6,5,'trouvez'),
    ('parler',6,2,'parle'),('parler',6,4,'parlons'),('parler',6,5,'parlez'),
    ('manger',6,2,'mange'),('manger',6,4,'mangeons'),('manger',6,5,'mangez'),
    ('placer',6,2,'place'),('placer',6,4,'plaçons'),('placer',6,5,'placez'),
    ('etre',6,2,'sois'),('etre',6,4,'soyons'),('etre',6,5,'soyez'),
    ('avoir',6,2,'aie'),('avoir',6,4,'ayons'),('avoir',6,5,'ayez'),
    ('aller',6,2,'va'),('aller',6,4,'allons'),('aller',6,5,'allez'),
    ('faire',6,2,'fais'),('faire',6,4,'faisons'),('faire',6,5,'faites'),
    ('dire',6,2,'dis'),('dire',6,4,'disons'),('dire',6,5,'dites'),
    ('venir',6,2,'viens'),('venir',6,4,'venons'),('venir',6,5,'venez'),
    ('prendre',6,2,'prends'),('prendre',6,4,'prenons'),('prendre',6,5,'prenez'),
    ('voir',6,2,'vois'),('voir',6,4,'voyons'),('voir',6,5,'voyez'),
    ('finir',6,2,'finis'),('finir',6,4,'finissons'),('finir',6,5,'finissez')
ON CONFLICT (verbe, temps, personne) DO UPDATE SET forme = EXCLUDED.forme;

-- =========================================================================
-- 3. Referentiel : competences FR.CONJ.PASSE_SIMPLE et FR.CONJ.IMPERATIF.
--    S'ouvrent apres le present niveau 2 (comme futur / imparfait / pc).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('FR.CONJ.PASSE_SIMPLE', 'FR', 'conjugaison', 'Conjuguer au passé simple', 550, 4, true),
    ('FR.CONJ.IMPERATIF',    'FR', 'conjugaison', 'Conjuguer à l''impératif',  560, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('FR.CONJ.PASSE_SIMPLE', 'FR.CONJ.PRESENT', 2),
    ('FR.CONJ.IMPERATIF',    'FR.CONJ.PRESENT', 2)
ON CONFLICT (competence, prerequis) DO UPDATE SET niveau_min = EXCLUDED.niveau_min;

-- =========================================================================
-- 4. Exercices de reference (FK pour reponses.exercice_id + progression).
-- =========================================================================
DO $$
DECLARE
    v_comp text;
    v_niv  integer;
    v_id   uuid;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['FR.CONJ.PASSE_SIMPLE','FR.CONJ.IMPERATIF'] LOOP
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
-- 5. enregistrer_reponse : branche op = 'conj' etendue aux temps 5 (passe
--    simple) et 6 (imperatif) -> verif_conjugaison (meme table). Le reste de la
--    fonction est INCHANGE (reprend la version 0063). Signature identique ->
--    CREATE OR REPLACE conserve les GRANT existants.
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
        IF p_op2 IS NULL OR p_a IS NULL OR p_a NOT IN (1, 2, 3, 4, 5, 6)
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
        ELSIF p_a IN (5, 6) THEN
            -- Temps CM1 : passe simple (5) / imperatif (6), meme table (0031/0088).
            IF p_a = 5 AND p_competence <> 'FR.CONJ.PASSE_SIMPLE' THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : passe simple hors competence';
            END IF;
            IF p_a = 6 AND p_competence <> 'FR.CONJ.IMPERATIF' THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : imperatif hors competence';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM public.conjugaison
                            WHERE verbe = p_op2 AND temps = p_a AND personne = p_b) THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : forme de reference absente';
            END IF;
            v_correct := public.verif_conjugaison(p_op2, p_a, p_b, p_reponse_texte);
        ELSE
            -- Temps simples (present/futur/imparfait) : table 0031.
            IF p_competence IN ('FR.CONJ.PASSE_COMPOSE', 'FR.CONJ.PASSE_SIMPLE', 'FR.CONJ.IMPERATIF') THEN
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
    ELSIF p_op = 'qm' THEN
        IF p_competence NOT LIKE 'QM.%' AND p_competence NOT LIKE 'EMC.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'qm : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'qm : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'qm : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.qm_item q
                        WHERE q.cle = p_op2 AND q.competence = p_competence AND q.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'qm : item de reference absent';
        END IF;
        v_correct := public.verif_qm(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'ecr' THEN
        IF p_competence NOT LIKE 'FR.ECR.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'ecr : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'ecr : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'ecr : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.ecriture_item e
                        WHERE e.cle = p_op2 AND e.competence = p_competence AND e.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'ecr : item de reference absent';
        END IF;
        v_correct := public.verif_ecriture(p_op2, p_reponse_texte);
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

    IF p_op = 'ecr' AND p_reponse_texte IS NOT NULL AND btrim(p_reponse_texte) <> ''
       AND EXISTS (SELECT 1 FROM public.ecriture_item e WHERE e.cle = p_op2 AND e.format = 'libre') THEN
        INSERT INTO public.ecriture_production (profil_id, foyer_id, competence, niveau, cle, texte, correct)
        VALUES (p_profil, v_foyer, p_competence, p_niveau, p_op2, left(btrim(p_reponse_texte), 500), v_correct);
    END IF;

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
VALUES ('0088_cm1_conjugaison_passe_simple_imperatif')
ON CONFLICT (version) DO NOTHING;
