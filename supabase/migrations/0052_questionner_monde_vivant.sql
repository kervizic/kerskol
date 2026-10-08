-- 0052_questionner_monde_vivant.sql
-- NOUVELLE MATIERE « QUESTIONNER LE MONDE » (QM, cycle 2, attendus de fin de
-- CE2), a cote de Maths (MA) et Francais (FR). Premiere SOUS-MATIERE : « Le
-- vivant » (domaine `vivant`). Batie sur l'architecture geometrie / donnees :
--
--   QM.VIVANT.CARACTERISTIQUES  caracteristiques du vivant (naitre, grandir, se
--                               nourrir, se reproduire, mourir ; vivant/non vivant) ;
--   QM.VIVANT.CYCLES            cycles de vie (grenouille, papillon, poule, plante) ;
--   QM.VIVANT.CHAINES           regimes et chaines alimentaires ;
--   QM.VIVANT.PLANTES           besoins des plantes ;
--   QM.VIVANT.CORPS             corps humain (squelette, muscles, articulations, 5 sens) ;
--   QM.VIVANT.HYGIENE           hygiene de vie (alimentation, sommeil, dents, sport).
--
-- REUTILISATION (meme patron que 0044) : meme format d'item (cle, competence,
-- niveau, format, attendu), meme principe « le SERVEUR reste SEUL JUGE » via une
-- cle d'item. On ajoute UNE table de reference public.qm_item (miroir EXACT de
-- frontend/src/domain/qm, test croise qm_test.sql + golden vitest) et UNE op
-- dediee op = 'qm' dans enregistrer_reponse (verif_qm). Les exercices sont de
-- type 'qm' (AJOUTE au CHECK) ; la generation (choix de l'item, rendu, melange)
-- est faite cote client (composant <QuestionnerLeMonde>).
--
-- FORMATS d'interaction (varies, pas seulement QCM) : qcm, texte (libre N4),
-- ordre (RANGER des etapes : cycles, chaines), tri (CLASSER : vivant/non vivant,
-- regimes...), clic (TOUCHER une zone d'une scene SVG maison ; utilise par les
-- lots suivants).
--
-- Securite / donnees reelles : migration ADDITIVE et IDEMPOTENTE. La matiere QM
-- et la sous-matiere `vivant` sont ajoutees ACTIVES au defaut ET aux profils
-- existants (dont Iris). La matiere QM existe (etape 1) et le domaine `vivant`
-- existe (etape 5) AVANT toute ecriture de profil (etape 10), pour satisfaire
-- les triggers de validation (0018 matieres, 0039 domaines). On n'ajoute qu'une
-- matiere et une sous-matiere jouables -> le garde-fou « au moins une
-- sous-matiere jouable » reste trivialement satisfait.

-- =========================================================================
-- 1. Matiere QM (FK referencee par public.competences.matiere).
-- =========================================================================
INSERT INTO public.matieres (code, libelle) VALUES
    ('QM', 'Questionner le monde')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 2. Type d'exercice 'qm' autorise (ajout au CHECK, idempotent). On reprend la
--    liste courante (0046) + 'qm'.
-- =========================================================================
ALTER TABLE public.exercices DROP CONSTRAINT IF EXISTS exercices_type_chk;
ALTER TABLE public.exercices ADD CONSTRAINT exercices_type_chk CHECK (type IN (
    'calcul','qcm','texte_trous','dictee','geometrie','vocabulaire','conjugaison',
    'grammaire','mots_invariables','donnees','comprehension','mots_maitresse',
    'dictee_maitresse','qm'));

-- =========================================================================
-- 3. Methode pedagogique dediee (reference par exercices.methode).
-- =========================================================================
INSERT INTO public.methodes (code, libelle) VALUES
    ('questionner_monde', 'Observer, classer, ranger (questionner le monde)')
ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle;

-- =========================================================================
-- 4. Table de REFERENCE (source serveur du juste/faux), miroir de domain/qm.
--    Couvre QM.* (toutes sous-matieres a venir).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.qm_item (
    cle        text    PRIMARY KEY,
    competence text    NOT NULL REFERENCES public.competences (code),
    niveau     integer NOT NULL,
    format     text    NOT NULL,
    attendu    text    NOT NULL,
    CONSTRAINT qm_item_comp_chk    CHECK (competence LIKE 'QM.%'),
    CONSTRAINT qm_item_niveau_chk  CHECK (niveau BETWEEN 1 AND 4),
    CONSTRAINT qm_item_format_chk  CHECK (format IN ('qcm','clic','texte','ordre','tri')),
    CONSTRAINT qm_item_attendu_chk CHECK (btrim(attendu) <> '')
);
COMMENT ON TABLE public.qm_item IS
    'Items de reference de « Questionner le monde » (CE2) ; miroir de '
    'frontend/src/domain/qm. Le serveur y compare la saisie normalisee. '
    'Table SERVEUR : aucun GRANT a l''API.';
ALTER TABLE public.qm_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qm_item FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.qm_item FROM anon, authenticated;

-- =========================================================================
-- 5. Referentiel : competences (matiere QM, domaine vivant). Ouvertes d'emblee
--    (pas de prerequis bloquant au CE2 ; la sous-matiere s'active par profil).
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, nb_niveaux, actif) VALUES
    ('QM.VIVANT.CARACTERISTIQUES', 'QM', 'vivant', 'Vivant ou non vivant', 800, 4, true),
    ('QM.VIVANT.CYCLES',           'QM', 'vivant', 'Les cycles de vie',     810, 4, true),
    ('QM.VIVANT.CHAINES',          'QM', 'vivant', 'Qui mange qui',         820, 4, true),
    ('QM.VIVANT.PLANTES',          'QM', 'vivant', 'Les besoins des plantes',830, 4, true),
    ('QM.VIVANT.CORPS',            'QM', 'vivant', 'Le corps humain',       840, 4, true),
    ('QM.VIVANT.HYGIENE',          'QM', 'vivant', 'Prendre soin de soi',   850, 4, true)
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, nb_niveaux=EXCLUDED.nb_niveaux, actif=true;

-- =========================================================================
-- 6. Seed des items (genere depuis domain/qm/vivant.ts ; test croise front<->SQL).
--    48 items : 6 competences x 4 niveaux x 2.
-- =========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- QM.VIVANT.CARACTERISTIQUES
    ('qm-viv-car-n1-a', 'QM.VIVANT.CARACTERISTIQUES', 1, 'qcm',   'un chat'),
    ('qm-viv-car-n1-b', 'QM.VIVANT.CARACTERISTIQUES', 1, 'qcm',   'un ballon'),
    ('qm-viv-car-n2-a', 'QM.VIVANT.CARACTERISTIQUES', 2, 'qcm',   'ils grandissent'),
    ('qm-viv-car-n2-b', 'QM.VIVANT.CARACTERISTIQUES', 2, 'tri',   'un arbre=vivant;une voiture=non vivant;un poisson=vivant;un caillou=non vivant'),
    ('qm-viv-car-n3-a', 'QM.VIVANT.CARACTERISTIQUES', 3, 'tri',   'un champignon=vivant;un nuage=non vivant;une abeille=vivant;une table=non vivant'),
    ('qm-viv-car-n3-b', 'QM.VIVANT.CARACTERISTIQUES', 3, 'qcm',   'ils se reproduisent'),
    ('qm-viv-car-n4-a', 'QM.VIVANT.CARACTERISTIQUES', 4, 'texte', 'meurt'),
    ('qm-viv-car-n4-b', 'QM.VIVANT.CARACTERISTIQUES', 4, 'texte', 'nourrit'),
    -- QM.VIVANT.CYCLES
    ('qm-viv-cyc-n1-a', 'QM.VIVANT.CYCLES', 1, 'qcm',   'un œuf'),
    ('qm-viv-cyc-n1-b', 'QM.VIVANT.CYCLES', 1, 'qcm',   'dans l''eau'),
    ('qm-viv-cyc-n2-a', 'QM.VIVANT.CYCLES', 2, 'ordre', 'l''œuf>le poussin>la poule'),
    ('qm-viv-cyc-n2-b', 'QM.VIVANT.CYCLES', 2, 'ordre', 'l''œuf>le têtard>la grenouille'),
    ('qm-viv-cyc-n3-a', 'QM.VIVANT.CYCLES', 3, 'ordre', 'l''œuf>la chenille>la chrysalide>le papillon'),
    ('qm-viv-cyc-n3-b', 'QM.VIVANT.CYCLES', 3, 'ordre', 'la graine>la pousse>la plante>la fleur'),
    ('qm-viv-cyc-n4-a', 'QM.VIVANT.CYCLES', 4, 'ordre', 'l''œuf>le têtard>le têtard à pattes>la grenouille'),
    ('qm-viv-cyc-n4-b', 'QM.VIVANT.CYCLES', 4, 'ordre', 'la graine>la pousse>la plante>la fleur>le fruit'),
    -- QM.VIVANT.CHAINES
    ('qm-viv-cha-n1-a', 'QM.VIVANT.CHAINES', 1, 'qcm',   'des plantes'),
    ('qm-viv-cha-n1-b', 'QM.VIVANT.CHAINES', 1, 'qcm',   'de la viande'),
    ('qm-viv-cha-n2-a', 'QM.VIVANT.CHAINES', 2, 'tri',   'la vache=herbivore;le loup=carnivore;le lapin=herbivore;le renard=carnivore'),
    ('qm-viv-cha-n2-b', 'QM.VIVANT.CHAINES', 2, 'qcm',   'omnivore'),
    ('qm-viv-cha-n3-a', 'QM.VIVANT.CHAINES', 3, 'ordre', 'l''herbe>le lapin>le renard'),
    ('qm-viv-cha-n3-b', 'QM.VIVANT.CHAINES', 3, 'ordre', 'la feuille>la chenille>l''oiseau'),
    ('qm-viv-cha-n4-a', 'QM.VIVANT.CHAINES', 4, 'texte', 'plante'),
    ('qm-viv-cha-n4-b', 'QM.VIVANT.CHAINES', 4, 'ordre', 'les graines>la souris>le serpent>l''aigle'),
    -- QM.VIVANT.PLANTES
    ('qm-viv-pla-n1-a', 'QM.VIVANT.PLANTES', 1, 'qcm',   'de l''eau'),
    ('qm-viv-pla-n1-b', 'QM.VIVANT.PLANTES', 1, 'qcm',   'la lumière'),
    ('qm-viv-pla-n2-a', 'QM.VIVANT.PLANTES', 2, 'tri',   'l''eau=besoin;la lumière=besoin;le chocolat=pas besoin;la télévision=pas besoin'),
    ('qm-viv-pla-n2-b', 'QM.VIVANT.PLANTES', 2, 'qcm',   'par ses racines'),
    ('qm-viv-pla-n3-a', 'QM.VIVANT.PLANTES', 3, 'qcm',   'elle meurt'),
    ('qm-viv-pla-n3-b', 'QM.VIVANT.PLANTES', 3, 'tri',   'l''air=besoin;la terre=besoin;la neige=pas besoin;la musique=pas besoin'),
    ('qm-viv-pla-n4-a', 'QM.VIVANT.PLANTES', 4, 'texte', 'soleil'),
    ('qm-viv-pla-n4-b', 'QM.VIVANT.PLANTES', 4, 'texte', 'racines'),
    -- QM.VIVANT.CORPS
    ('qm-viv-cor-n1-a', 'QM.VIVANT.CORPS', 1, 'qcm',   'les yeux'),
    ('qm-viv-cor-n1-b', 'QM.VIVANT.CORPS', 1, 'qcm',   'les oreilles'),
    ('qm-viv-cor-n2-a', 'QM.VIVANT.CORPS', 2, 'tri',   'les yeux=voir;les oreilles=entendre;le nez=sentir'),
    ('qm-viv-cor-n2-b', 'QM.VIVANT.CORPS', 2, 'qcm',   'le squelette'),
    ('qm-viv-cor-n3-a', 'QM.VIVANT.CORPS', 3, 'qcm',   'les muscles'),
    ('qm-viv-cor-n3-b', 'QM.VIVANT.CORPS', 3, 'qcm',   'une articulation'),
    ('qm-viv-cor-n4-a', 'QM.VIVANT.CORPS', 4, 'texte', 'odorat'),
    ('qm-viv-cor-n4-b', 'QM.VIVANT.CORPS', 4, 'texte', 'squelette'),
    -- QM.VIVANT.HYGIENE
    ('qm-viv-hyg-n1-a', 'QM.VIVANT.HYGIENE', 1, 'qcm',   'se brosser les dents'),
    ('qm-viv-hyg-n1-b', 'QM.VIVANT.HYGIENE', 1, 'qcm',   'de dormir'),
    ('qm-viv-hyg-n2-a', 'QM.VIVANT.HYGIENE', 2, 'tri',   'manger des légumes=bon pour la santé;faire du sport=bon pour la santé;manger trop de bonbons=pas bon pour la santé;rester toujours assis=pas bon pour la santé'),
    ('qm-viv-hyg-n2-b', 'QM.VIVANT.HYGIENE', 2, 'qcm',   'deux fois'),
    ('qm-viv-hyg-n3-a', 'QM.VIVANT.HYGIENE', 3, 'qcm',   'bouger son corps'),
    ('qm-viv-hyg-n3-b', 'QM.VIVANT.HYGIENE', 3, 'tri',   'boire de l''eau=bon pour la santé;dormir assez=bon pour la santé;manger très salé=pas bon pour la santé;se coucher très tard=pas bon pour la santé'),
    ('qm-viv-hyg-n4-a', 'QM.VIVANT.HYGIENE', 4, 'texte', 'légumes'),
    ('qm-viv-hyg-n4-b', 'QM.VIVANT.HYGIENE', 4, 'texte', 'sommeil')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 7. Verification serveur : saisie normalisee == `attendu` (miroir du client,
--    comparerQm). qcm -> normaliser_lettres (accents gardes) ; ordre/tri ->
--    comparaison structurelle (minuscule, espaces retires, separateurs gardes) ;
--    clic / texte -> normaliser_mot (accents EXIGES).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verif_qm(p_cle text, p_saisie text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $fn$
    SELECT COALESCE((
        SELECT CASE
                 WHEN q.format = 'qcm'
                   THEN public.normaliser_lettres(p_saisie) = public.normaliser_lettres(q.attendu)
                 WHEN q.format IN ('ordre','tri')
                   THEN lower(regexp_replace(COALESCE(p_saisie, ''), '\s', '', 'g'))
                      = lower(regexp_replace(q.attendu,             '\s', '', 'g'))
                 ELSE public.normaliser_mot(p_saisie) = public.normaliser_mot(q.attendu)
               END
          FROM public.qm_item q WHERE q.cle = p_cle
    ), false);
$fn$;
REVOKE EXECUTE ON FUNCTION public.verif_qm(text, text) FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- 8. Exercices de reference (FK pour reponses.exercice_id + progression).
--    exercice_id deterministe = md5('<competence>:<niveau>:qm').
-- =========================================================================
DO $do$
DECLARE
    v_comp text;
    v_niv  integer;
    v_id   uuid;
BEGIN
    FOR v_comp IN
        SELECT code FROM public.competences WHERE code LIKE 'QM.VIVANT.%'
    LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':qm')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'qm', v_niv, 'questionner_monde', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 9. enregistrer_reponse : branche dediee op = 'qm' (ajoutee a la version 0046).
--    Signature INCHANGEE -> CREATE OR REPLACE (les GRANT sont conserves). On
--    reproduit la version 0046 A L'IDENTIQUE (toutes les branches existantes :
--    lettres, conj, dictee, gram, lex, geo, don, lire, mmots, mtrou, mdictee)
--    et on insere le cas 'qm' juste avant le ELSE (arithmetique).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.enregistrer_reponse(
    p_id             uuid,
    p_profil         uuid,
    p_seance         uuid,
    p_competence     text,
    p_exercice       uuid,
    p_niveau         integer,
    p_methode        text,
    p_op             text,
    p_a              integer,
    p_b              integer,
    p_reponse        integer,
    p_reste          integer,
    p_fields         integer,
    p_temps_ms       integer,
    p_correction_lue boolean,
    p_rattrapage     boolean,
    p_placement      boolean,
    p_repondu_le     timestamptz,
    p_op2            text DEFAULT NULL,
    p_c              integer DEFAULT NULL,
    p_mode           text DEFAULT 'seance',
    p_reponse_texte  text DEFAULT NULL,
    p_type_faute     text DEFAULT NULL,
    p_dictee         jsonb DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_foyer     uuid;
    v_expected  integer;
    v_reste     integer;
    v_correct   boolean;
    v_existe    boolean;
    v_exist_cor boolean;
    v_n         integer;
    v_niv       integer;
    v_mode      text;
    v_type      text;
    v_dictee    jsonb;
    v_tniv      integer;
    v_liste     public.maitresse_liste%ROWTYPE;
    v_toks      text[];
    v_inj       jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'authentification requise';
    END IF;

    v_mode := COALESCE(p_mode, 'seance');
    IF v_mode NOT IN ('seance', 'defi') THEN
        RAISE EXCEPTION 'mode_inconnu';
    END IF;

    SELECT foyer_id INTO v_foyer FROM public.profils WHERE id = p_profil;
    IF v_foyer IS NULL THEN
        RAISE EXCEPTION 'profil_introuvable';
    END IF;
    IF NOT public.peut_acceder_profil(p_profil) THEN
        RAISE EXCEPTION 'acces_refuse';
    END IF;

    IF v_mode = 'defi' THEN
        SELECT niveau INTO v_niv FROM public.progression
         WHERE profil_id = p_profil AND competence = p_competence;
        IF v_niv IS NULL OR v_niv < 3 THEN
            RAISE EXCEPTION 'defi_non_eligible'
                USING DETAIL = 'le defi ne porte que sur des competences maitrisees (niveau >= 3)';
        END IF;
    END IF;

    SELECT true, correct INTO v_existe, v_exist_cor
      FROM public.reponses WHERE id = p_id;
    IF v_existe THEN
        RETURN jsonb_build_object(
            'ok', true, 'deja', true, 'correct', v_exist_cor,
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
    END IF;

    v_type   := NULLIF(btrim(COALESCE(p_type_faute, '')), '');
    v_dictee := NULL;

    IF p_op = 'lettres' THEN
        IF p_competence <> 'MA.NUM.LIRE_ECRIRE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lettres : competence interdite';
        END IF;
        IF p_a IS NULL OR p_a < 0 OR p_a > 10000 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lettres : nombre hors bornes';
        END IF;
        v_correct := public.verif_lettres(p_a, p_reponse_texte);
        v_expected := p_a;
        v_reste := NULL;
    ELSIF p_op = 'conj' THEN
        IF p_competence NOT LIKE 'FR.CONJ.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : competence interdite';
        END IF;
        IF p_op2 IS NULL OR p_a IS NULL OR p_a < 1 OR p_a > 4
           OR p_b IS NULL OR p_b < 1 OR p_b > 6 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : verbe/temps/personne invalides';
        END IF;
        IF p_a = 4 THEN
            IF p_competence <> 'FR.CONJ.PASSE_COMPOSE' THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : passe compose hors competence';
            END IF;
            IF p_c IS NOT NULL AND p_c NOT IN (0, 1) THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : genre invalide';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM public.conjugaison_pc
                            WHERE verbe = p_op2 AND personne = p_b) THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : forme de reference absente';
            END IF;
            v_correct := public.verif_passe_compose(p_op2, p_b, p_c, p_reponse_texte);
        ELSE
            IF p_competence = 'FR.CONJ.PASSE_COMPOSE' THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : temps simple hors competence';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM public.conjugaison
                            WHERE verbe = p_op2 AND temps = p_a AND personne = p_b) THEN
                RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'conj : forme de reference absente';
            END IF;
            v_correct := public.verif_conjugaison(p_op2, p_a, p_b, p_reponse_texte);
        END IF;
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'dictee' THEN
        IF p_competence <> 'FR.ORTHO.DETECTIVE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : competence interdite';
        END IF;
        IF p_a IS NULL OR p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : texte/niveau invalides';
        END IF;
        SELECT niveau INTO v_tniv FROM public.dictee_texte WHERE id = p_a;
        IF v_tniv IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : texte absent';
        END IF;
        IF v_tniv <> p_niveau THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'dictee : niveau incoherent';
        END IF;
        v_dictee  := public.verif_dictee(p_a, p_niveau, p_dictee);
        v_correct := (v_dictee->>'juste')::boolean;
        v_type    := v_dictee->>'type_dominant';
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'gram' THEN
        IF p_competence NOT LIKE 'FR.GRAM.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.grammaire_item g
                        WHERE g.cle = p_op2 AND g.competence = p_competence AND g.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'gram : item de reference absent';
        END IF;
        v_correct := public.verif_grammaire(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'lex' THEN
        IF p_competence NOT LIKE 'FR.VOC.%' AND p_competence NOT LIKE 'FR.MOTS.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.lexique_item g
                        WHERE g.cle = p_op2 AND g.competence = p_competence AND g.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lex : item de reference absent';
        END IF;
        v_correct := public.verif_lexique(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'geo' THEN
        IF p_competence NOT LIKE 'MA.GEO.%' AND p_competence NOT LIKE 'MA.REPERE.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'geo : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'geo : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'geo : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.geometrie_item g
                        WHERE g.cle = p_op2 AND g.competence = p_competence AND g.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'geo : item de reference absent';
        END IF;
        v_correct := public.verif_geo(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'don' THEN
        IF p_competence NOT LIKE 'MA.DONNEES.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.donnees_item d
                        WHERE d.cle = p_op2 AND d.competence = p_competence AND d.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'don : item de reference absent';
        END IF;
        v_correct := public.verif_donnees(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'lire' THEN
        IF p_competence NOT LIKE 'FR.LECTURE.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lire : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lire : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lire : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.comprehension_item c
                        WHERE c.cle = p_op2 AND c.competence = p_competence AND c.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'lire : item de reference absent';
        END IF;
        v_correct := public.verif_comprehension(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'mmots' THEN
        IF p_competence <> 'FR.MAITRESSE.MOTS' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mmots : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mmots : liste manquante';
        END IF;
        SELECT * INTO v_liste FROM public.maitresse_liste
          WHERE id = p_op2::uuid AND foyer_id = v_foyer AND active = true;
        IF v_liste.id IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mmots : liste absente ou inactive';
        END IF;
        IF p_a IS NULL OR p_a < 1 OR p_a > COALESCE(array_length(v_liste.mots, 1), 0) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mmots : index hors bornes';
        END IF;
        v_correct := public.normaliser_mot(COALESCE(p_reponse_texte, '')) = public.normaliser_mot(v_liste.mots[p_a]);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'mtrou' THEN
        IF p_competence <> 'FR.MAITRESSE.DICTEE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mtrou : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mtrou : liste manquante';
        END IF;
        SELECT * INTO v_liste FROM public.maitresse_liste
          WHERE id = p_op2::uuid AND foyer_id = v_foyer AND active = true;
        IF v_liste.id IS NULL OR v_liste.texte IS NULL OR btrim(v_liste.texte) = '' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mtrou : liste/texte absent';
        END IF;
        v_toks := regexp_split_to_array(btrim(v_liste.texte), '\s+');
        IF p_a IS NULL OR p_a < 1 OR p_a > COALESCE(array_length(v_toks, 1), 0) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mtrou : index hors bornes';
        END IF;
        v_correct := public.normaliser_mot(COALESCE(p_reponse_texte, '')) = public.normaliser_mot(v_toks[p_a]);
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'mdictee' THEN
        IF p_competence <> 'FR.MAITRESSE.DICTEE' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mdictee : competence interdite';
        END IF;
        IF p_op2 IS NULL OR p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mdictee : liste/niveau invalides';
        END IF;
        SELECT * INTO v_liste FROM public.maitresse_liste
          WHERE id = p_op2::uuid AND foyer_id = v_foyer AND active = true;
        IF v_liste.id IS NULL OR v_liste.texte IS NULL OR btrim(v_liste.texte) = '' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'mdictee : liste/texte absent';
        END IF;
        v_inj     := public._maitresse_injecter(v_liste.texte, p_niveau);
        v_dictee  := public._verif_dictee_core(p_niveau, v_inj->'erreurs', p_dictee);
        v_correct := (v_dictee->>'juste')::boolean;
        v_type    := v_dictee->>'type_dominant';
        v_expected := NULL;
        v_reste := NULL;
    ELSIF p_op = 'qm' THEN
        -- Questionner le monde : item de reference dans public.qm_item ;
        -- verif_qm compare la saisie normalisee a `attendu`.
        IF p_competence NOT LIKE 'QM.%' THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'qm : competence interdite';
        END IF;
        IF p_op2 IS NULL THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'qm : item manquant';
        END IF;
        IF p_niveau IS NULL OR p_niveau < 1 OR p_niveau > 4 THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'qm : niveau invalide';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.qm_item q
                        WHERE q.cle = p_op2 AND q.competence = p_competence AND q.niveau = p_niveau) THEN
            RAISE EXCEPTION 'enonce_incoherent' USING DETAIL = 'qm : item de reference absent';
        END IF;
        v_correct := public.verif_qm(p_op2, p_reponse_texte);
        v_expected := NULL;
        v_reste := NULL;
    ELSE
        SELECT expected, reste INTO v_expected, v_reste
          FROM public.verif_calcul(p_competence, p_niveau, p_op, p_a, p_b, p_op2, p_c);
        v_correct := (p_reponse = v_expected)
                     AND (COALESCE(p_fields, 1) < 2 OR p_reste = v_reste);
    END IF;

    SELECT count(*) INTO v_n FROM public.reponses
     WHERE profil_id = p_profil AND recu_le >= now() - interval '1 minute';
    IF v_n >= public._plafond('reponses_par_minute') THEN
        RAISE EXCEPTION 'plafond_reponses_minute';
    END IF;

    SELECT count(*) INTO v_n FROM public.reponses
     WHERE profil_id = p_profil AND recu_le >= date_trunc('day', now());
    IF v_n >= public._plafond('reponses_par_jour') THEN
        RAISE EXCEPTION 'plafond_reponses_jour';
    END IF;

    INSERT INTO public.reponses (
        id, profil_id, seance_id, competence, exercice_id, niveau, methode,
        correct, temps_ms, aide_utilisee, correction_lue, rattrapage, placement,
        repondu_le, mode, type_faute)
    VALUES (
        p_id, p_profil, p_seance, p_competence, p_exercice, p_niveau, p_methode,
        v_correct, p_temps_ms, false, COALESCE(p_correction_lue, false),
        COALESCE(p_rattrapage, false), COALESCE(p_placement, false),
        COALESCE(p_repondu_le, now()), v_mode, v_type);

    RETURN jsonb_build_object(
        'ok', true, 'deja', false,
        'correct', v_correct,
        'reponse_attendue', v_expected,
        'reste_attendu', v_reste,
        'dictee', v_dictee,
        'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'ok', true, 'deja', true,
            'correct', (SELECT correct FROM public.reponses WHERE id = p_id),
            'monnaie', (SELECT monnaie FROM public.profils WHERE id = p_profil));
END;
$$;

-- =========================================================================
-- 10. Activation : matiere QM + sous-matiere `vivant` ACTIVES par defaut
--     (nouveaux profils) ET ajoutees aux profils existants (dont Iris). L'ordre
--     respecte les triggers : la matiere QM et le domaine vivant existent deja
--     (etapes 1 et 5). MA reste active partout -> au moins une sous-matiere
--     jouable est garantie a chaque UPDATE.
-- =========================================================================
ALTER TABLE public.profils
    ALTER COLUMN matieres_actives SET DEFAULT '{MA,QM}'::text[];

UPDATE public.profils
   SET matieres_actives = array_append(matieres_actives, 'QM')
 WHERE NOT ('QM' = ANY (matieres_actives));

ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','geometrie','repere','donnees',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe',
        'lecture','mots-maitresse','vivant'
    ]::text[];

UPDATE public.profils
   SET domaines_actifs = array_append(domaines_actifs, 'vivant')
 WHERE NOT ('vivant' = ANY (domaines_actifs));

-- =========================================================================
-- 11. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0052_questionner_monde_vivant')
ON CONFLICT (version) DO NOTHING;
