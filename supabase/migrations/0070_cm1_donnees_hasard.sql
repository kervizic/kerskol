-- 0070_cm1_donnees_hasard.sql
-- LOT 7 (CM1) - MATHEMATIQUES : « Donnees et probabilites ».
-- Attendus de fin de CM1 (programme cycle 3, actualise 2025, eduscol doc 13990) :
-- organisation et gestion de donnees - lire et completer un tableau ou un
-- diagramme en barres (situations du quotidien) ; premiere approche du HASARD
-- (vocabulaire : possible / impossible / certain, a partir d'un de, d'une piece,
-- d'un sac de billes).
--
-- On REUTILISE la sous-matiere / le domaine `donnees` (migration 0044) : meme
-- table de reference public.donnees_item, meme verif_donnees (op 'don', SERVEUR
-- SEUL JUGE), meme composant <Donnees> (QCM existant ; figure « none » pour le
-- hasard -> AUCUNE nouvelle UI). On n'ajoute que DEUX competences, de portee
-- CM1..CM2 :
--   MA.DONNEES.LIRE_CM1  lire / completer un tableau ou un diagramme en barres
--                        (situations « a la maison », nombres plus grands) ;
--   MA.DONNEES.HASARD    possible / impossible / certain (de, piece, billes).
--
-- Miroir EXACT de frontend/src/domain/donnees/donnees.ts (16 items : 2 x 4 x 2),
-- test croise supabase/tests/donnees_test.sql + golden vitest (56 items au total).
--
-- Portee CM1..CM2 (classe_min = CM1) : proposees au CM1 (coeur de classe, cf.
-- frontend/.../calcul/classes.ts) et « en avance » a un CE2 qui a deja acquis la
-- lecture de donnees du CE2 (prerequis MA.DONNEES.TABLEAU / COMPARER niveau 2).
--
-- Migration ADDITIVE et IDEMPOTENTE : aucun profil ni aucune progression n'est
-- touche (Iris reste en CE2 ; le domaine `donnees` est deja actif chez elle
-- depuis 0044). Le type d'exercice 'donnees' et la methode existent deja.

-- =========================================================================
-- 1. Referentiel : 2 competences CM1 dans le domaine `donnees`.
-- =========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('MA.DONNEES.LIRE_CM1', 'MA', 'donnees', 'Lire un tableau ou un graphique', 720, 'CM1', 'CM2'),
    ('MA.DONNEES.HASARD',   'MA', 'donnees', 'Le hasard : possible, impossible, certain', 730, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE
    SET matiere = EXCLUDED.matiere, domaine = EXCLUDED.domaine, libelle = EXCLUDED.libelle,
        ordre = EXCLUDED.ordre, classe_min = EXCLUDED.classe_min, classe_max = EXCLUDED.classe_max,
        actif = true;

-- Prerequis (deblocage « en avance » pour un CE2 ; presumes acquis pour un CM1
-- via le plan de classe) : la lecture CM1 suppose le tableau CE2 acquis, le
-- hasard suppose la comparaison de donnees CE2 acquise.
INSERT INTO public.competence_prerequis (competence, prerequis, niveau_min) VALUES
    ('MA.DONNEES.LIRE_CM1', 'MA.DONNEES.TABLEAU',  2),
    ('MA.DONNEES.HASARD',   'MA.DONNEES.COMPARER', 2)
ON CONFLICT (competence, prerequis) DO NOTHING;

-- =========================================================================
-- 2. Seed des items de reference (miroir de donnees.ts ; test croise front<->SQL).
--    16 items : 2 competences x 4 niveaux x 2.
-- =========================================================================
INSERT INTO public.donnees_item (cle, competence, niveau, format, attendu) VALUES
    -- MA.DONNEES.LIRE_CM1
    ('lire-cm1-n1-a', 'MA.DONNEES.LIRE_CM1', 1, 'qcm',   '24'),
    ('lire-cm1-n1-b', 'MA.DONNEES.LIRE_CM1', 1, 'qcm',   '12'),
    ('lire-cm1-n2-a', 'MA.DONNEES.LIRE_CM1', 2, 'qcm',   '12'),
    ('lire-cm1-n2-b', 'MA.DONNEES.LIRE_CM1', 2, 'qcm',   '13'),
    ('lire-cm1-n3-a', 'MA.DONNEES.LIRE_CM1', 3, 'qcm',   '8'),
    ('lire-cm1-n3-b', 'MA.DONNEES.LIRE_CM1', 3, 'qcm',   '15'),
    ('lire-cm1-n4-a', 'MA.DONNEES.LIRE_CM1', 4, 'texte', '9'),
    ('lire-cm1-n4-b', 'MA.DONNEES.LIRE_CM1', 4, 'texte', '60'),
    -- MA.DONNEES.HASARD
    ('has-n1-a', 'MA.DONNEES.HASARD', 1, 'qcm',   'possible'),
    ('has-n1-b', 'MA.DONNEES.HASARD', 1, 'qcm',   'possible'),
    ('has-n2-a', 'MA.DONNEES.HASARD', 2, 'qcm',   'impossible'),
    ('has-n2-b', 'MA.DONNEES.HASARD', 2, 'qcm',   'impossible'),
    ('has-n3-a', 'MA.DONNEES.HASARD', 3, 'qcm',   'certain'),
    ('has-n3-b', 'MA.DONNEES.HASARD', 3, 'qcm',   'certain'),
    ('has-n4-a', 'MA.DONNEES.HASARD', 4, 'texte', 'impossible'),
    ('has-n4-b', 'MA.DONNEES.HASARD', 4, 'texte', 'possible')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- =========================================================================
-- 3. Exercices de reference (FK pour reponses.exercice_id + progression).
--    exercice_id deterministe = md5('<competence>:<niveau>:donnees') ; identique
--    au patron 0044. Type 'donnees', methode 'donnees' (deja existants).
-- =========================================================================
DO $do$
DECLARE
    v_comp text;
    v_niv  integer;
    v_id   uuid;
BEGIN
    FOR v_comp IN
        SELECT code FROM public.competences
         WHERE code IN ('MA.DONNEES.LIRE_CM1', 'MA.DONNEES.HASARD')
    LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':donnees')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'donnees', v_niv, 'donnees', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- =========================================================================
-- 4. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0070_cm1_donnees_hasard')
ON CONFLICT (version) DO NOTHING;
