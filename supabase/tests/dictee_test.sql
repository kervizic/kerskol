-- dictee_test.sql
-- Dictee detective (migration 0032). Transaction ROLLBACK : aucune donnee de
-- test ne subsiste. Execution : deploy/test-db.sh.
--
-- Couvre :
--   * integrite de la banque : >= 40 textes ; chaque erreur plantee pointe bien
--     sur le mot fautif (position alignee), correction != faute, type valide ;
--   * SECURITE : la table des erreurs n'est PAS exposee a l'API (pas de droit
--     de lecture) ; dictee_charger_tous ne renvoie QUE les mots + le nombre
--     d'erreurs (jamais positions/corrections/types) ;
--   * verif_dictee : trouvees / manquees / fausses alertes ; correction avec
--     ACCENTS exiges ; regle juste/faux (N1 trouver seul, N2+ trouver+corriger) ;
--   * enregistrer_reponse(op='dictee') : verdict serveur, type_faute enregistre,
--     competence interdite rejetee, niveau incoherent rejete, autre foyer refuse.

BEGIN;

-- ===========================================================================
-- 1. Integrite de la banque (>= 40 textes, alignement des positions)
-- ===========================================================================
DO $$
DECLARE
    n_textes integer;
    n_err    integer;
    r        record;
    toks     text[];
BEGIN
    SELECT count(*) INTO n_textes FROM public.dictee_texte;
    IF n_textes < 40 THEN
        RAISE EXCEPTION 'dictee : >= 40 textes attendus, obtenu %', n_textes;
    END IF;
    SELECT count(*) INTO n_err FROM public.dictee_erreur;
    IF n_err < 40 THEN
        RAISE EXCEPTION 'dictee : au moins une erreur par texte attendue, obtenu %', n_err;
    END IF;

    -- Chaque erreur plantee : la position pointe sur un mot qui, normalise,
    -- egale la faute normalisee ; la correction differe de la faute.
    FOR r IN SELECT e.texte_id, e.position, e.faute, e.correction, t.texte
               FROM public.dictee_erreur e JOIN public.dictee_texte t ON t.id = e.texte_id
    LOOP
        toks := regexp_split_to_array(btrim(r.texte), '\s+');
        IF r.position < 1 OR r.position > array_length(toks, 1) THEN
            RAISE EXCEPTION 'dictee % : position % hors texte', r.texte_id, r.position;
        END IF;
        IF public.normaliser_mot(toks[r.position]) <> public.normaliser_mot(r.faute) THEN
            RAISE EXCEPTION 'dictee % pos % : mot « % » != faute « % »',
                r.texte_id, r.position, toks[r.position], r.faute;
        END IF;
        IF public.normaliser_mot(r.faute) = public.normaliser_mot(r.correction) THEN
            RAISE EXCEPTION 'dictee % pos % : correction = faute (« % »)',
                r.texte_id, r.position, r.correction;
        END IF;
    END LOOP;
    RAISE NOTICE 'banque dictee (% textes, % erreurs, alignement) : OK', n_textes, n_err;
END $$;

-- ===========================================================================
-- 1 bis. Progression par NOTIONS (0033) : chaque notion >= 2 textes ; les 12
--        notions ordonnees presentes ; nouveau type pluriel_al_aux present.
-- ===========================================================================
DO $$
DECLARE
    r          record;
    n_notions  integer;
    n_al_aux   integer;
