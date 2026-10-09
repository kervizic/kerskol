-- 0098_cm1_sciences.sql
-- LOT (CM1) - NOUVELLE MATIERE « SCIENCES ET TECHNOLOGIE » (code ST, cycle 3,
-- reperes CM1 d'eduscol). A cote de Maths (MA), Francais (FR), Questionner le
-- monde (QM) et EMC. Six SOUS-MATIERES (un `domaine` chacune, portee CM1..CM2) :
--   ST.MATIERE.ETATS     etats_matiere      etats de l'eau, changements, melanges, air ;
--   ST.VIVANT.CLASSER    classification     classer le vivant, besoins vegetaux, chaines ;
--   ST.CORPS.SANTE       corps_humain       alimentation, hygiene, trajet de la digestion ;
--   ST.ENERGIE.SOURCES   energie            sources, renouvelables, economies a la maison ;
--   ST.OBJETS.TECHNIQUE  objets_techniques  fonction d'usage, evolution, circuits electriques ;
--   ST.TERRE.CIEL        ciel_terre         systeme solaire, jour/nuit, saisons.
--
-- REUTILISATION (meme principe que EMC 0058) : meme table de reference
-- public.qm_item (GENERALISEE ici pour accepter ST.%), meme fonction verif_qm
-- (jugement par la cle), meme op serveur 'qm' (branche ELARGIE a ST.%), meme
-- composant <QuestionnerLeMonde>. Seuls le CATALOGUE (type 'sciences', methode
-- 'sciences') et le contenu changent. Un test croise garantit front == SQL
-- (frontend/src/domain/sciences + sciences_test.sql).
--
-- BIENVEILLANCE : contenus optimistes, chaines alimentaires formulees « est
-- mange par » (jamais « tue / devore »). Reperes limites CM1<->CM2 (digestion,
-- saisons, conducteurs) traites simplement, places aux niveaux hauts.
--
-- Securite / donnees reelles : migration ADDITIVE et IDEMPOTENTE. La matiere ST
-- et ses 6 domaines sont ajoutes ACTIFS au DEFAUT et aux profils existants.
-- Portee CM1..CM2 (classe_min='CM1') : masquee au CE2 cote client ; le moteur ne
-- la propose pas a un CE2 (sous-matiere non visible). MA reste active partout
-- (garde-fou « au moins une sous-matiere jouable » trivialement satisfait).
-- Le DEFAUT de domaines_actifs n'est JAMAIS recopie : il est lu en base puis
-- complete (avec test de completude), conformement a la lecon de 0073.

-- =========================================================================
-- 1. Matiere ST.
-- =========================================================================
INSERT INTO public.matieres (code, libelle) VALUES
    ('ST', 'Sciences et technologie')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 2. Types d'exercice (ajout idempotent). On reprend la liste courante (0063) +
--    'sciences' / 'histoire' / 'geographie' (lots CM1 a venir, additif).
-- =========================================================================
ALTER TABLE public.exercices DROP CONSTRAINT IF EXISTS exercices_type_chk;
ALTER TABLE public.exercices ADD CONSTRAINT exercices_type_chk CHECK (type IN (
    'calcul','qcm','texte_trous','dictee','geometrie','vocabulaire','conjugaison',
    'grammaire','mots_invariables','donnees','comprehension','mots_maitresse',
    'dictee_maitresse','qm','emc','ecriture','sciences','histoire','geographie'));

-- =========================================================================
-- 3. Methode pedagogique dediee.
-- =========================================================================
INSERT INTO public.methodes (code, libelle) VALUES
    ('sciences', 'Observer, classer, experimenter (sciences et technologie)')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 4. Table de reference GENERALISEE : public.qm_item accepte desormais QM.%,
--    EMC.%, ST.%, HIST.%, GEO.% (meme modele, meme verif_qm).
-- =========================================================================
ALTER TABLE public.qm_item DROP CONSTRAINT IF EXISTS qm_item_comp_chk;
ALTER TABLE public.qm_item ADD CONSTRAINT qm_item_comp_chk
    CHECK (competence LIKE 'QM.%' OR competence LIKE 'EMC.%'
        OR competence LIKE 'ST.%' OR competence LIKE 'HIST.%' OR competence LIKE 'GEO.%');

-- =========================================================================
-- 5. Referentiel : 6 competences CM1 (une par domaine, portee CM1..CM2).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('ST.MATIERE.ETATS',    'ST', 'etats_matiere',     'États et mélanges',       1300, 'CM1', 'CM2'),
    ('ST.VIVANT.CLASSER',   'ST', 'classification',    'Classer le vivant',       1310, 'CM1', 'CM2'),
    ('ST.CORPS.SANTE',      'ST', 'corps_humain',      'Le corps et la santé',    1320, 'CM1', 'CM2'),
    ('ST.ENERGIE.SOURCES',  'ST', 'energie',           'L''énergie',              1330, 'CM1', 'CM2'),
    ('ST.OBJETS.TECHNIQUE', 'ST', 'objets_techniques', 'Les objets techniques',   1340, 'CM1', 'CM2'),
    ('ST.TERRE.CIEL',       'ST', 'ciel_terre',        'La Terre et le ciel',     1350, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min,
    classe_max=EXCLUDED.classe_max, actif=true;

-- =========================================================================
-- 6. Seed des items (genere depuis frontend/src/domain/sciences ; test croise
--    front<->SQL). 48 items : 6 competences x 4 niveaux x 2.
-- =========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    ('st-mat-n1-a', 'ST.MATIERE.ETATS', 1, 'qcm', 'liquide'),
    ('st-mat-n1-b', 'ST.MATIERE.ETATS', 1, 'qcm', 'de la glace'),
    ('st-mat-n2-a', 'ST.MATIERE.ETATS', 2, 'tri', 'un glaçon=solide;le jus d''orange=liquide;l''air du ballon=gaz'),
    ('st-mat-n2-b', 'ST.MATIERE.ETATS', 2, 'qcm', 'l''évaporation'),
    ('st-mat-n3-a', 'ST.MATIERE.ETATS', 3, 'tri', 'le sucre=se dissout;le sel=se dissout;le sable=ne se dissout pas;l''huile=ne se dissout pas'),
    ('st-mat-n3-b', 'ST.MATIERE.ETATS', 3, 'qcm', 'une solution'),
    ('st-mat-n4-a', 'ST.MATIERE.ETATS', 4, 'texte', 'fonte'),
    ('st-mat-n4-b', 'ST.MATIERE.ETATS', 4, 'texte', 'vent'),
    ('st-viv-n1-a', 'ST.VIVANT.CLASSER', 1, 'qcm', 'les poissons'),
    ('st-viv-n1-b', 'ST.VIVANT.CLASSER', 1, 'qcm', 'oiseau'),
    ('st-viv-n2-a', 'ST.VIVANT.CLASSER', 2, 'tri', 'la coccinelle=insecte;le moineau=oiseau;la fourmi=insecte;la mésange=oiseau'),
    ('st-viv-n2-b', 'ST.VIVANT.CLASSER', 2, 'qcm', 'sels minéraux du sol'),
    ('st-viv-n3-a', 'ST.VIVANT.CLASSER', 3, 'tri', 'l''eau=besoin;la lumière=besoin;la musique=pas besoin;le chocolat=pas besoin'),
    ('st-viv-n3-b', 'ST.VIVANT.CLASSER', 3, 'ordre', 'l''herbe>la sauterelle>la grenouille'),
    ('st-viv-n4-a', 'ST.VIVANT.CLASSER', 4, 'texte', 'plante'),
    ('st-viv-n4-b', 'ST.VIVANT.CLASSER', 4, 'texte', 'carnivore'),
    ('st-cor-n1-a', 'ST.CORPS.SANTE', 1, 'qcm', 'trois ou quatre repas'),
    ('st-cor-n1-b', 'ST.CORPS.SANTE', 1, 'qcm', 'l''eau'),
    ('st-cor-n2-a', 'ST.CORPS.SANTE', 2, 'tri', 'manger des légumes=bon pour la santé;bien dormir=bon pour la santé;manger trop de bonbons=moins bon;rester assis toute la journée=moins bon'),
    ('st-cor-n2-b', 'ST.CORPS.SANTE', 2, 'qcm', 'la bouche'),
    ('st-cor-n3-a', 'ST.CORPS.SANTE', 3, 'ordre', 'la bouche>l''estomac>l''intestin'),
    ('st-cor-n3-b', 'ST.CORPS.SANTE', 3, 'qcm', 'donner de l''énergie au corps'),
    ('st-cor-n4-a', 'ST.CORPS.SANTE', 4, 'texte', 'digestion'),
    ('st-cor-n4-b', 'ST.CORPS.SANTE', 4, 'texte', 'dormir'),
    ('st-ene-n1-a', 'ST.ENERGIE.SOURCES', 1, 'qcm', 'le Soleil'),
    ('st-ene-n1-b', 'ST.ENERGIE.SOURCES', 1, 'qcm', 'le vent'),
    ('st-ene-n2-a', 'ST.ENERGIE.SOURCES', 2, 'tri', 'le soleil=renouvelable;le vent=renouvelable;le pétrole=s''épuise;le charbon=s''épuise'),
    ('st-ene-n2-b', 'ST.ENERGIE.SOURCES', 2, 'qcm', 'éteindre la lumière'),
    ('st-ene-n3-a', 'ST.ENERGIE.SOURCES', 3, 'tri', 'mettre un pull plutôt que monter le chauffage=économise;éteindre l''écran la nuit=économise;laisser l''eau chaude couler pour rien=gaspille;chauffer avec la fenêtre ouverte=gaspille'),
    ('st-ene-n3-b', 'ST.ENERGIE.SOURCES', 3, 'qcm', 'la pile'),
    ('st-ene-n4-a', 'ST.ENERGIE.SOURCES', 4, 'texte', 'électricité'),
    ('st-ene-n4-b', 'ST.ENERGIE.SOURCES', 4, 'texte', 'renouvelables'),
    ('st-obj-n1-a', 'ST.OBJETS.TECHNIQUE', 1, 'qcm', 'se protéger de la pluie'),
    ('st-obj-n1-b', 'ST.OBJETS.TECHNIQUE', 1, 'qcm', 'l''ampoule'),
    ('st-obj-n2-a', 'ST.OBJETS.TECHNIQUE', 2, 'tri', 'le stylo=pour écrire;les ciseaux=pour couper;la règle=pour mesurer'),
    ('st-obj-n2-b', 'ST.OBJETS.TECHNIQUE', 2, 'qcm', 'ouvrir ou fermer le circuit'),
    ('st-obj-n3-a', 'ST.OBJETS.TECHNIQUE', 3, 'ordre', 'la bougie>la lampe à huile>l''ampoule électrique'),
    ('st-obj-n3-b', 'ST.OBJETS.TECHNIQUE', 3, 'qcm', 'que le circuit soit fermé'),
    ('st-obj-n4-a', 'ST.OBJETS.TECHNIQUE', 4, 'texte', 'interrupteur'),
    ('st-obj-n4-b', 'ST.OBJETS.TECHNIQUE', 4, 'texte', 'conducteur'),
    ('st-ter-n1-a', 'ST.TERRE.CIEL', 1, 'qcm', 'la Terre'),
    ('st-ter-n1-b', 'ST.TERRE.CIEL', 1, 'qcm', 'le système solaire'),
    ('st-ter-n2-a', 'ST.TERRE.CIEL', 2, 'qcm', 'la Terre tourne sur elle-même'),
    ('st-ter-n2-b', 'ST.TERRE.CIEL', 2, 'tri', 'le Soleil brille=le jour;les étoiles brillent=la nuit;il fait clair dehors=le jour;la lune éclaire=la nuit'),
    ('st-ter-n3-a', 'ST.TERRE.CIEL', 3, 'ordre', 'le printemps>l''été>l''automne>l''hiver'),
    ('st-ter-n3-b', 'ST.TERRE.CIEL', 3, 'qcm', 'les saisons'),
    ('st-ter-n4-a', 'ST.TERRE.CIEL', 4, 'texte', 'Soleil'),
    ('st-ter-n4-b', 'ST.TERRE.CIEL', 4, 'texte', 'nuit')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 7. enregistrer_reponse : branche op = 'qm' ELARGIE a ST.% / HIST.% / GEO.%
--    (reprend la version 0088 A L'IDENTIQUE, seule la condition de la branche
--    'qm' est elargie). Signature inchangee -> les GRANT sont conserves.
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
        IF p_competence NOT LIKE 'QM.%' AND p_competence NOT LIKE 'EMC.%'
           AND p_competence NOT LIKE 'ST.%' AND p_competence NOT LIKE 'HIST.%'
           AND p_competence NOT LIKE 'GEO.%' THEN
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
-- 8. Exercices de reference (FK pour reponses + progression). exercice_id
--    deterministe = md5('<competence>:<niveau>:sciences').
-- =========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOR v_comp IN SELECT code FROM public.competences WHERE code LIKE 'ST.%' LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':sciences')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'sciences', v_niv, 'sciences', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 9. Activation : matiere ST + 6 domaines ACTIFS par DEFAUT et pour les profils
--    existants (dont Iris). Le DEFAUT de domaines_actifs est LU EN BASE puis
--    complete (jamais recopie), avec test de completude (lecon de 0073).
-- =========================================================================

-- 9a. matieres_actives : ajoute 'ST' au DEFAUT (lu en base) et aux profils.
DO $do$
DECLARE v_expr text; v_cur text[];
BEGIN
    SELECT pg_get_expr(adbin, adrelid) INTO v_expr
      FROM pg_attrdef ad
      JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
     WHERE a.attrelid = 'public.profils'::regclass AND a.attname = 'matieres_actives';
    EXECUTE 'SELECT ' || v_expr INTO v_cur;
    IF NOT ('ST' = ANY (v_cur)) THEN
        v_cur := v_cur || ARRAY['ST'];
        EXECUTE 'ALTER TABLE public.profils ALTER COLUMN matieres_actives SET DEFAULT '
                || quote_literal(v_cur::text) || '::text[]';
    END IF;
END $do$;

UPDATE public.profils
   SET matieres_actives = array_append(matieres_actives, 'ST')
 WHERE NOT ('ST' = ANY (matieres_actives));

-- 9b. domaines_actifs : ajoute les 6 domaines au DEFAUT (lu en base, complete,
--     avec test de completude) et aux profils existants (additif).
DO $do$
DECLARE
    v_expr    text;
    v_cur     text[];
    v_new     text[] := ARRAY['etats_matiere','classification','corps_humain',
                              'energie','objets_techniques','ciel_terre'];
    v_before  text[];
    d         text;
BEGIN
    SELECT pg_get_expr(adbin, adrelid) INTO v_expr
      FROM pg_attrdef ad
      JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
     WHERE a.attrelid = 'public.profils'::regclass AND a.attname = 'domaines_actifs';
    IF v_expr IS NULL THEN
        RAISE EXCEPTION 'domaines_actifs : DEFAUT introuvable en base';
    END IF;
    EXECUTE 'SELECT ' || v_expr INTO v_cur;
    v_before := v_cur;
    FOREACH d IN ARRAY v_new LOOP
        IF NOT (d = ANY (v_cur)) THEN
            v_cur := v_cur || ARRAY[d];
        END IF;
    END LOOP;
    -- Test de completude : AUCUN domaine present avant ne doit disparaitre.
    FOREACH d IN ARRAY v_before LOOP
        IF NOT (d = ANY (v_cur)) THEN
            RAISE EXCEPTION 'completude KO : le domaine % aurait disparu du DEFAUT', d;
        END IF;
    END LOOP;
    -- Tous les nouveaux doivent etre presents.
    FOREACH d IN ARRAY v_new LOOP
        IF NOT (d = ANY (v_cur)) THEN
            RAISE EXCEPTION 'completude KO : le domaine % manque dans le DEFAUT', d;
        END IF;
    END LOOP;
    EXECUTE 'ALTER TABLE public.profils ALTER COLUMN domaines_actifs SET DEFAULT '
            || quote_literal(v_cur::text) || '::text[]';
END $do$;

UPDATE public.profils
   SET domaines_actifs = domaines_actifs || (
       SELECT array_agg(d)
         FROM unnest(ARRAY['etats_matiere','classification','corps_humain',
                           'energie','objets_techniques','ciel_terre']) AS d
        WHERE NOT (d = ANY (domaines_actifs)))
 WHERE NOT (domaines_actifs @> ARRAY['etats_matiere','classification','corps_humain',
                                     'energie','objets_techniques','ciel_terre']);

-- =========================================================================
-- 10. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0098_cm1_sciences')
ON CONFLICT (version) DO NOTHING;
