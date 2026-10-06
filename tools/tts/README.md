# tools/tts — Voix française Kerskol (Qwen3-TTS)

Chaîne de génération des clips voix. Le moteur tourne **uniquement** sur le PC
Windows de Manu (GPU NVIDIA, accès SSH via Tailscale `manu-win`). Le Mac et le
VPS ne génèrent pas d'audio.

## Principe

- **Catalogue = source unique.** Chaque clip porte une *clé logique* (ce que le
  front interroge) et une *identité physique* = `sha1(version_voix + texte_nettoyé)`
  → un fichier `<clip_id>.mp3`. Deux textes nettoyés identiques partagent le fichier.
- Les **fichiers audio ne vont PAS dans git.** Seul le **manifest JSON** est
  committé (`frontend/public/voix/manifest.json`). Les MP3 sont déposés sur le
  VPS (`/opt/kerskol/audio`, servi par le vhost kerskol, cache long immutable).
- Recette de synthèse **imposée et figée** : réutilise la chaîne éprouvée
  `C:\Audiobooks\pipeline` (`core.py`, `voix.py`) — Qwen3-TTS-12Hz-1.7B-Base,
  empreinte `ref_naf_D` calculée une fois, seed 1234, `cap_tokens`, crête
  < −40 dB ⇒ MUET, regen multi-graines.

## Fichiers

| Fichier | Rôle | Tourne où |
|---|---|---|
| `nombres_fr.py` | nombres 0→10000 en lettres + décomposition en clés | partout |
| `dictees.py` | parse les migrations SQL, reconstruit le texte **corrigé** | partout |
| `nettoyage.py` | nettoyage texte TTS + `clip_id` (hash) — **source unique** | partout |
| `catalogue.py` | construit la liste `{key,text,cat}`, comptes, estimation GPU | partout |
| `gen_kerskol.py` | génération + contrôles + encodage MP3 + manifest | **PC Windows** |
| `data/phrases.json` | phrases statiques (opérateurs, consignes, messages, titres) | — |

## Catégories de clips

`nombre` · `operateur` (opérateurs + amorces maths) · `consigne` · `message` ·
`titre` · `dictee` (une phrase corrigée = un clip).

## Commandes

```bash
# Comptes (Mac, stdlib only) :
python3 catalogue.py            # complet
python3 catalogue.py --pilot    # sous-ensemble pilote

# Génération (PC Windows, venv C:\Audiobooks\venv) :
python gen_kerskol.py --out C:\kerskol-tts\sortie --pilot
#   reprise automatique (saute les clips déjà encodés), journal.json, manifest.json
```

Le PC a besoin des migrations SQL des dictées : variable `KERSKOL_MIGRATIONS`
ou dossier `migrations/` à côté des scripts (les 3 fichiers `0032/0033/0035`).

## Contrôles

- **MUET** : crête < −40 dB. **EMBALLÉ** : durée ≥ 95 % du plafond `cap/12`.
- **SUSPECT** : durée hors `[0,5 ; 1,7] × (caractères/20,3)` s. Pour les textes
  < 15 caractères (un nombre, « Bravo »), la durée attendue est peu fiable :
  seuil élargi à `[0,3 ; 3,0] ×` et borné `[0,25 s ; 6 s]`.
- Regen graines `1234 → 4321 → 2025 → 777 → 9999`, on garde la 1re qui passe ;
  backup horodaté avant tout écrasement.

## Format web

MP3 mono 24 kHz 64 kb/s, normalisé EBU R128 (−18 LUFS, −1,5 dBTP). Choisi car lu
nativement partout **y compris Safari iOS** (contrairement à Opus/OGG), léger,
sans conteneur, trivial à mettre en cache côté PWA.
