-- bienveillance_test.sql
-- Garde-fou BIENVEILLANCE cote SERVEUR (decision de Manu, regle absolue).
-- Transaction ROLLBACK : aucune donnee de test ne subsiste. Execution :
-- deploy/test-db.sh.
--
-- Verifie qu'AUCUN contenu enfant STOCKE EN BASE ne contient de mot/expression
-- interdit(e) : textes de la dictee detective (public.dictee_texte.texte, 100+
-- textes, contenu propre au serveur) et, par precaution, les reponses attendues
-- de reference (public.comprehension_item.attendu, public.qm_item.attendu).
--
-- Les autres contenus enfant (consignes, enonces, options, explications de
-- lecture / QM / EMC / grammaire / vocabulaire, enonces generes de maths,
-- indices, messages de correction) vivent cote FRONTEND : ils sont couverts par
-- le golden vitest frontend/src/domain/bienveillance.test.ts.
--
-- public.maitresse_liste.texte n'est PAS verifie : c'est un contenu SAISI par le
-- foyer (dictee de la maitresse), pas un contenu livre par l'application.
--
-- LISTE BLANCHE (whitelist) EXPLICITE :
--   * qm-viv-car-n4-a : attendu « meurt » (derniere caracteristique du vivant,
--     exigee par le programme, dite calmement). Seule exception autorisee.

BEGIN;

DO $$
DECLARE
    -- Mots interdits (insensible a la casse via ~*, frontieres de mot \y).
    pat text := '\y(mort|morte|morts|mortes|mourir|meurt|meurs|meurent|mourant|' ||
                'mourra|mourront|mourut|tuer|tue|tues|tué|tuée|tués|tuées|tuent|' ||
                'tuait|dévorer|dévore|dévorés|dévorent|devorer|devore|sang|saigne|' ||
                'saigner|saignement|saignant|blesse|blessé|blessée|blessés|blessées|' ||
                'blesser|blessure|blessures|blessant|battu|battue|battus|battues|' ||
                'abandon|abandonné|abandonnée|abandonnés|abandonner|abandonne|' ||
                'puni|punie|punis|punies|punir|punition|moque|moqué|moquer|moquent|' ||
                'moquerie|moqueries|cruel|cruelle|cruels|cruauté|cruaute|atroce|' ||
                'terrifié|terrifiant|terreur|effroi|effrayant|effrayante|cauchemar|' ||
                'noyé|noyée|noyés|noyer|noyade|catastrophe|catastrophes|guerre|' ||
                'guerres|fusil|fusils|pistolet|pistolets|massacre|massacré|sanglant)\y';
    -- Whitelist pedagogique : mots sensibles gardes VOLONTAIREMENT (on les
    -- retire du texte AVANT de scanner, par ligne concernee).
    --   wpat_emc    : « moquerie » / « blesser (les sentiments) » dans le
    --                 domaine EMC (sujet enseigne : refuser la moquerie,
    --                 s'excuser quand on a blesse un ami).
    --   wpat_vivant : « mourir / meurt » pour qm-viv-car-n4-a (caracteristique
    --                 du vivant exigee par le programme).
    wpat_emc text := '\y(moque|moqué|moquer|moquent|moquait|moquerie|moqueries|' ||
                     'moqueur|moqueuse|blesse|blessé|blessée|blessés|blessées|' ||
                     'blesser|blessure|blessant)\y';
    wpat_vivant text := '\y(mourir|meurt|meurs|meurent|mort|morte|morts|mortes)\y';
    cleaned text;
    r record;
    n integer := 0;
BEGIN
    -- 1. Dictee detective : les textes affiches a l'enfant.
    FOR r IN
        SELECT id, theme, texte FROM public.dictee_texte WHERE texte ~* pat
    LOOP
        RAISE WARNING 'BIENVEILLANCE KO : dictee % (%) : « % »', r.id, r.theme, r.texte;
        n := n + 1;
    END LOOP;

    -- 2. Reponses attendues de reference (lecture), hors whitelist.
    FOR r IN
        SELECT cle, attendu FROM public.comprehension_item WHERE attendu ~* pat
    LOOP
        RAISE WARNING 'BIENVEILLANCE KO : comprehension_item % : « % »', r.cle, r.attendu;
        n := n + 1;
    END LOOP;

    -- 3. Reponses attendues de reference (QM et EMC, meme table qm_item), apres
    --    retrait des mots whitelistes applicables a la ligne.
    FOR r IN
        SELECT cle, competence, attendu FROM public.qm_item WHERE attendu ~* pat
    LOOP
        cleaned := r.attendu;
        IF r.competence LIKE 'EMC.%' THEN
            cleaned := regexp_replace(cleaned, wpat_emc, ' ', 'gi');
        END IF;
        IF r.cle = 'qm-viv-car-n4-a' THEN
            cleaned := regexp_replace(cleaned, wpat_vivant, ' ', 'gi');
        END IF;
        IF cleaned ~* pat THEN
            RAISE WARNING 'BIENVEILLANCE KO : qm_item % : « % »', r.cle, r.attendu;
            n := n + 1;
        END IF;
    END LOOP;

    IF n > 0 THEN
        RAISE EXCEPTION 'BIENVEILLANCE : % contenu(s) enfant interdit(s) detecte(s)', n;
    END IF;

    -- Garde-fou positif : les 3 corrections du lot 0059 sont bien en base.
    IF EXISTS (SELECT 1 FROM public.dictee_texte WHERE id = 150 AND texte LIKE '%marins disparus%') THEN
        RAISE EXCEPTION 'dictee 150 non corrigee (marins disparus encore present)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.qm_item WHERE cle = 'qm-viv-pla-n3-a' AND attendu = 'elle se fane') THEN
        RAISE EXCEPTION 'qm-viv-pla-n3-a : attendu attendu « elle se fane » absent';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.comprehension_item WHERE cle = 'lec-inf-n4-c' AND attendu = 'impatiente') THEN
        RAISE EXCEPTION 'lec-inf-n4-c : attendu « impatiente » absent';
    END IF;
    -- Lot 0060 (bibliotheque domaine public) : un item de reference est bien en base.
    IF NOT EXISTS (SELECT 1 FROM public.comprehension_item
                    WHERE cle = 'lec-bib-papillon-sens-n1' AND attendu = 'une petite lettre d''amour') THEN
        RAISE EXCEPTION 'lec-bib-papillon-sens-n1 : item bibliotheque (0060) absent';
    END IF;

    RAISE NOTICE 'bienveillance (dictee + attendus de reference) : OK';
END $$;

ROLLBACK;
