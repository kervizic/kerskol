# Énoncés clarifiés (lot C)

But : chaque énoncé et chaque consigne doivent pouvoir être **dits tels quels par
un parent à un enfant de 8 ans**, sans symbole qui ne se lit pas, sans
abréviation et sans jargon. La voix de l'application n'assemble que des clips de
**nombres** et d'**opérateurs** (+ − × ÷ =) plus quatre amorces ; elle ne lit
pas les lettres. Un énoncé écrit doit donc rester clair même quand la voix n'en
dit qu'une partie.

## Défaut signalé par Manu

L'énoncé « 689 → combien pour aller a la centaine au-dessus ? » était confus :
la flèche se lit « moins » (ou rien), « a » n'avait pas d'accent, et le but
n'était pas explicite. Réécrit avec un but clair : **« Il manque combien à 689
pour faire 700 ? »**.

## Table des symboles

Symboles autorisés dans un énoncé (sens parlé ou convention claire) :

| Symbole | Se lit | Exemple |
|--------|--------|---------|
| `+` | plus | `37 + 15` |
| `−` | moins | `52 − 37` |
| `×` | fois | `4 × 6` |
| `÷` | divisé par | `20 ÷ 4` |
| `=` | égale | `4 × 6 = 24` |
| `/` | sur (dans une fraction) | `3/4` |
| `…` | le terme à trouver | `37 + … = 52` |
| `« »` | on cite un mot ou un nombre écrit | `« vingt »` |

Symboles **interdits** (aucune lecture claire) : `→ ← ⇒ ⇐ ↔`. Interdits aussi :
les abréviations (`ex.`, `etc.`) et le jargon scolaire non expliqué
(numérateur, dénominateur, quotient, dividende, diviseur, abscisse,
encadrement). Le test `src/domain/calcul/enonces-oraux.test.ts` vérifie
automatiquement ces règles sur TOUS les énoncés de calcul générés.

## Liste avant / après (extrait)

| # | Avant | Après |
|---|-------|-------|
| 1 | `689 → combien pour aller a la centaine au-dessus ?` | `Il manque combien à 689 pour faire 700 ?` |
| 2 | `4 fois 6, c'est le double du double : 6 → 12 → 24.` | `4 fois 6, c'est le double du double : 6, puis 12, puis 24.` |
| 3 | `Quelle fraction de la figure est coloriee ?` | `Quelle fraction de la figure est coloriée ?` |
| 4 | `Compare la fraction 3/4 a 1.` | `Compare la fraction 3/4 à 1.` |
| 5 | `Ecris l'heure indiquee par l'horloge.` | `Écris l'heure indiquée par l'horloge.` |

Autres énoncés corrigés (accents / clarté) :

- `Sur la bande graduee de 0 a 1, quelle fraction est marquee ?` → `Sur la bande graduée de 0 à 1, quelle fraction est marquée ?`
- `Ecris la fraction de la figure qui est coloriee.` → `Écris la fraction de la figure qui est coloriée.`
- `Ecris la fraction marquee sur la bande graduee de 0 a 1.` → `Écris la fraction marquée sur la bande graduée de 0 à 1.`
- `Il est 15 h. Sur une horloge a aiguilles, l'apres-midi, ...` → `... à aiguilles, l'après-midi, ...`
- `Il est 3 h de l'apres-midi. ...` → `Il est 3 h de l'après-midi. ...`
- `Pour mesurer ..., quelle unite choisis-tu ?` → `... quelle unité choisis-tu ?`
- `Decompose le nombre 345 par rang.` → `Décompose le nombre 345 par rang.`
- `Combien de dizaines entieres y a-t-il dans 345 ?` → `... entières ...`
- `Quel nombre vient juste apres 345 ?` → `... juste après 345 ?`
- `Quel nombre est indique par la fleche ?` → `Quel nombre est indiqué par la flèche ?`
- Corrections associées (figure coloriée, bande graduée, « égale à 1 »).
- Détective de dictée : `« mot » → ` remplacé par `À corriger : « mot »`.

Total : une vingtaine d'énoncés et corrections réécrits.

## Banques SQL

Vérifiées : aucune flèche ni symbole non parlable dans les textes vus par
l'enfant (les `ex.` / `etc.` repérés sont uniquement dans des commentaires `--`
de migrations, jamais dans un énoncé). Le serveur reste seul juge des réponses ;
la réécriture ne touche que le texte affiché, pas la vérification.
