# Progression « Dictée détective » CE2 (par notions)

## But

Ce document organise la banque de textes de la compétence `FR.ORTHO.DETECTIVE`
(« Dictée détective ») en une **progression par NOTIONS**, conforme au programme
de français du **cycle 2** (BO avril 2024) et aux repères Éduscol « Français CE2
— Attendus de fin d'année » et « Repères CE2 2024 ».

**Décision de Manu : on n'est pas un professeur mais une application.** Comme en
maths, **tout se joue par niveau, pas par calendrier.** Il n'y a **aucune date,
aucune semaine, aucune rentrée.** Les notions sont simplement **ordonnées**
(ordre de présentation + prérequis) ; chaque notion a son propre suivi (série de
réussites, comme un escalier) ; l'enfant **avance aussi vite que son niveau le
permet**.

## Les 12 notions, dans l'ordre (table `dictee_notion`)

Le moteur sert, dans cet ordre : d'abord les **lacunes** (notions où l'enfant
échoue), puis la **1re notion non maîtrisée** (la frontière), puis la
**révision** des notions maîtrisées. Une notion est **maîtrisée** après **2
réussites d'affilée** (remise à zéro à chaque échec). Rien n'est verrouillé par
le temps.

| Ordre | Notion DB | Libellé | Prérequis |
|---|---|---|---|
| 1  | `pluriel`        | Le pluriel des noms (-s / -x)        | —              |
| 2  | `son_sont`       | son / sont                           | `pluriel`      |
| 3  | `a_a`            | a / à                                | `son_sont`     |
| 4  | `et_est`         | et / est                             | `a_a`          |
| 5  | `m_mbp`          | m devant m, b, p                     | `et_est`       |
| 6  | `ces_ses`        | ces / ses                            | `m_mbp`        |
| 7  | `on_ont`         | on / ont                             | `ces_ses`      |
| 8  | `verbe_ent`      | Le verbe au pluriel (-ent)           | `on_ont`       |
| 9  | `ce_se`          | ce / se                              | `verbe_ent`    |
| 10 | `accord`         | L'accord du nom et de l'adjectif     | `ce_se`        |
| 11 | `pluriel_al_aux` | Le pluriel en -al / -aux             | `accord`       |
| 12 | `e_er_ez`        | é ou -er à la fin du verbe           | `pluriel_al_aux` |

La notion `revision` (textes de synthèse) n'est pas dans l'ordre : elle sert
quand toutes les notions ci-dessus sont maîtrisées.

## Principe pédagogique

- **Niveau qui monte** : les textes vont de N1 (1-2 erreurs, phrases très
  simples) à N4 (souvent 1 seule erreur noyée dans un texte plus long). Le texte
  servi suit **le niveau de l'enfant** (repli sur le niveau disponible le plus
  proche), exactement comme l'escalier des maths.
- **Révision** intégrée : des textes reprennent une notion déjà vue pour
  consolider (réactivation), servis une fois la notion maîtrisée.
- **Mots fréquents choisis d'après la fréquence d'usage à l'école élémentaire**
  (repères : liste de fréquence lexicale Éduscol, échelle Dubois-Buyse), **sans
  recopier aucune liste protégée** — sélection originale, cohérente avec la
  notion et le niveau CE2.
- **Style enfant** : phrases courtes (2 à 4 phrases), vocabulaire concret,
  thèmes variés (dont un univers imaginaire : village breton, île tropicale,
  base spatiale, royaume enchanté, vallée des dinosaures, village gourmand),
  **aucun stéréotype de genre**.

## Les blocs de textes (regroupement d'écriture, 2 textes par bloc)

Les textes neufs ont été écrits par **blocs** (2 textes chacun). Le « bloc »
n'est qu'un **regroupement d'écriture** rattaché à une notion : il ne fixe aucun
calendrier. Le moteur ne raisonne que sur la **notion** et le **niveau**.

