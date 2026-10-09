-- emc_cm1_test.sql
-- EMC - complement CM1 (migration 0101). Transaction ROLLBACK. Execution :
-- deploy/test-db.sh. Le comptage GLOBAL des items EMC est verifie par
-- emc_test.sql (count(EMC.%) = count(competences EMC) * 8, auto-echelonne).
-- Ici : 48 items CM1, couverture 6 competences x 4 niveaux, spot-check CROISE
-- avec frontend/src/domain/emc/cm1.ts, verif_qm, enregistrer_reponse(op='qm'),
-- et activation des 6 domaines CM1 pour TOUS les profils.

BEGIN;

-- 1. 48 items CM1, couverture + spot-check (front==SQL).
DO $$
DECLARE r record; got text; n integer;
BEGIN
    SELECT count(*) INTO n FROM public.qm_item
     WHERE competence IN ('EMC.DROITS','EMC.SYMBOLES','EMC.COOPERATION',
                          'EMC.EGALITE','EMC.PRUDENCE','EMC.ENGAGEMENT');
    IF n <> 48 THEN RAISE EXCEPTION 'EMC CM1 : 48 items attendus, obtenu %', n; END IF;

    FOR r IN SELECT c.code AS competence, nv AS niveau
               FROM public.competences c, generate_series(1,4) AS nv
              WHERE c.code IN ('EMC.DROITS','EMC.SYMBOLES','EMC.COOPERATION',
                               'EMC.EGALITE','EMC.PRUDENCE','EMC.ENGAGEMENT')
    LOOP
        IF NOT EXISTS (SELECT 1 FROM public.qm_item
                        WHERE competence = r.competence AND niveau = r.niveau) THEN
            RAISE EXCEPTION 'EMC CM1 : aucun item pour % N%', r.competence, r.niveau;
        END IF;
    END LOOP;

    FOR r IN SELECT * FROM (VALUES
        ('emc-dro-n2-a','EMC.DROITS',2,'tri','aller à l''école=un droit de l''enfant;être soigné quand on est malade=un droit de l''enfant;jouer et se reposer=un droit de l''enfant;faire tout ce qu''on veut sans règle=pas un droit'),
        ('emc-dro-n4-a','EMC.DROITS',4,'texte','enfant'),
        ('emc-sym-n2-a','EMC.SYMBOLES',2,'qcm','Liberté, Égalité, Fraternité'),
        ('emc-sym-n4-a','EMC.SYMBOLES',4,'texte','Fraternité'),
        ('emc-coo-n3-b','EMC.COOPERATION',3,'qcm','en parler à un adulte de confiance'),
        ('emc-ega-n2-a','EMC.EGALITE',2,'tri','une fille peut devenir pompière=vrai;un garçon peut faire de la danse=vrai;seuls les garçons sont bons en maths=faux;seules les filles peuvent cuisiner=faux'),
        ('emc-pru-n2-a','EMC.PRUDENCE',2,'tri','mon mot de passe=on garde pour soi;mon adresse=on garde pour soi;mon dessin préféré=on peut partager;mon jeu préféré=on peut partager'),
        ('emc-eng-n1-b','EMC.ENGAGEMENT',1,'qcm','on vote'),
        ('emc-eng-n4-a','EMC.ENGAGEMENT',4,'texte','délégué'),
        ('emc-coo-n4-b','EMC.COOPERATION',4,'texte','confiance')
    ) AS t(cle, competence, niveau, format, attendu)
    LOOP
        SELECT format || '|' || attendu INTO got FROM public.qm_item WHERE cle = r.cle;
        IF got IS DISTINCT FROM (r.format || '|' || r.attendu) THEN
            RAISE EXCEPTION 'qm_item EMC CM1 KO : % attendu « % », obtenu « % »',
                r.cle, r.format || '|' || r.attendu, got;
        END IF;
    END LOOP;
    RAISE NOTICE 'EMC CM1 : 48 items, couverture + spot OK';
END $$;

-- 2. verif_qm sur quelques items CM1.
DO $$
BEGIN
    IF NOT public.verif_qm('emc-eng-n1-b','on vote') THEN RAISE EXCEPTION 'qcm juste refuse'; END IF;
    IF public.verif_qm('emc-eng-n1-b','on prend le plus grand') THEN RAISE EXCEPTION 'qcm faux accepte'; END IF;
    IF NOT public.verif_qm('emc-sym-n4-a','Fraternité') THEN RAISE EXCEPTION 'texte juste refuse'; END IF;
    IF public.verif_qm('emc-sym-n4-a','Fraternite') THEN RAISE EXCEPTION 'texte accent non exige'; END IF;
    IF NOT public.verif_qm('emc-ega-n2-a','une fille peut devenir pompière=vrai;un garçon peut faire de la danse=vrai;seuls les garçons sont bons en maths=faux;seules les filles peuvent cuisiner=faux') THEN RAISE EXCEPTION 'tri juste refuse'; END IF;
    RAISE NOTICE 'verif_qm EMC CM1 : OK';
END $$;

-- 3. enregistrer_reponse(op='qm') sur une competence CM1.
\set uA '11111111-1111-1111-1111-111111111111'
INSERT INTO auth.users (id, email, created_at) VALUES (:'uA', 'emccm1@example.test', now());
INSERT INTO foyers (id) VALUES ('aaaaaaaa-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', :'uA');
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'EnfantA', 'CM1');
\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'
SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'EMC.ENGAGEMENT', NULL, 1, 'vivre_ensemble',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'emc-eng-n1-b', NULL, 'seance', 'on vote', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'EMC « on vote » devrait etre juste : %', v;
    END IF;
END $$;

DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'EMC.ENGAGEMENT', NULL, 1, 'vivre_ensemble',
        'qm', 0, 0, 0, NULL, 1, 3000, false, false, false, now(),
        'emc-eng-n1-b', NULL, 'seance', 'on prend le plus grand', NULL);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'EMC mauvaise reponse devrait etre fausse : %', v;
    END IF;
END $$;

RESET ROLE;

-- 4. Activation : 6 domaines CM1 actifs pour TOUS les profils + completude DEFAUT.
DO $$
DECLARE n integer; d text; v_expr text; v_cur text[];
BEGIN
    FOREACH d IN ARRAY ARRAY['droits_enfant','symboles_republique','cooperation','egalite','prudence_ecrans','engagement']
    LOOP
        SELECT count(*) INTO n FROM public.profils WHERE NOT (d = ANY (domaines_actifs));
        IF n <> 0 THEN RAISE EXCEPTION 'domaine % devrait etre actif pour TOUS les profils, manque dans %', d, n; END IF;
    END LOOP;
    SELECT pg_get_expr(adbin, adrelid) INTO v_expr
      FROM pg_attrdef ad JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
     WHERE a.attrelid = 'public.profils'::regclass AND a.attname = 'domaines_actifs';
    EXECUTE 'SELECT ' || v_expr INTO v_cur;
    FOREACH d IN ARRAY ARRAY['numeration','lecture','respect','etats_matiere','traces_anciennes',
                             'se_reperer','droits_enfant','symboles_republique','cooperation',
                             'egalite','prudence_ecrans','engagement']
    LOOP
        IF NOT (d = ANY (v_cur)) THEN RAISE EXCEPTION 'DEFAUT domaines_actifs incomplet : % manquant', d; END IF;
    END LOOP;
    RAISE NOTICE 'EMC CM1 : 6 domaines actifs partout + DEFAUT complet : OK';
END $$;

ROLLBACK;
