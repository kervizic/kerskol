-- 0073_fix_default_domaines.sql
-- CORRECTIF (non intrusif). La migration 0072 (decimaux) a redefini le DEFAULT
-- de profils.domaines_actifs en repartant d'une liste PERIMEE (celle de 0044),
-- retirant du DEFAUT les sous-matieres ajoutees ensuite (Questionner le monde :
-- vivant / matiere / objets / espace / temps ; EMC : respect / emotions /
-- republique / ecrans ; francais : ecriture). Les profils EXISTANTS ne sont PAS
-- affectes (0072 ne faisait qu'un array_append 'decimaux', sans rien retirer, et
-- ils portaient deja ces domaines depuis 0052-0063) ; seul le DEFAUT des NOUVEAUX
-- profils etait appauvri (detecte par qm_test, qui insere un profil de test).
--
-- On RETABLIT donc uniquement le DEFAUT COMPLET (liste de 0063) + 'decimaux'.
-- Aucune ecriture sur les profils existants (on ne touche pas aux choix de
-- l'utilisateur : un domaine volontairement desactive le reste).

ALTER TABLE public.profils
    ALTER COLUMN domaines_actifs SET DEFAULT ARRAY[
        'numeration','calcul_mental','tables_multiplication','calcul_pose',
        'problemes','mesures','heure','fractions','decimaux','geometrie','repere','donnees',
        'grammaire','vocabulaire','mots-invariables','conjugaison','orthographe',
        'lecture','mots-maitresse','vivant','matiere','objets','espace','temps',
        'respect','emotions','republique','ecrans','ecriture'
    ]::text[];

INSERT INTO public.schema_migrations (version)
VALUES ('0073_fix_default_domaines')
ON CONFLICT (version) DO NOTHING;
