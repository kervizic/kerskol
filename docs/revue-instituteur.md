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
| Français CE2 (grammaire, lexique, compréhension, écriture, conjugaison) | 1413 | 1385 | 2 | 9 | 17 | 16 (0 migration) |
| Maths CE2 (calcul/problèmes, géométrie, données, mesures) | 335 + gabarits | - | 2 | 9 | 6 | 13 (+2 garde-fous) |

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
| `lec-bib-poussiere-inf-n3` | À corriger | 1 | bonne réponse « …dans un **palais enchanté** » absente du micro-texte affiché (coupé) alors qu'elle est fidèle à l'œuvre | **texte restauré** : « …un immense jardin **au milieu duquel s'élevait un palais enchanté**… » (front-only, `attendu` fidèle inchangé) |

Toutes les corrections sont front-only. Le cas `poussiere` semblait exiger une
migration (changer la bonne réponse), mais l'inspection du texte source George
Sand (`bibliotheque.ts`) a montré que « un palais enchanté » est fidèle à
l'œuvre : c'est le micro-texte qui avait été trop coupé. On a donc **restauré le
texte** plutôt que de dégrader une réponse juste → **aucune migration**, `attendu`
inchangé, golden front↔SQL verts.

## Maths CE2

Banques statiques relues : géométrie (136 items, recalcul coordonnées à la main),
données/tableaux (88 items, chaque total recalculé). Générateurs relus (gabarits
de texte, le serveur recalcule le résultat) : problèmes (95 gabarits), mesures /
heure / grandeurs. Sous-agents : 4. **Données : 88/88 exactes.**

### Tableau avant / après (principaux)

| Clé / gabarit | Gravité | Critère | Avant | Après |
|---|---|---|---|---|
| `geo-ang-n3-droit` | **Bloquant** | 1, 8 | « Clique le sommet où l'angle est droit », figure A(25,25) B(80,40) C(40,85) : **aucun angle droit** (≈56°/61°/64°) | triangle rectangle réel en C : A(40,30) B(85,85) C(40,85), CA⊥CB |
| problèmes : pronom « il » | **Bloquant** | 7 | « **Iris** en a-t-**il** ? », « **Il** paie », genre masculin forcé alors que l'héroïne (Iris, ou tout enfant) a un genre inconnu | tournures neutres (inversion nom-sujet « Combien de billes a Iris ? », prénom au lieu de « il ») sur ~20 gabarits |
| problèmes : accord « 1 billes » | À corriger | 7 | « reçu **1 billes** », « 1 billes bleus » quand la quantité vaut 1 | helper `qteObj` → « 1 bille », adjectif accordé (« 1 bille bleue ») |
| problèmes : « bocaux » | À corriger | 7 | « Chaque **bocaux** contient… », « par **bocaux** » | table de singuliers → « bocal » |
| mesures : « après-midi » le soir | À corriger | 3, 8 | « 23 h … de l'**après-midi** », « 11 h de l'après-midi » (= 23 h) | plage restreinte à l'après-midi réel (13 h-18 h) |
| mesures : accents | À corriger | 7 | « combien de temps **s'ecoule-t-il** », « **quantite** », « **cuillere** », « **pese** », « de 0 **a** » | « s'écoule », « quantité », « cuillère », « pèse », « à » |
| mesures : « mesure 3 kg » | À corriger | 6, 8 | gabarit conversion « **mesure** 3 kg / 9 km » (verbe faux, taille impossible) | « Combien font 3 kg en g ? » (neutre) |
| problèmes : « doit-il écrire » | À corriger | 7 | pronom genré | « quel nombre **faut-il** écrire » (impersonnel) |
| problèmes : contextes absurdes | À corriger | 6, 8 | « un **arbre** porte des crayons », « a **mangé** des cailloux » | « une boîte contient… », « a **utilisé**… » |
| `geo-voc-n3-angle-non` | À corriger | 8, 9 | explication « coin trop **ouvert** » alors que l'angle (~67°) est **fermé** | « coin trop fermé (trop pointu) » |
| `geo-fig-n2-dev-triangle` | Suggestion | 6 | exemple « une part de **pizza** a trois côtés » (côté arrondi) | « une **équerre** a trois côtés droits » |

Garde-fous ajoutés (`enonces-oraux.test.ts`, lot « Revue instituteur ») :
(1) aucun énoncé ne dit « 1 » + objet au pluriel (accord) ; (2) aucun pronom
masculin accordé sur un prénom de genre inconnu (tournures impersonnelles
permises). Tests : `calcul`, `geometrie`, `donnees`, `qcm-choix` (692) + `tsc` verts.
