-- 0103_cm1_histoire_nouveau_programme.sql
-- LOT 1 (CM1) - HISTOIRE refaite selon le NOUVEAU PROGRAMME 2026.
--
-- Source officielle : programme d'histoire-geographie du cycle 3 (annexe 4),
-- applicable au CM1 a la rentree 2026.
--   https://www.education.gouv.fr/sites/default/files/document/annexe-4-programme-d-histoire-geographie-cycle-3-516779.pdf
-- CM1 histoire = 4 themes + repere chronologique :
--   Theme 1 : la vie quotidienne au Moyen Age (XIe-XIIIe)   -> HIST.MOYENAGE
--   Theme 2 : la monarchie en France (XVIe-XVIIe)           -> HIST.MONARCHIE
--   Theme 3 : explorations et conquetes (XVe-XVIIe), traite -> HIST.EXPLORATIONS
--   Theme 4 : 1789, une annee revolutionnaire               -> HIST.REVOLUTION
--   La frise chronologique, les siecles (chiffres romains)  -> HIST.FRISE
--
-- DECISION DE MANU : « n'adoucis pas l'Histoire ». Contenu factuel au niveau
-- d'un bon manuel de CM1 (guerres de religion dont le massacre de la
-- Saint-Barthelemy, traite et esclavage, Code noir, conquete des Ameriques,
-- societe d'ordres, violence de 1789), sans euphemisme ni detail macabre.
--
-- ANCIEN programme (0099 : Prehistoire, Gaulois/Romains, Charlemagne, art
-- roman/gothique isole) : les sous-matieres HIST.TRACES, HIST.GALLOROMAINS,
-- HIST.ROIS et HIST.MONUMENTS sont DESACTIVEES (actif=false) cote competences ET
-- exercices. AUCUNE perte de donnees : leurs items qm_item et les reponses des
-- enfants restent en base ; ces competences ne sont simplement plus proposees.
--
-- HIST.MOYENAGE et HIST.FRISE sont CONSERVEES (codes reutilises) : leurs items
-- sont mis a jour en place (ON CONFLICT (cle) DO UPDATE) au nouveau programme.
--
-- EXEMPTION BIENVEILLANCE : limitee a la banque histoire (front) et testee cote
-- serveur (bienveillance_test.sql, branche HIST.%). Les histoires, lectures et
-- enonces restent sous la regle bienveillance stricte.
--
-- Securite / donnees reelles : ADDITIVE et IDEMPOTENTE. Defaut domaines_actifs
-- LU en base puis COMPLETE (jamais recopie). Portee CM1..CM2 (masquee au CE2).

-- ===========================================================================
-- 1. Referentiel : competences actives (nouveau programme).
-- ===========================================================================
INSERT INTO public.competences (code, matiere, domaine, libelle, ordre, classe_min, classe_max) VALUES
    ('HIST.MOYENAGE',     'HIST', 'moyen_age',    'La vie quotidienne au Moyen Âge', 1520, 'CM1', 'CM2'),
    ('HIST.MONARCHIE',    'HIST', 'monarchie',    'La monarchie en France',          1522, 'CM1', 'CM2'),
    ('HIST.EXPLORATIONS', 'HIST', 'explorations', 'Explorations et conquêtes',       1524, 'CM1', 'CM2'),
    ('HIST.REVOLUTION',   'HIST', 'revolution',   '1789, la Révolution',             1526, 'CM1', 'CM2'),
    ('HIST.FRISE',        'HIST', 'frise',        'La frise et les siècles',         1550, 'CM1', 'CM2')
ON CONFLICT (code) DO UPDATE SET matiere=EXCLUDED.matiere, domaine=EXCLUDED.domaine,
    libelle=EXCLUDED.libelle, ordre=EXCLUDED.ordre, classe_min=EXCLUDED.classe_min,
    classe_max=EXCLUDED.classe_max, actif=true;

-- Anciennes sous-matieres (ancien programme) : DESACTIVEES, donnees conservees.
UPDATE public.competences SET actif=false
 WHERE code IN ('HIST.TRACES','HIST.GALLOROMAINS','HIST.ROIS','HIST.MONUMENTS');

