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

- « N'oublie pas l'accent. Regarde bien, il y a un accent sur le e. On écrit :
  {forme}. »
- À l'oral, on **décrit** l'accent et la lettre qui le porte (par exemple « un
  accent chapeau sur le e » pour « êtes ») au lieu d'opposer deux graphies qui
  sonnent pareil.

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

- « N'oublie pas l'accent. Regarde bien, il y a un accent sur le e. On écrit :
  {forme}. »
- À l'oral, on **décrit** l'accent et la lettre qui le porte (par exemple « un
  accent sur le e » pour « mangé ») au lieu d'opposer deux graphies qui sonnent
  pareil.

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

# Messages de correction - grammaire (français)

Sous-matière **Grammaire** (domaine `grammaire`, compétences `FR.GRAM.*`,
migration 0041). Cinq compétences : nature des mots (`FR.GRAM.NATURE`), verbe et
sujet (`FR.GRAM.SUJET_VERBE`), types et formes de phrases (`FR.GRAM.TYPES_PHRASES`),
ponctuation et majuscule (`FR.GRAM.PONCTUATION`), groupe nominal
(`FR.GRAM.GROUPE_NOMINAL`). Le **groupe nominal** porte sur l'**identification**
(reconnaître le déterminant, le nom, l'adjectif, le genre et le nombre) : l'**accord
orthographique** reste travaillé par la **dictée détective**, on ne doublonne pas.

Le **serveur** est seul juge (`verif_grammaire`, op `gram`) : il compare la saisie
normalisée (minuscules, espaces, apostrophes ; ponctuation de bord retirée pour un
mot ; **accents exigés**) à la réponse attendue de `public.grammaire_item` (miroir
de `frontend/src/domain/francais/grammaire.ts`).

Trois formats, progression pédagogique : **N1** QCM (le plus facile) ; **N2** clic
sur un mot d'une phrase courte ; **N3** clic dans une phrase plus longue (ou QCM
pour les notions sans mot à montrer : types, ponctuation) ; **N4** réponse libre
tapée quand c'est pertinent (nature, sujet/verbe, groupe nominal), sinon QCM (types
de phrases, ponctuation). Escalier + EMA comme les autres compétences.

## Deux messages de situation (affichage toujours valorisant)

- **Bonne réponse** : « Bravo ! C'est la bonne réponse. »
- **Réponse fausse** : « Ce n'est pas tout à fait ça. Regarde la réponse. »

Dans les deux cas, la **bonne réponse est montrée** (surlignée pour un clic) avec
une **explication courte et concrète** portée par chaque item (champ `explication`),
rédigée **pour l'oral** (aucun symbole, un exemple à chaque fois). Exemples :

- **nature, clic sur le verbe** : « Le verbe dit l'action. Ici, l'action est
  chante. »
- **sujet** : « On cherche qui fait l'action. C'est la fille qui court, donc le
  sujet est la fille. »
- **type de phrase** : « Cette phrase pose une question : c'est une phrase
  interrogative, comme dans où habites-tu. »
- **ponctuation** : « Cette phrase pose une question. On met un point
  d'interrogation à la fin. »
- **groupe nominal, nombre** : « Il y a plusieurs chiens. Le groupe les chiens est
  au pluriel. »

Les consignes et explications sont au catalogue voix
(`tools/tts/data/phrases.json`, section `grammaire`, aucun audio généré pour
l'instant).

---

# Messages de correction - vocabulaire et mots à savoir (français)

Phase 2 (migration 0042). **Deux nouvelles sous-matières** français, bâties sur
l'architecture de la grammaire (même format d'item `qcm`/`clic`/`texte`, même
composant `<Grammaire>`, même principe « le serveur est seul juge ») :

