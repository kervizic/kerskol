# Lecture rythmee - outillage d'alignement (hors ligne, CPU, libre)

Produit, par texte de la Bibliotheque qui a un enregistrement LibriVox (domaine
public), l'audio de diffusion (Opus/OGG + repli AAC/M4A) et un fichier de
**timings mot a mot** versionne, consomme par le lecteur du site.

Tout tourne **en Docker, sur le VPS, en CPU**, avec des **outils libres**
(aeneas pour l'alignement force ; ffmpeg pour l'audio ; espeak pour la synthese
interne d'aeneas). **Rien sur manu-win.** Un seul traitement a la fois (`nice`).

## Pourquoi « rythmee » et pas « ralentie »

On garde la voix a **debit naturel** et on insere des **silences entre les
groupes de mots** (reglables). Cela demande, par texte, les bornes temporelles
de chaque mot : c'est le role de l'alignement force.

## Fichiers

- `extraits.json` - les 8 extraits (texte EXACT copie depuis `bibliotheque.ts`,
  via extraction), avec la source audio LibriVox. **Ne pas diverger du front.**
- `tokenize_fr.py` - tokeniseur **miroir** de
  `frontend/src/domain/francais/lecture/tokenize.ts` (meme liste de mots).
- `trims.json` - par texte : URL du MP3 **officiel** (archive.org/librivox),
  `debut_s`/`fin_s` de NOTRE passage (apres l'annonce LibriVox), `lecteur`.
- `prepare_sources.py` - telecharge + rogne -> `sources/<id>.wav`.
- `aligner.py` - aligne, controle qualite, encode, ecrit
  `frontend/public/voix/lecture/<id>.{opus,m4a,json}` + `manifest.json`.
- `Dockerfile` - image d'alignement.

## Procedure complete

```bash
# 1. Construire l'image (sur le VPS)
docker build -t kerskol-aligner tools/lecture

# 2. Preparer les clips (download + rognage a notre passage)
docker run --rm -v "$PWD":/work -w /work/tools/lecture --cpus 2 \
  kerskol-aligner nice -n 10 python3 prepare_sources.py --all

# 3. Aligner + QC + encoder (met a jour public/voix/lecture/ et manifest.json)
docker run --rm -v "$PWD":/work -w /work/tools/lecture --cpus 2 \
  kerskol-aligner nice -n 10 python3 aligner.py --all
```

Un texte dont l'alignement est douteux (QC KO) est **rejete** (non ajoute au
manifeste) ; le signaler dans le rapport.

## Controle qualite (aligner.py)

- couverture : autant de timings que de mots, mots identiques (normalises) ;
- durees plausibles : 40..4000 ms, debut < fin ;
- pas de chevauchement ( >= fin du mot precedent, tolerance 20 ms) ;
- index strictement croissant 0..n-1.

Le meme controle existe cote TS (`timings.ts`) et s'applique au chargement : un
alignement qui ne colle pas au texte affiche est ignore par le lecteur.

## Remplacer l'audio LibriVox par la VOIX DE MANU (3 etapes)

1. Deposer les clips de Manu dans `tools/lecture/sources/<id>.wav` (un par
   texte, deja rogne au passage ; meme nommage `<id>`).
2. Relancer **l'etape 3** ci-dessus (`aligner.py --all`). Le format de timings
   et les noms de fichiers sont identiques.
3. Rebuild + deploy du front. **Aucun code a modifier** : le lecteur recharge
   simplement les nouveaux `<id>.{opus,m4a,json}`.

## Licences

- aeneas : GNU AGPL v3 / LGPL (composants). Outil libre.
- ffmpeg : LGPL/GPL. espeak : GPL v3.
- Enregistrements LibriVox : **domaine public**. Lecteur cite sur `/credits`
  par courtoisie (`trims.json.lecteur`).
