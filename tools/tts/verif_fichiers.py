#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""verif_fichiers.py - garde-fou : chaque clip du manifest a son fichier audio.

Le test de couverture (frontend/src/lib/voix/couverture.test.ts) verifie que le
MANIFEST couvre les textes de l'appli. Il ne verifie PAS que les mp3 existent
REELLEMENT sur le disque servi par nginx. Or si le dossier audio est efface
(incident du 29/10 : un `git clean -fd` dans /opt/kerskol a supprime
/opt/kerskol/audio, dossier untracked), la voix devient muette alors que le
manifest reste complet.

Ce script comble ce trou : pour CHAQUE clip du manifest, il verifie que le
fichier <audio-dir>/<voice>/<clip_id>.mp3 existe et n'est pas vide.

Sortie :
  - code 0 si 100 % des fichiers sont presents et non vides ;
  - code 1 sinon, en listant les manquants (plafonnes a --max-list).

Usage :
  python3 verif_fichiers.py \
      --manifest /opt/kerskol/frontend/dist/voix/manifest.json \
      --audio-dir /opt/kerskol/audio

Defauts (lance depuis la racine du depot) :
  --manifest  frontend/public/voix/manifest.json
  --audio-dir /opt/kerskol/audio
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    REPO = Path(__file__).resolve().parents[2]
    DEFAULT_MANIFEST = str(REPO / "frontend/public/voix/manifest.json")
except IndexError:  # script copie hors de l'arbre du depot (ex. /tmp)
    DEFAULT_MANIFEST = "frontend/public/voix/manifest.json"
DEFAULT_AUDIO_DIR = "/opt/kerskol/audio"


def verifier(manifest_path: Path, audio_dir: Path) -> tuple[int, int, list[str], list[str]]:
    """Retourne (total, presents, manquants, vides)."""
    data = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    voice = data["voice"]
    clips = data.get("clips", {})
    base = Path(audio_dir) / voice
    manquants: list[str] = []
    vides: list[str] = []
    presents = 0
    for cid in clips:
        p = base / f"{cid}.mp3"
        if not p.is_file():
            manquants.append(cid)
        elif p.stat().st_size == 0:
            vides.append(cid)
        else:
            presents += 1
    return len(clips), presents, manquants, vides


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    ap.add_argument("--audio-dir", default=DEFAULT_AUDIO_DIR)
    ap.add_argument("--max-list", type=int, default=30,
                    help="nombre max de clips manquants listes")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.is_file():
        print(f"ERREUR : manifest introuvable : {manifest_path}", file=sys.stderr)
        return 2

    total, presents, manquants, vides = verifier(manifest_path, Path(args.audio_dir))
    defaillants = manquants + vides
    if not args.quiet or defaillants:
        print(f"manifest : {manifest_path}")
        print(f"audio    : {args.audio_dir}")
        print(f"entrees clips   : {total}")
        print(f"fichiers presents : {presents}")
        print(f"fichiers MANQUANTS : {len(manquants)}")
        print(f"fichiers VIDES     : {len(vides)}")

    if defaillants:
        print("--- clips sans fichier valide (echantillon) ---", file=sys.stderr)
        for cid in defaillants[: args.max_list]:
            print(cid, file=sys.stderr)
        if len(defaillants) > args.max_list:
            print(f"... (+{len(defaillants) - args.max_list} autres)", file=sys.stderr)
        print(f"ECHEC : {len(defaillants)} clip(s) du manifest sans fichier audio valide.",
              file=sys.stderr)
        return 1

    print(f"OK : 100 % des {total} clips du manifest ont un fichier audio non vide.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
