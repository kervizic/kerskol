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

## Compétences livrées : CONJUGAISON

Quatre compétences, **4 niveaux** chacune :

| Code | Libellé | Temps |
|------|---------|-------|
| `FR.CONJ.PRESENT`   | Conjuguer au présent    | présent de l'indicatif |
| `FR.CONJ.FUTUR`     | Conjuguer au futur      | futur de l'indicatif |
| `FR.CONJ.IMPARFAIT` | Conjuguer à l'imparfait | imparfait de l'indicatif |
| `FR.CONJ.PASSE_COMPOSE` | Conjuguer au passé composé | passé composé de l'indicatif (voir plus bas) |

**Ouverture (prérequis)** : `FR.CONJ.PRESENT` est ouverte d'emblée.
`FR.CONJ.FUTUR`, `FR.CONJ.IMPARFAIT` et `FR.CONJ.PASSE_COMPOSE` s'ouvrent après
**le présent niveau 2** (table `competence_prerequis`, `niveau_min = 2`).

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

### Progression par niveau (décisions pédagogiques)

- **N1** — QCM : choisir la bonne forme parmi 3 ; être/avoir + 1er groupe
  régulier ; personnes je/tu/il.
- **N2** — QCM avec distracteurs plus fins (une mauvaise personne ET une forme
  d'un autre temps) ; toutes les personnes.
- **N3** — **saisie libre** ; 1er groupe + être/avoir (+ manger/placer) ; toutes
  les personnes.
- **N4** — **saisie libre** ; tous les verbes (irréguliers inclus) ; **sujet
  nominal** pour les 3e personnes (« Les enfants … (jouer) »).

Un QCM envoie la **valeur** (la forme) choisie, jamais un index ; une saisie à
boutons ou au clavier = réponse libre.

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

- **N1** — QCM ; 1er groupe + aller ; personnes je/tu/il.
- **N2** — QCM (distracteurs : mauvais auxiliaire, mauvais temps, mauvais
  accord) ; toutes les personnes ; + venir, être, avoir.
- **N3** — **saisie libre** ; 1er groupe + être/avoir + aller/venir + faire/dire.
- **N4** — **saisie libre** ; **tous** les verbes (participes irréguliers) ;
  sujet nominal genré pour il/ils.

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
