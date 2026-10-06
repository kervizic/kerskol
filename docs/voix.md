# Voix française (TTS) — conception

Lecture à voix haute des consignes, dictées, messages et énoncés de calcul.
Moteur **Qwen3-TTS** (voix clonée **Naf**, LibriVox, Public Domain Mark 1.0),
exécuté **uniquement** sur le PC Windows de Manu (GPU NVIDIA, SSH via Tailscale).
Le Mac et le VPS ne génèrent jamais d'audio.

## 1. Principe : catalogue = source unique

- Chaque clip porte une **clé logique** (ce que le front interroge) et une
  **identité physique** = `sha1(version_voix + texte_nettoyé)` → `<clip_id>.mp3`.
  Deux textes nettoyés identiques ⇒ un seul fichier (dédup naturelle).
- Le **manifest JSON** (`frontend/public/voix/manifest.json`) est **committé** ;
  il mappe `keys` (clé logique → clip_id) et `clips` (clip_id → texte, durée, cat).
- Les **fichiers audio ne sont PAS dans git**. Ils sont déposés sur le VPS dans
  `/opt/kerskol/audio/<voice>/<clip_id>.mp3`, servis par le **vhost kerskol
  uniquement** à `/audio/…` (cache long, immutable). Aucun fichier kertec touché.
- Outillage de génération : [`tools/tts/`](../tools/tts/README.md).

## 2. Catégories de clips

| Catégorie | Clé logique | Contenu |
|---|---|---|
| `nombre` | `num:<n>` | nombres 0→999 + milliers 1000..10000 (atomiques, assemblés) |
| `operateur` | `op:*`, `amorce:*` | « plus », « divisé par », « Combien font »… |
| `consigne` | `consigne:<slug>` | « Écoute bien. », « À toi de jouer. »… |
| `message` | `msg:<slug>` | messages pédagogiques statiques |
| `titre` | `titre:<slug>` | titres de compétences |
| `dictee` | `dictee:<id>:s<i>` | une **phrase corrigée** = un clip |

## 3. Nombres et énoncés de calcul (assemblage côté client)

Plutôt que de synthétiser chaque énoncé (infinité de combinaisons), on génère
des **briques** (nombres 0→999, milliers, opérateurs) assemblées à la volée avec
de courts silences (~110 ms). La décomposition est **indépendante de
l'orthographe** : build (`tools/tts/nombres_fr.py: decomposer`) et front
(`frontend/src/lib/voix/verbalize.ts`) s'accordent seulement sur *quelles briques
existent*.

- `nombreEnCles(2534)` → `["num:2000","num:534"]` → audio « deux mille » + « cinq
  cent trente-quatre ».
- `enonceEnCles("27 ÷ 3")` → `["num:27","op:divise","num:3"]`.

**Jugement d'oreille (5 exemples).** À valider avec Manu après écoute des clips
pilotes : `27 ÷ 3`, `8 × 7`, `245 + 130`, `Combien font 100 − 45 ?`, `1200`.
L'enchaînement de clips séparés par un court silence donne une diction « posée »,
bien adaptée à un enfant qui écrit, mais légèrement hachée sur les grands nombres
(« deux mille » | « cinq cent trente-quatre »). Si ce n'est pas assez fluide,
alternative prévue : générer en plus les **centaines rondes jusqu'à 10 000** et
réduire le silence à ~70 ms, ou pré-générer les énoncés complets des tables
(nombre de combinaisons fini). Décision après écoute.

## 4. Dictées

On lit **toujours la version CORRIGÉE** (jamais la version piégée : les fautes
sont des homophones inaudibles — `son/sont`, `et/est`). Le texte corrigé est
reconstruit depuis les migrations SQL (`tools/tts/dictees.py`) en appliquant
`dictee_erreur`, puis découpé **par phrase** (une phrase = un clip).

Deux modes (`useVoix.direDictee`) :
- **simple** : chaque phrase, petit silence (0,5 s).
- **dictee** : découverte (lecture continue) → écriture phrase par phrase
  (silences longs 1,5 s pour écrire) → relecture complète.

Granularité **phrase** en phase 1. Le découpage « groupe de mots » (clips
sous-phrase) est une évolution possible ultérieure (prosodie et volumétrie à
arbitrer) ; la phase 1 obtient déjà le rythme pédagogique via les pauses.

## 5. Messages à trous

