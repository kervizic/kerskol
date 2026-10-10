# Référentiel pédagogique Kerskol

Ce document consigne les décisions de conception pédagogique de Kerskol : ce
sur quoi la recherche s'accorde, ce que Kerskol en retient concrètement, et les
méthodes retenues matière par matière. Les chiffres cités renvoient tous à une
source vérifiable listée en fin de document ; aucun n'a été estimé.

## Règle de rédaction : bienveillance (décision de Manu, absolue)

Tous les contenus montrés à l'enfant sont **optimistes et pleins de
bienveillance** : pas de mort, pas de violence, pas de peur forte, pas d'enfant
malheureux / abandonné / puni / moqué, pas de catastrophe. **On ne coupe jamais
un texte pour le rendre acceptable : si un passage pose problème, le texte entier
est retiré** (décision de Manu, 9 octobre 2026). Les faits
scientifiques du programme restent possibles s'ils sont dits avec douceur (voir
le détail, la liste de mots interdits et la liste blanche dans
`docs/explications.md`, section « Règle de bienveillance »). Cette règle est
vérifiée automatiquement à chaque build (`bienveillance.test.ts` côté frontend,
`bienveillance_test.sql` côté serveur).

### Vérité historique vs bienveillance des récits (décision de Manu, 9 octobre 2026)

Il faut distinguer deux choses :

- **Les récits** (histoires, lectures, dictée détective, énoncés de maths,
  consignes de toutes les matières) restent sous la **bienveillance stricte** :
  pas de mort, pas de violence, pas de peur forte. C'est la règle générale
  ci-dessus, sans exception.
- **Le cours d'histoire dit la vérité**, sans l'adoucir (« n'adoucis pas
  l'Histoire »). La banque **histoire** (et elle seule) est **exemptée** de la
  bienveillance stricte : elle nomme factuellement, au niveau d'un bon manuel de
  CM1 et **sans détail gratuit ni macabre**, les faits que le programme exige -
  guerres de religion et massacre de la Saint-Barthélemy, traite et esclavage
  (millions d'Africains déportés, travail forcé, Code noir), conquête des
  Amériques, inégalités de la société d'ordres, violence de 1789 (prise de la
  Bastille).

Cette exemption est **limitée** (vocabulaire mesuré de guerre / mort /
esclavage) et **testée** : `estAutorise` pour les compétences `HIST.*` dans
`bienveillance.test.ts`, branche `HIST.%` dans `bienveillance_test.sql`. Les
autres matières (y compris la géographie, où les inégalités du monde sont dites
avec mesure et espoir) ne bénéficient d'aucune exemption. Un garde-fou de
« vérité historique » (`histoire.test.ts`) vérifie en sens inverse que le
vocabulaire factuel du programme reste bien présent, pour éviter qu'un futur
« adoucissement » ne réintroduise des euphémismes.

## Principes transverses

Deux techniques d'apprentissage ressortent avec une utilité forte dans la revue
de Dunlosky et al. (2013) : la **pratique de test** (se tester plutôt que
relire) et la **pratique espacée** (répartir les révisions dans le temps).
Trois autres techniques ont une utilité modérée et servent d'appoint :
l'entrelacement des types d'exercices, l'interrogation élaborative (« pourquoi
est-ce vrai ? ») et l'auto-explication.

L'effet de l'espacement est quantifié par la méta-analyse de Cepeda et al.
(2006) : dans les tâches de rappel étudiées, la rétention atteint 47 % avec un
apprentissage espacé contre 37 % en apprentissage massé. Réviser un peu chaque
jour bat donc réviser beaucoup d'un coup.

Sur le terrain scolaire, le Teaching and Learning Toolkit de l'Education
Endowment Foundation (EEF) attribue au **feedback** et à la **métacognition**
un gain d'environ huit mois de progression chacun, parmi les leviers les mieux
étayés et les moins coûteux.

Enfin, la revue d'Outhwaite et al. (UCL, 2023) est directement pertinente pour
une application : cinquante études, environ vingt-quatre mille enfants,
dix-huit pays. Les bénéfices sur les apprentissages mathématiques sont plus nets
quand l'application combine un **parcours à niveaux adaptatifs** et un
**feedback explicatif** (dire pourquoi une réponse est juste ou fausse), plutôt
qu'un simple « bravo / raté ».

