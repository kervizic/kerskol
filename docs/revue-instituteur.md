# Revue instituteur — relecture humaine item par item

Demande de Manu (15/10/2026) : le garde-fou automatique (`qcm-choix.test.ts`)
n'avait trouvé que 4 défauts alors que des problèmes apparaissent à chaque
séance. On fait donc une **vraie relecture**, item par item, avec l'œil d'un
professeur des écoles expérimenté (sous-agents en rôle), sur TOUT le contenu
montré à l'enfant.

Grille appliquée à chaque item :
1. la bonne réponse est-elle juste, et la **seule** juste ?
2. au programme et au bon niveau ?
3. consigne claire, but explicite, dicible par un parent ?
4. tous les mots connus d'un enfant de 8 ans, sinon expliqués ?
5. mauvaises réponses plausibles, du même domaine, non devinables par élimination ?
6. exemple concret si la notion est abstraite ?
7. orthographe, accents, élisions, accords, ponctuation, symboles lus à voix haute ?
8. bienveillance ; faits exacts et non déformés ?
9. explication / correction juste et compréhensible ?

Gravités : **BLOQUANT** (réponse fausse, ambiguë, hors programme) > **À CORRIGER**
(vocabulaire hors niveau, distracteur hors champ, orthographe, consigne floue) >
**SUGGESTION**.

Le **serveur reste seul juge** : les golden tests croisés front ↔ SQL ne
comparent que `(cle, format, attendu)`. Modifier une consigne, un distracteur ou
une explication est donc front-only, sans migration. Une migration SQL n'est
nécessaire que si une **bonne réponse** change (backup + dry-run BEGIN/ROLLBACK).

## Synthèse par matière

| Matière | Items relus | OK | Bloquants | À corriger | Suggestions | Corrigés |
|---|---|---|---|---|---|---|
| QLM / Questionner le monde (QM, CE2) | 208 | 200 | 0 | 2 | 6 | 8 |
| Français CE2 (grammaire, lexique, compréhension, écriture, conjugaison) | 1413 | 1385 | 2 | 9 | 17 | 15 (+1 migration SQL) |

## QLM / Questionner le monde (QM, CE2)

Banques relues : `vivant` (48), `matière` (32), `objets` (32), `espace` (48),
`temps` (48). Sous-agents : 2 (vivant+matière+objets ; espace+temps).
**Aucune réponse fausse ni ambiguë** (critère 1 OK partout) ; faits
scientifiques et repères spatio-temporels exacts.

### Tableau avant / après

| Clé | Gravité | Critère | Avant | Après |
|---|---|---|---|---|
| `qm-viv-car-n2-a` | À corriger | 3, 5 | consigne tautologique (« …en grandissant »), distracteurs « en métal / des roues » (objets, hors champ, devinables) | consigne « Que font tous les êtres vivants, du bébé à l'adulte ? » ; options « ils restent toujours de la même taille / ils ne mangent jamais » |
| `qm-mat-eta-n4-b` | À corriger | 8 | « La vapeur et la **fumée** … état gaz » (la fumée est un aérosol, pas un gaz) | « L'**air** et la vapeur … état gaz » (+ explication corrigée) |
| `qm-viv-pla-n1-a` | Suggestion | 5 | options « du chocolat / du bruit » (absurdes) | « du lait / du sable » (plausibles) |
| `qm-viv-cyc-n3-a` | Suggestion | 7 | « se transforme **dans** une chrysalide » | « se transforme **en** chrysalide » |
| `qm-viv-hyg-n4-a` | Suggestion | 8 | « contient **surtout** des fruits et des légumes » (surévalue) | « contient des fruits et des légumes » |
| `qm-tps-fri-n4-a` | À corriger (ordre) | 1, 3 | « Range les saisons dans l'ordre de l'année » (pas de point de départ → début ambigu) | « …en commençant par le printemps (quand la nature se réveille) » |
| `qm-esp-car-n3-a` | Suggestion | 5 | distracteurs « avant / dessus » (pas des points cardinaux, devinables) | « Le point cardinal situé en face de l'est… » ; options « nord / sud » (vrais cardinaux) |
| `qm-esp-pla-n1-b` | Suggestion | 7 | explication « les océans **d'eau** couvrent… » (redondant) | « Les océans couvrent la plus grande partie de la Terre : il y a plus d'eau que de terre. » |

