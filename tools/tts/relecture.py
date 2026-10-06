#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Relecture (A1 audit de niveau + A2 Whisper WER) + regeneration ciblee.

A lancer sur le PC Windows APRES la generation (GPU libre pour la regen).
Compare chaque clip a son texte PRONONCE (le texte nettoye du manifest), les
deux passes par toks(). Produit un rapport JSON trie du pire au meilleur et
regenere les clips FAUTIF/TRONQUE (graines 4321/2025/777/9999, ancien WAV
sauvegarde). Les briques d'un seul mot (nombres, « plus ») sont signalees a part
(WER tres sensible a la normalisation Whisper) et JAMAIS regenerees en boucle.

Usage : python relecture.py --out C:\\kerskol-tts\\sortie [--no-regen] [--limit N]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, r"C:\Audiobooks")
sys.path.insert(0, r"C:\Audiobooks\pipeline")

from toks import toks  # noqa: E402

SEEDS_REGEN = [4321, 2025, 777, 9999]


def _wer(ref: list[str], hyp: list[str]) -> float:
    """Distance de Levenshtein au mot / nombre de mots de reference."""
    n, m = len(ref), len(hyp)
    if n == 0:
        return 0.0 if m == 0 else 1.0
    d = list(range(m + 1))
    for i in range(1, n + 1):
        prev = d[0]
        d[0] = i
        for j in range(1, m + 1):
            tmp = d[j]
            d[j] = min(d[j] + 1, d[j - 1] + 1, prev + (ref[i - 1] != hyp[j - 1]))
            prev = tmp
    return d[m] / n


def _niveau(wav, sr) -> tuple[float, float, float]:
    """(crete dB, niveau moyen RMS dB, duree s)."""
    import numpy as np
    import core
    if len(wav) == 0:
        return -120.0, -120.0, 0.0
    pk = core.peak_db(wav)
    rms = float(np.sqrt(np.mean(np.square(wav.astype("float64")))))
    rms_db = 20.0 * __import__("math").log10(rms) if rms > 1e-9 else -120.0
    return pk, rms_db, len(wav) / sr


def _classe_niveau(pk: float, rms_db: float, duree: float, n_car: int) -> str | None:
    if pk < -40.0:
        return "MUET"
    if pk < -30.0:
        return "QUASI_MUET"
    if rms_db < -35.0:
        return "FAIBLE"
    if n_car > 10 and duree < 0.3:
        return "SUSPECT_COURT"
    return None


