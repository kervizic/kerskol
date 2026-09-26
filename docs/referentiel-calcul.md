# Référentiel de calcul Kerskol (matière MA)

Ce document décrit le référentiel de **calcul** tel qu'implémenté par la
migration `supabase/migrations/0006_seed_referentiel_calcul.sql` : les
compétences, leurs quatre niveaux, les prérequis, et les paramètres exploités
par le générateur d'exercices côté client. Il complète `docs/pedagogie.md`
(principes) et `docs/motivation.md` (village, monnaie).

## Format de réponse (règle transverse)

- **Saisie sur pavé numérique** par défaut : l'enfant tape le résultat. La
  saisie évite le hasard du QCM et rend le placement fiable.
- **QCM autorisé uniquement au niveau 1** d'une compétence, pour amorcer en
  douceur ; dès le niveau 2, la réponse est saisie.
- Le **temps de réponse est enregistré** (`reponses.temps_ms`) mais **jamais
  affiché** à l'enfant : aucun chronomètre visible, aucune pression. Il sert au
  pilotage interne (une réponse < 1,5 s n'est pas créditée en monnaie, car trop
  rapide pour avoir été lue) et à la mesure des méthodes.
- Une **erreur compte comme fausse** (0), sans deuxième chance sur le même
  exercice ; la valeur vient de la **correction expliquée** qui suit, puis d'un
  exercice **similaire mais non identique** (rattrapage) plus tard dans la
  séance.

## Suivi du niveau (rappel opérationnel)

Le niveau par compétence est calculé **par le serveur** (trigger sur
`reponses`, fonction `calc_progression`). Règles :

- **Placement en escalier** à la première apparition (tant que
  `placement_termine = false`) : départ niveau 1, **+1 par bonne réponse**
  (plafond 3), **−1 par erreur** (plancher 1). Le placement s'arrête à la
  **première erreur survenant après au moins une montée**, ou **après 5
  questions**. Le niveau plafond (3) n'est retenu que s'il a été **confirmé par
  deux bonnes réponses d'affilée** ; sinon il est ramené à 2. À la fin du
  placement, les deux EMA sont initialisées à **0,7**.
- **Hors placement** : EMA courte (α = 0,4) et longue (α = 0,1). **Montée** si
  EMA courte ≥ 0,8 **et** ≥ 8 réponses au niveau ; **descente** si EMA courte
  < 0,5 (bande morte 0,5–0,8 = hystérésis). Le compteur de réponses du niveau
  est remis à zéro à chaque changement. Le **niveau 4 (acquis)** ne s'atteint
  qu'hors placement.
- **`niveau_max_atteint` ne diminue jamais** : dans le village, le bâtiment ne
  recule pas.
- **Répétition espacée** : `prochaine_revision` est calculée depuis la dernière
  réponse selon la solidité du niveau courant — **niveau 1 → +1 jour**,
  **2 → +3 jours**, **3 → +7 jours**, **4 (acquis) → +30 jours**.

## Compétences et niveaux

16 compétences de la matière MA (8 de calcul mental + 8 tables de
multiplication).

### Calcul mental

| Code | Libellé | N1 | N2 | N3 | N4 |
|------|---------|----|----|----|----|
| `MA.CM.ADDITION` | Tables d'addition | sommes < 10 | doubles et presque-doubles | passage par 10 (9+5) | terme manquant (…+8=13) |
| `MA.CM.DOUBLES` | Doubles | 1–10 | 11–20 | 25, 30, 40, 50, 60, 100 | mélange |
| `MA.CM.MOITIES` | Moitiés | pairs ≤ 20 | pairs 22–40 | 50, 60, 100 | mélange |
| `MA.CM.COMPL_SUP` | Complément au rang supérieur | compléments à 10 | dizaine sup. (47→50) | centaine sup. (468→500) | millier sup. (4700→5000) |
| `MA.CM.COMPL_100_1000` | Compléments à 100 et 1000 | dizaines à 100 | tout nombre à 100 | centaines à 1000 | dizaines à 1000 (380→1000) |
| `MA.CM.SOMMES_DIFF` | Sommes et différences | ± dizaines sans retenue (63+20) | +9, +19, −9 | 2 chiffres + 2 chiffres avec retenue | 3 chiffres ± 2 chiffres + ordre de grandeur |
| `MA.CM.X10_X100` | ×10, ×100 (et ×20, ×50) | un chiffre ×10 | deux chiffres ×10 | ×100 | ×20, ×50 |
| `MA.CM.DIV_RESTE` | Division avec reste | divisions exactes (tables débloquées) | avec reste, diviseur 1 chiffre | par 10, 25, 50, 100 | mélange en contexte |

