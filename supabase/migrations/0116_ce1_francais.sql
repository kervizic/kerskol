-- 0116_ce1_francais.sql
-- LOT CE1 (incrément 3) - FRANÇAIS : rendre jouable au CE1 le cœur de l'étude
-- de la langue et de l'écriture, en réutilisant les moteurs existants
-- (<Grammaire>, conjugaison, <Ecriture>), sans nouvelle compétence ni banque.
-- Même méthode SÛRE que 0114/0115 : on ouvre la PORTÉE (classe_min='CE1',
-- classe_max inchangée = CE2).
--
-- Attendus de fin d'année de CE1 (programme 2024, cycle 2), Éduscol :
--   * Grammaire (se repérer dans la phrase simple) : identifier la phrase, le
--     sujet et le verbe ; différencier nom, déterminant, adjectif, verbe,
--     pronom sujet, mots invariables ; reconnaître le groupe nominal ; les 3
--     types de phrases (déclarative, interrogative, impérative) ; ponctuation
--     de fin de phrase.
--   * Lexique : synonymes/antonymes, familles de mots, catégories, sens d'un
--     mot selon le contexte, dérivations (préfixes/suffixes), ordre
--     alphabétique / dictionnaire ; mots invariables.
--   * Conjugaison : présent, futur, imparfait (être, avoir, 1er groupe ;
--     irréguliers aux niveaux hauts) — le générateur sert être/avoir/1er groupe
--     aux N1-N2 (verbesDe), conforme au CE1.
--   * Écriture : copier sans erreur, écrire une phrase (remettre dans l'ordre).
--
-- RESTENT CE2/CM1 (non CE1 ou banques plus exigeantes, débordement vérifié) :
--   accords GN / sujet-verbe / participe passé (FR.GRAM.ACCORD_*), phrase
--   complexe, classes (adverbe/conjonction), compléments, homophones CM1
--   (ce/se, ou/où, leur/leurs), passé composé, passé simple, impératif,
--   registres de langue, sens figuré, variantes CM1 d'écriture.
--   La dictée détective (FR.ORTHO.DETECTIVE) et la compréhension de lecture
--   (FR.LECTURE.*) dépendent du NIVEAU DES TEXTES : elles feront l'objet d'un
--   incrément dédié après vérification des textes CE1.
--
-- SÛRETÉ CE2 (Iris) : classe_max inchangée (CE2) -> candidature d'un CE2
-- inchangée ; aucune donnée élève touchée ; aucune compétence créée/supprimée.
-- Migration ADDITIVE et IDEMPOTENTE.

-- =========================================================================
-- 1. Ouverture de la portée CE1 (classe_min='CE1', classe_max inchangée).
-- =========================================================================
UPDATE public.competences
   SET classe_min = 'CE1'
 WHERE matiere = 'FR'
   AND code IN (
     -- Grammaire
     'FR.GRAM.NATURE','FR.GRAM.SUJET_VERBE','FR.GRAM.GROUPE_NOMINAL',
     'FR.GRAM.TYPES_PHRASES','FR.GRAM.PONCTUATION',
     -- Vocabulaire / lexique
     'FR.VOC.ALPHABET','FR.VOC.FAMILLES','FR.VOC.SYN_CONTRAIRES',
     'FR.VOC.CATEGORIES','FR.VOC.SENS','FR.VOC.PREFIXE_SUFFIXE',
     -- Mots invariables
     'FR.MOTS.INVARIABLES',
     -- Conjugaison (temps simples)
     'FR.CONJ.PRESENT','FR.CONJ.FUTUR','FR.CONJ.IMPARFAIT',
     -- Écriture
     'FR.ECR.COPIE','FR.ECR.GUIDEE'
   )
   AND classe_min <> 'CE1';

-- =========================================================================
-- 2. Garde-fous.
-- =========================================================================
DO $do$
DECLARE
    v_n integer;
    bad text;
    ce1 text[] := ARRAY[
      'FR.GRAM.NATURE','FR.GRAM.SUJET_VERBE','FR.GRAM.GROUPE_NOMINAL',
      'FR.GRAM.TYPES_PHRASES','FR.GRAM.PONCTUATION',
      'FR.VOC.ALPHABET','FR.VOC.FAMILLES','FR.VOC.SYN_CONTRAIRES',
      'FR.VOC.CATEGORIES','FR.VOC.SENS','FR.VOC.PREFIXE_SUFFIXE',
      'FR.MOTS.INVARIABLES',
      'FR.CONJ.PRESENT','FR.CONJ.FUTUR','FR.CONJ.IMPARFAIT',
      'FR.ECR.COPIE','FR.ECR.GUIDEE'];
BEGIN
    -- 2a. Les 17 compétences ciblées sont CE1.
    SELECT count(*) INTO v_n FROM public.competences
     WHERE matiere = 'FR' AND classe_min = 'CE1' AND code = ANY(ce1);
    IF v_n <> 17 THEN
        RAISE EXCEPTION 'CE1 français : 17 compétences CE1 attendues, obtenu %', v_n;
    END IF;

    -- 2b. classe_max reste >= CE2.
    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE code = ANY(ce1)
       AND array_position(ARRAY['CP','CE1','CE2','CM1','CM2'], classe_max) < 2;
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'CE1 français : classe_max < CE2 pour %', bad;
    END IF;

    -- 2c. Non-débordement : les notions CM1/CE2 non-CE1 ne sont pas ouvertes.
    SELECT string_agg(code, ', ') INTO bad FROM public.competences
     WHERE matiere = 'FR' AND classe_min = 'CE1'
       AND code IN ('FR.GRAM.ACCORD_GN','FR.GRAM.ACCORD_SV','FR.GRAM.ACCORD_PP',
                    'FR.GRAM.PHRASE','FR.GRAM.CLASSES','FR.GRAM.COMPLEMENTS',
                    'FR.GRAM.HOMOPHONES','FR.CONJ.PASSE_COMPOSE','FR.CONJ.PASSE_SIMPLE',
                    'FR.CONJ.IMPERATIF','FR.VOC.REGISTRES','FR.VOC.SENS_FIGURE',
                    'FR.ECR.COPIE_CM1','FR.ECR.GUIDEE_CM1');
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'CE1 français : notion hors CE1 ouverte à tort : %', bad;
    END IF;
END $do$;

-- =========================================================================
-- 3. Enregistrement de la migration.
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0116_ce1_francais')
ON CONFLICT (version) DO NOTHING;
