-- 0057_division_quotition.sql
-- AUDIT DIVISION CE2. La division est deja travaillee : en CALCUL par
-- MA.CM.DIV_RESTE (quotient ET reste, division exacte puis avec reste, division
-- en contexte), et en PROBLEMES par MA.PB.MULT_DIV (sens PARTAGE / partition).
-- MANQUAIT : le sens GROUPEMENT / quotition de la division (« combien de paquets
-- de P dans N ? » -> N ÷ P) et la division absente du niveau 2 de MULT_DIV.
--
-- Cette migration est ADDITIVE et ne touche QUE des DONNEES (parametres du
-- generateur client) : on ajoute le type de probleme `quotition` aux parametres
-- ex_calcul de MA.PB.MULT_DIV et on remet de la division-partage au niveau 2.
-- Le GENERATEUR client (domain/calcul/problemes.ts) connait desormais ce type
-- (division exacte, op 'div' : reste 0) ; le SERVEUR juge deja l'op 'div' pour
-- MA.PB.MULT_DIV (verif_calcul, inchange). Aucun schema, aucune fonction modifies.

-- Niveau 1 : inchange (groupement multiplicatif + partage) ; on le reaffirme
-- pour l'idempotence.
UPDATE public.ex_calcul x
   SET params = '{"qmax": 10, "types": ["groupement", "partage"], "tables": [2, 3, 4, 5]}'::jsonb
  FROM public.exercices e
 WHERE e.id = x.exercice_id AND e.competence = 'MA.PB.MULT_DIV' AND e.niveau = 1;

-- Niveau 2 : AJOUT de la division (partage) + quotition (sens groupement).
UPDATE public.ex_calcul x
   SET params = '{"qmax": 10, "types": ["groupement", "partage", "quotition"], "tables": [2, 3, 4, 5]}'::jsonb
  FROM public.exercices e
 WHERE e.id = x.exercice_id AND e.competence = 'MA.PB.MULT_DIV' AND e.niveau = 2;

-- Niveau 3 : AJOUT de la quotition.
UPDATE public.ex_calcul x
   SET params = '{"qmax": 10, "types": ["partage", "quotition", "groupement", "fois_plus"], "tables": [2, 3, 4, 5, 6, 7, 8, 9]}'::jsonb
  FROM public.exercices e
 WHERE e.id = x.exercice_id AND e.competence = 'MA.PB.MULT_DIV' AND e.niveau = 3;

-- Niveau 4 : AJOUT de la quotition.
UPDATE public.ex_calcul x
   SET params = '{"qmax": 10, "types": ["partage", "quotition", "fois_plus", "groupement"], "tables": [2, 3, 4, 5, 6, 7, 8, 9]}'::jsonb
  FROM public.exercices e
 WHERE e.id = x.exercice_id AND e.competence = 'MA.PB.MULT_DIV' AND e.niveau = 4;

INSERT INTO public.schema_migrations (version)
VALUES ('0057_division_quotition')
ON CONFLICT (version) DO NOTHING;
