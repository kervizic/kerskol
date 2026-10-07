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

- « cinquante-deux → on relie les deux mots avec un petit trait. »
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

- « Presque ! Regarde bien : on écrit « {nombre} ». »
- Utilisé quand la saisie ne correspond à aucune règle (mots inconnus, texte vide,
  mots en trop). Ces cas sont aussi enregistrés pour enrichir les règles.

---

# Messages de correction - conjugaison (français)

Liste **complète** des explications affichées quand l'enfant conjugue un verbe
(compétences `FR.CONJ.PRESENT`, `FR.CONJ.FUTUR`, `FR.CONJ.IMPARFAIT`). Même style
« enfant de 8 ans » : phrases très courtes, toujours un exemple concret, jamais
de grammaire abstraite. La bonne forme est affichée et la partie fautive
surlignée. **Les accents sont exigés** (le serveur reste seul juge ; le type de
faute est indicatif et enregistré dans `reponses.type_faute`).

Source : `frontend/src/domain/diagnostic/conjugaison.ts` (`diagnostiquerConjugaison`,
`MESSAGES_CONJUGAISON`). Parties entre accolades : `{forme}` = forme attendue,
`{pronom}` = le sujet, `{temps}` = le temps (le présent / le futur / l'imparfait).

## Bonne réponse (JUSTE)

- « Bravo ! C'est la bonne forme. »

## ACCENT - un accent manquant

- « N'oublie pas l'accent : « {forme} ». vous êtes → avec un accent sur le e. /
  vous etes → pas juste. »
- Exemple : pour **vous (être) présent**, *etes* → pas juste ; *êtes* → juste.

## MAUVAISE_PERSONNE - la forme d'une autre personne

- « Attention à la personne : avec {pronom}, on écrit « {forme} ». tu chantes →
  avec un s. / il chante → pas de s. »
- Exemple : pour **il (chanter) présent**, *chantes* (c'est la forme de « tu ») →
  on écrit « chante ».

## MAUVAIS_TEMPS - le bon verbe, mais pas au bon moment

- « Attention au temps : ici c'est {temps} ({repère}). On écrit « {forme} ». hier
  je chantais / demain je chanterai. »
- `{repère}` = « maintenant » (présent), « demain » (futur), « avant / hier »
  (imparfait).
- Exemple : pour **je (chanter) présent**, *chanterai* (c'est le futur) → « Attention
  au temps : ici c'est le présent (maintenant). On écrit « chante ». »

## TERMINAISON - bon début, mauvaise fin

- « Bon début, mauvaise fin : avec {pronom}, on écrit « {forme} ». tu joues → un s
  à la fin. / il joue → pas de s. »
- Exemple : pour **il (chanter) présent**, *chanter* → on écrit « chante ».

## ORTHO_RADICAL - le mot est mal écrit

- « Regarde bien les lettres : on écrit « {forme} ». »
- Exemple : pour **il (chanter) présent**, *chnte* → on écrit « chante ».

## INCONNU - repli

- « Presque ! Regarde bien : on écrit « {forme} ». »
- Utilisé quand la saisie ne correspond à aucune règle. Enregistré aussi.


---

# Messages de correction - passé composé (français)

Liste **complète** des explications affichées quand l'enfant conjugue au **passé
composé** (compétence `FR.CONJ.PASSE_COMPOSE`, niveau 4 en saisie libre ; QCM aux
niveaux 1-3). Même style « enfant de 8 ans » : phrases très courtes, toujours un
exemple concret juste / pas juste, jamais de grammaire abstraite. La bonne forme
(auxiliaire + participe) est affichée. **Les accents sont exigés** (le serveur
`verif_passe_compose` reste seul juge ; le type de faute est indicatif et
enregistré dans `reponses.type_faute`).

Source : `frontend/src/domain/diagnostic/passe-compose.ts`
(`diagnostiquerPasseCompose`, `MESSAGES_PASSE_COMPOSE`). `{forme}` = la forme
attendue (ex. « est allée »).

Décision pédagogique (CE2) : seuls **aller** et **venir** (auxiliaire être)
s'accordent. Pour lever l'ambiguïté, le **genre est imposé** aux 3e personnes
(sujet « il/elle », « ils/elles » ou nominal) ; pour je/tu/nous/vous, les **deux
écritures m/f sont acceptées** (« je suis allé » comme « je suis allée »).

## Bonne réponse (JUSTE)

- « Bravo ! C'est le bon passé composé. »

## ACCENT - un accent manquant

- « N'oublie pas l'accent : « {forme} ». il a mangé → avec un accent. / il a
  mange → pas juste. »

## AUXILIAIRE - le mauvais petit mot (avoir / être)

- Verbe avec **être** : « Ce verbe se dit avec « être » : « {forme} ». il est
  allé → avec être. / il a allé → pas juste. »
- Verbe avec **avoir** : « Ce verbe se dit avec « avoir » : « {forme} ». il a
  mangé → avec avoir. / il est mangé → pas juste. »

## ACCORD - l'accord avec être oublié

- « Avec « être », le participe s'accorde : « {forme} ». elle est allée → avec un
  e. / elle est allé → pas juste. »

## PARTICIPE - le participe mal formé

- « Ce n'est pas le bon participe : on écrit « {forme} ». il a pris → pris. / il
  a prendu → pas juste. »

## MAUVAIS_TEMPS - un temps simple au lieu du passé composé

- « Ici c'est le passé composé (c'est déjà fait). On écrit « {forme} ». hier il a
  mangé. / il mangeait → autre temps. »

## INCONNU - repli

- « Presque ! Regarde bien : on écrit « {forme} ». »
- Utilisé quand la saisie ne correspond à aucune règle. Enregistré aussi.


---

# Messages de correction - problèmes de mesures (maths)

Liste **complète** des types de faute du diagnostic déterministe des **problèmes
de mesures** (compétence `MA.PB.MESURES` : longueurs, masses, durées, monnaie).
Le serveur (`verif_calcul`) reste seul juge du juste/faux ; le `type_faute` est
**indicatif** (enregistré dans `reponses.type_faute` pour reproposer plus tard un
exercice ciblé sur la même difficulté). Au moment de l'erreur, l'enfant voit la
**correction expliquée** (conversion puis calcul). Les pièges sont attachés à
l'exercice (`diagPieges`, `frontend/src/domain/calcul/problemes.ts`).

Style « enfant de 8 ans », exemple concret. `{forme}`/valeurs variables selon
l'énoncé.

## OUBLI_CONVERSION - conversion oubliée

- « N'oublie pas de convertir avant de calculer. 1 m = 100 cm, donc 3 m = 300 cm.
  / 3 → pas juste. »

## MAUVAISE_UNITE - mauvaise conversion d'unité

- « Regarde bien l'unité : 1 m = 100 cm (pas 10). 3 m = 300 cm → juste. / 30 →
  pas juste. »

## MAUVAISE_OP - mauvaise opération

- « Relis l'énoncé : ici il faut enlever (−), pas ajouter (+). / le contraire →
  pas juste. »

## ERREUR_CALCUL - erreur de calcul (repli)

- « Presque ! Refais le calcul doucement : la bonne réponse est {forme}. »
- Utilisé quand la réponse fausse ne correspond à aucun piège connu.


---

# Messages de correction - dictée détective (français)

Liste **complète** des messages de la « dictée détective » (compétence
`FR.ORTHO.DETECTIVE`). Même style « enfant de 8 ans » : phrases très courtes,
**toujours un exemple juste / pas juste**, jamais de grammaire abstraite. Le
**serveur** est seul juge : il révèle, pour chaque erreur plantée, son type et
si l'enfant l'a trouvée / bien corrigée, et liste les fausses alertes. Affichage
**toujours valorisant, jamais punitif**.

Source : `frontend/src/domain/diagnostic/dictee.ts` (`MESSAGES_DICTEE`,
`messageErreur`, `messageFausseAlerte`, `messageBilan`). Parties entre
accolades : `{faute}` = le mot fautif affiché, `{correction}` = la bonne forme.

## Astuce + exemple par type d'erreur (`MESSAGES_DICTEE`)

- **a / à** : « a sans accent = avoir : il a un chat (il avait). / à avec accent :
  il va à l'école. »
- **et / est** : « est = était : le chat est noir. / et = et puis : du pain et du
  lait. »
- **son / sont** : « son chat = le chat à lui. / ils sont là = ils étaient là. »
  (message simplifié, validé par Manu)
- **on / ont** : « ont = avaient : ils ont faim. / on = quelqu'un : on joue. »
- **ces / ses** : « ses jouets = les jouets à lui. / ces jouets = ceux-là, je les
  montre. » (message simplifié, validé par Manu)
- **ce / se** : « se = juste devant le verbe : il se lave. / ce = ce garçon, ce
  que. »
- **pluriel** : « Quand il y en a plusieurs, on ajoute un s (ou un x) : un chat →
  des chats, un jeu → des jeux. »
- **pluriel -al/-aux** (nouveau type) : « un cheval → des chevaux. Beaucoup de
  mots en -al font -aux au pluriel. »
- **accord** : « Le petit mot qui décrit s'habille comme le nom : une fleur rouge
  → des fleurs rouges. »
- **verbe -ent** : « Plusieurs qui font l'action : le verbe prend -ent : il joue
  → ils jouent. »
- **m devant m/b/p** : « Devant m, b, p, on écrit m et pas n : un tambour, une
  jambe, important. »
- **é / er / ez** : « er quand on peut dire « vendre » : il va manger (vendre). /
  é quand c'est fait : il a mangé (vendu). »

## Message par situation (`messageErreur`)

- **Mot trouvé (niveau 1)** : « Bien joué, tu as trouvé le mot piégé « {faute} » ! »
- **Mot trouvé ET corrigé (niveau 2+)** : « Bravo ! Tu as trouvé ET corrigé : on
  écrit « {correction} ». »
- **Mot trouvé mais mal corrigé** : « Bien trouvé ! Mais on écrit « {correction} ».
  » + l'astuce du type ci-dessus.
- **Mot manqué** : « Un mot piégé était caché ici : « {faute} » → on écrit
  « {correction} ». » + l'astuce du type (le mot est surligné dans le texte).

## Fausse alerte (`messageFausseAlerte`)

- « Ce mot était juste ! « {mot} » n'avait pas d'erreur. »

## Bilan valorisant (`messageBilan`, toujours affiché)

- **Tout juste (plusieurs)** : « Super détective ! Tu as tout trouvé (3 sur 3) ! »
- **Tout juste (une seule)** : « Super ! Tu as tout repéré ! »
- **Niveau 1 incomplet** : « Tu en as trouvé 2 sur 3 ! Regarde les autres, tu y
  arriveras ! »
- **Niveau 2+ incomplet** : « Tu en as bien corrigé 1 sur 3 ! On regarde ensemble
  les autres. »
