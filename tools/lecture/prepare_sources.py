#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prepare les CLIPS SOURCES rognes a NOTRE extrait, a partir des enregistrements
LibriVox (domaine public). Lit trims.json :

  {
    "c2-011": {
      "url": "https://archive.org/download/<id>/<fichier>.mp3",
      "debut_s": 12.3,   # debut de NOTRE passage (apres l'annonce LibriVox)
      "fin_s": 61.0,     # fin de NOTRE passage
      "lecteur": "Nom du lecteur LibriVox (courtoisie /credits)"
    },
    ...
  }

Telecharge l'audio (sources OFFICIELLES archive.org/librivox uniquement), coupe
l'annonce « ceci est un enregistrement LibriVox... » et ce qui depasse, et ecrit
sources/<id>.wav. Les offsets sont determines a l'oreille/inspection une fois,
puis VERSIONNES (reproductible).

Usage (dans le conteneur) :
    python3 prepare_sources.py --all
    python3 prepare_sources.py --id c2-011
"""
import argparse
import json
import os
import subprocess
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
TRIMS = os.path.join(ICI, "trims.json")
SOURCES = os.path.join(ICI, "sources")


def sh(cmd):
    subprocess.run(cmd, check=True)


def telecharger(url, dest):
    sh(["wget", "-q", "-O", dest, url])


def rogner(src, debut_s, fin_s, dest_wav):
    duree = max(0.0, float(fin_s) - float(debut_s))
    sh([
        "ffmpeg", "-y", "-ss", str(debut_s), "-t", str(duree), "-i", src,
        "-ac", "1", "-ar", "16000", dest_wav,
    ])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    if not os.path.exists(TRIMS):
        print("trims.json absent : renseigner url/debut_s/fin_s par texte.", file=sys.stderr)
        sys.exit(2)
    trims = json.load(open(TRIMS, encoding="utf-8"))
    os.makedirs(SOURCES, exist_ok=True)
    ids = [args.id] if args.id else (list(trims) if args.all else [])
    if not ids:
        ap.error("preciser --id <id> ou --all")
    for tid in ids:
        t = trims.get(tid)
        if not t:
            print(f"[{tid}] absent de trims.json"); continue
        brut = os.path.join(SOURCES, f"{tid}.src")
        telecharger(t["url"], brut)
        rogner(brut, t["debut_s"], t["fin_s"], os.path.join(SOURCES, f"{tid}.wav"))
        os.remove(brut)
        print(f"[{tid}] clip pret : sources/{tid}.wav")


if __name__ == "__main__":
    main()
