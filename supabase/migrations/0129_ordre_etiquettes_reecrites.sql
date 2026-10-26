-- 0129_ordre_etiquettes_reecrites.sql
-- Refonte « remettre dans l'ordre » : reecriture des etiquettes de 4 items pour
-- respecter les regles editoriales (sujet coherent sans melange on/tu, longueurs
-- proches a <= 2 mots pres, une seule permutation logique). On met a jour
-- qm_item.attendu (le JUGE serveur) pour rester en phase avec le front (domaine
-- *.ts + golden SPOT des tests).
--
-- Les CLES ne changent pas : la progression deja enregistree (dont celle d'Iris)
-- reste intacte ; on ne rejuge jamais une reponse passee. SERVEUR SEUL JUGE : on
-- ne touche QUE la reponse attendue, pas le format ni la cle.
--
-- Chaque UPDATE doit toucher EXACTEMENT une ligne (sinon on leve une exception et
-- la migration echoue sans laisser la base dans un etat incoherent).

DO $$
DECLARE n int;
BEGIN
  UPDATE public.qm_item SET attendu = 'Léo demande de l''aide>Maman aide Léo>Léo dit merci'
    WHERE cle = 'emc-res-pol-n3-b';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'emc-res-pol-n3-b: % ligne(s) au lieu de 1', n; END IF;

  UPDATE public.qm_item SET attendu = 'l''œuf dans l''eau>le têtard>le têtard à pattes>la grenouille'
    WHERE cle = 'qm-viv-cyc-n4-a';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'qm-viv-cyc-n4-a: % ligne(s) au lieu de 1', n; END IF;

  UPDATE public.qm_item SET attendu = 'la fécondation>le développement dans l''œuf>la sortie de l''œuf'
    WHERE cle = 'st-viv-n3-b';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'st-viv-n3-b: % ligne(s) au lieu de 1', n; END IF;

  UPDATE public.qm_item SET attendu = 'la réunion des États généraux>la prise de la Bastille>la Déclaration des droits'
    WHERE cle = 'hi-rev-n3-b';
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'hi-rev-n3-b: % ligne(s) au lieu de 1', n; END IF;
END $$;

INSERT INTO public.schema_migrations (version)
VALUES ('0129_ordre_etiquettes_reecrites')
ON CONFLICT DO NOTHING;