BEGIN
    -- Chaque notion rattachee doit porter au moins 2 textes.
    FOR r IN SELECT notion, count(*) AS n FROM public.dictee_texte
              WHERE notion IS NOT NULL GROUP BY notion
    LOOP
        IF r.n < 2 THEN
            RAISE EXCEPTION 'dictee : notion % n''a que % texte(s) (>= 2 attendus)', r.notion, r.n;
        END IF;
    END LOOP;

    -- Les 18 notions ordonnees doivent exister et chacune porter des textes
    -- (12 d'origine + la_la/ou_ou en 0051 + 4 notions CM1 en 0090).
    SELECT count(*) INTO n_notions FROM public.dictee_notion;
    IF n_notions <> 18 THEN
        RAISE EXCEPTION 'dictee_notion : 18 notions attendues, obtenu %', n_notions;
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.dictee_notion dn
         WHERE NOT EXISTS (SELECT 1 FROM public.dictee_texte t WHERE t.notion = dn.code)
    ) THEN
        RAISE EXCEPTION 'dictee : une notion ordonnee n''a aucun texte';
    END IF;

    -- Toute notion utilisee sur un texte est connue (12 notions + 'revision').
    IF EXISTS (
        SELECT 1 FROM public.dictee_texte t
         WHERE t.notion IS NOT NULL AND t.notion <> 'revision'
           AND NOT EXISTS (SELECT 1 FROM public.dictee_notion dn WHERE dn.code = t.notion)
    ) THEN
        RAISE EXCEPTION 'dictee : un texte porte une notion hors de dictee_notion';
    END IF;

    -- Nouveau type d'erreur pluriel_al_aux effectivement planté.
    SELECT count(*) INTO n_al_aux FROM public.dictee_erreur WHERE type = 'pluriel_al_aux';
    IF n_al_aux < 1 THEN
        RAISE EXCEPTION 'dictee : aucun exemple du type pluriel_al_aux';
    END IF;

    -- Homophones la/là et ou/où (migration 0051) effectivement plantés.
    IF NOT EXISTS (SELECT 1 FROM public.dictee_erreur WHERE type = 'la_la') THEN
        RAISE EXCEPTION 'dictee : aucun exemple du type la_la';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.dictee_erreur WHERE type = 'ou_ou') THEN
        RAISE EXCEPTION 'dictee : aucun exemple du type ou_ou';
    END IF;

    RAISE NOTICE 'progression dictee (% notions, chacune >= 2 textes, al/aux x%) : OK',
        n_notions, n_al_aux;
END $$;

-- ===========================================================================
-- 1 quater. ACCENTS : aucun mot courant connu ne doit apparaitre SANS accent
--           dans un texte (ex. vallee, journee, ecole, foret, apres...). Les
--           mots fautifs homophones (a, et, on, son, ce...) restent bare et ne
--           sont PAS dans cette liste.
-- ===========================================================================
DO $$
DECLARE
    r       record;
    bare    text := '\m(' ||
        'vallee|journee|journees|deplace|deplacent|geant|geants|ete|eleve|eleves|' ||
        'foret|forets|ecole|ecoles|maitresse|maitre|pecheur|pecheurs|ile|iles|' ||
        'apres|vegetal|general|generaux|etoile|etoiles|cafe|fenetre|fenetres|' ||
        'recreation|numero|reve|reves|tres|pres|derriere|riviere|rivieres|' ||
        'lumiere|theatre|chateau|chateaux|bientot|flute|gouter|present|presente|' ||
        'prefere|repare|recite|dore|doree|parfume|parfumee|chene|coute|fete|tete|' ||
        'etait|etaient|arrivee|montee|epuises' ||
        ')\M';
    n integer := 0;
BEGIN
    FOR r IN SELECT id, texte FROM public.dictee_texte LOOP
        IF lower(public.normaliser_lettres(r.texte)) ~ bare THEN
            RAISE WARNING 'dictee % : mot sans accent dans « % »', r.id, r.texte;
            n := n + 1;
        END IF;
    END LOOP;
    IF n > 0 THEN
        RAISE EXCEPTION 'dictee : % texte(s) contiennent un mot courant SANS accent', n;
    END IF;
    RAISE NOTICE 'accents dictee : aucun mot courant sans accent : OK';
END $$;

-- ===========================================================================
-- 2. dictee_charger_tous : expose mots + nb_erreurs, JAMAIS les erreurs
-- ===========================================================================
DO $$
DECLARE
    v      jsonb;
    t1     jsonb;
    k      text;
BEGIN
    v := public.dictee_charger_tous();
    IF jsonb_array_length(v) < 40 THEN
        RAISE EXCEPTION 'dictee_charger_tous : < 40 textes';
    END IF;
    SELECT elem INTO t1 FROM jsonb_array_elements(v) elem WHERE (elem->>'id')::int = 1;
    IF t1 IS NULL THEN RAISE EXCEPTION 'texte 1 absent du chargement'; END IF;
    -- Clefs autorisees uniquement.
    FOR k IN SELECT jsonb_object_keys(t1) LOOP
        IF k NOT IN ('id','niveau','theme','mots','nb_erreurs','notion') THEN
            RAISE EXCEPTION 'dictee_charger_tous expose une clef interdite : %', k;
        END IF;
    END LOOP;
    IF jsonb_typeof(t1->'mots') <> 'array' THEN
        RAISE EXCEPTION 'mots doit etre un tableau';
    END IF;
    IF (t1->>'nb_erreurs')::int <> 1 THEN
        RAISE EXCEPTION 'texte 1 : nb_erreurs attendu 1, obtenu %', t1->>'nb_erreurs';
    END IF;
    RAISE NOTICE 'dictee_charger_tous : OK (mots + nb_erreurs, rien de sensible)';
END $$;

