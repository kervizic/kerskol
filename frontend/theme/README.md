# Theme de base Kerskol

Tokens CSS semantiques (clair + sombre) et police auto-hebergee. Aucune
ressource externe (CSP `default-src 'self'`, `font-src 'self'`).

## Fichiers

- `tokens.css` : variables `--kk-*` sur `:root`, bascule sombre automatique,
  et `@font-face` de la police Andika.
- `fonts/` : `Andika-Regular.woff2`, `Andika-Bold.woff2` (SIL, WOFF2 complets)
  et `OFL.txt` (licence Open Font License 1.1).

## Utilisation

```html
<html lang="fr"><!-- data-theme="dark" ou "light" pour forcer un mode -->
  <head>
    <link rel="stylesheet" href="/theme/tokens.css">
  </head>
  <body style="font-family: var(--kk-font); background: var(--kk-bg); color: var(--kk-text);">
```

- Mode sombre **automatique** via `prefers-color-scheme: dark`.
- Forcer un mode : `<html data-theme="dark">` ou `<html data-theme="light">`.

## Variables

| Variable | Role |
|---|---|
| `--kk-bg` | Fond de page |
| `--kk-surface` | Cartes, panneaux |
| `--kk-border` | Bordures, separateurs |
| `--kk-text` | Texte principal |
| `--kk-text-2` | Texte secondaire |
| `--kk-accent` | Accent (gros titres, boutons gros + gras) |
| `--kk-on-accent` | Texte pose sur un bouton accent |
| `--kk-accent-text` | Petits liens/textes accent (a poser sur `--kk-bg`) |
| `--kk-success` / `--kk-on-success` | Retour de succes (texte / texte sur bouton) |
| `--kk-danger` / `--kk-on-danger` | Retour d'erreur (texte / texte sur bouton) |
| `--kk-radius`, `--kk-radius-sm` | Rayons de bordure |
| `--kk-font` | Pile typographique (Andika + repli systeme) |

## Regles d'usage de l'accent (contraste)

- **`#E06A00` (clair)** : reserve au **gros texte gras** (>= 18,66 px gras ou
  >= 24 px) et aux **boutons gros et gras** avec texte blanc. Ratio blanc/accent
  = **3,37** (conforme AA « grand texte » et composants UI >= 3,0, PAS pour du
  petit texte).
