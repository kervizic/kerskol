#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kit ASSEMBLAGE (retour #6 : enchainement des briques trop hache).

Pour quelques enonces de calcul, construit 3 versions assemblees et les embarque
dans une page HTML autonome pour comparaison a l'oreille :
  - actuel      : briques originales + silence de 110 ms (lecteur phase 1)
  - rogne gap0  : briques rognees (-45 dB, 15 ms) bout a bout, SANS silence
  - rogne + chevauchement : rognees avec un leger recouvrement (15 ms, fondu)

A lancer sur le PC APRES generation. Hors repo (~/Documents/Programmation/kerskol-kits).
Usage : python kit_assemblage.py --out C:\\kerskol-tts\\sortie --html C:\\kerskol-tts\\kit_assemblage.html
"""
from __future__ import annotations

import argparse
import base64
import html
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, r"C:\Audiobooks")
sys.path.insert(0, r"C:\Audiobooks\pipeline")

from nombres_fr import decomposer  # noqa: E402

OPS = {"+": "op:plus", "-": "op:moins", "−": "op:moins", "×": "op:fois",
       "÷": "op:divise", "=": "op:egale"}
EXEMPLES = ["27 ÷ 3", "8 × 7", "245 + 130", "6 × 9", "100 − 45"]
SEUIL = 10 ** (-45.0 / 20.0)
MARGE_MS = 15
OVERLAP_MS = 15


def _cles(enonce: str) -> list[str]:
    import re
    out = []
    for j in re.findall(r"\d+|[+\-−×÷=]", enonce):
        if j.isdigit():
            out += decomposer(int(j))
        elif j in OPS:
            out.append(OPS[j])
    return out


def _rogner(w, sr):
    import numpy as np
    amp = np.abs(w)
    idx = np.where(amp >= SEUIL)[0]
    if len(idx) == 0:
        return w
    m = int(sr * MARGE_MS / 1000)
    return w[max(0, idx[0] - m): min(len(w), idx[-1] + 1 + m)]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--html", required=True)
    a = ap.parse_args()

    import numpy as np
    import soundfile as sf
    import core

    out = Path(a.out)
    man = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    vdir = out / man["voice"]
    tmp = Path(tempfile.gettempdir())
    sr = core.SR

    def wav_de(cle):
        cid = man["keys"].get(cle)
        if not cid:
            return None
        p = vdir / f"{cid}.wav"
        if not p.exists():
            return None
        w, s = sf.read(str(p))
        if w.ndim > 1:
            w = w.mean(axis=1)
        return w.astype("float64")

    def encode(sig, nom):
        wavp = tmp / f"{nom}.wav"
        sf.write(str(wavp), sig.astype("float32"), sr, format="WAV", subtype="PCM_16")
        mp3p = tmp / f"{nom}.mp3"
        core.run_cap([core.ffmpeg_bin(), "-y", "-hide_banner", "-loglevel", "error",
                      "-i", str(wavp), "-af", core.loudnorm_filter(), "-ac", "1",
                      "-ar", str(sr), "-c:a", "libmp3lame", "-b:a", "64k", str(mp3p)])
        b = base64.b64encode(mp3p.read_bytes()).decode("ascii")
        wavp.unlink(missing_ok=True); mp3p.unlink(missing_ok=True)
        return b

    sil = np.zeros(int(sr * 0.110))
    ov = int(sr * OVERLAP_MS / 1000)
    rows = []
    for ex in EXEMPLES:
        cles = _cles(ex)
        wavs = [w for w in (wav_de(c) for c in cles) if w is not None]
        if not wavs:
            continue
        # actuel : original + silence 110 ms
        actuel = np.concatenate([x for w in wavs for x in (w, sil)][:-1])
        # rogne gap0
        rognes = [_rogner(w, sr) for w in wavs]
        gap0 = np.concatenate(rognes)
        # rogne + chevauchement (fondu lineaire sur ov echantillons)
        chev = rognes[0].copy()
        for w in rognes[1:]:
            n = min(ov, len(chev), len(w))
            if n > 0:
                fade = np.linspace(0, 1, n)
                chev[-n:] = chev[-n:] * (1 - fade) + w[:n] * fade
                chev = np.concatenate([chev, w[n:]])
            else:
                chev = np.concatenate([chev, w])
        safe = ex.replace(" ", "").replace("÷", "d").replace("×", "x").replace("−", "m").replace("+", "p")
        rows.append(
            f'<tr><td><code>{html.escape(ex)}</code></td>'
            f'<td><audio controls preload="none" src="data:audio/mpeg;base64,{encode(actuel, "a"+safe)}"></audio></td>'
            f'<td><audio controls preload="none" src="data:audio/mpeg;base64,{encode(gap0, "g"+safe)}"></audio></td>'
            f'<td><audio controls preload="none" src="data:audio/mpeg;base64,{encode(chev, "c"+safe)}"></audio></td></tr>')

    page = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Kit assemblage voix Kerskol</title>
<style>body{{font-family:system-ui,sans-serif;margin:24px;max-width:1000px}}
table{{border-collapse:collapse;width:100%}} td,th{{border:1px solid #ccc;padding:6px 8px;vertical-align:middle}}
code{{background:#f3f3f3;padding:1px 4px;border-radius:3px}} audio{{height:32px}}</style></head><body>
<h1>Assemblage des briques - comparaison</h1>
<p>Pour chaque calcul : <b>actuel</b> (silence 110 ms) / <b>rogne gap 0</b> /
<b>rogne + chevauchement 15 ms</b>. Dis-moi lequel sonne le plus naturel.</p>
<table><thead><tr><th>Calcul</th><th>actuel</th><th>rogne gap 0</th><th>rogne + chevauchement</th></tr></thead>
<tbody>{''.join(rows)}</tbody></table></body></html>"""
    Path(a.html).write_text(page, encoding="utf-8")
    print(f"kit assemblage ecrit : {a.html} ({len(rows)} exemples)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