Les messages statiques sont des clips entiers. Les messages à variables ont deux
cas :
- **fentes finies** (`{temps}` ∈ présent/futur/imparfait, `{rang}` ∈ milliers/
  centaines/dizaines/unités…) → clips des morceaux fixes + clips de chaque valeur.
- **fentes non énumérables** (`{mot}`, `{correction}`, `{forme}` = mot tiré de
  l'exercice) → pas de clip ; on lit la partie fixe et on laisse l'enfant lire le
  mot à l'écran. (Détail d'implémentation en phase 2 ; le pilote couvre des
  messages statiques.)

## 6. Lecteur front

`frontend/src/lib/voix/` :
- `manifest.ts` — charge `/voix/manifest.json`, résout clé → URL `/audio/…`.
- `verbalize.ts` — nombres/énoncés → séquence de clés (pur, testé).
- `autoplay.ts` — décision de lecture auto (profil + geste iOS + clips) (pur, testé).
- `player.ts` — file d'attente audio : enchaînement, **coupure** au changement
  d'exercice / démontage, silences, prechargement doux. Aucune exception ne
  remonte (un clip manquant est sauté).
- `useVoix.ts` — hook : `direEnonce`, `direDictee`, `direCles`, `couper`, `activer`.

Câblage : `Session.tsx` (coupe la voix à chaque nouvel exercice `[ex?.key]`, lit
la consigne en auto, bouton haut-parleur Lucide `Volume2` dans la barre du haut) ;
`DicteeDetective.tsx` (lecture auto + bouton de réécoute). **Réglage par profil**
`profil.lecture_auto` (espace parent, migration `0036`, journalisé). **iOS** :
l'audio ne démarre qu'après le 1er geste de séance (`activer()` posé au 1er
toucher). **PWA** : `/audio/` mis en cache à la demande (service worker,
cache-first, noms immuables). Si la voix manque, l'app fonctionne normalement.

## 7. Recette de synthèse (figée) et contrôles

Réutilise la chaîne éprouvée `C:\Audiobooks\pipeline` (`core.py`, `voix.py`) :
Qwen3-TTS-12Hz-1.7B-**Base**, `device_map="cuda:0"`, `dtype=bfloat16`,
`attn_implementation="sdpa"` ; empreinte `ref_naf_D` calculée **une fois** ;
`seed 1234` avant chaque bloc ; `cap = max(256, int(1.4*(len/20.3)*12)+96)`.

Contrôles par bloc :
- **MUET** : crête < −40 dB. **EMBALLÉ** : durée ≥ 95 % de `cap/12`.
- **SUSPECT** : durée hors `[0,5 ; 1,7] × (caractères/20,3)` s. **Textes < 15
  caractères** (un nombre, « Bravo ») : la durée attendue est peu fiable → bornes
  absolues `[0,25 s ; 6 s]` (MUET/EMBALLÉ restent les vrais garde-fous).
- Regen graines `1234 → 4321 → 2025 → 777 → 9999`, 1re qui passe ; backup avant
  écrasement ; écriture atomique ; reprise (saute les clips déjà encodés).
- Contrôle de **contenu** possible via Whisper (`tools/tts/asr_check.py`) : vérifie
  *ce qui est dit*, pas la qualité vocale.

## 8. Format audio

**MP3 mono 24 kHz, 64 kb/s**, normalisé EBU R128 (−18 LUFS, −1,5 dBTP). Choisi
car lu nativement **partout, y compris Safari iOS** (contrairement à Opus/OGG),
léger (~5–20 ko/clip), sans conteneur, trivial à mettre en cache côté PWA.

## 9. Volumétrie et temps GPU

| Catégorie | Clips (complet) |
|---|---|
| nombre | 1010 |
| dictee (phrases) | 207 |
| titre | 12 |
| operateur | 13 |
| consigne | 8 |
| message | 7 |
| **Total** | **1257** |

Mesure sur le **pilote** (RTX 3080, 50 clips) : ~4,8 s par essai de génération
(regens compris), encodage inclus. Estimation du run **complet** : **~1 h à 1 h 30**
(les nombres courts, plus nombreux, génèrent vite ; les phrases de dictée sont
plus longues). La génération complète n'est **pas** lancée : écoute du pilote à
valider d'abord.

Commande (PC Windows) : `python gen_kerskol.py --out C:\kerskol-tts\sortie`
(sans `--pilot`). Reprise automatique.
