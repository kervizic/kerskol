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

Trois compétences, **4 niveaux** chacune :

| Code | Libellé | Temps |
|------|---------|-------|
| `FR.CONJ.PRESENT`   | Conjuguer au présent    | présent de l'indicatif |
| `FR.CONJ.FUTUR`     | Conjuguer au futur      | futur de l'indicatif |
| `FR.CONJ.IMPARFAIT` | Conjuguer à l'imparfait | imparfait de l'indicatif |

**Ouverture (prérequis)** : `FR.CONJ.PRESENT` est ouverte d'emblée.
`FR.CONJ.FUTUR` et `FR.CONJ.IMPARFAIT` s'ouvrent après **le présent niveau 2**
(table `competence_prerequis`, `niveau_min = 2`).

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

## Passé composé — au programme, non livré (choix à confirmer)

Le passé composé **fait partie** du programme CE2 2024. Il n'est **pas** livré
dans ce lot : c'est un temps **composé** (auxiliaire être/avoir + participe
passé), dont la vérification et le diagnostic diffèrent des temps simples
(accord du participe avec être, ambiguïté de genre sur je/tu/nous/vous). Il
mérite une conception dédiée (table des participes, règle d'accord, diagnostic
`AUXILIAIRE` / `PARTICIPE` / `ACCORD`). À arbitrer avec Manu avant de l'ajouter
comme 4e compétence `FR.CONJ.PASSE_COMPOSE`.

## Dictée détective — spécifiée, non livrée (budget)

La « dictée détective » (`FR.ORTHO.DETECTIVE`, banque de textes à erreurs
plantées, vérification serveur des positions corrigées) est décrite dans la
mission mais **non livrée** dans ce lot (budget). Elle fera l'objet d'un commit
B séparé.
