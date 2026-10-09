-- 0101_cm1_emc.sql
-- LOT (CM1) - EMC : complement « Vivre ensemble » pour le CYCLE 3 (CM1). AJOUTE
-- 6 sous-matieres (domaines, portee CM1..CM2) a la matiere EMC existante (0058) :
--   EMC.DROITS      droits_enfant       Convention des droits de l'enfant ;
--   EMC.SYMBOLES    symboles_republique drapeau, Marianne, devise, Marseillaise, 14 juillet ;
--   EMC.COOPERATION cooperation         s'entraider, ecouter, partager ;
--   EMC.EGALITE     egalite             egalite filles-garcons ;
--   EMC.PRUDENCE    prudence_ecrans     internet et ecrans : regles de prudence ;
--   EMC.ENGAGEMENT  engagement          delegues, associations, s'engager.
--
-- ADDITIF : la matiere EMC, le type 'emc', la methode 'vivre_ensemble', la
-- contrainte qm_item (EMC.%) et la branche op 'qm' (EMC.%) existent deja (0058).
-- Ce lot n'ajoute que des competences, des items, des exercices et l'activation
-- des 6 nouveaux domaines. Meme op 'qm', meme verif_qm, meme <QuestionnerLeMonde>.
--
-- BIENVEILLANCE : contenus optimistes, jamais moralisateurs. Harcelement :
-- TOUJOURS « en parler a un adulte de confiance ». La matiere EMC est deja active
-- partout (0058) ; on ajoute les 6 domaines CM1 ACTIFS au DEFAUT (lu en base puis
-- complete ; test de completude) et sur les profils existants. Portee CM1..CM2
-- (masquee au CE2 cote client).