- **`#BD5500` (clair)** : pour les **petits textes et liens** accent, a poser
  sur `--kk-bg` (fond blanc). Ratio = **4,71** (AA). Sur `--kk-surface`
  (#F5F5F4) il tombe a **4,31** : dans une carte, preferer `--kk-text` ou un
  lien souligne, pas `#BD5500` en petit.
- **Sombre** : `#FB923C` passe AA meme en petit (>= 4,5 sur fond et surface),
  donc utilisable pour titres, boutons et liens.

## Retours pedagogiques (succes / erreur) — bandeaux pastel

Ce ne sont **pas** des aplats vifs avec texte blanc, mais des **bandeaux
pastel** : fond doux + texte fonce de la meme famille. Tokens :
`--kk-success-bg` / `--kk-success-text`, `--kk-danger-bg` / `--kk-danger-text`.
(Les anciens `--kk-success` / `--kk-on-success` / `--kk-danger` /
`--kk-on-danger` ont ete **remplaces** ; ne plus les utiliser.)

| Role | Clair | Sombre |
|---|---|---|
| Succes — fond bandeau | `#DCF5E7` | `#1F3A2E` |
| Succes — texte/icone | `#1E6B45` | `#A7E8C4` |
| Erreur — fond bandeau | `#FCE3DE` | `#3F2826` |
| Erreur — texte/icone | `#A8322A` | `#F7BDB4` |

Exemple d'usage :

```css
.feedback--success { background: var(--kk-success-bg); color: var(--kk-success-text);
  border: 1px solid var(--kk-success-text); border-radius: var(--kk-radius-sm); }
.feedback--error   { background: var(--kk-danger-bg);  color: var(--kk-danger-text);
  border: 1px solid var(--kk-danger-text);  border-radius: var(--kk-radius-sm); }
```

### Regles UX (obligatoires)

- **Toujours une icone**, jamais la couleur seule (daltonisme). Le bandeau de
  succes porte une **coche** ; le bandeau d'erreur porte une **icone d'erreur
  douce** (pas une croix agressive).
- Une **erreur compte comme fausse** (pas de « on reessaie » sur le meme
  exercice). Le bandeau d'erreur annonce clairement **« Ce n'est pas ca »**,
  puis affiche la **correction expliquee** — bonne reponse et chemin pour la
  trouver (voir [`docs/pedagogie.md`](../../docs/pedagogie.md)).
- **Ton bienveillant mais clair** : on nomme l'erreur sans la dramatiser
  (« Ce n'est pas ca, voici comment trouver »), on ne l'euphemise pas non plus
  (pas de « Presque »).
- Le bandeau se delimite par sa **bordure + son icone** (le contraste
  fond-pastel / page est volontairement faible) : ne jamais compter sur la
  seule couleur de fond pour signaler le bandeau.

## Ratios de contraste WCAG (verifies)

Seuils : texte normal AA >= 4,5 ; grand texte / composants UI AA >= 3,0.

### Mode clair (fond #FFFFFF, surface #F5F5F4)

| Paire | Ratio | Seuil | Verdict |
|---|---|---|---|
| text #292524 sur fond | 15,17 | 4,5 | OK |
| text #292524 sur surface | 13,90 | 4,5 | OK |
| text-2 #57534E sur fond | 7,63 | 4,5 | OK |
| text-2 #57534E sur surface | 6,99 | 4,5 | OK |
| accent-text #BD5500 sur fond | 4,71 | 4,5 | OK |
| accent-text #BD5500 sur surface | 4,31 | 4,5 | a eviter (voir regle) |
| accent #E06A00 sur fond (gros/gras) | 3,37 | 3,0 | OK (grand texte) |
| on-accent #FFFFFF sur bouton #E06A00 | 3,37 | 3,0 | OK (bouton gros+gras) |
| succes texte #1E6B45 sur bandeau #DCF5E7 | 5,63 | 4,5 | OK |
| erreur texte #A8322A sur bandeau #FCE3DE | 5,45 | 4,5 | OK |

### Mode sombre (fond #1C1917, surface #292524)

| Paire | Ratio | Seuil | Verdict |
|---|---|---|---|
| text #E7E5E4 sur fond | 13,93 | 4,5 | OK |
| text #E7E5E4 sur surface | 12,08 | 4,5 | OK |
| text-2 #A8A29E sur fond | 6,93 | 4,5 | OK |
| text-2 #A8A29E sur surface | 6,01 | 4,5 | OK |
| accent #FB923C sur fond | 7,73 | 4,5 | OK |
| accent #FB923C sur surface | 6,70 | 3,0 | OK |
| on-accent #1C1917 sur bouton #FB923C | 7,73 | 4,5 | OK |
| succes texte #A7E8C4 sur bandeau #1F3A2E | 8,80 | 4,5 | OK |
| erreur texte #F7BDB4 sur bandeau #3F2826 | 8,36 | 4,5 | OK |

## Themes enfants (mecanisme, non fourni)

Un futur univers visuel se declare via `<html data-theme="<nom>">` et un bloc
qui **ne redefinit que des variables** `--kk-*` :

```css
:root[data-theme="foret"] { --kk-accent: #2F855A; --kk-accent-text: #276749; }
/* variante sombre optionnelle */
@media (prefers-color-scheme: dark) {
  :root[data-theme="foret"] { --kk-accent: #68D391; }
}
```

Aucune regle de mise en page dans un thème enfant, aucun personnage sous
licence ni marque tierce.

## Police

Andika 7.000 (SIL Global), WOFF2 Regular + Bold, licence OFL 1.1 (`fonts/OFL.txt`).
Chargee avec `font-display: swap` et une pile de repli `system-ui, sans-serif`.
Source officielle : <https://software.sil.org/andika/>.

**Sous-ensemble latin.** Les WOFF2 sont sous-ensembles au latin utile
(fonttools/pyftsubset dans un conteneur jetable `python:3.12-slim` sur le VPS) :

- Plages Unicode conservees : `U+0000-00FF` (latin de base + Latin-1 :
  accents FR, `« »`, NBSP, `× ÷`, `¼ ½ ¾`), `U+0100-017F` (Latin etendu A :
  `œ Œ`, `Ÿ`, ...), `U+2000-206F` (ponctuation typographique : espaces
  insecables/fines, `' ' " "`, `– —`, `…`), `U+20AC` (€), `U+2212` (`−`),
  `U+2122` (™), `U+FEFF`, `U+FFFD`.
- Features OpenType gardees : `kern, liga, calt, ccmp, mark, mkmk, locl`.
- Tailles : Regular **295 740 -> 24 568 o**, Bold **299 540 -> 24 864 o**
  (~92 % de reduction).

## Versionning et mise a jour fiable (voir aussi deploy/SETUP.md)

- `deploy.sh` genere une **version** = hash court du commit + horodatage UTC,
  ecrite dans `/version.json` (Cache-Control `no-store`) et dans
  `<meta name="app-version">` de `index.html`.
- **Assets empreintes** : `build-front.sh` renomme par hash de contenu
  (`tokens.<hash>.css`, `app-version.<hash>.js`, `Andika-*.<hash>.woff2`) ->
  cache long `immutable` sans risque. `index.html` et `version.json` ne sont
  jamais mis en cache.
- **`app-version.js`** (charge par la page) expose `window.Kerskol.version` :
  - verifie `/version.json` toutes les 5 min, au retour au premier plan
    (`visibilitychange`) et au retour reseau (`online`) ;
  - `setBusy(true|false)` : pendant une seance d'enfant, toute mise a jour est
    **reportee** jusqu'a `setBusy(false)` ;
  - `onBeforeUpdate(fn)` : taches a executer avant rechargement (ex. envoyer les
    reponses en attente), attente plafonnee a 5 s ;
  - sequence : `onBeforeUpdate` -> vidage Cache Storage -> desenregistrement des
    service workers -> `location.reload()` ; garde-fou anti-boucle via
    `sessionStorage`.
- Compatible avec un futur build Vite (memes conventions d'empreinte +
  `version.json` + `<meta app-version>` + inclusion de `app-version.js`).

## Couleur de l'enfant → accent de l'interface enfant

La couleur choisie par l'enfant (« Ta couleur », 8 teintes, stockée dans
`profils.avatar.couleur`) devient l'accent des **écrans enfant** (village,
« C'est parti », future séance, compteur, retour) : `--kk-accent`,
`--kk-on-accent`, `--kk-accent-text` sont redéfinis dynamiquement sur un
conteneur (`src/components/ChildTheme.tsx`). Les écrans **public** et **parent**
gardent l'orange Kerskol. Les bandeaux succès (menthe) / erreur (saumon) sont
inchangés.

Les paires sont **calculées** (`src/theme/childColors.ts`) et **vérifiées** par
`childColors.test.ts` (ratios WCAG), en clair ET en sombre :

- **Bouton plein** : la teinte est assombrie au besoin pour que le **texte
  blanc** tienne **≥ 3:1** (gros texte gras / composant UI).
- **Texte accent** (`--kk-accent-text`) : assombri sur fond clair (`#FFFFFF`),
  éclairci sur fond sombre (`#1C1917`), jusqu'à **≥ 4,5:1** contre le fond.

Les 8 teintes de base : `#E06A00 #2F855A #3182CE #805AD5 #D53F8C #00838F
#B7791F #5A67D8`. Sur « Qui joue ? », chaque tuile reprend la couleur de
l'enfant (bordure + nom).
