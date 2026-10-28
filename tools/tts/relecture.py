#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Relecture (A1 audit de niveau + A2 Whisper WER). Rapport + liste a regenerer.

Autonome (venv_asr) : lecteur WAV stdlib (pas de soundfile), numpy, faster-whisper,
toks. La REGENERATION se fait a part, dans le venv principal (GPU) :
    python gen_kerskol.py --regen <cles>            # cles = relecture.json["a_regen"]
puis on relance relecture.py pour mesurer l'avant/apres.

Compare chaque clip a son texte PRONONCE (manifest), les deux par toks(). Les
briques d'un seul mot (nombres, « plus ») sont signalees a part (WER tres
sensible a la normalisation Whisper) et jamais mises dans a_regen.

Usage : python relecture.py --out C:\\kerskol-tts\\sortie [--limit N]
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import wave
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from toks import toks  # noqa: E402


def _lire_wav(path: Path):
    import numpy as np
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        ch = w.getnchannels()
        raw = w.readframes(w.getnframes())
    a = np.frombuffer(raw, dtype="<i2").astype("float64") / 32768.0
    if ch > 1:
        a = a.reshape(-1, ch).mean(axis=1)
    return a, sr


def _wer(ref: list[str], hyp: list[str]) -> float:
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


def _niveau(wav):
    import numpy as np
    if len(wav) == 0:
        return -120.0, -120.0
    pk = float(np.max(np.abs(wav)))
    pk_db = 20 * math.log10(pk) if pk > 1e-9 else -120.0
    rms = float(np.sqrt(np.mean(np.square(wav))))
    rms_db = 20 * math.log10(rms) if rms > 1e-9 else -120.0
    return pk_db, rms_db


def _classe_niveau(pk, rms_db, duree, n_car):
    if pk < -40.0:
        return "MUET"
    if pk < -30.0:
        return "QUASI_MUET"
    if rms_db < -35.0:
        return "FAIBLE"
    if n_car > 10 and duree < 0.3:
        return "SUSPECT_COURT"
    return None


def _classe_wer(wer, couverture):
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
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--model", default=r"C:\Audiobooks\models_asr\large-v3")
    ap.add_argument("--prefix", default=None,
                    help="ne controle que les clips dont la cle logique commence par ce prefixe (ex. txt:)")
    ap.add_argument("--device", default="cpu", help="cpu ou cuda")
    ap.add_argument("--compute-type", default=None, help="int8 (cpu) ou float16 (cuda)")
    ap.add_argument("--beam", type=int, default=5, help="beam_size (1 = plus rapide, pour un controle CPU)")
    ap.add_argument("--keys", default=None, help="liste de cles logiques (virgules) a controler UNIQUEMENT")
    a = ap.parse_args()

    from faster_whisper import WhisperModel

    out = Path(a.out)
    man = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    vdir = out / man["voice"]
    cid2key = {}
    for k, cid in man["keys"].items():
        cid2key.setdefault(cid, k)
    clips = list(man["clips"].items())
    if a.prefix:
        clips = [(cid, info) for cid, info in clips if cid2key.get(cid, "").startswith(a.prefix)]
    if a.keys:
        want = set(k.strip() for k in a.keys.split(",") if k.strip())
        clips = [(cid, info) for cid, info in clips if cid2key.get(cid, "") in want]
    if a.limit:
        clips = clips[: a.limit]

    ctype = a.compute_type or ("float16" if a.device == "cuda" else "int8")
    print(f"[{datetime.now():%H:%M:%S}] relecture {len(clips)} clips (Whisper {a.device} {ctype})")
    model = WhisperModel(a.model, device=a.device, compute_type=ctype)

    SEUIL_FR = 0.5  # en-deca (ou langue != fr), on soupconne un accent non francais

    def transcrire(p: Path):
        # langue AUTO-DETECTEE : sert a reperer un accent non francais (graphies
        # de respelling hors lexique fr). Renvoie (texte, langue, proba_langue).
        segs, info = model.transcribe(str(p), language=None, beam_size=a.beam,
                                      word_timestamps=False, vad_filter=False,
                                      condition_on_previous_text=False, temperature=0.0)
        return (" ".join(s.text for s in segs).strip(),
                info.language, float(info.language_probability))

    rapport, briques_ecart, a_regen, accent_suspect = [], [], [], []
    for cid, info in clips:
        wavp = vdir / f"{cid}.wav"
        if not wavp.exists():
            continue
        texte = info["text"]
        wav, sr = _lire_wav(wavp)
        duree = len(wav) / sr if sr else 0.0
        pk, rms_db = _niveau(wav)
        cl_niv = _classe_niveau(pk, rms_db, duree, len(texte))
        attendu = toks(texte)
        entendu_txt, lang, lang_prob = transcrire(wavp)
        entendu = toks(entendu_txt)
        wer = _wer(attendu, entendu)
        couv = (len(entendu) / len(attendu)) if attendu else 1.0
        cl = _classe_wer(wer, couv)
        key = cid2key.get(cid, "?")
        accent = (lang != "fr") or (lang_prob < SEUIL_FR)
        ligne = {"cid": cid, "key": key, "cat": info.get("cat", "?"),
                 "wer": round(wer, 3), "classe": cl, "couverture": round(couv, 3),
                 "niveau": cl_niv, "crete_db": round(pk, 1), "rms_db": round(rms_db, 1),
                 "lang": lang, "lang_prob": round(lang_prob, 3), "accent_suspect": accent,
                 "attendu": texte, "entendu": " ".join(entendu)}
        rapport.append(ligne)
        # accent non francais : on ne le met en alerte que pour les PHRASES (>1 mot) ;
        # les briques d'un seul mot ont une detection de langue peu fiable (clip court).
        if accent and len(attendu) > 1:
            accent_suspect.append({"key": key, "lang": lang, "lang_prob": round(lang_prob, 3),
                                   "attendu": texte, "entendu": " ".join(entendu)})
        if len(attendu) <= 1:
            if cl != "OK" or cl_niv in ("MUET", "QUASI_MUET"):
                briques_ecart.append(ligne)
        elif cl in ("FAUTIF", "TRONQUE") or cl_niv in ("MUET", "QUASI_MUET"):
            a_regen.append(key)

    rapport.sort(key=lambda r: (r["classe"] != "FAUTIF", r["classe"] != "TRONQUE", -r["wer"]))
    synth = {"total": len(rapport),
             "OK": sum(1 for r in rapport if r["classe"] == "OK"),
             "SUSPECT": sum(1 for r in rapport if r["classe"] == "SUSPECT"),
             "FAUTIF": sum(1 for r in rapport if r["classe"] == "FAUTIF"),
             "TRONQUE": sum(1 for r in rapport if r["classe"] == "TRONQUE"),
             "briques_ecart": len(briques_ecart), "a_regen": len(a_regen),
             "accent_suspect": len(accent_suspect), "seuil_fr": SEUIL_FR}
    (out / "relecture.json").write_text(json.dumps(
        {"synthese": synth, "a_regen": a_regen, "briques_ecart": briques_ecart,
         "accent_suspect": accent_suspect, "rapport": rapport}, ensure_ascii=False, indent=2),
        encoding="utf-8")
    print(f"[{datetime.now():%H:%M:%S}] {json.dumps(synth, ensure_ascii=False)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
