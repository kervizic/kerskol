-- 0059_bienveillance_contenus.sql
-- AUDIT BIENVEILLANCE (decision de Manu, regle absolue) : tous les contenus
-- montres a l'enfant doivent etre OPTIMISTES et PLEINS DE BIENVEILLANCE (rien de
-- dramatique ni de cruel : pas de mort, pas de violence, pas de peur forte, pas
-- d'enfant malheureux, pas de catastrophe ; les faits scientifiques necessaires
-- restent possibles s'ils sont dits avec douceur).
--
-- Migration ADDITIVE et IDEMPOTENTE. Aucune progression d'Iris n'est
-- reinitialisee : on ne fait que METTRE A JOUR le texte d'une dictee et
-- l'`attendu` de deux items de reference (le verdict FUTUR change ; les reponses
-- deja enregistrees ne bougent pas). Miroir EXACT des fichiers frontend corriges
-- dans le meme lot (tests croises : comprehension_test.sql, qm_test.sql,
-- bienveillance_test.sql + golden vitest).
--
-- 3 corrections de contenu STOCKE en base (les autres corrections de l'audit --
-- distracteur EMC `emc-rep-dro-n1-a`, phrases grammaire `ponct-n4-exclam` /
-- `nature-n4-determinant`, phrase vocabulaire `voc-sens-n1-1` -- vivent
-- UNIQUEMENT cote frontend : aucune ligne SQL a modifier pour celles-la) :
--
--   1. DICTEE 150 (son_sont, village_breton) : "celebrer la mer et les marins
--      disparus" (evocation de deuil/mort) -> "celebrer la mer et les jolis
--      bateaux". Le mot fautif "son" -> "sont" et sa POSITION sont INCHANGES
--      ("marins disparus" et "jolis bateaux" = 2 tokens chacun, meme nombre de
--      mots avant l'erreur) : public.dictee_erreur reste valide, on ne touche
--      que public.dictee_texte.texte.
--   2. QM qm-viv-pla-n3-a : la plante privee d'eau et de lumiere "se fane"
--      (au lieu de "meurt"). attendu "elle meurt" -> "elle se fane".
--   3. LECTURE lec-inf-n4-c : Jade est "impatiente" (au lieu de "peur") avant
--      de monter sur scene. attendu "peur" -> "impatiente".

-- =========================================================================
-- 1. DICTEE 150 : texte bienveillant (meme erreur "son", meme position).
-- =========================================================================
UPDATE public.dictee_texte
   SET texte = 'Chaque année, les habitants du village préparent une grande fête pour célébrer la mer et les jolis bateaux. Les lanternes, allumées dès la nuit tombée, son déposées sur l''eau par les enfants.'
 WHERE id = 150;

-- =========================================================================
-- 2. QM : la plante "se fane" (au lieu de "meurt").
-- =========================================================================
UPDATE public.qm_item
   SET attendu = 'elle se fane'
 WHERE cle = 'qm-viv-pla-n3-a';

-- =========================================================================
-- 3. LECTURE : Jade est "impatiente" (au lieu de "peur").
-- =========================================================================
UPDATE public.comprehension_item
   SET attendu = 'impatiente'
 WHERE cle = 'lec-inf-n4-c';

-- =========================================================================
-- 4. Garde-fou : les trois corrections sont bien en place (miroir front).
-- =========================================================================
DO $$
DECLARE
    v_txt text;
BEGIN
    SELECT texte INTO v_txt FROM public.dictee_texte WHERE id = 150;
    IF v_txt IS NULL OR v_txt LIKE '%marins disparus%' OR v_txt NOT LIKE '%jolis bateaux%' THEN
        RAISE EXCEPTION 'dictee 150 non corrigee (texte = %)', v_txt;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.qm_item WHERE cle = 'qm-viv-pla-n3-a' AND attendu = 'elle se fane') THEN
        RAISE EXCEPTION 'qm-viv-pla-n3-a : attendu non corrige (se fane)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.comprehension_item WHERE cle = 'lec-inf-n4-c' AND attendu = 'impatiente') THEN
        RAISE EXCEPTION 'lec-inf-n4-c : attendu non corrige (impatiente)';
    END IF;
END $$;

-- =========================================================================
-- 5. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0059_bienveillance_contenus')
ON CONFLICT (version) DO NOTHING;
