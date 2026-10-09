# Référentiel français (CE2)

Matière `FR` (« Français »). Ce document décrit les compétences de français
ajoutées à Kerskol et leur ancrage au programme. Il complète
`docs/referentiel-calcul.md` (maths).

## Programme de référence

Programme de français du **cycle 2** (BO avril 2024) et ressources Éduscol
« Attendus de fin d'année » / « Repères CE2 2024 ». Pour la conjugaison, le
programme CE2 prévoit la mémorisation du **présent, de l'imparfait, du futur et
du passé composé** de l'indicatif, pour **être, avoir et les verbes du 1er
groupe**, ainsi que les verbes irréguliers fréquents (aller, dire, faire,
pouvoir, prendre, venir, voir, vouloir).

Sources :
- Programme de français du cycle 2, avril 2024 (education.gouv.fr).
- Éduscol, « Français CE2 — Attendus de fin d'année » et « Repères CE2 2024 ».

## Compétences livrées : GRAMMAIRE — les accords (CM1, migration 0089)

Trois compétences d'accord (domaine `grammaire`, portée CM1..CM2, 4 niveaux,
moteur `grammaire_item` réutilisé, aucune nouvelle UI) :

| Code | Libellé | Notion |
|------|---------|--------|
| `FR.GRAM.ACCORD_SV` | Accorder le verbe avec son sujet | sujet éloigné ou inversé |
| `FR.GRAM.ACCORD_GN` | Accorder dans le groupe nominal | adjectifs multiples, complément du nom |
| `FR.GRAM.ACCORD_PP` | Accorder le participe passé (être) | accord avec le sujet |

Formats : N1 QCM (choisir la forme), N2 clic (montrer le sujet / le nom / le
participe), N3 QCM (sujet séparé ou inversé, plusieurs adjectifs, complément du
nom), N4 **texte** (recopier la forme bien accordée : réponse libre). Prérequis :
`ACCORD_SV` ← `SUJET_VERBE` n2 ; `ACCORD_GN` et `ACCORD_PP` ← `GROUPE_NOMINAL`
n2. Golden grammaire global = **162 items**.

## Bibliothèque CM1 et compréhension (lot 4)

