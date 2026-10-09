-- ce1_francais_dedie_test.sql
-- Migration 0124 : 3 compétences FR CE1 DÉDIÉES (accord GN, accord sujet-verbe,
-- homophones a/à-et/est-son/sont-on/ont). Vérifie de bout en bout, via
-- enregistrer_reponse(op='gram') (serveur SEUL juge) : bonne réponse acceptée,
-- mauvaise refusée, item inexistant/incohérent refusé ; + structure (portée
-- [CE1,CE1], 12 items/compétence, prérequis de remédiation CE1 -> CM1).
-- Transaction ROLLBACK. Exécution : deploy/test-db.sh (0124 déjà appliquée).

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;

\set uA '31313131-3131-3131-3131-313131313131'
\set pA 'f1000001-0000-0000-0000-000000000000'
\set claimsA '{"sub":"31313131-3131-3131-3131-313131313131","role":"authenticated"}'

INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'ce1fr@example.test', now());
INSERT INTO foyers (id) VALUES ('ffff0001-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('ffff0001-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, classe)
VALUES (:'pA', 'ffff0001-0000-0000-0000-000000000000', 'FrCE1', 'CE1');

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 1. Accord GN (clic N2) : « des » juste, « oiseaux » faux.
SELECT _rec('1a_agn_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'FR.GRAM.CE1_ACCORD_GN', NULL, 2, 'grammaire',
        'gram', 0,0,0, NULL, 1, 3000, false,false,false, now(),
        'ce1agn-n2-determinant', NULL, 'seance', 'Des', NULL) ->> 'correct')::boolean = true,
    'clic determinant Des');
SELECT _rec('1b_agn_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'FR.GRAM.CE1_ACCORD_GN', NULL, 2, 'grammaire',
        'gram', 0,0,0, NULL, 1, 3000, false,false,false, now(),
        'ce1agn-n2-determinant', NULL, 'seance', 'oiseaux', NULL) ->> 'correct')::boolean = false,
    'clic oiseaux faux');

-- 2. Accord sujet-verbe (qcm N1) : « mangent » juste, « mange » faux.
SELECT _rec('2a_asv_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'FR.GRAM.CE1_ACCORD_SV', NULL, 1, 'grammaire',
        'gram', 0,0,0, NULL, 1, 3000, false,false,false, now(),
        'ce1asv-n1-ils', NULL, 'seance', 'mangent', NULL) ->> 'correct')::boolean = true,
    'qcm mangent');
SELECT _rec('2b_asv_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'FR.GRAM.CE1_ACCORD_SV', NULL, 1, 'grammaire',
        'gram', 0,0,0, NULL, 1, 3000, false,false,false, now(),
        'ce1asv-n1-ils', NULL, 'seance', 'mange', NULL) ->> 'correct')::boolean = false,
    'qcm mange faux');

-- 3. Homophones (qcm N2) : « à » juste (accent EXIGÉ), « a » faux.
SELECT _rec('3a_homo_juste',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'FR.GRAM.CE1_HOMOPHONES', NULL, 2, 'grammaire',
        'gram', 0,0,0, NULL, 1, 3000, false,false,false, now(),
        'ce1homo-n2-aaccent', NULL, 'seance', 'à', NULL) ->> 'correct')::boolean = true,
    'qcm à accent');
SELECT _rec('3b_homo_faux',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, NULL, 'FR.GRAM.CE1_HOMOPHONES', NULL, 2, 'grammaire',
        'gram', 0,0,0, NULL, 1, 3000, false,false,false, now(),
        'ce1homo-n2-aaccent', NULL, 'seance', 'a', NULL) ->> 'correct')::boolean = false,
    'qcm a (sans accent) faux');

-- 4. Item inexistant REFUSÉ (enonce_incoherent).
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'f1000001-0000-0000-0000-000000000000'::uuid, NULL,
        'FR.GRAM.CE1_HOMOPHONES', NULL, 2, 'grammaire', 'gram', 0,0,0, NULL, 1, 3000, false,false,false, now(),
        'ce1homo-inexistant', NULL, 'seance', 'à', NULL);
    PERFORM public._rec('4_item_inexistant_refuse', false, 'aurait du etre refuse');
EXCEPTION WHEN others THEN
    PERFORM public._rec('4_item_inexistant_refuse', SQLERRM LIKE '%enonce_incoherent%', SQLERRM);
END $$;

RESET ROLE;

-- 5. Structure : portée [CE1,CE1], 12 items, prérequis de remédiation CE1 -> CM1.
SELECT _rec('5a_portee_ce1',
    (SELECT count(*) = 3 FROM public.competences
      WHERE code IN ('FR.GRAM.CE1_ACCORD_GN','FR.GRAM.CE1_ACCORD_SV','FR.GRAM.CE1_HOMOPHONES')
        AND classe_min = 'CE1' AND classe_max = 'CE1'),
    '3 compétences [CE1,CE1]');
SELECT _rec('5b_douze_items',
    (SELECT bool_and(c = 12) FROM (
        SELECT count(*) AS c FROM public.grammaire_item
         WHERE competence IN ('FR.GRAM.CE1_ACCORD_GN','FR.GRAM.CE1_ACCORD_SV','FR.GRAM.CE1_HOMOPHONES')
         GROUP BY competence) s),
    '12 items par compétence');
SELECT _rec('5c_prerequis_remediation',
    (SELECT count(*) = 3 FROM public.competence_prerequis
      WHERE (competence,prerequis) IN (
        ('FR.GRAM.ACCORD_GN','FR.GRAM.CE1_ACCORD_GN'),
        ('FR.GRAM.ACCORD_SV','FR.GRAM.CE1_ACCORD_SV'),
        ('FR.GRAM.HOMOPHONES','FR.GRAM.CE1_HOMOPHONES'))),
    'prérequis CE1 -> CM1');

DO $$
DECLARE n integer; bad text;
BEGIN
    SELECT count(*) INTO n FROM public._res WHERE NOT ok;
    IF n > 0 THEN
        SELECT string_agg(nom || ' (' || detail || ')', '; ') INTO bad FROM public._res WHERE NOT ok;
        RAISE EXCEPTION 'ce1_francais_dedie : % test(s) en echec : %', n, bad;
    END IF;
    RAISE NOTICE 'ce1_francais_dedie : % tests PASS', (SELECT count(*) FROM public._res);
END $$;

ROLLBACK;