def _classe_wer(wer: float, couverture: float) -> str:
    if couverture < 0.85:
        return "TRONQUE"
    if wer < 0.05:
        return "OK"
    if wer < 0.15:
        return "SUSPECT"
    return "FAUTIF"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--no-regen", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()

    import soundfile as sf
    from faster_whisper import WhisperModel

    out = Path(a.out)
    man = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    voice = man["voice"]
    vdir = out / voice
    clips = list(man["clips"].items())
    if a.limit:
        clips = clips[: a.limit]
    # cid -> cle logique (pour le rapport)
    cid2key = {}
    for k, cid in man["keys"].items():
        cid2key.setdefault(cid, k)

    print(f"[{datetime.now():%H:%M:%S}] relecture de {len(clips)} clips (Whisper large-v3 cpu int8)")
    model = WhisperModel(r"C:\Audiobooks\models_asr\large-v3", device="cpu", compute_type="int8")

    def transcrire(wav_path: Path) -> str:
        segs, _ = model.transcribe(
            str(wav_path), language="fr", beam_size=5, word_timestamps=True,
            vad_filter=False, condition_on_previous_text=False, temperature=0.0)
        return " ".join(s.text for s in segs).strip()

    rapport = []
    briques_ecart = []
    a_regen = []
    for cid, info in clips:
        texte = info["text"]
        cat = info.get("cat", "?")
        wavp = vdir / f"{cid}.wav"
        if not wavp.exists():
            continue
        wav, sr = sf.read(str(wavp))
        pk, rms_db, duree = _niveau(wav, sr)
        cl_niv = _classe_niveau(pk, rms_db, duree, len(texte))
        attendu = toks(texte)
        entendu = toks(transcrire(wavp))
        wer = _wer(attendu, entendu)
        couverture = (len(entendu) / len(attendu)) if attendu else 1.0
        cl = _classe_wer(wer, couverture)
        ligne = {"cid": cid, "key": cid2key.get(cid, "?"), "cat": cat,
                 "wer": round(wer, 3), "classe": cl, "couverture": round(couverture, 3),
                 "niveau": cl_niv, "crete_db": round(pk, 1), "rms_db": round(rms_db, 1),
                 "attendu": texte, "entendu": " ".join(entendu)}
        rapport.append(ligne)
        brique = len(attendu) <= 1
        if brique and cl != "OK":
            briques_ecart.append(ligne)
        elif cl in ("FAUTIF", "TRONQUE") or cl_niv in ("MUET", "QUASI_MUET"):
            a_regen.append((cid, texte, cat, ligne))

    # tri du pire au meilleur
    rapport.sort(key=lambda r: (r["classe"] != "FAUTIF", r["classe"] != "TRONQUE", -r["wer"]))

    regenere = []
    if not a.no_regen and a_regen:
        import torch  # noqa: F401
        from voix import VoixEngine
        from gen_kerskol import _encoder_mp3
        import core
        engine = VoixEngine()
        bdir = out / "_backup_relecture" / datetime.now().strftime("%Y%m%d-%H%M")
        bdir.mkdir(parents=True, exist_ok=True)
        print(f"[{datetime.now():%H:%M:%S}] regeneration de {len(a_regen)} clips")
        for cid, texte, cat, ligne in a_regen:
            wavp = vdir / f"{cid}.wav"
            mp3p = vdir / f"{cid}.mp3"
            (bdir / wavp.name).write_bytes(wavp.read_bytes())
            attendu = toks(texte)
            meilleur = None
            for sd in SEEDS_REGEN:
                w, sr, cap, d, pk, muet, emballe = engine.generer_bloc(texte, seed=sd)
                tmp = vdir / f".{cid}.regen.wav"
                sf.write(str(tmp), w, sr, format="WAV", subtype="PCM_16")
                entendu = toks(transcrire(tmp))
                wer = _wer(attendu, entendu)
                cov = (len(entendu) / len(attendu)) if attendu else 1.0
                score = (cov >= 0.85, -wer)
                if meilleur is None or score > meilleur[0]:
                    meilleur = (score, sd, wer, cov, str(tmp))
                if cov >= 0.85 and wer < 0.15 and pk >= -40.0:
                    break
            _, sd, wer, cov, tmp = meilleur
            os.replace(tmp, wavp)
            _encoder_mp3(wavp, mp3p, core)
            regenere.append({"cid": cid, "key": ligne["key"], "seed": sd,
                             "wer_avant": ligne["wer"], "wer_apres": round(wer, 3),
                             "couverture_apres": round(cov, 3)})
            print(f"   regen {ligne['key']:18s} seed={sd} WER {ligne['wer']}->{round(wer,3)}")
        # nettoie les .regen.wav residuels
        for p in vdir.glob(".*.regen.wav"):
            try:
                p.unlink()
            except OSError:
                pass

    synth = {"total": len(rapport),
             "OK": sum(1 for r in rapport if r["classe"] == "OK"),
             "SUSPECT": sum(1 for r in rapport if r["classe"] == "SUSPECT"),
             "FAUTIF": sum(1 for r in rapport if r["classe"] == "FAUTIF"),
             "TRONQUE": sum(1 for r in rapport if r["classe"] == "TRONQUE"),
             "briques_ecart": len(briques_ecart), "regenere": len(regenere)}
    (out / "relecture.json").write_text(json.dumps(
        {"synthese": synth, "regenere": regenere, "briques_ecart": briques_ecart,
         "rapport": rapport}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[{datetime.now():%H:%M:%S}] {json.dumps(synth, ensure_ascii=False)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
