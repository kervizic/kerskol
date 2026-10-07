-- 0042_francais_vocabulaire_mots.sql
-- MATIERE FRANCAIS, PHASE 2 : deux nouvelles SOUS-MATIERES (CE2, cycle 2 revise
-- 2024), baties sur l'architecture de la grammaire (phase 1, 0041) :
--
--   VOCABULAIRE (domaine `vocabulaire`) - 5 competences, 4 niveaux :
--     FR.VOC.ALPHABET         ordre alphabetique et usage du dictionnaire ;
--     FR.VOC.FAMILLES         familles de mots (intrus, meme famille) ;
--     FR.VOC.SYN_CONTRAIRES   synonymes et contraires (y compris par prefixe) ;
--     FR.VOC.PREFIXE_SUFFIXE  prefixes et suffixes simples (re-, de-, in-, -eur, -ette) ;
--     FR.VOC.CATEGORIES       categories / mot generique.
--   MOTS A SAVOIR (domaine `mots-invariables`) - 1 competence, 4 niveaux :
--     FR.MOTS.INVARIABLES     mots invariables CE2 (N1 choisir la bonne
--                             orthographe parmi des propositions, jusqu'au N4
--                             ecrire le mot dans une phrase a trou).
--
-- REUTILISATION (pas de doublon) : meme format d'item (qcm/clic/texte), meme
-- normalisation (normaliser_lettres pour qcm, normaliser_mot pour clic/texte ;
-- accents EXIGES), meme composant client <Grammaire>. On ajoute UNE table de
-- reference public.lexique_item (miroir EXACT de frontend/.../francais/lexique.ts,
-- test croise lexique_test.sql + golden vitest) et UNE op dediee op = 'lex'
-- dans enregistrer_reponse. Le SERVEUR reste SEUL JUGE (verif_lexique).
--
-- Securite / donnees reelles : migration ADDITIVE et IDEMPOTENTE. Les deux
-- sous-matieres sont ajoutees ACTIVES au defaut de domaines_actifs ET aux profils
-- existants (dont Iris) ; on n'AJOUTE que des sous-matieres -> le garde-fou
-- << au moins une sous-matiere jouable >> (0039) reste trivialement satisfait. Les
-- domaines existent (etape 4) AVANT toute ecriture de profil (etape 9).

-- =========================================================================
-- 1. Type d'exercice << mots_invariables >> autorise (vocabulaire deja autorise).
-- =========================================================================
ALTER TABLE public.exercices DROP CONSTRAINT IF EXISTS exercices_type_chk;
ALTER TABLE public.exercices ADD CONSTRAINT exercices_type_chk CHECK (type IN (
    'calcul','qcm','texte_trous','dictee','geometrie','vocabulaire','conjugaison',
    'grammaire','mots_invariables'));

-- =========================================================================
-- 2. Methodes pedagogiques (reference par exercices.methode et reponses.methode).
-- =========================================================================
INSERT INTO public.methodes (code, libelle) VALUES
    ('vocabulaire',     'Vocabulaire (lexique, familles de mots, dictionnaire)'),
    ('mots_invariables','Mots invariables (orthographe des petits mots)')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 3. Table de REFERENCE (source serveur du juste/faux), miroir de lexique.ts.
--    Meme forme que grammaire_item ; la contrainte couvre FR.VOC.* et FR.MOTS.*.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.lexique_item (
    cle        text    PRIMARY KEY,
    competence text    NOT NULL REFERENCES public.competences (code),
    niveau     integer NOT NULL,
    format     text    NOT NULL,
    attendu    text    NOT NULL,
    CONSTRAINT lexique_item_comp_chk   CHECK (competence LIKE 'FR.VOC.%' OR competence LIKE 'FR.MOTS.%'),
    CONSTRAINT lexique_item_niveau_chk CHECK (niveau BETWEEN 1 AND 4),
    CONSTRAINT lexique_item_format_chk CHECK (format IN ('qcm','clic','texte')),
    CONSTRAINT lexique_item_attendu_chk CHECK (btrim(attendu) <> '')
);
COMMENT ON TABLE public.lexique_item IS
    'Items de reference du vocabulaire et des mots invariables (CE2) ; miroir de '
    'frontend/.../francais/lexique.ts. Le serveur y compare la saisie normalisee '
    '(accents exiges). Table SERVEUR : aucun GRANT a l''API.';
ALTER TABLE public.lexique_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lexique_item FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.lexique_item FROM anon, authenticated;