| Période | Bloc | Notion (label pédagogique) | Notion DB | Astuce enfant |
|---|---|---|---|---|
| P1 | 1  | Le pluriel des noms (ajouter -s) | `pluriel` | On ajoute un -s quand il y en a plusieurs : un chat → des chat**s** (pas « chat »). |
| P1 | 2  | Homophones **son / sont** | `son_sont` | *sont* = ils/elles être (on peut dire « ils étaient ») ; *son* = le sien. « Les enfants **sont** contents » (pas « son »). |
| P1 | 3  | Homophones **a / à** | `a_a` | *à* = vers un endroit (impossible de dire « avait ») ; *a* = il/elle avoir. « Il va **à** l'école » (pas « a »). |
| P1 | 4  | Homophones **et / est** | `et_est` | *est* = il/elle être (on peut dire « était ») ; *et* = pour relier deux mots. « Le chat **est** noir » (pas « et »). |
| P1 | 5  | Le son [m] devant **m, b, p** | `m_mbp` | Devant m, b, p on écrit **m** (jamais n) : tam**b**our, cham**b**re, im**p**ortant. |
| P1 | 6  | Homophones **ces / ses** | `ces_ses` | *ses* = les siens (à lui/elle) ; *ces* = ceux-là, celles-là. « Il range **ses** jouets » (pas « ces »). |
| P1 | 7  | Homophones **on / ont** | `on_ont` | *ont* = ils/elles avoir (on peut dire « avaient ») ; *on* = quelqu'un. « Les enfants **ont** fini » (pas « on »). |
| P2 | 8  | Le verbe au pluriel (**-ent**) | `verbe_ent` | Avec *ils/elles*, le verbe se termine toujours par **-ent** : ils chant**ent** (pas « chante »). |
| P2 | 9  | Homophones **ce / se** | `ce_se` | *se* devant un verbe qui parle de soi (il **se** lave) ; *ce* devant un nom (**ce** livre). |
| P2 | 10 | Accord de l'adjectif (genre et nombre) | `accord` | L'adjectif s'accorde avec le nom : des fleurs rouge**s** (pas « rouge »), une robe doré**e** (pas « doré »). |
| P2 | 11 | Pluriel des noms en **-al / -ail** (→ **-aux**) | `pluriel_al_aux` | Un che**val** → des che**vaux** (pas « des chevals ») ; un trav**ail** → des trav**aux**. |
| P2 | 12 | Infinitif **-er** ou participe **-é** | `e_er_ez` | Après un verbe conjugué, on garde l'infinitif : il va mang**er** (pas « mangé »). |
| P2 | 13 | **à / a** (révision **et / est**) | `a_a` | *à* = lieu, *a* = avoir ; *est* = être. « Il va **à** Paris et il **est** content. » |
| P2 | 14 | **son / sont** (révision **ces / ses**) | `son_sont` | *sont* = ils/elles être ; *ces* = ceux-là. « Ils **sont** contents de **ces** vacances. » |
| P3 | 15 | Le verbe au pluriel, formes variées | `verbe_ent` | ils arriv**ent**, elles constru**isent** : toujours **-ent** au pluriel, même pour un verbe difficile. |
| P3 | 16 | Accord nom-adjectif (cas plus difficiles) | `accord` | Une fumée noir**e**, des rivières profond**es** : l'adjectif s'accorde même loin du nom. |
| P3 | 17 | Le son [m] devant m/b/p (mots plus longs) | `m_mbp` | im**p**ortant, no**mb**reux, co**mb**iner : toujours **m** devant m, b, p, même dans un grand mot. |
| P3 | 18 | Pluriels en **-eau / -eu / -au / -ou** (→ **-x**) | `pluriel` | Un chap**eau** → des chap**eaux** ; un j**eu** → des j**eux** ; un cho**u** → des cho**ux**. |
| P3 | 19 | Pluriel en **-aux** (révision) | `pluriel_al_aux` | Un si**gnal** → des si**gnaux** ; un ca**nal** → des ca**naux**. |
| P3 | 20 | Révision mélangée (homophones, pluriels, accords, verbes) | `revision` | On relit chaque mot un par un : pluriel ? homophone ? accord ? verbe en -ent ? |
| P4 | 21 | Infinitif **-er** / participe **-é** (textes plus longs) | `e_er_ez` | Avant de partir, il faut prépar**er** (pas « préparé ») : même règle, texte plus long. |
| P4 | 22 | **ce / se** (textes plus longs) | `ce_se` | Il **se** lève tôt ; **ce** marché est animé : même règle, phrase plus longue. |
| P4 | 23 | Accord dans les phrases longues | `accord` | Une foule nombreu**se** et joyeu**se** : on accorde avec le nom, même s'il est loin dans la phrase. |
| P4 | 24 | Verbe au pluriel (sujet éloigné du verbe) | `verbe_ent` | « Les enfants, impatients, attend**ent** » : le sujet peut être loin, le verbe reste au pluriel. |
| P4 | 25 | **son / sont** (textes plus longs) | `son_sont` | Les joueurs **sont** accueillis (pas « son »), même à la fin d'une longue phrase. |
| P4 | 26 | Pluriel en **-aux** (textes plus longs) | `pluriel_al_aux` | De magnifiques co**raux** (pas « corail ») ; plusieurs si**gnaux** (pas « signal »). |
| P5 | 27 | Révision des homophones (mélange complet) | `revision` | On vérifie un par un : a/à, et/est, on/ont, son/sont, ce/se, ces/ses. |
| P5 | 28 | Accord (dernière révision) | `accord` | On accorde toujours avec le nom le plus proche, même séparé par « et ». |
| P5 | 29 | Verbe au pluriel (dernière révision) | `verbe_ent` | repart**ent**, s'install**ent**, rest**ent** : toujours **-ent** avec ils/elles. |
| P5 | 30 | Grande révision finale (tout mélangé) | `revision` | On relit toute la phrase : homophones, pluriels, accords, verbes en -ent. |
| P5 | 31 | Homophones **la / là** | `la_la` | *là* = l'endroit (ici, là-bas) ; *la* = article (« la chatte »). « Pose-le **là** » (l'endroit), « **la** chatte dort ». |
| P5 | 32 | Homophones **ou / où** | `ou_ou` | *où* = le lieu (ou le moment) ; *ou* = ou bien (un choix). « Dis-moi **où** tu vas », « une pomme **ou** une poire ». |

