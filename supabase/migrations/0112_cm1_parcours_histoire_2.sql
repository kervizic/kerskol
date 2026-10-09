-- 0112_cm1_parcours_histoire_2.sql
-- LOT 1 (complement) - 3 CHAPITRES D'HISTOIRE supplementaires pour approcher la
-- cible « 2 a 3 chapitres par theme » :
--   * Moyen Age : « Perrine et la cathedrale » (art roman / gothique, vitraux) ;
--   * Monarchie : « Un page a Versailles » (monarchie absolue, les trois ordres) ;
--   * Revolution : « La nuit du 4 aout » (abolition des privileges).
--
-- Seed des items 'qm' (21) sous les competences HIST.* existantes (EMA unifie) +
-- 4 nouvelles cartes de frise (frise_carte_ref). Miroir EXACT de
-- frontend/src/domain/histoire/parcours.ts. Additif et idempotent.

INSERT INTO public.qm_item (cle, competence, niveau, format, attendu) VALUES
    -- Moyen Age (2e chapitre)
    ('pa-mo2-q1',  'HIST.MOYENAGE',   1, 'qcm',   'les vitraux'),
    ('pa-mo2-q2',  'HIST.MOYENAGE',   2, 'qcm',   'l''art gothique'),
    ('pa-mo2-q3',  'HIST.MOYENAGE',   3, 'tri',   'des arcs ronds=art roman;des murs épais=art roman;des arcs en pointe=art gothique;de grands vitraux=art gothique'),
    ('pa-mo2-q4',  'HIST.MOYENAGE',   4, 'texte', 'gothique'),
    ('pa-mo2-jr1', 'HIST.MOYENAGE',   2, 'texte', 'roman'),
    ('pa-mo2-jr2', 'HIST.MOYENAGE',   2, 'texte', 'gothique'),
    ('pa-mo2-jr3', 'HIST.MOYENAGE',   2, 'texte', 'vitraux'),
    -- Monarchie (2e chapitre)
    ('pa-na2-q1',  'HIST.MONARCHIE',  1, 'qcm',   'Louis XIV'),
    ('pa-na2-q2',  'HIST.MONARCHIE',  2, 'qcm',   'la monarchie absolue'),
    ('pa-na2-q3',  'HIST.MONARCHIE',  3, 'qcm',   'le tiers état'),
    ('pa-na2-q4',  'HIST.MONARCHIE',  4, 'texte', 'ordres'),
    ('pa-na2-jr1', 'HIST.MONARCHIE',  2, 'texte', 'seul'),
    ('pa-na2-jr2', 'HIST.MONARCHIE',  3, 'texte', 'ordres'),
    ('pa-na2-jr3', 'HIST.MONARCHIE',  2, 'texte', 'état'),
    -- Revolution (2e chapitre)
    ('pa-re2-q1',  'HIST.REVOLUTION', 1, 'qcm',   'les privilèges'),
    ('pa-re2-q2',  'HIST.REVOLUTION', 2, 'qcm',   'les hommes naissent libres et égaux en droits'),
    ('pa-re2-q3',  'HIST.REVOLUTION', 3, 'ordre', 'la prise de la Bastille>la nuit du 4 août>la Déclaration des droits de l''Homme'),
    ('pa-re2-q4',  'HIST.REVOLUTION', 4, 'texte', 'privilèges'),
    ('pa-re2-jr1', 'HIST.REVOLUTION', 2, 'texte', 'août'),
    ('pa-re2-jr2', 'HIST.REVOLUTION', 2, 'texte', 'privilèges'),
    ('pa-re2-jr3', 'HIST.REVOLUTION', 3, 'texte', 'égaux')
ON CONFLICT (cle) DO UPDATE SET
    competence = EXCLUDED.competence, niveau = EXCLUDED.niveau,
    format = EXCLUDED.format, attendu = EXCLUDED.attendu;

-- Nouvelles cartes de frise (referentiel serveur-only).
INSERT INTO public.frise_carte_ref (cle, titre, cle_tri, date_label, periode, chapitre) VALUES
    ('fri-1100-roman',    'L''art roman',                11000101, 'vers 1100',      'moyen_age',      'moyen_age_cathedrale'),
    ('fri-1250-gothique', 'Les cathédrales gothiques',   12500101, 'vers 1250',      'moyen_age',      'moyen_age_cathedrale'),
    ('fri-1661-louis14',  'Louis XIV gouverne seul',     16610310, '1661',           'temps_modernes', 'monarchie_versailles'),
    ('fri-1789-4aout',    'Abolition des privilèges',    17890804, '4 août 1789',    'contemporaine',  'revolution_4aout')
ON CONFLICT (cle) DO UPDATE SET
    titre = EXCLUDED.titre, cle_tri = EXCLUDED.cle_tri, date_label = EXCLUDED.date_label,
    periode = EXCLUDED.periode, chapitre = EXCLUDED.chapitre;

INSERT INTO public.schema_migrations (version)
VALUES ('0112_cm1_parcours_histoire_2')
ON CONFLICT (version) DO NOTHING;