Quatre textes du domaine public (cycle 3, `utilisable=oui`, `ton=garde`, jamais
coupés) ajoutés à la page Bibliothèque (`frontend/.../francais/bibliotheque.ts`,
classe `CM1`) : Gautier « Premier sourire du printemps », Andersen « La Princesse
sur un pois », Ségur « La poupée de cire au soleil », Colette « Le matin du grand
départ ». Chacun reçoit **4 questions de compréhension** (N1 QCM info, N2 sens
d'un mot, N3 inférence, N4 réponse libre) dans `comprehension.ts` +
`comprehension_item` (migration 0091, golden **208**). Extraits exacts des
auteurs ; aucun nom de mois dans les questions (le poème de Gautier en contient,
on choisit d'autres strophes). Serveur seul juge (op `lire`).

## Copier et écrire CM1 (lot 5)

Deux compétences additives (moteur `ecriture_item` + `verif_ecriture` réutilisés,
aucune nouvelle UI), portée CM1..CM2, migration 0092, golden **32** :

| Code | Libellé | Contenu |
|------|---------|---------|
| `FR.ECR.COPIE_CM1`  | Recopier des phrases plus longues | phrases avec connecteurs (puis, ensuite, car, mais, enfin) ; N4 copie différée |
| `FR.ECR.GUIDEE_CM1` | Écrire au passé simple et en autonomie | N1-N3 transformer au passé simple (branché lot 1) ; N4 phrase libre, check-list CM1 (≥ 8 mots, « puis » imposé) |

Serveur seul juge (op `ecr`). La phrase libre N4 est enregistrée pour relecture
par le parent (`ecriture_production`).

## Compétences livrées : CONJUGAISON

Quatre compétences, **4 niveaux** chacune :

| Code | Libellé | Temps |
|------|---------|-------|
| `FR.CONJ.PRESENT`   | Conjuguer au présent    | présent de l'indicatif |
| `FR.CONJ.FUTUR`     | Conjuguer au futur      | futur de l'indicatif |
| `FR.CONJ.IMPARFAIT` | Conjuguer à l'imparfait | imparfait de l'indicatif |
| `FR.CONJ.PASSE_COMPOSE` | Conjuguer au passé composé | passé composé de l'indicatif (voir plus bas) |
| `FR.CONJ.PASSE_SIMPLE` | Conjuguer au passé simple | passé simple, **3e personnes** (CM1) |
| `FR.CONJ.IMPERATIF` | Conjuguer à l'impératif | impératif présent (CM1) |

**Ouverture (prérequis)** : `FR.CONJ.PRESENT` est ouverte d'emblée. Toutes les
autres (`FUTUR`, `IMPARFAIT`, `PASSE_COMPOSE`, `PASSE_SIMPLE`, `IMPERATIF`)
s'ouvrent après **le présent niveau 2** (table `competence_prerequis`,
`niveau_min = 2`).

### CM1 : passé simple et impératif (migration 0088)

Deux temps CM1 ajoutés à la **même table de référence** `public.conjugaison`
(codes temps **5 = passé simple**, **6 = impératif**) ; `verif_conjugaison` est
inchangée et le serveur reste seul juge (op `conj`, `p_a = 5` ou `6`). Miroir
exact de `frontend/src/domain/francais/conjugaison-cm1.ts` (golden `cm1Golden()`
+ `supabase/tests/conjugaison_cm1_test.sql`).

- **Passé simple** — seulement les **3e personnes** (il = 3, ils = 6), comme on
  le rencontre dans les histoires. Verbes : les 7 verbes en -er, les cas -ger/-cer
  (manger, placer), et être, avoir, aller, faire, dire, venir, prendre, voir.
  Terminaisons : `il chanta` / `ils chantèrent` ; `il fut` / `ils furent`.
- **Impératif présent** — **tu (2), nous (4), vous (5)**, **sans sujet** (c'est
  un ordre, phrase terminée par « ! ») ; un indice « (tu) / (nous) / (vous) »
  dit à qui on parle. Piège clef : le **« tu » des verbes en -er n'a pas de s**
  (`chante !`, pas `chantes !`). Verbes : les mêmes + finir (finis/finissons/
  finissez). être → sois/soyons/soyez ; avoir → aie/ayons/ayez.

Étagement (4 niveaux) : N1 verbes en -er (passé simple = il seul ; impératif =
tu seul, pour travailler le « pas de s ») ; N2 ajoute -ger/-cer + verbes
fréquents (être/avoir/aller…) et toutes les personnes du temps ; N3 ajoute des
irréguliers et **mélange les temps** dans les propositions ; N4 **saisie libre**.
Le diagnostic cible les **terminaisons** (voir `docs/explications.md`).

### Verbes couverts

- **être**, **avoir** ;
- **1er groupe régulier** : chanter, jouer, aimer, regarder, donner, trouver,
  parler ;
- **cas orthographiques** (niveau haut, avec parcimonie) : **manger** (-ger),
  **placer** (-cer) ;
- **irréguliers fréquents** : aller, dire, faire, pouvoir, prendre, venir, voir,
  vouloir.

Soit 19 verbes × 3 temps × 6 personnes = **342 formes** de référence.

### Personnes

1 = je/j', 2 = tu, 3 = il/elle/on, 4 = nous, 5 = vous, 6 = ils/elles.
L'**élision « j' »** est gérée à l'affichage (« j'ai », « j'étais ») : la forme
comparée reste la forme verbale seule.

### Format « phrase à compléter » (validé par Manu, octobre 2025)

Les phrases à trous « . . . » n'étaient pas compréhensibles pour un enfant de
8 ans. Nouveau format commun aux quatre temps :

1. **Titre-consigne** : « Conjugue le verbe ÊTRE … » (verbe à l'infinitif **EN
   MAJUSCULES**).
2. **Indication du temps selon le niveau** (ci-dessous).
3. La phrase avec une **CASE visible** à la place des « … » (plus de points) ;
   le **sujet est mis en couleur** (c'est lui qui décide de la forme).
4. **Propositions en gros boutons empilés** (l'un sous l'autre), grande zone
   tactile — aux niveaux 1 à 3.
5. Après la réponse, la **phrase COMPLÈTE** s'affiche avec la bonne forme dans
   la case (c'est cette phrase que la voix lira plus tard : clé voix prévue,
   `conjPhrase.voixCle` ; **aucun audio n'est généré** pour l'instant).

Repères en mots d'enfant : présent = aujourd'hui / en ce moment ; futur =
demain ; imparfait = avant / autrefois ; passé composé = hier / c'est déjà fait.

### Progression par niveau (décisions pédagogiques)

- **N1** — propositions ; titre « … au <temps> » **+ repère en mots d'enfant
  sous le titre** ; être/avoir + 1er groupe régulier ; personnes je/tu/il.
- **N2** — propositions (distracteurs plus fins : mauvaise personne ET forme
  d'un autre temps) ; **nom du temps seul**, sans repère ; toutes les personnes.
- **N3** — propositions ; **aucun temps indiqué**, mais la phrase contient
  **toujours un mot repère** (« En ce moment, … », « Demain, … »,
  « Autrefois, … », « Hier, … ») ; les propositions **mélangent des formes de
  temps DIFFÉRENTS** du même verbe et de la même personne (ex. est / sera /
  était / a été) pour que le repère serve vraiment ; être/avoir + 1er groupe
  (+ manger/placer) ; toutes les personnes.
- **N4** — comme N3 mais **réponse LIBRE** saisie dans la case (pas de
  propositions) ; tous les verbes (irréguliers inclus) ; **sujet nominal** pour
  les 3e personnes (« Hier, les enfants … »).

Un QCM envoie la **valeur** (la forme) choisie, jamais un index ; une saisie à
boutons ou au clavier = réponse libre. La **vérification SERVEUR est inchangée**
(op 'conj') : le mot repère et le mélange des temps ne vivent que côté client
(génération + diagnostic).

### Vérification SERVEUR

Table `public.conjugaison (verbe, temps, personne, forme)` seedée avec les 342
formes (migration `0031`). `verif_conjugaison(verbe, temps, personne, saisie)`
normalise la saisie (`normaliser_lettres` : minuscules, espaces, apostrophes) et
la compare à la forme de référence. **Les accents sont EXIGÉS** : une forme sans
le bon accent (ou sans la cédille) est **fausse**, mais diagnostiquée `ACCENT`.

Opération normalisée `op = 'conj'` dans `enregistrer_reponse` :
`p_op2` = le verbe, `p_a` = le temps (1 présent, 2 futur, 3 imparfait),
`p_b` = la personne (1..6), `p_reponse_texte` = la saisie, `p_type_faute` =
diagnostic client (INDICATIF). Le serveur reste **seul juge** du juste/faux.

**Test croisé front ↔ SQL** : la table SQL et la table TS
(`frontend/src/domain/francais/conjugaison.ts`) donnent exactement les mêmes
formes. Le seed SQL est **généré** depuis la table TS ; `conjugaison.test.ts`
(golden vitest) verrouille la table TS, et `supabase/tests/conjugaison_test.sql`
vérifie les 342 lignes + un spot check côté base.

### Diagnostic déterministe (ordre)

Règles ordonnées, la **première** qui matche donne le type ; au plus 2 fautes
(ici toujours 1, règles exclusives) ; partie fautive surlignée ; type enregistré
(y compris `INCONNU`).

1. **JUSTE** — forme exacte (accents compris).
2. **ACCENT** — identique une fois les accents retirés (« etes » pour « êtes »).
3. **MAUVAISE_PERSONNE** — forme correcte d'une autre personne au même temps
   (« tu chantes » au lieu de « il chante »).
4. **MAUVAIS_TEMPS** — forme du même verbe à un autre temps.
5. **TERMINAISON** — bon radical, mauvaise fin (« je chantes »).
6. **ORTHO_RADICAL** — radical mal orthographié (distance d'édition ≤ 2).
7. **INCONNU** — repli.

Les messages affichés sont listés dans `docs/explications.md` (section
Conjugaison) et dans `frontend/src/domain/diagnostic/conjugaison.ts`
(`MESSAGES_CONJUGAISON`).

## Passé composé — LIVRÉ (migration 0037)

4e compétence de conjugaison : **`FR.CONJ.PASSE_COMPOSE`** (« Conjuguer au passé
composé »), **4 niveaux**, ouverte après **le présent niveau 2** (comme futur /
imparfait). Temps **composé** : auxiliaire (avoir / être) au présent + participe
passé.

### Verbes couverts (20)

être, avoir, aller, faire, dire, venir, pouvoir, voir, vouloir, prendre, finir
(2e groupe, nouveau) + 1er groupe (chanter, jouer, aimer, regarder, donner,
trouver, parler, manger, placer). Seuls **aller** et **venir** utilisent
l'auxiliaire **être** ; tous les autres l'auxiliaire **avoir**.

### Accord (décision CE2)

Accord du participe **avec être seulement** (elle est allée, ils sont venus),
**pas de COD** (participe invariable avec avoir : « elle a mangé »). Pour lever
l'ambiguïté de genre : le **genre est imposé** aux 3e personnes (sujet « il /
elle », « ils / elles » ou nominal « La fille … ») ; pour **je/tu/nous/vous**,
les **deux écritures m/f sont acceptées** (« je suis allé » comme « je suis
allée »). C'est le choix retenu pour rester juste sans surcharger un enfant de
CE2.

### Progression par niveau

Même format « phrase à compléter » que les temps simples (titre-consigne, case,
propositions empilées, phrase complète après réponse).

- **N1** — propositions ; « … au passé composé » + repère (hier / c'est déjà
  fait) ; 1er groupe + aller ; personnes je/tu/il.
- **N2** — propositions (distracteurs : mauvais auxiliaire, mauvais temps,
  mauvais accord) ; nom du temps seul ; toutes les personnes ; + venir, être,
  avoir.
- **N3** — propositions ; aucun temps indiqué, phrase avec « Hier, … » ; les
  propositions **mélangent les temps** (ex. va / ira / allait / est allée) ;
  1er groupe + être/avoir + aller/venir + faire/dire.
- **N4** — **saisie libre** (phrase avec « Hier, … ») ; **tous** les verbes
  (participes irréguliers) ; sujet nominal genré pour il/ils.

### Vérification SERVEUR

Table de référence dédiée `public.conjugaison_pc (verbe, personne, genre,
auxiliaire, forme)` (240 lignes = 20 verbes × 6 personnes × 2 genres ; pour les
verbes avec avoir, m et f sont identiques). `verif_passe_compose(verbe, personne,
genre, saisie)` normalise (accents EXIGÉS) et compare ; `genre` = 0 (masculin),
1 (féminin) ou **NULL = libre** (m OU f acceptés). Opération réutilisée `op =
'conj'` avec **`p_a = 4`** (passé composé) : `p_op2` = verbe, `p_b` = personne,
`p_c` = genre (0/1/NULL), `p_reponse_texte` = la saisie. Le serveur reste **seul
juge**. Test croisé front ↔ SQL : golden `pcGolden()`
(`frontend/src/domain/francais/passe-compose.ts`) + `passe_compose.test.ts` +
`supabase/tests/passe_compose_test.sql`.

### Diagnostic déterministe (ordre)

1. **JUSTE** ; 2. **ACCENT** (sans accent) ; 3. **MAUVAIS_TEMPS** (temps simple :
« il mangeait ») ; 4. **AUXILIAIRE** (« il a allé ») ; 5. **ACCORD** (« elle est
allé ») ; 6. **PARTICIPE** (« il a prendu ») ; 7. **INCONNU**. Messages enfant
listés dans `docs/explications.md` (section passé composé) et dans
`frontend/src/domain/diagnostic/passe-compose.ts` (`MESSAGES_PASSE_COMPOSE`).

## Compétence livrée : DICTÉE DÉTECTIVE

`FR.ORTHO.DETECTIVE` (« Dictée détective »), matière `FR`, domaine
`orthographe`, **4 niveaux**, **ouverte d'emblée** (aucun prérequis ; le
français s'active par profil). L'enfant joue au détective : on lui montre un
texte très court (2 à 4 phrases, vocabulaire CE2) qui contient **1 à 4 erreurs
plantées** ; il doit les **trouver** (toucher le mot), puis selon le niveau les
**corriger**.

### Typologie des erreurs (programme CE2)

Homophones `a/à`, `et/est`, `son/sont`, `on/ont`, `ces/ses`, `ce/se` ; **pluriel
des noms** (-s/-x) ; **accord nom-adjectif** ; **verbe au pluriel** (-ent) ;
**m devant m/b/p** ; **é/er/ez** en fin de verbe.

### Progression par niveau (décisions pédagogiques OBLIGATOIRES)

- **N1** — le **nombre** d'erreurs est annoncé ; il suffit de **trouver**.
- **N2** — trouver + **corriger par QCM** (2-3 propositions par mot touché).
- **N3** — trouver + corriger en **saisie libre** ; nombre annoncé.
- **N4** — **saisie libre** ; nombre **NON** annoncé (il peut n'y en avoir qu'une).

Une saisie à boutons ou au clavier = réponse libre ; seul le choix parmi des
propositions est un QCM (cf. `docs/pedagogie.md`).

### Banque et SÉCURITÉ (le client ne voit pas les erreurs avant l'envoi)

Banque de **100 textes originaux** (40 de la migration `0032` + 60 ajoutés par
`0033`, accents corrigés par `0035`), rattachés à **12 notions ordonnées** (table
`dictee_notion`, progression **par niveau** sans calendrier ; voir
`docs/progression-dictee-notions.md`). Thèmes variés, certains ancrés dans
l'univers de l'enfant (village breton, île tropicale, base spatiale, royaume
enchanté, vallée des dinosaures, village gourmand). Chaque texte est
stocké **avec les formes fautives déjà en place** (`public.dictee_texte`) ; les
positions, corrections et types vivent dans `public.dictee_erreur`, **sans aucun
droit de lecture côté API**. Le serveur n'expose que les **mots affichés** et le
**nombre d'erreurs** (`dictee_charger_tous`) ; la correction et les positions ne
sont **révélées qu'après l'envoi**.

### Vérification SERVEUR (seul juge)

Le client envoie la liste `{position, correction?}`. `verif_dictee(texte, niveau,
réponses)` compare aux erreurs plantées → **trouvées / corrigées / manquées /
fausses alertes**. La correction est comparée après normalisation
(`normaliser_mot` : minuscules, espaces, ponctuation de bord ; **ACCENTS
EXIGÉS**). Règle « juste » (EMA) : **toutes** les erreurs trouvées ET (niveau ≥ 2)
corrigées, **sans fausse alerte**. Opération normalisée `op = 'dictee'` dans
`enregistrer_reponse` (`p_a` = id du texte, `p_dictee` = la liste des positions).
Le `type_faute` enregistré est le type dominant manqué/mal corrigé (sert à
reproposer plus tard un texte ciblé sur la même difficulté).

### Diagnostic et messages

Le serveur révèle le **type** de chaque erreur ; le client affiche un message
court « enfant de 8 ans » avec un exemple (astuce de remplacement quand elle
existe). Mot manqué : surligné + correction. Fausse alerte : « Ce mot était
juste ! ». Mot bien trouvé mais mal corrigé : « Bien trouvé ! Mais on écrit
« … ». » + l'astuce du type. Affichage **toujours valorisant** (« Tu en as trouvé
2 sur 3 ! »), **jamais punitif**. Messages complets dans
`docs/explications.md` (section dictée) et dans
`frontend/src/domain/diagnostic/dictee.ts` (`MESSAGES_DICTEE`).