-- ===========================================================================
-- 2. Seed des items (40 : 5 competences x 4 niveaux x 2). Genere depuis
--    frontend/src/domain/histoire/bank.ts ; test croise front<->SQL. Les items
--    hi-moy-* et hi-fri-* reutilisent les cles de 0099 (mise a jour en place).
-- ===========================================================================
INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- HIST.MOYENAGE (Theme 1 : la vie quotidienne au Moyen Age)
    ('hi-moy-n1-a', 'HIST.MOYENAGE', 1, 'qcm', 'la seigneurie'),
    ('hi-moy-n1-b', 'HIST.MOYENAGE', 1, 'qcm', 'les paysans'),
    ('hi-moy-n2-a', 'HIST.MOYENAGE', 2, 'qcm', 'la dîme'),
    ('hi-moy-n2-b', 'HIST.MOYENAGE', 2, 'tri', 'l''abbaye=l''Église;la cathédrale=l''Église;le château fort=le seigneur;le donjon=le seigneur'),
    ('hi-moy-n3-a', 'HIST.MOYENAGE', 3, 'qcm', 'la corvée'),
    ('hi-moy-n3-b', 'HIST.MOYENAGE', 3, 'tri', 'des murs épais et de petites fenêtres=art roman;des arcs ronds (plein cintre)=art roman;de grandes fenêtres avec des vitraux=art gothique;des arcs en pointe (ogives)=art gothique'),
    ('hi-moy-n4-a', 'HIST.MOYENAGE', 4, 'texte', 'seigneurie'),
    ('hi-moy-n4-b', 'HIST.MOYENAGE', 4, 'texte', 'cathédrale'),
    -- HIST.MONARCHIE (Theme 2 : la monarchie en France, XVIe-XVIIe)
    ('hi-nar-n1-a', 'HIST.MONARCHIE', 1, 'qcm', 'François Ier'),
    ('hi-nar-n1-b', 'HIST.MONARCHIE', 1, 'qcm', 'Louis XIV'),
    ('hi-nar-n2-a', 'HIST.MONARCHIE', 2, 'qcm', 'édit de Nantes'),
    ('hi-nar-n2-b', 'HIST.MONARCHIE', 2, 'tri', 'les prêtres et les évêques=le clergé;les seigneurs et les grands nobles=la noblesse;les paysans, les artisans et les bourgeois=le tiers état'),
    ('hi-nar-n3-a', 'HIST.MONARCHIE', 3, 'qcm', 'absolue'),
    ('hi-nar-n3-b', 'HIST.MONARCHIE', 3, 'ordre', 'François Ier>Henri IV>Louis XIV'),
    ('hi-nar-n4-a', 'HIST.MONARCHIE', 4, 'texte', 'Nantes'),
    ('hi-nar-n4-b', 'HIST.MONARCHIE', 4, 'texte', 'Soleil'),
    -- HIST.EXPLORATIONS (Theme 3 : explorations et conquetes, traite)
    ('hi-exp-n1-a', 'HIST.EXPLORATIONS', 1, 'qcm', 'la caravelle'),
    ('hi-exp-n1-b', 'HIST.EXPLORATIONS', 1, 'qcm', 'la boussole'),
    ('hi-exp-n2-a', 'HIST.EXPLORATIONS', 2, 'qcm', 'Christophe Colomb'),
    ('hi-exp-n2-b', 'HIST.EXPLORATIONS', 2, 'ordre', 'de l''Europe vers l''Afrique>de l''Afrique vers l''Amérique>de l''Amérique vers l''Europe'),
    ('hi-exp-n3-a', 'HIST.EXPLORATIONS', 3, 'qcm', 'la traite des esclaves'),
    ('hi-exp-n3-b', 'HIST.EXPLORATIONS', 3, 'qcm', 'le Code noir'),
    ('hi-exp-n4-a', 'HIST.EXPLORATIONS', 4, 'texte', 'caravelle'),
    ('hi-exp-n4-b', 'HIST.EXPLORATIONS', 4, 'texte', 'Magellan'),
    -- HIST.REVOLUTION (Theme 4 : 1789, une annee revolutionnaire)
    ('hi-rev-n1-a', 'HIST.REVOLUTION', 1, 'qcm', 'la Bastille'),
    ('hi-rev-n1-b', 'HIST.REVOLUTION', 1, 'qcm', 'Lumières'),
    ('hi-rev-n2-a', 'HIST.REVOLUTION', 2, 'qcm', 'l''Ancien Régime'),
    ('hi-rev-n2-b', 'HIST.REVOLUTION', 2, 'qcm', 'doléances'),
    ('hi-rev-n3-a', 'HIST.REVOLUTION', 3, 'qcm', 'citoyen'),
    ('hi-rev-n3-b', 'HIST.REVOLUTION', 3, 'ordre', 'la réunion des États généraux>la prise de la Bastille>la Déclaration des droits de l''Homme et du citoyen'),
    ('hi-rev-n4-a', 'HIST.REVOLUTION', 4, 'texte', 'Bastille'),
    ('hi-rev-n4-b', 'HIST.REVOLUTION', 4, 'texte', 'égalité'),
    -- HIST.FRISE (la frise chronologique, les siecles)
    ('hi-fri-n1-a', 'HIST.FRISE', 1, 'qcm', 'frise chronologique'),
    ('hi-fri-n1-b', 'HIST.FRISE', 1, 'qcm', 'cent ans'),
    ('hi-fri-n2-a', 'HIST.FRISE', 2, 'qcm', 'les Temps modernes'),
    ('hi-fri-n2-b', 'HIST.FRISE', 2, 'ordre', 'le Moyen Âge>les Temps modernes>l''époque de la Révolution'),
    ('hi-fri-n3-a', 'HIST.FRISE', 3, 'qcm', 'XVIe siècle'),
    ('hi-fri-n3-b', 'HIST.FRISE', 3, 'qcm', 'XVIIIe siècle'),
    ('hi-fri-n4-a', 'HIST.FRISE', 4, 'texte', 'modernes'),
    ('hi-fri-n4-b', 'HIST.FRISE', 4, 'texte', 'XVI')