- **Vocabulaire** (domaine `vocabulaire`), cinq compétences :
  - `FR.VOC.ALPHABET` — ordre alphabétique et usage du dictionnaire (ranger des
    mots, trouver entre quels mots repères se place un mot) ;
  - `FR.VOC.FAMILLES` — familles de mots (le mot de la même famille, l'intrus) ;
  - `FR.VOC.SYN_CONTRAIRES` — synonymes et contraires (y compris les contraires
    par préfixe : heureux / malheureux, faire / défaire) ;
  - `FR.VOC.PREFIXE_SUFFIXE` — préfixes et suffixes simples (re-, dé-, in-, -eur,
    -ette) ;
  - `FR.VOC.CATEGORIES` — catégories et mot générique.
- **Mots à savoir** (domaine `mots-invariables`), une compétence :
  - `FR.MOTS.INVARIABLES` — mots invariables CE2 (toujours, beaucoup, maintenant,
    aujourd'hui, pendant, avec, dans, aussi, encore, souvent, jamais, depuis,
    ensuite, déjà, bientôt, assez, trop…). **N1** choisir la bonne orthographe
    parmi des propositions (les mauvaises formes sont crédibles mais le message
    **décrit la lettre** manquante) ; jusqu'au **N4** écrire le mot dans une
    phrase à trou (le mot est amené par un indice de sens, jamais épelé dans la
    consigne ; la clé voix `mot:<mot>` est prête pour une future dictée orale).

Le **serveur** est seul juge (`verif_lexique`, op `lex`) : il compare la saisie
normalisée (qcm → `normaliser_lettres` ; clic/texte → `normaliser_mot` ; **accents
exigés**) à la réponse attendue de `public.lexique_item` (miroir de
`frontend/src/domain/francais/lexique.ts`, test croisé `lexique_test.sql` +
golden vitest `lexique.test.ts`, 120 items).

Progression des formats (identique à la grammaire) : **N1** QCM, **N2** clic ou
QCM, **N3** clic ou QCM (plus de distracteurs), **N4** réponse **libre** tapée.
Escalier + EMA comme les autres compétences.

## Deux messages de situation (affichage toujours valorisant)

- **Bonne réponse** : « Bravo ! C'est la bonne réponse. »
- **Réponse fausse** : « Ce n'est pas tout à fait ça. Regarde la réponse. »

La bonne réponse est montrée avec une **explication courte et concrète** (champ
`explication`), rédigée **pour l'oral** (aucun symbole, un exemple à chaque fois,
jamais deux formes homophones opposées). Exemples :

- **ordre alphabétique** : « a vient avant c et avant p, donc arbre est le
  premier. »
- **familles de mots** : « La famille de dent parle des dents. dentiste est de la
  même famille, c'est la personne qui soigne les dents. »
- **contraire par préfixe** : « On ajoute mal devant heureux pour dire le
  contraire : malheureux. »
- **mot invariable (lettre décrite)** : « Dans beaucoup, on écrit b, e, a, u, puis
  coup avec un p à la fin qu'on n'entend pas. » ; « À la fin de toujours, il y a un
  s qu'on n'entend pas. »

