-- defi_chrono_test.sql
-- Migration 0026 : DEFI CHRONO. Verifie les proprietes de securite :
--   * une reponse de defi (mode='defi') est EXCLUE de calc_progression ;
--   * enregistrer_reponse en mode 'defi' n'accepte qu'une competence maitrisee
--     (niveau >= 3) ;
--   * terminer_defi calcule le SCORE cote serveur (bonnes reponses verifiees),
--     gere le RECORD, et est idempotent ; le client ne declare jamais de score ;
--   * la recompense respecte le plafond monnaie/jour (defi inclus).
-- Transaction ROLLBACK : aucune donnee de test ne subsiste.

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;

\set uA '22222222-2222-2222-2222-222222222222'
\set pA 'b0000001-0000-0000-0000-000000000000'
\set sD 'c0000001-0000-0000-0000-000000000000'
\set sD2 'c0000002-0000-0000-0000-000000000000'
\set claimsA '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'

INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'defi@example.test', now());
INSERT INTO foyers (id) VALUES ('bbbbbbbb-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('bbbbbbbb-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, classe, monnaie)
VALUES (:'pA', 'bbbbbbbb-0000-0000-0000-000000000000', 'Defi', 'CE2', 0);

-- On maitrise l'etat : triggers de reponses desactives (on pilote progression
-- et les reponses a la main, pour isoler les proprietes testees).
ALTER TABLE public.reponses DISABLE TRIGGER reponses_progression;
ALTER TABLE public.reponses DISABLE TRIGGER reponses_monnaie;

-- Seances de defi (FK pour les reponses / terminer_defi).
INSERT INTO public.seances (id, profil_id, debut) VALUES (:'sD',  :'pA', now());
INSERT INTO public.seances (id, profil_id, debut) VALUES (:'sD2', :'pA', now());

-- =========================================================================
-- A. calc_progression EXCLUT les reponses de defi.
-- =========================================================================
-- 10 reponses de SEANCE justes sur MA.TABLES.2 -> niveau installe.
INSERT INTO public.reponses (id, profil_id, competence, niveau, correct, repondu_le, recu_le, mode)
SELECT gen_random_uuid(), :'pA', 'MA.TABLES.2', 2, true,
       now() - (interval '1 minute') * (20 - g), now() - (interval '1 minute') * (20 - g), 'seance'
  FROM generate_series(1, 10) g;

SELECT _rec('A_niveau_seance_seul',
    (public.calc_progression(:'pA', 'MA.TABLES.2')).niveau >= 3,
    'niveau installe par les seances');

-- On memorise le niveau AVANT ajout de reponses de defi.
CREATE TEMP TABLE _snap AS SELECT (public.calc_progression(:'pA', 'MA.TABLES.2')).niveau AS n;

-- 10 reponses de DEFI (dont des fausses) : ne doivent RIEN changer.
INSERT INTO public.reponses (id, profil_id, competence, niveau, correct, repondu_le, recu_le, mode)
SELECT gen_random_uuid(), :'pA', 'MA.TABLES.2', 2, (g % 2 = 0),
       now() - (interval '1 second') * g, now() - (interval '1 second') * g, 'defi'
  FROM generate_series(1, 10) g;

SELECT _rec('A_defi_sans_effet_progression',
    (public.calc_progression(:'pA', 'MA.TABLES.2')).niveau = (SELECT n FROM _snap),
    'niveau inchange malgre 10 reponses de defi');

-- =========================================================================
-- B. Eligibilite : le defi n'accepte qu'une competence maitrisee (niveau >= 3).
--    On alimente la table progression a la main (trigger desactive).
-- =========================================================================
INSERT INTO public.progression (profil_id, competence, niveau, niveau_max_atteint, placement_termine)
VALUES (:'pA', 'MA.TABLES.2', 3, 3, true),
       (:'pA', 'MA.CM.ADDITION', 2, 2, true);

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- Competence maitrisee -> defi accepte (et juste).
SELECT _rec('B_defi_competence_maitrisee',
    (public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, :'sD'::uuid, 'MA.TABLES.2', NULL, 2, NULL,
        'mul', 2, 3, 6, NULL, 1, 800, false, false, false, now(), NULL, NULL, 'defi') ->> 'correct')::boolean = true,
    'defi MA.TABLES.2 accepte');

