-- 0049_ce2_audit_corrections.sql
-- AUDIT DE NIVEAU CE2 (cycle 2 revise 2024, attendus de FIN de CE2) : corrections
-- des banques d'exercices apres refonte de la geometrie (0047-0048). Migration
-- ADDITIVE et IDEMPOTENTE. Aucune progression d'Iris n'est reinitialisee : on
-- n'AJOUTE que des items / une competence, et on MET A JOUR le `attendu` de
-- quelques items de reference (le verdict futur change, les reponses deja
-- enregistrees ne bougent pas).
--
-- Quatre banques corrigees (miroir EXACT des fichiers frontend + tests croises) :
--   1. GRAMMAIRE (grammaire_item)       : 55 -> 78 items. Ajout des attendus de
--      fin de CE2 manquants : sujet inverse, verbe a un temps compose
--      (reconnaitre), negations ne…jamais / ne…plus / ne…rien, complement du nom,
--      pronoms / determinants varies, majuscule (pays) et virgule de liste.
--   2. VOCABULAIRE (lexique_item)       : 120 -> 140 items. a) ALPHABET N2 et N4
--      passent de la 1re lettre a la 2e / 3e lettre (attendu CE2 reel) ;
--      b) nouvelle competence FR.VOC.SENS : le sens d'un mot selon le CONTEXTE
--      (polysemie), 20 items.
--   3. LECTURE (comprehension_item)     : 40 -> 42 items. Les N4 copier-coller
--      deviennent de vraies inferences (referent de pronom, ressenti implicite)
--      sur des textes de 8 a 12 lignes ; 2 inferences ajoutees.
--   4. TABLEAUX ET GRAPHIQUES (donnees_item) : 3 items de tableau a double entree
--      passent de la simple LECTURE au CALCUL sur les donnees (somme ligne /
--      colonne), avec des nombres CE2 (dizaines / centaines).
--
-- Les fonctions serveur (verif_grammaire / verif_lexique / verif_comprehension /
-- verif_donnees et enregistrer_reponse) sont INCHANGEES : les ops 'gram', 'lex',
-- 'lire', 'don' traitent deja ces competences. Seule FR.VOC.SENS exige de creer
-- ses exercices de reference (comme toute competence FR.VOC.%).

