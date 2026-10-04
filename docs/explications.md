# Messages de correction - écriture d'un nombre en lettres

Liste **complète** des explications affichées à l'enfant quand il écrit un nombre
en toutes lettres (compétence `MA.NUM.LIRE_ECRIRE`, niveau 4). Style « enfant de
8 ans » : phrases très courtes, toujours un exemple concret (juste / pas juste),
jamais de vocabulaire grammatical abstrait. La bonne écriture est affichée et la
**partie fautive est surlignée**. On montre **au plus 2** fautes.

Source : `frontend/src/domain/diagnostic/diagnostic.ts` (fonction `diagnostiquer`,
constante `MESSAGES_CATALOGUE`). Le serveur reste seul juge du juste/faux ; le
type de faute est indicatif et enregistré dans `reponses.type_faute`.

Les parties entre accolades sont remplacées dynamiquement : `{nombre}` = la bonne
écriture (orthographe traditionnelle), `{mot}` = le mot attendu, `{rang}` = le
rang qui diffère (les milliers / les centaines / les dizaines / les unités).

## Bonne réponse (JUSTE)

- « Bravo ! C'est la bonne écriture. »
  (les deux orthographes sont acceptées : *deux cent trois* et *deux-cent-trois*)

## TRAIT_UNION - traits d'union / espaces

- « Les mots d'un nombre se relient avec un petit trait. Écris « {nombre} ».
  cinquante-deux → on relie les deux mots avec un petit trait. »
- Exemple : pour **23**, *vingt trois* → pas juste ; *vingt-trois* → juste.

## S_VINGT_CENT - le « s » de vingt et de cent

- Pour **cent**, « s » manquant : « Ici « cents » prend un s : plusieurs centaines,
  rien après. deux cents → avec un s. / deux cent trois → pas de s : un nombre
  vient après. »
- Pour **cent**, « s » en trop : « Ici « cent » ne prend pas de s : un nombre vient
  après. deux cent trois → pas de s. / deux cents → avec un s : rien après. »
- Pour **vingt**, « s » manquant : « Ici « quatre-vingts » prend un s : rien après.
  quatre-vingts → avec un s. / quatre-vingt-deux → pas de s : un nombre vient
  après. »
- Pour **vingt**, « s » en trop : « Ici « quatre-vingt » ne prend pas de s : un
  nombre vient après. quatre-vingt-deux → pas de s. / quatre-vingts → avec un s :
  rien après. »

## S_MILLE - jamais de « s » à mille

- « Jamais de s à « mille ». Mille ne change jamais. trois mille → jamais de s. »
- Exemple : pour **3 000**, *trois milles* → pas juste ; *trois mille* → juste.

## ET_UN - « et un », « et onze »

- « On dit vingt et un, trente et un… pas vingt-un. On met « et » devant un et
  onze. »
- Exemples : *vingt-un* → pas juste, *vingt et un* → juste ; *soixante-onze* → pas
  juste, *soixante et onze* → juste.

## ORTHO_MOT - un mot mal écrit

- « Ce mot s'écrit « {mot} ». Regarde bien les lettres. »
- Exemple : pour **60**, *soixant* → le mot s'écrit « soixante ».

## MAUVAIS_NOMBRE - ce n'est pas le bon nombre

- « Ce n'est pas le bon nombre : regarde {rang}. On écrit « {nombre} ». »
- Exemple : pour **200**, *trois cents* → regarde les centaines ; on écrit « deux
  cents ».

## INCONNU - repli

- « Ce n'est pas ça. On écrit « {nombre} ». »
- Utilisé quand la saisie ne correspond à aucune règle (mots inconnus, texte vide,
  mots en trop). Ces cas sont aussi enregistrés pour enrichir les règles.
