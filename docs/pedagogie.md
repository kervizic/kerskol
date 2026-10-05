# Référentiel pédagogique Kerskol

Ce document consigne les décisions de conception pédagogique de Kerskol : ce
sur quoi la recherche s'accorde, ce que Kerskol en retient concrètement, et les
méthodes retenues matière par matière. Les chiffres cités renvoient tous à une
source vérifiable listée en fin de document ; aucun n'a été estimé.

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

Quand plusieurs matières sont actives sur un profil (par exemple **maths + français**),
le choix des exercices d'une séance se fait selon les **besoins de l'enfant** sur
l'**ensemble des compétences actives des deux matières**, et **pas** matière par
matière. Concrètement (`frontend/src/domain/calcul/composer.ts`) :

- toutes les compétences actives et débloquées (maths **et** français) sont
  versées dans les **mêmes** réservoirs de besoin : **révisions dues**,
  **lacunes** (EMA courte < 0,7 ou niveau ≤ 1), **nouveautés** ;
- la répartition cible reste **~40 % révisions / ~40 % lacunes / ~20 %
  nouveauté**, c'est-à-dire par **catégorie de besoin**, jamais par matière ;
- il n'y a **aucun quota par matière** ni **tirage au sort de la matière** : une
  séance peut légitimement être majoritairement (voire entièrement) d'une
  matière si c'est là que sont les besoins du moment.

**Seul garde-fou de variété** : si au moins deux matières sont actives et que la
séance serait composée à **100 % d'une seule** alors qu'une **autre** matière
active a un besoin (révision, lacune ou nouveauté), on **remplace le dernier
exercice** (le moins prioritaire) par ce besoin de l'autre matière. On ne force
rien d'autre : le besoin reste le seul critère de sélection. Cette règle est
vérifiée par un test (`composer.test.ts`, « maths + francais »).

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

## Classe et passage en classe supérieure (règle validée, à implémenter avec le moteur de séance)

Chaque profil a une **classe** (CP à CM2, `profils.classe`, défaut CE2). Pour
l'instant, seul le **programme de CE2** (calcul) existe : une classe différente
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
