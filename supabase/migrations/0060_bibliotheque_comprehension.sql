-- 0060_bibliotheque_comprehension.sql
-- BIBLIOTHEQUE (domaine public) : premiers items « Comprendre un texte » batis sur
-- des textes du domaine public verifies (Jules Renard, Jean de La Fontaine,
-- Colette). Les questions sont ORIGINALES (ecrites pour le CE2) ; seul le TEXTE
-- lu reprend les mots de l'auteur. Lecture SILENCIEUSE (aucun audio).
--
-- Cette migration est purement ADDITIVE et IDEMPOTENTE : elle n'ajoute que des
-- lignes de REFERENCE dans public.comprehension_item (le SERVEUR reste seul juge,
-- miroir de frontend/.../francais/comprehension.ts). Aucune donnee utilisateur
-- (Iris, foyers) n'est touchee ; le domaine `lecture` est deja actif pour tous
-- les profils (migration 0045), donc aucun profil n'est modifie ici.
--
-- Les competences FR.LECTURE.* existent deja (0045). Le test croise
-- supabase/tests/comprehension_test.sql verifie que la table porte EXACTEMENT les
-- memes cles et le meme `attendu` que le front (golden : 55 items au total).

INSERT INTO public.comprehension_item (cle, competence, niveau, format, attendu) VALUES
    -- Jules Renard, « Le Papillon »
    ('lec-bib-papillon-sens-n1', 'FR.LECTURE.SENS_MOT', 1, 'qcm',   'une petite lettre d''amour'),
    -- Jules Renard, « Le Martin-pêcheur »
    ('lec-bib-martin-info-n2',   'FR.LECTURE.INFO',      2, 'qcm',   'sur la perche de la ligne'),
    ('lec-bib-martin-sens-n2',   'FR.LECTURE.SENS_MOT',  2, 'qcm',   'aux couleurs très vives'),
    ('lec-bib-martin-inf-n3',    'FR.LECTURE.INFERENCE', 3, 'qcm',   'pour ne pas faire fuir l''oiseau'),
    ('lec-bib-martin-inf-n4',    'FR.LECTURE.INFERENCE', 4, 'texte', 'arbre'),
    ('lec-bib-martin-info-n4',   'FR.LECTURE.INFO',      4, 'clic',  'martin-pêcheur'),
    -- Jean de La Fontaine, « Le Corbeau et le Renard »
    ('lec-bib-corbeau-ord-n3',   'FR.LECTURE.ORDRE',     3, 'ordre',
        'le renard dit bonjour et flatte le corbeau|le corbeau ouvre son bec pour chanter|le renard attrape le fromage tombé'),
    ('lec-bib-corbeau-sens-n3',  'FR.LECTURE.SENS_MOT',  3, 'clic',  'flatteur'),
    -- Jean de La Fontaine, « Le Lièvre et la Tortue »
    ('lec-bib-lievre-info-n1',   'FR.LECTURE.INFO',      1, 'qcm',   'la tortue'),
    ('lec-bib-lievre-vf-n2',     'FR.LECTURE.VRAIFAUX',  2, 'qcm',   'faux'),
    -- Colette, « Le jeune chat »
    ('lec-bib-chat-info-n2',     'FR.LECTURE.INFO',      2, 'qcm',   'Moumou'),
    ('lec-bib-chat-sens-n2',     'FR.LECTURE.SENS_MOT',  2, 'qcm',   'joli et mignon dans ses gestes'),
    -- Jules Renard, « L'Écureuil »
    ('lec-bib-ecureuil-sens-n3', 'FR.LECTURE.SENS_MOT',  3, 'qcm',   'vif et rapide')
ON CONFLICT (cle) DO UPDATE SET
    competence = EXCLUDED.competence,
    niveau     = EXCLUDED.niveau,
    format     = EXCLUDED.format,
    attendu    = EXCLUDED.attendu;