Les consignes, explications et mots dictés (N4) sont au catalogue voix
(`tools/tts/data/phrases.json`, section `lexique`, aucun audio généré pour
l'instant).

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
- **FR.GRAM.NATURE** : « Le nom dit une personne, un animal ou une chose, comme
  chat. Le verbe dit une action, comme jouer. L'adjectif décrit, comme grand. Le
  petit mot devant le nom est un déterminant. »
- **FR.GRAM.SUJET_VERBE** : « Le verbe dit l'action. Pour trouver le sujet,
  demande-toi qui fait l'action, comme dans la fille court. »
- **FR.GRAM.TYPES_PHRASES** : « Écoute la phrase. Si elle attend une réponse, elle
  pose une question. Si elle montre une émotion forte, c'est une exclamation. Si
  elle commande, elle donne un ordre. »
- **FR.GRAM.PONCTUATION** : « On met un point quand la phrase raconte quelque chose.
  On met un point d'interrogation quand la phrase pose une question. Un nom de
  personne ou de ville prend une majuscule. »
- **FR.GRAM.GROUPE_NOMINAL** : « Regarde le petit mot du début. Le mot les montre
  qu'il y a plusieurs choses, c'est le pluriel. Le nom dit la chose, l'adjectif la
  décrit. »
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
- **MA.GEO.FIGURES** : « Compte les côtés et regarde les coins. Le carré a quatre
  côtés pareils. Le rectangle a des côtés longs et des côtés courts. Le triangle
  a trois côtés. Le cercle est tout rond, sans coin. »
- **MA.GEO.VOCABULAIRE** : « Un côté, c'est un bord droit. Un sommet, c'est un coin
  où deux côtés se rejoignent. Un angle droit est bien carré, comme le coin d'une
  feuille. »
- **MA.GEO.SOLIDES** : « Pense à un objet qui a la même forme. Le cube est comme un
  dé, le pavé comme une boîte, la boule comme un ballon, le cylindre comme une
  boîte de conserve. »
- **MA.GEO.SYMETRIE** : « Imagine que tu plies la figure sur le trait du milieu. Si
  les deux moitiés se posent l'une sur l'autre, il y a un axe de symétrie. »
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
- **MA.REPERE.QUADRILLAGE** : « Pour trouver une case, lis d'abord la lettre de la
  colonne, puis le numéro de la ligne. La lettre d'abord, le chiffre ensuite. »
- **MA.REPERE.DEPLACEMENTS** : « Avance une case à la fois. Vers la droite, tu
  changes de colonne. Vers le haut, tu changes de ligne et tu montes. »
- **MA.REPERE.PLAN** : « Place-toi à côté de l'objet. Ce qui est du côté de la main
  qui écrit est à droite, l'autre côté est à gauche. »
- **FR.LECTURE.INFO** : « Relis le texte tout doucement. La réponse est écrite dans
  le texte. Cherche le mot ou le petit groupe de mots qui répond à la question. »
- **FR.LECTURE.INFERENCE** : « Le texte ne dit pas tout. Regarde ce que fait le
  personnage ou ce qui se passe, et devine. Par exemple, s'il saute de joie, c'est
  qu'il est content. »
- **FR.LECTURE.ORDRE** : « Cherche ce qui se passe en premier, puis ensuite, puis à
  la fin. Les petits mots comme d'abord, puis et enfin t'aident à trouver
  l'ordre. »
- **FR.LECTURE.VRAIFAUX** : « Relis la phrase, puis cherche dans le texte si c'est
  pareil. Si le texte dit la même chose, c'est vrai. Si le texte dit le contraire,
  c'est faux. »
- **FR.LECTURE.SENS_MOT** : « Relis toute la phrase où se trouve le mot. Les autres
  mots autour t'aident à deviner ce qu'il veut dire. »

> Note : le bouton **Indice** de la page d'exercice est désormais aussi proposé
> dans le composant **Comprendre un texte** (niveaux 1 et 2), en plus des
> exercices à saisie numérique.

## Sous-matières « Géométrie » et « Se repérer » (maths, phase 3)

Deux sous-matières de maths (CE2, cycle 2 révisé 2024), migration 0043, composant
SVG tactile `frontend/src/components/Geometrie.tsx`, banque
`frontend/src/domain/geometrie/geometrie.ts` (miroir de `public.geometrie_item`).

**Géométrie** (domaine `geometrie`) : reconnaître et nommer les figures planes
(`MA.GEO.FIGURES` : carré, rectangle, triangle dont triangle rectangle, cercle),
vocabulaire côté / sommet / angle droit (`MA.GEO.VOCABULAIRE`, l'angle droit se
reconnaît comme avec l'équerre), solides cube / pavé / cylindre / sphère /
pyramide / cône et leurs faces, arêtes, sommets (`MA.GEO.SOLIDES`), symétrie
axiale (`MA.GEO.SYMETRIE` : dire si une figure a un axe, compléter une figure sur
quadrillage). Le **périmètre** n'est pas traité ici (la mesure de longueurs vit
dans « Mesures », `MA.MES.LONGUEURS`, on ne doublonne pas).

**Se repérer** (domaine `repere`) : quadrillage, cases et nœuds, coder une case du
type B3, placer un point (`MA.REPERE.QUADRILLAGE`), déplacements codés
(`MA.REPERE.DEPLACEMENTS` : « avance de deux cases vers la droite… », décrits à
l'oral, sans flèche), gauche / droite / devant / derrière et lecture d'un plan
simple (`MA.REPERE.PLAN`).

Progression des formats : **N1 QCM** sur la figure ; N2/N3 QCM ou **clic** (toucher
une figure, une case, un sommet) ; **N4 réponse libre** (taper un nom ou un code de
case, cliquer les cases à colorier pour la symétrie, placer un point sur un nœud).
Le **serveur reste seul juge** (op `geo`, fonction `verif_geo`) ; la comparaison
suit le format : QCM accents gardés et casse ignorée, texte et clic accents exigés,
grille (liste de cases) comparaison stricte. Les figures sont **déterministes**
(données fixes) pour les tests golden.

### Refonte CE2 géométrie, lot 1 (migration 0047)

La géométrie de 0043 restait au niveau maternelle / CP (« Quelle est cette
figure ? », « clique sur le carré », « écris cercle »). Au CE2 l'enfant doit
**décrire et construire**, pas seulement reconnaître. Le lot 1 ajoute (migration
**additive et idempotente**, aucune réinitialisation des niveaux d'Iris) :

- **Construire sur quadrillage aimanté** (`MA.GEO.CONSTRUIRE`, format `construire`) :
  l'enfant touche les nœuds pour placer les sommets, les segments se tracent tout
  seuls. N1 tracer un segment droit, N2 construire un carré, N3 un rectangle (« 5
  carreaux sur 3 »), N4 un triangle rectangle. Le serveur vérifie les
  **propriétés** (nombre de sommets, angles droits, longueurs, fermeture) via
  `verif_geo_construire` : **toute position et toute orientation** sont acceptées.
- **Programmer un déplacement** type Blue-Bot (`MA.REPERE.PROGRAMMER`) : N1/N2
  **lire** un programme (cartes « avance », « tourne à droite », « tourne à
  gauche » écrites en toutes lettres) et toucher la case d'arrivée (format `clic`,
  arrivée déterministe) ; N3/N4 **assembler** un programme pour atteindre une case
  cible, en évitant des obstacles au N4 (format `programme`). Le serveur **simule**
  le déplacement via `verif_geo_programme` : toute solution valide est acceptée.
- **Devinettes de propriétés** sur `MA.GEO.FIGURES` (« j'ai quatre côtés égaux et
  quatre angles droits, qui suis-je ? », « pourquoi ce rectangle n'est pas un
  carré ? ») **à la place** des items « nomme la figure » de niveau CP, qui sont
  **retirés** : il ne reste qu'un court rappel au N1. `MA.GEO.FIGURES` change donc
  de difficulté (de « nommer » vers « décrire »), mais la compétence et
  l'historique sont conservés.

Nouveau contrat de vérification **par propriétés** : la colonne
`public.geometrie_item.spec` (jsonb) décrit la figure/le puzzle attendu ; la saisie
envoyée au serveur est un **JSON** (liste de sommets, ou liste de cartes) que
`verif_geo` juge par `verif_geo_construire` / `verif_geo_programme`. Les coordonnées
sont **entières** (nœuds), donc la vérification est en arithmétique exacte. Le
miroir client (`verifConstruire`, `verifProgramme`, `simulerProgramme`) sert au mode
démo et aux tests golden ; le **serveur reste seul juge**.

### Refonte CE2 géométrie, lot 2 (migration 0048)

Sur les compétences existantes (aucune nouvelle compétence, migration additive) :

- **Reproduire une figure** (`MA.GEO.CONSTRUIRE`, format `reproduire`) : un modèle
  est montré, l'enfant le retrace de nœud en nœud. Le serveur vérifie l'**égalité à
  translation près** (`verif_geo_reproduire` : même ensemble d'arêtes après recalage
  sur le coin bas-gauche, indépendant du sommet de départ et du sens de parcours).
- **Refaire de mémoire** (N4) : même vérification, le modèle se **cache après 3
  secondes** côté client (`memoire: true`).
- **Compléter un sommet manquant** (format `construire` avec sommets pré-placés) :
  trois coins sont donnés, l'enfant pose le quatrième ; la figure complète doit être
  le rectangle/carré attendu.
- **Équerre / toucher tous les angles droits** (`MA.GEO.VOCABULAIRE`, format
  `grille`, sélection **multiple** de sommets) : l'enfant touche les coins qui sont
  des angles droits ; le serveur compare l'**ensemble canonique** de sommets.
- **Symétrie** : ajout d'un item de complétion plus grand au N4 (la symétrie était
  déjà au bon niveau en N3/N4, on confirme et on remonte le plafond).

Nouveau format `reproduire` ajouté au contrat `spec` jsonb ; fonctions
`verif_geo_edges` (arêtes normalisées) et `verif_geo_reproduire`, miroir client
`verifReproduire`. Le **serveur reste seul juge**.

### Refonte CE2 géométrie, partie 2 (migration 0050)

Trois nouveaux outils, sur le domaine `geometrie` déjà actif (trois nouvelles
compétences, migration **additive et idempotente**, aucun reset des niveaux d'Iris).
**Unités : millimètres entiers** (1 cm = 10 mm). La surface est aimantée au
centimètre, donc la vérification reste en **arithmétique exacte** (comme 0047) ; la
tolérance `tol` (mm, portée par `spec`, défaut **2 mm**) exprime le « ± 2 mm à
l'échelle affichée ». Le **serveur reste seul juge**.

- **Règle graduée** (`MA.GEO.MESURER_TRACER`, format `regle`) : **mesurer** un segment
  posé sur la règle (N1 commence à 0, N2 ne commence pas à 0 → il faut soustraire),
  **tracer** un trait d'une longueur donnée (« trace un trait de 7 cm »), placer le
  **milieu** d'un segment (N3), et dire si **trois points sont alignés** (N4, QCM). La
  réponse envoyée est un **entier en mm** ; `verif_geo_regle` vérifie
  `|valeur − cible| ≤ tol`. Lien avec « Mesures » **sans doublon** : la mesure de
  longueurs reste `MA.MES.LONGUEURS` ; ici c'est l'**usage de la règle** (lire la
  graduation, tracer, milieu, alignement). *La règle est présentée alignée
  horizontalement ; la rotation d'une règle sur un segment oblique relève du cycle 3
  et n'est pas demandée à ces tâches CE2 (choix assumé).*
- **Compas** (`MA.GEO.CERCLE`, format `cercle`) : vocabulaire **centre / rayon** (N1),
  puis **tracer un cercle de rayon donné** (centre libre), **de centre O passant par
  A** (centre imposé), et **reporter une longueur** à partir de O. L'enfant pose la
  pointe (centre) puis l'écartement (un point du cercle) ; la réponse est
  `[[cx,cy],[px,py]]` en mm. `verif_geo_cercle` compare le **rayon** (au carré, exact)
  et, si le centre est imposé, la **position de la pointe**, à `tol` près.
- **Patrons du cube** (`MA.GEO.PATRONS`, format `patron`) : **choisir** le patron qui
  se replie en cube parmi plusieurs (N2/N3), et **juger** si un patron donné en est un
  (N4, oui/non). Le serveur juge **par propriétés** : `verif_patron_cube` **simule le
  pliage** (on roule un cube de case en case ; le patron se referme en cube **ssi** ses
  6 cases se posent sur **6 faces distinctes**). Un patron qui contient un carré de
  quatre cases ne se replie jamais. Une **petite animation de pliage** accompagne la
  correction (CSS, légère).
- **Solides 3D manipulables** (`MA.GEO.SOLIDES`) : le cube, le pavé et la pyramide sont
  dessinés par un **projecteur 3D maison** (sommets/arêtes projetés, sans librairie) et
  se **tournent au doigt** (glisser). Quatre items en **réponse libre** (N3/N4) font
  **compter faces, arêtes et sommets**.

Formats `regle`, `cercle`, `patron` ajoutés au contrat `spec` jsonb ; fonctions
serveur `verif_geo_regle`, `verif_geo_cercle`, `verif_patron_cube` (+ `verif_geo_roll`)
et `verif_geo_patron`, miroirs client `verifRegle`, `verifCercle`, `verifPatronCube`,
`verifPatron`. Cibles tactiles : appui au point/graduation le **plus proche** (zone de
sélection large) ; règle et surface **défilent** si besoin. Précision tactile : sur
petit écran la graduation fait ~40 px (limite connue, atténuée par l'appui au plus
proche et la tolérance).

## Sous-matière « Tableaux et graphiques » (maths, phase 4)

Sous-matière de maths (CE2, cycle 2 révisé 2024), migration 0044, composant SVG
tactile `frontend/src/components/Donnees.tsx`, banque
`frontend/src/domain/donnees/donnees.ts` (miroir de `public.donnees_item`).

**Tableaux et graphiques** (domaine `donnees`) : lire un tableau simple puis à
double entrée (`MA.DONNEES.TABLEAU`), compléter un tableau avec un total
(`MA.DONNEES.COMPLETER`), lire un diagramme en barres et régler/compléter une
barre (`MA.DONNEES.BARRES`), lire un pictogramme où une image vaut `n` objets
(`MA.DONNEES.PICTOGRAMME`), comparer à partir des données — combien de plus, de
moins, lequel le plus (`MA.DONNEES.COMPARER`). On **extrait une information**
d'une représentation affichée : pas de doublon avec « Problèmes » (aucune
mascotte ni histoire). Les thèmes sont le quotidien d'un enfant (fruits de la
classe, animaux, billes, livres lus…), **jamais de calendrier**.

