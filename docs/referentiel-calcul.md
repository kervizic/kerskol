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
  douceur ; dès le niveau 2, la réponse est saisie. Au **niveau 4** (le plus
  difficile), la réponse est **toujours saisie librement** quand c'est pertinent
  (règle « réponse libre au N4 », cf. `docs/pedagogie.md`). Les rares QCM
  restants (lire un nombre = choisir son écriture **en lettres**) n'ont pas
  d'équivalent en saisie libre et sont conservés.
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

- **Niveau de départ sensible à la CLASSE** (migration
  `0012_placement_depart.sql`, table `placement_depart(classe, competence,
  niveau_depart)`) : le placement ne démarre plus systématiquement au niveau 1.
  Pour une élève de **CE2**, les compétences de révision de la classe précédente
  démarrent haut (elles servent de vérification rapide) :

  | Compétence (CE2) | Rôle | Niveau de départ |
  |------------------|------|:---:|
  | `MA.CM.ADDITION` | révision CE1 | 3 |
  | `MA.CM.DOUBLES` | révision CE1 | 3 |
  | `MA.CM.MOITIES` | révision CE1 | 2 |
  | `MA.CM.COMPL_SUP` | révision CE1 | 2 |
  | `MA.CM.SOMMES_DIFF` | cœur CE2 | 2 |
  | `MA.CM.COMPL_100_1000`, `MA.CM.X10_X100`, `MA.TABLES.2`, `MA.TABLES.5` | cœur CE2 | 1 (défaut) |

  En l'absence de ligne, le départ reste **1** (comportement historique). Côté
  composition (1re séance), le plan de classe (`domain/calcul/classes.ts`)
  propose au plus **1-2 exercices de révision faciles** en amorce puis le cœur de
  CE2, en **présumant** les prérequis de révision atteints au niveau 2 tant
  qu'ils ne sont pas infirmés.
- **Placement en escalier** à la première apparition (tant que
  `placement_termine = false`) : départ au niveau de la classe (défaut 1),
  **+1 par bonne réponse**
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

27 compétences de la matière MA : 8 de calcul mental + 8 tables de
multiplication (seed `0006`), puis 4 de **numération** et 3 de **calculs posés**
(migration `0023_numeration_calcul_pose.sql`), enfin 4 de **problèmes**
(migration `0024_problemes.sql`, voir plus bas).

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

## Numération jusqu'à 10 000 (domaine `numeration`, migration 0023)

