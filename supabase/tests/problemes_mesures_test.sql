-- problemes_mesures_test.sql
-- Problemes de mesures MA.PB.MESURES (migration 0038). Transaction ROLLBACK.
-- Execution : deploy/test-db.sh.
--
-- Couvre :
--   * competence + prerequis presents ;
--   * verif_calcul(MA.PB.MESURES, ...) : val/add/sub/mul autorises et recalcules,
--     op2 REFUSE (reserve a DEUX_ETAPES), borne MA.PB.% (<= 20000) ;
--   * enregistrer_reponse : verdict numerique + type_faute indicatif enregistre.

BEGIN;

-- ===========================================================================
-- 1. Referentiel : competence + prerequis
-- ===========================================================================
DO $$
DECLARE n integer;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.competences WHERE code = 'MA.PB.MESURES') THEN
        RAISE EXCEPTION 'competence MA.PB.MESURES absente';
    END IF;
    SELECT count(*) INTO n FROM public.competence_prerequis WHERE competence = 'MA.PB.MESURES';
    IF n < 3 THEN
        RAISE EXCEPTION 'prerequis MA.PB.MESURES insuffisants (%).', n;
    END IF;
    SELECT count(*) INTO n FROM public.exercices WHERE competence = 'MA.PB.MESURES' AND actif;
    IF n <> 4 THEN
        RAISE EXCEPTION '4 exercices MA.PB.MESURES attendus, obtenu %', n;
    END IF;
    RAISE NOTICE 'referentiel MA.PB.MESURES : OK';
END $$;

-- ===========================================================================
-- 2. verif_calcul : ops autorisees + op2 refuse + borne
-- ===========================================================================
DO $$
DECLARE e integer; r integer;
BEGIN
    -- conversion (val) : 3 m = 300 cm -> la saisie EST la valeur.
    SELECT expected INTO e FROM public.verif_calcul('MA.PB.MESURES',1,'val',300,0,NULL,NULL);
    IF e <> 300 THEN RAISE EXCEPTION 'val 300 KO: %', e; END IF;
    -- ajout : 200 + 30 = 230.
    SELECT expected INTO e FROM public.verif_calcul('MA.PB.MESURES',3,'add',200,30,NULL,NULL);
    IF e <> 230 THEN RAISE EXCEPTION 'add KO: %', e; END IF;
    -- retrait : 500 - 40 = 460.
    SELECT expected INTO e FROM public.verif_calcul('MA.PB.MESURES',3,'sub',500,40,NULL,NULL);
    IF e <> 460 THEN RAISE EXCEPTION 'sub KO: %', e; END IF;
    -- produit : 5 x 3 = 15.
    SELECT expected INTO e FROM public.verif_calcul('MA.PB.MESURES',4,'mul',5,3,NULL,NULL);
    IF e <> 15 THEN RAISE EXCEPTION 'mul KO: %', e; END IF;
    RAISE NOTICE 'verif_calcul MA.PB.MESURES ops : OK';
END $$;

-- op2 REFUSE pour MA.PB.MESURES (reserve a DEUX_ETAPES).
DO $$
BEGIN
    PERFORM public.verif_calcul('MA.PB.MESURES',4,'mul',5,3,'add',2);
    RAISE EXCEPTION 'op2 aurait du etre refuse pour MA.PB.MESURES';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%op2 interdit%' AND SQLERRM NOT LIKE '%enonce_incoherent%' THEN
        RAISE EXCEPTION 'erreur inattendue (op2) : %', SQLERRM;
    END IF;
END $$;

-- Borne famille MA.PB.% (> 20000 refuse).
DO $$
BEGIN
    PERFORM public.verif_calcul('MA.PB.MESURES',4,'add',25000,1,NULL,NULL);
    RAISE EXCEPTION 'operande > 20000 aurait du etre refuse';
EXCEPTION WHEN others THEN
    IF SQLERRM NOT LIKE '%trop grand%' AND SQLERRM NOT LIKE '%enonce_incoherent%' THEN
        RAISE EXCEPTION 'erreur inattendue (borne) : %', SQLERRM;
    END IF;
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse : verdict + type_faute indicatif
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'
INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'pbm@example.test', now());
INSERT INTO foyers (id) VALUES ('aaaaaaaa-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'EnfantA', 'CE2');

\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 3a. Bonne reponse (conversion 3 m = 300 cm).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.PB.MESURES', NULL, 1, NULL,
        'val', 300, 0, 300, NULL, 1, 4000, false, false, false, now(),
        NULL, NULL, 'seance', NULL, NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'conversion 300 devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Mauvaise reponse + type_faute OUBLI_CONVERSION enregistre.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid(); v_tf text;
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.PB.MESURES', NULL, 1, NULL,
        'val', 300, 0, 3, NULL, 1, 4000, false, false, false, now(),
        NULL, NULL, 'seance', NULL, 'OUBLI_CONVERSION');
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'reponse 3 devrait etre fausse : %', v;
    END IF;
    SELECT type_faute INTO v_tf FROM public.reponses WHERE id = v_id;
    IF v_tf <> 'OUBLI_CONVERSION' THEN
        RAISE EXCEPTION 'type_faute OUBLI_CONVERSION non enregistre (obtenu %)', v_tf;
    END IF;
END $$;

RESET ROLE;
ROLLBACK;
