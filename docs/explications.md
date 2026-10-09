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
marchent **sans audio**. La progression des **mots à apprendre** (`FR.MAITRESSE.MOTS`)
est volontairement **exigeante** (migration 0064, `maitresse.ts`) :

- **N1 — reconnaître** le mot bien écrit parmi **3 pièges plausibles** générés de
  façon **déterministe** (`formesErronees`) : **homophone** (est/et, sont/son…),
  **erreur de son** (o/au/eau, s/ss/c/ç, g/ge/j), **accent** oublié, **consonne
  doublée** ou **simplifiée**, **lettre muette** finale (op `mmots`) ;
- **N2 — s'entraîner sur le difficile** : soit **compléter les lettres DIFFICILES**
  (`lettresDifficiles` : accents, consonnes doubles, lettre muette, sons ambigus ;
  jamais plus de la moitié du mot, les lettres faciles restent visibles), soit
  **remettre les syllabes dans l'ordre** (`segmenterSyllabes`). Le mot reconstruit
  est renvoyé au serveur (op `mmots`) ;
- **N3 — écrire en contexte** : le mot est à écrire dans une **phrase à trou**
  bienveillante (`phraseGabarit`), le parent peut la lire à voix haute (op `mmots`) ;
- **N4 — mémoriser puis écrire** : le mot s'affiche quelques secondes, se cache,
  l'enfant l'écrit sans contexte (le plus dur, op `mmots`) ;
- **mot à trou** dans une phrase du texte (`FR.MAITRESSE.DICTEE`) : QCM (N1-N2) ou
  saisie libre (N3-N4), on cache en priorité un mot de la liste à apprendre (op `mtrou`) ;
- **dictée détective** sur le texte de la maîtresse : erreurs **injectées de façon
  déterministe** côté serveur (`_maitresse_injecter` : homophones est/sont/ont/à/
  ses, et `m` devant `m`/`b`/`p` comme tambour → tanbour), en **réutilisant le
  moteur existant** (`<DicteeDetective>` + cœur partagé `_verif_dictee_core`, op
  `mdictee`). Le client ne reçoit que les mots **affichés** (déjà fautifs) et le
  **nombre** d'erreurs ; positions, corrections et types restent serveur.

Le **serveur reste seul juge** (ops `mmots` / `mtrou` / `mdictee`,
`enregistrer_reponse`, migration 0046) ; il compare la saisie normalisée
(`normaliser_mot`, accents exigés) au mot stocké, ou applique le moteur de dictée.
Quand c'est faux, le **diagnostic déterministe de la faute** (`diagnostiquerMot`
côté client, `_maitresse_diag` côté serveur, **même classification** : homophone,
accent, doublement, lettre muette, son, lettre) choisit un **message bienveillant**
avec un exemple concret et l'épellation de la bonne graphie.

### Dictée avec papa ou maman (migration 0064)

Mode **dicté par un parent**, accessible depuis **l'espace parent** ET **l'écran
enfant** (`<DicteeMaitresse>`). Le parent lit à voix haute les mots d'une **liste
active** ; l'enfant les écrit. Deux modes :

- **voix** : l'écran enfant montre **seulement « Mot X sur N »** et une zone de
  saisie (jamais le mot ; un bouton discret « parent » permet de revoir le mot à
  lire). Bouton **« Mot suivant »** ;