Quatre compétences, alignées sur le programme CE2 (Éduscol : désigner, lire,
écrire, décomposer, comparer, ranger, encadrer les nombres jusqu'à 10 000).

| Code | Libellé | N1 | N2 | N3 | N4 |
|------|---------|----|----|----|----|
| `MA.NUM.LIRE_ECRIRE` | Lire / écrire ≤ 10 000 | lire (QCM) ≤ 100 | écrire (saisie) ≤ 1000 | écrire ≤ 10 000 | lire (QCM) ≤ 10 000 |
| `MA.NUM.DECOMPOSER` | Décomposer (m, c, d, u) | c/d/u ≤ 999 | m/c/d/u ≤ 9999 | valeur d'un chiffre | nombre de dizaines/centaines |
| `MA.NUM.COMPARER` | Comparer, encadrer, ranger | comparer ≤ 100 | comparer ≤ 10 000 | encadrer à la centaine | ranger : **écrire** le plus grand (saisie) |
| `MA.NUM.SUITE` | Suite, ±10/100/1000 | suivant/précédent ≤ 1000 | ±10, ±100 | droite graduée | ±1, ±10, ±100, ±1000 |

## Calculs posés (domaine `calcul_pose`, migration 0023)

Trois compétences : opérations posées en colonnes, résultat saisi **chiffre par
chiffre de droite à gauche**, cases de retenue optionnelles (aide, non notées).

| Code | Libellé | N1 | N2 | N3 | N4 |
|------|---------|----|----|----|----|
| `MA.POSE.ADDITION` | Addition posée | 2 nombres à 2 chiffres, sans retenue | 2 ou 3 chiffres, retenues | 3-4 chiffres | 3 termes |
| `MA.POSE.SOUSTRACTION` | Soustraction posée (résultat ≥ 0) | 2 chiffres sans emprunt | 2-3 chiffres avec emprunt | 3 chiffres | 4 chiffres |
| `MA.POSE.MULTIPLICATION` | Multiplication posée × 1 chiffre | 2 chiffres × (2..4) | 2 chiffres × (2..9) | 3 chiffres × 1 chiffre | 3 chiffres × 1 chiffre |

## Problèmes (domaine `problemes`, migration 0024)

Quatre compétences, alignées sur le programme CE2 (Éduscol : résoudre des
problèmes à une puis deux étapes, relevant des quatre opérations et de la
monnaie). Méthode par **schémas en barres** (tout/parties, comparaison),
disponible en aide (bouton « Je veux un schéma », l'inconnue reste « ? ») et
systématiquement dans la correction expliquée. Les énoncés sont tirés d'une
**banque de gabarits** (≥ 15 par compétence) et peuvent utiliser le **surnom**
de l'enfant (mascotte) et son univers.

| Code | Libellé | N1 | N2 | N3 | N4 |
|------|---------|----|----|----|----|
| `MA.PB.ADD_SUB` | Problèmes additifs à une étape | réunion / ajout / retrait ≤ 20 | « de plus / de moins » ≤ 100 | les 5 structures ≤ 1 000 | recherche de l'état initial ≤ 1 000 |
| `MA.PB.MULT_DIV` | Problèmes multiplicatifs à une étape | groupement / partage (tables 2-5) | « fois plus » / groupement | les 3 structures (tables 2-9) | partage / fois plus / groupement (tables 2-9) |
| `MA.PB.MONNAIE` | Billets et pièces (euros) | composer une somme (€ entiers) | comparer des prix / rendre la monnaie | composer avec des centimes | rendre la monnaie / comparer |
| `MA.PB.DEUX_ETAPES` | Problèmes à deux étapes (MIXTES) | n×p puis ±c | n×p puis ±c (tables 2-5) | (a+b)÷c, (a+b)−c | les combinaisons (tables 2-9) |

Chaque problème se normalise en `verif` : `add`/`sub`/`mul`/`div` (additif,
multiplicatif, rendre la monnaie), `cmp` (comparer des prix), `val` (composer une
somme : la saisie **est** le total composé). Les problèmes à deux étapes chaînent
une **seconde opération** : `verif` transporte `op2` et `c`, le serveur calcule
`r1 = op(a,b)` puis `réponse = op2(r1, c)`. `op2` est **réservé** à
`MA.PB.DEUX_ETAPES` (vérifié serveur) ; la seconde étape refuse une soustraction
négative ou une division non exacte.

**Rendu sur plusieurs articles (`op2 = rsub`, migration 0025).** Pour les
problèmes de rendu de monnaie et de « il reste combien » portant sur plusieurs
articles, la seconde opération est une **soustraction inversée** `rsub` :
`réponse = c − r1` (et non `r1 − c`). Exemple : « Léa achète 3 cahiers à 4 €.
Elle paie avec un billet de 20 €. Combien lui rend-on ? » → `r1 = 3 × 4 = 12`,
`réponse = 20 − 12 = 8`. `rsub` reste **réservé** à `MA.PB.DEUX_ETAPES` (N3-N4),
le serveur refuse un **rendu négatif** (il exige `c ≥ r1`) et travaille en
**euros entiers**. Côté client, `computeVerif` reproduit exactement ce calcul
(test d'invariant sur tous les gabarits).

Unités monétaires (choix de cohérence, saisie entière) : la **composition** d'une
somme travaille en **centimes** (on ne tape jamais, on touche billets et pièces,
`val` sur le total en centimes) ; **rendre la monnaie** et **comparer des prix**
restent en **euros entiers** (saisie clavier / boutons `<,=,>`). Aucune valeur
flottante : tout est vérifié en entiers.

Nouveau mode de saisie `monnaie` (billets et pièces SVG, touche/clavier) : seul
le **total composé** (centimes) est envoyé au serveur (`val`).

### Énoncé normalisé et vérification serveur (nouvelles compétences)

Toutes ces compétences se ramènent au contrat de sécurité du lot 2 : le client
envoie `verif:{op,a,b}` + sa saisie, le serveur (`public.verif_calcul`)
recalcule et décide « juste/faux ». Deux opérations sont ajoutées à
`VerifOp` (front) et à `verif_calcul` (SQL), les autres réutilisent
add/sub/mul/div :

- `cmp` : comparaison, `expected = 0` (a < b), `1` (a = b), `2` (a > b) ;
- `val` : la réponse **est** une valeur, `expected = a` (b doit valoir 0).

Normalisations : suivant/précédent et ±10/100/1000 → `add`/`sub` ; valeur d'un
chiffre → `mul` (chiffre × rang) ; nombre de dizaines/centaines → `div` ;
encadrement → `sub` (n − (n mod pas)) ; décomposition, lecture/écriture, droite
graduée et « ranger » → `val`. **Pour les QCM (lecture, ranger), le client
envoie la VALEUR de l'option choisie, jamais un index** ; le serveur la revalide
via `val`. Les bornes par compétence (numération ≤ 10 000 ; multiplication posée
avec un facteur à 1 chiffre ; soustraction ≥ 0) sont vérifiées serveur.

### Modes de saisie (interface)

`GeneratedExercise.saisie` pilote le rendu : `clavier` (défaut, pavé/clavier
numérique), `compare` (trois boutons <, =, >), `chiffres` (une case par rang),
`pose` (colonnes alignées + résultat chiffre à chiffre de droite à gauche +
retenues optionnelles), `qcm` (choix d'options), `droite` (droite graduée +
lecture de la valeur pointée), `monnaie` (composer une somme en touchant billets
et pièces ; total en centimes), `heure` (deux champs heures + minutes : steppers
aux N1-N3, **saisie directe des chiffres au pavé** au N4 via
`horlogeData.freeInput` ; normalisés en minutes), `fraction_num` (saisie libre
d'une fraction : numérateur et dénominateur en deux cases séparées par une barre,
envoie le code `num × 100 + den`). Seule la saisie finale (un entier) est envoyée.

## Mesures (domaine `mesures`, migration 0027)

Deux compétences, alignées sur le programme CE2 (Éduscol / programmes 2024 cycle 2 :
lire l'heure, résoudre des problèmes de durées). **Normalisation en entiers** : une
**heure de la journée** est normalisée en **minutes depuis minuit** (`h × 60 + m`),
une **durée** en **minutes**. Toutes les réponses se ramènent donc aux opérations
existantes (aucune nouvelle opération serveur).

| Code | Libellé | N1 | N2 | N3 | N4 |
|------|---------|----|----|----|----|
| `MA.MES.HEURE` | Lire / écrire l'heure | heures pleines et demies (horloge SVG, QCM) | quarts (steppers heures+minutes) | de 5 min en 5 min (steppers) | à la minute + matin/après-midi (14 h = 2 h de l'après-midi), **saisie directe des chiffres au pavé** |
| `MA.MES.DUREES` | Durées | conversions h → min (1 h = 60 min, 1 h 30 = 90 min) | conversions + « de … à … » | « de … à … » + heure d'arrivée (départ + durée) | heure d'arrivée + jours/semaines (1 semaine = 7 jours) |
| `MA.MES.LONGUEURS` | Longueurs (mm, cm, m, km) | choisir l'unité adaptée (QCM) | conversions (1 cm = 10 mm, 1 m = 100 cm, 1 km = 1 000 m) | comparer deux longueurs | mesurer un segment sur une règle graduée (SVG) |
| `MA.MES.MASSES_CONTENANCES` | Masses (g, kg) et contenances (L, dL, cL) | choisir l'unité (QCM) | conversions (1 kg = 1 000 g ; 1 L = 100 cL) | comparer | lire une balance / un verre gradué (SVG) |

Normalisations en `verif` : lecture/écriture d'une heure → `val` (minutes depuis
minuit) ; conversion h → min et semaines → jours → `mul` ; jours → semaines →
`div` ; « de … à … » → `sub` (fin − début, en minutes) ; départ + durée → arrivée
→ `add` ; correspondance 24 h ↔ 12 h → `sub` / `add`. Les bornes serveur (famille
`MA.MES.%`) rejettent tout opérande > 20 000 (une semaine = 10 080 min).

**Visuel original** : une **horloge à aiguilles** en SVG (`HorlogeView`), cadran de
12 h, aiguilles des heures (courte) et des minutes (longue), graduations des 60
minutes, `aria-label` décrivant l'heure, couleurs par variables de thème (lisible
en clair/sombre). Pour la **lecture**, les aiguilles **sont** la question (jamais
un indice). **Saisie `heure`** : deux steppers (heures + minutes, gros boutons
tactiles) dont la valeur est normalisée en minutes avant envoi ; au niveau 1, QCM.

**Longueurs, masses et contenances (migration 0028).** Le choix de l'unité est un
QCM dont la **valeur** envoyée est un **code d'unité** entier (revalidé `val`). Les
conversions se ramènent à `mul` / `div` ; les comparaisons normalisent les deux
mesures dans la **plus petite unité commune** puis envoient `cmp` (le mode
`compare` affiche les libellés d'origine, ex. « 3 cm » / « 25 mm », via
`compareLabels`). La lecture d'une **règle graduée** (`RegleView`), d'une
**balance** ou d'un **verre gradué** (`BalanceView`) se fait à la saisie clavier
(`val`). Bornes serveur famille `MA.MES.%` : opérandes ≤ 20 000. Prérequis :
conversions ← `MA.CM.X10_X100` ; masses/contenances ← longueurs.

## Fractions simples (domaine `fractions`, migration 0029)

Une compétence `MA.FRAC.SIMPLES`, alignée sur le programme CE2 (approche des
fractions simples : demi, tiers, quart, puis n/2, n/3, n/4, n/5, n/10).

| Code | Libellé | N1 | N2 | N3 | N4 |
|------|---------|----|----|----|----|
| `MA.FRAC.SIMPLES` | Fractions simples | nommer la fraction coloriée (QCM, figure SVG : disque/rectangle/bande) | colorier/sélectionner les parts + nommer (**saisie libre num/dén** dès le N2, n/2..n/5) | comparer une fraction à 1 (y compris > 1) | fraction d'une quantité (la moitié de 12, le quart de 20) |

Normalisations en `verif` : **nommer** → `val` (la saisie = **code** de la
fraction `num × 100 + den`, revalidé par simple égalité) ; **colorier** → `val`
(la saisie = nombre de parts coloriées) ; **comparer à 1** → `cmp` (`a = num`,
`b = den` : `num < den` ⇒ < 1) ; **fraction d'une quantité** → `div`
(`quantité ÷ dénominateur`, exacte). Bornes serveur famille `MA.FRAC.%` :
opérandes ≤ 2 000. **Non retenu faute d'appui dans le programme CE2** : les
opérations sur fractions (somme, simplification) et l'écriture décimale, laissées
au CM. Visuels SVG originaux (`FractionShape` : parts égales coloriées,
`aria-label`, interactif pour le coloriage). Prérequis : `MA.CM.MOITIES`,
`MA.TABLES.2` (fraction d'une quantité ← tables/partage). Modes de saisie
`fraction` (coloriage tactile des parts) et `fraction_num` (saisie libre du
numérateur / dénominateur, dès le N2 pour « nommer » : la saisie remplace le QCM
mais envoie le même code `num × 100 + den`).

### Ouverture progressive (prérequis, pas de placement_depart)

Les nouvelles compétences **ne portent aucune ligne `placement_depart`** : elles
démarrent au niveau 1 par le placement en escalier habituel. Elles ne sont pas
ajoutées au plan de classe (`classes.ts`) : leur apparition est pilotée par le
**graphe de prérequis**. `MA.NUM.LIRE_ECRIRE` (sans prérequis) s'ouvre d'abord,
puis le reste de la numération, puis les calculs posés.

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
| `MA.NUM.LIRE_ECRIRE` | aucun |
| `MA.NUM.DECOMPOSER` | NUM.LIRE_ECRIRE |
| `MA.NUM.COMPARER` | NUM.LIRE_ECRIRE |
| `MA.NUM.SUITE` | NUM.LIRE_ECRIRE |
| `MA.POSE.ADDITION` | SOMMES_DIFF, NUM.DECOMPOSER |
| `MA.POSE.SOUSTRACTION` | POSE.ADDITION |
| `MA.POSE.MULTIPLICATION` | POSE.ADDITION, X10_X100 |
| `MA.PB.ADD_SUB` | SOMMES_DIFF |
| `MA.PB.MULT_DIV` | TABLES.2, TABLES.5 |
| `MA.PB.MONNAIE` | SOMMES_DIFF, NUM.LIRE_ECRIRE |
| `MA.PB.DEUX_ETAPES` | PB.ADD_SUB, PB.MULT_DIV |
| `MA.MES.HEURE` | aucun |
| `MA.MES.DUREES` | MES.HEURE, SOMMES_DIFF |
| `MA.MES.LONGUEURS` | X10_X100 |
| `MA.MES.MASSES_CONTENANCES` | X10_X100, MES.LONGUEURS |
| `MA.FRAC.SIMPLES` | MOITIES, TABLES.2 |

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
