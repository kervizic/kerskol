-- 0063_francais_ecriture.sql
-- MATIERE FRANCAIS : nouvelle SOUS-MATIERE « COPIER ET ÉCRIRE » (CE2, cycle 2
-- revise), domaine dedie `ecriture`, competences FR.ECR.* (COMPETENCES ADDITIVES :
-- aucune reinitialisation d'Iris). Deux activites :
--   FR.ECR.COPIE  : recopier (N1 un mot -> N4 passage de 3 phrases affiche puis
--                   masque = copie differee). Verification DETERMINISTE mot a mot
--                   (majuscule, accents, ponctuation EXIGES).
--   FR.ECR.GUIDEE : ecriture guidee. N1 remettre des mots dans l'ordre
--                   (etiquettes) ; N2 completer une phrase avec le bon mot ;
--                   N3 transformer (pluriel, passe compose) ; N4 ecrire une phrase
--                   LIBRE (image emoji ou debut d'histoire), verifiee par une
--                   CHECK-LIST : majuscule, point final, au moins un verbe d'une
--                   liste, au moins N mots, mots-cles imposes. JAMAIS de jugement
--                   du sens par IA. La phrase de l'enfant est ENREGISTREE
--                   (ecriture_production) et relue par le parent.
--
-- Le SERVEUR reste SEUL JUGE : table miroir public.ecriture_item + fonction
-- public.verif_ecriture, op dediee 'ecr' dans enregistrer_reponse. Miroir EXACT
-- de frontend/.../francais/ecriture.ts (test croise ecriture.test.ts +
-- ecriture_test.sql). Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Type d'exercice 'ecriture' autorise (ajout au CHECK, idempotent).
-- =========================================================================
ALTER TABLE public.exercices DROP CONSTRAINT IF EXISTS exercices_type_chk;
ALTER TABLE public.exercices ADD CONSTRAINT exercices_type_chk CHECK (type IN (
    'calcul','qcm','texte_trous','dictee','geometrie','vocabulaire','conjugaison',
    'grammaire','mots_invariables','donnees','comprehension','mots_maitresse',
    'dictee_maitresse','qm','emc','ecriture'));

-- =========================================================================
-- 2. Methode pedagogique dediee.
-- =========================================================================
INSERT INTO public.methodes (code, libelle) VALUES
    ('ecriture', 'Copier et écrire')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 3. Referentiel : competences FR.ECR.* (matiere FR, domaine ecriture).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('FR.ECR.COPIE',  'FR', 'ecriture', 'Recopier sans erreur', 860, 4, true),
    ('FR.ECR.GUIDEE', 'FR', 'ecriture', 'Écrire une phrase', 870, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 4. Table de REFERENCE (source serveur du juste/faux), miroir de ecriture.ts.
--    `attendu` : cible (copie/ordre/transform/qcm) ; vide pour 'libre'.
--    `params`  : check-list pour 'libre' {minMots, motsCles[], (verbes[])}.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ecriture_item (
    cle        text    PRIMARY KEY,
    competence text    NOT NULL REFERENCES public.competences (code),
    niveau     integer NOT NULL,
    format     text    NOT NULL,
    attendu    text    NOT NULL DEFAULT '',
    params     jsonb,
    CONSTRAINT ecriture_item_comp_chk   CHECK (competence LIKE 'FR.ECR.%'),
    CONSTRAINT ecriture_item_niveau_chk CHECK (niveau BETWEEN 1 AND 4),
    CONSTRAINT ecriture_item_format_chk CHECK (format IN ('copie','ordre','qcm','transform','libre')),
    CONSTRAINT ecriture_item_attendu_chk CHECK (format = 'libre' OR btrim(attendu) <> '')
);
COMMENT ON TABLE public.ecriture_item IS
    'Items de reference « Copier et ecrire » (CE2) ; miroir de ecriture.ts. '
    'Le serveur y compare la saisie. Table SERVEUR : aucun GRANT a l''API.';
ALTER TABLE public.ecriture_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecriture_item FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ecriture_item FROM anon, authenticated;

-- =========================================================================
-- 5. Seed des items (miroir EXACT de ecriture.ts ; 24 items).
-- =========================================================================
INSERT INTO public.ecriture_item (cle, competence, niveau, format, attendu, params) VALUES
    -- FR.ECR.COPIE
    ('ecr-copie-n1-a', 'FR.ECR.COPIE',  1, 'copie',     'chat', NULL),
    ('ecr-copie-n1-b', 'FR.ECR.COPIE',  1, 'copie',     'jardin', NULL),
    ('ecr-copie-n1-c', 'FR.ECR.COPIE',  1, 'copie',     'école', NULL),
    ('ecr-copie-n2-a', 'FR.ECR.COPIE',  2, 'copie',     'le petit chat', NULL),
    ('ecr-copie-n2-b', 'FR.ECR.COPIE',  2, 'copie',     'une belle fleur', NULL),
    ('ecr-copie-n2-c', 'FR.ECR.COPIE',  2, 'copie',     'mon école', NULL),
    ('ecr-copie-n3-a', 'FR.ECR.COPIE',  3, 'copie',     'Le chat dort dans le jardin.', NULL),
    ('ecr-copie-n3-b', 'FR.ECR.COPIE',  3, 'copie',     'Nina lit un beau livre.', NULL),
    ('ecr-copie-n3-c', 'FR.ECR.COPIE',  3, 'copie',     'Les oiseaux chantent le matin.', NULL),
    ('ecr-copie-n4-a', 'FR.ECR.COPIE',  4, 'copie',     'Le petit chat joue. Il court dans le jardin. Puis il dort au soleil.', NULL),
    ('ecr-copie-n4-b', 'FR.ECR.COPIE',  4, 'copie',     'Léa ouvre son livre. Elle lit une belle histoire. Le soir, elle rêve.', NULL),
    -- FR.ECR.GUIDEE
    ('ecr-guide-n1-a', 'FR.ECR.GUIDEE', 1, 'ordre',     'Le chat dort.', NULL),
    ('ecr-guide-n1-b', 'FR.ECR.GUIDEE', 1, 'ordre',     'Nina aime les fleurs.', NULL),
    ('ecr-guide-n1-c', 'FR.ECR.GUIDEE', 1, 'ordre',     'Le soleil brille.', NULL),
    ('ecr-guide-n2-a', 'FR.ECR.GUIDEE', 2, 'qcm',       'lait', NULL),
    ('ecr-guide-n2-b', 'FR.ECR.GUIDEE', 2, 'qcm',       'fleur', NULL),
    ('ecr-guide-n2-c', 'FR.ECR.GUIDEE', 2, 'qcm',       'vole', NULL),
    ('ecr-guide-n3-a', 'FR.ECR.GUIDEE', 3, 'transform', 'les chats noirs', NULL),
    ('ecr-guide-n3-b', 'FR.ECR.GUIDEE', 3, 'transform', 'des petites fleurs', NULL),
    ('ecr-guide-n3-c', 'FR.ECR.GUIDEE', 3, 'transform', 'J''ai mangé une pomme.', NULL),
    ('ecr-guide-n3-d', 'FR.ECR.GUIDEE', 3, 'transform', 'Tu as chanté une chanson.', NULL),
    ('ecr-guide-n4-a', 'FR.ECR.GUIDEE', 4, 'libre',     '', '{"minMots":4,"motsCles":["chat","jardin"]}'),
    ('ecr-guide-n4-b', 'FR.ECR.GUIDEE', 4, 'libre',     '', '{"minMots":5,"motsCles":[]}'),
    ('ecr-guide-n4-c', 'FR.ECR.GUIDEE', 4, 'libre',     '', '{"minMots":4,"motsCles":["fleur","soleil"]}')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu, params=EXCLUDED.params;

-- =========================================================================
-- 6. Verification serveur : miroir EXACT de ecriture.ts (comparerEcriture +
--    verifieCheck). copie/transform -> espaces normalises, casse/accents/
--    ponctuation EXIGES ; ordre -> espaces retires ; qcm -> normaliser_lettres ;
--    libre -> check-list (majuscule, point, >= N mots, un verbe, mots-cles).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_ecriture(p_cle text, p_saisie text)
RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $fn$
DECLARE
    v_fmt text; v_att text; v_params jsonb;
    s text; c text; mots text[]; motsn text[]; verbes text[]; kw text; min_mots integer;
    -- Liste de verbes par defaut (N4 libre) : MIROIR EXACT de VERBES_LIBRE (ecriture.ts).
    defaut text[] := ARRAY[
        'joue','jouent','court','courent','dort','dorment','mange','mangent',
        'lit','lisent','aime','aiment','regarde','regardent','saute','sautent',
        'vole','volent','chante','chantent','brille','brillent','va','vont',
        'est','sont','a','ont','rentre','rentrent','donne','donnent','rit',
        'rient','danse','dansent','plante','plantent','cherche','cherchent',
        'trouve','trouvent','pousse','poussent','arrose','arrosent','dessine',
        'dessinent','ouvre','ouvrent','ferme','ferment','porte','portent',
        'attrape','attrapent','caresse','caressent','promene','promenent'];
BEGIN
    SELECT format, attendu, params INTO v_fmt, v_att, v_params
      FROM public.ecriture_item WHERE cle = p_cle;
    IF v_fmt IS NULL THEN RETURN false; END IF;

    IF v_fmt IN ('copie','transform') THEN
        RETURN btrim(regexp_replace(COALESCE(p_saisie,''), '\s+', ' ', 'g'))
             = btrim(regexp_replace(v_att, '\s+', ' ', 'g'));
    ELSIF v_fmt = 'ordre' THEN
        RETURN regexp_replace(COALESCE(p_saisie,''), '\s', '', 'g')
             = regexp_replace(v_att, '\s', '', 'g');
    ELSIF v_fmt = 'qcm' THEN
        RETURN public.normaliser_lettres(p_saisie) = public.normaliser_lettres(v_att);
    ELSIF v_fmt = 'libre' THEN
        s := btrim(COALESCE(p_saisie, ''));
        IF s = '' THEN RETURN false; END IF;
        c := left(s, 1);
        IF NOT (c <> lower(c) AND c = upper(c)) THEN RETURN false; END IF;   -- majuscule
        IF s !~ '[.!?]$' THEN RETURN false; END IF;                          -- point final
        mots := regexp_split_to_array(s, '\s+');
        min_mots := COALESCE((v_params->>'minMots')::int, 1);
        IF cardinality(mots) < min_mots THEN RETURN false; END IF;
        SELECT array_agg(public.normaliser_mot(m)) INTO motsn FROM unnest(mots) AS m;
        IF v_params ? 'verbes' AND jsonb_array_length(v_params->'verbes') > 0 THEN
            SELECT array_agg(public.normaliser_mot(x)) INTO verbes
              FROM jsonb_array_elements_text(v_params->'verbes') AS x;
        ELSE
            SELECT array_agg(public.normaliser_mot(x)) INTO verbes FROM unnest(defaut) AS x;
        END IF;
        IF NOT (motsn && verbes) THEN RETURN false; END IF;                  -- au moins un verbe
        IF v_params ? 'motsCles' THEN
            FOR kw IN SELECT public.normaliser_mot(x) FROM jsonb_array_elements_text(v_params->'motsCles') AS x LOOP
                IF NOT (kw = ANY (motsn)) THEN RETURN false; END IF;
            END LOOP;
        END IF;
        RETURN true;
    END IF;
    RETURN false;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_ecriture(text, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 7. Productions libres de l'enfant (N4), relues par le parent. Insert UNIQUEMENT
--    via enregistrer_reponse (SECURITY DEFINER). Lecture : foyer (peut_acceder_profil).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ecriture_production (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profil_id  uuid NOT NULL REFERENCES public.profils (id) ON DELETE CASCADE,
    foyer_id   uuid NOT NULL REFERENCES public.foyers (id) ON DELETE CASCADE,
    competence text NOT NULL,
    niveau     integer NOT NULL,
    cle        text NOT NULL,
    texte      text NOT NULL,
    correct    boolean NOT NULL,
    cree_le    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ecriture_production IS
    'Phrases libres (N4) ecrites par l''enfant, pour relecture par le parent. '
    'Insert via enregistrer_reponse seulement ; lecture par le foyer.';
CREATE INDEX IF NOT EXISTS ecriture_production_profil_idx
    ON public.ecriture_production (profil_id, cree_le DESC);
ALTER TABLE public.ecriture_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecriture_production FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ecriture_production FROM anon, authenticated;
GRANT SELECT ON public.ecriture_production TO authenticated;
DROP POLICY IF EXISTS ecriture_production_select ON public.ecriture_production;
CREATE POLICY ecriture_production_select ON public.ecriture_production
    FOR SELECT TO authenticated USING (public.peut_acceder_profil(profil_id));

-- =========================================================================
-- 8. Exercices de reference (FK pour reponses.exercice_id + progression).
-- =========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOR v_comp IN SELECT code FROM public.competences WHERE code LIKE 'FR.ECR.%' LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':ecriture')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'ecriture', v_niv, 'ecriture', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 9. enregistrer_reponse : branche dediee op = 'ecr' + enregistrement des
--    phrases libres (N4) dans ecriture_production. Signature INCHANGEE ->
--    CREATE OR REPLACE (GRANT conserves). Copie de la version 0058 + ajouts.
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
        -- Matieres « situation » : Questionner le monde (QM.%) ET Vivre ensemble
        -- (EMC.%). Item de reference dans public.qm_item ; verif_qm compare la
        -- saisie normalisee a `attendu`.
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

    -- Phrase LIBRE (N4 de « Copier et ecrire ») : on garde la production de
    -- l'enfant pour relecture par le parent (ecriture_production). Aucune autre
    -- op n'ecrit du texte libre conserve.
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
-- 10. Sous-matiere `ecriture` ACTIVE par defaut (nouveaux profils) et ajoutee
--     aux profils existants (dont Iris). ADDITIF : array_append, aucune remise
--     a zero (on n'ecrase pas les reglages existants).
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','geometrie','repere','donnees',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe',
        'lecture','mots-maitresse','vivant','matiere','objets','espace','temps',
        'respect','emotions','republique','ecrans','ecriture'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'ecriture')
 WHERE NOT ('ecriture' = ANY (domaines_actifs));

-- =========================================================================
-- 11. Enregistrement de la migration.
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0063_francais_ecriture')
ON CONFLICT (version) DO NOTHING;