ON CONFLICT (cle) DO UPDATE SET competence=EXCLUDED.competence, niveau=EXCLUDED.niveau,
    format=EXCLUDED.format, attendu=EXCLUDED.attendu;

-- ===========================================================================
-- 3. Exercices de reference. exercice_id = md5('<competence>:<niveau>:histoire').
--    Cree/reactive les 5 competences actives ; desactive les anciennes.
-- ===========================================================================
DO $do$
DECLARE v_comp text; v_niv integer; v_id uuid;
BEGIN
    FOREACH v_comp IN ARRAY ARRAY['HIST.MOYENAGE','HIST.MONARCHIE','HIST.EXPLORATIONS','HIST.REVOLUTION','HIST.FRISE'] LOOP
        FOR v_niv IN 1..4 LOOP
            v_id := md5(v_comp || ':' || v_niv || ':histoire')::uuid;
            INSERT INTO public.exercices (id, competence, type, niveau, methode, actif)
            VALUES (v_id, v_comp, 'histoire', v_niv, 'histoire', true)
            ON CONFLICT (id) DO UPDATE SET competence=EXCLUDED.competence,
                type=EXCLUDED.type, niveau=EXCLUDED.niveau, methode=EXCLUDED.methode, actif=true;
        END LOOP;
    END LOOP;
END $do$;

-- Exercices des anciennes competences : desactives (donnees conservees).
UPDATE public.exercices SET actif=false
 WHERE competence IN ('HIST.TRACES','HIST.GALLOROMAINS','HIST.ROIS','HIST.MONUMENTS');

-- ===========================================================================
-- 4. Activation des 3 NOUVEAUX domaines (defaut LU en base puis COMPLETE ;
--    moyen_age et frise y sont deja depuis 0099 ; on ne retire RIEN).
-- ===========================================================================
DO $do$
DECLARE
    v_expr text; v_cur text[]; v_before text[]; d text;
    v_new text[] := ARRAY['monarchie','explorations','revolution'];
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
    -- Garde-fou de completude : rien ne doit disparaitre, tout doit etre present.
    FOREACH d IN ARRAY v_before LOOP
        IF NOT (d = ANY (v_cur)) THEN RAISE EXCEPTION 'completude KO : % aurait disparu', d; END IF;
    END LOOP;
    FOREACH d IN ARRAY v_new LOOP
        IF NOT (d = ANY (v_cur)) THEN RAISE EXCEPTION 'completude KO : % manque', d; END IF;
    END LOOP;
    EXECUTE 'ALTER TABLE public.profils ALTER COLUMN domaines_actifs SET DEFAULT '
            || quote_literal(v_cur::text) || '::text[]';
END $do$;

-- Profils existants : on ajoute les 3 nouveaux domaines (sans retirer les autres).
UPDATE public.profils
   SET domaines_actifs = domaines_actifs || (
       SELECT array_agg(d)
         FROM unnest(ARRAY['monarchie','explorations','revolution']) AS d
        WHERE NOT (d = ANY (domaines_actifs)))
 WHERE NOT (domaines_actifs @> ARRAY['monarchie','explorations','revolution']);

-- ===========================================================================
-- 5. Enregistrement de la migration
-- ===========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0103_cm1_histoire_nouveau_programme')
ON CONFLICT (version) DO NOTHING;