-- =========================================================================
-- 1. GRAMMAIRE : 23 nouveaux items (ON CONFLICT -> idempotent).
-- =========================================================================
INSERT INTO public.grammaire_item (cle, competence, niveau, format, attendu) VALUES
    ('nature-n3-pronom',          'FR.GRAM.NATURE',         3, 'clic',  'elles'),
    ('nature-n3-determinant2',    'FR.GRAM.NATURE',         3, 'clic',  'ces'),
    ('nature-n4-determinant',     'FR.GRAM.NATURE',         4, 'texte', 'ton'),
    ('nature-n4-pronom',          'FR.GRAM.NATURE',         4, 'texte', 'ils'),
    ('sv-n2-sujet-pronom2',       'FR.GRAM.SUJET_VERBE',    2, 'clic',  'vous'),
    ('sv-n3-sujet-inverse',       'FR.GRAM.SUJET_VERBE',    3, 'clic',  'oiseau'),
    ('sv-n3-sujet-groupe',        'FR.GRAM.SUJET_VERBE',    3, 'qcm',   'Les grands arbres'),
    ('sv-n3-verbe-compose',       'FR.GRAM.SUJET_VERBE',    3, 'qcm',   'a mangé'),
    ('sv-n4-sujet-inverse',       'FR.GRAM.SUJET_VERBE',    4, 'texte', 'étoile'),
    ('sv-n4-verbe-compose',       'FR.GRAM.SUJET_VERBE',    4, 'qcm',   'sont partis'),
    ('types-n2-negative-jamais',  'FR.GRAM.TYPES_PHRASES',  2, 'qcm',   'Elle dit non, c''est une phrase négative'),
    ('types-n3-negative-plus',    'FR.GRAM.TYPES_PHRASES',  3, 'qcm',   'Négative'),
    ('types-n4-negative-rien',    'FR.GRAM.TYPES_PHRASES',  4, 'qcm',   'Négative'),
    ('types-n4-imperative',       'FR.GRAM.TYPES_PHRASES',  4, 'qcm',   'Impérative'),
    ('ponct-n2-point2',           'FR.GRAM.PONCTUATION',    2, 'qcm',   '.'),
    ('ponct-n3-majuscule-pays',   'FR.GRAM.PONCTUATION',    3, 'clic',  'espagne'),
    ('ponct-n3-virgule',          'FR.GRAM.PONCTUATION',    3, 'qcm',   'La virgule'),
    ('ponct-n4-interro',          'FR.GRAM.PONCTUATION',    4, 'qcm',   '?'),
    ('gn-n1-masculin',            'FR.GRAM.GROUPE_NOMINAL', 1, 'qcm',   'Masculin'),
    ('gn-n2-cdn-noyau',           'FR.GRAM.GROUPE_NOMINAL', 2, 'clic',  'vélo'),
    ('gn-n3-cdn-complement',      'FR.GRAM.GROUPE_NOMINAL', 3, 'clic',  'paul'),
    ('gn-n3-cdn',                 'FR.GRAM.GROUPE_NOMINAL', 3, 'qcm',   'le jus d''orange'),
    ('gn-n4-cdn-noyau',           'FR.GRAM.GROUPE_NOMINAL', 4, 'texte', 'boîte')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 2. VOCABULAIRE.
