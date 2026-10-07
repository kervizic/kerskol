-- passe_compose_test.sql
-- Passe compose francais (migration 0037). Transaction ROLLBACK : aucune donnee
-- de test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre :
--   * la table public.conjugaison_pc : 240 lignes (20 verbes x 6 personnes x 2
--     genres) + spot check (accord avec etre, invariable avec avoir, accents) ;
--   * verif_passe_compose : genre impose (0/1), genre libre (NULL = m ET f),
--     mauvais auxiliaire / mauvais accord / accent refuses ;
--   * enregistrer_reponse(op='conj', p_a=4) : verdict, type_faute, gardes de
--     competence, genre libre vs impose, RLS autre foyer.

BEGIN;

-- ===========================================================================
-- 1. Table de reference : 240 formes + spot check (front == SQL)
-- ===========================================================================
DO $$
DECLARE
    r record;
    got text;
    n   integer;
BEGIN
    SELECT count(*) INTO n FROM public.conjugaison_pc;
    IF n <> 240 THEN
        RAISE EXCEPTION 'conjugaison_pc : 240 formes attendues, obtenu %', n;
    END IF;
    FOR r IN SELECT * FROM (VALUES
        ('aller',3,'f','est allée'),('aller',3,'m','est allé'),
        ('aller',6,'m','sont allés'),('aller',6,'f','sont allées'),
        ('aller',1,'m','suis allé'),('aller',1,'f','suis allée'),
        ('venir',4,'f','sommes venues'),('venir',6,'m','sont venus'),
        ('manger',1,'m','ai mangé'),('manger',1,'f','ai mangé'),
        ('etre',1,'m','ai été'),('avoir',6,'f','ont eu'),
        ('finir',3,'m','a fini'),('prendre',3,'m','a pris'),
        ('faire',5,'f','avez fait'),('dire',2,'m','as dit')
    ) AS t(verbe, personne, genre, forme)
    LOOP
        SELECT forme INTO got FROM public.conjugaison_pc
         WHERE verbe = r.verbe AND personne = r.personne AND genre = r.genre;
        IF got IS DISTINCT FROM r.forme THEN
            RAISE EXCEPTION 'conjugaison_pc KO : % % % attendu « % », obtenu « % »',
                r.verbe, r.personne, r.genre, r.forme, got;
        END IF;
    END LOOP;
    -- Verbes avec AVOIR : m et f IDENTIQUES (invariable, pas de COD).
    IF (SELECT forme FROM public.conjugaison_pc WHERE verbe='manger' AND personne=3 AND genre='m')
       IS DISTINCT FROM
       (SELECT forme FROM public.conjugaison_pc WHERE verbe='manger' AND personne=3 AND genre='f') THEN
        RAISE EXCEPTION 'manger (avoir) ne devrait pas s accorder';
    END IF;
    RAISE NOTICE 'table conjugaison_pc (240 + spot) : OK';
END $$;

-- ===========================================================================
-- 2. verif_passe_compose : genre impose, genre libre, fautes refusees
-- ===========================================================================
DO $$
BEGIN
    -- Genre IMPOSE feminin (1) : « est allée » juste, « est allé » faux (accord).
    IF NOT public.verif_passe_compose('aller',3,1,'est allée') THEN RAISE EXCEPTION 'f impose: allée refuse'; END IF;
    IF public.verif_passe_compose('aller',3,1,'est allé')      THEN RAISE EXCEPTION 'f impose: allé accepte (accord KO)'; END IF;
    -- Genre IMPOSE masculin (0).
    IF NOT public.verif_passe_compose('aller',3,0,'est allé')  THEN RAISE EXCEPTION 'm impose: allé refuse'; END IF;
    IF public.verif_passe_compose('aller',3,0,'est allée')     THEN RAISE EXCEPTION 'm impose: allée accepte'; END IF;
    -- Genre LIBRE (NULL) : les deux ecritures acceptees (je suis alle/allee).
    IF NOT public.verif_passe_compose('aller',1,NULL,'suis allé')  THEN RAISE EXCEPTION 'libre: allé refuse'; END IF;
    IF NOT public.verif_passe_compose('aller',1,NULL,'suis allée') THEN RAISE EXCEPTION 'libre: allée refuse'; END IF;
    -- Mauvais auxiliaire refuse.
    IF public.verif_passe_compose('aller',3,0,'a allé')        THEN RAISE EXCEPTION 'mauvais auxiliaire accepte'; END IF;
    IF public.verif_passe_compose('manger',3,NULL,'est mangé') THEN RAISE EXCEPTION 'mauvais auxiliaire (manger) accepte'; END IF;
    -- Avoir invariable : tolerance casse / espaces.
    IF NOT public.verif_passe_compose('manger',1,NULL,'  AI MANGÉ ') THEN RAISE EXCEPTION 'tolerance casse/espaces KO'; END IF;
    -- Accent EXIGE.
    IF public.verif_passe_compose('manger',1,NULL,'ai mange') THEN RAISE EXCEPTION 'accent non exige : mange'; END IF;
    -- Verbe absent.
    IF public.verif_passe_compose('inconnu',1,NULL,'xyz')     THEN RAISE EXCEPTION 'verbe absent accepte'; END IF;
    RAISE NOTICE 'verif_passe_compose : OK';
