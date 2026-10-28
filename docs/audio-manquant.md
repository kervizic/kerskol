# État des clips audio (voix C1_s33)

> Mis à jour le 2026-10-26 après bascule de la voix Naf → **C1_s33** (clonage
> Qwen3-TTS). Le catalogue est désormais **complet** : il n'y a plus de clip
> manquant. Ce document décrit l'état réel ; pour un diagnostic frais, relancer
> `python tools/tts/catalogue.py` (comptes) et comparer au manifest déployé.

- Voix : `c1s33-v1` (voix inventée par description VoiceDesign, puis clonée depuis
  une courte référence propre ; empreinte unique, comme l'ancienne voix Naf).
- Emplacement sur le VPS : `/opt/kerskol/audio/c1s33-v1/<clip_id>.mp3`.
- `clip_id = sha1("{voix}\x1f" + texte_prononcé)[:16]` (cf. `tools/tts/nettoyage.py`).
  Le **texte prononcé** passe par `tools/tts/respelling.py` (corrections d'écoute :
  « vinte-quatre » pour que le t de vingt s'entende, « pluss », « ! » sur les
  consignes encourageantes, « esse » pour la lettre s). L'affichage reste inchangé.
- Format : mp3 mono 24 kHz 64 kbit/s, normalisé EBU R128.

## Catalogue complet : **1348 clés / 1348 clips** (0 manquant)

| Catégorie | Clés |
|---|---:|
| Nombres | 1010 |
| Opérateurs + amorces | 13 |
| Consignes | 23 |
| Messages | 22 |
| Titres | 15 |
| Indices | 58 |
| Dictées (phrase par phrase) | 207 |
| **Total** | **1348** |

Tous ces clips sont générés et déployés en `c1s33-v1`. Les fichiers Naf
(`naf_D-v1`) restent sur le VPS mais ne sont plus référencés par le manifest.

## Régénération

Sur le PC Windows (GPU), venv `C:\Audiobooks\venv` :

```
python gen_kerskol.py --out C:\kerskol-tts\sortie_c1s33 \
  --ref C:\Audiobooks\references\ref_c1s33.json --voice c1s33-v1
```

Reprise automatique (saute les clips déjà encodés). Contrôle ASR :
`relecture.py --out C:\kerskol-tts\sortie_c1s33` ; alignement karaoké :
`alignement.py --out C:\kerskol-tts\sortie_c1s33`.

## Relance du lot complet (5 170 clips) si le Mac redémarre

Le lanceur `C:\kerskol-tts\gen_full.cmd` sur manu-win est reprenable et attend le
GPU libre (`--wait-gpu`, ne tue jamais de processus) : il suffit de le relancer,
depuis le Mac, dans une session détachée qui survit à la fermeture du SSH :
```
nohup caffeinate -i ssh -o BatchMode=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=10 \
  manu-win "cmd /c C:\kerskol-tts\gen_full.cmd" > ~/Library/Logs/kerskol_gen_full.log 2>&1 &
```
Vérifier l'avancement : `nvidia-smi` sur manu-win (GPU chargé) ou compter les
`.wav` dans `C:\kerskol-tts\sortie_c1s33`.
