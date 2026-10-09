-- 0105_cm1_sciences_programme_2026.sql
-- LOT 3 (CM1) - SCIENCES ET TECHNOLOGIE alignees sur le PROGRAMME 2026.
--
-- Source officielle : arrete du 5 juin 2026, BO n° 24 du 11 juin 2026, programme
-- de sciences et technologie du cycle 3 (annexe 2), EN VIGUEUR AU CM1 a la
-- rentree 2026 (CE2, CM2, 6e en 2027).
--   https://www.education.gouv.fr/bo/2026/Hebdo24/MENE2611650A
--   https://www.education.gouv.fr/sites/default/files/document/annexe-2-programme-de-sciences-et-technologie-du-cycle-3-519023.pdf
--
-- Attendus « Cours moyen premiere annee » exacts, repartis selon les 4 themes :
--   ST.MATIERE.ETATS     etats_matiere     masse (balance, tare), melanges
--                                          homogene/heterogene, tamisage,
--                                          decantation, filtration, dissolution ;
--   ST.PHYSIQUE.LUMIERE  lumiere           transparent/translucide/opaque,
--                                          ombre propre/portee ; mesurer une
--                                          distance et une duree (mouvement) ;
--   ST.VIVANT.CLASSER    classification    espece (interfeconds), groupes
--                                          emboites, cle de determination,
--                                          cycle de vie ovipare/vivipare ;
--   ST.VIVANT.ECOSYSTEMES ecosystemes      ecosysteme, cooperation/predation,
--                                          reseaux alimentaires, besoins des
--                                          vegetaux, action humaine ;
--   ST.CORPS.SANTE       corps_humain      le cerveau (fonctions, attention,
--                                          memoire), la puberte ;
--   ST.TERRE.CIEL        ciel_terre        meteorologie (thermometre,
--                                          pluviometre, anemometre), saisons ;
--                                          phases de la Lune ;
--   ST.OBJETS.TECHNIQUE  objets_techniques evolution, fonctions et composants,
--                                          croquis, programmation (robot).
--
-- BIENVEILLANCE STRICTE conservee (seule l'histoire est exemptee).
--
-- L'ancienne sous-matiere « energie » (ST.ENERGIE.SOURCES, ancien programme)
-- est DESACTIVEE (actif=false) cote competences ET exercices, SANS perte de
-- donnees. Les sous-matieres reutilisees (etats_matiere, classification,
-- corps_humain, ciel_terre, objets_techniques) voient leurs items MIS A JOUR en
-- place au nouveau programme (ON CONFLICT (cle) DO UPDATE).
--
-- Securite / donnees reelles : ADDITIVE et IDEMPOTENTE. Defaut domaines_actifs
-- LU en base puis COMPLETE (jamais recopie). Portee CM1..CM2 (masquee au CE2).

-- ===========================================================================
-- 1. Referentiel : 7 competences actives (programme 2026).
-- ===========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('ST.MATIERE.ETATS',     'ST', 'etats_matiere',     'Matière et mélanges',               1300, 'CM1', 'CM2'),
    ('ST.PHYSIQUE.LUMIERE',  'ST', 'lumiere',           'Lumière, ombres et mouvement',      1305, 'CM1', 'CM2'),
    ('ST.VIVANT.CLASSER',    'ST', 'classification',    'Classer le vivant',                 1310, 'CM1', 'CM2'),
    ('ST.VIVANT.ECOSYSTEMES','ST', 'ecosystemes',       'Écosystèmes et chaînes',            1315, 'CM1', 'CM2'),
    ('ST.CORPS.SANTE',       'ST', 'corps_humain',      'Le corps : cerveau et puberté',     1320, 'CM1', 'CM2'),
    ('ST.TERRE.CIEL',        'ST', 'ciel_terre',        'La Terre et le ciel',               1350, 'CM1', 'CM2'),
    ('ST.OBJETS.TECHNIQUE',  'ST', 'objets_techniques', 'Objets techniques et programmation',1340, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min,
    classe_max=EXCLUDED.classe_max, actif=true;

-- Ancienne sous-matiere « energie » : DESACTIVEE, donnees conservees.
UPDATE public.competences SET actif=false WHERE code = 'ST.ENERGIE.SOURCES';

-- ===========================================================================
-- 2. Seed des items (56 : 7 competences x 4 niveaux x 2). Genere depuis
--    frontend/src/domain/sciences/bank.ts ; test croise front<->SQL.
-- ===========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- ST.MATIERE.ETATS
    ('st-mat-n1-a', 'ST.MATIERE.ETATS', 1, 'qcm', 'une balance'),
    ('st-mat-n1-b', 'ST.MATIERE.ETATS', 1, 'qcm', 'dissout'),
    ('st-mat-n2-a', 'ST.MATIERE.ETATS', 2, 'qcm', 'hétérogène'),
    ('st-mat-n2-b', 'ST.MATIERE.ETATS', 2, 'tri', 'le sel=se dissout;le sucre=se dissout;le sable=ne se dissout pas;les cailloux=ne se dissout pas'),
    ('st-mat-n3-a', 'ST.MATIERE.ETATS', 3, 'qcm', 'la filtration'),
    ('st-mat-n3-b', 'ST.MATIERE.ETATS', 3, 'tri', 'séparer des cailloux et du sable avec des tamis=le tamisage;retenir le sable avec un papier filtre=la filtration;laisser la terre se déposer au fond de l''eau=la décantation'),
    ('st-mat-n4-a', 'ST.MATIERE.ETATS', 4, 'texte', 'homogène'),
    ('st-mat-n4-b', 'ST.MATIERE.ETATS', 4, 'texte', 'tare'),
    -- ST.PHYSIQUE.LUMIERE
    ('st-lum-n1-a', 'ST.PHYSIQUE.LUMIERE', 1, 'qcm', 'transparent'),
    ('st-lum-n1-b', 'ST.PHYSIQUE.LUMIERE', 1, 'qcm', 'une ombre'),
    ('st-lum-n2-a', 'ST.PHYSIQUE.LUMIERE', 2, 'tri', 'une vitre propre=transparent;du papier calque=translucide;un mur en pierre=opaque;un livre fermé=opaque'),
    ('st-lum-n2-b', 'ST.PHYSIQUE.LUMIERE', 2, 'qcm', 'opaque'),
    ('st-lum-n3-a', 'ST.PHYSIQUE.LUMIERE', 3, 'qcm', 'plus grande'),
    ('st-lum-n3-b', 'ST.PHYSIQUE.LUMIERE', 3, 'qcm', 'mètre'),
    ('st-lum-n4-a', 'ST.PHYSIQUE.LUMIERE', 4, 'texte', 'translucide'),
    ('st-lum-n4-b', 'ST.PHYSIQUE.LUMIERE', 4, 'texte', 'chronomètre'),
    -- ST.VIVANT.CLASSER
    ('st-viv-n1-a', 'ST.VIVANT.CLASSER', 1, 'qcm', 'espèce'),
    ('st-viv-n1-b', 'ST.VIVANT.CLASSER', 1, 'qcm', 'ovipare'),
    ('st-viv-n2-a', 'ST.VIVANT.CLASSER', 2, 'qcm', 'vivipare'),
    ('st-viv-n2-b', 'ST.VIVANT.CLASSER', 2, 'tri', 'la poule=ovipare;la grenouille=ovipare;le chat=vivipare;la vache=vivipare'),
    ('st-viv-n3-a', 'ST.VIVANT.CLASSER', 3, 'qcm', 'clé de détermination'),
    ('st-viv-n3-b', 'ST.VIVANT.CLASSER', 3, 'ordre', 'la fécondation>le développement dans l''œuf>l''éclosion'),
    ('st-viv-n4-a', 'ST.VIVANT.CLASSER', 4, 'texte', 'espèce'),
    ('st-viv-n4-b', 'ST.VIVANT.CLASSER', 4, 'texte', 'ovipare'),
    -- ST.VIVANT.ECOSYSTEMES
    ('st-eco-n1-a', 'ST.VIVANT.ECOSYSTEMES', 1, 'qcm', 'écosystème'),
    ('st-eco-n1-b', 'ST.VIVANT.ECOSYSTEMES', 1, 'qcm', 'de lumière et d''eau'),
    ('st-eco-n2-a', 'ST.VIVANT.ECOSYSTEMES', 2, 'qcm', 'le mange'),
    ('st-eco-n2-b', 'ST.VIVANT.ECOSYSTEMES', 2, 'ordre', 'l''herbe>le lapin>le renard'),
    ('st-eco-n3-a', 'ST.VIVANT.ECOSYSTEMES', 3, 'qcm', 'réseau alimentaire'),
    ('st-eco-n3-b', 'ST.VIVANT.ECOSYSTEMES', 3, 'tri', 'l''abeille butine la fleur et la pollinise=coopération;le poisson-clown et l''anémone se protègent=coopération;le renard chasse le lapin pour se nourrir=prédation;la coccinelle se nourrit de pucerons=prédation'),
    ('st-eco-n4-a', 'ST.VIVANT.ECOSYSTEMES', 4, 'texte', 'écosystème'),
    ('st-eco-n4-b', 'ST.VIVANT.ECOSYSTEMES', 4, 'texte', 'eau'),
    -- ST.CORPS.SANTE
    ('st-cor-n1-a', 'ST.CORPS.SANTE', 1, 'qcm', 'le cerveau'),
    ('st-cor-n1-b', 'ST.CORPS.SANTE', 1, 'qcm', 'puberté'),
    ('st-cor-n2-a', 'ST.CORPS.SANTE', 2, 'qcm', 'la mémoire'),
    ('st-cor-n2-b', 'ST.CORPS.SANTE', 2, 'qcm', 'augmentent'),
    ('st-cor-n3-a', 'ST.CORPS.SANTE', 3, 'qcm', 's''entraîner et faire attention'),
    ('st-cor-n3-b', 'ST.CORPS.SANTE', 3, 'qcm', 'tout à fait normales'),
    ('st-cor-n4-a', 'ST.CORPS.SANTE', 4, 'texte', 'cerveau'),
    ('st-cor-n4-b', 'ST.CORPS.SANTE', 4, 'texte', 'puberté'),
    -- ST.TERRE.CIEL
    ('st-ter-n1-a', 'ST.TERRE.CIEL', 1, 'qcm', 'un thermomètre'),
    ('st-ter-n1-b', 'ST.TERRE.CIEL', 1, 'qcm', 'phases'),
    ('st-ter-n2-a', 'ST.TERRE.CIEL', 2, 'tri', 'le thermomètre=la température;le pluviomètre=la pluie;l''anémomètre=le vent'),
    ('st-ter-n2-b', 'ST.TERRE.CIEL', 2, 'qcm', 'pleine Lune'),
    ('st-ter-n3-a', 'ST.TERRE.CIEL', 3, 'qcm', 'plus basses'),
    ('st-ter-n3-b', 'ST.TERRE.CIEL', 3, 'ordre', 'le printemps>l''été>l''automne>l''hiver'),
    ('st-ter-n4-a', 'ST.TERRE.CIEL', 4, 'texte', 'pluviomètre'),
    ('st-ter-n4-b', 'ST.TERRE.CIEL', 4, 'texte', 'Lune'),
    -- ST.OBJETS.TECHNIQUE
    ('st-obj-n1-a', 'ST.OBJETS.TECHNIQUE', 1, 'qcm', 'à protéger la tête'),
    ('st-obj-n1-b', 'ST.OBJETS.TECHNIQUE', 1, 'qcm', 'programme'),
    ('st-obj-n2-a', 'ST.OBJETS.TECHNIQUE', 2, 'qcm', 'à protéger la pointe'),
    ('st-obj-n2-b', 'ST.OBJETS.TECHNIQUE', 2, 'tri', 'le vélo=se déplacer;le bus=se déplacer;la gourde=s''hydrater;la carafe=s''hydrater'),
    ('st-obj-n3-a', 'ST.OBJETS.TECHNIQUE', 3, 'qcm', 'évolué'),
    ('st-obj-n3-b', 'ST.OBJETS.TECHNIQUE', 3, 'qcm', 'ordre'),
    ('st-obj-n4-a', 'ST.OBJETS.TECHNIQUE', 4, 'texte', 'croquis'),
    ('st-obj-n4-b', 'ST.OBJETS.TECHNIQUE', 4, 'texte', 'programme')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- ===========================================================================
-- 3. Exercices de reference. exercice_id = md5('<competence>:<niveau>:sciences').
-- ===========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['ST.MATIERE.ETATS','ST.PHYSIQUE.LUMIERE','ST.VIVANT.CLASSER',
                                  'ST.VIVANT.ECOSYSTEMES','ST.CORPS.SANTE','ST.TERRE.CIEL',
                                  'ST.OBJETS.TECHNIQUE'] LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':sciences')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'sciences', v_niv, 'sciences', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- Exercices de l'ancienne competence « energie » : desactives (donnees conservees).
UPDATE public.exercices SET actif=false WHERE competence = 'ST.ENERGIE.SOURCES';

-- ===========================================================================
-- 4. Activation des 2 NOUVEAUX domaines (defaut LU en base puis COMPLETE ;
--    on ne retire RIEN).
-- ===========================================================================
DO $do$
DECLARE
    v_expr text; v_cur text[]; v_before text[]; d text;
    v_new text[] := ARRAY['lumiere','ecosystemes'];
BEGIN
    SELECT pg_get_expr(adbin, adrelid) INTO v_expr
      FROM pg_attrdef ad
      JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
     WHERE a.attrelid = 'public.profils'::regclass AND a.attname = 'domaines_actifs';
    IF v_expr IS NULL THEN RAISE EXCEPTION 'domaines_actifs : DEFAUT introuvable'; END IF;
    EXECUTE 'SELECT ' || v_expr INTO v_cur;
    v_before := v_cur;
    FOREACH d IN ARRAY v_new LOOP
        IF NOT (d = ANY (v_cur)) THEN v_cur := v_cur || ARRAY[d]; END IF;
    END LOOP;
    FOREACH d IN ARRAY v_before LOOP
        IF NOT (d = ANY (v_cur)) THEN RAISE EXCEPTION 'completude KO : % aurait disparu', d; END IF;
    END LOOP;
    FOREACH d IN ARRAY v_new LOOP
        IF NOT (d = ANY (v_cur)) THEN RAISE EXCEPTION 'completude KO : % manque', d; END IF;
    END LOOP;
    EXECUTE 'ALTER TABLE public.profils ALTER COLUMN domaines_actifs SET DEFAULT '
            || quote_literal(v_cur::text) || '::text[]';
END $do$;

UPDATE public.profils
   SET domaines_actifs = domaines_actifs || (
       SELECT array_agg(d)
         FROM unnest(ARRAY['lumiere','ecosystemes']) AS d
        WHERE NOT (d = ANY (domaines_actifs)))
 WHERE NOT (domaines_actifs @> ARRAY['lumiere','ecosystemes']);

-- ===========================================================================
-- 5. Enregistrement de la migration
-- ===========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0105_cm1_sciences_programme_2026')
ON CONFLICT (version) DO NOTHING;
