-- parcours_geo_test.sql
-- Verifie le seed 'qm' du Parcours de Geographie (migration 0110) :
--   * presence des 14 items « pg-* » (8 questions + 6 trous) ;
--   * spot-check (cle, format, attendu) CROISE avec parcoursGeo.test.ts (front) ;
--   * verif_qm (serveur seul juge) sur qcm / clic / texte.
-- Lecture seule : pas de ROLLBACK necessaire.

DO $$
DECLARE n int;
BEGIN
    SELECT count(*) INTO n FROM public.qm_item WHERE cle LIKE 'pg-%';
    IF n <> 14 THEN RAISE EXCEPTION 'parcours geo : 14 items pg-* attendus, obtenu %', n; END IF;
    IF (SELECT count(*) FROM public.qm_item WHERE cle LIKE 'pg-nou-%') = 0
       OR (SELECT count(*) FROM public.qm_item WHERE cle LIKE 'pg-ine-%') = 0 THEN
        RAISE EXCEPTION 'parcours geo : un chapitre n''a aucun item';
    END IF;
    RAISE NOTICE 'parcours geo : totaux OK (% items pg-*)', n;
END $$;

DO $$
DECLARE
    r record;
    spot text[][] := ARRAY[
        ['pg-nou-q1','qcm','le riz'],
        ['pg-nou-q3','clic','l''Asie'],
        ['pg-nou-q4','texte','sous-alimentation'],
        ['pg-ine-q2','qcm','l''eau potable'],
        ['pg-ine-q3','clic','l''Afrique'],
        ['pg-ine-q4','texte','planisphère']
    ];
    i int;
BEGIN
    FOR i IN 1 .. array_length(spot, 1) LOOP
        SELECT format, attendu INTO r FROM public.qm_item WHERE cle = spot[i][1];
        IF NOT FOUND THEN RAISE EXCEPTION 'parcours geo : item % absent', spot[i][1]; END IF;
        IF r.format <> spot[i][2] THEN
            RAISE EXCEPTION 'parcours geo : % format attendu %, obtenu %', spot[i][1], spot[i][2], r.format;
        END IF;
        IF r.attendu <> spot[i][3] THEN
            RAISE EXCEPTION 'parcours geo : % attendu « % », obtenu « % »', spot[i][1], spot[i][3], r.attendu;
        END IF;
    END LOOP;
    RAISE NOTICE 'parcours geo : spot-check croise front <-> SQL OK';
END $$;

DO $$
BEGIN
    IF NOT public.verif_qm('pg-nou-q1','le riz') THEN RAISE EXCEPTION 'qcm juste refuse'; END IF;
    IF public.verif_qm('pg-nou-q1','le chocolat') THEN RAISE EXCEPTION 'qcm faux accepte'; END IF;
    IF NOT public.verif_qm('pg-nou-q3','l''Asie') THEN RAISE EXCEPTION 'clic juste refuse'; END IF;
    IF public.verif_qm('pg-nou-q3','l''Afrique') THEN RAISE EXCEPTION 'clic mauvais continent accepte'; END IF;
    IF NOT public.verif_qm('pg-ine-q4','planisphère') THEN RAISE EXCEPTION 'texte juste refuse'; END IF;
    IF public.verif_qm('pg-ine-q4','planisphere') THEN RAISE EXCEPTION 'texte accent non exige'; END IF;
    RAISE NOTICE 'parcours geo : verif_qm OK';
END $$;
