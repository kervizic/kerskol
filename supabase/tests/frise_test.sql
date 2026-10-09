-- frise_test.sql
-- Teste la frise personnelle (migration 0108) : verification SERVEUR de l'ordre
-- (frise_placer), etat (frise_etat) et ISOLATION RLS entre foyers. Entierement
-- dans une transaction ROLLBACK : aucune donnee de test ne subsiste.
--
-- Execution : deploy/test-db.sh. Simulation d'utilisateurs : SET ROLE
-- authenticated + SET request.jwt.claims (auth.uid() lit le claim "sub").

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

\set uA '11111111-1111-1111-1111-1111111111aa'
\set uB '22222222-2222-2222-2222-2222222222bb'

INSERT INTO auth.users (id, email, created_at)
VALUES (:'uA', 'friseA@example.test', now()), (:'uB', 'friseB@example.test', now());
INSERT INTO foyers (id) VALUES
    ('aaaaaaaa-0000-0000-0000-0000000000f1'),
    ('bbbbbbbb-0000-0000-0000-0000000000f1');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('aaaaaaaa-0000-0000-0000-0000000000f1', :'uA'),
    ('bbbbbbbb-0000-0000-0000-0000000000f1', :'uB');
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000001-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'FriseA', 'CM1'),
    ('b0000001-0000-0000-0000-0000000000f1', 'bbbbbbbb-0000-0000-0000-0000000000f1', 'FriseB', 'CM1');

\set pA 'a0000001-0000-0000-0000-0000000000f1'
\set pB 'b0000001-0000-0000-0000-0000000000f1'
\set claimsA '{"sub":"11111111-1111-1111-1111-1111111111aa","role":"authenticated"}'
\set claimsB '{"sub":"22222222-2222-2222-2222-2222222222bb","role":"authenticated"}'

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 1 : premiere carte placee (une seule carte -> ordre trivialement correct).
SELECT _rec('1_premiere_carte', public.frise_placer(:'pA', 'fri-1492-colomb', ARRAY['fri-1492-colomb']),
            'colomb');

-- 2 : deuxieme carte, bon ordre (colomb 1492 < magellan 1519) -> acquis.
SELECT _rec('2_bon_ordre',
            public.frise_placer(:'pA', 'fri-1519-magellan', ARRAY['fri-1492-colomb','fri-1519-magellan']),
            'colomb < magellan');

-- 3 : mauvais ordre (versailles place AVANT colomb) -> refuse, carte non acquise.
SELECT _rec('3_mauvais_ordre_refuse',
            NOT public.frise_placer(:'pA', 'fri-1682-versailles',
                ARRAY['fri-1682-versailles','fri-1492-colomb','fri-1519-magellan']),
            'versailles mal place');

-- 4 : apres le refus, frise_etat ne contient que 2 cartes, dans l'ordre chrono.
SELECT _rec('4_etat_2_cartes_ordonnees',
            public.frise_etat(:'pA') = ARRAY['fri-1492-colomb','fri-1519-magellan'],
            'etat = ' || array_to_string(public.frise_etat(:'pA'), ','));

-- 5 : bon placement de versailles (a la fin) -> acquis, etat a 3 cartes.
SELECT _rec('5_bon_ordre_final',
            public.frise_placer(:'pA', 'fri-1682-versailles',
                ARRAY['fri-1492-colomb','fri-1519-magellan','fri-1682-versailles']),
            'versailles a la fin');
SELECT _rec('5b_etat_3_cartes',
            array_length(public.frise_etat(:'pA'), 1) = 3,
            'etat = ' || array_to_string(public.frise_etat(:'pA'), ','));

-- 6 : cle inconnue -> false (pas d'erreur).
SELECT _rec('6_cle_inconnue_false',
            NOT public.frise_placer(:'pA', 'fri-inexistante', ARRAY['fri-inexistante']),
            'cle bidon');

-- 7 : ISOLATION RLS : B (autre foyer) ne peut pas lire la frise de A.
SET request.jwt.claims = :'claimsB';
DO $$
BEGIN
    PERFORM public.frise_etat('a0000001-0000-0000-0000-0000000000f1');
    PERFORM _rec('7_isolation_etat_B_sur_A', false, 'lecture acceptee a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('7_isolation_etat_B_sur_A', SQLERRM LIKE '%acces refuse%', 'exception : ' || SQLERRM);
END $$;

-- 8 : B ne peut pas placer une carte sur le profil de A.
DO $$
BEGIN
    PERFORM public.frise_placer('a0000001-0000-0000-0000-0000000000f1', 'fri-1685-codenoir',
                                ARRAY['fri-1685-codenoir']);
    PERFORM _rec('8_isolation_placer_B_sur_A', false, 'ecriture acceptee a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('8_isolation_placer_B_sur_A', SQLERRM LIKE '%acces refuse%', 'exception : ' || SQLERRM);
END $$;

RESET ROLE;

SELECT id, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS resultat, nom, detail FROM _res ORDER BY id;

DO $$
DECLARE v_fail int;
BEGIN
    SELECT count(*) INTO v_fail FROM _res WHERE NOT ok;
    RAISE NOTICE '=== % test(s) frise en echec sur % ===', v_fail, (SELECT count(*) FROM _res);
    IF v_fail > 0 THEN RAISE EXCEPTION 'TESTS FRISE EN ECHEC : %', v_fail; END IF;
END $$;

ROLLBACK;
