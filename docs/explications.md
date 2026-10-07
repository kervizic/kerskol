# Messages de correction - écriture d'un nombre en lettres

Liste **complète** des explications affichées à l'enfant quand il écrit un nombre
en toutes lettres (compétence `MA.NUM.LIRE_ECRIRE`, niveau 4). Style « enfant de
8 ans » : phrases très courtes, **rédigées pour l'oral** (elles se disent à voix
haute : pas de barre oblique, pas de flèche, pas de guillemet décoratif, pas de
symbole, pas d'abréviation), toujours un exemple concret (juste et pas juste),
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

## TRAIT_UNION - traits d'union et espaces

- « On relie les deux mots avec un petit trait. Par exemple, on écrit
  cinquante-deux avec un trait entre cinquante et deux. »

## S_VINGT_CENT - le « s » de vingt et de cent

- Pour **cent**, « s » manquant : « Le mot cent prend un s quand il y a plusieurs
  centaines et rien après. On écrit deux cents avec un s, mais deux cent trois
  sans s, car un nombre vient après. »
- Pour **cent**, « s » en trop : « Le mot cent ne prend pas de s quand un nombre
  vient après. On écrit deux cent trois sans s, mais deux cents avec un s quand il
  n'y a rien après. »
- Pour **vingt**, « s » manquant : « Le mot quatre-vingts prend un s quand il n'y
  a rien après. On écrit quatre-vingts avec un s, mais quatre-vingt-deux sans s,
  car un nombre vient après. »
- Pour **vingt**, « s » en trop : « Le mot quatre-vingt ne prend pas de s quand un
  nombre vient après. On écrit quatre-vingt-deux sans s, mais quatre-vingts avec
  un s quand il n'y a rien après. »

## S_MILLE - jamais de « s » à mille

- « Le mot mille ne prend jamais de s. Mille ne change jamais. On écrit trois
  mille sans s. »

## ET_UN - « et un », « et onze »

- « On dit vingt et un, trente et un, et pas vingt-un. On met et devant un et
  devant onze. »

## ORTHO_MOT - un mot mal écrit

- « Ce mot s'écrit : {mot}. Regarde bien les lettres. »
- Exemple : pour **60**, *soixant* devient « Ce mot s'écrit : soixante. »

## MAUVAIS_NOMBRE - ce n'est pas le bon nombre

- « Ce n'est pas le bon nombre. Regarde {rang}. On écrit : {nombre}. »
- Exemple : pour **200**, *trois cents* devient « Regarde les centaines. On écrit :
  deux cents. »

## INCONNU - repli

- « Presque ! Regarde bien. On écrit : {nombre}. »
- Utilisé quand la saisie ne correspond à aucune règle (mots inconnus, texte vide,
  mots en trop). Ces cas sont aussi enregistrés pour enrichir les règles.

---

# Messages de correction - conjugaison (français)

Liste **complète** des explications affichées quand l'enfant conjugue un verbe
(compétences `FR.CONJ.PRESENT`, `FR.CONJ.FUTUR`, `FR.CONJ.IMPARFAIT`). Même style
« enfant de 8 ans », **rédigé pour l'oral** : phrases courtes, toujours un exemple
concret, jamais de grammaire abstraite, aucun symbole. La bonne forme est affichée
et la partie fautive surlignée. **Les accents sont exigés** (le serveur reste seul
juge ; le type de faute est indicatif et enregistré dans `reponses.type_faute`).

