-- parcours_sciences_test.sql
-- Verifie le seed 'qm' du Parcours de Sciences (migration 0111) :
--   * presence des 14 items « ps-* » (8 questions + 6 trous) ;
--   * spot-check (cle, format, attendu) CROISE avec parcoursSciences.test.ts ;
--   * verif_qm (serveur seul juge) sur qcm / clic / tri / texte.
-- Lecture seule : pas de ROLLBACK necessaire.

DO $$
DECLARE n int;
BEGIN
    SELECT count(*) INTO n FROM public.qm_item WHERE cle LIKE 'ps-%';
    IF n <> 14 THEN RAISE EXCEPTION 'parcours sciences : 14 items ps-* attendus, obtenu %', n; END IF;
    IF (SELECT count(*) FROM public.qm_item WHERE cle LIKE 'ps-eta-%') = 0
       OR (SELECT count(*) FROM public.qm_item WHERE cle LIKE 'ps-cla-%') = 0 THEN
        RAISE EXCEPTION 'parcours sciences : un chapitre n''a aucun item';
    END IF;
    RAISE NOTICE 'parcours sciences : totaux OK (% items ps-*)', n;
END $$;

DO $$
DECLARE
    r record;
    spot text[][] := ARRAY[
        ['ps-eta-q1','qcm','à l''état solide'],
        ['ps-eta-q2','clic','le gaz'],
        ['ps-eta-q4','texte','solidification'],
        ['ps-cla-q2','tri','le chat=des poils;l''oiseau=des plumes;le poisson=des écailles'],
        ['ps-cla-q3','qcm','ovipare'],
        ['ps-cla-q4','texte','vertébré']
    ];
    i int;
BEGIN
    FOR i IN 1 .. array_length(spot, 1) LOOP
        SELECT format, attendu INTO r FROM public.qm_item WHERE cle = spot[i][1];
        IF NOT FOUND THEN RAISE EXCEPTION 'parcours sciences : item % absent', spot[i][1]; END IF;
        IF r.format <> spot[i][2] THEN
            RAISE EXCEPTION 'parcours sciences : % format attendu %, obtenu %', spot[i][1], spot[i][2], r.format;
        END IF;
        IF r.attendu <> spot[i][3] THEN
            RAISE EXCEPTION 'parcours sciences : % attendu « % », obtenu « % »', spot[i][1], spot[i][3], r.attendu;
        END IF;
    END LOOP;
    RAISE NOTICE 'parcours sciences : spot-check croise front <-> SQL OK';
END $$;

DO $$
BEGIN
    IF NOT public.verif_qm('ps-eta-q1','à l''état solide') THEN RAISE EXCEPTION 'qcm juste refuse'; END IF;
    IF public.verif_qm('ps-eta-q1','à l''état gazeux') THEN RAISE EXCEPTION 'qcm faux accepte'; END IF;
    IF NOT public.verif_qm('ps-eta-q2','le gaz') THEN RAISE EXCEPTION 'clic juste refuse'; END IF;
    IF public.verif_qm('ps-eta-q2','le solide') THEN RAISE EXCEPTION 'clic mauvaise case acceptee'; END IF;
    IF NOT public.verif_qm('ps-cla-q2','le chat=des poils;l''oiseau=des plumes;le poisson=des écailles')
        THEN RAISE EXCEPTION 'tri juste refuse'; END IF;
    IF public.verif_qm('ps-cla-q2','le chat=des plumes;l''oiseau=des poils;le poisson=des écailles')
        THEN RAISE EXCEPTION 'tri faux accepte'; END IF;
    IF NOT public.verif_qm('ps-cla-q4','vertébré') THEN RAISE EXCEPTION 'texte juste refuse'; END IF;
    IF public.verif_qm('ps-cla-q4','vertebre') THEN RAISE EXCEPTION 'texte accent non exige'; END IF;
    RAISE NOTICE 'parcours sciences : verif_qm OK';
END $$;