### Tables de multiplication

Ordre d'apprentissage : **2, 5, 3, 4, 6, 9, 8, 7**.

Progression identique pour chaque table :

- **N1** : produits dans l'ordre ×1..×10, support **rectangle** ou droite,
  méthode `cpa_barres`.
- **N2** : désordre, saisie, sans support, méthode `exemples_estompes`.
- **N3** : terme manquant, commutativité, « combien de fois », méthode
  `variation`.
- **N4** : mélange des tables débloquées + dérivés (70×8, 7×80), méthode
  `probleme_dabord`.

Stratégies de correction (champ `correction_strategie` de `ex_calcul`) :

| Table | Stratégie de correction |
|-------|-------------------------|
| 2 | double |
| 3 | double + 1 fois |
| 4 | double du double |
| 5 | moitié de ×10 |
| 6 | double de ×3 (ou 5 fois + 1 fois) |
| 7 | 5 fois + 2 fois |
| 8 | double de ×4 |
| 9 | 10 fois − 1 fois |

## Prérequis

Un prérequis doit être atteint au **niveau 2** pour débloquer la compétence.

| Compétence | Prérequis |
|------------|-----------|
| `MA.CM.ADDITION` | aucun |
| `MA.CM.X10_X100` | aucun |
| `MA.CM.DOUBLES` | ADDITION |
| `MA.CM.MOITIES` | DOUBLES |
| `MA.CM.COMPL_SUP` | ADDITION |
| `MA.CM.COMPL_100_1000` | COMPL_SUP |
| `MA.CM.SOMMES_DIFF` | ADDITION, COMPL_SUP |
| `MA.TABLES.2` | DOUBLES |
| `MA.TABLES.5` | X10_X100, MOITIES |
| `MA.TABLES.3` | TABLES.2 |
| `MA.TABLES.4` | TABLES.2 |
| `MA.TABLES.6` | TABLES.3 |
| `MA.TABLES.9` | X10_X100, SOMMES_DIFF |
| `MA.TABLES.8` | TABLES.4 |
| `MA.TABLES.7` | TABLES.2, TABLES.5 |
| `MA.CM.DIV_RESTE` | TABLES.2, TABLES.5 |

## Paramètres des exercices (`ex_calcul.params`)

Chaque compétence × niveau porte au moins une ligne `exercices` (type
`calcul`) et une ligne `ex_calcul` avec un `params` jsonb **exploitable par le
générateur côté client** : bornes, listes de nombres, table concernée, etc.
Les formes utilisées (`forme`) varient selon le niveau : `resultat`,
`terme_manquant`, `decomposition`, `ordre_grandeur`, `reste`.

Exemples de `params` (extraits) :

- `MA.CM.ADDITION` N1 : `{"a":{"min":1,"max":8},"b":{"min":1,"max":8},"contrainte":"somme_inf_10"}` (forme `resultat`, support `droite`).
- `MA.CM.ADDITION` N4 : `{"type":"terme_manquant","somme":{"min":11,"max":18},"terme_connu":{"min":2,"max":9}}` (forme `terme_manquant`).
- `MA.CM.SOMMES_DIFF` N4 : `{"a":{"min":100,"max":999},"b":{"min":11,"max":99},"ops":["add","sub"]}` (forme `ordre_grandeur`).
- `MA.CM.DIV_RESTE` N2 : `{"type":"avec_reste","diviseur":{"min":2,"max":9},"dividende":{"min":10,"max":89}}` (forme `reste`).
- `MA.TABLES.7` N3 : `{"table":7,"facteur":{"min":1,"max":10},"variantes":["terme_manquant","commutativite","combien_de_fois"]}` (forme `terme_manquant`, correction « 5 fois + 2 fois »).

L'exhaustivité des paramètres est portée par le seed lui-même
(`0006_seed_referentiel_calcul.sql`), volontairement lisible et versionné.

## Modèle de données (rappel)

- `matieres`, `competences`, `competence_prerequis`, `methodes` : structure du
  référentiel, **lecture seule** côté API (écriture réservée aux migrations).
- `exercices(id, competence, type, niveau, methode)` + clé `(id, type)` pour
  spécialiser par type.
- `ex_calcul(exercice_id, operation, forme, params, support_visuel,
  correction_strategie)` : le générateur de calcul. Les autres tables par type
  (QCM, dictée, géométrie, vocabulaire) viendront par migration ultérieure.
