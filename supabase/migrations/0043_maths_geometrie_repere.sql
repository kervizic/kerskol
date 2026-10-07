-- 0043_maths_geometrie_repere.sql
-- MATIERE MATHS, PHASE 3 : deux nouvelles SOUS-MATIERES (CE2, cycle 2 revise
-- 2024), baties sur l'architecture de la grammaire / du lexique (phases 1-2) :
--
--   GEOMETRIE (domaine `geometrie`) - 4 competences, 4 niveaux :
--     MA.GEO.FIGURES      reconnaitre et nommer carre, rectangle, triangle
--                         (dont triangle rectangle), cercle ;
--     MA.GEO.VOCABULAIRE  cote, sommet, angle droit (reconnaitre un angle droit
--                         comme avec l'equerre) ;
--     MA.GEO.SOLIDES      cube, pave, cylindre, sphere, pyramide, cone ; face,
--                         arete, sommet ;
--     MA.GEO.SYMETRIE     symetrie axiale (completer une figure sur quadrillage,
--                         dire si une figure a un axe).
--   SE REPERER (domaine `repere`) - 3 competences, 4 niveaux :
--     MA.REPERE.QUADRILLAGE  cases et noeuds, coder une case (type B3), placer
--                            un point ;
--     MA.REPERE.DEPLACEMENTS deplacements codes (avancer de deux cases vers la
--                            droite...) ;
--     MA.REPERE.PLAN         gauche / droite / devant / derriere, lire un plan.
--
-- Le PERIMETRE n'est pas traite : au CE2 la mesure de longueurs vit deja dans la
-- sous-matiere « Mesures » (MA.MES.LONGUEURS) ; l'ajouter ici doublonnerait.
--
-- REUTILISATION (pas de doublon) : meme format d'item (qcm / clic / texte /
-- grille), meme principe « le SERVEUR reste SEUL JUGE » via une cle d'item. On
-- ajoute UNE table de reference public.geometrie_item (miroir EXACT de
-- frontend/.../geometrie/geometrie.ts, test croise geometrie_test.sql + golden
-- vitest) et UNE op dediee op = 'geo' dans enregistrer_reponse (verif_geo). Les
-- exercices sont de type 'geometrie' (deja autorise) ; la generation (figures,
-- choix de l'item) est faite cote client (composant <Geometrie>).
--
-- Securite / donnees reelles : migration ADDITIVE et IDEMPOTENTE. Les deux
-- sous-matieres sont ajoutees ACTIVES au defaut de domaines_actifs ET aux profils
-- existants (dont Iris) ; on n'AJOUTE que des sous-matieres -> le garde-fou
-- << au moins une sous-matiere jouable >> (0039) reste trivialement satisfait. Les
-- domaines existent (etape 3) AVANT toute ecriture de profil (etape 7).

-- =========================================================================
-- 1. Table de REFERENCE (source serveur du juste/faux), miroir de geometrie.ts.
--    Meme forme que grammaire_item / lexique_item ; couvre MA.GEO.* et MA.REPERE.*.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.geometrie_item (
    cle        text    PRIMARY KEY,
    competence text    NOT NULL REFERENCES public.competences (code),
    niveau     integer NOT NULL,
    format     text    NOT NULL,
    attendu    text    NOT NULL,
    CONSTRAINT geometrie_item_comp_chk   CHECK (competence LIKE 'MA.GEO.%' OR competence LIKE 'MA.REPERE.%'),
    CONSTRAINT geometrie_item_niveau_chk CHECK (niveau BETWEEN 1 AND 4),
    CONSTRAINT geometrie_item_format_chk CHECK (format IN ('qcm','clic','texte','grille')),
    CONSTRAINT geometrie_item_attendu_chk CHECK (btrim(attendu) <> '')
);
COMMENT ON TABLE public.geometrie_item IS
    'Items de reference de la geometrie et du reperage (CE2) ; miroir de '
    'frontend/.../geometrie/geometrie.ts. Le serveur y compare la saisie '
    'normalisee. Table SERVEUR : aucun GRANT a l''API.';
ALTER TABLE public.geometrie_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geometrie_item FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.geometrie_item FROM anon, authenticated;

-- =========================================================================
-- 2. Referentiel : competences (matiere MA). Ouvertes d'emblee (pas de prerequis
--    bloquant au CE2 ; la sous-matiere s'active par profil).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('MA.GEO.FIGURES',        'MA', 'geometrie', 'Reconnaître les figures', 600, 4, true),
    ('MA.GEO.VOCABULAIRE',    'MA', 'geometrie', 'Côtés, sommets et angles', 610, 4, true),
    ('MA.GEO.SOLIDES',        'MA', 'geometrie', 'Les solides', 620, 4, true),
    ('MA.GEO.SYMETRIE',       'MA', 'geometrie', 'La symétrie', 630, 4, true),
    ('MA.REPERE.QUADRILLAGE', 'MA', 'repere',    'Se repérer sur un quadrillage', 640, 4, true),
    ('MA.REPERE.DEPLACEMENTS','MA', 'repere',    'Les déplacements', 650, 4, true),
    ('MA.REPERE.PLAN',        'MA', 'repere',    'Lire un plan', 660, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 3. Seed des items (genere depuis geometrie.ts ; test croise front <-> SQL).
--    66 items : 7 competences x 4 niveaux, au moins 1 item par (competence,niveau).
-- =========================================================================
INSERT INTO public.geometrie_item (cle, competence, niveau, format, attendu) VALUES
    -- MA.GEO.FIGURES
    ('geo-fig-n1-carre',     'MA.GEO.FIGURES', 1, 'qcm',   'un carré'),
    ('geo-fig-n1-rectangle', 'MA.GEO.FIGURES', 1, 'qcm',   'un rectangle'),
    ('geo-fig-n1-triangle',  'MA.GEO.FIGURES', 1, 'qcm',   'un triangle'),
    ('geo-fig-n1-cercle',    'MA.GEO.FIGURES', 1, 'qcm',   'un cercle'),
    ('geo-fig-n2-carre',     'MA.GEO.FIGURES', 2, 'clic',  'carré'),
    ('geo-fig-n2-triangle',  'MA.GEO.FIGURES', 2, 'clic',  'triangle'),
    ('geo-fig-n2-cercle',    'MA.GEO.FIGURES', 2, 'clic',  'cercle'),
    ('geo-fig-n3-trirect',   'MA.GEO.FIGURES', 3, 'qcm',   'oui'),
    ('geo-fig-n3-tri',       'MA.GEO.FIGURES', 3, 'qcm',   'non'),
    ('geo-fig-n3-rect',      'MA.GEO.FIGURES', 3, 'qcm',   'un rectangle'),
    ('geo-fig-n4-carre',     'MA.GEO.FIGURES', 4, 'texte', 'carré'),
    ('geo-fig-n4-rectangle', 'MA.GEO.FIGURES', 4, 'texte', 'rectangle'),
    ('geo-fig-n4-triangle',  'MA.GEO.FIGURES', 4, 'texte', 'triangle'),
    ('geo-fig-n4-cercle',    'MA.GEO.FIGURES', 4, 'texte', 'cercle'),
    -- MA.GEO.VOCABULAIRE
    ('geo-voc-n1-cotes-carre',      'MA.GEO.VOCABULAIRE', 1, 'qcm',   '4'),
    ('geo-voc-n1-sommets-triangle', 'MA.GEO.VOCABULAIRE', 1, 'qcm',   '3'),
    ('geo-voc-n1-cotes-triangle',   'MA.GEO.VOCABULAIRE', 1, 'qcm',   '3'),
    ('geo-voc-n2-sommet',           'MA.GEO.VOCABULAIRE', 2, 'clic',  'B'),
    ('geo-voc-n2-angledroit',       'MA.GEO.VOCABULAIRE', 2, 'clic',  'A'),
    ('geo-voc-n3-angle-oui',        'MA.GEO.VOCABULAIRE', 3, 'qcm',   'oui'),
    ('geo-voc-n3-angle-non',        'MA.GEO.VOCABULAIRE', 3, 'qcm',   'non'),
    ('geo-voc-n4-cotes-rectangle',  'MA.GEO.VOCABULAIRE', 4, 'texte', '4'),
    ('geo-voc-n4-sommet',           'MA.GEO.VOCABULAIRE', 4, 'texte', 'sommet'),
    -- MA.GEO.SOLIDES
    ('geo-sol-n1-cube',      'MA.GEO.SOLIDES', 1, 'qcm',   'un cube'),
    ('geo-sol-n1-sphere',    'MA.GEO.SOLIDES', 1, 'qcm',   'une boule'),
    ('geo-sol-n1-cylindre',  'MA.GEO.SOLIDES', 1, 'qcm',   'un cylindre'),
    ('geo-sol-n2-ballon',    'MA.GEO.SOLIDES', 2, 'qcm',   'une boule'),
    ('geo-sol-n2-boite',     'MA.GEO.SOLIDES', 2, 'qcm',   'un pavé'),
    ('geo-sol-n2-de',        'MA.GEO.SOLIDES', 2, 'qcm',   'un cube'),
    ('geo-sol-n3-faces-cube','MA.GEO.SOLIDES', 3, 'qcm',   '6'),
    ('geo-sol-n3-sommets-cube','MA.GEO.SOLIDES', 3, 'qcm', '8'),
    ('geo-sol-n4-pyramide',  'MA.GEO.SOLIDES', 4, 'texte', 'pyramide'),
    ('geo-sol-n4-cone',      'MA.GEO.SOLIDES', 4, 'texte', 'cône'),
    ('geo-sol-n4-cylindre',  'MA.GEO.SOLIDES', 4, 'texte', 'cylindre'),
    -- MA.GEO.SYMETRIE
    ('geo-sym-n1-oui', 'MA.GEO.SYMETRIE', 1, 'qcm',    'oui'),
    ('geo-sym-n1-non', 'MA.GEO.SYMETRIE', 1, 'qcm',    'non'),
    ('geo-sym-n2-oui', 'MA.GEO.SYMETRIE', 2, 'qcm',    'oui'),
    ('geo-sym-n2-non', 'MA.GEO.SYMETRIE', 2, 'qcm',    'non'),
    ('geo-sym-n3-a',   'MA.GEO.SYMETRIE', 3, 'grille', 'C2;C3;D1;D4'),
    ('geo-sym-n3-b',   'MA.GEO.SYMETRIE', 3, 'grille', 'A3;B3;C4;D4'),
    ('geo-sym-n4-a',   'MA.GEO.SYMETRIE', 4, 'grille', 'D1;D2;D4;E3;F2'),
    ('geo-sym-n4-b',   'MA.GEO.SYMETRIE', 4, 'grille', 'A4;B5;C6;D5;E4'),
    -- MA.REPERE.QUADRILLAGE
    ('geo-quad-n1-a', 'MA.REPERE.QUADRILLAGE', 1, 'qcm',    'B3'),
    ('geo-quad-n1-b', 'MA.REPERE.QUADRILLAGE', 1, 'qcm',    'C2'),
    ('geo-quad-n2-a', 'MA.REPERE.QUADRILLAGE', 2, 'clic',   'B3'),
    ('geo-quad-n2-b', 'MA.REPERE.QUADRILLAGE', 2, 'clic',   'D1'),
    ('geo-quad-n3-a', 'MA.REPERE.QUADRILLAGE', 3, 'grille', 'B3'),
    ('geo-quad-n3-b', 'MA.REPERE.QUADRILLAGE', 3, 'grille', 'A2'),
    ('geo-quad-n4-a', 'MA.REPERE.QUADRILLAGE', 4, 'texte',  'C3'),
    ('geo-quad-n4-b', 'MA.REPERE.QUADRILLAGE', 4, 'texte',  'A4'),
    -- MA.REPERE.DEPLACEMENTS
    ('geo-dep-n1-a', 'MA.REPERE.DEPLACEMENTS', 1, 'qcm',   'D2'),
    ('geo-dep-n1-b', 'MA.REPERE.DEPLACEMENTS', 1, 'qcm',   'C3'),
    ('geo-dep-n2-a', 'MA.REPERE.DEPLACEMENTS', 2, 'qcm',   'B3'),
    ('geo-dep-n2-b', 'MA.REPERE.DEPLACEMENTS', 2, 'qcm',   'C2'),
    ('geo-dep-n3-a', 'MA.REPERE.DEPLACEMENTS', 3, 'clic',  'C3'),
    ('geo-dep-n3-b', 'MA.REPERE.DEPLACEMENTS', 3, 'clic',  'C2'),
    ('geo-dep-n4-a', 'MA.REPERE.DEPLACEMENTS', 4, 'texte', 'D4'),
    ('geo-dep-n4-b', 'MA.REPERE.DEPLACEMENTS', 4, 'texte', 'C1'),
    -- MA.REPERE.PLAN
    ('geo-plan-n1-a', 'MA.REPERE.PLAN', 1, 'qcm',   'la lampe'),
    ('geo-plan-n1-b', 'MA.REPERE.PLAN', 1, 'qcm',   'la chaise'),
    ('geo-plan-n2-a', 'MA.REPERE.PLAN', 2, 'qcm',   'devant'),
    ('geo-plan-n2-b', 'MA.REPERE.PLAN', 2, 'qcm',   'devant'),
    ('geo-plan-n3-a', 'MA.REPERE.PLAN', 3, 'qcm',   'vers la droite'),
    ('geo-plan-n3-b', 'MA.REPERE.PLAN', 3, 'qcm',   'vers la gauche'),
    ('geo-plan-n4-a', 'MA.REPERE.PLAN', 4, 'texte', 'la fenêtre'),
    ('geo-plan-n4-b', 'MA.REPERE.PLAN', 4, 'texte', 'l''arbre')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 4. Verification serveur : saisie normalisee == `attendu` (miroir du client,
--    comparerGeometrie). qcm -> normaliser_lettres (accents gardes) ; grille ->
--    comparaison stricte (minuscule, espaces retires : les codes de cases
--    contiennent « ; ») ; clic / texte -> normaliser_mot (accents EXIGES).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_geo(p_cle text, p_saisie text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $fn$
    SELECT COALESCE((
        SELECT CASE
                 WHEN g.format = 'qcm'
                   THEN public.normaliser_lettres(p_saisie) = public.normaliser_lettres(g.attendu)
                 WHEN g.format = 'grille'
                   THEN lower(regexp_replace(COALESCE(p_saisie, ''), '\s', '', 'g'))
                      = lower(regexp_replace(g.attendu,             '\s', '', 'g'))
                 ELSE public.normaliser_mot(p_saisie) = public.normaliser_mot(g.attendu)
               END
          FROM public.geometrie_item g WHERE g.cle = p_cle
    ), false);
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_geo(text, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 5. Exercices de reference (FK pour reponses.exercice_id + progression).
--    exercice_id deterministe = md5('<competence>:<niveau>:geometrie').
--    Methode : van_hiele (geometrie) / spatial (reperage), deja au referentiel.
-- =========================================================================
DO $do$
DECLARE
    v_comp text;
    v_niv  integer;
    v_id   uuid;
    v_meth text;
BEGIN
    FOR v_comp, v_meth IN
        SELECT code, CASE WHEN code LIKE 'MA.REPERE.%' THEN 'spatial' ELSE 'van_hiele' END
          FROM public.competences
         WHERE code LIKE 'MA.GEO.%' OR code LIKE 'MA.REPERE.%'
    LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':geometrie')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'geometrie', v_niv, v_meth, true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 6. enregistrer_reponse : branche dediee op = 'geo' (ajoutee a la version
--    0042). Signature INCHANGEE -> CREATE OR REPLACE (les GRANT sont conserves).
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
    -- GEOMETRIE, ou arithmetique.
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
-- 7. Sous-matieres `geometrie` et `repere` ACTIVES par defaut (nouveaux profils)
--    et ajoutees aux profils existants (dont Iris).
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','geometrie','repere',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'geometrie')
 WHERE NOT ('geometrie' = ANY (domaines_actifs));

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'repere')
 WHERE NOT ('repere' = ANY (domaines_actifs));

-- =========================================================================
-- 8. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0043_maths_geometrie_repere')
ON CONFLICT (version) DO NOTHING;