-- 1. Referentiel : 6 competences EMC CM1 (une par domaine, portee CM1..CM2).
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('EMC.DROITS',      'EMC', 'droits_enfant',       'Les droits de l''enfant',            1900, 'CM1', 'CM2'),
    ('EMC.SYMBOLES',    'EMC', 'symboles_republique', 'Les symboles de la République',      1910, 'CM1', 'CM2'),
    ('EMC.COOPERATION', 'EMC', 'cooperation',         'Coopérer et s''entraider',           1920, 'CM1', 'CM2'),
    ('EMC.EGALITE',     'EMC', 'egalite',             'Filles et garçons, l''égalité',      1930, 'CM1', 'CM2'),
    ('EMC.PRUDENCE',    'EMC', 'prudence_ecrans',     'Internet : rester prudent',          1940, 'CM1', 'CM2'),
    ('EMC.ENGAGEMENT',  'EMC', 'engagement',          'S''engager : délégués, associations', 1950, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min,
    classe_max=EXCLUDED.classe_max, actif=true;

-- 2. Seed des items (genere depuis frontend/src/domain/emc/cm1.ts ; test croise).
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    ('emc-dro-n1-a', 'EMC.DROITS', 1, 'qcm', 'l''école'),
    ('emc-dro-n1-b', 'EMC.DROITS', 1, 'qcm', 'être protégé et aimé'),
    ('emc-dro-n2-a', 'EMC.DROITS', 2, 'tri', 'aller à l''école=un droit de l''enfant;être soigné quand on est malade=un droit de l''enfant;jouer et se reposer=un droit de l''enfant;faire tout ce qu''on veut sans règle=pas un droit'),
    ('emc-dro-n2-b', 'EMC.DROITS', 2, 'qcm', 'Convention des droits de l''enfant'),
    ('emc-dro-n3-a', 'EMC.DROITS', 3, 'qcm', 'règles à respecter'),
    ('emc-dro-n3-b', 'EMC.DROITS', 3, 'tri', 'être soigné=un droit;aller à l''école=un droit;respecter les autres=un devoir;écouter en classe=un devoir'),
    ('emc-dro-n4-a', 'EMC.DROITS', 4, 'texte', 'enfant'),
    ('emc-dro-n4-b', 'EMC.DROITS', 4, 'texte', 'autres'),
    ('emc-sym-n1-a', 'EMC.SYMBOLES', 1, 'qcm', 'bleu, blanc, rouge'),
    ('emc-sym-n1-b', 'EMC.SYMBOLES', 1, 'qcm', 'Marianne'),
    ('emc-sym-n2-a', 'EMC.SYMBOLES', 2, 'qcm', 'Liberté, Égalité, Fraternité'),
    ('emc-sym-n2-b', 'EMC.SYMBOLES', 2, 'tri', 'le drapeau tricolore=symbole de la République;Marianne=symbole de la République;la Marseillaise=symbole de la République;un ballon de foot=pas un symbole'),
    ('emc-sym-n3-a', 'EMC.SYMBOLES', 3, 'qcm', 'la Marseillaise'),
    ('emc-sym-n3-b', 'EMC.SYMBOLES', 3, 'qcm', 'le 14 juillet'),
    ('emc-sym-n4-a', 'EMC.SYMBOLES', 4, 'texte', 'Fraternité'),
    ('emc-sym-n4-b', 'EMC.SYMBOLES', 4, 'texte', 'Marseillaise'),
    ('emc-coo-n1-a', 'EMC.COOPERATION', 1, 'qcm', 's''entraider'),
    ('emc-coo-n1-b', 'EMC.COOPERATION', 1, 'qcm', 'lui expliquer calmement'),
    ('emc-coo-n2-a', 'EMC.COOPERATION', 2, 'tri', 'écouter les idées des autres=ça aide;partager le matériel=ça aide;couper la parole=ça n''aide pas;vouloir tout décider seul=ça n''aide pas'),
    ('emc-coo-n2-b', 'EMC.COOPERATION', 2, 'qcm', 'coopération'),
    ('emc-coo-n3-a', 'EMC.COOPERATION', 3, 'qcm', 'l''inviter à jouer avec vous'),
    ('emc-coo-n3-b', 'EMC.COOPERATION', 3, 'qcm', 'en parler à un adulte de confiance'),
    ('emc-coo-n4-a', 'EMC.COOPERATION', 4, 'texte', 'coopération'),
    ('emc-coo-n4-b', 'EMC.COOPERATION', 4, 'texte', 'confiance'),
    ('emc-ega-n1-a', 'EMC.EGALITE', 1, 'qcm', 'les mêmes droits'),
    ('emc-ega-n1-b', 'EMC.EGALITE', 1, 'qcm', 'les filles et les garçons'),
    ('emc-ega-n2-a', 'EMC.EGALITE', 2, 'tri', 'une fille peut devenir pompière=vrai;un garçon peut faire de la danse=vrai;seuls les garçons sont bons en maths=faux;seules les filles peuvent cuisiner=faux'),
    ('emc-ega-n2-b', 'EMC.EGALITE', 2, 'qcm', 'une femme ou un homme'),
    ('emc-ega-n3-a', 'EMC.EGALITE', 3, 'qcm', 'les filles comme les garçons'),
    ('emc-ega-n3-b', 'EMC.EGALITE', 3, 'tri', 'pilote d''avion=les deux;infirmier ou infirmière=les deux;maître ou maîtresse=les deux'),
    ('emc-ega-n4-a', 'EMC.EGALITE', 4, 'texte', 'égalité'),
    ('emc-ega-n4-b', 'EMC.EGALITE', 4, 'texte', 'homme'),
    ('emc-pru-n1-a', 'EMC.PRUDENCE', 1, 'qcm', 'non, jamais'),
    ('emc-pru-n1-b', 'EMC.PRUDENCE', 1, 'qcm', 'demander à un adulte'),
    ('emc-pru-n2-a', 'EMC.PRUDENCE', 2, 'tri', 'mon mot de passe=on garde pour soi;mon adresse=on garde pour soi;mon dessin préféré=on peut partager;mon jeu préféré=on peut partager'),
    ('emc-pru-n2-b', 'EMC.PRUDENCE', 2, 'qcm', 'faire des pauses'),
    ('emc-pru-n3-a', 'EMC.PRUDENCE', 3, 'qcm', 'non, il faut vérifier'),
    ('emc-pru-n3-b', 'EMC.PRUDENCE', 3, 'qcm', 'en parler à un adulte de confiance'),
    ('emc-pru-n4-a', 'EMC.PRUDENCE', 4, 'texte', 'passe'),
    ('emc-pru-n4-b', 'EMC.PRUDENCE', 4, 'texte', 'confiance'),
    ('emc-eng-n1-a', 'EMC.ENGAGEMENT', 1, 'qcm', 'délégué'),
    ('emc-eng-n1-b', 'EMC.ENGAGEMENT', 1, 'qcm', 'on vote'),
    ('emc-eng-n2-a', 'EMC.ENGAGEMENT', 2, 'qcm', 'aider ou faire une activité ensemble'),
    ('emc-eng-n2-b', 'EMC.ENGAGEMENT', 2, 'tri', 'ramasser les déchets dans la cour=s''engager pour les autres;aider un camarade=s''engager pour les autres;ne penser qu''à soi=non;bousculer les autres=non'),
    ('emc-eng-n3-a', 'EMC.ENGAGEMENT', 3, 'qcm', 'porter la voix des élèves'),
    ('emc-eng-n3-b', 'EMC.ENGAGEMENT', 3, 'qcm', 's''engager'),
    ('emc-eng-n4-a', 'EMC.ENGAGEMENT', 4, 'texte', 'délégué'),
    ('emc-eng-n4-b', 'EMC.ENGAGEMENT', 4, 'texte', 'vote')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- 3. Exercices de reference (type 'emc', methode 'vivre_ensemble' comme 0058).
--    exercice_id = md5('<competence>:<niveau>:emc').
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOR v_comp IN SELECT code FROM public.competences
                   WHERE code IN ('EMC.DROITS','EMC.SYMBOLES','EMC.COOPERATION',
                                  'EMC.EGALITE','EMC.PRUDENCE','EMC.ENGAGEMENT') LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':emc')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'emc', v_niv, 'vivre_ensemble', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- 4. Activation : la matiere EMC est deja active partout (0058). On ajoute les 6
--    domaines CM1 au DEFAUT (lu en base puis complete) et aux profils existants.
DO $do$
DECLARE
    v_expr text; v_cur text[]; v_before text[]; d text;
    v_new text[] := ARRAY['droits_enfant','symboles_republique','cooperation',
                          'egalite','prudence_ecrans','engagement'];
BEGIN
    SELECT pg_get_expr(adbin, adrelid) INTO v_expr
      FROM pg_attrdef ad JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
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
         FROM unnest(ARRAY['droits_enfant','symboles_republique','cooperation',
                           'egalite','prudence_ecrans','engagement']) AS d
        WHERE NOT (d = ANY (domaines_actifs)))
 WHERE NOT (domaines_actifs @> ARRAY['droits_enfant','symboles_republique','cooperation',
                                     'egalite','prudence_ecrans','engagement']);

-- 5. Enregistrement de la migration
INSERT INTO public.schema_migrations (version)
VALUES ('0101_cm1_emc')
ON CONFLICT (version) DO NOTHING;