Une réserve traverse tout le reste : l'**effet de renversement d'expertise**.
Une méthode efficace pour un débutant peut devenir inutile, voire nuisible, pour
un élève avancé, et inversement. La bonne méthode dépend du niveau de l'enfant
sur la compétence visée, pas de la compétence en général. C'est la raison d'être
du pilotage par niveaux décrit plus bas.

## Règles Kerskol

Kerskol traduit ces principes en règles opérationnelles.

Les séances reposent sur de **petits tests** fréquents et sur la **répétition
espacée** des compétences déjà vues. Les exercices sont **entrelacés par blocs
de deux à trois** compétences, pour éviter la monotonie d'un bloc unique tout en
gardant des blocs assez longs pour installer chaque notion.

Le niveau de l'enfant sur chaque compétence est suivi par deux moyennes
exponentielles mobiles (EMA) : une **courte** réactive (α ≈ 0,4) et une
**longue** stable (α ≈ 0,1). La courte reflète la forme du moment, la longue le
niveau installé ; leur écart donne la **tendance** (en progrès ou en train
d'oublier).

Le passage de niveau se fait avec **hystérésis** pour éviter les oscillations :
on **monte** quand l'EMA courte atteint au moins 0,8 sur au moins huit
exercices, on **descend** quand elle passe sous 0,5. La bande morte entre 0,5 et
0,8 stabilise le parcours.

À la **première apparition** d'une compétence, un **placement en escalier**
situe rapidement l'enfant : départ au niveau 1, +1 par bonne réponse, −1 par
erreur, réponses **à saisir** plutôt qu'en QCM (pour éviter le hasard), et il
faut **deux bonnes réponses d'affilée** pour valider le niveau le plus haut. Le
placement ne construit **pas** de monument dans le village : il situe, il ne
récompense pas.

La difficulté est réglée pour viser une **réussite de 75 à 85 %** : assez de
succès pour entretenir la confiance, assez d'obstacle pour apprendre.

Le **défi chrono** (jeu de rapidité optionnel, décrit dans `docs/motivation.md`)
est **exclu** de ce pilotage : ses réponses portent `mode = 'defi'` et n'entrent
**pas** dans le calcul des EMA ni des niveaux (`calc_progression` les ignore).
Il ne porte que sur des compétences **déjà acquises (niveau ≥ 3)** ; la vitesse
ne doit jamais faire baisser un niveau installé.

La métacognition reste **légère** et orale, par de courtes relances du type
« Comment tu as trouvé ? » ou « Tu es sûre ? », sans transformer la séance en
questionnaire.

## Composition d'une séance quand plusieurs matières sont actives

> **Révision du 10 octobre 2026 (décision de Manu).** On **favorise** les
> lacunes, on ne s'y **focalise** pas. L'ancienne règle « besoin seul, aucun
> quota par matière, ~40 % révisions / ~40 % lacunes / ~20 % nouveauté »
> sur-sélectionnait les maths : un enfant qui a déjà travaillé les maths (donc
> plein de lacunes et de révisions dues en maths) et jamais le français (donc
> coincé dans les 20 % de nouveauté) recevait des séances quasi « tout maths ».

Règles de composition (`frontend/src/domain/calcul/composer.ts`) :

- **Trois réservoirs de besoin**, à parts égales (~1/3 chacun), parcourus en
  **tourniquet** :
  - **lacunes** : EMA courte < 0,7 ou niveau ≤ 1 ;
  - **découvertes** : compétences **jamais travaillées** (niveau 0) des matières
    actives, abordées **vite** et **au niveau 1** ;
  - **consolidation variée** : révisions dues + compétences acquises.
  On favorise ainsi les lacunes **sans** s'y enfermer.
- **Équilibre entre matières** : quand une autre matière active a des candidats,
  les **maths ne dépassent pas ~40 %** des exercices. **Chaque matière active**
  ayant au moins une compétence jouable est **présente** si possible. Quand il y
  a **plus de matières actives que de blocs** (Iris : 7 matières pour 6 blocs),
  une **rotation équitable** (pilotée par la graine) sert une matière différente
  d'une séance à l'autre : aucune n'est jamais oubliée durablement.
- **Variété des exercices** : une compétence par **bloc de 2 items** ; une
  compétence n'est **jamais reprise** dans la séance. On garantit ainsi « **pas
  plus de 2 exercices du même type d'affilée**, ni plus de 2 de ce type dans la
  séance ». Les blocs sont **entrelacés par matière** (plus de gros paquet de
  maths suivi d'un gros paquet de français).

Ces règles sont vérifiées par `composer.test.ts` (compatibilité) et
`composer-equilibre.test.ts` (maths ≤ 40 %, présence de chaque matière,
découvertes au N1, variété, et simulation du profil réel d'Iris).

### Avant / après sur le profil réel d'Iris (CE2, lecture seule le 10/10/2026)

Iris a **7 matières actives** (maths, français, QLM, EMC, sciences, histoire,
géographie) mais une progression **concentrée sur les maths** : 18 compétences
de maths déjà travaillées (niveau moyen ~2,9), 1 de français, 1 d'EMC, **rien**
ailleurs.

- **Avant** (séance type de 12 exercices) : ~40 % révisions **maths** + ~40 %
  lacunes **maths** + ~20 % nouveauté tirée au hasard → environ **9 à 10
  exercices de maths** et **2 à 3** du reste, souvent le **même type** répété.
- **Après** : **au plus ~4** exercices de maths, les autres répartis entre les
  matières jamais faites (français, QLM, sciences, histoire, géo, EMC),
  **découvertes au niveau 1**, **4 matières minimum** par séance, et jamais le
  même type d'exercice plus de deux fois.

## Règle de correction

Une erreur **compte comme fausse** : elle vaut zéro et il n'y a **pas de
deuxième chance** sur le même exercice. Ce choix est assumé : la valeur
pédagogique vient de la correction qui suit, pas d'un droit à recommencer
jusqu'à tomber juste.

Immédiatement après l'erreur, Kerskol affiche une **correction expliquée** :
la bonne réponse **et** le chemin pour la trouver. Par exemple pour 7 × 8 :
« c'est le double de 7 × 4, soit 28 + 28 = 56 ». Le ton est **bienveillant mais
clair** — « Ce n'est pas ça, voici comment trouver » — sans dramatiser ni
minimiser.

Un exercice **similaire, mais non identique**, revient plus tard dans la même
séance : l'enfant a l'occasion de rejouer la compétence une fois la méthode
comprise, sans réciter par cœur la réponse précédente.

Chaque exercice porte donc un **champ « correction »**. Pour le calcul, il est
**généré par le code** (décomposer, passer par la dizaine, utiliser les
doubles). Pour le français et les problèmes, il est **rédigé** et renvoie vers
la leçon correspondante.

## Règle de format de réponse : QCM aux niveaux faciles, réponse libre au N4

Décision transverse (s'applique aux maths aujourd'hui, au français et aux autres
matières plus tard, dès qu'elles auront des exercices à niveaux).

Le **QCM** (choix parmi des options) est réservé aux **niveaux faciles**, surtout
le **niveau 1**, pour amorcer une notion en douceur. Au **niveau le plus
difficile (N4)**, la réponse est **saisie librement** dès que c'est pertinent :
l'enfant écrit sa réponse plutôt que de la choisir, ce qui supprime le hasard du
QCM et vérifie une maîtrise réelle. Cette règle prolonge la règle de placement
(réponses à saisir plutôt qu'en QCM) et la règle de format du référentiel de
calcul (QCM au seul niveau 1, saisie ensuite).

**Ce qui compte comme réponse libre.** Une saisie à **boutons** (steppers,
touches) ou au **pavé** est une **réponse libre** : l'enfant **produit** sa
réponse. Seul le **choix parmi des propositions affichées** est un **QCM**. Régler
une horloge avec des boutons, composer une somme en touchant des pièces, écrire
un nombre en lettres au clavier : tout cela est de la réponse libre, pas du QCM.

Déclinaison concrète côté calcul :

- **Fractions** : au N1, QCM pour nommer la fraction coloriée ; dès le N2, saisie
  libre du **numérateur** et du **dénominateur** (deux cases séparées par une
  barre, pavé tactile + clavier).
- **Heure** : horloge à aiguilles réglée par **boutons** (+1/+3 h, +1/+5/+15 min,
  icônes de remise à zéro) à **tous les niveaux**. Ces boutons sont une réponse
  libre ; au N4 (pas d'une minute) ils couvrent n'importe quelle minute. Il n'y a
  **pas** de pavé de chiffres pour l'heure.
- **Ranger / comparer / numération / droite graduée** : saisie numérique libre
  quand c'est faisable (ex. « écris le plus grand de ces nombres » au lieu d'un
  QCM au N4).
- **Unités et conversions** : saisie numérique libre (ex. « 3 m = … cm ») ;
  le choix d'une unité par QCM reste cantonné au N1.
- **Lire / écrire un nombre** (`MA.NUM.LIRE_ECRIRE`) : au N1, QCM pour **lire** un
  nombre (choisir son écriture en lettres) ; aux N2-N3, écrire le nombre en
  **chiffres** ; au **N4**, l'enfant **écrit le nombre en toutes lettres** dans un
  **champ texte libre** (clavier de l'appareil, correcteur désactivé). Le serveur
  accepte l'orthographe **traditionnelle** et **rectifiée 1990**, et un
  **diagnostic déterministe** nomme la faute (accord vingt/cent/mille, trait
  d'union, « et un », orthographe, mauvais nombre) pour une correction ciblée.

Le **contrat de sécurité serveur est inchangé** : qu'elle vienne d'un QCM ou
d'une saisie libre, la réponse envoyée reste la **valeur** (jamais un index), et
`verif_calcul` la recalcule. Passer un exercice en saisie libre ne change donc
pas le contrat.

## Boîte à méthodes par matière

Chaque matière dispose de plusieurs méthodes, ordonnées grossièrement du plus
concret au plus abstrait. Les numéros entre parenthèses indiquent une
progression indicative selon le niveau.

**Mathématiques.** Approche de Singapour, du concret à l'imagé puis à l'abstrait,
avec le modèle en barres (niveau 1). Nuance importante : rien ne prouve qu'une
« méthode de Singapour » soit transférable telle quelle hors de son contexte
(cf. le rapport Villani-Torossian de 2018 et les analyses de la COPIRELEM et de
l'université de Rouen) ; Kerskol en retient les gestes concrets, pas une étiquette.
On enchaîne avec des **exemples résolus puis progressivement estompés**
(niveaux 1 à 2), la **variation** (*bianshi*, Gu et al. 2004 ; travaux du NCETM
et échanges avec Shanghai) qui fait varier un paramètre à la fois (niveau 3),
puis l'approche japonaise **problème d'abord** (*hatsumon* / *neriage*, Stigler
& Hiebert 1999) où l'enfant cherche avant qu'on explique (niveau 4). Pour le
sens du nombre, le **plateau linéaire numéroté** (Ramani & Siegler 2008 ;
Siegler & Ramani 2009) : un plateau **linéaire** aide, un plateau **circulaire**
non.

**Résolution de problèmes.** Instruction par **schémas** (types de problèmes
reconnaissables : réunion, comparaison, transformation), étayée par les essais
de Jitendra et al. (2007, puis essai contrôlé 2013) et Zhang & Xin (2012). On
utilise aussi des **problèmes sans nombres**, pour travailler la structure avant
le calcul. Kerskol implémente ces schémas sous forme de **modèle en barres**
(tout/parties, comparaison) : aide optionnelle pendant la recherche (l'inconnue
reste « ? ») et correction systématique. Les problèmes à **une étape** (additifs,
multiplicatifs, monnaie) puis à **deux étapes** (premiers exercices mixtes) sont
décrits dans `docs/referentiel-calcul.md` (compétences `MA.PB.*`).

**Géométrie.** Progression de **van Hiele** (du visuel à l'analytique) et
**entraînement spatial**, dont l'efficacité est bien établie : la méta-analyse
d'Uttal et al. (2013) porte sur 217 études et donne un effet moyen g = 0,47,
qui monte à 0,61 chez les moins de treize ans, avec des effets durables et un
transfert vers des tâches non entraînées.

**Français.** Relecture avec **modèle audio** pour la fluence, **dictées son par
son**, **lecture réciproque** (questionner, clarifier, résumer, prédire :
l'essai « Reciprocal Reading » de l'EEF, mené dans 98 écoles, montre environ
deux mois de progrès supplémentaires chez les 8-11 ans en difficulté), et
travail de **morphologie** par familles de mots (Bowers, Kirby & Deacon 2010,
vingt-deux études).

**Anglais.** Priorité à l'**input audio**, **chansons originales écoutées de
façon espacée**, **vocabulaire en répétition espacée** et **gestes** (TPR).
L'effet des gestes sur la mémoire est bien soutenu ; les essais TPR eux-mêmes
sont plus modestes, et Kerskol le reconnaît plutôt que de le surestimer.

## Sélection des méthodes

Puisque la bonne méthode dépend du niveau (renversement d'expertise), Kerskol ne
choisit pas une méthode une fois pour toutes. Chaque exercice est **étiqueté par
la méthode** qu'il incarne. Une **EMA par méthode et par enfant** mesure ce qui
marche pour cet enfant précis. Un **plancher** garantit qu'aucune méthode n'est
jamais totalement abandonnée : même une méthode peu efficace pour un enfant
donné reste testée de temps en temps, car son profil peut évoluer.

## Contexte international

Ces choix s'inscrivent dans un constat mesuré. En mathématiques au niveau CM1,
TIMSS 2023 place en tête Singapour (615), Taïwan (607), la Corée (594),
Hong Kong (594) et le Japon (591) ; la France se situe sous les moyennes de
l'Union européenne et internationale. En lecture, PIRLS 2021 place en tête
Singapour (587), l'Irlande (577) et Hong Kong (573), la France à 514.

Ces écarts ne se réduisent pas à une « méthode miracle » importable, mais ils
indiquent des directions de travail robustes : espacement, tests fréquents,
feedback explicatif, entraînement spatial.

## À approfondir

Deux chantiers restent ouverts : la **comparaison des programmes de CE2** entre
Singapour, le Japon, l'Irlande, l'Angleterre et la Pologne, pour aligner la
progression des contenus ; et le recensement des **applications évaluées par
essais contrôlés**, pour importer ce qui a fait ses preuves plutôt que ce qui se
vend bien.

## Sources

- Dunlosky, J. et al. (2013). *Improving Students' Learning With Effective Learning Techniques*. Psychological Science in the Public Interest. <https://journals.sagepub.com/doi/10.1177/1529100612453266>
- Cepeda, N. J. et al. (2006). *Distributed practice in verbal recall tasks: A review and quantitative synthesis*. Psychological Bulletin. <https://pubmed.ncbi.nlm.nih.gov/16719566/>
- Education Endowment Foundation. *Teaching and Learning Toolkit* (feedback, métacognition). <https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit>
- Outhwaite, L. A., Early, E., Herodotou, C. & Van Herwegen, J. (2023). *Understanding how educational maths apps can enhance learning*. British Journal of Educational Technology / UCL. <https://bera-journals.onlinelibrary.wiley.com/doi/full/10.1111/bjet.13339> — version UCL : <https://discovery.ucl.ac.uk/id/eprint/10170561/1/Outhwaite%20et%20al.%202023.pdf>
- Ministère de l'Éducation nationale (2018). *Rapport Villani-Torossian, 21 mesures pour l'enseignement des mathématiques*. <https://www.education.gouv.fr/21-mesures-pour-l-enseignement-des-mathematiques-3242>
- Gu, L., Huang, R. & Marton, F. (2004). *Teaching with variation (bianshi)*. Voir aussi NCETM Mastery. <https://www.ncetm.org.uk/teaching-for-mastery/mastery-explained/>
- Stigler, J. W. & Hiebert, J. (1999). *The Teaching Gap* (hatsumon / neriage). <https://www.jamesstigler.net/the-teaching-gap>
- Ramani, G. B. & Siegler, R. S. (2008) ; Siegler, R. S. & Ramani, G. B. (2009). *Plateaux numériques linéaires vs circulaires*. <https://www.researchgate.net/publication/227686492>
- Jitendra, A. K. et al. (2007 ; essai contrôlé 2013). *Schema-based instruction*. <https://journals.sagepub.com/doi/10.1177/0022219413487408>
- Zhang, D. & Xin, Y. P. (2012). *A follow-up meta-analysis for word-problem-solving interventions*. Journal of Educational Research. <https://www.tandfonline.com/doi/abs/10.1080/00220671.2011.627397>
- Uttal, D. H. et al. (2013). *The Malleability of Spatial Skills: A Meta-Analysis of Training Studies*. Psychological Bulletin, 139(2), 352-402. <https://groups.psych.northwestern.edu/uttal/vittae/documents/ContentServer.pdf>
- Education Endowment Foundation. *FFT Reciprocal Reading — trial*. <https://educationendowmentfoundation.org.uk/projects-and-evaluation/projects/reciprocal-reading>
- Bowers, P. N., Kirby, J. R. & Deacon, S. H. (2010). *The effects of morphological instruction on literacy skills: A systematic review*. Review of Educational Research. <https://journals.sagepub.com/doi/10.3102/0034654309359353>
- van Hiele, P. M. *The van Hiele model of geometric thought*. <https://en.wikipedia.org/wiki/Van_Hiele_model>
- TIMSS 2023, résultats mathématiques CM1 (grade 4). <https://timss2023.org/results/grade-4-math-achievement/>
- PIRLS 2021, résultats en lecture. <https://pirls2021.org/results/>

### Programmes officiels (contenu CE1, programme 2024 cycle 2)

Le contenu CE1 suit le **programme 2024 du cycle 2** et les **attendus de fin
d'année de CE1** publiés par Éduscol :

- **Mathématiques CE1**, attendus de fin d'année (nombres ≤ 1 000 ; tables
  ×2, ×3, ×4, ×5 ; addition et soustraction posées ; problèmes 1-2 étapes ;
  grandeurs ; heure en heures/demi-heures).
  <https://eduscol.education.gouv.fr/sites/default/files/document/04-maths-ce1-attendus-eduscol1114734pdf-74628.pdf>
  — programme cycle 2 : <https://www.education.gouv.fr/media/194205/download>
- **Français CE1**, attendus de fin d'année (étude de la langue : grammaire,
  conjugaison, orthographe, lexique).
  <https://eduscol.education.gouv.fr/sites/default/files/document/03-francais-ce1-attendus-eduscol1114733pdf-74625.pdf>
  — programme cycle 2 : <https://www.education.gouv.fr/media/194199/download>

### Programmes officiels (contenu CM1, rentrée 2026)

Les matières d'éveil du CM1 suivent les **nouveaux programmes** applicables à la
rentrée 2026 (le contenu CM1 livré en 0098-0101 suivait l'ancien programme et a
été refait en 0103-0106) :

- **Histoire-géographie, cycle 3** (annexe 4). CM1 histoire : Moyen Âge (vie
  quotidienne), monarchie XVIe-XVIIe, explorations et conquêtes (traite et
  esclavage), 1789. CM1 géographie : la diversité des modes de vie dans le monde
  (se nourrir, inégalités, se déplacer, communiquer avec Internet).
  <https://www.education.gouv.fr/sites/default/files/document/annexe-4-programme-d-histoire-geographie-cycle-3-516779.pdf>
- **Sciences et technologie, cycle 3** - arrêté du 5 juin 2026, BO n° 24 du
  11 juin 2026 (en vigueur au CM1 à la rentrée 2026 ; annexe 2 pour les attendus
  « Cours moyen première année »).
  <https://www.education.gouv.fr/bo/2026/Hebdo24/MENE2611650A> —
  <https://www.education.gouv.fr/sites/default/files/document/annexe-2-programme-de-sciences-et-technologie-du-cycle-3-519023.pdf>
- **Enseignement moral et civique** - programme 2024, BO n° 24 du 13 juin 2024
  (mise en œuvre progressive 2024-2026). Attendu CM1 ajouté : la laïcité.
  <https://www.education.gouv.fr/media/160329/download>

## Classe et passage en classe supérieure (règle validée, à implémenter avec le moteur de séance)

Chaque profil a une **classe** (CP à CM2, `profils.classe`, défaut CE2). Les
programmes **CE1, CE2 et CM1** sont disponibles (`CLASSES_DISPONIBLES`,
`lib/types.ts`). Le **CE1** est ouvert en
réutilisant les moteurs existants (portée `classe_min='CE1'`, banques N1
vérifiées de niveau CE1 ; aucun impact sur un profil CE2 car `classe_max` reste
≥ CE2) : maths (migrations 0114-0115, voir `docs/referentiel-calcul.md`),
français (0116, voir `docs/referentiel-francais.md`), Questionner le monde
(0117, programme cycle 2 en vigueur) et EMC / vivre ensemble (0118, domaine
sensibilité). La dictée détective, la compréhension de lecture CE1, ainsi que la
République et les écrans en EMC restent à ouvrir après vérification des textes /
attendus. Une classe encore non couverte (CP, CM2)
affiche côté parent « Programme de <classe> bientôt disponible : en attendant,
ton enfant s'entraîne sur le calcul de CE2 », sans bloquer.

Règle de progression (future, non implémentée ici) :

- Quand l'enfant atteint **« acquis »** (niveau 4, confirmé par une révision
  espacée) sur **TOUTES les compétences de TOUS les modules** de sa classe,
  l'espace parent propose le **passage à la classe suivante** en **un clic**,
  **journalisé** (`journal_reglages`, clé `classe`). Le passage se fait pour la
  **classe entière**, jamais module par module.
- À la **rentrée (septembre)**, l'espace parent propose aussi le passage en
  classe supérieure.
- Les notions déjà **acquises restent en révision espacée** après le passage
  (elles ne sont pas ré-apprises, seulement entretenues).

Le changement de classe est horodaté (`profils.classe_maj_le`) et journalisé.

## Dictée détective : choix du texte PAR NIVEAU et par notion (aucun calendrier)

Le texte de la dictée n'est **plus tiré au hasard**. Décision de Manu : **on
n'est pas un prof mais une app ; comme en maths, tout se joue par niveau, pas par
le temps.** Il n'y a **aucune date, aucune semaine, aucune rentrée.** Les notions
sont **ordonnées** (table `dictee_notion` : ordre + prérequis, voir
`docs/progression-dictee-notions.md`) et chaque notion a son **suivi en escalier**
(table `dictee_notion_suivi` : série de réussites consécutives → maîtrise à **2
d'affilée**, remise à zéro à chaque échec).

Règle de choix (fonction pure `choisirTexteDictee`,
`frontend/src/domain/francais/selection-dictee.ts`, testée par
`selection-dictee.test.ts`), dans l'ordre :

1. **Niveau de l'enfant** (repli : le niveau disponible le plus proche), comme
   l'escalier des maths.
2. **Pas de répétition** : on évite les **derniers textes faits** (10 derniers,
   table `dictee_vu`, par **compte** et non par date), sauf si tout a déjà été vu
   (jamais de blocage).
3. **Notion à travailler**, dans l'ordre : d'abord les **lacunes** (notion la
   plus en difficulté : série à 0 et des échecs) ; puis la **1re notion non
   maîtrisée** dans l'ordre (la frontière) ; puis la **révision** (`revision`)
   quand tout est maîtrisé.

Un enfant avance donc **aussi vite que son niveau le permet** : trois jours
suffisent à franchir plusieurs notions s'il réussit.

Le serveur reste **source de vérité** du suivi via `dictee_contexte(profil)`, qui
expose seulement : l'**ordre** des notions, la **maîtrise** et les **lacunes** par
notion, et les ids des **derniers textes vus**. Il n'expose **jamais** les
erreurs plantées. Après chaque dictée, `dictee_enregistrer(profil, texte,
correct)` marque le texte vu et met à jour le suivi de sa notion. Repli
silencieux : si le contexte est indisponible, la dictée reste jouable (choix par
niveau).
