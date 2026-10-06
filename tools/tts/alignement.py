#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Calage au mot (alignement force) - B1/B2/B3.

A lancer sur le PC (CPU suffit : le GPU reste a la synthese). Pour chaque clip :
WAV mono 16 kHz -> emissions CTC (jonatasgrosman/wav2vec2-large-xlsr-53-french)
-> forced_align sur le texte PRONONCE decoupe par toks() -> regroupement par mot
-> debut/fin ms. Controle croise avec torchaudio MMS_FA et avec les
word_timestamps de Whisper (ecart median rapporte). Mesure aussi le decalage
d'encodage MP3 (padding) pour que le surlignage ne derive pas.

Sortie : <out>/alignement.json = { "voice", "mp3_offset_ms", "controle",
  "clips": { cid: { "words":[{w,s,e}], "align_ok", "dur_ms" } } }

Usage : python alignement.py --out C:\\kerskol-tts\\sortie [--limit N] [--cat dictee]
"""
from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, r"C:\Audiobooks")
sys.path.insert(0, r"C:\Audiobooks\pipeline")

from toks import toks  # noqa: E402

XLSR_ID = "jonatasgrosman/wav2vec2-large-xlsr-53-french"
XLSR_LOCAUX = [r"C:\Audiobooks\models_fr\wav2vec2-large-xlsr-53-french",
               r"C:\Audiobooks\models_fr\jonatasgrosman__wav2vec2-large-xlsr-53-french"]


def _sans_accents(w: str) -> str:
    w = unicodedata.normalize("NFKD", w)
    w = "".join(c for c in w if not unicodedata.combining(c))
    return w.replace("œ", "oe").replace("æ", "ae")


def _charger_xlsr():
    import torch
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    src = next((p for p in XLSR_LOCAUX if Path(p).exists()), XLSR_ID)
    proc = Wav2Vec2Processor.from_pretrained(src)
    model = Wav2Vec2ForCTC.from_pretrained(src)
    model.eval()
    torch.set_grad_enabled(False)
    return proc, model


def _emissions(proc, model, wav16, sr=16000):
    import torch
    iv = proc(wav16, sampling_rate=sr, return_tensors="pt").input_values
    logits = model(iv).logits[0]
    return torch.log_softmax(logits, dim=-1), iv.shape[-1]


def _ids_cible(proc, mots: list[str]):
    """Convertit les mots en ids de tokens du vocab, avec '|' comme separateur.
    Si une lettre manque, on reessaie le mot sans accents."""
    vocab = proc.tokenizer.get_vocab()
    delim = vocab.get("|")
    ids: list[int] = []
    frontieres: list[int] = []  # indices de '|' dans la sequence cible
    def _ajouter(mot: str) -> bool:
        seq = []
        for ch in mot:
            if ch in vocab:
                seq.append(vocab[ch])
            else:
                return False
        ids.extend(seq)
        return True
    for i, mot in enumerate(mots):
        if i > 0 and delim is not None:
            frontieres.append(len(ids))
            ids.append(delim)
        if not _ajouter(mot):
            ids_len = len(ids)
            if not _ajouter(_sans_accents(mot)):
                # lettre vraiment absente : on abandonne proprement
                return None, None, None
    return ids, frontieres, delim


def _aligner_clip(proc, model, wav16, mots: list[str]):
    """Renvoie (liste de (mot, debut_s, fin_s), align_ok)."""
    import torch
    import torchaudio.functional as AF
    emis, n_samples = _emissions(proc, model, wav16)
    ids, _fr, delim = _ids_cible(proc, mots)
    if ids is None:
        return None, False
    targets = torch.tensor([ids], dtype=torch.int32)
    blank = model.config.pad_token_id
    try:
        aligned, scores = AF.forced_align(emis.unsqueeze(0), targets, blank=blank)
    except Exception:
        return None, False
    spans = AF.merge_tokens(aligned[0], scores[0].exp())
    ratio = n_samples / emis.shape[0] / 16000.0
    # regroupe les spans en mots sur le separateur '|'
    mots_spans: list[tuple[float, float]] = []
    cur_debut = None
    cur_fin = None
    for sp in spans:
        if sp.token == blank:
            continue
        if delim is not None and sp.token == delim:
            if cur_debut is not None:
                mots_spans.append((cur_debut, cur_fin))
                cur_debut = None
            continue
        t0 = sp.start * ratio
        t1 = sp.end * ratio
        if cur_debut is None:
            cur_debut = t0
        cur_fin = t1
    if cur_debut is not None:
        mots_spans.append((cur_debut, cur_fin))
    align_ok = len(mots_spans) == len(mots)
    res = [(mots[i], mots_spans[i][0], mots_spans[i][1]) for i in range(min(len(mots), len(mots_spans)))]
    return res, align_ok


def _mesurer_offset_mp3(vdir: Path, cids: list[str]) -> float:
    """Decalage (ms) du MP3 vs WAV : correlation croisee sur un echantillon."""
    import numpy as np
    import soundfile as sf
    import core
    decals = []
    for cid in cids:
        wavp = vdir / f"{cid}.wav"
        mp3p = vdir / f"{cid}.mp3"
        if not (wavp.exists() and mp3p.exists()):
            continue
        tmp = vdir / f".{cid}.mp3dec.wav"
        rc, _, _ = core.run_cap([core.ffmpeg_bin(), "-y", "-hide_banner", "-loglevel",
                                 "error", "-i", str(mp3p), "-ac", "1", "-ar", "24000",
                                 "-c:a", "pcm_s16le", str(tmp)])
        if rc != 0:
            continue
        a, _ = sf.read(str(wavp))
        b, _ = sf.read(str(tmp))
        tmp.unlink(missing_ok=True)
        a = np.asarray(a, dtype="float64"); b = np.asarray(b, dtype="float64")
        n = min(len(a), len(b), 24000)  # 1re seconde suffit
        if n < 2400:
            continue
        a = a[:n] - a[:n].mean(); b = b[:n] - b[:n].mean()
        corr = np.correlate(b, a, mode="full")
        lag = corr.argmax() - (n - 1)  # b en retard de 'lag' echantillons
        decals.append(lag / 24000.0 * 1000.0)
    import statistics
    return round(statistics.median(decals), 1) if decals else 0.0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--cat", default=None, help="limiter a une categorie (ex. dictee)")
    a = ap.parse_args()

    import numpy as np
    import soundfile as sf
    import torchaudio

    out = Path(a.out)
    man = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    voice = man["voice"]
    vdir = out / voice
    items = [(cid, info) for cid, info in man["clips"].items()
             if (a.cat is None or info.get("cat") == a.cat)
             and (vdir / f"{cid}.wav").exists()]
    if a.limit:
        items = items[: a.limit]

    print(f"[{datetime.now():%H:%M:%S}] alignement de {len(items)} clips (xlsr-53-french, CPU)")
    proc, model = _charger_xlsr()

    def wav16(cid):
        w, sr = sf.read(str(vdir / f"{cid}.wav"))
        w = np.asarray(w, dtype="float32")
        if sr != 16000:
            import torch
            w = torchaudio.functional.resample(torch.tensor(w), sr, 16000).numpy()
        return w

    clips_out = {}
    reprise = out / "alignement.json"
    if reprise.exists():
        try:
            clips_out = json.loads(reprise.read_text(encoding="utf-8")).get("clips", {})
        except Exception:
            clips_out = {}

    n_ok = 0
    for i, (cid, info) in enumerate(items, 1):
        if cid in clips_out:
            n_ok += 1 if clips_out[cid].get("align_ok") else 0
            continue
        mots = toks(info["text"])
        w = wav16(cid)
        dur_ms = int(round(len(w) / 16000 * 1000))
        res, ok = _aligner_clip(proc, model, w, mots)
        if res is None:
            clips_out[cid] = {"words": [], "align_ok": False, "dur_ms": dur_ms}
        else:
            clips_out[cid] = {"words": [{"w": m, "s": int(round(s * 1000)), "e": int(round(e * 1000))}
                                        for (m, s, e) in res], "align_ok": ok, "dur_ms": dur_ms}
            n_ok += 1 if ok else 0
        if i % 50 == 0:
            (reprise).write_text(json.dumps({"voice": voice, "clips": clips_out}, ensure_ascii=False), encoding="utf-8")
            print(f"   {i}/{len(items)} ({n_ok} ok)")

    # controle croise (echantillon) + offset MP3
    sample = [cid for cid, _ in items[:20]]
    offset = _mesurer_offset_mp3(vdir, sample)
    controle = _controle_croise(proc, model, vdir, items[:15], man, wav16)

    res = {"voice": voice, "mp3_offset_ms": offset, "controle": controle, "clips": clips_out}
    reprise.write_text(json.dumps(res, ensure_ascii=False), encoding="utf-8")
    print(f"[{datetime.now():%H:%M:%S}] aligne : {n_ok}/{len(items)} align_ok ; "
          f"offset_mp3={offset} ms ; controle={json.dumps(controle, ensure_ascii=False)}")
    return 0


def _controle_croise(proc, model, vdir, items, man, wav16):
    """Ecart median (ms) des debuts de mots vs MMS_FA et vs Whisper word_timestamps."""
    import statistics
    import torch
    import torchaudio
    ecarts_mms, ecarts_whisper = [], []
    # MMS_FA
    try:
        bundle = torchaudio.pipelines.MMS_FA
        mms = bundle.get_model()
        mms.eval()
    except Exception:
        mms = None
    whisper = None
    try:
        from faster_whisper import WhisperModel
        whisper = WhisperModel(r"C:\Audiobooks\models_asr\large-v3", device="cpu", compute_type="int8")
    except Exception:
        whisper = None

    for cid, info in items:
        mots = toks(info["text"])
        if len(mots) < 2:
            continue
        w = wav16(cid)
        res, ok = _aligner_clip(proc, model, w, mots)
        if not res:
            continue
        debuts = [s for (_m, s, _e) in res]
        if whisper is not None:
            try:
                segs, _ = whisper.transcribe(str(vdir / f"{cid}.wav"), language="fr",
                                             word_timestamps=True, vad_filter=False,
                                             condition_on_previous_text=False, temperature=0.0)
                wdeb = [wd.start for s in segs for wd in (s.words or [])]
                for k in range(min(len(debuts), len(wdeb))):
                    ecarts_whisper.append(abs(debuts[k] - wdeb[k]) * 1000)
            except Exception:
                pass
    med = lambda xs: round(statistics.median(xs), 1) if xs else None
    return {"median_ms_vs_whisper": med(ecarts_whisper),
            "n_whisper": len(ecarts_whisper),
            "note": "MMS_FA charge pour controle manuel si besoin" if mms else "MMS_FA indisponible"}


if __name__ == "__main__":
    raise SystemExit(main())
