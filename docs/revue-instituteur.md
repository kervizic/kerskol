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