-- ===========================================================================
-- 3. verif_dictee : trouvees / manquees / fausses alertes / corrections
-- ===========================================================================
DO $$
DECLARE
    p1 integer;  -- position de l'erreur du texte 1 (N1, son->sont)
    pa integer;  -- texte 11 (N2) : ces->ses
    pb integer;  -- texte 11 (N2) : son->sont
    pe integer;  -- texte 28 (N3) : etoile->etoiles (accent exige)
    res jsonb;
BEGIN
    SELECT position INTO p1 FROM public.dictee_erreur WHERE texte_id = 1;

    -- N1, erreur touchee -> juste (trouver seul suffit).
    res := public.verif_dictee(1, 1, jsonb_build_array(jsonb_build_object('pos', p1)));
    IF (res->>'juste')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'N1 trouve -> juste KO : %', res; END IF;
    IF (res->>'trouvees')::int <> 1 THEN RAISE EXCEPTION 'N1 trouvees != 1 : %', res; END IF;

    -- N1, rien touche -> faux, erreur manquee, type_dominant renseigne.
    res := public.verif_dictee(1, 1, '[]'::jsonb);
    IF (res->>'juste')::boolean IS NOT FALSE THEN RAISE EXCEPTION 'N1 rien -> faux KO : %', res; END IF;
    IF (res->>'trouvees')::int <> 0 THEN RAISE EXCEPTION 'N1 trouvees != 0 : %', res; END IF;
    IF res->>'type_dominant' <> 'son_sont' THEN RAISE EXCEPTION 'type_dominant KO : %', res; END IF;

    -- N1, fausse alerte (bonne erreur + un mot juste touche) -> faux.
    res := public.verif_dictee(1, 1, jsonb_build_array(
             jsonb_build_object('pos', p1), jsonb_build_object('pos', 1)));
    IF (res->>'juste')::boolean IS NOT FALSE THEN RAISE EXCEPTION 'N1 fausse alerte -> faux KO : %', res; END IF;
    IF jsonb_array_length(res->'fausses_alertes') <> 1 THEN RAISE EXCEPTION 'fausse alerte non signalee : %', res; END IF;

    -- N2 (texte 11) : il faut TROUVER ET CORRIGER.
    SELECT position INTO pa FROM public.dictee_erreur WHERE texte_id = 11 AND type = 'ces_ses';
    SELECT position INTO pb FROM public.dictee_erreur WHERE texte_id = 11 AND type = 'son_sont';

    -- Les deux trouvees mais non corrigees -> faux (N2 exige la correction).
    res := public.verif_dictee(11, 2, jsonb_build_array(
             jsonb_build_object('pos', pa), jsonb_build_object('pos', pb)));
    IF (res->>'juste')::boolean IS NOT FALSE THEN RAISE EXCEPTION 'N2 trouve sans corriger -> faux KO : %', res; END IF;

    -- Les deux trouvees ET bien corrigees -> juste.
    res := public.verif_dictee(11, 2, jsonb_build_array(
             jsonb_build_object('pos', pa, 'cor', 'ses'),
             jsonb_build_object('pos', pb, 'cor', 'sont')));
    IF (res->>'juste')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'N2 trouve+corrige -> juste KO : %', res; END IF;
    IF (res->>'corrigees')::int <> 2 THEN RAISE EXCEPTION 'N2 corrigees != 2 : %', res; END IF;

    -- Mauvaise correction sur un mot bien trouve -> faux.
    res := public.verif_dictee(11, 2, jsonb_build_array(
             jsonb_build_object('pos', pa, 'cor', 'ced'),
             jsonb_build_object('pos', pb, 'cor', 'sont')));
    IF (res->>'juste')::boolean IS NOT FALSE THEN RAISE EXCEPTION 'N2 mauvaise correction -> faux KO : %', res; END IF;

    -- Correction ACCENTS EXIGES (texte 28, etoile -> etoiles).
    SELECT position INTO pe FROM public.dictee_erreur WHERE texte_id = 28 AND type = 'pluriel';
    res := public.verif_dictee(28, 3, jsonb_build_array(
             jsonb_build_object('pos', pe, 'cor', 'etoiles')));  -- sans accent
    IF (res->'erreurs'->0->>'correction_ok')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'accent non exige : etoiles accepte : %', res;
    END IF;
    res := public.verif_dictee(28, 3, jsonb_build_array(
             jsonb_build_object('pos', pe, 'cor', 'étoiles')));  -- avec accent
    IF (res->'erreurs'->0->>'correction_ok')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'correction accentuee refusee : etoiles : %', res;
    END IF;
    RAISE NOTICE 'verif_dictee : OK';
END $$;

