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

## Retours pedagogiques (succes / erreur)

Familles chaudes/douces, contraste AA verifie en clair **et** sombre. Cote UI,
**toujours accompagner d'une icone** (ex. check pour succes, triangle/`!` pour
erreur) et non de la couleur seule (accessibilite daltonisme).

| Role | Clair | Sombre |
|---|---|---|
| Succes (couleur) | `#15803D` | `#4ADE80` |
| Texte sur bouton succes | `#FFFFFF` | `#1C1917` |
| Erreur (couleur) | `#B42318` | `#FCA5A5` |
| Texte sur bouton erreur | `#FFFFFF` | `#1C1917` |

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
| succes #15803D sur fond | 5,02 | 4,5 | OK |
| succes #15803D sur surface | 4,60 | 4,5 | OK |
| on-success #FFFFFF sur bouton #15803D | 5,02 | 4,5 | OK |
| danger #B42318 sur fond | 6,57 | 4,5 | OK |
| danger #B42318 sur surface | 6,03 | 4,5 | OK |
| on-danger #FFFFFF sur bouton #B42318 | 6,57 | 4,5 | OK |

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
| succes #4ADE80 sur fond | 10,04 | 4,5 | OK |
| succes #4ADE80 sur surface | 8,71 | 4,5 | OK |
| on-success #1C1917 sur bouton #4ADE80 | 10,04 | 4,5 | OK |
| danger #FCA5A5 sur fond | 9,21 | 4,5 | OK |
| danger #FCA5A5 sur surface | 7,99 | 4,5 | OK |
| on-danger #1C1917 sur bouton #FCA5A5 | 9,21 | 4,5 | OK |

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