Toutes les corrections sont front-only (`attendu` inchangé). Tests verts :
`qm`, `qcm-choix`, `bienveillance`, `tsc --noEmit`.

## Français CE2

Banques relues : grammaire (198), lexique (164), compréhension (257, textes
inclus), écriture (32), conjugaison présent/futur/imparfait/passé composé/passé
simple/impératif (688 formes vérifiées). Sous-agents : 6.
**Conjugaison : 688 formes toutes exactes.** Deux bloquants (QCM/clic à deux
réponses correctes), traités front-only.

### Tableau avant / après (principaux)

| Clé | Gravité | Critère | Avant | Après |
|---|---|---|---|---|
| `nature-n3-determinant` | **Bloquant** | 1, 5 | « Mon grand frère lit **une** histoire. » clic « déterminant » : *mon* ET *une* sont déterminants, un seul accepté | phrase « Mon grand frère lit **tranquillement**. » (un seul déterminant) |
| `lec-bib-coche-sens-n2` | **Bloquant** | 1, 4 | question « qu'est-ce qu'un **coche** ? » mais texte sur une mouche (mot *coche* absent) | texte « Six forts chevaux tiraient un coche sur un chemin en pente. » |
| `agn-n3-cdn` | À corriger | 1, 5 | « un collier de perles blanches/blanc » : *blanc* (le collier) aussi correct | consigne « Choisis l'adjectif qui décrit **les perles**. » |
| `voc-syn-n4-5` | À corriger | 7 | « le contraire **de ouvrir** » (élision manquante) | « le contraire **d'ouvrir** » (consigne + phrase) |
| `homo-n4-sest` | À corriger | 9 | explication « Léa s'est **lavée** » (accord faux ici, COD après) | « On écrit Léa s'est **lavé** les mains » |
| `ecr-guide-n2-a` | À corriger | 5 | « Le chat boit du … » : lait / **vélo / nuage** (hors domaine) | lait / **jus / café** (boissons) |
| `ecr-guide-n2-b` | À corriger | 5 | « Nina plante une … » : fleur / **voiture / chaise** (hors domaine) | fleur / **brouette / pelle** (jardin) |
| `lec-bib-fourmis-sens-n2` | À corriger | 1, 4 | texte « Et il y en a ! » (aucune info) | texte décrivant les fourmis à la file |
| `lec-bib-gland-info-n1` | À corriger | 1, 2 | INFO N1 sans nommer la citrouille | texte nommant la citrouille |
| `lec-inf-n4-c` | À corriger | 1, 9 | indices de **trac** mais réponse libre attendue « impatiente » | texte réorienté vers l'impatience (« c'est bientôt à moi ? », temps trop long) |
| `lec-bib-paon-inf-n3` | À corriger | 1, 5 | « Pourquoi crie-t-il Léon ? » non déductible du texte | consigne contextualisée « Le paon attend sa fiancée pour la fête… » |
| `lec-bib-florine-info-n4` | À corriger | 1 | clic « fleurs » ambigu avec « guirlandes » | consigne « les petites plantes colorées… » (vise fleurs) |
| `homo-n3-ces` | Suggestion | 5 | « Regarde … belles fleurs dans le jardin ! » | « …, juste là devant toi ! » (renforce le démonstratif) |
| `ce1inf-n3-b/n4-a/n4-b` | Suggestion | 3, 7 | « **Clique le mot**… » | « **Clique sur le mot**… » |
| `lec-bib-poussiere-inf-n3` | À corriger | 1 | bonne réponse « …dans un **palais enchanté** » alors que le texte dit « jardin » | **migration SQL** → « …dans un **jardin merveilleux** » |

Corrections front-only (tests `francais`, `qcm-choix`, `bienveillance`, `tsc`
verts). Un seul changement de bonne réponse (`lec-bib-poussiere-inf-n3`) traité
par migration SQL (backup + dry-run), ci-dessous.