-- ===========================================================================
-- 4. SECURITE : la table des erreurs n'est PAS lisible cote API
-- ===========================================================================
\set uA '11111111-1111-1111-1111-111111111111'
\set uB '22222222-2222-2222-2222-222222222222'

INSERT INTO auth.users (id, email, created_at) VALUES
    (:'uA', 'da@example.test', now()),
    (:'uB', 'db@example.test', now());
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

-- Capture la position de l'erreur du texte 1 AVANT de passer en authenticated
-- (qui ne voit aucune ligne de dictee_erreur via la RLS), pour les tests 5a/5b.
SELECT set_config('dictee.t1pos',
    (SELECT position::text FROM public.dictee_erreur WHERE texte_id = 1), false);

SET ROLE authenticated;
SET request.jwt.claims = :'claimsA';

-- 4a. dictee_erreur n'expose AUCUNE donnee cote API : soit la lecture est
--     refusee (permission), soit la RLS (activee, sans policy) renvoie 0 ligne.
--     Toute ligne visible serait une fuite.
DO $$
DECLARE n integer;
BEGIN
    BEGIN
        SELECT count(*) INTO n FROM public.dictee_erreur;
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'dictee_erreur : lecture refusee (permission) : OK';
        n := -1;
    END;
    IF n > 0 THEN
        RAISE EXCEPTION 'dictee_erreur NE DOIT PAS exposer de donnees (% lignes visibles)', n;
    END IF;
    IF n = 0 THEN
        RAISE NOTICE 'dictee_erreur : 0 ligne visible (RLS) : OK';
    END IF;
END $$;

-- 4b. dictee_charger_tous (cote API) : aucune correction/position exposee.
DO $$
DECLARE v jsonb; dump text;
BEGIN
    v := public.dictee_charger_tous();
    dump := v::text;
    IF dump LIKE '%correction%' OR dump LIKE '%"position"%' OR dump LIKE '%"faute"%' THEN
        RAISE EXCEPTION 'dictee_charger_tous fuite des donnees sensibles';
    END IF;
END $$;

-- 4c. dictee_contexte : accessible pour son propre profil, clefs non sensibles
--     (ordre/maitrise/lacunes/vus), refuse un profil d'un autre foyer.
DO $$
DECLARE v jsonb; k text;
BEGIN
    v := public.dictee_contexte('a0000001-0000-0000-0000-000000000000'::uuid);
    FOR k IN SELECT jsonb_object_keys(v) LOOP
        IF k NOT IN ('ordre','maitrise','lacunes','vus') THEN
            RAISE EXCEPTION 'dictee_contexte expose une clef interdite : %', k;
        END IF;
    END LOOP;
    IF jsonb_array_length(v->'ordre') <> 18 THEN
        RAISE EXCEPTION 'contexte : ordre des notions attendu 18, obtenu %', v->'ordre';
    END IF;
    IF (v->'ordre'->>0) <> 'pluriel' THEN
        RAISE EXCEPTION 'contexte : 1re notion attendue pluriel, obtenu %', v->'ordre'->>0;
    END IF;

    BEGIN
        PERFORM public.dictee_contexte('b0000001-0000-0000-0000-000000000000'::uuid);
        RAISE EXCEPTION 'dictee_contexte aurait du refuser un autre foyer';
    EXCEPTION WHEN others THEN
        IF SQLERRM NOT LIKE '%acces_refuse%' THEN
            RAISE EXCEPTION 'contexte autre foyer : erreur inattendue : %', SQLERRM;
        END IF;
    END;
    RAISE NOTICE 'dictee_contexte : OK';
END $$;

