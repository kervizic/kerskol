# Crédits des images (illustrations libres de droit)

Toutes les illustrations sont **hébergées dans le dépôt** (`frontend/public/img/…`),
optimisées (SVG légers, chacun bien en dessous de 50 Ko) et servies sans aucun
lien externe. Chaque image porte un **texte alternatif en français simple**
(registre `frontend/src/domain/images.ts`).

Ces images sont **purement pédagogiques** : elles aident l'enfant à comprendre la
consigne, mais le serveur reste seul juge (aucune réponse ne dépend d'une image).

## Lot 2 — Microsoft Fluent Emoji (licence MIT)

- **Source** : Microsoft Fluent Emoji, style « Flat ».
- **Auteur / éditeur** : Microsoft.
- **Licence** : MIT — fichier de licence inclus dans le dépôt :
  `frontend/public/img/emoji/LICENSE-fluentui-emoji.txt`.
- **Dépôt d'origine** : https://github.com/microsoft/fluentui-emoji

| Fichier (dans le dépôt) | Emoji Fluent d'origine | Utilisé pour | Texte alternatif |
| --- | --- | --- | --- |
| `img/emoji/joie.svg` | Smiling face with smiling eyes | émotion : la joie (EMC) | Un visage souriant, tout content. C'est la joie. |
| `img/emoji/colere.svg` | Angry face | émotion : la colère (EMC) | Un visage rouge, fâché. C'est la colère. |
| `img/emoji/peur.svg` | Fearful face | émotion : la peur (EMC) | Un visage qui a peur. C'est la peur. |
| `img/emoji/tristesse.svg` | Crying face | émotion : la tristesse (EMC) | Un visage qui pleure, tout triste. C'est la tristesse. |
| `img/emoji/surprise.svg` | Astonished face | émotion : la surprise (EMC) | Un visage étonné, la bouche ouverte. C'est la surprise. |
| `img/emoji/chat.svg` | Cat face | le vivant : un chat (QM) | Un visage de chat. |
| `img/emoji/papillon.svg` | Butterfly | cycle de vie du papillon (QM) | Un papillon aux ailes colorées. |
| `img/emoji/grenouille.svg` | Frog | cycle de vie de la grenouille (QM) | Une grenouille verte. |
| `img/emoji/plante.svg` | Seedling | besoins des plantes (QM) | Une petite plante verte qui pousse. |
| `img/emoji/carotte.svg` | Carrot | alimentation, un légume (QM) | Une carotte orange, un légume. |

## Lot 3 — extension Questionner le monde (toujours Microsoft Fluent Emoji, MIT)

Même source, même style « Flat », même licence MIT (fichier de licence déjà inclus :
`frontend/public/img/emoji/LICENSE-fluentui-emoji.txt`). Ces images illustrent le
**sujet** de la consigne, jamais la réponse (le serveur reste seul juge).

| Fichier (dans le dépôt) | Emoji Fluent d'origine | Utilisé pour | Texte alternatif |
| --- | --- | --- | --- |
| `img/emoji/lapin.svg` | Rabbit face | chaîne alimentaire : le lapin (QM, Le vivant) | Un lapin avec de grandes oreilles. |
| `img/emoji/lion.svg` | Lion | chaîne alimentaire : le lion (QM, Le vivant) | Un lion avec sa crinière. |
| `img/emoji/poule.svg` | Chicken | cycle de vie de la poule (QM, Le vivant) | Une poule. |
| `img/emoji/glacon.svg` | Ice | états de la matière : un glaçon (QM, La matière) | Un glaçon bien froid. |
| `img/emoji/ballon.svg` | Balloon | l'air : un ballon gonflé (QM, La matière) | Un ballon de baudruche gonflé. |
| `img/emoji/parapluie.svg` | Umbrella | objets et fonctions : le parapluie (QM, Les objets) | Un parapluie ouvert. |
| `img/emoji/ciseaux.svg` | Scissors | objets et fonctions : les ciseaux (QM, Les objets) | Une paire de ciseaux. |
| `img/emoji/soleil.svg` | Sun | points cardinaux : le soleil (QM, L'espace) | Le soleil qui brille. |
| `img/emoji/gateau.svg` | Birthday cake | frise : préparer un gâteau (QM, Le temps) | Un gâteau avec des bougies. |

L'URL exacte de chaque emoji est reconstruite dans `images.ts`
(`https://github.com/microsoft/fluentui-emoji/tree/main/assets/<Nom>/Flat`).

## Sources autorisées pour les lots suivants

En priorité **Fluent Emoji** (MIT, style homogène). Également autorisés : Noto
Emoji (Apache 2.0), Twemoji (CC BY 4.0, crédit obligatoire), Openclipart
(domaine public / CC0), Kenney (CC0), Natural Earth (domaine public, contours du
planisphère), Wikimedia Commons **uniquement** en domaine public ou CC0 (vérifier
chaque fichier). Interdits : OpenMoji (CC BY-SA), Flaticon/Freepik,
Pixabay/Unsplash, images trouvées sur Google, personnages ou marques connus.

## Autres crédits

Les billets et pièces en euros, la police Andika, les icônes Lucide, la voix de
synthèse et les avatars DiceBear sont documentés sur la page `/credits` de
l'application (`frontend/public/credits.html`).
