#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Controle ASR (Whisper) de CE QUI est dit (pas de la prononciation).

Transcrit un echantillon de clips et compare grossierement au texte attendu
(normalise : minuscules, accents/ponctuation otes). Sert de garde-fou de contenu
(mot manquant, nombre faux), PAS de mesure de qualite vocale.

Usage (PC Windows) :
  python asr_check.py --out C:\\kerskol-tts\\sortie [--n 8] [--keys k1,k2]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]+", " ", s).split().__str__()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--n", type=int, default=8)
    ap.add_argument("--keys", default=None)
    a = ap.parse_args()

    out = Path(a.out)
    man = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    voice = man["voice"]

    # modele ASR local (reutilise la chaine audiobook si dispo)
    from faster_whisper import WhisperModel
    import glob
    candidats = glob.glob(r"C:\Audiobooks\models_asr\*") + ["small", "medium"]
    model = None
    # CPU int8 : fiable (pas de dependance cublas) ; clips courts -> assez rapide.
    for c in candidats:
        try:
            model = WhisperModel(c, device="cpu", compute_type="int8")
            print("ASR modele:", c, "(cpu int8)")
            break
        except Exception:
            continue
    if model is None:
        print("aucun modele ASR chargeable"); return 1

    keys = (a.keys.split(",") if a.keys
            else list(man["keys"].keys())[: a.n])
    for k in keys:
        cid = man["keys"].get(k)
        if not cid:
            print(f"{k}: absent"); continue
        attendu = man["clips"][cid]["text"]
        wav = out / voice / f"{cid}.wav"
        segs, _ = model.transcribe(str(wav), language="fr")
        dit = " ".join(s.text for s in segs).strip()
        ok = _norm(dit) == _norm(attendu)
        print(f"[{'OK ' if ok else 'DIFF'}] {k:16s} attendu={attendu!r}  dit={dit!r}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
