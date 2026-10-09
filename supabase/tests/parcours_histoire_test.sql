-- parcours_histoire_test.sql
-- Verifie le seed 'qm' du Parcours d'Histoire (migration 0107) :
--   * presence des 35 items « pa-* » (20 questions + 15 trous « je retiens ») ;
--   * couverture des 4 themes (MOYENAGE, MONARCHIE, EXPLORATIONS, REVOLUTION) ;
--   * spot-check (cle, format, attendu) CROISE avec parcours.test.ts (front) ;
--   * verif_qm (serveur seul juge) sur qcm / tri / ordre / texte.
-- Lecture seule (aucune ecriture) : pas de ROLLBACK necessaire.

DO $$
DECLARE n int;
BEGIN
    -- 35 items « pa-* » au total.
    SELECT count(*) INTO n FROM public.qm_item WHERE cle LIKE 'pa-%';
    IF n <> 35 THEN RAISE EXCEPTION 'parcours : 35 items pa-* attendus, obtenu %', n; END IF;

    -- Chaque theme a bien des items de parcours.
    IF (SELECT count(*) FROM public.qm_item WHERE cle LIKE 'pa-moy-%') = 0
       OR (SELECT count(*) FROM public.qm_item WHERE cle LIKE 'pa-nar-%') = 0
       OR (SELECT count(*) FROM public.qm_item WHERE cle LIKE 'pa-exp-%') = 0
       OR (SELECT count(*) FROM public.qm_item WHERE cle LIKE 'pa-tra-%') = 0
       OR (SELECT count(*) FROM public.qm_item WHERE cle LIKE 'pa-rev-%') = 0 THEN
        RAISE EXCEPTION 'parcours : un theme n''a aucun item';
    END IF;

    -- Les items de la traite sont sous HIST.EXPLORATIONS.
    IF (SELECT competence FROM public.qm_item WHERE cle = 'pa-tra-q2') <> 'HIST.EXPLORATIONS' THEN
        RAISE EXCEPTION 'parcours : pa-tra-q2 devrait etre sous HIST.EXPLORATIONS';
    END IF;

    RAISE NOTICE 'parcours : couverture + totaux OK (% items pa-*)', n;
END $$;

-- SPOT-CHECK CROISE (identique a parcours.test.ts). Si tu modifies un item, mets
-- a jour les DEUX fichiers.
DO $$
DECLARE
    r record;
    spot text[][] := ARRAY[
        ['pa-moy-q1','qcm','la seigneurie'],
        ['pa-moy-q3','tri','le château=le seigneur;le donjon=le seigneur;l''église du village=l''Église;l''abbaye=l''Église'],
        ['pa-moy-q4','texte','corvée'],
        ['pa-nar-q2','qcm','le massacre de la Saint-Barthélemy'],
        ['pa-exp-q3','ordre','l''Europe>l''océan Atlantique>l''Amérique>l''océan Pacifique'],
        ['pa-tra-q2','qcm','le Code noir'],
        ['pa-tra-q3','qcm','parce qu''il prive des personnes de leur liberté'],
        ['pa-rev-q3','ordre','la réunion des États généraux>la prise de la Bastille>la Déclaration des droits de l''Homme'],
        ['pa-rev-q4','texte','14 juillet']
    ];
    i int;
BEGIN
    FOR i IN 1 .. array_length(spot, 1) LOOP
        SELECT format, attendu INTO r FROM public.qm_item WHERE cle = spot[i][1];
        IF NOT FOUND THEN RAISE EXCEPTION 'parcours : item % absent', spot[i][1]; END IF;
        IF r.format <> spot[i][2] THEN
            RAISE EXCEPTION 'parcours : % format attendu %, obtenu %', spot[i][1], spot[i][2], r.format;
        END IF;
        IF r.attendu <> spot[i][3] THEN
            RAISE EXCEPTION 'parcours : % attendu « % », obtenu « % »', spot[i][1], spot[i][3], r.attendu;
        END IF;
    END LOOP;
    RAISE NOTICE 'parcours : spot-check croise front <-> SQL OK';
END $$;

-- verif_qm (serveur seul juge) sur quelques items du parcours.
DO $$
BEGIN
    IF NOT public.verif_qm('pa-moy-q1','la seigneurie') THEN RAISE EXCEPTION 'qcm juste refuse'; END IF;
    IF public.verif_qm('pa-moy-q1','la gare') THEN RAISE EXCEPTION 'qcm faux accepte'; END IF;
    IF NOT public.verif_qm('pa-moy-q4','corvée') THEN RAISE EXCEPTION 'texte juste refuse'; END IF;
    IF public.verif_qm('pa-moy-q4','corvee') THEN RAISE EXCEPTION 'texte accent non exige'; END IF;
    IF NOT public.verif_qm('pa-exp-q3','l''Europe>l''océan Atlantique>l''Amérique>l''océan Pacifique')
        THEN RAISE EXCEPTION 'ordre juste refuse'; END IF;
    IF public.verif_qm('pa-exp-q3','l''Amérique>l''Europe>l''océan Atlantique>l''océan Pacifique')
        THEN RAISE EXCEPTION 'ordre faux accepte'; END IF;
    IF NOT public.verif_qm('pa-rev-q4','14 juillet') THEN RAISE EXCEPTION 'texte « 14 juillet » refuse'; END IF;
    RAISE NOTICE 'parcours : verif_qm OK';
END $$;