Source : `frontend/src/domain/diagnostic/conjugaison.ts` (`diagnostiquerConjugaison`,
`MESSAGES_CONJUGAISON`). Parties entre accolades : `{forme}` = forme attendue,
`{pronom}` = le sujet, `{temps}` = le temps (le présent / le futur / l'imparfait),
`{repère}` = maintenant / demain / avant, hier.

## Bonne réponse (JUSTE)

- « Bravo ! C'est la bonne forme. »

## ACCENT - un accent manquant

- « N'oublie pas l'accent. On écrit : {forme}. On écrit êtes avec un accent sur le
  e, pas êtes sans accent. »

## MAUVAISE_PERSONNE - la forme d'une autre personne

- « Attention à la personne. Avec {pronom}, on écrit : {forme}. On dit tu chantes
  avec un s, mais il chante sans s. »

## MAUVAIS_TEMPS - le bon verbe, mais pas au bon moment

- « Attention au temps. Ici c'est {temps}, {repère}. On écrit : {forme}. On dit
  hier je chantais, et demain je chanterai. »

## TERMINAISON - bon début, mauvaise fin

- « Bon début, mauvaise fin. Avec {pronom}, on écrit : {forme}. On dit tu joues
  avec un s à la fin, mais il joue sans s. »

## ORTHO_RADICAL - le mot est mal écrit

- « Regarde bien les lettres. On écrit : {forme}. »

## INCONNU - repli

- « Presque ! Regarde bien. On écrit : {forme}. »

---

# Messages de correction - passé composé (français)

Liste **complète** des explications affichées quand l'enfant conjugue au **passé
composé** (compétence `FR.CONJ.PASSE_COMPOSE`, niveau 4 en saisie libre ; QCM aux
niveaux 1-3). Même style « enfant de 8 ans », **rédigé pour l'oral** : phrases
courtes, toujours un exemple juste et un exemple pas juste, jamais de grammaire
abstraite, aucun symbole. La bonne forme (auxiliaire + participe) est affichée.
**Les accents sont exigés** (le serveur `verif_passe_compose` reste seul juge ; le
type de faute est indicatif et enregistré dans `reponses.type_faute`).

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

- « N'oublie pas l'accent. On écrit : {forme}. On écrit il a mangé avec un accent,
  pas il a mange sans accent. »

## AUXILIAIRE - le mauvais petit mot (avoir / être)

- Verbe avec **être** : « Ce verbe se dit avec être. On écrit : {forme}. On dit :
  il est allé. On ne dit pas : il a allé. »
- Verbe avec **avoir** : « Ce verbe se dit avec avoir. On écrit : {forme}. On dit :
  il a mangé. On ne dit pas : il est mangé. »

## ACCORD - l'accord avec être oublié

- Au singulier (une fille) : « Avec est, on ajoute un e à la fin pour une fille :
  elle est allée. On écrit : {forme}. »
- Au pluriel (plusieurs) : « Avec sont, on ajoute un s à la fin pour plusieurs :
  ils sont allés. On écrit : {forme}. »

## PARTICIPE - le participe mal formé

- « Ce n'est pas le bon participe. On écrit : {forme}. On dit : il a pris. On ne
  dit pas : il a prendu. »

## MAUVAIS_TEMPS - un temps simple au lieu du passé composé

- « Ici c'est le passé composé, c'est déjà fait. On écrit : {forme}. On dit : hier
  il a mangé. On ne dit pas : il mangeait. »

## INCONNU - repli

- « Presque ! Regarde bien. On écrit : {forme}. »

---

# Messages de correction - problèmes de mesures (maths)

Liste **complète** des types de faute du diagnostic déterministe des **problèmes
de mesures** (compétence `MA.PB.MESURES` : longueurs, masses, durées, monnaie).
Le serveur (`verif_calcul`) reste seul juge du juste/faux ; le `type_faute` est
**indicatif** (enregistré dans `reponses.type_faute` pour reproposer plus tard un
exercice ciblé sur la même difficulté). Au moment de l'erreur, l'enfant voit la
**correction expliquée** (conversion puis calcul). Les pièges sont attachés à
l'exercice (`diagPieges`, `frontend/src/domain/calcul/problemes.ts`).

Style « enfant de 8 ans », **rédigé pour l'oral**, exemple concret. `{forme}` et
valeurs sont variables selon l'énoncé.

## OUBLI_CONVERSION - conversion oubliée

- « Attention, un mètre, c'est cent centimètres. Donc trois mètres, c'est trois
  cents centimètres. N'oublie pas de convertir avant de calculer. »

## MAUVAISE_UNITE - mauvaise conversion d'unité

- « Regarde bien l'unité. Un mètre, c'est cent centimètres, pas dix. Donc trois
  mètres, c'est trois cents centimètres. »

## MAUVAISE_OP - mauvaise opération

- « Relis bien l'énoncé. Ici il faut enlever, pas ajouter. »

## ERREUR_CALCUL - erreur de calcul (repli)

- « Presque ! Refais le calcul tout doucement. La bonne réponse est {forme}. »
- Utilisé quand la réponse fausse ne correspond à aucun piège connu.

---

# Messages de correction - dictée détective (français)

Liste **complète** des messages de la « dictée détective » (compétence
`FR.ORTHO.DETECTIVE`). Même style « enfant de 8 ans », **rédigé pour l'oral** :
phrases courtes, **toujours les deux cas** (les deux mots qui se ressemblent),
jamais de grammaire abstraite, aucun symbole. Le **serveur** est seul juge : il
révèle, pour chaque erreur plantée, son type et si l'enfant l'a trouvée / bien
corrigée, et liste les fausses alertes. Affichage **toujours valorisant, jamais
punitif**.

Source : `frontend/src/domain/diagnostic/dictee.ts` (`MESSAGES_DICTEE`,
`messageErreur`, `messageFausseAlerte`, `messageBilan`). Parties entre
accolades : `{faute}` = le mot fautif affiché, `{correction}` = la bonne forme.

## Astuce + exemple par type d'erreur (`MESSAGES_DICTEE`)

- **a / à** : « Le mot a sans accent, c'est le verbe avoir. On peut dire il avait,
  comme dans il a un chat. Le mot à avec un accent montre où on va, comme dans il
  va à l'école. »
- **et / est** : « Le mot est, c'est le verbe être. On peut dire était, comme dans
  le chat est noir. Le mot et sert à relier, comme dans du pain et du lait. »
- **son / sont** : « Le mot son montre à qui c'est, comme dans son chat, le chat à
  lui. Le mot sont, c'est le verbe être. On peut dire ils étaient, comme dans ils
  sont là. » (message simplifié, validé par Manu)
- **on / ont** : « Le mot ont, c'est le verbe avoir. On peut dire ils avaient,
  comme dans ils ont faim. Le mot on veut dire quelqu'un, comme dans on joue. »
- **ces / ses** : « Le mot ses montre à qui c'est, comme dans ses jouets, les
  jouets à lui. Le mot ces montre des choses qu'on désigne, comme dans ces jouets,
  ceux-là. » (message simplifié, validé par Manu)
- **ce / se** : « Le mot se se place juste devant le verbe, comme dans il se lave.
  Le mot ce accompagne un nom, comme dans ce garçon. »
- **pluriel** : « Quand il y en a plusieurs, on ajoute un s, ou parfois un x. On
  dit un chat, et plusieurs chats. On dit un jeu, et plusieurs jeux. »
- **pluriel -al/-aux** : « On dit un cheval, et plusieurs chevaux. Beaucoup de mots
  qui finissent par al font aux quand il y en a plusieurs. »
- **accord** : « Le petit mot qui décrit s'habille comme le nom. On dit une fleur
  rouge, et des fleurs rouges. »
- **verbe -ent** : « Quand plusieurs personnes font l'action, le verbe prend la
  terminaison ent. On dit il joue, et ils jouent. »
- **m devant m/b/p** : « Devant les lettres m, b et p, on écrit un m à la place du
  n. Comme dans un tambour, une jambe, important. »
- **é / er / ez** : « On écrit le verbe avec e r à la fin quand on peut dire
  vendre, comme dans il va manger. On écrit é quand c'est déjà fait, comme dans il
  a mangé. »

## Message par situation (`messageErreur`)

- **Mot trouvé (niveau 1)** : « Bien joué, tu as trouvé le mot piégé : {faute} ! »
- **Mot trouvé ET corrigé (niveau 2+)** : « Bravo ! Tu as trouvé et corrigé. On
  écrit : {correction}. »
- **Mot trouvé mais mal corrigé** : « Bien trouvé ! Mais on écrit : {correction}. »
  + l'astuce du type ci-dessus.
- **Mot manqué** : « Un mot piégé était caché ici. On avait écrit {faute}, mais on
  écrit : {correction}. » + l'astuce du type (le mot est surligné dans le texte).

## Fausse alerte (`messageFausseAlerte`)

- « Ce mot était juste ! Le mot {mot} n'avait pas d'erreur. »

## Bilan valorisant (`messageBilan`, toujours affiché)

- **Tout juste (plusieurs)** : « Super détective ! Tu as tout trouvé (3 sur 3) ! »
- **Tout juste (une seule)** : « Super ! Tu as tout repéré ! »
- **Niveau 1 incomplet** : « Tu en as trouvé 2 sur 3 ! Regarde les autres, tu y
  arriveras ! »
- **Niveau 2+ incomplet** : « Tu en as bien corrigé 1 sur 3 ! On regarde ensemble
  les autres. »

---

# Indices (bouton « Indice », niveaux 1 et 2)

Bouton **Indice** (icône Lucide Lightbulb) affiché **aux niveaux 1 et 2
seulement**, sur la page d'exercice. Il donne un coup de pouce **sans donner la
réponse** : un rappel de méthode ou du piège, en une ou deux phrases courtes
**rédigées pour l'oral**. L'utilisation d'un indice n'est **jamais enregistrée**
(aucune colonne, aucun suivi) : l'escalier des niveaux suffit (au niveau 3 il n'y
a plus d'indice ; si l'enfant échoue il redescend au niveau 2).