END $$;

-- ===========================================================================
-- 3. enregistrer_reponse(op='conj', p_a=4) : verdict + type_faute + gardes
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'pca@example.test', now()),
    (:'uB', 'pcb@example.test', now());
INSERT INTO foyers (id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000'),
    ('bbbbbbbb-0000-0000-0000-000000000000');
INSERT INTO membres_foyer (foyer_id, user_id) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000000', :'uA'),
    ('bbbbbbbb-0000-0000-0000-000000000000', :'uB');
INSERT INTO profils (id, foyer_id, surnom, classe) VALUES
    ('a0000001-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'EnfantA', 'CE2'),
    ('b0000001-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000', 'EnfantB', 'CE2');

\set claimsA '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}'

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 3a. Bonne forme ACCEPTEE : « elle est allée » (aller, p3, genre f impose).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PASSE_COMPOSE', NULL, 2, NULL,
        'conj', 4, 3, 0, NULL, 1, 3000, false, false, false, now(),
        'aller', 1, 'seance', 'est allée', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION '« est allée » (elle, aller) devrait etre juste : %', v;
    END IF;
END $$;

-- 3b. Oubli de l'accord (genre f impose) REFUSE + type_faute enregistre.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid(); v_tf text;
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PASSE_COMPOSE', NULL, 2, NULL,
        'conj', 4, 3, 1, NULL, 1, 3000, false, false, false, now(),
        'aller', 1, 'seance', 'est allé', 'ACCORD');
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION '« est allé » (elle) devrait etre faux (accord) : %', v;
    END IF;
    SELECT type_faute INTO v_tf FROM public.reponses WHERE id = v_id;
    IF v_tf <> 'ACCORD' THEN
        RAISE EXCEPTION 'type_faute ACCORD non enregistre (obtenu %)', v_tf;
    END IF;
END $$;

-- 3c. Genre LIBRE (p_c NULL) : « suis allée » et « suis allé » tous deux justes.
DO $$
DECLARE v jsonb; v_id uuid;
BEGIN
    v_id := gen_random_uuid();
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PASSE_COMPOSE', NULL, 3, NULL,
        'conj', 4, 1, NULL, NULL, 1, 3000, false, false, false, now(),
        'aller', NULL, 'seance', 'suis allée', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'libre: allée refuse : %', v; END IF;
    v_id := gen_random_uuid();
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PASSE_COMPOSE', NULL, 3, NULL,
        'conj', 4, 1, NULL, NULL, 1, 3000, false, false, false, now(),
        'aller', NULL, 'seance', 'suis allé', NULL);
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'libre: allé refuse : %', v; END IF;
END $$;

-- 3d. Mauvais auxiliaire REFUSE (« a mangé » avec etre : « est mangé »).
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid();
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PASSE_COMPOSE', NULL, 1, NULL,
        'conj', 4, 3, NULL, NULL, 1, 3000, false, false, false, now(),
        'manger', NULL, 'seance', 'est mangé', 'AUXILIAIRE');
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION '« est mangé » devrait etre faux (auxiliaire) : %', v;
    END IF;
END $$;

-- 3e. Passe compose (p_a=4) sur une competence de temps simple REJETE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PRESENT', NULL, 1, NULL,
        'conj', 4, 3, 0, NULL, 1, 3000, false, false, false, now(),
        'aller', 0, 'seance', 'est allé', NULL);
    RAISE EXCEPTION 'passe compose sur FR.CONJ.PRESENT aurait du etre rejete';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3f. Temps simple (p_a=1) sur FR.CONJ.PASSE_COMPOSE REJETE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PASSE_COMPOSE', NULL, 1, NULL,
        'conj', 1, 3, NULL, NULL, 1, 3000, false, false, false, now(),
        'chanter', NULL, 'seance', 'chante', NULL);
    RAISE EXCEPTION 'temps simple sur FR.CONJ.PASSE_COMPOSE aurait du etre rejete';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 3g. Acces a un profil d'un AUTRE foyer REFUSE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.CONJ.PASSE_COMPOSE', NULL, 2, NULL,
        'conj', 4, 3, 0, NULL, 1, 3000, false, false, false, now(),
        'aller', 1, 'seance', 'est allé', NULL);
    RAISE EXCEPTION 'acces a un autre foyer aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%acces_refuse%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu acces_refuse) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

ROLLBACK;