-- =========================================================================
-- 4. Referentiel : competences (matiere FR). Ouvertes d'emblee (pas de prerequis
--    bloquant au CE2 ; le francais s'active par profil).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('FR.VOC.ALPHABET', 'FR', 'vocabulaire', 'Ranger les mots et le dictionnaire', 750, 4, true),
    ('FR.VOC.FAMILLES', 'FR', 'vocabulaire', 'Les familles de mots', 760, 4, true),
    ('FR.VOC.SYN_CONTRAIRES', 'FR', 'vocabulaire', 'Synonymes et contraires', 770, 4, true),
    ('FR.VOC.PREFIXE_SUFFIXE', 'FR', 'vocabulaire', 'Les préfixes et les suffixes', 780, 4, true),
    ('FR.VOC.CATEGORIES', 'FR', 'vocabulaire', 'Les catégories de mots', 790, 4, true),
    ('FR.MOTS.INVARIABLES', 'FR', 'mots-invariables', 'Les mots invariables', 800, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 5. Seed des items (genere depuis lexique.ts ; test croise front <-> SQL).
-- =========================================================================
INSERT INTO public.lexique_item (cle, competence, niveau, format, attendu) VALUES
    ('voc-alpha-n1-1', 'FR.VOC.ALPHABET', 1, 'qcm', 'arbre'),
    ('voc-alpha-n1-2', 'FR.VOC.ALPHABET', 1, 'qcm', 'ballon'),
    ('voc-alpha-n1-3', 'FR.VOC.ALPHABET', 1, 'qcm', 'lune'),
    ('voc-alpha-n1-4', 'FR.VOC.ALPHABET', 1, 'qcm', 'dauphin'),
    ('voc-alpha-n1-5', 'FR.VOC.ALPHABET', 1, 'qcm', 'cerise'),
    ('voc-alpha-n2-1', 'FR.VOC.ALPHABET', 2, 'clic', 'arbre'),
    ('voc-alpha-n2-2', 'FR.VOC.ALPHABET', 2, 'clic', 'ballon'),
    ('voc-alpha-n2-3', 'FR.VOC.ALPHABET', 2, 'clic', 'lune'),
    ('voc-alpha-n2-4', 'FR.VOC.ALPHABET', 2, 'clic', 'dauphin'),
    ('voc-alpha-n2-5', 'FR.VOC.ALPHABET', 2, 'clic', 'cerise'),
    ('voc-alpha-n3-1', 'FR.VOC.ALPHABET', 3, 'qcm', 'entre livre et mardi'),
    ('voc-alpha-n3-2', 'FR.VOC.ALPHABET', 3, 'qcm', 'entre banane et dent'),
    ('voc-alpha-n3-3', 'FR.VOC.ALPHABET', 3, 'qcm', 'entre école et gare'),
    ('voc-alpha-n3-4', 'FR.VOC.ALPHABET', 3, 'qcm', 'entre reine et table'),
    ('voc-alpha-n3-5', 'FR.VOC.ALPHABET', 3, 'qcm', 'entre moto et orange'),
    ('voc-alpha-n4-1', 'FR.VOC.ALPHABET', 4, 'texte', 'chat'),
    ('voc-alpha-n4-2', 'FR.VOC.ALPHABET', 4, 'texte', 'auto'),
    ('voc-alpha-n4-3', 'FR.VOC.ALPHABET', 4, 'texte', 'banane'),
    ('voc-alpha-n4-4', 'FR.VOC.ALPHABET', 4, 'texte', 'lapin'),
    ('voc-alpha-n4-5', 'FR.VOC.ALPHABET', 4, 'texte', 'avion'),
    ('voc-fam-n1-1', 'FR.VOC.FAMILLES', 1, 'qcm', 'dentiste'),
    ('voc-fam-n1-2', 'FR.VOC.FAMILLES', 1, 'qcm', 'terrain'),
    ('voc-fam-n1-3', 'FR.VOC.FAMILLES', 1, 'qcm', 'fleuriste'),
    ('voc-fam-n1-4', 'FR.VOC.FAMILLES', 1, 'qcm', 'laitier'),
    ('voc-fam-n1-5', 'FR.VOC.FAMILLES', 1, 'qcm', 'jardinier'),
    ('voc-fam-n2-1', 'FR.VOC.FAMILLES', 2, 'clic', 'chanteur'),
    ('voc-fam-n2-2', 'FR.VOC.FAMILLES', 2, 'clic', 'glacier'),
    ('voc-fam-n2-3', 'FR.VOC.FAMILLES', 2, 'clic', 'marin'),
    ('voc-fam-n2-4', 'FR.VOC.FAMILLES', 2, 'clic', 'fortement'),
    ('voc-fam-n2-5', 'FR.VOC.FAMILLES', 2, 'clic', 'lentement'),
    ('voc-fam-n3-1', 'FR.VOC.FAMILLES', 3, 'clic', 'voiture'),
    ('voc-fam-n3-2', 'FR.VOC.FAMILLES', 3, 'clic', 'soleil'),
    ('voc-fam-n3-3', 'FR.VOC.FAMILLES', 3, 'clic', 'banane'),
    ('voc-fam-n3-4', 'FR.VOC.FAMILLES', 3, 'clic', 'montagne'),
    ('voc-fam-n3-5', 'FR.VOC.FAMILLES', 3, 'clic', 'tigre'),
    ('voc-fam-n4-1', 'FR.VOC.FAMILLES', 4, 'texte', 'dentiste'),
    ('voc-fam-n4-2', 'FR.VOC.FAMILLES', 4, 'texte', 'fleuriste'),
    ('voc-fam-n4-3', 'FR.VOC.FAMILLES', 4, 'texte', 'jardinier'),
    ('voc-fam-n4-4', 'FR.VOC.FAMILLES', 4, 'texte', 'cuisinier'),
    ('voc-fam-n4-5', 'FR.VOC.FAMILLES', 4, 'texte', 'marin'),
    ('voc-syn-n1-1', 'FR.VOC.SYN_CONTRAIRES', 1, 'qcm', 'heureux'),
    ('voc-syn-n1-2', 'FR.VOC.SYN_CONTRAIRES', 1, 'qcm', 'beau'),
    ('voc-syn-n1-3', 'FR.VOC.SYN_CONTRAIRES', 1, 'qcm', 'auto'),
    ('voc-syn-n1-4', 'FR.VOC.SYN_CONTRAIRES', 1, 'qcm', 'aimable'),
    ('voc-syn-n1-5', 'FR.VOC.SYN_CONTRAIRES', 1, 'qcm', 'amusant'),
    ('voc-syn-n2-1', 'FR.VOC.SYN_CONTRAIRES', 2, 'qcm', 'petit'),
    ('voc-syn-n2-2', 'FR.VOC.SYN_CONTRAIRES', 2, 'qcm', 'froid'),
    ('voc-syn-n2-3', 'FR.VOC.SYN_CONTRAIRES', 2, 'qcm', 'nuit'),
    ('voc-syn-n2-4', 'FR.VOC.SYN_CONTRAIRES', 2, 'qcm', 'triste'),
    ('voc-syn-n2-5', 'FR.VOC.SYN_CONTRAIRES', 2, 'qcm', 'descendre'),
    ('voc-syn-n3-1', 'FR.VOC.SYN_CONTRAIRES', 3, 'qcm', 'malheureux'),
    ('voc-syn-n3-2', 'FR.VOC.SYN_CONTRAIRES', 3, 'qcm', 'défaire'),
    ('voc-syn-n3-3', 'FR.VOC.SYN_CONTRAIRES', 3, 'qcm', 'déplier'),
    ('voc-syn-n3-4', 'FR.VOC.SYN_CONTRAIRES', 3, 'qcm', 'impossible'),
    ('voc-syn-n3-5', 'FR.VOC.SYN_CONTRAIRES', 3, 'qcm', 'déranger'),
    ('voc-syn-n4-1', 'FR.VOC.SYN_CONTRAIRES', 4, 'texte', 'petit'),
    ('voc-syn-n4-2', 'FR.VOC.SYN_CONTRAIRES', 4, 'texte', 'froid'),
    ('voc-syn-n4-3', 'FR.VOC.SYN_CONTRAIRES', 4, 'texte', 'nuit'),
    ('voc-syn-n4-4', 'FR.VOC.SYN_CONTRAIRES', 4, 'texte', 'lent'),
    ('voc-syn-n4-5', 'FR.VOC.SYN_CONTRAIRES', 4, 'texte', 'fermer'),
    ('voc-ps-n1-1', 'FR.VOC.PREFIXE_SUFFIXE', 1, 'qcm', 'refaire'),
    ('voc-ps-n1-2', 'FR.VOC.PREFIXE_SUFFIXE', 1, 'qcm', 'relire'),
    ('voc-ps-n1-3', 'FR.VOC.PREFIXE_SUFFIXE', 1, 'qcm', 'maisonnette'),
    ('voc-ps-n1-4', 'FR.VOC.PREFIXE_SUFFIXE', 1, 'qcm', 'tartelette'),
    ('voc-ps-n1-5', 'FR.VOC.PREFIXE_SUFFIXE', 1, 'qcm', 'chanteur'),
    ('voc-ps-n2-1', 'FR.VOC.PREFIXE_SUFFIXE', 2, 'qcm', 'joueur'),
    ('voc-ps-n2-2', 'FR.VOC.PREFIXE_SUFFIXE', 2, 'qcm', 'danseur'),
    ('voc-ps-n2-3', 'FR.VOC.PREFIXE_SUFFIXE', 2, 'qcm', 'clochette'),
    ('voc-ps-n2-4', 'FR.VOC.PREFIXE_SUFFIXE', 2, 'qcm', 'défaire'),
    ('voc-ps-n2-5', 'FR.VOC.PREFIXE_SUFFIXE', 2, 'qcm', 'recolorier'),
    ('voc-ps-n3-1', 'FR.VOC.PREFIXE_SUFFIXE', 3, 'clic', 'refaire'),
    ('voc-ps-n3-2', 'FR.VOC.PREFIXE_SUFFIXE', 3, 'clic', 'défaire'),
    ('voc-ps-n3-3', 'FR.VOC.PREFIXE_SUFFIXE', 3, 'clic', 'chanteur'),
    ('voc-ps-n3-4', 'FR.VOC.PREFIXE_SUFFIXE', 3, 'clic', 'maisonnette'),
    ('voc-ps-n3-5', 'FR.VOC.PREFIXE_SUFFIXE', 3, 'clic', 'impossible'),
    ('voc-ps-n4-1', 'FR.VOC.PREFIXE_SUFFIXE', 4, 'texte', 'relire'),
    ('voc-ps-n4-2', 'FR.VOC.PREFIXE_SUFFIXE', 4, 'texte', 'défaire'),
    ('voc-ps-n4-3', 'FR.VOC.PREFIXE_SUFFIXE', 4, 'texte', 'chanteur'),
    ('voc-ps-n4-4', 'FR.VOC.PREFIXE_SUFFIXE', 4, 'texte', 'maisonnette'),
    ('voc-ps-n4-5', 'FR.VOC.PREFIXE_SUFFIXE', 4, 'texte', 'refaire'),
    ('voc-cat-n1-1', 'FR.VOC.CATEGORIES', 1, 'qcm', 'animaux'),
    ('voc-cat-n1-2', 'FR.VOC.CATEGORIES', 1, 'qcm', 'fruits'),
    ('voc-cat-n1-3', 'FR.VOC.CATEGORIES', 1, 'qcm', 'couleurs'),
    ('voc-cat-n1-4', 'FR.VOC.CATEGORIES', 1, 'qcm', 'légumes'),
    ('voc-cat-n1-5', 'FR.VOC.CATEGORIES', 1, 'qcm', 'véhicules'),
    ('voc-cat-n2-1', 'FR.VOC.CATEGORIES', 2, 'qcm', 'poire'),
    ('voc-cat-n2-2', 'FR.VOC.CATEGORIES', 2, 'qcm', 'renard'),
    ('voc-cat-n2-3', 'FR.VOC.CATEGORIES', 2, 'qcm', 'poireau'),
    ('voc-cat-n2-4', 'FR.VOC.CATEGORIES', 2, 'qcm', 'manteau'),
    ('voc-cat-n2-5', 'FR.VOC.CATEGORIES', 2, 'qcm', 'armoire'),
    ('voc-cat-n3-1', 'FR.VOC.CATEGORIES', 3, 'clic', 'carotte'),
    ('voc-cat-n3-2', 'FR.VOC.CATEGORIES', 3, 'clic', 'table'),
    ('voc-cat-n3-3', 'FR.VOC.CATEGORIES', 3, 'clic', 'banane'),
    ('voc-cat-n3-4', 'FR.VOC.CATEGORIES', 3, 'clic', 'poire'),
    ('voc-cat-n3-5', 'FR.VOC.CATEGORIES', 3, 'clic', 'armoire'),
    ('voc-cat-n4-1', 'FR.VOC.CATEGORIES', 4, 'texte', 'fleurs'),
    ('voc-cat-n4-2', 'FR.VOC.CATEGORIES', 4, 'texte', 'animaux'),
    ('voc-cat-n4-3', 'FR.VOC.CATEGORIES', 4, 'texte', 'fruits'),
    ('voc-cat-n4-4', 'FR.VOC.CATEGORIES', 4, 'texte', 'couleurs'),
    ('voc-cat-n4-5', 'FR.VOC.CATEGORIES', 4, 'texte', 'véhicules'),
    ('mots-n1-beaucoup', 'FR.MOTS.INVARIABLES', 1, 'qcm', 'beaucoup'),
    ('mots-n1-toujours', 'FR.MOTS.INVARIABLES', 1, 'qcm', 'toujours'),
    ('mots-n1-avec', 'FR.MOTS.INVARIABLES', 1, 'qcm', 'avec'),
    ('mots-n1-dans', 'FR.MOTS.INVARIABLES', 1, 'qcm', 'dans'),
    ('mots-n1-aussi', 'FR.MOTS.INVARIABLES', 1, 'qcm', 'aussi'),
    ('mots-n2-maintenant', 'FR.MOTS.INVARIABLES', 2, 'qcm', 'maintenant'),
    ('mots-n2-souvent', 'FR.MOTS.INVARIABLES', 2, 'qcm', 'souvent'),
    ('mots-n2-jamais', 'FR.MOTS.INVARIABLES', 2, 'qcm', 'jamais'),
    ('mots-n2-encore', 'FR.MOTS.INVARIABLES', 2, 'qcm', 'encore'),
    ('mots-n2-assez', 'FR.MOTS.INVARIABLES', 2, 'qcm', 'assez'),
    ('mots-n3-pendant', 'FR.MOTS.INVARIABLES', 3, 'qcm', 'pendant'),
    ('mots-n3-depuis', 'FR.MOTS.INVARIABLES', 3, 'qcm', 'depuis'),
    ('mots-n3-trop', 'FR.MOTS.INVARIABLES', 3, 'qcm', 'trop'),
    ('mots-n3-deja', 'FR.MOTS.INVARIABLES', 3, 'qcm', 'déjà'),
    ('mots-n3-bientot', 'FR.MOTS.INVARIABLES', 3, 'qcm', 'bientôt'),
    ('mots-n4-aujourdhui', 'FR.MOTS.INVARIABLES', 4, 'texte', 'aujourd''hui'),
    ('mots-n4-ensuite', 'FR.MOTS.INVARIABLES', 4, 'texte', 'ensuite'),
    ('mots-n4-beaucoup', 'FR.MOTS.INVARIABLES', 4, 'texte', 'beaucoup'),
    ('mots-n4-toujours', 'FR.MOTS.INVARIABLES', 4, 'texte', 'toujours'),
    ('mots-n4-souvent', 'FR.MOTS.INVARIABLES', 4, 'texte', 'souvent')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 6. Verification serveur : saisie normalisee == `attendu` (miroir du client).
--    qcm -> normaliser_lettres ; clic/texte -> normaliser_mot. Accents EXIGES.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_lexique(p_cle text, p_saisie text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $fn$
    SELECT COALESCE((
        SELECT CASE WHEN l.format = 'qcm'
                    THEN public.normaliser_lettres(p_saisie) = public.normaliser_lettres(l.attendu)
                    ELSE public.normaliser_mot(p_saisie)     = public.normaliser_mot(l.attendu)
               END
          FROM public.lexique_item l WHERE l.cle = p_cle
    ), false);
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_lexique(text, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 7. Exercices de reference (FK pour reponses.exercice_id + progression).
--    exercice_id deterministe = md5('<competence>:<niveau>:<type>').
-- =========================================================================
DO $do$
DECLARE
    v_comp text;
    v_niv  integer;
    v_id   uuid;
    v_type text;
BEGIN
    FOR v_comp, v_type IN
        SELECT code, CASE WHEN code LIKE 'FR.MOTS.%' THEN 'mots_invariables' ELSE 'vocabulaire' END
          FROM public.competences
         WHERE code LIKE 'FR.VOC.%' OR code LIKE 'FR.MOTS.%'
    LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':' || v_type)::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, v_type, v_niv, v_type, true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 8. enregistrer_reponse : branche dediee op = 'lex' (ajoutee a la version
--    0041). Signature INCHANGEE -> CREATE OR REPLACE (les GRANT sont conserves).
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
        -- L'item de reference doit exister ET coller a la competence / au niveau.
        IF NOT EXISTS (SELECT 1 FROM public.lexique_item g
                        WHERE g.cle = p_op2 AND g.competence = p_competence AND g.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : item de reference absent';
        END IF;
        v_correct := public.verif_lexique(p_op2, p_reponse_texte);
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
-- 9. Sous-matieres `vocabulaire` et `mots-invariables` ACTIVES par defaut
--    (nouveaux profils) et ajoutees aux profils existants (dont Iris).
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'vocabulaire')
 WHERE NOT ('vocabulaire' = ANY (domaines_actifs));

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'mots-invariables')
 WHERE NOT ('mots-invariables' = ANY (domaines_actifs));

-- =========================================================================
-- 10. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0042_francais_vocabulaire_mots')
ON CONFLICT (version) DO NOTHING;