-- 4d. dictee_enregistrer : marque le texte vu + met a jour le suivi de la notion
--     (escalier : 2 reussites d'affilee -> maitrise ; 1 echec -> lacune).
DO $$
DECLARE v jsonb; v_notion text;
BEGIN
    SELECT notion INTO v_notion FROM public.dictee_texte WHERE id = 1; -- notion du texte 1

    -- Un echec : la notion devient une lacune, pas encore maitrisee.
    PERFORM public.dictee_enregistrer('a0000001-0000-0000-0000-000000000000'::uuid, 1, false);
    v := public.dictee_contexte('a0000001-0000-0000-0000-000000000000'::uuid);
    IF NOT (v->'vus' @> '1'::jsonb) THEN
        RAISE EXCEPTION 'dictee_enregistrer : texte 1 absent des vus : %', v;
    END IF;
    IF (v->'lacunes'->>v_notion) IS NULL THEN
        RAISE EXCEPTION 'dictee_enregistrer : notion % attendue en lacune apres un echec : %', v_notion, v;
    END IF;

    -- Deux reussites d'affilee : la notion devient maitrisee, plus de lacune.
    PERFORM public.dictee_enregistrer('a0000001-0000-0000-0000-000000000000'::uuid, 1, true);
    PERFORM public.dictee_enregistrer('a0000001-0000-0000-0000-000000000000'::uuid, 1, true);
    v := public.dictee_contexte('a0000001-0000-0000-0000-000000000000'::uuid);
    IF (v->'maitrise'->>v_notion) <> 'true' THEN
        RAISE EXCEPTION 'dictee_enregistrer : notion % attendue maitrisee apres 2 reussites : %', v_notion, v;
    END IF;
    IF (v->'lacunes'->>v_notion) IS NOT NULL THEN
        RAISE EXCEPTION 'dictee_enregistrer : notion % ne doit plus etre une lacune : %', v_notion, v;
    END IF;
    RAISE NOTICE 'dictee_enregistrer : OK';
END $$;

-- ===========================================================================
-- 5. enregistrer_reponse(op='dictee') : verdict + type_faute + gardes
-- ===========================================================================

-- 5a. Reponse JUSTE (texte 1, N1, erreur touchee) -> correct = true.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid(); p1 integer;
BEGIN
    p1 := current_setting('dictee.t1pos')::integer;
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.ORTHO.DETECTIVE', NULL, 1, NULL,
        'dictee', 1, NULL, 0, NULL, 1, 3000, false, false, false, now(),
        NULL, NULL, 'seance', NULL, NULL,
        jsonb_build_array(jsonb_build_object('pos', p1)));
    IF (v ->> 'correct')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'dictee N1 trouve devrait etre juste : %', v;
    END IF;
    IF (v -> 'dictee') IS NULL THEN
        RAISE EXCEPTION 'le detail dictee devrait etre renvoye : %', v;
    END IF;
END $$;

-- 5b. Reponse FAUSSE (rien touche) -> correct = false, type_faute enregistre.
DO $$
DECLARE v jsonb; v_id uuid := gen_random_uuid(); v_tf text;
BEGIN
    v := public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.ORTHO.DETECTIVE', NULL, 1, NULL,
        'dictee', 1, NULL, 0, NULL, 1, 3000, false, false, false, now(),
        NULL, NULL, 'seance', NULL, NULL, '[]'::jsonb);
    IF (v ->> 'correct')::boolean IS NOT FALSE THEN
        RAISE EXCEPTION 'dictee N1 rien trouve devrait etre faux : %', v;
    END IF;
    SELECT type_faute INTO v_tf FROM public.reponses WHERE id = v_id;
    IF v_tf <> 'son_sont' THEN
        RAISE EXCEPTION 'type_faute dictee non enregistre (obtenu %)', v_tf;
    END IF;
END $$;

-- 5c. Competence interdite (op='dictee' sur une competence de maths) REJETEE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'MA.NUM.LIRE_ECRIRE', NULL, 1, NULL,
        'dictee', 1, NULL, 0, NULL, 1, 3000, false, false, false, now(),
        NULL, NULL, 'seance', NULL, NULL, '[]'::jsonb);
    RAISE EXCEPTION 'competence interdite aurait du etre rejetee';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 5d. Niveau INCOHERENT (texte 1 = niveau 1, joue en niveau 2) REJETE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'a0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.ORTHO.DETECTIVE', NULL, 2, NULL,
        'dictee', 1, NULL, 0, NULL, 1, 3000, false, false, false, now(),
        NULL, NULL, 'seance', NULL, NULL, '[]'::jsonb);
    RAISE EXCEPTION 'niveau incoherent aurait du etre rejete';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%enonce_incoherent%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu enonce_incoherent) : %', SQLERRM;
        END IF;
END $$;

-- 5e. Acces a un profil d'un AUTRE foyer REFUSE.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
    PERFORM public.enregistrer_reponse(
        v_id, 'b0000001-0000-0000-0000-000000000000'::uuid, NULL, 'FR.ORTHO.DETECTIVE', NULL, 1, NULL,
        'dictee', 1, NULL, 0, NULL, 1, 3000, false, false, false, now(),
        NULL, NULL, 'seance', NULL, NULL, '[]'::jsonb);
    RAISE EXCEPTION 'acces a un autre foyer aurait du etre refuse';
EXCEPTION
    WHEN others THEN
        IF SQLERRM NOT LIKE '%acces_refuse%' THEN
            RAISE EXCEPTION 'erreur inattendue (attendu acces_refuse) : %', SQLERRM;
        END IF;
END $$;

RESET ROLE;

ROLLBACK;
