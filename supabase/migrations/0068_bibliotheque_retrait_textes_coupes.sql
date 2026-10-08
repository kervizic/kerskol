-- 0068_bibliotheque_retrait_textes_coupes.sql
-- LOT 0 (correction d'une decision de Manu, 9 octobre 2026).
--
-- NOUVELLE REGLE DE CONTENU : on ne COUPE JAMAIS un texte pour le rendre
-- acceptable. Si un passage ne respecte pas les criteres de bienveillance, le
-- texte ENTIER est retire. Les 3 fables ajoutees au lot 0065 avaient justement
-- ete « recuperees » en COUPANT leur corps pour retirer un mot sensible : elles
-- violent la nouvelle regle et sont donc retirees entierement.
--
-- Textes retires (et leurs 11 items de comprehension 0065) :
--   * « Le Chene et le Roseau »          (c2-050) -> lec-bib-chene-*   (4 items)
--   * « La Laitiere et le Pot au lait »  (c2-026) -> lec-bib-laitiere-*(4 items)
--   * « L'Ours et les deux Compagnons »  (c2-075) -> lec-bib-ours-*    (3 items)
--
-- Migration ADDITIVE et IDEMPOTENTE : elle ne fait que SUPPRIMER des lignes de
-- REFERENCE dans public.comprehension_item (le SERVEUR reste SEUL JUGE). Aucune
-- cle etrangere ne pointe vers comprehension_item ; les reponses deja
-- enregistrees (table reponses) ne referencent pas cette table et restent
-- valides ; l'EMA (escalier de maitrise) est porte par (competence, niveau) et
-- non par cle d'item : il reste sans erreur pour Iris comme pour tout profil.
-- Aucune donnee utilisateur (foyers, profils) n'est touchee.
-- Golden : 203 - 11 = 192 items (comprehension_test.sql ; miroir exact du front
-- frontend/src/domain/francais/comprehension.ts).

BEGIN;

DELETE FROM public.comprehension_item
 WHERE cle IN (
    'lec-bib-chene-info-n1',
    'lec-bib-chene-sens-n2',
    'lec-bib-chene-inf-n3',
    'lec-bib-chene-clic-n4',
    'lec-bib-laitiere-info-n1',
    'lec-bib-laitiere-sens-n2',
    'lec-bib-laitiere-inf-n3',
    'lec-bib-laitiere-clic-n4',
    'lec-bib-ours-info-n1',
    'lec-bib-ours-sens-n2',
    'lec-bib-ours-inf-n3'
 );

-- Garde-fou : on verifie le compte final (couverture 5 competences x 4 niveaux
-- toujours assuree par les items 0045/0049/0060/0062 restants).
DO $$
DECLARE n integer;
BEGIN
    SELECT count(*) INTO n FROM public.comprehension_item;
    IF n <> 192 THEN
        RAISE EXCEPTION 'comprehension_item : 192 items attendus apres retrait, obtenu %', n;
    END IF;
END $$;

-- Enregistrement de la migration.
INSERT INTO public.schema_migrations (version)
VALUES ('0068_bibliotheque_retrait_textes_coupes')
ON CONFLICT (version) DO NOTHING;

COMMIT;