-- Competence NON maitrisee (niveau 2) -> defi refuse.
DO $$ BEGIN
    PERFORM public.enregistrer_reponse(gen_random_uuid(), 'b0000001-0000-0000-0000-000000000000'::uuid,
        'c0000001-0000-0000-0000-000000000000'::uuid, 'MA.CM.ADDITION', NULL, 2, NULL,
        'add', 3, 4, 7, NULL, 1, 800, false, false, false, now(), NULL, NULL, 'defi');
    PERFORM _rec('B_defi_non_eligible', false, 'accepte a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('B_defi_non_eligible', SQLERRM LIKE '%defi_non_eligible%', SQLERRM);
END $$;

-- =========================================================================
-- C. terminer_defi : SCORE calcule serveur (bonnes reponses verifiees de la
--    seance), RECORD, idempotence. Le client ne fournit AUCUN score.
-- =========================================================================
-- 2 autres bonnes reponses de defi + 2 fausses sur la seance sD.
SELECT public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, :'sD'::uuid, 'MA.TABLES.2', NULL, 2, NULL,
    'mul', 2, 4, 8, NULL, 1, 800, false, false, false, now(), NULL, NULL, 'defi');  -- juste
SELECT public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, :'sD'::uuid, 'MA.TABLES.2', NULL, 2, NULL,
    'mul', 2, 5, 10, NULL, 1, 800, false, false, false, now(), NULL, NULL, 'defi'); -- juste
SELECT public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, :'sD'::uuid, 'MA.TABLES.2', NULL, 2, NULL,
    'mul', 2, 6, 99, NULL, 1, 800, false, false, false, now(), NULL, NULL, 'defi'); -- faux
SELECT public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, :'sD'::uuid, 'MA.TABLES.2', NULL, 2, NULL,
    'mul', 2, 7, 99, NULL, 1, 800, false, false, false, now(), NULL, NULL, 'defi'); -- faux

-- 3 bonnes au total sur sD (6, 8, 10) -> score serveur = 3.
SELECT _rec('C_score_serveur',
    (public.terminer_defi(:'sD'::uuid, 'tables_2_5') ->> 'score')::int = 3,
    'score = 3 bonnes reponses de defi');

-- Record et credit (plafonds par defaut : monnaie/jour 1000, par defi 30, bonus 5).
-- credit attendu = min(3,30) + 5 (nouveau record) = 8 ; monnaie = 8.
SELECT _rec('C_record_et_credit',
    (SELECT (r ->> 'nouveau_record')::boolean AND (r ->> 'record')::int = 3 AND (r ->> 'credit')::int = 8
       FROM (SELECT public.terminer_defi(:'sD'::uuid, 'tables_2_5') AS r) t),
    'idempotent : record 3, nouveau record, credit 8');

SELECT _rec('C_monnaie_creditee',
    (SELECT monnaie FROM public.profils WHERE id = :'pA') = 8,
    'monnaie = 8 apres le defi');

-- =========================================================================
-- D. Plafond monnaie/jour respecte (credits de defi inclus dans le cumul).
-- =========================================================================
RESET ROLE;
-- On abaisse le plafond du jour a 10 (deja 8 credites par le defi precedent).
UPDATE public.anti_abus_config SET valeur = 10 WHERE cle = 'monnaie_par_jour';
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 4 bonnes reponses de defi sur une NOUVELLE seance sD2.
SELECT public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, :'sD2'::uuid, 'MA.TABLES.2', NULL, 2, NULL,
    'mul', 2, 3, 6, NULL, 1, 800, false, false, false, now(), NULL, NULL, 'defi');
SELECT public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, :'sD2'::uuid, 'MA.TABLES.2', NULL, 2, NULL,
    'mul', 2, 4, 8, NULL, 1, 800, false, false, false, now(), NULL, NULL, 'defi');
SELECT public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, :'sD2'::uuid, 'MA.TABLES.2', NULL, 2, NULL,
    'mul', 2, 5, 10, NULL, 1, 800, false, false, false, now(), NULL, NULL, 'defi');
SELECT public.enregistrer_reponse(gen_random_uuid(), :'pA'::uuid, :'sD2'::uuid, 'MA.TABLES.2', NULL, 2, NULL,
    'mul', 2, 6, 12, NULL, 1, 800, false, false, false, now(), NULL, NULL, 'defi');

-- desire = min(4,30) + 5 (4 > record 3) = 9, mais il ne reste que 10 - 8 = 2.
SELECT _rec('D_plafond_jour_respecte',
    (public.terminer_defi(:'sD2'::uuid, 'tables_2_5') ->> 'credit')::int = 2,
    'credit plafonne a 2 (reste du jour)');
SELECT _rec('D_monnaie_plafonnee',
    (SELECT monnaie FROM public.profils WHERE id = :'pA') = 10,
    'monnaie = 10 (plafond jour atteint, jamais depasse)');

RESET ROLE;

-- =========================================================================
-- Rapport
-- =========================================================================
SELECT id, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS resultat, nom, detail
  FROM _res ORDER BY id;
DO $$
DECLARE v_fail int;
BEGIN
    SELECT count(*) INTO v_fail FROM _res WHERE NOT ok;
    RAISE NOTICE '=== % test(s) en echec sur % ===', v_fail, (SELECT count(*) FROM _res);
    IF v_fail > 0 THEN RAISE EXCEPTION 'TESTS EN ECHEC : %', v_fail; END IF;
END $$;

ROLLBACK;
