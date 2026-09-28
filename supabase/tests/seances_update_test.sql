-- seances_update_test.sql
-- Verifie la migration 0011 : une seance peut etre creee PUIS cloturee (UPDATE)
-- par le foyer proprietaire, mais pas par un autre foyer, et son profil_id est
-- fige. Tout en transaction ROLLBACK (aucune donnee ne subsiste).

BEGIN;

CREATE TABLE _res (id serial PRIMARY KEY, nom text, ok boolean, detail text);
CREATE FUNCTION _rec(p_nom text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
$$ INSERT INTO public._res (nom, ok, detail) VALUES (p_nom, p_ok, p_detail); $$;
GRANT EXECUTE ON FUNCTION _rec(text, boolean, text) TO authenticated;
GRANT INSERT, SELECT ON public._res TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE _res_id_seq TO authenticated;

\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'
INSERT INTO auth.users (id, email, created_at)
VALUES (:'uA', 'sa@example.test', now()), (:'uB', 'sb@example.test', now());
INSERT INTO foyers (id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000'),
    ('bbbbbbbb-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000', :'uA'),
    ('bbbbbbbb-0000-0000-0000-000000000000', :'uB');
INSERT INTO profils (id, foyer_id, surnom) VALUES
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'EnfantA'),
    ('b0000001-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000', 'EnfantB');

\set pA 'a0000001-0000-0000-0000-000000000000'
\set pB 'b0000001-0000-0000-0000-000000000000'
\set sA 'ffffffff-0000-0000-0000-000000000001'
\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'
\set claimsB '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}'

-- --- A cree et cloture sa seance -------------------------------------------
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

INSERT INTO seances (id, profil_id, debut) VALUES (:'sA', :'pA', now());

UPDATE seances SET fin = now(), duree_s = 300, monnaie_gagnee = 12 WHERE id = :'sA';

SELECT _rec('1_cloture_par_proprietaire',
            (SELECT duree_s FROM seances WHERE id = :'sA') = 300
        AND (SELECT monnaie_gagnee FROM seances WHERE id = :'sA') = 12,
            'duree=' || coalesce((SELECT duree_s FROM seances WHERE id = :'sA')::text, 'NULL'));

-- profil_id fige : tentative de reaffectation -> exception
DO $$
BEGIN
    UPDATE seances SET profil_id = 'b0000001-0000-0000-0000-000000000000'
     WHERE id = 'ffffffff-0000-0000-0000-000000000001';
    PERFORM _rec('2_profil_fige', false, 'reaffectation acceptee a tort');
EXCEPTION WHEN OTHERS THEN
    PERFORM _rec('2_profil_fige', true, 'refus attendu : ' || SQLERRM);
END $$;

RESET ROLE;

-- --- B ne peut pas cloturer la seance de A ---------------------------------
SET ROLE authenticated;
SET request.jwt.claims = :'claimsB';

UPDATE seances SET duree_s = 999 WHERE id = :'sA';  -- RLS : 0 ligne touchee

RESET ROLE;

-- Verification hors RLS (postgres) : la valeur n'a pas bouge.
SELECT _rec('3_autre_foyer_sans_effet',
            (SELECT duree_s FROM seances WHERE id = :'sA') = 300,
            'duree = ' || (SELECT duree_s FROM seances WHERE id = :'sA'));

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