-- 2a. Nouvelle competence FR.VOC.SENS (domaine `vocabulaire`, deja actif).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('FR.VOC.SENS', 'FR', 'vocabulaire', 'Le sens d''un mot selon le contexte', 775, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- 2b. Items : remonte des 10 items ALPHABET (1re -> 2e/3e lettre) + 20 SENS.
INSERT INTO public.lexique_item (cle, competence, niveau, format, attendu) VALUES
    ('voc-alpha-n2-1', 'FR.VOC.ALPHABET', 2, 'clic',  'chat'),
    ('voc-alpha-n2-2', 'FR.VOC.ALPHABET', 2, 'clic',  'balle'),
    ('voc-alpha-n2-3', 'FR.VOC.ALPHABET', 2, 'clic',  'poire'),
    ('voc-alpha-n2-4', 'FR.VOC.ALPHABET', 2, 'clic',  'maison'),
    ('voc-alpha-n2-5', 'FR.VOC.ALPHABET', 2, 'clic',  'sapin'),
    ('voc-alpha-n4-1', 'FR.VOC.ALPHABET', 4, 'texte', 'lampe'),
    ('voc-alpha-n4-2', 'FR.VOC.ALPHABET', 4, 'texte', 'fraise'),
    ('voc-alpha-n4-3', 'FR.VOC.ALPHABET', 4, 'texte', 'blanc'),
    ('voc-alpha-n4-4', 'FR.VOC.ALPHABET', 4, 'texte', 'cerise'),
    ('voc-alpha-n4-5', 'FR.VOC.ALPHABET', 4, 'texte', 'vague'),
    ('voc-sens-n1-1', 'FR.VOC.SENS', 1, 'qcm',   'un petit animal'),
    ('voc-sens-n1-2', 'FR.VOC.SENS', 1, 'qcm',   'un dessert froid et sucré'),
    ('voc-sens-n1-3', 'FR.VOC.SENS', 1, 'qcm',   'la partie verte de l''arbre'),
    ('voc-sens-n1-4', 'FR.VOC.SENS', 1, 'qcm',   'un fruit'),
    ('voc-sens-n1-5', 'FR.VOC.SENS', 1, 'qcm',   'la liste des plats'),
    ('voc-sens-n2-1', 'FR.VOC.SENS', 2, 'qcm',   'une salle de la maison'),
    ('voc-sens-n2-2', 'FR.VOC.SENS', 2, 'qcm',   'ce qui ferme un vêtement'),
    ('voc-sens-n2-3', 'FR.VOC.SENS', 2, 'qcm',   'un objet plat pour tracer'),
    ('voc-sens-n2-4', 'FR.VOC.SENS', 2, 'qcm',   'un grand bâtiment haut'),
    ('voc-sens-n2-5', 'FR.VOC.SENS', 2, 'qcm',   'un dessin du pays'),
    ('voc-sens-n3-1', 'FR.VOC.SENS', 3, 'qcm',   'la phrase B'),
    ('voc-sens-n3-2', 'FR.VOC.SENS', 3, 'qcm',   'la phrase A'),
    ('voc-sens-n3-3', 'FR.VOC.SENS', 3, 'qcm',   'la phrase A'),
    ('voc-sens-n3-4', 'FR.VOC.SENS', 3, 'qcm',   'la phrase B'),
    ('voc-sens-n3-5', 'FR.VOC.SENS', 3, 'qcm',   'la phrase A'),
    ('voc-sens-n4-1', 'FR.VOC.SENS', 4, 'texte', 'glace'),
    ('voc-sens-n4-2', 'FR.VOC.SENS', 4, 'texte', 'souris'),
    ('voc-sens-n4-3', 'FR.VOC.SENS', 4, 'texte', 'feuille'),
    ('voc-sens-n4-4', 'FR.VOC.SENS', 4, 'texte', 'orange'),
    ('voc-sens-n4-5', 'FR.VOC.SENS', 4, 'texte', 'carte')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- 2c. Exercices de reference pour les competences VOC/MOTS (cree FR.VOC.SENS,
--     idempotent pour les autres). Meme logique que 0042 section 7.
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
-- 3. LECTURE : 7 items N4 remontes (vraie inference) + 2 inferences ajoutees.
-- =========================================================================
INSERT INTO public.comprehension_item (cle, competence, niveau, format, attendu) VALUES
    ('lec-info-n4-a', 'FR.LECTURE.INFO',      4, 'texte', 'hibernation'),
    ('lec-info-n4-b', 'FR.LECTURE.INFO',      4, 'texte', 'Biscuit'),
    ('lec-inf-n3-c',  'FR.LECTURE.INFERENCE', 3, 'qcm',   'la tarte'),
    ('lec-inf-n4-a',  'FR.LECTURE.INFERENCE', 4, 'clic',  'chien'),
    ('lec-inf-n4-b',  'FR.LECTURE.INFERENCE', 4, 'texte', 'froid'),
    ('lec-inf-n4-c',  'FR.LECTURE.INFERENCE', 4, 'texte', 'peur'),
    ('lec-vf-n3-b',   'FR.LECTURE.VRAIFAUX',  3, 'qcm',   'faux'),
    ('lec-vf-n4-a',   'FR.LECTURE.VRAIFAUX',  4, 'texte', 'faux'),
    ('lec-vf-n4-b',   'FR.LECTURE.VRAIFAUX',  4, 'texte', 'faux')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 4. TABLEAUX : 3 items double entree passent LECTURE -> CALCUL (somme).
-- =========================================================================
INSERT INTO public.donnees_item (cle, competence, niveau, format, attendu) VALUES
    ('don-tab-n3-a', 'MA.DONNEES.TABLEAU', 3, 'qcm',   '90'),
    ('don-tab-n3-b', 'MA.DONNEES.TABLEAU', 3, 'qcm',   '130'),
    ('don-tab-n4-b', 'MA.DONNEES.TABLEAU', 4, 'texte', '110')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 5. Enregistrement de la migration.
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0049_ce2_audit_corrections')
ON CONFLICT (version) DO NOTHING;