> Ajout **migration 0051** : notions `la_la` (ordre 13) et `ou_ou` (ordre 14),
> chacune avec 2 textes originaux et une faute plantée sur l'homophone.

## Mots fréquents à savoir écrire, par bloc

Chaque liste (8 à 12 mots) est pensée pour accompagner la notion du bloc
et glisser, quand c'est pertinent, un rappel sur d'autres sons/graphies
fréquents en CE2 (m devant m, b, p, g/gu/ge, c/ç, s/ss, é/er/ez). Des mots
invariables très fréquents sont répartis sur toute l'année.

**Bloc 1** — chat, chats, chien, chiens, ami, amis, jardin, jardins,
village, villages, dans, avec.

**Bloc 2** — son, sont, ils, elles, être, content, contents, toujours,
maintenant, chez.

**Bloc 3** — a, à, avoir, il, elle, école, alors, après, chez, depuis.

**Bloc 4** — et, est, être, noir, blanc, aussi, encore, beaucoup, jamais,
souvent.

**Bloc 5** — tambour, chambre, important, nombre, simple, ensemble,
campagne, septembre, décembre, combat.

**Bloc 6** — ces, ses, lui, elle, jouet, jouets, trousse, cahier, cahiers,
enfin.

**Bloc 7** — on, ont, avoir, fini, déjà, pendant, pourtant, quand, comment,
toujours.

**Bloc 8** — chantent, jouent, mangent, arrivent, tombent, dans, chaque,
ensemble, autour, jamais.

**Bloc 9** — ce, se, livre, lave, lève, couche, prépare, chaque, jour,
matin.

**Bloc 10** — rouge, rouges, grand, grande, grands, grandes, petit, petite,
beau, belle.

**Bloc 11** — cheval, chevaux, animal, animaux, journal, journaux, travail,
travaux, général, canal.

**Bloc 12** — manger, mangé, chanter, chanté, jouer, joué, donner, donné,
aller, partir.

**Bloc 13** — à, a, et, est, loin, près, toujours, souvent, alors, enfin.

**Bloc 14** — son, sont, ces, ses, vacances, contents, heureux, parfois,
bientôt, dehors.

**Bloc 15** — arrivent, partent, construisent, avancent, réparent, pendant,
dehors, ensemble, autour, encore.

**Bloc 16** — noir, noire, profond, profonde, immense, immenses, parfumé,
parfumée, joli, jolie.

**Bloc 17** — important, nombreux, combiner, emporter, septembre, novembre,
ensemble, simple, température, chambre.

**Bloc 18** — chapeau, chapeaux, jeu, jeux, bateau, bateaux, caillou,
cailloux, morceau, morceaux, cheveu, cheveux.

**Bloc 19** — signal, signaux, canal, canaux, hôpital, hôpitaux, métal,
métaux, végétal, végétaux.

**Bloc 20** — pêcheur, pêcheurs, rentrent, enfants, jouent, nager, hier,
aujourd'hui, demain, toujours.

**Bloc 21** — préparer, préparé, affronter, affronté, continuer, continué,
essayer, essayé, vérifier, terminer.

**Bloc 22** — se, ce, lève, couche, installe, marché, étal, région, tôt,
matin.

**Bloc 23** — joyeux, joyeuse, attentif, attentive, nombreux, nombreuse,
curieux, curieuse, silencieux, silencieuse.

**Bloc 24** — attendent, bruissent, repartent, installent, restent,
impatients, agité, agitée, déjà, encore.

**Bloc 25** — sont, son, accueillis, épuisés, heureux, public, famille,
stade, village, lanterne.

**Bloc 26** — corail, coraux, signal, signaux, vitrail, vitraux, local,
locaux, général, généraux.

**Bloc 27** — a, à, et, est, on, ont, son, sont, ce, se, ces, ses.

**Bloc 28** — joyeux, joyeuse, attentif, attentive, fier, fière, nombreux,
nombreuse, silencieux, silencieuse.

**Bloc 29** — repartent, installent, restent, choisissent, attendent,
jouent, chantent, arrivent, dehors, ensemble.

**Bloc 30** — toujours, souvent, parfois, jamais, déjà, bientôt, enfin,
pourtant, cependant, néanmoins.

## Sources et licences

- Programme de français du **cycle 2**, BO avril 2024 (education.gouv.fr).
- Éduscol, **« Français CE2 — Attendus de fin d'année »**.
- Éduscol, **« Repères CE2 2024 »**.
- Éduscol, **« Liste de fréquence lexicale »** (Licence Ouverte / Etalab) —
  utilisée uniquement comme repère de fréquence pour *choisir* des mots
  courants, jamais recopiée.
- Échelle d'acquisition de l'orthographe **Dubois-Buyse** — référence
  pédagogique classique pour situer la difficulté d'un mot à un niveau de
  scolarité ; utilisée comme repère, pas comme liste recopiée.

**Aucune liste existante n'a été recopiée.** Tous les textes de la banque
(existants et nouveaux) sont des productions **100 % originales**, écrites
pour Kerskol, avec un vocabulaire et des phrases adaptés au CE2.