Le repérage ligne / colonne du tableau reprend le principe du **quadrillage de la
phase 3** (lire d'abord la ligne, puis la colonne). Progression des formats :
**N1 QCM** ; N2/N3 QCM ou **clic** (toucher une ligne, une barre) ou **grille**
(régler une barre en touchant la bonne hauteur) ; **N4 réponse libre** (taper le
nombre lu ou calculé). Le **serveur reste seul juge** (op `don`, fonction
`verif_donnees`) ; la comparaison suit le format : QCM accents gardés et casse
ignorée, texte et clic accents exigés, grille (hauteur) comparaison stricte. Les
représentations sont **déterministes** (données fixes) pour les tests golden.

## Sous-matière « Comprendre un texte » (français, phase 5)

Sous-matière de français (CE2, cycle 2 révisé 2024), migration 0045, composant
`frontend/src/components/Comprehension.tsx`, banque
`frontend/src/domain/francais/comprehension.ts` (miroir de
`public.comprehension_item`).

**Décision Manu : lecture SILENCIEUSE uniquement.** Le texte est **affiché** et lu
en silence par l'enfant : **aucun bouton « écouter le texte », aucun karaoké,
aucune lecture à voix haute du texte**. Seules les consignes et les indices courts
peuvent avoir une voix plus tard (aucun audio généré ici).

**Comprendre un texte** (domaine `lecture`) : retrouver une information écrite —
qui, où, quoi (`FR.LECTURE.INFO`), comprendre ce qui n'est pas dit — pourquoi, ce
que ressent le personnage (`FR.LECTURE.INFERENCE`), remettre 2 à 3 événements dans
l'ordre (`FR.LECTURE.ORDRE`), dire si une phrase est vraie ou fausse d'après le
texte (`FR.LECTURE.VRAIFAUX`), trouver le sens d'un mot grâce à la phrase
(`FR.LECTURE.SENS_MOT`). Les textes sont **originaux** et courts (3 à 6 phrases aux
N1-N2, jusqu'à 8-10 au N4), du quotidien d'un enfant (histoires, petits
documentaires sur les animaux et la nature, recettes, règles de jeu),
**jamais de calendrier** (ni date, ni jour de la semaine, ni mois). Un texte par
item ; banque riche (40 textes).

Progression des formats : **N1 QCM** ; N2/N3 QCM, **clic** (toucher dans le texte
le mot qui prouve la réponse) ou **ordre** (ranger des événements) ; **N4 réponse
libre** (taper un mot, cliquer le mot qui prouve, ou remettre dans l'ordre). Le
« clic sur le mot qui prouve » (N3-N4) réutilise le principe des mots cliquables :
chaque mot du texte devient une cible tactile. Le **serveur reste seul juge** (op
`lire`, fonction `verif_comprehension`) ; la comparaison suit le format : QCM
accents gardés et casse ignorée, **texte et clic accents exigés** (fidèle aux
accents), ordre (suite des événements) comparaison stricte espaces ignorés. Les
textes et les réponses sont **déterministes** (données fixes) pour les tests
golden. **On ne pénalise pas la lenteur** : seul l'anti-« trop rapide » global
(réponse en moins de 1,5 s = 0 monnaie) s'applique ; la progression ne regarde que
juste / faux.

## Sous-matière « Les mots de la maîtresse » (français, phase 6)

Sous-matière de français (CE2), migration 0046, domaine dédié `mots-maitresse`,
composant `frontend/src/components/MaitresseExo.tsx`, helpers
`frontend/src/domain/francais/maitresse.ts`. **Le PARENT** saisit, dans l'espace
parent (jamais l'enfant), des **listes de mots à apprendre** et/ou des **textes de
dictée** donnés par la maîtresse ; ils deviennent des exercices pour l'enfant.

**Données parent** : table `public.maitresse_liste` **liée au foyer** (RLS stricte
`est_parent_du_foyer` : un foyer ne voit que les siennes) ; titre, liste de mots,
texte, date d'ajout, actif oui/non, édition, suppression, aperçu avant activation.
Les CRUD passent par des RPC `SECURITY DEFINER` (`maitresse_upsert`,
`maitresse_activer`, `maitresse_supprimer`). **Garde-fous** : titre 1 à 60
caractères ; 0 ou 3 à 20 mots (au moins 3 quand il y a des mots), chaque mot ≤ 30
lettres ; texte ≤ 600 caractères ; au moins un contenu jouable (≥ 3 mots **ou** un
texte) ; au plus 10 listes actives par foyer ; **aucun chevron `<` `>`**
(anti-injection HTML). L'enfant lit les listes actives via la RPC
`SECURITY DEFINER maitresse_charger` (jamais d'accès direct).

**Voix** : aucune synthèse à la volée (la voix Naf est pré-générée). Les exercices
marchent **sans audio** :

- **mémoriser puis écrire** (N3-N4) : le mot s'affiche quelques secondes, se
  cache, l'enfant l'écrit (op serveur `mmots`) ;
- **QCM orthographe** (N1-N2) : le bon mot parmi des **formes erronées générées de
  façon déterministe** (lettre doublée / manquante, accent oublié, lettre muette,
  double consonne simplifiée — `formesErronees`) (op `mmots`) ;
- **mot à trou** dans une phrase du texte : QCM (N1-N2) ou saisie libre (N3-N4),
  on cache en priorité un mot de la liste à apprendre (op `mtrou`) ;
- **dictée détective** sur le texte de la maîtresse : erreurs **injectées de façon
  déterministe** côté serveur (`_maitresse_injecter` : homophones est/sont/ont/à/
  ses, et `m` devant `m`/`b`/`p` comme tambour → tanbour), en **réutilisant le
  moteur existant** (`<DicteeDetective>` + cœur partagé `_verif_dictee_core`, op
  `mdictee`). Le client ne reçoit que les mots **affichés** (déjà fautifs) et le
  **nombre** d'erreurs ; positions, corrections et types restent serveur.

Le **serveur reste seul juge** (ops `mmots` / `mtrou` / `mdictee`,
`enregistrer_reponse`, migration 0046) ; il compare la saisie normalisée
(`normaliser_mot`, accents exigés) au mot stocké, ou applique le moteur de dictée.

**Visibilité** : le domaine `mots-maitresse` est **actif par défaut** mais le
moteur ne le propose que s'il existe **au moins une liste active** (filtrage côté
client dans `Session.tsx` : le domaine est retiré des domaines effectifs quand la
banque du foyer est vide). Il n'est **pas compté** dans le garde-fou « au moins une
sous-matière jouable » (`trg_profils_domaines_valides` l'exclut) et
`regler_matieres` le **ré-ajoute toujours** (sa visibilité dépend du contenu, pas
d'un interrupteur ; il n'apparaît donc pas dans les réglages matières).

**Messages de correction** (toujours valorisants, rédigés pour l'oral) :

- **Bonne réponse** : « Bravo ! C'est le bon mot. »
- **Réponse fausse (mots / mot à trou)** : on **épelle** le mot correct, les accents
  **décrits** (`messageMotCorrect` / `epeler`), par exemple « C'est presque ça. Le
  mot s'écrit : maison. On l'épelle : m, a, i, s, o, n. » (pour un mot accentué :
  « e accent aigu, l, e accent grave, v, e »).
- **Dictée détective** : réutilise le diagnostic existant (`MESSAGES_DICTEE`,
  décrit la lettre fautive, par exemple « Devant les lettres m, b et p, on écrit un
  m à la place du n. »).

Les consignes, indices (N1-N2) et messages fixes sont au catalogue voix
(`tools/tts/data/phrases.json`, section `maitresse`, aucun audio généré pour
l'instant ; les mots épelés dépendent du foyer et ne sont pas catalogables).

**Reste à faire** (hors périmètre phase 6) : la **saisie par photo** (le champ
texte est déjà prévu pour être pré-rempli) ; le mode optionnel **« dictée avec
papa ou maman »** (le parent lit le texte à voix haute, l'enfant tape tout le
texte, correction par le serveur avec le diagnostic existant).

---

# Audit de niveau CE2 et corrections (migration 0049)

Après la refonte de la géométrie (0047-0048, qui était restée au niveau
maternelle/CP), **toutes** les banques d'exercices ont été relues par rapport aux
**attendus de fin de CE2** (cycle 2 révisé 2024). Verdict : les banques plus
anciennes de maths (nombres jusqu'à 10 000, tables jusqu'à 9, calcul posé,
mesures, heure, fractions) et de français (conjugaison aux quatre temps, dictée
détective) sont **bien calibrées CE2**. Quatre banques récentes avaient soit des
items trop faciles, soit des attendus de fin de CE2 manquants ; elles sont
corrigées par la migration **additive** `0049` (aucune progression d'Iris n'est
réinitialisée).

## Grammaire (`grammaire_item`, 55 → 78 items)

Banque jugée trop petite et à laquelle manquaient des attendus de fin de CE2.
Ajouts : **sujet inversé** (« Au loin brille une étoile. »), **verbe à un temps
composé** à reconnaître (« Léa a mangé une pomme. »), **phrase négative** avec
`ne…jamais` / `ne…plus` / `ne…rien` (avant : seulement `ne…pas`), **complément du
nom** (« le livre de Paul »), pronoms et déterminants variés (N3-N4), majuscule
d'un nom de pays, virgule de liste. Un seul item vraiment trop facile remonté
(`gn-n1-singulier` : on passe de « un chat » à « le tapis », où le nombre ne se lit
pas sur le nom).

## Vocabulaire (`lexique_item`, 120 → 140 items)

- **Ordre alphabétique jusqu'à la 2e / 3e lettre** : les 10 items ALPHABET des
  niveaux 2 et 4 ne portaient que sur la **1re lettre** (niveau CP/CE1). Ils
  comparent désormais des mots qui commencent pareil (chat / cheval / chien →
  deuxième lettre).
- **Nouvelle compétence `FR.VOC.SENS`** (« Le sens d'un mot selon le contexte ») :
  la polysémie, attendu CE2 jusque-là absent. Un mot (glace, souris, feuille,
  orange, carte, pièce, bouton, règle, tour) a deux sens ; l'enfant choisit le bon
  selon la phrase, puis au N4 retrouve le mot qui complète deux phrases.

## Lecture / comprendre un texte (`comprehension_item`, 40 → 42 items)

Les questions N4 étaient du **copier-coller** d'un mot visible (niveau CE1) et les
textes étaient tous très courts (2 à 5 lignes). Correction : les 7 items N4 des
compétences INFO, INFERENCE et VRAIFAUX deviennent de **vraies inférences**
(référent d'un pronom : « le » = le chien ; ressenti implicite non écrit : froid,
peur ; jugement vrai/faux qui demande un raisonnement) sur des **textes de 8 à 12
lignes**. Deux inférences ajoutées (N3 référent de pronom, N4 sentiment).

## Tableaux et graphiques (`donnees_item`, 40 items, 3 modifiés)

La banque savait **lire** un tableau à double entrée mais ne demandait jamais de
**calculer** à partir des données (attendu CE2). Trois items de tableau à double
entrée passent de la lecture d'une case au **calcul d'un total** de ligne ou de
colonne (« combien de billes a Nadia en tout ? » = 40 + 50), avec des nombres CE2
(dizaines / centaines).

## Changements de difficulté pour Iris

- `FR.VOC.SENS` est une **nouvelle** compétence : Iris la démarre au niveau 1.
- L'ordre alphabétique (ALPHABET N2 / N4) et les trois items de tableau devenus des
  calculs sont **plus exigeants** qu'avant (toujours dans les attendus CE2).

## Pistes restant à améliorer (hors 0049, banques déjà de niveau CE2)

- **Mots de la maîtresse** (générateurs 0046) : les exercices de *production*
  (mémoriser puis écrire, mot à trou en saisie libre, dictée détective) sont bien
  CE2 ; les deux générateurs d'*entrée* (QCM de reconnaissance d'une graphie, clic
  sur un mot) restent au ras du CE1. Les faire évoluer (lettres manquantes à
  compléter, anagramme, ordre alphabétique de la liste) demande une refonte du
  composant `MaitresseExo.tsx` : à traiter dans un lot dédié.
- **Mots de la maîtresse** (suite) : voir ci-dessus, refonte `MaitresseExo.tsx` à part.

### Petits restes de l'audit traités (migration 0051)

- **Numération** : la *droite graduée* monte désormais jusqu'à **10 000**. N3 garde
  la droite de 0 à 1000 (pas de 100) ; **N4** de `MA.NUM.SUITE` devient une droite
  graduée de 0 à 10 000 (pas de 1000). Les « bonds » restent présents au N2.
- **Conjugaison** : ajout de **`finir`** (verbe modèle du 2e groupe) aux temps
  simples (présent avec le `-iss-` au pluriel, futur sur l'infinitif, imparfait).
  Introduit à partir du **N3** (`VERBES_2E`). 18 formes seedées, miroir SQL.
- **Dictée détective** : deux notions d'homophones ajoutées, **`la / là`** et
  **`ou / où`** (ordre 13 et 14), avec 2 textes chacune et la faute plantée sur
  l'homophone ; familles `PAIRES` étendues côté client (QCM N2).

# Nouvelle matière « Questionner le monde » (QM)

Troisième matière, à côté de Maths (MA) et Français (FR), réglable dans « Mes
matières » (enfant) et l'espace parent. Code matière `QM`. Interactions variées
(pas seulement QCM) : `qcm`, `texte` (réponse libre, N4), `ordre` (ranger des
étapes : cycles de vie, chaînes alimentaires, frise), `tri` (classer : vivant /
non vivant, régimes alimentaires, solide/liquide/gaz…), `clic` (toucher une zone
d'une scène SVG maison : corps, planisphère, circuit, calendrier).

Architecture identique à « Tableaux et graphiques » (0044) : table serveur
`public.qm_item (cle, competence, niveau, format, attendu)`, fonction `verif_qm`,
op dédiée `qm` dans `enregistrer_reponse`. Le serveur reste SEUL JUGE. Banque
cliente dans `frontend/src/domain/qm/` (une banque par sous-matière), composant
`QuestionnerLeMonde.tsx`. Test croisé front↔SQL (`qm.test.ts` + `qm_test.sql`).

Normalisation (miroir client/serveur) : `qcm` → `normaliser_lettres` (accents
gardés, casse ignorée) ; `ordre`/`tri` → comparaison structurelle (minuscule,
espaces retirés, séparateurs `>` `=` `;` gardés) ; `clic`/`texte` →
`normaliser_mot` (accents EXIGÉS). L'attendu d'un `ordre` = les étapes jointes
par `>` ; celui d'un `tri` = `item=catégorie` pour chaque item, joints par `;`.

## Sous-matière « Le vivant » (migration 0052)

Domaine `vivant`, 6 compétences × 4 niveaux × 2 items = 48 items.

- `QM.VIVANT.CARACTERISTIQUES` — vivant / non vivant, les signes du vivant
  (naître, grandir, se nourrir, se reproduire, mourir). N1-N3 qcm/tri, N4 texte.
- `QM.VIVANT.CYCLES` — ranger les étapes d'un cycle de vie (poule, grenouille,
  papillon, plante à graine). N1 qcm, N2-N4 `ordre` (3 à 5 étapes).
- `QM.VIVANT.CHAINES` — régimes (herbivore/carnivore/omnivore) et chaînes
  alimentaires simples (qui est mangé par qui, en commençant par la plante).
- `QM.VIVANT.PLANTES` — besoins des plantes (eau, lumière, air, terre ; racines,
  soleil). qcm/tri puis texte au N4.
- `QM.VIVANT.CORPS` — squelette, muscles, articulations, les 5 sens.
- `QM.VIVANT.HYGIENE` — alimentation équilibrée, sommeil, brossage des dents,
  activité physique. tri « bon / pas bon pour la santé » + texte au N4.

Activation : matière QM et sous-matière `vivant` ajoutées ACTIVES au défaut des
profils (`matieres_actives` défaut `{MA,QM}`) et à tous les profils existants
(Iris incluse). Garde-fou « au moins une sous-matière jouable » intact (MA reste
active). Les sous-matières QM suivantes (matière, objets, espace, temps) seront
ajoutées à `matieres.ts` au fur et à mesure de leurs lots (chaque `domaine` doit
exister en base avant d'être proposé au réglage).

## Sous-matière « La matière » (migration 0053)

Domaine `matiere`, 4 compétences × 4 niveaux × 2 = 32 items.

- `QM.MATIERE.ETATS` — reconnaître et trier solide / liquide / gaz.
- `QM.MATIERE.EAU` — états de l'eau et changements d'état : fusion (solide→liquide),
  solidification (liquide→solide), évaporation (liquide→gaz), condensation
  (gaz→liquide). N4 `ordre` : ranger du plus froid (glace) au plus chaud (vapeur).
- `QM.MATIERE.MELANGES` — se dissout ou non (sucre/sel vs sable/huile), solution,
  filtration pour séparer.
- `QM.MATIERE.AIR` — l'air existe, prend de la place (ballon), le vent est de
  l'air en mouvement.

Activation : domaine `matiere` ajouté actif au défaut et à tous les profils
(Iris incluse). La matière QM était déjà active (0052). Sous-matière ajoutée à
`matieres.ts`. Aucun changement serveur autre que les données (réutilise `qm_item`,
`verif_qm`, op `qm`).
