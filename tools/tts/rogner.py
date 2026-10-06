#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rognage des silences de tete/queue des BRIQUES d'assemblage (nombres,
operateurs, amorces) UNIQUEMENT. Ne touche JAMAIS aux clips entiers (dictees,
messages, consignes, titres) dont le silence fait partie du phrase.

But : assemblage cote client sans trou (gap 0 + fondu). Seuil ~ -45 dB, on garde
~15 ms de marge de chaque cote. Le WAV (PCM pre-loudnorm) est rogne puis re-encode
en MP3 (loudnorm habituel). La duree rognee est reportee dans le manifest
(clips[cid].ms) et un flag clips[cid].brique=true est pose.

Usage (venv principal) : python rogner.py --out C:\\kerskol-tts\\sortie
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, r"C:\Audiobooks")
sys.path.insert(0, r"C:\Audiobooks\pipeline")

CATS_BRIQUES = {"nombre", "operateur"}
SEUIL_DB = -45.0
MARGE_MS = 15


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--marge-ms", type=int, default=MARGE_MS)
    ap.add_argument("--seuil-db", type=float, default=SEUIL_DB)
    a = ap.parse_args()

    import numpy as np
    import soundfile as sf
    import core
    from gen_kerskol import _encoder_mp3

    out = Path(a.out)
    man_path = out / "manifest.json"
    man = json.loads(man_path.read_text(encoding="utf-8"))
    vdir = out / man["voice"]
    seuil = 10 ** (a.seuil_db / 20.0)
    marge = a.marge_ms

    n = 0
    for cid, info in man["clips"].items():
        if info.get("cat") not in CATS_BRIQUES or info.get("rogne"):
            continue
        wavp = vdir / f"{cid}.wav"
        if not wavp.exists():
            continue
        wav, sr = sf.read(str(wavp))
        if wav.ndim > 1:
            wav = wav.mean(axis=1)
        amp = np.abs(wav)
        idx = np.where(amp >= seuil)[0]
        if len(idx) == 0:
            continue  # clip quasi muet : on laisse (sera vu par la relecture)
        m = int(sr * marge / 1000)
        d0 = max(0, idx[0] - m)
        d1 = min(len(wav), idx[-1] + 1 + m)
        if d0 == 0 and d1 == len(wav):
            # rien a rogner mais on marque pour ne pas repasser
            info["rogne"] = True
            continue
        coupe = wav[d0:d1]
        # sauvegarde + ecriture atomique + re-encodage
        bdir = out / "_backup_rogne"
        bdir.mkdir(exist_ok=True)
        if not (bdir / wavp.name).exists():
            (bdir / wavp.name).write_bytes(wavp.read_bytes())
        tmp = vdir / f".{cid}.rogne.wav"
        sf.write(str(tmp), coupe, sr, format="WAV", subtype="PCM_16")
        os.replace(tmp, wavp)
        _encoder_mp3(wavp, vdir / f"{cid}.mp3", core)
        info["ms"] = int(round(len(coupe) / sr * 1000))
        info["rogne"] = True
        n += 1
        if n % 100 == 0:
            print(f"[{datetime.now():%H:%M:%S}] {n} briques rognees")

    tmpj = man_path.with_suffix(".json.partiel")
    tmpj.write_text(json.dumps(man, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmpj, man_path)
    print(f"[{datetime.now():%H:%M:%S}] rognage termine : {n} briques (seuil {a.seuil_db} dB, marge {marge} ms)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
