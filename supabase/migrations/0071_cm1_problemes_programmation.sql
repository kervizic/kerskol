-- 0071_cm1_problemes_programmation.sql
-- LOT 8 (CM1) - MATHEMATIQUES : « Problemes a plusieurs etapes » + « Pensee
-- informatique » (programmer un deplacement).
-- Attendus de fin de CM1 (programme cycle 3, actualise 2025, eduscol doc 13990) :
--   * resoudre des problemes necessitant PLUSIEURS ETAPES (ici deux etapes :
--     op puis op2, dont le rendu de monnaie) ;
--   * premiere approche de la PENSEE INFORMATIQUE : programmer le deplacement
--     d'un objet (robot type Blue-Bot) sur un quadrillage, en anticipant et en
--     corrigeant la suite d'instructions.
--
-- On REUTILISE a l'identique les deux moteurs deja en place (aucune nouvelle UI,
-- aucun changement du coeur « serveur seul juge ») :
--   * MA.PB.DEUX_ETAPES (0024/0025) : problemes a deux etapes, op2 reserve a
--     cette competence dans verif_calcul (recalcul serveur) ;
--   * MA.REPERE.PROGRAMMER (0047) : assembler / lire un programme ; le serveur
--     SIMULE le deplacement (verif_geo_programme) a partir de `spec`, et accepte
--     TOUTE suite d'instructions qui atteint la cible.
--
-- Ce lot ELARGIT seulement la PORTEE de ces deux competences a CM1..CM2 (elles
-- etaient bornees a CE2) : elles deviennent candidates pour un CM1 (coeur de
-- classe, cf. frontend/.../calcul/classes.ts) tout en restant proposees a un CE2
-- (classe_min inchangee = CE2). Le contenu existant (problemes en euros avec
-- rendu ; deplacements sur quadrillage avec obstacles) correspond deja au niveau
-- CM1 et est reutilise tel quel -> aucun item ajoute, aucun golden modifie.
--
-- Note (boucles « repete 3 fois ») : le moteur serveur s'y prete deja (il simule
-- une liste PLATE d'instructions ; une boucle se developpe cote client en
-- instructions repetees), MAIS proposer une boucle a l'enfant demande un
-- EDITEUR DE BOUCLE (nouvelle UI) : c'est reporte au lot d'UI (ce lot-ci est
-- « sans nouvelle UI »).
--
-- Migration ADDITIVE et IDEMPOTENTE : aucune progression ni aucun profil n'est
-- touche (Iris reste en CE2 ; les domaines `problemes` et `repere` sont deja
-- actifs chez elle). Seules deux valeurs de portee (classe_max) changent.

-- =========================================================================
-- 1. Elargissement de portee a CM1..CM2 (classe_min = CE2 inchangee).
-- =========================================================================
UPDATE public.competences
   SET classe_max = 'CM2'
 WHERE code IN ('MA.PB.DEUX_ETAPES', 'MA.REPERE.PROGRAMMER')
   AND classe_max <> 'CM2';

-- Verification defensive : les deux competences existent et sont bien a CM2.
DO $chk$
DECLARE n integer;
BEGIN
    SELECT count(*) INTO n FROM public.competences
     WHERE code IN ('MA.PB.DEUX_ETAPES', 'MA.REPERE.PROGRAMMER')
       AND classe_min = 'CE2' AND classe_max = 'CM2';
    IF n <> 2 THEN
        RAISE EXCEPTION 'portee CM1 des competences lot 8 incorrecte (attendu 2, obtenu %)', n;
    END IF;
END $chk$;

-- =========================================================================
-- 2. Enregistrement de la migration
-- =========================================================================
INSERT INTO public.schema_migrations (version)
VALUES ('0071_cm1_problemes_programmation')
ON CONFLICT (version) DO NOTHING;
