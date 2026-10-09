-- 0109_cm1_recalibrage_n4.sql
-- LOT 2 (CM1) - RECALIBRAGE des N4 trop faciles (HIST / GEO / ST, lots 0103-0105).
--
-- Constat (Manu) : plusieurs items de niveau 4 etaient trop faciles - la reponse
-- etait un mot ultra-courant ou reprenait l'enonce (ex. « ecrire Internet »,
-- « riz », « eau », « Lune », « Soleil »). Un N4 doit demander une VRAIE reponse :
-- un mot de vocabulaire DEFINI du programme. On remonte donc l'exigence de 5
-- items (serveur = source de verite : on met a jour qm_item.attendu).
--
-- Miroir EXACT des banques front (histoire/geographie/sciences/bank.ts) et des
-- spot-checks (geographie.test.ts + geographie_test.sql mis a jour pour
-- ge-com-n4-b). Les autres cles ne sont dans aucun spot-check.
--
-- Securite / donnees reelles : ADDITIVE (pas de perte), IDEMPOTENTE (UPDATE a
-- valeur absolue). Aucun changement de schema, de competence ni de domaine. Les
-- reponses deja enregistrees des enfants ne sont pas modifiees ; seule la
-- reference de correction change (verif_qm comparera desormais au nouvel attendu).

UPDATE public.qm_item SET attendu = 'ordres'        WHERE cle = 'hi-nar-n4-b';
UPDATE public.qm_item SET attendu = 'sous-alimentation' WHERE cle = 'ge-nou-n4-b';
UPDATE public.qm_item SET attendu = 'données'       WHERE cle = 'ge-com-n4-b';
UPDATE public.qm_item SET attendu = 'photosynthèse' WHERE cle = 'st-eco-n4-b';
UPDATE public.qm_item SET attendu = 'rotation'      WHERE cle = 'st-ter-n4-b';

-- Enregistrement de la migration.
INSERT INTO public.schema_migrations (version)
VALUES ('0109_cm1_recalibrage_n4')
ON CONFLICT (version) DO NOTHING;