Un indice par compétence. Source : `frontend/src/domain/indices.ts` (`INDICES`,
`indicePour`). Les mêmes textes sont au catalogue voix
(`tools/tts/data/phrases.json`, section `indice`, aucun audio généré pour
l'instant).

- **FR.CONJ.PRESENT** : « Le présent, c'est maintenant. Regarde bien le petit mot
  devant le verbe. Avec nous, le verbe finit souvent par ons. Avec vous, il finit
  souvent par ez. »
- **FR.CONJ.FUTUR** : « Le futur, c'est demain. Souvent, on entend le son r juste
  avant la fin, comme dans je chanterai. »
- **FR.CONJ.IMPARFAIT** : « L'imparfait, c'est avant, autrefois. Souvent le verbe
  se termine par ais, ait ou aient. »
- **FR.CONJ.PASSE_COMPOSE** : « Le passé composé, c'est deux mots. D'abord avoir ou
  être, puis le verbe. Avec être, pense à accorder avec le sujet. »
- **FR.ORTHO.DETECTIVE** : « Lis la phrase tout doucement dans ta tête. Cherche les
  petits mots qui se ressemblent et qui se cachent. »
- **MA.CM.ADDITION** : « Tu peux passer par un nombre rond, comme dix ou vingt,
  pour aller plus vite. »
- **MA.CM.COMPL_SUP** : « Demande-toi combien il manque pour arriver jusqu'au
  nombre. »
- **MA.CM.DIV_RESTE** : « Cherche combien de fois le petit nombre entre dans le
  grand. Ce qui dépasse, c'est le reste. »
- **MA.CM.DOUBLES** : « Le double, c'est deux fois le même nombre. Tu l'ajoutes
  avec lui-même. »
- **MA.CM.MOITIES** : « La moitié, c'est partager le nombre en deux parts égales. »
- **MA.CM.SOMMES_DIFF** : « Tu peux passer par un nombre rond pour calculer plus
  facilement. »
- **MA.FRAC.SIMPLES** : « Le chiffre du bas dit en combien de parts on coupe. Le
  chiffre du haut dit combien de parts on prend. »
- **MA.MES.DUREES** : « Pense à tout mettre dans la même unité. Une heure, c'est
  soixante minutes. »
- **MA.MES.HEURE** : « Regarde d'abord la petite aiguille pour les heures, puis la
  grande aiguille pour les minutes. »
- **MA.MES.LONGUEURS** : « Pense à tout mettre dans la même unité. Un mètre, c'est
  cent centimètres. »
- **MA.MES.MASSES_CONTENANCES** : « Pense à tout mettre dans la même unité. Un
  kilo, c'est mille grammes. Un litre, c'est mille millilitres. »
- **MA.NUM.COMPARER** : « Regarde d'abord lequel a le plus de chiffres. S'ils en
  ont autant, compare les chiffres un par un en partant de la gauche. »
- **MA.NUM.DECOMPOSER** : « Coupe le nombre en tranches : les milliers, les
  centaines, les dizaines et les unités. »
- **MA.NUM.LIRE_ECRIRE** : « Coupe le nombre en tranches : d'abord les milliers,
  puis les centaines, puis le reste. »
- **MA.NUM.SUITE** : « Regarde de combien on avance à chaque fois entre deux
  nombres. »
- **MA.PB.ADD_SUB** : « Demande-toi si on met ensemble ou si on enlève. »
- **MA.PB.DEUX_ETAPES** : « Fais une étape à la fois. Trouve d'abord le premier
  résultat, puis sers-t'en pour la suite. »
- **MA.PB.MESURES** : « Pense à tout mettre dans la même unité avant de calculer. »
- **MA.PB.MONNAIE** : « Compte d'abord les grosses pièces, puis ajoute les
  petites. »
- **MA.PB.MULT_DIV** : « Demande-toi si on partage en parts égales ou si on groupe
  par paquets. »
- **MA.POSE.ADDITION** : « Commence par les unités, à droite. Quand tu dépasses
  neuf, tu poses une retenue. »
- **MA.POSE.SOUSTRACTION** : « Commence par les unités, à droite. Si le chiffre du
  haut est trop petit, tu empruntes une dizaine à côté. »
- **MA.POSE.MULTIPLICATION** : « Commence par les unités, à droite, et n'oublie pas
  les retenues. »