- **papier** : l'enfant écrit sur son cahier, le parent **coche juste / à revoir**
  (et peut taper la graphie de l'enfant).

À la fin : **correction automatique mot par mot** (serveur seul juge,
`maitresse_dictee_enregistrer`), **score**, **diagnostic** de chaque mot raté,
**liste des mots à revoir**. Les mots ratés **remontent dans une mémoire par mot**
(`maitresse_mot_ema`, moyenne mobile) : ils **reviennent en priorité** dans les
exercices (`choisirMotPrioritaire`) et en tête des dictées suivantes. Un
**emplacement « Prendre en photo la dictée »** est prévu (bouton désactivé) pour
scanner le cahier plus tard (`maitresse_dictee.photo_prevue`).

L'**historique** des dictées (date, mode, score, mots ratés) est visible dans
l'espace parent (`maitresse_historique`, réservé au parent du foyer, RLS stricte).
Golden : `maitresse_dictee_test.sql` (diagnostic, score, EMA, isolation) +
`diagnostic/maitresse.test.ts` (classification, bienveillance).

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

## Sous-matière « Les objets » (migration 0054)

Domaine `objets`, 4 compétences × 4 niveaux × 2 = 32 items.

- `QM.OBJETS.CIRCUIT` — circuit électrique simple. Scène SVG maison
  (`scenes.ts : circuitScene`) : pile, ampoule, fils, interrupteur. « L'ampoule
  s'allume ? » = **simulation simple** : l'attendu vaut « oui » si l'interrupteur
  est fermé ET aucun fil coupé, « non » sinon. Un `clic` fait toucher un composant
  (l'interrupteur, la pile). N4 : dangers de l'électricité (prise).
- `QM.OBJETS.FONCTIONS` — associer objet et fonction (tri/qcm).
- `QM.OBJETS.LEVIERS` — balances (le plus lourd descend, équilibre) et leviers.
- `QM.OBJETS.NUMERIQUE` — usage responsable des écrans (pauses, demander à un
  adulte, ne pas parler à un inconnu, tout n'est pas vrai sur Internet).

Premier usage du format `clic` avec scène SVG (zones cliquables dans
`QuestionnerLeMonde.tsx`). Domaine `objets` actif au défaut et sur tous les
profils (Iris incluse).

## Sous-matière « L'espace » (migration 0055)

Domaine `espace`, 5 compétences × 4 niveaux × 2 = 40 items.

- `QM.ESPACE.SEREPERER` — plan (vu de dessus), maquette, photo aérienne, légende.
- `QM.ESPACE.PLANETE` — la Terre (boule), continents et océans. Scène SVG maison
  `planisphereScene` (SVG maison, AUCUNE carte sous licence) : 5 continents
  schématiques cliquables (`clic`).
- `QM.ESPACE.FRANCE` — pays, capitale (Paris), fleuves (Seine, Loire), grande
  ville (Marseille), surnom hexagone.
- `QM.ESPACE.CARDINAUX` — nord/sud/est/ouest, lever/coucher du soleil. Scène
  `roseVentsScene` (clic sur un point cardinal).
- `QM.ESPACE.PAYSAGES` — ville, campagne, montagne, littoral (tri).

Domaine `espace` actif au défaut et sur tous les profils (Iris incluse).

## Sous-matière « Le temps » (migration 0056)

Domaine `temps`, 5 compétences × 4 niveaux × 2 = 40 items. (Calendrier, saisons
et frise chronologique sont ICI autorisés et attendus.)

- `QM.TEMPS.CALENDRIER` — jours, semaines, mois, saisons. Scène SVG maison
  `monthScene` : grille d'un mois, clic sur la colonne d'un jour.
- `QM.TEMPS.FRISE` — avant/après, ranger dans l'ordre (`ordre`) : moments de la
  journée, étapes d'une action, saisons, âges de la vie.
- `QM.TEMPS.GENERATIONS` — grands-parents/parents/enfants, oncle, ranger les
  générations de la plus ancienne à la plus récente.
- `QM.TEMPS.AUTREFOIS` — autrefois vs aujourd'hui (plume, bougie, ardoise, lavoir
  vs ordinateur, électricité) ; tri.
- `QM.TEMPS.JOURNUIT` — soleil/lune, la Terre tourne, 24 heures, ordre des
  moments du jour.

Domaine `temps` actif au défaut et sur tous les profils (Iris incluse). **Fin du
socle QM : 5 sous-matières, 24 compétences, 192 items.**

## Audit de la division CE2 (migration 0057)

État constaté : la division était déjà travaillée en CALCUL (`MA.CM.DIV_RESTE` :
quotient ET reste, division exacte par les tables puis avec reste, division en
contexte) et en PROBLÈMES (`MA.PB.MULT_DIV`, sens PARTAGE / partition :
« N objets en D parts égales, combien par part ? »). **Manquait** le sens
GROUPEMENT / quotition de la division (« combien de paquets de P dans N ? »),
et le niveau 2 de MULT_DIV ne proposait pas de division du tout.

Ajout ADDITIF :
- nouveau type de problème `quotition` dans `domain/calcul/problemes.ts`
  (division exacte, op `div`, 4 gabarits : paquets, sachets, rangées) ;
- paramètres `ex_calcul` de `MA.PB.MULT_DIV` mis à jour (migration 0057) :
  division-partage réintroduite au N2, quotition ajoutée aux N2/N3/N4.

Le serveur juge déjà l'op `div` pour `MA.PB.MULT_DIV` (verif_calcul inchangé).
Les deux sens de la division sont désormais couverts, avec quotient (problèmes)
et quotient + reste (calcul). Test `problemes.test.ts` : les deux sens
apparaissent bien (partage + quotition).

## Nouvelle matière « Vivre ensemble » (EMC, migration 0058)

Quatrième matière, à côté de Maths, Français et Questionner le monde :
l'**enseignement moral et civique** (CE2, cycle 2). Même modèle d'activation que
QM : la matière `EMC` et ses 4 sous-matières (`respect`, `emotions`,
`republique`, `ecrans`) sont **actives au défaut et sur tous les profils
existants (Iris incluse)**. Garde-fou « au moins une sous-matière jouable »
intact (MA reste toujours active).

**Réutilisation (pas de duplication)** : EMC partage l'infrastructure
« situation » de QM — même table serveur `public.qm_item` (contrainte élargie à
`EMC.%`), même fonction `verif_qm`, même op `qm` dans `enregistrer_reponse`
(branche élargie à `EMC.%`), même composant de rendu `<QuestionnerLeMonde>`
(formats `qcm` / `tri` / `ordre` / `texte`). Seuls changent le **catalogue**
d'exercices (`exercices.type = 'emc'`, méthode `vivre_ensemble`) et le
**contenu** (banque `frontend/src/domain/emc`, miroir de `qm_item`). Test croisé
front ↔ SQL : `emc.test.ts` + `emc_test.sql`.

**Format pédagogique** : petites SITUATIONS concrètes du quotidien d'un enfant
(« Léo se moque de Sami… Que peux-tu faire ? ») avec choix de la bonne conduite
et justification (champ `explication`). Ton **toujours bienveillant**, jamais
moralisateur ni culpabilisant ; plusieurs bonnes conduites valorisées. Pour le
harcèlement : on rappelle toujours d'**en parler à un adulte de confiance**.
Contenus **neutres politiquement** (seulement les institutions et valeurs
officielles du programme). Progression : N1 rappel léger (QCM), N2-N3 cœur CE2
(QCM, tri, ranger), N4 réponse libre écrite.

Sous-matières et compétences (15 compétences × 4 niveaux × 2 = **120 items**) :

- **Respecter les autres et les règles** (`respect`) : `REGLES` (règles de vie
  de classe/école), `POLITESSE` (bonjour, merci, s'il te plaît, pardon),
  `DIFFERENCES` (respect des différences, égalité filles-garçons), `MOQUERIE`
  (refuser la moquerie et le harcèlement, en parler à un adulte).
- **Mes émotions** (`emotions`) : `RECONNAITRE` (joie, colère, peur, tristesse,
  surprise), `CALME` (réagir calmement), `EMPATHIE` (se mettre à la place de
  l'autre).
- **Droits et devoirs, la République** (`republique`) : `DROITS` (droits de
  l'enfant, devoirs à l'école), `SYMBOLES` (drapeau, Marianne, devise, hymne,
  14 juillet), `COMMUNE` (la commune et le maire), `VOTER` (élire des délégués).
- **Bien utiliser les écrans et Internet** (`ecrans`) : `TEMPS` (temps d'écran),
  `DONNEES` (ne pas donner ses infos, demander à un adulte), `POLITESSE` (être
  poli en ligne), `ESPRITCRITIQUE` (ne pas tout croire, vérifier).

# Règle de bienveillance (décision de Manu, absolue)

**TOUS les contenus montrés à l'enfant doivent être OPTIMISTES et PLEINS DE
BIENVEILLANCE.** Rien de dramatique ni de cruel :

- pas de mort (humain ou animal), pas d'animal dévoré ou tué ;
- pas de violence, pas de peur forte, pas de sang, pas de blessure décrite ;
- pas d'enfant malheureux, abandonné, puni durement ou moqué ;
- pas de catastrophe.

**On ne coupe JAMAIS un texte pour le rendre acceptable (décision de Manu,
9 octobre 2026).** Si un passage ne respecte pas ces critères, le **texte entier
est retiré** : pas d'extrait tronqué « pour enlever un mot », pas de champ ni de
note de coupe. Le garde-fou `bibliotheque.test.ts` vérifie qu'aucun texte de la
Bibliothèque ni aucun item de compréhension ne porte de marqueur de coupe.

**Faits scientifiques.** Les faits nécessaires au programme restent possibles
s'ils sont dits **avec douceur** :

- Chaîne alimentaire : « le renard mange des souris pour se nourrir » est
  acceptable, sans détail cruel (jamais « dévore », « tue », « déchiquette »).
- Cycle de vie : on évite « mourir » au profit de « la plante se fane et laisse
  des graines » quand c'est possible.
- Si le programme exige « mourir » comme **caractéristique du vivant** (naître,
  grandir, se nourrir, se reproduire, mourir), on le dit calmement (« la
  dernière étape de la vie »), sans exemple triste, sans animal ni enfant. Seul
  l'item `qm-viv-car-n4-a` conserve ce mot, volontairement.

**Vivre ensemble (EMC).** Les situations de moquerie / harcèlement gardent leur
message utile (apprendre à réagir) mais **sans scène cruelle décrite**, toujours
avec une **issue positive** et le réflexe « **en parler à un adulte de
confiance** ». De même, « blesser » n'est employé que pour les sentiments (on
s'excuse quand on a blessé un ami), jamais une blessure physique.

**Garde-fous automatiques.** Une liste de mots/expressions interdits est vérifiée
à chaque build :

- côté frontend : `frontend/src/domain/bienveillance.test.ts` (banques statiques
  lecture / QM / EMC / grammaire / vocabulaire / données / géométrie, indices,
  messages de correction, et énoncés de maths GÉNÉRÉS) ;
- côté serveur : `supabase/tests/bienveillance_test.sql` (textes de la dictée
  détective et réponses attendues de référence).

La liste blanche (whitelist) est explicite et commentée dans ces deux fichiers
(les seuls cas pédagogiques nécessaires : `qm-viv-car-n4-a` pour « mourir », le
domaine `EMC.*` pour « moquerie » / « blesser (les sentiments) »). Les mots
isolés de vocabulaire (« triste », « méchant », antonymes) ne sont pas interdits :
la règle vise les **scènes**, pas le lexique nécessaire ; leur usage reste
surveillé par la revue éditoriale.

# Bibliothèque de textes du domaine public (lot 0060)

Kerskol intègre une **bibliothèque de textes du domaine public** (fables de La
Fontaine et de Florian, *Histoires naturelles* de Jules Renard, contes d'Andersen,
Perrault, Mme d'Aulnoy, récits de la Comtesse de Ségur, Colette, George Sand,
Anatole France, poésies de Gautier, Cros, Desbordes-Valmore). Tous les auteurs
sont disparus depuis plus de 70 ans ; les textes sont recopiés fidèlement d'après
Wikisource (seuls de courts extraits sont parfois utilisés, coupés aux limites de
phrase).

**Sélection.** On ne retient que les textes cycle 2 (CE1/CE2), marqués
`utilisable = oui` et `ton = garde` dans le catalogue de la bibliothèque, et dont
le **corps** ne contient aucun mot de la liste bienveillance. Les textes signalés
par Manu (Musiciens de Brême, Conquérants, Lièvre et Grenouilles, Maître
Pathelin, « Feu ! » de Verne, Le Mendiant de Hugo, Une souris verte, Le ciel est
par-dessus le toit) sont **exclus**. **« Renart et les anguilles »** (cycle 3)
est au contraire **gardé** dans le kit (décision explicite de Manu : texte sur la
ruse, la menace n'est pas suivie d'effet) ; il n'apparaît pas dans l'application,
qui ne porte que du CE1/CE2.

**Source de vérité.** `frontend/src/domain/francais/bibliotheque.ts` (fichier
généré) porte, pour chaque texte : auteur, œuvre, titre, classe, URL de source,
corps (paragraphes/strophes), glossaire « mots difficiles » et un champ
`librivoxUrl` **réservé** à la future voix (aucun audio pour l'instant). La page
Bibliothèque (`frontend/src/screens/Bibliotheque.tsx`) est accessible depuis
l'accueil enfant (village) et l'espace parent : lecture **silencieuse**, gros
caractères, interligne large, crédit auteur/œuvre + « domaine public ». Le bouton
« Écouter » est présent dans le DOM mais **désactivé et masqué**.

## Compréhension : items bâtis sur la bibliothèque

La banque « Comprendre un texte » (`comprehension.ts`, table miroir
`public.comprehension_item`, migration 0060) reçoit des **questions originales**
(écrites pour le CE2) dont seul le **texte lu** reprend les mots de l'auteur :

- **N1** repérer une information explicite (QCM) ;
- **N2** qui / où / quoi + sens d'un mot en contexte ;
- **N3** inférence simple, ordre des événements, à qui renvoie un petit mot ;
- **N4** réponse libre courte (taper un mot, cliquer le mot qui prouve).

Les **vieux mots** sont expliqués par un petit glossaire au survol/toucher
(`glossaire` de l'item ; par exemple « un flatteur = une personne qui dit de
belles choses pour tromper »). Chaque item cite sa source (auteur + œuvre).

**Bienveillance.** Le garde-fou `bienveillance.test.ts` scanne désormais aussi
`BIBLIOTHEQUE` ; `bienveillance_test.sql` scanne toutes les réponses de référence
`comprehension_item` (dont les nouveaux items). Les définitions du glossaire sont
adoucies si besoin (ex. « façon amicale et familière » au lieu de « moqueuse »).

### Complément : une question sur chaque texte (lot 0062)

Le lot 0060 ne couvrait que 6 textes (13 questions). Le lot 0062 (migration
`0062_bibliotheque_comprehension_complet`) ajoute **137 questions originales**
pour couvrir **chaque texte de la page Bibliothèque** qui n'en avait pas encore
(41 textes, 3 à 4 questions chacun), soit **≈ 150 questions bibliothèque** au
total (golden : 192 items dans `comprehension_item`). Même patron (N1 info
explicite QCM → N4 réponse libre : clic, texte ou remise en ordre), même
glossaire des vieux mots, même source citée. Les questions N1 restent des
repérages d'information explicite ; le vocabulaire en contexte (ex. le « billet
doux » du Papillon) est traité au N2. **Huit textes écartés** par le garde-fou
bienveillance (mot sensible dans le corps : « Le Loup et le Chien », « Le Cygne »,
« Le Chêne et le Roseau »…) ne sont volontairement pas intégrés.

### Lot 0068 : retrait des 3 fables coupées (correction d'une décision de Manu)

**Règle de contenu (décision de Manu, 9 octobre 2026) : on ne COUPE JAMAIS un
texte pour le rendre acceptable.** Si un passage ne respecte pas les critères de
bienveillance, le **texte entier est retiré** (jamais d'extrait tronqué « pour
retirer un mot »). Les 3 fables ajoutées au lot 0065 avaient précisément été
« récupérées » en coupant leur corps : elles violent la nouvelle règle et sont
donc **retirées entièrement** :

- **« Le Chêne et le Roseau »** (`c2-050`),
- **« La Laitière et le Pot au lait »** (`c2-026`),
- **« L'Ours et les deux Compagnons »** (`c2-075`).

La migration `0068_bibliotheque_retrait_textes_coupes` **supprime** leurs 11 items
de `comprehension_item` (golden 203 → 192) ; les objets correspondants sont
retirés de `bibliotheque.ts` et de `comprehension.ts`. Aucune clé étrangère ne
pointe vers `comprehension_item`, l'EMA est porté par (compétence, niveau) : rien
n'est cassé pour Iris. Un **garde-fou** (`bibliotheque.test.ts`) vérifie désormais
qu'aucun texte de la Bibliothèque ni aucun item de compréhension n'est un extrait
« coupé pour la bienveillance » (marqueur de coupe interdit dans la source).

**« Renart et les anguilles »** (`c3-033`, kit, cycle 3) reste **gardé** (décision
explicite de Manu : texte sur la ruse, la menace n'est pas suivie d'effet).
**« Une souris verte »** (kit `c1-001` MS + `c2-001` CP) est **retiré
entièrement** (ni MS ni CP ne l'utilisent ; l'application ne porte de toute façon
que du CE1/CE2). Côté kit, le pourcentage de textes écartés passe de **25,1 %** à
**27,3 %** (63 `ton = retire` sur 231 fiches).

**Mots de la maîtresse (retouche lot 0).** Le gabarit de phrase N3
« La maîtresse écrit ___ au tableau. » (univers classe) est remplacé par
« Papa a écrit ___ sur la liste des courses. » (univers « à la maison »,
bienveillant).

## Dictée : extraits inspirés de la bibliothèque (lot 0061)

La dictée détective reçoit dix extraits courts (2 à 4 phrases, **orthographe
actuelle**, aucun mot trop ancien), inspirés des textes de la bibliothèque (même
vocabulaire et mêmes thèmes : la ferme, le chaton, le train, les agneaux, le feu…).
Chaque extrait est rattaché à une **notion existante** (migrations 0033-0035) et
porte une erreur injectée déterministe : `a_a`, `et_est`, `pluriel`, `son_sont`,
`on_ont`, `verbe_ent`, `accord`, `ces_ses`, `e_er_ez`, `m_mbp` (ids 201 à 210).
On ne force aucune notion absente du texte. Le serveur (`verif_dictee`) reste seul
juge ; `bienveillance_test.sql` scanne tous ces textes.

# Sous-matière « Copier et écrire » (français, lot 0063)

Nouvelle sous-matière française, domaine `ecriture`, compétences **FR.ECR.\***
(additives : aucune réinitialisation d'Iris ; le domaine est simplement ajouté
aux profils). Deux activités, source de vérité
`frontend/src/domain/francais/ecriture.ts`, miroir serveur `public.ecriture_item`
+ `public.verif_ecriture`, op dédiée `ecr` dans `enregistrer_reponse`. Composant
`Ecriture.tsx`. Contrôles sur la page : **Valider / Indice / Effacer / Continuer** ;
cibles tactiles ≥ 44 px.

## FR.ECR.COPIE — recopier
Un modèle est affiché, l'enfant le recopie au clavier. **N1** un mot → **N2** un
groupe de mots → **N3** une phrase → **N4** un passage de 3 phrases affiché puis
**masqué** (copie différée : on regarde, on cache, on écrit de mémoire). La
vérification est **déterministe mot à mot** : majuscule, accents et point sont
**exigés** (espaces normalisés). En cas d'écart, un **diagnostic bienveillant**
côté client explique quoi regarder (mot oublié, lettre manquante, accent,
majuscule, point) ; le serveur reste seul juge (juste/faux).

## FR.ECR.GUIDEE — écriture guidée
- **N1** remettre des **étiquettes-mots** dans l'ordre pour faire une phrase ;
- **N2** compléter une phrase avec le **mot cohérent** (QCM) ;
- **N3** **transformer** une phrase vers une cible exacte (singulier → pluriel,
  présent → passé composé) ;
- **N4** écrire une **phrase libre** à partir d'une **image** (Fluent Emoji) ou
  d'un **début d'histoire**, vérifiée par une **check-list** automatique : une
  majuscule au début, un point final, au moins N mots, au moins un **verbe** d'une
  liste, et les **mots-clés** imposés (ex. « écris une phrase avec chat et
  jardin »). **Le sens n'est jamais jugé par IA.** Message toujours encourageant.

La phrase libre de l'enfant est **enregistrée** (`public.ecriture_production`,
insert via `enregistrer_reponse` seulement) et **relue par le parent** dans
l'espace parent (section « Phrases écrites »). Lecture protégée par RLS
(`peut_acceder_profil`).

**Bienveillance.** `bienveillance.test.ts` scanne `BANQUE_ECRITURE` ;
`bienveillance_test.sql` scanne `ecriture_item.attendu`. Golden croisé :
`ecriture.test.ts` (24 items) ⇄ `ecriture_test.sql`.

# Socle multi-classes (lot 1)

La classe de l'enfant (`public.profils.classe`, CP..CM2, défaut CE2, réglable
dans l'espace parent) pilote désormais le contenu. Chaque compétence porte une
**portée** `classe_min` / `classe_max` (migration `0066`, additive : toutes les
compétences existantes = CE2, aucun reset ; Iris reste en CE2). Les **rappels
CE1** évidents (calcul mental de la classe d'avant : addition, doubles, moitiés,
compléments) sont marqués `classe_min = CE1`.

**Règle du moteur** (`composeSession`) : pour un enfant de classe C, une
compétence est **candidate** si sa portée `[classe_min, classe_max]` chevauche
`[C-1, C+1]` — révision de la classe d'avant si lacune, un peu d'avance (classe
suivante) si la compétence est déjà acquise. Une compétence sans portée (démo /
ancien référentiel) n'est pas restreinte.

**Sous-matières visibles selon la classe** (`matieres.ts`) : visibilité
**stricte** `classeMin <= classe <= classeMax` (défaut : visible partout). Une
sous-matière propre au CM1 (lot 2) porte `classeMin = 'CM1'` et reste **masquée
pour un CE2** dans les réglages ; le moteur peut tout de même proposer une
compétence un peu en avance DANS une sous-matière déjà visible (marge d'un an).

**Tests.** `composer.test.ts` (candidature ±1 an, Iris CE2 inchangée),
`matieres.test.ts`, et `classe_test.sql` (portée par défaut CE2, 4 rappels CE1,
contrainte d'ordre `classe_min <= classe_max`).

# CM1 - Mathématiques (lot 2)

Attendus vérifiés sur les programmes officiels (cycle 3, actualisé 2025) :
- Eduscol, « Mathématiques CM1 - Attendus de fin d'année » :
  https://eduscol.education.fr/document/13990/download
- Programme de mathématiques du cycle 3 (décembre 2024, applicable 2025) :
  https://eduscol.education.gouv.fr/sites/default/files/document/programmedemaths-volet3aucycle3527161pdf-78786.pdf
- Exemples de mise en œuvre CM1 2025 :
  https://eduscol.education.gouv.fr/sites/default/files/document/exemplesmiseenoeuvrecm1mathspdf-111543.pdf

## Livré : « Les grands nombres » (migration 0067)

Nouvelle compétence **MA.NUM.GRANDS** (sous-matière « Les nombres »/numération,
**portée CM1..CM2**) : **comparer** et **ranger** les grands nombres **jusqu'au
million**. On **réutilise le moteur de numération** (types `comparer` et
`ranger`, qui n'affichent que des chiffres : aucune écriture en lettres, pas de
borne à 9 999) en **changeant la banque** (`ex_calcul`). Niveaux : N1 comparer
(≥ 1 000), N2 ranger le plus grand (dizaines de milliers), N3 comparer (centaines
de milliers), N4 ranger (jusqu'au million).

**Serveur seul juge** : `verif_calcul` étendu (ops `cmp`/`val` pour cette
compétence ; borne portée à **1 000 000 pour MA.NUM.GRANDS uniquement**, les
autres `MA.NUM.*` restent bornées à 10 000). Plan de classe **CM1**
(`classes.ts`) : révision du cœur CE2 + cœur « grands nombres ». Tests :
`generator.test.ts` (déterminisme, bornes), `composer.test.ts` (1re séance CM1),
`cm1_grands_nombres_test.sql` (jugement serveur + non-régression des autres
`MA.NUM.*`).

## Livré : « Fractions » (migration 0069)

Quatre nouvelles compétences **portée CM1..CM2**, domaine `fractions`, qui
**réutilisent le moteur de fractions** (`buildFraction`, forme `fraction`) en
ajoutant seulement des **types** d'exercices (aucune nouvelle UI) :
- **MA.FRAC.DROITE** - lire/écrire une fraction sur une **bande graduée de 0 à 1**
  (portion de droite graduée ; N1 QCM, N2-4 saisie libre du numérateur et du
  dénominateur). Op serveur `val` (code `num*100+den`).
- **MA.FRAC.COMPARER** - **comparer deux fractions** (même dénominateur, même
  numérateur, à 1/2, puis quelconques). Op serveur `cmp` : on recompose
  `a = n1·d2`, `b = n2·d1` et on compare (produits ≤ 2000).
- **MA.FRAC.EGALITES** - **fractions égales** (équivalences `n/d = n·f/d·f`) ;
  familles **décimales** au niveau 4 (`×10`, `×100`). N1 QCM, N2-4 saisie. Op `val`.
- **MA.FRAC.QUANTITE** - **fraction d'une quantité** : unitaire (`1/d de q`, op
  `div`) aux N1-2, non unitaire (`num/d de q`) aux N3-4. Op `div`/`val`.

« Fractions simples » et « fraction d'une quantité (unitaire) » restent portées
par **MA.FRAC.SIMPLES** (CE2), reprise en **révision** par la marge de classe du
CM1. **Serveur seul juge** : `verif_calcul` étendu (ajout des 4 compétences au
tableau des ops ; bornes famille `MA.FRAC.%` déjà à 2000). Plan de classe **CM1**
(`classes.ts`) : révision `MA.FRAC.SIMPLES` + cœur des 4 compétences. Ces
exercices apparaissent au CM1 et **en avance** à un CE2 qui a validé
`MA.FRAC.SIMPLES` au niveau 2 (prérequis). Tests : `generator.test.ts` et
`composer.test.ts` (invariants golden sur toutes les sources), `cm1_fractions_test.sql`
(jugement serveur + bornes + portée + non-régression `MA.FRAC.SIMPLES`).

## Livré : « Données et probabilités » (migration 0070, lot 7)

Deux nouvelles compétences **portée CM1..CM2**, dans le domaine `donnees` déjà
existant (sous-matière « Tableaux et graphiques », 0044). On **réutilise tout**
(table `donnees_item`, `verif_donnees` op `don` — **serveur seul juge**,
composant `<Donnees>`, QCM existant) : **aucune nouvelle UI**.
- **MA.DONNEES.LIRE_CM1** - lire / compléter un **tableau** ou un **diagramme en
  barres** à partir de situations **« à la maison »** (livres sur les étagères,
  courses de la semaine, linge, vêtements rangés), avec des **nombres plus
  grands** qu'au CE2 (totaux jusqu'à 60). N1 QCM, N2-N3 QCM (lecture de barre,
  complétion avec un total), N4 réponse libre.
- **MA.DONNEES.HASARD** - vocabulaire du hasard : **possible / impossible /
  certain**, à partir d'un **dé**, d'une **pièce**, d'un **sac de billes**. QCM
  aux niveaux faciles (figure « none » : la situation est décrite à l'oral, zéro
  dessin), réponse libre au N4.

Les deux compétences sont au **cœur du plan de classe CM1** (`classes.ts`) et
apparaissent **en avance** à un CE2 qui a acquis la lecture de données CE2
(prérequis `MA.DONNEES.TABLEAU` / `MA.DONNEES.COMPARER` niveau 2). Miroir exact
front (`donnees.ts`, 56 items au total) ↔ SQL (`donnees_item`), vérifié par le
golden vitest `donnees.test.ts` et le test croisé `donnees_test.sql`.

## Livré : « Problèmes à plusieurs étapes » + « Pensée informatique » (migration 0071, lot 8)

Lot **réutilisant à l'identique** deux moteurs existants (aucune nouvelle UI,
aucun changement du cœur « serveur seul juge ») ; on **élargit seulement la
portée** des deux compétences de CE2 à **CM1..CM2** (`classe_min` inchangée) et
on les ajoute au **cœur du plan de classe CM1** (`classes.ts`) :
- **MA.PB.DEUX_ETAPES** (0024/0025) - **problèmes à deux étapes** : `op` puis
  `op2` (dont le **rendu de monnaie**, `rsub` : on paie, on rend). `op2` reste
  réservé à cette compétence dans `verif_calcul` (recalcul serveur). Le contenu
  existant (achats en euros, reste/rendu) correspond déjà au niveau CM1.
- **MA.REPERE.PROGRAMMER** (0047) - **programmer un déplacement** (robot type
  Blue-Bot) : assembler / lire un programme sur un quadrillage avec obstacles.
  Le serveur **simule** le déplacement (`verif_geo_programme`) et accepte **toute**
  suite d'instructions atteignant la cible.

**Boucles « répète 3 fois »** : le moteur serveur **s'y prête déjà** (il simule
une liste **plate** d'instructions ; une boucle se développe côté client en
instructions répétées). Mais **proposer** une boucle à l'enfant demande un
**éditeur de boucle** (nouvelle UI) : c'est **reporté au lot d'UI**, ce lot-ci
étant « sans nouvelle UI ». Aucun item ajouté → aucun golden modifié ; test de
non-régression : `0071` vérifie la portée CM2 des deux compétences.

## Livré : « Nombres décimaux » (migration 0072, lot 2)

Nouvelle sous-matière / domaine `decimaux` (**portée CM1..CM2**, visible CM1+),
avec une **nouvelle saisie à virgule** (`<DecimalInput>`, calquée sur
`FractionInput`). **Encodage en centièmes entiers** : un décimal `x` est codé
`round(x·100)` (3,25 → 325 ; 3,5 → 350 ; 0,07 → 7 ; 7 → 700) ; aucun flottant ne
circule, le **serveur reste seul juge** (`verif_calcul`, op `val`, famille
`MA.DEC.%` bornée à 100000 centièmes = 1000,00). Trois compétences, toutes via
`<DecimalInput>` :
- **MA.DEC.ECRIRE** - écrire un décimal depuis une désignation (unités +
  dixièmes/centièmes) ou depuis une **fraction décimale** (lien fractions ↔
  virgule : « 25 centièmes » → 0,25).
- **MA.DEC.COMPARER** - comparer deux décimaux en **écrivant le plus grand / le
  plus petit** (évite une UI de signes dédiée aux décimaux).
- **MA.DEC.ENCADRER** - écrire l'**entier juste avant / juste après** un décimal.

Progression N1→N4 : dixièmes puis centièmes puis fraction décimale ; bornes qui
grandissent (`maxE` 5→99). Génération client `buildDecimal` depuis
`ex_calcul.params` (miroir `seedSources.ts`, bloc DEC, et test golden
`decimaux.test.ts`) ; `ex_calcul` étend ses CHECK (`operation`/`forme` =
`decimal`). Plan de classe **CM1** (cœur). Test croisé serveur `decimaux_test.sql`
(jugement val/cmp, ops interdites, bornes, référentiel). Capture Playwright
vérifiée (390/820 px).

**Reste décimaux (lot d'UI suivant)** : **placer sur une droite graduée** (figure
SVG de droite décimale) et **ranger** plusieurs décimaux (UI d'ordre) ; l'addition
et la soustraction de décimaux relèvent du lot 3 (opérations).

## Livré : « Proportionnalité » (migration 0074, lot 4)

Nouvelle sous-matière / domaine `proportionnalite` (**portée CM1..CM2**, visible
CM1+). On **réutilise intégralement** le moteur `donnees` (tableau + op `don`,
**serveur seul juge**, composant `<Donnees>`) : **aucune nouvelle UI, aucun
nouveau juge**. Astuce d'architecture : les compétences gardent un **code en
`MA.DONNEES.PROP_*`** (le routage `buildDonnees`, `verif_donnees` et le CHECK de
`donnees_item` exigent ce préfixe) mais portent le **domaine `proportionnalite`**
(nouvelle sous-matière). Deux compétences, **tableau à compléter** « à la
maison » :
- **MA.DONNEES.PROP_RECETTE** - proportionnaliser une recette (œufs, farine,
  lait…) : « Pour 2 gâteaux 6 œufs → pour 8 gâteaux ? ».
- **MA.DONNEES.PROP_COURSES** - proportionnaliser un prix (courses, achats) :
  « 3 pommes 6 € → 6 pommes ? ».

QCM aux niveaux faciles, réponse libre au N4. 16 items miroir front ↔ SQL (golden
72), plan de classe **CM1** (cœur). Capture Playwright vérifiée (390/820 px).

## Livré : « Grandeurs et mesures » (migration 0075, lot 5)

Réutilisation des moteurs existants, **aucune nouvelle UI** :
- **MA.MES.PERIMETRE** / **MA.MES.AIRE** (domaine `mesures`, portée CM1..CM2) -
  périmètre et aire d'un **carré / rectangle** par les **formules**, énoncé
  texte (dimensions données), saisie au **pavé clavier**. Aire → op `mul` (le
  serveur recalcule L × l) ; périmètre → op `val` (valeur cible encodée, car
  2×(L+l) n'est pas un produit en une opération). Génération `buildGrandeurs`,
  miroir `seedSources.ts` (bloc GRANDEURS).
- **MA.DONNEES.ANGLES** (domaine `mesures`) - vocabulaire **droit / aigu /
  obtus** via le moteur `donnees` (QCM, figure « none »). 8 items (golden donnees
  = 80).
- **Durées** : `MA.MES.DUREES` **élargie** à CM1..CM2 (réutilisation).

`verif_calcul` étendu (MA.MES.PERIMETRE = val/mul ; MA.MES.AIRE = mul). Plan de
classe **CM1** (cœur). Capture Playwright vérifiée (angles). **Reste mesures** :
l'**aire par comptage de carreaux** (figure quadrillée) et les **angles avec
figure** (reconnaissance visuelle) demandent une nouvelle figure.

## Livré : « Opérations » partie 1 (migration 0076, lot 3)

Réutilisation des moteurs existants, **aucune nouvelle UI** :
- **MA.POSE.MULT2** (domaine `calcul_pose`, portée CM1..CM2) - **multiplication
  posée à 2 chiffres** : moteur `pose` (`buildPose`), op `mul` (serveur recalcule
  a × b, bornes `MA.POSE.%` ≤ 10000 → 99 × 99 = 9801).
- **MA.DEC.ADDITION** / **MA.DEC.SOUSTRACTION** (domaine `decimaux`) - **addition
  et soustraction de décimaux** : saisie `<DecimalInput>` (centièmes entiers),
  op `add` / `sub` (serveur recalcule ; soustraction générée avec a ≥ b).

`verif_calcul` étendu (MULT2 = mul ; ADDITION = add ; SOUSTRACTION = sub, placées
**avant** le générique `MA.DEC.%`). Plan de classe **CM1** (cœur). Golden
`decimaux.test.ts` (20 sources, ops val/add/sub, `computeVerif == answer`).
Capture Playwright vérifiée (addition décimale).

## Reste à livrer pour le CM1 (maths)

Chaque point suit le même patron (nouvelle compétence `classe_min = 'CM1'`,
banque `ex_calcul`, extension de `verif_calcul` ou nouveau juge, plan de classe,
tests golden) :
- **Nombres décimaux** : compléter avec la **droite graduée** décimale et le
  **rangement** de plusieurs décimaux (saisies/figures supplémentaires).
- **Division posée** (potence, diviseur à 1 puis 2 chiffres) : **nouvelle UI**
  (disposition de la division) ; **calcul mental CM1** (grands nombres, multiples).
- **Grandeurs et mesures** : aire par **comptage de carreaux** et angles **avec
  figure** (reconnaissance visuelle) — nécessitent une figure quadrillée/angle.
- **Espace et géométrie** : perpendiculaires, parallèles, cercle, programme de
  construction, symétrie axiale (réutiliser règle/équerre/compas existants).
- **Boucles de programmation** (« répète 3 fois ») : éditeur de boucle (UI) pour
  `MA.REPERE.PROGRAMMER` — nécessite une nouvelle UI (lot d'UI).

Et pour les autres matières CM1 : **français, sciences, histoire-géographie,
EMC** (non traités dans ce lot).
